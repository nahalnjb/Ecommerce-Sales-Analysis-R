import os
import uuid
import json
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import pandas as pd

from app.database import get_db, DatasetModel
from app.config import DATA_DIR, SAMPLE_DATA_DIR
from app.models import CleanDatasetRequest, ColumnMapping
from app.services.dataset_service import (
    analyze_dataframe_structure,
    clean_and_prepare_dataset,
    auto_detect_mapping
)
from app.services.uci_dataset import generate_uci_online_retail_sample

router = APIRouter(prefix="/api/datasets", tags=["datasets"])

@router.get("")
def list_datasets(db: Session = Depends(get_db)):
    datasets = db.query(DatasetModel).order_by(DatasetModel.created_at.desc()).all()
    res = []
    for d in datasets:
        cols_meta = json.loads(d.columns_meta) if d.columns_meta else []
        clean_sum = json.loads(d.cleaning_summary) if d.cleaning_summary else {}
        res.append({
            "id": d.id,
            "name": d.name,
            "original_filename": d.original_filename,
            "file_type": d.file_type,
            "row_count": d.row_count,
            "col_count": d.col_count,
            "is_default": d.is_default,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "columns_meta": cols_meta,
            "cleaning_summary": clean_sum
        })
    return res


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    dataset_id = str(uuid.uuid4())
    filename = file.filename or "uploaded_dataset.csv"
    ext = Path(filename).suffix.lower()

    if ext not in [".csv", ".xlsx", ".xls"]:
        raise HTTPException(status_code=400, detail="Only CSV and Excel (.xlsx, .xls) files are supported.")

    file_dir = DATA_DIR / "uploads" / dataset_id
    file_dir.mkdir(parents=True, exist_ok=True)
    raw_path = file_dir / f"original{ext}"
    cleaned_path = file_dir / "cleaned.csv"

    with open(raw_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Read dataframe
    try:
        if ext in [".xlsx", ".xls"]:
            df = pd.read_excel(str(raw_path))
        else:
            try:
                df = pd.read_csv(str(raw_path), low_memory=False, encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(str(raw_path), low_memory=False, encoding="ISO-8859-1")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse uploaded file: {str(e)}")

    analysis = analyze_dataframe_structure(df)

    # Automatically generate initial clean version
    clean_req = CleanDatasetRequest()
    cleaned_df, cleaning_summary = clean_and_prepare_dataset(str(raw_path), str(cleaned_path), clean_req)

    # Register in DB
    dataset_obj = DatasetModel(
        id=dataset_id,
        name=Path(filename).stem.replace("_", " ").title(),
        original_filename=filename,
        file_path=str(raw_path),
        cleaned_file_path=str(cleaned_path),
        file_type=ext.replace(".", ""),
        row_count=len(cleaned_df),
        col_count=len(cleaned_df.columns),
        columns_meta=json.dumps(analysis["columns_meta"]),
        cleaning_summary=json.dumps(cleaning_summary),
        is_default=False
    )
    db.add(dataset_obj)
    db.commit()

    return {
        "id": dataset_id,
        "name": dataset_obj.name,
        "row_count": dataset_obj.row_count,
        "col_count": dataset_obj.col_count,
        "analysis": analysis,
        "cleaning_summary": cleaning_summary
    }


@router.post("/load-sample")
def load_sample_dataset(db: Session = Depends(get_db)):
    """Loads or creates the canonical UCI Online Retail dataset."""
    sample_csv = SAMPLE_DATA_DIR / "online_retail_uci.csv"
    if not sample_csv.exists():
        generate_uci_online_retail_sample(sample_csv)

    dataset_id = "uci_online_retail_default"
    cleaned_path = DATA_DIR / "uploads" / dataset_id / "cleaned.csv"
    cleaned_path.parent.mkdir(parents=True, exist_ok=True)

    clean_req = CleanDatasetRequest()
    cleaned_df, cleaning_summary = clean_and_prepare_dataset(str(sample_csv), str(cleaned_path), clean_req)
    analysis = analyze_dataframe_structure(cleaned_df)

    existing = db.query(DatasetModel).filter_by(id=dataset_id).first()
    if existing:
        existing.row_count = len(cleaned_df)
        existing.col_count = len(cleaned_df.columns)
        existing.columns_meta = json.dumps(analysis["columns_meta"])
        existing.cleaning_summary = json.dumps(cleaning_summary)
        existing.cleaned_file_path = str(cleaned_path)
        existing.is_default = True
    else:
        new_d = DatasetModel(
            id=dataset_id,
            name="UCI Online Retail (Academic Standard)",
            original_filename="online_retail_uci.csv",
            file_path=str(sample_csv),
            cleaned_file_path=str(cleaned_path),
            file_type="csv",
            row_count=len(cleaned_df),
            col_count=len(cleaned_df.columns),
            columns_meta=json.dumps(analysis["columns_meta"]),
            cleaning_summary=json.dumps(cleaning_summary),
            is_default=True
        )
        db.add(new_d)
    db.commit()

    return {
        "status": "success",
        "dataset_id": dataset_id,
        "name": "UCI Online Retail (Academic Standard)",
        "rows": len(cleaned_df)
    }


@router.get("/{id}")
def get_dataset(id: str, db: Session = Depends(get_db)):
    d = db.query(DatasetModel).filter_by(id=id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {
        "id": d.id,
        "name": d.name,
        "original_filename": d.original_filename,
        "file_type": d.file_type,
        "row_count": d.row_count,
        "col_count": d.col_count,
        "is_default": d.is_default,
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "columns_meta": json.loads(d.columns_meta) if d.columns_meta else [],
        "cleaning_summary": json.loads(d.cleaning_summary) if d.cleaning_summary else {}
    }


@router.get("/{id}/preview")
def preview_dataset(
    id: str,
    page: int = 1,
    page_size: int = 25,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_dir: Optional[str] = "asc",
    country: Optional[str] = None,
    source: Optional[str] = "cleaned", # cleaned or original
    db: Session = Depends(get_db)
):
    d = db.query(DatasetModel).filter_by(id=id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dataset not found")

    target_file = d.cleaned_file_path if (source == "cleaned" and d.cleaned_file_path) else d.file_path
    if not os.path.exists(target_file):
        raise HTTPException(status_code=404, detail="Data file not found on disk")

    if target_file.endswith(".xlsx") or target_file.endswith(".xls"):
        df = pd.read_excel(target_file)
    else:
        df = pd.read_csv(target_file, low_memory=False)

    # Filter
    if country and "Country" in df.columns:
        df = df[df["Country"].astype(str).str.lower() == country.lower()]

    if search:
        search_lower = search.lower()
        mask = pd.Series([False] * len(df))
        for col in df.columns:
            mask = mask | df[col].astype(str).str.lower().str.contains(search_lower, na=False)
        df = df[mask]

    # Sort
    if sort_by and sort_by in df.columns:
        ascending = (sort_dir.lower() == "asc")
        df = df.sort_values(by=sort_by, ascending=ascending)

    total_records = len(df)
    total_pages = max(1, (total_records + page_size - 1) // page_size)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size

    paged_df = df.iloc[start_idx:end_idx].fillna("")

    return {
        "page": page,
        "page_size": page_size,
        "total_records": total_records,
        "total_pages": total_pages,
        "columns": list(df.columns),
        "data": paged_df.to_dict(orient="records")
    }


@router.post("/{id}/clean")
def clean_dataset(id: str, req: CleanDatasetRequest, db: Session = Depends(get_db)):
    d = db.query(DatasetModel).filter_by(id=id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dataset not found")

    output_path = DATA_DIR / "uploads" / id / "cleaned.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    cleaned_df, cleaning_summary = clean_and_prepare_dataset(d.file_path, str(output_path), req)
    analysis = analyze_dataframe_structure(cleaned_df)

    d.cleaned_file_path = str(output_path)
    d.row_count = len(cleaned_df)
    d.col_count = len(cleaned_df.columns)
    d.cleaning_summary = json.dumps(cleaning_summary)
    d.columns_meta = json.dumps(analysis["columns_meta"])
    db.commit()

    return {
        "status": "success",
        "cleaning_summary": cleaning_summary,
        "columns_meta": analysis["columns_meta"]
    }


@router.get("/{id}/download")
def download_dataset(id: str, type: str = "cleaned", db: Session = Depends(get_db)):
    d = db.query(DatasetModel).filter_by(id=id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dataset not found")

    target_file = d.cleaned_file_path if (type == "cleaned" and d.cleaned_file_path) else d.file_path
    if not os.path.exists(target_file):
        raise HTTPException(status_code=404, detail="Requested file not found on disk")

    filename = f"{d.name.replace(' ', '_')}_{type}.csv"
    return FileResponse(target_file, filename=filename, media_type="text/csv")


@router.delete("/{id}")
def delete_dataset(id: str, db: Session = Depends(get_db)):
    d = db.query(DatasetModel).filter_by(id=id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Don't delete files if default sample, just remove record or recreate
    dir_to_remove = DATA_DIR / "uploads" / id
    if dir_to_remove.exists():
        shutil.rmtree(dir_to_remove, ignore_errors=True)

    db.delete(d)
    db.commit()
    return {"status": "deleted", "id": id}

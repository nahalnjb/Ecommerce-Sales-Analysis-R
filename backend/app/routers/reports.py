import os
import uuid
import json
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import pandas as pd

from app.database import get_db, GeneratedReportModel, DatasetModel, AnalysisHistoryModel
from app.config import OUTPUTS_DIR, BASE_DIR
from app.models import ReportGenerateRequest
from app.services.pdf_service import generate_pdf_report

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("")
def list_reports(db: Session = Depends(get_db)):
    reports = db.query(GeneratedReportModel).order_by(GeneratedReportModel.created_at.desc()).all()
    return [{
        "id": r.id,
        "report_title": r.report_title,
        "report_type": r.report_type,
        "dataset_name": r.dataset_name,
        "analysis_type": r.analysis_type,
        "file_size_bytes": r.file_size_bytes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "download_url": f"/api/reports/{r.id}/download"
    } for r in reports]


@router.post("/generate")
def create_report(req: ReportGenerateRequest, db: Session = Depends(get_db)):
    d = db.query(DatasetModel).filter_by(id=req.dataset_id).first()
    dataset_name = d.name if d else "Online Retail"

    # Fetch latest analysis results for this dataset
    latest_analyses = db.query(AnalysisHistoryModel).filter_by(dataset_id=req.dataset_id).all()
    combined_data = {}
    chart_image_path = None

    for a in latest_analyses:
        try:
            a_data = json.loads(a.result_data) if a.result_data else {}
            if a.analysis_type == "RFM":
                combined_data["segment_summary"] = a_data.get("segment_summary", [])
            elif a.analysis_type == "KMeans":
                combined_data["cluster_profiles"] = a_data.get("cluster_profiles", [])
            elif a.analysis_type == "Forecast":
                combined_data["forecast"] = a_data.get("forecast", [])
                combined_data["metrics"] = a_data.get("metrics", {})
                combined_data["model_name"] = a_data.get("model_name", "ARIMA")
            elif a.analysis_type == "Sales":
                combined_data["kpi"] = a_data.get("kpi", {})
            
            # Find any chart image path
            if a.chart_paths and not chart_image_path:
                paths = json.loads(a.chart_paths)
                if paths:
                    # Resolve real local file path
                    rel = paths[0].replace("/outputs/", "")
                    full = OUTPUTS_DIR / rel
                    if full.exists():
                        chart_image_path = str(full)
        except Exception:
            pass

    report_id = str(uuid.uuid4())
    ext = req.report_type.lower()

    if ext == "pdf":
        filename = f"Report_{report_id[:8]}.pdf"
        target_path = OUTPUTS_DIR / "reports" / filename
        generate_pdf_report(
            output_path=str(target_path),
            project_title=req.report_title,
            dataset_name=dataset_name,
            analysis_type="Comprehensive RFM & Sales Intelligence",
            results_data=combined_data,
            chart_image_path=chart_image_path
        )
    elif ext == "excel":
        filename = f"Report_{report_id[:8]}.xlsx"
        target_path = OUTPUTS_DIR / "reports" / filename
        with pd.ExcelWriter(str(target_path), engine="openpyxl") as writer:
            if "segment_summary" in combined_data:
                pd.DataFrame(combined_data["segment_summary"]).to_excel(writer, sheet_name="RFM_Segments", index=False)
            if "cluster_profiles" in combined_data:
                pd.DataFrame(combined_data["cluster_profiles"]).to_excel(writer, sheet_name="KMeans_Clusters", index=False)
            if "forecast" in combined_data:
                pd.DataFrame(combined_data["forecast"]).to_excel(writer, sheet_name="Sales_Forecast", index=False)
    else: # CSV
        filename = f"Report_{report_id[:8]}.csv"
        target_path = OUTPUTS_DIR / "reports" / filename
        if "segment_summary" in combined_data:
            pd.DataFrame(combined_data["segment_summary"]).to_csv(str(target_path), index=False)
        else:
            pd.DataFrame([{"Dataset": dataset_name, "Generated": str(datetime.now())}]).to_csv(str(target_path), index=False)

    size = os.path.getsize(str(target_path)) if target_path.exists() else 0

    report_obj = GeneratedReportModel(
        id=report_id,
        report_title=req.report_title,
        report_type=ext,
        file_path=str(target_path),
        dataset_name=dataset_name,
        analysis_type="Comprehensive Intelligence",
        file_size_bytes=size
    )
    db.add(report_obj)
    db.commit()

    return {
        "id": report_id,
        "title": req.report_title,
        "type": ext,
        "file_size": size,
        "download_url": f"/api/reports/{report_id}/download"
    }


@router.get("/{id}/download")
def download_report_file(id: str, db: Session = Depends(get_db)):
    r = db.query(GeneratedReportModel).filter_by(id=id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report record not found")
    if not os.path.exists(r.file_path):
        raise HTTPException(status_code=404, detail="Report file missing from disk")

    media_types = {
        "pdf": "application/pdf",
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "csv": "text/csv"
    }
    return FileResponse(
        r.file_path,
        media_type=media_types.get(r.report_type, "application/octet-stream"),
        filename=os.path.basename(r.file_path)
    )

import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db, AnalysisHistoryModel

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("")
def list_history(
    analysis_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AnalysisHistoryModel)
    if analysis_type and analysis_type != "All":
        query = query.filter(AnalysisHistoryModel.analysis_type == analysis_type)
    if search:
        query = query.filter(AnalysisHistoryModel.analysis_name.contains(search))
    
    records = query.order_by(AnalysisHistoryModel.created_at.desc()).all()
    
    results = []
    for r in records:
        results.append({
            "id": r.id,
            "analysis_name": r.analysis_name,
            "dataset_id": r.dataset_id,
            "dataset_name": r.dataset_name,
            "analysis_type": r.analysis_type,
            "status": r.status,
            "execution_duration": r.execution_duration,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "parameters": json.loads(r.parameters) if r.parameters else {},
            "has_data": bool(r.result_data and r.result_data != "{}")
        })
    return results


@router.get("/{id}")
def get_history_detail(id: str, db: Session = Depends(get_db)):
    r = db.query(AnalysisHistoryModel).filter_by(id=id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Analysis history record not found")
    
    return {
        "id": r.id,
        "analysis_name": r.analysis_name,
        "dataset_id": r.dataset_id,
        "dataset_name": r.dataset_name,
        "analysis_type": r.analysis_type,
        "parameters": json.loads(r.parameters) if r.parameters else {},
        "status": r.status,
        "execution_duration": r.execution_duration,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "result_data": json.loads(r.result_data) if r.result_data else {},
        "chart_paths": json.loads(r.chart_paths) if r.chart_paths else []
    }


@router.delete("/{id}")
def delete_history_record(id: str, db: Session = Depends(get_db)):
    r = db.query(AnalysisHistoryModel).filter_by(id=id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Analysis history record not found")
    db.delete(r)
    db.commit()
    return {"status": "deleted", "id": id}

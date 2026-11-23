import os
import uuid
import json
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db, ExecutionJobModel, SavedScriptModel, DatasetModel
from app.models import RExecuteRequest
from app.services.r_runner import run_r_script, stop_r_job
from app.services.seed_scripts import seed_predefined_scripts

router = APIRouter(prefix="/api/r", tags=["r_engine"])

@router.post("/execute")
def execute_r_code(req: RExecuteRequest, db: Session = Depends(get_db)):
    job_id = str(uuid.uuid4())
    
    # Prepend dataset path if dataset_id provided
    code_to_run = req.code
    env_vars = {}
    if req.dataset_id:
        d = db.query(DatasetModel).filter_by(id=req.dataset_id).first()
        if d:
            target_path = d.cleaned_file_path or d.file_path
            env_vars["DATA_PATH"] = str(target_path)
            # Add auto-loader header comment and variable definition
            header = f"# Active Dataset: {d.name}\nDATA_PATH <- '{target_path}'\nif (file.exists(DATA_PATH)) {{ active_dataset <- read.csv(DATA_PATH) }}\n\n"
            code_to_run = header + code_to_run

    # Save initial pending job in DB
    job_record = ExecutionJobModel(
        id=job_id,
        job_type=req.analysis_type or "Ad-hoc R Script",
        code=req.code,
        dataset_id=req.dataset_id,
        status="running",
        start_time=datetime.utcnow()
    )
    db.add(job_record)
    db.commit()

    # Execute actual R code
    timeout = min(req.timeout or 120, 300)
    res = run_r_script(code=code_to_run, job_id=job_id, timeout=timeout, env_vars=env_vars)

    # Update job record
    job_record.status = "completed" if res.success else "failed"
    job_record.end_time = datetime.utcnow()
    job_record.execution_duration = res.duration
    job_record.stdout = res.stdout
    job_record.stderr = res.stderr
    job_record.exit_code = res.exit_code
    job_record.result_meta = json.dumps({
        "output_files": res.output_files,
        "has_data": bool(res.data)
    })
    db.commit()

    return res.to_dict()


@router.get("/jobs/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(ExecutionJobModel).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Execution job not found")
    
    meta = json.loads(job.result_meta) if job.result_meta else {}
    return {
        "job_id": job.id,
        "job_type": job.job_type,
        "status": job.status,
        "start_time": job.start_time.isoformat() if job.start_time else None,
        "end_time": job.end_time.isoformat() if job.end_time else None,
        "execution_duration": job.execution_duration,
        "stdout": job.stdout,
        "stderr": job.stderr,
        "exit_code": job.exit_code,
        "output_files": meta.get("output_files", [])
    }


@router.post("/jobs/{job_id}/stop")
def stop_job(job_id: str, db: Session = Depends(get_db)):
    stopped = stop_r_job(job_id)
    job = db.query(ExecutionJobModel).filter_by(id=job_id).first()
    if job:
        job.status = "stopped"
        job.stderr += "\nExecution manually stopped by user."
        db.commit()
    return {"job_id": job_id, "stopped": stopped}


@router.get("/scripts")
def list_scripts(category: Optional[str] = None, db: Session = Depends(get_db)):
    seed_predefined_scripts(db)
    query = db.query(SavedScriptModel)
    if category:
        query = query.filter_by(category=category)
    scripts = query.order_by(SavedScriptModel.id.asc()).all()
    return [{
        "id": s.id,
        "title": s.title,
        "category": s.category,
        "description": s.description,
        "code": s.code,
        "is_predefined": s.is_predefined,
        "created_at": s.created_at.isoformat() if s.created_at else None
    } for s in scripts]


@router.get("/scripts/{id}")
def get_script(id: str, db: Session = Depends(get_db)):
    s = db.query(SavedScriptModel).filter_by(id=id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Script not found")
    return {
        "id": s.id,
        "title": s.title,
        "category": s.category,
        "description": s.description,
        "code": s.code,
        "is_predefined": s.is_predefined
    }


@router.post("/scripts")
def save_script(title: str, code: str, category: str = "Custom", description: str = "", db: Session = Depends(get_db)):
    script_id = f"custom_{str(uuid.uuid4())[:8]}"
    s = SavedScriptModel(
        id=script_id,
        title=title,
        category=category,
        description=description,
        code=code,
        is_predefined=False
    )
    db.add(s)
    db.commit()
    return {"id": s.id, "title": s.title, "category": s.category}

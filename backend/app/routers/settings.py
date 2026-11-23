import os
import shutil
import subprocess
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db, AppSettingsModel, DatasetModel
from app.config import RSCRIPT_BIN, DATA_DIR, OUTPUTS_DIR

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("")
def get_settings(db: Session = Depends(get_db)):
    settings_rows = db.query(AppSettingsModel).all()
    settings_dict = {s.key: s.value for s in settings_rows}

    # Storage statistics
    total_data_size = sum(f.stat().st_size for f in DATA_DIR.glob('**/*') if f.is_file())
    total_output_size = sum(f.stat().st_size for f in OUTPUTS_DIR.glob('**/*') if f.is_file())

    default_dataset = db.query(DatasetModel).filter_by(is_default=True).first()

    return {
        "app_name": "E-Commerce Sales Analysis & Customer Segmentation Platform",
        "version": "2.0.0 (Production Release)",
        "default_dataset": default_dataset.name if default_dataset else "UCI Online Retail",
        "storage": {
            "datasets_bytes": total_data_size,
            "datasets_mb": round(total_data_size / (1024 * 1024), 2),
            "outputs_bytes": total_output_size,
            "outputs_mb": round(total_output_size / (1024 * 1024), 2)
        },
        "settings": settings_dict
    }


@router.post("")
def update_setting(key: str, value: str, db: Session = Depends(get_db)):
    setting = db.query(AppSettingsModel).filter_by(key=key).first()
    if setting:
        setting.value = value
    else:
        setting = AppSettingsModel(key=key, value=value)
        db.add(setting)
    db.commit()
    return {"status": "updated", "key": key, "value": value}


@router.get("/r-status")
def get_r_environment_status():
    """Validates real R installation and package availability."""
    from app.config import R_LIBS_DIR
    r_check_code = """
.libPaths(unique(c('""" + str(R_LIBS_DIR) + """', .libPaths())))
pkgs <- c("dplyr", "tidyr", "ggplot2", "readr", "readxl", "lubridate", "forecast", "cluster", "stats", "jsonlite")
installed <- rownames(installed.packages())
status_list <- lapply(pkgs, function(p) {
  if (p %in% installed) {
    ver <- as.character(packageVersion(p))
    return(list(package = p, installed = TRUE, version = ver))
  } else {
    return(list(package = p, installed = FALSE, version = "Not installed"))
  }
})
cat(jsonlite::toJSON(list(
  r_version = R.version.string,
  platform = R.version$platform,
  packages = status_list
), auto_unbox = TRUE))
"""
    try:
        proc = subprocess.run(
            [RSCRIPT_BIN, "-e", r_check_code],
            capture_output=True,
            text=True,
            timeout=15
        )
        import json
        out_json = json.loads(proc.stdout)
        out_json["rscript_bin"] = RSCRIPT_BIN
        out_json["success"] = True
        return out_json
    except Exception as e:
        return {
            "success": False,
            "rscript_bin": RSCRIPT_BIN,
            "error": str(e),
            "r_version": "Unknown"
        }

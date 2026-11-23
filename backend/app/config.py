import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent

DATA_DIR = BASE_DIR / "data"
OUTPUTS_DIR = BASE_DIR / "outputs"
R_SCRIPTS_DIR = BASE_DIR / "app" / "r_scripts"
SAMPLE_DATA_DIR = PROJECT_ROOT / "sample_data"
R_LIBS_DIR = PROJECT_ROOT / "r_libs"

DATA_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
SAMPLE_DATA_DIR.mkdir(parents=True, exist_ok=True)
(OUTPUTS_DIR / "plots").mkdir(parents=True, exist_ok=True)
(OUTPUTS_DIR / "reports").mkdir(parents=True, exist_ok=True)
(OUTPUTS_DIR / "exports").mkdir(parents=True, exist_ok=True)

# Database
DB_PATH = DATA_DIR / "ecommerce_analytics.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Rscript binary resolution
def get_rscript_path() -> str:
    candidates = [
        "/usr/local/bin/Rscript",
        "/opt/homebrew/bin/Rscript",
        "/usr/bin/Rscript"
    ]
    for c in candidates:
        if os.path.exists(c) and os.access(c, os.X_OK):
            return c
    return "Rscript"

RSCRIPT_BIN = get_rscript_path()

# Execution settings
R_EXECUTION_TIMEOUT_SECONDS = 180  # 3 minutes maximum
MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB

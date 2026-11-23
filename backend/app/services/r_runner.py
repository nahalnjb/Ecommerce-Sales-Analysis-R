import os
import sys
import time
import uuid
import signal
import subprocess
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from app.config import RSCRIPT_BIN, R_EXECUTION_TIMEOUT_SECONDS, OUTPUTS_DIR

# Keep track of active processes for cancellation
ACTIVE_PROCESSES: Dict[str, subprocess.Popen] = {}

class RExecutionResult:
    def __init__(
        self,
        job_id: str,
        stdout: str,
        stderr: str,
        exit_code: int,
        duration: float,
        output_files: List[str],
        data: Optional[Dict[str, Any]] = None,
        success: bool = True
    ):
        self.job_id = job_id
        self.stdout = stdout
        self.stderr = stderr
        self.exit_code = exit_code
        self.duration = duration
        self.output_files = output_files
        self.data = data or {}
        self.success = success

    def to_dict(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "exit_code": self.exit_code,
            "duration": round(self.duration, 3),
            "output_files": self.output_files,
            "data": self.data,
            "success": self.success
        }


def run_r_script(
    script_path: Optional[str] = None,
    code: Optional[str] = None,
    args: Optional[List[str]] = None,
    job_id: Optional[str] = None,
    timeout: int = R_EXECUTION_TIMEOUT_SECONDS,
    env_vars: Optional[Dict[str, str]] = None
) -> RExecutionResult:
    """
    Executes R code in an isolated directory using Rscript.
    Captures stdout, stderr, execution duration, and extracts generated plots/artifacts.
    """
    if not job_id:
        job_id = str(uuid.uuid4())

    job_dir = OUTPUTS_DIR / "jobs" / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    # Determine script to run
    if code:
        temp_script_path = job_dir / "user_script.R"
        with open(temp_script_path, "w", encoding="utf-8") as f:
            f.write(code)
        target_script = str(temp_script_path)
    elif script_path:
        target_script = str(script_path)
    else:
        raise ValueError("Either script_path or code must be provided.")

    cmd = [RSCRIPT_BIN, target_script]
    if args:
        cmd.extend(args)

    # Prepare sanitized environment
    from app.config import R_LIBS_DIR
    safe_env = {
        "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"),
        "HOME": str(job_dir),
        "LANG": "en_US.UTF-8",
        "LC_ALL": "en_US.UTF-8",
        "R_LIBS": f"{R_LIBS_DIR}:/Library/Frameworks/R.framework/Versions/4.4-arm64/Resources/library",
        "R_LIBS_USER": str(R_LIBS_DIR)
    }
    if env_vars:
        safe_env.update(env_vars)

    start_time = time.time()
    stdout_text = ""
    stderr_text = ""
    exit_code = -1
    success = False

    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(job_dir),
            env=safe_env,
            text=True,
            preexec_fn=os.setsid if hasattr(os, "setsid") else None
        )
        ACTIVE_PROCESSES[job_id] = process

        try:
            stdout_raw, stderr_raw = process.communicate(timeout=timeout)
            stdout_text = stdout_raw or ""
            stderr_text = stderr_raw or ""
            exit_code = process.returncode
            success = (exit_code == 0)
        except subprocess.TimeoutExpired:
            if hasattr(os, "killpg"):
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)
            else:
                process.terminate()
            stdout_raw, stderr_raw = process.communicate()
            stdout_text = (stdout_raw or "") + f"\n[ERROR] Execution timed out after {timeout} seconds."
            stderr_text = (stderr_raw or "") + f"\nProcess killed due to exceeding timeout limit ({timeout}s)."
            exit_code = 124
            success = False

    except Exception as e:
        stderr_text = f"Execution system error: {str(e)}"
        exit_code = -1
        success = False
    finally:
        ACTIVE_PROCESSES.pop(job_id, None)

    duration = time.time() - start_time

    # Collect any output files generated in job_dir (images, JSON, csv)
    output_files = []
    parsed_json_data = None

    if job_dir.exists():
        for f in job_dir.glob("*"):
            if f.is_file() and f.name != "user_script.R":
                rel_path = f"/outputs/jobs/{job_id}/{f.name}"
                output_files.append(rel_path)
                # If there's an output.json, automatically load it
                if f.name == "output.json":
                    try:
                        with open(f, "r", encoding="utf-8") as jf:
                            parsed_json_data = json.load(jf)
                    except Exception as je:
                        stderr_text += f"\nFailed to parse output.json: {str(je)}"

    return RExecutionResult(
        job_id=job_id,
        stdout=stdout_text,
        stderr=stderr_text,
        exit_code=exit_code,
        duration=duration,
        output_files=output_files,
        data=parsed_json_data,
        success=success
    )


def stop_r_job(job_id: str) -> bool:
    """Stops a currently running R process."""
    proc = ACTIVE_PROCESSES.get(job_id)
    if proc:
        try:
            if hasattr(os, "killpg"):
                os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
            else:
                proc.kill()
            ACTIVE_PROCESSES.pop(job_id, None)
            return True
        except Exception:
            return False
    return False

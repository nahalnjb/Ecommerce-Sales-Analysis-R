from datetime import datetime
import json
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from app.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class DatasetModel(Base):
    __tablename__ = "datasets"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    cleaned_file_path = Column(String(512), nullable=True)
    file_type = Column(String(16), nullable=False)  # csv, xls, xlsx
    row_count = Column(Integer, default=0)
    col_count = Column(Integer, default=0)
    columns_meta = Column(Text, default="[]")  # JSON string
    cleaning_summary = Column(Text, default="{}")  # JSON string
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    analyses = relationship("AnalysisHistoryModel", back_populates="dataset", cascade="all, delete-orphan")


class ExecutionJobModel(Base):
    __tablename__ = "execution_jobs"

    id = Column(String(64), primary_key=True, index=True)
    job_type = Column(String(64), default="adhoc")  # rfm, kmeans, forecast, script, manual
    script_path = Column(String(512), nullable=True)
    code = Column(Text, nullable=True)
    dataset_id = Column(String(64), nullable=True)
    status = Column(String(32), default="pending")  # pending, running, completed, failed, stopped
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    execution_duration = Column(Float, default=0.0)
    stdout = Column(Text, default="")
    stderr = Column(Text, default="")
    exit_code = Column(Integer, nullable=True)
    result_meta = Column(Text, default="{}")  # JSON


class AnalysisHistoryModel(Base):
    __tablename__ = "analysis_history"

    id = Column(String(64), primary_key=True, index=True)
    analysis_name = Column(String(255), nullable=False)
    dataset_id = Column(String(64), ForeignKey("datasets.id"), nullable=True)
    dataset_name = Column(String(255), nullable=False)
    analysis_type = Column(String(64), nullable=False)  # RFM, KMeans, Forecast, Sales, Stats, Manual
    parameters = Column(Text, default="{}")  # JSON
    status = Column(String(32), default="completed")  # completed, failed
    execution_duration = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    result_data = Column(Text, default="{}")  # JSON payload of actual results
    chart_paths = Column(Text, default="[]")  # JSON array of generated image paths

    dataset = relationship("DatasetModel", back_populates="analyses")


class SavedScriptModel(Base):
    __tablename__ = "saved_scripts"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(64), default="General")
    description = Column(Text, default="")
    code = Column(Text, nullable=False)
    is_predefined = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GeneratedReportModel(Base):
    __tablename__ = "generated_reports"

    id = Column(String(64), primary_key=True, index=True)
    report_title = Column(String(255), nullable=False)
    report_type = Column(String(32), nullable=False)  # pdf, csv, excel
    file_path = Column(String(512), nullable=False)
    dataset_name = Column(String(255), nullable=False)
    analysis_type = Column(String(64), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class AppSettingsModel(Base):
    __tablename__ = "application_settings"

    key = Column(String(128), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class DatasetSummary(BaseModel):
    id: str
    name: str
    original_filename: str
    file_type: str
    row_count: int
    col_count: int
    is_default: bool
    created_at: datetime
    columns_meta: List[Dict[str, Any]]
    cleaning_summary: Dict[str, Any]

class ColumnMapping(BaseModel):
    invoice_no: Optional[str] = "InvoiceNo"
    stock_code: Optional[str] = "StockCode"
    description: Optional[str] = "Description"
    quantity: Optional[str] = "Quantity"
    invoice_date: Optional[str] = "InvoiceDate"
    unit_price: Optional[str] = "UnitPrice"
    customer_id: Optional[str] = "CustomerID"
    country: Optional[str] = "Country"

class CleanDatasetRequest(BaseModel):
    column_mapping: Optional[ColumnMapping] = None
    remove_cancelled: bool = True
    remove_missing_customer: bool = False
    remove_duplicates: bool = True
    min_unit_price: float = 0.0  # Allow 0.0 value payments/promotions by default
    handle_negative_quantities: str = "filter"  # "filter" or "flag"

class RExecuteRequest(BaseModel):
    code: str
    dataset_id: Optional[str] = None
    save_history: bool = True
    analysis_type: Optional[str] = "Ad-hoc R Script"
    timeout: Optional[int] = 120

class RFMRequest(BaseModel):
    dataset_id: str
    reference_date: Optional[str] = None # e.g. "2011-12-10" or latest date
    r_bins: int = 5
    f_bins: int = 5
    m_bins: int = 5
    exclude_cancelled: bool = True
    exclude_missing_customer: bool = True

class KMeansRequest(BaseModel):
    dataset_id: str
    features: List[str] = Field(default_factory=lambda: ["Recency", "Frequency", "Monetary"])
    k: int = 4
    max_iter: int = 100
    n_start: int = 25
    use_log_transform: bool = True
    calculate_elbow: bool = True
    calculate_silhouette: bool = True

class ForecastRequest(BaseModel):
    dataset_id: str
    method: str = "ARIMA"  # "ARIMA", "ETS", "MA"
    horizon_months: int = 6  # 3, 6, 12
    ma_order: Optional[int] = 3
    date_from: Optional[str] = None
    date_to: Optional[str] = None

class SalesAnalysisRequest(BaseModel):
    dataset_id: str
    group_by: Optional[str] = "monthly" # monthly, daily, product, country
    country_filter: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    top_n: int = 10

class StatisticsRequest(BaseModel):
    dataset_id: str
    columns: List[str]
    group_by: Optional[str] = None

class ManualAnalysisRequest(BaseModel):
    dataset_id: str
    country: Optional[str] = None
    customer_id: Optional[str] = None
    product_code: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    min_revenue: Optional[float] = None
    max_revenue: Optional[float] = None
    analysis_type: str = "comprehensive"

class ReportGenerateRequest(BaseModel):
    dataset_id: str
    report_title: str
    report_type: str = "pdf" # "pdf", "csv", "excel"
    analysis_types: List[str] = Field(default_factory=lambda: ["summary", "rfm", "kmeans", "forecast", "sales"])
    include_charts: bool = True

import os
import uuid
import json
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, DatasetModel, AnalysisHistoryModel
from app.config import R_SCRIPTS_DIR, OUTPUTS_DIR
from app.models import (
    RFMRequest,
    KMeansRequest,
    ForecastRequest,
    SalesAnalysisRequest,
    StatisticsRequest,
    ManualAnalysisRequest
)
from app.services.r_runner import run_r_script

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

def get_dataset_file_path(dataset_id: str, db: Session) -> str:
    d = db.query(DatasetModel).filter_by(id=dataset_id).first()
    if not d:
        # Check if default dataset exists
        default_d = db.query(DatasetModel).filter_by(is_default=True).first()
        if default_d:
            return default_d.cleaned_file_path or default_d.file_path
        raise HTTPException(status_code=404, detail="Dataset not found")
    path = d.cleaned_file_path or d.file_path
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Dataset file not found on disk")
    return path


@router.get("/dashboard")
def get_dashboard_data(dataset_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Executes R sales_analysis and returns KPIs and trends for the dashboard."""
    if not dataset_id:
        d = db.query(DatasetModel).filter_by(is_default=True).first()
        if not d:
            d = db.query(DatasetModel).first()
        if not d:
            return {"status": "no_dataset", "message": "No dataset loaded. Please upload or load sample dataset."}
        dataset_id = d.id

    data_path = get_dataset_file_path(dataset_id, db)
    job_id = f"dash_{str(uuid.uuid4())[:8]}"
    job_dir = OUTPUTS_DIR / "jobs" / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    output_json = job_dir / "output.json"
    plot_file = job_dir / "dashboard_sales.png"

    r_script = R_SCRIPTS_DIR / "sales_analysis.R"
    res = run_r_script(
        script_path=str(r_script),
        args=[str(data_path), str(output_json), "10", str(plot_file)],
        job_id=job_id,
        timeout=120
    )

    if not res.success or not res.data:
        raise HTTPException(status_code=500, detail=f"R Dashboard analysis failed: {res.stderr}")

    return {
        "dataset_id": dataset_id,
        "kpi": res.data.get("kpi", {}),
        "monthly_trend": res.data.get("monthly_trend", []),
        "daily_trend": res.data.get("daily_trend", []),
        "top_products": res.data.get("top_products", []),
        "bottom_products": res.data.get("bottom_products", []),
        "country_sales": res.data.get("country_sales", []),
        "chart_url": f"/outputs/jobs/{job_id}/{res.data.get('chart_file', '')}"
    }


@router.post("/rfm")
def run_rfm(req: RFMRequest, db: Session = Depends(get_db)):
    """Executes real RFM Customer Segmentation in R."""
    data_path = get_dataset_file_path(req.dataset_id, db)
    d = db.query(DatasetModel).filter_by(id=req.dataset_id).first()
    dataset_name = d.name if d else "Dataset"

    job_id = f"rfm_{str(uuid.uuid4())[:8]}"
    job_dir = OUTPUTS_DIR / "jobs" / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    output_json = job_dir / "output.json"
    plot_file = job_dir / "rfm_segments.png"

    ref_date_str = req.reference_date if req.reference_date else "auto"

    r_script = R_SCRIPTS_DIR / "rfm_analysis.R"
    res = run_r_script(
        script_path=str(r_script),
        args=[str(data_path), str(output_json), ref_date_str, str(plot_file)],
        job_id=job_id,
        timeout=120
    )

    if not res.success or not res.data:
        raise HTTPException(status_code=500, detail=f"R RFM Analysis failed: {res.stderr}")

    # Record in history
    hist = AnalysisHistoryModel(
        id=str(uuid.uuid4()),
        analysis_name=f"RFM Segmentation ({dataset_name})",
        dataset_id=req.dataset_id,
        dataset_name=dataset_name,
        analysis_type="RFM",
        parameters=json.dumps(req.dict()),
        status="completed",
        execution_duration=res.duration,
        result_data=json.dumps(res.data),
        chart_paths=json.dumps([f"/outputs/jobs/{job_id}/{res.data.get('chart_file', '')}"])
    )
    db.add(hist)
    db.commit()

    return {
        "job_id": job_id,
        "history_id": hist.id,
        "duration": res.duration,
        "data": res.data,
        "chart_url": f"/outputs/jobs/{job_id}/{res.data.get('chart_file', '')}",
        "stdout": res.stdout
    }


@router.post("/kmeans")
def run_kmeans(req: KMeansRequest, db: Session = Depends(get_db)):
    """Executes real K-Means clustering in R using stats::kmeans()."""
    data_path = get_dataset_file_path(req.dataset_id, db)
    d = db.query(DatasetModel).filter_by(id=req.dataset_id).first()
    dataset_name = d.name if d else "Dataset"

    job_id = f"km_{str(uuid.uuid4())[:8]}"
    job_dir = OUTPUTS_DIR / "jobs" / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    output_json = job_dir / "output.json"
    plot_file = job_dir / "kmeans_clusters.png"

    r_script = R_SCRIPTS_DIR / "kmeans_clustering.R"
    res = run_r_script(
        script_path=str(r_script),
        args=[
            str(data_path),
            str(output_json),
            str(req.k),
            str(req.max_iter),
            str(req.n_start),
            str(plot_file)
        ],
        job_id=job_id,
        timeout=120
    )

    if not res.success or not res.data:
        raise HTTPException(status_code=500, detail=f"R K-Means clustering failed: {res.stderr}")

    hist = AnalysisHistoryModel(
        id=str(uuid.uuid4()),
        analysis_name=f"K-Means Clustering K={req.k} ({dataset_name})",
        dataset_id=req.dataset_id,
        dataset_name=dataset_name,
        analysis_type="KMeans",
        parameters=json.dumps(req.dict()),
        status="completed",
        execution_duration=res.duration,
        result_data=json.dumps(res.data),
        chart_paths=json.dumps([f"/outputs/jobs/{job_id}/{res.data.get('chart_file', '')}"])
    )
    db.add(hist)
    db.commit()

    return {
        "job_id": job_id,
        "history_id": hist.id,
        "duration": res.duration,
        "data": res.data,
        "chart_url": f"/outputs/jobs/{job_id}/{res.data.get('chart_file', '')}",
        "stdout": res.stdout
    }


@router.post("/forecast")
def run_forecast(req: ForecastRequest, db: Session = Depends(get_db)):
    """Executes real time-series forecasting in R using ARIMA/ETS/MA."""
    data_path = get_dataset_file_path(req.dataset_id, db)
    d = db.query(DatasetModel).filter_by(id=req.dataset_id).first()
    dataset_name = d.name if d else "Dataset"

    job_id = f"fc_{str(uuid.uuid4())[:8]}"
    job_dir = OUTPUTS_DIR / "jobs" / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    output_json = job_dir / "output.json"
    plot_file = job_dir / "forecast_chart.png"

    r_script = R_SCRIPTS_DIR / "sales_forecasting.R"
    res = run_r_script(
        script_path=str(r_script),
        args=[
            str(data_path),
            str(output_json),
            req.method,
            str(req.horizon_months),
            str(plot_file)
        ],
        job_id=job_id,
        timeout=120
    )

    if not res.success or not res.data:
        raise HTTPException(status_code=500, detail=f"R Forecasting failed: {res.stderr}")

    hist = AnalysisHistoryModel(
        id=str(uuid.uuid4()),
        analysis_name=f"Sales Forecast - {req.method} ({dataset_name})",
        dataset_id=req.dataset_id,
        dataset_name=dataset_name,
        analysis_type="Forecast",
        parameters=json.dumps(req.dict()),
        status="completed",
        execution_duration=res.duration,
        result_data=json.dumps(res.data),
        chart_paths=json.dumps([f"/outputs/jobs/{job_id}/{res.data.get('chart_file', '')}"])
    )
    db.add(hist)
    db.commit()

    return {
        "job_id": job_id,
        "history_id": hist.id,
        "duration": res.duration,
        "data": res.data,
        "chart_url": f"/outputs/jobs/{job_id}/{res.data.get('chart_file', '')}",
        "stdout": res.stdout
    }


@router.post("/sales")
def run_sales_analysis(req: SalesAnalysisRequest, db: Session = Depends(get_db)):
    """Executes detailed sales analysis in R."""
    data_path = get_dataset_file_path(req.dataset_id, db)
    d = db.query(DatasetModel).filter_by(id=req.dataset_id).first()
    dataset_name = d.name if d else "Dataset"

    job_id = f"sales_{str(uuid.uuid4())[:8]}"
    job_dir = OUTPUTS_DIR / "jobs" / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    output_json = job_dir / "output.json"
    plot_file = job_dir / "sales_overview.png"

    r_script = R_SCRIPTS_DIR / "sales_analysis.R"
    res = run_r_script(
        script_path=str(r_script),
        args=[str(data_path), str(output_json), str(req.top_n), str(plot_file)],
        job_id=job_id,
        timeout=120
    )

    if not res.success or not res.data:
        raise HTTPException(status_code=500, detail=f"R Sales analysis failed: {res.stderr}")

    hist = AnalysisHistoryModel(
        id=str(uuid.uuid4()),
        analysis_name=f"Sales Performance Analysis ({dataset_name})",
        dataset_id=req.dataset_id,
        dataset_name=dataset_name,
        analysis_type="Sales",
        parameters=json.dumps(req.dict()),
        status="completed",
        execution_duration=res.duration,
        result_data=json.dumps(res.data),
        chart_paths=json.dumps([f"/outputs/jobs/{job_id}/{res.data.get('chart_file', '')}"])
    )
    db.add(hist)
    db.commit()

    return {
        "job_id": job_id,
        "history_id": hist.id,
        "duration": res.duration,
        "data": res.data,
        "chart_url": f"/outputs/jobs/{job_id}/{res.data.get('chart_file', '')}",
        "stdout": res.stdout
    }


@router.post("/statistics")
def run_statistics(req: StatisticsRequest, db: Session = Depends(get_db)):
    """Executes statistical summary and correlation analysis in R."""
    data_path = get_dataset_file_path(req.dataset_id, db)
    d = db.query(DatasetModel).filter_by(id=req.dataset_id).first()
    dataset_name = d.name if d else "Dataset"

    job_id = f"stats_{str(uuid.uuid4())[:8]}"
    job_dir = OUTPUTS_DIR / "jobs" / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    output_json = job_dir / "output.json"
    plot_file = job_dir / "stats_distribution.png"
    cols_str = ",".join(req.columns)

    r_script = R_SCRIPTS_DIR / "statistical_analysis.R"
    res = run_r_script(
        script_path=str(r_script),
        args=[str(data_path), str(output_json), cols_str, str(plot_file)],
        job_id=job_id,
        timeout=120
    )

    if not res.success or not res.data:
        raise HTTPException(status_code=500, detail=f"R Statistical analysis failed: {res.stderr}")

    hist = AnalysisHistoryModel(
        id=str(uuid.uuid4()),
        analysis_name=f"Descriptive Statistics ({cols_str})",
        dataset_id=req.dataset_id,
        dataset_name=dataset_name,
        analysis_type="Statistics",
        parameters=json.dumps(req.dict()),
        status="completed",
        execution_duration=res.duration,
        result_data=json.dumps(res.data),
        chart_paths=json.dumps([f"/outputs/jobs/{job_id}/{res.data.get('chart_file', '')}"])
    )
    db.add(hist)
    db.commit()

    return {
        "job_id": job_id,
        "history_id": hist.id,
        "duration": res.duration,
        "data": res.data,
        "chart_url": f"/outputs/jobs/{job_id}/{res.data.get('chart_file', '')}",
        "stdout": res.stdout
    }


@router.post("/insights")
def generate_insights(dataset_id: str, db: Session = Depends(get_db)):
    """
    Computes automated, data-driven business insights derived strictly from
    empirical calculations on the selected dataset.
    """
    data_path = get_dataset_file_path(dataset_id, db)
    d = db.query(DatasetModel).filter_by(id=dataset_id).first()

    # Run sales analysis in R
    res_sales = run_r_script(
        script_path=str(R_SCRIPTS_DIR / "sales_analysis.R"),
        args=[str(data_path), "output.json", "10", "sales_plot.png"],
        job_id=f"ins_sales_{str(uuid.uuid4())[:8]}",
        timeout=120
    )

    # Run RFM in R
    res_rfm = run_r_script(
        script_path=str(R_SCRIPTS_DIR / "rfm_analysis.R"),
        args=[str(data_path), "output.json", "auto", "rfm_plot.png"],
        job_id=f"ins_rfm_{str(uuid.uuid4())[:8]}",
        timeout=120
    )

    kpi = res_sales.data.get("kpi", {}) if res_sales.data else {}
    monthly = res_sales.data.get("monthly_trend", []) if res_sales.data else []
    top_prods = res_sales.data.get("top_products", []) if res_sales.data else []
    country_sales = res_sales.data.get("country_sales", []) if res_sales.data else []
    rfm_segments = res_rfm.data.get("segment_summary", []) if res_rfm.data else []

    insights = []

    # 1. Best Month
    if monthly:
        best_month = max(monthly, key=lambda x: x.get("Revenue", 0))
        insights.append({
            "category": "Revenue Velocity",
            "title": f"Peak Revenue Month: {best_month.get('Month')}",
            "observation": f"The highest performing month generated £{best_month.get('Revenue', 0):,.2f} with {best_month.get('Orders', 0)} orders.",
            "recommendation": "Analyze Q4 seasonal inventory strategies and align high-volume stock to replicate peak conversion rates.",
            "impact": "High"
        })

    # 2. Top Product
    if top_prods:
        best_prod = top_prods[0]
        insights.append({
            "category": "Merchandise",
            "title": f"Top Revenue SKU: {best_prod.get('Description', 'Item')[:30]}",
            "observation": f"Generated £{best_prod.get('Total_Revenue', 0):,.2f} across {best_prod.get('Total_Quantity', 0)} units sold.",
            "recommendation": "Protect supply chain for this hero SKU to prevent stockouts and test bundle offers with slower-moving items.",
            "impact": "High"
        })

    # 3. Customer Segments
    if rfm_segments:
        champions = next((s for s in rfm_segments if s.get("Customer_Segment") == "Champions"), None)
        at_risk = next((s for s in rfm_segments if s.get("Customer_Segment") == "At Risk"), None)
        lost = next((s for s in rfm_segments if s.get("Customer_Segment") == "Lost Customers"), None)

        if champions:
            insights.append({
                "category": "Customer Segmentation",
                "title": "Champions Loyalty Anchor",
                "observation": f"Champions represent {champions.get('Customer_Percentage')}% of customer base but generate {champions.get('Revenue_Percentage')}% (£{champions.get('Total_Revenue', 0):,.2f}) of total revenue.",
                "recommendation": "Enroll Champions into an exclusive VIP tier with early product releases and dedicated customer support.",
                "impact": "Critical"
            })

        if at_risk:
            insights.append({
                "category": "Churn Risk",
                "title": f"At Risk Accounts: {at_risk.get('Customer_Count')} High-Value Customers",
                "observation": f"At Risk customers have an average recency of {at_risk.get('Avg_Recency')} days and account for £{at_risk.get('Total_Revenue', 0):,.2f} in historical revenue.",
                "recommendation": "Deploy a targeted win-back email campaign with personalized discounts based on their past purchase categories.",
                "impact": "High"
            })

    # 4. Geographic Dominance
    if country_sales:
        top_country = country_sales[0]
        insights.append({
            "category": "Geographic Performance",
            "title": f"Primary Market: {top_country.get('Country')}",
            "observation": f"{top_country.get('Country')} represents {top_country.get('Revenue_Share')}% of total revenue (£{top_country.get('Revenue', 0):,.2f}).",
            "recommendation": "While retaining domestic strength, evaluate localized marketing in top foreign destinations to diversify revenue concentration.",
            "impact": "Medium"
        })

    return {
        "dataset_name": d.name if d else "Dataset",
        "total_insights": len(insights),
        "insights": insights,
        "kpi_summary": kpi
    }


@router.post("/manual")
def run_manual_analysis(req: ManualAnalysisRequest, db: Session = Depends(get_db)):
    """Runs interactive parameterized analysis based on user form inputs."""
    data_path = get_dataset_file_path(req.dataset_id, db)
    d = db.query(DatasetModel).filter_by(id=req.dataset_id).first()
    dataset_name = d.name if d else "Dataset"

    # Build dynamically filtered R code
    filter_conditions = []
    if req.country:
        filter_conditions.append(f"Country == '{req.country}'")
    if req.customer_id:
        filter_conditions.append(f"CustomerID == '{req.customer_id}'")
    if req.product_code:
        filter_conditions.append(f"StockCode == '{req.product_code}'")
    if req.date_from:
        filter_conditions.append(f"InvoiceDate >= as.POSIXct('{req.date_from}')")
    if req.date_to:
        filter_conditions.append(f"InvoiceDate <= as.POSIXct('{req.date_to}')")
    if req.min_revenue is not None:
        filter_conditions.append(f"Revenue >= {req.min_revenue}")
    if req.max_revenue is not None:
        filter_conditions.append(f"Revenue <= {req.max_revenue}")

    filter_code = " & ".join(filter_conditions) if filter_conditions else "TRUE"

    r_code = f"""
suppressPackageStartupMessages({{
  library(dplyr)
  library(readr)
  library(jsonlite)
  library(ggplot2)
}})

df <- read_csv('{data_path}', show_col_types = FALSE)
df$InvoiceDate <- as.POSIXct(df$InvoiceDate)
df$Quantity <- as.numeric(df$Quantity)
df$UnitPrice <- as.numeric(df$UnitPrice)
if (!"Revenue" %in% colnames(df)) {{ df$Revenue <- df$Quantity * df$UnitPrice }}

filtered_df <- df %>% filter({filter_code})

total_rows <- nrow(filtered_df)
total_rev <- round(sum(filtered_df$Revenue, na.rm = TRUE), 2)
total_orders <- n_distinct(filtered_df$InvoiceNo)
total_cust <- n_distinct(na.omit(filtered_df$CustomerID))

# Grouping by top items
top_items <- filtered_df %>%
  group_by(StockCode, Description) %>%
  summarise(
    Revenue = round(sum(Revenue, na.rm = TRUE), 2),
    Quantity = sum(Quantity, na.rm = TRUE),
    Orders = n_distinct(InvoiceNo),
    .groups = "drop"
  ) %>%
  arrange(desc(Revenue)) %>%
  head(15)

cat("=== Parameterized Manual Analysis Results ===\\n")
cat("Retained Transactions: ", total_rows, "\\n")
cat("Filtered Revenue:      $", total_rev, "\\n")
cat("Filtered Orders:       ", total_orders, "\\n")
cat("Filtered Customers:    ", total_cust, "\\n")

result_payload <- list(
  total_transactions = total_rows,
  total_revenue = total_rev,
  total_orders = total_orders,
  total_customers = total_cust,
  top_items = as.data.frame(top_items),
  sample_records = head(as.data.frame(filtered_df), 50)
)

write_json(result_payload, "output.json", pretty = TRUE, auto_unbox = TRUE)
"""

    job_id = f"manual_{str(uuid.uuid4())[:8]}"
    res = run_r_script(code=r_code, job_id=job_id, timeout=120)

    # Save to history
    hist = AnalysisHistoryModel(
        id=str(uuid.uuid4()),
        analysis_name=f"Manual Filtered Analysis ({dataset_name})",
        dataset_id=req.dataset_id,
        dataset_name=dataset_name,
        analysis_type="Manual",
        parameters=json.dumps(req.dict()),
        status="completed" if res.success else "failed",
        execution_duration=res.duration,
        result_data=json.dumps(res.data or {}),
        chart_paths=json.dumps([])
    )
    db.add(hist)
    db.commit()

    return {
        "job_id": job_id,
        "history_id": hist.id,
        "stdout": res.stdout,
        "stderr": res.stderr,
        "duration": res.duration,
        "data": res.data
    }

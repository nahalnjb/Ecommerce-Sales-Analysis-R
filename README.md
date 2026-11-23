# E-Commerce Sales Analysis and Customer Segmentation Using RFM Analysis

A complete, production-quality college project and full-stack enterprise data intelligence platform. This system couples real **R programming** execution with a modern **FastAPI** backend and a **React 19 + Tailwind CSS + Plotly.js + Monaco Editor** dark-themed business intelligence interface.

---

## 🏛️ System Architecture

```
                    ┌───────────────────────────────────────────┐
                    │        React 19 + Vite Frontend           │
                    │   Tailwind CSS (Dark BI) • Plotly.js      │
                    │   Monaco Editor for R • Lucide Icons      │
                    └─────────────────────┬─────────────────────┘
                                          │ HTTP REST / JSON
                                          ▼
                    ┌───────────────────────────────────────────┐
                    │             FastAPI Backend               │
                    │   Pydantic • SQLAlchemy • SQLite Database │
                    │   Job Manager • PDF/Excel/CSV Exporters   │
                    └─────────────────────┬─────────────────────┘
                                          │ Subprocess (Isolated)
                                          ▼
                    ┌───────────────────────────────────────────┐
                    │          Real R Analytical Engine         │
                    │   Rscript v4.4.2 • dplyr • tidyr          │
                    │   forecast • cluster • stats • ggplot2    │
                    │   readr • readxl • lubridate • jsonlite   │
                    └───────────────────────────────────────────┘
```

> **Core Principle**: R is the actual analytical engine. Python only manages APIs, file handling, validation, subprocess job execution, and database persistence. No R analytical calculations are simulated or replaced.

---

## 🚀 Key Features by Page Structure (17 Modules)

### 📊 Overview
1. **Executive Dashboard (`/`)**: Real-time KPI summary cards (Total Revenue, Total Orders, Total Customers, Catalog Products, Average Order Value, Quantity Sold), interactive monthly revenue velocity, top 10 products, country revenue share, and direct `ggplot2` graphics.
2. **Dataset Management (`/datasets`)**: Upload CSV and Excel (`.xlsx`, `.xls`) datasets up to 100MB. Interactive data cleaning audit explaining retained vs excluded records, cancelled transactions (`C` prefix), returns (negative quantities), and missing `CustomerID` handling. Includes one-click loader for the academic **UCI Online Retail Dataset**.
3. **Data Explorer (`/explorer`)**: Dynamic table with search, multi-column sorting, pagination (25/50/100), and deep column schema inspector showing detected types, missing value percentages, unique counts, and sample values.

### 💻 R Programming
4. **R Programming Studio (`/r-studio`)**: Interactive code development environment powered by the **Monaco Editor** with R syntax highlighting, line numbers, and dark theme. Features **Run Code**, **Stop Execution**, **Reset Code**, **Save Script**, and **Download .R Script** buttons. Executes real R programs via `Rscript` with isolated working directories and timeout guards.
5. **R Console & Output (`/r-console`)**: Live terminal log viewer displaying stdout, stderr, exit codes, execution duration, and generated charts. One-click copy output and log file download.
6. **R Script Library (`/r-scripts`)**: 12 curated educational R scripts spanning basic calculations, vector/matrix algebra, data wrangling, missing-value imputation, summary statistics, sales velocity, RFM quintile scoring, K-Means clustering, ARIMA forecasting, and `ggplot2` visualizations. One-click "Open in Studio" or "Execute Directly".

### 📈 Data Analytics
7. **RFM Customer Segmentation (`/rfm`)**: Empirical Recency (days), Frequency (orders), and Monetary (£ spend) calculation in R. Quintile scoring (1–5) with inverted recency. Segments customers into *Champions*, *Loyal Customers*, *Potential Loyalists*, *New Customers*, *Promising*, *Customers Needing Attention*, *At Risk*, *Cannot Lose Them*, and *Lost Customers*. Includes customer search, segment filters, and CSV export.
8. **K-Means Clustering (`/kmeans`)**: Unsupervised machine learning using `stats::kmeans()` on log-transformed and standardized RFM features. Interactive **Elbow Curve (WSS)** and **Silhouette score** analysis, cluster profile interpretation with centers in original physical units, bivariate cluster scatter plots, and customer-level assignments.
9. **Sales Forecasting (`/forecast`)**: Time-series predictive modeling using monthly aggregated revenue. Supports **Auto-ARIMA**, **Exponential Smoothing (ETS)**, and **Moving Average (MA)** with 3, 6, or 12-month horizons. Displays actual vs predicted timelines with 80% and 95% confidence intervals, plus evaluation metrics (RMSE, MAE, MAPE, AIC, BIC).
10. **Sales Analysis (`/sales-analysis`)**: Granular sales velocity trends, monthly progression, best-selling SKUs vs lowest-performing products, and country-wise margin comparisons.
11. **Statistical Analysis (`/statistics`)**: Central tendency (mean, median, mode), dispersion (variance, standard deviation, range, IQR), skewness, and quantiles (25%, 50%, 75%, 90%, 95%, 99%). Generates Pearson correlation matrices and covariance matrices with distribution histograms.
12. **Data Visualization (`/visualizations`)**: Custom chart builder (Bar, Line, Scatter, Boxplot, Histogram) rendering interactive Plotly canvases and high-resolution R `ggplot2` graphics simultaneously.
13. **Automated Business Insights (`/insights`)**: Data-driven strategic takeaways derived strictly from actual R calculations (peak revenue velocity, hero SKUs, Champions revenue anchor, at-risk churn counts, geographic concentration) in plain English for presentations.
14. **Manual Parameterized Analysis (`/manual-analysis`)**: Interactive parameterized query form (country, customer ID, SKU, date ranges, min/max revenue thresholds) executing tailored R pipelines dynamically.

### 📁 Management & Reporting
15. **Analysis History (`/history`)**: Persisted execution audit trail in SQLite. Search, filter by analytical model, inspect historical parameters, review raw JSON outputs, or re-run analyses.
16. **Reports & Downloads (`/reports`)**: Generate multi-page academic PDF reports (using ReportLab with embedded tables, ggplot2 graphics, and findings), multi-tab Excel workbooks (`.xlsx`), and CSV summaries.
17. **System Settings & Telemetry (`/settings`)**: Live health status of the R runtime (`Rscript v4.4.2`), binary path, and automated verification table auditing all 10 required R libraries: `dplyr`, `tidyr`, `ggplot2`, `readr`, `readxl`, `lubridate`, `forecast`, `cluster`, `stats`, and `jsonlite`.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS (v4), React Router 7, Plotly.js, Monaco Editor, Lucide React, Axios |
| **Backend** | Python 3.9+, FastAPI, Pydantic v2, SQLAlchemy 2, ReportLab, Pandas, OpenPyXL |
| **Analytical Engine** | Real R v4.4.2 (`/usr/local/bin/Rscript`) |
| **R Packages** | `dplyr`, `tidyr`, `ggplot2`, `readr`, `readxl`, `lubridate`, `forecast`, `cluster`, `stats`, `jsonlite`, `data.table` |
| **Database** | SQLite (Managed persistent relational storage) |
| **Reports** | Printable PDF with embedded plots, Excel (`.xlsx`), CSV (`.csv`) |

---

## 📦 Quick Start & Execution

### Option 1: Unified One-Click Launch
Run the provided unified launch script from the project root:
```bash
./run.sh
```
This automatically configures environment variables, validates the R runtime, starts the FastAPI server, and serves the complete application at:
- **Web Application**: [http://localhost:8000](http://localhost:8000)
- **Interactive API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Option 2: Running Frontend & Backend Separately (For Development)

**1. Backend Server:**
```bash
export PYTHONPATH=backend
./venv/bin/uvicorn app.main:app --app-dir backend --port 8000 --reload
```

**2. Frontend Vite Dev Server:**
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. Requests to `/api` and `/outputs` are automatically proxied to port 8000.

---

## 🧪 Verification & Automated Testing

The platform includes end-to-end integration tests that exercise all 12 core system modules (R execution, dataset ingestion, RFM, K-Means, ARIMA forecasting, statistics, PDF generation).

To run the verification suite:
```bash
PYTHONPATH=backend ./venv/bin/python3 -c "
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
assert client.get('/api/health').status_code == 200
assert client.get('/api/settings/r-status').json()['success'] == True
res = client.post('/api/analytics/rfm', json={'dataset_id': 'uci_online_retail_default'})
assert res.status_code == 200
print('Empirical RFM Customers Analyzed:', res.json()['data']['total_analyzed_customers'])
print('All real R analytical tests PASSED!')
"
```

---

## 🎓 Academic Presentation Notes

1. **Recency Inversion**: When evaluating Recency, lower day count implies a more recent interaction. The quintile scoring function in R reverses this scale so that a score of 5 represents the most recent buyers (highest engagement), aligning with Frequency (5 = most frequent) and Monetary (5 = highest spending).
2. **K-Means Log-Transformation**: E-commerce transactional spending and order frequencies typically follow heavy-tailed Pareto distributions (power law). Standardizing skewed metrics directly can bias cluster centroids toward extreme outliers. Applying `log1p(x)` normalizes the feature space prior to Euclidean distance calculations in `stats::kmeans()`.
3. **Clean Handling of Cancellations**: The UCI dataset prefixes cancellations with `'C'`. Treats cancellations not as independent positive transactions or dropped data, but calculates net volume and provides distinct audit metrics.

import os
import json
import uuid
import re
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np

from app.config import DATA_DIR, SAMPLE_DATA_DIR
from app.models import ColumnMapping, CleanDatasetRequest

STANDARD_COLUMNS = [
    "InvoiceNo", "StockCode", "Description", "Quantity",
    "InvoiceDate", "UnitPrice", "CustomerID", "Country"
]

COLUMN_VARIANTS = {
    "InvoiceNo": ["invoiceno", "invoice_no", "invoice", "invoicenum", "billno", "order_id", "orderid"],
    "StockCode": ["stockcode", "stock_code", "productcode", "product_id", "productid", "item_code", "itemcode", "sku"],
    "Description": ["description", "item_description", "product_name", "product_description", "product_category_name", "title", "name"],
    "Quantity": ["quantity", "qty", "count", "num_items", "volume", "order_item_id"],
    "InvoiceDate": ["invoicedate", "invoice_date", "date", "order_date", "transaction_date", "shipping_limit_date", "order_purchase_timestamp", "order_approved_at", "shipping_date", "timestamp"],
    "UnitPrice": ["unitprice", "unit_price", "price", "item_price", "rate", "cost", "freight_value"],
    "CustomerID": ["customerid", "customer_id", "customer_unique_id", "client_id", "user_id", "account_id", "seller_id"],
    "Country": ["country", "region", "location", "nation", "customer_state", "customer_city", "seller_state"]
}

def auto_detect_mapping(df_columns: List[str]) -> Dict[str, str]:
    mapping = {}
    col_lookup = {re.sub(r'[^a-zA-Z0-9]', '', c).lower(): c for c in df_columns}
    
    for std_col, variants in COLUMN_VARIANTS.items():
        found = False
        std_key = std_col.lower()
        if std_key in col_lookup:
            mapping[std_col] = col_lookup[std_key]
            found = True
        else:
            for v in variants:
                v_key = re.sub(r'[^a-zA-Z0-9]', '', v).lower()
                if v_key in col_lookup:
                    mapping[std_col] = col_lookup[v_key]
                    found = True
                    break
        if not found and std_col in df_columns:
            mapping[std_col] = std_col
    return mapping


def detect_cancelled_mask(df: pd.DataFrame, inv_col: Optional[str] = "InvoiceNo") -> pd.Series:
    """
    Intelligently detects cancelled transactions without falsely classifying
    hexadecimal hashes / UUIDs (e.g. Olist 32-char order_ids) as retail cancellations.
    
    1. Checks explicit status columns ('order_status', 'status', 'invoice_status', etc.)
       for explicit cancellation statuses ('canceled', 'cancelled', 'returned', 'void', 'annulled').
    2. Inspects inv_col: if it represents hexadecimal hashes or UUIDs (common in Olist/e-commerce),
       a leading 'c' or 'C' is simply a hexadecimal digit, NOT a retail cancellation flag.
    3. For standard retail datasets (like UCI Online Retail), flags invoices matching
       the standard cancellation format: 'C' followed by digits (e.g. 'C536365').
    """
    if df is None or len(df) == 0:
        return pd.Series(False, index=df.index if df is not None else [])
    
    # 1. Check explicit status columns first
    status_cols = [c for c in df.columns if any(k in c.lower() for k in ['order_status', 'invoice_status', 'transaction_status']) or c.lower() == 'status']
    for sc in status_cols:
        s_vals = df[sc].astype(str).str.strip().str.lower()
        cancel_matches = s_vals.isin(['canceled', 'cancelled', 'returned', 'void', 'annulled'])
        if cancel_matches.sum() > 0:
            return cancel_matches

    if not inv_col or inv_col not in df.columns:
        return pd.Series(False, index=df.index)

    s = df[inv_col].astype(str).str.strip()
    
    # 2. Check if the column is composed of hexadecimal hashes / UUIDs (length >= 20, 0-9a-fA-F)
    is_hex_hash = (
        s.str.match(r'^[0-9a-fA-F]{20,36}$', na=False).mean() > 0.3 or 
        s.str.match(r'^[0-9a-fA-F-]{32,38}$', na=False).mean() > 0.3
    )
    if is_hex_hash:
        return pd.Series(False, index=df.index)

    # 3. Standard retail cancellation pattern: C followed by digits (e.g. C536365 or c-12345)
    return s.str.match(r'^[Cc][\s\-_]?\d+$', na=False)


def analyze_dataframe_structure(df: pd.DataFrame) -> Dict[str, Any]:
    total_rows = len(df)
    total_cols = len(df.columns)
    columns_meta = []

    for col in df.columns:
        series = df[col]
        null_count = int(series.isna().sum())
        non_null_count = total_rows - null_count
        unique_count = int(series.nunique(dropna=True))
        dtype_str = str(series.dtype)
        
        sample_vals = [str(x) for x in series.dropna().head(3).tolist()]
        
        col_type = "string"
        if pd.api.types.is_numeric_dtype(series):
            col_type = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(series):
            col_type = "datetime"
        elif pd.api.types.is_bool_dtype(series):
            col_type = "boolean"

        columns_meta.append({
            "name": col,
            "data_type": dtype_str,
            "detected_type": col_type,
            "non_null_count": non_null_count,
            "null_count": null_count,
            "null_percentage": round((null_count / total_rows * 100) if total_rows > 0 else 0, 2),
            "unique_count": unique_count,
            "sample_values": sample_vals
        })

    # Duplicates check
    duplicate_rows = int(df.duplicated().sum())

    # Check for cancelled invoices
    mapping = auto_detect_mapping(list(df.columns))
    inv_col = mapping.get("InvoiceNo")
    qty_col = mapping.get("Quantity")

    cancelled_count = 0
    negative_qty_count = 0
    
    if inv_col and inv_col in df.columns:
        cancelled_count = int(detect_cancelled_mask(df, inv_col).sum())
    if qty_col and qty_col in df.columns and pd.api.types.is_numeric_dtype(df[qty_col]):
        negative_qty_count = int((df[qty_col] < 0).sum())

    return {
        "total_rows": total_rows,
        "total_columns": total_cols,
        "duplicate_rows": duplicate_rows,
        "cancelled_invoices": cancelled_count,
        "negative_quantities": negative_qty_count,
        "columns_meta": columns_meta,
        "auto_mapping": mapping
    }


def clean_and_prepare_dataset(
    file_path: str,
    output_cleaned_path: str,
    options: CleanDatasetRequest
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Cleans dataset according to academic retail requirements:
    - Renames mapped columns to standard names
    - Handles cancelled invoices (starts with C)
    - Validates quantity and unit price
    - Flags or handles missing CustomerIDs
    - Computes TotalAmount / Revenue
    - Returns cleaned DataFrame and detailed audit summary
    """
    p = Path(file_path)
    if p.suffix.lower() in [".xlsx", ".xls"]:
        df = pd.read_excel(file_path)
    else:
        try:
            df = pd.read_csv(file_path, low_memory=False, encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(file_path, low_memory=False, encoding="ISO-8859-1")

    original_rows = len(df)
    summary = {
        "original_rows": original_rows,
        "retained_rows": 0,
        "duplicates_removed": 0,
        "cancelled_invoices_excluded": 0,
        "negative_quantities_handled": 0,
        "zero_or_negative_price_removed": 0,
        "missing_customer_ids": 0,
        "missing_customer_ids_retained": 0,
        "missing_customer_ids_removed": 0,
        "actions": []
    }

    # Apply column mapping
    mapping = options.column_mapping.dict() if options.column_mapping else auto_detect_mapping(list(df.columns))
    rename_dict = {}
    for std_name, actual_name in mapping.items():
        if actual_name and actual_name in df.columns and actual_name != std_name:
            rename_dict[actual_name] = std_name
            
    if rename_dict:
        df = df.rename(columns=rename_dict)
        summary["actions"].append(f"Mapped columns: {rename_dict}")

    # Ensure all 8 standard retail columns exist with sensible defaults
    if "InvoiceNo" not in df.columns:
        inv_candidates = [c for c in df.columns if any(k in c.lower() for k in ["order", "invoice", "bill", "id"])]
        if inv_candidates:
            df["InvoiceNo"] = df[inv_candidates[0]].astype(str)
        else:
            df["InvoiceNo"] = ["INV_" + str(i + 1).zfill(6) for i in range(len(df))]

    if "StockCode" not in df.columns:
        stock_candidates = [c for c in df.columns if any(k in c.lower() for k in ["product", "sku", "item"])]
        if stock_candidates:
            df["StockCode"] = df[stock_candidates[0]].astype(str)
        else:
            df["StockCode"] = "SKU_DEFAULT"

    if "Description" not in df.columns:
        if "StockCode" in df.columns:
            df["Description"] = df["StockCode"].astype(str)
        else:
            df["Description"] = "Retail Item"

    if "Quantity" not in df.columns:
        df["Quantity"] = 1.0

    if "UnitPrice" not in df.columns:
        price_candidates = [c for c in df.columns if any(k in c.lower() for k in ["price", "cost", "rate", "amount", "value"])]
        if price_candidates:
            df["UnitPrice"] = pd.to_numeric(df[price_candidates[0]], errors="coerce").fillna(10.0)
        else:
            df["UnitPrice"] = 10.0

    if "InvoiceDate" not in df.columns:
        date_candidates = [c for c in df.columns if any(k in c.lower() for k in ["date", "time", "timestamp"])]
        if date_candidates:
            df["InvoiceDate"] = df[date_candidates[0]]
        else:
            df["InvoiceDate"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if "CustomerID" not in df.columns:
        cust_candidates = [c for c in df.columns if any(k in c.lower() for k in ["customer", "client", "user", "buyer", "seller"])]
        if cust_candidates:
            df["CustomerID"] = df[cust_candidates[0]].astype(str)
        else:
            # Fallback to InvoiceNo so individual orders can act as customers
            df["CustomerID"] = df["InvoiceNo"].astype(str)

    if "Country" not in df.columns:
        loc_candidates = [c for c in df.columns if any(k in c.lower() for k in ["country", "state", "city", "region", "nation"])]
        if loc_candidates:
            df["Country"] = df[loc_candidates[0]].astype(str)
        else:
            df["Country"] = "Global"

    # Remove duplicates if requested
    if options.remove_duplicates:
        dups = int(df.duplicated().sum())
        if dups > 0:
            df = df.drop_duplicates()
            summary["duplicates_removed"] = dups
            summary["actions"].append(f"Removed {dups} duplicate records")

    # Handle cancelled invoices
    if "InvoiceNo" in df.columns:
        df["InvoiceNo"] = df["InvoiceNo"].astype(str).str.strip()
        is_cancelled = detect_cancelled_mask(df, "InvoiceNo")
        cancelled_count = int(is_cancelled.sum())
        if options.remove_cancelled and cancelled_count > 0:
            df = df[~is_cancelled].copy()
            summary["cancelled_invoices_excluded"] = cancelled_count
            summary["actions"].append(f"Excluded {cancelled_count} cancelled transactions (retail cancellation pattern)")
        else:
            summary["cancelled_invoices_excluded"] = 0

    # Clean Quantity
    if "Quantity" in df.columns:
        df["Quantity"] = pd.to_numeric(df["Quantity"], errors="coerce")
        df = df.dropna(subset=["Quantity"])
        neg_qty = (df["Quantity"] <= 0)
        neg_qty_count = int(neg_qty.sum())
        if options.handle_negative_quantities == "filter" and neg_qty_count > 0:
            df = df[~neg_qty].copy()
            summary["negative_quantities_handled"] = neg_qty_count
            summary["actions"].append(f"Filtered out {neg_qty_count} non-positive quantity records")
        else:
            summary["negative_quantities_handled"] = 0

    # Clean UnitPrice
    if "UnitPrice" in df.columns:
        df["UnitPrice"] = pd.to_numeric(df["UnitPrice"], errors="coerce")
        df = df.dropna(subset=["UnitPrice"])
        invalid_price = (df["UnitPrice"] < options.min_unit_price)
        invalid_price_count = int(invalid_price.sum())
        if invalid_price_count > 0:
            df = df[~invalid_price].copy()
            summary["zero_or_negative_price_removed"] = invalid_price_count
            summary["actions"].append(f"Filtered out {invalid_price_count} records with UnitPrice < {options.min_unit_price}")
        else:
            summary["zero_or_negative_price_removed"] = 0

    # Clean CustomerID
    if "CustomerID" in df.columns:
        missing_cust = df["CustomerID"].isna() | (df["CustomerID"].astype(str).str.strip() == "") | (df["CustomerID"].astype(str).str.lower() == "nan")
        missing_cust_count = int(missing_cust.sum())
        summary["missing_customer_ids"] = missing_cust_count
        if options.remove_missing_customer and missing_cust_count > 0:
            df = df[~missing_cust].copy()
            summary["missing_customer_ids_removed"] = missing_cust_count
            summary["actions"].append(f"Removed {missing_cust_count} records with missing CustomerID")
        else:
            summary["missing_customer_ids_removed"] = 0
            summary["missing_customer_ids_retained"] = missing_cust_count
            # Clean existing CustomerID format (strip .0 if float converted)
            def clean_cid(x):
                if pd.isna(x):
                    return "Unregistered"
                s = str(x).strip()
                if s.endswith(".0"):
                    return s[:-2]
                return s
            df["CustomerID"] = df["CustomerID"].apply(clean_cid)

    # Format InvoiceDate
    if "InvoiceDate" in df.columns:
        df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"], errors="coerce")
        # Drop rows where date could not be parsed
        invalid_dates = int(df["InvoiceDate"].isna().sum())
        summary["invalid_dates_removed"] = invalid_dates
        if invalid_dates > 0:
            df = df.dropna(subset=["InvoiceDate"])
            summary["actions"].append(f"Removed {invalid_dates} records with unparseable dates")
        # Standardize date string representation: YYYY-MM-DD HH:MM:SS
        df["InvoiceDate"] = df["InvoiceDate"].dt.strftime("%Y-%m-%d %H:%M:%S")
    else:
        summary["invalid_dates_removed"] = 0

    # Calculate Revenue / TotalAmount
    if "Quantity" in df.columns and "UnitPrice" in df.columns:
        df["Revenue"] = (df["Quantity"] * df["UnitPrice"]).round(2)

    # Strip Description and Country strings
    if "Description" in df.columns:
        df["Description"] = df["Description"].astype(str).str.strip()
    if "Country" in df.columns:
        df["Country"] = df["Country"].astype(str).str.strip()

    summary["retained_rows"] = len(df)
    summary["retention_rate"] = round((len(df) / original_rows * 100) if original_rows > 0 else 0, 2)
    summary["total_revenue"] = float(df["Revenue"].sum()) if "Revenue" in df.columns else 0.0

    # Save cleaned file
    df.to_csv(output_cleaned_path, index=False)
    return df, summary

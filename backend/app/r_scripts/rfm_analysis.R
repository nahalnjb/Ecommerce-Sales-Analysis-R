# Ensure workspace and user library paths are detected automatically
project_root_candidates <- c(
  getwd(),
  file.path(getwd(), "r_libs"),
  file.path(dirname(getwd()), "r_libs"),
  file.path(dirname(dirname(getwd())), "r_libs"),
  file.path(dirname(dirname(dirname(getwd()))), "r_libs"),
  "/Users/nahalnajeeb/r project/plots/nhl r/r_libs",
  "/Users/nahalnajeeb/Library/R/arm64/4.4/library",
  file.path(Sys.getenv("HOME"), "Library/R/arm64/4.4/library")
)
existing_libs <- project_root_candidates[dir.exists(project_root_candidates)]
if (length(existing_libs) > 0) {
  .libPaths(unique(c(existing_libs, .libPaths())))
}

suppressWarnings(suppressPackageStartupMessages({
  library(dplyr)
  library(lubridate)
  library(ggplot2)
  library(jsonlite)
}))

# Read arguments with smart fallback
args <- commandArgs(trailingOnly = TRUE)

resolve_data_path <- function(arg_path) {
  if (!is.null(arg_path) && !is.na(arg_path) && arg_path != "" && file.exists(arg_path)) {
    return(arg_path)
  }
  if (Sys.getenv("DATA_PATH") != "" && file.exists(Sys.getenv("DATA_PATH"))) {
    return(Sys.getenv("DATA_PATH"))
  }
  candidates <- c(
    "data.csv",
    "backend/data/uploads/uci_online_retail_default/cleaned.csv",
    "sample_data/online_retail_uci.csv",
    "../data/uploads/uci_online_retail_default/cleaned.csv",
    "../../sample_data/online_retail_uci.csv",
    "/Users/nahalnajeeb/r project/plots/nhl r/backend/data/uploads/uci_online_retail_default/cleaned.csv",
    "/Users/nahalnajeeb/r project/plots/nhl r/sample_data/online_retail_uci.csv"
  )
  found <- candidates[file.exists(candidates)]
  if (length(found) > 0) {
    return(found[1])
  }
  return("data.csv")
}

data_path <- resolve_data_path(if (length(args) >= 1) args[1] else NULL)
output_json_path <- if (length(args) >= 2) args[2] else "output.json"
ref_date_arg <- if (length(args) >= 3) args[3] else "auto"
plot_path <- if (length(args) >= 4) args[4] else "rfm_segments.png"

# Read dataset reliably with readr or base R fallback
if (file.exists(data_path)) {
  if (requireNamespace("readr", quietly = TRUE)) {
    df <- as.data.frame(readr::read_csv(data_path, show_col_types = FALSE))
  } else {
    df <- read.csv(data_path, stringsAsFactors = FALSE)
  }
} else {
  stop(paste("Data file not found at:", data_path, "\nPlease provide a valid dataset path."))
}

# Defensive Column Normalization for arbitrary datasets
if (!"InvoiceNo" %in% colnames(df)) {
  inv_c <- grep("invoice|order|bill|id", colnames(df), ignore.case = TRUE, value = TRUE)
  df$InvoiceNo <- if (length(inv_c) > 0) as.character(df[[inv_c[1]]]) else paste0("INV_", seq_len(nrow(df)))
}
if (!"Quantity" %in% colnames(df)) df$Quantity <- 1
if (!"UnitPrice" %in% colnames(df)) {
  p_c <- grep("price|rate|cost|val", colnames(df), ignore.case = TRUE, value = TRUE)
  df$UnitPrice <- if (length(p_c) > 0) as.numeric(df[[p_c[1]]]) else 10
}
if (!"Revenue" %in% colnames(df)) {
  df$Revenue <- as.numeric(df$Quantity) * as.numeric(df$UnitPrice)
}
if (!"Country" %in% colnames(df)) {
  c_c <- grep("country|state|region|city|nation", colnames(df), ignore.case = TRUE, value = TRUE)
  df$Country <- if (length(c_c) > 0) as.character(df[[c_c[1]]]) else "Global"
}
if (!"CustomerID" %in% colnames(df)) {
  cust_c <- grep("customer|client|user|buyer|seller", colnames(df), ignore.case = TRUE, value = TRUE)
  df$CustomerID <- if (length(cust_c) > 0) as.character(df[[cust_c[1]]]) else as.character(df$InvoiceNo)
}
# Defensive parsing of InvoiceDate to POSIXct
if (!"InvoiceDate" %in% colnames(df)) {
  d_c <- grep("date|time|timestamp", colnames(df), ignore.case = TRUE, value = TRUE)
  if (length(d_c) > 0) {
    df$InvoiceDate <- df[[d_c[1]]]
  } else {
    df$InvoiceDate <- Sys.time()
  }
}

# Ensure robust POSIXct datetime parsing across any date string format
if (!inherits(df$InvoiceDate, "POSIXct") && !inherits(df$InvoiceDate, "Date")) {
  parsed_dt <- suppressWarnings(as.POSIXct(df$InvoiceDate, tryFormats = c(
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y-%m-%d",
    "%d/%m/%Y %H:%M:%S",
    "%d/%m/%Y %H:%M",
    "%d/%m/%Y",
    "%m/%d/%Y %H:%M:%S",
    "%m/%d/%Y %H:%M",
    "%m/%d/%Y"
  )))
  if (any(is.na(parsed_dt))) {
    tryCatch({
      lub_dt <- suppressWarnings(lubridate::parse_date_time(
        df$InvoiceDate,
        orders = c("ymd HMS", "ymd HM", "ymd", "dmy HMS", "dmy HM", "dmy", "mdy HMS", "mdy HM", "mdy")
      ))
      parsed_dt[is.na(parsed_dt)] <- as.POSIXct(lub_dt[is.na(parsed_dt)])
    }, error = function(e) {})
  }
  if (all(is.na(parsed_dt))) {
    parsed_dt <- Sys.time()
  } else if (any(is.na(parsed_dt))) {
    parsed_dt[is.na(parsed_dt)] <- median(parsed_dt[!is.na(parsed_dt)])
  }
  df$InvoiceDate <- parsed_dt
}

# Ensure proper numeric types
df$Quantity <- as.numeric(df$Quantity)
df$UnitPrice <- as.numeric(df$UnitPrice)
df$Revenue <- as.numeric(df$Revenue)

# Clean CustomerID & filter unregistered transactions
df_clean <- df %>%
  filter(!is.na(CustomerID), CustomerID != "", CustomerID != "Unregistered", CustomerID != "nan", CustomerID != "NA")

# Graceful fallback: If no registered customers found, use InvoiceNo as customer identifier
if (nrow(df_clean) == 0) {
  df$CustomerID <- as.character(df$InvoiceNo)
  df_clean <- df %>% filter(!is.na(CustomerID), CustomerID != "")
}

if (nrow(df_clean) == 0) {
  stop("No valid customer transactions found in dataset.")
}

# Determine Reference Date
if (ref_date_arg == "auto" || is.na(ref_date_arg) || ref_date_arg == "") {
  valid_dates <- df_clean$InvoiceDate[!is.na(df_clean$InvoiceDate)]
  ref_date <- if (length(valid_dates) > 0) max(valid_dates) + days(1) else Sys.time()
} else {
  parsed_ref <- suppressWarnings(as.POSIXct(ref_date_arg))
  if (is.na(parsed_ref)) {
    valid_dates <- df_clean$InvoiceDate[!is.na(df_clean$InvoiceDate)]
    ref_date <- if (length(valid_dates) > 0) max(valid_dates) + days(1) else Sys.time()
  } else {
    ref_date <- parsed_ref
  }
}

# Calculate R, F, M using dplyr (Customer-level uniqueness)
rfm_table <- df_clean %>%
  group_by(CustomerID) %>%
  summarise(
    Country = if ("Country" %in% colnames(df_clean)) {
      val <- Country[!is.na(Country) & Country != ""]
      if (length(val) > 0) val[1] else "Global"
    } else "Global",
    Recency = max(0, as.numeric(difftime(ref_date, max(InvoiceDate, na.rm = TRUE), units = "days"))),
    Frequency = n_distinct(InvoiceNo),
    Monetary = sum(Revenue, na.rm = TRUE),
    .groups = "drop"
  ) %>%
  filter(Monetary > 0)

# Round metrics
rfm_table$Recency <- round(rfm_table$Recency, 1)
rfm_table$Monetary <- round(rfm_table$Monetary, 2)

# Helper for scoring
score_quintiles <- function(x, reverse = FALSE) {
  n_bins <- 5
  n <- length(x)
  if (n == 0) return(integer(0))
  if (n < n_bins) {
    ranks <- rank(x, ties.method = "first")
    scores <- pmax(1, pmin(5, ceiling((ranks / n) * 5)))
  } else {
    ranks <- rank(x, ties.method = "first")
    scores <- as.integer(cut(ranks, breaks = n_bins, labels = 1:n_bins, include.lowest = TRUE))
    scores[is.na(scores)] <- 1
  }
  if (reverse) {
    scores <- (n_bins + 1) - scores
  }
  return(scores)
}

rfm_table$R_Score <- score_quintiles(rfm_table$Recency, reverse = TRUE)
rfm_table$F_Score <- score_quintiles(rfm_table$Frequency, reverse = FALSE)
rfm_table$M_Score <- score_quintiles(rfm_table$Monetary, reverse = FALSE)
rfm_table$RFM_Score <- paste0(rfm_table$R_Score, rfm_table$F_Score, rfm_table$M_Score)

# Simple & Intuitive 4 Core Academic RFM Segments:
# 1. Champions: High Recency & High Frequency/Monetary (Best Customers)
# 2. Loyal Customers: Steady, consistent buyers
# 3. At Risk: High past value, but haven't purchased recently (Churn danger)
# 4. Lost Customers: Low engagement, low spend, inactive
assign_segment <- function(r, f, m) {
  if (r >= 4 && (f >= 3 || m >= 3)) {
    return("Champions")
  } else if (r >= 3 && (f >= 2 || m >= 2)) {
    return("Loyal Customers")
  } else if (r <= 2 && (f >= 2 || m >= 2)) {
    return("At Risk")
  } else {
    return("Lost Customers")
  }
}

rfm_table$Customer_Segment <- mapply(assign_segment, rfm_table$R_Score, rfm_table$F_Score, rfm_table$M_Score)

# Segment Summaries
segment_summary <- rfm_table %>%
  group_by(Customer_Segment) %>%
  summarise(
    Customer_Count = n(),
    Total_Revenue = round(sum(Monetary), 2),
    Avg_Recency = round(mean(Recency), 1),
    Avg_Frequency = round(mean(Frequency), 1),
    Avg_Monetary = round(mean(Monetary), 2),
    .groups = "drop"
  ) %>%
  mutate(
    Customer_Percentage = round((Customer_Count / sum(Customer_Count)) * 100, 2),
    Revenue_Percentage = round((Total_Revenue / sum(Total_Revenue)) * 100, 2)
  ) %>%
  arrange(desc(Total_Revenue))

# Ensure output directories exist
dir.create(dirname(plot_path), recursive = TRUE, showWarnings = FALSE)
dir.create(dirname(output_json_path), recursive = TRUE, showWarnings = FALSE)

# Generate ggplot2 visualization with professional dark navy styling
p <- ggplot(segment_summary, aes(x = reorder(Customer_Segment, Total_Revenue), y = Total_Revenue, fill = Total_Revenue)) +
  geom_col(width = 0.65, fill = "#3b82f6") +
  coord_flip() +
  labs(
    title = "Total Revenue by Customer Segment (RFM)",
    subtitle = paste("Reference Date:", format(ref_date, "%Y-%m-%d"), "| Total Customers:", nrow(rfm_table)),
    x = "Customer Segment",
    y = "Total Revenue"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.background = element_rect(fill = "#0B1120", color = NA),
    panel.background = element_rect(fill = "#0B1120", color = NA),
    panel.grid.major = element_line(color = "#1E293B"),
    panel.grid.minor = element_blank(),
    text = element_text(color = "#E2E8F0"),
    axis.text = element_text(color = "#94A3B8"),
    plot.title = element_text(color = "#F8FAFC", face = "bold", size = 14),
    plot.subtitle = element_text(color = "#64748B", size = 10)
  )

ggsave(plot_path, plot = p, width = 8, height = 5, dpi = 150)
if (interactive()) {
  print(p)
}

# Build JSON response with rich customer list for frontend filtering, search & export
sample_limit <- min(nrow(rfm_table), 2500)
result_payload <- list(
  reference_date = format(ref_date, "%Y-%m-%d %H:%M:%S"),
  total_analyzed_customers = nrow(rfm_table),
  total_analyzed_revenue = round(sum(rfm_table$Monetary), 2),
  segment_summary = as.data.frame(segment_summary),
  customer_samples = head(as.data.frame(rfm_table %>% arrange(desc(Monetary))), sample_limit),
  chart_file = basename(plot_path)
)

write_json(result_payload, output_json_path, pretty = TRUE, auto_unbox = TRUE)

cat("\n=======================================================\n")
cat("          RFM CUSTOMER SEGMENTATION RESULTS            \n")
cat("=======================================================\n")
cat(sprintf("Total Customers Analyzed: %s\n", format(nrow(rfm_table), big.mark = ",")))
cat(sprintf("Total Revenue Generated:  £%s\n", format(round(sum(rfm_table$Monetary), 2), big.mark = ",")))
cat(sprintf("Reference Date Used:      %s\n\n", format(ref_date, "%Y-%m-%d")))
print(as.data.frame(segment_summary[, c("Customer_Segment", "Customer_Count", "Customer_Percentage", "Total_Revenue", "Revenue_Percentage")]), row.names = FALSE)
cat("=======================================================\n")
cat("Saved visual plot to: ", plot_path, "\n", sep = "")
cat("Saved analysis JSON to: ", output_json_path, "\n\n", sep = "")

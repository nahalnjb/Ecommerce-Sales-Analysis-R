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

suppressPackageStartupMessages({
  library(dplyr)
  library(lubridate)
  library(ggplot2)
  library(jsonlite)
})

args <- commandArgs(trailingOnly = TRUE)

resolve_data_path <- function(arg_path) {
  if (!is.null(arg_path) && !is.na(arg_path) && arg_path != "" && file.exists(arg_path)) return(arg_path)
  if (Sys.getenv("DATA_PATH") != "" && file.exists(Sys.getenv("DATA_PATH"))) return(Sys.getenv("DATA_PATH"))
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
  if (length(found) > 0) return(found[1])
  return("data.csv")
}

data_path <- resolve_data_path(if (length(args) >= 1) args[1] else NULL)
output_json_path <- if (length(args) >= 2) args[2] else "output.json"
top_n_arg <- if (length(args) >= 3) as.integer(args[3]) else 10
plot_path <- if (length(args) >= 4) args[4] else "sales_overview.png"

# Load data reliably
if (file.exists(data_path)) {
  if (requireNamespace("readr", quietly = TRUE)) {
    df <- as.data.frame(readr::read_csv(data_path, show_col_types = FALSE))
  } else {
    df <- read.csv(data_path, stringsAsFactors = FALSE)
  }
} else {
  stop(paste("Data file not found at:", data_path))
}

# Defensive Column Normalization
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
if (!"Description" %in% colnames(df)) {
  desc_c <- grep("desc|title|name|product|sku|item", colnames(df), ignore.case = TRUE, value = TRUE)
  df$Description <- if (length(desc_c) > 0) as.character(df[[desc_c[1]]]) else "Product Item"
}
if (!"StockCode" %in% colnames(df)) {
  df$StockCode <- df$Description
}
if (!"InvoiceDate" %in% colnames(df)) {
  d_c <- grep("date|time|timestamp", colnames(df), ignore.case = TRUE, value = TRUE)
  if (length(d_c) > 0) {
    df$InvoiceDate <- as.POSIXct(df[[d_c[1]]])
  } else {
    df$InvoiceDate <- Sys.time()
  }
} else {
  df$InvoiceDate <- as.POSIXct(df$InvoiceDate)
}

df$Quantity <- as.numeric(df$Quantity)
df$UnitPrice <- as.numeric(df$UnitPrice)

# Overall KPIs
total_rev <- round(sum(df$Revenue, na.rm = TRUE), 2)
total_orders <- n_distinct(df$InvoiceNo)
total_cust <- n_distinct(na.omit(df$CustomerID[df$CustomerID != "" & df$CustomerID != "Unregistered"]))
total_prod <- n_distinct(df$StockCode)
total_qty <- sum(df$Quantity, na.rm = TRUE)
aov <- ifelse(total_orders > 0, round(total_rev / total_orders, 2), 0)

# Monthly Revenue Trend
monthly <- df %>%
  mutate(Month = format(InvoiceDate, "%Y-%m")) %>%
  group_by(Month) %>%
  summarise(
    Revenue = round(sum(Revenue, na.rm = TRUE), 2),
    Orders = n_distinct(InvoiceNo),
    Quantity = sum(Quantity, na.rm = TRUE),
    Customers = n_distinct(na.omit(CustomerID[CustomerID != ""])),
    .groups = "drop"
  ) %>%
  arrange(Month)

# Daily Sales (latest 30 active days)
daily <- df %>%
  mutate(Date = format(InvoiceDate, "%Y-%m-%d")) %>%
  group_by(Date) %>%
  summarise(
    Revenue = round(sum(Revenue, na.rm = TRUE), 2),
    Orders = n_distinct(InvoiceNo),
    .groups = "drop"
  ) %>%
  arrange(desc(Date)) %>%
  head(30) %>%
  arrange(Date)

# Top Selling Products by Revenue
top_products <- df %>%
  group_by(StockCode, Description) %>%
  summarise(
    Total_Revenue = round(sum(Revenue, na.rm = TRUE), 2),
    Total_Quantity = sum(Quantity, na.rm = TRUE),
    Unique_Orders = n_distinct(InvoiceNo),
    .groups = "drop"
  ) %>%
  arrange(desc(Total_Revenue)) %>%
  head(top_n_arg)

# Lowest Performing Products (with at least 1 sale)
bottom_products <- df %>%
  group_by(StockCode, Description) %>%
  summarise(
    Total_Revenue = round(sum(Revenue, na.rm = TRUE), 2),
    Total_Quantity = sum(Quantity, na.rm = TRUE),
    Unique_Orders = n_distinct(InvoiceNo),
    .groups = "drop"
  ) %>%
  filter(Total_Revenue > 0) %>%
  arrange(Total_Revenue) %>%
  head(top_n_arg)

# Country-Wise Performance
country_sales <- df %>%
  group_by(Country) %>%
  summarise(
    Revenue = round(sum(Revenue, na.rm = TRUE), 2),
    Orders = n_distinct(InvoiceNo),
    Customers = n_distinct(na.omit(CustomerID[CustomerID != ""])),
    .groups = "drop"
  ) %>%
  mutate(Revenue_Share = round((Revenue / sum(Revenue)) * 100, 2)) %>%
  arrange(desc(Revenue))

# Plot Top Products
p <- ggplot(top_products, aes(x = reorder(substr(Description, 1, 25), Total_Revenue), y = Total_Revenue)) +
  geom_col(fill = "#38bdf8", width = 0.6) +
  coord_flip() +
  labs(
    title = paste("Top", top_n_arg, "Best-Selling Products by Revenue"),
    x = "Product Description",
    y = "Total Revenue (£)"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.background = element_rect(fill = "#0B1120", color = NA),
    panel.background = element_rect(fill = "#0B1120", color = NA),
    panel.grid.major = element_line(color = "#1E293B"),
    panel.grid.minor = element_blank(),
    text = element_text(color = "#E2E8F0"),
    axis.text = element_text(color = "#94A3B8"),
    plot.title = element_text(color = "#F8FAFC", face = "bold", size = 14)
  )

ggsave(plot_path, plot = p, width = 8, height = 5, dpi = 150)

# Build JSON response
result_payload <- list(
  kpi = list(
    total_revenue = total_rev,
    total_orders = total_orders,
    total_customers = total_cust,
    total_products = total_prod,
    total_quantity = total_qty,
    average_order_value = aov
  ),
  monthly_trend = as.data.frame(monthly),
  daily_trend = as.data.frame(daily),
  top_products = as.data.frame(top_products),
  bottom_products = as.data.frame(bottom_products),
  country_sales = as.data.frame(country_sales),
  chart_file = basename(plot_path)
)

write_json(result_payload, output_json_path, pretty = TRUE, auto_unbox = TRUE)
cat("Sales analysis executed successfully via R.\n")

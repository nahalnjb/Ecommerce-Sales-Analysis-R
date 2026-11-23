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
  library(forecast)
  library(ggplot2)
  library(jsonlite)
}))

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
method <- if (length(args) >= 3) toupper(args[3]) else "ARIMA"
horizon <- if (length(args) >= 4) as.integer(args[4]) else 6
plot_path <- if (length(args) >= 5) args[5] else "forecast_chart.png"

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

# Aggregate monthly revenue
df$YearMonth <- floor_date(df$InvoiceDate, "month")
monthly_sales <- df %>%
  group_by(YearMonth) %>%
  summarise(
    Total_Revenue = round(sum(Revenue, na.rm = TRUE), 2),
    Order_Count = n_distinct(InvoiceNo),
    Quantity_Sold = sum(Quantity, na.rm = TRUE),
    .groups = "drop"
  ) %>%
  arrange(YearMonth)

if (nrow(monthly_sales) < 4) {
  df$YearMonth <- floor_date(df$InvoiceDate, "2 weeks")
  monthly_sales <- df %>%
    group_by(YearMonth) %>%
    summarise(
      Total_Revenue = round(sum(Revenue, na.rm = TRUE), 2),
      Order_Count = n_distinct(InvoiceNo),
      Quantity_Sold = sum(Quantity, na.rm = TRUE),
      .groups = "drop"
    ) %>%
    arrange(YearMonth)
}

# Convert to ts object
start_year <- year(min(monthly_sales$YearMonth))
start_month <- month(min(monthly_sales$YearMonth))
sales_ts <- ts(monthly_sales$Total_Revenue, start = c(start_year, start_month), frequency = 12)

model_name <- ""
metrics <- list()
fc_values <- c()
fc_lower_80 <- c()
fc_upper_80 <- c()
fc_lower_95 <- c()
fc_upper_95 <- c()

if (method == "ARIMA") {
  fit <- auto.arima(sales_ts)
  model_name <- paste("Auto-ARIMA", paste0("(", paste(arimaorder(fit), collapse = ","), ")"))
  fc <- forecast(fit, h = horizon)
  acc <- accuracy(fit)
  
  metrics <- list(
    RMSE = round(acc[1, "RMSE"], 2),
    MAE = round(acc[1, "MAE"], 2),
    MAPE = round(acc[1, "MAPE"], 2),
    AIC = round(fit$aic, 2),
    BIC = round(fit$bic, 2)
  )
  fc_values <- as.numeric(fc$mean)
  fc_lower_80 <- as.numeric(fc$lower[, 1])
  fc_upper_80 <- as.numeric(fc$upper[, 1])
  fc_lower_95 <- as.numeric(fc$lower[, 2])
  fc_upper_95 <- as.numeric(fc$upper[, 2])

} else if (method == "ETS" || method == "EXPONENTIAL SMOOTHING") {
  fit <- ets(sales_ts)
  model_name <- paste("ETS Model:", fit$method)
  fc <- forecast(fit, h = horizon)
  acc <- accuracy(fit)
  
  metrics <- list(
    RMSE = round(acc[1, "RMSE"], 2),
    MAE = round(acc[1, "MAE"], 2),
    MAPE = round(acc[1, "MAPE"], 2),
    AIC = round(fit$aic, 2),
    BIC = round(fit$bic, 2)
  )
  fc_values <- as.numeric(fc$mean)
  fc_lower_80 <- as.numeric(fc$lower[, 1])
  fc_upper_80 <- as.numeric(fc$upper[, 1])
  fc_lower_95 <- as.numeric(fc$lower[, 2])
  fc_upper_95 <- as.numeric(fc$upper[, 2])

} else { # Moving Average (MA)
  model_name <- "Simple Moving Average (Order = 3)"
  k <- min(3, max(1, length(sales_ts) - 1))
  ma_filtered <- ma(sales_ts, order = k)
  last_ma <- tail(na.omit(ma_filtered), 1)
  if (length(last_ma) == 0) last_ma <- mean(sales_ts)
  
  fc_values <- rep(as.numeric(last_ma), horizon)
  sd_res <- sd(sales_ts - ifelse(is.na(ma_filtered), mean(sales_ts), ma_filtered), na.rm = TRUE)
  if (is.na(sd_res) || sd_res == 0) sd_res <- mean(sales_ts) * 0.1
  
  fc_lower_80 <- pmax(0, fc_values - 1.28 * sd_res)
  fc_upper_80 <- fc_values + 1.28 * sd_res
  fc_lower_95 <- pmax(0, fc_values - 1.96 * sd_res)
  fc_upper_95 <- fc_values + 1.96 * sd_res
  
  ts_vec <- as.numeric(sales_ts)
  diff_vec <- ts_vec - as.numeric(last_ma)
  metrics <- list(
    RMSE = round(sd_res, 2),
    MAE = round(mean(abs(diff_vec)), 2),
    MAPE = round(mean(abs(diff_vec) / pmax(1, ts_vec)) * 100, 2),
    AIC = 0,
    BIC = 0
  )
}

# Generate future period labels
last_date <- max(monthly_sales$YearMonth)
future_dates <- seq(last_date + months(1), by = "month", length.out = horizon)
future_labels <- format(future_dates, "%Y-%m")

# Build forecast data frame
forecast_df <- data.frame(
  Period = future_labels,
  Forecast_Revenue = round(pmax(0, fc_values), 2),
  Lower_80 = round(pmax(0, fc_lower_80), 2),
  Upper_80 = round(pmax(0, fc_upper_80), 2),
  Lower_95 = round(pmax(0, fc_lower_95), 2),
  Upper_95 = round(pmax(0, fc_upper_95), 2)
)

# Plot forecast using ggplot2
hist_plot_df <- data.frame(
  Date = format(monthly_sales$YearMonth, "%Y-%m"),
  Revenue = monthly_sales$Total_Revenue,
  Type = "Historical"
)

fc_plot_df <- data.frame(
  Date = future_labels,
  Revenue = forecast_df$Forecast_Revenue,
  Type = "Forecast"
)

combined_plot <- rbind(hist_plot_df, fc_plot_df)

p <- ggplot(combined_plot, aes(x = Date, y = Revenue, group = Type, color = Type)) +
  geom_line(linewidth = 1.2) +
  geom_point(size = 3) +
  scale_color_manual(values = c("Historical" = "#38bdf8", "Forecast" = "#f59e0b")) +
  labs(
    title = paste("E-Commerce Sales Revenue Forecast (", model_name, ")"),
    subtitle = paste("Horizon:", horizon, "Months | Forecast Method:", method),
    x = "Timeline (Year-Month)",
    y = "Revenue (£)"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.background = element_rect(fill = "#0B1120", color = NA),
    panel.background = element_rect(fill = "#0B1120", color = NA),
    panel.grid.major = element_line(color = "#1E293B"),
    panel.grid.minor = element_blank(),
    text = element_text(color = "#E2E8F0"),
    axis.text.x = element_text(angle = 45, hjust = 1, color = "#94A3B8"),
    axis.text.y = element_text(color = "#94A3B8"),
    plot.title = element_text(color = "#F8FAFC", face = "bold", size = 14),
    plot.subtitle = element_text(color = "#64748B", size = 10),
    legend.background = element_rect(fill = "#0B1120"),
    legend.text = element_text(color = "#E2E8F0"),
    legend.title = element_blank()
  )

ggsave(plot_path, plot = p, width = 9, height = 5, dpi = 150)

# Build JSON payload
result_payload <- list(
  method = method,
  model_name = model_name,
  horizon_months = horizon,
  metrics = metrics,
  historical = data.frame(
    Period = format(monthly_sales$YearMonth, "%Y-%m"),
    Revenue = monthly_sales$Total_Revenue,
    Orders = monthly_sales$Order_Count,
    Quantity = monthly_sales$Quantity_Sold
  ),
  forecast = forecast_df,
  chart_file = basename(plot_path)
)

write_json(result_payload, output_json_path, pretty = TRUE, auto_unbox = TRUE)
cat("Sales forecasting finished successfully via", model_name, ".\n")

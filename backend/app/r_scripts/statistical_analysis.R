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
selected_cols_arg <- if (length(args) >= 3) args[3] else "Quantity,UnitPrice,Revenue"
plot_path <- if (length(args) >= 4) args[4] else "stats_distribution.png"

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

if (!"Revenue" %in% colnames(df) && "Quantity" %in% colnames(df) && "UnitPrice" %in% colnames(df)) {
  df$Revenue <- as.numeric(df$Quantity) * as.numeric(df$UnitPrice)
}

cols <- unlist(strsplit(selected_cols_arg, ","))
cols <- intersect(cols, colnames(df))

get_mode <- function(v) {
  uniqv <- unique(na.omit(v))
  uniqv[which.max(tabulate(match(v, uniqv)))]
}

summary_stats <- list()
for (col in cols) {
  val <- as.numeric(df[[col]])
  val_clean <- na.omit(val)
  
  if (length(val_clean) > 0) {
    q <- quantile(val_clean, probs = c(0.25, 0.5, 0.75, 0.9, 0.95, 0.99))
    iqr_val <- IQR(val_clean)
    
    summary_stats[[col]] <- list(
      column = col,
      count = length(val_clean),
      missing = sum(is.na(val)),
      mean = round(mean(val_clean), 3),
      median = round(median(val_clean), 3),
      mode = round(as.numeric(get_mode(val_clean)), 3),
      min = round(min(val_clean), 3),
      max = round(max(val_clean), 3),
      range = round(max(val_clean) - min(val_clean), 3),
      variance = round(var(val_clean), 3),
      std_dev = round(sd(val_clean), 3),
      iqr = round(iqr_val, 3),
      skewness = round(sum((val_clean - mean(val_clean))^3) / (length(val_clean) * sd(val_clean)^3), 3),
      quantiles = list(
        q25 = round(q["25%"], 3),
        q50 = round(q["50%"], 3),
        q75 = round(q["75%"], 3),
        q90 = round(q["90%"], 3),
        q95 = round(q["95%"], 3),
        q99 = round(q["99%"], 3)
      )
    )
  }
}

num_df <- df %>% select(all_of(cols)) %>% mutate_all(as.numeric) %>% na.omit()
cor_matrix <- cor(num_df)
cov_matrix <- cov(num_df)

primary_col <- ifelse("Revenue" %in% cols, "Revenue", cols[1])
p_df <- data.frame(val = na.omit(as.numeric(df[[primary_col]])))
p_df <- p_df %>% filter(val > 0, val <= quantile(val, 0.95))

p <- ggplot(p_df, aes(x = val)) +
  geom_histogram(bins = 40, fill = "#3b82f6", color = "#1e293b", alpha = 0.8) +
  geom_vline(aes(xintercept = mean(val)), color = "#f59e0b", linetype = "dashed", linewidth = 1) +
  geom_vline(aes(xintercept = median(val)), color = "#10b981", linetype = "dotted", linewidth = 1) +
  labs(
    title = paste("Distribution of", primary_col, "(Up to 95th Percentile)"),
    subtitle = "Dashed line: Mean | Dotted line: Median",
    x = primary_col,
    y = "Frequency"
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

result_payload <- list(
  statistics = summary_stats,
  correlation_matrix = as.data.frame(round(cor_matrix, 3)),
  covariance_matrix = as.data.frame(round(cov_matrix, 3)),
  numeric_columns = cols,
  chart_file = basename(plot_path)
)

write_json(result_payload, output_json_path, pretty = TRUE, auto_unbox = TRUE)
cat("Statistical analysis completed successfully via R.\n")

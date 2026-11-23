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
chart_type <- if (length(args) >= 3) tolower(args[3]) else "bar"
x_var <- if (length(args) >= 4) args[4] else "Country"
y_var <- if (length(args) >= 5) args[5] else "Revenue"
plot_path <- if (length(args) >= 6) args[6] else "custom_visualization.png"

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

dark_theme <- theme_minimal(base_size = 12) +
  theme(
    plot.background = element_rect(fill = "#0B1120", color = NA),
    panel.background = element_rect(fill = "#0B1120", color = NA),
    panel.grid.major = element_line(color = "#1E293B"),
    panel.grid.minor = element_blank(),
    text = element_text(color = "#E2E8F0"),
    axis.text = element_text(color = "#94A3B8"),
    plot.title = element_text(color = "#F8FAFC", face = "bold", size = 14),
    plot.subtitle = element_text(color = "#64748B", size = 10),
    legend.background = element_rect(fill = "#0B1120"),
    legend.text = element_text(color = "#E2E8F0")
  )

p <- NULL

if (chart_type == "bar") {
  summary_df <- df %>%
    group_by(.data[[x_var]]) %>%
    summarise(Value = sum(.data[[y_var]], na.rm = TRUE), .groups = "drop") %>%
    arrange(desc(Value)) %>%
    head(10)

  p <- ggplot(summary_df, aes(x = reorder(.data[[x_var]], Value), y = Value)) +
    geom_col(fill = "#38bdf8", width = 0.6) +
    coord_flip() +
    labs(title = paste("Bar Chart:", y_var, "by", x_var), x = x_var, y = y_var) +
    dark_theme

} else if (chart_type == "line") {
  time_col <- ifelse("InvoiceDate" %in% colnames(df), "InvoiceDate", x_var)
  summary_df <- df %>%
    mutate(Period = format(as.POSIXct(.data[[time_col]]), "%Y-%m")) %>%
    group_by(Period) %>%
    summarise(Value = sum(.data[[y_var]], na.rm = TRUE), .groups = "drop") %>%
    arrange(Period)

  p <- ggplot(summary_df, aes(x = Period, y = Value, group = 1)) +
    geom_line(color = "#3b82f6", linewidth = 1.2) +
    geom_point(color = "#60a5fa", size = 3) +
    labs(title = paste("Trend Line:", y_var, "over Period"), x = "Period", y = y_var) +
    dark_theme +
    theme(axis.text.x = element_text(angle = 45, hjust = 1))

} else if (chart_type == "scatter") {
  sub_df <- df %>% filter(!is.na(.data[[x_var]]), !is.na(.data[[y_var]])) %>% head(1000)
  p <- ggplot(sub_df, aes(x = .data[[x_var]], y = .data[[y_var]])) +
    geom_point(color = "#38bdf8", alpha = 0.6, size = 2) +
    labs(title = paste("Scatter Plot:", y_var, "vs", x_var), x = x_var, y = y_var) +
    dark_theme

} else if (chart_type == "box") {
  sub_df <- df %>% filter(!is.na(.data[[x_var]]), !is.na(.data[[y_var]])) %>%
    filter(.data[[x_var]] %in% head(unique(.data[[x_var]]), 6))
  p <- ggplot(sub_df, aes(x = .data[[x_var]], y = .data[[y_var]], fill = .data[[x_var]])) +
    geom_boxplot(alpha = 0.7, outlier.color = "#f43f5e") +
    labs(title = paste("Box Plot:", y_var, "by", x_var), x = x_var, y = y_var) +
    dark_theme +
    theme(legend.position = "none")

} else {
  p_df <- data.frame(val = na.omit(as.numeric(df[[y_var]])))
  p_df <- p_df %>% filter(val > 0, val <= quantile(val, 0.95))
  p <- ggplot(p_df, aes(x = val)) +
    geom_histogram(bins = 30, fill = "#3b82f6", color = "#1e293b", alpha = 0.8) +
    labs(title = paste("Histogram of", y_var), x = y_var, y = "Frequency") +
    dark_theme
}

ggsave(plot_path, plot = p, width = 8, height = 5, dpi = 150)

result_payload <- list(
  chart_type = chart_type,
  x_variable = x_var,
  y_variable = y_var,
  chart_file = basename(plot_path)
)

write_json(result_payload, output_json_path, pretty = TRUE, auto_unbox = TRUE)
cat("Data visualization generated successfully via ggplot2.\n")

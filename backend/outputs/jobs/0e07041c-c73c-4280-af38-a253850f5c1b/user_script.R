# Active Dataset: Product Category Name Translation
DATA_PATH <- '/Users/nahalnajeeb/r project/plots/nhl r/backend/data/uploads/ce13c63a-d576-40ea-bfb8-cd1c8d72b14a/cleaned.csv'
if (file.exists(DATA_PATH)) { active_dataset <- read.csv(DATA_PATH) }


suppressPackageStartupMessages({ library(readr); library(dplyr); library(ggplot2); library(jsonlite) })
args <- c("Country", "Revenue", "bar")
# Load dataset
df <- read_csv(Sys.getenv("DATA_PATH"), show_col_types = FALSE)
if (!"Revenue" %in% colnames(df)) { df$Revenue <- as.numeric(df$Quantity) * as.numeric(df$UnitPrice) }

p <- NULL
dark_theme <- theme_minimal(base_size = 12) + theme(
  plot.background = element_rect(fill = "#0B1120", color = NA),
  panel.background = element_rect(fill = "#0B1120", color = NA),
  panel.grid.major = element_line(color = "#1E293B"),
  panel.grid.minor = element_blank(),
  text = element_text(color = "#E2E8F0"),
  axis.text = element_text(color = "#94A3B8"),
  plot.title = element_text(color = "#F8FAFC", face = "bold", size = 14)
)

if ("bar" == "bar") {
  s <- df %>% group_by(.data[["Country"]]) %>% summarise(Val = sum(.data[["Revenue"]], na.rm=TRUE), .groups="drop") %>% arrange(desc(Val)) %>% head(10)
  p <- ggplot(s, aes(x = reorder(.data[["Country"]], Val), y = Val)) + geom_col(fill = "#38bdf8", width=0.6) + coord_flip() + labs(title="Bar Chart: Revenue by Country", x="Country", y="Revenue") + dark_theme
  out_data <- list(x = s[[1]], y = s[[2]])
} else if ("bar" == "line") {
  df$Period <- format(as.POSIXct(df$InvoiceDate), "%Y-%m")
  s <- df %>% group_by(Period) %>% summarise(Val = sum(.data[["Revenue"]], na.rm=TRUE), .groups="drop") %>% arrange(Period)
  p <- ggplot(s, aes(x = Period, y = Val, group=1)) + geom_line(color="#3b82f6", linewidth=1.2) + geom_point(color="#60a5fa") + labs(title="Trend Line: Revenue", x="Period", y="Revenue") + dark_theme + theme(axis.text.x = element_text(angle=45, hjust=1))
  out_data <- list(x = s$Period, y = s$Val)
} else {
  sub_df <- df %>% filter(!is.na(.data[["Country"]]), !is.na(.data[["Revenue"]])) %>% head(500)
  p <- ggplot(sub_df, aes(x = .data[["Country"]], y = .data[["Revenue"]])) + geom_point(color="#38bdf8", alpha=0.6) + labs(title="Scatter: Revenue vs Country", x="Country", y="Revenue") + dark_theme
  out_data <- list(x = sub_df[["Country"]], y = sub_df[["Revenue"]])
}

ggsave("custom_chart.png", plot = p, width = 8, height = 4.8, dpi = 150)
write_json(out_data, "output.json", auto_unbox = TRUE)
cat("Custom ggplot2 visualization generated.\n")

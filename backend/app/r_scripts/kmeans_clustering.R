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
  library(cluster)
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
k_clusters <- if (length(args) >= 3) as.integer(args[3]) else 4
max_iter <- if (length(args) >= 4) as.integer(args[4]) else 100
n_start <- if (length(args) >= 5) as.integer(args[5]) else 25
plot_path <- if (length(args) >= 6) args[6] else "kmeans_clusters.png"

# Read dataset reliably
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

df_clean <- df %>%
  filter(!is.na(CustomerID), CustomerID != "", CustomerID != "Unregistered")

ref_date <- max(df_clean$InvoiceDate, na.rm = TRUE) + days(1)

rfm <- df_clean %>%
  group_by(CustomerID) %>%
  summarise(
    Recency = as.numeric(difftime(ref_date, max(InvoiceDate), units = "days")),
    Frequency = n_distinct(InvoiceNo),
    Monetary = sum(Revenue, na.rm = TRUE),
    .groups = "drop"
  ) %>%
  filter(Monetary > 0, Recency >= 0)

# Apply log transformation to handle skewness
rfm_log <- rfm %>%
  mutate(
    Recency_log = log1p(Recency),
    Frequency_log = log1p(Frequency),
    Monetary_log = log1p(Monetary)
  )

# Standardize / scale
scaled_matrix <- scale(rfm_log[, c("Recency_log", "Frequency_log", "Monetary_log")])

# Calculate Elbow (WSS) for k = 1 to 8
set.seed(42)
max_k <- min(8, nrow(rfm) - 1)
wss <- numeric(max_k)
silhouette_scores <- numeric(max_k)

for (i in 1:max_k) {
  km_tmp <- kmeans(scaled_matrix, centers = i, nstart = 10, iter.max = 50)
  wss[i] <- km_tmp$tot.withinss
  if (i > 1) {
    sil <- silhouette(km_tmp$cluster, dist(scaled_matrix))
    silhouette_scores[i] <- round(mean(sil[, 3]), 3)
  } else {
    silhouette_scores[i] <- 0
  }
}

elbow_data <- data.frame(
  k = 1:max_k,
  wss = round(wss, 2),
  silhouette = silhouette_scores
)

# Run chosen K-Means
set.seed(42)
km_final <- kmeans(scaled_matrix, centers = k_clusters, nstart = n_start, iter.max = max_iter)

rfm$Cluster <- as.factor(km_final$cluster)

# Cluster Characterization & Centers in original scale
cluster_profiles <- rfm %>%
  group_by(Cluster) %>%
  summarise(
    Size = n(),
    Avg_Recency = round(mean(Recency), 1),
    Median_Recency = round(median(Recency), 1),
    Avg_Frequency = round(mean(Frequency), 1),
    Avg_Monetary = round(mean(Monetary), 2),
    Total_Spend = round(sum(Monetary), 2),
    .groups = "drop"
  ) %>%
  mutate(
    Size_Percentage = round((Size / sum(Size)) * 100, 2),
    Spend_Percentage = round((Total_Spend / sum(Total_Spend)) * 100, 2)
  ) %>%
  arrange(desc(Avg_Monetary))

# Assign descriptive names based on characteristics
assign_label <- function(avg_r, avg_f, avg_m, overall_r, overall_f, overall_m) {
  if (avg_m >= overall_m * 1.5 && avg_r <= overall_r) return("High-Value Elite Champions")
  if (avg_r > overall_r * 1.3 && avg_f <= overall_f) return("At-Risk / Inactive Customers")
  if (avg_f > overall_f && avg_m < overall_m * 1.2) return("Frequent Everyday Shoppers")
  return("Occasional / Mid-Tier Buyers")
}

o_r <- mean(rfm$Recency)
o_f <- mean(rfm$Frequency)
o_m <- mean(rfm$Monetary)

cluster_profiles$Cluster_Name <- mapply(
  assign_label,
  cluster_profiles$Avg_Recency,
  cluster_profiles$Avg_Frequency,
  cluster_profiles$Avg_Monetary,
  MoreArgs = list(overall_r = o_r, overall_f = o_f, overall_m = o_m)
)

# Plot cluster visualization (Recency vs Monetary)
p <- ggplot(rfm, aes(x = Frequency, y = Monetary, color = Cluster)) +
  geom_point(alpha = 0.7, size = 2) +
  scale_x_log10() +
  scale_y_log10() +
  scale_color_brewer(palette = "Set1") +
  labs(
    title = paste("K-Means Customer Clusters (K =", k_clusters, ")"),
    subtitle = "Frequency vs Monetary Spend (Log-Scale) Colored by Cluster",
    x = "Order Frequency (Log-10 Scale)",
    y = "Monetary Spend (£, Log-10 Scale)"
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
    plot.subtitle = element_text(color = "#64748B", size = 10),
    legend.background = element_rect(fill = "#0B1120"),
    legend.text = element_text(color = "#E2E8F0"),
    legend.title = element_text(color = "#94A3B8")
  )

ggsave(plot_path, plot = p, width = 8, height = 5, dpi = 150)

# Build JSON output
result_payload <- list(
  k = k_clusters,
  total_customers = nrow(rfm),
  tot_withinss = round(km_final$tot.withinss, 3),
  betweenss = round(km_final$betweenss, 3),
  totss = round(km_final$totss, 3),
  explained_variance_ratio = round((km_final$betweenss / km_final$totss) * 100, 2),
  elbow_curve = as.data.frame(elbow_data),
  cluster_profiles = as.data.frame(cluster_profiles),
  customer_samples = head(as.data.frame(rfm[, c("CustomerID", "Recency", "Frequency", "Monetary", "Cluster")]), 100),
  chart_file = basename(plot_path)
)

write_json(result_payload, output_json_path, pretty = TRUE, auto_unbox = TRUE)
cat("K-Means Clustering completed with k =", k_clusters, ". Explained variance:", round((km_final$betweenss / km_final$totss) * 100, 2), "%\n")

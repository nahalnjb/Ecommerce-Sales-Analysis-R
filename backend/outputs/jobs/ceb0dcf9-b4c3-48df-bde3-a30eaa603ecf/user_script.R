# Active Dataset: Online Retail
DATA_PATH <- '/Users/nahalnajeeb/r project/plots/nhl r/backend/data/uploads/d5023738-7915-444b-86ab-f68b001e02a3/cleaned.csv'
if (file.exists(DATA_PATH)) { active_dataset <- read.csv(DATA_PATH) }

# 5. E-Commerce Data Cleaning in R
library(dplyr)
library(stringr)

# Raw sample transactions with cancellations and dirty strings
raw_data <- data.frame(
  InvoiceNo = c("536365", "C536366", "536367", "536368", "C536369"),
  StockCode = c("85123A ", "71053", "84406B", " 84029G", "22752"),
  Description = c("  WHITE HANGING HEART ", "WHITE LANTERN", "CREAM CUPID", "KNITTED UNION FLAG", "BABUSHKA BOXES"),
  Quantity = c(6, -1, 8, 3, -2),
  UnitPrice = c(2.55, 3.39, 2.75, 3.39, 7.65),
  CustomerID = c("17850", "17850", "13047", "13047", "12583")
)

cat("=== Raw Dataset (Total rows: ", nrow(raw_data), ") ===\n")
print(raw_data)

# Cleaning pipeline
cleaned_data <- raw_data %>%
  # Trim strings
  mutate(
    StockCode = str_trim(StockCode),
    Description = str_trim(Description)
  ) %>%
  # Filter out cancellations
  filter(!str_starts(InvoiceNo, "C") & Quantity > 0) %>%
  # Add Revenue
  mutate(Revenue = Quantity * UnitPrice)

cat("\n=== Cleaned Valid Orders (Retained rows: ", nrow(cleaned_data), ") ===\n")
print(cleaned_data)
cat("\nTotal Valid Revenue: $", sum(cleaned_data$Revenue), "\n")

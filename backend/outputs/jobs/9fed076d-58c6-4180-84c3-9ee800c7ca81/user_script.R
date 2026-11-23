# Active Dataset: Online Retail
DATA_PATH <- '/Users/nahalnajeeb/r project/plots/nhl r/backend/data/uploads/d5023738-7915-444b-86ab-f68b001e02a3/cleaned.csv'
if (file.exists(DATA_PATH)) { active_dataset <- read.csv(DATA_PATH) }

# Real R Programming Execution Environment
# Active dataset is automatically loaded as 'active_dataset' if selected

# Example: Vector & Statistical Summary
sales <- c(120, 240, 310, 450, 190, 890, 540, 620, 780, 950)
total_sales <- sum(sales)
average_sales <- mean(sales)
sales_sd <- sd(sales)

cat("=== Summary Statistics ===\n")
cat("Total Sales:   $", total_sales, "\n")
cat("Average Sales: $", round(average_sales, 2), "\n")
cat("Std Deviation: $", round(sales_sd, 2), "\n")

# If an active dataset is present, examine its dimensions
if (exists("active_dataset")) {
  cat("\n=== Active Dataset Dimensions ===\n")
  cat("Rows:", nrow(active_dataset), "| Columns:", ncol(active_dataset), "\n")
  print(head(active_dataset[, c("InvoiceNo", "Quantity", "UnitPrice", "Country")], 3))
}

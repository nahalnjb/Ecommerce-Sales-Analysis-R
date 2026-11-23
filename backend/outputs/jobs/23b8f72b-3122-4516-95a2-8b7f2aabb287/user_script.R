# Active Dataset: Product Category Name Translation
DATA_PATH <- '/Users/nahalnajeeb/r project/plots/nhl r/backend/data/uploads/ce13c63a-d576-40ea-bfb8-cd1c8d72b14a/cleaned.csv'
if (file.exists(DATA_PATH)) { active_dataset <- read.csv(DATA_PATH) }

# 7. Summary Statistics in R
order_values <- c(25, 45, 55, 62, 78, 85, 90, 110, 125, 140, 180, 250, 490, 850)

cat("=== Order Value Statistical Distribution ===\n")
cat("Count:             ", length(order_values), "\n")
cat("Mean:              $", round(mean(order_values), 2), "\n")
cat("Median:            $", round(median(order_values), 2), "\n")
cat("Min:               $", min(order_values), "\n")
cat("Max:               $", max(order_values), "\n")
cat("Range:             $", max(order_values) - min(order_values), "\n")
cat("Variance:          ", round(var(order_values), 2), "\n")
cat("Standard Deviation: $", round(sd(order_values), 2), "\n")
cat("IQR:               $", IQR(order_values), "\n")

cat("\nQuantiles:\n")
print(quantile(order_values, probs = c(0.1, 0.25, 0.5, 0.75, 0.9, 0.99)))

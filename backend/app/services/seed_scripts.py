from app.database import SessionLocal, SavedScriptModel

PREDEFINED_SCRIPTS = [
    {
        "id": "script_01_basics",
        "title": "1. Basic R Calculations",
        "category": "Fundamentals",
        "description": "Fundamental arithmetic operations, scalar variables, and mathematical functions in R.",
        "code": """# 1. Basic R Calculations
# Arithmetic operations
price <- 49.99
tax_rate <- 0.08
quantity <- 5

subtotal <- price * quantity
total_tax <- subtotal * tax_rate
grand_total <- subtotal + total_tax

cat("=== Sales Order Calculation ===\\n")
cat("Subtotal:   $", round(subtotal, 2), "\\n")
cat("Tax (8%):   $", round(total_tax, 2), "\\n")
cat("Grand Total:$", round(grand_total, 2), "\\n")

# Built-in math functions
cat("\\nSquare root of grand total:", sqrt(grand_total), "\\n")
cat("Natural log of grand total:", log(grand_total), "\\n")
"""
    },
    {
        "id": "script_02_vectors",
        "title": "2. Vector Operations",
        "category": "Fundamentals",
        "description": "Creation, indexing, vectorized math, and statistical operations on numeric vectors.",
        "code": """# 2. Vector Operations in R
# Daily sales revenue over a week
daily_sales <- c(1250, 1840, 960, 2100, 3400, 4200, 3100)
days <- c("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
names(daily_sales) <- days

cat("Daily Sales:\\n")
print(daily_sales)

# Vectorized operations
cat("\\nTotal Weekly Sales: $", sum(daily_sales), "\\n")
cat("Average Daily Sales: $", round(mean(daily_sales), 2), "\\n")
cat("Standard Deviation:  $", round(sd(daily_sales), 2), "\\n")

# Logical subsetting (high sales days > $2000)
high_days <- daily_sales[daily_sales > 2000]
cat("\\nHigh Sales Days (> $2000):\\n")
print(high_days)
"""
    },
    {
        "id": "script_03_matrices",
        "title": "3. Matrix Operations",
        "category": "Fundamentals",
        "description": "Matrix creation, indexing, row/col operations, and matrix algebra.",
        "code": """# 3. Matrix Operations in R
# 3 stores x 4 quarters revenue matrix (in thousands)
sales_matrix <- matrix(
  c(120, 150, 130, 210,
    90,  110, 105, 160,
    140, 170, 165, 250),
  nrow = 3, byrow = TRUE,
  dimnames = list(c("Store A", "Store B", "Store C"), c("Q1", "Q2", "Q3", "Q4"))
)

cat("Quarterly Sales Matrix ($k):\\n")
print(sales_matrix)

cat("\\nStore Total Revenues ($k):\\n")
print(rowSums(sales_matrix))

cat("\\nQuarterly Market Totals ($k):\\n")
print(colSums(sales_matrix))

cat("\\nAverage Store Sales per Quarter ($k):\\n")
print(round(rowMeans(sales_matrix), 1))
"""
    },
    {
        "id": "script_04_dataframes",
        "title": "4. Data Frame Operations",
        "category": "Data Wrangling",
        "description": "Creating data frames, filtering rows, selecting columns, and creating derived features.",
        "code": """# 4. Data Frame Operations in R
library(dplyr)

# Sample transaction data
orders <- data.frame(
  OrderID = 101:106,
  Customer = c("Alice", "Bob", "Charlie", "David", "Emma", "Frank"),
  Category = c("Electronics", "Home", "Electronics", "Fashion", "Home", "Fashion"),
  Quantity = c(2, 5, 1, 3, 2, 4),
  UnitPrice = c(199.99, 24.50, 499.00, 45.00, 89.90, 32.00)
)

# Derived revenue and dplyr pipeline
result <- orders %>%
  mutate(Revenue = Quantity * UnitPrice) %>%
  group_by(Category) %>%
  summarise(
    OrderCount = n(),
    TotalQuantity = sum(Quantity),
    TotalRevenue = sum(Revenue),
    AvgOrderValue = mean(Revenue)
  ) %>%
  arrange(desc(TotalRevenue))

cat("Category Sales Summary:\\n")
print(as.data.frame(result))
"""
    },
    {
        "id": "script_05_data_cleaning",
        "title": "5. Data Cleaning Pipeline",
        "category": "Data Wrangling",
        "description": "Filtering cancelled invoices, stripping white space, and standardizing datetimes.",
        "code": """# 5. E-Commerce Data Cleaning in R
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

cat("=== Raw Dataset (Total rows: ", nrow(raw_data), ") ===\\n")
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

cat("\\n=== Cleaned Valid Orders (Retained rows: ", nrow(cleaned_data), ") ===\\n")
print(cleaned_data)
cat("\\nTotal Valid Revenue: $", sum(cleaned_data$Revenue), "\\n")
"""
    },
    {
        "id": "script_06_missing_values",
        "title": "6. Missing-Value Handling",
        "category": "Data Wrangling",
        "description": "Inspecting missing values, calculating null percentages, and performing mean/median imputation.",
        "code": """# 6. Missing-Value Handling in R
# Sample customer spending data with NA values
customer_spend <- c(120, 240, NA, 310, NA, 450, 190, 890, NA, 540)

cat("Original Vector:\\n")
print(customer_spend)

cat("\\nMissing count:", sum(is.na(customer_spend)), "\\n")
cat("Missing percentage:", mean(is.na(customer_spend)) * 100, "%\\n")

# Complete cases / Drop NA
spend_clean <- na.omit(customer_spend)
cat("Mean of available data: $", round(mean(spend_clean), 2), "\\n")
cat("Median of available data: $", round(median(spend_clean), 2), "\\n")

# Mean Imputation
spend_imputed <- customer_spend
spend_imputed[is.na(spend_imputed)] <- round(median(spend_clean), 2)

cat("\\nAfter Median Imputation:\\n")
print(spend_imputed)
"""
    },
    {
        "id": "script_07_summary_stats",
        "title": "7. Summary Statistics",
        "category": "Statistical Analysis",
        "description": "Computing central tendency, dispersion, variance, skewness, and IQR.",
        "code": """# 7. Summary Statistics in R
order_values <- c(25, 45, 55, 62, 78, 85, 90, 110, 125, 140, 180, 250, 490, 850)

cat("=== Order Value Statistical Distribution ===\\n")
cat("Count:             ", length(order_values), "\\n")
cat("Mean:              $", round(mean(order_values), 2), "\\n")
cat("Median:            $", round(median(order_values), 2), "\\n")
cat("Min:               $", min(order_values), "\\n")
cat("Max:               $", max(order_values), "\\n")
cat("Range:             $", max(order_values) - min(order_values), "\\n")
cat("Variance:          ", round(var(order_values), 2), "\\n")
cat("Standard Deviation: $", round(sd(order_values), 2), "\\n")
cat("IQR:               $", IQR(order_values), "\\n")

cat("\\nQuantiles:\\n")
print(quantile(order_values, probs = c(0.1, 0.25, 0.5, 0.75, 0.9, 0.99)))
"""
    },
    {
        "id": "script_08_sales_analysis",
        "title": "8. Sales Trend & AOV Analysis",
        "category": "Sales Analytics",
        "description": "Calculating Average Order Value (AOV), monthly revenue velocity, and top products.",
        "code": """# 8. Sales Trend & AOV Analysis
library(dplyr)

# Simulated e-commerce monthly transaction feed
transactions <- data.frame(
  Month = rep(c("Jan", "Feb", "Mar", "Apr", "May", "Jun"), each = 4),
  Product = rep(c("T-Shirt", "Jeans", "Sneakers", "Watch"), 6),
  UnitsSold = c(120, 80, 45, 15,  130, 85, 50, 18,  140, 95, 60, 25,
                160, 105, 70, 30, 180, 120, 85, 35,  210, 140, 95, 42),
  Price = rep(c(25, 60, 110, 195), 6)
)

transactions <- transactions %>%
  mutate(Revenue = UnitsSold * Price)

monthly_summary <- transactions %>%
  group_by(Month) %>%
  summarise(
    TotalRevenue = sum(Revenue),
    TotalUnits = sum(UnitsSold),
    AvgPricePerUnit = mean(Price),
    AOV = TotalRevenue / n()
  )

cat("Monthly E-Commerce Performance:\\n")
print(as.data.frame(monthly_summary))
"""
    },
    {
        "id": "script_09_rfm_analysis",
        "title": "9. RFM Customer Segmentation",
        "category": "Customer Analytics",
        "description": "Complete RFM scoring and segmentation rule engine using dplyr quintiles.",
        "code": """# 9. RFM Customer Segmentation
library(dplyr)

# Sample aggregated customer metrics
customers <- data.frame(
  CustomerID = 1001:1010,
  Recency = c(4, 18, 92, 145, 8, 320, 12, 65, 2, 210),
  Frequency = c(14, 8, 3, 2, 11, 1, 9, 4, 18, 2),
  Monetary = c(3400, 1250, 340, 180, 2900, 75, 1850, 620, 4200, 210)
)

# 1-5 Quintile scoring
score_bins <- function(x, reverse = FALSE) {
  r <- rank(x, ties.method = "first")
  s <- as.integer(cut(r, breaks = 5, labels = 1:5, include.lowest = TRUE))
  if (reverse) return(6 - s)
  return(s)
}

rfm <- customers %>%
  mutate(
    R_Score = score_bins(Recency, reverse = TRUE),
    F_Score = score_bins(Frequency),
    M_Score = score_bins(Monetary),
    RFM_Score = paste0(R_Score, F_Score, M_Score)
  )

# Segment assignment
rfm$Segment <- ifelse(rfm$R_Score >= 4 & rfm$F_Score >= 4 & rfm$M_Score >= 4, "Champions",
               ifelse(rfm$R_Score >= 3 & rfm$F_Score >= 3, "Loyal Customers",
               ifelse(rfm$R_Score >= 4 & rfm$F_Score <= 2, "New Customers",
               ifelse(rfm$R_Score <= 2 & rfm$F_Score >= 3, "At Risk", "General Shoppers"))))

cat("RFM Segmentation Table:\\n")
print(rfm %>% select(CustomerID, Recency, Frequency, Monetary, RFM_Score, Segment))
"""
    },
    {
        "id": "script_10_kmeans",
        "title": "10. K-Means Customer Clustering",
        "category": "Machine Learning",
        "description": "Standardizing RFM features and segmenting customers using stats::kmeans().",
        "code": """# 10. K-Means Customer Clustering
library(cluster)

set.seed(42)
# Generate synthetic normalized customer behavior data
n <- 60
recency <- c(rnorm(20, mean = 15, sd = 5), rnorm(20, mean = 60, sd = 15), rnorm(20, mean = 180, sd = 30))
frequency <- c(rnorm(20, mean = 12, sd = 3), rnorm(20, mean = 5, sd = 2), rnorm(20, mean = 1.5, sd = 0.5))
monetary <- c(rnorm(20, mean = 2500, sd = 400), rnorm(20, mean = 800, sd = 150), rnorm(20, mean = 120, sd = 40))

rfm_data <- data.frame(Recency = recency, Frequency = frequency, Monetary = monetary)
scaled_rfm <- scale(rfm_data)

# Fit 3-cluster K-Means
km <- kmeans(scaled_rfm, centers = 3, nstart = 20)

rfm_data$Cluster <- factor(km$cluster)

cat("=== K-Means Clustering Results ===\\n")
cat("Total within-cluster sum of squares:", round(km$tot.withinss, 2), "\\n")
cat("Between-cluster sum of squares:", round(km$betweenss, 2), "\\n")
cat("Variance explained:", round((km$betweenss / km$totss) * 100, 2), "%\\n\\n")

cat("Cluster Centers (Original Scale):\\n")
cluster_summary <- aggregate(. ~ Cluster, data = rfm_data, FUN = function(x) round(mean(x), 1))
print(cluster_summary)
"""
    },
    {
        "id": "script_11_forecasting",
        "title": "11. ARIMA Sales Forecasting",
        "category": "Time-Series",
        "description": "Fitting an automated ARIMA time-series model and generating 6-month predictions.",
        "code": """# 11. ARIMA Sales Forecasting
library(forecast)

# Monthly historical revenue ($k) over 24 months
monthly_rev <- c(
  42, 45, 52, 58, 64, 70, 72, 75, 80, 88, 110, 135,
  55, 60, 68, 74, 82, 89, 92, 98, 105, 115, 142, 175
)

sales_ts <- ts(monthly_rev, start = c(2022, 1), frequency = 12)

cat("Fitting Auto-ARIMA model...\\n")
fit <- auto.arima(sales_ts)
print(summary(fit))

# 6 months forecast
fc <- forecast(fit, h = 6)

cat("\\n=== 6-Month Sales Forecast ($k) ===\\n")
fc_table <- data.frame(
  PointForecast = round(as.numeric(fc$mean), 2),
  Lower80 = round(as.numeric(fc$lower[, 1]), 2),
  Upper80 = round(as.numeric(fc$upper[, 1]), 2),
  Lower95 = round(as.numeric(fc$lower[, 2]), 2),
  Upper95 = round(as.numeric(fc$upper[, 2]), 2)
)
print(fc_table)
"""
    },
    {
        "id": "script_12_visualization",
        "title": "12. Data Visualization with ggplot2",
        "category": "Visualizations",
        "description": "Creating multi-layer ggplot2 charts with styling, bar geom, and labels.",
        "code": """# 12. Data Visualization with ggplot2
library(ggplot2)

# Product sales data
products <- data.frame(
  Category = c("Home Decor", "Kitchen", "Apparel", "Electronics", "Garden", "Toys"),
  Revenue = c(45000, 38000, 29000, 62000, 18000, 24000),
  GrowthRate = c(12.5, 8.2, 4.1, 24.8, -2.5, 6.7)
)

cat("Rendering Product Performance ggplot2 chart...\\n")

p <- ggplot(products, aes(x = reorder(Category, Revenue), y = Revenue, fill = GrowthRate)) +
  geom_col(width = 0.6) +
  coord_flip() +
  scale_fill_gradient2(low = "#ef4444", mid = "#3b82f6", high = "#10b981", midpoint = 5) +
  labs(
    title = "E-Commerce Revenue by Product Category",
    subtitle = "Color-coded by Year-over-Year Growth Rate (%)",
    x = "Category",
    y = "Annual Revenue ($)"
  ) +
  theme_minimal()

# Save plot to PNG
ggsave("product_performance.png", plot = p, width = 7, height = 4.5, dpi = 150)
cat("Saved chart to 'product_performance.png' successfully!\\n")
"""
    }
]

def seed_predefined_scripts(db):
    for s in PREDEFINED_SCRIPTS:
        existing = db.query(SavedScriptModel).filter_by(id=s["id"]).first()
        if not existing:
            script_obj = SavedScriptModel(
                id=s["id"],
                title=s["title"],
                category=s["category"],
                description=s["description"],
                code=s["code"],
                is_predefined=True
            )
            db.add(script_obj)
    db.commit()

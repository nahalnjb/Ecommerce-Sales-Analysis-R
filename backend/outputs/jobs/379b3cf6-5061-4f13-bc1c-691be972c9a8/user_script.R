# Active Dataset: Olist Order Items Dataset
DATA_PATH <- '/Users/nahalnajeeb/r project/plots/nhl r/backend/data/uploads/d880c6f8-6714-4609-b66f-341072b0fe37/cleaned.csv'
if (file.exists(DATA_PATH)) { active_dataset <- read.csv(DATA_PATH) }

# 4. Data Frame Operations in R
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

cat("Category Sales Summary:\n")
print(as.data.frame(result))

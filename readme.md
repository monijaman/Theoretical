# Read me Code

## This'll be a _Helpful_ Section About the Greek Letter Θ!

A heading containing characters not allowed in fragments, UTF-8 characters, two consecutive spaces between the first and second words, and formatting.

# Links to the example headings above

Link to the sample section: [Link Text](#sample-section).

# Code

> A brief description of the project, what it does, and why it exists.

---

## Table of Contents

1. [Installation](#installation)
2. [Usage](#usage)
3. [Features](#features)

---

## Installation

### Requirements

- Node.js >= 14.x
- npm >= 7.x

### Steps

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/yourproject.git
cd yourproject
npm install
```

```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(100)
);

INSERT INTO users (id, name, email) VALUES (1, 'Alice', 'alice@example.com');
```

# Title

## Subtitle

- Item 1
- Item 2
  - Sub-item

/_
Enter your query below.
Please append a semicolon ";" at the end of the query
_/

WITH MonthlyTotals AS (
SELECT
YEAR(o.orderdate) AS year,
MONTH(o.orderdate) AS month,
o.customerid,
SUM(od.unitprice \* od.quantity) AS total_monthly_spending
FROM
orders o
JOIN
order_details od ON o.orderid = od.orderid
GROUP BY
year, month, o.customerid
),
MaxMonthlySpending AS (
SELECT
year,
month,
MAX(total_monthly_spending) AS max_spending
FROM
MonthlyTotals
GROUP BY
year, month
)
SELECT
mt.year,
mt.month,
mt.customerid,
mt.total_monthly_spending
FROM
MonthlyTotals mt
JOIN
MaxMonthlySpending mms ON mt.year = mms.year AND mt.month = mms.month
WHERE
mt.total_monthly_spending = mms.max_spending
ORDER BY
mt.year, mt.month, mt.customerid;

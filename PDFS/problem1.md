# Problem 1

# Top Customers Query

## Problem Description

We are tasked with finding the customer with the highest total order value for each **year-month**. The result should include the following columns:

- **year**
- **month**
- **customerid**
- **total_monthly_order_value**

In case there are two customers with the same total order value, the customer with the **lower `customerid`** should be returned. The result should be ordered by **year** and **month** in ascending order.

## Schema

### Table: `orders`

| Column Name | Column Type | Key / NULL  |
| ----------- | ----------- | ----------- |
| orderid     | int         | Primary Key |
| customerid  | int         | NOT NULL    |
| orderdate   | date        | NOT NULL    |

### Table: `order_details`

| Column Name | Column Type | Key / NULL  |
| ----------- | ----------- | ----------- |
| orderid     | int         | Primary Key |
| productid   | int         | NOT NULL    |
| unitprice   | int         | NOT NULL    |
| quantity    | int         | NOT NULL    |

## SQL Query

```sql
WITH CustomerMonthlySpendings AS (
    SELECT
        YEAR(o.orderdate) AS year,
        MONTH(o.orderdate) AS month,
        o.customerid AS customer_id,
        SUM(od.unitprice * od.quantity) AS total_monthly_order_value
    FROM
        orders o
    JOIN
        order_details od
    ON
        o.orderid = od.orderid
    GROUP BY
        year, month, customer_id
),
TopMonthlySpendings AS (
    SELECT
        year,
        month,
        MAX(total_monthly_order_value) AS max_monthly_order_value
    FROM
        CustomerMonthlySpendings
    GROUP BY
        year, month
)
SELECT
    cms.year,
    cms.month,
    cms.customer_id AS customerid,
    cms.total_monthly_order_value
FROM
    CustomerMonthlySpendings cms
JOIN
    TopMonthlySpendings tms
ON
    cms.year = tms.year
    AND cms.month = tms.month
    AND cms.total_monthly_order_value = tms.max_monthly_order_value
ORDER BY
    cms.year, cms.month, cms.customerid;
```

---

## Explanation:

### Step 1: CustomerMonthlySpendings CTE

The first part of the query calculates the total spending for each customer for each year and month. We join the orders and order_details tables to get the relevant information. The spending is calculated by multiplying the unitprice and quantity in the order_details table for each order.

We group the results by:

- year: Extracted from orderdate in the orders table.
- month: Also extracted from orderdate in the orders table.
- customer_id: The customerid from the orders table.
- The SUM() function calculates the total order value for each customer in a given year and month.

### Step 2: TopMonthlySpendings CTE

This Common Table Expression (CTE) identifies the maximum total spending for each year and month from the CustomerMonthlySpendings CTE.

We use the MAX() function to find the highest spending for each year-month combination, ensuring we later select only the customers with the highest order values.

### Step 3: Final Query

In the final part of the query, we join the two CTEs: CustomerMonthlySpendings and TopMonthlySpendings. We match the year, month, and the total order value with the maximum order value from the second CTE.

This ensures that only the customer(s) with the highest order value for each month and year are selected. The results are ordered by:

- year
- month
- customerid (to handle cases where multiple customers have the same total order value, ensuring the one with the smallest customerid is selected).

The result of this query will look like this:

```sql
year	month	customerid	total_monthly_order_value
| Year | Month | Customer ID | Total Monthly Order Value |
|------|-------|-------------|---------------------------|
| 1996 | 7     | 75          | 3640                      |
| 1996 | 8     | 62          | 5564                      |
| 1996 | 9     | 64          | 4775                      |
| 1996 | 10    | 50          | 3374                      |
| 1996 | 11    | 58          | 10692                     |
| 1996 | 12    | 70          | 3395                      |
| 1997 | 1     | 72          | 10850                     |
| 1997 | 2     | 70          | 2655                      |

Notes
```

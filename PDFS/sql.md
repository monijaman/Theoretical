# SQL Guide

## Index

- [SQL SELECT Statement](#sql-select-statement)
- [SQL INSERT Statement](#sql-insert-statement)
- [SQL DELETE Statement](#sql-delete-statement)
- [SQL UPDATE Statement](#sql-update-statement)
- [SQL WHERE Clause](#sql-where-clause)
- [SQL ORDER BY Keyword](#sql-order-by-keyword)
- [SQL LIKE Operator](#sql-like-operator)
- [SQL IN Operator](#sql-in-operator)
- [SQL BETWEEN Operator](#sql-between-operator)
- [SQL JOIN](#sql-join)
- [SQL UNION Operator](#sql-union-operator)
- [SQL GROUP BY Statement](#sql-group-by-statement)
- [SQL HAVING Clause](#sql-having-clause)
- [SQL CASE Statement](#sql-case-statement)
- [SQL SELECT DISTINCT Statement](#sql-select-distinct-statement)
- [SQL EXISTS Operator](#sql-exists-operator)
- [SQL ANY and ALL Operators](#sql-any-and-all-operators)
- [SQL IFNULL(), ISNULL(), COALESCE(), and NVL() Functions](#sql-ifnull-isnull-coalesce-and-nvl-functions)
- [SQL NULL Values](#sql-null-values)
- [SQL Aliases](#sql-aliases)
- [SQL Aggregate Functions](#sql-aggregate)
  - [COUNT()](#sql-count-function)
  - [AVG()](sql#sql-avg-function)
  - [SUM()](#sql-sum-function)
  - [MAX() and MIN()](#max-and-min)
- [SQL String Functions](sql#sql-string-functions)
  - [CONCAT()](#concat)
  - [LEN()](#len)
  - [UPPER() / LOWER()](#upper--lower)
- [SQL Date Functions](#sql#date)
  - [CURRENT_TIMESTAMP](#current_timestamp)
  - [YEAR(), MONTH(), DATE](#year-month-date)

---

## SQL SELECT Statement

The SELECT statement is used to select data from a database.

```sql
SELECT column1, column2, ...
  FROM tablename;
```

## SQL INSERT Statement

INSERT INTO statement is used to insert new records in a table.

### INSERT INTO Syntax

It is possible to write the INSERT INTO statement in two ways:

1. Specify both the column names and the values to be inserted:

```sql INSERT INTO tablename (column1, column2, column3, ...)
    VALUES (value1, value2, value3, ...);
```

2. If you are adding values for all the columns of the table, you do not need to specify the column names in the SQL query. However, make sure the order of the values is in the same order as the columns in the table. Here, the INSERT INTO syntax would be as follows:

```sql
INSERT INTO tablename
    VALUES (value1, value2, value3, ...);
```

### Insert Data Only in Specified Columns

- It is also possible to only insert data in specific columns.

- If the table column allow for NULL values then you do not need to include the column in your insert statement.

```sql
-- Insert a record
INSERT INTO patients (first_name, last_name, gender)
    VALUES ('Jane', 'Doe','F');

-- Select the most recent record by id to display it.
select * from patients
	where patient_id = (select max(patient_id) from patients);
```

## SQL Delete Statement

DELETE FROM patients WHERE first_name = 'Paul';

```sql
DELETE FROM tablename WHERE condition;
```

## SQL UPDATE Statement

Be sure to specify the where clause. Failing to include the where clause will result in all of the rows to be updated.

```sql
SET column1 = value1, column2 = value2, ...
WHERE condition;

```

### UPDATE Multiple Records

```sql
UPDATE patients
SET allergies = 'NKA'
WHERE allergies is NULL;
```

## SQL WHERE Clause

The WHERE clause is used to filter records.

- numeric fields should not be enclosed in quotes

- Equal, =

```sql
SELECT * FROM patients
  WHERE patient_id=1;
```

- Greater Than, >

```sql
SELECT * FROM patients
  WHERE patient_id > 5;
```

Less Than, <

```sql
  SELECT * FROM patients
  WHERE patient_id < 5;
```

- Greater Than Or Equal To, >=

```sql
  SELECT * FROM patients
  WHERE patient_id >= 5;
```

- Less Than Or Equal To, <=

```sql
  SELECT * FROM patients
  WHERE patient_id <= 5;

```

- Not Equal, <> or != depending on sql version

```sql
SELECT * FROM patients
  WHERE patient_id <> 5;
  -- No patient_id 5 row
SELECT * FROM patients
  WHERE patient_id <> 5;
  -- No patient_id 5 row
```

- Between, inclusive range

```sql
SELECT * FROM patients
  WHERE patient_id BETWEEN 4 AND 6;
SELECT * FROM patients
  WHERE patient_id BETWEEN 4 AND 6;
```

- Like, pattern search

```sql
SELECT * FROM patients
  WHERE first_name LIKE 'a%';
  -- First names starting with 'a'.
  -- View sql patterns for more info.
```

- In, in a collection

```sql
SELECT * FROM patients
  WHERE patient_id IN (1,3,6,9);
  -- the values can be replaced with a sub-query.
```

## SQL SELECT Statement

```sql
SELECT column1, column2, ...
  FROM tablename;
```

## SQL AND, OR and NOT Operators

#### The WHERE clause can be combined with AND, OR, and NOT operators.

```sql
SELECT column1, column2, ...
FROM table_name
WHERE condition1 AND condition2 AND condition3 ...;

SELECT column1, column2, ...
FROM table_name
WHERE condition1 OR condition2 OR condition3 ...;

SELECT column1, column2, ...
FROM table_name
WHERE NOT condition;
```

## SQL ORDER BY Keyword

The ORDER BY keyword sorts the records in ascending order by default. To sort the records in descending order, use the DESC keyword.

```sql
SELECT column1, column2, ...
    FROM table_name
    ORDER BY column1, column2, ... ASC|DESC;


    SELECT * FROM patients
    ORDER BY first_name ASC, last_name DESC;
```

## SQL LIKE Operator

The LIKE operator is used in a WHERE clause to search for a specified pattern in a column.

There are two wildcards often used in conjunction with the LIKE operator:

- The percent sign (%) represents zero, one, or multiple characters

- The underscore sign (\_) represents one, single character

The percent sign and the underscore can also be used in combinations

LIKE Syntax

- WHERE first_name LIKE 'a%' Finds any values that start with "a"
- WHERE first_name LIKE '%a' Finds any values that end with "a"
- WHERE first_name LIKE '%or%' Finds any values that have "or" in any position
- WHERE first_name LIKE '\_r%' Finds any values that have "r" in the second position
- WHERE first*name LIKE 'a*%' Finds any values that start with "a" and are at least 2 characters in length
- WHERE first_name LIKE 'a\_\_%' Finds any values that start with "a" and are at least 3 characters in length
- WHERE first_name LIKE 'a%o' Finds any values that start with "a" and ends with "o"

```sql
SELECT * FROM patients
  WHERE first_name LIKE 'a%';

SELECT * FROM patients
WHERE first_name LIKE '%a';

SELECT * FROM patients
  WHERE first_name LIKE '%or%';

SELECT * FROM patients
    WHERE first_name LIKE '_r%';

SELECT * FROM patients
  WHERE first_name LIKE 'a__%';

SELECT * FROM patients
  WHERE first_name LIKE 'a%o';

SELECT * FROM patients
  WHERE first_name NOT LIKE 'a%';
```

## SQL IN Operator

The IN operator allows you to specify multiple values in a WHERE clause.

The IN operator is a shorthand for multiple OR conditions.

```sql
SELECT * FROM patients
WHERE province_id IN ('SK', 'AB', 'MB');

SELECT * FROM patients
WHERE province_id NOT IN ('SK', 'AB', 'MB');

SELECT * FROM patients
WHERE first_name in (SELECT first_name FROM doctors)
-- Try running just the sub query to see the list
```

## SQL BETWEEN Operator

The BETWEEN operator selects values within a given range. The values can be numbers, text, or dates.

The BETWEEN operator is inclusive: begin and end values are included.

```sql
SELECT * FROM patients
  WHERE weight BETWEEN 100 AND 120;

  SELECT * FROM patients
  WHERE weight NOT BETWEEN 100 AND 120;


  SELECT * FROM patients
  WHERE weight BETWEEN 100 AND 120
  AND province_id NOT IN ('ON', 'SK', 'AB');

  SELECT * FROM patients
  WHERE first_name BETWEEN 'Alex' AND 'Ben'

```

---

## SQL JOIN

It is rare to need a join other than (INNER) JOIN.

- (INNER) JOIN: Returns records that have matching values in both tables

- LEFT (OUTER) JOIN: Returns all records from the left table, and the matched records from the right table

- RIGHT (OUTER) JOIN: Returns all records from the right table, and the matched records from the left table

- FULL (OUTER) JOIN: Returns all records when there is a match in either left or right table

## SQL UNION Operator

The UNION operator is used to combine the result-set of two or more SELECT statements.

- Every SELECT statement within UNION must have the same number of columns

- The columns must also have similar data types

- The columns in every SELECT statement must also be in the same order

```sql
SELECT column_name(s) FROM table1
    UNION ALL
SELECT column_name(s) FROM table2;
```

## SQL GROUP BY Statement

The GROUP BY statement groups rows that have the same values into summary rows, like "find the number of patients in each province".

The GROUP BY statement is often used with aggregate functions (COUNT(), MAX(), MIN(), SUM(), AVG()) to group the result-set by one or more columns.

```sql
SELECT COUNT(*), province_id
  FROM patients
  GROUP BY province_id;

  SELECT COUNT(*), province_id
  FROM patients
  GROUP BY province_id
  ORDER BY COUNT(*) DESC;
```

## SQL HAVING Clause

The HAVING clause was added to SQL because the WHERE keyword cannot be used with aggregate functions.

```sql
SELECT column_name(s)
  FROM table_name
  WHERE condition
  GROUP BY column_name(s)
  HAVING condition
  ORDER BY column_name(s);

  SELECT COUNT(*), first_name
  FROM patients
  GROUP BY first_name
  HAVING count(*) > 30
  ORDER BY COUNT(*) DESC;
```

## SQL CASE Statement

The CASE statement goes through conditions and returns a value when the first condition is met (like an if-then-else statement). So, once a condition is true, it will stop reading and return the result. If no conditions are true, it returns the value in the ELSE clause.

If there is no ELSE part and no conditions are true, it returns NULL.

```sql
CASE
      WHEN condition1 THEN result1
      WHEN condition2 THEN result2
      WHEN conditionN THEN resultN
      ELSE result
  END;


  SELECT patient_id, height,
  CASE
      WHEN height > 175 THEN 'height is greater than 175'
      WHEN height = 175 THEN 'height is 175'
      ELSE 'height is under 175'
  END AS height_group
  FROM patients;


  SELECT patient_id, first_name, allergies
  FROM patients
  ORDER BY
  (CASE
      WHEN allergies IS NULL THEN first_name
      ELSE allergies
  END);
```

## SQL SELECT DISTINCT Statement

The SELECT DISTINCT statement is used to return only distinct (different) values.

Inside a table, a column often contains many duplicate values; and sometimes you only want to list the different (distinct) values.

```sql
SELECT DISTINCT column1, column2, ...
  FROM table_name;

SELECT COUNT(DISTINCT first_name) FROM patients;
```

## SQL EXISTS Operator

The EXISTS operator is used to test for the existence of any record in a subquery.

The EXISTS operator returns TRUE if the subquery returns one or more records.

Note: SQL statements that use the EXISTS condition are very inefficient since the sub-query is rerun for EVERY row in the outer query's table. There are more efficient ways to write most queries, that do not use the EXISTS condition.

```sql
SELECT column_name(s)
  FROM table_name
  WHERE EXISTS
  (SELECT column_name FROM table_name WHERE condition);

  select * from patients
  where exists (select diagnosis from admissions
      where patients.patient_id = admissions.patient_id
      and diagnosis = 'Pregnancy')
```

## SQL ANY and ALL Operators

The ANY and ALL operators allow you to perform a comparison between a single column value and a range of other values.

#### The ANY operator:

- returns a boolean value as a result

- returns TRUE if ANY of the subquery values meet the condition

ANY means that the condition will be true if the operation is true for any of the values in the range.

```sql
SELECT column_name(s)
FROM table_name
WHERE column_name operator ANY
  (SELECT column_name
  FROM table_name
  WHERE condition);
```

#### The ALL operator:

- returns a boolean value as a result

- returns TRUE if ALL of the subquery values meet the condition

- is used with SELECT, WHERE and HAVING statements

ALL means that the condition will be true only if the operation is true for all values in the range.

```sql
SELECT ALL column_name(s)
FROM table_name
WHERE condition;

SELECT column_name(s)
FROM table_name
WHERE column_name operator ALL
  (SELECT column_name
  FROM table_name
  WHERE condition);
```

## SQL IFNULL(), ISNULL(), COALESCE(), and NVL() Functions

The IFNULL function goes by many names depending on what language you are using. We use IFNULL but your specific language may use, ISNULL, COALESCE, or NVL but most function the same.

Look at the following SELECT statement:

```sql
select first_name, allergies from patients

```

The allergie column displays null for our output in some cases. We want it to display a default value in that case

```sql
SELECT first_name, IFNULL(allergies,'none') as allergies
FROM patients

SELECT first_name, COALESCE(allergies,'none') as allergies
FROM patients
```

# SQL NULL Values

#### What is a NULL Value?

A field with a NULL value is a field with no value.

If a field in a table is optional, it is possible to insert a new record or update a record without adding a value to this field. Then, the field will be saved with a NULL value.

#### How to Test for NULL Values?

It is not possible to test for NULL values with comparison operators, such as =, <, or <>.

We will have to use the IS NULL and IS NOT NULL operators instead.

```sql
SELECT column_names
FROM table_name
WHERE column_name IS NULL;

SELECT column_names
FROM table_name
WHERE column_name IS NOT NULL;
```

## SQL Aliases

SQL aliases are used to give a table, or a column in a table, a temporary name.

Aliases are often used to make column names more readable.

An alias only exists for the duration of that query.

An alias is created with the AS keyword.

Depending on the language, the AS keyword is optional.

```sql
SELECT column_name AS alias_name
FROM table_name;

SELECT column_name(s)
FROM table_name AS alias_name;

SELECT avg(weight) AS average_weight,
       avg(height) AS average_height
FROM patients;


SELECT *
FROM patients as p
  JOIN admissions as a ON a.patient_id = p.patient_id
```

---

## Aggrgate

### SQL COUNT() Function

The COUNT() function returns the number of rows that matches a specified criterion.

COUNT() usually has \* as it's parameter because the name of the column does not usually matter since they all have the same count.

```sql
SELECT COUNT(column_name)
FROM table_name
WHERE condition;

SELECT COUNT(*) FROM patients
WHERE weight > 120;
```

## SQL AVG() Function

The AVG() function returns the average value of a numeric column.

```sql
SELECT AVG(column_name)
FROM table_name
WHERE condition;
```

AVG() Example:
The following SQL statement finds the average weight of patients:

```sql
SELECT AVG(weight) FROM patients;
SELECT AVG(weight) FROM patients;

```

## SQL SUM() Function

The SUM() function returns the total sum of a numeric column.

```sql
SELECT SUM(column_name)
FROM table_name
WHERE condition;
```

SUM() Example
The following SQL statement finds the sum of patients weight:

```sql
SELECT SUM(weight) FROM patients;
```

## SQL MAX() and MIN() Function

The MAX() function returns the largest value of the selected column. MIN DO opposite.

```sql
SELECT MAX(column_name)
FROM table_name
WHERE condition;

SELECT MIN(column_name)
FROM table_name
WHERE condition;
```

MAX() Example
The following SQL statement finds the highest patient's weight:

```sql
SELECT MAX(weight) FROM patients;
SELECT MIN(weight) FROM patients;
```

## String:

SQL CONCAT() Function

The CONCAT() function adds two or more expressions together.

```sql
SELECT CONCAT(first_name,' ', last_name) AS full_name
FROM patients;
```

## SQL LEN() Function

The LEN() function returns the length of the string in bytes.

Note: Depending on the language, LEN may go by another name such as LENGTH.

```sql
SELECT first_name, LEN(first_name) AS length_of_name
FROM patients;
```

## SQL UPPER() / LOWER() Function

```sql
SELECT first_name, UPPER(first_name) AS uppercase_name
FROM patients;
```

---

# Date

## SQL CURRENT_TIMESTAMP Function

The CURRENT_TIMESTAMP function returns the current date and time.

Note: The date and time is returned as "YYYY-MM-DD HH-MM-SS" (string)

CURRENT_TIMESTAMP Example:
The following SQL statement shows the current timestamp:

```sql
SELECT CURRENT_TIMESTAMP;
```

## SQL Year()/Month()/Date Function

The YEAR() function returns the year part for a given date (a number from 1000 to 9999).

```sql
SELECT year(current_timestamp)
SELECT month(current_timestamp)
SELECT date(current_timestamp)
```

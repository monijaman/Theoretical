Top 10 SQL Interview Questions 🔥

1️⃣ What is a table and a field in SQL?
⦁ Table: Organized data in rows and columns
⦁ Field: A column representing data attribute

2️⃣ Describe the SELECT statement.
⦁ Fetch data from one or more tables
⦁ Use WHERE to filter, ORDER BY to sort

3️⃣ Explain SQL constraints.
⦁ Rules for data integrity: PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, CHECK

4️⃣ What is normalization?
⦁ Process to reduce data redundancy & improve integrity (1NF, 2NF, 3NF…)

5️⃣ Explain different JOIN types with examples.
⦁ INNER, LEFT, RIGHT, FULL JOIN: Various ways to combine tables based on matching rows

6️⃣ What is a subquery? Give example.
⦁ Query inside another query:
SELECT name FROM employees
WHERE department_id = (SELECT id FROM departments WHERE name='Sales');

7️⃣ How to optimize slow queries?
⦁ Use indexes, avoid SELECT \*, simplify joins, reduce nested queries

8️⃣ What are aggregate functions? Examples?
⦁ Perform calculations on sets: SUM(), COUNT(), AVG(), MIN(), MAX()

9️⃣ What is SQL injection? How to prevent it?
⦁ Security risk manipulating queries
⦁ Prevent: parameterized queries, input validation

🔟 How to find the Nth highest salary without TOP/LIMIT?
SELECT DISTINCT salary FROM employees e1
WHERE N-1 = (SELECT COUNT(DISTINCT salary) FROM employees e2 WHERE e2.salary > e1.salary);

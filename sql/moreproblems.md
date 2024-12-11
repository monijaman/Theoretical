# Patient Table Schema

## Patients Table Schema:

| Column Name   | Data Type | Constraints |
| ------------- | --------- | ----------- |
| `patient_id`  | INT       | Primary Key |
| `first_name`  | TEXT      |             |
| `last_name`   | TEXT      |             |
| `gender`      | CHAR(1)   |             |
| `birth_date`  | DATE      |             |
| `city`        | TEXT      |             |
| `province_id` | CHAR(2)   | Primary Key |
| `allergies`   | TEXT      |             |
| `height`      | INT       |             |
| `weight`      | INT       |             |

## Admissions Table Schema:

| Column Name           | Data Type | Constraints |
| --------------------- | --------- | ----------- |
| `patient_id`          | INT       | Primary Key |
| `admission_date`      | DATE      |             |
| `discharge_date`      | DATE      |             |
| `diagnosis`           | TEXT      |             |
| `attending_doctor_id` | INT       | Primary Key |

# Doctors Table Schema:

| Column Name  | Data Type | Constraints |
| ------------ | --------- | ----------- |
| `doctor_id`  | INT       | Primary Key |
| `first_name` | TEXT      |             |
| `last_name`  | TEXT      |             |
| `specialty`  | TEXT      |             |

# Province Table Schema:

| Column Name     | Data Type | Constraints |
| --------------- | --------- | ----------- |
| `province_id`   | CHAR(2)   | Primary Key |
| `province_name` | TEXT      |             |

## Problem 1

### Show first name and last name of patients that weight within the range of 100 to 120 (inclusive)

```sql
SELECT first_name, last_name
from patients where
weight between 100 and 120
```

## Problem 2

### Update the patients table for the allergies column. If the patient's allergies is null then replace it with 'NKA'

```sql
update patients set allergies="NKA" where allergies is null

```

## Problem 3

### Show first name and last name concatinated into one column to show their full name.

```sql
Select concat(first_name, ' ', last_name) as full_name from patients

```

## Problem 4

### Show first name, last name, and the full province name of each patient.

Example: 'Ontario' instead of 'ON'

```sql
Select  first_name, last_name, p.province_name
    from patients
    join province_names as p on
patients.province_id=p.province_id
```

## Problem 5

### Show how many patients have a birth_date with 2010 as the birth year.

```sql
Select  count(*)  from patients where year(birth_date)==2010

```

## Problem 5

### Show the first_name, last_name, and height of the patient with the greatest height.

```sql

Select  first_name,
    last_name,
    max(height) as height
from patients

SELECT
  first_name,
  last_name,
  height
FROM patients
WHERE height = (
    SELECT max(height)
    FROM patients
  )
```

## Problem 6

### Show all columns for patients who have one of the following patient_ids: 1,45,534,879,1000

```sql
SELECT * FROM patients where patient_id in (1,45,534,879,1000

```

## Problem 7

### Show the total number of admissions

```sql
select count(*) from admissions

```

## Problem 8

### Show all the columns from admissions where the patient was admitted and discharged on the same day.

```sql
select * from admissions where  admission_date=discharge_date
```

## Problem 9

### Show the patient id and the total number of admissions for patient_id 579.

```sql
select patient_id, count(patient_id) as total_admissions  from admissions where  patient_id=579

```

## Problem 10

### Based on the cities that our patients live in, show unique cities that are in province_id 'NS'?

```sql
select DISTINCT (city)  as unique_cities  from patients where  province_id ='NS'

SELECT city
FROM patients
GROUP BY city
HAVING province_id = 'NS';
```

## Problem 11

### Show unique birth years from patients and order them by ascending.

```sql
select
distinct(year(birth_date)) as birth_year
from patients
order by birth_year asc

```

## Problem 12

### Show unique first names from the patients table which only occurs once in the list.

For example, if two or more people are named 'John' in the first_name column then don't include their name in the output list. If only 1 person is named 'Leo' then include them in the output.

```sql
SELECT first_name
FROM patients
GROUP BY first_name
HAVING COUNT(*) = 1;

SELECT first_name
FROM (
    SELECT
      first_name,
      count(first_name) AS occurrencies
    FROM patients
    GROUP BY first_name
  )
WHERE occurrencies = 1
```

note: COUNT(\*) is an aggregate function and should be used in a grouped context. Without a GROUP BY, it calculates the count over the entire result set.

## Problem 13

### Show patient_id and first_name from patients where their first_name start and ends with 's' and is at least 6 characters long.

```sql

SELECT
  patient_id,
  first_name
FROM patients
WHERE
  first_name LIKE 's%s'
  AND len(first_name) >= 6;

SELECT
  patient_id,
  first_name
FROM patients
WHERE first_name LIKE 's____%s';


SELECT
  patient_id,
  first_name
FROM patients
where
  first_name like 's%'
  and first_name like '%s'
  and len(first_name) >= 6;
```

## Show patient_id, first_name, last_name from patients whos diagnosis is 'Dementia'.

Primary diagnosis is stored in the admissions table.

### Show

```sql

```

## Problem 15

### Show

```sql

```

## Problem 16

### Show

```sql

```

Useful Links:

[Collected From](https://www.sql-practice.com/){targe="\_blank"}

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
SELECT
  patients.patient_id,
  first_name,
  last_name
FROM patients
  JOIN admissions ON admissions.patient_id = patients.patient_id
WHERE diagnosis = 'Dementia';

SELECT
  patient_id,
  first_name,
  last_name
FROM patients
WHERE patient_id IN (
    SELECT patient_id
    FROM admissions
    WHERE diagnosis = 'Dementia'
  );
```

## Problem 15

### Display every patient's first_name.

Order the list by the length of each name and then by alphabetically.

```sql
SELECT  first_name from patients
order by len(first_name), first_name asc

```

## Problem 16

### Show the total amount of male patients and the total amount of female patients in the patients table.

Display the two results in the same row.

```sql

SELECT
(select count(*) from patients where gender="M") as male_count,
(select count(*) from patients where gender="F") as female_count;

select
	SUM(Gender = 'M') as male_count,
  SUM(Gender ='F') as female_count
  From patients;

select
  sum(case when gender = 'M' then 1 end) as male_count,
  sum(case when gender = 'F' then 1 end) as female_count
from patients;

```

## Problem 17

### Show first and last name, allergies from patients which have allergies to either 'Penicillin' or 'Morphine'. Show results ordered ascending by allergies then by first_name then by last_name.

```sql
SELECT
  first_name,
  last_name,
  allergies
FROM patients
WHERE
  allergies IN ('Penicillin', 'Morphine')
ORDER BY
  allergies,
  first_name,
  last_name;

SELECT
  first_name,
  last_name,
  allergies
FROM
  patients
WHERE
  allergies = 'Penicillin'
  OR allergies = 'Morphine'
ORDER BY
  allergies ASC,
  first_name ASC,
  last_name ASC;
```

## Problem 18

### Show patient_id, diagnosis from admissions. Find patients admitted multiple times for the same diagnosis.

```sql

select patient_id, diagnosis
from admissions
group by patient_id, diagnosis
having count(*) > 1
```

## Problem 19

### Show the city and the total number of patients in the city.

Order from most to least patients and then by city name ascending.

```sql
select city, count(*) as num_patients
from patients
group by city
order by num_patients desc, city asc
```

## Problem 20

### Show first name, last name and role of every person that is either patient or doctor.

The roles are either "Patient" or "Doctor"

```sql
select city, count(*) as num_patients
from patients
group by city
order by num_patients desc, city asc
```

## Problem 21

### Show first name, last name and role of every person that is either patient or doctor.

The roles are either "Patient" or "Doctor"

```sql
Show first name, last name and role of every person that is either patient or doctor.
The roles are either "Patient" or "Doctor"
```

## Problem 22

### Show all allergies ordered by popularity. Remove NULL values from query.

```sql
SELECT
  allergies,
  COUNT(*) AS total_diagnosis
FROM patients
WHERE
  allergies IS NOT NULL
GROUP BY allergies
ORDER BY total_diagnosis DESC


SELECT
  allergies,
  count(*)
FROM patients
WHERE allergies NOT NULL
GROUP BY allergies
ORDER BY count(*) DESC



SELECT
  allergies,
  count(allergies) AS total_diagnosis
FROM patients
GROUP BY allergies
HAVING
  allergies IS NOT NULL
ORDER BY total_diagnosis DESC
```

## Problem 23

### Show all patient's first_name, last_name, and birth_date who were born in the 1970s decade. Sort the list starting from the earliest birth_date.

```sql
   select first_name, last_name, birth_date
   from patients
   where  year(birth_date)
   between  1970 and 1979
   order by birth_date asc

   SELECT
      first_name,
      last_name,
      birth_date
    FROM patients
    WHERE
      birth_date >= '1970-01-01'
      AND birth_date < '1980-01-01'
    ORDER BY birth_date ASC

    SELECT
      first_name,
      last_name,
      birth_date
    FROM patients
    WHERE year(birth_date) LIKE '197%'
    ORDER BY birth_date ASC
```

## Problem 24

### We want to display each patient's full name in a single column. Their last_name in all upper letters must appear first, then first_name in all lower case letters. Separate the last_name and first_name with a comma. Order the list by the first_name in decending order

EX: SMITH,jane

```sql
SELECT
  CONCAT(UPPER(last_name), ',', LOWER(first_name)) AS new_name_format
FROM patients
ORDER BY first_name DESC;


SELECT
  UPPER(last_name) || ',' || LOWER(first_name) AS new_name_format
FROM patients
ORDER BY first_name DESC;
```

## Problem 25

### Show the province_id(s), sum of height; where the total sum of its patient's height is greater than or equal to 7,000.

```sql
select patients.province_id,  SUM(height)   as total_height
from patients
join province_names
on patients.province_id=province_names.province_id
group by patients.province_id
having total_height >= 7000


select * from
(select province_id, SUM(height) as sum_height
FROM patients group by province_id)
where sum_height >= 7000;

```

## Problem 26

### Show the difference between the largest weight and smallest weight for patients with the last name 'Maroni'

```sql
SELECT
  (MAX(weight) - MIN(weight)) AS weight_delta
FROM patients
WHERE last_name = 'Maroni';

```

## Problem 27

### Show all of the days of the month (1-31) and how many admission_dates occurred on that day. Sort by the day with most admissions to least admissions.

```sql
SELECT *
FROM admissions
WHERE patient_id = 542
GROUP BY patient_id
HAVING
  admission_date = MAX(admission_date);

SELECT *
FROM admissions
WHERE
  patient_id = '542'
  AND admission_date = (
    SELECT MAX(admission_date)
    FROM admissions
    WHERE patient_id = '542'
  )


SELECT *
FROM admissions
WHERE patient_id = 542
ORDER BY admission_date DESC
LIMIT 1


SELECT *
FROM admissions
GROUP BY patient_id
HAVING
  patient_id = 542
  AND max(admission_date)

```

## Problem 28

### Show patient_id, attending_doctor_id, and diagnosis for admissions that match one of the two criteria:

1. patient_id is an odd number and attending_doctor_id is either 1, 5, or 19.
2. attending_doctor_id contains a 2 and the length of patient_id is 3 characters.

```sql
SELECT
  patient_id,
  attending_doctor_id,
  diagnosis
FROM admissions
WHERE
  (
    attending_doctor_id IN (1, 5, 19)
    AND patient_id % 2 != 0
  )
  OR
  (
    attending_doctor_id LIKE '%2%'
    AND len(patient_id) = 3
  )
```

## Problem 29

## Show first_name, last_name, and the total number of admissions attended for each doctor.

```sql

SELECT
  first_name,
  last_name,
  count(*) as admissions_total
from admissions a
  join doctors ph on ph.doctor_id = a.attending_doctor_id
group by attending_doctor_id

 SELECT
  first_name,
  last_name,
  count(*)
from
  doctors p,
  admissions a
where
  a.attending_doctor_id = p.doctor_id
group by p.doctor_id;

```

## Problem 30

### For each doctor, display their id, full name, and the first and last admission date they attended.

```sql
select doctor_id, concat(first_name, ' ', last_name) as full_name,
min(a.admission_date) as first_admission,
mAX(a.admission_date) as last_admission
from doctors d
join admissions a
on d.doctor_id=a.attending_doctor_id
group by d.doctor_id
```

## Problem 31

### Display the total amount of patients for each province. Order by descending.

```sql
SELECT
  province_name,
  COUNT(*) as patient_count
FROM patients pa
  join province_names pr on pr.province_id = pa.province_id
group by pr.province_id
order by patient_count desc;
```

## Problem 32

### For every admission, display the patient's full name, their admission diagnosis, and their doctor's full name who diagnosed their problem.

```sql
select concat(p.first_name,' ', p.last_name) as patient_name,
a.diagnosis as diagnosis,
concat(d.first_name, ' ',d.last_name) as doctor_name
from admissions a
join  patients p
on a.patient_id = p.patient_id
join doctors d
on a.attending_doctor_id = d.doctor_id

```

## Problem 33

### display the first name, last name and number of duplicate patients based on their first name and last name.

```sql
select
  first_name,
  last_name,
  count(*) as num_of_duplicates
from patients
group by
  first_name,
  last_name
having count(*) > 1
```

## Problem 34

### Display patient's full name, height in the units feet rounded to 1 decimal, weight in the unit pounds rounded to 0 decimals, birth_date, gender non abbreviated.

Convert CM to feet by dividing by 30.48.
Convert KG to pounds by multiplying by 2.205.

```sql
 select concat(first_name,' ', last_name) as patient_name,
 round(height/30.48, 1) as 'height "Feet"',
 round(weight*2.205, 0) as Weight,
 birth_date,
  CASE
      WHEN gender = 'M'   THEN 'MALE'
      else 'FEMALE' end as gender_type
 from patients
```

## Problem 35

### Show patient_id, first_name, last_name from patients whose does not have any records in the admissions table. (Their patient_id does not exist in any admissions.patient_id rows.)

```sql

 select patient_id, first_name, last_name
 from patients
 where patient_id not in (select patient_id from admissions)


SELECT
  patients.patient_id,
  first_name,
  last_name
from patients
  left join admissions on patients.patient_id = admissions.patient_id
where admissions.patient_id is NULL
```

## Problem 36

### Display a single row with max_visits, min_visits, average_visits where the maximum, minimum and average number of admissions per day is calculated. Average is rounded to 2 decimal places.

```sql
select
	max(number_of_visits) as max_visits,
	min(number_of_visits) as min_visits,
  round(avg(number_of_visits),2) as average_visits
from (
  select admission_date, count(*) as number_of_visits
  from admissions
  group by admission_date
)
```

## Problem 37

### Display patient's full name,

```sql

```

## Problem 33

### Display patient's full name,

height in the units feet rounded to 1 decimal,
weight in the unit pounds rounded to 0 decimals,
birth_date,
gender non abbreviated.

Convert CM to feet by dividing by 30.48.
Convert KG to pounds by multiplying by 2.205.

```sql

```

Useful Links:

[Collected From](https://www.sql-practice.com/){targe="\_blank"}

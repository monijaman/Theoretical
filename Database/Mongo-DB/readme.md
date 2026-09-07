# MongoDB Interview Questions and Answers

### Basic Questions

1. **What is MongoDB, and how does it differ from SQL databases?**
   - MongoDB is a NoSQL, document-oriented database that stores data in BSON (Binary JSON) format, unlike SQL databases that use tables and rows. MongoDB is schema-less, allowing for flexible document structures, while SQL databases require predefined schemas.

2. **Define a document and collection in MongoDB.**
   - A **document** is a set of key-value pairs, similar to JSON objects, representing a single record. A **collection** is a group of documents within a database, similar to a table in SQL.

3. **Explain the key differences between MongoDB and MySQL.**
   - MongoDB is schema-less, document-based, and scalable horizontally. MySQL is a relational, structured database requiring defined schemas and is generally scaled vertically.

4. **How do you insert a document into a MongoDB collection?**
   - Use `db.collection.insertOne({ ... })` for a single document or `db.collection.insertMany([{ ... }, { ... }])` for multiple documents.

### Intermediate Questions

5. **What is a replica set, and why is it important in MongoDB?**
   - A **replica set** is a group of MongoDB instances that maintain the same data set for redundancy and failover support. If the primary instance fails, a secondary instance is promoted.

6. **Explain indexing in MongoDB and its benefits.**
   - Indexing in MongoDB creates data structures that improve the efficiency of query operations. Without indexes, MongoDB must scan every document, slowing down queries.

7. **How does MongoDB handle transactions?**
   - MongoDB supports ACID transactions on a single document and multi-document transactions within a single replica set or sharded cluster since version 4.0.

8. **What are some data types supported in MongoDB?**
   - MongoDB supports various data types: String, Integer, Boolean, Double, Date, Array, Object, ObjectId, and Binary Data.

9. **Describe the aggregation framework and its use cases.**
   - The aggregation framework processes data through stages (e.g., `$match`, `$group`, `$sort`) to transform documents, useful for complex data analysis.

10. **How do you perform a search query with specific filters in MongoDB?**
    - Use `db.collection.find({ key: value, ... })`, adding additional filters for complex queries.

### Advanced Questions

11. **What is sharding in MongoDB, and when would you use it?**
    - Sharding distributes data across multiple servers, useful for large datasets requiring high write throughput. MongoDB’s sharding partitions data by ranges or hashed keys.

12. **Explain the concept of MongoDB schema design.**
    - Schema design in MongoDB involves structuring data to fit specific access patterns, balancing normalization and denormalization for performance and scalability.

13. **How do you optimize a query in MongoDB?**
    - Use indexing, projection to limit fields returned, and the aggregation pipeline to process data in stages.

14. **Describe how MongoDB manages data consistency and durability.**
    - MongoDB ensures consistency and durability through journaling, replication, and write concern levels, allowing control over when a write is acknowledged.

15. **What are capped collections, and why are they useful?**
    - Capped collections have a fixed size, and old documents are automatically removed when the size limit is reached. They’re useful for logging or streaming data.

### Hands-On/Practical Questions

16. **How would you back up and restore a MongoDB database?**
    - Use `mongodump` to create backups and `mongorestore` to restore. These utilities can be run from the command line.

17. **Write a query to update multiple documents in MongoDB.**
    - Use `db.collection.updateMany({ filter }, { $set: { key: value } })` to update multiple documents matching the filter.

18. **How would you handle schema changes in MongoDB?**
    - MongoDB allows for flexible schemas, so adding new fields doesn’t break existing data. Schema changes are handled with versioning or data migration scripts.

19. **Explain how to manage MongoDB indexes to improve performance.**
    - Regularly analyze query patterns, use `db.collection.createIndex()` for frequent query fields, and monitor with `explain()` to ensure indexes are efficient.

20. **Demonstrate how to set up a MongoDB replica set.**
    - Start multiple MongoDB instances, connect them, and initiate a replica set using `rs.initiate()` and `rs.add()` commands in the Mongo shell.

 
### Advanced Questions

21. **Explain what `$lookup` does in MongoDB’s aggregation pipeline.**
   - `$lookup` performs a left outer join on another collection in the same database, allowing data from multiple collections to be combined in a single query. This is useful for retrieving related data without needing to denormalize.

22. **What is MongoDB Atlas, and why is it beneficial?**
   - MongoDB Atlas is a managed cloud database service that handles deployment, scaling, and backups. It simplifies database management and is particularly beneficial for users who want a scalable, fully managed solution with built-in monitoring and security.

23. **How does MongoDB handle concurrency?**
   - MongoDB uses a multi-granularity locking system with a writer lock for the database and reader locks for collections, allowing concurrent read and write operations. Starting from MongoDB 3.0, document-level locking allows more granular concurrency control.

24. **What is the role of journaling in MongoDB?**
   - Journaling ensures durability and crash recovery by writing operations to a journal before committing them to the database. This helps MongoDB maintain data integrity in case of crashes or power failures.

25. **What are MongoDB views, and how do they differ from collections?**
   - Views in MongoDB are queryable, read-only views of data that are defined by aggregation pipelines. Unlike collections, they do not store data but provide a way to create dynamic, filtered, or computed representations of data within collections.

### Hands-On/Practical Questions

26. **How would you implement full-text search in MongoDB?**
   - MongoDB provides a built-in full-text search feature. To enable it, create a text index on fields you want to search using `db.collection.createIndex({ field: "text" })`. You can then use `$text` queries to search within these fields.

27. **What is MongoDB Compass, and how is it used?**
   - MongoDB Compass is a GUI tool that provides a graphical interface to interact with MongoDB. It allows users to visualize data, perform CRUD operations, optimize queries, and manage indexes without using the Mongo shell.

28. **How do you perform a bulk insert in MongoDB?**
   - Use `db.collection.insertMany([{ ... }, { ... }, ...])` to insert multiple documents at once. This can improve performance by reducing the number of round trips to the database.

29. **Explain the purpose of the `explain()` method in MongoDB.**
   - `explain()` provides details on how MongoDB will execute a query, including which indexes it will use. This is useful for analyzing and optimizing query performance.

30. **How do you handle large datasets in MongoDB to prevent performance issues?**
   - For large datasets, consider sharding for horizontal scaling, optimize indexes based on query patterns, and use pagination techniques like the `$skip` and `$limit` operators or range-based queries to reduce data load.

 
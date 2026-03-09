# AWS - Complete Guide for Interview Preparation

## Table of Contents

1. [AWS Lambda](#aws-lambda)
2. [API Gateway](#api-gateway)
3. [DynamoDB](#dynamodb)
4. [Serverless Architecture](#serverless-architecture)
5. [Containers & Docker](#containers)
6. [ETL Pipelines](#etl-pipelines)
7. [Infrastructure as Code (IaC)](#infrastructure-as-code)
8. [Practice with Go](#practice-with-go)

---

## AWS Lambda

### Overview

AWS Lambda is a serverless compute service that lets you run code without provisioning or managing servers. You pay only for compute time you consume.

### Key Concepts

- **Event-driven**: Lambda functions are triggered by events from AWS services or custom applications
- **No infrastructure management**: Auto-scaling, patching, and maintenance handled by AWS
- **Stateless**: Each invocation is independent
- **Cold starts**: Initial delay when Lambda container starts for the first time
- **Execution timeout**: Maximum 15 minutes (900 seconds)
- **Memory**: 128 MB to 10,240 MB (affects CPU and cost)

### Example: Simple Lambda Function (Node.js)

```javascript
exports.handler = async (event) => {
  console.log("Event:", event);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello from Lambda!",
      input: event,
    }),
  };
};
```

### Example: Lambda with DynamoDB Integration

```javascript
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    // Parse incoming event
    const { userId, name } = JSON.parse(event.body);

    // Save to DynamoDB
    await dynamodb
      .put({
        TableName: "Users",
        Item: {
          userId,
          name,
          createdAt: new Date().toISOString(),
        },
      })
      .promise();

    return {
      statusCode: 201,
      body: JSON.stringify({ message: "User created" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
```

### Best Practices

- Keep Lambda functions small and focused
- Use environment variables for configuration
- Implement proper error handling and logging
- Optimize cold start time by minimizing dependencies
- Use Lambda layers for shared code
- Monitor with CloudWatch

---

## API Gateway

### Overview

Amazon API Gateway is a fully managed service that makes it easy to create, publish, maintain, monitor, and secure APIs. It handles traffic management, CORS, authentication, and logging.

### Key Concepts

- **REST API**: Traditional HTTP-based API
- **HTTP API**: Lightweight, low-latency, lower cost alternative
- **WebSocket API**: For real-time bidirectional communication
- **Stages**: Deployment environments (dev, staging, prod)
- **Models**: JSON schemas for request/response validation
- **Authorizers**: Custom authentication/authorization logic

### Example: REST API with Lambda Integration

```yaml
# API Gateway Configuration
API: UserAPI
  Resources:
    /users:
      POST:
        Integration: Lambda (CreateUser)
        Authorization: AWS_IAM
    /users/{userId}:
      GET:
        Integration: Lambda (GetUser)
```

### Example: Request Validation

```javascript
// Lambda proxy integration handler
exports.handler = async (event) => {
  const { pathParameters, queryStringParameters, body } = event;

  console.log("Path params:", pathParameters);
  console.log("Query params:", queryStringParameters);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ data: "response" }),
  };
};
```

### Best Practices

- Use API keys for rate limiting and usage tracking
- Implement request/response validation with models
- Use stages for different environments
- Enable CloudWatch logs for debugging
- Use X-Ray for tracing distributed requests
- Implement CORS properly
- Use authorizers for fine-grained access control

---

## DynamoDB

### Overview

Amazon DynamoDB is a fully managed NoSQL database service that provides fast and predictable performance with seamless scalability.

### Key Concepts

- **Partition Key**: Primary way to distribute data across partitions (required)
- **Sort Key**: Optional secondary sort order within partition (creates composite key)
- **Global Secondary Index (GSI)**: Alternate key structure with separate throughput
- **Local Secondary Index (LSI)**: Alternate sort key using same partition key
- **Throughput**: Provisioned or on-demand capacity
- **TTL**: Automatic deletion of expired items

### Example: Table Design

```javascript
// Create Users table
{
    TableName: 'Users',
    KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },      // Partition key
        { AttributeName: 'createdAt', KeyType: 'RANGE' }    // Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'createdAt', AttributeType: 'N' },
        { AttributeName: 'email', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
        {
            IndexName: 'EmailIndex',
            KeySchema: [
                { AttributeName: 'email', KeyType: 'HASH' }
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
            }
        }
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    },
    TimeToLiveSpecification: {
        AttributeName: 'expiresAt',
        Enabled: true
    }
}
```

### Example: Query Operations

```javascript
const dynamodb = new AWS.DynamoDB.DocumentClient();

// Get item
const getUser = await dynamodb
  .get({
    TableName: "Users",
    Key: { userId: "123" },
  })
  .promise();

// Query by partition key
const userItems = await dynamodb
  .query({
    TableName: "Users",
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": "123",
    },
  })
  .promise();

// Scan with filter (expensive operation)
const results = await dynamodb
  .scan({
    TableName: "Users",
    FilterExpression: "email = :email",
    ExpressionAttributeValues: {
      ":email": "user@example.com",
    },
  })
  .promise();

// Batch operations
await dynamodb
  .batchWrite({
    RequestItems: {
      Users: [
        { PutRequest: { Item: { userId: "1", name: "User1" } } },
        { PutRequest: { Item: { userId: "2", name: "User2" } } },
      ],
    },
  })
  .promise();
```

### Best Practices

- Choose partition key wisely to avoid hot partitions
- Use GSI for alternative query patterns
- Avoid scan operations; use query instead
- Implement proper TTL for temporary data
- Monitor consumed capacity and adjust accordingly
- Use batch operations for bulk writes
- Implement exponential backoff for retries

---

## Serverless Architecture

### Overview

Serverless architecture is an approach where applications are built using managed services, event-driven functions, and backend services without managing servers.

### Benefits

- **Cost**: Pay per execution, not per server
- **Scalability**: Auto-scaling based on demand
- **Reduced operational overhead**: AWS handles maintenance
- **Faster time to market**: Focus on business logic

### Common Patterns

#### 1. Event-Driven Processing

```
S3 Upload → S3 Event → Lambda → Process → DynamoDB
```

#### 2. API-Driven Architecture

```
Client → API Gateway → Lambda → Database
```

#### 3. Stream Processing

```
Kinesis Stream → Lambda (batch) → Aggregation Service
```

### Example: Complete Serverless Application

```javascript
// 1. API Endpoint Handler
exports.createOrderHandler = async (event) => {
  const order = JSON.parse(event.body);
  const orderId = generateId();

  // Save to database
  await saveOrderToDatabase(orderId, order);

  // Trigger order processing
  await publishToSNS({
    orderId,
    status: "CREATED",
  });

  return { statusCode: 201, body: JSON.stringify({ orderId }) };
};

// 2. Order Processing Handler
exports.processOrderHandler = async (event) => {
  const { orderId } = event.Records[0].Sns.Message;

  // Validate inventory
  const inventory = await checkInventory(orderId);

  if (inventory.available) {
    // Update order status
    await updateOrderStatus(orderId, "PROCESSING");

    // Send email notification
    await sendEmailNotification(orderId);
  }
};

// 3. Cleanup Handler (runs periodically)
exports.cleanupExpiredOrders = async () => {
  await deleteExpiredOrders(24 * 60 * 60 * 1000); // 24 hours
};
```

---

## Containers

### Docker Basics

Containers package applications with all dependencies, ensuring consistency across environments.

### Example: Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### AWS Container Services

- **Amazon ECR**: Container registry
- **Amazon ECS**: Container orchestration
- **Amazon EKS**: Kubernetes management
- **AWS Fargate**: Serverless container compute

### Example: ECS Task Definition

```json
{
  "family": "api-service",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/api:latest",
      "memory": 512,
      "cpu": 256,
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 0,
          "protocol": "tcp"
        }
      ],
      "environment": [{ "name": "NODE_ENV", "value": "production" }],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/api-service",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

---

## ETL Pipelines

### Overview

ETL (Extract, Transform, Load) pipelines automate data movement and processing.

### AWS ETL Services

- **AWS Glue**: Managed ETL service
- **AWS Data Pipeline**: Workflow orchestration
- **Amazon EMR**: Big data processing
- **AWS Lambda**: Serverless data transformation

### Example: Simple ETL Pipeline

```javascript
// 1. Extract from S3
const sourceData = await s3
  .getObject({
    Bucket: "source-bucket",
    Key: "raw-data.json",
  })
  .promise();

// 2. Transform
const records = JSON.parse(sourceData.Body);
const transformed = records.map((record) => ({
  id: record.id,
  name: record.name.toUpperCase(),
  processedAt: new Date().toISOString(),
}));

// 3. Load to DynamoDB
for (const item of transformed) {
  await dynamodb
    .put({
      TableName: "ProcessedData",
      Item: item,
    })
    .promise();
}
```

### Example: AWS Glue Job (Python)

```python
import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job

args = getResolvedOptions(sys.argv, ['JOB_NAME', 'S3_INPUT', 'S3_OUTPUT'])

sc = SparkContext()
glueContext = GlueContext(sc)
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Reading data from S3
dyf = glueContext.create_dynamic_frame.from_options(
    format_options={"multiline": False},
    connection_type="s3",
    format="json",
    connection_options={"paths": [args['S3_INPUT']]},
    transformation_ctx="source"
)

# Transforming data
transformed = dyf.map(lambda x: {...})

# Writing to S3
glueContext.write_dynamic_frame.from_options(
    frame=transformed,
    connection_type="s3",
    connection_options={"path": args['S3_OUTPUT']},
    format="parquet",
    transformation_ctx="sink"
)

job.commit()
```

---

## Infrastructure as Code

### Terraform Example

```hcl
# Configure AWS Provider
provider "aws" {
    region = "us-east-1"
}

# Create S3 bucket
resource "aws_s3_bucket" "data_bucket" {
    bucket = "my-data-bucket-${data.aws_caller_identity.current.account_id}"

    tags = {
        Name        = "DataBucket"
        Environment = "production"
    }
}

# Create Lambda function
resource "aws_lambda_function" "processor" {
    filename      = "lambda.zip"
    function_name = "data-processor"
    role          = aws_iam_role.lambda_role.arn
    handler       = "index.handler"
    runtime       = "nodejs18.x"

    environment {
        variables = {
            BUCKET_NAME = aws_s3_bucket.data_bucket.id
        }
    }
}

# Create DynamoDB table
resource "aws_dynamodb_table" "users" {
    name           = "users"
    billing_mode   = "PAY_PER_REQUEST"
    hash_key       = "userId"
    range_key      = "createdAt"

    attribute {
        name = "userId"
        type = "S"
    }

    attribute {
        name = "createdAt"
        type = "N"
    }
}
```

### CloudFormation Example (JSON)

```json
{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Simple API Stack",
  "Resources": {
    "UsersTable": {
      "Type": "AWS::DynamoDB::Table",
      "Properties": {
        "TableName": "Users",
        "BillingMode": "PAY_PER_REQUEST",
        "AttributeDefinitions": [
          { "AttributeName": "userId", "AttributeType": "S" }
        ],
        "KeySchema": [{ "AttributeName": "userId", "KeyType": "HASH" }]
      }
    },
    "LambdaFunction": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "FunctionName": "UserProcessor",
        "Runtime": "nodejs18.x",
        "Code": {
          "S3Bucket": "my-code-bucket",
          "S3Key": "lambda.zip"
        },
        "Handler": "index.handler"
      }
    }
  },
  "Outputs": {
    "TableName": {
      "Value": { "Ref": "UsersTable" }
    }
  }
}
```

---

## Practice with Go

For detailed guide on practicing AWS with Go, including hands-on examples and local development setup, see [AWS Practice with Go](./AWS-Practice-Go.md)

Key topics covered:

- AWS SDK for Go setup
- Building Lambda functions in Go
- Working with DynamoDB from Go
- Creating REST APIs with API Gateway
- Container applications on ECS
- Practical projects and exercises.

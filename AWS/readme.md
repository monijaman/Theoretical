# AWS - Complete Guide for Interview Preparation

## Table of Contents

1. [AWS Lambda](#aws-lambda)
2. [API Gateway](#api-gateway)
3. [DynamoDB](#dynamodb)
4. [Serverless Architecture](#serverless-architecture)
5. [Containers & Docker](#containers)
6. [ETL Pipelines](#etl-pipelines)
7. [Infrastructure as Code (IaC)](#infrastructure-as-code)
8. [Complete Integration Tutorial](#complete-integration-tutorial-lambda--api-gateway--dynamodb)
9. [Practice with Go](#practice-with-go)

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

## Complete Integration Tutorial: Lambda + API Gateway + DynamoDB

**What You'll Build**: A complete REST API for managing products with Create, Read, Update, Delete (CRUD) operations.

### Architecture Overview

```
Client (curl/Postman/Browser)
    ↓
API Gateway (Receives HTTP requests)
    ↓
Lambda Functions (Business logic)
    ↓
DynamoDB (Database)
```

### Prerequisites

1. **AWS Account** with console access
2. **AWS CLI** configured: `aws configure`
3. **Node.js 18+** and npm
4. **Linux/Mac terminal** or **PowerShell** (Windows)
5. **10 minutes** to complete setup

### Step 1: Create DynamoDB Table

#### 1.1 Via AWS Console

1. Go to **AWS Console** → Search "DynamoDB"
2. Click **"Create table"**
3. Fill in:
   - **Table name**: `products`
   - **Partition key**: `productId` (String)
   - **Billing mode**: Pay per request
4. Click **"Create table"**
5. Wait ~30 seconds for table to be **Active** ✓

#### 1.2 Via AWS CLI

```bash
aws dynamodb create-table \
  --table-name products \
  --attribute-definitions AttributeName=productId,AttributeType=S \
  --key-schema AttributeName=productId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Step 2: Create IAM Role for Lambda

#### 2.1 Via AWS Console

1. Go to **IAM** → **Roles**
2. Click **"Create role"**
3. Select **Lambda** as service
4. Click **"Next"**
5. Attach policies:
   - Search and select: **AWSLambdaBasicExecutionRole**
   - Search and select: **AmazonDynamoDBFullAccess**
6. Click **"Next"**
7. Name: `lambda-dynamodb-role`
8. Click **"Create role"**
9. **Save the Role ARN** (looks like: `arn:aws:iam::123456789:role/lambda-dynamodb-role`)

### Step 3: Create Lambda Functions

#### 3.1 Create Project Folder

```bash
mkdir product-api
cd product-api
npm init -y
npm install aws-sdk
```

#### 3.2 Create Create Function (POST)

Create file: `create-product.js`

```javascript
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    // Parse request body
    const { productId, name, price, description } = JSON.parse(event.body);

    // Validation
    if (!productId || !name || !price) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Missing required fields: productId, name, price",
        }),
      };
    }

    if (isNaN(price) || price <= 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Price must be a positive number",
        }),
      };
    }

    // Save to DynamoDB
    const item = {
      productId,
      name,
      price: parseFloat(price),
      description: description || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dynamodb
      .put({
        TableName: "products",
        Item: item,
      })
      .promise();

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Product created successfully",
        product: item,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to create product",
        message: error.message,
      }),
    };
  }
};
```

#### 3.3 Create Get Function (GET)

Create file: `get-product.js`

```javascript
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    const productId = event.pathParameters?.id;

    if (!productId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Product ID is required" }),
      };
    }

    // Get from DynamoDB
    const result = await dynamodb
      .get({
        TableName: "products",
        Key: { productId },
      })
      .promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Product not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.Item),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to get product",
        message: error.message,
      }),
    };
  }
};
```

#### 3.4 Create Update Function (PUT)

Create file: `update-product.js`

```javascript
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    const productId = event.pathParameters?.id;
    const { name, price, description } = JSON.parse(event.body);

    if (!productId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Product ID is required" }),
      };
    }

    // Check if product exists
    const existing = await dynamodb
      .get({
        TableName: "products",
        Key: { productId },
      })
      .promise();

    if (!existing.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Product not found" }),
      };
    }

    // Update item
    const updateData = {
      TableName: "products",
      Key: { productId },
      UpdateExpression:
        "SET #name = :name, #price = :price, #desc = :desc, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#name": "name",
        "#price": "price",
        "#desc": "description",
      },
      ExpressionAttributeValues: {
        ":name": name || existing.Item.name,
        ":price": price ? parseFloat(price) : existing.Item.price,
        ":desc":
          description !== undefined ? description : existing.Item.description,
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await dynamodb.update(updateData).promise();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Product updated successfully",
        product: result.Attributes,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to update product",
        message: error.message,
      }),
    };
  }
};
```

#### 3.5 Create Delete Function (DELETE)

Create file: `delete-product.js`

```javascript
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    const productId = event.pathParameters?.id;

    if (!productId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Product ID is required" }),
      };
    }

    // Check if product exists
    const existing = await dynamodb
      .get({
        TableName: "products",
        Key: { productId },
      })
      .promise();

    if (!existing.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Product not found" }),
      };
    }

    // Delete from DynamoDB
    await dynamodb
      .delete({
        TableName: "products",
        Key: { productId },
      })
      .promise();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Product deleted successfully",
        productId,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to delete product",
        message: error.message,
      }),
    };
  }
};
```

#### 3.6 Create List Function (GET all)

Create file: `list-products.js`

```javascript
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    // Scan all products
    const result = await dynamodb
      .scan({
        TableName: "products",
      })
      .promise();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        count: result.Items.length,
        products: result.Items,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to list products",
        message: error.message,
      }),
    };
  }
};
```

### Step 4: Deploy Lambda Functions to AWS

#### 4.1 Package Functions

```bash
# Package each function
zip create.zip create-product.js node_modules/
zip read.zip get-product.js node_modules/
zip list.zip list-products.js node_modules/
zip update.zip update-product.js node_modules/
zip delete.zip delete-product.js node_modules/
```

#### 4.2 Create Lambda Functions

Replace `ROLE_ARN` with your Lambda role ARN from Step 2:

```bash
ROLE_ARN="arn:aws:iam::123456789:role/lambda-dynamodb-role"

# Create Product
aws lambda create-function \
  --function-name product-create \
  --runtime nodejs18.x \
  --role $ROLE_ARN \
  --handler create-product.handler \
  --zip-file fileb://create.zip \
  --region us-east-1

# Get Product
aws lambda create-function \
  --function-name product-get \
  --runtime nodejs18.x \
  --role $ROLE_ARN \
  --handler get-product.handler \
  --zip-file fileb://read.zip \
  --region us-east-1

# List Products
aws lambda create-function \
  --function-name product-list \
  --runtime nodejs18.x \
  --role $ROLE_ARN \
  --handler list-products.handler \
  --zip-file fileb://list.zip \
  --region us-east-1

# Update Product
aws lambda create-function \
  --function-name product-update \
  --runtime nodejs18.x \
  --role $ROLE_ARN \
  --handler update-product.handler \
  --zip-file fileb://update.zip \
  --region us-east-1

# Delete Product
aws lambda create-function \
  --function-name product-delete \
  --runtime nodejs18.x \
  --role $ROLE_ARN \
  --handler delete-product.handler \
  --zip-file fileb://delete.zip \
  --region us-east-1
```

### Step 5: Create API Gateway

#### 5.1 Create REST API

1. Go to **AWS Console** → Search "API Gateway"
2. Click **"Create API"**
3. Choose **"REST API"** (not HTTP API)
4. Click **"Create API"**
5. Name: `product-api`
6. Click **"Create API"**

#### 5.2 Create Resources and Methods

**Create /products resource**:

1. Click on "Resources" (left sidebar)
2. Right-click on "/" → **"Create Resource"**
3. Resource name: `products`
4. Click **"Create Resource"**

**Create GET /products** (List all):

1. Select `/products` resource
2. Click **"Create Method"** → **"GET"**
3. Fill in:
   - Integration type: **Lambda Function**
   - Lambda Function: **product-list**
   - **Check** "Use Lambda Proxy Integration"
4. Click **"Create"**
5. Click **"Deploy API"** → Stage: `dev`

**Create POST /products** (Create):

1. Select `/products` resource
2. Click **"Create Method"** → **"POST"**
3. Fill in:
   - Integration type: **Lambda Function**
   - Lambda Function: **product-create**
   - **Check** "Use Lambda Proxy Integration"
4. Click **"Create"**
5. Click **"Deploy API"**

**Create /products/{id} resource**:

1. Right-click on `/products` → **"Create Resource"**
2. Resource name: `{id}`
3. Click **"Create Resource"**

**Create GET /products/{id}** (Get one):

1. Select `/products/{id}` resource
2. Click **"Create Method"** → **"GET"**
3. Lambda Function: **product-get**
4. Check "Use Lambda Proxy Integration"
5. Click **"Create"**
6. Click **"Deploy API"**

**Create PUT /products/{id}** (Update):

1. Select `/products/{id}` resource
2. Click **"Create Method"** → **"PUT"**
3. Lambda Function: **product-update**
4. Check "Use Lambda Proxy Integration"
5. Click **"Create"**
6. Click **"Deploy API"**

**Create DELETE /products/{id}** (Delete):

1. Select `/products/{id}` resource
2. Click **"Create Method"** → **"DELETE"**
3. Lambda Function: **product-delete**
4. Check "Use Lambda Proxy Integration"
5. Click **"Create"**
6. Click **"Deploy API"**

#### 5.3 Get API Endpoint

1. Click on "Stages" → `dev`
2. Copy the **Invoke URL** (looks like: `https://abc123.execute-api.us-east-1.amazonaws.com/dev`)

### Step 6: Test Your API

#### 6.1 Create Product (POST)

```bash
API_URL="https://abc123.execute-api.us-east-1.amazonaws.com/dev"

curl -X POST "$API_URL/products" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod-001",
    "name": "Laptop",
    "price": 999.99,
    "description": "High-performance laptop"
  }'
```

Response:

```json
{
  "message": "Product created successfully",
  "product": {
    "productId": "prod-001",
    "name": "Laptop",
    "price": 999.99,
    "description": "High-performance laptop",
    "createdAt": "2026-03-09T10:30:00.000Z",
    "updatedAt": "2026-03-09T10:30:00.000Z"
  }
}
```

#### 6.2 List All Products (GET)

```bash
curl "$API_URL/products"
```

Response:

```json
{
  "count": 1,
  "products": [
    {
      "productId": "prod-001",
      "name": "Laptop",
      "price": 999.99,
      "description": "High-performance laptop",
      "createdAt": "2026-03-09T10:30:00.000Z",
      "updatedAt": "2026-03-09T10:30:00.000Z"
    }
  ]
}
```

#### 6.3 Get Single Product (GET)

```bash
curl "$API_URL/products/prod-001"
```

#### 6.4 Update Product (PUT)

```bash
curl -X PUT "$API_URL/products/prod-001" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gaming Laptop",
    "price": 1299.99
  }'
```

#### 6.5 Delete Product (DELETE)

```bash
curl -X DELETE "$API_URL/products/prod-001"
```

### Step 7: Monitor and Debug

#### 7.1 View CloudWatch Logs

```bash
# View logs for create function
aws logs tail /aws/lambda/product-create --follow
```

#### 7.2 Check Function Metrics

1. Go to Lambda console
2. Click on a function name
3. Click **"Monitoring"** tab
4. See duration, errors, throttles

#### 7.3 Test in Lambda Console

1. Go to **Lambda** → `product-create`
2. Click **"Test"**
3. Create Event:

```json
{
  "body": "{\"productId\":\"prod-002\",\"name\":\"Mouse\",\"price\":29.99}"
}
```

4. Click **"Test"**

### Troubleshooting

| Problem            | Solution                                                         |
| ------------------ | ---------------------------------------------------------------- |
| 403 Access Denied  | Check Lambda role has DynamoDB permissions                       |
| 500 Internal Error | Check CloudWatch logs: `aws logs tail /aws/lambda/FUNCTION_NAME` |
| 404 Not Found      | Check API Gateway resource paths and method names                |
| Product not found  | Verify productId matches exactly (case-sensitive)                |
| Timeout error      | Increase Lambda timeout in Configuration                         |

### Summary

You now have:
✅ DynamoDB table storing products  
✅ 5 Lambda functions handling CRUD operations  
✅ API Gateway exposing REST endpoints  
✅ Complete working backend API  
✅ Monitoring via CloudWatch

### Next Steps

1. **Add Authentication**: Use API Gateway authorizers
2. **Add Validation**: Implement request schemas
3. **Scale**: Use Lambda layers, optimize query patterns
4. **Deploy**: Use AWS SAM or CloudFormation for IaC
5. **Monitor**: Set up alarms and dashboards

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

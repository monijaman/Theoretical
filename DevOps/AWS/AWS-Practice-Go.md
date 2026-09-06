# AWS Practice Guide with Go

Complete hands-on guide to master AWS services using Go programming language.

## Table of Contents

1. [Setup & Environment](#setup--environment)
2. [AWS SDK for Go](#aws-sdk-for-go)
3. [Working with Lambda in Go](#working-with-lambda-in-go)
4. [DynamoDB Operations](#dynamodb-operations)
5. [API Gateway Integration](#api-gateway-integration)
6. [S3 File Operations](#s3-file-operations)
7. [SQS & SNS](#sqs--sns)
8. [Container Applications](#container-applications)
9. [Practice Projects](#practice-projects)
10. [Resources](#resources)

---

## Setup & Environment

### Prerequisites

- Go 1.19 or higher
- AWS Account with appropriate permissions
- AWS CLI configured with credentials
- Docker (for container exercises)

### Install Go

```bash
# Windows
choco install golang

# macOS
brew install go

# Linux (Ubuntu/Debian)
sudo apt-get install golang-go
```

### Configure AWS Credentials

```bash
# Configure with AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-east-1"
```

### Create a Go Project

```bash
mkdir my-aws-project
cd my-aws-project
go mod init github.com/yourusername/my-aws-project
```

---

## AWS SDK for Go

### Install AWS SDK v2

```bash
go get github.com/aws/aws-sdk-go-v2
go get github.com/aws/aws-sdk-go-v2/config
go get github.com/aws/aws-sdk-go-v2/service/s3
go get github.com/aws/aws-sdk-go-v2/service/dynamodb
go get github.com/aws/aws-sdk-go-v2/service/lambda
```

### Basic Configuration

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/aws/aws-sdk-go-v2/config"
)

func main() {
    // Load default configuration
    cfg, err := config.LoadDefaultConfig(context.TODO())
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println("AWS Region:", cfg.Region)
}
```

### Custom Configuration

```go
package main

import (
    "context"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-smithy-go/logging"
)

func main() {
    cfg, err := config.LoadDefaultConfig(
        context.TODO(),
        config.WithRegion("us-west-2"),
        config.WithClientLogMode(aws.LogRequestWithBody | aws.LogResponseWithBody),
    )
    if err != nil {
        panic(err)
    }

    // Use cfg with AWS service clients
}
```

---

## Working with Lambda in Go

### Create a Simple Lambda Function

#### Step 1: Create Go Lambda Project

```bash
mkdir lambda-project
cd lambda-project
go mod init lambda-function
```

#### Step 2: Create Handler

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"

    "github.com/aws/aws-lambda-go/events"
    "github.com/aws/aws-lambda-go/lambda"
)

type Request struct {
    Name string `json:"name"`
}

type Response struct {
    Message string `json:"message"`
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    var req Request

    // Parse request body
    err := json.Unmarshal([]byte(request.Body), &req)
    if err != nil {
        return events.APIGatewayProxyResponse{
            StatusCode: 400,
            Body:       "Invalid request body",
        }, nil
    }

    // Process
    resp := Response{
        Message: fmt.Sprintf("Hello, %s!", req.Name),
    }

    // Marshal response
    body, _ := json.Marshal(resp)

    return events.APIGatewayProxyResponse{
        StatusCode: 200,
        Headers: map[string]string{
            "Content-Type": "application/json",
        },
        Body: string(body),
    }, nil
}

func main() {
    lambda.Start(handler)
}
```

#### Step 3: Build for Lambda

```bash
#!/bin/bash
GOOS=linux GOARCH=amd64 go build -o bootstrap main.go
zip function.zip bootstrap
```

#### Step 4: Deploy

```bash
aws lambda create-function \
    --function-name go-hello \
    --runtime provided.al2 \
    --role arn:aws:iam::ACCOUNT_ID:role/lambda-role \
    --handler bootstrap \
    --zip-file fileb://function.zip
```

### Advanced Lambda with DynamoDB

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"

    "github.com/aws/aws-lambda-go/events"
    "github.com/aws/aws-lambda-go/lambda"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type User struct {
    ID    string `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

var ddb *dynamodb.Client

func init() {
    cfg, err := config.LoadDefaultConfig(context.Background())
    if err != nil {
        log.Fatal(err)
    }
    ddb = dynamodb.NewFromConfig(cfg)
}

func handleCreateUser(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    // Parse request
    var user User
    if err := json.Unmarshal([]byte(event.Body), &user); err != nil {
        return errorResponse(400, "Invalid request")
    }

    // Put item in DynamoDB
    _, err := ddb.PutItem(ctx, &dynamodb.PutItemInput{
        TableName: stringPtr("Users"),
        Item: map[string]types.AttributeValue{
            "id":    &types.AttributeValueMemberS{Value: user.ID},
            "name":  &types.AttributeValueMemberS{Value: user.Name},
            "email": &types.AttributeValueMemberS{Value: user.Email},
        },
    })

    if err != nil {
        log.Printf("Error putting item: %v", err)
        return errorResponse(500, "Failed to create user")
    }

    return events.APIGatewayProxyResponse{
        StatusCode: 201,
        Body:       `{"message":"User created"}`,
    }, nil
}

func handleGetUser(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    userID := event.PathParameters["id"]

    // Get item from DynamoDB
    result, err := ddb.GetItem(ctx, &dynamodb.GetItemInput{
        TableName: stringPtr("Users"),
        Key: map[string]types.AttributeValue{
            "id": &types.AttributeValueMemberS{Value: userID},
        },
    })

    if err != nil {
        return errorResponse(500, "Database error")
    }

    if result.Item == nil {
        return errorResponse(404, "User not found")
    }

    // Unmarshal result
    var user User
    err = parse(result.Item, &user)
    if err != nil {
        return errorResponse(500, "Parse error")
    }

    body, _ := json.Marshal(user)
    return events.APIGatewayProxyResponse{
        StatusCode: 200,
        Body:       string(body),
    }, nil
}

func router(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    switch event.HTTPMethod {
    case "POST":
        return handleCreateUser(ctx, event)
    case "GET":
        return handleGetUser(ctx, event)
    default:
        return errorResponse(405, "Method not allowed")
    }
}

func main() {
    lambda.Start(router)
}

func stringPtr(s string) *string { return &s }

func errorResponse(code int, msg string) (events.APIGatewayProxyResponse, error) {
    return events.APIGatewayProxyResponse{
        StatusCode: code,
        Body:       fmt.Sprintf(`{"error":"%s"}`, msg),
    }, nil
}
```

---

## DynamoDB Operations

### Connection Setup

```go
package main

import (
    "context"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb"
    "github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
)

func setupDynamoDB() *dynamodb.Client {
    cfg, _ := config.LoadDefaultConfig(context.Background())
    return dynamodb.NewFromConfig(cfg)
}
```

### Create Table

```go
package main

import (
    "context"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

func createTable(client *dynamodb.Client) error {
    input := &dynamodb.CreateTableInput{
        TableName: stringPtr("Products"),
        KeySchema: []types.KeySchemaElement{
            {
                AttributeName: stringPtr("productId"),
                KeyType:       types.KeyTypeHash,
            },
        },
        AttributeDefinitions: []types.AttributeDefinition{
            {
                AttributeName: stringPtr("productId"),
                AttributeType: types.ScalarAttributeTypeS,
            },
        },
        BillingMode: types.BillingModePayPerRequest,
    }

    _, err := client.CreateTable(context.Background(), input)
    return err
}
```

### Put Item

```go
type Product struct {
    ProductID string  `dynamodbav:"productId"`
    Name      string  `dynamodbav:"name"`
    Price     float64 `dynamodbav:"price"`
}

func putItem(client *dynamodb.Client, product Product) error {
    av, err := attributevalue.MarshalMap(product)
    if err != nil {
        return err
    }

    _, err = client.PutItem(context.Background(), &dynamodb.PutItemInput{
        TableName: stringPtr("Products"),
        Item:      av,
    })
    return err
}
```

### Get Item

```go
func getItem(client *dynamodb.Client, productID string) (*Product, error) {
    result, err := client.GetItem(context.Background(), &dynamodb.GetItemInput{
        TableName: stringPtr("Products"),
        Key: map[string]types.AttributeValue{
            "productId": &types.AttributeValueMemberS{Value: productID},
        },
    })

    if err != nil {
        return nil, err
    }

    var product Product
    err = attributevalue.UnmarshalMap(result.Item, &product)
    return &product, err
}
```

### Query Items

```go
func queryProducts(client *dynamodb.Client, productID string) ([]Product, error) {
    result, err := client.Query(context.Background(), &dynamodb.QueryInput{
        TableName:              stringPtr("Products"),
        KeyConditionExpression: stringPtr("productId = :id"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":id": &types.AttributeValueMemberS{Value: productID},
        },
    })

    if err != nil {
        return nil, err
    }

    var products []Product
    err = attributevalue.UnmarshalListOfMaps(result.Items, &products)
    return products, err
}
```

### Scan Table

```go
func scanTable(client *dynamodb.Client) ([]Product, error) {
    result, err := client.Scan(context.Background(), &dynamodb.ScanInput{
        TableName: stringPtr("Products"),
    })

    if err != nil {
        return nil, err
    }

    var products []Product
    err = attributevalue.UnmarshalListOfMaps(result.Items, &products)
    return products, err
}
```

### Update Item

```go
func updateItem(client *dynamodb.Client, productID string, price float64) error {
    _, err := client.UpdateItem(context.Background(), &dynamodb.UpdateItemInput{
        TableName: stringPtr("Products"),
        Key: map[string]types.AttributeValue{
            "productId": &types.AttributeValueMemberS{Value: productID},
        },
        UpdateExpression: stringPtr("SET #p = :price"),
        ExpressionAttributeNames: map[string]string{
            "#p": "price",
        },
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":price": &types.AttributeValueMemberN{Value: fmt.Sprint(price)},
        },
    })
    return err
}
```

### Delete Item

```go
func deleteItem(client *dynamodb.Client, productID string) error {
    _, err := client.DeleteItem(context.Background(), &dynamodb.DeleteItemInput{
        TableName: stringPtr("Products"),
        Key: map[string]types.AttributeValue{
            "productId": &types.AttributeValueMemberS{Value: productID},
        },
    })
    return err
}
```

### Batch Operations

```go
func batchWriteItems(client *dynamodb.Client, products []Product) error {
    var requests []types.WriteRequest

    for _, p := range products {
        av, _ := attributevalue.MarshalMap(p)
        requests = append(requests, types.WriteRequest{
            PutRequest: &types.PutRequest{Item: av},
        })
    }

    _, err := client.BatchWriteItem(context.Background(), &dynamodb.BatchWriteItemInput{
        RequestItems: map[string][]types.WriteRequest{
            "Products": requests,
        },
    })
    return err
}
```

---

## API Gateway Integration

### Local Testing with SAM

```bash
# Install AWS SAM CLI
pip install aws-sam-cli

# Create SAM project
sam init --runtime go1.x

# Build
sam build

# Local testing
sam local start-api
```

### SAM Template Example

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Timeout: 30
    Runtime: go1.x
    Tracing: Active
    Environment:
      Variables:
        TABLE_NAME: !Ref ProductsTable

Resources:
  ApiGateway:
    Type: AWS::Serverless::Api
    Properties:
      StageName: dev

  GetProductFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: get_product/
      Handler: bootstrap
      Events:
        GetApi:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /products/{id}
            Method: get

  ProductsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: Products
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: productId
          AttributeType: S
      KeySchema:
        - AttributeName: productId
          KeyType: HASH

Outputs:
  ApiEndpoint:
    Description: API Gateway endpoint
    Value: !Sub "https://${ApiGateway}.execute-api.${AWS::Region}.amazonaws.com/dev"
```

---

## S3 File Operations

### Setup

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

func setupS3() *s3.Client {
    cfg, _ := config.LoadDefaultConfig(context.Background())
    return s3.NewFromConfig(cfg)
}
```

### Upload File

```go
func uploadFile(client *s3.Client, bucket, key string, data []byte) error {
    _, err := client.PutObject(context.Background(), &s3.PutObjectInput{
        Bucket:      stringPtr(bucket),
        Key:         stringPtr(key),
        Body:        bytes.NewReader(data),
        ContentType: stringPtr("text/plain"),
    })
    return err
}
```

### Download File

```go
import "io"

func downloadFile(client *s3.Client, bucket, key string) ([]byte, error) {
    result, err := client.GetObject(context.Background(), &s3.GetObjectInput{
        Bucket: stringPtr(bucket),
        Key:    stringPtr(key),
    })
    if err != nil {
        return nil, err
    }
    defer result.Body.Close()

    return io.ReadAll(result.Body)
}
```

### List Objects

```go
func listObjects(client *s3.Client, bucket string) ([]string, error) {
    result, err := client.ListObjectsV2(context.Background(), &s3.ListObjectsV2Input{
        Bucket: stringPtr(bucket),
    })
    if err != nil {
        return nil, err
    }

    var keys []string
    for _, obj := range result.Contents {
        keys = append(keys, *obj.Key)
    }
    return keys, nil
}
```

### Delete Object

```go
func deleteObject(client *s3.Client, bucket, key string) error {
    _, err := client.DeleteObject(context.Background(), &s3.DeleteObjectInput{
        Bucket: stringPtr(bucket),
        Key:    stringPtr(key),
    })
    return err
}
```

---

## SQS & SNS

### SQS - Send Message

```go
import "github.com/aws/aws-sdk-go-v2/service/sqs"

func sendSQSMessage(client *sqs.Client, queueURL, message string) error {
    _, err := client.SendMessage(context.Background(), &sqs.SendMessageInput{
        QueueUrl:    stringPtr(queueURL),
        MessageBody: stringPtr(message),
    })
    return err
}
```

### SQS - Receive Messages

```go
func receiveSQSMessages(client *sqs.Client, queueURL string) ([]string, error) {
    result, err := client.ReceiveMessage(context.Background(), &sqs.ReceiveMessageInput{
        QueueUrl:            stringPtr(queueURL),
        MaxNumberOfMessages: 10,
        WaitTimeSeconds:     20,
    })
    if err != nil {
        return nil, err
    }

    var messages []string
    for _, msg := range result.Messages {
        messages = append(messages, *msg.Body)
    }
    return messages, nil
}
```

### SNS - Publish Message

```go
import "github.com/aws/aws-sdk-go-v2/service/sns"

func publishSNS(client *sns.Client, topicARN, message string) error {
    _, err := client.Publish(context.Background(), &sns.PublishInput{
        TopicArn: stringPtr(topicARN),
        Message:  stringPtr(message),
    })
    return err
}
```

---

## Container Applications

### Dockerfile for Go Application

```dockerfile
# Build stage
FROM golang:1.19-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o app .

# Final stage
FROM alpine:3.17

WORKDIR /root/

COPY --from=builder /app/app .

EXPOSE 8080

CMD ["./app"]
```

### Build and Push to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name my-go-app --region us-east-1

# Build Docker image
docker build -t my-go-app:latest .

# Tag for ECR
docker tag my-go-app:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/my-go-app:latest

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Push image
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/my-go-app:latest
```

### ECS Task Definition

```json
{
  "family": "go-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "go-api",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/my-go-app:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "hostPort": 8080,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/go-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

---

## Practice Projects

### Project 1: Todo API

**Objective**: Create a REST API for managing todos using API Gateway, Lambda, and DynamoDB.

**Requirements**:

- Create todo
- Get all todos
- Update todo
- Delete todo
- Filter by status

**Steps**:

1. Create Go Lambda functions for each operation
2. Set up DynamoDB table with GSI for status filtering
3. Configure API Gateway routes
4. Test with curl or Postman
5. Deploy with SAM

### Project 2: Image Processing Pipeline

**Objective**: Build an event-driven pipeline that processes images uploaded to S3.

**Requirements**:

- Upload image to S3
- Lambda triggered on upload
- Process image (resize, convert format)
- Store metadata in DynamoDB
- Save processed image to another S3 bucket

**Key AWS Services**:

- S3
- Lambda
- DynamoDB
- SNS (for notifications)

### Project 3: Real-Time Data Aggregation

**Objective**: Aggregate data from multiple sources in real-time.

**Requirements**:

- Accept data via API Gateway
- Store in DynamoDB
- Query and aggregate with filters
- Export to CSV via Lambda
- Deploy containers on ECS

---

## Local Development & Testing

### Testing DynamoDB Locally

```bash
# Install DynamoDB Local
docker run -d -p 8000:8000 amazon/dynamodb-local

# Configure Go client for local DynamoDB
cfg, _ := config.LoadDefaultConfig(context.Background(),
    config.WithEndpointResolver(aws.EndpointResolverFunc(func(service, region string) (aws.Endpoint, error) {
        if service == dynamodb.ServiceID {
            return aws.Endpoint{
                URL: "http://localhost:8000",
            }, nil
        }
        return aws.Endpoint{}, &aws.EndpointNotFoundError{}
    })),
)
```

### Testing Lambda Locally

```bash
# Using SAM
sam local start-api

# Using AWS Lambda Runtime Interface Emulator
docker_run --rm -p 9000:8080 \
    -v "$PWD":/var/task:ro,delegated \
    golang:1.19 \
    /var/lang/bin/python3.9 -m awslambdaric main.handler

# Test
curl -X POST "http://localhost:9000/2015-03-31/functions/function/invocations" \
    -d '{"body":"test"}'
```

### Debug Lambda with Delve

```bash
# build
go build -gcflags="all=-N -l" -o app main.go

# Run with delve
dlv exec ./app --headless --listen=:2345 --api-version=2 --

# Connect from IDE
```

---

## Resources

### Official Documentation

- [AWS SDK for Go v2](https://aws.github.io/aws-sdk-go-v2/docs/getting-started/)
- [Lambda Go Runtime](https://github.com/aws/aws-lambda-go)
- [AWS SAM Developer Guide](https://docs.aws.amazon.com/serverless-application-model/)

### Useful Links

- [AWS Go Code Examples](https://github.com/awsdocs/aws-doc-sdk-examples/tree/main/go)
- [Awesome AWS Go](https://github.com/aws/awesome-aws-go)

### Recommended Tools

- [Localstack](https://localstack.cloud/) - Local AWS stack
- [AWS SAM CLI](https://aws.amazon.com/serverless/sam/)
- [Terraform](https://www.terraform.io/) - IaC tool
- [Postman](https://www.postman.com/) - API testing

---

## Tips for Success

1. **Start Small**: Begin with simple Lambda functions before complex architectures
2. **Use Local Testing**: Test locally with SAM or LocalStack before deploying
3. **Monitor Costs**: Use CloudWatch to monitor AWS costs during learning
4. **Read AWS Docs**: Official AWS documentation is comprehensive and helpful
5. **Join Communities**: Participate in AWS forums and Go communities
6. **Build Projects**: Apply knowledge through practical projects
7. **Version Control**: Use Git to track your learning progress
8. **Practice IAM**: Understand AWS IAM for proper security practices

---

**Next Steps**: Start with Project 1 (Todo API) and gradually move to more complex projects. Regular practice with Go will make you comfortable with AWS services.

# CI/CD Pipeline and Deployment with AWS

This guide provides an overview of setting up a CI/CD pipeline using AWS services like **CodeCommit**, **CodeBuild**, **CodePipeline**, and **CodeDeploy** to automate software development and deployment processes.

## Overview

**CI/CD Pipelines** (Continuous Integration and Continuous Deployment) automate stages from code integration to deployment, ensuring efficient, continuous delivery of updates. Using AWS services, you can build, test, and deploy applications with minimal manual intervention.

## Components

1. **CodeCommit**: A version-controlled repository for your code.
2. **CodeBuild**: Builds and tests your code.
3. **CodePipeline**: Manages flow across build, test, and deployment stages.
4. **CodeDeploy**: Automates deployment to AWS resources, including EC2, Lambda, and ECS.

## Workflow

1. **Commit and Push**: Developers push code to the CodeCommit repository.
2. **Build**: CodePipeline triggers CodeBuild to compile and test the code.
3. **Deployment**: CodeDeploy deploys the code to target environments (e.g., EC2 or Lambda).
4. **Feedback and Monitoring**: Logs and metrics are generated in AWS CloudWatch for monitoring and troubleshooting.

## Benefits of AWS CI/CD Pipelines

- **Scalability**: Supports deployment across various AWS environments.
- **Automation**: Reduces manual errors and accelerates release cycles.
- **Integration**: AWS offers seamless integration with other cloud-native and third-party tools.

---

## 🚀 **Detailed Setup Instructions**

### **Option 1: AWS-Native CI/CD Pipeline (CodeCommit)**

#### **Step 1: Set Up AWS CodeCommit Repository**

1. **Create a CodeCommit Repository**
   ```bash
   # Using AWS CLI
   aws codecommit create-repository --repository-name my-app-repo --repository-description "My application repository"
   ```

2. **Configure Git Credentials**
   ```bash
   # Configure AWS CLI if not already done
   aws configure
   
   # Set up Git credentials helper
   git config --global credential.helper '!aws codecommit credential-helper $@'
   git config --global credential.UseHttpPath true
   ```

3. **Clone and Push Code**
   ```bash
   # Clone the repository
   git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-app-repo
   
   # Add your application code
   cd my-app-repo
   # Copy your application files here
   
   # Commit and push
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

#### **Step 2: Configure AWS CodeBuild**

1. **Create `buildspec.yml` in your repository root**
   ```yaml
   version: 0.2
   
   phases:
     install:
       runtime-versions:
         nodejs: 18  # or python: 3.9, java: corretto11, etc.
       commands:
         - echo Install phase started on `date`
         - npm install  # or pip install -r requirements.txt
     
     pre_build:
       commands:
         - echo Pre-build phase started on `date`
         - npm run test  # Run your tests
     
     build:
       commands:
         - echo Build phase started on `date`
         - npm run build  # Build your application
     
     post_build:
       commands:
         - echo Post-build phase completed on `date`
   
   artifacts:
     files:
       - '**/*'
     exclude-paths:
       - node_modules/**/*
       - .git/**/*
   
   cache:
     paths:
       - 'node_modules/**/*'
   ```

2. **Create CodeBuild Project**
   ```bash
   # Create build project JSON configuration
   cat > build-project.json << EOF
   {
     "name": "my-app-build",
     "description": "Build project for my application",
     "source": {
       "type": "CODECOMMIT",
       "location": "https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-app-repo"
     },
     "artifacts": {
       "type": "S3",
       "location": "my-build-artifacts-bucket"
     },
     "environment": {
       "type": "LINUX_CONTAINER",
       "image": "aws/codebuild/amazonlinux2-x86_64-standard:3.0",
       "computeType": "BUILD_GENERAL1_SMALL"
     },
     "serviceRole": "arn:aws:iam::ACCOUNT-ID:role/service-role/codebuild-service-role"
   }
   EOF
   
   # Create the build project
   aws codebuild create-project --cli-input-json file://build-project.json
   ```

#### **Step 3: Set Up IAM Roles**

1. **CodeBuild Service Role**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "logs:CreateLogGroup",
           "logs:CreateLogStream",
           "logs:PutLogEvents",
           "codecommit:GitPull",
           "s3:GetObject",
           "s3:PutObject"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

2. **CodePipeline Service Role**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "codecommit:GetBranch",
           "codecommit:GetCommit",
           "codebuild:BatchGetBuilds",
           "codebuild:StartBuild",
           "codedeploy:CreateDeployment",
           "codedeploy:GetDeployment",
           "s3:GetObject",
           "s3:PutObject"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

#### **Step 4: Create CodePipeline**

1. **Pipeline Configuration**
   ```bash
   cat > pipeline.json << EOF
   {
     "pipeline": {
       "name": "my-app-pipeline",
       "roleArn": "arn:aws:iam::ACCOUNT-ID:role/service-role/codepipeline-service-role",
       "artifactStore": {
         "type": "S3",
         "location": "my-pipeline-artifacts-bucket"
       },
       "stages": [
         {
           "name": "Source",
           "actions": [
             {
               "name": "Source",
               "actionTypeId": {
                 "category": "Source",
                 "owner": "AWS",
                 "provider": "CodeCommit",
                 "version": "1"
               },
               "configuration": {
                 "RepositoryName": "my-app-repo",
                 "BranchName": "main"
               },
               "outputArtifacts": [
                 {
                   "name": "SourceOutput"
                 }
               ]
             }
           ]
         },
         {
           "name": "Build",
           "actions": [
             {
               "name": "Build",
               "actionTypeId": {
                 "category": "Build",
                 "owner": "AWS",
                 "provider": "CodeBuild",
                 "version": "1"
               },
               "configuration": {
                 "ProjectName": "my-app-build"
               },
               "inputArtifacts": [
                 {
                   "name": "SourceOutput"
                 }
               ],
               "outputArtifacts": [
                 {
                   "name": "BuildOutput"
                 }
               ]
             }
           ]
         },
         {
           "name": "Deploy",
           "actions": [
             {
               "name": "Deploy",
               "actionTypeId": {
                 "category": "Deploy",
                 "owner": "AWS",
                 "provider": "CodeDeploy",
                 "version": "1"
               },
               "configuration": {
                 "ApplicationName": "my-app",
                 "DeploymentGroupName": "my-app-deployment-group"
               },
               "inputArtifacts": [
                 {
                   "name": "BuildOutput"
                 }
               ]
             }
           ]
         }
       ]
     }
   }
   EOF
   
   # Create the pipeline
   aws codepipeline create-pipeline --cli-input-json file://pipeline.json
   ```

---

### **Option 2: GitHub Integration with AWS CI/CD**

#### **Step 1: Set Up GitHub Repository**

1. **Create GitHub Repository**
   ```bash
   # Create repository on GitHub (via web interface or GitHub CLI)
   gh repo create my-app --public
   
   # Clone and add code
   git clone https://github.com/username/my-app.git
   cd my-app
   # Add your application files
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

#### **Step 2: Configure GitHub Actions for AWS**

1. **Create `.github/workflows/aws-deploy.yml`**
   ```yaml
   name: Deploy to AWS
   
   on:
     push:
       branches: [ main ]
     pull_request:
       branches: [ main ]
   
   env:
     AWS_REGION: us-east-1
     ECR_REPOSITORY: my-app
     ECS_SERVICE: my-app-service
     ECS_CLUSTER: my-app-cluster
   
   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       
       steps:
       - name: Checkout code
         uses: actions/checkout@v3
       
       - name: Configure AWS credentials
         uses: aws-actions/configure-aws-credentials@v2
         with:
           aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
           aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
           aws-region: ${{ env.AWS_REGION }}
       
       - name: Setup Node.js
         uses: actions/setup-node@v3
         with:
           node-version: '18'
           cache: 'npm'
       
       - name: Install dependencies
         run: npm ci
       
       - name: Run tests
         run: npm test
       
       - name: Build application
         run: npm run build
       
       - name: Login to Amazon ECR
         id: login-ecr
         uses: aws-actions/amazon-ecr-login@v1
       
       - name: Build, tag, and push image to Amazon ECR
         id: build-image
         env:
           ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
           IMAGE_TAG: ${{ github.sha }}
         run: |
           docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
           docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
           echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT
       
       - name: Deploy to Amazon ECS
         uses: aws-actions/amazon-ecs-deploy-task-definition@v1
         with:
           task-definition: task-definition.json
           service: ${{ env.ECS_SERVICE }}
           cluster: ${{ env.ECS_CLUSTER }}
           wait-for-service-stability: true
   ```

2. **Set up GitHub Secrets**
   ```bash
   # Add these secrets in your GitHub repository settings:
   # AWS_ACCESS_KEY_ID
   # AWS_SECRET_ACCESS_KEY
   ```

#### **Step 3: GitHub to CodePipeline Integration**

1. **Create CodePipeline with GitHub Source**
   ```json
   {
     "pipeline": {
       "name": "github-to-aws-pipeline",
       "roleArn": "arn:aws:iam::ACCOUNT-ID:role/service-role/codepipeline-service-role",
       "artifactStore": {
         "type": "S3",
         "location": "my-pipeline-artifacts-bucket"
       },
       "stages": [
         {
           "name": "Source",
           "actions": [
             {
               "name": "Source",
               "actionTypeId": {
                 "category": "Source",
                 "owner": "ThirdParty",
                 "provider": "GitHub",
                 "version": "1"
               },
               "configuration": {
                 "Owner": "your-github-username",
                 "Repo": "my-app",
                 "Branch": "main",
                 "OAuthToken": "{{resolve:secretsmanager:github-token:SecretString:token}}"
               },
               "outputArtifacts": [
                 {
                   "name": "SourceOutput"
                 }
               ]
             }
           ]
         }
       ]
     }
   }
   ```

---

## 🔧 **Advanced Configurations**

### **Multi-Environment Deployment**

1. **Environment-specific buildspec files**
   ```yaml
   # buildspec-dev.yml
   version: 0.2
   phases:
     install:
       runtime-versions:
         nodejs: 18
     build:
       commands:
         - npm install
         - npm run build:dev
         - aws s3 sync ./dist s3://my-app-dev-bucket
   
   # buildspec-prod.yml
   version: 0.2
   phases:
     install:
       runtime-versions:
         nodejs: 18
     build:
       commands:
         - npm install
         - npm run build:prod
         - aws s3 sync ./dist s3://my-app-prod-bucket
   ```

### **Blue-Green Deployment with CodeDeploy**

1. **Create `appspec.yml`**
   ```yaml
   version: 0.0
   os: linux
   files:
     - source: /
       destination: /var/www/html
   hooks:
     BeforeInstall:
       - location: scripts/install_dependencies.sh
         timeout: 300
         runas: root
     ApplicationStart:
       - location: scripts/start_server.sh
         timeout: 300
         runas: root
     ApplicationStop:
       - location: scripts/stop_server.sh
         timeout: 300
         runas: root
   ```

### **Lambda Deployment**

1. **SAM Template (`template.yaml`)**
   ```yaml
   AWSTemplateFormatVersion: '2010-09-09'
   Transform: AWS::Serverless-2016-10-31
   
   Resources:
     MyFunction:
       Type: AWS::Serverless::Function
       Properties:
         CodeUri: src/
         Handler: app.lambdaHandler
         Runtime: nodejs18.x
         Events:
           HelloWorld:
             Type: Api
             Properties:
               Path: /hello
               Method: get
   ```

2. **Build and Deploy Commands**
   ```bash
   # In buildspec.yml
   phases:
     build:
       commands:
         - sam build
         - sam deploy --no-confirm-changeset --no-fail-on-empty-changeset
   ```

---

## 📊 **Monitoring and Troubleshooting**

### **CloudWatch Integration**

1. **Pipeline Monitoring**
   ```bash
   # Create CloudWatch dashboard
   aws cloudwatch put-dashboard --dashboard-name "CI-CD-Pipeline" --dashboard-body file://dashboard.json
   ```

2. **Custom Metrics**
   ```bash
   # Add custom metrics in your application
   aws cloudwatch put-metric-data --namespace "MyApp/CI-CD" --metric-data MetricName=BuildSuccess,Value=1,Unit=Count
   ```

### **Common Issues and Solutions**

1. **Build Failures**
   ```bash
   # Check CodeBuild logs
   aws logs get-log-events --log-group-name /aws/codebuild/my-app-build --log-stream-name latest
   ```

2. **Permission Issues**
   - Ensure IAM roles have proper permissions
   - Check S3 bucket policies
   - Verify CodeCommit access

3. **Deployment Failures**
   ```bash
   # Check CodeDeploy deployment status
   aws deploy get-deployment --deployment-id d-XXXXXXXXX
   ```

---

## 🔐 **Security Best Practices**

### **IAM Policies**

1. **Principle of Least Privilege**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "s3:PutObject"
         ],
         "Resource": "arn:aws:s3:::my-specific-bucket/*"
       }
     ]
   }
   ```

### **Secrets Management**

1. **Use AWS Secrets Manager**
   ```bash
   # Store database credentials
   aws secretsmanager create-secret --name "database-credentials" --secret-string '{"username":"admin","password":"mypassword"}'
   
   # Reference in buildspec.yml
   # environment:
   #   secrets-manager:
   #     DB_PASSWORD: database-credentials:password
   ```

### **Code Scanning**

1. **Add security scanning to buildspec.yml**
   ```yaml
   phases:
     pre_build:
       commands:
         - npm audit
         - npm run security-scan
   ```


# WealthAtlas AWS Terraform Deployment

This directory contains Terraform configurations to deploy the WealthAtlas application on AWS.

## Architecture

- **Frontend**: AWS S3 + CloudFront static website hosting
- **Backend**: AWS ECS Fargate for containerized NestJS API
- **Database**: External MongoDB (MongoDB Atlas recommended)
- **Networking**: VPC with public and private subnets across multiple AZs
- **Security**: IAM roles with least privilege, security groups, and secrets management

## Prerequisites

- Terraform v1.2.0 or newer
- AWS CLI configured with appropriate permissions
- MongoDB instance with connection string

## Usage

1. Initialize Terraform:
   ```
   terraform init
   ```

2. Set your MongoDB URI:
   ```
   export TF_VAR_mongodb_uri="your_mongodb_connection_string"
   ```

3. Plan your deployment:
   ```
   terraform plan
   ```

4. Apply the configuration:
   ```
   terraform apply
   ```

5. When deployment is complete, the outputs will show:
   - Frontend URL (CloudFront distribution)
   - Backend URL (ALB endpoint)
   - ECR Repository URL for Docker images
   - S3 bucket name for frontend files

## Variables

| Name | Description | Default |
|------|-------------|---------|
| aws_region | AWS region to deploy resources | "us-east-1" |
| app_name | Application name | "wealth-atlas" |
| backend_image_tag | Backend Docker image tag | "latest" |
| mongodb_uri | MongoDB connection URI | none (required) |

## Modules

- **vpc**: Creates network infrastructure
- **frontend**: Hosts NextJS application on S3 with CloudFront
- **backend**: Runs NestJS API in ECS Fargate
- **security**: Configures security groups and permissions

## Notes

- This deployment is optimized for cost while maintaining reliability
- The MongoDB connection should be secured and not committed to version control

# WealthAtlas Deployment Guide

This document provides instructions for deploying the WealthAtlas application on AWS.

## Architecture

The architecture consists of:

1. **Frontend**: NextJS application hosted on S3 + CloudFront for global distribution
2. **Backend**: NestJS application running in AWS ECS Fargate in us-east-2 (Ohio) region for cost efficiency
3. **Database**: MongoDB Atlas free tier (see docs/MONGODB_SETUP.md for configuration details)

## Prerequisites

Before deployment, ensure you have:

1. AWS account with appropriate permissions
2. Terraform installed (version 1.2.0 or later)
3. AWS CLI configured
4. Docker installed (for local testing)
5. MongoDB instance with connection URI

## Deployment Steps

### 1. Configure Variables

Set your MongoDB URI and other variables:

```bash
# Create a terraform.tfvars file (DO NOT COMMIT THIS FILE)
cd terraform
cat > terraform.tfvars <<EOF
aws_region = "us-east-1"  # Change if needed
app_name = "wealth-atlas"
backend_image_tag = "latest"
mongodb_uri = "mongodb+srv://your-connection-string"  # Replace with your MongoDB URI
EOF
```

### 2. Using GitHub Actions (Recommended)

1. Add the following secrets to your GitHub repository:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `MONGODB_URI`

2. Push to the main branch to trigger the deployment workflow.

### 3. Manual Deployment

If you prefer to deploy manually:

```bash
# Initialize Terraform
cd terraform
terraform init

# Plan the deployment
terraform plan -var-file=terraform.tfvars

# Apply the changes
terraform apply -var-file=terraform.tfvars -auto-approve

# Get the outputs
echo "Frontend URL: $(terraform output -raw frontend_url)"
echo "Backend URL: $(terraform output -raw backend_url)"
echo "ECR Repository: $(terraform output -raw ecr_repository_url)"
```

#### Build and Push Backend Docker Image:

```bash
# Login to ECR
aws ecr get-login-password --region $(terraform output -raw aws_region) | docker login --username AWS --password-stdin $(terraform output -raw ecr_repository_url)

# Build and push Docker image
docker build -t $(terraform output -raw ecr_repository_url):latest -f Dockerfile.backend .
docker push $(terraform output -raw ecr_repository_url):latest
```

#### Deploy Frontend:

```bash
# Build the NextJS app
cd apps/frontend
echo "NEXT_PUBLIC_API_URL=$(terraform output -raw backend_url)/graphql" > .env.production
npm run build

# Deploy to S3
aws s3 sync ./out/ s3://$(terraform output -raw s3_bucket_name)/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id $(terraform output -raw frontend_distribution_id) --paths "/*"
```

## Cost Optimization

This deployment is optimized for low cost:

- **Region Choice**: Using `us-east-2` (Ohio) which is generally cheaper than us-east-1
- **Frontend**: S3 + CloudFront (pay only for actual usage)
- **Backend**: ECS Fargate with minimal compute (0.25 vCPU, 512MB RAM)
- **Database**: MongoDB Atlas free tier (provides 512MB storage at no cost)
- **CloudFront**: Using price class 100 (US, Canada, Europe) to minimize distribution costs
- **Auto Scaling**: Not enabled by default, but could be added later if needed
- **Reserved Instances**: Consider purchasing RIs for longer-term cost savings if usage becomes stable

## Monitoring and Management

- Monitor the application using CloudWatch
- View logs at `/ecs/wealth-atlas-backend` log group
- Adjust task count in ECS service for scaling

## Cleanup

To destroy all resources when no longer needed:

```bash
cd terraform
terraform destroy -var-file=terraform.tfvars -auto-approve
```

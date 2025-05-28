# WealthAtlas Deployment Guide

This document provides instructions for deploying the WealthAtlas application on AWS using a minimalist approach.

## Architecture

The architecture consists of:

1. **Single EC2 Instance**: Hosts both frontend and backend applications
2. **Frontend**: NextJS application served by Nginx
3. **Backend**: NestJS application running via PM2 process manager
4. **Database**: MongoDB Atlas (external service, see docs/MONGODB_SETUP.md for configuration details)

## Prerequisites

Before deployment, ensure you have:

1. AWS account with appropriate permissions
2. Terraform installed (version 1.2.0 or later)
3. AWS CLI configured
4. MongoDB instance with connection URI
5. SSH key pair created in AWS

## Deployment Steps

### 1. Configure Variables

Set your MongoDB URI and other variables:

```bash
# Create a terraform.tfvars file (DO NOT COMMIT THIS FILE)
cd terraform
cat > terraform.tfvars <<EOF
aws_region = "us-east-1"  # Change if needed
app_name = "wealth-atlas"
mongodb_uri = "mongodb+srv://your-connection-string"  # Replace with your MongoDB URI
jwt_secret = "your-jwt-secret-key"  # Create a secure secret
ssh_key_name = "your-aws-ssh-key-name"  # Must exist in AWS
github_repo = "username/wealth-atlas"  # Your GitHub repository name
EOF
```

### 2. Using GitHub Actions (Recommended)

1. Add the following secrets to your GitHub repository:
   - `AWS_ACCESS_KEY_ID`: Your AWS access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure secret for JWT authentication
   - `SSH_PRIVATE_KEY`: The content of your private SSH key (corresponding to the key_name in AWS)

2. Manually trigger the workflow from the GitHub Actions tab for the initial deployment
3. Subsequent pushes to the main branch will automatically update the application

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
echo "Application URL: $(terraform output -raw app_url)"
echo "SSH command: $(terraform output -raw ssh_command)"
```

#### Manual Code Deployment:

The initial server setup automatically clones your repository and sets up the application. For subsequent manual deployments:

```bash
# SSH into the server
$(terraform output -raw ssh_command)

# Once connected, update the code
cd ~/app
git pull
npm install
npm run build:backend
npm run build:frontend

# Copy frontend files to Nginx
sudo cp -r apps/frontend/out/* /usr/share/nginx/html/

# Restart backend
pm2 restart backend

# Exit the server
exit

# Build and push Docker image
docker build -t $(terraform output -raw ecr_repository_url):latest -f Dockerfile.backend .
docker push $(terraform output -raw ecr_repository_url):latest
```

#### Deploy Frontend:

```bash
# Build the NextJS app
cd apps/frontend
echo "NEXT_PUBLIC_API_URL=$(terraform output -raw backend_url)/graphql" > .env.production
pnpm run build

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

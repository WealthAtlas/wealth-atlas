# CI/CD Setup Guide for WealthAtlas

This document provides instructions for setting up Continuous Integration and Continuous Deployment (CI/CD) for the WealthAtlas application.

## Setting Up GitHub Actions

The deployment workflow is defined in `.github/workflows/deploy.yml` and will automatically deploy your application when you push to the main branch.

### Required GitHub Secrets

You need to set up the following secrets in your GitHub repository:

1. **AWS_ACCESS_KEY_ID**: Your AWS access key
2. **AWS_SECRET_ACCESS_KEY**: Your AWS secret key
3. **MONGODB_URI**: Your MongoDB connection string

To add these secrets:
1. Go to your GitHub repository
2. Click on "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add each of the secrets listed above

### AWS IAM Permissions

Your AWS access key needs the following permissions:
- S3 (for frontend hosting)
- CloudFront (for CDN)
- ECR (for backend container registry)
- ECS (for container orchestration)
- IAM (for role creation)
- VPC (for network setup)
- Secrets Manager (for storing MongoDB URI)

Create an IAM policy with these permissions and attach it to the user whose credentials you're using.

## Manual Deployment

If you prefer to deploy manually instead of using GitHub Actions:

1. **Set up environment variables**:
   ```bash
   export AWS_ACCESS_KEY_ID=your_access_key
   export AWS_SECRET_ACCESS_KEY=your_secret_key
   export AWS_REGION=us-east-2
   export MONGODB_URI=your_mongodb_connection_string
   ```

2. **Run the deployment script**:
   ```bash
   ./scripts/deploy.sh
   ```

3. **Follow the on-screen instructions** to complete the deployment.

## MongoDB Setup

Before deploying, ensure your MongoDB database is set up:

1. Create a MongoDB Atlas account (if you don't have one)
2. Create a free tier cluster
3. Set up network access (allow access from anywhere for testing or specific IP ranges for production)
4. Create a database user with read/write permissions
5. Get your connection string
6. Run the MongoDB setup script:
   ```bash
   export MONGODB_URI=your_mongodb_connection_string
   ./scripts/mongodb_setup.sh
   ```

## Deployment Workflow

The deployment process follows these steps:

1. **Infrastructure Provisioning** (Terraform):
   - VPC, subnets, security groups
   - S3 bucket and CloudFront for frontend
   - ECR repository for Docker images
   - ECS cluster for running backend

2. **Backend Deployment**:
   - Build Docker image
   - Push to ECR
   - Deploy to ECS Fargate

3. **Frontend Deployment**:
   - Build static site
   - Upload to S3
   - Invalidate CloudFront cache

4. **Database Setup**:
   - Create initial collections and indexes

## Monitoring & Troubleshooting

- Check CloudWatch logs for backend issues
- View ECS task status in the AWS console
- Monitor GitHub Actions workflows for CI/CD issues
- Use MongoDB Atlas dashboard for database monitoring

## Cleanup

To remove all AWS resources when no longer needed:

```bash
cd terraform
terraform destroy -var="mongodb_uri=$MONGODB_URI"
```

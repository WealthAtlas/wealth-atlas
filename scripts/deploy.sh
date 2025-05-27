#!/bin/bash

# Deployment script for WealthAtlas

set -e  # Exit on error

# Check if MongoDB URI is provided as argument or environment variable
if [ -n "$1" ]; then
  MONGODB_URI="$1"
elif [ -z "$MONGODB_URI" ]; then
  echo "Error: MongoDB URI not provided."
  echo "Usage: ./deploy.sh <mongodb_uri>"
  echo "  or set MONGODB_URI environment variable before running."
  exit 1
fi

# Default region if not already set
if [ -z "$AWS_REGION" ]; then
  export AWS_REGION="us-east-2"  # Ohio region (cheaper)
fi

echo "🚀 Deploying WealthAtlas to AWS ($AWS_REGION)"
echo ""

# Verify AWS credentials are set
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "⚠️  AWS credentials not found in environment."
  echo "Please run 'aws configure' or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY."
  exit 1
fi

# Create terraform.tfvars file
echo "Creating Terraform variables file..."
cat > terraform/terraform.tfvars << EOF
aws_region = "$AWS_REGION"
app_name = "wealth-atlas"
backend_image_tag = "latest"
mongodb_uri = "$MONGODB_URI"
EOF
echo "✅ Created terraform/terraform.tfvars"

# Initialize Terraform
echo ""
echo "Initializing Terraform..."
(cd terraform && terraform init)

# Plan Terraform changes
echo ""
echo "Planning deployment..."
(cd terraform && terraform plan -var-file=terraform.tfvars)

# Confirm deployment
echo ""
read -p "Continue with deployment? (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "Deployment cancelled."
  exit 0
fi

# Apply Terraform changes
echo ""
echo "Applying infrastructure changes..."
(cd terraform && terraform apply -auto-approve -var-file=terraform.tfvars)

# Get outputs
echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "URLs and Resources:"
echo "==================="
FRONTEND_URL=$(cd terraform && terraform output -raw frontend_url)
BACKEND_URL=$(cd terraform && terraform output -raw backend_url)
ECR_REPO=$(cd terraform && terraform output -raw ecr_repository_url)
S3_BUCKET=$(cd terraform && terraform output -raw s3_bucket_name)

echo "Frontend URL: https://$FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"
echo "ECR Repository: $ECR_REPO"
echo "S3 Bucket: $S3_BUCKET"

echo ""
echo "Next Steps:"
echo "==========="
echo "1. Build and push backend image:"
echo "   docker build -t $ECR_REPO:latest -f Dockerfile.backend ."
echo "   aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REPO"
echo "   docker push $ECR_REPO:latest"
echo ""
echo "2. Build and deploy frontend:"
echo "   cd apps/frontend"
echo "   echo \"NEXT_PUBLIC_API_URL=$BACKEND_URL/graphql\" > .env.production"
echo "   pnpm build"
echo "   aws s3 sync ./out/ s3://$S3_BUCKET/ --delete"
echo ""
echo "3. Access your application at: https://$FRONTEND_URL"

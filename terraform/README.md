# WealthAtlas Minimal Deployment

This directory contains a minimal Terraform configuration for deploying WealthAtlas on a single EC2 instance.

## Architecture

- **Single EC2 instance** hosting both frontend and backend
- **Nginx** serving the frontend static files and proxying API requests
- **PM2** managing the Node.js backend process
- **External MongoDB** (e.g., MongoDB Atlas) for the database

## Prerequisites

1. AWS account with permissions to create EC2 instances and security groups
2. MongoDB instance (e.g., MongoDB Atlas)
3. SSH key pair created in AWS
4. GitHub repository with your code

## Setup Instructions

### 1. Update Variables

Update the variables in `variables.tf` to match your environment:

- `ec2_ami_id`: Update with the correct Amazon Linux 2 AMI for your region
- `ssh_key_name`: Set to the name of your SSH key in AWS
- `github_repo`: Set to your GitHub repository name (username/repo)

### 2. Set up GitHub Secrets

In your GitHub repository, add these secrets:

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: A secret for JWT authentication
- `SSH_PRIVATE_KEY`: The private key content (from your SSH key pair)

### 3. Initial Deployment

Run the GitHub Actions workflow manually from the Actions tab in your GitHub repository.

This will:
1. Create the EC2 instance and security group
2. Set up the server with Node.js, Nginx, and PM2
3. Deploy your application

### 4. Subsequent Deployments

Any push to the `main` branch will automatically:
1. Pull the latest code on the server
2. Build the frontend and backend
3. Deploy the updated code
4. Restart services as needed

## Manual Access

You can SSH into your instance using:

```
ssh -i ~/.ssh/your-key.pem ec2-user@<server-ip>
```

Replace `<server-ip>` with the IP address output by the Terraform deployment.

## Cleanup

To remove all resources:

```bash
cd terraform/minimal
terraform destroy -var="mongodb_uri=your_mongodb_uri" -var="jwt_secret=your_jwt_secret"
```

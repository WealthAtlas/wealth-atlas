# MongoDB Atlas Setup Guide

This guide explains how to set up a free MongoDB Atlas cluster for your WealthAtlas application.

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account or log in if you already have one

## Step 2: Create a Free Tier Cluster

1. Click "Build a Database"
2. Select "FREE" tier (Shared cluster)
3. Choose AWS as the cloud provider
4. Select a region close to your application's AWS region (us-east-2)
5. Click "Create"

## Step 3: Configure Database Security

1. Create a database user:
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Enter username and strong password
   - Set "Database User Privileges" to "Read and write to any database"
   - Click "Add User"

2. Configure network access:
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Select "Allow Access from Anywhere" or add the specific IP ranges for your AWS resources
   - Click "Confirm"

## Step 4: Get Connection String

1. Click "Connect" on your cluster
2. Select "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user's password

## Step 5: Configure Environment

Add the connection string to:

1. Your Terraform deployment:
   ```bash
   # Create a terraform.tfvars file (DO NOT COMMIT THIS FILE)
   cd terraform
   cat > terraform.tfvars <<EOF
   aws_region = "us-east-2"
   app_name = "wealth-atlas"
   backend_image_tag = "latest"
   mongodb_uri = "mongodb+srv://username:password@cluster0.mongodb.net/wealth-atlas?retryWrites=true&w=majority"
   EOF
   ```

2. GitHub Secrets:
   - Add the MongoDB URI as a secret named `MONGODB_URI` in your GitHub repository

## Notes

1. The free tier provides:
   - 512 MB storage
   - Shared RAM
   - Limited connections
   - No SLA

2. For production use with higher requirements:
   - You may need to upgrade to a paid tier
   - Consider migrating to a dedicated M10+ cluster for better performance

3. Database backups:
   - Free tier includes point-in-time recovery for 1 day
   - Consider scheduling regular backups for your important data

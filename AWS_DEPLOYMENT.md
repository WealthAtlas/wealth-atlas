# WealthAtlas AWS Deployment

This project provides Terraform configurations for deploying WealthAtlas (a NestJS + MongoDB + NextJS application) on AWS infrastructure, with a focus on low-cost and simplicity.

## Architecture Overview

![AWS Architecture](https://mermaid.ink/img/pako:eNqNksFuwjAMhl_Fyg2q2AsMAXuDHSbtOKnK3DRrtDRO5aQTQuTdl7RAGUIbvdiJ_X-2_zt98gl8AQFFLXgLtj7XdQQuoNQwYTLkWlKhxgJKvSmPjLmklwkYcmlAImGqKjZiU8G0LGxlt-1d0y0NwRm99RJXnFcESp-d9-5v5740D4eGX0EttPahC7EJm7bfyAghf1gvD6EmSeHNW_U6X-woZ1WzPOxWvzWJiRU0oUXmjP_2TQaXsYGCaKd6hsKTluM-E7otX2jQ3idqNWjrKN0gpkR7R-I5RFd-J_unpZx0QZOPIc8dxVfJ1PXXQL9Ih3WLrSdPI7Np24hCSmkMQzHqUkjnJ9-nXV3ofvbFAwpzq9j9vtoHfu8ICFFlYpZ5AHYEk7_DLx1lCJ8?type=png)

### Components:

1. **Frontend**: NextJS static site on S3 with CloudFront CDN
   - Cost-effective static hosting
   - Global content delivery via CloudFront
   
2. **Backend**: NestJS API on ECS Fargate
   - Minimal compute resources (0.25 vCPU, 512MB RAM)
   - Auto-scaling capabilities (when needed)
   
3. **Database**: MongoDB Atlas Free Tier
   - No infrastructure cost
   - 512MB storage capacity
   - Managed service with minimal maintenance overhead

4. **AWS Region**: us-east-2 (Ohio)
   - Selected for lower pricing compared to other regions
   - Balances cost with performance

## Deployment Instructions

### Prerequisites:
- AWS Account
- MongoDB Atlas Account (see docs/MONGODB_SETUP.md)
- Terraform installed locally
- AWS CLI configured

### Quick Start:

1. **Set up MongoDB Atlas**:
   ```bash
   # Follow instructions in docs/MONGODB_SETUP.md to create your MongoDB cluster
   # Then set your connection string:
   export MONGODB_URI="mongodb+srv://username:password@cluster0.mongodb.net/wealth-atlas"
   ```

2. **Run the deployment script**:
   ```bash
   # This will deploy all infrastructure to AWS
   ./scripts/deploy.sh
   ```

3. **Deploy your application code**:
   ```bash
   # Follow the instructions shown after deployment completes
   ```

## Cost Optimization Strategies

This deployment is optimized for minimal costs:

1. **Static Frontend**: Using S3 + CloudFront is significantly cheaper than app hosting services
2. **Fargate Sizing**: Using minimal compute resources for the backend
3. **MongoDB Atlas Free Tier**: Zero cost database option for hobby projects
4. **Region Selection**: us-east-2 offers lower pricing than us-east-1
5. **CloudFront Price Class**: Using Price Class 100 (only North America and Europe edges)

## Files and Components

- `terraform/` - Infrastructure as code configurations
- `scripts/` - Helper scripts for deployment and database setup
- `Dockerfile.backend` - Container definition for NestJS backend
- `docs/` - Additional documentation

## Future Enhancements

While the current setup is optimized for cost and simplicity, here are potential enhancements:

1. **Add HTTPS to ALB**: Secure the backend with SSL certificate
2. **Enable WAF**: Add Web Application Firewall for enhanced security
3. **Implement Auto Scaling**: Add scaling policies based on traffic patterns
4. **Set up CI/CD Pipeline**: Automate the deployment process completely
5. **Monitoring and Alerting**: Add CloudWatch alarms for critical metrics

## Support

For questions or issues, please open an issue in the repository.

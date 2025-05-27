# AWS Cost Estimation for WealthAtlas

This document provides an estimate of the monthly AWS costs for running the WealthAtlas application in a low-cost configuration.

## Cost Breakdown (Estimated Monthly)

| Service | Configuration | Estimated Cost (USD) | Notes |
|---------|--------------|-----------------|-------|
| **S3 (Frontend Storage)** | 1 GB storage | $0.023 | Standard tier, us-east-2 |
| **CloudFront** | 10 GB data transfer | $0.85 | Price class 100, ~100K requests |
| **ECS Fargate** | 0.25 vCPU, 0.5 GB RAM | $7.57 | Running 24/7 for 30 days |
| **ECR** | 1 GB storage | $0.10 | For Docker image storage |
| **ALB** | 1 load balancer | $16.20 | Standard tier |
| **Route 53** | - | $0.00 | Optional, if custom domain needed: +$0.50 |
| **Secrets Manager** | 1 secret | $0.40 | For MongoDB URI |
| **VPC** | NAT Gateway | $0.00 | No NAT Gateway used in this setup |
| **CloudWatch** | Basic monitoring | $0.00 | Included with services |
| | | |
| **Total (approx)** | | **$25.15** | |

## MongoDB Atlas Costs

The MongoDB Atlas free tier (M0) is used in this deployment, which has the following limitations:
- Shared RAM
- 512 MB storage
- No SLA
- No backup
- Cost: **$0.00**

If your data needs grow beyond these limitations, upgrades start at approximately $9/month for dedicated clusters.

## Cost Optimization Strategies

1. **Scheduled Scaling**:
   - Configure ECS service to scale to zero during periods of inactivity.
   - Potential savings: Up to 70% of Fargate costs if running only 8 hours/day.

2. **Reserved Instances**:
   - For stable workloads, consider AWS Savings Plans.
   - Potential savings: 30-60% on compute costs.

3. **Request-Based Pricing**:
   - Consider migrating backend to AWS Lambda for API Gateway for true pay-per-use.
   - Requires serverless architecture modifications.

4. **Alternative Regions**:
   - us-east-2 (Ohio) is already cost-effective
   - Other options: us-west-2 or ca-central-1 depending on latency needs

5. **CloudFront Optimization**:
   - Current price class 100 is already cost-optimized
   - Further savings possible by optimizing object caching

## Monitoring Costs

1. Set up AWS Budgets to alert you when costs exceed thresholds
2. Review AWS Cost Explorer regularly to identify cost drivers
3. Use AWS Cost Anomaly Detection to catch unexpected spending

## Scaling Considerations

This cost estimation is for a hobby project with minimal traffic. As your application grows:

1. **0-10k users/month**:
   - Current setup is sufficient
   - Total cost: ~$25-50/month

2. **10k-100k users/month**:
   - Increase ECS task size (0.5 vCPU, 1GB RAM): +$7/month
   - Increase data transfer: +$10-40/month 
   - Upgrade MongoDB to M10: +$57/month
   - Total cost: ~$100-150/month

3. **100k+ users/month**:
   - Consider autoscaling configuration
   - Consider reserved instances for predictable workloads
   - Implement caching layer
   - Total cost varies significantly based on usage patterns

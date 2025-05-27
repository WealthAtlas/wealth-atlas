output "frontend_url" {
  description = "URL to access the frontend"
  value       = module.frontend.website_url
}

output "backend_url" {
  description = "URL to access the backend API"
  value       = module.backend.backend_url
}

output "ecr_repository_url" {
  description = "ECR repository URL for backend Docker image"
  value       = module.backend.ecr_repository_url
}

output "s3_bucket_name" {
  description = "S3 bucket name for frontend static files"
  value       = module.frontend.s3_bucket_name
}

output "frontend_distribution_id" {
  description = "CloudFront distribution ID for frontend"
  value       = module.frontend.cloudfront_distribution_id
}

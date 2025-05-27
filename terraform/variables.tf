variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-2"  # Ohio region - generally cheaper than us-east-1
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "wealth-atlas"
}

variable "backend_image_tag" {
  description = "Backend Docker image tag"
  type        = string
  default     = "latest"
}

variable "mongodb_uri" {
  description = "MongoDB connection URI"
  type        = string
  sensitive   = true
  # No default as this should be provided securely, not committed to Git
}

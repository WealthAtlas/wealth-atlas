variable "app_name" {
  description = "Application name"
  type        = string
  default     = "wealth-atlas"
}

variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-2"
}

variable "ec2_ami_id" {
  description = "AMI ID for EC2 instance (Amazon Linux 2)"
  type        = string
  default     = "ami-0c55b159cbfafe1f0" # Update with the correct AMI for your region
}

variable "ec2_instance_type" {
  description = "Instance type for EC2 instance"
  type        = string
  default     = "t2.micro" # Free tier eligible
}

variable "ssh_key_name" {
  description = "Name of SSH key pair for EC2 instance"
  type        = string
  default     = "wealth-atlas-key" # Make sure this key exists in your AWS account
}

variable "backend_port" {
  description = "Port that the backend server listens on"
  type        = number
  default     = 3000
}

variable "mongodb_uri" {
  description = "MongoDB connection URI (external service like MongoDB Atlas)"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Secret for JWT authentication"
  type        = string
  sensitive   = true
  default     = "change-me-in-production"
}

variable "github_repo" {
  description = "GitHub repository name (username/repo)"
  type        = string
  default     = "username/wealth-atlas" # Update with your GitHub repo
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.2.0"

  backend "local" {
    path = "terraform.tfstate"
    # We'll use local state for simplicity, but consider using S3 for remote state in production
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "WealthAtlas"
      Environment = "Production"
      ManagedBy   = "Terraform"
    }
  }
}

# Create VPC for our resources
module "vpc" {
  source = "./modules/vpc"
}

# Frontend infrastructure
module "frontend" {
  source = "./modules/frontend"
  
  app_name = var.app_name
}

# Backend infrastructure
module "backend" {
  source = "./modules/backend"
  
  app_name      = var.app_name
  image_tag     = var.backend_image_tag
  vpc_id        = module.vpc.vpc_id
  subnet_ids    = module.vpc.private_subnet_ids
  mongodb_uri   = var.mongodb_uri
}

# Security & networking
module "security" {
  source = "./modules/security"
  
  app_name = var.app_name
  vpc_id   = module.vpc.vpc_id
}

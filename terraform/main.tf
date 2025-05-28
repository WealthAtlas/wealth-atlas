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
  }
}

provider "aws" {
  region = var.aws_region
}

# Get available availability zones
data "aws_availability_zones" "available" {}

# Create a simple security group
resource "aws_security_group" "app_sg" {
  name        = "${var.app_name}-sg"
  description = "Security group for WealthAtlas app"

  # SSH access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH"
  }

  # HTTP access
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  # HTTPS access
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  # Backend API access
  ingress {
    from_port   = var.backend_port
    to_port     = var.backend_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Backend API"
  }

  # Outbound internet access
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Create a simple EC2 instance
resource "aws_instance" "app_server" {
  ami           = var.ec2_ami_id
  instance_type = var.ec2_instance_type
  key_name      = var.ssh_key_name
  
  vpc_security_group_ids = [aws_security_group.app_sg.id]
  
  user_data = <<-EOF
    #!/bin/bash
    # Update system
    yum update -y
    
    # Install Node.js
    curl -sL https://rpm.nodesource.com/setup_18.x | bash -
    yum install -y nodejs git nginx
    
    # Configure environment variables
    echo "MONGODB_URI=${var.mongodb_uri}" > /home/ec2-user/.env
    echo "JWT_SECRET=${var.jwt_secret}" >> /home/ec2-user/.env
    
    # Install PM2 globally
    npm install -g pm2
    
    # Clone repository
    cd /home/ec2-user
    git clone https://github.com/${var.github_repo} app
    cd app
    
    # Install dependencies and build
    npm install
    npm run build:backend
    npm run build:frontend
    
    # Copy frontend build to nginx
    cp -r apps/frontend/out/* /usr/share/nginx/html/
    
    # Configure nginx
    cat > /etc/nginx/conf.d/default.conf << 'NGINX'
    server {
      listen 80;
      server_name _;
      
      location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
      }
      
      location /graphql {
        proxy_pass http://localhost:${var.backend_port}/graphql;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
      }
    }
    NGINX
    
    # Start backend with PM2
    cd /home/ec2-user/app
    pm2 start "npm run start:prod:backend" --name backend
    pm2 save
    pm2 startup | tail -1 | bash
    
    # Start nginx
    systemctl start nginx
    systemctl enable nginx
  EOF
  
  tags = {
    Name = "${var.app_name}-server"
  }
}

# Create an Elastic IP to have a fixed IP address
resource "aws_eip" "app_ip" {
  instance = aws_instance.app_server.id
  domain   = "vpc"
  
  tags = {
    Name = "${var.app_name}-ip"
  }
}

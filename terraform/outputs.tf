output "app_url" {
  description = "URL to access the application"
  value       = "http://${aws_eip.app_ip.public_ip}"
}

output "ssh_command" {
  description = "SSH command to connect to the server"
  value       = "ssh -i ~/.ssh/${var.ssh_key_name}.pem ec2-user@${aws_eip.app_ip.public_ip}"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "coffee-tracker"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "anthropic_api_key" {
  description = "Anthropic API key — stored in SSM, passed in at deploy time"
  type        = string
  sensitive   = true
}

variable "frontend_url" {
  description = "CloudFront URL for CORS — populated after first deploy"
  type        = string
  default     = "*"
}

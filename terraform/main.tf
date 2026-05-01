terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "coffee-tracker-tf-state"
    key            = "coffee-tracker/terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "coffee-tracker-tf-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  app     = var.app_name
  env     = var.environment
  prefix  = "${var.app_name}-${var.environment}"
  tags = {
    App         = var.app_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

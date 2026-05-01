output "cloudfront_url" {
  description = "Public URL of the application"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "api_gateway_url" {
  description = "API Gateway invoke URL"
  value       = aws_api_gateway_stage.main.invoke_url
}

output "frontend_bucket" {
  description = "S3 bucket for frontend deployment"
  value       = aws_s3_bucket.frontend.bucket
}

output "photos_bucket" {
  description = "S3 bucket for latte art photos"
  value       = aws_s3_bucket.photos.bucket
}

output "dynamodb_table" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.main.name
}

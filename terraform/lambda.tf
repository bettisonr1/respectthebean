locals {
  lambda_zip = "${path.module}/../backend/dist/lambda.zip"

  common_env = {
    DYNAMODB_TABLE  = aws_dynamodb_table.main.name
    PHOTO_BUCKET    = aws_s3_bucket.photos.bucket
    FRONTEND_URL    = var.frontend_url
    ANTHROPIC_API_KEY = var.anthropic_api_key
    NODE_ENV        = var.environment
  }
}

resource "aws_lambda_function" "machines" {
  function_name    = "${local.prefix}-machines"
  role             = aws_iam_role.lambda.arn
  handler          = "dist/handlers/machines.handler"
  runtime          = "nodejs20.x"
  filename         = local.lambda_zip
  source_code_hash = filebase64sha256(local.lambda_zip)
  timeout          = 10
  memory_size      = 256
  environment { variables = local.common_env }
  tags = local.tags
}

resource "aws_lambda_function" "beans" {
  function_name    = "${local.prefix}-beans"
  role             = aws_iam_role.lambda.arn
  handler          = "dist/handlers/beans.handler"
  runtime          = "nodejs20.x"
  filename         = local.lambda_zip
  source_code_hash = filebase64sha256(local.lambda_zip)
  timeout          = 10
  memory_size      = 256
  environment { variables = local.common_env }
  tags = local.tags
}

resource "aws_lambda_function" "shots" {
  function_name    = "${local.prefix}-shots"
  role             = aws_iam_role.lambda.arn
  handler          = "dist/handlers/shots.handler"
  runtime          = "nodejs20.x"
  filename         = local.lambda_zip
  source_code_hash = filebase64sha256(local.lambda_zip)
  timeout          = 10
  memory_size      = 256
  environment { variables = local.common_env }
  tags = local.tags
}

resource "aws_lambda_function" "recommendations" {
  function_name    = "${local.prefix}-recommendations"
  role             = aws_iam_role.lambda.arn
  handler          = "dist/handlers/recommendations.handler"
  runtime          = "nodejs20.x"
  filename         = local.lambda_zip
  source_code_hash = filebase64sha256(local.lambda_zip)
  timeout          = 15
  memory_size      = 256
  environment { variables = local.common_env }
  tags = local.tags
}

resource "aws_lambda_function" "artwork_api" {
  function_name    = "${local.prefix}-artwork-api"
  role             = aws_iam_role.lambda.arn
  handler          = "dist/handlers/artwork.uploadUrlHandler"
  runtime          = "nodejs20.x"
  filename         = local.lambda_zip
  source_code_hash = filebase64sha256(local.lambda_zip)
  timeout          = 10
  memory_size      = 256
  environment { variables = local.common_env }
  tags = local.tags
}

resource "aws_lambda_function" "artwork_trigger" {
  function_name    = "${local.prefix}-artwork-trigger"
  role             = aws_iam_role.lambda.arn
  handler          = "dist/handlers/artwork.s3TriggerHandler"
  runtime          = "nodejs20.x"
  filename         = local.lambda_zip
  source_code_hash = filebase64sha256(local.lambda_zip)
  timeout          = 30
  memory_size      = 512
  environment { variables = local.common_env }
  tags = local.tags
}

resource "aws_lambda_permission" "s3_invoke_artwork" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.artwork_trigger.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.photos.arn
}

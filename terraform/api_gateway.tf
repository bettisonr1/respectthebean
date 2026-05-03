resource "aws_api_gateway_rest_api" "main" {
  name        = local.prefix
  description = "Coffee Tracker API"
  body        = jsonencode(local.openapi_spec)
  tags        = local.tags
}

locals {
  routes = {
    machines        = { path = "machines", methods = ["GET", "POST"], lambda = aws_lambda_function.machines }
    machine_id      = { path = "machines/{machineId}", methods = ["DELETE", "PATCH"], lambda = aws_lambda_function.machines }
    beans           = { path = "beans", methods = ["GET", "POST"], lambda = aws_lambda_function.beans }
    bean_id         = { path = "beans/{beanId}", methods = ["DELETE"], lambda = aws_lambda_function.beans }
    bean_barcode    = { path = "beans/barcode/{barcode}", methods = ["GET"], lambda = aws_lambda_function.beans }
    shots           = { path = "shots", methods = ["GET", "POST"], lambda = aws_lambda_function.shots }
    shot_id         = { path = "shots/{shotId}", methods = ["PATCH"], lambda = aws_lambda_function.shots }
    recommendations = { path = "recommendations/{beanId}/{machineId}", methods = ["GET"], lambda = aws_lambda_function.recommendations }
    artwork_url     = { path = "artwork/upload-url/{shotId}", methods = ["GET"], lambda = aws_lambda_function.artwork_api }
  }

  openapi_paths = merge([
    for route_key, route in local.routes : {
      "/api/${route.path}" = {
        for method in route.methods :
        lower(method) => {
          operationId = "${route_key}_${lower(method)}"
          responses = {
            "200" = {
              description = "OK"
            }
          }
          x-amazon-apigateway-integration = {
            type                = "aws_proxy"
            httpMethod          = "POST"
            uri                 = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${route.lambda.arn}/invocations"
            passthroughBehavior = "when_no_match"
          }
        }
      }
    }
  ]...)

  openapi_spec = {
    openapi = "3.0.1"
    info = {
      title   = "${local.prefix}-api"
      version = "1.0.0"
    }
    paths = local.openapi_paths
  }

  api_gateway_lambdas_grouped = {
    for _, route in local.routes :
    route.lambda.function_name => route.lambda...
  }

  api_gateway_lambdas = {
    for function_name, lambdas in local.api_gateway_lambdas_grouped :
    function_name => lambdas[0]
  }

  deployment_fingerprint = {
    for route_key, route in local.routes :
    route_key => {
      path          = route.path
      methods       = route.methods
      function_name = route.lambda.function_name
    }
  }
}

resource "aws_lambda_permission" "api_gateway_invoke" {
  for_each = local.api_gateway_lambdas

  statement_id  = "AllowApiGatewayInvoke${substr(sha1(each.key), 0, 10)}"
  action        = "lambda:InvokeFunction"
  function_name = each.value.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  depends_on = [
    aws_lambda_permission.api_gateway_invoke,
  ]

  triggers = {
    redeployment = sha1(jsonencode(local.openapi_spec))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment
  tags          = local.tags
}

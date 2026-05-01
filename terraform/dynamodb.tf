resource "aws_dynamodb_table" "main" {
  name         = local.prefix
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "communityPK"
    type = "S"
  }

  attribute {
    name = "communitySK"
    type = "S"
  }

  global_secondary_index {
    name            = "gsi-community"
    hash_key        = "communityPK"
    range_key       = "communitySK"
    projection_type = "INCLUDE"
    non_key_attributes = [
      "grindSetting", "doseIn", "yieldOut", "extractionTime", "rating"
    ]
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = local.tags
}

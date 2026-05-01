# Dev Deploy Runbook (Manual)

This document captures the manual deployment flow for the Coffee Tracker MVP to AWS.

Current target architecture:
- Frontend: S3 + CloudFront
- API: API Gateway + Lambda (Node.js 20)
- Data: DynamoDB
- Photos: S3 + Lambda trigger

This is intentionally manual for now. A future task will automate this with GitHub Actions.

## Prerequisites

- AWS account and credentials configured locally (`aws configure` or AWS SSO)
- AWS CLI installed
- Terraform >= 1.7
- Node.js 20+
- npm

## 1) Preflight

From repo root:

```bash
cd /Users/robbettison/Code/coffee-tracker
aws sts get-caller-identity
terraform version
node -v
```

If identity fails, fix AWS auth first.

## 2) Bootstrap Terraform backend (one-time)

Terraform backend in `terraform/main.tf` expects:
- S3 bucket: `coffee-tracker-tf-state`
- DynamoDB lock table: `coffee-tracker-tf-locks`

Create once:

```bash
aws s3api create-bucket \
  --bucket coffee-tracker-tf-state \
  --region eu-west-1 \
  --create-bucket-configuration LocationConstraint=eu-west-1

aws s3api put-bucket-versioning \
  --bucket coffee-tracker-tf-state \
  --versioning-configuration Status=Enabled

aws dynamodb create-table \
  --table-name coffee-tracker-tf-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-1
```

If these already exist, continue.

## 3) Build and package backend Lambda artifact

Terraform expects `backend/dist/lambda.zip`.

```bash
cd /Users/robbettison/Code/coffee-tracker
npm run install:all

cd backend
npm run build
zip -r dist/lambda.zip dist node_modules package.json package-lock.json
```

## 4) First Terraform deploy

Set required sensitive variable in your shell:

```bash
export TF_VAR_anthropic_api_key="YOUR_ANTHROPIC_KEY"
```

Deploy:

```bash
cd /Users/robbettison/Code/coffee-tracker/terraform
terraform init
terraform apply
```

Approve when prompted.

## 5) Build and upload frontend

Get Terraform outputs:

```bash
cd /Users/robbettison/Code/coffee-tracker/terraform
FRONTEND_BUCKET=$(terraform output -raw frontend_bucket)
CLOUDFRONT_URL=$(terraform output -raw cloudfront_url)
CLOUDFRONT_DOMAIN=${CLOUDFRONT_URL#https://}
```

Build and sync frontend:

```bash
cd /Users/robbettison/Code/coffee-tracker/frontend
npm run build
aws s3 sync dist/ "s3://$FRONTEND_BUCKET" --delete
```

Invalidate CloudFront:

```bash
DIST_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?DomainName=='$CLOUDFRONT_DOMAIN'].Id | [0]" --output text)
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
```

## 6) Tighten photo bucket CORS origin

`frontend_url` defaults to `*` in Terraform for initial bootstrap. After first deploy, lock it down:

```bash
cd /Users/robbettison/Code/coffee-tracker/terraform
terraform apply -var "frontend_url=$CLOUDFRONT_URL"
```

## 7) Smoke test

- Open the CloudFront URL from Terraform output
- Verify app shell loads
- Create/list beans and machines
- Test artwork upload URL flow

## Troubleshooting

- `NoSuchBucket` / backend init failures:
  - Ensure step 2 resources were created in `eu-west-1`.
- Lambda zip missing:
  - Re-run step 3 and confirm `backend/dist/lambda.zip` exists.
- Frontend not updating:
  - Re-run S3 sync and CloudFront invalidation.
- CORS upload failures:
  - Ensure step 6 has been applied with your CloudFront URL.

## Future Work: GitHub Actions

When we automate this, split into two workflows:

1. **Infrastructure workflow**
   - `terraform fmt`, `terraform validate`, `terraform plan`
   - `terraform apply` on protected branch/manual approval
   - Store secrets in GitHub Actions secrets (including Anthropic key)

2. **Frontend deploy workflow**
   - Build frontend
   - Upload to frontend S3 bucket
   - CloudFront invalidation

Recommended: use OIDC-based AWS auth from GitHub Actions (no long-lived AWS keys).

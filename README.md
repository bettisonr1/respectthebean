# respectthebean

Coffee tracking app with:
- React + Vite frontend
- Node/TypeScript backend (AWS Lambda handlers)
- DynamoDB + S3 on AWS in production (Terraform)

## Run locally

### Prerequisites

- Node.js 20+
- npm
- Docker (for DynamoDB Local)
- AWS CLI (used for creating the local table)

### 1) Install dependencies

```bash
cd /Users/robbettison/Code/coffee-tracker
npm install
npm run install:all
```

### 2) Start DynamoDB Local (Docker Compose)

```bash
cd /Users/robbettison/Code/coffee-tracker
docker compose up -d dynamodb
```

In another terminal, create the table used by the app:

```bash
npm run db:create-table
```

If the table already exists, you can skip this step.

### 3) Start backend + frontend together (one command)

```bash
cd /Users/robbettison/Code/coffee-tracker
npm run dev:local
```

This starts:
- DynamoDB Local on `http://localhost:8000` (if not already running)
- local API (Lambda handlers through `backend/src/local.ts`) on `http://localhost:3001`
- Vite frontend on `http://localhost:5173`

Vite proxies `/api/*` to `http://localhost:3001/*`.

### 4) Stop local services

Stop frontend/backend with `Ctrl+C`, then stop DynamoDB:

```bash
cd /Users/robbettison/Code/coffee-tracker
npm run dev:local:down
```

## Local database choice

Use **DynamoDB Local**. It matches production data access patterns and avoids adapting the backend to a different database engine.

If you need to test cloud-like integrations (S3 events, IAM, etc.), LocalStack is an option, but DynamoDB Local is the simplest way to run the core CRUD/recommendation flows.

## Running Lambda functions locally

This repository uses Lambda-style handlers in `backend/src/handlers/*`.

For local development:
- it starts a local HTTP router (`backend/src/local.ts`)
- each endpoint maps to the corresponding Lambda handler
- frontend calls these routes through Vite proxy

Routes available locally:
- `GET/POST /machines`
- `DELETE /machines/:machineId`
- `GET/POST /beans`
- `GET /beans/barcode/:barcode`
- `DELETE /beans/:beanId`
- `GET/POST /shots`
- `PATCH /shots/:shotId`
- `GET /recommendations/:beanId/:machineId`
- `GET /artwork/upload-url/:shotId`

## Notes

- Recommendation and artwork analysis handlers call Anthropic APIs. If `ANTHROPIC_API_KEY` is unset, those endpoints will fail.
- Artwork upload URLs require a real S3 bucket and AWS credentials; the rest of the app works with DynamoDB Local only.
- DynamoDB Local in this setup is ephemeral. Recreate the table with `npm run db:create-table` after restarting the container.

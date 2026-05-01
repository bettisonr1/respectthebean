# Coffee Tracker — Solution Design

## Architecture Overview

Coffee Tracker is a serverless, cloud-native application deployed on AWS. The frontend is a React PWA served via CloudFront + S3. The backend is a set of Lambda functions exposed through API Gateway. Data is stored in DynamoDB (single-table design). Latte art photos are stored in S3. AI feedback is powered by the Anthropic Claude API (vision).

```
┌─────────────────────────────────────────────────────┐
│                     Client (PWA)                     │
│              React + TypeScript + Vite               │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────┐
│                    CloudFront CDN                    │
│         Static assets (S3) + API proxy               │
└──────────┬──────────────────────────┬───────────────┘
           │                          │
           ▼                          ▼
┌──────────────────┐      ┌───────────────────────────┐
│   S3 (frontend)  │      │       API Gateway          │
│  Static hosting  │      │    REST API (JWT auth)     │
└──────────────────┘      └────────────┬──────────────┘
                                       │
                         ┌─────────────▼──────────────┐
                         │       Lambda Functions       │
                         │  machines | beans | shots   │
                         │  recommendations | artwork  │
                         └──────┬──────────────┬───────┘
                                │              │
                    ┌───────────▼──┐    ┌──────▼──────────┐
                    │   DynamoDB   │    │   S3 (photos)   │
                    │ Single table │    │  Latte art imgs  │
                    └──────────────┘    └─────────────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │   Anthropic Claude   │
                                    │   Vision API         │
                                    └─────────────────────┘
```

---

## Frontend

### Technology Choices

| Choice | Rationale |
|---|---|
| React + TypeScript | Rob's existing stack; strong ecosystem for PWAs |
| Vite | Fast dev server and build tooling |
| PWA (manifest + service worker) | Installable on mobile home screen, camera access, offline capability — without App Store friction |
| Mobile-first CSS | Primary use case is next to the espresso machine on a phone |
| React Router | Client-side routing for multi-page feel |

### PWA Considerations
- `manifest.json` enables "Add to Home Screen" on iOS and Android
- Service worker caches the shell for offline access
- Camera API used for barcode scanning and latte art photo upload

### Pages
- **Home** — quick-start shot log; shows today's shots and the recommendation for the last used bean/machine
- **New Shot** — two-stage form: pre-pull settings → post-pull results
- **Beans** — bean library; add via scan or manual entry
- **Machines** — machine management
- **History** — shot log with trend charts

---

## Backend

### Technology Choices

| Choice | Rationale |
|---|---|
| NodeJS + TypeScript | Consistent language across frontend and backend; Rob's primary stack |
| AWS Lambda | Serverless; no infrastructure to manage; scales to zero cost when not in use |
| API Gateway (REST) | Standard integration with Lambda; supports JWT authorisation |
| Single Lambda per resource | Clean separation; easier to reason about permissions and scaling |

### Lambda Functions

| Function | Routes | Responsibility |
|---|---|---|
| `machines` | GET/POST/DELETE `/machines` | CRUD for user's machines |
| `beans` | GET/POST/DELETE `/beans` | CRUD for user's beans; barcode lookup |
| `shots` | GET/POST `/shots` | Log and retrieve shot history |
| `recommendations` | GET `/recommendations/{beanId}/{machineId}` | Derive recommended settings from shot history |
| `artwork` | POST `/artwork` | Upload latte art photo to S3, trigger Claude vision analysis |

---

## Data Model

### DynamoDB — Single Table Design

Table name: `coffee-tracker`

All entities share one table. The partition key (`PK`) and sort key (`SK`) encode the entity type and relationships.

| Entity | PK | SK | Attributes |
|---|---|---|---|
| Machine | `USER#{userId}` | `MACHINE#{machineId}` | name, model, createdAt |
| Bean | `USER#{userId}` | `BEAN#{beanId}` | roaster, name, origin, roastLevel, roastDate, tastingNotes, barcode |
| Shot | `USER#{userId}` | `SHOT#{timestamp}#{shotId}` | beanId, machineId, grindSetting, doseIn, yieldOut, extractionTime, ratio, rating, photoKey, artworkFeedback, createdAt |

### Global Secondary Index — Community Recommendations

To support future cross-user recommendations matched on machine + bean:

| GSI | PK | SK |
|---|---|---|
| `gsi-community` | `MACHINE#{machineId}#BEAN#{beanId}` | `RATING#{rating}#SHOT#{shotId}` |

This allows querying all "balanced" shots for a given machine/bean combination across all users, without exposing personal data.

---

## Recommendation Logic

The recommendation engine (v1) is rule-based, not ML:

1. Query shot history for the given `userId + beanId + machineId` combination
2. Filter to shots rated "balanced"
3. If ≥ 3 balanced shots exist: return the modal grind setting and the mean dose/yield/time from those shots
4. If < 3 balanced shots: return the most recent settings with a note to keep experimenting
5. If no history: return defaults based on roast level (light → finer grind; dark → coarser)

A natural language explanation is generated by Claude: *"Your last 4 balanced shots with this bean used grind 8. Your average ratio was 1:2.1 at 27 seconds."*

---

## Latte Art Feedback

1. Client uploads photo to a pre-signed S3 URL (generated by the `artwork` Lambda)
2. Lambda is triggered on S3 `ObjectCreated` event
3. Lambda calls Claude vision API with the image and a structured prompt requesting feedback on: pattern type, symmetry, contrast, technique, and one improvement suggestion
4. Feedback is stored against the shot record in DynamoDB
5. Client polls for / receives the feedback (v1: polling; v2: WebSocket or SNS push)

---

## Infrastructure — Terraform

All AWS resources are defined in Terraform under `/terraform`. Resources are split by concern:

| File | Resources |
|---|---|
| `main.tf` | Provider config, backend (S3 state), locals |
| `variables.tf` | Environment, region, app name |
| `dynamodb.tf` | Main table + GSI |
| `s3.tf` | Frontend bucket + photo bucket + policies |
| `lambda.tf` | All Lambda functions + environment variables |
| `api_gateway.tf` | REST API, routes, Lambda integrations, CORS |
| `cloudfront.tf` | Distribution, origins (S3 + API Gateway), cache behaviours |
| `iam.tf` | Lambda execution roles + policies (DynamoDB, S3, SSM) |
| `outputs.tf` | CloudFront URL, API Gateway URL |

### State Management
Terraform state is stored remotely in S3 with DynamoDB locking to support team use and prevent concurrent apply conflicts.

---

## Security

- API Gateway uses JWT authorisation (Cognito or a lightweight custom authoriser in v1)
- Photos are stored in a private S3 bucket; access is via pre-signed URLs only
- Lambda functions follow least-privilege IAM — each function only has access to the specific DynamoDB operations and S3 paths it needs
- Anthropic API key stored in AWS SSM Parameter Store (SecureString); injected into Lambda as an environment variable at deploy time
- CORS restricted to the CloudFront domain

---

## Future Considerations

- **Community recommendations** — GSI is in place; UI and aggregation logic deferred to v2
- **Auth** — Cognito User Pool is the natural fit; deferred to keep v1 scope tight
- **Offline logging** — PWA service worker can queue shot logs when offline and sync when back online
- **Push notifications** — remind user to log a shot after their usual coffee time
- **Bean database** — build or integrate a specialty coffee bean database to enrich barcode scans

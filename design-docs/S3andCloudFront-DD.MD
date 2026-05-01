# Design Decision: Frontend Hosting

## Decision

For the Coffee Tracker frontend (React PWA), we will host the client on **S3 behind CloudFront**.

This means:
- Built static assets are stored in a private S3 bucket
- CloudFront serves those assets globally over HTTPS
- CloudFront also routes `/api/*` to API Gateway
- SPA routing fallback maps unknown paths to `index.html`

---

## Context

This project is:
- A mobile-first React + TypeScript PWA
- API-driven (Lambda + API Gateway)
- Cost-sensitive (personal/small-scale workload)
- Designed for operational simplicity in v1

The frontend is authenticated app UI, not SEO-heavy public content.

---

## Options Considered

### 1) CloudFront + S3 (chosen)

**How it works**
- Build frontend with Vite
- Upload static output to S3
- Serve via CloudFront (CDN)
- Route `/api/*` to API Gateway origin

**Pros**
- Low cost at this scale
- Strong global performance via CDN caching
- Simple architecture for a pure SPA/PWA
- Private S3 bucket with CloudFront Origin Access Control (OAC)
- Clean fit with existing Terraform IaC

**Cons**
- No server-side rendering out of the box
- Requires cache/versioning discipline during deploys
- Request-time HTML personalization is limited

---

### 2) S3 static website hosting only

**Pros**
- Very simple initial setup
- Can work for basic static sites

**Cons**
- Weaker security posture (typically public bucket/website endpoint)
- No CDN edge acceleration unless paired with CloudFront
- Less flexible/robust for production-grade SPA delivery

**Conclusion**
- Rejected in favor of CloudFront + S3 due to performance and security.

---

### 3) Managed frontend platform (e.g., AWS Amplify Hosting)

**Pros**
- Fast setup with built-in CI/CD
- Useful DX for teams wanting less infra management

**Cons**
- Less explicit infra control than current Terraform-first approach
- Additional platform abstraction for a straightforward SPA need
- Potential lock-in to platform conventions

**Conclusion**
- Not selected for v1 because Terraform-managed infra is already in place and sufficient.

---

### 4) SSR-capable React hosting (e.g., Next.js on Vercel or AWS compute)

**Pros**
- Better for SEO-heavy/public content
- Supports request-time rendering and personalization
- Supports ISR/SSR patterns

**Cons**
- Higher operational complexity and hosting cost
- Not needed for current authenticated, API-driven PWA scope
- Requires framework/runtime shift from current Vite SPA approach

**Conclusion**
- Deferred. Re-evaluate only if product requirements move toward SSR/ISR.

---

## Why this decision is right for Coffee Tracker now

- The app is primarily a logged-in utility, not a search-indexed content site.
- Most data is fetched from APIs after app load; static shell delivery is enough.
- PWA installability and offline shell support align naturally with SPA hosting.
- CloudFront + S3 gives a strong security/performance baseline with minimal ops overhead.
- The architecture cleanly separates concerns: static frontend, API backend, storage.

---

## Risks and Mitigations

- **Risk: stale frontend assets after deploy**
  - Mitigation: hash asset filenames, cache-control strategy, targeted invalidations.

- **Risk: broken client-side routes on refresh**
  - Mitigation: keep CloudFront custom error response fallback to `index.html`.

- **Risk: unclear deployment process**
  - Mitigation: add CI/CD step for `vite build`, S3 sync/upload, and CloudFront invalidation.

---

## Decision Status

**Accepted** for v1.

---

## Revisit Triggers

Reassess this decision if any of the following become true:
- We add SEO-critical public pages
- We need request-time rendered HTML/personalization
- We adopt a framework requiring SSR/ISR for core UX
- Frontend deployment complexity or cache issues become recurring pain points

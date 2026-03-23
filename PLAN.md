# Insights on Ancestry — Implementation Plan

## Current State

**Frontend** (built, no backend wiring):
- Landing page with fixed navbar ("InsightsOnAncestry"), hero, features with mouse-follow glow cards, logo ticker, product showcase, FAQ, footer
- Signup/Login page with multi-step form (registration → OTP → login), AuthCard with mouse-follow glow
- Dashboard with sidebar navigation (Samples/Labels, DIY Modeling, Assisted Modeling, Learning Materials)
- Samples/Labels section: upload box (max 3 samples, provider select, drag-and-drop), edit labels box (dataset select, operation select), download .fam bar
- Shared components: `GlowCard`, `useMouseGlow` hook, CSS variable system (`--accent-rgb`, `--error-rgb`, opacity variants)
- Fully responsive (mobile hamburger → animated X, collapsible sidebar)

**Backend**: Nothing built yet.

**Data/Compute**: No R scripts, no PLINK integration, no reference dataset pipeline.

---

## Phase 1: AWS Foundation & Authentication (Weeks 1–2)

### 1.1 AWS Account & Infrastructure Setup

- [ ] Set up AWS account with billing alerts
- [ ] Create IAM admin user (avoid root for daily use)
- [ ] Install AWS SAM CLI locally
- [ ] Initialize SAM project in `infra/` directory
- [ ] Set up S3 buckets:
  - `ioa-user-uploads` (private, lifecycle policy: delete unconfirmed uploads after 24h)
  - `ioa-processed-data` (private)
  - `ioa-reference-data` (private, versioned)
  - `ioa-job-results` (private)
- [ ] Create DynamoDB tables:
  - `ioa-users` (on-demand capacity)
  - `ioa-samples` (on-demand capacity)
  - `ioa-jobs` (on-demand capacity)
- [ ] Set up API Gateway REST API with CORS configured for frontend origin
- [ ] Configure custom domain (optional, can use API Gateway default URL initially)

### 1.2 Auth Lambda — Registration

**File**: `infra/lambdas/auth/handler.py`

- [ ] `POST /auth/register` endpoint
  - Validate input (name, email, password strength, country)
  - Check if email already exists in DynamoDB
  - Hash password with bcrypt
  - Generate 6-digit OTP, store hashed OTP + expiry (10 min) in user record
  - Set `emailVerified: false`
  - Send OTP email via Amazon SES
  - Return `{ message: "OTP sent" }`

- [ ] Set up Amazon SES
  - Verify sender email/domain
  - Create email template for OTP
  - Request production access (out of sandbox) when ready

### 1.3 Auth Lambda — OTP Verification

- [ ] `POST /auth/verify-otp` endpoint
  - Validate OTP against stored hash
  - Check expiry
  - Set `emailVerified: true`
  - Generate JWT (access token + refresh token)
  - Return tokens

### 1.4 Auth Lambda — Login

- [ ] `POST /auth/login` endpoint
  - Validate email + password
  - Check `emailVerified: true`
  - Generate JWT pair
  - Return tokens

- [ ] `POST /auth/refresh` endpoint
  - Validate refresh token
  - Issue new access token
  - Rotate refresh token

### 1.5 API Gateway JWT Authorizer

- [ ] Create Lambda authorizer or use API Gateway JWT authorizer
- [ ] Generate RSA key pair, store private key in AWS Secrets Manager
- [ ] Attach authorizer to all authenticated endpoints

### 1.6 Frontend Auth Integration

- [ ] Create auth context/provider (`src/contexts/AuthContext.tsx`)
  - Store JWT, user info
  - `login()`, `logout()`, `register()`, `verifyOtp()`, `refreshToken()` methods
  - Auto-refresh before token expiry
- [ ] Wire signup page Step 1 → `POST /auth/register`
- [ ] Wire signup page Step 2 → `POST /auth/verify-otp`
- [ ] Wire signup page Step 3 → `POST /auth/login`
- [ ] Add route guard middleware or wrapper for `/dashboard/*` routes
- [ ] Display real username in dashboard navbar
- [ ] Implement logout (clear tokens, redirect to `/`)

### 1.7 Testing

- [ ] Test registration → OTP → login flow end-to-end
- [ ] Test invalid inputs (duplicate email, wrong OTP, expired OTP, bad password)
- [ ] Test JWT expiry and refresh
- [ ] Test unauthorized access to dashboard routes

---

## Phase 2: File Upload & Conversion (Weeks 3–4)

### 2.1 Upload Lambda

**File**: `infra/lambdas/upload/handler.py`

- [ ] `POST /upload/presign` endpoint
  - Authenticated (JWT required)
  - Accept `{ filename, fileType, provider, slotIndex }` (provider: "23andme" | "ancestry" | etc.)
  - **Enforce max 3 samples**: check DynamoDB count for user, reject if slot occupied (unless replacing)
  - Generate S3 presigned PUT URL (15 min expiry, 50 MB limit)
  - Return `{ uploadUrl, fileKey }`

- [ ] `POST /upload/confirm` endpoint
  - Verify file exists in S3
  - Create sample record in DynamoDB (`status: "uploaded"`, `slotIndex: 1|2|3`)
  - Trigger conversion (invoke conversion Lambda)
  - Return `{ sampleId, status }`

- [ ] `GET /samples` endpoint
  - Return user's samples (max 3) with status, label, provider, upload date

- [ ] `PATCH /samples/{sampleId}` endpoint
  - Update `sampleLabel` (rename sample)
  - Rename PLINK files in S3 to match new label (the .fam file contains the sample name)

- [ ] `DELETE /samples/{sampleId}` endpoint
  - Delete sample record from DynamoDB
  - Delete raw file and PLINK files from S3
  - Frees up the slot for a new upload

### 2.2 Raw File Conversion Pipeline

**File**: `infra/worker/convert_raw.py`

Custom pipeline to parse consumer DNA raw files, normalize them, and convert to PLINK binary format. The pipeline will be more sophisticated than simple format conversion — handling provider-specific edge cases, strand issues, SNP filtering, and quality checks.

- [ ] **Step 1 — Parse & normalize**: Detect provider format and normalize to a common intermediate representation
  - Handle each provider's header format, column layout, allele encoding, and no-call conventions
  - Validate file integrity (expected columns, reasonable SNP count, etc.)

- [ ] **Step 2 — Convert to PLINK binary**:
  - `plink --23file normalized.txt --make-bed` → initial PLINK binary
  - `plink --extract plink.snplist --make-bed` → filter to curated SNP list

- [ ] **Step 3 — Clean & validate**:
  - Handle strand mismatches (`--flip` on `.missnp`, retry)
  - Remove duplicate SNPs (`plink2 --rm-dup force-first`, retry)
  - Exclude triallelic/problematic SNPs (`--exclude`, retry)
  - Quality checks on final fileset

- [ ] **Step 4 — Set sample label**: Update FID/IID in `.fam` to user's chosen `sampleLabel`

- [ ] Upload `.bed`, `.bim`, `.fam` to `s3://ioa-user-data/{userId}/samples/{sampleId}/`
- [ ] Upload `plink.snplist` to `s3://ioa-reference-data/snplist/` (shared, uploaded once)
- [ ] Update DynamoDB sample record: `status: "ready"`, `snpCount`, `s3SamplePrefix`
- [ ] Handle errors: update `status: "error"`, store `errorMessage`

**Where to run**: Lambda with container image (includes PLINK 1.9, PLINK2, and custom Python scripts). Consumer raw files are small (<5 MB), conversion is fast (<30s).

### 2.3 Frontend Upload & Sample Management UI

**File**: `src/app/dashboard/page.tsx` (Samples/Labels section — already built)

**Already built** (UI only, needs backend wiring):
- Upload box in `GlowCard`: sample label input, provider selector (23andMe/AncestryDNA/FTDNA/MyHeritage/LivingDNA), drag-and-drop file zone, upload button
- Slot counter badge (0/3) with error state when full
- Edit labels box: dataset selector (Your Dataset/Ancient/Modern), operation selector (Replace Labels/Edit Single Label/Edit Multiple Labels), proceed/reset buttons
- Download .fam bar: download buttons for each dataset

**Still needed** (wire to backend):
- [ ] Connect upload form → `POST /upload/presign` → S3 PUT → `POST /upload/confirm`
- [ ] Upload progress indicator
- [ ] Display uploaded samples with status badges
- [ ] **Rename**: Inline edit on sample label (calls `PATCH /samples/{id}`)
- [ ] **Delete**: Confirmation dialog, then removes sample and frees slot
- [ ] **Replace**: Upload new file into an occupied slot (deletes old, uploads new)
- [ ] Wire download .fam buttons → S3 presigned URL downloads
- [ ] Wire edit labels operations → backend endpoints

### 2.4 Testing

- [ ] Upload files of each provider format
- [ ] Verify conversion produces valid PLINK files with correct sample label in .fam
- [ ] Test max 3 sample limit enforcement
- [ ] Test rename (verify .fam file updated)
- [ ] Test delete (verify S3 cleanup)
- [ ] Test replace (delete old + upload new in one flow)
- [ ] Test oversized file rejection
- [ ] Test conversion error scenarios (malformed files)

---

## Phase 3: Reference Data & Populations API (Week 5)

### 3.1 Reference Dataset Preparation (Offline/Manual)

The Harvard AADR v62 ships as a single combined dataset in EIGENSTRAT format (`.geno/.snp/.ind`), with ancient and modern samples together. This needs to be split and converted before uploading to S3.

**Source files** (from [Harvard Dataverse](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/FFIDCW)):
- `v62.0_1240k_public.geno` (~5.4 GB) — EIGENSTRAT genotype data
- `v62.0_1240k_public.snp` (~78 MB) — SNP information
- `v62.0_1240k_public.ind` (~818 KB) — Sample IDs, sex, population labels
- `v62.0_1240k_public.anno` (~8.2 MB) — Extended metadata (dates, regions, publications)

**Preparation steps**:

- [ ] Download AADR v62 1240k files from Harvard Dataverse
- [ ] **Split ancient vs modern** using the `.anno` file metadata:
  - Parse the annotation file to classify each sample as ancient or modern
  - Generate `keep_ancient.txt` and `keep_modern.txt` (FID + IID lists)
- [ ] **Convert EIGENSTRAT → PLINK** for each split:
  - Use ADMIXTOOLS2 `packedancestrymap_to_plink()` or EIGENSOFT `convertf`
  - Transfer `.ind` population labels → `.fam` after conversion
- [ ] **Extract ancient subset**: PLINK `--keep keep_ancient.txt --make-bed --out v62_ancient`
- [ ] **Extract modern subset**: PLINK `--keep keep_modern.txt --make-bed --out v62_modern`
- [ ] **Generate `populations.json`** for each dataset by parsing the `.fam` file:
  ```json
  [
    {
      "id": "Yamnaya_Samara",
      "label": "Yamnaya Samara",
      "region": "Steppe",
      "timePeriod": "Bronze Age",
      "sampleCount": 12
    }
  ]
  ```
  - Population labels come from column 1 (FID) in `.fam` / column 3 in `.ind`
  - Region and time period metadata from the `.anno` file
- [ ] **Upload to S3**:
  - `s3://ioa-reference-data/v62_ancient/` (`.bed`, `.bim`, `.fam`, `populations.json`)
  - `s3://ioa-reference-data/v62_modern/` (`.bed`, `.bim`, `.fam`, `populations.json`)
  - `s3://ioa-reference-data/snplist/plink.snplist` (curated SNP list for filtering)
  - `s3://ioa-reference-data/source/` (original EIGENSTRAT files for reference)
- [ ] Document dataset version, source, splitting criteria, and any curation applied

### 3.2 Populations Lambda

**File**: `infra/lambdas/populations/handler.py`

- [ ] `GET /populations?dataset=v62_ancient` endpoint
- [ ] `GET /populations?dataset=v62_modern` endpoint
  - Load the appropriate `populations.json` from S3 (cache in Lambda memory)
  - Support optional query params: `?search=yamn`, `?region=Steppe`
  - Return population list with metadata

### 3.3 Frontend Population Selection & Modeling UI

**File**: `src/app/dashboard/modeling/page.tsx`

- [ ] Build the qpAdm configuration page with 3 sections:

  **Target selection**:
  - Tab or toggle: "From Ancient Dataset" / "From Modern Dataset" / "My Samples"
  - If ancient/modern: searchable dropdown from that dataset's populations
  - If my samples: dropdown of user's ready samples (max 3)

  **Left populations** (source pops for the admixture model):
  - Dataset selector: "Ancient" or "Modern"
  - Searchable multi-select from the chosen dataset
  - Selected pops displayed as removable chips/tags

  **Right populations** (outgroup/reference pops):
  - Dataset selector: "Ancient" or "Modern"
  - Searchable multi-select from the chosen dataset
  - Selected pops displayed as removable chips/tags

  **Validation**:
  - At least 1 left pop required
  - At least 2 right pops required (right count > left count for qpAdm)
  - Target must be selected
  - "Run qpAdm" button disabled until valid

- [ ] Reusable population search component:
  - Fetch from `/populations?dataset=...` on dataset change
  - Client-side filtering by name, region, time period
  - Group by region or show flat list

### 3.4 Testing

- [ ] Verify populations endpoint returns correct data for both datasets
- [ ] Test search/filter functionality
- [ ] Test target selection from all 3 sources (ancient, modern, user sample)
- [ ] Test population selection UI with large list (hundreds of populations)
- [ ] Test validation rules (right > left, required fields)

---

## Phase 4: qpAdm Compute Pipeline (Weeks 6–8)

### 4.1 R Worker Lambda Setup

- [ ] Create ECR repository for R worker container image
- [ ] Build R worker Docker image (see ARCHITECTURE.md for Dockerfile):
  - Base: `public.ecr.aws/lambda/python:3.11`
  - R 4.3.0 compiled from source
  - ADMIXTOOLS2 R package
  - PLINK 1.9 binary
  - Python boto3 for S3/DynamoDB access
- [ ] Push image to ECR
- [ ] Create Lambda function from container image:
  - Memory: **3072 MB** (3 GB — validated as peak requirement)
  - Timeout: **300 seconds** (5 min — generous buffer over ~3 min expected runtime)
  - Ephemeral storage: 2048 MB (for temp PLINK files)
  - Reserved concurrency: 10 (prevent runaway costs)
  - Execution role: S3 read/write, DynamoDB write
- [ ] Test Lambda cold start time (expect ~10-30s for large container image)

### 4.2 R Worker Implementation

**File**: `infra/worker/run_job.py` (Python orchestrator)

- [ ] Read job parameters from DynamoDB (jobId passed via Lambda event)
- [ ] Update job status to `"running"` in DynamoDB

**PLINK Phase** (dataset preparation):

- [ ] **Step 1 — Download main dataset(s)** from S3 to Lambda `/tmp`
  - Download the appropriate dataset(s) based on where left/right/target pops come from
  - If pops span both ancient and modern datasets, download both
- [ ] **Step 2 — Build keep list**: Parse the `.fam` file to find all individuals belonging to:
  - Left populations
  - Right populations
  - Target population (if target is from a main dataset)
  - Write matching FID/IID lines to `keep.txt`
- [ ] **Step 3 — Extract populations** via PLINK:
  - `plink --bfile v62_ancient --keep keep.txt --allow-no-sex --make-bed --out extracted`
  - Creates a subset containing only the selected populations
- [ ] **Step 4a — If target is a user sample**:
  - Download user's PLINK files from `s3://ioa-user-data/{userId}/samples/{sampleId}/`
  - Merge user sample with extracted ref pops via PLINK `--bmerge`
  - Handle strand mismatches with `--flip` on `.missnp`, then retry
  - Handle remaining mismatches with `--exclude`, then retry
  - Handle duplicate SNPs with PLINK2 `--rm-dup force-first` if needed
- [ ] **Step 4b — If target is from main dataset**:
  - Target already included in the `--keep` extraction, dataset is ready as `extracted`

**qpAdm Phase** (ADMIXTOOLS2 — reads PLINK format directly, no EIGENSTRAT conversion needed):

- [ ] **Step 5** — Run qpAdm via R script:
  ```bash
  Rscript run_qpadm.R /tmp/merged target_label left_pops right_pops
  ```
  - ADMIXTOOLS2 `qpadm()` auto-detects `.bed/.bim/.fam` from the prefix
  - Uses `fudge_twice = TRUE` to match original ADMIXTOOLS p-values
- [ ] **Step 6** — Parse `result.json` output (weights, popdrop, rankdrop)
- [ ] **Step 7** — Upload results to `s3://ioa-job-results/{userId}/{jobId}/result.json`
- [ ] Update DynamoDB job record:
  - `status: "completed"`
  - `resultPayload: { weights, popdrop, f4 }`
  - `completedAt`, `durationSeconds`
- [ ] On error: `status: "failed"`, `errorMessage`

**File**: `infra/worker/run_qpadm.R` (see ARCHITECTURE.md)

### 4.3 Jobs Lambda

**File**: `infra/lambdas/jobs/handler.py`

- [ ] `POST /jobs/qpadm` endpoint
  - Validate: if targetSource is "user_sample", sampleId must exist and status must be "ready"
  - Validate: leftPops and rightPops are valid population IDs in their respective datasets
  - Validate: `len(rightPops) > len(leftPops)` (qpAdm requirement)
  - Create job record in DynamoDB (`status: "queued"`)
  - Invoke R Worker Lambda asynchronously (`InvocationType='Event'`)
  - Store `lambdaRequestId` in job record
  - Return `{ jobId, status: "queued" }`

- [ ] `GET /jobs` endpoint
  - Return all jobs for authenticated user (sorted by `createdAt` desc)
  - Include status, parameters, results (if completed)

- [ ] `GET /jobs/{jobId}` endpoint
  - Return single job with full details and results

- [ ] Rate limiting: max 3 concurrent jobs per user

### 4.4 Frontend Job Management

**File**: `src/app/dashboard/modeling/page.tsx` (extend) and `src/app/dashboard/results/page.tsx`

- [ ] "Run qpAdm" button → `POST /jobs/qpadm`
- [ ] After submission, redirect to results page or show inline status
- [ ] Job status polling (every 10s while status is `queued` or `running`)
- [ ] Results display:
  - **Weights table**: Source populations and their admixture proportions
  - **p-value**: Model fit significance
  - **Standard errors**: For each weight
  - Highlight infeasible models (negative weights, low p-value)
- [ ] Job history list with status badges (queued/running/completed/failed)
- [ ] Re-run with modified parameters

### 4.5 Testing

- [ ] Run qpAdm with known inputs, verify output matches standalone R execution
- [ ] Test with various population combinations
- [ ] Test error handling (invalid combinations, infeasible models)
- [ ] Test concurrent job limits
- [ ] Load test: multiple users submitting jobs simultaneously
- [ ] Test Lambda timeout scenarios (runs approaching 15 min)
- [ ] Test cold start performance with container image

---

## Phase 5: Polish, Security & Launch Prep (Weeks 9–10)

### 5.1 Frontend Polish

- [x] Mobile responsiveness for dashboard pages (responsive padding, stacking, animated hamburger)
- [x] Shared component library (GlowCard, useMouseGlow, CSS variable system)
- [ ] Loading states and skeleton screens for all async operations
- [ ] Error toast/notification system
- [ ] Empty states (no samples, no jobs)
- [ ] Keyboard navigation and accessibility audit
- [ ] SEO meta tags for public pages

### 5.2 Security Hardening

- [ ] Input sanitization on all Lambda endpoints
- [ ] Rate limiting per user on API Gateway
- [ ] File upload validation (check actual content, not just extension)
- [ ] S3 bucket policies: block public access
- [ ] Enable CloudTrail for audit logging
- [ ] Review IAM roles: least-privilege principle
- [ ] Add CAPTCHA to registration (optional, e.g., hCaptcha)
- [ ] Implement account lockout after N failed login attempts
- [ ] Content Security Policy headers

### 5.3 Monitoring & Alerting

- [ ] Set up CloudWatch dashboards:
  - API request volume and latency
  - Lambda errors and duration
  - DynamoDB read/write capacity
- [ ] CloudWatch Alarms:
  - Lambda error rate > 5%
  - API 5xx error rate > 1%
- [ ] Set up billing alerts at $10, $50, $100 thresholds

### 5.4 Deployment Pipeline

- [ ] Update GitHub Actions to deploy frontend to S3 + CloudFront (migrate from GitHub Pages)
- [ ] Set up SAM pipeline for backend deployment (or GitHub Actions with `sam deploy`)
- [ ] Create staging environment
- [ ] Create production environment
- [ ] Set up custom domain with ACM certificate

### 5.5 Documentation

- [ ] API documentation (endpoint reference)
- [ ] User guide: how to download raw files from each provider
- [ ] FAQ updates on the landing page
- [ ] Privacy policy and terms of service (important for handling genetic data)

---

## Phase 6: Post-Launch Enhancements (Future)

- [ ] **Password reset flow** (`POST /auth/forgot-password`, `POST /auth/reset-password`)
- [ ] **OAuth login** (Google, Apple)
- [ ] **Stripe/payment integration** (subscription tiers, per-run pricing)
- [ ] **PCA analysis** (smartPCA from EIGENSOFT, additional ECS task type)
- [ ] **Result visualization** (admixture bar charts, PCA scatter plots using D3/Recharts)
- [ ] **Batch runs** (test multiple models in one go)
- [ ] **Sharing** (shareable result links)
- [ ] **Notification system** (email when job completes, via SNS → SES)
- [ ] **Dataset updates** (versioned reference datasets, re-run jobs against new versions)
- [ ] **Admin dashboard** (user management, job monitoring, cost tracking)
- [ ] **Y-haplogroup analysis** (additional analysis pipeline)
- [ ] **Raw file conversion service** (convert between provider formats, standalone feature)

---

## Key Technical Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Backend framework | Lambda + API Gateway | Express on EC2, FastAPI on ECS | Serverless = zero idle cost, scales to zero |
| Database | DynamoDB | PostgreSQL (RDS), MongoDB | Serverless, pay-per-request, simple key-value access patterns |
| Compute for qpAdm | Lambda (container image) | ECS Fargate, EC2 | 3 GB RAM fits Lambda limits; simpler infra, no VPC/NAT needed; ECS fallback if runs exceed 15 min |
| Auth | Custom JWT | Cognito, Auth0 | Full control, no vendor lock-in, lower cost at scale |
| File upload | S3 presigned URLs | Lambda proxy upload | Avoids Lambda payload limits, direct client-to-S3 |
| Email | Amazon SES | SendGrid, Mailgun | Already in AWS ecosystem, cheapest option |
| IaC | AWS SAM | CDK, Terraform, CloudFormation | SAM is simpler for Lambda-centric architectures |
| Frontend hosting | S3 + CloudFront | Vercel, GitHub Pages | Full AWS ecosystem, custom domain, edge caching |

---

## Estimated AWS Costs (Low Traffic, ~100 Users)

| Service | Monthly Estimate |
|---------|-----------------|
| Lambda (API handlers) | < $1 (free tier covers most) |
| Lambda (R worker, 3 GB) | $2–15 (depends on job frequency and duration) |
| API Gateway | < $1 |
| DynamoDB | < $1 (on-demand, low volume) |
| S3 | $1–5 (depends on upload volume) |
| ECR | < $1 (image storage) |
| SES | < $1 |
| CloudFront | < $1 |
| **Total** | **~$5–25/month** |

> **Cost savings vs ECS approach**: No ECS cluster, no NAT Gateway ($32+/month saved), no VPC endpoints needed. Lambda-only architecture dramatically reduces fixed costs.

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| qpAdm crashes on edge-case inputs | Job fails, bad UX | Validate inputs, wrap R in try/catch, return meaningful errors |
| Large reference dataset = slow S3 downloads | Slow job start | Pre-stage dataset on EFS mounted to ECS, or use S3 Transfer Acceleration |
| User uploads malicious files | Security breach | Validate file content server-side, run conversion in sandboxed container |
| Genetic data privacy regulations | Legal risk | Encrypt at rest + transit, data retention policy, privacy policy, consider GDPR if serving EU |
| AWS bill spikes | Financial | Budget alerts, per-user job rate limits, Fargate spot for non-urgent jobs |
| Cold starts on Lambda | Slow first request | Provisioned concurrency for auth Lambda (or accept ~1s cold start) |

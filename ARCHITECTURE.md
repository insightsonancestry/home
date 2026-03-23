# Insights on Ancestry — System Architecture

## Overview

A B2C SaaS platform that lets users upload consumer DNA raw files and run **qpAdm** (ADMIXTOOLS2, R) against curated academic reference datasets. The system uses a **Next.js** frontend, **serverless Python** backend on AWS (Lambda + API Gateway + DynamoDB), and an **R compute layer** for genetic analysis.

---

## High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                   │
│                    Next.js 14 + Tailwind                            │
│         (Landing Page, Auth Pages, Dashboard, Results)              │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AWS API GATEWAY                                │
│              (REST API, JWT Authorizer, CORS)                       │
└──────────┬──────────┬──────────┬──────────┬─────────────────────────┘
           │          │          │          │
           ▼          ▼          ▼          ▼
      ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐
      │ Auth   │ │ Upload │ │ Jobs   │ │ Populations│
      │ Lambda │ │ Lambda │ │ Lambda │ │ Lambda     │
      └───┬────┘ └───┬────┘ └───┬────┘ └─────┬──────┘
          │          │          │              │
          ▼          ▼          ▼              ▼
     ┌─────────┐ ┌──────┐ ┌──────────┐  ┌─────────┐
     │DynamoDB │ │ S3   │ │ R Worker │  │ S3      │
     │ Users   │ │Uploads│ │ Lambda   │  │Ref Data │
     │ Jobs    │ │      │ │(3GB,15m) │  │         │
     └─────────┘ └──────┘ └──────────┘  └─────────┘
                               │
                          R + PLINK
                          container
                            image
```

---

## Component Details

### 1. Frontend (Next.js 14)

**Status**: Landing page, signup/login, and dashboard Samples/Labels section built. No backend wiring yet.

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Landing page (fixed navbar, hero, features, FAQ, footer) | No |
| `/signup` | Registration + OTP + Login (multi-step with AuthCard glow effect) | No |
| `/dashboard` | User dashboard (sidebar navigation, section-based content) | Yes |

**Dashboard Sections** (sidebar navigation, not separate routes):

| Section | Status | Purpose |
|---------|--------|---------|
| Samples/Labels | Built | Upload samples (max 3), edit labels across datasets, download .fam files |
| DIY Modeling | Planned | qpAdm configuration + run |
| Assisted Modeling | Planned | Guided modeling workflow |
| Learning Materials | Planned | Educational content |

**Key Frontend Responsibilities**:
- Auth state management (JWT stored in httpOnly cookie or secure localStorage)
- Guarded routes (redirect to `/signup` if unauthenticated)
- File upload with progress indicator (direct-to-S3 presigned URL)
- Population selection UI (searchable multi-select for left/right/target pops)
- Label editing across all 3 datasets (user, ancient, modern)
- Job status polling or WebSocket subscription
- Results display (tables, charts)

**Shared UI Components**:
- `GlowCard` — reusable card with gradient top edge, mouse-follow accent border, entrance animation
- `useMouseGlow` hook — extracted mouse-follow border effect (used by GlowCard, AuthCard, Feature cards)
- CSS variables for all colors (`--accent-rgb`, `--accent-subtle`, `--error-rgb`, etc.) — no hardcoded rgba values

**State Management**: React Context or Zustand for auth + job state.

---

### 2. Authentication System

#### Flow

```
┌──────────┐    POST /auth/register     ┌────────────┐
│  Signup  │ ──────────────────────────► │ Auth Lambda │
│  Form    │                             │             │
└──────────┘                             │ 1. Validate │
                                         │ 2. Hash pwd │
      ┌──────────────────────────────────│ 3. Store in │
      │       OTP via Amazon SES         │    DynamoDB │
      ▼                                  │ 4. Send OTP │
┌──────────┐    POST /auth/verify-otp   └─────────────┘
│  OTP     │ ──────────────────────────►
│  Input   │                            ┌─────────────┐
└──────────┘                            │ Verify OTP  │
                                        │ Mark email  │
      ┌─────────────────────────────────│ verified    │
      │       JWT returned              └─────────────┘
      ▼
┌──────────┐    POST /auth/login
│  Login   │ ──────────────────────────► Validate creds → Return JWT
│  Form    │
└──────────┘
```

#### Implementation Details

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| Password hashing | bcrypt (via `passlib`) | Industry standard, cost-tunable |
| Token format | JWT (RS256) | Stateless, API Gateway native authorizer |
| Token storage | httpOnly cookie | XSS-resistant |
| Token expiry | Access: 1h, Refresh: 30d | Balance security and UX |
| OTP delivery | Amazon SES | Cost-effective, already in AWS ecosystem |
| OTP expiry | 10 minutes | Standard practice |
| OTP format | 6-digit numeric | Matches existing UI |

#### DynamoDB Users Table

```
Table: ioa-users
──────────────────────────────────────────────────────
PK (Partition Key): email (String)
SK (Sort Key):      "PROFILE"

Attributes:
  - userId          (String, UUID)
  - firstName       (String)
  - middleName      (String, optional)
  - lastName        (String)
  - username        (String)
  - country         (String)
  - passwordHash    (String)
  - emailVerified   (Boolean)
  - otpCode         (String, encrypted)
  - otpExpiresAt    (Number, epoch)
  - createdAt       (String, ISO 8601)
  - updatedAt       (String, ISO 8601)

GSI-1: username-index
  PK: username
  Projection: ALL
```

---

### 3. File Upload Pipeline

#### Flow

```
Frontend                    Upload Lambda                S3                  Processing
   │                             │                       │                       │
   │  POST /upload/presign       │                       │                       │
   │  {filename, fileType}       │                       │                       │
   │ ───────────────────────────►│                       │                       │
   │                             │  Generate presigned   │                       │
   │                             │  PUT URL              │                       │
   │  ◄──────────────────────────│                       │                       │
   │  {uploadUrl, fileKey}       │                       │                       │
   │                             │                       │                       │
   │  PUT (direct upload)        │                       │                       │
   │ ────────────────────────────┼──────────────────────►│                       │
   │                             │                       │                       │
   │  POST /upload/confirm       │                       │                       │
   │  {fileKey}                  │                       │                       │
   │ ───────────────────────────►│                       │                       │
   │                             │  Validate file exists │                       │
   │                             │  Trigger conversion   │──────────────────────►│
   │                             │  Store metadata in DB │                       │
   │  ◄──────────────────────────│                       │                       │
   │  {sampleId, status}         │                       │                       │
```

#### Supported Formats & Conversion Pipeline

Each provider's raw format is parsed, normalized, and converted to PLINK binary format. The conversion pipeline will handle provider-specific quirks (header formats, column layouts, no-call representations, strand issues).

| Provider | Raw Format | Key Characteristics |
|----------|-----------|---------------------|
| 23andMe | TXT | 4-col: `rsid  chr  pos  genotype` |
| AncestryDNA | TXT | 5-col: `rsid  chr  pos  allele1  allele2` |
| FTDNA | CSV | CSV with header, multiple format versions |
| MyHeritage | CSV | CSV with header |
| LivingDNA | TSV | Tab-separated with header |
| FamilyFinder | CSV | Separate allele columns |

#### Conversion → PLINK Pipeline (with error recovery)

```
Raw consumer DNA file
      │
      ▼
Parse & normalize to intermediate format             ← Handle provider-specific formats
      │
      ▼
plink --23file normalized.txt --make-bed --out raw   ← Convert to PLINK binary
      │
      ▼
plink --bfile raw --extract plink.snplist --make-bed --out filtered   ← Filter to curated SNP list
      │
      ▼
Validate & clean                                     ← Handle strand issues, duplicates, no-calls
      │
      ├── Strand mismatches → plink --flip missnp file → retry
      ├── Duplicate SNPs → plink2 --rm-dup force-first → retry
      └── Triallelic SNPs → plink --exclude → retry
      │
      ▼
Final user sample PLINK fileset (.bed/.bim/.fam)
```

**Key PLINK flags used**: `--allow-no-sex`, `--23file`, `--extract`, `--make-bed`, `--flip`, `--exclude`, `--rm-dup force-first` (PLINK2), `--bmerge`, `--indiv-sort 0`.

#### User Sample Limits

- **Max 3 samples per user** (enforced server-side)
- Users can **rename**, **delete**, and **replace** samples
- Each uploaded raw file is converted to PLINK format and stored as a named sample in the user's dataset

#### S3 Bucket Structure

```
s3://ioa-user-data/
  └── {userId}/
      ├── raw/                              ← original uploads (kept for re-conversion if needed)
      │   └── {sampleId}_{originalFilename}
      └── samples/                          ← converted PLINK datasets (max 3)
          └── {sampleId}/
              ├── {sampleLabel}.bed
              ├── {sampleLabel}.bim
              └── {sampleLabel}.fam

s3://ioa-reference-data/
  ├── v62_ancient/                          ← Harvard AADR v62 ancient samples (pre-split)
  │   ├── v62_ancient.bed
  │   ├── v62_ancient.bim
  │   ├── v62_ancient.fam
  │   └── populations.json                 ← population index derived from .fam/.ind
  ├── v62_modern/                           ← Harvard AADR v62 modern samples (pre-split)
  │   ├── v62_modern.bed
  │   ├── v62_modern.bim
  │   ├── v62_modern.fam
  │   └── populations.json
  ├── snplist/
  │   └── plink.snplist                     ← curated SNP list for --extract filtering
  └── source/                               ← original AADR files (for reference/rebuild)
      ├── v62.0_1240k_public.geno           ← EIGENSTRAT genotype (~5.4 GB)
      ├── v62.0_1240k_public.snp
      ├── v62.0_1240k_public.ind
      └── v62.0_1240k_public.anno

s3://ioa-job-results/
  └── {userId}/
      └── {jobId}/
          └── result.json
```

#### DynamoDB Samples Table

```
Table: ioa-samples
──────────────────────────────────────────────────────
PK: userId (String)
SK: sampleId (String, "SAMPLE#<uuid>")

Attributes:
  - sampleLabel      (String, user-editable display name, e.g. "MySample_v1")
  - originalFilename (String)
  - provider         (String: "23andme" | "ancestry" | "livingdna" | "ftdna" | "myheritage")
  - s3RawKey         (String)
  - s3SamplePrefix   (String, path to PLINK fileset)
  - snpCount         (Number)
  - status           (String: "uploaded" | "converting" | "ready" | "error")
  - errorMessage     (String, optional)
  - slotIndex        (Number: 1 | 2 | 3)
  - uploadedAt       (String, ISO 8601)
  - processedAt      (String, ISO 8601, optional)
```

---

### 4. qpAdm Execution Pipeline

#### Flow

```
Frontend                  Jobs Lambda              DynamoDB           R Worker Lambda
   │                          │                       │                       │
   │  POST /jobs/qpadm        │                       │                       │
   │  {targetSource,          │                       │                       │
   │   targetPop,             │  (targetSource:       │                       │
   │   leftPops[],            │   "v62_ancient" |     │                       │
   │   rightPops[],           │   "v62_modern"  |     │                       │
   │   sampleId?}             │   "user_sample")      │                       │
   │ ────────────────────────►│                       │                       │
   │                          │  Validate params      │                       │
   │                          │  Create job record    │                       │
   │                          │ ──────────────────────►│                       │
   │                          │                       │                       │
   │                          │  Invoke R Worker      │                       │
   │                          │  Lambda (async)       │                       │
   │                          │ ──────────────────────┼──────────────────────►│
   │  ◄────────────────────── │                       │                       │
   │  {jobId, status:queued}  │                       │                       │
   │                          │                       │        ┌──────────────┤
   │                          │                       │        │ PLINK PHASE: │
   │                          │                       │        │ 1. Download  │
   │                          │                       │        │    main      │
   │                          │                       │        │    dataset(s)│
   │                          │                       │        │    from S3   │
   │                          │                       │        │ 2. Extract   │
   │                          │                       │        │    left+right│
   │                          │                       │        │    pops via  │
   │                          │                       │        │    PLINK     │
   │                          │                       │        │    --keep    │
   │                          │                       │        │ 3. If target │
   │                          │                       │        │    is user   │
   │                          │                       │        │    sample:   │
   │                          │                       │        │    download  │
   │                          │                       │        │    user PLINK│
   │                          │                       │        │    & merge   │
   │                          │                       │        │    with      │
   │                          │                       │        │    extracted │
   │                          │                       │        │    ref pops  │
   │                          │                       │        │ 4. If target │
   │                          │                       │        │    is from   │
   │                          │                       │        │    main ds:  │
   │                          │                       │        │    include   │
   │                          │                       │        │    in --keep │
   │                          │                       │        │              │
   │                          │                       │        │ QPADM PHASE: │
   │                          │                       │        │ 5. Run qpAdm │
   │                          │                       │        │    on merged │
   │                          │                       │        │    dataset   │
   │                          │                       │        │ 6. Upload    │
   │                          │                       │        │    results   │
   │                          │                       │◄───────┤ 7. Update DB │
   │                          │                       │        └──────────────┘
   │  GET /jobs/{jobId}       │                       │
   │ ────────────────────────►│  Read job status      │
   │                          │ ──────────────────────►│
   │  ◄──────────────────────│                       │
   │  {status, results}      │                       │
```

#### Target Source Logic

| Target Source | What Happens |
|--------------|--------------|
| `v62_ancient` or `v62_modern` | Target pop is included in the PLINK `--keep` extraction from the main dataset along with left/right pops. No merge needed. |
| `user_sample` | Left/right pops are extracted from main dataset(s) via PLINK `--keep`. User's sample PLINK files are downloaded separately. Then both are merged via PLINK `--bmerge` to create the final analysis dataset. |

#### Lambda vs ECS/Fargate for R Worker

| Concern | Lambda | ECS/Fargate |
|---------|--------|-------------|
| Max runtime | 15 min | Unlimited |
| Memory | 10 GB max | Up to 30 GB |
| Disk | 10 GB `/tmp` | Configurable EBS |
| R runtime | Container image (up to 10 GB) | Docker image |
| PLINK binary | Included in container image | Docker image |
| Cold start | ~10-30s with container image | Task launch ~30-60s |
| Cost | Per-invocation (cheaper at low volume) | Per-second |
| Complexity | Simpler (no VPC/cluster needed) | More infra to manage |

**Peak memory requirement**: ~3 GB RAM.

**Recommendation**: Start with **Lambda** (container image deployment). 3 GB RAM is well within Lambda's 10 GB limit. Package R, ADMIXTOOLS2, and PLINK into a Docker container image deployed to Lambda. This eliminates the need for ECS cluster, VPC, NAT Gateway, and significantly reduces infrastructure complexity and cost.

**Expected runtime**: ~3 minutes max per qpAdm run, well within Lambda's 15-minute limit.

#### R Worker Container Image

```dockerfile
FROM public.ecr.aws/lambda/python:3.11

# Install system dependencies for R and PLINK
RUN yum install -y \
    gcc gcc-c++ gcc-gfortran make wget unzip \
    libcurl-devel openssl-devel libxml2-devel \
    gsl-devel openblas-devel lapack-devel \
    readline-devel xz-devel bzip2-devel zlib-devel

# Install R from source (Amazon Linux 2 base)
RUN wget https://cran.r-project.org/src/base/R-4/R-4.3.0.tar.gz \
    && tar xzf R-4.3.0.tar.gz && cd R-4.3.0 \
    && ./configure --with-blas --with-lapack --enable-R-shlib \
    && make -j$(nproc) && make install && cd .. && rm -rf R-4.3.0*

# Install PLINK 1.9 + PLINK2 (needed for --rm-dup)
RUN wget https://s3.amazonaws.com/plink1-assets/plink_linux_x86_64_latest.zip \
    && unzip plink_linux_x86_64_latest.zip -d /usr/local/bin/ \
    && rm plink_linux_x86_64_latest.zip
RUN wget https://s3.amazonaws.com/plink2-assets/alpha5/plink2_linux_x86_64_20240625.zip \
    && unzip plink2_linux_x86_64_*.zip -d /usr/local/bin/ \
    && rm plink2_linux_x86_64_*.zip

# Install R packages
RUN R -e "install.packages(c('remotes', 'jsonlite'), repos='https://cran.r-project.org')" \
    && R -e "remotes::install_github('uqrmaie1/admixtools')"

# Install Python dependencies
RUN pip3 install boto3

COPY worker/ ${LAMBDA_TASK_ROOT}/
WORKDIR ${LAMBDA_TASK_ROOT}

# Lambda handler
CMD ["run_job.handler"]
```

**Image size note**: ~2-4 GB. Lambda supports up to 10 GB container images. Cold start ~10-30s, cached after first invocation.

**Included tools**:
- PLINK 1.9 (main operations)
- PLINK2 (for `--rm-dup force-first`)
- R 4.3 + ADMIXTOOLS2 + jsonlite
- Custom Python conversion/pipeline scripts

#### R Worker Script (`run_qpadm.R`)

ADMIXTOOLS2 auto-detects PLINK format (`.bed/.bim/.fam`) from the file prefix — no EIGENSTRAT conversion needed.

```r
library(admixtools)

args <- commandArgs(trailingOnly = TRUE)
prefix    <- args[1]   # path to PLINK fileset prefix (e.g., "/tmp/merged")
target    <- args[2]   # target population label
left_str  <- args[3]   # comma-separated left pops
right_str <- args[4]   # comma-separated right pops

left  <- strsplit(left_str, ",")[[1]]
right <- strsplit(right_str, ",")[[1]]

result <- qpadm(
  prefix,
  left   = left,
  right  = right,
  target = target,
  fudge_twice = TRUE    # match original ADMIXTOOLS p-values
)

# Write results to JSON
output <- list(
  weights  = as.data.frame(result$weights),   # target, left, weight, se, z
  popdrop  = as.data.frame(result$popdrop),   # pat, wt, dof, chisq, p, feasible
  rankdrop = as.data.frame(result$rankdrop)   # f4rank, dof, chisq, p
)

jsonlite::write_json(output, "result.json", pretty = TRUE)
```

#### Performance Optimization: f2 Precomputation

For repeated qpAdm runs (many users running models against the same reference populations), precomputing f2 statistics dramatically reduces runtime:

```r
# Offline: precompute f2 blocks for the full reference dataset (run once per dataset update)
extract_f2(
  pref = "/path/to/v62_ancient",
  outdir = "/path/to/v62_ancient_f2/",
  blgsize = 0.05,
  maxmiss = 0,
  adjust_pseudohaploid = TRUE
)

# At runtime: load only the needed populations (fast)
f2 <- f2_from_precomp("/path/to/f2_dir/", pops = c(target, left, right))
result <- qpadm(f2, left = left, right = right, target = target)
```

**Trade-off**: Precomputed f2 works only for populations already in the reference dataset. When the target is a user sample (not in precomputed f2), qpAdm must compute f2 on the fly from the merged PLINK fileset. Consider precomputing f2 for reference-only runs as a future optimization.

#### DynamoDB Jobs Table

```
Table: ioa-jobs
──────────────────────────────────────────────────────
PK: userId (String)
SK: jobId (String, "JOB#<uuid>")

Attributes:
  - targetSource     (String: "v62_ancient" | "v62_modern" | "user_sample")
  - targetPop        (String, population label or user sample label)
  - sampleId         (String, optional — only if targetSource is "user_sample")
  - leftPops         (List<String>)
  - leftPopsDataset  (String: "v62_ancient" | "v62_modern")
  - rightPops        (List<String>)
  - rightPopsDataset (String: "v62_ancient" | "v62_modern")
  - status           (String: "queued" | "running" | "completed" | "failed")
  - lambdaRequestId  (String)
  - s3ResultKey      (String, optional)
  - resultPayload    (Map, optional — denormalized for fast reads)
  - errorMessage     (String, optional)
  - createdAt        (String, ISO 8601)
  - startedAt        (String, ISO 8601, optional)
  - completedAt      (String, ISO 8601, optional)
  - durationSeconds  (Number, optional)

GSI-1: status-index
  PK: status
  SK: createdAt
  Projection: KEYS_ONLY
```

---

### 5. Populations API

The frontend needs population lists from two main datasets (for left/right/target) plus the user's own samples (for target only).

#### Endpoints

```
GET /populations?dataset=v62_ancient
GET /populations?dataset=v62_modern
Response: {
  "dataset": "v62_ancient",
  "populations": [
    {
      "id": "Yamnaya_Samara",
      "label": "Yamnaya Samara",
      "region": "Steppe",
      "timePeriod": "Bronze Age",
      "sampleCount": 12
    },
    ...
  ]
}

GET /samples              ← returns user's own samples (max 3)
Response: {
  "samples": [
    {
      "sampleId": "abc123",
      "sampleLabel": "MySample_Italian",
      "status": "ready",
      "snpCount": 620000
    },
    ...
  ]
}
```

#### Selection Rules

| Field | Source Options | Notes |
|-------|--------------|-------|
| **Target** | v62_ancient, v62_modern, OR user sample | User picks from any of the three sources |
| **Left pops** | v62_ancient OR v62_modern | Must come from main datasets only |
| **Right pops** | v62_ancient OR v62_modern | Must come from main datasets only |

#### Source

A `populations.json` file stored in S3 alongside each reference dataset. Generated offline whenever the reference dataset is updated. Cached in Lambda memory across invocations.

---

### 6. AWS Services Summary

| Service | Purpose | Estimated Cost |
|---------|---------|----------------|
| **API Gateway** | REST API, JWT auth, rate limiting | $3.50/million requests |
| **Lambda** (Python) | Auth, upload, jobs, populations endpoints | $0.20/million invocations |
| **Lambda** (R container) | qpAdm compute worker (~3 GB RAM, ~3 min runtime) | ~$0.05/GB-second |
| **DynamoDB** | Users, samples, jobs tables | On-demand: ~$1.25/million writes |
| **S3** | Raw uploads, processed data, reference data, results | ~$0.023/GB/month |
| **ECR** | Docker image registry for R worker | $0.10/GB/month |
| **SES** | OTP emails, notifications | $0.10/1000 emails |
| **CloudWatch** | Logging, monitoring, alarms | Varies |
| **IAM** | Service roles and policies | Free |

---

### 7. Security Considerations

| Area | Measure |
|------|---------|
| **Auth** | bcrypt hashing, JWT RS256, httpOnly cookies, refresh token rotation |
| **API** | Rate limiting via API Gateway (per-user throttle), input validation |
| **Upload** | Presigned URLs (expire in 15 min), file size limit (50 MB), content-type validation |
| **Data at rest** | S3 SSE-S3 encryption, DynamoDB encryption enabled by default |
| **Data in transit** | TLS 1.2+ enforced on all endpoints |
| **CORS** | Restrict to `insightsonancestry.github.io` and custom domain |
| **Secrets** | AWS Secrets Manager for JWT signing keys |
| **Compute** | Lambda functions in AWS-managed environment, no VPC needed |
| **File validation** | Server-side format validation before processing |

---

### 8. Infrastructure as Code

Use **AWS SAM** (Serverless Application Model) or **AWS CDK** (Python) to define all infrastructure.

```
infra/
├── template.yaml          # SAM template (or cdk/ directory)
├── lambdas/
│   ├── auth/
│   │   ├── handler.py
│   │   └── requirements.txt
│   ├── upload/
│   │   ├── handler.py
│   │   └── requirements.txt
│   ├── jobs/
│   │   ├── handler.py
│   │   └── requirements.txt
│   └── populations/
│       ├── handler.py
│       └── requirements.txt
├── worker/
│   ├── Dockerfile
│   ├── run_job.py         # Python orchestrator
│   ├── run_qpadm.R        # R script
│   ├── convert_raw.py     # Raw file → PLINK conversion
│   └── requirements.txt
└── scripts/
    ├── deploy.sh
    └── build_worker.sh
```

---

### 9. Monitoring & Observability

- **CloudWatch Logs**: All Lambda function logs
- **CloudWatch Metrics**: API latency, error rates, Lambda duration
- **CloudWatch Alarms**: Job failure rate > 5%, API 5xx rate > 1%
- **X-Ray**: Distributed tracing across API Gateway → Lambda → DynamoDB
- **Custom Metrics**: Jobs completed/day, average qpAdm runtime, upload success rate

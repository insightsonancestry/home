# Plan: qpAdm Pipeline

## The Problem

The `.bed` files are **5.4 GB (1240K)** and **3.2 GB (HO)**. Lambda has 10 GB `/tmp` max. We can't download the full `.bed` + `.bim` + run extraction + run qpAdm all in one Lambda — it won't fit.

## Solution: EFS (Elastic File System)

Mount the reference datasets on EFS. Both Lambdas access the same filesystem — no downloading multi-GB files on every invocation. The reference data lives on EFS permanently, Lambdas read it directly.

## Architecture

```
EFS: /mnt/data/
├── v62_1240k/
│   ├── v62.0_1240k_public.bed  (5.4 GB)
│   ├── v62.0_1240k_public.bim  (57 MB)
│   └── v62.0_1240k_public.fam  (728 KB)
└── v62_HO/
    ├── v62.0_HO_public.bed     (3.2 GB)
    ├── v62.0_HO_public.bim     (27 MB)
    └── v62.0_HO_public.fam     (867 KB)
```

## Pipeline (3 steps, 2 Lambdas)

**Step 1: Extract samples (ioa-plink Lambda)**
- Download user's `.fam` from S3 (`{userId}_1240K.fam`)
- Parse it to find all individuals matching the selected source/reference/target labels
- Create a PLINK `--keep` file with those individuals
- Run: `plink --bed /mnt/data/v62_1240k/...bed --bim /mnt/data/v62_1240k/...bim --fam {user}.fam --keep keepfile.txt --make-bed --out /tmp/extracted`
- Upload extracted `.bed/.bim/.fam` to `s3://{userId}/qpadm/datasets/temp_{runId}.*`

**Step 2: Run qpAdm (ioa-admixtools Lambda)**
- Download the extracted temp dataset from S3 to `/tmp/`
- Generate and run this R script:
```r
library(admixtools)
result <- qpadm("/tmp/extracted", left, right, target, return_f4 = TRUE)
# Format weights, rankdrop, popdrop, gendstat
# Write to /tmp/output.txt
```
- Upload output to `s3://{userId}/qpadm/outputs/{runId}.txt`
- Return results to frontend

**Step 3: Cleanup**
- Delete temp extracted files from S3

## Scripts to Create

1. **`infra/docker/plink/scripts/extract_samples.py`** — Python script that:
   - Reads the user's `.fam` file
   - Filters individuals by selected population labels
   - Writes a PLINK `--keep` file
   - Runs PLINK `--keep --make-bed` to extract

2. **`infra/docker/admixtools/scripts/run_qpadm.R`** — R script that:
   - Takes prefix, left, right, target as args
   - Runs `qpadm()` with `return_f4 = TRUE`
   - Prints weights, rankdrop, popdrop, gendstat in your format
   - Writes output to a text file

3. **Update `infra/docker/plink/handler.mjs`** — Add `action: "extract"`
4. **Update `infra/docker/admixtools/handler.mjs`** — Add `action: "qpadm"`

## API Route

**`POST /api/samples/qpadm`** — orchestrates the full pipeline:
1. Validates inputs (dataset, sources, references, target)
2. Invokes `ioa-plink` Lambda with `action: "extract"` (sync, waits for result)
3. Invokes `ioa-admixtools` Lambda with `action: "qpadm"` (sync, waits for result)
4. Returns the qpAdm output text to the frontend
5. Triggers cleanup async

## Frontend

- `ConfigureModelBox` already sends dataset, sources, references, target, pValue
- `DIYModelingSection.handleRun` calls `POST /api/samples/qpadm` instead of mock
- `ModelOutputBox` renders the real output text + pie chart from weights

## Key Decision: EFS vs Lambda-only

Without EFS, we'd need to download 5.4 GB on every run — slow and barely fits in Lambda. With EFS:
- Reference data loaded once, persists permanently
- Both Lambdas read directly from `/mnt/data/` — instant access
- Costs ~$0.30/GB/month (~$2.50/month for both datasets)

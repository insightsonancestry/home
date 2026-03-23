# Plan: Raw File Upload & Sample Management

## What already exists
- **`ManageSamplesBox.tsx`** — UI for upload is built (label input, provider pills, drag-and-drop zone, disabled state at 3 samples)
- **`MAX_SAMPLES = 3`** constant in `src/constants/dashboard.ts`
- **`Sample` interface** with `id, label, provider, status, uploadedAt`
- **`ioa-users` DynamoDB table** — user profiles
- **`ioa-reference-data` S3 bucket** — single bucket for all data (reference + user uploads)
- **Auth system** — fully wired (Cognito + JWT cookies + middleware)

## Database Schema

### `ioa-users` table (existing — add `sampleCount`)
| Field        | Type   | Source                  |
|-------------|--------|-------------------------|
| userId      | String | Cognito (partition key)  |
| email       | String | Cognito signup           |
| firstName   | String | Cognito signup           |
| middleName  | String | Cognito signup (optional)|
| lastName    | String | Cognito signup           |
| country     | String | Cognito signup           |
| password    | —      | Managed by Cognito (never in DynamoDB) |
| **sampleCount** | **Number** | **NEW — 0 to 3, incremented on upload, decremented on delete** |

### `ioa-samples` table (new)
| Field       | Type   | Description                              |
|------------|--------|------------------------------------------|
| userId     | String | Partition key — links to user             |
| sampleId   | String | Sort key — deterministic: `{userId}_1`, `{userId}_2`, `{userId}_3` |
| label      | String | User-provided sample label                |
| provider   | String | 23andme / ancestry / ftdna / myheritage / livingdna |
| s3Key      | String | S3 object key for the raw file            |
| status     | String | uploading / ready / error                 |
| uploadedAt | String | ISO timestamp                             |
| fileSize   | Number | File size in bytes                        |

**Sample ID assignment**: When uploading, find the lowest available slot (1, 2, or 3). E.g., if `{userId}_1` and `{userId}_3` exist, the next upload gets `{userId}_2`.

## What needs to be built

### 1. Infrastructure (CDK)

**New DynamoDB table: `ioa-samples`**
- Partition key: `userId` (String)
- Sort key: `sampleId` (String)
- Billing: on-demand
- Removal policy: RETAIN

**Update `ioa-users` table**
- Add `sampleCount` attribute (initialized to 0 by post-confirmation Lambda)

**Update existing `ioa-reference-data` S3 bucket**
- Add CORS configuration to allow PUT from your domain (for presigned URL uploads)
- Add lifecycle rule: delete incomplete multipart uploads after 1 day
- Prefix layout:
  ```
  ioa-reference-data/
  ├── reference/                              ← AADR datasets, modern/ancient
  └── users/{userId}/{sampleId}/raw/{filename} ← user uploads
  ```

### 2. Backend — Next.js API Routes

**`POST /api/samples/presign`** — Get a presigned S3 upload URL
- Auth: verify JWT from cookie
- Read `sampleCount` from `ioa-users` → reject if >= 3
- Find lowest available slot (1–3) by querying `ioa-samples`
- Assign `sampleId` = `{userId}_{slot}`
- Create a presigned PUT URL for S3 (expires in 15 min)
- Write a DynamoDB record to `ioa-samples` with `status: "uploading"`
- Increment `sampleCount` on `ioa-users`
- Return: `{ sampleId, uploadUrl, expiresIn }`

**`POST /api/samples/confirm`** — Confirm upload completed
- Auth: verify JWT
- Verify the S3 object exists (HeadObject)
- Update DynamoDB record: `status: "ready"`, set `fileSize`
- Return: updated sample object

**`GET /api/samples`** — List user's samples
- Auth: verify JWT
- Query `ioa-samples` by `userId`
- Also return `sampleCount` from `ioa-users`
- Return: `{ samples: [...], sampleCount }`

**`DELETE /api/samples/[id]`** — Delete a sample
- Auth: verify JWT
- Verify the sample belongs to this user
- Delete the S3 object
- Delete the DynamoDB record from `ioa-samples`
- Decrement `sampleCount` on `ioa-users`
- Return: `{ success: true, sampleCount }`

### 3. Frontend Wiring

**`ManageSamplesBox.tsx`** — Wire the existing UI:
1. On submit: call `POST /api/samples/presign` with `{ label, provider, fileName }`
2. Upload file directly to S3 using the presigned URL (PUT request from browser)
3. Show upload progress via `XMLHttpRequest` progress events
4. On S3 upload complete: call `POST /api/samples/confirm`
5. Refresh sample list and `sampleCount`

**`SamplesSection.tsx`** — Wire sample list + delete:
1. On mount: call `GET /api/samples` to load user's samples + sampleCount
2. Display samples with their status and assigned IDs
3. Each sample gets a delete button (trash icon)
4. Delete button calls `DELETE /api/samples/{id}`, then refreshes list
5. Pass `sampleCount` to `ManageSamplesBox` so it disables at 3

## Flow Summary

```
User picks provider → enters label → drops file
        ↓
Frontend: POST /api/samples/presign  (checks sampleCount < 3, assigns slot)
        ↓
Frontend: PUT to S3 presigned URL  (direct browser upload, shows progress)
        ↓
Frontend: POST /api/samples/confirm  (marks as ready)
        ↓
Sample appears in list, sampleCount updated in UI

User clicks delete → DELETE /api/samples/{id}
  → S3 object deleted
  → DynamoDB sample record deleted
  → sampleCount decremented
  → upload re-enabled if count drops below 3
```

## Key decisions

1. **Presigned URL upload** — file goes directly from browser to S3, never touches your Next.js server. Avoids Lambda/API size limits.
2. **Count enforcement server-side** — `sampleCount` checked in `/presign` before issuing a URL, can't be bypassed from client.
3. **Deterministic sample IDs** — `{userId}_1`, `{userId}_2`, `{userId}_3` instead of random UUIDs. Predictable, easy to reason about.
4. **`sampleCount` on user record** — avoids counting samples via query every time; stays in sync via increment/decrement on upload/delete.
5. **Single S3 bucket** — `ioa-reference-data` holds both reference data and user uploads, separated by prefix.
6. **No conversion pipeline yet** — raw file stored and marked `ready`. PLINK conversion added later as a separate step.

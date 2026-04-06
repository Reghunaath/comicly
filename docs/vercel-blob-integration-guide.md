# Vercel Blob — Integration Guide

> Last researched: April 2026. Docs: https://vercel.com/docs/vercel-blob

---

## Overview

Vercel Blob is a serverless object storage service built into the Vercel platform. It stores arbitrary files (images, video, audio, documents, JSON, etc.) and serves them via a globally distributed CDN. Files are referred to as "blobs" after upload.

**Primary use cases:**
- User-uploaded assets (avatars, cover images, screenshots)
- Large binary files (video/audio) served over the global network
- Build-time asset storage
- Dynamic file generation stored for later retrieval

There are two upload modes:
- **Server upload** — file travels through your server then to Blob (simpler, adds latency and data transfer cost)
- **Client upload** — file goes browser → Blob directly, secured by a server-side token exchange (preferred for files > 4.5 MB)

---

## How to Get an API Key

1. **Sign up / log in** at https://vercel.com/signup (GitHub, GitLab, Bitbucket, or email)
2. **Verify your email** if signing up with email (confirmation link sent immediately)
3. **Create a Blob store:**
   - Open your project → **Storage** tab in the sidebar
   - Click **Create Database** → **Blob**
   - Choose **Private** or **Public** access, give it a name, click **Create a new Blob store**
   - Select which environments (Production / Preview / Development) get the token
4. The dashboard automatically creates the `BLOB_READ_WRITE_TOKEN` environment variable on your project
5. **Pull it locally:**
   ```bash
   vercel env pull
   ```
   This writes it to `.env.local`.

**Free tier (Hobby plan) limits:**
- 5 GB storage included
- 100 GB data transfer included
- 10K advanced operations / month included
- 100K simple operations / month included
- Rate limits: 1,200 simple ops/min, 900 advanced ops/min
- Exceeding limits suspends access until the 30-day window resets (no overage charges)

**Env var convention:**
```bash
# .env.local
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxxxx"
```

Never commit this value. Add `.env.local` to `.gitignore`.

---

## Authentication

All SDK methods authenticate via the `BLOB_READ_WRITE_TOKEN` env var by default when deployed on Vercel. You never need to pass the token explicitly in most cases.

```ts
import { put } from '@vercel/blob';

// Token is read automatically from process.env.BLOB_READ_WRITE_TOKEN
const blob = await put('filename.png', fileBody, { access: 'public' });
```

To override (e.g., cross-project or non-Vercel deployment):
```ts
const blob = await put('filename.png', fileBody, {
  access: 'public',
  token: process.env.MY_CUSTOM_BLOB_TOKEN,
});
```

For **client uploads**, the server generates a short-lived client token via `handleUpload` — the client never sees `BLOB_READ_WRITE_TOKEN`.

---

## Installation / Setup

```bash
npm i @vercel/blob
# or
pnpm i @vercel/blob
# or
yarn add @vercel/blob
```

Required environment variable:
```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

Optional (for local `onUploadCompleted` webhook testing via ngrok):
```
VERCEL_BLOB_CALLBACK_URL=https://abc123.ngrok-free.app
```

---

## Quick Start

### Server Upload (Next.js App Router)

```ts
// app/api/upload/route.ts
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData();
  const file = form.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const blob = await put(file.name, file, {
    access: 'public',
    addRandomSuffix: true,
  });

  return NextResponse.json(blob);
}
```

Response shape:
```json
{
  "pathname": "avatar-NoOVGDVcqS.png",
  "contentType": "image/png",
  "contentDisposition": "attachment; filename=\"avatar-NoOVGDVcqS.png\"",
  "url": "https://xxxx.public.blob.vercel-storage.com/avatar-NoOVGDVcqS.png",
  "downloadUrl": "https://xxxx.public.blob.vercel-storage.com/avatar-NoOVGDVcqS.png?download=1",
  "etag": "\"a1b2c3d4e5f6\""
}
```

### Client Upload (Next.js App Router)

**Client page:**
```tsx
// app/upload/page.tsx
'use client';
import { upload } from '@vercel/blob/client';
import { useRef, useState } from 'react';
import type { PutBlobResult } from '@vercel/blob';

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<PutBlobResult | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const file = inputRef.current!.files![0];
        const result = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
        });
        setBlob(result);
      }}
    >
      <input type="file" ref={inputRef} required />
      <button type="submit">Upload</button>
      {blob && <a href={blob.url}>{blob.url}</a>}
    </form>
  );
}
```

**Server route (token generation + completion webhook):**
```ts
// app/api/upload/route.ts
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // ALWAYS authenticate here before issuing a token
        // const session = await auth(); if (!session) throw new Error('Unauthorized');
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Called by Vercel after upload completes
        // Save blob.url to your database here
        console.log('Upload complete:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
```

---

## Key Endpoints / Methods

All methods are imported from `@vercel/blob` (server) or `@vercel/blob/client` (browser).

| Method | Purpose | Key Parameters | Returns |
|--------|---------|----------------|---------|
| `put(pathname, body, options)` | Upload a blob | `access` (required), `addRandomSuffix`, `allowOverwrite`, `contentType`, `cacheControlMaxAge`, `multipart`, `onUploadProgress` | `{ url, downloadUrl, pathname, contentType, etag }` |
| `get(urlOrPathname, options)` | Download blob as stream | `access` (required), `ifNoneMatch` | `{ body: ReadableStream, contentType, ... }` or `null` |
| `head(urlOrPathname, options)` | Get blob metadata | `token` | `{ url, pathname, size, uploadedAt, contentType, etag, ... }` or throws `BlobNotFoundError` |
| `del(urlOrPathname, options)` | Delete one or many blobs | accepts string or `string[]`, `ifMatch` for conditional delete | `void` (silent no-op if not found) |
| `list(options)` | List blobs in store | `limit` (default 1000), `prefix`, `cursor`, `mode` (`expanded`/`folded`) | `{ blobs: [...], cursor, hasMore, folders }` |
| `copy(fromUrl, toPathname, options)` | Copy a blob to new path | `access` (required), `addRandomSuffix`, `contentType` | Same shape as `put()` |
| `upload(pathname, body, options)` *(client-only)* | Browser-side upload | `access`, `handleUploadUrl` | Same shape as `put()` |
| `handleUpload(options)` *(server-only)* | Handle client upload token flow | `body`, `request`, `onBeforeGenerateToken`, `onUploadCompleted` | JSON for client |

**Multipart upload** (recommended for files > 100 MB):
```ts
await put('large-video.mp4', fileStream, {
  access: 'public',
  multipart: true,
});
```
Each part counts as a separate Advanced Operation toward billing and rate limits.

---

## Error Handling

```ts
import {
  BlobNotFoundError,
  BlobAccessError,
  BlobUnknownError,
  BlobPreconditionFailedError,
  BlobStoreLimitExceededError,
  BlobRequestAbortedError,
} from '@vercel/blob';

try {
  const metadata = await head(blobUrl);
} catch (error) {
  if (error instanceof BlobNotFoundError) {
    // 404 — blob does not exist
    console.log('Blob not found');
  } else if (error instanceof BlobAccessError) {
    // 401/403 — bad or missing token
    console.log('Authentication failed — check BLOB_READ_WRITE_TOKEN');
  } else if (error instanceof BlobPreconditionFailedError) {
    // 412 — ETag mismatch on conditional write/delete
    console.log('Concurrent modification detected');
  } else if (error instanceof BlobStoreLimitExceededError) {
    // 429 / store quota exceeded
    console.log('Storage quota exceeded');
  } else if (error instanceof BlobRequestAbortedError) {
    // AbortSignal triggered
    console.log('Request aborted');
  } else {
    throw error; // BlobUnknownError or unexpected
  }
}
```

**Rate limit behavior:** When you exceed ops/minute, requests will receive a `429` response. Batch `del()` calls count per-blob, not per-call — deleting 100 blobs in one `del([...])` consumes 100 operations.

---

## Tips & Gotchas

1. **`access` must be passed on every call.** It is required by `put()`, `get()`, and `copy()` even though the store has a global access setting. This is intentional to make security context explicit in code.

2. **`addRandomSuffix` defaults to `false` on `put()`.** Without it, uploading the same pathname twice throws an error (or silently overwrites if `allowOverwrite: true`). Use `addRandomSuffix: true` for user-uploaded content.

3. **`del()` is free and silently succeeds on missing blobs.** Don't rely on a thrown error to detect "not found" — use `head()` first if you need to verify existence.

4. **CDN cache lag on delete.** After calling `del()`, the blob can remain accessible via CDN for up to 1 minute.

5. **`onUploadCompleted` does not fire in local development.** Vercel cannot reach `localhost`. Use [ngrok](https://ngrok.com/) and set `VERCEL_BLOB_CALLBACK_URL` to your tunnel URL.

6. **Dashboard interactions count as operations.** Browsing your blob store in the Vercel UI consumes Advanced Operations and appears in your usage metrics.

7. **Blobs > 512 MB are never cached.** Every access counts as a cache MISS (Simple Operation + Fast Origin Transfer charge).

8. **`copy()` does not carry over `contentType` or `cacheControlMaxAge`** from the source — you must re-specify them.

9. **Conditional writes with ETags** prevent race conditions. Use `ifMatch` on `put()` and `del()` when multiple processes may write the same key.

10. **Server uploads cost more.** File data passes through your Vercel Function, incurring Fast Data Transfer charges. Use client uploads for any user-facing file upload flow.

---

## Alternatives

| API | Free Tier | Pricing (storage) | Strengths | Weaknesses |
|-----|-----------|-------------------|-----------|------------|
| **Cloudflare R2** | 10 GB storage, 1M Class A ops/month | $0.015/GB-month | Zero egress fees, S3-compatible, global CDN | Not as tightly integrated with Vercel; separate infrastructure |
| **Supabase Storage** | 1 GB storage | $0.021/GB-month | Integrated with Supabase Auth & Postgres; RLS-based access policies | Pricing for large media not optimal; tied to Supabase ecosystem |
| **AWS S3** | 5 GB / 12 months (new accounts) | $0.023/GB-month | Industry standard, deepest feature set (lifecycle rules, versioning, S3 Select, Athena) | Steep egress fees ($0.09/GB), complex IAM setup |
| **DigitalOcean Spaces** | None (min $5/month) | $5/month flat (250 GB + 1 TB transfer) | Predictable flat pricing, S3-compatible, CDN included | No free tier, fewer integrations, less ecosystem tooling |

**When to pick an alternative:**

- **Cloudflare R2**: Best for bandwidth-heavy apps (video streaming, large downloads) where egress costs would otherwise dominate. Saves 50–80% vs. AWS S3 at scale. Worth the added setup effort if you're not building exclusively on Vercel.
- **Supabase Storage**: Ideal when you're already using Supabase for your database and auth, since you get row-level security policies applied directly to file access without extra infrastructure.
- **AWS S3**: Choose for compliance-heavy workloads, advanced lifecycle management (automatic tiering to Glacier), or when you need deep AWS ecosystem integrations (Lambda triggers, Athena queries on stored data).

---

**Sources:**
- [Vercel Blob Docs](https://vercel.com/docs/vercel-blob)
- [@vercel/blob SDK Reference](https://vercel.com/docs/vercel-blob/using-blob-sdk)
- [Client Uploads Guide](https://vercel.com/docs/vercel-blob/client-upload)
- [Vercel Blob Pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing)
- [Supabase vs R2 comparison](https://www.buildmvpfast.com/compare/supabase-vs-r2)
- [Cloudflare R2 Alternatives](https://www.buildmvpfast.com/alternatives/cloudflare-r2)

---
name: researchV2
description: Research an API's documentation and produce a clear integration guide. Use when the user wants to learn how to use or integrate an API.
context: fork
agent: general-purpose
argument-hint: <api-name or docs-url>
---

You are a senior developer tasked with researching an API and producing a practical integration guide.

The API to research: $ARGUMENTS

## Your task

1. **Find the documentation** — search the web for the official docs, changelog, and any popular community guides for the given API.
2. **Understand the API** — identify:
   - Authentication method (API key, OAuth, JWT, etc.)
   - Base URL and versioning
   - Core endpoints / methods relevant to common use cases
   - Rate limits and quotas
   - SDKs or client libraries available
3. **Research alternatives** — find 2–4 competing or complementary APIs that serve the same use case.
4. **Produce an integration guide** structured as follows:

---

### Overview
Brief description of what the API does and its primary use cases.

### How to Get an API Key
Step-by-step instructions to obtain credentials:
1. Where to sign up (exact URL)
2. Account verification steps (email confirmation, phone, etc.)
3. Where to find or generate the API key in the dashboard (navigation path)
4. Any rate limits or restrictions on free-tier keys
5. How to store and reference the key securely (env var name convention)

### Authentication
How to authenticate requests (include a working code example).

### Installation / Setup
Package to install (if an SDK exists), environment variables needed.

### Quick Start
A minimal working code example (prefer TypeScript/JavaScript unless the user specifies otherwise) that makes a real API call.

### Key Endpoints / Methods
A table or list of the most important endpoints with parameters and response shape.

### Error Handling
Common error codes and how to handle them.

### Tips & Gotchas
Anything surprising, undocumented, or commonly misunderstood about this API.

### Alternatives

A comparison table of 2–4 alternative APIs for the same use case:

| API | Free Tier | Pricing | Strengths | Weaknesses |
|-----|-----------|---------|-----------|------------|
| ... | ...       | ...     | ...       | ...        |

Follow the table with 2–3 sentences on when you'd pick each alternative over the primary API.

---

Be concise. Prioritize practical, copy-pasteable examples over prose.

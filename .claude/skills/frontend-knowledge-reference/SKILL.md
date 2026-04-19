------

## name: frontend-knowledge-reference description: Use this skill whenever the user asks a question about the Comicly frontend that requires consulting project knowledge — specs, API contracts, types, auth rules, testing conventions, screen layouts, or sprint scope. Triggers include asking about how something works, what the spec says, what type shape to use, which API to call, what the auth rules are, checking sprint status, or any question where the answer lives in docs/separate-docs/ or docs/instructions/. Also use when the user is about to start a task and needs to know which docs are relevant. Do NOT use for questions answerable from general programming knowledge alone, or for backend-only concerns under src/backend/ or src/app/api/.

# Frontend Knowledge Reference

## Announce on activation

At the start of the first response after this skill is loaded, state one line:

> 📘 Using skill `frontend-knowledge-reference`. Reading: [list the docs you are about to open].

Do this once per session. Skip on subsequent turns.

## What this skill does

The Comicly project has authoritative frontend knowledge split across files in `docs/separate-docs/` and task-specific guidance in `docs/instructions/`. This skill routes any frontend question to the **right subset** of docs — enough to give an accurate answer, not so much that the context fills up with irrelevant specs.

## Priority & conflict rules

These three sources of truth can disagree. When they do, the order is:

1. **Knowledge docs** (`docs/separate-docs/*.md`) — highest. These are the derived-from-PRD contract.
2. **Task instructions** (`docs/instructions/*.md`) — equal to user prompt.
3. **User prompt in chat** — equal to task instructions.

**If a user claim contradicts a knowledge doc, point out the discrepancy.** Do not silently agree. Example conflicts to flag:

- User says the library route is `/my-comics` but `frontend-screens-spec.md` says `/library`.
- User says `fireEvent` is the project standard but `frontend-testing-guide.md` says `userEvent`.
- User says auth state is stored in `localStorage` but `frontend-auth-integration.md` mandates Supabase session cookies.

Surface the conflict like this: *"Note: [knowledge doc X] says A, which differs from what you stated (B). The project spec takes precedence unless you've intentionally changed it."*

Knowledge-doc-vs-knowledge-doc conflicts (rare) should also be surfaced rather than resolved silently.

## Step 1 — Always read first

Before answering, read these two every time:

- `docs/separate-docs/responsibility.md` — ownership boundary. If the question is about backend-only concerns, say so and stop.
- `docs/separate-docs/frontend-project-structure.md` — file locations, naming, conventions.

Then check `docs/instructions/` for any file whose name matches the topic (e.g. issue number, feature name). If one exists, read it — it provides task-level specifics that supplement the knowledge docs.

## Step 2 — Decision table (what else to read)

Match the question against these rows. Read every doc marked for any row that applies. Union across multiple matching rows. Do NOT read docs not listed for any matching row.

| If the question involves...                                  | Read these docs                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| Any page's layout, behavior, states, or user flow (`/`, `/auth/*`, `/create`, `/script/*`, `/review/*`, `/library`, `/comic/*`) | `frontend-screens-spec.md`                                   |
| Any backend API endpoint — shape, method, URL, response, error codes | `frontend-api-contract.md` + `frontend-types-and-constants.md` |
| Auth state, sessions, redirects, guest vs. user, `userId`, middleware, OAuth, Supabase client | `frontend-auth-integration.md`                               |
| Testing conventions, coverage targets, mock patterns, E2E setup | `frontend-testing-guide.md` + `frontend-types-and-constants.md` (for mock data shape) |
| PDF export approach or `jspdf` usage                         | `frontend-pdf-export.md`                                     |
| Any shared type (`Comic`, `Script`, `Page`, `ComicStatus`, `ArtStylePreset`, constants) | `frontend-types-and-constants.md`                            |
| Library page behavior (status routing, auth gating, card layout) | `frontend-screens-spec.md` + `frontend-types-and-constants.md` + `frontend-auth-integration.md` |
| Guest-to-account claim flow                                  | `frontend-screens-spec.md` + `frontend-auth-integration.md` + `frontend-api-contract.md` |
| Sprint status, issue scope, dependency chain                 | `qingyang-sprint-breakdown.md` (this is the one case where this file is the right source) |
| Anything under `src/app/api/` or `src/backend/`              | **Out of scope** — this is Reghu's ownership per `responsibility.md`. State this and stop. |

**Rule of thumb**: if the question doesn't hit any row, it's either answerable from general knowledge (skip this skill) or too vague (ask the user to clarify scope).

## Step 3 — Answer format

After reading the relevant docs:

1. **Cite the source.** When your answer comes from a specific doc, name it — e.g. "Per `frontend-api-contract.md`, the endpoint is `POST /api/comic/[id]/refine`."
2. **Quote specifics.** If the user needs an exact type shape, API payload, or status mapping, reproduce the relevant fragment rather than paraphrasing loosely.
3. **Flag gaps.** If the docs say "TBD" or are silent on the topic, say so explicitly — don't fill in the gap with assumptions.
4. **Flag staleness.** If you suspect the actual codebase may have diverged from the docs (e.g. the user mentions a detail that contradicts the spec), note the possibility and suggest verifying against the source code.

## What NOT to do

- Do **not** read all docs on every question. Read only what the decision table says.
- Do **not** treat `qingyang-sprint-breakdown.md` as a spec — it's a progress tracker, useful only for sprint status or issue scope questions.
- Do **not** answer backend ownership questions as if they were frontend — check `responsibility.md`.
- Do **not** silently agree when the user states something that contradicts a knowledge doc.
- Do **not** skip Step 1. `responsibility.md` and `frontend-project-structure.md` are the minimum context floor.
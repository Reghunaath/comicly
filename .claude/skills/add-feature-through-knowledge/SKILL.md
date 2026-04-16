---
name: add-feature-through-knowledge
description: Use this skill whenever the user asks to add a new feature, implement an issue, build a page/component, write tests for a feature, or make any non-trivial change to the Comicly frontend. Triggers include '实现 #N', '做一下', '搭建', '加一个', 'add feature', 'build the X page', 'implement Y', 'write tests for Z', or any request that touches src/frontend/ or src/app/ page files. Tells Claude Code which project knowledge documents under docs/separate-docs/ and docs/instructions/ to consult for the specific task — not all of them, only the ones the task actually needs. Do NOT use for trivial edits (typo fixes, renaming a single variable), backend-only work under src/backend/ or src/app/api/, or questions that are purely conceptual and don't modify code.
---

# Add Feature Through Knowledge

## Announce on activation

At the start of the first response after this skill is loaded, state one line:

> 📘 Using skill `add-feature-through-knowledge`. Reading: [list the docs you are about to open].

Do this once per session, not on every turn. If the skill has already been announced earlier in the conversation, skip the announcement on subsequent turns.

## What this skill does

The Comicly project has authoritative frontend knowledge split across files in `docs/separate-docs/` and task-specific prompts in `docs/instructions/`. This skill makes sure Claude Code reads the **right subset** — enough to stay aligned with the project contract, not so much that the context fills up with irrelevant specs.

## Priority & conflict rules

These three sources of truth can disagree. When they do, the order is:

1. **Knowledge docs** (`docs/separate-docs/*.md`) — highest. These are the derived-from-PRD contract.
2. **Task instructions** (`docs/instructions/*.md`) — equal to user prompt.
3. **User prompt in chat** — equal to task instructions.

**If a user request or an instruction file contradicts a knowledge doc, STOP and ask the user to decide.** Do not silently pick one. Example conflicts to flag:

- User says "put library at `/my-comics`" but `frontend-screens-spec.md` says `/library`.
- Instruction file says use `fireEvent` but `frontend-testing-guide.md` says `userEvent`.
- User asks to use `localStorage` for auth but `frontend-auth-integration.md` mandates Supabase session cookies.

Surface the conflict like this: *"I see a conflict: [knowledge doc X] says A, but [your request / instruction file] says B. Which should I follow?"*

Knowledge-doc-vs-knowledge-doc conflicts (rare) should also be surfaced rather than resolved silently.

## Step 1 — Always read first

Before anything else, read these two every time:

- `docs/separate-docs/responsibility.md` — ownership boundary. If the task is outside frontend ownership, stop and tell the user.
- `docs/separate-docs/frontend-project-structure.md` — where files go, naming, commit/branch conventions.

Then check `docs/instructions/` for any file whose name matches the current task (e.g. issue number, feature name). If one exists, read it fully — it is task-level guidance and overrides general-case patterns in the knowledge docs *only where it is more specific*, not where it contradicts.

## Step 2 — Decision table (what else to read)

Match the task against these rows. Read every doc marked for any row that applies. If multiple rows apply, read the union. Do NOT read docs not listed for any matching row.

| If the task involves...                                      | Read these docs                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| Implementing any page under `src/app/` (landing, auth, q&a, script review, supervised review, library, viewer) | `frontend-screens-spec.md` + `frontend-api-contract.md` + `frontend-types-and-constants.md` |
| Calling any backend API (`/api/comic/*`, `/random-idea`, etc.) | `frontend-api-contract.md` + `frontend-types-and-constants.md` |
| Anything touching login state, session, redirects, `userId`, guest vs. user, `onAuthStateChange`, middleware, OAuth, Supabase client | `frontend-auth-integration.md`                               |
| Writing or modifying tests (component or E2E)                | `frontend-testing-guide.md` + `frontend-types-and-constants.md` (for mock data shape) |
| PDF export button or `jspdf` usage                           | `frontend-pdf-export.md`                                     |
| Defining / consuming `Comic`, `Script`, `Page`, `ComicStatus`, `ArtStylePreset`, or any shared constant | `frontend-types-and-constants.md`                            |
| Library page specifically (status-based routing of cards)    | `frontend-screens-spec.md` + `frontend-types-and-constants.md` (Status-Based UI Logic table) + `frontend-auth-integration.md` (library is auth-gated) |
| Guest-to-account claim flow                                  | `frontend-screens-spec.md` + `frontend-auth-integration.md` + `frontend-api-contract.md` |
| Any change under `src/app/api/` or `src/backend/`            | **STOP** — this is Reghu's ownership per `responsibility.md`. Do not modify without explicit user confirmation. |

**Rule of thumb**: if the task doesn't hit any row, re-read the request — it's probably either trivial (skip this skill) or missing a keyword that would clarify scope (ask the user).

## Step 3 — Before writing code

Make a short plan and show it to the user:

1. **Files I will create or modify** (with paths — validated against `frontend-project-structure.md`).
2. **APIs I will call** (with method + path — validated against `frontend-api-contract.md`).
3. **Types I will use or define** (from `frontend-types-and-constants.md`).
4. **Auth assumptions** (if applicable — is this page auth-gated? guest-accessible? owner-only action?).
5. **Any conflicts I detected** between knowledge, instructions, and your request — **do not proceed until these are resolved**.

Keep this plan to ~10 lines. It is a checkpoint, not a design doc.

## Step 4 — While coding

- Import shared types from `src/backend/lib/types.ts`. Do not redefine them in the frontend.
- Do not reference `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` in `src/frontend/` or `src/app/` page files — only `NEXT_PUBLIC_*` vars.
- Follow the branch/commit conventions from `frontend-project-structure.md` (`qingyang/{task-name}` branches, `type(scope): description (#issue)` messages).
- If the task has an issue number, include `(#N)` in commit messages.

## Step 5 — Stop and ask, don't guess

If at any point you cannot find the answer in the docs you loaded, **ask the user** rather than inferring. Specifically:

- API shape not in `frontend-api-contract.md` → ask whether it's a new endpoint (needs coordination with Reghu) or exists elsewhere.
- A type field you need is not in `frontend-types-and-constants.md` → ask before adding it.
- The screen's spec says "TBD" or is silent on a behavior → ask.

## What NOT to do

- Do **not** read all eight `separate-docs` files on every task. Read only what the decision table says.
- Do **not** treat `qingyang-sprint-breakdown.md` as a spec — it's a progress tracker, useful only when the user asks about sprint status or issue scope.
- Do **not** modify files under `src/app/api/` or `src/backend/` without explicit user approval (ownership boundary).
- Do **not** silently pick a side when sources conflict. Ask.
- Do **not** skip Step 1. `responsibility.md` and `frontend-project-structure.md` are the minimum context floor.
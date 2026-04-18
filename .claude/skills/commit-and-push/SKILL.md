---
name: commit-and-push
description: Use this skill whenever the user asks to commit, push, save progress, wrap up, finalize, or complete a task. Also triggers when a TDD phase boundary is reached (RED/GREEN/REFACTOR) and the user says '提交', '推一下', '推上去', '收工', 'commit', 'push', 'wrap up', 'save this', 'done with this'. Guides Claude Code through pre-commit verification (type check, lint, tests), change review, properly formatted commit, and push — including worktree-specific handling. Do NOT use for questions about git concepts, viewing git log/status without intent to commit, or backend-only work.
---

# Commit & Push Workflow

## Announce on activation

At the start of the first response after this skill is loaded, state one line:

> 📦 Using skill `commit-and-push`. Running pre-commit checks.

Do this once per session. Skip on subsequent turns.

## Step 1 — Pre-Commit Verification

Run ALL checks. Fix failures before proceeding.

```bash
# Type check
npm tsc --noEmit

# Lint
npm lint

# Tests — scope to changed files when possible
npm test --run <path-to-relevant-test>
# Or run all if changes are broad:
npm test --run
```

**Gate rule:** Do NOT proceed to Step 2 if any check fails. Fix first, re-run, then continue.

If a failure is pre-existing (unrelated to current changes), note it explicitly to the user and ask whether to proceed or fix.

## Step 2 — Review Changes

```bash
git status
git diff --stat
```

Confirm:
- No unintended files modified (e.g. `.env.local`, lock files that shouldn't change)
- No secrets or sensitive data in diff
- Changes match the task scope

If out-of-scope files are modified, **ask the user** whether to include or unstage them.

## Step 3 — Stage & Commit

**Commit message format:**
```
type(scope): description (#issue-number)
```

| Field | Values |
|-------|--------|
| type | `feat`, `fix`, `test`, `refactor`, `chore`, `docs`, `ci` |
| scope | `frontend`, `backend`, `auth`, `pipeline`, `ci`, `docs` |

Rules:
- Imperative mood, lowercase, no period
- Issue number required when known
- One logical change per commit — split if needed
- For TDD, use separate commits per phase:
  - `test(frontend): add failing tests for X (#N)` — RED
  - `feat(frontend): implement X (#N)` — GREEN
  - `refactor(frontend): clean up X (#N)` — REFACTOR

```bash
git add <specific-files>   # Prefer explicit paths over git add .
git commit -m "type(scope): description (#issue-number)"
```

## Step 4 — Push

```bash
# If branch already tracks remote:
git push

# If first push or worktree checkout (no upstream yet):
git push -u origin <branch-name>
```

If push is rejected (remote has new commits):
```bash
git pull --rebase
# Re-run Step 1 after rebase
git push
```

## Step 5 — Confirm to User

After successful push, report:
- Branch name
- Commit hash (short) and message
- Whether PR creation is needed

## Worktree notes

When working inside a git worktree (`.git` is a file, not a directory):
- First push always needs `git push -u origin <branch>`
- Do NOT run `git checkout` — the worktree is locked to its branch
- This is normal behavior, do not attempt to fix it

## What NOT to do

- Do **not** skip Step 1 verification, even if the user says "just push it" — run checks first, then ask if they want to proceed despite any failures.
- Do **not** use `git add .` unless the user explicitly asks for it. Prefer staging specific files.
- Do **not** commit without an issue number if one is known from the conversation context.
- Do **not** amend or force-push without explicit user approval.
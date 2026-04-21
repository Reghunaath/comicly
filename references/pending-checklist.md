# Pending Requirements Checklist

## High Priority

### CI/CD Pipeline

- [x] Add Vercel preview deploy step to `.github/workflows/ci.yml`
- [x] Add Vercel production deploy step on merge to main in `ci.yml`

### Team Process — Sprint Documentation

- [x] Create `docs/sprints/sprint-1-plan.md` (issue list, assignments, goals)
- [x] Create `docs/sprints/sprint-1-retro.md` (went well / didn't / change — 3 items each)
- [x] Create `docs/sprints/sprint-2-plan.md`
- [x] Create `docs/sprints/sprint-2-retro.md`
- [x] Create `docs/sprints/sprint-3-plan.md`
- [x] Create `docs/sprints/sprint-3-retro.md`

### Documentation

- [x] Replace `README.md` boilerplate with a proper project README including a Mermaid architecture diagram

### Claude Code — CLAUDE.md Modular Organization

- [x] Refactor `CLAUDE.md` to use `@import` directives for modular sub-files (e.g. `@claude/architecture.md`, `@claude/testing.md`)

---

## Medium Priority

### Claude Code — Skills

- [ ] Create a visible v2 improvement commit for at least one skill (e.g. `commit-and-push` or `msw-mock`) with a meaningful change based on real usage

### Team Process — Async Standups

- [x] Document 3+ async standups per sprint per partner (GitHub Discussions posts or markdown files in `docs/standups/`)

### Testing — TDD Evidence

- [x] Verify git history shows red (failing tests) committed before green (implementation) for at least 3 features
- [x] Run `npm run test:coverage` and confirm ≥70% line/branch/function/statement coverage

### Claude Code — PR Evidence

- [x] Ensure at least 2 PRs have AI disclosure metadata in the description (e.g. "~80% AI-generated via Claude Code")
- [x] Ensure at least 2 PRs have C.L.E.A.R. framework review comments visible on GitHub

### Claude Code — CLAUDE.md Git History

- [x] Verify `git log -- CLAUDE.md` shows 5+ commits evolving the file across the project

### Agents — Usage Evidence

- [x] Commit at least one session log or screenshot showing security-reviewer or frontend-test-writer agent output to the repo (e.g. `docs/evidence/`)

---

## External Deliverables (off-repo)

- [ ] Publish technical blog post on Medium or dev.to
- [ ] Record 5–10 min video demo showcasing app + Claude Code workflow
- [ ] Write individual reflections (500 words each partner)
- [ ] Submit showcase form (Google Form) with project name, URLs, thumbnail, video, blog
- [ ] Complete peer evaluations

# Security

See [`docs/security.md`](../security.md) for the full OWASP Top 10 checklist and Comicly-specific mitigations.

## Gitleaks — pre-commit secrets detection

Gitleaks runs automatically in CI and via the Stop hook. To run locally before committing:

```bash
# Scan staged changes
gitleaks protect --staged --verbose

# Add as a pre-commit hook (one-time setup)
echo -e '#!/bin/sh\ngitleaks protect --staged --verbose' > .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

## Security reviewer agent

Run the `security-reviewer` agent on every PR that touches `src/backend/` or `src/app/api/`:

```
/agents security-reviewer
```

Or invoke it from Claude Code by asking: "Run the security reviewer on this PR."

## Error response convention

All API errors must return `{ error: "Human-readable message" }` with an appropriate HTTP status. Never return stack traces or internal error details to the client.

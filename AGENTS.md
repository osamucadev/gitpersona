# Agent guidelines

Rules for AI coding agents (and humans) working in this repository.

## Commits

### Always use Conventional Commits

Every commit message follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <description>
```

- Allowed types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `style`.
- Write the description in English, in the imperative mood, lowercase, with no trailing period.
- Use a scope when it helps locate the change, for example `fix(auth):`, `feat(ssh):`, `docs(changelog):`.
- Mark breaking changes with `!` after the type or scope and explain them in a `BREAKING CHANGE:` footer.
- Add a body only when the reason for the change is not obvious from the description.

### Always make small commits

- One logical change per commit. If the message needs "and" to describe it, split it.
- Never mix unrelated concerns: keep code fixes, refactors, dependency changes, and documentation in separate commits.
- Stage files explicitly (`git add <path>`), never `git add -A` or `git add .`.
- Each commit should leave the project building and the checks passing.

## Before committing

Run the checks that apply to what you changed:

```bash
npm run lint
npm test
npm run build
cargo test --workspace
```

Record user-visible changes under `[Unreleased]` in [CHANGELOG.md](CHANGELOG.md).

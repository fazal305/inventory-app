# Contributing

Thanks for taking the time to help.

## Setup

Follow [Getting started](README.md#getting-started) in the README to run the API, database and client locally.

## Making a change

1. Open an issue first for anything larger than a small fix, so the approach can be agreed before you spend time on it.
2. Create a branch from `main`.
3. Keep the change focused; unrelated refactors belong in their own pull request.
4. Run the checks before opening a pull request:
   ```bash
   php server/tests/run.php
   cd client && npm run build && npm run test:e2e
   ```
5. Fill in the pull request template, including how you tested the change.

## Conventions

- Plain JavaScript/JSX on the client; no TypeScript.
- Every SQL query uses prepared statements. Never interpolate input into SQL.
- Never render server data as HTML (`dangerouslySetInnerHTML`, `innerHTML`).
- New screens handle their loading, empty and error states.
- Validation rules live on the server; the client may mirror them for faster feedback.
- Write clear, plain commit messages in the imperative mood (“Add room filter”, not “added stuff”).

## Code of conduct

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

# Contributing

Thanks for looking. This project is at `v0.0.1`: small, opinionated, and easy
to get into — which is exactly why the rules are written down now rather than
after there are fifty contributors.

## Setup

Requirements: Node.js **24 or newer** (it runs the TypeScript directly, no build
step). Nothing else.

```bash
git clone https://github.com/Amokum-PerBro/perceptionbrowser
cd perceptionbrowser
npm install          # only for the typechecker; the tests need nothing
npm test             # must pass before you open a PR
npm run typecheck    # must be clean
npm run eval         # must stay at 2/2
```

There is no API key, no browser download, and no network access in the default
workflow. If a change requires any of those, it belongs behind a flag and it
must not be on the path of `npm test`.

## The one rule

**A claim without a check is not a contribution.**

If you say the agent can do something, there is a task in `src/eval/tasks.ts`
whose `verify` proves it against the browser. If you fix a bug, there is a test
that fails before your commit and passes after it. Pull requests that only add
prose are welcome — but prose that claims capability is held to the same rule.

## Good first issues

| Issue | Why it is a good start |
|---|---|
| Take the Playwright adapter (M1) | Self-contained, one file, defined by an interface |
| Add three benchmark tasks (M3) | No code required, needs care and real sites |
| Attack the trust boundary (M5) | Break it in a test, we fix it |
| Improve an error message in `actions/validate.ts` | Small, high leverage: these are read by the model |

## Style

- TypeScript, strict mode, no `any`. `import type` for every type-only import.
- No runtime dependencies. A dependency needs a written justification in the PR
  and a reason why 40 lines of our own code would not do.
- Errors are messages for a reader. If an error can reach a model, it must say
  what was wrong *and* what to do instead.
- Comments explain why, never what. `// increment i` gets deleted in review.

## Commits and PRs

- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- One logical change per PR. A PR that reformats and refactors will be asked to
  split.
- Describe the check you ran (test name, eval output, command) in the PR body.
- CI must be green. `npm test` locally is not a substitute, but it predicts it.

## Review

- Two approvals for changes to `src/core/types.ts` — that file is the contract,
  and every adapter and policy depends on it.
- Anything that widens the action space, or gives the agent a new capability,
  needs a threat-model note in the PR. Ask "what can a malicious page do with
  this?" before merging.

## Becoming a maintainer

There is no application form, and no minimum tenure.

1. Land one PR that survives review.
2. Claim one roadmap item end to end — including the test that proves it.
3. Ask for commit access.

After two landed PRs you get review rights on anything except `src/core/types.ts`
and `.github/`. After a roadmap item ships you get merge rights. The people who
decide are the people who do the work; the intent is that this list is short
because contributors become maintainers quickly, not because the project is
precious about access.

## Licensing

By contributing you agree your work is licensed under Apache-2.0 (see
[LICENSE](LICENSE)), and that you have the right to submit it.

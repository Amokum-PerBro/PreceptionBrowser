## What this changes

<!-- One paragraph. What was broken or missing, and what the change does. -->

## Why

<!-- The reasoning. Link the issue if there is one. -->

## The check

<!-- Required. What proves this works? -->
<!-- - Test: `test/loop.test.ts` → "name of the test" -->
<!-- - Eval: `npm run eval` output before/after -->
<!-- - Command: what you ran, and what it printed -->

## Contract impact

- [ ] Changes `src/core/types.ts` (needs two approvals)
- [ ] Widens the action space (needs a threat-model note below)
- [ ] Adds a runtime dependency (needs a justification below)

<!-- If any box above is ticked, explain here. Otherwise delete this section. -->

## Checklist

- [ ] `npm test` passes
- [ ] `npm run typecheck` is clean
- [ ] `npm run eval` is still 2/2
- [ ] New behaviour has a test that fails without this change
- [ ] No secrets, credentials, or captured sessions in the diff

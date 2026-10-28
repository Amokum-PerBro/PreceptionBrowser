# Changelog

All notable changes are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) from 1.0 onward.

## [0.0.1] — 2026-10-28

First public skeleton. Published before it was impressive, on purpose.

### Added

- Core contracts: `Observation`, `Element`, `Action`, `ActionResult`, `Step`,
  `RunResult`, `Task`, `Browser`, `Policy`.
- Agent loop with a step budget, consecutive-no-change detection, and a
  stop reason for every exit path.
- Typed action space of eight verbs, validated at runtime with error messages
  written to be read back by a model.
- Accessibility-tree snapshot parser producing addressable element refs.
- Change detection per step: a click that changes nothing is recorded as one.
- Deterministic offline storefront (`FakeShopBrowser`) implementing `Browser`.
- Evaluation harness with per-task ground truth, plus two starter tasks.
- Recorded traces used as a baseline and as a regression tripwire.
- 22 tests, zero runtime dependencies, no network or API key required.
- Apache-2.0 license, contributor docs, threat model, CI.

### Known gaps

- No Playwright adapter: the loop has never touched a real page yet.
- No LLM policy: the 100% in `npm run eval` is a recorded trace, not a model.
- No UI of any kind.

[0.0.1]: https://github.com/Amokum-PerBro/perceptionbrowser/releases/tag/v0.0.1

# Roadmap

The order is deliberate: **prove the loop before building the browser.** Every
milestone below is useful on its own, and none of them require the next one.

`v0.0.1` is published the moment the loop runs, precisely so that the work can
be split between people.

---

## M0 — Skeleton ✅

- [x] `Observation` / `Action` / `Step` / `RunResult` contracts
- [x] Agent loop with step budget and stall detection
- [x] Action validation with model-readable errors
- [x] Accessibility-tree snapshot parser
- [x] Deterministic offline storefront
- [x] Evaluation harness + 2 baseline tasks + 22 tests
- [x] Apache-2.0, CI, contribution docs

## M1 — A real browser (next, ~1 weekend)

The adapter nobody has written yet. This is the highest-value open task.

- [ ] `PlaywrightBrowser implements Browser`
- [ ] Inject stable `data-pb-ref` attributes before each snapshot
- [ ] Emit the snapshot from `ariaSnapshot()` plus injected refs
- [ ] `extract` → text content scoped to a ref
- [ ] Refs must be invalidated and regenerated on every observation
- [ ] Screenshot capture, behind a flag (costs tokens, helps disambiguation)
- [ ] One integration test against a local static page, no network

**Definition of done:** the two starter tasks pass against a real Chromium page
served from `localhost`, with the same recorded traces.

## M2 — A real policy

- [ ] `LlmPolicy` behind a `Policy` implementation, provider-agnostic
- [ ] Structured output validated by `parseAction`, with the error fed back
- [ ] Prompt with the action space, the observation, and the step history
- [ ] Context budgeting: history compression once the transcript grows
- [ ] Model-agnostic: at least two providers behind one interface
- [ ] Cost and latency recorded per task in the report

**Definition of done:** a published pass rate on the M3 benchmark, with the
model named, the date, and the number of runs. No pass rate without all three.

## M3 — A benchmark worth the name

- [ ] 30 tasks across 10 sites, at least 3 with authenticated state
- [ ] Each task checkable by code, no human grading
- [ ] Deterministic where possible; flaky tasks marked and run 3×
- [ ] A public leaderboard format: `policy × model × date × pass@1/pass@3`
- [ ] Regression suite: any task that passes once must not silently regress

## M4 — A shell people can touch

- [ ] MV3 extension with a side panel (first choice: real sessions, real logins)
- [ ] Streaming step UI: what the agent sees, decides, and did
- [ ] Confirm-before-irreversible action as a first-class UI, not a prompt
- [ ] Local-only mode: no page content leaves the machine unless opted in

## M5 — The hard problems

- [ ] Prompt-injection defenses with an adversarial test suite
- [ ] Recovery: backtracking, re-planning, "this page changed under me"
- [ ] Latency: sub-second simple actions via a small model or a compiled plan
- [ ] Cost: per-task budget with deterministic fallbacks for known sites
- [ ] Multi-tab and cross-tab tasks

---

## Not on the roadmap

- Forking Chromium. Only if a shell genuinely cannot be built on WebView2 or an
  extension. The agent's quality is orthogonal to the browser's chrome.
- A chat box that summarizes the current page. That is a solved commodity and
  it is not the problem this project is about.

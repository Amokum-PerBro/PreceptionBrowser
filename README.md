# PerceptionBrowser

[![CI](https://github.com/Amokum-PerBro/perceptionbrowser/actions/workflows/ci.yml/badge.svg)](https://github.com/Amokum-PerBro/perceptionbrowser/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

**An AI browser agent that has to prove it worked.**

PerceptionBrowser turns a plain-language goal into verifiable actions inside a real web page — and refuses to report success it cannot check.

[Status](#status) · [Quickstart](#quickstart) · [How it works](#how-it-works) · [Roadmap](ROADMAP.md) · [Architecture](docs/architecture.md) · [Threat model](docs/threat-model.md) · [Contributing](CONTRIBUTING.md)

---

## The idea

Browser agents fail in a particular way: they *say* they finished. The click landed on a disabled button, the form was never submitted, the cart is still empty — and the transcript reads like a success story.

PerceptionBrowser is built around one rule: **the agent does not get to grade its own homework.**

- Every action is a small, typed object — never generated JavaScript.
- Every step records whether the page actually changed.
- Every task is verified against the browser by code, not by the model's answer.
- A run that stops making progress is stopped by the loop, not by the model's optimism.

That is the whole thesis. The rest of this repository is the smallest honest implementation of it.

## Status

`v0.0.1` — a working skeleton, published early on purpose. The plumbing is real; the model is not wired in yet.

| Piece | State |
|---|---|
| Agent loop: observe → decide → act → verify | works |
| Typed action contract + validation | works |
| Accessibility-tree snapshot parser | works |
| Deterministic offline storefront | works |
| Evaluation harness + starter benchmark | works, 22 tests |
| Playwright browser adapter | **not yet** — milestone 1 |
| LLM policy | **not yet** — milestone 2 |
| Browser shell / extension | **not yet** — milestone 4 |

No build step. No runtime dependencies. Node 24 executes the TypeScript directly.

## Quickstart

```bash
git clone https://github.com/Amokum-PerBro/perceptionbrowser
cd perceptionbrowser
node --version    # needs >= 24
npm test          # 22 tests, no network, no model keys
npm run eval      # 2/2 tasks via recorded traces
```

Output of `npm run eval` today:

```
PASS  shop-add-buds        6 steps  (finished)
PASS  shop-add-air         6 steps  (finished)

2/2 tasks passed (100.0%)
policy: recorded traces (baseline, not a model score)
```

That 100% is a smoke test, not an achievement — the "policy" is a recorded trace. Milestone 2 is where a model drives the loop and the number starts to mean something.

## How it works

```
        goal
          │
   ┌──────▼──────┐
   │   observe   │  accessibility tree + element refs (+ screenshot)
   └──────┬──────┘
          │              ┌──────────────┐
   ┌──────▼──────┐       │    policy    │  an LLM, a recording,
   │   decide    │◄──────┤  (swappable) │  or a test double
   └──────┬──────┘       └──────────────┘
          │
   ┌──────▼──────┐
   │     act     │  click · type · goto · scroll · wait · extract
   └──────┬──────┘
          │
   ┌──────▼──────┐
   │   verify    │  did the page change? did the task predicate pass?
   └──────┬──────┘
          └──► next step, or stop
```

Three interfaces hold the system together ([`src/core/types.ts`](src/core/types.ts)). Each is deliberately the *only* place a volatile concern lives:

| Interface | Implemented by | Contains |
|---|---|---|
| `Browser` | Playwright adapter, offline fixture | all DOM knowledge |
| `Policy` | LLM, recording, test double | all model knowledge |
| `Task` | benchmark author | all ground truth |

### Four decisions worth arguing about

1. **Observation is an accessibility tree, not raw HTML.** A 100k-token DOM dump is not context, it is noise. The a11y tree carries what a person can perceive and touch — and screen readers already prove it is sufficient to operate a page.
2. **The action space is small and typed.** Eight verbs, validated before execution, with refs that must come from the current observation. A model that can emit `fetch()` can also empty a bank account; a model that can only `click(ref)` cannot.
3. **Every step asserts a change.** A click that produces no observable diff is the most common silent failure in browser agents, so it is measured, counted, and used to cut the run short.
4. **Ground truth lives outside the model.** `Task.verify` inspects the browser after the run. See the test named *the model cannot declare its own success* in [`test/loop.test.ts`](test/loop.test.ts).

## Repository layout

```
src/
  core/types.ts       the contract: Observation, Action, Step, RunResult, Task
  core/loop.ts        observe → decide → act → verify, with budgets and stall detection
  actions/validate.ts runtime validation; error messages written for the model to read
  actions/execute.ts  apply an action, measure whether the page changed
  observe/snapshot.ts parse aria snapshots into addressable elements
  browser/fake-shop.ts deterministic offline storefront implementing Browser
  policy/scripted.ts  replay a recorded trace (tests + baseline)
  eval/               harness, starter tasks, recorded traces, CLI
test/                 22 tests, no network, no keys
```

## The trust boundary

Page content is **untrusted input**. A web page can contain text that reads like an instruction to the agent, and any agent that confuses the two can be steered by whoever wrote the page.

PerceptionBrowser's current position, deliberately conservative:

- page text is data passed to the model, never instructions from the operator;
- the action space cannot reach credentials, the filesystem, or arbitrary URLs;
- irreversible actions (`ask_user` instead of `finish`) are expected to require human confirmation once the policy exists.

This is not solved. It is the most interesting open problem in the project — see [`docs/threat-model.md`](docs/threat-model.md).

## Help wanted

The project is at the stage where one good weekend per piece moves it a lot. Concrete, unglamorous work:

| Piece | What it takes |
|---|---|
| **Playwright adapter** | Implement `Browser`: open a page, inject refs, emit a snapshot. ~1 weekend. |
| **LLM policy** | Prompt, JSON schema, retry-on-invalid-action. Needs someone who has shipped tool-calling. |
| **Benchmark tasks** | 30 real, checkable tasks across 10 sites. Patience, not credentials. |
| **Red team** | Break the trust boundary with prompt injection and write down how. |
| **Browser shell** | MV3 extension + side panel, or a WebView2 wrapper. |
| **Tutorial** | A five-minute walkthrough that explains the loop better than this README does. |

Open an issue titled `help wanted: <piece>` or comment on the pinned roadmap issue.

## License

[Apache-2.0](LICENSE). Started 2026-10-28.

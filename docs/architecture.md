# Architecture

## The shape

```
 ┌──────────────┐    Observation     ┌──────────────┐
 │   Browser    │ ─────────────────► │    Policy    │
 │  (adapter)   │                    │ (LLM, trace, │
 │              │ ◄───────────────── │  test double)│
 └──────┬───────┘      Action        └──────────────┘
        │
        │  the loop owns the arrows
        ▼
 ┌──────────────┐
 │     Task     │   ground truth, checked after the run
 └──────────────┘
```

Four files define the system:

| File | Responsibility | Must not know about |
|---|---|---|
| `src/core/types.ts` | the contract | anything |
| `src/core/loop.ts` | control flow, budgets, stopping | DOM, models |
| `src/browser/*` | DOM → `Observation`, `Action` → page change | models, tasks |
| `src/policy/*` | `PolicyInput` → `Action` | DOM, the loop |

The dependency direction is one-way and enforced by review, not by a tool. If a
change makes `loop.ts` import a browser, the change is wrong.

## One step, precisely

1. `loop` holds an `Observation` produced by `browser.open()` or the previous step.
2. `policy.next({ goal, observation, history, remaining })` returns an `Action`.
   The policy may throw, return an invalid shape, or ask a question. The loop
   treats all three as ordinary outcomes, not exceptions.
3. `actAndVerify` applies the action and compares the observation signature
   before and after. `changed` is a measurement, not a promise.
4. The step is appended to `history` with its `changed` flag and result.
5. Stall accounting: a step that fails, or that changes nothing and is not
   read-only, increments a counter. Read-only steps (`extract`, `wait`) reset it.
6. The loop stops on: `finish`, `ask_user`, `stalled`, `budget`, or `error`.

Exactly one of those five reasons is recorded on every run. There is no path
where a run ends without a stated reason, and `ok` is only ever `true` when
`Task.verify` said so.

## The ref lifecycle (the part adapters get wrong)

A ref is a **handle into one observation**, not a selector:

- created when the observation is produced;
- valid only until the next observation;
- invalid after any mutation, navigation, or re-render;
- never persisted in a trace and never reused across steps.

An adapter that lets a stale ref resolve to "whatever is at that position now"
will produce an agent that clicks the wrong button at exactly the moment the
page layout shifts. The correct behaviour is to fail the action loudly and let
the policy re-read the page. `FakeShopBrowser` models this by rebuilding refs
from scratch on every render.

## Why the core has no dependencies

`npm test` needs no network, no browser download, and no API key. That is a
deliberate constraint, and it buys three things:

- CI runs in seconds on any machine, so the tests actually get run.
- A contributor without a Playwright install or an OpenAI key can still change
  the loop, the validator, or the parser — that is most of the interesting code.
- Model behaviour can never leak into unit tests. Determinism is the default;
  nondeterminism is opt-in and isolated in a `Policy`.

The cost is that the fixture is a hand-written browser. That cost is paid once,
in `fake-shop.ts`, and it is the reason M1 (the real adapter) is a one-weekend
task rather than a rewrite.

## Testing strategy

| Layer | How it is tested |
|---|---|
| Snapshot parser | junk input, missing refs, escaped names, values, disabled state |
| Validator | one test per rejection class, asserting the message is usable |
| Loop | budget, stall, ask_user, and "the model cannot declare success" |
| Harness | a two-task suite that must report exactly 2/2, and an empty suite that must not divide by zero |

What is *not* tested yet: anything involving a real page. That gap is the
honest content of milestone 1.

# Security policy

## Reporting

Do not open a public issue for a vulnerability. Use GitHub's private reporting:

**Security → Report a vulnerability** on this repository, or contact a maintainer
directly on GitHub.

You will get an acknowledgement within 72 hours. Please include a reproduction —
for agent vulnerabilities, a page (or HTML file) that triggers the behaviour is
worth more than a description.

## Scope

This project runs an autonomous agent over untrusted web content, so the
interesting vulnerabilities are not the usual ones. In scope:

- **Prompt injection**: page content that causes the agent to take an action the
  user did not ask for.
- **Data exfiltration**: any path by which page content, credentials, cookies, or
  local files leave the machine.
- **Action forgery**: model output that produces an action outside the typed
  action space, or a ref that resolves to something the observation never
  exposed.
- **Privilege escalation**: an action that reaches a capability (filesystem,
  clipboard, shell, arbitrary network) the action space does not define.
- **Supply chain**: anything that would let a dependency, a task fixture, or a
  recorded trace execute code during `npm test`.

Out of scope for now: vulnerabilities in third-party sites the agent visits, and
missing features (a missing capability is a feature request).

## Current posture, honestly

`v0.0.1` has no LLM policy and no network access: the blast radius is a
deterministic fixture. This is why the security policy is written now — the
constraints below are meant to survive the arrival of the policy in M2.

- Page content is data. It is never concatenated into the operator's
  instructions.
- The action space cannot express credential access, file access, or a URL
  outside `http`/`https`.
- Refs are only valid for the observation they came from; a stale ref is a bug,
  not a fallback.
- Irreversible actions must reach `ask_user` before the policy ships.

See [`docs/threat-model.md`](docs/threat-model.md) for the working list.

## Supported versions

The project is pre-1.0: only `main` is supported.

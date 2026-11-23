# Brent’s self-hosted OpenGym

The deployment source is `TheseArmsRSnakes/openGym`, branch `brent/self-hosted`.
The initial capture preserves the Apps VM source as observed on 2026-11-08. The deployment branch now merges official release `v1.4.5`.

## Source ownership

- `origin`: https://github.com/TheseArmsRSnakes/openGym — Brent’s deployment branch.
- `upstream`: https://github.com/DuarteSantos8/openGym — official releases.
- `coach-upstream`: https://github.com/alexpcosta/opengym — existing Coach integration; initial base commit `678bf5bf10446e8997a77d43e89c9b2721d8d0fc`.

Upstream now owns subpath routing, password login, and mobile layouts. Local changes retain proposal acknowledgement recovery and exercise-name rendering. Upstream owns authentication and password policy.

## Deployment

The Apps VM builds API and frontend containers from `/opt/stacks/apps/opengym-source` using `/opt/stacks/apps/compose.yml`. Deployment configuration, proxy routing, and operational instructions belong to the separate homelab-recovery repository (`services/apps/` and `services/apps-vm-inventory.md`). This repository owns application source.

Runtime profiles, workout history, credential caches, signing keys, and environment files stay outside Git. No runtime data is included in this capture.

Before upgrading, fetch official releases, review differences against this branch, preserve the Coach integration and local changes, validate the build, and create a rollback point. Do not replace this branch with an upstream release or reapply the old homelab patches over these already captured changes.

## Coach configuration

Native ChatGPT plan sign-in is enabled with `COACH_CHATGPT_PLAN=on`. OpenGym stores the refreshable session in its encrypted provider credential store; provider credentials never enter Git. The custom Codex device-login module, routes, UI and setup guides have been removed. The owner instance uses `caps.perProfileDaily=0` and `caps.instanceDaily=0` (unlimited app runs); provider account limits still apply. Upstream’s shared retry policy waits 15 minutes after transient failures and treats permanent failures as a settled review; unread proposals prevent repeat reviews.

Rowing is included in the upstream catalogue as `rowing (with rowing machine)` (exercise `1161`, Cardio). No duplicate custom exercise is necessary.

Coach decisions hide a resolved proposal immediately and acknowledgements identify the proposal, so stale polls and repeated answer acknowledgements cannot dismiss another proposal. Existing ID-based explanations are displayed with exercise names, and new prompts request names in prose. Notes are informational; only explicit changes have accept/decline decisions.

Saved Coach decisions are the acknowledgement retry journal. The client retries failed acknowledgements while showing a saved-choice notice; server status reconciles decisions already synced to the profile, including when the client has closed. Retries only acknowledge the matching proposal and never reapply edits. Web, paired clients, device-local Coach and demo all honor proposal IDs. Exercise-name display also covers unimported plans, debriefs and adaptation explanations; numeric quantities and dates are preserved.

## 1.4.5 overlap review

| Area | Owner after this update | Decision |
|---|---|---|
| Subpath routing, password login, mobile layout, exercise media | Upstream | Keep upstream implementation; retired homelab patches stay retired. |
| Scheduled-review retry policy | Upstream shared `core/due.js` | Remove the local server-only one-hour delay and its redundant test; upstream uses 15 minutes for transient failures and settles permanent failures. |
| ChatGPT subscription sign-in | Upstream native ChatGPT plan provider | Enable the built-in preview and authorize in Admin → AI Coach. Remove the custom Codex device-login module, routes and UI. |
| Proposal identity and lost acknowledgements | Local additions | Upstream still lacks proposal-id guards and synced-decision recovery; retain them on server, web, demo and device. |
| Exercise names in saved Coach prose | Local additions | Upstream normalizes structured ids but does not replace ids in existing explanations; retain name rendering and prompt instructions. |
| Workout MCP access | Upstream native stdio server and Dockerfile | Build from the current application source; remove the custom Dockerfile and Node proxy. The restricted SSH command only mounts the profile read-only and starts upstream’s entrypoint. |
| Password length | Upstream | Remove the local one-character exception and restore the built-in policy. Existing password hashes remain usable. |

Container Node builds are pinned to 26.13.1. The API uses upstream’s default target: no CLI or Agent SDK is needed for the native HTTPS provider.

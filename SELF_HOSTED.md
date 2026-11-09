# Brent’s self-hosted OpenGym

The deployment source is `TheseArmsRSnakes/openGym`, branch `brent/self-hosted`.
The initial capture preserves the Apps VM source as observed on 2026-11-08. The deployment branch now merges official release `v1.4.4`.

## Source ownership

- `origin`: https://github.com/TheseArmsRSnakes/openGym — Brent’s deployment branch.
- `upstream`: https://github.com/DuarteSantos8/openGym — official releases.
- `coach-upstream`: https://github.com/alexpcosta/opengym — existing Coach integration; initial base commit `678bf5bf10446e8997a77d43e89c9b2721d8d0fc`.

Upstream now owns subpath routing, password login, and mobile layouts. Local changes preserve ChatGPT device sign-in, the existing local password policy, and add a persisted one-hour retry delay after failed automatic reviews. The password policy currently permits one-character passwords; this document records existing behavior rather than changing it.

## Deployment

The Apps VM builds API and frontend containers from `/opt/stacks/apps/opengym-source` using `/opt/stacks/apps/compose.yml`. Deployment configuration, proxy routing, and operational instructions belong to the separate homelab-recovery repository (`services/apps/` and `services/apps-vm-inventory.md`). This repository owns application source.

Runtime profiles, workout history, credential caches, signing keys, and environment files stay outside Git. No runtime data is included in this capture.

Before upgrading, fetch official releases, review differences against this branch, preserve the Coach integration and local changes, validate the build, and create a rollback point. Do not replace this branch with an upstream release or reapply the old homelab patches over these already captured changes.

## Coach configuration

`COACH_CREDENTIAL_DIR=/codex` is the sole credential-directory setting. The API receives a separate mount at that location; the unprivileged Coach user must be able to read it. Provider credentials never enter Git. The owner instance uses `caps.perProfileDaily=0` and `caps.instanceDaily=0` (unlimited app runs); provider account limits still apply. Automatic review failures wait one hour before retrying, and unread proposals prevent repeat reviews.

Rowing is included in the upstream catalogue as `rowing (with rowing machine)` (exercise `1161`, Cardio). No duplicate custom exercise is necessary.

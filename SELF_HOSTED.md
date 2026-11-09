# Brent’s self-hosted OpenGym

The deployment source is `TheseArmsRSnakes/openGym`, branch `brent/self-hosted`.
The initial capture preserves the Apps VM source as observed on 2026-11-08.

## Source ownership

- `origin`: https://github.com/TheseArmsRSnakes/openGym — Brent’s deployment branch.
- `upstream`: https://github.com/DuarteSantos8/openGym — official releases.
- `coach-upstream`: https://github.com/alexpcosta/opengym — existing Coach integration; initial base commit `678bf5bf10446e8997a77d43e89c9b2721d8d0fc`.

The captured local changes add `/gym` API routing, optional password login, and mobile layout adjustments. The password policy currently permits one-character passwords; this document records existing behavior rather than changing it.

## Deployment

The Apps VM builds API and frontend containers from `/opt/stacks/apps/opengym-source` using `/opt/stacks/apps/compose.yml`. Deployment configuration, proxy routing, and operational instructions belong to the separate homelab-recovery repository (`services/apps/` and `services/apps-vm-inventory.md`). This repository owns application source.

Runtime profiles, workout history, credential caches, signing keys, and environment files stay outside Git. No runtime data is included in this capture.

Before upgrading, fetch official releases, review differences against this branch, preserve the Coach integration and local changes, validate the build, and create a rollback point. Do not replace this branch with an upstream release or reapply the old homelab patches over these already captured changes.

## Known issues at capture

Coach scheduled reviews fail to read their configured Codex home and count toward OpenGym’s per-profile daily cap. This source capture does not fix that issue or upgrade the running application. Rowing can be created through the existing custom cardio exercise interface; rowing-specific metrics are not added here.

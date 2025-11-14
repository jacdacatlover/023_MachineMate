## MachineMate — High-Level Next Steps

See `docs/roadmap.md` for phase history plus upcoming milestones, and
`plan/detailplan.md` for the full task breakdown. The live focus areas remain:

1. **Platform Hardening & Compliance** – finalize Expo/EAS config, env-specific
   bundle IDs, permissions copy, and release checklists.
2. **Feature Architecture & Code Health** – keep navigation consuming feature
   barrels, finish path-alias cleanups, and ensure new domains follow the
   `features/<domain>` pattern with colocated hooks/tests/styles.
3. **Observability & Quality Gates** – expand Sentry instrumentation, standardize
   structured logging, and rely on CI (lint, type-check, Jest) for every PR.
4. **Performance & Bundle Efficiency** – track bundle size/runtime budgets,
   lazy-load heavyweight visuals, self-host assets, and preprocess recognition
   uploads for constrained devices.
5. **Recognition Reliability & Data Quality** – harden the backend handshake and
   guard catalog-driven features with validation, migrations, and regression
   tests for favorites/history.

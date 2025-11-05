# Folder & Naming Conventions

MachineMate follows a predictable layout so future features stay organized and Metro reloads stay fast. When adding or moving files, keep the rules below in mind.

## Top-Level
- Treat the repository root as the Expo project. Keep production source inside `src/` and avoid creating parallel entry-points (no `app/` or `src/` duplicates at the root).
- Documentation belongs in Markdown at the root or under `docs/` (create subfolders sparingly).
- Scripts and tooling live in `scripts/` with kebab-case filenames.

## `src/` Layout
- `app/`: Providers, navigation, and bootstrapping. Files use PascalCase and end in `.tsx`.
- `data/`: Static JSON/TS datasets and generated embeddings. Name files with snake_case that mirrors the dataset purpose (e.g., `machines.json`, `referenceMachineEmbeddings.ts`).
- `features/`: Feature folders by domain (home, identification, library, etc.). Inside each feature:
  - `screens/` for screen components (PascalCase filenames).
  - `components/` for shared UI within the feature (PascalCase).
  - `hooks/`, `utils/`, or `services/` as needed (camelCase filenames).
- `services/`: Cross-cutting logic (recognition, storage). Keep folders lowercase with hyphen separation when two words are needed (e.g., `storage`, `recognition`).
- `shared/`: Reusable UI primitives and cross-feature components. Use PascalCase filenames ending in `.tsx`.
- `types/`: Domain contracts in PascalCase or contextual camelCase (e.g., `identification.ts`, `machine.ts`).

## Files & Imports
- Prefer named exports from modules so tree-shaking stays effective.
- Group imports by third-party → project absolute → relative paths.
- Avoid deep relative paths from outside a feature (`../../..`). Instead, re-export through index files when the structure becomes nested.

## Assets
- Place machine imagery in `assets/reference-machines/<labelId>/` using kebab-case folder names.
- Muscle diagrams and demo photos stay in their dedicated folders; keep filenames lowercase with hyphen separators.

Keeping to this structure prevents duplicate module trees and keeps future contributors oriented. Update this document whenever a new top-level folder or convention is introduced.

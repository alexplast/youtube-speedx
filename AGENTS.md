# Repository Guidelines

## Project Structure
- `src/`: TypeScript source code.
  - `src/adapters/`: per-site adapters (YouTube/Rutube/etc).
  - `src/core/`: shared UI and player logic.
- `dist/`: built userscripts (committed artifacts).
  - `dist/youtubespeedx.userscript.js`: standard build.
  - `dist/youtubespeedx.userscript.min.js`: minified build.
- `scripts/build.mjs`: bundles `src/main.ts` with `esbuild` and generates the userscript header.
- `README.md`: install/usage and default hotkeys.
- `CHANGELOG.md`: release notes (used by `.github/workflows/release.yml`).
- `PLAN.md`: roadmap and manual test checklist.
- `tests/unit/`: unit tests (Vitest + jsdom).
- `tests/e2e/`: Playwright smoke tests (scaffold).
- `.github/workflows/release.yml`: creates a GitHub Release from `package.json` + `CHANGELOG.md`.
- `.github/ISSUE_TEMPLATE/`: bug/feature templates.

## Development & Local Checks
- `npm install` — install dev dependencies.
- `npm run build` — generate `dist/` (standard + minified).
- `npm run dev` — watch-build into `dist/`.
- `npm run typecheck` — TypeScript typecheck (`tsc --noEmit`).
- `npm test` — run unit tests.
- `npm run test:e2e` — build + Playwright tests (may require `npx playwright install`).
- Install for manual testing via Tampermonkey/Violentmonkey from `dist/youtubespeedx.userscript.js`, then reload the target site.
- Use DevTools Console to verify there are no runtime errors on load and during hotkey use.

## Coding Style & Naming
- TypeScript, small focused modules, prefer `const`/`let`.
- Keep platform-specific behavior inside `src/adapters/<site>.ts`.
- Keep settings in `src/config/*` (`CONFIG`/`DEFAULT_CONFIG`) and validate via `sanitizeConfig()`.
- DOM ids/classes should be prefixed with `yt-speedx-` (e.g., `yt-speedx-modal`).

## Testing
- Unit tests: `tests/unit/**/*.test.ts` (Vitest + jsdom). Prefer testing pure helpers and config normalization.
- E2E: `tests/e2e/**/*.spec.mjs` (Playwright). Keep these as smoke tests and avoid flaky site-dependent assertions.
- Manual smoke tests (see `PLAN.md`): speed stepping (including `0.05`), Speed Boost hold/release, resolution hotkeys with `max60FpsQuality`, and Rutube video switching.

## Commits & Pull Requests
- Commit messages generally follow Conventional Commits: `feat:`, `fix:`, `style:`, `ci:` with optional scope (e.g., `feat(ui):`).
- PRs should include: what changed, why, how tested, and screenshots/GIFs for UI changes.
- Version source of truth is `package.json`. For user-facing changes: bump `package.json`, add a matching `CHANGELOG.md` entry, run `npm run build`, and keep the badge/install links in `README.md` in sync.
- `dist/` is published via raw GitHub URLs, so built files must be committed for releases.

## Agent Notes (Codex)
- Prefer small, focused patches; avoid formatting-only churn.
- After code changes, re-run `npm run typecheck`, `npm test`, and `npm run build`.

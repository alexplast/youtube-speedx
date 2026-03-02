# Repository Guidelines

## Project Structure
- `youtubespeedx.userscript.js`: main userscript (UI, hotkeys, platform adapters).
- `README.md`: install/usage and default hotkeys.
- `CHANGELOG.md`: release notes (used by `.github/workflows/release.yml`).
- `PLAN.md`: roadmap and manual test checklist.
- `.github/workflows/release.yml`: creates a GitHub Release from `@version` + `CHANGELOG.md`.
- `.github/ISSUE_TEMPLATE/`: bug/feature templates.

## Development & Local Checks
No build step or dependencies.
- `node --check youtubespeedx.userscript.js` — JavaScript syntax check.
- Install for testing via Tampermonkey/Violentmonkey from `youtubespeedx.userscript.js`, then reload the target site.
- Use DevTools Console to verify there are no runtime errors on load and during hotkey use.

## Coding Style & Naming
- JavaScript, 4-space indentation, semicolons, prefer `const`/`let`.
- Keep platform-specific behavior inside adapters (`YouTubeAdapter`, `RutubeAdapter`, `GenericAdapter`).
- Keep settings in `CONFIG`/`DEFAULT_CONFIG` and validate via `sanitizeConfig()`.
- DOM ids/classes should be prefixed with `yt-speedx-` (e.g., `yt-speedx-modal`).

## Testing
There are no automated tests today.
- Always run `node --check ...` before opening a PR.
- Manual smoke tests (see `PLAN.md`): speed stepping (including `0.05`), Speed Boost hold/release, resolution hotkeys with `max60FpsQuality`, and Rutube video switching.

## Commits & Pull Requests
- Commit messages generally follow Conventional Commits: `feat:`, `fix:`, `style:`, `ci:` with optional scope (e.g., `feat(ui):`).
- PRs should include: what changed, why, how tested, and screenshots/GIFs for UI changes.
- For user-facing changes: bump `// @version` in `youtubespeedx.userscript.js`, add a `CHANGELOG.md` entry, and keep the version badge in `README.md` in sync.

## Agent Notes (Codex)
- Prefer small, focused patches; avoid formatting-only churn.
- After code changes, re-run `node --check` and verify version/changelog consistency.

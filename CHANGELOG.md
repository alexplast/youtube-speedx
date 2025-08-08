# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.html).

## [2.0.0] - 2025-08-08

### Added
- **Cross-Platform Support Refactor:** Introduced a platform adapter system to reliably support multiple video hosts (YouTube, Rutube, Twitch, etc.) and simplify adding new ones.
- **Generic Adapter:** A fallback adapter is now in place for basic speed control on any site with a standard `<video>` element.
- **Adjustment Step Setting:** Added a new option in the settings menu to customize the speed adjustment step (`0.1` by default).
- **Changelog:** Created this `CHANGELOG.md` file to track project history.

### Changed
- **Code Structure:** Major refactoring of `youtubespeedx.userscript.js` to separate platform-specific logic from core functionality using an adapter pattern.
- **Version:** Updated project version to `2.0.0` to reflect significant architectural changes.
- **H.264 Logic:** Refined the H.264 enforcement method for better compatibility.

### Fixed
- **Settings Save Notification:** An alert for reloading the page now only appears when the H.264 setting is actually changed, preventing unnecessary notifications.

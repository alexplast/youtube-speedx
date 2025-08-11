# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.html).

## [2.1.0] - 2025-08-08

### Added
- **Smart FPS Control:** Introduced a new setting to limit high-framerate (60 FPS) video to a specific resolution. Users can now choose to cap 60 FPS playback at 1080p, 720p, 480p, or disable it entirely to match their hardware capabilities.
- **Automatic Quality Fallback:** If the user's preferred resolution is filtered out by the Smart FPS Control (e.g., 1080p60 is disabled), the script will automatically apply the next best available quality.

### Changed
- **Enhanced Settings UI:** Replaced the simple "Disable 60 FPS" checkbox with a more flexible dropdown menu for managing high-framerate formats.
- **Refactored Quality Filtering:** The internal logic for filtering video formats was completely reworked to reliably patch the YouTube player's `getAvailableQualityData` method, ensuring stability and accuracy.

### Fixed
- **Settings Menu Order:** Dropdown options in the settings UI are now populated using arrays to guarantee a consistent and logical order of resolutions and FPS limits across all browsers.
- **Initial 60 FPS bug:** The previous implementation attempts to filter 60 FPS videos were unreliable; this has been fixed with the new player patching method.

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

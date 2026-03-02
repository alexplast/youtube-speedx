# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.html).

## [2.5.1] - 2026-03-02

### Changed
- **Smart FPS Control:** Resolution hotkeys now respect the 60 FPS quality filter.
- **Speed Normalization:** Speed and Boost values are now normalized to 2 decimal places for consistent stepping.

### Fixed
- **YouTube 0.05 Step:** Fixed rounding that caused incorrect speed jumps with `0.05` steps.
- **Rutube Listener Leak:** Prevented duplicate `ratechange` listeners when switching videos.
- **Settings Validation:** Added finite-number validation and clamping for speed/step/boost speed/progress opacity.

## [2.5.0] - 2025-11-28

### Added
- **Rutube Support:** Full support for `rutube.ru`. Includes:
    - Speed control with native-like UI integration (speed indicator in the control bar).
    - **Auto-Quality:** Automatically sets video quality based on your preference by interacting with the player menu.
    - **Hotkeys:** Support for resolution switching hotkeys with visual feedback.
    - **Smart UI:** Detects when player controls are hidden to toggle the fullscreen progress bar.
- **Progress Bar Opacity:** Added a new setting to adjust the transparency of the fullscreen progress bar (default `0.5`).

### Changed
- **Settings UI Overhaul:** The settings menu is now responsive. The header and "Save" button are sticky, while the content area scrolls, ensuring the save button is always accessible on small screens.
- **Fullscreen Progress Bar:** Logic improved to attach the bar to the fullscreen root element, ensuring it remains visible even if the video player's internal layers are hidden.
- **Dynamic Title:** The settings menu title now reflects the current platform (e.g., "Rutube SpeedX Settings").

### Fixed
- **Quality Switching Lag:** Implemented a debounce mechanism for resolution hotkeys to prevent UI stuttering and missed clicks during rapid presses.
- **Bezel Visibility:** Fixed z-index and positioning issues that caused the notification bezel to be hidden behind the video in fullscreen mode on some platforms.

## [2.4.1] - 2025-11-09

### Changed
- **UI:** The fullscreen progress bar is now semi-transparent (50% transparent) for a less intrusive appearance.

## [2.4.0] - 2025-11-09

### Added
- **Fullscreen Progress Bar:** Added an optional 1px progress bar that appears at the bottom of the screen in fullscreen mode. It becomes visible only when the native player controls are hidden, offering a minimal, non-intrusive way to track video progress.

## [2.3.0] - 2025-11-15

### Added
- **Speed Boost:** You can now adjust the Speed Boost rate on-the-fly while holding the boost key. Use the standard speed hotkeys (`Shift + >/<`) for fine-tuning or press a number key (`1-9`) to set the speed directly. The new value is saved automatically.

## [2.2.1] - 2025-11-02

### Added
- **UI:** Added a visual notification (bezel) when changing video quality using hotkeys, providing instant feedback.

### Changed
- **Hotkeys:** Improved the logic for quality change hotkeys. You can now press the keys multiple times rapidly, and the script will apply the final selected quality after a short delay, making the interaction much smoother.

### Fixed
- **UI:** Fixed a critical bug that caused the script's settings button to appear at the bottom of the player's settings menu. The button is now reliably positioned at the top using a CSS-based fix.
- **UI:** Resolved an issue where the script's settings button would incorrectly appear in sub-menus (e.g., quality or speed selection lists).

## [2.2.0] - 2025-10-18

### Added
- **Speed Boost Feature:** Temporarily increase playback speed by holding down a configurable hotkey (defaults to 'B') to quickly skip uninteresting parts.
- **UI Integration:** Added a "YouTube SpeedX Settings" button directly into the YouTube player's settings menu (gear icon) for easier access.

### Fixed
- **UI:** Corrected a bug that prevented hotkey changes from being saved correctly in the settings menu.
- **UI:** Resolved a race condition that could cause the settings menu button to appear at the bottom of the list instead of the top.
- **Compatibility:** Fixed issues with YouTube's Content Security Policy (TrustedHTML) by programmatically creating SVG icons and other elements, preventing script errors.
- **UI:** Ensured all new UI elements are in English for consistency.

## [2.1.6] - 2025-10-16

### Fixed
- **UI:** Improved speed indicator formatting to remove unnecessary trailing zeros (e.g., `2.3x` instead of `2.30x`).
- **UI:** Replaced hardcoded Russian strings in alerts and tooltips with English equivalents.

### Changed
- **Code Quality:** Refactored the settings UI generation logic to be more modular and easier to maintain.

## [2.1.5] - 2025-10-15

### Fixed
- **UI & Hotkey Overhaul:** A complete rework of the speed control logic to perfectly integrate with the new YouTube UI.
- **Unified Hotkeys:** Removed custom speed hotkeys (`[` and `]`) in favor of extending the native YouTube hotkeys (`Shift + <` and `Shift + >`). The script now seamlessly takes over when speed exceeds 2x.
- **Custom Bezel Notification:** Created a pixel-perfect custom notification (bezel) that mimics the native YouTube style. It reliably displays custom speeds (> 2x) without conflicting with the native UI.
- **Race Condition Solved:** Eliminated all visual glitches and "flashing" between native and custom notifications by using a capture-phase event listener and `stopImmediatePropagation()` to ensure our script always runs first.
- **Seamless Speed Transitions:** Fixed all bugs related to transitioning between native (< 2x) and custom (> 2x) speeds, ensuring every step (`...1.75x, 2.0x, 2.1x...`) is correctly displayed.
- **Player Bar Display:** The custom duration/speed display in the player bar now correctly updates for all speed changes, whether native or custom, by listening to the video's `ratechange` event.

## [2.1.4] - 2025-10-10

### Fixed
- **Player Re-initialization:** Fixed a critical bug where speed and quality settings would not apply when navigating to a new video on YouTube without a full page reload. The script now reliably re-initializes on every internal navigation, ensuring settings are always active.

## [2.1.3] - 2025-10-01

### Fixed
- **H.264 Codec Forcing:** Replaced the unreliable method of deleting browser APIs with a more robust technique that overrides `MediaSource.isTypeSupported` and `navigator.mediaCapabilities.decodingInfo`. This ensures that modern codecs like VP9 and AV1 are correctly blocked, forcing YouTube to serve the H.264 (AVC) codec.

## [2.1.2] - 2025-09-08

### Changed
- Remove Rutube support.

## [2.1.1] - 2025-09-05

### Changed
- Improved the release workflow (`release.yml`) to automatically extract notes for the current version from this CHANGELOG, making release descriptions cleaner.

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

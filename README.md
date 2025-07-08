# YouTube SpeedX

A userscript to enhance your video viewing experience with custom speed, resolution control, and improved performance, all managed through a polished and user-friendly settings menu.

Your preferred settings are automatically saved and applied to new videos.

## Features

- **Polished Settings Menu:** Easily configure the script through a professional UI activated by a hotkey (`Ctrl + Alt + S`).
- **Custom Default Speed:** Set any default playback speed you like, without floating-point errors.
- **Dropdown for Resolution:** Choose your preferred default resolution from a clean dropdown list.
- **Persistent Settings:** Remembers your speed, resolution, and feature choices.
- **Customizable Hotkeys:** Reliably change the hotkeys for all actions using their physical location on the keyboard (`event.code`).
- **Force H.264 Codec:** Toggle the use of the H.264 video codec to reduce CPU usage and improve battery life on supported hardware.
- **Native UI Feedback:** Uses YouTube's built-in on-screen display for speed and resolution changes.
- **Multi-Platform Support:** Works on YouTube, RuTube, Smotrim, Ivi, Twitch, VK Video, Telegram Web, and Yandex.Disk.

## Installation

1.  Install a userscript manager extension for your browser, such as:
    - [Tampermonkey](https://www.tampermonkey.net/) (Recommended)
    - [Greasemonkey](https://www.greasespot.net/)
    - [Violentmonkey](https://violentmonkey.github.io/)
2.  **[Click here to install the script](https://raw.githubusercontent.com/alexplast/youtube-speedx/main/youtubespeedx.userscript.js)**
    *After clicking the link, your userscript manager should open and prompt you for installation.*

## Usage

### Settings Menu

To access the settings, press **`Ctrl + Alt + S`** (by default).

From this menu, you can configure all aspects of the script, including the hotkeys themselves.

### Default Hotkeys

The script uses physical key locations (`event.code`), so these hotkeys will work regardless of your keyboard layout.

-   `[` key: Decrease playback speed (`BracketLeft`).
-   `]` key: Increase playback speed (`BracketRight`).
-   `,` key: Decrease video resolution (`Comma`).
-   `.` key: Increase video resolution (`Period`).
-   `S` key (with `Ctrl+Alt`): Open the settings menu (`KeyS`).

*Note: Hotkeys can be changed in the settings menu and will not trigger if you are typing in a text field or if the settings menu is open.*

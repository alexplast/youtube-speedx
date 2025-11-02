# YouTube SpeedX

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Version](https://img.shields.io/badge/Version-2.2.1-blue)
[![Install](https://img.shields.io/badge/Install%20directly-brightgreen?style=flat&logo=tampermonkey)](https://raw.githubusercontent.com/alexplast/youtube-speedx/main/youtubespeedx.userscript.js)

A userscript to enhance your video viewing experience with custom speed, resolution control, and improved performance, all managed through a polished and user-friendly settings menu.

![YouTube SpeedX Settings Menu](https://github.com/user-attachments/assets/9ba0cb9c-37bf-45c7-8200-918e43cb480c)

## ✨ Features

- **Polished Settings Menu:** Easily configure the script through a professional UI, accessible directly from the YouTube player's settings menu or via hotkey (`Ctrl + Alt + S`).
- **Custom Default Speed:** Set any default playback speed you like, without floating-point errors.
- **Speed Boost:** Temporarily accelerate video playback by holding a hotkey (defaults to `B`) to quickly skip uninteresting parts.
- **Customizable Speed Step:** Configure the increment/decrement value for speed changes in the settings menu.
- **Smart FPS Control:** Set a maximum resolution for 60 FPS videos (e.g., limit to 1080p60 or 720p60) or disable them completely to match your hardware's capabilities.
- **Dropdown for Resolution:** Choose your preferred default resolution from a clean dropdown list.
- **Persistent Settings:** Remembers your speed, resolution, and feature choices.
- **Customizable Hotkeys:** Reliably change the hotkeys for all actions using their physical location on the keyboard (`event.code`).
- **Force H.264 Codec:** Toggle the use of the H.264 video codec to reduce CPU usage and improve battery life on supported hardware.
- **Native UI Feedback:** Uses YouTube's built-in on-screen display for speed and resolution changes, with a pixel-perfect custom display for speeds above 2x.
- **Multi-Platform Support:** Works on YouTube, RuTube, Smotrim, Ivi, Twitch, VK Video, Telegram Web, and Yandex.Disk.

## 🚀 Installation

1.  Install a userscript manager extension for your browser, such as:
    - [Tampermonkey](https://www.tampermonkey.net/) (Recommended)
    - [Violentmonkey](https://violentmonkey.github.io/)
2.  **[Click here to install the script](https://raw.githubusercontent.com/alexplast/youtube-speedx/main/youtubespeedx.userscript.js)**
    *After clicking the link, your userscript manager should open and prompt you for installation.*

## 🛠️ Usage

### Settings Menu

Click the settings icon (gear) in the YouTube player and select **"YouTube SpeedX Settings"**.

Alternatively, you can press **`Ctrl + Alt + S`** (by default). From this menu, you can configure all aspects of the script, including the hotkeys themselves.

### Default Hotkeys

The script uses physical key locations (`event.code`), so these hotkeys will work regardless of your keyboard layout.

-   `Shift` + `>`: Increase playback speed (`Period`). Seamlessly transitions to custom speeds above 2x.
-   `Shift` + `<`: Decrease playback speed (`Comma`).
-   `B` key (hold): Temporarily activate Speed Boost (`KeyB`).
-   `,` key: Decrease video resolution (`Comma`).
-   `.` key: Increase video resolution (`Period`).
-   `S` key (with `Ctrl+Alt`): Open the settings menu (`KeyS`).

*Note: Hotkeys can be changed in the settings menu and will not trigger if you are typing in a text field or if the settings menu is open.*

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/alexplast/youtube-speedx/issues).

## 📝 License

This project is [MIT](https://github.com/alexplast/youtube-speedx/blob/main/LICENSE) licensed.

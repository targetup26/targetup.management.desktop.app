# Targetup - Desktop App

The native Electron desktop client for Targetup employees. This application provides persistent, always-on access to the Targetup system directly from the user's OS system tray. It handles secure Clock In/Out, background WebSockets for live chat, presence status indication, and quick actionable modals (Form submissions, File vault).

## 🚀 Technology Stack
* **Framework**: Electron (v28.0)
* **UI Structure**: HTML5, Vanilla JavaScript, CSS3
* **Communication**: Axios, Socket.IO-Client
* **Persistence**: electron-store (Local credentials and settings caching)
* **Packaging**: electron-builder (NSIS installers, Portable executables)

---

## ⚙️ Environment Configuration (`config/config.js` or via build)
Typically, the desktop app references the API host configured in local storage or bundled configuration files. By default, ensure it targets your deployed backend.

*(If utilizing `.env` internally dynamically via custom pre-build scripts, define the backend URL here)*:
```ini
API_URL=http://localhost:5050/api
SOCKET_URL=http://localhost:5050
```

---

## 🛠️ Installation & Setup

1. **Prerequisites**: Ensure you have Node.js (v18+) installed.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run Development Build**:
   ```bash
   npm start
   ```
   This will immediately launch the Electron app in development mode. Use `Ctrl+R` to hot-reload the renderer processes (UI files) after making changes to HTML/CSS.

4. **Create Production Executable**:
   ```bash
   npm run build
   ```
   This triggers `electron-builder` to compile an `.exe` file (and NSIS installer). Check the `build/` or `dist/` directory after completion for the packaged desktop application.

---

## 📁 Key Directories
* `/main.js`: Main Process entry point (Handles tray logic, window configurations, transparency, sockets, native notifications).
* `/renderer`: UI Process housing all 11 HTML pages.
  * `chat.html`: The core communications hub and profile modal.
  * `dashboard.html`: Main dashboard with attendance stats and activity feed.
  * `forms.html` / `leave-form.html`: Quick-action form submissions.
  * `styles.css`: The central stylesheet containing our premium "Tech Pro" dark theme components.
* `/assets`: Application icons and images.

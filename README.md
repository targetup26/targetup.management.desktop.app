<div align="center">
  <img src="https://via.placeholder.com/150x150/0f172a/3b82f6?text=TARGETUP" alt="Targetup Logo" />
  <h1>Targetup - Native Desktop Client</h1>
  <p>Electron-based Windows application providing persistent OS-level presence, seamless Real-Time Chat, and instant HR workflows directly from the system tray.</p>
</div>

<hr />

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Environment & Security](#environment--security)
4. [Installation & Compilation](#installation--compilation)
5. [Process Architecture (IPC & Sockets)](#process-architecture-ipc--sockets)
6. [UI Modules & Overlays (11 Windows)](#ui-modules--overlays-11-windows)
7. [System Integration Details](#system-integration-details)

---

## 🏗️ System Overview
The Desktop Client is distributed as an executable (`.exe`) to all Targetup employees. Its primary function is to remain running invisibly in the background, anchoring the employee's "Online/Offline" presence, and instantly launching floating window overlays for incoming Chats, System Announcements, and Attendance Check-ins.

---

## 🚀 Technology Stack
* **Core Framework**: Electron v28.0 (Chromium + Node.js integration)
* **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3 (Premium Dark Theme)
* **Networking**: Socket.IO-Client (Real-time), Axios (REST API calls)
* **Local Persistence**: `electron-store` (Encrypted credential caching)
* **Build/Packaging**: `electron-builder` (NSIS Installers)

---

## ⚙️ Environment & Security
The Desktop App interacts continuously with the Core Backend.
*(Production URLs are usually injected during the CI/CD pipeline, but mapping is required for dev).*

### Security Constraints:
* **Context Isolation**: Enabled by default. IPC bridges are rigorously defined in `preload.js`.
* **CORS Exemptions**: As a native app, Axios requests bypass browser CORS restrictions, allowing direct communication with `SERVER_IP` endpoints.
* **Token Storage**: JWTs are securely held utilizing `electron-store` obfuscation, refreshing invisibly in the Main Process.

---

## 🛠️ Installation & Compilation

1. **Clone & Install**:
   ```bash
   git clone https://github.com/targetup26/targetup.management.desktop.git
   cd targetup.management.desktop
   npm install
   ```
2. **Run Development Mode (Hot-Reload renderer)**:
   ```bash
   npm start
   ```
   *Note: Press `Ctrl+R` or `<F5>` to seamlessly reload UI HTML/CSS changes.*

3. **Compile Windows Installer (.exe)**:
   ```bash
   npm run build
   ```
   `electron-builder` will output single-click executables and portable `.zip` versions inside the `/dist` directory.

---

## 🧠 Process Architecture (IPC & Sockets)

Electron utilizes a massive multi-process architecture:
1. **Main Process (`main.js`)**:
   * Has full Node.js / System API access.
   * Manages the Windows Taskbar Tray Icon (Context menus: Quit, Status, Settings).
   * Spawns hidden `BrowserWindows` that process invisible WebSocket listeners.
2. **Preload Scripts (`preload.js`)**:
   * Uses `contextBridge.exposeInMainWorld` to create the `window.electronAPI` bridge, exposing specific OS commands (like `showNotification()` or `minimizeApp()`) to the UI securely.
3. **Renderer Process (`/renderer/*.js`)**:
   * Handles DOM interactions, DOM updating, and fetching REST data via Axios.

---

## 🗂️ UI Modules & Overlays (11 Windows)

The desktop leverages native OS capabilities like *frameless windows*, *draggable regions* (`-webkit-app-region: drag`), and *transparent alpha-channel masking*.

* **`chat.html` & `chat.js`**: The flagship module. Massive dynamic DOM handling for Multi-room websockets. Features the custom Profile Modal (`user-identity-card`) with absolute split-panel UIs, animated Glow Rings for presence, and inline video attachments.
* **`dashboard.html`**: The default daily entrance. Tracks Check-in/Check-out states mathematically locking users out until their start shift.
* **`forms.html` & `leave-form.html`**: Instant interaction modals rendering JSON Form Template schemas natively.
* **`files.html`**: Vault Explorer overlay requesting folder maps natively.
* **`login.html` & `pending.html`**: The auth barrier sequence. If the Account is unverified, `pending.html` locks the system tray to prevent circumvention.

---

## 🖥️ System Integration Details

* **Native Notifications**: Incoming messages trigger `new Notification('Targetup', { body })` routed natively through the Windows Action Center API.
* **Auto-Launch**: Registry interactions via `app.setLoginItemSettings()` permit deploying automatically when Windows boots.
* **Window Behaviors**: By default, clicking 'X' on the app minimizes it instantly to the System Tray rather than destroying the process (`e.preventDefault()`).

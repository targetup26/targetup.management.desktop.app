const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification, dialog } = require('electron');
const path = require('path');
const io = require('socket.io-client');
const activityTracker = require('./services/activity-tracker.service');

// Disable hardware acceleration to prevent GPU errors
app.disableHardwareAcceleration();

// Disable GPU Cache to prevent "Access Denied" errors on some systems
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');

let mainWindow;
let tray;

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        minWidth: 800,
        minHeight: 600,
        resizable: true,
        maximizable: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        title: 'Targetup - Attendance portal'
    });

    mainWindow.loadFile('renderer/login.html');


    // Minimize to tray instead of closing
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    createTray();
}

function createTray() {
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);

    updateTrayMenu();

    tray.setToolTip('Targetup Attendance');
    tray.on('double-click', () => {
        mainWindow.show();
    });
}

function updateTrayMenu() {
    const settings = app.getLoginItemSettings();
    const isAutoLaunch = settings.openAtLogin;

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show App', click: () => mainWindow.show() },
        {
            label: 'Run on Startup',
            type: 'checkbox',
            checked: isAutoLaunch,
            click: (item) => {
                app.setLoginItemSettings({
                    openAtLogin: item.checked,
                    path: app.getPath('exe')
                });
            }
        },
        { type: 'separator' },
        {
            label: 'Quit', click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
    if (gotTheLock) {
        createWindow();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Auto-checkout on quit (best-effort — server-side cron handles crashes)
app.on('before-quit', () => {
    app.isQuitting = true;
    activityTracker.stop();
    if (mainWindow) {
        mainWindow.webContents.send('FORCE_CHECKOUT');
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers
ipcMain.handle('NAVIGATE', (event, page) => {
    mainWindow.loadFile(`renderer/${page}.html`);
});

// ─── Activity Tracking IPC ────────────────────────────────────────────────────

// Start tracking after check-in
ipcMain.on('START_TRACKING', () => {
    activityTracker.start();
    console.log('[Main] Activity tracking started');
});

// Stop tracking on checkout
ipcMain.on('STOP_TRACKING', () => {
    activityTracker.stop();
    console.log('[Main] Activity tracking stopped');
});

// Renderer reports mouse/keyboard event
ipcMain.on('RECORD_ACTIVITY', () => {
    activityTracker.recordActivity();
});

// Renderer requests current snapshot (every 30s)
ipcMain.handle('GET_ACTIVITY_SNAPSHOT', () => {
    return activityTracker.getSnapshot();
});

// Renderer requests queued offline snapshots
ipcMain.handle('GET_QUEUED_SNAPSHOTS', () => {
    return activityTracker.readQueue();
});

// Renderer confirms queue flushed
ipcMain.on('CLEAR_ACTIVITY_QUEUE', () => {
    activityTracker.clearQueue();
});

// Renderer reports a failed snapshot → queue it locally
ipcMain.on('QUEUE_ACTIVITY_SNAPSHOT', (event, snapshot) => {
    activityTracker.queueSnapshot(snapshot);
});

// Privacy notice is handled by a custom modal in the renderer (not native dialog)
ipcMain.handle('SHOW_TRACKING_NOTICE', async () => {
    return true; // Renderer shows its own styled modal before calling this
});

ipcMain.handle('GET_APP_VERSION', () => {
    return app.getVersion();
});

ipcMain.on('MINIMIZE_TO_TRAY', () => {
    mainWindow.hide();
});

ipcMain.on('APP_QUIT', () => {
    app.isQuitting = true;
    app.quit();
});

ipcMain.handle('GET_STARTUP_SETTING', () => {
    return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('SET_STARTUP_SETTING', (event, value) => {
    app.setLoginItemSettings({
        openAtLogin: value,
        path: app.getPath('exe')
    });
    updateTrayMenu();
    return true;
});

// --- Background Socket for Notifications ---
let backgroundSocket = null;

ipcMain.on('START_BACKGROUND_SOCKET', (event, { token, serverUrl, userId }) => {
    if (backgroundSocket) backgroundSocket.disconnect();

    console.log('[Background Socket] Connecting to:', serverUrl);
    backgroundSocket = io(serverUrl, {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity
    });

    backgroundSocket.on('connect', () => {
        console.log('[Background Socket] Connected successfully');
    });

    backgroundSocket.on('new_message', (data) => {
        const message = data.message;
        // Don't notify if the message is from the current user
        if (message.sender_id === userId) return;

        // If it's a DM (room type is typically 'direct' or 'dm'), or just any message if wanted
        // Only notify if main window is minimized, hidden, or not focused on chat.
        // We can send an event to renderer to check if chat is active, but showing OS notification is generally safe.

        // Let's ask the renderer if we should suppress the notification (e.g., if they are looking at the chat)
        if (mainWindow && !mainWindow.isMinimized() && mainWindow.isVisible() && mainWindow.isFocused()) {
            mainWindow.webContents.send('CHECK_CHAT_ACTIVE', message);
        } else {
            showNotification(message);
        }
    });
});

ipcMain.on('STOP_BACKGROUND_SOCKET', () => {
    if (backgroundSocket) {
        backgroundSocket.disconnect();
        backgroundSocket = null;
    }
});

// Renderer replies back if chat is NOT active so we should show notification
ipcMain.on('SHOW_NOTIFICATION', (event, message) => {
    showNotification(message);
});

function showNotification(message) {
    if (!Notification.isSupported()) return;

    const senderName = message.sender?.name || message.sender?.full_name || 'Someone';
    const content = message.content || 'Sent an attachment';

    const notif = new Notification({
        title: `New message from ${senderName}`,
        body: content,
        icon: path.join(__dirname, 'assets', 'icon.png') // Ensure you have this icon
    });

    notif.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('NAVIGATE_TO_ROOM', message.room_id);
        }
    });

    notif.show();
}

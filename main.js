const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

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

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers
ipcMain.handle('NAVIGATE', (event, page) => {
    mainWindow.loadFile(`renderer/${page}.html`);
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

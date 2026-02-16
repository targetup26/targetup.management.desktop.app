const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    navigate: (page) => ipcRenderer.invoke('NAVIGATE', page),
    getAppVersion: () => ipcRenderer.invoke('GET_APP_VERSION')
});

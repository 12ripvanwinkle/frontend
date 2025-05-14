const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
require('@electron/remote/main').initialize();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true, // optional, helps older remote usage
    },
  });

  // Enable @electron/remote
  require('@electron/remote/main').enable(mainWindow.webContents);

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();
}

ipcMain.on('redirect', (event, payload) => {
  const { page, data } = payload;
  console.log('📦 REDIRECT TO:', page, 'with data:', data);

  if (mainWindow) {
    mainWindow.loadFile(page);
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('✅ Page loaded:', page);
      if (data) {
        mainWindow.webContents.send('load-data', data);
      }
    });
  }
});

app.whenReady().then(createWindow);

// libretaw — личный мессенджер.
// Copyright (C) 2026 авторы libretaw
//
// Эта программа — свободное программное обеспечение: вы можете распространять её
// и/или изменять на условиях GNU General Public License версии 3 или более поздней
// (GPL-3.0-only), опубликованной Free Software Foundation. Полный текст — в файле LICENSE.
//
// Программа распространяется в надежде, что она будет полезной, но БЕЗ КАКИХ-ЛИБО
// ГАРАНТИЙ; даже без подразумеваемой гарантии ТОВАРНОЙ ПРИГОДНОСТИ или ПРИГОДНОСТИ
// ДЛЯ ОПРЕДЕЛЁННОЙ ЦЕЛИ.
// Electron-обёртка для Linux: открывает web/index.html и разрешает только камеру и микрофон.
const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1100, height: 760, title: 'libretaw',
    icon: path.join(__dirname, '..', 'icons', 'icon-1024.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  // Разрешаем только запросы камеры и микрофона (для кружков и QR). Остальное запрещаем.
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    callback(permission === 'media' || permission === 'notifications');
  });
  win.loadFile(path.join(__dirname, '..', 'web', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

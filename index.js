const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  const filePath = path.join(__dirname, 'state.json');

  fs.readFile(filePath, 'utf8', async (err, data) => {
    if (err) {
      console.error('Error reading state.json:', err);
      ipcRenderer.send('redirect', { page: 'login.html' });
      return;
    }

    try {
      const state = JSON.parse(data);

      // Check if all needed fields are present
      if (!state.email || !state.password) {
        console.warn('Missing credentials in state.json');
        ipcRenderer.send('redirect', { page: 'login.html' });
        
        return;
      }

      // Try logging in with saved credentials
      const response = await fetch('http://127.0.0.1:5000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          email: state.email,
          password: state.password
        })
      });

      const result = await response.json();

      if (response.ok) {
        console.log('Auto-login successful:', result);
        window.location.href = 'dashboard.html';
        ipcRenderer.send('redirect', { page: 'dashboard.html'});
      } else {
        console.warn('Auto-login failed:', result.message || result);
        ipcRenderer.send('redirect', { page: 'login.html'});
      }

    } catch (parseErr) {
      console.error('Error parsing state.json:', parseErr);
      ipcRenderer.send('redirect', { page: 'login.html'});
    }
  });
});

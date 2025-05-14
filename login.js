const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

const loginBtn = document.getElementById('login');

loginBtn.addEventListener('click', async () => {
  const emailInput = document.getElementById('email').value.trim();
  const passwordInput = document.getElementById('password').value.trim();

  if (!emailInput || !passwordInput) {
    alert('Please enter both email and password.');
    return;
  }

  try {
    const response = await fetch('http://127.0.0.1:5000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ email: emailInput, password: passwordInput })
    });

    const result = await response.json();

    if (response.ok) {
      alert('Login successful!');
      console.log('Response:', result);

      // Path to state.json
      const filePath = path.join(__dirname, 'state.json');

      // Read and update state.json
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading state.json:', err);
          return;
        }

        try {
          const state = JSON.parse(data);

          // Update values from response
          state.email = result.email;
          state.username = result.username;
          state.password = passwordInput; // Still use the typed password since it's not returned

          fs.writeFile(filePath, JSON.stringify(state, null, 2), (err) => {
            if (err) {
              console.error('Error writing to state.json:', err);
            } else {
              console.log('Login data saved to state.json');
            }
          });
        } catch (parseErr) {
          console.error('Failed to parse state.json:', parseErr);
        }
      });

      // Optional: redirect to another page
      ipcRenderer.send('redirect', { page: 'dashboard.html' });
    } else {
      alert(result.message || 'Login failed.');
    }
  } catch (err) {
    console.error('Error:', err);
    alert('An error occurred during login.');
  }
});

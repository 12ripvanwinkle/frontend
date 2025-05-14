const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');


document.getElementById('signup').addEventListener('click', async () => {
  const username = document.getElementById('user').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !email || !password) {
    alert('Please fill in all fields.');
    return;
  }

  try {
    const response = await fetch('http://127.0.0.1:5000/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ email, password, username })
    });

    const result = await response.json();

    if (response.ok) {
      alert('User created successfully!');
      console.log('Signup success:', result);

      // Path to the state.json file
      const filePath = path.join(__dirname, 'state.json');

      // Read the current state.json content
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading state.json:', err);
          return;
        }

        try {
          // Parse existing content
          const state = JSON.parse(data);

          // Update values
          state.username = username;
          state.email = email;
          state.password = password;

          // Write updated content back
          fs.writeFile(filePath, JSON.stringify(state, null, 2), (err) => {
            if (err) {
              console.error('Error writing to state.json:', err);
            } else {
              console.log('User info updated in state.json');
            }
          });
        } catch (parseErr) {
          console.error('Failed to parse state.json:', parseErr);
        }
      });

      // Optional: redirect to login page
      ipcRenderer.send('redirect', { page: 'dashboard.html' });
    } else {
      alert(result.message || 'Signup failed.');
    }
  } catch (error) {
    console.error('Error during signup:', error);
    alert('An error occurred. Check console for details.');
  }
});

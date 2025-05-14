const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'state.json');

document.getElementById('workspaceForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const companyName = document.getElementById('companyName').value.trim();
  const companyPassword = document.getElementById('companyPassword').value.trim();
  const responseMessage = document.getElementById('responseMessage');

  // Read credentials from state.json
  fs.readFile(filePath, 'utf8', async (err, data) => {
    if (err) {
      console.error('❌ Failed to read state.json:', err);
      responseMessage.textContent = '❌ Could not read saved user info.';
      responseMessage.style.color = 'red';
      return;
    }

    try {
      const state = JSON.parse(data);
      const { email, password } = state;

      if (!email || !password) {
        responseMessage.textContent = '❌ Missing saved email or password.';
        responseMessage.style.color = 'red';
        return;
      }

      const res = await fetch('http://127.0.0.1:5000/createcompany', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          companyName,
          companyPassword
        })
      });

      const result = await res.json();

      if (res.ok && result.message === 'Company created successfully') {
        responseMessage.textContent = '✅ Workspace created successfully!';
        responseMessage.style.color = 'green';
      } else {
        responseMessage.textContent = `❌ ${result.message || 'Failed to create workspace'}`;
        responseMessage.style.color = 'red';
      }

    } catch (e) {
      console.error('❌ Error parsing state or creating company:', e);
      responseMessage.textContent = '❌ Unexpected error occurred.';
      responseMessage.style.color = 'red';
    }
  });
});

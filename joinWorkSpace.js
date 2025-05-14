const fs = require('fs');
const path = require('path');

document.getElementById('joinWorkSpace').addEventListener('click', () => {
  const companyCode = document.getElementById('WorkSpaceCode').value.trim();

  if (!companyCode) {
    alert('Please enter a WorkSpace Code.');
    return;
  }

  const statePath = path.join(__dirname, 'state.json');

  fs.readFile(statePath, 'utf8', async (err, data) => {
    if (err) {
      console.error('Failed to read state.json:', err);
      alert('User info not found. Please log in again.');
      return;
    }

    try {
      const state = JSON.parse(data);

      // Check if credentials are present
      if (!state.email || !state.password) {
        alert('Missing credentials. Please log in.');
        return;
      }

      // Build request body
      const requestBody = {
        email: state.email,
        password: state.password,
        companyCode: companyCode
      };

      // Send POST request
      const response = await fetch('http://127.0.0.1:5000/joincompany', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (response.ok) {
        alert('Successfully joined workspace!');
        console.log('Join success:', result);
        // Optionally redirect to workspace dashboard
        // window.location.href = 'workspace.html';
      } else {
        console.warn('Join failed:', result.message || result);
        alert(result.message || 'Failed to join workspace.');
      }

    } catch (parseErr) {
      console.error('Failed to parse state.json or fetch:', parseErr);
    }
  });
});

const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

// SIGN OUT BUTTON
document.getElementById('Sign Out').addEventListener('click', () => {
  const filePath = path.join(__dirname, 'state.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading state.json:', err);
      return;
    }

    try {
      const state = JSON.parse(data);
      state.username = "";
      state.email = "";
      state.password = "";

      fs.writeFile(filePath, JSON.stringify(state, null, 2), (err) => {
        if (err) {
          console.error('Error writing to state.json:', err);
        } else {
          console.log('User data cleared');
          ipcRenderer.send('redirect', { page: 'login.html' });
        }
      });

    } catch (parseErr) {
      console.error('Failed to parse state.json:', parseErr);
    }
  });
});

// LOAD WORKSPACES ON LOAD
window.addEventListener('DOMContentLoaded', () => {
  const filePath = path.join(__dirname, 'state.json');

  fs.readFile(filePath, 'utf8', async (err, data) => {
    if (err) {
      console.error('Failed to read state.json:', err);
      return;
    }

    try {
      const state = JSON.parse(data);

      // Clear old workspace info
      state.companyName = "";
      state.companyPassword = "";

      fs.writeFile(filePath, JSON.stringify(state, null, 2), (err) => {
        if (err) {
          console.error('Failed to write cleared company values:', err);
        } else {
          console.log('Cleared companyName and companyPassword');
        }
      });

      if (!state.email || !state.password) {
        console.warn('Missing credentials');
        return;
      }

      const response = await fetch('http://127.0.0.1:5000/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: state.email,
          password: state.password
        })
      });

      const result = await response.json();

      if (response.ok && Array.isArray(result.companies)) {
        const container = document.querySelector('div');
        const listTitle = document.createElement('h4');
        listTitle.textContent = "Your Workspaces:";
        container.appendChild(listTitle);

        result.companies.forEach(company => {
          const item = document.createElement('p');
          item.textContent = company.name;
          item.style.cursor = 'pointer';
          item.style.color = 'lightblue';
          item.addEventListener('click', () => {
            ipcRenderer.send('redirect', { page: 'workSpace.html', data: { workspaceName: company.name } });
          });
          container.appendChild(item);
        });

      } else {
        console.warn('Unexpected or empty response format:', result);
      }

    } catch (error) {
      console.error('Error processing dashboard:', error);
    }
  });
});

// SHARE WORKSPACE BUTTON
document.getElementById('Share Workspace').addEventListener('click', async () => {
  const filePath = path.join(__dirname, 'state.json');

  fs.readFile(filePath, 'utf8', async (err, data) => {
    if (err) {
      console.error('Error reading state.json:', err);
      return;
    }

    try {
      const state = JSON.parse(data);
      const { email, password, companyName, companyPassword } = state;

      if (!email || !password || !companyName || !companyPassword) {
        alert("Missing required fields (email, password, companyName, or companyPassword).");
        return;
      }

      const response = await fetch("http://127.0.0.1:5000/getcompanycode", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, companyName, companyPassword })
      });

      const result = await response.json();

      if (response.ok && result.companyCode) {
        const display = document.getElementById("shareResult");
        display.textContent = `Company Code: ${result.companyCode}`;

        // Optional: copy to clipboard
        navigator.clipboard.writeText(result.companyCode)
          .then(() => console.log("Company code copied to clipboard"))
          .catch(err => console.error("Clipboard copy failed:", err));
      } else {
        console.warn("Failed to fetch code:", result);
        alert("Error fetching company code");
      }
    } catch (err) {
      console.error("Error during fetch:", err);
    }
  });
});

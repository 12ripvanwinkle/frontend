const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const { ipcRenderer, shell } = require('electron');
const { dialog } = require('@electron/remote');
const archiver = require('archiver');

const filePath = path.join(__dirname, 'state.json');

let currentWorkspace = "";
let credentials = {};
let selectedProject = "";
let portfolioGenerated = false;

const info = {
  portfolio_type: null,
  name: "",
  occupation: "",
  pfp: "",
  email: "",
  phone: "",
  address: "",
  about_me_info: "",
  intro1: ""
};

// const info = {
//   portfolio_type: null,
//   name: "",
//   occupation: "",
//   pfp: "",
//   email: "",
//   phone: "",
//   address: "",
//   about_me_info: "",
//   intro1: "",
//   font_choice: null,
//   color_choice: null,
//   animation_choice: null,
//   section_order: ""
// };


const prompts = {
  portfolio_type: "What would you like to create: portfolio 0, portfolio 1, portfolio 2",
  name: "Enter your name:",
  occupation: "Enter your occupation:",
  pfp: "Enter your profile picture path:",
  intro1: "Enter a 15 word short intro about you for the hero section:",
  about_me_info: "Enter a 40 word extract about you for the about me section:",
  email: "Enter your email:",
  phone: "Enter your phone number:",
  address: "Entere your Parish/State/Province:"
};




// const prompts = {
//   portfolio_type: "Which type of portfolio would you like to create",
//   name: "Your full name",
//   occupation: "Your occupation",
//   pfp: "Path to your profile picture",
//   email: "Your email address",
//   phone: "Your phone number",
//   address: "Your Parish/State/Province",
//   about_me_info: "Describe yourself (about me section)",
//   intro1: "Short intro for your site",
//   font_choice: "Select your font (number)",
//   color_choice: "Select your color set (number)",
//   animation_choice: "Select animation style (number)",
//   section_order: "Preferred section order"
// };

function resetInfo() {
  for (const key of Object.keys(info)) {
    info[key] = "";
  }
}

// --- UI Initialization ---
window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();

  ipcRenderer.on('load-data', async (event, data) => {
    currentWorkspace = data.workspaceName;
    if (!currentWorkspace) return setHeader('No workspace name received');

    fs.readFile(filePath, 'utf8', async (err, fileData) => {
      if (err) return setHeader('Error reading saved user data');

      try {
        const state = JSON.parse(fileData);
        const { email, password, username } = state;
        if (!email || !password) return setHeader('Missing credentials in state.json');

        const companyRes = await fetch('http://127.0.0.1:5000/getcompany', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, companyName: currentWorkspace })
        });

        const companyData = await companyRes.json();
        if (!companyRes.ok || !companyData.companyName || !companyData.password)
          return setHeader('Company not found');

        setHeader(companyData.companyName);
        credentials = { email, password, username, companyName: companyData.companyName, companyPassword: companyData.password };
        Object.assign(state, credentials);
        fs.writeFile(filePath, JSON.stringify(state, null, 2), () => {});
        await loadProjects(credentials);
      } catch (e) {
        console.error('Startup error:', e);
        setHeader('An error occurred');
      }
    });
  });
});

// --- Helpers ---
function setHeader(text) {
  document.getElementById('workspaceName').textContent = text;
}

function setupEventListeners() {
  document.getElementById('CreateProject').addEventListener('click', () => {
    document.getElementById('projectNameInput').value = '';
    document.getElementById('popup').style.display = 'block';
  });

  document.getElementById('cancelCreate').addEventListener('click', () => {
    document.getElementById('popup').style.display = 'none';
  });

  document.getElementById('confirmCreate').addEventListener('click', async () => {
    const projectName = document.getElementById('projectNameInput').value.trim();
    if (!projectName) return alert("Project name is required.");
    document.getElementById('popup').style.display = 'none';

    try {
      const res = await fetch('http://127.0.0.1:5000/createproject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, projectName })
      });

      const result = await res.json();
      alert(res.ok ? '✅ Project created successfully!' : '❌ Failed: ' + (result.message || 'Unknown error'));
      if (res.ok) {
        await loadProjects(credentials);
        await loadChats(projectName);
      } 
    } catch (e) {
      alert('Error occurred while creating project');
    }
  });

  document.getElementById('submitChat').addEventListener('click', async () => {
    const text = document.getElementById('messageInput').value.trim();
    if (!text || !selectedProject) return alert('Select a project and enter a message.');

    try {
      const res = await fetch('http://127.0.0.1:5000/createchat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, projectName: selectedProject, text, author: credentials.username })
      });

      const result = await res.json();
      if (res.ok && result.message === "Chat created successfully") {
        document.getElementById('messageInput').value = '';
        await new Promise(resolve => setTimeout(resolve, 150));
        await loadChats(selectedProject); // ✅ reloads after sending
      } else {
        alert('Failed to send chat: ' + (result.message || 'Unknown error'));
      }
    } catch (e) {
      alert('An error occurred while sending the chat.');
    }

    loadChats(selectedProject);
  });
}

// --- Core Functions ---
async function loadProjects({ email, password, companyName, companyPassword }) {
  const projectList = document.getElementById('projectList');
  try {
    const res = await fetch('http://127.0.0.1:5000/getprojects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, companyName, companyPassword })
    });

    const result = await res.json();
    // projectList.innerHTML = '<h3>Projects:</h3>';
    if (res.ok && Array.isArray(result.projects)) {
      result.projects.forEach(name => {
  const wrapper = document.createElement('div');
  wrapper.classList.add('projectItem'); // optional: for styling

  const item = document.createElement('p');
  item.textContent = name;
  item.style.cursor = 'pointer';
  item.addEventListener('click', () => {
    selectedProject = name;
    resetInfo();
    loadChats(name);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'X';
  deleteBtn.style.marginLeft = '10px';
  deleteBtn.style.cursor = 'pointer';
  // deleteBtn.title = `Delete "${name}"`;

  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation(); // prevent triggering the chat load

    const confirmed = confirm(`Are you sure you want to delete the project "${name}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch('http://127.0.0.1:5000/project', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          companyName,
          companyPassword,
          projectName: name
        })
      });

      const result = await res.json();
      if (res.ok && result.message?.includes("deleted")) {
        alert('✅ ' + result.message);
        projectList.innerHTML = ''; // refresh list
        await loadProjects({ email, password, companyName, companyPassword });
      } else {
        alert('❌ ' + (result.message || 'Deletion failed'));
      }
    } catch (err) {
      alert('❌ Error deleting project');
      console.error(err);
    }
  });

  wrapper.appendChild(item);
  wrapper.appendChild(deleteBtn);
  projectList.appendChild(wrapper);
});

    } else {
      projectList.innerHTML = '<p>No projects found</p>';
    }
  } catch (e) {
    projectList.innerHTML = '<p>Error loading projects</p>';
  }

    document.querySelectorAll('.menuBtn').forEach(button => {
    button.addEventListener('click', (e) => {
      const menu = button.nextElementSibling;
      // Close all other dropdowns
      document.querySelectorAll('.dropdownMenu').forEach(m => {
        if (m !== menu) m.style.display = 'none';
      });
      // Toggle current menu
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      e.stopPropagation();
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdownMenu').forEach(menu => {
      menu.style.display = 'none';
    });
  });
}

async function loadChats(projectName) {
  try {
    const res = await fetch('http://127.0.0.1:5000/getchats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...credentials, projectName })
    });

    const data = await res.json();
    if (res.ok && Array.isArray(data.chats)) {
      const updatedInfo = await ensureInfoComplete(data.chats, projectName);
      Object.assign(info, updatedInfo);
      console.log("🔄 Updated info:", info);
      await renderChats(data.chats, projectName);
    } else {
      document.getElementById('chats').innerHTML = '<p>No chats found.</p>';
    }
  } catch (error) {
    document.getElementById('chats').innerHTML = '<p>Error loading chats</p>';
  }
}

async function renderChats(chats, projectName) {
  const chatsDiv = document.getElementById('chats');
  chatsDiv.innerHTML = '';
  chatsDiv.style.display = 'block'; // Ensure it's visible

  for (const chat of chats) {
    const container = document.createElement('div');
    container.classList.add('chatContainer');
    if (chat.author !== "System") container.classList.add('userChat');

    // Header
    const header = document.createElement('div');
    header.classList.add('chatHeader');

    const author = document.createElement('h3');
    author.classList.add('author');
    author.textContent = chat.author;

    const meta = document.createElement('div');
    meta.classList.add('meta');

    const time = document.createElement('h3');
    time.classList.add('time');
    time.textContent = chat.time;

    const date = document.createElement('h3');
    date.classList.add('date');
    date.textContent = chat.date;

    meta.appendChild(time);
    meta.appendChild(date);

    header.appendChild(author);
    header.appendChild(meta);

    // Chat content
    const text = document.createElement(chat.text.endsWith('.jpg') || chat.text.endsWith('.png') ? 'img' : 'p');
    if (text.tagName === 'IMG') {
      text.src = chat.text;
      text.classList.add('chatImage');
    } else {
      text.classList.add('chatText');
      text.textContent = chat.text;
    }

    container.appendChild(header);
    container.appendChild(text);

    // Special iframe preview if command is detected
    if (chat.text === "getWebsiteOrderHjVwYohG6") {
      await handleSpecialChatCommand(container, chat, projectName);
    }

    chatsDiv.appendChild(container);
  }

  // Scroll to bottom
  chatsDiv.scrollTop = chatsDiv.scrollHeight;
}


async function handleSpecialChatCommand(container, chat, projectName) {
  try {
    const res = await fetch('http://127.0.0.1:5000/getproject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...credentials, projectName })
    });

    const projectData = await res.json();
    if (res.ok && projectData.uri) {
      const indexPath = `file://${projectData.uri}/html/index.html`;

      const wrapper = document.createElement('div');
      wrapper.classList.add('iframeWrapper');

      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.src = indexPath;
      iframe.frameBorder = "0";

      // Create iframeMenu
      const menuDiv = document.createElement('div');
      menuDiv.classList.add('iframeMenu');

      const menuBtn = document.createElement('button');
      menuBtn.classList.add('menuBtn');
      menuBtn.textContent = '⋮';

      const dropdown = document.createElement('div');
      dropdown.classList.add('dropdownMenu');

      const previewLink = document.createElement('a');
      previewLink.href = indexPath;
      previewLink.target = '_blank';
      previewLink.textContent = 'Preview';

      const downloadLink = document.createElement('a');
      downloadLink.href = indexPath;
      downloadLink.download = `portfolio_${projectName}.html`;
      downloadLink.textContent = 'Download';

      dropdown.appendChild(previewLink);
      dropdown.appendChild(downloadLink);
      menuDiv.appendChild(menuBtn);
      menuDiv.appendChild(dropdown);

      // Toggle dropdown menu
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
      });

      // Hide on outside click
      document.addEventListener('click', () => {
        dropdown.style.display = 'none';
      });

      // Append all
      wrapper.appendChild(iframe);
      wrapper.appendChild(menuDiv);
      container.appendChild(wrapper);

    } else {
      const errorText = document.createElement('p');
      errorText.textContent = '[Failed to load website preview]';
      errorText.style.color = 'red';
      container.appendChild(errorText);
    }
  } catch (e) {
    const errorText = document.createElement('p');
    errorText.textContent = '[Error loading preview]';
    errorText.style.color = 'red';
    container.appendChild(errorText);
  }
}


function extractInfoFromChats(chats) {
  const infoExtracted = {};
  const usedIndexes = new Set();
  const reversed = [...chats].reverse(); // from latest to oldest

  for (const [key, prompt] of Object.entries(prompts)) {
    for (let i = 0; i < reversed.length; i++) {
      const chat = reversed[i];
      if (chat.author === "System" && chat.text.includes(prompt)) {
        // Look for the next *user* response above this system prompt
        for (let j = i - 1; j >= 0; j--) {
          const userChat = reversed[j];
          if (userChat.author !== "System" && !usedIndexes.has(j)) {
            infoExtracted[key] = userChat.text.trim();
            usedIndexes.add(j);
            break;
          }
        }
        break;
      }
    }
  }

  return infoExtracted;
}


async function ensureInfoComplete(chats, projectName) {
  const extracted = extractInfoFromChats(chats);
  Object.assign(info, extracted);

  for (const key of Object.keys(info)) {
    if (!info[key]) {

      // ✅ Special AI handling ONLY when about_me_info is missing and occupation is present
      if (key === "about_me_info" && info.occupation) {
        const aiConsentPrompt = "Do you want to use AI to generate your portfolio (Yes/No)?";

        const aiConsentAsked = chats.some(chat =>
          chat.author === "System" && chat.text.includes(aiConsentPrompt)
        );

        const aiConsentGiven = chats.find((chat, idx) =>
          chat.author !== "System" &&
          chat.text.toLowerCase().trim() === "yes" &&
          chats[idx - 1]?.author === "System" &&
          chats[idx - 1].text.includes(aiConsentPrompt)
        );

        const aiConsentDenied = chats.find((chat, idx) =>
          chat.author !== "System" &&
          chat.text.toLowerCase().trim() === "no" &&
          chats[idx - 1]?.author === "System" &&
          chats[idx - 1].text.includes(aiConsentPrompt)
        );

        if (!aiConsentAsked) {
          await fetch("http://127.0.0.1:5000/createchat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...credentials,
              projectName,
              text: aiConsentPrompt,
              author: "System"
            })
          });

          await loadChats(projectName);
          return info;
        }

        if (aiConsentDenied) {
  const introPrompt = "Enter a 15 word short intro about you for the hero section";
  const aboutPrompt = "Enter a 40 word extract about you for the about me section";

  const extractedManual = extractInfoFromChats(chats);
  if (!info.intro1 && extractedManual.intro1) info.intro1 = extractedManual.intro1;
  if (!info.about_me_info && extractedManual.about_me_info) info.about_me_info = extractedManual.about_me_info;

  // STEP 1: Ask for intro1 first
  if (!info.intro1) {
    const introAsked = chats.some(chat =>
      chat.author === "System" && chat.text.includes(introPrompt)
    );

    if (!introAsked) {
      await fetch("http://127.0.0.1:5000/createchat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...credentials,
          projectName,
          text: introPrompt,
          author: "System"
        })
      });

      await loadChats(projectName);
    }

    return info; // wait for user to respond to intro1
  }

  // STEP 2: Now ask for about_me_info
  if (!info.about_me_info) {
    const aboutAsked = chats.some(chat =>
      chat.author === "System" && chat.text.includes(aboutPrompt)
    );

    if (!aboutAsked) {
      await fetch("http://127.0.0.1:5000/createchat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...credentials,
          projectName,
          text: aboutPrompt,
          author: "System"
        })
      });

      await loadChats(projectName);
    }

    return info; // wait for user to respond to about_me_info
  }

  continue; // ✅ both manually filled, continue to next field
}



        // if (!aiConsentGiven) return info;

        const aiIntroPosted = chats.some(chat =>
          chat.author === "System" &&
          chat.text.includes("Here's a 40-word extract")
        );

        const aiIntroApproved = chats.find((chat, idx) =>
          chat.author !== "System" &&
          chat.text.toLowerCase().trim() === "yes" &&
          chats[idx - 1]?.author === "System" &&
          chats[idx - 1].text.includes("Are you satisfied with this response")
        );

        if (!aiIntroPosted) {
          try {
            const res = await fetch("http://127.0.0.1:5000/generate_portfolio_text", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ occupation: info.occupation })
            });

            const data = await res.json();

            // Store temporarily
            info._ai_intro = data.intro;
            info._ai_about = data.about_me;

            const message = `Here's a 40-word extract that goes into more detail about your role as a ${info.occupation}:\n\n${data.about_me}\n\nIntro:\n${data.intro}\n\nAre you satisfied with this response if yes enter 'Yes' else 'No'`;

            await fetch("http://127.0.0.1:5000/createchat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...credentials,
                projectName,
                text: message,
                author: "System"
              })
            });

            await loadChats(projectName);
            return info;
          } catch (err) {
            console.error("Error calling AI API:", err);
            return info;
          }
        }

        if (!aiIntroApproved) return info;

        // ✅ User approved → apply AI values
        info.intro1 = info._ai_intro;
        info.about_me_info = info._ai_about;
        // remove "Here's a 40-word extract that goes into more detail about you as a student: ""
        info.about_me_info = info.about_me_info.replace(/Here's a 40-word extract that goes into more detail about you as a student:\n\n/, "");
        info.about_me_info = info.about_me_info.replace(/Are you satisfied with this response if yes enter 'Yes' else 'No'/, "");
        
        // replace [Your Name]
        info.about_me_info = info.about_me_info.replace(/\[Your Name\]/g, info.name);
        info.intro1 = info.intro1.replace(/\[Your Name\]/g, info.name);
        delete info._ai_intro;
        delete info._ai_about;

        continue;
      }

      // ✅ Default prompt for all other fields
      const promptText = prompts[key];
      const alreadyAsked = chats.some(chat =>
        chat.author === "System" && chat.text.includes(promptText)
      );

      if (!alreadyAsked) {
        await fetch("http://127.0.0.1:5000/createchat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...credentials,
            projectName,
            text: promptText,
            author: "System"
          })
        });

        await loadChats(projectName);
        return info;
      }

      return info; // still waiting for manual answer
    }
  }

  // ✅ All info collected → generate
  console.log("✅ All fields collected. Final info:", info);

  if (!portfolioGenerated && info.portfolio_type === "portfolio 0") {
    portfolioGenerated = true;
    await generatePortfolio0();
  }

  return info;
}




// Generate components
function generateIframe(link){

}



// --- Generate Website ---

// --- portfolio 0 ---

async function generatePortfolio0() {
  try {
    const projectName = selectedProject;
    if (!projectName || !credentials.email || !credentials.password || !credentials.companyName || !credentials.companyPassword) {
      alert("Missing credentials or project name");
      return;
    }

    const requiredFields = [
      'name', 'occupation', 'pfp', 'email', 'phone', 'address', 'intro1', 'about_me_info'
    ];

    for (const field of requiredFields) {
      if (!info[field]) {


        alert(`Missing field: ${field}`);
        return;
      }
    }

    const formData = new FormData();
    formData.append("email", credentials.email);
    formData.append("password", credentials.password);
    formData.append("companyName", credentials.companyName);
    formData.append("companyPassword", credentials.companyPassword);
    formData.append("projectName", projectName);

    formData.append("name", info.name);
    formData.append("occupation", info.occupation);
    formData.append("userEmail", info.email);
    formData.append("phone", info.phone);
    formData.append("address", info.address);
    formData.append("intro", info.intro1);
    formData.append("about", info.about_me_info);

    const filePath = info.pfp;
    if (!fs.existsSync(filePath)) {
      alert(`❌ Profile picture not found at: ${filePath}`);
      return;
    }
    const fileBuffer = await fse.readFile(info.pfp);
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
    const fileName = path.basename(info.pfp);
    const file = new File([blob], fileName, { type: 'image/jpeg' });

    formData.append("pfp", file);

    const res = await fetch("http://127.0.0.1:5000/generate_portfolio", {
      method: "POST",
      body: formData
    });

    const result = await res.json();
    if (res.ok) {
      await loadChats(projectName);

      // shell.openPath(result.path);
        await fetch('http://127.0.0.1:5000/createchat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...credentials,
            projectName,
            text: "getWebsiteOrderHjVwYohG6",
            author: "System"
          })
        });
        // Update the chat view
        await loadChats(projectName);


    } else {
      alert("❌ Portfolio generation failed: " + (result.error || result.message || 'Unknown error'));
    }
  } catch (error) {
    console.error("Error generating portfolio:", error);
    alert("An error occurred while generating the portfolio.");
  }
}



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




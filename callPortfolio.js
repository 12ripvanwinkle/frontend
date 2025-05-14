const { PythonShell } = require('python-shell');

function generatePortfolio(userData, callback) {
  const scriptPath = '/Users/carlyon/Documents/Projects/Assignment/Capstone/Apr 9/Stack-Underflow-Weblyon-/Python files/Portfolio_Generator copy.py';


  const options = {
    mode: 'text',
    pythonPath: '/opt/anaconda3/envs/capstone/bin/python',  // <--- use YOUR actual path
    pythonOptions: ['-u'],
    args: [JSON.stringify(userData)]
  };

  PythonShell.run(scriptPath, options, (err, results) => {
    if (err) return callback(err, null);
    try {
      const response = JSON.parse(results.join(''));
      callback(null, response);
    } catch (e) {
      callback(e, null);
    }
  });
}


// Sample usage
const sampleData = {
  name: "Carlyon",
  occupation: "Software Engineer",
  pfp: "lol.jpeg", // <-- Make sure this path exists
  email: "carlyon@example.com",
  phone: "555-1234",
  address: "Trinity",
  use_ai: true,
  portfolio_type: 1
};

generatePortfolio(sampleData, (err, result) => {
  if (err) {
    console.error("❌ Portfolio generation failed:", err);
  } else {
    console.log("✅ Portfolio created:", result);
  }
});
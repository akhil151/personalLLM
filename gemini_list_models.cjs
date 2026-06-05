
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function listGeminiModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  console.log(`Listing models from: ${url}`);

  try {
    const response = await fetch(url);
    const body = await response.json();
    console.log(`Response Status: ${response.status}`);
    if (response.ok) {
      console.log('Available Models:');
      body.models.forEach(m => console.log(`- ${m.name} (${m.displayName})`));
    } else {
      console.log(`Error: ${JSON.stringify(body)}`);
    }
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
  }
}

listGeminiModels();


const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function testGeminiEmbedding() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`;
  const payload = {
    content: { parts: [{ text: 'My favorite language is Python.' }] }
  };

  console.log('Testing Gemini Embedding...');
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await response.json();
    if (response.ok) {
      console.log('SUCCESS: Embedding generated.');
      console.log(`Vector Length: ${body.embedding.values.length}`);
    } else {
      console.log(`FAILED: ${JSON.stringify(body)}`);
    }
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
  }
}

testGeminiEmbedding();

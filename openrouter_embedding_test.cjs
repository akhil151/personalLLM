
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function testOpenRouterEmbedding() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const url = `https://openrouter.ai/api/v1/embeddings`;
  const payload = {
    model: 'openai/text-embedding-3-small',
    input: 'My favorite language is Python.'
  };

  console.log('Testing OpenRouter Embedding...');
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const body = await response.json();
    if (response.ok) {
      console.log('SUCCESS: Embedding generated.');
      console.log(`Vector Length: ${body.data[0].embedding.length}`);
    } else {
      console.log(`FAILED: ${JSON.stringify(body)}`);
    }
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
  }
}

testOpenRouterEmbedding();

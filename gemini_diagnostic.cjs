
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function diagnoseGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found in .env.local');
    return;
  }

  const tests = [
    { version: 'v1beta', model: 'gemini-2.5-flash' },
    { version: 'v1beta', model: 'gemini-2.0-flash-lite' },
    { version: 'v1beta', model: 'gemini-3.5-flash' }
  ];

  console.log('--- GEMINI ROOT CAUSE ANALYSIS ---');

  for (const test of tests) {
    const url = `https://generativelanguage.googleapis.com/${test.version}/models/${test.model}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
    };

    console.log(`\nTESTING: ${test.version} | ${test.model}`);
    console.log(`Endpoint: ${url}`);
    console.log(`Payload: ${JSON.stringify(payload)}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const body = await response.json();
      console.log(`Response Status: ${response.status}`);
      console.log(`Response Body: ${JSON.stringify(body)}`);

      if (response.ok) {
        console.log(`SUCCESS: ${test.version}/${test.model} is working.`);
      } else {
        console.log(`FAILED: ${body.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(`ERROR: ${err.message}`);
    }
  }
}

diagnoseGemini();

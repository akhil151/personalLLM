import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkEmbedding() {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = 'gemini-embedding-2';
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    const url = `${baseUrl}/${model}:embedContent?key=${apiKey}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: { parts: [{ text: "test" }] }
        })
    });

    const data = await res.json();
    if (data.embedding) {
        console.log(`Model: ${model}`);
        console.log(`Dimension: ${data.embedding.values.length}`);
    } else {
        console.log('Error:', data);
    }
}

checkEmbedding();

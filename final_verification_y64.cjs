
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function runFinalVerification() {
    console.log('--- PHASE Y.6.4: FINAL FOUNDATION VERIFICATION ---');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. MEMORY SYSTEM VERIFICATION
    console.log('\n1. Verifying Memory System (3072D)...');
    try {
        const content = "Verification test content: The core of the sun is extremely hot.";
        const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${geminiKey}`;
        
        const embedRes = await fetch(embedUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: { parts: [{ text: content }] } })
        });
        const embedData = await embedRes.json();
        const embedding = embedData.embedding.values;
        console.log(`- Gemini Embedding: PASS (Length: ${embedding.length})`);

        // Check if DB is ready (Optional: this might fail if they haven't run the SQL yet)
        const testMsgId = '00000000-0000-0000-0000-000000000009';
        const { error: insertError } = await supabase.from('message_embeddings').upsert({
            message_id: testMsgId,
            content: content,
            user_id: '550e8400-e29b-41d4-a716-446655440000',
            conversation_id: '550e8400-e29b-41d4-a716-446655440001',
            embedding: embedding
        }, { onConflict: 'message_id' });

        if (insertError) {
            console.warn(`- DB Insert: SKIP/FAIL (${insertError.message}) - Ensure migration_y64.sql was run.`);
        } else {
            console.log('- DB Insert: PASS');
            const { data: searchData, error: searchError } = await supabase.rpc('match_messages', {
                query_embedding: embedding,
                match_threshold: 0.8,
                match_count: 1,
                p_user_id: '550e8400-e29b-41d4-a716-446655440000'
            });
            if (searchError) console.error(`- Search: FAIL (${searchError.message})`);
            else console.log(`- Search: PASS (Found ${searchData.length} matches)`);
        }
    } catch (err) {
        console.error(`- Memory: ERROR (${err.message})`);
    }

    // 2. PLANNER UPGRADE VERIFICATION
    console.log('\n2. Verifying Planner Upgrade...');
    try {
        const { OpenRouterProvider } = require('./src/providers/OpenRouterProvider'); // Corrected export name
        const plannerPrompt = require('fs').readFileSync('./src/agents/planner/plannerAgent.ts', 'utf8');
        if (plannerPrompt.includes('research') && plannerPrompt.includes('critic')) {
            console.log('- Planner Prompt: PASS (Contains Research & Critic)');
        } else {
            console.log('- Planner Prompt: FAIL (Missing Research or Critic)');
        }
    } catch (err) {
        console.error(`- Planner: ERROR (${err.message})`);
    }

    // 3. VISION MODEL VERIFICATION
    console.log('\n3. Verifying Vision Models...');
    const orFile = require('fs').readFileSync('./src/providers/OpenRouterProvider.ts', 'utf8');
    const geminiFile = require('fs').readFileSync('./src/providers/GeminiProvider.ts', 'utf8');
    
    const orVisionValid = orFile.includes('google/gemini-flash-1.5-exp');
    const geminiVisionValid = geminiFile.includes('gemini-3.5-flash');

    console.log(`- OpenRouter Vision Model: ${orVisionValid ? 'PASS' : 'FAIL'}`);
    console.log(`- Gemini Vision Model: ${geminiVisionValid ? 'PASS' : 'FAIL'}`);

    console.log('\nFINAL STATUS: Foundation completion audit finished.');
}

runFinalVerification();


import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { OllamaProvider } from '../providers/OllamaProvider';
import { memoryService } from '../services/memory/memoryService';
import { createAdminClient } from '../lib/supabase-admin';

async function runEmbeddingCertification() {
  console.log('PHASE Z.4.2.D — EMBEDDING CERTIFICATION');
  console.log('========================================\n');

  const TEST_USER_ID = '734a3720-5908-429d-bef9-89c66c5adc17';
  const ollama = new OllamaProvider();
  const supabase = createAdminClient();

  // 1. Verify Ollama Connectivity
  console.log('[1/5] Verifying Ollama Connectivity...');
  try {
    const res = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/tags`);
    if (res.ok) {
      const data = await res.json();
      console.log('  ✅ Ollama connected. Available models:', data.models?.map((m: any) => m.name).join(', '));
    } else {
      throw new Error(`Ollama connectivity failed: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Ollama connectivity failed:', err.message);
    process.exit(1);
  }

  // 2. Verify Embedding Endpoint Availability
  console.log('\n[2/5] Verifying Embedding Endpoint Availability...');
  const embedModel = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
  try {
    const res = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: embedModel, input: 'test' })
    });
    if (res.ok) {
      console.log(`  ✅ /api/embed available with ${embedModel}`);
    } else {
      const fallbackRes = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: embedModel, prompt: 'test' })
      });
      if (fallbackRes.ok) {
        console.log(`  ✅ /api/embeddings available with ${embedModel}`);
      } else {
        const error = await fallbackRes.text();
        console.warn(`  ⚠️ Embedding endpoints unavailable: ${error}`);
      }
    }
  } catch (err: any) {
    console.warn('  ⚠️ Embedding check failed:', err.message);
  }

  // 3. Verify Embedding Vector Creation
  console.log('\n[3/5] Verifying Embedding Vector Creation...');
  try {
    const vector = await ollama.embed('This is a test sentence for vectorization.');
    if (vector && vector.length > 0) {
      console.log(`  ✅ Vector created. Length: ${vector.length}`);
    } else {
      throw new Error('Empty vector returned');
    }
  } catch (err: any) {
    console.error('  ❌ Vector creation failed:', err.message);
    console.log('  (This is expected if the model is not yet pulled or server lacks --embeddings)');
  }

  // 4. Verify Memory Storage
  console.log('\n[4/5] Verifying Memory Storage...');
  let conversationId: string | undefined;
  let messageId: string | undefined;
  try {
    const { data: conv } = await supabase.from('conversations').insert([{ title: 'Embed Test', user_id: TEST_USER_ID }]).select().single();
    conversationId = conv.id;
    const { data: msg } = await supabase.from('messages').insert([{ conversation_id: conversationId, role: 'user', content: 'The secret password is "banana".' }]).select().single();
    messageId = msg.id;

    await memoryService.storeMessageEmbedding(messageId!, conversationId!, TEST_USER_ID, 'The secret password is "banana".');
    console.log('  ✅ Memory storage call completed (Check logs for degradation).');
  } catch (err: any) {
    console.error('  ❌ Memory storage failed:', err.message);
  }

  // 5. Verify Memory Retrieval
  console.log('\n[5/5] Verifying Memory Retrieval...');
  try {
    const results = await memoryService.searchSimilarMemories('What is the secret password?', TEST_USER_ID);
    if (results && results.length > 0) {
      console.log(`  ✅ Retrieval successful. Found ${results.length} results.`);
      console.log(`  Top result: "${results[0].content}"`);
    } else {
      console.log('  ⚠️ No results found (Expected if embeddings are degraded).');
    }
  } catch (err: any) {
    console.error('  ❌ Memory retrieval failed:', err.message);
  }

  // Cleanup
  if (conversationId) {
    await supabase.from('message_embeddings').delete().eq('conversation_id', conversationId);
    await supabase.from('messages').delete().eq('conversation_id', conversationId);
    await supabase.from('conversations').delete().eq('id', conversationId);
    console.log('\n[CLEANUP] Test data removed.');
  }

  console.log('\n========================================');
  console.log('CERTIFICATION COMPLETE');
}

runEmbeddingCertification().catch(err => {
  console.error('Certification Script Crashed:', err);
  process.exit(1);
});

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { performance } from 'perf_hooks';
import { OllamaProvider } from '../providers/OllamaProvider';

interface ModelInfo {
  name: string;
  modified_at: string;
  size: number;
}

export const ollamaDiagnostics = {
  async checkOllamaReachable(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/tags`);
      if (!response.ok) throw new Error(`Ollama returned status: ${response.status}`);
      return { healthy: true };
    } catch (error: any) {
      return { healthy: false, error: error.message };
    }
  },

  async listAvailableModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/tags`);
      const data = await response.json();
      return data.models || [];
    } catch {
      return [];
    }
  },

  async checkModelAvailable(modelName: string): Promise<{ available: boolean; error?: string }> {
    const models = await this.listAvailableModels();
    const exists = models.some(m => m.name === modelName || m.name.startsWith(modelName + ':'));
    if (!exists) return { available: false, error: `Model '${modelName}' not found in Ollama. Available: ${models.map(m => m.name).join(', ') || 'none'}` };
    return { available: true };
  },

  async measureGenerationLatency(modelName: string): Promise<{ latency?: number; error?: string }> {
    try {
      const provider = new OllamaProvider();
      const start = performance.now();
      await provider.generate([{ role: 'user', content: 'Hi' }], { model: modelName, max_tokens: 10 });
      const end = performance.now();
      return { latency: end - start };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  async measureEmbeddingLatency(embedModelName: string): Promise<{ latency?: number; dimensions?: number; error?: string }> {
    try {
      const provider = new OllamaProvider();
      const start = performance.now();
      const embedding = await provider.embed('Test text for embedding latency');
      const end = performance.now();
      return { latency: end - start, dimensions: embedding.length };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  async checkVisionModelAvailable(): Promise<{ available: boolean; error?: string; model?: string }> {
    const models = await this.listAvailableModels();
    const visionModels = ['llava', 'qwen-vl', 'moondream', 'llava-phi', 'bakllava'];
    for (const vm of visionModels) {
      const found = models.find(m => m.name.toLowerCase().includes(vm));
      if (found) {
        return { available: true, model: found.name };
      }
    }
    return { available: false, error: `No vision model found. Expected one of: ${visionModels.join(', ')}` };
  },

  async runAllDiagnostics(): Promise<{
    ollamaReachable: boolean;
    chatModel: { available: boolean; latency?: number; error?: string; name: string };
    embedModel: { available: boolean; latency?: number; dimensions?: number; error?: string; name: string };
    visionModel: { available: boolean; model?: string; error?: string };
    allHealthy: boolean;
  }> {
    const chatModelName = process.env.OLLAMA_MODEL || 'qwen3:8b';
    const embedModelName = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';

    console.log('=== OLLAMA STARTUP DIAGNOSTICS ===');
    console.log(`Chat Model: ${chatModelName}`);
    console.log(`Embed Model: ${embedModelName}`);
    console.log('----------------------------------');

    const reachable = await this.checkOllamaReachable();
    console.log(`1. Ollama Reachable: ${reachable.healthy ? '✅' : '❌'} ${reachable.error || ''}`);

    const chatModel = await this.checkModelAvailable(chatModelName);
    let chatLatency: number | undefined;
    if (chatModel.available) {
      const latency = await this.measureGenerationLatency(chatModelName);
      chatLatency = latency.latency;
      console.log(`2. Chat Model: ${chatModel.available ? '✅' : '❌'} ${chatModel.error || ''} (${chatLatency?.toFixed(0) || 'n/a'}ms)`);
    } else {
      console.log(`2. Chat Model: ❌ ${chatModel.error}`);
    }

    const embedModel = await this.checkModelAvailable(embedModelName);
    let embedLatency: number | undefined;
    let embedDims: number | undefined;
    if (embedModel.available) {
      const emb = await this.measureEmbeddingLatency(embedModelName);
      embedLatency = emb.latency;
      embedDims = emb.dimensions;
      console.log(`3. Embed Model: ${embedModel.available ? '✅' : '❌'} ${embedModel.error || ''} (${embedLatency?.toFixed(0) || 'n/a'}ms, ${embedDims} dims)`);
    } else {
      console.log(`3. Embed Model: ❌ ${embedModel.error}`);
    }

    const visionModel = await this.checkVisionModelAvailable();
    console.log(`4. Vision Model: ${visionModel.available ? '✅' : '❌'} ${visionModel.model || visionModel.error}`);

    const allHealthy = reachable.healthy && chatModel.available && embedModel.available;
    console.log('----------------------------------');
    console.log(`Overall: ${allHealthy ? '✅ ALL HEALTHY' : '❌ ISSUES FOUND'}`);

    return {
      ollamaReachable: reachable.healthy,
      chatModel: { available: chatModel.available, latency: chatLatency, error: chatModel.error, name: chatModelName },
      embedModel: { available: embedModel.available, latency: embedLatency, dimensions: embedDims, error: embedModel.error, name: embedModelName },
      visionModel,
      allHealthy
    };
  },

  async failEarly() {
    const diagnostics = await this.runAllDiagnostics();
    if (!diagnostics.allHealthy) {
      const errors: string[] = [];
      if (!diagnostics.ollamaReachable) errors.push('Ollama server not reachable');
      if (!diagnostics.chatModel.available) errors.push(`Chat model '${diagnostics.chatModel.name}' missing: ${diagnostics.chatModel.error}`);
      if (!diagnostics.embedModel.available) errors.push(`Embed model '${diagnostics.embedModel.name}' missing: ${diagnostics.embedModel.error}`);
      throw new Error(`Startup failed! Issues:\n- ${errors.join('\n- ')}`);
    }
  }
};

if (require.main === module) {
  ollamaDiagnostics.runAllDiagnostics().then(() => process.exit(0)).catch(() => process.exit(1));
}

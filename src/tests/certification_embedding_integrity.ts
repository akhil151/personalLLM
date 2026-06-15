
import { embeddingService } from '../services/memory/embeddingService';

async function runCertification() {
  console.log("=== CERTIFICATION: EMBEDDING INTEGRITY ===");
  
  // Test 1: Generate embedding
  console.log("\n1. Generate Embedding Test:");
  const testText = "Hello, world!";
  const embedding = await embeddingService.generateEmbedding(testText);
  console.log("   ✓ Embedding generated successfully");
  
  // Test 2: Dimension count
  console.log("\n2. Dimension Count Test:");
  console.log(`   Embedding dimensions: ${embedding.length}`);
  if (embedding.length !== 768) {
    throw new Error(`Expected 768 dimensions, got ${embedding.length}`);
  }
  console.log("   ✓ Correct number of dimensions (768)");
  
  console.log("\n=== CERTIFICATION PASSED ===");
}

runCertification().catch(err => {
  console.error("\n=== CERTIFICATION FAILED ===");
  console.error(err);
  process.exit(1);
});


import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { SystemHealthAudit } from '../services/systemHealthAudit';

async function testWarmup() {
  console.log('Testing System Warmup...');
  await SystemHealthAudit.run();
}

testWarmup();

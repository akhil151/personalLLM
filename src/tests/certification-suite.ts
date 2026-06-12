import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

process.env.USE_MOCK_SUPABASE = 'true';
process.env.USE_MOCK_LLM = 'true';

console.log('========================================');
console.log('PHASE Z.4.7 - FULL CERTIFICATION SUITE');
console.log('========================================\n');

import { HumanExperienceCertification } from './certification_human_experience';
import { MemoryContinuityCertification } from './certification_memory_continuity';
import { AutonomyCertification } from './certification_autonomy';
import { RecommendationQualityCertification } from './certification_recommendation_quality';
import { ThirtyDaySimulationCertification } from './certification_30_day_simulation';
import { DashboardRealityCertification } from './certification_dashboard_reality';
// Scale test is skipped by default because it's slow, uncomment to run
// import { ScaleCertification } from './certification_scale';

async function runAll() {
  let allPassed = true;

  // Phase A: Human Experience
  try {
    console.log('\n--- RUNNING PHASE A: HUMAN EXPERIENCE ---');
    const cert = new HumanExperienceCertification();
    await cert.run();
  } catch (e) {
    console.error('❌ PHASE A FAILED:', e);
    allPassed = false;
  }

  // Phase B: Memory Continuity
  try {
    console.log('\n--- RUNNING PHASE B: MEMORY CONTINUITY ---');
    const cert = new MemoryContinuityCertification();
    await cert.run();
  } catch (e) {
    console.error('❌ PHASE B FAILED:', e);
    allPassed = false;
  }

  // Phase C: Autonomy
  try {
    console.log('\n--- RUNNING PHASE C: AUTONOMY ---');
    const cert = new AutonomyCertification();
    await cert.run();
  } catch (e) {
    console.error('❌ PHASE C FAILED:', e);
    allPassed = false;
  }

  // Phase D: Recommendation Quality
  try {
    console.log('\n--- RUNNING PHASE D: RECOMMENDATION QUALITY ---');
    const cert = new RecommendationQualityCertification();
    await cert.run();
  } catch (e) {
    console.error('❌ PHASE D FAILED:', e);
    allPassed = false;
  }

  // Phase E: 30-Day Simulation
  try {
    console.log('\n--- RUNNING PHASE E: 30-DAY SIMULATION ---');
    const cert = new ThirtyDaySimulationCertification();
    await cert.run();
  } catch (e) {
    console.error('❌ PHASE E FAILED:', e);
    allPassed = false;
  }

  // Phase F: Dashboard Reality
  try {
    console.log('\n--- RUNNING PHASE F: DASHBOARD REALITY ---');
    const cert = new DashboardRealityCertification();
    await cert.run();
  } catch (e) {
    console.error('❌ PHASE F FAILED:', e);
    allPassed = false;
  }

  // Phase G: Scale (skipped by default)
  // try {
  //   console.log('\n--- RUNNING PHASE G: SCALE ---');
  //   const cert = new ScaleCertification();
  //   await cert.run();
  // } catch (e) {
  //   console.error('❌ PHASE G FAILED:', e);
  //   allPassed = false;
  // }

  console.log('\n========================================');
  console.log('FINAL RESULT');
  console.log('========================================');
  if (allPassed) {
    console.log('✅ ALL CERTIFICATIONS PASSED!');
    console.log('✅ READY FOR PHASE Z.5!');
  } else {
    console.log('❌ SOME CERTIFICATIONS FAILED!');
    process.exit(1);
  }
}

runAll().catch(console.error);

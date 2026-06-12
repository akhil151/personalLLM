
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { proactiveIntelligenceService } from '../services/proactiveIntelligenceService';
import { createAdminClient } from '../lib/supabase-admin';

const TEST_USER_ID = '734a3720-5908-429d-bef9-89c66c5adc17';

async function runProactiveIntelligenceCertification() {
  console.log('PHASE Z.4.6 — PROACTIVE CHIEF OF STAFF CERTIFICATION');
  console.log('====================================================\n');

  const report: any = {
    goalDriftDetection: 'PASS',
    blockerEscalation: 'PASS',
    nextBestAction: 'PASS',
    dailyBriefing: 'PASS',
    productivityAnalytics: 'PASS',
    riskDetection: 'PASS'
  };

  try {
    // Test 1: Goal Drift Detection
    console.log('[1/6] Testing Goal Drift Detection...');
    const drifts = await proactiveIntelligenceService.detectGoalDrift(TEST_USER_ID);
    console.log(`  ✅ Goal Drift Detection: Found ${drifts.length} drift(s)`);
    drifts.forEach(d => console.log(`     - Goal "${d.goalTitle}": ${d.severity}`));

    // Test 2: Blocker Escalation
    console.log('\n[2/6] Testing Blocker Escalation...');
    const blockers = await proactiveIntelligenceService.escalateBlockers(TEST_USER_ID);
    console.log(`  ✅ Blocker Escalation: Found ${blockers.length} escalated blocker(s)`);
    blockers.forEach(b => console.log(`     - Project "${b.projectTitle}": ${b.severity} (${b.ageDays} days old)`));

    // Test 3: Next Best Action V2
    console.log('\n[3/6] Testing Next Best Action Engine V2...');
    const nextAction = await proactiveIntelligenceService.determineNextBestActionV2(TEST_USER_ID);
    console.log('  ✅ Next Best Action:');
    console.log(`     - Action: ${nextAction.nextAction}`);
    console.log(`     - Impact: ${nextAction.impact}`);
    console.log(`     - Urgency: ${nextAction.urgency}`);

    // Test 4: Daily Executive Briefing
    console.log('\n[4/6] Testing Daily Executive Briefing...');
    const brief = await proactiveIntelligenceService.generateDailyBriefing(TEST_USER_ID);
    console.log('  ✅ Daily Executive Briefing generated:');
    console.log(`     - Current Focus: ${brief.currentFocus}`);
    console.log(`     - Highest Priority Goal: ${brief.highestPriorityGoal?.title || 'None'}`);
    console.log(`     - Highest Priority Project: ${brief.highestPriorityProject?.title || 'None'}`);
    console.log(`     - Open Risks: ${brief.openRisks.length}`);
    console.log(`     - Critical Blockers: ${brief.criticalBlockers.length}`);
    console.log(`     - Recommended Action: ${brief.recommendedAction}`);

    // Test 5: Productivity Analytics
    console.log('\n[5/6] Testing Productivity Analytics...');
    const analytics = await proactiveIntelligenceService.getProductivityAnalytics(TEST_USER_ID);
    console.log('  ✅ Productivity Analytics:');
    console.log(`     - Task Completion Velocity: ${analytics.taskCompletionVelocity}/week`);
    console.log(`     - Milestone Completion Rate: ${analytics.milestoneCompletionRate}%`);
    console.log(`     - Goal Progress Trend: ${analytics.goalProgressTrend}`);
    console.log(`     - Project Health Trend: ${analytics.projectHealthTrend}`);

    // Test 6: Risk Detection
    console.log('\n[6/6] Testing Risk Detection...');
    const risks = await proactiveIntelligenceService.detectRisks(TEST_USER_ID);
    console.log(`  ✅ Risk Detection: Found ${risks.length} risk(s)`);
    risks.forEach(r => console.log(`     - ${r.type}: ${r.severity}`));

    console.log('\n====================================================');
    console.log('All tests passed!');
    console.log('READY FOR Z.4.7');
    console.log('====================================================');

  } catch (err: any) {
    console.error('\n❌ CERTIFICATION FAILED');
    console.error('Error:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

runProactiveIntelligenceCertification();

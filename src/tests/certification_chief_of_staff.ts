import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { goalManagerService } from '../services/goalManagerService';
import { projectStateService } from '../services/projectStateService';
import { jarvisService } from '../services/jarvisService';
import { jarvisRecommendationService } from '../services/jarvisRecommendationService';
import { createAdminClient } from '../lib/supabase-admin';
import './utils'; // For side effects if any

const TEST_USER_ID = '734a3720-5908-429d-bef9-89c66c5adc17';

async function runChiefOfStaffCertification() {
  console.log('PHASE Z.4.3 — CHIEF OF STAFF INTELLIGENCE CERTIFICATION');
  console.log('====================================================\n');

  const supabase = createAdminClient();
  let goalId: string;
  let projectId: string;

  try {
    // 1. Goal Creation
    console.log('[1/5] Testing Goal Creation...');
    const goal = await goalManagerService.createGoal(
      TEST_USER_ID,
      'I want an ML internship',
      'Secure a machine learning internship for Summer 2027.'
    );
    goalId = goal.id;
    console.log(`  ✅ Goal created: ${goal.title} (ID: ${goalId})`);

    // 2. Goal -> Project Conversion
    console.log('\n[2/5] Testing Goal -> Project Conversion...');
    const { project, milestones } = await projectStateService.convertGoalToProject(TEST_USER_ID, goalId);
    projectId = project.id;
    console.log(`  ✅ Project created: ${project.title}`);
    console.log(`  ✅ Milestones generated: ${milestones.length}`);
    milestones.forEach((m: any, i: number) => console.log(`     ${i+1}. ${m.title}`));

    // 3. Project Health Calculation
    console.log('\n[3/5] Testing Project Health Calculation...');
    const health = await projectStateService.calculateProjectHealth(projectId);
    console.log(`  ✅ Project health: ${health.toUpperCase()}`);

    // 4. Recommendation Generation
    console.log('\n[4/5] Testing Recommendation Generation...');
    const recs = await jarvisRecommendationService.generateProactiveRecommendations(TEST_USER_ID);
    console.log(`  ✅ Recommendations generated: ${recs.length}`);
    recs.slice(0, 2).forEach((r: any) => console.log(`     - ${r.title}: ${r.impact}`));

    // 5. Executive Brief Generation
    console.log('\n[5/5] Testing Executive Brief Generation...');
    const brief = await jarvisService.generateExecutiveBrief(TEST_USER_ID);
    console.log('  ✅ Executive brief generated:');
    console.log(`     Focus: ${brief.current_focus}`);
    console.log(`     Priority Action: ${brief.highest_priority_action}`);

    console.log('\n====================================================');
    console.log('CERTIFICATION SUCCESSFUL');
    console.log('====================================================');

  } catch (err: any) {
    console.error('\n❌ CERTIFICATION FAILED');
    console.error('Error:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n[CLEANUP] Removing test data...');
    // Cascading deletes should handle milestones and recommendations linked to project/goal
    if (goalId!) await supabase.from('user_goals').delete().eq('id', goalId!);
    console.log('  ✅ Cleanup complete.');
  }
}

runChiefOfStaffCertification();

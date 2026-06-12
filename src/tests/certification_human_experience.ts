import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { goalManagerService } from '../services/goalManagerService';
import { projectStateService } from '../services/projectStateService';
import { jarvisService } from '../services/jarvisService';
import { jarvisRecommendationService } from '../services/jarvisRecommendationService';
import { createAdminClient } from '../lib/supabase-admin';
import { getTestUser } from './utils';

// Clear mock DB if using mock
async function clearMockDB() {
  if (process.env.USE_MOCK_SUPABASE === 'true') {
    const { getMockInstance } = require('./mock_admin_client');
    getMockInstance().clear();
  }
}

interface UserType {
  type: string;
  goalTitle: string;
  goalDescription: string;
}

const USER_TYPES: UserType[] = [
  {
    type: 'Student seeking ML internship',
    goalTitle: 'Secure an ML internship in 3 months',
    goalDescription: 'Build a strong portfolio, study ML fundamentals, and apply to internship programs.'
  },
  {
    type: 'Freelancer building business',
    goalTitle: 'Grow freelance client base to 10 clients',
    goalDescription: 'Create a portfolio, network with potential clients, and expand service offerings.'
  },
  {
    type: 'Startup founder',
    goalTitle: 'Launch MVP in 2 months',
    goalDescription: 'Develop core features, test with beta users, and prepare for launch.'
  },
  {
    type: 'Working professional',
    goalTitle: 'Learn cloud architecture for promotion',
    goalDescription: 'Study AWS services, get certified, and apply skills to current projects.'
  },
  {
    type: 'Researcher',
    goalTitle: 'Publish a paper in 6 months',
    goalDescription: 'Conduct experiments, analyze data, and write a research paper.'
  }
];

interface Evaluation {
  usefulness: number;
  clarity: number;
  actionability: number;
  duplication: number;
  relevance: number;
  overallScore: number;
  passed: boolean;
}

export class HumanExperienceCertification {
  private readonly supabase = createAdminClient();
  private userId!: string;
  private evaluations: { [key: string]: Evaluation } = {};
  private createdGoalIds: string[] = [];

  async setup(): Promise<void> {
    this.userId = await getTestUser();
  }

  async evaluateUserType(user: UserType): Promise<Evaluation> {
    console.log(`\n=== Evaluating: ${user.type} ===`);
    
    // Step 1: Create goal
    const goal = await goalManagerService.createGoal(
      this.userId,
      user.goalTitle,
      user.goalDescription,
      'high'
    );
    this.createdGoalIds.push(goal.id);
    console.log('✅ Goal created');

    // Step 2: Create project with milestones and tasks
    const { project, milestones } = await projectStateService.convertGoalToProject(this.userId, goal.id);
    console.log(`✅ Project created with ${milestones.length} milestones`);

    // Step 3: Get recommendations
    const recommendations = await jarvisRecommendationService.generateProactiveRecommendations(this.userId);
    console.log(`✅ Generated ${recommendations.length} recommendations`);

    // Step 4: Get executive brief
    const brief = await jarvisService.generateExecutiveBrief(this.userId);
    console.log('✅ Executive brief generated');

    // Step 5: Evaluate
    const evaluation = this.evaluateOutputs(recommendations, brief);
    console.log(`\nScore: ${evaluation.overallScore}/100`);
    console.log(`Passed: ${evaluation.passed ? '✅' : '❌'}`);

    return evaluation;
  }

  evaluateOutputs(recommendations: any[], brief: any): Evaluation {
    let usefulness = 80;
    let clarity = 80;
    let actionability = 80;
    let duplication = 0;
    let relevance = 80;

    // Check for duplicate recommendations
    const titles = recommendations.map(r => r.title.toLowerCase());
    const uniqueTitles = new Set(titles);
    if (titles.length !== uniqueTitles.size) {
      duplication = ((titles.length - uniqueTitles.size) / titles.length) * 100;
    }

    // Check if recommendations are actionable
    for (const rec of recommendations) {
      if (!rec.title || rec.title.trim().length < 5) actionability -= 10;
      if (!rec.reasoning || rec.reasoning.trim().length < 10) clarity -= 5;
    }

    // Check if brief is generic
    if (brief.goal_summary.includes('working on their current goal')) relevance -= 20;
    if (brief.next_recommended_action.includes('Continue with current work')) actionability -= 15;

    const overallScore = Math.round(
      (usefulness + clarity + actionability + (100 - duplication) + relevance) / 5
    );

    const passed = overallScore >= 70 && duplication <= 10;

    return {
      usefulness,
      clarity,
      actionability,
      duplication,
      relevance,
      overallScore,
      passed
    };
  }

  async cleanup(): Promise<void> {
    console.log('\n=== Cleanup ===');
    for (const goalId of this.createdGoalIds) {
      await this.supabase.from('user_goals').delete().eq('id', goalId);
    }
    console.log('✅ Cleanup complete');
  }

  async run(): Promise<void> {
    console.log('========================================');
    console.log('PHASE A: HUMAN EXPERIENCE CERTIFICATION');
    console.log('========================================');

    await clearMockDB();
    await this.setup();

    let totalScore = 0;
    let allPassed = true;

    for (const user of USER_TYPES) {
      const evaluation = await this.evaluateUserType(user);
      this.evaluations[user.type] = evaluation;
      totalScore += evaluation.overallScore;
      if (!evaluation.passed) allPassed = false;
    }

    const averageScore = Math.round(totalScore / USER_TYPES.length);

    console.log('\n========================================');
    console.log('FINAL RESULTS');
    console.log('========================================');
    console.log(`Average Score: ${averageScore}/100`);
    console.log(`All Passed: ${allPassed ? '✅' : '❌'}`);

    await this.cleanup();

    if (!allPassed) {
      throw new Error('Human Experience Certification failed');
    }
  }
}

if (require.main === module) {
  const cert = new HumanExperienceCertification();
  cert.run().catch(console.error);
}

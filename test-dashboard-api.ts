
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testDashboardAPI() {
  console.log('Testing Dashboard API...');
  
  // Import the route handler directly
  const { GET } = await import('./src/app/api/jarvis/dashboard/route');
  
  try {
    const response = await GET();
    const data = await response.json();
    
    console.log('Dashboard API Response received!');
    console.log('Keys:', Object.keys(data));
    
    // Check all required keys
    const requiredKeys = [
      'executiveBrief',
      'goals',
      'projects',
      'tasks',
      'recommendations',
      'blockers',
      'metrics'
    ];
    
    let allKeysPresent = true;
    for (const key of requiredKeys) {
      if (!data.hasOwnProperty(key)) {
        console.error(`❌ Missing key: ${key}`);
        allKeysPresent = false;
      } else {
        console.log(`✅ ${key} present`);
      }
    }
    
    console.log('\nDashboard API:', allKeysPresent ? 'PASS' : 'FAIL');
    
  } catch (error: any) {
    console.error('❌ Dashboard API test failed:', error);
  }
}

testDashboardAPI().catch(err => {
  console.error(err);
  process.exit(1);
});

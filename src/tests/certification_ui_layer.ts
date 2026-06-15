import * as fs from 'fs';
import * as path from 'path';

interface CertificationResult {
  component: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: CertificationResult[] = [];

function checkFileExists(filePath: string, componentName: string) {
  const exists = fs.existsSync(filePath);
  results.push({
    component: componentName,
    status: exists ? 'PASS' : 'FAIL',
    details: exists ? `${componentName} found` : `${componentName} not found at ${filePath}`
  });
  return exists;
}

async function runCertification() {
  console.log('='.repeat(60));
  console.log('EXECUTING UI LAYER CERTIFICATION');
  console.log('='.repeat(60));

  const projectRoot = path.join(__dirname, '..', '..');

  // Check all required pages
  checkFileExists(path.join(projectRoot, 'src', 'app', 'dashboard', 'page.tsx'), 'Executive Dashboard');
  checkFileExists(path.join(projectRoot, 'src', 'app', 'goals', 'page.tsx'), 'Goals View');
  checkFileExists(path.join(projectRoot, 'src', 'app', 'projects', 'page.tsx'), 'Project Timeline');
  checkFileExists(path.join(projectRoot, 'src', 'app', 'tasks', 'page.tsx'), 'Task Center');
  checkFileExists(path.join(projectRoot, 'src', 'app', 'recommendations', 'page.tsx'), 'Recommendation Center');
  checkFileExists(path.join(projectRoot, 'src', 'app', 'brief', 'page.tsx'), 'Executive Brief');
  checkFileExists(path.join(projectRoot, 'src', 'app', 'jarvis', 'page.tsx'), 'Jarvis Chat');
  checkFileExists(path.join(projectRoot, 'src', 'app', 'admin', 'observability', 'page.tsx'), 'Observability Panel');

  // Check design system components
  checkFileExists(path.join(projectRoot, 'src', 'components', 'ui', 'Card.tsx'), 'Card Component');
  checkFileExists(path.join(projectRoot, 'src', 'components', 'ui', 'Badge.tsx'), 'Badge Component');
  checkFileExists(path.join(projectRoot, 'src', 'components', 'ui', 'Button.tsx'), 'Button Component');
  checkFileExists(path.join(projectRoot, 'src', 'components', 'ui', 'Progress.tsx'), 'Progress Component');
  checkFileExists(path.join(projectRoot, 'src', 'components', 'ui', 'Skeleton.tsx'), 'Skeleton Component');
  checkFileExists(path.join(projectRoot, 'src', 'components', 'ui', 'NavLink.tsx'), 'NavLink Component');
  checkFileExists(path.join(projectRoot, 'src', 'components', 'layout', 'Sidebar.tsx'), 'Sidebar Component');
  checkFileExists(path.join(projectRoot, 'src', 'components', 'layout', 'AppLayout.tsx'), 'AppLayout Component');

  // Print results
  console.log('\nRESULTS:');
  console.log('-'.repeat(60));
  let passCount = 0;
  for (const result of results) {
    console.log(`${result.status === 'PASS' ? '✅' : '❌'} ${result.component}: ${result.details}`);
    if (result.status === 'PASS') passCount++;
  }

  console.log('-'.repeat(60));
  console.log(`\nTOTAL: ${passCount}/${results.length} PASSED`);

  const allPassed = results.every(r => r.status === 'PASS');
  if (allPassed) {
    console.log('\n🎉 UI LAYER CERTIFIED!');
    process.exit(0);
  } else {
    console.log('\n❌ UI LAYER CERTIFICATION FAILED');
    process.exit(1);
  }
}

runCertification();

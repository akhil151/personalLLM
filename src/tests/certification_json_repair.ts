
import { safeJsonParser } from '../lib/safeJsonParser';
import { GoalPlanSchema, TaskSchema } from '../types/schemas';

async function runJsonRepairCertification() {
  console.log('JSON REPAIR CERTIFICATION');
  console.log('=========================\n');

  const report = {
    topLevelRepair: 'FAIL',
    nestedObjectRepair: 'FAIL',
    nestedArrayRepair: 'FAIL',
    schemaValidation: 'FAIL',
    uselessObjectFilter: 'FAIL',
    blockers: [] as string[]
  };

  // Test 1: Top-level repair
  console.log('Test 1: JSON Repair Top-Level');
  try {
    const test1Input = JSON.stringify({ "ttitle": "Task A" });
    const result = safeJsonParser.parse(test1Input, TaskSchema);
    if (result.success && result.data?.title === 'Task A') {
      report.topLevelRepair = 'PASS';
      console.log('  ✅ PASS');
    } else {
      report.blockers.push(`Top-Level Repair failed: ${result.error}`);
    }
  } catch (err: any) {
    report.blockers.push(`Top-Level Repair exception: ${err.message}`);
  }

  // Test 2: Nested object repair
  console.log('\nTest 2: JSON Repair Nested Object');
  try {
    const test2Input = JSON.stringify({ "title": "Test Task", "desscription": "Example" });
    const result = safeJsonParser.parse(test2Input, TaskSchema);
    if (result.success && result.data?.description === 'Example') {
      report.nestedObjectRepair = 'PASS';
      console.log('  ✅ PASS');
    } else {
      report.blockers.push(`Nested Object Repair failed: ${result.error}`);
    }
  } catch (err: any) {
    report.blockers.push(`Nested Object Repair exception: ${err.message}`);
  }

  // Test 3: Nested array repair
  console.log('\nTest 3: JSON Repair Nested Array');
  try {
    const test3Input = JSON.stringify({
      "milestones": [
        {
          "title": "Milestone 1",
          "order_index": 0,
          "tasks": [
            {
              "ttitle": "Nested Task"
            }
          ]
        }
      ]
    });
    const result = safeJsonParser.parse(test3Input, GoalPlanSchema);
    if (result.success && result.data?.milestones[0]?.tasks[0]?.title === 'Nested Task') {
      report.nestedArrayRepair = 'PASS';
      console.log('  ✅ PASS');
    } else {
      report.blockers.push(`Nested Array Repair failed: ${result.error}`);
    }
  } catch (err: any) {
    report.blockers.push(`Nested Array Repair exception: ${err.message}`);
  }

  // Test 4: Schema validation
  console.log('\nTest 4: Schema Validation');
  try {
    const test4Input = JSON.stringify({
      "ttitle": "Valid Task",
      "desscription": "Valid description"
    });
    const result = safeJsonParser.parse(test4Input, TaskSchema);
    if (result.success) {
      report.schemaValidation = 'PASS';
      console.log('  ✅ PASS');
    } else {
      report.blockers.push(`Schema Validation failed: ${result.error}`);
    }
  } catch (err: any) {
    report.blockers.push(`Schema Validation exception: ${err.message}`);
  }

  // Test 5: Useless object filtering
  console.log('\nTest 5: Filter useless objects');
  try {
    const test5Input = JSON.stringify({
      "milestones": [
        {
          "title": "Master Quantum Mechanics Fundamentals",
          "description": "Understand core quantum principles",
          "order_index": 0,
          "priority": "high",
          "estimated_effort": 20,
          "tasks": [
            { "title": "Read 'Quantum Computing for Everyone'", "priority": "high" },
            { "title": "Watch MIT OCW lectures", "priority": "high" },
            { " ": ", " } // The useless object
          ]
        }
      ],
      "priority": "high"
    });
    const result = safeJsonParser.parse(test5Input, GoalPlanSchema);
    if (result.success) {
      report.uselessObjectFilter = 'PASS';
      console.log('  ✅ PASS');
    } else {
      report.blockers.push(`Useless Object Filter failed: ${result.error}`);
    }
  } catch (err: any) {
    report.blockers.push(`Useless Object Filter exception: ${err.message}`);
  }

  // Final report
  console.log('\n=========================');
  console.log('CERTIFICATION REPORT');
  console.log('=========================');
  console.log(`JSON Repair Top-Level: ${report.topLevelRepair}`);
  console.log(`JSON Repair Nested Object: ${report.nestedObjectRepair}`);
  console.log(`JSON Repair Nested Array: ${report.nestedArrayRepair}`);
  console.log(`Schema Validation: ${report.schemaValidation}`);
  console.log(`Filter useless objects: ${report.uselessObjectFilter}`);

  console.log('\nBLOCKERS:');
  if (report.blockers.length === 0) {
    console.log('  None');
  } else {
    report.blockers.forEach(b => console.log(`  - ${b}`));
  }

  console.log('\nFINAL VERDICT:');
  const isCertified = report.topLevelRepair === 'PASS' &&
    report.nestedObjectRepair === 'PASS' &&
    report.nestedArrayRepair === 'PASS' &&
    report.schemaValidation === 'PASS' &&
    report.uselessObjectFilter === 'PASS';
  
  if (isCertified) {
    console.log('  JSON REPAIR CERTIFIED');
  } else {
    console.log('  JSON REPAIR NOT CERTIFIED');
  }
  console.log('=========================');
}

runJsonRepairCertification().catch(err => {
  console.error('Certification Script Crashed:', err);
  process.exit(1);
});


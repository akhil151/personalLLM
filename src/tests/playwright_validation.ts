import { chromium } from 'playwright';
import { performance } from 'perf_hooks';

async function validatePlaywright() {
  console.log('--- PART 1: PLAYWRIGHT RUNTIME VALIDATION ---');
  
  let browser;
  try {
    // 1. Launch Chromium
    const start = performance.now();
    browser = await chromium.launch({ headless: true });
    const end = performance.now();
    const launchLatency = end - start;
    
    const executablePath = (browser as any)._options?.executablePath || 'default';
    console.log(`Executable Path: ${executablePath}`);
    console.log(`Launch Latency: ${launchLatency.toFixed(2)}ms`);

    // 2. Open google.com
    const context = await browser.newContext();
    const page = await context.newPage();
    console.log('Navigating to google.com...');
    await page.goto('https://www.google.com', { waitUntil: 'networkidle' });

    // 3. Capture screenshot
    console.log('Capturing screenshot...');
    const screenshot = await page.screenshot();
    const screenshotSuccess = screenshot.length > 0;
    console.log(`Screenshot Success: ${screenshotSuccess}`);

    // 4. Close browser
    console.log('Closing browser...');
    await browser.close();
    console.log('Shutdown Success: true');

    console.log('\nRESULT: PASS');
    process.exit(0);
  } catch (err: any) {
    console.error(`\nRESULT: FAIL - ${err.message}`);
    if (browser) await browser.close();
    process.exit(1);
  }
}

validatePlaywright();

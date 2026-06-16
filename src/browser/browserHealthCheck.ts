import { chromium } from 'playwright';
import { llmService } from '@/services/llmService';

export interface HealthCheckResult {
  component: string;
  healthy: boolean;
  error?: string;
  details?: any;
}

export interface BrowserHealthReport {
  overall: boolean;
  checks: HealthCheckResult[];
  timestamp: Date;
}

export const browserHealthCheck = {
  async checkPlaywright(): Promise<HealthCheckResult> {
    try {
      await chromium.launch({ headless: true }).then(async (browser) => {
        await browser.close();
      });
      return { component: 'playwright', healthy: true };
    } catch (error: any) {
      return { component: 'playwright', healthy: false, error: error.message };
    }
  },

  async checkChromium(): Promise<HealthCheckResult> {
    try {
      const browser = await chromium.launch({ headless: true });
      const version = browser.version();
      await browser.close();
      return { component: 'chromium', healthy: true, details: { version } };
    } catch (error: any) {
      return { component: 'chromium', healthy: false, error: error.message };
    }
  },

  async checkScreenshotCapability(): Promise<HealthCheckResult> {
    try {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.screenshot({ type: 'jpeg' });
      await browser.close();
      return { component: 'screenshot', healthy: true };
    } catch (error: any) {
      return { component: 'screenshot', healthy: false, error: error.message };
    }
  },

  async checkVisionCapability(): Promise<HealthCheckResult> {
    try {
      const hasVision = await llmService.supportsImageInput();
      return { component: 'vision', healthy: hasVision, details: { hasVision } };
    } catch (error: any) {
      return { component: 'vision', healthy: false, error: error.message };
    }
  },

  async runAll(): Promise<BrowserHealthReport> {
    const checks = await Promise.all([
      this.checkPlaywright(),
      this.checkChromium(),
      this.checkScreenshotCapability(),
      this.checkVisionCapability()
    ]);

    const overall = checks.every(c => c.healthy);
    return {
      overall,
      checks,
      timestamp: new Date()
    };
  },

  async failEarly(): Promise<void> {
    const report = await this.runAll();
    if (!report.overall) {
      const failingChecks = report.checks.filter(c => !c.healthy);
      const errors = failingChecks.map(c => `${c.component}: ${c.error}`).join('; ');
      throw new Error(`Browser health check failed: ${errors}`);
    }
  }
};

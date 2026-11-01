import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function capture() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise((r) => setTimeout(r, 2000)); // wait for charts to animate

  const imgDir = path.join(__dirname, 'docs', 'images');

  // 1. Dashboard screenshot
  console.log('Capturing dashboard...');
  await page.screenshot({ path: path.join(imgDir, 'dashboard.png'), fullPage: false });

  // 2. Decision Logic tab
  console.log('Capturing decision logic...');
  const decisionTabBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find((b) => b.textContent?.includes('Decision Logic'));
  });
  if (decisionTabBtn) {
    await decisionTabBtn.click();
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(imgDir, 'decision-logic.png'), fullPage: false });
  }

  // 3. Season Simulation tab
  console.log('Capturing season simulation...');
  const simTabBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find((b) => b.textContent?.includes('Season Simulation'));
  });
  if (simTabBtn) {
    await simTabBtn.click();
    await new Promise((r) => setTimeout(r, 1000));
    // Click "Run Season Simulation"
    const runBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find((b) => b.textContent?.includes('RUN SEASON SIMULATION'));
    });
    if (runBtn) {
      await runBtn.click();
      await new Promise((r) => setTimeout(r, 2000)); // wait for simulation and charts to render
    }
    await page.screenshot({ path: path.join(imgDir, 'season-simulation.png'), fullPage: false });
  }

  // 4. Model Evaluation tab
  console.log('Capturing model evaluation...');
  const evalTabBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find((b) => b.textContent?.includes('Model Evaluation'));
  });
  if (evalTabBtn) {
    await evalTabBtn.click();
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(imgDir, 'model-evaluation.png'), fullPage: false });
  }

  console.log('Done capturing screenshots!');
  await browser.close();
}

capture().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});

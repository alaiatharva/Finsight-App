const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    const errors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`[Console Error] ${msg.text()}`);
      }
    });
    
    page.on('pageerror', err => {
      errors.push(`[Page Error] ${err.message}`);
    });

    console.log("Navigating to http://localhost:8081...");
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Navigating to /transactions...");
    await page.goto('http://localhost:8081/transactions', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Navigating to /reports...");
    await page.goto('http://localhost:8081/reports', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
    console.log(JSON.stringify(errors, null, 2));
  } catch (err) {
    console.error("Puppeteer Script Error:", err);
  }
})();

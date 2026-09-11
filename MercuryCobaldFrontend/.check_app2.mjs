import { chromium } from "playwright";

const url = "http://localhost:5183";
const shotDir = "/private/tmp/claude-501/-Users-vladimirbelaev-Documents-Programming-cosmohack/9399a770-f86f-4ea5-91fb-5d77ebeac2e1/scratchpad";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

await page.goto(url, { waitUntil: "networkidle" });
await page.click("text=03. Недоступность десяти аппаратов");
await page.waitForTimeout(1500);

await page.click('button:has-text("Маршрут")');
await page.waitForTimeout(400);
await page.screenshot({ path: `${shotDir}/05-route.png` });

await page.click('button:has-text("Сравнение")');
await page.waitForTimeout(400);
await page.screenshot({ path: `${shotDir}/06-compare-empty.png` });

// Save current as a variant
await page.click('button:has-text("Сохранить вариант")');
await page.waitForTimeout(200);
await page.click('button:has-text("OK")');
await page.waitForTimeout(300);
await page.click('button:has-text("Сравнение")');
await page.waitForTimeout(300);
await page.screenshot({ path: `${shotDir}/06-compare-with-variant.png` });

// jump timeline forward to see failures kick in (satellite outages scenario, failures start at hour 6)
await page.click('button:has-text("Маршрут")');
await page.waitForTimeout(300);
const slider = await page.$('input[type=range][aria-label="Момент расчёта"]');
if (slider) {
  await slider.evaluate((el) => { el.value = "400"; el.dispatchEvent(new Event("input", { bubbles: true })); });
}
await page.waitForTimeout(300);
await page.screenshot({ path: `${shotDir}/07-route-later.png` });

console.log("CONSOLE_ERRORS:", JSON.stringify(errors, null, 2));
await browser.close();

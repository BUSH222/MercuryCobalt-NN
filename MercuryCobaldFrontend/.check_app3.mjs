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
await page.waitForTimeout(300);

const slider = page.locator('input[type=range][aria-label="Момент расчёта"]');
const box = await slider.boundingBox();
// click at ~60% along the track -> well past the 6h outage start
await page.mouse.click(box.x + box.width * 0.6, box.y + box.height / 2);
await page.waitForTimeout(400);
await page.screenshot({ path: `${shotDir}/07-route-later.png` });

console.log("CONSOLE_ERRORS:", JSON.stringify(errors, null, 2));
await browser.close();

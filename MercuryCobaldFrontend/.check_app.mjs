import { chromium } from "playwright";

const url = "http://localhost:5183";
const shotDir = "/private/tmp/claude-501/-Users-vladimirbelaev-Documents-Programming-cosmohack/9399a770-f86f-4ea5-91fb-5d77ebeac2e1/scratchpad";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });

const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForSelector("text=Перетащите файл сценария сюда", { timeout: 10000 });
await page.screenshot({ path: `${shotDir}/01-empty-state.png` });

await page.click("text=01. Полная группировка");
await page.waitForSelector("text=Полная группировка", { timeout: 10000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${shotDir}/02-loaded-map.png` });

// switch to polar view
await page.click("text=Карта (полярная)");
await page.waitForTimeout(500);
await page.screenshot({ path: `${shotDir}/03-polar-map.png` });

// switch to stats view
await page.click("text=Статистика");
await page.waitForTimeout(500);
await page.screenshot({ path: `${shotDir}/04-stats.png` });

// switch to route view
await page.click("text=Маршрут");
await page.waitForTimeout(500);
await page.screenshot({ path: `${shotDir}/05-route.png` });

// switch to compare view
await page.click("text=Сравнение");
await page.waitForTimeout(500);
await page.screenshot({ path: `${shotDir}/06-compare.png` });

console.log("CONSOLE_ERRORS:", JSON.stringify(errors, null, 2));

await browser.close();

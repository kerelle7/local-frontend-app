// Shared test setup: JS coverage collection and helpers used across specs.
const { test: base, expect } = require('@playwright/test');
const { addCoverageReport } = require('monocart-reporter');

const test = base.extend({
    // Collects V8 JS coverage for every test (Chromium only, where the API exists)
    autoCoverage: [async ({ page, browserName }, use, testInfo) => {
        const collect = browserName === 'chromium';
        if (collect) await page.coverage.startJSCoverage({ resetOnNavigation: false });
        await use();
        if (collect) await addCoverageReport(await page.coverage.stopJSCoverage(), testInfo);
    }, { auto: true }],
});

// Saves a theme choice before any page script runs, as if picked on an earlier visit
async function gotoWithSavedTheme(page, theme) {
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await page.goto('/');
}

// Makes localStorage throw, as it can in private windows or with site data blocked
async function blockStorage(page) {
    await page.addInitScript(() => {
        const blocked = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
        Storage.prototype.getItem = blocked;
        Storage.prototype.setItem = blocked;
    });
}

// Changes the OS color scheme and waits until the page has received the change event.
// Without the wait, back-to-back changes can be merged and the page never sees them.
async function setOsTheme(page, scheme) {
    const before = await page.evaluate(() => {
        if (!window.__osThemeChanges) {
            window.__osThemeChanges = 0;
            matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { window.__osThemeChanges++; });
        }
        return window.__osThemeChanges;
    });
    await page.emulateMedia({ colorScheme: scheme });
    await page.waitForFunction((n) => window.__osThemeChanges > n, before);
}

const theme = (page) => page.locator('html').getAttribute('data-theme');
const toggle = (page) => page.getByRole('switch', { name: 'Dark mode' });

module.exports = { test, expect, gotoWithSavedTheme, blockStorage, setOsTheme, theme, toggle };

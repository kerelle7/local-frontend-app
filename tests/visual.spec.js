const { test, expect, gotoWithSavedTheme } = require('./fixtures');

// Baselines are Linux Chromium screenshots made in CI; fonts differ on other
// systems, so these only run there. To create or update baselines, see TEST_PLAN.md.
test.describe('VIS: visual appearance', () => {
    test.beforeEach(({ browserName }) => {
        test.skip(browserName !== 'chromium' || process.platform !== 'linux',
            'Visual baselines are Linux Chromium only');
    });

    const cases = [
        ['01', 'light', 'desktop', { width: 1280, height: 720 }],
        ['02', 'dark', 'desktop', { width: 1280, height: 720 }],
        ['03', 'light', 'mobile', { width: 375, height: 812 }],
        ['04', 'dark', 'mobile', { width: 375, height: 812 }],
    ];

    for (const [id, mode, size, viewport] of cases) {
        test(`TC-VIS-${id}: ${mode} mode matches the ${size} baseline`, async ({ page }) => {
            await page.setViewportSize(viewport);
            await gotoWithSavedTheme(page, mode);
            await page.getByRole('button', { name: 'Click Me' }).click();
            await page.mouse.move(0, 0);
            await expect(page).toHaveScreenshot(`${mode}-${size}.png`, { fullPage: true });
        });
    }
});

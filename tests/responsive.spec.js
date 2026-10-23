const { test, expect, gotoWithSavedTheme, toggle } = require('./fixtures');

test.describe('RESP: phone-width layout', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    for (const [id, mode] of [['01', 'light'], ['02', 'dark']]) {
        test(`TC-RESP-${id}: no horizontal scroll at 375px in ${mode} mode`, async ({ page }) => {
            await gotoWithSavedTheme(page, mode);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
            expect(overflow).toBeLessThanOrEqual(0);
        });
    }

    test('TC-RESP-03: header title and toggle are both visible and do not overlap at 375px', async ({ page }) => {
        await page.goto('/');
        const title = await page.locator('.site-title').boundingBox();
        const control = await toggle(page).boundingBox();

        await expect(page.locator('.site-title')).toBeVisible();
        await expect(toggle(page)).toBeInViewport({ ratio: 1 });
        expect(title.x + title.width).toBeLessThanOrEqual(control.x);
    });
});

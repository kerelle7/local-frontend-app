const { test, expect } = require('./fixtures');

test.describe('CNT: click counter', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('TC-CNT-01: result message is empty before any click', async ({ page }) => {
        await expect(page.locator('#output')).toBeEmpty();
    });

    test('TC-CNT-02: each click increments the count in the message', async ({ page }) => {
        const button = page.getByRole('button', { name: 'Click Me' });
        const output = page.locator('#output');

        for (const n of [1, 2, 3]) {
            await button.click();
            await expect(output).toHaveText(`Button clicked ${n} time(s)!`);
        }
    });
});

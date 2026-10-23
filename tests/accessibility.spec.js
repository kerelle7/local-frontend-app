const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect, gotoWithSavedTheme, toggle } = require('./fixtures');

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// Readable one-line-per-problem summary for the failure message
const describe = (violations) => violations
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
    .join('\n');

test.describe('A11Y: accessibility', () => {
    for (const [id, mode] of [['01', 'light'], ['02', 'dark']]) {
        test(`TC-A11Y-${id}: no WCAG 2.1 A/AA violations in ${mode} mode`, async ({ page }) => {
            await gotoWithSavedTheme(page, mode);
            // Click once so the result text is on the page and gets checked too
            await page.getByRole('button', { name: 'Click Me' }).click();
            // Move off the button so its normal colors are checked, not the hover state
            await page.mouse.move(0, 0);

            const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
            expect(violations, describe(violations)).toEqual([]);
        });
    }

    test('TC-A11Y-03: dark mode toggle is exposed as a named switch with its state', async ({ page }) => {
        await page.goto('/');
        await expect(toggle(page)).toBeVisible();
        await expect(toggle(page)).toHaveAttribute('aria-checked', 'false');
        await toggle(page).click();
        await expect(toggle(page)).toBeChecked();
    });
});

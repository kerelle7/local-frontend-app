const { test, expect, blockStorage, setOsTheme, theme, toggle } = require('./fixtures');

const bg = (locator) => locator.evaluate((el) => getComputedStyle(el).backgroundColor);

test.describe('THEME: dark mode toggle and persistence', () => {
    test('TC-THEME-01: toggle switches light → dark → light and reports its state', async ({ page }) => {
        await page.goto('/');
        const knob = page.locator('.toggle-knob');

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
        await expect(toggle(page)).toHaveAttribute('aria-checked', 'false');
        await expect(knob).toHaveText('☀️');

        await toggle(page).click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        await expect(toggle(page)).toHaveAttribute('aria-checked', 'true');
        await expect(knob).toHaveText('🌙');

        await toggle(page).click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
        await expect(toggle(page)).toHaveAttribute('aria-checked', 'false');
    });

    test('TC-THEME-02: chosen theme is saved and restored after a reload', async ({ page }) => {
        await page.goto('/');
        await toggle(page).click();
        expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

        await page.reload();
        expect(await theme(page)).toBe('dark');
        await expect(toggle(page)).toHaveAttribute('aria-checked', 'true');
    });

    test('TC-THEME-03: with no saved choice the page starts in the OS theme', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.goto('/');
        expect(await theme(page)).toBe('dark');
        await expect(toggle(page)).toHaveAttribute('aria-checked', 'true');
    });

    test('TC-THEME-04: with no saved choice the page follows a live OS change', async ({ page }) => {
        await page.goto('/');
        await setOsTheme(page, 'dark');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        await setOsTheme(page, 'light');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });

    test('TC-THEME-05: a manual choice is kept when the OS theme changes', async ({ page }) => {
        await page.goto('/');
        await toggle(page).click();
        await setOsTheme(page, 'dark');
        await setOsTheme(page, 'light');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    });

    test('TC-THEME-06: a manual choice is kept on OS change when storage is blocked', async ({ page }) => {
        await blockStorage(page);
        await page.goto('/');
        await toggle(page).click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

        await setOsTheme(page, 'dark');
        await setOsTheme(page, 'light');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    });

    test('TC-THEME-07: toggle can be focused and operated with the keyboard', async ({ page }) => {
        await page.goto('/');
        await toggle(page).focus();
        await expect(toggle(page)).toBeFocused();

        await page.keyboard.press('Space');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
        await page.keyboard.press('Enter');
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

        const outline = await toggle(page).evaluate((el) => getComputedStyle(el).outlineStyle);
        expect(outline).toBe('solid');
    });

    test('TC-THEME-08: each theme applies its palette to page, card and button', async ({ page }) => {
        await page.goto('/');
        const body = page.locator('body');
        const card = page.locator('.card');
        const button = page.getByRole('button', { name: 'Click Me' });

        expect(await bg(body)).toBe('rgb(244, 244, 249)');
        expect(await bg(card)).toBe('rgb(255, 255, 255)');
        const lightButton = await bg(button);

        await toggle(page).click();
        expect(await bg(body)).toBe('rgb(18, 18, 24)');
        expect(await bg(card)).toBe('rgb(29, 29, 38)');
        expect(await bg(button)).toBe('rgb(57, 255, 20)');
        expect(lightButton).not.toBe('rgb(57, 255, 20)');
    });
});

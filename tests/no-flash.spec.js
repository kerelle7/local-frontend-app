const { test, expect, gotoWithSavedTheme, theme } = require('./fixtures');

test.describe('FLASH: theme applied before first paint', () => {
    test('TC-FLASH-01: theme-init.js loads in <head> before the stylesheet, without defer/async', async ({ page }) => {
        await page.goto('/');
        const head = await page.evaluate(() =>
            [...document.head.querySelectorAll('script, link[rel="stylesheet"]')].map((el) => ({
                tag: el.tagName,
                src: el.getAttribute('src') || el.getAttribute('href'),
                defer: el.defer || false,
                async: el.hasAttribute('async'),
            })));

        const init = head.findIndex((el) => el.src === 'theme-init.js');
        const css = head.findIndex((el) => el.src === 'styles.css');
        expect(init, 'theme-init.js must be in <head>').toBeGreaterThanOrEqual(0);
        expect(init, 'theme-init.js must come before styles.css').toBeLessThan(css);
        expect(head[init]).toMatchObject({ defer: false, async: false });
    });

    test('TC-FLASH-02: index.html contains no inline scripts', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('script:not([src])')).toHaveCount(0);
    });

    test('TC-FLASH-03: a saved theme wins over a conflicting OS setting on load', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await gotoWithSavedTheme(page, 'dark');
        expect(await theme(page)).toBe('dark');
    });

    test('TC-FLASH-04: an invalid saved value falls back to the OS theme', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        await gotoWithSavedTheme(page, 'purple');
        expect(await theme(page)).toBe('dark');
    });

    test('TC-FLASH-05: theme-init.js is render-blocking and finishes before first paint', async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'renderBlockingStatus and paint timing are Chromium-only');
        await gotoWithSavedTheme(page, 'dark');

        const timing = await page.evaluate(async () => {
            const init = performance.getEntriesByType('resource').find((e) => e.name.endsWith('/theme-init.js'));
            // The paint entry can be recorded after load, so wait for it rather than reading it once
            const firstPaint = await new Promise((resolve) => {
                new PerformanceObserver((list, observer) => {
                    const entry = list.getEntriesByName('first-paint')[0];
                    if (entry) { observer.disconnect(); resolve(entry.startTime); }
                }).observe({ type: 'paint', buffered: true });
            });
            return { blocking: init.renderBlockingStatus, initEnd: init.responseEnd, firstPaint };
        });

        expect(timing.blocking).toBe('blocking');
        expect(timing.firstPaint).toBeGreaterThan(timing.initEnd);
    });
});

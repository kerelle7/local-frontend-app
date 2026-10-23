// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORT = 4173;
const CI = !!process.env.CI;

module.exports = defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: CI,
    retries: CI ? 2 : 0,
    reporter: [
        ['list'],
        ['html', { outputFolder: 'reports/html', open: 'never' }],
        ['junit', { outputFile: 'reports/junit.xml' }],
        ['monocart-reporter', {
            name: 'Local Mac Playground – regression tests',
            outputFile: 'reports/monocart/index.html',
            coverage: {
                outputDir: 'reports/coverage',
                // Only measure the app's own scripts
                entryFilter: (entry) => /\/(script|theme-init)\.js$/.test(entry.url),
                reports: ['v8', 'console-summary', 'lcovonly', 'json-summary'],
            },
        }],
    ],
    use: {
        baseURL: `http://localhost:${PORT}`,
        colorScheme: 'light',
        // Turns off the theme transitions so colors are final when asserted
        reducedMotion: 'reduce',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
    ],
    webServer: {
        command: `python3 -m http.server ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !CI,
    },
});

// Reads a test run's results from the files Playwright writes, so every
// consumer (job summary, PR comment, report site) reports the same numbers.
const fs = require('fs');
const path = require('path');

const MIN_LINE_COVERAGE = 90;

function readResults(reportsDir = 'reports') {
    const junitPath = path.join(reportsDir, 'junit.xml');
    const coveragePath = path.join(reportsDir, 'coverage', 'coverage-summary.json');
    const junit = fs.existsSync(junitPath) ? fs.readFileSync(junitPath, 'utf8') : '';

    let totals = null;
    const failing = [];
    const root = junit.match(/<testsuites[^>]*>/);
    if (root) {
        const attr = (name) => Number((root[0].match(new RegExp(`${name}="([\\d.]+)"`)) || [])[1] || 0);
        const total = attr('tests');
        const failed = attr('failures') + attr('errors');
        const skipped = attr('skipped');
        totals = { total, passed: total - failed - skipped, failed, skipped };

        // Each suite's hostname is the Playwright project (browser)
        for (const [, browser, body] of junit.matchAll(/<testsuite [^>]*hostname="([^"]+)"[^>]*>([\s\S]*?)<\/testsuite>/g)) {
            for (const [, name, testcase] of body.matchAll(/<testcase name="([^"]+)"[^>]*>([\s\S]*?)<\/testcase>/g)) {
                if (testcase.includes('<failure')) failing.push({ browser, name: unescapeXml(name.replace(/^.*› /, '')) });
            }
        }
    }

    let coverage = null;
    if (fs.existsSync(coveragePath)) {
        const summary = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        coverage = Object.entries(summary).map(([file, s]) => ({
            file: file === 'total' ? 'Total' : file.split('/').pop(),
            lines: s.lines.pct,
            branches: s.branches.pct,
            functions: s.functions.pct,
        }));
    }
    const totalCoverage = coverage && coverage.find((c) => c.file === 'Total');
    // A missing summary fails the gate, so losing coverage collection can't silently disable it
    const coverageOk = Boolean(totalCoverage && totalCoverage.lines >= MIN_LINE_COVERAGE);

    return { totals, failing, coverage, coverageOk, minLineCoverage: MIN_LINE_COVERAGE };
}

function unescapeXml(text) {
    return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

module.exports = { readResults, MIN_LINE_COVERAGE };

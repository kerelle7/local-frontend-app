// Writes a Markdown summary of the test run to the GitHub job summary and
// fails if line coverage of the app scripts drops below the threshold.
const fs = require('fs');

const MIN_LINE_COVERAGE = 90;
const out = [];

const junit = fs.existsSync('reports/junit.xml') ? fs.readFileSync('reports/junit.xml', 'utf8') : '';
const root = junit.match(/<testsuites[^>]*>/);
if (root) {
    const attr = (name) => Number((root[0].match(new RegExp(`${name}="([\\d.]+)"`)) || [])[1] || 0);
    const total = attr('tests');
    const failed = attr('failures') + attr('errors');
    const skipped = attr('skipped');
    out.push('## Test results', '', '| Total | Passed | Failed | Skipped |', '|---|---|---|---|',
        `| ${total} | ${total - failed - skipped} | ${failed} | ${skipped} |`, '');

    // Each suite's hostname is the Playwright project (browser)
    const failing = [];
    for (const [, browser, body] of junit.matchAll(/<testsuite [^>]*hostname="([^"]+)"[^>]*>([\s\S]*?)<\/testsuite>/g)) {
        for (const [, name, testcase] of body.matchAll(/<testcase name="([^"]+)"[^>]*>([\s\S]*?)<\/testcase>/g)) {
            if (testcase.includes('<failure')) failing.push(`- \`${browser}\` ${name.replace(/^.*› /, '')}`);
        }
    }
    if (failing.length) out.push('### Failing tests', '', ...failing, '');
} else {
    out.push('## Test results', '', 'No JUnit report found; the test run did not complete.', '');
}

// A missing summary fails the gate, so losing coverage collection can't silently disable it
let coverageOk = false;
const summaryPath = 'reports/coverage/coverage-summary.json';
if (!fs.existsSync(summaryPath)) {
    out.push('## Coverage', '', `**No coverage summary found** at \`${summaryPath}\`; failing the ${MIN_LINE_COVERAGE}% coverage gate.`, '');
} else {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    out.push('## Coverage (Chromium, app scripts)', '', '| File | Lines | Branches | Functions |', '|---|---|---|---|');
    for (const [file, s] of Object.entries(summary)) {
        const name = file === 'total' ? '**Total**' : file.split('/').pop();
        out.push(`| ${name} | ${s.lines.pct}% | ${s.branches.pct}% | ${s.functions.pct}% |`);
    }
    coverageOk = summary.total.lines.pct >= MIN_LINE_COVERAGE;
    out.push('', `Line coverage threshold: ${MIN_LINE_COVERAGE}% — ${coverageOk ? 'met' : '**not met**'}`, '');
}

const text = out.join('\n');
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
console.log(text);
if (!coverageOk) process.exit(1);

// Writes a Markdown summary of the test run to the GitHub job summary and
// fails if line coverage of the app scripts drops below the threshold.
const fs = require('fs');
const { readResults } = require('./lib/results');

const { totals, failing, coverage, coverageOk, minLineCoverage } = readResults();
const out = [];

if (totals) {
    out.push('## Test results', '', '| Total | Passed | Failed | Skipped |', '|---|---|---|---|',
        `| ${totals.total} | ${totals.passed} | ${totals.failed} | ${totals.skipped} |`, '');
    if (failing.length) out.push('### Failing tests', '', ...failing.map((f) => `- \`${f.browser}\` ${f.name}`), '');
} else {
    out.push('## Test results', '', 'No JUnit report found; the test run did not complete.', '');
}

if (!coverage) {
    out.push('## Coverage', '', `**No coverage summary found**; failing the ${minLineCoverage}% coverage gate.`, '');
} else {
    out.push('## Coverage (Chromium, app scripts)', '', '| File | Lines | Branches | Functions |', '|---|---|---|---|');
    for (const c of coverage) {
        const name = c.file === 'Total' ? '**Total**' : c.file;
        out.push(`| ${name} | ${c.lines}% | ${c.branches}% | ${c.functions}% |`);
    }
    out.push('', `Line coverage threshold: ${minLineCoverage}% — ${coverageOk ? 'met' : '**not met**'}`, '');
}

const text = out.join('\n');
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
// Also kept as a file for the pull request comment
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/summary.md', text + '\n');
console.log(text);
if (!coverageOk) process.exit(1);

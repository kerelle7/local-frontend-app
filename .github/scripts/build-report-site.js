// Adds one commit's test reports to the report history site and rebuilds its
// pages. The site directory is the `test-reports` branch; it is served under
// /test-reports/ on GitHub Pages.
//
//   <site>/index.html          list of runs, newest first
//   <site>/latest/index.html   redirects to the newest run
//   <site>/<sha>/index.html    summary for one commit
//   <site>/<sha>/html/         Playwright HTML report
//   <site>/<sha>/coverage/     coverage report
//   <site>/<sha>/junit.xml     JUnit results
//   <site>/runs.json           data behind the index
//
// Inputs come from environment variables (see .github/workflows/tests.yml).
const fs = require('fs');
const path = require('path');
const { readResults } = require('./lib/results');

const env = (name, fallback) => {
    const value = process.env[name] || fallback;
    if (value === undefined) throw new Error(`Missing environment variable ${name}`);
    return value;
};

const SITE = env('SITE_DIR');
const REPORTS = env('REPORTS_DIR');
const SHA = env('SHA');
const REPO = env('REPO');
const RUN_URL = env('RUN_URL');
const MESSAGE = env('COMMIT_MESSAGE', '').split('\n')[0];
const DATE = env('COMMIT_DATE', new Date().toISOString());
const TESTS_RESULT = env('TESTS_RESULT', 'unknown');
const KEEP = Number(env('KEEP_RUNS', '50'));

const escapeHtml = (text) => String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function copyIfExists(from, to) {
    if (fs.existsSync(from)) fs.cpSync(from, to, { recursive: true });
    return fs.existsSync(from);
}

// --- Add this commit's reports ---------------------------------------------
const runDir = path.join(SITE, SHA);
fs.rmSync(runDir, { recursive: true, force: true });
fs.mkdirSync(runDir, { recursive: true });
const files = {
    html: copyIfExists(path.join(REPORTS, 'html'), path.join(runDir, 'html')),
    coverage: copyIfExists(path.join(REPORTS, 'coverage'), path.join(runDir, 'coverage')),
    junit: copyIfExists(path.join(REPORTS, 'junit.xml'), path.join(runDir, 'junit.xml')),
};

const results = readResults(REPORTS);
const totalCoverage = results.coverage && results.coverage.find((c) => c.file === 'Total');
const run = {
    sha: SHA,
    message: MESSAGE,
    date: DATE,
    runUrl: RUN_URL,
    // The test job's outcome is authoritative: it also covers the coverage gate
    result: TESTS_RESULT === 'success' ? 'passed' : TESTS_RESULT === 'failure' ? 'failed' : TESTS_RESULT,
    totals: results.totals,
    lineCoverage: totalCoverage ? totalCoverage.lines : null,
    files,
};

// --- Update the run list and prune old runs --------------------------------
const runsPath = path.join(SITE, 'runs.json');
let runs = fs.existsSync(runsPath) ? JSON.parse(fs.readFileSync(runsPath, 'utf8')) : [];
runs = [run, ...runs.filter((r) => r.sha !== SHA)];
for (const old of runs.slice(KEEP)) fs.rmSync(path.join(SITE, old.sha), { recursive: true, force: true });
runs = runs.slice(0, KEEP);
fs.writeFileSync(runsPath, JSON.stringify(runs, null, 2) + '\n');

// --- Pages ------------------------------------------------------------------
const STYLE = `
:root { color-scheme: light; --bg: #f4f4f9; --surface: #fff; --text: #333; --muted: #666;
  --border: #e5e5ea; --accent: #0068d6; --pass: #1a7f37; --fail: #cf222e; }
@media (prefers-color-scheme: dark) { :root { color-scheme: dark; --bg: #121218; --surface: #1d1d26;
  --text: #e8e8ee; --muted: #a1a1ad; --border: #2c2c38; --accent: #39ff14; --pass: #3fb950; --fail: #ff7b72; } }
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg); color: var(--text); line-height: 1.5; }
main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 48px; }
h1 { font-size: 24px; margin: 0 0 4px; } h2 { font-size: 18px; margin: 28px 0 8px; }
p { margin: 4px 0; } .muted { color: var(--muted); }
a { color: var(--accent); }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 4px 0; overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: 14px; }
th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border); white-space: nowrap; }
tr:last-child td { border-bottom: none; }
td.message { white-space: normal; min-width: 220px; }
th { color: var(--muted); font-weight: 600; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
.badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; border: 1px solid currentColor; }
.passed { color: var(--pass); } .failed { color: var(--fail); } .unknown, .cancelled, .skipped { color: var(--muted); }
.links { display: flex; flex-wrap: wrap; gap: 2px 12px; white-space: normal; }
td .links { max-width: 170px; }
`;

const page = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body><main>
${body}
</main></body>
</html>
`;

const short = (sha) => sha.slice(0, 7);
const commitUrl = (sha) => `https://github.com/${REPO}/commit/${sha}`;
const badge = (result) => `<span class="badge ${escapeHtml(result)}">${escapeHtml(result)}</span>`;
const formatDate = (iso) => `${new Date(iso).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
const pct = (value) => (value === null || value === undefined ? '—' : `${value}%`);

function runLinks(r, base, { summary = true } = {}) {
    const links = summary ? [`<a href="${base}">Summary</a>`] : [];
    if (r.files.html) links.push(`<a href="${base}html/">Report</a>`);
    if (r.files.coverage) links.push(`<a href="${base}coverage/">Coverage</a>`);
    if (r.files.junit) links.push(`<a href="${base}junit.xml">JUnit</a>`);
    links.push(`<a href="${escapeHtml(r.runUrl)}">CI run</a>`);
    return `<span class="links">${links.join('')}</span>`;
}

// Per-commit summary page
const failingRows = results.failing
    .map((f) => `<tr><td><code>${escapeHtml(f.browser)}</code></td><td class="message">${escapeHtml(f.name)}</td></tr>`).join('');
const coverageRows = (results.coverage || [])
    .map((c) => `<tr><td>${c.file === 'Total' ? '<strong>Total</strong>' : `<code>${escapeHtml(c.file)}</code>`}</td>`
        + `<td class="num">${pct(c.lines)}</td><td class="num">${pct(c.branches)}</td><td class="num">${pct(c.functions)}</td></tr>`).join('');
const t = run.totals;
fs.writeFileSync(path.join(runDir, 'index.html'), page(`Test report ${short(SHA)}`, `
<p><a href="../">← All runs</a></p>
<h1>Test report for <code>${short(SHA)}</code> ${badge(run.result)}</h1>
<p class="message">${escapeHtml(MESSAGE)}</p>
<p class="muted">${formatDate(DATE)} · <a href="${commitUrl(SHA)}">View commit</a></p>
<p>${runLinks(run, './')}</p>

<h2>Results</h2>
<div class="card"><table>
<tr><th class="num">Total</th><th class="num">Passed</th><th class="num">Failed</th><th class="num">Skipped</th></tr>
${t ? `<tr><td class="num">${t.total}</td><td class="num">${t.passed}</td><td class="num">${t.failed}</td><td class="num">${t.skipped}</td></tr>`
        : '<tr><td colspan="4">No JUnit results: the test run did not complete.</td></tr>'}
</table></div>
${failingRows ? `<h2>Failing tests</h2><div class="card"><table><tr><th>Browser</th><th>Test</th></tr>${failingRows}</table></div>` : ''}

<h2>Coverage <span class="muted">(Chromium, app scripts; gate ${results.minLineCoverage}% lines)</span></h2>
<div class="card"><table>
<tr><th>File</th><th class="num">Lines</th><th class="num">Branches</th><th class="num">Functions</th></tr>
${coverageRows || '<tr><td colspan="4">No coverage summary for this run.</td></tr>'}
</table></div>
`));

// Index of all runs
const rows = runs.map((r) => `<tr>
<td><a href="${r.sha}/"><code>${short(r.sha)}</code></a></td>
<td class="message">${escapeHtml(r.message)}</td>
<td>${formatDate(r.date).replace(' ', '<br>')}</td>
<td>${badge(r.result)}</td>
<td class="num">${r.totals ? `${r.totals.passed} / ${r.totals.failed} / ${r.totals.skipped}` : '—'}</td>
<td class="num">${pct(r.lineCoverage)}</td>
<td>${runLinks(r, `${r.sha}/`, { summary: false })}</td>
</tr>`).join('\n');
fs.writeFileSync(path.join(SITE, 'index.html'), page('Test reports', `
<h1>Test reports</h1>
<p class="muted">Regression test results for each commit to <code>master</code> of
<a href="https://github.com/${REPO}">${escapeHtml(REPO)}</a>. Newest first; the latest ${KEEP} runs are kept.</p>
<p><a href="latest/">Latest report →</a> · <a href="../">Open the app</a></p>
<h2>Runs</h2>
<div class="card"><table>
<tr><th>Commit</th><th>Message</th><th>Date</th><th>Result</th><th class="num">Pass / Fail / Skip</th><th class="num">Lines</th><th>Reports</th></tr>
${rows}
</table></div>
`));

// Stable "latest" link
fs.mkdirSync(path.join(SITE, 'latest'), { recursive: true });
fs.writeFileSync(path.join(SITE, 'latest', 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=../${runs[0].sha}/">
<link rel="canonical" href="../${runs[0].sha}/">
<title>Latest test report</title></head>
<body><p>Redirecting to the <a href="../${runs[0].sha}/">latest test report</a>.</p></body></html>
`);

console.log(`Added ${short(SHA)} (${run.result}); ${runs.length} run(s) in the site.`);

// Enforces the test naming convention from docs/testing/TEST_PLAN.md:
// every test title starts with a unique `TC-<AREA>-<NN>: ` ID, and the
// plan's test case table lists exactly the IDs that exist in tests/.
const { execSync } = require('child_process');
const fs = require('fs');

// --reporter=list overrides the configured reporters, which would otherwise
// write a JUnit file listing every test as skipped; if the real test run then
// never happens, that file would be reported as its results
const listing = execSync('npx playwright test --list --project chromium --reporter=list', { encoding: 'utf8' });
const titles = [...listing.matchAll(/› ([^›\n]+)$/gm)].map((m) => m[1].trim());

const errors = [];
const ids = [];
for (const title of titles) {
    const match = title.match(/^(TC-[A-Z0-9]+-\d{2}): /);
    if (!match) errors.push(`Title does not start with "TC-<AREA>-<NN>: ": ${title}`);
    else ids.push(match[1]);
}

const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
for (const id of new Set(duplicates)) errors.push(`Duplicate test ID: ${id}`);

const plan = fs.readFileSync('docs/testing/TEST_PLAN.md', 'utf8');
const planIds = [...plan.matchAll(/^\| (TC-[A-Z0-9]+-\d{2}) \|/gm)].map((m) => m[1]);
for (const id of ids) if (!planIds.includes(id)) errors.push(`${id} is missing from the test plan's test case table`);
for (const id of planIds) {
    const retired = new RegExp(`^\\| ${id} \\|.*Retired`, 'm').test(plan);
    if (!ids.includes(id) && !retired) errors.push(`${id} is in the test plan but no test has that ID`);
}

if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
}
console.log(`${ids.length} test IDs follow the naming convention and match the test plan.`);

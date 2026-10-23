# Test Report — Local Mac Playground

Results of running the suite described in [TEST_PLAN.md](TEST_PLAN.md). Newest run first.

## Run 1 — initial suite (local, before contrast fix)

| | |
|---|---|
| **Date** | 2026-10-23 |
| **Branch / commit** | `test/regression-suite`, first commit (tests, CI, docs) |
| **Environment** | macOS, Node 26.12.1, Playwright 1.64.1, axe-core 4.14 |
| **Browsers** | chromium, firefox, webkit, mobile-safari |
| **Result** | ❌ **Failed — expected.** 1 case fails in all 4 browsers (known contrast defect, see below) |

### Summary

| Total | Passed | Failed | Skipped |
|---|---|---|---|
| 84 (21 cases × 4 browsers) | 77 | 4 | 3 |

Skipped: TC-FLASH-05 in firefox, webkit and mobile-safari (Chromium-only timing APIs, as planned).

### Results by test case

| ID | chromium | firefox | webkit | mobile-safari |
|---|---|---|---|---|
| TC-CNT-01 – 02 | ✅ | ✅ | ✅ | ✅ |
| TC-THEME-01 – 08 | ✅ | ✅ | ✅ | ✅ |
| TC-FLASH-01 – 04 | ✅ | ✅ | ✅ | ✅ |
| TC-FLASH-05 | ✅ | ⏭️ | ⏭️ | ⏭️ |
| **TC-A11Y-01** | ❌ | ❌ | ❌ | ❌ |
| TC-A11Y-02 – 03 | ✅ | ✅ | ✅ | ✅ |
| TC-RESP-01 – 03 | ✅ | ✅ | ✅ | ✅ |

### Defects found

| ID | Test case | Severity | Description | Status |
|---|---|---|---|---|
| D-01 | TC-A11Y-01 | Serious (WCAG 1.4.3) | Light mode: `#clickBtn` (white on `#007aff`) and `#output` (`#007aff` on white) have 4.01:1 contrast; 4.5:1 required. Pre-existing in the original light theme. | Open — left unfixed on purpose to confirm CI catches it |

### Coverage (Chromium)

| File | Lines | Branches | Functions |
|---|---|---|---|
| script.js | 100% | 100% | 100% |
| theme-init.js | 100% | 100% | 100% |

### Issues found in the tests while building them

- **TC-A11Y-01 missed the button.** After clicking **Click Me** the mouse stayed over it, so axe measured the hover color (`#0056b3`, which passes). Fixed by moving the mouse away before the scan; the button is now correctly flagged.
- **TC-FLASH-05 was flaky** (5 of 20 runs failed) because the first-paint timing entry was sometimes read before the browser recorded it. Fixed by waiting for the entry; 30 of 30 runs then passed.
- **TC-THEME-05/06 could pass without testing anything.** Switching the OS theme to dark and straight back to light could be merged by the browser into "no change", so the page's handler never ran. Found because branch coverage showed that path as unexecuted. Fixed with a `setOsTheme` helper that waits for each change to reach the page; coverage of that path confirmed.

### Stability

Full suite run 3 times in a row (252 tests): the only failures were the expected TC-A11Y-01 cases; no flaky tests.

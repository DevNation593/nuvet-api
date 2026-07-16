---
name: bug-investigation
description: >
  Use when diagnosing and fixing unexpected behavior, failed tests, crashes,
  regressions, incorrect outputs, performance degradation, integration failures,
  or production incidents. Reproduce the issue, collect evidence, identify the
  root cause, apply the smallest safe fix, and add regression protection.
license: MIT
metadata:
  version: "1.0.0"
  category: engineering
---

# Bug Investigation

## Purpose

Diagnose defects through evidence instead of guesswork and deliver the smallest
safe correction with regression protection.

Read `AGENTS.md` and use `project-conventions` before modifying code.

## Trigger Conditions

Use this skill when:

- A feature behaves incorrectly.
- A test fails unexpectedly.
- The application crashes.
- A request returns an unexpected response.
- An integration stops working.
- A regression appears after a change.
- Performance degrades.
- A build, deployment, or runtime error needs diagnosis.
- The user provides logs, stack traces, screenshots, or reproduction steps.
- The root cause is unknown.

## When Not to Use

Do not use this skill when:

- The requested behavior has never existed and must be implemented as a feature.
- The task is only reviewing code without a reported defect.
- The root cause is already proven and the fix is straightforward.
- The problem is exclusively infrastructure-related; combine with `devops-release-security`.

## Required Inputs

Collect when available:

- Expected behavior.
- Actual behavior.
- Reproduction steps.
- Environment.
- Relevant version or commit.
- Error messages.
- Stack traces.
- Logs.
- Input data.
- Frequency.
- First known occurrence.
- Recent changes.

## Workflow

### 1. State the Problem Precisely

```text
Under [conditions], the system produces [actual result] instead of [expected result].
```

Separate:

- Confirmed facts.
- User observations.
- Assumptions.
- Unknowns.

### 2. Establish a Baseline

Before changing code:

- Identify the current branch and relevant files.
- Inspect recent related changes when available.
- Run the relevant existing test or command.
- Record the original failure.
- Preserve the exact error message.
- Determine whether the issue is reproducible.

Possible statuses:

- Reproduced.
- Intermittent.
- Not reproduced.
- Blocked by environment.
- Invalid or outdated report.

### 3. Minimize the Reproduction

Reduce the issue to the smallest case that still fails:

- Minimal input.
- Minimal command.
- Minimal request.
- Minimal test.
- Minimal module.
- Minimal environment dependency.

### 4. Trace the Execution Path

Inspect:

- Input.
- Validation.
- Transformation.
- Business logic.
- Persistence.
- External dependencies.
- Output.
- Error handling.

Use logs, tests, breakpoints, traces, or temporary local instrumentation.

Do not commit temporary debug output unless it provides intentional observability.

### 5. Form Evidence-Based Hypotheses

For each hypothesis, record:

- Suspected cause.
- Supporting evidence.
- Contradicting evidence.
- Smallest experiment that can confirm or reject it.

Test one meaningful hypothesis at a time.

### 6. Identify the Root Cause

A root cause must explain:

- Why the defect occurs.
- Why it occurs under the reported conditions.
- Why existing checks failed to prevent it.
- Why the proposed fix addresses the source instead of the symptom.

### 7. Create a Regression Test

Before or together with the fix:

- Create the smallest test that fails because of the defect.
- Verify that it fails for the expected reason.
- Avoid testing private implementation details unnecessarily.

When automated testing is impossible, document deterministic manual reproduction steps.

### 8. Implement the Minimal Fix

The fix must:

- Address the root cause.
- Preserve expected existing behavior.
- Stay within scope.
- Avoid unrelated refactors.
- Include defensive handling when justified.
- Preserve compatibility unless explicitly approved.

### 9. Verify the Fix

Confirm:

1. The original reproduction no longer fails.
2. The regression test passes.
3. Related existing tests pass.
4. Static analysis and build pass.
5. The fix does not create a new error path.
6. Temporary debugging changes were removed.

Use `quality-gates`.

### 10. Review Similar Defects

Search narrowly for the same defective pattern in:

- Sibling modules.
- Similar endpoints.
- Related components.
- Shared utilities.

Do not expand into a broad refactor without justification.

## Decision Rules

- Reproduce before changing code whenever feasible.
- Prefer evidence over intuition.
- Change one causal factor at a time.
- Fix the source, not only the visible symptom.
- Add regression coverage.
- Keep the correction minimal.
- Distinguish application failure from environment failure.
- Stop after two failed repair cycles and report the blocker with evidence.

## Safety Constraints

Never:

- Delete data to make the issue disappear.
- Disable a failing test.
- Weaken assertions without evidence.
- Suppress exceptions without handling the cause.
- Add empty catch blocks.
- Hide errors from monitoring.
- Log secrets or sensitive payloads.
- Modify production directly.
- Run destructive commands.
- Introduce broad dependency upgrades as a speculative fix.
- Claim resolution without rerunning the original reproduction.

## Output Contract

Return:

1. **Investigation status**
2. **Expected versus actual behavior**
3. **Reproduction**
4. **Root cause**
5. **Fix applied**
6. **Regression protection**
7. **Verification**
8. **Related risks**
9. **Manual actions**

## Completion Checklist

- [ ] Expected and actual behavior were documented.
- [ ] The issue was reproduced or the blocker was recorded.
- [ ] The reproduction was minimized.
- [ ] Relevant execution paths were inspected.
- [ ] Root cause was supported by evidence.
- [ ] A regression test was created when possible.
- [ ] The smallest safe fix was implemented.
- [ ] The original reproduction passed after the fix.
- [ ] Related checks were executed.
- [ ] Temporary debugging code was removed.
- [ ] Similar high-risk patterns were considered.
- [ ] No quality checks were bypassed.

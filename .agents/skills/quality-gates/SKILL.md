---
name: quality-gates
description: >
  Use when verifying any code, configuration, documentation, migration, API,
  frontend, backend, infrastructure, or dependency change. Discover the repository's
  real validation commands, run focused checks before broader checks, record
  executable evidence, and prevent completion when required gates fail.
license: MIT
metadata:
  version: "1.0.0"
  category: engineering
---

# Quality Gates

## Purpose

Prove that a change works through executable, reproducible evidence.

This skill does not approve work based only on code appearance, explanations,
or successful file generation.

Read `AGENTS.md`, `docs/ai/QUALITY_GATES.md`, and relevant repository
configuration before running checks.

## Trigger Conditions

Use this skill when:

- Source code was created or modified.
- Tests were added or modified.
- A bug fix was implemented.
- An API contract changed.
- A database migration was added.
- Configuration changed.
- Dependencies changed.
- Docker, CI/CD, or infrastructure changed.
- Documentation contains commands or technical configuration.
- A pull request or final implementation requires validation.
- The user asks whether something works, compiles, passes, or is ready.

## When Not to Use

Do not use this skill for:

- Pure brainstorming.
- High-level explanations with no repository changes.
- Content writing unrelated to executable software.
- Early architecture discussion before an implementation exists.

## Required Inputs

- Changed files.
- Task acceptance criteria.
- Repository commands.
- Relevant test scope.
- Expected environment.
- Known limitations.
- Required quality thresholds when defined.

## Status Model

A check can have only one status:

- **PASS** — Executed successfully.
- **FAIL** — Executed and returned a defect.
- **BLOCKED** — Could not execute because of a documented limitation.
- **NOT APPLICABLE** — Irrelevant to the change, with a reason.
- **NOT RUN** — Relevant but not executed.

Never convert BLOCKED or NOT RUN into PASS.

## Command Discovery

Discover commands from:

- `package.json`
- Lockfiles
- `Makefile`
- `pom.xml`
- `build.gradle`
- `composer.json`
- `pubspec.yaml`
- `pyproject.toml`
- Test configuration
- Linter configuration
- Type-checking configuration
- Docker files
- CI/CD workflows
- `AGENTS.md`
- `docs/ai/QUALITY_GATES.md`

Do not invent scripts.

## Verification Strategy

### Gate 1 — Change Inspection

Inspect:

- `git diff`
- Changed files.
- Unexpected files.
- Generated artifacts.
- Debug statements.
- Secrets.
- Temporary files.
- Merge markers.
- Commented-out code.
- Disabled checks.
- Dependency changes.

Confirm every changed file belongs to the task.

### Gate 2 — Focused Tests

Run the smallest relevant checks first:

- Changed test file.
- Specific test suite.
- Specific package.
- Specific module.
- Specific endpoint.
- Specific component.

### Gate 3 — Static Analysis

Run applicable checks:

- Lint.
- Formatting verification.
- Type checking.
- Compilation.
- Static security analysis.
- Schema validation.
- Configuration validation.

Do not auto-fix broad unrelated files.

### Gate 4 — Build

Run the relevant build:

- Application build.
- Package build.
- Container build.
- Documentation build.
- Infrastructure validation.

A successful build proves buildability, not full behavioral correctness.

### Gate 5 — Integration Verification

When relevant, validate:

- Database integration.
- API integration.
- Frontend-backend interaction.
- External-service adapter.
- Messaging.
- Container startup.
- Health checks.
- Migration compatibility.

### Gate 6 — Broader Regression Suite

Run wider checks when:

- Shared code changed.
- Public contracts changed.
- A dependency changed.
- Build or configuration changed.
- Cross-module behavior changed.
- The change is security-sensitive.
- The change is ready for release.

### Gate 7 — Acceptance Criteria

Map each criterion to evidence:

| Criterion | Evidence | Status |
|---|---|---|
| Observable behavior | Test, command, or manual verification | PASS/FAIL/BLOCKED |

## Domain-Specific Gates

### Backend

- Unit tests.
- Integration tests.
- Type checking or compilation.
- Lint.
- API validation.
- Authorization behavior.
- Database behavior.
- Error handling.

### Frontend

- Unit or component tests.
- Type checking.
- Lint.
- Production build.
- Loading, empty, error, and success states.
- Accessibility.
- Responsive behavior.
- API integration.

### API

- Contract schema.
- Request validation.
- Authentication.
- Authorization.
- Error responses.
- Compatibility.
- Documentation generation.

### Database

- Migration syntax.
- Forward migration.
- Rollback when safe.
- Populated database compatibility.
- Validation queries.
- ORM alignment.
- Locking or performance risks.

### Infrastructure

- Formatting.
- Validation.
- Plan or dry run.
- Policy checks.
- Secrets.
- Destructive changes.
- Network exposure.
- IAM scope.
- Container build.
- Health checks.

Do not apply infrastructure automatically.

### Documentation

- Referenced file paths.
- Command accuracy.
- Internal links.
- Configuration names.
- Version consistency.
- Examples against actual behavior.

## Failure Handling

When a check fails:

1. Preserve the exact command.
2. Record the exit code.
3. Capture the smallest relevant error.
4. Classify the failure.
5. Send a precise repair request.
6. Rerun the failed focused check.
7. Rerun relevant broader checks after repair.

Allow a maximum of two repair cycles for the same unresolved failure.

## Prohibited Practices

Never:

- Claim a test passed without executing it.
- Change PASS criteria after a failure.
- Delete or skip failing tests to obtain a green result.
- Weaken assertions without evidence.
- Add blanket ignore rules.
- Disable lint or type checking.
- Use `|| true` to hide a failure.
- Remove strict compiler settings without approval.
- Treat manual inspection as automated proof.
- Hide relevant portions of a failure log.
- Report a partial suite as the entire suite.

## Output Contract

Return:

1. **Overall decision**
2. **Changed-file inspection**
3. **Commands executed**
4. **Acceptance criteria evidence**
5. **Failures**
6. **Checks not run**
7. **Regression risks**
8. **Approval decision**

For each command:

```text
Command:
Status:
Exit code:
Relevant result:
```

## Completion Checklist

- [ ] Changed files were inspected.
- [ ] Repository commands were discovered from evidence.
- [ ] Focused tests were run first.
- [ ] Applicable static checks were run.
- [ ] Relevant builds were executed.
- [ ] Integration behavior was verified when required.
- [ ] Broader regression checks were run when justified.
- [ ] Acceptance criteria were mapped to evidence.
- [ ] Failures were classified accurately.
- [ ] BLOCKED and NOT RUN were not reported as PASS.
- [ ] No checks were disabled or weakened.
- [ ] Exact commands and outcomes were documented.
- [ ] Final approval reflects the real evidence.

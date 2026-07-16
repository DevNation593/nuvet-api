---
name: feature-delivery
description: >
  Use when implementing a new feature, user story, enhancement, integration,
  workflow, UI behavior, backend capability, or cross-module change. Convert
  requirements into acceptance criteria, implement the smallest complete solution,
  verify it with executable evidence, and produce a structured handoff.
license: MIT
metadata:
  version: "1.0.0"
  category: engineering
---

# Feature Delivery

## Purpose

Deliver complete, production-quality functionality that satisfies explicit
acceptance criteria while preserving architecture, compatibility, security,
and maintainability.

Read `AGENTS.md` and apply the `project-conventions` skill before implementation.

## Trigger Conditions

Use this skill when:

- Implementing a new feature.
- Completing a user story.
- Adding a screen, workflow, endpoint, service, integration, or business rule.
- Extending an existing module.
- Connecting frontend and backend behavior.
- Adding configuration required by a feature.
- Modifying several related files to deliver one capability.
- The user asks to implement, create, develop, add, integrate, or complete functionality.

## When Not to Use

Do not use this skill as the primary workflow when:

- The main task is diagnosing an unknown defect. Use `bug-investigation`.
- The task is only reviewing existing code.
- The task is only creating a database migration. Use `database-migrations`.
- The task is only validating existing changes. Use `quality-gates`.
- The task is mainly infrastructure or deployment. Use `devops-release-security`.

## Required Inputs

- Functional requirement.
- Business objective.
- Acceptance criteria, when provided.
- Relevant module or feature area.
- Constraints and explicit exclusions.
- Repository conventions.
- Expected compatibility requirements.

## Workflow

### 1. Understand the Requirement

Extract:

- User or business goal.
- Expected observable behavior.
- Actors and permissions.
- Inputs and outputs.
- Success path.
- Error paths.
- Edge cases.
- Compatibility requirements.
- Explicitly excluded behavior.

### 2. Define Acceptance Criteria

When criteria are missing, derive testable criteria.

Use:

```text
Given [initial condition]
When [action]
Then [observable result]
```

Each criterion must be observable, specific, verifiable, and limited to scope.

### 3. Assess Complexity

#### Small

- Localized change.
- Minimal dependencies.
- No public contract or schema changes.
- One agent can implement and verify.

#### Medium

- Multiple files or modules.
- API, UI, or persistence changes.
- Independent QA or review required.

#### High Risk

- Authentication or authorization.
- Database migration.
- Infrastructure.
- Financial logic.
- Sensitive data.
- Breaking contract.
- Multi-service workflow.
- Production behavior with rollback risk.

For medium or high-risk tasks, divide work into explicit subtasks with one owner per area.

### 4. Inspect Existing Implementations

Find similar:

- Features.
- Routes.
- Controllers.
- Services.
- Components.
- Forms.
- DTOs or schemas.
- Tests.
- Error responses.
- Configuration patterns.

Reuse the project's established approach.

### 5. Create a Minimal Plan

Include:

1. Files to create or modify.
2. Behavioral changes.
3. Public contract changes.
4. Data changes.
5. Tests to add or modify.
6. Documentation changes.
7. Verification commands.
8. Rollback considerations.

### 6. Implement Incrementally

Use this order when applicable:

1. Domain or business rules.
2. Data contracts and validation.
3. Persistence.
4. Application logic.
5. API or integration layer.
6. User interface.
7. Tests.
8. Documentation.
9. Configuration.
10. Verification.

After each meaningful stage:

- Inspect the diff.
- Confirm files remain inside scope.
- Check imports, references, and duplicated logic.

### 7. Handle Required States

When applicable, implement:

- Success.
- Loading.
- Empty.
- Invalid input.
- Unauthorized.
- Forbidden.
- Not found.
- Conflict.
- Dependency failure.
- Timeout.
- Retry or recovery.
- Partial failure.

### 8. Verify

Use `quality-gates`.

Run:

1. Focused tests.
2. Static analysis.
3. Type checking.
4. Build.
5. Broader regression checks when justified.

### 9. Independent Review

For medium or high-risk changes, request independent review for:

- Correctness.
- Scope compliance.
- Security.
- Backward compatibility.
- Data integrity.
- Deployment impact.
- Missing tests.

## Decision Rules

- Prefer a complete vertical slice over disconnected partial code.
- Keep changes focused on the requested capability.
- Do not introduce abstractions for hypothetical future requirements.
- Preserve backward compatibility unless explicitly authorized.
- Follow the existing error-handling model.
- Use feature flags only when the repository already supports them.
- Update API documentation when public behavior changes.
- Add regression tests for meaningful business rules.
- Do not mark the task complete while acceptance criteria remain unverifiable.

## Safety Constraints

Never:

- Deploy automatically.
- Merge automatically.
- Apply production migrations.
- Commit real secrets.
- Log sensitive information.
- Bypass authentication or authorization.
- Remove validation to satisfy a failing test.
- Disable quality checks.
- Modify unrelated modules.
- Introduce breaking behavior without explicit approval.

## Output Contract

Return:

1. **Result**
2. **Acceptance criteria**
3. **Files changed**
4. **Important implementation decisions**
5. **Verification performed**
6. **Compatibility and security impact**
7. **Remaining risks or limitations**
8. **Manual actions required**

## Completion Checklist

- [ ] Repository conventions were inspected.
- [ ] Requirement and scope were understood.
- [ ] Acceptance criteria were defined.
- [ ] Similar project patterns were reviewed.
- [ ] The smallest complete solution was implemented.
- [ ] Error and edge cases were handled.
- [ ] Relevant tests were added or updated.
- [ ] Documentation was updated when needed.
- [ ] Quality gates were executed.
- [ ] The final diff stayed within scope.
- [ ] Security and compatibility were reviewed.
- [ ] Manual actions were documented.
- [ ] No unsupported success claims were made.

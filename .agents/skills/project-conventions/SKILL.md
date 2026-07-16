---
name: project-conventions
description: >
  Use when starting any software development, maintenance, review, documentation,
  testing, or infrastructure task in this repository. Discover and enforce the
  actual project architecture, commands, naming rules, coding patterns, protected
  files, and definition of done before making changes.
license: MIT
metadata:
  version: "1.0.0"
  category: engineering
---

# Project Conventions

## Purpose

Understand and enforce the repository's actual conventions before analyzing,
creating, modifying, testing, or reviewing code.

This skill prevents agents from:

- Inventing commands.
- Introducing patterns that conflict with the project.
- Modifying protected or generated files.
- Adding unnecessary dependencies.
- Mixing unrelated refactors with the requested task.
- Assuming a framework or architecture without repository evidence.

`AGENTS.md` is the canonical source of global repository instructions.

## Trigger Conditions

Use this skill when:

- Beginning any task that touches the repository.
- Entering an unfamiliar module.
- Creating or modifying source code.
- Adding tests, migrations, documentation, or infrastructure.
- Reviewing a pull request or implementation.
- Determining which verification commands must be executed.
- The repository contains multiple frameworks, services, or applications.
- Existing conventions are unclear or appear inconsistent.

## When Not to Use

Do not use this skill as the only workflow when the request specifically requires:

- Feature implementation.
- Bug investigation.
- API contract design.
- Database migration planning.
- Quality verification.
- Infrastructure or security review.

Use this skill first, then activate the appropriate specialized skill.

## Required Inputs

- User request.
- Repository root.
- `AGENTS.md`, when present.
- Relevant module or directory.
- Existing build, package, test, CI/CD, and infrastructure files.

## Sources of Truth

Inspect sources in this priority order:

1. Explicit user requirements.
2. `AGENTS.md`.
3. Module-specific instruction files.
4. Existing production code.
5. Automated tests.
6. CI/CD workflows.
7. Package and build files.
8. Architecture and project documentation.
9. Framework defaults.

When sources conflict, report the conflict instead of silently choosing one.

## Workflow

### 1. Read Repository Instructions

Search for:

- `AGENTS.md`
- `README.md`
- `CONTRIBUTING.md`
- `CLAUDE.md`
- `.editorconfig`
- Framework-specific rules
- Existing skills
- CI/CD workflows
- Architecture documents

Summarize only the rules relevant to the current task.

### 2. Detect the Actual Stack

Identify from repository evidence:

- Languages.
- Frameworks.
- Runtime versions.
- Package managers.
- Build tools.
- Test frameworks.
- Linters and formatters.
- Database systems.
- Migration tooling.
- Container tooling.
- Deployment and infrastructure tooling.

Do not infer a technology only from a directory name.

### 3. Map the Relevant Module

Identify:

- Entry points.
- Public interfaces.
- Internal dependencies.
- Configuration files.
- Tests.
- Related modules.
- Generated files.
- Files that must not be changed.

### 4. Discover Commands

Find commands from:

- `package.json`
- `Makefile`
- `pom.xml`
- `build.gradle`
- `composer.json`
- `pubspec.yaml`
- `pyproject.toml`
- `Dockerfile`
- `docker-compose.yml`
- CI/CD workflows
- Project documentation

Classify each command as:

- Discovered but not executed.
- Executed successfully.
- Executed and failed.
- Not available in the current environment.

Never claim that a command works unless it was executed successfully.

### 5. Identify Existing Patterns

Inspect at least two representative examples when available:

- Similar feature.
- Similar endpoint.
- Similar component.
- Similar test.
- Similar migration.
- Similar infrastructure module.

Prefer repository patterns over generic framework recommendations.

## Decision Rules

- Use the smallest change that satisfies the requirement.
- Preserve the current architecture unless a change is explicitly required.
- Reuse existing components, services, utilities, and abstractions.
- Avoid adding dependencies unless the current stack cannot satisfy the requirement.
- Do not perform opportunistic refactors outside scope.
- Preserve public contracts unless a breaking change is explicitly approved.
- Keep source code and technical identifiers in English.
- Communicate findings and final reports to the user in Spanish.
- Use conventional commits when the repository follows them.
- Follow existing import, naming, folder, testing, and error-handling patterns.
- Treat generated files as read-only unless the project requires regeneration.

## Safety Constraints

Never:

- Hardcode secrets, passwords, tokens, private keys, or credentials.
- Modify `.env` files containing real secret values.
- Delete user work.
- Use destructive Git commands.
- Force-push.
- Modify production data.
- Execute production deployments.
- Apply infrastructure changes automatically.
- Disable tests, linters, type checking, or security controls.
- Edit lockfiles unless a dependency change requires it.
- Modify generated code manually when a generator exists.

Require explicit human approval before:

- Deploying.
- Merging.
- Deleting data.
- Applying production migrations.
- Changing IAM or network exposure.
- Rotating credentials.
- Performing destructive infrastructure operations.
- Introducing a breaking API change.

## Output Contract

Return:

1. **Stack detected**
2. **Relevant architecture**
3. **Files and modules in scope**
4. **Existing patterns to follow**
5. **Commands discovered**
6. **Protected or generated files**
7. **Conflicts or missing information**
8. **Rules that apply to the current task**

## Completion Checklist

- [ ] `AGENTS.md` was read when present.
- [ ] Relevant project files were inspected.
- [ ] The actual stack was identified from evidence.
- [ ] Existing implementation patterns were reviewed.
- [ ] Verification commands were discovered.
- [ ] Protected and generated files were identified.
- [ ] Conflicting instructions were reported.
- [ ] No command or convention was invented.
- [ ] The next specialized skill was identified when needed.

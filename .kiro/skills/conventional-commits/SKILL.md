# Conventional Commits

## Description
Generate commit messages following the Conventional Commits v1.0.0 specification.
Activate when the user asks to create, suggest, or review a git commit message.

## Instructions

Always structure commits as:
  <type>[optional scope]: <description>
  [optional body]
  [optional footer(s)]

### Types
- feat: new feature (MINOR in SemVer)
- fix: bug fix (PATCH in SemVer)
- docs: documentation only
- style: formatting, no logic change
- refactor: code restructure, no fix/feat
- perf: performance improvement
- test: add or fix tests
- build: build system or dependencies
- ci: CI/CD configuration
- chore: maintenance tasks
- revert: revert a previous commit

### Rules
- Description: lowercase, imperative mood, no period
- Use ! after type/scope for breaking changes: feat!:
- Use BREAKING CHANGE: in footer for major version bumps
- Body starts one blank line after description
- Footers start one blank line after body

### Examples
feat(auth): add OAuth2 login support
fix: prevent null crash on empty user list
docs: update API reference for v2 endpoints
feat!: remove deprecated payment endpoint

BREAKING CHANGE: /v1/pay is no longer available, use /v2/payments
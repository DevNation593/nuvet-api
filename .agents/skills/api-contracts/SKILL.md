---
name: api-contracts
description: >
  Use when creating, modifying, reviewing, documenting, or integrating REST,
  GraphQL, RPC, event, webhook, or internal service contracts. Enforce validation,
  authentication, authorization, consistent errors, compatibility, pagination,
  idempotency, and machine-readable documentation.
license: MIT
metadata:
  version: "1.0.0"
  category: engineering
---

# API Contracts

## Purpose

Design and maintain clear, secure, testable, and backward-compatible contracts
between clients, services, integrations, and external consumers.

Read `AGENTS.md` and use `project-conventions` before changing an API.

## Trigger Conditions

Use this skill when:

- Creating a new endpoint.
- Modifying request or response fields.
- Creating or changing DTOs, schemas, serializers, or validators.
- Adding GraphQL queries, mutations, or subscriptions.
- Publishing or consuming events.
- Creating webhooks.
- Integrating frontend and backend.
- Modifying authentication or authorization behavior.
- Adding pagination, filtering, sorting, or searching.
- Changing API errors or status codes.
- Updating OpenAPI, AsyncAPI, GraphQL schema, or equivalent documentation.
- Reviewing an API for compatibility or security.

## When Not to Use

Do not use this skill as the primary workflow when:

- The task is only internal business logic with no contract impact.
- The task is only a database migration.
- The task is exclusively UI implementation.
- The task is exclusively infrastructure configuration.

## Required Inputs

- Consumer and provider.
- Business operation.
- Authentication method.
- Authorization rules.
- Request shape.
- Response shape.
- Error behavior.
- Compatibility requirements.
- Existing API conventions.
- Documentation format.
- Expected traffic or pagination needs.

## Workflow

### 1. Discover Existing Conventions

Inspect:

- Route or schema conventions.
- Global validation.
- Authentication middleware or guards.
- Authorization model.
- Error filters or handlers.
- Pagination conventions.
- API versioning.
- Existing documentation.
- Client usage.
- Tests.
- Serialization rules.
- Naming conventions.
- Date, timezone, decimal, and identifier formats.

### 2. Define the Operation

Document:

- Purpose.
- Actor.
- Required permission.
- Input.
- Output.
- Side effects.
- Idempotency behavior.
- Error cases.
- Compatibility expectations.

### 3. Define the Request Contract

Specify:

- Path, query, header, body, or event fields.
- Required and optional fields.
- Types.
- Format constraints.
- Length and range constraints.
- Allowed values.
- Nested structure.
- Nullability.
- Defaults.
- Unknown-field behavior.
- File restrictions when relevant.

Validate all external input at the system boundary.

### 4. Define the Response Contract

Specify:

- Success status.
- Response schema.
- Stable field names.
- Identifier format.
- Date and timezone format.
- Decimal and monetary representation.
- Nullability.
- Empty collection behavior.
- Metadata.
- Pagination information.

Do not expose internal entities directly when they contain implementation or sensitive fields.

### 5. Define Error Behavior

Use the project's established error envelope.

Errors should contain safe fields such as:

- Stable error code.
- Human-readable message.
- Field-level validation details.
- Correlation or trace identifier when available.

Typical mappings:

- `400` malformed or invalid request.
- `401` missing or invalid authentication.
- `403` authenticated but not authorized.
- `404` resource not found.
- `409` state or uniqueness conflict.
- `422` semantic validation when used by the project.
- `429` rate limit.
- `500` unexpected server failure.
- `502`, `503`, `504` dependency or availability failures.

Never return stack traces, SQL details, secrets, internal paths, or sensitive values.

### 6. Authentication and Authorization

Verify separately:

- Who is the caller?
- Is the caller authenticated?
- Is the caller authorized?
- Is access restricted to specific resources or tenants?
- Can identifiers be manipulated to access another user's data?
- Are administrative operations explicitly protected?

Authorization must be enforced server-side.

### 7. Compatibility Analysis

#### Backward Compatible

- Adding an optional request field.
- Adding a response field that consumers safely ignore.
- Adding a new endpoint.
- Expanding accepted values only when consumers tolerate them.

#### Potentially Breaking

- Renaming or removing a field.
- Changing a type.
- Making an optional field required.
- Changing nullability.
- Changing status codes.
- Changing error codes.
- Changing pagination.
- Changing authorization.
- Reinterpreting existing fields.

For breaking changes:

- Require explicit approval.
- Use versioning or a compatibility phase.
- Document migration steps.
- Maintain the old contract during the transition.

### 8. Collections and Pagination

Define:

- Pagination style.
- Default and maximum page size.
- Stable sort order.
- Filtering rules.
- Search behavior.
- Empty results.
- Total count behavior.
- Cursor stability.

Prevent unbounded queries.

### 9. Idempotency and Concurrency

Evaluate:

- Idempotency key.
- Duplicate request protection.
- Optimistic concurrency.
- Version field.
- Conflict response.
- Safe retry behavior.

### 10. Events and Webhooks

Define:

- Event name.
- Schema version.
- Producer.
- Consumers.
- Delivery guarantees.
- Ordering assumptions.
- Deduplication strategy.
- Retry strategy.
- Dead-letter handling.
- Signature verification.
- Sensitive-field policy.

### 11. Documentation and Tests

Update:

- OpenAPI.
- AsyncAPI.
- GraphQL schema.
- Protobuf.
- JSON Schema.
- Internal contract documentation.

Add tests for:

- Valid request.
- Validation failure.
- Unauthorized access.
- Forbidden access.
- Not found.
- Conflict.
- Serialization.
- Backward compatibility.
- Pagination or filtering when relevant.

## Decision Rules

- Use existing naming and response conventions.
- Keep contracts explicit and machine-readable.
- Validate at boundaries.
- Avoid leaking persistence details.
- Use stable error codes.
- Preserve backward compatibility by default.
- Document public behavior changes.
- Enforce authorization independently from validation.
- Use bounded pagination.
- Require explicit approval for breaking changes.

## Safety Constraints

Never:

- Return passwords, hashes, tokens, secrets, or private keys.
- Expose internal stack traces.
- Trust client-provided authorization claims without verification.
- Disable validation.
- Expose unrestricted list endpoints over sensitive data.
- Introduce wildcard administrative permissions.
- Log complete sensitive requests.
- Change public contracts silently.
- Deploy a breaking contract without a migration plan.

## Output Contract

Return:

1. **Operation**
2. **Consumers and provider**
3. **Authentication and authorization**
4. **Request contract**
5. **Success response**
6. **Error contract**
7. **Compatibility classification**
8. **Documentation updated**
9. **Tests added or updated**
10. **Security and migration considerations**

## Completion Checklist

- [ ] Existing API conventions were inspected.
- [ ] Inputs and outputs were explicitly defined.
- [ ] Boundary validation was implemented.
- [ ] Authentication was verified.
- [ ] Authorization was verified.
- [ ] Sensitive fields were excluded.
- [ ] Errors follow project conventions.
- [ ] Pagination is bounded when needed.
- [ ] Retry and idempotency behavior were considered.
- [ ] Compatibility impact was classified.
- [ ] Machine-readable documentation was updated.
- [ ] Contract tests were added or updated.
- [ ] Breaking changes received explicit approval.

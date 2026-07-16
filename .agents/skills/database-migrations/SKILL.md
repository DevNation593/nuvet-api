---
name: database-migrations
description: >
  Use when creating, modifying, reviewing, or executing database schema changes,
  data backfills, indexes, constraints, column changes, table changes, or
  persistence migrations. Design reversible, compatible, observable, and
  deployment-safe migrations with explicit rollback and validation procedures.
license: MIT
metadata:
  version: "1.0.0"
  category: engineering
---

# Database Migrations

## Purpose

Protect data integrity, availability, backward compatibility, and rollback
capability during schema and data changes.

Read `AGENTS.md` and use `project-conventions` before creating a migration.

## Trigger Conditions

Use this skill when:

- Creating or altering a table.
- Adding, removing, or renaming a column.
- Adding or changing an index.
- Adding or changing a constraint.
- Changing a column type.
- Modifying nullability.
- Creating a data backfill.
- Migrating data between structures.
- Changing ORM entities in a way that affects the schema.
- Reviewing a migration.
- Planning zero-downtime database changes.
- Resolving query-performance issues through schema changes.

## When Not to Use

Do not use this skill when:

- Only application code changes and the schema remains unchanged.
- The task is only writing a read-only query.
- The task is only documenting an existing data model.
- The task involves direct production data manipulation without a migration workflow.

## Required Inputs

- Current schema.
- Desired schema.
- Database engine and version.
- Migration framework.
- Estimated table size.
- Read and write traffic.
- Deployment model.
- Application versions that may run concurrently.
- Backup and recovery capabilities.
- Downtime tolerance.
- Data retention requirements.

Mark unknown production information as requiring confirmation.

## Risk Classification

### Low Risk

- Creating a new empty table.
- Adding a nullable column without a default.
- Adding a non-blocking index supported by the database.
- Adding a new independent relation.

### Medium Risk

- Backfilling existing rows.
- Adding a constraint after data cleanup.
- Adding a non-null field through multiple stages.
- Creating a large index.
- Changing application read or write paths.

### High Risk

- Dropping a table or column.
- Changing a column type.
- Renaming a widely used column.
- Rewriting a large table.
- Adding a blocking index.
- Updating a large percentage of rows.
- Changing primary or foreign keys.
- Modifying production data irreversibly.

## Workflow

### 1. Inspect the Current Data Model

Review:

- Schema.
- ORM entities.
- Existing migrations.
- Constraints.
- Indexes.
- Relations.
- Query patterns.
- Data access code.
- Tests.
- Deployment process.

### 2. Define the Target State

Document:

- Schema change.
- Data transformation.
- Application behavior change.
- Compatibility window.
- Expected final constraints.
- Expected indexes.
- Cleanup phase.

### 3. Choose a Migration Strategy

Prefer **expand and contract**.

#### Expand

- Add the new structure.
- Keep the old structure.
- Make the change backward compatible.
- Deploy code capable of working during transition.

#### Migrate

- Backfill data safely.
- Validate consistency.
- Monitor errors and performance.
- Switch reads and writes gradually when possible.

#### Contract

- Stop using the old structure.
- Confirm no older application version depends on it.
- Remove obsolete structures in a later release.
- Require explicit approval for destructive cleanup.

### 4. Design Reversibility

Every migration must define:

- Forward operation.
- Rollback operation.
- Conditions under which rollback remains safe.
- Data that cannot be restored automatically.
- Backup or snapshot requirements.
- Point of no return.

### 5. Evaluate Locking and Performance

Assess:

- Table size.
- Lock type.
- Lock duration.
- Full-table scans.
- Table rewrites.
- Index build behavior.
- Replication lag.
- Transaction log growth.
- Disk usage.
- Write amplification.
- Deployment timeout.

For large operations:

- Use online or concurrent capabilities when supported.
- Batch backfills.
- Throttle writes.
- Add checkpoints.
- Make backfills restartable.
- Avoid one massive transaction.

### 6. Data Backfill Rules

Backfills must be:

- Idempotent.
- Restartable.
- Observable.
- Bounded.
- Validated.
- Safe under concurrent writes.

Define:

- Batch size.
- Ordering key.
- Progress tracking.
- Retry behavior.
- Failure handling.
- Completion criteria.
- Validation query.

### 7. Constraints and Nullability

For a new required field:

1. Add it as nullable or with a safe transitional state.
2. Deploy code that writes the new field.
3. Backfill existing rows.
4. Validate that no invalid rows remain.
5. Add the final constraint.
6. Remove transitional logic in a later release.

### 8. Index Design

Before adding an index, verify:

- Query pattern.
- Column order.
- Selectivity.
- Existing overlapping indexes.
- Read benefit.
- Write cost.
- Storage cost.
- Build locking.
- Database support for online creation.

Use query plans or measured evidence when possible.

### 9. Referential Integrity

Verify:

- Existing data validity.
- Cascade behavior.
- Dangerous cascading deletes.
- Orphan cleanup.
- Application deployment order.
- Deletion and update behavior.

### 10. Validation Plan

Define before and after checks:

- Row counts.
- Null counts.
- Duplicate detection.
- Orphan detection.
- Value distribution.
- Aggregate comparison.
- Constraint validation.
- Query performance.
- Error rates.

Example only:

```sql
SELECT COUNT(*) FROM target_table;
SELECT COUNT(*) FROM target_table WHERE new_column IS NULL;

SELECT key_column, COUNT(*)
FROM target_table
GROUP BY key_column
HAVING COUNT(*) > 1;
```

Do not execute production validation queries automatically without approval.

### 11. Deployment Order

1. Backup or recovery confirmation.
2. Expand migration.
3. Compatible application deployment.
4. Backfill.
5. Validation.
6. Constraint activation.
7. Traffic or read-path switch.
8. Observation period.
9. Contract migration.
10. Final cleanup.

### 12. Test the Migration

When possible, test:

- Fresh database.
- Existing populated database.
- Forward migration.
- Rollback.
- Restarted backfill.
- Application compatibility before and after.
- Constraint failures.
- Representative data volume.

## Decision Rules

- Use migrations instead of manual schema changes.
- Prefer additive changes before destructive changes.
- Preserve compatibility across rolling deployments.
- Separate schema changes from large data backfills.
- Make backfills idempotent and restartable.
- Avoid long-running transactions.
- Use measured query behavior for index decisions.
- Require explicit human approval for destructive actions.
- Document production steps without executing them automatically.

## Safety Constraints

Never:

- Apply production migrations automatically.
- Drop production tables or columns.
- Delete production data.
- Run unbounded updates on large production tables.
- Disable referential integrity without an approved plan.
- Rewrite migration history already applied to shared environments.
- Store credentials in migration files.
- Assume a backup exists without confirmation.
- Claim zero downtime without evaluating locking and compatibility.
- Execute destructive rollback operations automatically.

## Output Contract

Return:

1. **Current state**
2. **Target state**
3. **Risk classification**
4. **Migration strategy**
5. **Forward steps**
6. **Backfill strategy**
7. **Compatibility strategy**
8. **Validation queries or checks**
9. **Rollback and recovery**
10. **Locking and performance risks**
11. **Deployment order**
12. **Human approvals required**

## Completion Checklist

- [ ] Current schema and migrations were inspected.
- [ ] Target schema was explicitly defined.
- [ ] Risk level was classified.
- [ ] Compatibility between application versions was considered.
- [ ] Expand-and-contract was used when appropriate.
- [ ] Backfill is idempotent and restartable.
- [ ] Locking and table rewrite risks were assessed.
- [ ] Index costs and benefits were evaluated.
- [ ] Forward and rollback strategies were documented.
- [ ] Validation checks were defined.
- [ ] Migration was tested locally when possible.
- [ ] Destructive operations require explicit approval.
- [ ] No production migration was executed automatically.

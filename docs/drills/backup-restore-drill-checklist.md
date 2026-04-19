# Backup/Restore Drill Checklist

## Metadata
- Date:
- Environment:
- Responsible:
- Observer:

## Preconditions
- [ ] DATABASE_URL available
- [ ] DRILL_DATABASE_URL available
- [ ] Last full backup older than 24h is available for restore test
- [ ] Incident channel created for drill notes

## Procedure
1. Trigger backup
- Command: `pnpm ops:backup`
- Evidence: backup file path and size

2. Run restore drill
- Command: `pnpm ops:drill`
- Evidence: console output with successful restore verification

3. Validate business-critical tables
- Example query: `select count(*) from "PosTicket";`
- Evidence: row counts and spot-check records

4. Capture timings
- Backup start/end:
- Restore start/end:
- Total drill duration:

## Acceptance Criteria
- [ ] Backup succeeded
- [ ] Restore succeeded without manual SQL patching
- [ ] Critical entities readable after restore
- [ ] RTO <= 60 minutes
- [ ] RPO <= 24 hours

## Outcomes
- Result: PASS / FAIL
- Issues found:
- Follow-up tasks:
- Target date to close follow-ups:

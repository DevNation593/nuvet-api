const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_REGEX = /T\d{2}:\d{2}/;

/**
 * Parses a date string from API filters into a UTC Date.
 *
 * Accepts:
 *   - Full ISO 8601 strings (e.g. "2026-04-23T14:30:00Z" or "2026-04-23T09:30:00-05:00")
 *   - Date-only strings (YYYY-MM-DD)
 *
 * When a date-only string is received, `endOfDay=true` returns 23:59:59.999 UTC,
 * otherwise 00:00:00.000 UTC.
 *
 * This avoids bugs like appending "T23:59:59Z" to strings that already contain
 * a time component, which produces invalid Dates and silently drops records.
 */
export function parseRangeDate(input: string | undefined, endOfDay = false): Date | undefined {
    if (!input) return undefined;
    const trimmed = input.trim();
    if (!trimmed) return undefined;

    if (ISO_DATETIME_REGEX.test(trimmed)) {
        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) return undefined;
        return parsed;
    }

    if (DATE_ONLY_REGEX.test(trimmed)) {
        const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
        const parsed = new Date(`${trimmed}${suffix}`);
        if (Number.isNaN(parsed.getTime())) return undefined;
        return parsed;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed;
}

export function buildDateRange(from?: string, to?: string): { gte?: Date; lte?: Date } {
    const range: { gte?: Date; lte?: Date } = {};
    const start = parseRangeDate(from, false);
    const end = parseRangeDate(to, true);
    if (start) range.gte = start;
    if (end) range.lte = end;
    return range;
}

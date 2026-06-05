/**
 * Date formatting utilities for Optimed.
 * All user-facing timestamps are displayed in Indian Standard Time (IST).
 * Storage remains UTC — conversion is display-only.
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Formats an ISO/UTC timestamp string to Indian Standard Time.
 * Output format: "29 May 2026, 06:45 PM IST"
 *
 * @param isoString - ISO 8601 date string (e.g. "2026-05-29T13:15:00Z")
 * @returns Formatted IST string, or "—" if input is invalid/empty
 */
export function formatIST(isoString: string | null | undefined): string {
  if (!isoString) return '—';

  try {
    // If backend sends a naive ISO string (e.g. "2026-05-29T13:15:00") without 'Z' or offset,
    // JS will parse it as local time. We append 'Z' to force it to parse as UTC.
    const parseString = isoString.endsWith('Z') || isoString.includes('+') ? isoString : `${isoString}Z`;
    const date = new Date(parseString);
    if (isNaN(date.getTime())) return '—';

    const day = new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      timeZone: IST_TIMEZONE,
    }).format(date);

    const month = new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      timeZone: IST_TIMEZONE,
    }).format(date);

    const year = new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      timeZone: IST_TIMEZONE,
    }).format(date);

    const time = new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: IST_TIMEZONE,
    }).format(date);

    // Capitalize AM/PM
    const formattedTime = time.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());

    return `${day} ${month} ${year}, ${formattedTime} IST`;
  } catch {
    return '—';
  }
}

/**
 * Returns a short relative time string for notification display.
 * e.g. "2 min ago", "1 hr ago", "Yesterday", "3 days ago"
 */
export function timeAgo(isoString: string | null | undefined): string {
  if (!isoString) return '';

  try {
    const parseString = isoString.endsWith('Z') || isoString.includes('+') ? isoString : `${isoString}Z`;
    const date = new Date(parseString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHr < 24) return `${diffHr} hr ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay} days ago`;
    return formatIST(isoString);
  } catch {
    return '';
  }
}

const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland",
];

/** IANA timezone names for the household timezone select, newest runtimes first. */
export function listTimezones(): string[] {
  const supportedValuesOf = (
    Intl as unknown as { supportedValuesOf?: (key: "timeZone") => string[] }
  ).supportedValuesOf;

  if (typeof supportedValuesOf === "function") {
    try {
      return supportedValuesOf("timeZone");
    } catch {
      // Fall through to the static list below.
    }
  }

  return FALLBACK_TIMEZONES;
}

/** Best-effort guess at the browser/runtime's own timezone. */
export function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

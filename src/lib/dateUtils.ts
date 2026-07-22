/**
 * Safely parses any date string or Date object into a valid Date.
 * Handles React Native Hermes parsing inconsistencies (e.g. slashes, spaces, missing times)
 * and falls back to a valid Date instead of returning an Invalid Date object.
 */
export function parseSafeDate(dateInput: any): Date {
  if (!dateInput) return new Date();
  
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? new Date() : dateInput;
  }
  
  // Try standard parse
  let d = new Date(dateInput);
  if (!isNaN(d.getTime())) return d;
  
  // If parsing failed (common on Hermes with custom formats), try cleaning the string
  if (typeof dateInput === "string") {
    let clean = dateInput.trim();
    // 1. Replace slashes with dashes (e.g. 2026/06/29 -> 2026-06-29)
    clean = clean.replace(/\//g, "-");
    // 2. Format space to 'T' for ISO format (e.g. "2026-06-29 14:58:10" -> "2026-06-29T14:58:10")
    if (clean.includes(" ") && !clean.includes("T")) {
      clean = clean.replace(" ", "T");
    }
    
    d = new Date(clean);
    if (!isNaN(d.getTime())) return d;
    
    // 3. Regex match YYYY-MM-DD
    const isoMatch = clean.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      d = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
      if (!isNaN(d.getTime())) return d;
    }
    
    // 4. Regex match DD-MM-YYYY
    const reverseMatch = clean.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (reverseMatch) {
      d = new Date(parseInt(reverseMatch[3], 10), parseInt(reverseMatch[2], 10) - 1, parseInt(reverseMatch[1], 10));
      if (!isNaN(d.getTime())) return d;
    }
  }
  
  return new Date(); // ultimate safe fallback
}

/**
 * Formats a date securely to YYYY-MM-DD.
 */
export function formatIsoDateOnly(dateInput: any): string {
  const d = parseSafeDate(dateInput);
  return d.toISOString().split("T")[0];
}

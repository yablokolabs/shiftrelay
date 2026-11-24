/** Remove credentials and contact details before evidence is written or shared. */
export function sanitizeText(text: string): string {
  return text
    .replace(/mko_tkn_[A-Za-z0-9_-]+/g, "[REDACTED_MEKO_KEY]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/("datapack_owner_name"\s*:\s*")[^"]*(")/g, "$1[REDACTED_OWNER]$2")
    .replace(/("datapack_owner_email_id"\s*:\s*")[^"]*(")/g, "$1[REDACTED_EMAIL]$2")
    .replace(/(MEKO_API_KEY|OPENROUTER_API_KEY|API_KEY)=\S+/g, "$1=[REDACTED]");
}

export function sanitize<T>(value: T): T {
  return JSON.parse(sanitizeText(JSON.stringify(value))) as T;
}

export function digest(value: unknown): string {
  return JSON.stringify(value);
}

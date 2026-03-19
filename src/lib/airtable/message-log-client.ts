/**
 * Client-safe exports from the message log module.
 * No server-only imports — safe to use in client components.
 */

export interface MessageLogDisplayEntry {
  id: string;
  contact_id: string;
  full_name?: string;
  phone?: string;
  status: 'sent' | 'failed';
  logged_at: string;
  error_message?: string;
}

export function mapErrorToHebrew(rawError: string | undefined): string {
  if (!rawError) return '';
  const lower = rawError.toLowerCase();

  if (lower.includes('401') || lower.includes('notauthorized') || lower.includes('unauthorized')) {
    return 'גרין אפיאי מנותקת — הודעות לא נשלחות, נא להתחבר מחדש בהגדרות';
  }
  if (lower.includes('403') || lower.includes('not registered') || lower.includes('notregistered')) {
    return 'מספר הטלפון לא קיים בוואצאפ — בדקי את המספר בכרטיסיית אנשי קשר';
  }
  if (
    lower.includes('timeout') ||
    lower.includes('econnrefused') ||
    lower.includes('network') ||
    lower.includes('fetch')
  ) {
    return 'בעיית תקשורת זמנית — ההודעה לא נשלחה, נסי שוב מאוחר יותר';
  }
  return 'שגיאה לא ידועה — פני לתמיכה אם הבעיה חוזרת';
}

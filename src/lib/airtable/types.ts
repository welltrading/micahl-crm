export interface Campaign {
  id: string;
  campaign_name: string;
  event_date: string; // ISO8601 UTC
  event_time?: string; // HH:MM format, Israel local time (e.g. "19:00")
  description?: string;
  status: 'future' | 'active' | 'ended';
  created_at: string;
  enrollment_count?: number;
}

export interface Contact {
  id: string;
  full_name: string;
  phone: string; // normalized: 972XXXXXXXXXX
  joined_date?: string;
  notes?: string;
  created_at: string;
}

export interface CampaignEnrollment {
  id: string;
  campaign_id: string[]; // Airtable linked record returns array
  contact_id: string[];
  enrolled_at?: string;
  source: 'manual' | 'webhook';
}

export interface ScheduledMessage {
  id: string;
  campaign_id: string[];
  contact_id: string[];
  title: string;         // כותרת — user-defined label
  message_content: string;
  send_date: string;     // YYYY-MM-DD Israel local (תאריך שליחה)
  send_time: string;     // HH:MM Israel local (שעת שליחה)
  slot_index: number;    // 1–4, stored in מספר הודעה for stable ordering
  status: 'pending' | 'sending' | 'sent' | 'failed';
  sent_at?: string;
}

export interface MessageLog {
  id: string;
  scheduled_message_id: string[];
  contact_id: string[];
  campaign_id: string[];
  status: 'sent' | 'failed';
  green_api_response?: string;
  error_message?: string;
  logged_at: string;
}

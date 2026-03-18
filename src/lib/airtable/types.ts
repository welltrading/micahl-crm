export interface Campaign {
  id: string;
  campaign_name: string;
  event_date: string; // ISO8601 UTC
  description?: string;
  status: 'future' | 'active' | 'ended';
  created_at: string;
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
  message_content: string;
  send_at: string; // UTC ISO8601
  offset_label: 'week_before' | 'day_before' | 'morning' | 'half_hour';
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

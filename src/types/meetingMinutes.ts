export interface MeetingMinute {
  id: string;
  contact_id: string;
  meeting_id: string | null;
  meeting_type: string;
  meeting_date: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  created_by_profile?: {
    full_name: string;
    email: string;
  };
  meeting?: {
    id: string;
    meeting_type: string;
    scheduled_at: string;
  };
}

export interface MeetingMinuteFormData {
  meeting_type: string;
  meeting_date: Date;
  content: string;
  meeting_id?: string;
}

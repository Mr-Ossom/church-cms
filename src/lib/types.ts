export type UserRole = "admin" | "pastor" | "leader" | "member";
export type MemberStatus = "active" | "visitor" | "inactive" | "transferred";
export type GroupType = "ministry" | "department" | "small_group";
export type EventType = "service" | "event" | "meeting";
export type EventVisibility = "all" | "groups" | "leaders" | "staff";
export type AttendanceStatus = "present" | "absent" | "excused";
export type DonationType = "tithe" | "offering" | "pledge" | "seed" | "other";
export type DonationMethod = "cash" | "bank_transfer" | "mobile_money" | "card" | "other";
export type AnnouncementAudience = "all" | "staff" | "leaders" | "group";

export interface Profile {
  id: string;
  member_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  other_names: string | null;
  gender: string | null;
  date_of_birth: string | null;
  marital_status: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  photo_url: string | null;
  joined_date: string;
  status: MemberStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  member_id: string;
  relationship: string;
  member?: Pick<Member, "id" | "first_name" | "last_name"> | null;
}

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  description: string | null;
  leader_id: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  location: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  leader?: Pick<Member, "id" | "first_name" | "last_name"> | null;
}

export interface GroupMember {
  id: string;
  group_id: string;
  member_id: string;
  role: string;
  joined_at: string;
  member?: Pick<Member, "id" | "first_name" | "last_name" | "phone" | "email" | "status" | "photo_url"> | null;
}

export interface ChurchEvent {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  is_recurring: boolean;
  recurrence_rule: string | null;
  visibility: EventVisibility;
  group_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  group?: Pick<Group, "id" | "name"> | null;
}

export interface AttendanceSession {
  id: string;
  event_id: string | null;
  title: string;
  session_date: string;
  headcount: number;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  event?: Pick<ChurchEvent, "id" | "title" | "group_id"> | null;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  member_id: string;
  status: AttendanceStatus;
  checked_in_at: string;
}

export interface Pledge {
  id: string;
  member_id: string;
  amount: number;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  member?: Pick<Member, "id" | "first_name" | "last_name"> | null;
}

export interface Donation {
  id: string;
  member_id: string | null;
  pledge_id: string | null;
  amount: number;
  currency: string;
  type: DonationType;
  method: DonationMethod;
  reference: string | null;
  donation_date: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  member?: Pick<Member, "id" | "first_name" | "last_name"> | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  group_id: string | null;
  publish_at: string;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  group?: Pick<Group, "id" | "name"> | null;
}

export interface MessageLog {
  id: string;
  channel: "sms" | "whatsapp" | "in_app";
  recipient: string | null;
  body: string | null;
  status: "queued" | "sent" | "failed";
  provider_id: string | null;
  error: string | null;
  announcement_id: string | null;
  sent_by: string | null;
  created_at: string;
}

export interface ChurchSettings {
  id: number;
  name: string;
  tagline: string | null;
  address: string | null;
  currency: string;
  country_code: string;
  timezone: string;
  logo_url: string | null;
  service_times: { day: string; time: string }[];
  sms_sender_id: string | null;
  whatsapp_number: string | null;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export const DEFAULT_SETTINGS: ChurchSettings = {
  id: 1,
  name: "Your Church",
  tagline: null,
  address: null,
  currency: "GHS",
  country_code: "+233",
  timezone: "Africa/Accra",
  logo_url: null,
  service_times: [],
  sms_sender_id: null,
  whatsapp_number: null,
  updated_at: new Date().toISOString(),
};

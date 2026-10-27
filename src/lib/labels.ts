import type {
  AnnouncementAudience,
  AttendanceStatus,
  DonationMethod,
  DonationType,
  EventType,
  EventVisibility,
  GroupType,
  MemberStatus,
  UserRole,
} from "@/lib/types";

export const memberStatusVariant: Record<MemberStatus, "success" | "info" | "neutral" | "warning"> = {
  active: "success",
  visitor: "info",
  inactive: "neutral",
  transferred: "warning",
};

export const attendanceStatusVariant: Record<
  AttendanceStatus,
  "success" | "danger" | "warning"
> = {
  present: "success",
  absent: "danger",
  excused: "warning",
};

export const roleVariant: Record<UserRole, "brand" | "info" | "warning" | "neutral"> = {
  admin: "brand",
  pastor: "info",
  leader: "warning",
  member: "neutral",
};

export const roleLabel: Record<UserRole, string> = {
  admin: "Administrator",
  pastor: "Pastor",
  leader: "Leader",
  member: "Member",
};

export const groupTypeLabel: Record<GroupType, string> = {
  ministry: "Ministry",
  department: "Department",
  small_group: "Small group",
};

export const eventTypeLabel: Record<EventType, string> = {
  service: "Service",
  event: "Event",
  meeting: "Meeting",
};

export const eventVisibilityLabel: Record<EventVisibility, string> = {
  all: "Everyone",
  groups: "Group members",
  leaders: "Leaders",
  staff: "Staff",
};

export const donationTypeLabel: Record<DonationType, string> = {
  tithe: "Tithe",
  offering: "Offering",
  pledge: "Pledge",
  seed: "Seed",
  other: "Other",
};

export const donationMethodLabel: Record<DonationMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  mobile_money: "Mobile money",
  card: "Card",
  other: "Other",
};

export const audienceLabel: Record<AnnouncementAudience, string> = {
  all: "Everyone",
  staff: "Staff",
  leaders: "Leaders",
  group: "Specific group",
};

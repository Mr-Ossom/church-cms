import { z } from "zod";

const optionalText = (max = 500) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    },
    z.string().max(max).nullable(),
  );

const optionalDate = z.preprocess(
  (value) => {
    if (typeof value !== "string" || value.trim() === "") return null;
    return value;
  },
  z.string().nullable(),
);

const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.enum(values).nullable(),
  );

export const memberSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(80),
  last_name: z.string().trim().min(1, "Last name is required").max(80),
  other_names: optionalText(80),
  gender: optionalEnum(["male", "female", "other"]),
  date_of_birth: optionalDate,
  marital_status: optionalEnum(["single", "married", "widowed", "divorced", "other"]),
  phone: optionalText(30),
  email: z.preprocess(
    (value) => {
      if (typeof value !== "string" || value.trim() === "") return null;
      return value.trim();
    },
    z.string().email("Enter a valid email address").max(160).nullable(),
  ),
  address: optionalText(300),
  photo_url: optionalText(500),
  joined_date: z.string().min(1, "Joined date is required"),
  status: z.enum(["active", "visitor", "inactive", "transferred"]).default("active"),
  notes: optionalText(2000),
});

export const familySchema = z.object({
  name: z.string().trim().min(1, "Family name is required").max(120),
  address: optionalText(300),
  notes: optionalText(1000),
});

export const groupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(120),
  type: z.enum(["ministry", "department", "small_group"]),
  description: optionalText(1000),
  leader_id: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().uuid().nullable(),
  ),
  meeting_day: optionalText(30),
  meeting_time: optionalText(30),
  location: optionalText(160),
  active: z
    .preprocess((value) => value === "on" || value === "true" || value === true, z.boolean())
    .default(true),
});

export const eventSchema = z.object({
  title: z.string().trim().min(1, "Event title is required").max(160),
  description: optionalText(2000),
  type: z.enum(["service", "event", "meeting"]),
  location: optionalText(160),
  starts_at: z.string().min(1, "Start date and time is required"),
  ends_at: optionalText(40),
  visibility: z.enum(["all", "groups", "leaders", "staff"]).default("all"),
  group_id: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().uuid().nullable(),
  ),
  is_recurring: z
    .preprocess((value) => value === "on" || value === "true" || value === true, z.boolean())
    .default(false),
  recurrence_rule: optionalText(120),
});

export const attendanceSessionSchema = z.object({
  event_id: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().uuid().nullable(),
  ),
  title: z.string().trim().min(1, "Session title is required").max(160),
  session_date: z.string().min(1, "Session date is required"),
  headcount: z.coerce.number().int().min(0, "Headcount cannot be negative").default(0),
  notes: optionalText(1000),
});

export const pledgeSchema = z.object({
  member_id: z.string().uuid("Select a member"),
  amount: z.coerce.number().positive("Enter a pledge amount"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: optionalDate,
  notes: optionalText(1000),
});

export const donationSchema = z.object({
  member_id: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().uuid().nullable(),
  ),
  pledge_id: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().uuid().nullable(),
  ),
  amount: z.coerce.number().positive("Enter an amount greater than zero"),
  type: z.enum(["tithe", "offering", "pledge", "seed", "other"]),
  method: z.enum(["cash", "bank_transfer", "mobile_money", "card", "other"]),
  reference: optionalText(120),
  donation_date: z.string().min(1, "Date is required"),
  notes: optionalText(1000),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  body: z.string().trim().min(1, "Message is required").max(4000),
  audience: z.enum(["all", "staff", "leaders", "group"]).default("all"),
  group_id: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().uuid().nullable(),
  ),
  publish_at: optionalText(40),
  expires_at: optionalText(40),
});

export const settingsSchema = z.object({
  name: z.string().trim().min(1, "Church name is required").max(160),
  tagline: optionalText(200),
  address: optionalText(300),
  currency: z.string().trim().min(3, "Currency code is required").max(8),
  country_code: z.string().trim().min(2, "Country code is required").max(8),
  timezone: z.string().trim().min(1, "Timezone is required").max(80),
  whatsapp_number: optionalText(30),
  sms_sender_id: optionalText(30),
  logo_url: optionalText(500),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(120),
  phone: optionalText(30),
});

export const signupSchema = z
  .object({
    first_name: z.string().trim().min(1, "First name is required").max(80),
    last_name: z.string().trim().min(1, "Last name is required").max(80),
    email: z.string().trim().email("Enter a valid email address").max(160),
    phone: optionalText(30),
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72, "Password must be 72 characters or fewer"),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  full_name: z.string().trim().min(1, "Name is required").max(120),
  role: z.enum(["admin", "pastor", "leader", "member"]),
});

export const roleUpdateSchema = z.object({
  profile_id: z.string().uuid(),
  role: z.enum(["admin", "pastor", "leader", "member"]),
  member_id: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().uuid().nullable(),
  ),
});

export const attendanceCheckSchema = z.object({
  session_id: z.string().uuid(),
  member_id: z.string().uuid(),
  status: z.enum(["present", "absent", "excused"]),
});

export const smsSchema = z.object({
  audience: z.enum(["all", "group"]),
  group_id: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().uuid().nullable(),
  ),
  message: z.string().trim().min(1, "Message is required").max(480, "Keep SMS under 480 characters"),
});

export type MemberInput = z.infer<typeof memberSchema>;
export type DonationInput = z.infer<typeof donationSchema>;
export type EventInput = z.infer<typeof eventSchema>;

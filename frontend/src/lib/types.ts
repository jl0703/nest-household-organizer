export type HouseholdRole = "owner" | "member";

export interface Household {
  id: string;
  name: string;
  timezone: string;
  ownerId: string;
  createdAt: string;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  role: HouseholdRole;
  joinedAt: string;
}

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export interface Invitation {
  id: string;
  householdId: string;
  invitedById: string;
  recipientEmail: string;
  token: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ChildProfile {
  id: string;
  householdId: string;
  createdBy: string;
  displayName: string;
  createdAt: string;
}

export type RecurrenceFrequency = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface CalendarEvent {
  id: string;
  householdId: string;
  title: string;
  description: string | null;
  allDay: boolean;
  startsAt: string;
  endsAt: string;
  recurrenceFrequency: RecurrenceFrequency;
  recurrenceInterval: number;
  recurrenceEndDate: string | null;
  createdBy: string;
  createdAt: string;
}

export interface EventBody {
  title: string;
  description?: string;
  allDay: boolean;
  startsAt: string;
  endsAt: string;
  recurrenceFrequency: RecurrenceFrequency;
  recurrenceInterval: number;
  recurrenceEndDate?: string;
}

export type OccurrenceOverrideStatus = "skipped" | "modified";

export interface EventOccurrenceOverride {
  id: string;
  eventId: string;
  occurrenceDate: string;
  status: OccurrenceOverrideStatus;
  overrideStartsAt: string | null;
  overrideEndsAt: string | null;
  overrideTitle: string | null;
  createdAt: string;
}

export interface ModifyOccurrenceBody {
  overrideTitle?: string;
  overrideStartsAt?: string;
  overrideEndsAt?: string;
}

export type Role =
  | "admin"
  | "teacher"
  | "parent"
  | "gate_staff"
  | "security";

export type Status =
  | "pending"
  | "en_route"
  | "arrived"
  | "in_queue"
  | "called"
  | "collected"
  | "cancelled"
  | "no_show";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: Role;
  is_school_staff: boolean;
  phone: string;
  avatar: string | null;
  is_active: boolean;
  date_joined: string;
  last_seen: string | null;
}

export interface YearGroup {
  id: string;
  name: string;
  session_type: "eyfs" | "primary";
  display_name: string;
  pickup_order: number;
  colour_hex: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  year_group: string;
  year_group_name: string;
  year_group_colour: string;
  session_type: string;
  teacher: string | null;
  room_number: string;
  student_count: number;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  pupil_reference: string;
  school_class: string;
  class_name: string;
  year_group_name: string;
  year_group_colour: string;
  session_type: string;
  photo: string | null;
  is_active: boolean;
}

export interface PickupChild {
  id: string;
  student: Student;
  is_ready: boolean;
  readied_at: string | null;
  was_collected: boolean;
}

export interface PickupRequest {
  id: string;
  session: string;
  collector: string;
  collector_name: string;
  collector_phone: string;
  status: Status;
  queue_position: number | null;
  queue_token: string;
  checked_in_at: string | null;
  arrived_at: string | null;
  called_at: string | null;
  collected_at: string | null;
  eta: string | null;
  checkin_lat: number | null;
  checkin_lng: number | null;
  checkin_dist: number | null;
  children: PickupChild[];
  ai_flagged: boolean;
  ai_risk_level: "low" | "medium" | "high";
  ai_flag_reason: string;
  created_at: string;
  updated_at: string;
}

export interface PickupSession {
  id: string;
  session_type: "eyfs_am" | "eyfs_pm" | "primary_pm" | "extra";
  date: string;
  status: "scheduled" | "open" | "active" | "closed" | "cancelled";
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  active_count: number;
  collected_count: number;
  pending_count: number;
  ai_peak_time: string | null;
  ai_peak_duration: number | null;
  ai_confidence: number | null;
}

export interface AppNotification {
  id: string;
  notif_type: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface GPS {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
}
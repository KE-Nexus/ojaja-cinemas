import { z } from "zod";

// Digits only, with an optional leading "+" and optional spaces/dashes as separators —
// rejects free-text strings like "n/a" that `.min(7).max(20)` alone would let through.
const PHONE_REGEX = /^\+?[0-9]([0-9\s-]*[0-9])?$/;
export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(20, "Enter a valid phone number")
  .regex(PHONE_REGEX, "Phone number must contain digits only");

export const registerSchema = z.object({
  name: z.string().min(2, "Name is too short").max(80),
  email: z.string().email("Enter a valid email"),
  phone: phoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const contactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  subject: z.string().min(2).max(120),
  message: z.string().min(10, "Please provide a few more details").max(2000),
});

export const spaceBookingSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  eventType: z.string().min(2).max(80),
  eventDate: z.string().min(1, "Select a date"),
  headcount: z.coerce.number().int().min(1).max(2000),
  message: z.string().max(2000).optional(),
});

export const reviewSchema = z.object({
  movieId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(10, "Please write a bit more").max(1000),
});

export const lockSeatsSchema = z.object({
  showtimeId: z.string().min(1),
  seatIds: z.array(z.string().min(1)).min(1, "Select at least one seat").max(10, "Maximum 10 seats per booking"),
  sessionId: z.string().min(1),
});

export const movieSchema = z.object({
  title: z.string().min(1, "Title is required").max(150),
  synopsis: z.string().min(10, "Synopsis is too short").max(2000),
  genres: z.string().min(1, "Enter at least one genre").max(150),
  classification: z.string().min(1).max(10),
  language: z.string().min(1).max(60),
  runtimeMins: z.coerce.number().int().min(1).max(600),
  cast: z.string().min(1, "Cast is required").max(500),
  director: z.string().max(150).optional().or(z.literal("")),
  distributorId: z.string().optional().or(z.literal("")),
  releaseDate: z.string().min(1, "Release date is required"),
  status: z.enum(["NOW_SHOWING", "COMING_SOON", "ARCHIVED"]),
});

export const showtimeSchema = z.object({
  movieId: z.string().min(1, "Select a movie"),
  auditoriumId: z.string().min(1, "Select an auditorium"),
  startTime: z.string().min(1, "Select a date and time"),
  basePrice: z.coerce.number().min(100, "Enter a valid price"),
  language: z.string().min(1).max(60),
  format: z.string().min(1).max(20),
});

export const filmSessionBatchSchema = z.object({
  branchId: z.string().min(1, "Select a cinema"),
  movieId: z.string().min(1, "Select a film"),
  status: z.enum(["OPEN", "CLOSED"]),
  language: z.string().min(1, "Select a language"),
});

export const filmSessionRowSchema = z.object({
  auditoriumId: z.string().min(1, "Select a screen"),
  priceCardId: z.string().optional().or(z.literal("")),
  format: z.string().min(1, "Select a screen format").max(30),
  trailerDurationMins: z.coerce.number().int().min(0, "Enter a valid duration").default(0),
  startTime: z.string().min(1, "Select a start time"),
  endTime: z.string().optional().or(z.literal("")),
  cleanupTimeMins: z.coerce.number().int().min(0, "Enter a valid duration").default(0),
});

export const branchSchema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  city: z.string().min(2, "City is required").max(80),
  address: z.string().min(5, "Address is required").max(200),
  phone: z.string().min(7, "Enter a valid phone number").max(30),
  openingHours: z.string().min(3, "Opening hours are required").max(120),
  lat: z.coerce.number().min(-90).max(90).optional().or(z.literal("")),
  lng: z.coerce.number().min(-180).max(180).optional().or(z.literal("")),
});

export const hiveSettingsSchema = z.object({
  branchId: z.string().min(1),
  aboutUs: z.string().max(2000).optional().or(z.literal("")),
  useFilmSchedule: z.coerce.boolean().optional(),
});

export const branchContactSchema = z.object({
  address: z.string().min(5, "Address is required").max(200),
  phone: z.string().min(7, "Enter a valid phone number").max(30),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
});

export const branchBankSchema = z.object({
  bankName: z.string().max(100).optional().or(z.literal("")),
  bankAccountName: z.string().max(150).optional().or(z.literal("")),
  bankAccountNumber: z.string().max(20).optional().or(z.literal("")),
});

export const auditoriumSchema = z.object({
  branchId: z.string().min(1, "Select a branch"),
  name: z.string().min(1, "Name is required").max(60),
  screenType: z.string().min(1).max(60),
  rows: z.coerce.number().int().min(1).max(26),
  seatsPerRow: z.coerce.number().int().min(1).max(40),
});

export const promoCodeSchema = z.object({
  code: z.string().min(3, "Code is too short").max(30),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.coerce.number().min(1),
  expiresAt: z.string().optional().or(z.literal("")),
  usageLimit: z.coerce.number().int().min(1).optional().or(z.literal("")),
  isActive: z.coerce.boolean().optional(),
});

export const filmContractSchema = z.object({
  branchId: z.string().min(1, "Select a cinema"),
  movieId: z.string().min(1, "Select a film"),
  contractStartDate: z.string().min(1, "Contract start date is required"),
});

export const ticketClassSchema = z.object({
  branchId: z.string().min(1, "Select a cinema"),
  description: z.string().min(2, "Ticket type name is required").max(200),
  type: z.string().min(1, "Short name is required").max(60),
  kind: z.enum(["STANDARD", "PACKAGE", "VOUCHER"]),
  seatClass: z.enum(["STANDARD", "PREMIUM", "RECLINER", "ACCESSIBLE"]).optional().or(z.literal("")),
  defaultPrice: z.coerce.number().min(0, "Enter a valid price"),
  salesTaxPercent: z.coerce.number().min(0, "Enter a valid tax rate").max(100, "Enter a valid tax rate"),
  isActive: z.coerce.boolean(),
  isLoyaltyTicket: z.coerce.boolean().optional(),
  isComplementary: z.coerce.boolean().optional(),
  salesSources: z.array(z.string()).min(1, "Select at least one Sales Source"),
});

export const ticketPackageLineSchema = z.object({
  ticketClassId: z.string().min(1),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});

export const ticketPackageItemLineSchema = z.object({
  posItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});

export const WEEK_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

export const priceCardSchema = z.object({
  branchId: z.string().min(1, "Select a cinema"),
  name: z.string().min(2, "Name is required").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  days: z.array(z.enum(WEEK_DAYS)).min(1, "Select at least one day"),
  isActive: z.coerce.boolean(),
});

export const posItemSchema = z.object({
  branchId: z.string().optional().or(z.literal("")),
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(300).optional().or(z.literal("")),
  itemClass: z.string().min(1, "Item class is required").max(60),
  itemGroup: z.string().min(1, "Item group is required").max(60),
  defaultPrice: z.coerce.number().min(0, "Enter a valid price"),
});

export const inviteStaffSchema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  email: z.string().email("Enter a valid email"),
  phone: phoneSchema,
  role: z.enum(["TICKETER", "ACCOUNTANT", "SUPERVISOR", "TECHNICIAN", "AUDITOR", "CIRCUIT_ADMIN"]),
  branchId: z.string().optional().or(z.literal("")),
});

export const staffEmailSchema = z.object({ email: z.string().email("Enter a valid email") });
export const staffPasswordSchema = z.object({ password: z.string().min(8, "Password must be at least 8 characters") });
export const staffPinSchema = z.object({ pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4–6 digits") });
export const transferStaffSchema = z.object({ branchId: z.string().min(1, "Select a cinema") });

export const rosterShiftSchema = z.object({
  staffId: z.string().min(1, "Select a staff member"),
  branchId: z.string().min(1),
  date: z.string().min(1, "Select a date"),
  startTime: z.string().min(1, "Enter a start time"),
  endTime: z.string().min(1, "Enter an end time"),
});

export const distributorSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  email: z.string().email("Enter a valid email"),
  phone: phoneSchema,
});

export const languageSchema = z.object({
  name: z.string().min(2, "Name is required").max(60),
  isActive: z.coerce.boolean().optional(),
});

export const checkoutSchema = z.object({
  showtimeId: z.string().min(1),
  seatIds: z.array(z.string().min(1)).min(1),
  sessionId: z.string().min(1),
  concessions: z.array(z.object({ id: z.string().min(1), quantity: z.number().int().min(1) })).default([]),
  promoCode: z.string().trim().optional(),
  guestName: z.string().min(2).max(80).optional(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().min(7).max(20).optional(),
});

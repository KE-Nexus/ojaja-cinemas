import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name is too short").max(80),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter a valid phone number").max(20),
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
  posterUrl: z.string().url("Enter a valid URL"),
  backdropUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  trailerUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  genres: z.string().min(1, "Enter at least one genre").max(150),
  classification: z.string().min(1).max(10),
  language: z.string().min(1).max(60),
  runtimeMins: z.coerce.number().int().min(1).max(600),
  cast: z.string().min(1, "Cast is required").max(500),
  director: z.string().max(150).optional().or(z.literal("")),
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

export const branchSchema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  city: z.string().min(2, "City is required").max(80),
  address: z.string().min(5, "Address is required").max(200),
  phone: z.string().min(7, "Enter a valid phone number").max(30),
  openingHours: z.string().min(3, "Opening hours are required").max(120),
  lat: z.coerce.number().min(-90).max(90).optional().or(z.literal("")),
  lng: z.coerce.number().min(-180).max(180).optional().or(z.literal("")),
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

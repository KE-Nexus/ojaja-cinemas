"use server";

import { prisma } from "@/lib/prisma";
import { contactSchema, spaceBookingSchema } from "@/lib/validation";
import { notificationProvider } from "@/lib/providers/notification";

export type FormState = { error?: string; success?: boolean } | null;

export async function submitContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  await prisma.contactMessage.create({ data: parsed.data });

  await notificationProvider.sendEmail(
    "frontdesk@ojaja.cinema",
    `New enquiry: ${parsed.data.subject}`,
    `From ${parsed.data.name} (${parsed.data.email}): ${parsed.data.message}`
  );

  return { success: true };
}

export async function submitSpaceBookingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = spaceBookingSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    eventType: formData.get("eventType"),
    eventDate: formData.get("eventDate"),
    headcount: formData.get("headcount"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  await prisma.spaceBookingRequest.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      eventType: parsed.data.eventType,
      eventDate: new Date(parsed.data.eventDate),
      headcount: parsed.data.headcount,
      message: parsed.data.message,
    },
  });

  await notificationProvider.sendEmail(
    "events@ojaja.cinema",
    `New private space request: ${parsed.data.eventType}`,
    `From ${parsed.data.name} (${parsed.data.email}, ${parsed.data.phone}) for ${parsed.data.headcount} guests on ${parsed.data.eventDate}.`
  );

  return { success: true };
}

import { prisma } from "@/lib/prisma";

export interface NotificationProvider {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendSms(to: string, body: string): Promise<void>;
}

/**
 * Stand-in for Resend/SendGrid (email) and Termii (SMS). No external accounts
 * are wired up for this build, so sends are logged to the NotificationOutbox
 * table (visible in /admin/notifications) instead of leaving the process.
 * Swap this for a real client behind the same NotificationProvider interface to go live.
 */
export class MockNotificationProvider implements NotificationProvider {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    await prisma.notificationOutbox.create({
      data: { type: "EMAIL", to, subject, body, status: "SENT" },
    });
  }

  async sendSms(to: string, body: string): Promise<void> {
    await prisma.notificationOutbox.create({
      data: { type: "SMS", to, subject: "SMS", body, status: "SENT" },
    });
  }
}

export const notificationProvider = new MockNotificationProvider();

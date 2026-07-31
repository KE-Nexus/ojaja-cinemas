import "server-only";
import type { SeatCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notificationProvider } from "@/lib/providers/notification";
import { formatShowtime } from "@/lib/format";

/**
 * Staff holding "Can Get Seat Class Notification" can subscribe to specific seat categories
 * (e.g. Recliner, Premium) at their own cinema, so they're alerted to prep those seats/services
 * whenever a booking for that category is confirmed at their branch.
 */
export async function notifySeatClassSubscribers(params: {
  branchId: string;
  categories: SeatCategory[];
  bookingReference: string;
  movieTitle: string;
  showtimeStart: Date;
}) {
  const categories = Array.from(new Set(params.categories));
  if (categories.length === 0) return;

  const subscriptions = await prisma.seatClassSubscription.findMany({
    where: { category: { in: categories }, user: { branchId: params.branchId } },
    include: { user: true },
  });

  for (const sub of subscriptions) {
    if (!sub.user.email) continue;
    await notificationProvider.sendEmail(
      sub.user.email,
      `Seat class alert: ${sub.category} booked (${params.bookingReference})`,
      `A ${sub.category.toLowerCase()} seat was just booked for ${params.movieTitle} at ${formatShowtime(
        params.showtimeStart
      )}. Booking reference: ${params.bookingReference}.`
    );
  }
}

// Writes trip-utils' allocated Provider Travel onto each Activity row.
// Shared by the trip and log routers: every path that assembles or reshapes
// a Trip funnels its transit allocation through here.
import type { Prisma } from "@/generated/client";
import type { TransitUpdate } from "@/lib/trip-utils";

export async function applyTransitUpdates(
	tx: Prisma.TransactionClient,
	updates: TransitUpdate[]
) {
	for (const update of updates) {
		await tx.activity.update({
			where: { id: update.activityId },
			data: {
				transitDistance: update.transitDistance,
				transitDuration: update.transitDuration
			}
		});
	}
}

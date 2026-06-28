import { PrismaClient } from "@/generated/client";

export interface OverlapCheckInput {
	date: Date;
	startTime?: Date | null;
	endTime?: Date | null;
	ownerId: string;
	excludeActivityId?: string;
}

export interface ConflictingActivity {
	id: string;
	startTime: Date | null;
	endTime: Date | null;
	client: {
		name: string;
	} | null;
}

export async function checkActivityOverlap(
	prisma: PrismaClient,
	input: OverlapCheckInput
): Promise<ConflictingActivity | null> {
	const { date, startTime, endTime, ownerId, excludeActivityId } = input;

	if (!startTime || !endTime) {
		return null;
	}

	const conflicting = await prisma.activity.findFirst({
		where: {
			ownerId,
			date,
			id: excludeActivityId ? { not: excludeActivityId } : undefined,
			AND: [
				{ startTime: { lt: endTime } },
				{ endTime: { gt: startTime } },
				{ supportItem: { isGroup: { not: true } } }
			]
		},
		select: {
			id: true,
			startTime: true,
			endTime: true,
			client: {
				select: {
					name: true
				}
			}
		}
	});

	return conflicting;
}

export function formatOverlapError(conflicting: ConflictingActivity): string {
	const clientName = conflicting.client?.name ?? "Unknown Client";
	const start = conflicting.startTime ? formatTime(conflicting.startTime) : "?";
	const end = conflicting.endTime ? formatTime(conflicting.endTime) : "?";

	return `This time overlaps with an activity for ${clientName} (${start} - ${end})`;
}

function formatTime(date: Date): string {
	const hours = date.getUTCHours().toString().padStart(2, "0");
	const minutes = date.getUTCMinutes().toString().padStart(2, "0");
	return `${hours}:${minutes}`;
}

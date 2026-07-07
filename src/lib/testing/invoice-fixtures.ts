import {
	ActivityTransportType,
	InvoiceStatus,
	Prisma,
	RateType,
	type User
} from "@/generated/client";
import type { InvoicePdfData } from "@/lib/pdf-generation";

/**
 * Hand-authored invoice fixtures for the PDF golden-master tests.
 *
 * Each fixture is shaped exactly like the data `generatePDF` reads from
 * Prisma:
 *   1. `prisma.invoice.findUnique({ where }).client({ select: { id } })`
 *   2. `prisma.invoice.findFirst({ include: { client, activities: {
 *      include: { supportItem: { include: { supportItemRates } },
 *      transportItems } } } })`
 *   3. `prisma.user.findUnique({ where: { id: invoice.ownerId } })`
 *
 * All values are fixed literals — no faker, no dates derived from "now" —
 * so the generated PDFs are byte-stable in content across runs.
 */

export type FixtureInvoice = Prisma.InvoiceGetPayload<{
	include: {
		client: true;
		activities: {
			include: {
				supportItem: { include: { supportItemRates: true } };
				transportItems: true;
			};
		};
	};
}>;

type FixtureActivity = FixtureInvoice["activities"][number];
type FixtureSupportItem = FixtureActivity["supportItem"];
type FixtureSupportItemRates = FixtureSupportItem["supportItemRates"][number];
type FixtureTransportItem = FixtureActivity["transportItems"][number];
type FixtureClient = FixtureInvoice["client"];

export interface InvoiceFixture {
	name: string;
	invoice: FixtureInvoice;
	user: User;
}

const FIXED_TIMESTAMP = new Date("2023-01-01T00:00:00.000Z");

/** A calendar date stored the way Prisma returns a `@db.Date` column. */
const day = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);

/** A time-of-day stored the way Prisma returns a `@db.Time` column. */
const time = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);

const makeUser = (
	fixtureName: string,
	overrides: Partial<User> = {}
): User => ({
	id: `user_${fixtureName}`,
	email: "provider@example.com",
	createdAt: FIXED_TIMESTAMP,
	updatedAt: FIXED_TIMESTAMP,
	name: "Marlee Provider",
	emailVerified: null,
	image: null,
	abn: BigInt("12345678901"),
	bankName: "Sample Bank",
	bankNumber: BigInt("987654321"),
	bsb: 123456,
	transitRatePerKm: new Prisma.Decimal(0.85),
	defaultSupportItemId: null,
	defaultGroupSupportItemId: null,
	...overrides
});

const makeClient = (
	fixtureName: string,
	overrides: Partial<FixtureClient> = {}
): FixtureClient => ({
	id: `client_${fixtureName}`,
	createdAt: FIXED_TIMESTAMP,
	updatedAt: FIXED_TIMESTAMP,
	name: "Jane Citizen",
	number: null,
	invoiceEmail: null,
	active: true,
	distanceToClient: null,
	travelTimeToClient: null,
	transitRatePerKm: null,
	billTo: null,
	invoiceNumberPrefix: null,
	ownerId: `user_${fixtureName}`,
	...overrides
});

/**
 * The default fixture item is the solo community-access item — one of the two
 * support items our users actually bill (the other is the group item below).
 * Codes, name, and rates come verbatim from the bundled support
 * catalogue (src/lib/ndis-support-catalogue.json).
 */
const makeSupportItem = (
	fixtureName: string,
	overrides: Partial<FixtureSupportItem> = {}
): FixtureSupportItem => ({
	id: `supportitem_${fixtureName}`,
	createdAt: FIXED_TIMESTAMP,
	updatedAt: FIXED_TIMESTAMP,
	description: "Access Community Social and Rec Activ - Standard",
	rateType: RateType.HOUR,
	isGroup: false,
	weekdayCode: "04_104_0125_6_1",
	weeknightCode: "04_103_0125_6_1",
	saturdayCode: "04_105_0125_6_1",
	sundayCode: "04_106_0125_6_1",
	weekdayRate: new Prisma.Decimal(62.17),
	weeknightRate: new Prisma.Decimal(68.5),
	saturdayRate: new Prisma.Decimal(87.51),
	sundayRate: new Prisma.Decimal(112.85),
	ownerId: `user_${fixtureName}`,
	supportItemRates: [],
	...overrides
});

/**
 * The group counterpart: "Group Activities - Standard" in the 0136
 * registration group, which derives the group travel/transport codes
 * (04_591_0136_6_1, 04_799_0136_6_1). Price limits in the 22-23 catalogue
 * are identical to the solo 0125 item's.
 *
 * Rates are the FULL-SESSION amount (docs/plans/016 operator decision 3):
 * double the solo item's per-participant rate, so that billing's ÷2
 * apportioning (the fixtures' default `groupSize`) reproduces the exact
 * solo-equivalent per-participant cents.
 */
const makeGroupSupportItem = (
	fixtureName: string,
	overrides: Partial<FixtureSupportItem> = {}
): FixtureSupportItem =>
	makeSupportItem(fixtureName, {
		description: "Group Activities - Standard",
		isGroup: true,
		weekdayCode: "04_102_0136_6_1",
		weeknightCode: "04_103_0136_6_1",
		saturdayCode: "04_104_0136_6_1",
		sundayCode: "04_105_0136_6_1",
		weekdayRate: new Prisma.Decimal(124.34),
		weeknightRate: new Prisma.Decimal(137),
		saturdayRate: new Prisma.Decimal(175.02),
		sundayRate: new Prisma.Decimal(225.7),
		...overrides
	});

const makeSupportItemRates = (
	fixtureName: string,
	overrides: Partial<FixtureSupportItemRates> = {}
): FixtureSupportItemRates => ({
	id: `supportitemrates_${fixtureName}`,
	createdAt: FIXED_TIMESTAMP,
	updatedAt: FIXED_TIMESTAMP,
	ownerId: `user_${fixtureName}`,
	supportItemId: `supportitem_${fixtureName}`,
	clientId: `client_${fixtureName}`,
	weekdayRate: null,
	weeknightRate: null,
	saturdayRate: null,
	sundayRate: null,
	...overrides
});

const makeTransportItem = (
	fixtureName: string,
	index: number,
	overrides: Partial<FixtureTransportItem> = {}
): FixtureTransportItem => ({
	id: `transportitem_${fixtureName}_${index}`,
	activityId: `activity_${fixtureName}_1`,
	type: ActivityTransportType.DISTANCE,
	amount: new Prisma.Decimal(0),
	note: null,
	...overrides
});

const makeActivity = (
	fixtureName: string,
	index: number,
	overrides: Partial<FixtureActivity> = {}
): FixtureActivity => ({
	id: `activity_${fixtureName}_${index}`,
	createdAt: FIXED_TIMESTAMP,
	updatedAt: FIXED_TIMESTAMP,
	date: day("2023-01-11"), // Wednesday
	startTime: time("09:00"),
	endTime: time("11:00"),
	transitDuration: null,
	transitDistance: null,
	itemDistance: null,
	groupSize: null,
	ownerId: `user_${fixtureName}`,
	clientId: `client_${fixtureName}`,
	supportItemId: `supportitem_${fixtureName}`,
	invoiceId: `invoice_${fixtureName}`,
	tripId: null,
	supportItem: makeSupportItem(fixtureName),
	transportItems: [],
	...overrides
});

const makeInvoice = (
	fixtureName: string,
	invoiceNo: string,
	activities: FixtureActivity[],
	overrides: Partial<FixtureInvoice> = {}
): FixtureInvoice => ({
	id: `invoice_${fixtureName}`,
	createdAt: FIXED_TIMESTAMP,
	updatedAt: FIXED_TIMESTAMP,
	sentAt: null,
	paidAt: null,
	invoiceNo,
	billTo: null,
	date: day("2023-02-01"),
	status: InvoiceStatus.CREATED,
	clientId: `client_${fixtureName}`,
	ownerId: `user_${fixtureName}`,
	client: makeClient(fixtureName),
	activities,
	...overrides
});

const makeFixture = (
	name: string,
	invoice: FixtureInvoice,
	user: User = makeUser(name)
): InvoiceFixture => ({ name, invoice, user });

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

/** 1. One HOUR activity, weekday daytime, base rates, full payment footer. */
const basicWeekday = makeFixture(
	"basic-weekday",
	makeInvoice("basic-weekday", "WKDY-1", [makeActivity("basic-weekday", 1)])
);

/** 2. endTime >= 20:00 (8pm) on a weekday selects the weeknight code/rate. */
const weeknight = makeFixture(
	"weeknight",
	makeInvoice("weeknight", "NIGHT-1", [
		makeActivity("weeknight", 1, {
			startTime: time("18:00"),
			endTime: time("20:00")
		})
	])
);

/** 3. Saturday date selects the saturday code/rate. */
const saturday = makeFixture(
	"saturday",
	makeInvoice("saturday", "SAT-1", [
		makeActivity("saturday", 1, { date: day("2023-01-14") })
	])
);

/** 4. Sunday date selects the sunday code/rate. */
const sunday = makeFixture(
	"sunday",
	makeInvoice("sunday", "SUN-1", [
		makeActivity("sunday", 1, { date: day("2023-01-15") })
	])
);

/**
 * 5. Client-specific SupportItemRates override weekday + saturday; the
 * weeknight override is absent so the weeknight activity falls back to the
 * support item's base weeknight rate (per-day `customRate || base`).
 */
const clientCustomRates = (() => {
	const name = "client-custom-rates";
	const supportItem = makeSupportItem(name, {
		supportItemRates: [
			makeSupportItemRates(name, {
				weekdayRate: new Prisma.Decimal(60),
				saturdayRate: new Prisma.Decimal(80)
			})
		]
	});

	return makeFixture(
		name,
		makeInvoice(name, "CUSTOM-1", [
			makeActivity(name, 1, { supportItem }),
			makeActivity(name, 2, {
				date: day("2023-01-12"),
				startTime: time("18:00"),
				endTime: time("20:00"),
				supportItem
			}),
			makeActivity(name, 3, { date: day("2023-01-14"), supportItem })
		])
	);
})();

/** 6. KM rate type: no start/end times, `itemDistance × rate` and "34 km". */
const kmRateType = makeFixture(
	"km-rate-type",
	makeInvoice("km-rate-type", "KM-1", [
		makeActivity("km-rate-type", 1, {
			startTime: null,
			endTime: null,
			itemDistance: 34,
			supportItem: makeSupportItem("km-rate-type", {
				description: "Activity Based Transport",
				rateType: RateType.KM,
				weekdayCode: "04_590_0125_6_1",
				weeknightCode: null,
				saturdayCode: null,
				sundayCode: null,
				weekdayRate: new Prisma.Decimal(0.97),
				weeknightRate: null,
				saturdayRate: null,
				sundayRate: null
			})
		})
	])
);

/**
 * 7. Solo provider travel: labour row at rate/60 per minute and a non-labour
 * row at $0.99/km with code 04_799_0125_6_1.
 */
const transitSolo = makeFixture(
	"transit-solo",
	makeInvoice("transit-solo", "TRANSIT-1", [
		makeActivity("transit-solo", 1, {
			transitDuration: new Prisma.Decimal(30),
			transitDistance: new Prisma.Decimal(15)
		})
	])
);

/**
 * 8. Group provider travel: the non-labour line item and the printed Total
 * both price transit at the apportioned group rate ($0.42/km = floorToCent(the
 * fixture user's 0.85/km ÷ 2), docs/plans/016) via getTransitRate, so the
 * Total equals the sum of the line items. (Formerly quirk Q1: the Total
 * charged $0.99/km while the line item showed a hardcoded $0.43/km.)
 */
const transitGroup = makeFixture(
	"transit-group",
	makeInvoice("transit-group", "TRANSIT-2", [
		makeActivity("transit-group", 1, {
			transitDuration: new Prisma.Decimal(30),
			transitDistance: new Prisma.Decimal(15),
			groupSize: 2,
			supportItem: makeGroupSupportItem("transit-group")
		})
	])
);

/**
 * 9. All four transport item types on a solo activity: DISTANCE at $0.99/km
 * (code 04_590_0125_6_1), PARKING with a note, TOLL with a note, and OTHER
 * with `note: null` (exercising the `"-\n"` fallback cell).
 */
const transportAllTypes = (() => {
	const name = "transport-all-types";

	return makeFixture(
		name,
		makeInvoice(name, "TRANSPORT-1", [
			makeActivity(name, 1, {
				transportItems: [
					makeTransportItem(name, 1, {
						type: ActivityTransportType.DISTANCE,
						amount: new Prisma.Decimal(22)
					}),
					makeTransportItem(name, 2, {
						type: ActivityTransportType.PARKING,
						amount: new Prisma.Decimal(8.5),
						note: "Airport parking"
					}),
					makeTransportItem(name, 3, {
						type: ActivityTransportType.TOLL,
						amount: new Prisma.Decimal(5.7),
						note: "CityLink"
					}),
					makeTransportItem(name, 4, {
						type: ActivityTransportType.OTHER,
						amount: new Prisma.Decimal(12),
						note: null
					})
				]
			})
		])
	);
})();

/** 10. Group activity DISTANCE transport is billed at $0.49/km. */
const transportGroupDistance = makeFixture(
	"transport-group-distance",
	makeInvoice("transport-group-distance", "TRANSPORT-2", [
		makeActivity("transport-group-distance", 1, {
			supportItem: makeGroupSupportItem("transport-group-distance"),
			groupSize: 2,
			transportItems: [
				makeTransportItem("transport-group-distance", 1, {
					type: ActivityTransportType.DISTANCE,
					amount: new Prisma.Decimal(22)
				})
			]
		})
	])
);

/**
 * 10a. A 3-participant group activity (docs/plans/016) — every category
 * apportions by 3 instead of the N=2 default: hourly floorToCent(70.2/3) =
 * 23.40/hr, transit floorToCent(0.85/3) = 0.28/km, ABT floorToCent(0.99/3) =
 * 0.33/km.
 */
const transportGroupThreeParticipants = makeFixture(
	"transport-group-three-participants",
	makeInvoice("transport-group-three-participants", "GROUP3-1", [
		makeActivity("transport-group-three-participants", 1, {
			supportItem: makeGroupSupportItem("transport-group-three-participants", {
				weekdayRate: new Prisma.Decimal(70.2)
			}),
			groupSize: 3,
			transitDuration: new Prisma.Decimal(30),
			transitDistance: new Prisma.Decimal(15),
			transportItems: [
				makeTransportItem("transport-group-three-participants", 1, {
					type: ActivityTransportType.DISTANCE,
					amount: new Prisma.Decimal(22)
				})
			]
		})
	])
);

/**
 * 11. Two activities with the same support item + description on different
 * dates are merged into a single row with concatenated date/count/price/total
 * cells.
 */
const duplicateMerge = makeFixture(
	"duplicate-merge",
	makeInvoice("duplicate-merge", "DUP-1", [
		makeActivity("duplicate-merge", 1),
		makeActivity("duplicate-merge", 2, {
			date: day("2023-01-12"),
			startTime: time("13:00"),
			endTime: time("14:00")
		})
	])
);

/**
 * 12. Kitchen sink — the primary PR-diff sample invoice. Six activities
 * across all day types, a client-specific saturday rate, provider travel,
 * transport items, and a duplicate pair. `client.number` and `billTo` are
 * both set, exercising the table startY offset.
 */
const kitchenSink = (() => {
	const name = "kitchen-sink";
	const supportItem = makeSupportItem(name, {
		supportItemRates: [
			makeSupportItemRates(name, { saturdayRate: new Prisma.Decimal(80) })
		]
	});

	return makeFixture(
		name,
		makeInvoice(
			name,
			"SINK-1",
			[
				makeActivity(name, 1, {
					supportItem,
					transitDuration: new Prisma.Decimal(30),
					transitDistance: new Prisma.Decimal(15),
					transportItems: [
						makeTransportItem(name, 1, {
							activityId: `activity_${name}_1`,
							type: ActivityTransportType.DISTANCE,
							amount: new Prisma.Decimal(10)
						}),
						makeTransportItem(name, 2, {
							activityId: `activity_${name}_1`,
							type: ActivityTransportType.PARKING,
							amount: new Prisma.Decimal(8.5),
							note: "Hospital car park"
						})
					]
				}),
				makeActivity(name, 2, {
					date: day("2023-01-12"),
					startTime: time("18:00"),
					endTime: time("20:00"),
					supportItem
				}),
				makeActivity(name, 3, { date: day("2023-01-14"), supportItem }),
				makeActivity(name, 4, {
					date: day("2023-01-15"),
					startTime: time("09:00"),
					endTime: time("10:00"),
					supportItem
				}),
				makeActivity(name, 5, {
					date: day("2023-01-18"),
					startTime: time("13:00"),
					endTime: time("14:00"),
					supportItem
				}),
				makeActivity(name, 6, {
					date: day("2023-01-19"),
					startTime: time("13:00"),
					endTime: time("14:00"),
					supportItem
				})
			],
			{
				billTo: "HELP Plan Managers",
				client: makeClient(name, { number: "431234567" })
			}
		)
	);
})();

/**
 * 13. User with no bankName: the payment footer requires all five fields
 * (name, abn, bankName, bsb, bankNumber), so the footer block is omitted.
 */
const noPaymentFooter = makeFixture(
	"no-payment-footer",
	makeInvoice("no-payment-footer", "NOFOOTER-1", [
		makeActivity("no-payment-footer", 1)
	]),
	makeUser("no-payment-footer", { bankName: null })
);

// ---------------------------------------------------------------------------
// Scenarios 14–16 are modelled on real invoices from a production user, fully
// de-identified: every name, participant number, plan manager, and payment
// detail is fictional and dates are shifted (weekday pattern preserved). The
// NDIS codes, published rates, durations, and distances match the originals,
// so the pricing arithmetic these exercise is real-world.
// ---------------------------------------------------------------------------

/**
 * The real user's community-access support item — same item and codes as the
 * fixture default, but at the 2025–26 published price limits ($70.23 weekday
 * / $98.83 saturday). The weeknight and sunday rates are never selected by
 * these fixtures; the values are placeholders.
 */
const makeCommunityAccessItem = (fixtureName: string): FixtureSupportItem =>
	makeSupportItem(fixtureName, {
		weekdayRate: new Prisma.Decimal(70.23),
		weeknightRate: new Prisma.Decimal(77.38),
		saturdayRate: new Prisma.Decimal(98.83),
		sundayRate: new Prisma.Decimal(126.31)
	});

/**
 * 14. One Saturday activity with a non-whole-hour duration: 08:50–14:15 is
 * "5 hours, 25 mins", so the minute fraction of the hourly rate flows through
 * rounding (5 + 25/60 × $98.83 = $535.33). Every earlier fixture uses whole
 * or half hours.
 */
const saturdayOddDuration = makeFixture(
	"saturday-odd-duration",
	makeInvoice(
		"saturday-odd-duration",
		"ODD-1",
		[
			makeActivity("saturday-odd-duration", 1, {
				date: day("2023-06-17"), // Saturday
				startTime: time("08:50"),
				endTime: time("14:15"),
				supportItem: makeCommunityAccessItem("saturday-odd-duration")
			})
		],
		{
			date: day("2023-06-25"),
			client: makeClient("saturday-odd-duration", { name: "Sam Sample" })
		}
	)
);

/**
 * 15. The same two-hour slot repeated across three weekdays — a recurring
 * weekly booking. All three activities share one description cell, so they
 * merge into a single row with three date/count/price/total lines
 * (3 × $140.46 = $421.38).
 */
const recurringSlot = (() => {
	const name = "recurring-slot";
	const supportItem = makeCommunityAccessItem(name);
	const slot = { startTime: time("14:35"), endTime: time("16:35") };

	return makeFixture(
		name,
		makeInvoice(
			name,
			"REC-1",
			[
				makeActivity(name, 1, {
					...slot,
					date: day("2023-06-19"),
					supportItem
				}),
				makeActivity(name, 2, {
					...slot,
					date: day("2023-06-20"),
					supportItem
				}),
				makeActivity(name, 3, { ...slot, date: day("2023-06-22"), supportItem })
			],
			{
				date: day("2023-06-25"),
				client: makeClient(name, { name: "Riley Example" })
			}
		)
	);
})();

/**
 * 16. The richest real-world shape, plan-managed: a group session whose 0136
 * registration group derives 04_591_0136_6_1 transport ($0.49/km) and
 * 04_799_0136_6_1 non-labour travel (apportioned to $0.42/km, docs/plans/016 —
 * floorToCent(the fixture user's 0.85/km ÷ 2)), alongside solo sessions on
 * 0125 codes ($0.99/km); odd durations (1h 5m, 5h 30m, 4h 5m); provider
 * travel labour billed per minute at each parent item's rate; and both
 * Participant Number and Bill To in the header. The source invoice printed a
 * Total of $1168.15 that ran above its own line-item sum because it exhibited
 * quirk Q1 (the Total charged the group's 13 km at $0.99/km instead of the
 * group rate). With Q1 fixed the Total matches its line-item sum; docs/plans/016's
 * deliberate -1c/km transit apportioning — the group's 13 km moving from $0.43
 * to $0.42/km — trims a further $0.13 to reach the current golden $1153.46.
 * (The original paginated onto page 2; with the price guide's shorter item
 * names the table now fits on one page.)
 */
const planManagedWeek = (() => {
	const name = "plan-managed-week";
	const communityAccess = makeCommunityAccessItem(name);
	const groupActivities = makeGroupSupportItem(name, {
		id: `supportitem_${name}_group`,
		// The real user's group item is weekday-only, at the full-session rate
		// (docs/plans/016) rather than the full published price limit — 70.20
		// apportions to the pre-plan per-participant rate of 35.10 at N=2.
		weeknightCode: null,
		saturdayCode: null,
		sundayCode: null,
		weekdayRate: new Prisma.Decimal(70.2),
		weeknightRate: null,
		saturdayRate: null,
		sundayRate: null
	});

	return makeFixture(
		name,
		makeInvoice(
			name,
			"PLAN-1",
			[
				// Tuesday group session (1 hour, 20 mins) with provider travel and
				// activity transport at the group rates
				makeActivity(name, 1, {
					date: day("2023-06-20"),
					startTime: time("12:00"),
					endTime: time("13:20"),
					supportItemId: `supportitem_${name}_group`,
					supportItem: groupActivities,
					groupSize: 2,
					transitDuration: new Prisma.Decimal(25),
					transitDistance: new Prisma.Decimal(13),
					transportItems: [
						makeTransportItem(name, 1, {
							activityId: `activity_${name}_1`,
							amount: new Prisma.Decimal(30)
						})
					]
				}),
				// Tuesday solo session immediately after the group one (1 hour, 5 mins)
				makeActivity(name, 2, {
					date: day("2023-06-20"),
					startTime: time("13:20"),
					endTime: time("14:25"),
					supportItem: communityAccess
				}),
				// Thursday long session (5 hours, 30 mins) with travel and transport
				makeActivity(name, 3, {
					date: day("2023-06-22"),
					startTime: time("09:00"),
					endTime: time("14:30"),
					supportItem: communityAccess,
					transitDuration: new Prisma.Decimal(30),
					transitDistance: new Prisma.Decimal(26),
					transportItems: [
						makeTransportItem(name, 2, {
							activityId: `activity_${name}_3`,
							amount: new Prisma.Decimal(46)
						})
					]
				}),
				// Saturday early start (4 hours, 5 mins) at the saturday rate
				makeActivity(name, 4, {
					date: day("2023-06-24"),
					startTime: time("06:15"),
					endTime: time("10:20"),
					supportItem: communityAccess,
					transitDuration: new Prisma.Decimal(30),
					transitDistance: new Prisma.Decimal(26),
					transportItems: [
						makeTransportItem(name, 3, {
							activityId: `activity_${name}_4`,
							amount: new Prisma.Decimal(32)
						})
					]
				})
			],
			{
				date: day("2023-06-25"),
				billTo: "Banksia Plan Management",
				client: makeClient(name, {
					name: "Casey Citizen",
					number: "430123456"
				})
			}
		)
	);
})();

export const invoiceFixtures: InvoiceFixture[] = [
	basicWeekday,
	weeknight,
	saturday,
	sunday,
	clientCustomRates,
	kmRateType,
	transitSolo,
	transitGroup,
	transportAllTypes,
	transportGroupDistance,
	transportGroupThreeParticipants,
	duplicateMerge,
	kitchenSink,
	noPaymentFooter,
	saturdayOddDuration,
	recurringSlot,
	planManagedWeek
];

export const getFixture = (name: string): InvoiceFixture => {
	const fixture = invoiceFixtures.find((f) => f.name === name);

	if (!fixture) throw new Error(`Unknown invoice fixture: ${name}`);

	return fixture;
};

/**
 * Builds the mock module shape for `vi.mock("@/server/prisma", ...)`.
 *
 * `generatePDF(invoiceId, ownerId)` runs two queries:
 *   1. `findFirst({ where: { id, ownerId }, select: { clientId } })`
 *   2. `findFirst({ where: { id, ownerId }, include: { ... } })`
 * Both require id AND ownerId to match.
 */
export const mockPrismaForFixtures = (fixtures: InvoiceFixture[]) => {
	const byInvoiceId = new Map(fixtures.map((f) => [f.invoice.id, f]));
	const byUserId = new Map(fixtures.map((f) => [f.user.id, f]));

	return {
		default: {
			invoice: {
				findFirst: async ({
					where
				}: {
					where: { id: string; ownerId?: string };
				}) => {
					const fixture = byInvoiceId.get(where.id);
					if (!fixture) return null;
					if (where.ownerId && fixture.invoice.ownerId !== where.ownerId)
						return null;
					return fixture.invoice;
				}
			},
			user: {
				findUnique: async ({ where }: { where: { id: string } }) =>
					byUserId.get(where.id)?.user ?? null
			}
		}
	};
};

export const mockPrismaForFixture = (fixture: InvoiceFixture) =>
	mockPrismaForFixtures([fixture]);

/** Builds `renderInvoicePdf`'s input shape directly from a fixture. */
export const toRenderInput = (fixture: InvoiceFixture): InvoicePdfData => ({
	invoice: fixture.invoice,
	user: fixture.user,
	rateContext: {
		userTransitRatePerKm: Number(fixture.user.transitRatePerKm ?? 0.99)
	}
});

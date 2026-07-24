import { userSchema } from "@/schema/user-schema";
import { authedProcedure, router } from "@/server/api/trpc";
import { Prisma } from "@/generated/client";
import { inferRouterOutputs, TRPCError } from "@trpc/server";
import { z } from "zod";

const defaultUserSelect: Prisma.UserSelect = {
	id: true,
	name: true,
	email: true,
	abn: true,
	bankName: true,
	bankNumber: true,
	bsb: true,
	defaultSupportItemId: true,
	defaultGroupSupportItemId: true,
	transitRatePerKm: true
};

export const userRouter = router({
	fetch: authedProcedure.query(async ({ ctx }) => {
		const user = await ctx.prisma.user.findFirst({
			where: { id: ctx.session.user.id },
			select: { ...defaultUserSelect }
		});

		if (user) return user;
		else throw new TRPCError({ code: "NOT_FOUND" });
	}),
	getBankDetails: authedProcedure.query(async ({ ctx }) => {
		const user = await ctx.prisma.user.findFirst({
			where: { id: ctx.session.user.id },
			select: {
				name: true,
				abn: true,
				bankNumber: true,
				bankName: true,
				bsb: true
			}
		});

		if (user) return user;

		throw new TRPCError({ code: "NOT_FOUND" });
	}),
	update: authedProcedure
		.input(
			z.object({
				user: userSchema
			})
		)
		.mutation(async ({ input, ctx }) => {
			const user = await ctx.prisma.user.update({
				where: { id: ctx.session.user.id },
				data: { ...input.user }
			});

			if (!user) {
				throw new TRPCError({
					code: "NOT_FOUND"
				});
			}

			return { user: user };
		}),
	reset: authedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		if (!userId) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Can't find a signed in user"
			});
		}

		// A reset is a deliberate, confirmed "remove all my data" action, so it
		// is the sanctioned exception to ADR-0004's InvoiceVersion onDelete:
		// Restrict (which exists to block *accidental* cascade deletes). Delete
		// the frozen versions explicitly first, otherwise the client cascade
		// into Invoice would hit the Restrict and roll the whole wipe back.
		// The sequence runs in a transaction so a mid-way failure can't leave
		// financial records half-destroyed.
		await ctx.prisma.$transaction([
			ctx.prisma.invoiceVersion.deleteMany({
				where: { invoice: { ownerId: userId } }
			}),

			// Deleting client will cascade delete invoices and activities
			ctx.prisma.client.deleteMany({
				where: { ownerId: userId }
			}),

			// In case there are any orphaned invoices or activities, delete those too
			ctx.prisma.invoice.deleteMany({
				where: { ownerId: userId }
			}),

			ctx.prisma.activity.deleteMany({
				where: { ownerId: userId }
			}),

			ctx.prisma.supportItem.deleteMany({
				where: { ownerId: userId }
			}),

			ctx.prisma.user.update({
				where: { id: userId },
				data: {
					abn: null,
					name: null,
					bankName: null,
					bankNumber: null,
					bsb: null
				}
			})
		]);
	})
});

export type UserFetchOutput = inferRouterOutputs<typeof userRouter>["fetch"];

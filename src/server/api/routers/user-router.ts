import { userSchema } from "@/schema/user-schema";
import { authedProcedure, router } from "@/server/api/trpc";
import { inferRouterOutputs, TRPCError } from "@trpc/server";
import { z } from "zod";

const defaultUserSelect = {
	id: true,
	name: true,
	email: true,
	abn: true,
	bankName: true,
	bankNumber: true,
	bsb: true,
};

export const userRouter = router({
	fetch: authedProcedure.query(async ({ ctx }) => {
		const user = await ctx.prisma.user.findFirst({
			where: { id: ctx.session.user.id },
			select: { ...defaultUserSelect },
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
				bsb: true,
			},
		});

		if (user) return user;

		throw new TRPCError({ code: "NOT_FOUND" });
	}),
	update: authedProcedure
		.input(
			z.object({
				user: userSchema,
			})
		)
		.mutation(async ({ input, ctx }) => {
			const user = await ctx.prisma.user.update({
				where: { id: ctx.session.user.id },
				data: { ...input.user },
			});

			if (!user) {
				throw new TRPCError({
					code: "NOT_FOUND",
				});
			}

			return { user: user };
		}),
	reset: authedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.session.user.id;

		if (!userId) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Can't find a signed in user",
			});
		}

		// Deleting client will cascade delete invoices and activities
		await ctx.prisma.client.deleteMany({
			where: {
				ownerId: userId,
			},
		});

		// In case there are any orphaned invoices or activities, delete those too
		await ctx.prisma.invoice.deleteMany({
			where: {
				ownerId: userId,
			},
		});

		await ctx.prisma.activity.deleteMany({
			where: {
				ownerId: userId,
			},
		});

		await ctx.prisma.supportItem.deleteMany({
			where: {
				ownerId: userId,
			},
		});

		await ctx.prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				abn: null,
				name: null,
				bankName: null,
				bankNumber: null,
				bsb: null,
			},
		});
	}),
});

export type UserFetchOutput = inferRouterOutputs<typeof userRouter>["fetch"];

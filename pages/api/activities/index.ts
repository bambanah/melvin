import prisma from "@Shared/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
	const supportItems = await prisma.itemData.findMany();

	return res.status(200).json(supportItems);
};

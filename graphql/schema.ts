import { nexusPrisma } from "nexus-plugin-prisma";
import { makeSchema } from "nexus";
import * as types from "./types";

const schema = makeSchema({
	types,
	plugins: [nexusPrisma({
		experimentalCRUD: true
	})],
});

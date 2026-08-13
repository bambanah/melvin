import { auth } from "@/server/auth";
import { toNodeHandler } from "better-auth/node";

// better-auth parses the request body itself.
export const config = { api: { bodyParser: false } };

export default toNodeHandler(auth.handler);

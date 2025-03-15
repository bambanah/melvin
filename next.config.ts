import { NextConfig } from "next";

!process.env.SKIP_ENV_VALIDATION && require("./src/env/server.js");

const nextConfig: NextConfig = {
	output: "standalone",
};

export default nextConfig;

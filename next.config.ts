import { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
!process.env.SKIP_ENV_VALIDATION && require("./src/env/server.js");

const nextConfig: NextConfig = {
	output: "standalone"
};

export default nextConfig;

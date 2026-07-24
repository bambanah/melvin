import { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
!process.env.SKIP_ENV_VALIDATION && require("./src/env/server.js");

const nextConfig: NextConfig = {
	output: "standalone",
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin"
					},
					{
						key: "Strict-Transport-Security",
						value: "max-age=63072000; includeSubDomains"
					}
				]
			}
		];
	}
};

export default nextConfig;

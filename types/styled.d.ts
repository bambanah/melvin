import "styled-components";

declare module "styled-components" {
	export interface DefaultTheme {
		type: "light" | "dark";

		colors: {
			fg: string;
			bg: string;
			link: string;
			brand: string;
			gradientPink: string;
			error: string;
		};
	}
}

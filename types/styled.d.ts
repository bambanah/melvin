import "styled-components";

declare module "styled-components" {
	export interface DefaultTheme {
		type: "light" | "dark";

		colors: {
			fg: string;
			display: string;
			bg: string;
			link: string;
			brand: string;
			gradientPink: string;
			info: string;
			warning: string;
			success: string;
			error: string;
		};
	}
}

import "styled-components";

// and extend them!
declare module "styled-components" {
	export interface DefaultTheme {
		type: "light" | "dark";

		colors: {
			fg: string;
			bg: string;
			link: string;
			brand: string;
			error: string;
		};
	}
}

import "styled-components";

// and extend them!
declare module "styled-components" {
	export interface DefaultTheme {
		borderRadius?: string;

		colors: {
			fg: string;
			bg: string;
			link: string;
			accent: string;
			brand: string;
			error: string;
		};
	}
}

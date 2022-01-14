export interface SupportItem {
	description: string;
	rateType: string;
	weekdayCode: string;
	weekdayRate: number | string;
	weeknightCode: string;
	weeknightRate: number | string;
	saturdayCode: string;
	saturdayRate: number | string;
	sundayCode: string;
	sundayRate: number | string;
}

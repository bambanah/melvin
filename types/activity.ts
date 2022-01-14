import { SupportItem } from "./support-item";

export interface Activity {
	date: Date;
	startTime: Date;
	endTime: Date;
	itemDistance: number;
	itemDuration: number;
	transitDuration: number | null;
	transitDistance: number | null;
	supportItem: SupportItem;
}

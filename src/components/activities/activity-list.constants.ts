export const assignedFilters = ["ALL", "UNASSIGNED", "ASSIGNED"] as const;
export type AssignedFilter = (typeof assignedFilters)[number];

export const assignedFilterMap: Record<AssignedFilter, boolean | undefined> = {
	ALL: undefined,
	UNASSIGNED: false,
	ASSIGNED: true,
};

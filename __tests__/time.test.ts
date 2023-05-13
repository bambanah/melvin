describe("Time zone sanity check", () => {
	// There are a lot of dates and times in this project, we need to make sure they're all being handled correctly
	// DateTimes are stored in UTC in the database, but need to be displayed in the local timezone to the user
	it("should get correct time from invoice router procedures", () => {
		console.log("To implement");
	});
});

export {};

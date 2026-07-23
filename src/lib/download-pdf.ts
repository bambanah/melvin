/**
 * Downloads a PDF, or offers the device's native share sheet when one's
 * available (mobile browsers) — used for the send/download flows.
 */
export async function downloadOrSharePdf(
	base64DataUrl: string,
	fileName: string
): Promise<void> {
	const base64 = base64DataUrl.replace(/^data:application\/pdf;base64,/, "");
	const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
	const file = new File([bytes], fileName, { type: "application/pdf" });

	if (
		typeof navigator !== "undefined" &&
		navigator.share &&
		navigator.canShare?.({ files: [file] })
	) {
		try {
			await navigator.share({ files: [file], title: fileName });
			return;
		} catch {
			// User cancelled, or the share sheet failed — fall through to a
			// plain download instead of leaving them with nothing.
		}
	}

	const url = URL.createObjectURL(file);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	anchor.click();
	URL.revokeObjectURL(url);
}

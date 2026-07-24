/**
 * Build an `inline` Content-Disposition header value for a PDF response.
 *
 * The invoice number is user-controlled, so the raw filename is never
 * interpolated into the header directly. We emit two forms:
 * - `filename="..."` sanitised to a safe ASCII token (RFC 6266 fallback), and
 * - `filename*=UTF-8''...` percent-encoded (RFC 5987) so modern browsers still
 *   recover the real, possibly-unicode name.
 */
export const inlinePdfContentDisposition = (fileName: string): string => {
	const safeFileName = fileName.replace(/[^\w.-]/g, "_");
	return `inline; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

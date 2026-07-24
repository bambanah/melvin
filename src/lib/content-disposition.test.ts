import { inlinePdfContentDisposition } from "@/lib/content-disposition";
import { expect, test } from "vitest";

test("emits a safe ASCII filename and an RFC 5987 fallback", () => {
	expect(inlinePdfContentDisposition("INV-001")).toBe(
		`inline; filename="INV-001"; filename*=UTF-8''INV-001`
	);
});

test("replaces unsafe characters in the ASCII filename", () => {
	// Spaces, slashes and quotes are not allowed in a bare filename token.
	expect(inlinePdfContentDisposition('a/b c"d')).toBe(
		`inline; filename="a_b_c_d"; filename*=UTF-8''a%2Fb%20c%22d`
	);
});

test("strips header-injection attempts (CR/LF)", () => {
	const disposition = inlinePdfContentDisposition("evil\r\nSet-Cookie: x=1");
	expect(disposition).not.toMatch(/[\r\n]/);
	expect(disposition).toContain(`filename="evil__Set-Cookie__x_1"`);
});

test("keeps unicode invoice numbers in the RFC 5987 fallback", () => {
	expect(inlinePdfContentDisposition("Rechnung-Müller")).toBe(
		`inline; filename="Rechnung-M_ller"; filename*=UTF-8''Rechnung-M%C3%BCller`
	);
});

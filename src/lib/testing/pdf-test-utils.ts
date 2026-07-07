import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

/**
 * Test helpers for asserting on generated invoice PDFs.
 *
 * pdfjs-dist is pinned to the exact version bundled by react-pdf so only one
 * copy exists in the tree; a react-pdf bump requires re-pinning and
 * regenerating all PDF snapshots. These helpers must run in a Node vitest
 * environment (`// @vitest-environment node`), not the project-default jsdom.
 */

// Anchored to the project root rather than import.meta.url so this module
// loads under both Vitest (ESM) and Playwright (transpiled to CJS)
const require_ = createRequire(path.join(process.cwd(), "package.json"));

// pdfjs substitutes its bundled Foxit standard fonts for jsPDF's built-in
// Helvetica, keeping extraction and rendering independent of OS fonts
// pdfjs validates this with a trailing "/" check, so it must be
// forward-slash style even on Windows
const standardFontDataUrl = `${path
	.dirname(require_.resolve("pdfjs-dist/package.json"))
	.replaceAll("\\", "/")}/standard_fonts/`;

const loadPdf = async (base64: string) => {
	// The legacy build is required under Node; the "fake worker" warning it
	// logs is benign
	const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

	return getDocument({
		data: new Uint8Array(Buffer.from(base64, "base64")),
		useSystemFonts: false,
		standardFontDataUrl
	}).promise;
};

/**
 * Extracts the text content of every page as one human-readable string.
 *
 * Text items are grouped into lines by their rounded y-coordinate, ordered
 * top-to-bottom then left-to-right, with items on a line joined by " | ".
 * Text-stream order is deterministic for identical input, and jsPDF's
 * nondeterministic /CreationDate and /ID trailer bytes never appear in text
 * content — which is why golden masters snapshot this, never raw bytes.
 */
export const extractPdfText = async (base64: string): Promise<string> => {
	const pdf = await loadPdf(base64);

	try {
		const pageTexts: string[] = [];

		for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
			const page = await pdf.getPage(pageNo);
			const content = await page.getTextContent();

			const lines = new Map<number, { x: number; str: string }[]>();

			for (const item of content.items) {
				if (!("str" in item) || item.str.trim() === "") continue;

				const y = Math.round(item.transform[5]);
				const line = lines.get(y) ?? [];

				line.push({ x: item.transform[4], str: item.str.trim() });
				lines.set(y, line);
			}

			const pageText = [...lines.entries()]
				.sort(([yA], [yB]) => yB - yA)
				.map(([, items]) =>
					items
						.sort((a, b) => a.x - b.x)
						.map((item) => item.str)
						.join(" | ")
				)
				.join("\n");

			pageTexts.push(`=== Page ${pageNo} ===\n${pageText}`);
		}

		return `${pageTexts.join("\n\n")}\n`;
	} finally {
		await pdf.destroy();
	}
};

/** Rasterizes one page of the PDF to a PNG buffer via @napi-rs/canvas. */
export const renderPdfPageToPng = async (
	base64: string,
	pageNo = 1,
	scale = 2
): Promise<Buffer> => {
	const { createCanvas } = await import("@napi-rs/canvas");
	const pdf = await loadPdf(base64);

	try {
		const page = await pdf.getPage(pageNo);
		const viewport = page.getViewport({ scale });

		const canvas = createCanvas(
			Math.floor(viewport.width),
			Math.floor(viewport.height)
		);
		const canvasContext = canvas.getContext(
			"2d"
		) as unknown as CanvasRenderingContext2D;

		// RenderParameters requires `canvas`; rendering targets the Node
		// canvas via canvasContext, so pass null for the DOM canvas
		await page.render({ canvas: null, canvasContext, viewport }).promise;

		return canvas.encode("png");
	} finally {
		await pdf.destroy();
	}
};

interface ComparePngOptions {
	/** Per-pixel colour distance threshold passed to pixelmatch. */
	threshold?: number;
	/** Maximum fraction of pixels allowed to differ. */
	maxDiffPixelRatio?: number;
}

/**
 * Compares a rendered PNG against a committed baseline.
 *
 * With UPDATE_PDF_SNAPSHOTS set, writes the baseline instead of comparing.
 * On failure, writes the actual and diff images to a sibling
 * `__diff_output__/` directory (gitignored) and throws with their paths.
 */
export const comparePng = async (
	actual: Buffer,
	baselinePath: string,
	{ threshold = 0.1, maxDiffPixelRatio = 0.002 }: ComparePngOptions = {}
): Promise<void> => {
	if (process.env.UPDATE_PDF_SNAPSHOTS) {
		mkdirSync(path.dirname(baselinePath), { recursive: true });
		writeFileSync(baselinePath, actual);

		return;
	}

	if (!existsSync(baselinePath)) {
		throw new Error(
			`Missing PNG baseline: ${baselinePath}\n` +
				`Baselines are authored on Linux (CI). Generate locally with ` +
				`UPDATE_PDF_SNAPSHOTS=1 (see e2e/README.md).`
		);
	}

	const { default: pixelmatch } = await import("pixelmatch");
	const { PNG } = await import("pngjs");

	const expectedPng = PNG.sync.read(readFileSync(baselinePath));
	const actualPng = PNG.sync.read(actual);

	const diffOutputDir = path.join(
		path.dirname(baselinePath),
		"__diff_output__"
	);
	const baseName = path.basename(baselinePath, ".png");

	const writeDiffOutput = (diff?: InstanceType<typeof PNG>) => {
		mkdirSync(diffOutputDir, { recursive: true });

		const actualPath = path.join(diffOutputDir, `${baseName}.actual.png`);
		writeFileSync(actualPath, actual);

		let diffPath: string | undefined;
		if (diff) {
			diffPath = path.join(diffOutputDir, `${baseName}.diff.png`);
			writeFileSync(diffPath, PNG.sync.write(diff));
		}

		return { actualPath, diffPath };
	};

	if (
		expectedPng.width !== actualPng.width ||
		expectedPng.height !== actualPng.height
	) {
		const { actualPath } = writeDiffOutput();

		throw new Error(
			`PNG size mismatch for ${baselinePath}: expected ` +
				`${expectedPng.width}x${expectedPng.height}, got ` +
				`${actualPng.width}x${actualPng.height}. Actual written to ${actualPath}`
		);
	}

	const { width, height } = expectedPng;
	const diff = new PNG({ width, height });

	const diffPixels = pixelmatch(
		actualPng.data,
		expectedPng.data,
		diff.data,
		width,
		height,
		{ threshold }
	);
	const diffRatio = diffPixels / (width * height);

	if (diffRatio > maxDiffPixelRatio) {
		const { actualPath, diffPath } = writeDiffOutput(diff);

		throw new Error(
			`PNG differs from baseline ${baselinePath}: ${diffPixels} pixels ` +
				`(${(diffRatio * 100).toFixed(4)}% > ${maxDiffPixelRatio * 100}%).\n` +
				`Actual: ${actualPath}\nDiff: ${diffPath}`
		);
	}
};

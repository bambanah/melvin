if (process.env.NODE_ENV === "production") {
	// use minified verion for production
	// eslint-disable-next-line import/extensions
	module.exports = require("pdfjs-dist/build/pdf.worker.min.js");
} else {
	// eslint-disable-next-line import/extensions
	module.exports = require("pdfjs-dist/build/pdf.worker.js");
}

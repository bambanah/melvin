import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest is not configured with globals, so React Testing Library's automatic
// afterEach cleanup never registers. Unmount rendered trees between tests here.
afterEach(() => {
	cleanup();
});

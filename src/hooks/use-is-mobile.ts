// Is the viewport phone-sized? Reads the same breakpoint Tailwind's `md`
// uses, so a component that branches on this stays in step with the `md:`
// classes around it. Returns false until the first client render - callers
// are interaction-driven (a modal opening), so hydration has already settled
// by the time the answer matters.
import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
		const sync = () => setIsMobile(query.matches);
		sync();
		query.addEventListener("change", sync);
		return () => query.removeEventListener("change", sync);
	}, []);

	return isMobile;
}

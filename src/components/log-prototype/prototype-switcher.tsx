// PROTOTYPE - throwaway. Floating bottom bar that cycles UI variants via the
// ?variant= search param. Deliberately high-contrast so it reads as scaffolding,
// not part of the design being judged. Hidden in production builds.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect } from "react";

export function PrototypeSwitcher({
	variants,
	current
}: {
	variants: { key: string; name: string }[];
	current: string;
}) {
	const router = useRouter();

	const index = Math.max(
		variants.findIndex((v) => v.key === current),
		0
	);
	const go = (offset: number) => {
		const next = variants[(index + offset + variants.length) % variants.length];
		router.replace(
			{ query: { ...router.query, variant: next.key } },
			undefined,
			{ shallow: true }
		);
	};

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement;
			if (
				target.closest("input, textarea, select, [contenteditable]") ||
				(event.key !== "ArrowLeft" && event.key !== "ArrowRight")
			) {
				return;
			}
			go(event.key === "ArrowLeft" ? -1 : 1);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	if (process.env.NODE_ENV === "production") return null;

	return (
		<div className="fixed bottom-2 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border-2 border-dashed border-fuchsia-500 bg-black/85 px-2 py-1 font-mono text-xs text-white shadow-xl backdrop-blur">
			<button
				className="cursor-pointer rounded-full p-1 hover:bg-white/20"
				onClick={() => go(-1)}
				aria-label="Previous variant"
			>
				<ChevronLeft className="size-4" />
			</button>
			<span className="min-w-32 text-center">
				{variants[index].key} — {variants[index].name}
			</span>
			<button
				className="cursor-pointer rounded-full p-1 hover:bg-white/20"
				onClick={() => go(1)}
				aria-label="Next variant"
			>
				<ChevronRight className="size-4" />
			</button>
		</div>
	);
}

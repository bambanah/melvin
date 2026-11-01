// PROTOTYPE - throwaway. Floating bottom bar that cycles UI variants via the
// ?variant= search param. Deliberately high-contrast so it reads as scaffolding,
// not part of the design being judged. Hidden in production builds. Mounted in
// Layout because the apply variants live on different pages; each variant names
// where to find it and links there.
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { APPLY_VARIANTS, useApplyVariant, useCreated } from "./apply-store";
import { useAllRegularTimes } from "./store";

export function PrototypeSwitcher() {
	const router = useRouter();
	const current = useApplyVariant();
	const regularTimes = useAllRegularTimes();
	const created = useCreated();

	const variants = APPLY_VARIANTS;
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

	const variant = variants[index];

	return (
		<div className="pointer-events-none fixed bottom-2 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-1">
			<pre className="pointer-events-auto max-h-24 max-w-[90vw] overflow-auto rounded border border-dashed border-fuchsia-500 bg-black/85 px-2 py-1 font-mono text-[10px] text-white">
				regularTimes = {JSON.stringify(Object.fromEntries(regularTimes))}
				{"\n"}created = {JSON.stringify(created)}
			</pre>
			<div className="pointer-events-auto flex items-center gap-1 rounded-full border-2 border-dashed border-fuchsia-500 bg-black/85 px-2 py-1 font-mono text-xs text-white shadow-xl backdrop-blur">
				<button
					className="cursor-pointer rounded-full p-1 hover:bg-white/20"
					onClick={() => go(-1)}
					aria-label="Previous variant"
				>
					<ChevronLeft className="size-4" />
				</button>
				<Link
					href={`${variant.href}?variant=${variant.key}`}
					className="flex min-w-48 flex-col items-center hover:underline"
					title="Go to where this variant lives"
				>
					<span>
						{variant.key} - {variant.name}
					</span>
					<span className="text-[10px] text-white/60">{variant.hint}</span>
				</Link>
				<button
					className="cursor-pointer rounded-full p-1 hover:bg-white/20"
					onClick={() => go(1)}
					aria-label="Next variant"
				>
					<ChevronRight className="size-4" />
				</button>
			</div>
		</div>
	);
}

// PROTOTYPE - throwaway route for the stage-2 HITL gate of issue #464.
// Three structurally different takes on the field-capture Log, switchable via
// ?variant= (notebook | timeline | now), all wired to the real log-router so
// the state model can be felt with real timestamps on a phone. Not for
// production - delete this page and src/components/log-prototype/ once the
// winning shape is chosen (see the NOTES.md next to the variants).
import { useLogFlows } from "@/components/log-prototype/flows";
import { PrototypeSwitcher } from "@/components/log-prototype/prototype-switcher";
import { useLogPrototype } from "@/components/log-prototype/use-log-prototype";
import { VariantCapture } from "@/components/log-prototype/variant-capture";
import { VariantHybrid } from "@/components/log-prototype/variant-hybrid";
import { VariantNotebook } from "@/components/log-prototype/variant-notebook";
import { VariantNow } from "@/components/log-prototype/variant-now";
import { VariantTimeline } from "@/components/log-prototype/variant-timeline";
import Navbar from "@/components/navigation/navbar";
import { useRouter } from "next/router";

const variants = [
	{ key: "notebook", name: "Per-client notebook" },
	{ key: "timeline", name: "Day timeline" },
	{ key: "now", name: "Now card" },
	{ key: "hybrid", name: "Now card + timeline" },
	{ key: "capture", name: "Capture console (support-friend L2)" }
];

function LogPrototype() {
	const router = useRouter();
	const log = useLogPrototype();
	const flows = useLogFlows(log);

	if (process.env.NODE_ENV === "production") return null;

	const variant =
		typeof router.query.variant === "string"
			? router.query.variant
			: "notebook";

	// Own minimal shell (real navbar, no QuickAddFab) - the Activities FAB
	// would overlap the variants' own capture affordances.
	return (
		<div className="flex h-full min-h-screen w-full flex-col">
			<Navbar />
			<div className="flex flex-auto flex-col px-2 py-8 sm:px-12">
				{!log.isLoading &&
					(variant === "timeline" ? (
						<VariantTimeline flows={flows} />
					) : variant === "now" ? (
						<VariantNow flows={flows} />
					) : variant === "hybrid" ? (
						<VariantHybrid flows={flows} />
					) : variant === "capture" ? (
						<VariantCapture flows={flows} />
					) : (
						<VariantNotebook flows={flows} />
					))}
			</div>
			{flows.dialogs}
			<PrototypeSwitcher variants={variants} current={variant} />
		</div>
	);
}

export default LogPrototype;

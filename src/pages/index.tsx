import { ModeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import Logo from "@/components/ui/logo";
import { getServerAuthSession } from "@/server/auth";
import {
	BookOpenCheck,
	Car,
	ChartNoAxesColumn,
	FileClock,
	Landmark,
	Smartphone
} from "lucide-react";
import { GetServerSideProps } from "next";
import Link from "next/link";
import { ReactNode } from "react";

const CORAL = "#ff8484";

const features: { icon: ReactNode; title: string; body: string }[] = [
	{
		icon: <Smartphone />,
		title: "A log that keeps up",
		body: "Start a session with one tap as you walk in the door. Melvin keeps a running scratchpad per client, so capturing the day is as quick as the notes app it replaces."
	},
	{
		icon: <Car />,
		title: "Travel maths, done",
		body: "Home to client, client to client, and back home again. Melvin derives the kilometres and minutes for every leg, bills them under the right NDIS travel codes, and applies the 30-minute cap where it must."
	},
	{
		icon: <BookOpenCheck />,
		title: "The price guide, built in",
		body: "The NDIS catalogue ships inside Melvin. Weekday, weeknight, Saturday and Sunday rates resolve themselves from the date and time - you never look a code up twice."
	},
	{
		icon: <FileClock />,
		title: "Amend without fear",
		body: "Sending an invoice freezes it forever. Need to fix one? Amend, edit, re-send - the new version gets a letter suffix and every old version stays downloadable, exactly as it went out."
	},
	{
		icon: <Landmark />,
		title: "Payment matching",
		body: "A lump sum lands in your bank account. Melvin works backwards to the exact combination of outstanding invoices it pays, so nothing slips through unreconciled."
	},
	{
		icon: <ChartNoAxesColumn />,
		title: "Your year at a glance",
		body: "Total billed per financial year, straight from the frozen invoice totals. When tax time comes, the number is already there - and it never quietly changes underneath you."
	}
];

const steps: { time: string; title: string; body: string }[] = [
	{
		time: "9:12 am",
		title: "Log it",
		body: "One tap starts a session with Alex. Times, group changes and in-session transport are captured as they happen."
	},
	{
		time: "11:30 am",
		title: "Hand over",
		body: "Finish with Alex, drive to Sam. The handover closes one session, opens the next, and records the 12 km in between."
	},
	{
		time: "4:45 pm",
		title: "Promote",
		body: "Home again. Promote the day and every session becomes a billable activity - default support items assigned, the trip's travel assembled leg by leg."
	},
	{
		time: "4:52 pm",
		title: "Send",
		body: "Pending activities roll into the next invoice. Download the PDF, send it off, and watch the owing total until it's paid."
	}
];

const IndexPage = () => {
	return (
		<div className="relative overflow-hidden">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]"
				style={{
					background: `radial-gradient(60rem 30rem at 70% -10%, ${CORAL}2e, transparent 70%)`
				}}
			/>

			<div className="mx-auto flex w-full max-w-6xl flex-col px-6 sm:px-8">
				<nav className="flex items-center justify-between py-5">
					<Logo>melvin</Logo>
					<div className="flex items-center gap-2">
						<ModeToggle />
						<Button asChild variant="outline">
							<Link href="/login">Log in</Link>
						</Button>
					</div>
				</nav>

				{/* Hero */}
				<section className="grid items-center gap-12 pt-14 pb-20 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
					<div className="flex flex-col items-start gap-6">
						<span className="rounded-full border px-3 py-1 text-xs font-medium tracking-wide uppercase">
							For sole-trader NDIS providers
						</span>
						<h2 className="font-display text-5xl leading-[1.05] sm:text-6xl">
							Log the day.
							<br />
							<span style={{ color: CORAL }}>Melvin</span> does the invoicing.
						</h2>
						<p className="text-muted-foreground max-w-prose text-lg">
							Melvin turns the work you scribble down between clients into
							NDIS-ready invoices - support items, day rates, travel and
							transport all worked out - so evenings stop being admin time.
						</p>
						<div className="flex items-center gap-4">
							<Button asChild size="lg">
								<Link href="/login">Log in</Link>
							</Button>
							<p className="text-muted-foreground text-sm">
								Melvin is invite-only for now.
							</p>
						</div>
					</div>

					{/* Mock: a day's log becoming an invoice */}
					<div className="relative mx-auto w-full max-w-md">
						<div className="bg-card rounded-xl border p-5 shadow-lg">
							<div className="flex items-baseline justify-between">
								<p className="font-mono text-sm font-semibold">INV-014</p>
								<span className="text-muted-foreground rounded-full border px-2 py-0.5 text-xs">
									Draft
								</span>
							</div>
							<p className="text-muted-foreground mt-1 text-xs">
								Alex T. &middot; Sat 15 Aug
							</p>
							<div className="mt-4 flex flex-col gap-2 text-sm">
								<MockLine
									label="Community access - Saturday rate"
									detail="3 h"
									amount="$196.41"
								/>
								<MockLine
									label="Provider travel - labour"
									detail="24 min"
									amount="$26.19"
								/>
								<MockLine
									label="Provider travel - non-labour"
									detail="18 km"
									amount="$17.46"
								/>
								<MockLine
									label="Activity based transport"
									detail="9 km"
									amount="$8.91"
								/>
							</div>
							<div className="mt-4 flex items-baseline justify-between border-t pt-3">
								<p className="text-sm font-medium">Total</p>
								<p className="font-mono text-lg font-semibold">$248.97</p>
							</div>
						</div>

						<div className="bg-card absolute -top-6 -right-3 hidden rotate-2 rounded-lg border px-4 py-3 shadow-md sm:block">
							<p className="text-muted-foreground text-xs">Session open</p>
							<p className="font-mono text-sm">
								9:12 am &rarr;{" "}
								<span className="animate-pulse" style={{ color: CORAL }}>
									now
								</span>
							</p>
						</div>

						<div className="bg-card absolute -bottom-12 -left-3 hidden -rotate-2 rounded-lg border px-4 py-3 shadow-md sm:block">
							<p className="text-muted-foreground text-xs">Travel handover</p>
							<p className="font-mono text-sm">
								Alex &rarr; Sam &middot; 12 km
							</p>
						</div>
					</div>
				</section>

				{/* Day timeline */}
				<section className="border-t py-20">
					<h3 className="font-display text-3xl sm:text-4xl">
						How a day becomes an invoice
					</h3>
					<ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
						{steps.map((step) => (
							<li key={step.title} className="flex flex-col gap-2">
								<p className="font-mono text-sm" style={{ color: CORAL }}>
									{step.time}
								</p>
								<p className="text-lg font-semibold">{step.title}</p>
								<p className="text-muted-foreground text-sm">{step.body}</p>
							</li>
						))}
					</ol>
				</section>

				{/* Features */}
				<section className="border-t py-20">
					<h3 className="font-display text-3xl sm:text-4xl">
						The fiddly parts, handled
					</h3>
					<div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{features.map((feature) => (
							<div
								key={feature.title}
								className="bg-card flex flex-col gap-3 rounded-xl border p-6"
							>
								<div
									className="flex h-10 w-10 items-center justify-center rounded-lg [&_svg]:h-5 [&_svg]:w-5"
									style={{ backgroundColor: `${CORAL}26`, color: CORAL }}
								>
									{feature.icon}
								</div>
								<p className="font-semibold">{feature.title}</p>
								<p className="text-muted-foreground text-sm">{feature.body}</p>
							</div>
						))}
					</div>
				</section>

				{/* Domain facts strip */}
				<section className="border-t py-16">
					<div className="grid gap-8 text-center sm:grid-cols-4">
						<Fact
							figure="$0.99/km"
							caption="NDIS transit rate cap, respected"
						/>
						<Fact figure="4" caption="day rates resolved per activity" />
						<Fact figure="30 min" caption="MMM travel cap, applied per leg" />
						<Fact figure="1 Jul" caption="your financial year, ready-made" />
					</div>
				</section>

				{/* Closing CTA */}
				<section className="flex flex-col items-center gap-6 border-t py-24 text-center">
					<Logo variant="MEDIUM">melvin</Logo>
					<p className="text-muted-foreground max-w-md text-lg">
						Less time invoicing means more time supporting. That&#39;s the whole
						idea.
					</p>
					<Button asChild size="lg">
						<Link href="/login">Log in</Link>
					</Button>
				</section>

				<footer className="text-muted-foreground flex items-center justify-between border-t py-8 text-sm">
					<p>Built in Australia for sole traders.</p>
					<Link href="/login" className="hover:text-foreground">
						Log in
					</Link>
				</footer>
			</div>
		</div>
	);
};

const MockLine = ({
	label,
	detail,
	amount
}: {
	label: string;
	detail: string;
	amount: string;
}) => (
	<div className="flex items-baseline justify-between gap-3">
		<p className="truncate">{label}</p>
		<p className="text-muted-foreground shrink-0 font-mono text-xs">{detail}</p>
		<p className="shrink-0 font-mono">{amount}</p>
	</div>
);

const Fact = ({ figure, caption }: { figure: string; caption: string }) => (
	<div className="flex flex-col gap-1">
		<p className="font-display text-3xl" style={{ color: CORAL }}>
			{figure}
		</p>
		<p className="text-muted-foreground text-sm">{caption}</p>
	</div>
);

export const getServerSideProps: GetServerSideProps = async (context) => {
	const session = await getServerAuthSession(context.req);

	if (session) {
		return {
			redirect: {
				destination: "/dashboard",
				permanent: false
			}
		};
	}

	return {
		props: {}
	};
};

export default IndexPage;

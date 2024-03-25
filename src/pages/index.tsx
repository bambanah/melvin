import { Cat } from "@/components/ui/cat";
import Heading from "@/components/ui/heading";
import Logo from "@/components/ui/logo";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";
import Link from "next/link";

const cats = [
	"cat_1.jpg",
	"cat_2.jpg",
	"cat_3.jpg",
	"cat_4.jpg",
	"cat_5.jpg",
	"cat_6.jpg",
	"cat_7.jpg",
	"cat_8.jpg",
];

interface CatAndMouse {
	mouse: { left: number; top: number };
}

const DashboardPage = ({ mouse }: CatAndMouse) => {
	return (
		<main className="mx-auto flex w-full max-w-6xl flex-col items-stretch">
			<nav className="flex items-center justify-between px-8 py-4">
				<Logo>Melvin</Logo>
				<ul className="flex items-center gap-4">
					<li>
						<Link href="/login">Log In</Link>
					</li>
					<li>
						<Link href="/signup">Sign Up</Link>
					</li>
				</ul>
			</nav>
			<div className="flex flex-col items-center justify-center gap-8 pt-32">
				<Heading>Welcome!</Heading>
				<p>There&#39;s not much here right now, but come back later.</p>

				{/* App gets better after this point: */}
				<p>There is, however, cats.</p>

				<div className="cat-wrap">
					{cats.map((cat, index) => {
						return <Cat key={index} cat={cat} mouse={mouse} index={index} />;
					})}
				</div>
			</div>
		</main>
	);
};

export const getServerSideProps: GetServerSideProps = async (context) => {
	const session = await getSession(context);

	if (session) {
		return {
			redirect: {
				destination: "/dashboard",
				permanent: false,
			},
		};
	}

	return {
		props: {},
	};
};

export default DashboardPage;

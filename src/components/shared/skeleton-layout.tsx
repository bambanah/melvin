import Skeleton from "react-loading-skeleton";
import ListPage from "./list-page";
import ListFilterRow from "./list-filter-row";

const SkeletonLayout = () => {
	return (
		<ListPage>
			<ListPage.Header>
				<h2 className="mr-auto w-32 text-3xl font-bold">
					<Skeleton />
				</h2>

				<div className="box-content h-6 w-24 border border-transparent py-2 text-4xl">
					<Skeleton />
				</div>
			</ListPage.Header>
			<ListFilterRow
				items={Array.from({ length: 2 }).map(() => ({
					children: <Skeleton />,
				}))}
			/>
			<ul>
				{Array.from({ length: 5 }).map((id, idx) => (
					<ListPage.Item key={idx} href="#">
						<div className="flex w-[18rem] flex-col gap-2">
							<div className="w-full sm:text-lg">
								<Skeleton />
							</div>
							<span className="w-5/6">
								<Skeleton />
							</span>
						</div>
						<div className="flex basis-10 flex-col items-end gap-2 text-right">
							<span className="w-16 sm:text-lg">
								<Skeleton />
							</span>
							<span className="w-12">
								<Skeleton />
							</span>
						</div>
					</ListPage.Item>
				))}
			</ul>
		</ListPage>
	);
};

export default SkeletonLayout;

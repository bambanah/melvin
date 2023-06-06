import Skeleton from "react-loading-skeleton";
import ListPage from "./list-page";

const SkeletonLayout = () => {
	return (
		<ListPage>
			<ListPage.Header>
				<h2 className="mr-auto w-[12rem] text-3xl font-bold">
					<Skeleton />
				</h2>

				<div className="w-24 text-4xl">
					<Skeleton />
				</div>

				<Skeleton />
			</ListPage.Header>
			<ListPage.Items>
				{Array.from({ length: 5 }).map((id, idx) => (
					<ListPage.Item key={idx} href="#">
						<div className="flex w-[20rem] flex-col gap-2">
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
			</ListPage.Items>
		</ListPage>
	);
};

export default SkeletonLayout;

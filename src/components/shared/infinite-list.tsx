import Loading from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import React, { Fragment, useEffect, useRef } from "react";

interface InfiniteListProps<TData, TError, TKey extends keyof TData> {
	queryResult: UseInfiniteQueryResult<InfiniteData<TData>, TError>;
	children: (data: TData[TKey]) => React.ReactNode;
	dataKey: TKey;
	className?: string;
}
const InfiniteList = <TData, TError, TKey extends keyof TData>({
	children,
	queryResult,
	dataKey,
	className
}: InfiniteListProps<TData, TError, TKey>) => {
	const { data, fetchNextPage, isSuccess, isPending, isFetching, hasNextPage } =
		queryResult;
	const dataReturned =
		isSuccess && data.pages.flatMap((page) => page[dataKey])?.length > 0;

	const loadMoreRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const observer = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting && hasNextPage) {
				fetchNextPage();
			}
		});

		if (loadMoreRef.current) {
			observer.observe(loadMoreRef.current);
		}

		return () => observer.disconnect();
	}, [fetchNextPage, hasNextPage]);

	return (
		<div
			className={cn([
				"mx-auto flex h-full w-full max-w-4xl flex-col",
				className
			])}
		>
			{isSuccess && (
				<div className="flex flex-col divide-y">
					{dataReturned ? (
						data.pages.flatMap((page, idx) => (
							<Fragment key={idx}>{children(page[dataKey])}</Fragment>
						))
					) : (
						<p className="text-foreground/60 mx-auto mt-8">
							There&#39;s nothing here
						</p>
					)}
				</div>
			)}

			{(isPending || isFetching) && !data && <Loading />}

			<div ref={loadMoreRef} className=""></div>
		</div>
	);
};

export default InfiniteList;

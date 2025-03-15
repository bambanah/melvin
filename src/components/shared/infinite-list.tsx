import Loading from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { UseTRPCInfiniteQueryResult } from "@trpc/react-query/shared";
import React, { Fragment, useEffect, useRef } from "react";

interface InfiniteListProps<TData, TError, TKey extends keyof TData> {
	queryResult: UseTRPCInfiniteQueryResult<TData, TError>;
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
	const { data, fetchNextPage, isSuccess, isLoading, isFetching, hasNextPage } =
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
						<p className="mx-auto mt-8 text-foreground/60">
							There&#39;s nothing here
						</p>
					)}
				</div>
			)}

			{(isLoading || isFetching) && !data && <Loading />}

			<div ref={loadMoreRef} className=""></div>
		</div>
	);
};

export default InfiniteList;

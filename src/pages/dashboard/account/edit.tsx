import AccountForm from "@/components/account/account-form";
import Layout from "@/components/shared/layout";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import Heading from "@/components/ui/heading";
import Loading from "@/components/ui/loading";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "react-toastify";

const EditAccountPage = () => {
	const router = useRouter();

	const [isAdvancedExpanded, setAdvancedExpanded] = useState(false);

	const { data: user, error } = trpc.user.fetch.useQuery();
	const resetAccountMutation = trpc.user.reset.useMutation();
	const trpcUtils = trpc.useUtils();

	const resetAccount = () => {
		resetAccountMutation
			.mutateAsync()
			.then(() => {
				toast.error("Account has been reset.");
				trpcUtils.user.fetch.invalidate();
				router.reload();
			})
			.catch((error) => {
				toast.error("An error occured. Please try again.");
				console.error(error);
			});
	};

	if (error) {
		return <div>Error</div>;
	}
	if (!user) {
		return (
			<Layout>
				<Loading />
			</Layout>
		);
	}

	return (
		<Layout>
			<div className="mx-auto flex w-full max-w-xl flex-col items-center">
				<AccountForm existingUser={user} />
				<div className="mx-auto w-full">
					<button
						type="button"
						onClick={() => setAdvancedExpanded(!isAdvancedExpanded)}
						className="mb-5 flex items-center gap-2"
					>
						<ChevronRight
							className={cn([
								"duration-75",
								isAdvancedExpanded ? "rotate-90" : ""
							])}
						/>
						<Heading size="small">Advanced Options</Heading>
					</button>
					{isAdvancedExpanded && (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="destructive">Reset Account</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
									<AlertDialogDescription>
										This action cannot be undone. This will reset your account
										and remove your data from our servers.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<Button variant="destructive" onClick={resetAccount} asChild>
										<AlertDialogAction>Delete</AlertDialogAction>
									</Button>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
				</div>
			</div>
		</Layout>
	);
};

export default EditAccountPage;

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { ExternalLink, File, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";

const NavAuth = () => {
	const { data: session } = authClient.useSession();
	const router = useRouter();

	const user = session?.user;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon">
					<User />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				{user?.email && <DropdownMenuLabel>{user.email}</DropdownMenuLabel>}
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<Link href="/dashboard/account">
						<DropdownMenuItem className="cursor-pointer">
							<Settings className="mr-2 h-4 w-4" />
							<span>Settings</span>
						</DropdownMenuItem>
					</Link>
					<Link href="/price-guide-24-25.pdf" target="_blank">
						<DropdownMenuItem className="cursor-pointer">
							<File className="mr-2 h-4 w-4" />
							<span>Price Guide</span>
							<ExternalLink className="ml-2 h-4 w-4" />
						</DropdownMenuItem>
					</Link>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="cursor-pointer"
					onClick={async () => {
						await authClient.signOut();
						router.push("/");
					}}
				>
					<LogOut className="mr-2 h-4 w-4" />
					<span>Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default NavAuth;

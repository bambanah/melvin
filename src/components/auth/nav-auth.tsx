import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExternalLink, File, LogOut, Settings, User } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";

interface NavAuthProps {
	user?: { id: string; email: string };
}

const NavAuth = ({ user }: NavAuthProps) => (
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
				<Link href="/dashboard/account/edit">
					<DropdownMenuItem className="cursor-pointer">
						<Settings className="mr-2 h-4 w-4" />
						<span>Settings</span>
					</DropdownMenuItem>
				</Link>
				<Link href="/price-guide-22-23.pdf" target="_blank">
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
				onClick={() => {
					signOut();
				}}
			>
				<LogOut className="mr-2 h-4 w-4" />
				<span>Log out</span>
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
);

export default NavAuth;

import Link from "next/link";
import { useAuth } from "../shared/hooks/use-auth";

interface Props {
	children: React.ReactNode;
}

const Layout: React.FC<Props> = ({ children }) => {
	// const { authenticated } = useAuth();

	return (
		<div className="container">
			{/* {authenticated && (
				<div className="header">
					<span>Header goes here</span>
				</div>
			)} */}
			{children}
		</div>
	);
};

export default Layout;

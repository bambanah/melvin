import { library } from "@fortawesome/fontawesome-svg-core";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import {
	faChevronRight,
	faCircle,
	faCopy,
	faDollarSign,
	faDownload,
	faEdit,
	faEllipsisV,
	faFileAlt,
	faHome,
	faIdCard,
	faPlus,
	faTrash,
	faUser,
	faWalking,
	faWallet,
} from "@fortawesome/free-solid-svg-icons";

const importIcons = () => {
	library.add(
		faEdit,
		faTrash,
		faGoogle,
		faChevronRight,
		faEllipsisV,
		faPlus,
		faDownload,
		faHome,
		faUser,
		faWalking,
		faFileAlt,
		faCircle,
		faCopy,
		faIdCard,
		faWallet,
		faDollarSign
	);
};

export default importIcons;

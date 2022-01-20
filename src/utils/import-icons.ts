import { library } from "@fortawesome/fontawesome-svg-core";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import {
	faChevronRight,
	faCircle,
	faCopy,
	faDownload,
	faEdit,
	faEllipsisV,
	faFileAlt,
	faHome,
	faPlus,
	faTrash,
	faUser,
	faWalking,
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
		faCopy
	);
};

export default importIcons;

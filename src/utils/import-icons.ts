import { library } from "@fortawesome/fontawesome-svg-core";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import {
	faChevronRight,
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
		faFileAlt
	);
};

export default importIcons;

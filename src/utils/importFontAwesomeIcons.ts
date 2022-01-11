import { library } from "@fortawesome/fontawesome-svg-core";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import {
	faCheck,
	faChevronDown,
	faChevronRight,
	faCopy,
	faEdit,
	faFileDownload,
	faTimes,
	faTrash,
} from "@fortawesome/free-solid-svg-icons";

const importIcons = () => {
	library.add(
		faEdit,
		faTimes,
		faCheck,
		faTrash,
		faCopy,
		faFileDownload,
		faGoogle,
		faChevronRight,
		faChevronDown
	);
};

export default importIcons;

import { library } from "@fortawesome/fontawesome-svg-core";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import {
	faChevronRight,
	faEdit,
	faEllipsisV,
	faTrash,
} from "@fortawesome/free-solid-svg-icons";

const importIcons = () => {
	library.add(faEdit, faTrash, faGoogle, faChevronRight, faEllipsisV);
};

export default importIcons;

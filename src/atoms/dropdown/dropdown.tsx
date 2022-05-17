import Button from "@atoms/button";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { FC, useEffect, useRef, useState } from "react";
import * as Styles from "./styles";

interface DropdownProps {
	title: string;
	action: () => void;
	style: React.CSSProperties;
}

const Dropdown: FC<DropdownProps> = ({ title, children, action, style }) => {
	const dropdownRef = useRef<HTMLDivElement>(null);
	const [showDropdown, setShowDropdown] = useState(false);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setShowDropdown(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);

		return () => {
			// Unbind the event listener on clean up
			document.removeEventListener("mousedown", handleClickOutside);
		};
	});

	return (
		<Styles.DropdownContainer ref={dropdownRef} style={style}>
			<Button
				onClick={() => {
					action();
					setShowDropdown(false);
				}}
			>
				{title}
			</Button>
			<Button onClick={() => setShowDropdown(!showDropdown)}>
				<FontAwesomeIcon icon={faChevronDown} />
			</Button>
			{showDropdown && (
				<Styles.DropdownContent onClick={() => setShowDropdown(false)}>
					{children}
				</Styles.DropdownContent>
			)}
		</Styles.DropdownContainer>
	);
};

export default Dropdown;

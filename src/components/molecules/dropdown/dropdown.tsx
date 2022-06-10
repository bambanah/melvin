import Button from "@atoms/button";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { breakpoints } from "@styles/themes";
import React, { FC, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "react-responsive";
import * as Styles from "./styles";

interface DropdownProps {
	title: string;
	action: () => void;
	style: React.CSSProperties;
	children: React.ReactNode;
}

const Dropdown: FC<DropdownProps> = ({ title, children, action, style }) => {
	const dropdownRef = useRef<HTMLDivElement>(null);
	const [showDropdown, setShowDropdown] = useState(false);

	const isTabletScreen = useMediaQuery({ query: breakpoints.tablet });

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
			document.removeEventListener("mousedown", handleClickOutside);
		};
	});

	return (
		<Styles.DropdownContainer ref={dropdownRef} style={style}>
			{!isTabletScreen && (
				<Button
					onClick={() => {
						action();
						setShowDropdown(false);
					}}
				>
					{title}
				</Button>
			)}
			<Button
				onClick={() => setShowDropdown(!showDropdown)}
				className={showDropdown ? "raised" : ""}
			>
				<FontAwesomeIcon icon={faChevronDown} />
			</Button>
			{showDropdown && (
				<Styles.DropdownContent onClick={() => setShowDropdown(false)}>
					{isTabletScreen && (
						<a onClick={action} className="primary">
							{title}
						</a>
					)}
					{children}
				</Styles.DropdownContent>
			)}
		</Styles.DropdownContainer>
	);
};

export default Dropdown;

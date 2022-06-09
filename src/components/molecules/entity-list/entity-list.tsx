import Button from "@atoms/button";
import Display from "@atoms/display";
import Dropdown from "@atoms/dropdown";
import Heading from "@atoms/heading";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { FC, useState } from "react";
import * as Styles from "./styles";

export interface EntityListItem {
	id: string;
	fields: {
		value: string | React.ReactNode;
		type: "label" | "text";
		icon?: IconDefinition;
		align?: "left" | "center" | "right";
		fontWeight?: "bold" | "normal";
		flex?: string;
	}[];
	actions?: (
		| {
				value: string;
				type: "link";
				icon?: IconDefinition;
				href: string;
		  }
		| {
				value: string;
				type: "button";
				icon?: IconDefinition;
				onClick: (id: string) => void;
		  }
	)[];
	ExpandedComponent?: (index: number) => JSX.Element;
}

interface EntityListProps {
	title: string;
	entities: EntityListItem[];
	route?: string;
	shouldExpand?: boolean;
}

const EntityList: FC<EntityListProps> = ({
	title,
	route,
	entities,
	shouldExpand,
}) => {
	const [expandedIndex, setExpandedIndex] = useState<number | undefined>();
	const router = useRouter();
	return (
		<Styles.Container>
			<Styles.Header>
				<Display className="small">{title}</Display>
				<Link href={`${route}/create`} passHref>
					<Button variant="primary">+ Add New</Button>
				</Link>
			</Styles.Header>
			<Styles.Content>
				{entities.map((entity, index) => (
					<Styles.Entity
						key={index}
						className={expandedIndex === index ? "expanded" : ""}
					>
						<Styles.EntityContent>
							<Styles.EntityDetails
								onClick={() =>
									shouldExpand &&
									setExpandedIndex(expandedIndex === index ? undefined : index)
								}
							>
								{shouldExpand && (
									<div>
										<FontAwesomeIcon icon={faChevronRight} size="1x" />
									</div>
								)}

								{entity.fields.map((field, index) => {
									return field.type === "text" ? (
										<span
											key={index}
											style={{
												textAlign: field.align ?? "left",
												flex: field.flex ?? "1 0 auto",
												fontWeight: field.fontWeight ?? "normal",
											}}
											className={field.value === "N/A" ? "disabled" : ""}
										>
											{typeof field.value === "string" && field.icon && (
												<FontAwesomeIcon
													icon={field.icon}
													style={{ marginRight: "0.5em" }}
												/>
											)}
											{field.value}
										</span>
									) : (
										<Heading
											className="xsmall"
											style={{
												textAlign: field.align ?? "left",
												flex: field.flex ?? "1 0 auto",
												fontWeight: field.fontWeight ?? "bold",
											}}
											key={index}
										>
											{field.value}
										</Heading>
									);
								})}
							</Styles.EntityDetails>

							{entity.actions && entity.actions.length > 1 && (
								<Dropdown
									key={index}
									title={entity.actions[0]?.value ?? ""}
									action={() => {
										if (
											entity.actions?.length &&
											entity.actions[0].type === "button"
										) {
											entity.actions[0].onClick(entity.id);
										} else if (
											entity.actions?.length &&
											entity.actions[0].type === "link"
										) {
											router.push(entity.actions[0].href);
										}
									}}
									style={{ flex: "0 0 auto" }}
								>
									{entity.actions.slice(1).map((action, index) => {
										return action.type === "button" ? (
											<a onClick={() => action.onClick(entity.id)} key={index}>
												{action.icon && <FontAwesomeIcon icon={action.icon} />}
												{action.value}
											</a>
										) : (
											<Link key={index} href={`${action.href}`}>
												<a>
													{action.icon && (
														<FontAwesomeIcon icon={action.icon} />
													)}
													{action.value}
												</a>
											</Link>
										);
									})}
								</Dropdown>
							)}

							{entity.actions && entity.actions.length === 1 && (
								<Button
									onClick={() => {
										if (
											entity.actions?.length &&
											entity.actions[0].type === "button"
										) {
											entity.actions[0].onClick(entity.id);
										} else if (
											entity.actions?.length &&
											entity.actions[0].type === "link"
										) {
											router.push(entity.actions[0].href);
										}
									}}
								>
									{entity.actions[0].value}
								</Button>
							)}
						</Styles.EntityContent>

						{shouldExpand && entity.actions && (
							<Styles.ExpandedComponent
								className={expandedIndex === index ? "expanded" : ""}
							>
								{expandedIndex !== undefined &&
									entity.ExpandedComponent &&
									entity.ExpandedComponent(index)}
							</Styles.ExpandedComponent>
						)}
					</Styles.Entity>
				))}
			</Styles.Content>
		</Styles.Container>
	);
};

export default EntityList;

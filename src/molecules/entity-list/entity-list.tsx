import Button from "@atoms/button";
import Display from "@atoms/display";
import Heading from "@atoms/heading";
import { IconName } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import React, { FC, useState } from "react";
import * as Styles from "./styles";

export interface EntityListItem {
	id: string;
	fields: {
		value: string;
		type: "label" | "text";
		icon?: IconName;
		align?: "left" | "center" | "right";
		fontWeight?: "bold" | "normal";
		flex?: string;
	}[];
	ExpandedComponent?: ({ index }: { index: number }) => JSX.Element;
}

interface EntityListProps {
	title: string;
	route: string;
	entities: EntityListItem[];
	maxWidth?: string;
	actions?:
		| {
				value: string;
				type: "link";
				href: string;
		  }[]
		| {
				value: string;
				type: "button";
				onClick: (id: string) => void;
		  }[];
	shouldExpand?: boolean;
}

const EntityList: FC<EntityListProps> = ({
	title,
	route,
	maxWidth,
	entities,
	actions,
	shouldExpand,
}) => {
	const [expandedIndex, setExpandedIndex] = useState<number | undefined>();

	const LinkWrapper: FC<{ href?: string }> = ({ children, href }) => {
		if (href) {
			return (
				<Link href={href} passHref>
					{children}
				</Link>
			);
		}

		return <>{children}</>;
	};

	return (
		<Styles.Container>
			<Styles.Header>
				<Display className="small">{title}</Display>
				<Link href={`${route}/create`} passHref>
					<Button primary>+ Add New</Button>
				</Link>
			</Styles.Header>
			<Styles.Content>
				{entities.map((entity, index) => (
					<LinkWrapper href={`${route}/${entity.id}`} key={index}>
						<Styles.Entity
							key={index}
							className={expandedIndex === index ? "expanded" : ""}
							style={{ maxWidth: maxWidth ?? "60em" }}
						>
							<Styles.EntityDetails
								onClick={() =>
									shouldExpand &&
									setExpandedIndex(expandedIndex === index ? undefined : index)
								}
							>
								{shouldExpand && (
									<div>
										<FontAwesomeIcon
											icon={["fas", "chevron-right"]}
											size="1x"
										/>
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
											{field.icon && (
												<FontAwesomeIcon
													icon={["fas", field.icon]}
													style={{ marginRight: "0.5em" }}
												/>
											)}
											{field.value}
										</span>
									) : (
										<Heading
											className="small"
											style={{
												textAlign: field.align ?? "left",
												flex: field.flex ?? "1 0 auto",
												fontWeight: field.fontWeight ?? "bold",
											}}
										>
											{field.value}
										</Heading>
									);
								})}
							</Styles.EntityDetails>

							{shouldExpand && actions && (
								<>
									<Styles.Actions
										className={expandedIndex === index ? "expanded" : ""}
									>
										{actions.map((action) => (
											<>
												{action.type === "button" ? (
													<a onClick={() => action.onClick(entity.id)}>
														{action.value}
													</a>
												) : (
													<Link href={`${action.href}/${entity.id}`}>
														<a>{action.value}</a>
													</Link>
												)}
											</>
										))}
									</Styles.Actions>
									<Styles.ExpandedComponent
										className={expandedIndex === index ? "expanded" : ""}
									>
										{expandedIndex !== undefined &&
											entity.ExpandedComponent &&
											entity.ExpandedComponent({ index: index })}
									</Styles.ExpandedComponent>
								</>
							)}
						</Styles.Entity>
					</LinkWrapper>
				))}
			</Styles.Content>
		</Styles.Container>
	);
};

export default EntityList;

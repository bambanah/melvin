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
		value: string | React.ReactNode;
		type: "label" | "text";
		icon?: IconName;
		align?: "left" | "center" | "right";
		fontWeight?: "bold" | "normal";
		flex?: string;
	}[];
	actions?: (
		| {
				value: string;
				type: "link";
				icon?: IconName;
				href: string;
		  }
		| {
				value: string;
				type: "button";
				icon?: IconName;
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
					<LinkWrapper
						href={shouldExpand ? undefined : `${route}/${entity.id}`}
						key={index}
					>
						<Styles.Entity
							key={index}
							className={expandedIndex === index ? "expanded" : ""}
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
											{typeof field.value === "string" && field.icon && (
												<FontAwesomeIcon
													icon={["fas", field.icon]}
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
										>
											{field.value}
										</Heading>
									);
								})}
							</Styles.EntityDetails>

							{shouldExpand && entity.actions && (
								<>
									<Styles.Actions
										className={expandedIndex === index ? "expanded" : ""}
									>
										{entity.actions.map((action) => (
											<>
												{action.type === "button" ? (
													<a onClick={() => action.onClick(entity.id)}>
														{action.icon && (
															<FontAwesomeIcon icon={["fas", action.icon]} />
														)}
														{action.value}
													</a>
												) : (
													<Link href={`${action.href}`}>
														<a>
															{action.icon && (
																<FontAwesomeIcon icon={["fas", action.icon]} />
															)}
															{action.value}
														</a>
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
											entity.ExpandedComponent(index)}
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

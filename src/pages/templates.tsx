import { Template } from "@prisma/client";
import { useSession } from "next-auth/react";
import Head from "next/head";
import React from "react";
import useSWR from "swr";
import Layout from "@layouts/common/Layout";
import Title from "@atoms/Title";

const fetchTemplates = async () => {
	const response = await fetch("/api/templates");

	return (await response.json()) as Template[];
};

const Templates = () => {
	const { status } = useSession({
		required: true,
	});

	const { data: templates, error } = useSWR("/api/templates", fetchTemplates);

	if (error) {
		console.error(error);
		return <div>Error</div>;
	}
	if (status === "loading" || !templates) {
		return <div>Loading...</div>;
	}

	return (
		<Layout>
			<Head>
				<title>Templates</title>
			</Head>
			<Title>Templates</Title>
			{templates.length === 0 ? (
				<div>No templates to load</div>
			) : (
				<ul>
					{templates.map((template) => (
						<li>{template.templateName}</li>
					))}
				</ul>
			)}
		</Layout>
	);
};

export default Templates;

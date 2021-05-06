import React, { useEffect, useState } from 'react';
import { TemplateObject } from '../shared/types';
import { getTemplates } from '../shared/utils/firebase';

export default function TemplateList() {
	const [templates, setTemplates] = useState({} as TemplateObject);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		getTemplates().then((templateObject: TemplateObject) => {
			setTemplates(templateObject);

			setLoaded(true);
		});
	}, []);

	if (!loaded) {
		return <div>Loading...</div>;
	}

	return (
		<ul>
			{Object.entries(templates).map(([templateId, template]) => (
				<li key={templateId}>
					Template ({templateId}): {template.template_name}
				</li>
			))}
		</ul>
	);
}

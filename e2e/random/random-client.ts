import { faker } from "@faker-js/faker";

export const randomClient = ({
	name,
	number,
	billTo,
}: {
	name?: string;
	number?: number;
	billTo?: string;
} = {}) => {
	const clientName = name ?? faker.person.fullName();

	return {
		name: clientName,
		number:
			number?.toString() ??
			Math.floor(Math.random() * 999_999_999 + 1).toString(),
		invoiceNumberPrefix: `${clientName.split(" ").slice(-1)}-`,
		billTo: billTo ?? faker.company.name(),
	};
};

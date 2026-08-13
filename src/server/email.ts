import { createTransport } from "nodemailer";

/**
 * Transactional mail for the auth flows better-auth drives (verification and
 * password reset). Reuses the SMTP config next-auth's EmailProvider read.
 */
export const sendMail = async ({
	to,
	subject,
	text
}: {
	to: string;
	subject: string;
	text: string;
}) => {
	const transport = createTransport(process.env.EMAIL_SERVER);

	await transport.sendMail({
		to,
		from: process.env.EMAIL_FROM,
		subject,
		text
	});
};

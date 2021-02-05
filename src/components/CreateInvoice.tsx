import React, { useEffect, useState } from "react";
import { Formik, Form, getIn } from "formik";
import { createInvoice, getLastInvoiceDetails } from "../services/firebase";

import { Invoice } from "../types";
import FieldInput from "./forms/FieldInput";
import firebase from "firebase/app";
import ActivityList from "./forms/ActivityList";

export default function CreateInvoice() {
	const [lastInvoice, setLastInvoice] = useState({} as Invoice);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		getLastInvoiceDetails().then((invoice: Invoice) => {
			let formInvoice: Invoice = {} as Invoice;

			if (invoice.invoice_no) {
				invoice.invoice_no = incrementInvoiceId(invoice.invoice_no);
			} else {
				invoice = {
					client_name: "",
					client_no: "",
					bill_to: "",
					date: firebase.firestore.Timestamp.fromDate(new Date()),
					activities: [],
					invoice_no: "",
				};
			}

			console.log(invoice);

			setLastInvoice(invoice);
			setLoaded(true);
		});
	}, []);

	const incrementInvoiceId = (invoiceId: string) => {
		let newNumber: number = parseInt(invoiceId.replace(/([A-Za-z])+/g, "")) + 1;

		return invoiceId.replace(/([0-9])+/, newNumber.toString());
	};

	const validate = (values: Invoice) => {
		const errors: {
			client_no?: string;
			client_name?: string;
			bill_to?: string;
			date?: string;
			activity_ref?: string[];
			activity_duration?: string[];
			invoice_no?: string;
		} = {};

		if (!values.client_no) {
			errors.client_no = "Required";
		}

		if (!values.client_name) {
			errors.client_name = "Required";
		}

		if (!values.bill_to) {
			errors.bill_to = "Required";
		}

		if (!values.invoice_no) {
			errors.invoice_no = "Required";
		}

		// if (values.activity_ref) {
		// 	errors.activity_ref = [];

		// 	values.activity_ref.forEach((activity) => {
		// 		if (activity === "") {
		// 			errors.activity_ref?.push("Required");
		// 		} else {
		// 			errors.activity_ref?.push("");
		// 		}
		// 	});
		// }

		// if (values.activity_duration) {
		// 	errors.activity_duration = [];

		// 	values.activity_duration.forEach((duration) => {
		// 		if (!duration) {
		// 			errors.activity_duration?.push("Required");
		// 		} else {
		// 			errors.activity_duration?.push("");
		// 		}
		// 	});

		// 	if (errors.activity_duration.length === 0)
		// 		delete errors.activity_duration;
		// }

		// Delete activity errors if they only contain empty strings ie. no errors
		// if (
		// 	errors.activity_duration &&
		// 	errors.activity_duration?.filter((e) => e !== "").length === 0
		// )
		// 	delete errors.activity_duration;
		if (
			errors.activity_ref &&
			errors.activity_ref?.filter((e) => e !== "").length === 0
		)
			delete errors.activity_ref;

		return errors;
	};

	if (loaded) {
		return (
			<Formik
				initialValues={lastInvoice}
				onSubmit={(values, actions) => {
					createInvoice(values);

					actions.setSubmitting(false);

					actions.setFieldValue(
						"invoice_no",
						incrementInvoiceId(values.invoice_no)
					);
				}}
				validate={validate}
			>
				{({ values, errors, touched, setFieldValue }) => (
					<Form className="form">
						<FieldInput
							value="client_no"
							labelText="Client Number"
							error={errors.client_no}
							touched={touched.client_no}
						/>
						<FieldInput
							value="client_name"
							labelText="Client Name"
							error={errors.client_name}
							touched={touched.client_name}
						/>
						<FieldInput
							value="bill_to"
							labelText="Bill To"
							error={errors.bill_to}
							touched={touched.bill_to}
						/>
						<FieldInput
							value="invoice_no"
							labelText="Invoice Number"
							error={errors.invoice_no}
							touched={touched.invoice_no}
						/>

						<ActivityList
							values={values}
							errors={errors}
							touched={touched}
							getIn={getIn}
							setFieldValue={setFieldValue}
						/>

						<button className="button" type="submit">
							Submit
						</button>
					</Form>
				)}
			</Formik>
		);
	} else {
		return <div>Loading...</div>;
	}
}

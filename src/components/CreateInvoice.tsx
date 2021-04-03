import React, { useEffect, useState } from "react";
import { Formik, Form, getIn } from "formik";
import { createInvoice, getLastInvoiceDetails } from "../services/firebase";

import { Errors, Invoice } from "../types";
import FieldInput from "./forms/FieldInput";
import firebase from "firebase/app";
import ActivityList from "./forms/ActivityList";
import { getDuration } from "../services/helpers";

export default function CreateInvoice({
	setCreating,
}: {
	setCreating: (creating: boolean) => void;
}) {
	const [lastInvoice, setLastInvoice] = useState({} as Invoice);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		getLastInvoiceDetails().then((invoice: Invoice) => {
			if (invoice.invoice_no) {
				invoice.invoice_no = incrementInvoiceId(invoice.invoice_no);
			} else {
				invoice = {
					client_no: "",
					client_name: "",
					bill_to: "",
					invoice_no: "",
					activities: [],
					date: firebase.firestore.Timestamp.fromDate(new Date()),
				};
			}

			setLastInvoice(invoice);
			setLoaded(true);
		});
	}, []);

	const incrementInvoiceId = (invoiceId: string) => {
		let newNumber: number = parseInt(invoiceId.replace(/([A-Za-z])+/g, "")) + 1;

		return invoiceId.replace(/([0-9])+/, newNumber.toString());
	};

	const validate = (values: Invoice) => {
		const errors: Errors = {};

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

		// if (values.activities) {
		// 	errors.activities = [];

		// 	values.activities.forEach((activity, index) => {
		// 		let activityError = {
		// 			date: "",
		// 			start_time: "",
		// 			end_time: "",
		// 			duration: "",
		// 			distance: "",
		// 		};

		// 		if (!activity.activity_ref) {
		// 			Object.assign(activityError, { activity_ref: "Required" });
		// 		}
		// 		if (!activity.date) {
		// 			Object.assign(activityError, { date: "Required." });
		// 		}

		// 		errors.activities?.push(activityError);
		// 	});
		// }

		console.log(values);
		return errors;
	};

	if (loaded) {
		return (
			<Formik
				initialValues={lastInvoice}
				onSubmit={(values, actions) => {
					console.log("document creating");
					values.activities.forEach((activity, index) => {
						if (activity.start_time && activity.end_time) {
							values.activities[index].duration = getDuration(
								activity.start_time,
								activity.end_time
							);
						}
					});
					createInvoice(values);

					actions.setSubmitting(false);

					actions.setFieldValue(
						"invoice_no",
						incrementInvoiceId(values.invoice_no)
					);
				}}
				validate={validate}
			>
				{({ values, errors, touched, setFieldValue, handleChange }) => (
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
							handleChange={handleChange}
						/>

						<div className="field is-grouped">
							<p className="control">
								<button className="button is-primary" type="submit">
									Submit
								</button>
							</p>

							<p className="control">
								<button className="button" onClick={() => setCreating(false)}>
									Cancel
								</button>
							</p>
						</div>
					</Form>
				)}
			</Formik>
		);
	} else {
		return <div>Loading Previous Invoice...</div>;
	}
}

import React, { useEffect, useState } from "react";
import { Formik, Form, getIn } from "formik";
import firebase from "firebase/app";
import {
	auth,
	createInvoice,
	getLastInvoiceDetails,
} from "../shared/utils/firebase";

import { Invoice } from "../types";
import FieldInput from "./forms/FieldInput";
import ActivityList from "./forms/ActivityList";
import { getDuration } from "../shared/utils/helpers";
import InvoiceValidationSchema from "../shared/utils/InvoiceValidationSchema";

export default function CreateInvoice({
	setCreating,
}: {
	setCreating: (creating: boolean) => void;
}) {
	const [lastInvoice, setLastInvoice] = useState({} as Invoice);
	const [loaded, setLoaded] = useState(false);

	const incrementInvoiceId = (invoiceId: string) => {
		const newNumber: number =
			parseInt(invoiceId.replace(/([A-Za-z])+/g, ""), 10) + 1;

		return invoiceId.replace(/([0-9])+/, newNumber.toString());
	};

	useEffect(() => {
		getLastInvoiceDetails().then((lastInvoiceDetails: Invoice) => {
			let invoice = lastInvoiceDetails;
			if (auth.currentUser && invoice) {
				if (invoice.invoice_no) {
					invoice.invoice_no = incrementInvoiceId(invoice.invoice_no);
					invoice.owner = auth.currentUser.uid;
				} else {
					invoice = {
						owner: auth.currentUser?.uid,
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
			} else {
				console.warn("Not logged in.");
			}
		});
	}, []);

	if (loaded) {
		return (
			<Formik
				initialValues={lastInvoice}
				onSubmit={(values, actions) => {
					values.activities.forEach((activity, index) => {
						if (activity.activity_ref === "") {
							values.activities.splice(index, 1);
						}

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
				validationSchema={InvoiceValidationSchema}
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
								<button
									className="button"
									onClick={() => setCreating(false)}
									type="button"
								>
									Cancel
								</button>
							</p>
						</div>
					</Form>
				)}
			</Formik>
		);
	}
	return <div>Loading Previous Invoice...</div>;
}

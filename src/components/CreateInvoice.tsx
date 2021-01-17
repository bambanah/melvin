import React, { useEffect, useState } from "react";
import { Formik, Form, FieldArray, getIn } from "formik";
import {
	createInvoice,
	getActivities,
	getLastInvoiceDetails,
} from "../services/firebase";
import { ActivityObject, Invoice } from "../types";
import ActivityInput from "./forms/ActivityInput";
import FieldInput from "./forms/FieldInput";

export default function CreateInvoice() {
	const [activities, setActivities] = useState({} as ActivityObject);
	const [lastInvoice, setLastInvoice] = useState({} as Invoice);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		getActivities().then((activityObject: ActivityObject) => {
			setActivities(activityObject);
		});

		getLastInvoiceDetails().then((invoice) => {
			invoice.invoice_no = incrementInvoiceId(invoice.invoice_no);

			setLastInvoice(invoice);
			setLoaded(true);
		});

		console.log("Effect used");
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

		if (values.activity_ref) {
			errors.activity_ref = [];

			values.activity_ref.forEach((activity) => {
				if (activity === "") {
					errors.activity_ref?.push("Required");
				} else {
					errors.activity_ref?.push("");
				}
			});
		}

		if (values.activity_duration) {
			errors.activity_duration = [];

			values.activity_duration.forEach((duration) => {
				if (!duration) {
					errors.activity_duration?.push("Required");
				} else {
					errors.activity_duration?.push("");
				}
			});

			if (errors.activity_duration.length === 0)
				delete errors.activity_duration;
		}

		// Delete activity errors if they only contain empty strings ie. no errors
		if (
			errors.activity_duration &&
			errors.activity_duration?.filter((e) => e !== "").length === 0
		)
			delete errors.activity_duration;
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
					console.log("Creating invoice.");
					createInvoice(values);

					actions.setSubmitting(false);

					actions.setFieldValue(
						"invoice_no",
						incrementInvoiceId(values.invoice_no)
					);
				}}
				validate={validate}
			>
				{({ values, errors, touched }) => (
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

						<FieldArray
							name="activity_ref"
							render={(arrayHelpers) => (
								<>
									{values.activity_ref && (
										<>
											<label className="label">Activities</label>
											{values.activity_ref.map((activity_ref, index) => (
												<React.Fragment key={index}>
													<ActivityInput
														ref_value={`activity_ref.${index}`}
														ref_text="Select Activity"
														ref_error={getIn(errors, `activity_ref.${index}`)}
														ref_touched={getIn(
															touched,
															`activity_ref.${index}`
														)}
														duration_value={`activity_duration.${index}`}
														duration_text="Activity Duration"
														duration_error={getIn(
															errors,
															`activity_duration.${index}`
														)}
														duration_touched={getIn(
															touched,
															`activity_duration.${index}`
														)}
														activities={activities}
													/>
												</React.Fragment>
											))}

											<button
												className="button"
												type="button"
												onClick={() => {
													arrayHelpers.insert(values.activity_ref.length, "");
													values.activity_duration.push("");
												}}
											>
												+
											</button>
										</>
									)}
								</>
							)}
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

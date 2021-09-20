import { Invoice } from "@prisma/client";
import { FormikProps, getIn, withFormik } from "formik";
import React from "react";
import InvoiceValidationSchema from "../../schema/InvoiceValidationSchema";
import Button from "../../shared/components/Button";
import Title from "../../shared/components/text/Title";
import SaveAsTemplateButton from "../templates/SaveAsTemplateButton";
import FieldInput from "./FieldInput";
import ActivityList from "./InvoiceActivityList";

interface Props {
	// invoiceToLoad: Invoice | null;
	setCreating: (creating: boolean) => void;
	editPrevious?: boolean;
	// invoiceId?: string;
}

export default function CreateInvoice({
	// invoiceToLoad,
	setCreating,
	editPrevious,
}: // invoiceId,
Props) {
	// const [lastInvoice, setLastInvoice] = useState({} as Invoice);
	// const [loaded, setLoaded] = useState(false);

	// const incrementInvoiceNo = (invoiceNo: string) => {
	// 	const newNumber: number =
	// 		parseInt(invoiceNo.replace(/([A-Za-z])+/g, ""), 10) + 1;

	// 	return invoiceNo.replace(/([0-9])+/, newNumber.toString());
	// };

	// async function loadInvoiceDetails() {
	// 	if (invoiceToLoad) {
	// 		if (!editPrevious) {
	// 			// Copy invoice details to new invoice
	// 			const invoice = { ...invoiceToLoad };

	// 			const highestInvoiceNo = (
	// 				await prisma.invoice.findFirst({
	// 					orderBy: {
	// 						invoiceNo: "desc",
	// 					},
	// 				})
	// 			)?.invoiceNo;

	// 			if (highestInvoiceNo !== undefined)
	// 				invoice.invoiceNo = incrementInvoiceNo(highestInvoiceNo);

	// 			setLastInvoice(invoice);
	// 		} else {
	// 			// Modify existing invoice

	// 			setLastInvoice(invoiceToLoad);
	// 		}

	// 		setLoaded(true);
	// 	} else {
	// 		await getLastInvoiceDetails()
	// 			.then((invoice) => {
	// 				if (!invoice) return;

	// 				if (auth.currentUser && invoice) {
	// 					if (invoice.invoice_no) {
	// 						invoice.invoice_no = incrementInvoiceNo(invoice.invoice_no);
	// 						invoice.owner = auth.currentUser.uid;
	// 					} else {
	// 						invoice = {
	// 							owner: auth.currentUser?.uid,
	// 							client_no: "",
	// 							client_name: "",
	// 							bill_to: "",
	// 							invoice_no: "",
	// 							activities: [],
	// 							date: firebase.firestore.Timestamp.fromDate(new Date()),
	// 						};
	// 					}

	// 					setLastInvoice(invoice);
	// 					setLoaded(true);
	// 				} else {
	// 					console.warn("Not logged in.");
	// 				}
	// 			});
	// 	}
	// }

	// useEffect(() => {
	// 	loadInvoiceDetails();
	// }, []);

	const Form = (props: FormikProps<Invoice>) => {
		const {
			values,
			touched,
			errors,
			handleChange,
			handleSubmit,
			setFieldValue,
		} = props;

		return (
			<form className="form" onSubmit={handleSubmit}>
				<Title>{editPrevious ? "Update" : "Create"} Invoice</Title>
				{/* <FieldInput
					value="client_no"
					labelText="Participant Number"
					error={errors.clientId}
					touched={touched.client_no}
				/>

				<FieldInput
					value="client_name"
					labelText="Participant Name"
					error={errors.client_name}
					touched={touched.client_name}
				/> */}

				<FieldInput
					value="bill_to"
					labelText="Bill To"
					error={errors.billTo}
					touched={touched.billTo}
				/>

				<FieldInput
					value="invoice_no"
					labelText="Invoice Number"
					error={errors.invoiceNo}
					touched={touched.invoiceNo}
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
						<Button primary type="submit">
							{editPrevious ? "Update" : "Create"}
						</Button>
					</p>
					<SaveAsTemplateButton values={values} />
					<p className="control">
						<Button type="button" onClick={() => setCreating(false)}>
							Cancel
						</Button>
					</p>
				</div>
			</form>
		);
	};

	const EnhancedForm = withFormik({
		mapPropsToValues: () => ({} as Invoice),
		handleSubmit: async (values, actions) => {
			// const activityDetails = await getActivities();

			// values.activities.forEach((activity, index) => {
			// 	if (activity.activity_ref === "") {
			// 		values.activities.splice(index, 1);
			// 	}

			// 	const rateType =
			// 		activityDetails[activity.activity_ref.split("/")[1]].rate_type;

			// 	if (rateType !== "hr") {
			// 		activity.start_time = "";
			// 		activity.end_time = "";
			// 	}
			// 	if (activity.start_time && activity.end_time) {
			// 		values.activities[index].duration = getDuration(
			// 			activity.start_time,
			// 			activity.end_time
			// 		);
			// 	}
			// });

			// if (editPrevious && invoiceId) {
			// 	updateInvoice(invoiceId, values);
			// } else {
			// 	createInvoice(values);
			// }

			console.log(values);
			console.log("Submitting");
			actions.setSubmitting(false);
			setCreating(false);
		},

		validationSchema: InvoiceValidationSchema,

		displayName: "BasicForm",
	})(Form);

	return <EnhancedForm />;
}

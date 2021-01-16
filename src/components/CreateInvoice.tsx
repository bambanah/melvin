import { useFormik } from "formik";
import React, { useState } from "react";
import { createInvoice } from "../services/firebase";
import { Invoice } from "../types";

export default function CreateInvoice() {
  // const [clientNo, setClientNo] = useState("");
  // const [clientName, setClientName] = useState("");
  // const [billTo, setBillTo] = useState("");
  // const [invoiceNumber, setInvoiceNumber] = useState("");
  // const [activityCodes, setActivityCodes] = useState([]);
  // const [activityDurations, setActivityDurations] = useState([]);

  // const [numActivities, setNumActivities] = useState(1);

  // const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();

  //   const newInvoice: Invoice = {
  //     client_no: clientNo,
  //     client_name: clientName,
  //     bill_to: billTo,
  //     date: new Date(),
  //     invoice_no: invoiceNumber,
  //     activity_ref: [],
  //     activity_duration: [],
  //   };

  //   createInvoice(newInvoice);
  // };

  const initialInvoice: Invoice = {
    client_no: "",
    client_name: "",
    bill_to: "",
    invoice_no: "",
    date: new Date(),
    activity_ref: [],
    activity_duration: [],
  };

  const formik = useFormik({
    initialValues: {
      client_no: "",
      client_name: "",
      bill_to: "",
      invoice_no: "",
    },

    onSubmit: (values) => {
      alert(JSON.stringify(values, null, 2));
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <div className="field">
        <label className="label" htmlFor="clientNo">
          Client Number
        </label>
        <input
          className="input"
          type="string"
          id="client_no"
          name="client_no"
          value={formik.values.client_no}
          onChange={formik.handleChange}
          required={true}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="clientName">
          Client Name
        </label>
        <input
          className="input"
          type="text"
          id="client_name"
          value={formik.values.client_name}
          onChange={formik.handleChange}
          required={true}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="billTo">
          Bill To
        </label>
        <input
          className="input"
          type="text"
          id="bill_to"
          value={formik.values.bill_to}
          onChange={formik.handleChange}
          required={true}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="billTo">
          Invoice Number
        </label>
        <input
          className="input"
          type="string"
          id="invoice_no"
          value={formik.values.invoice_no}
          onChange={formik.handleChange}
          required={true}
        />
      </div>

      <input type="submit" value="Submit" className="button" />
    </form>
  );
}

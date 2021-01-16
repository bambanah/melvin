import React, { useState } from "react";
import {
  Formik,
  FormikHelpers,
  FormikProps,
  Form,
  Field,
  FieldProps,
  FieldArray,
} from "formik";
import { createInvoice } from "../services/firebase";
import { Invoice } from "../types";

export default function CreateInvoice() {
  const Input = ({
    value,
    labelText,
  }: {
    value: string;
    labelText?: string;
  }) => {
    return (
      <div className="field">
        <label className="label" htmlFor={value}>
          {labelText || value}
        </label>
        <Field
          className="input"
          id={value}
          name={value}
          placeholder={labelText || value}
        />
      </div>
    );
  };

  const initialValues: Invoice = {
    client_no: "",
    client_name: "",
    bill_to: "",
    invoice_no: "",
    date: new Date(),
    activity_ref: [""],
    activity_duration: [""],
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={(values, actions) => {
        console.log({ values, actions });

        createInvoice(values);

        actions.setSubmitting(false);
      }}
    >
      {({ values }) => (
        <Form className="form">
          <Input value="client_no" labelText="Client Number" />
          <Input value="client_name" labelText="Client Name" />
          <Input value="bill_to" labelText="Bill To" />
          <Input value="invoice_no" labelText="Invoice Number" />

          <FieldArray
            name="activity_ref"
            render={(arrayHelpers) => (
              <>
                {values.activity_ref && values.activity_ref.length > 0 ? (
                  <>
                    {values.activity_ref.map((activity_ref, index) => (
                      <React.Fragment key={index}>
                        <Input value={`activity_ref.${index}`} />
                      </React.Fragment>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        arrayHelpers.insert(values.activity_ref.length, "")
                      } // insert an empty string at a position
                    >
                      +
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => arrayHelpers.insert(0, "")} // insert an empty string at a position
                  >
                    +
                  </button>
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
}

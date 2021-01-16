export interface Invoice {
  [index: string]: any;
  client_name: string;
  client_no: string;
  bill_to: string;
  date: Date;
  // TODO: Update type
  activity_ref: any[];
  activity_duration: any[];
  invoice_no: string;
}

export interface Activity {
  description: string;
  rate: number;
}

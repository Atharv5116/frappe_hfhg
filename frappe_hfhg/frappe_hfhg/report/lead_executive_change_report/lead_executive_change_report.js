// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Lead Executive Change Report"] = {
  filters: [
    {
      fieldname: "from_date",
      label: __("From Date"),
      fieldtype: "Date",
      reqd: 1,
      default: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    },
    {
      fieldname: "to_date",
      label: __("To Date"),
      fieldtype: "Date",
      reqd: 1,
      default: new Date(),
    },
    {
      fieldname: "executive_from",
      label: __("From Executive"),
      fieldtype: "Link",
      options: "Executive",
      reqd: 0,
    },
    {
      fieldname: "executive_to",
      label: __("To Executive"),
      fieldtype: "Link",
      options: "Executive",
      reqd: 0,
    },
  ],
};

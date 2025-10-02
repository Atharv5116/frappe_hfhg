// Copyright (c) 2025, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Lead Search Report"] = {
  filters: [
    {
      fieldname: "contact_number",
      label: __("Contact Number"),
      fieldtype: "Data",
    },
    {
      fieldname: "name",
      label: __("Name"),
      fieldtype: "Data",
    },
  ],
};

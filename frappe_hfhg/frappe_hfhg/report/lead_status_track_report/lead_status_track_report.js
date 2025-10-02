// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Lead Status Track Report"] = {
    "filters": [
        {
            fieldname: "from_date",
            label: __("From Date"),
            fieldtype: "Date",
            reqd: 1,
            default: new Date(new Date().setMonth(new Date().getMonth() - 1)), // Default to one month ago
        },
        {
            fieldname: "to_date",
            label: __("To Date"),
            fieldtype: "Date",
            reqd: 1,
            default: new Date(), // Default to current date
        },
        {
            fieldname: "lead",
            label: __("Lead"),
            fieldtype: "Link",
            options: "Lead", // Link field to the Lead doctype
            reqd: 0, // Optional field
        }
    ]
};

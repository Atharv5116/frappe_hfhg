// Copyright (c) 2025, Frappe Hfhg and contributors
// For license information, please see license.txt

frappe.ui.form.on("Webform Campaign Team Assignment", {
	refresh(frm) {
		// Filter assignee_doctype to User and Campaign Team
		frm.set_query("assignee_doctype", function () {
			return {
				filters: { name: ["in", ["User", "Campaign Team"]] },
			};
		});
	},
});

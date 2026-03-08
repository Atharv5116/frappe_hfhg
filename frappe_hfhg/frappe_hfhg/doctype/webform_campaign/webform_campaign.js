// Copyright (c) 2025, Frappe Hfhg and contributors
// For license information, please see license.txt

frappe.ui.form.on("Webform Campaign", {
	refresh(frm) {
		// Optional: add link to Webform Campaign Team Assignment list for this campaign
		if (frm.doc.name && !frm.doc.__islocal) {
			frm.add_custom_button(__("Team Assignment"), function () {
				frappe.set_route("List", "Webform Campaign Team Assignment", { webform_campaign: frm.doc.name });
			});
		}
	},
});

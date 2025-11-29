// Copyright (c) 2025, redsoft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Bulletin", {
	refresh: function(frm) {
		// Add custom button to preview bulletin
		if (!frm.is_new()) {
			frm.add_custom_button(__("Preview Bulletin"), function() {
				frappe.call({
					method: "frappe_hfhg.frappe_hfhg.doctype.bulletin.bulletin.get_active_bulletin",
					callback: function(r) {
						if (r.message) {
							show_bulletin_preview(r.message.message);
						} else {
							frappe.msgprint(__("No active bulletin found."));
						}
					}
				});
			});
		}
	},
	
	validate: function(frm) {
		// Validate date range
		if (frm.doc.start_date && frm.doc.end_date) {
			if (frm.doc.start_date > frm.doc.end_date) {
				frappe.msgprint(__("Start Date cannot be after End Date."));
				frappe.validated = false;
			}
		}
	}
});

function show_bulletin_preview(message) {
	let d = new frappe.ui.Dialog({
		title: __("Bulletin Preview"),
		fields: [
			{
				fieldtype: "HTML",
				options: `<div style="padding: 20px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin: 10px 0;">
					${message}
				</div>`
			}
		],
		primary_action_label: __("Close"),
		primary_action: function() {
			d.hide();
		}
	});
	d.show();
}


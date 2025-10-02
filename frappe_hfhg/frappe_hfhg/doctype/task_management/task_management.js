// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Task Management", {
    onload(frm) {
        if (frm.is_new() && !frm.doc.assigned_by) {
            frm.set_value("assigned_by", frappe.session.user);
        }
    },
	refresh(frm) {

	},
    lead: function (frm) {
        ['surgery_date', 'grafts', 'technique'].forEach(field => frm.set_value(field, ''));

        if (!frm.doc.lead) return;

        frappe.call({
            method: 'frappe_hfhg.frappe_hfhg.doctype.task_management.task_management.get_surgery_details',
            args: { lead_name: frm.doc.lead },
            callback: function (r) {
                if (!r.message) return;

                if (r.message.error) {
                    frappe.msgprint(__(r.message.error));
                    return;
                }

                frm.set_value('surgery_date', r.message.surgery_date || '');
                frm.set_value('grafts', r.message.grafts || 0);
                frm.set_value('technique', r.message.technique || '');
            }
        });
    }
});

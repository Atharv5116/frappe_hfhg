// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Doctor Followup", {
	refresh(frm) {
        if ((!frm.is_new(), frm.doc.title)) {
            frm.add_custom_button("Show Conversations", function () {
              
                frappe.db.get_doc("Surgery", frm.doc.patient_name).then((surgery) => {
                    frappe.db.get_doc("Costing", surgery.patient).then((costing) => {
                        frappe.db.get_doc("Lead", costing.patient).then((lead) => {
                          if (lead.status !== "Duplicate Lead") {
                            MyUtils.showConversations(lead);
                          } else {
                            frappe.msgprint({
                              title: "Error",
                              message: "Patient is a duplicate lead",
                              indicator: "orange",
                            });
                          }
                        });
                      });

                })  
            });
          }

	},
});

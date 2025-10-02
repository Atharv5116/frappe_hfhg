# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe.desk.form import assign_to
from frappe.model.document import Document
from frappe.share import set_permission


class Center(Document):
	def after_insert(self):
		new_payment_in = frappe.get_doc(
			{
				"doctype": "Payment In",
				"title": "Cash in " + self.city,
			}
		)

		new_payment_in.insert(ignore_permissions=True)

	def on_update(self):
		if self.get_doc_before_save():
			if not self.get_doc_before_save().clinic_manager:
				if self.clinic_manager and self.get_doc_before_save().clinic_manager != self.clinic_manager:
					frappe.enqueue(
						"frappe_hfhg.frappe_hfhg.doctype.center.center.bulk_assign_leads",
						center=self.name,
						clinic_manager=self.clinic_manager,
						start=0,  
						batch_size=2000,
						queue="long",
					)

def bulk_assign_leads(center, clinic_manager, start=0, batch_size=2000):
    frappe.logger().info(f"🔄 Job Started: Assigning leads for {center} to {clinic_manager} (Start: {start})")

    doctypes = ["Lead", "Costing", "Surgery", "Consultation"]

    for doctype in doctypes:
        records = frappe.get_all(doctype, filters={"center": center}, pluck="name")
        total_records = len(records)
        
        if total_records == 0:
            frappe.logger().info(f"⚠️ No {doctype}s found for {center}")
            continue
        
        frappe.logger().info(f"📌 Total {doctype}s: {total_records}")

        batch = records[start:start + batch_size]

        for docname in batch:
            assign_to.add({
                "assign_to": [clinic_manager],
                "doctype": doctype,
                "name": docname
            }, ignore_permissions=True)

            set_permission(doctype, docname, clinic_manager, 'write')
            set_permission(doctype, docname, clinic_manager, 'share')

        frappe.db.commit()
        frappe.logger().info(f"✅ Assigned {len(batch)} {doctype}s from {start} to {start + len(batch)}")

        if start + batch_size < total_records:
            frappe.enqueue(
                "frappe_hfhg.frappe_hfhg.doctype.center.center.bulk_assign_leads",
                center=center,
                clinic_manager=clinic_manager,
                start=start + batch_size,
                batch_size=batch_size,
                queue="long",
            )
            frappe.logger().info(f"🚀 Enqueued next batch: {start + batch_size} to {start + 2*batch_size}")

    frappe.logger().info(f"🎉 Job Completed for {center} (Up to {start + batch_size})")

@frappe.whitelist(allow_guest=True)
def get_clinic_managers():
	executive_users = frappe.get_all(
		"Has Role",
		filters={"role": "Executive", "parenttype": "User"},
		fields=["parent"]
	)
	executive_user_ids = {user["parent"] for user in executive_users}

	receptionist_users = frappe.get_all(
		"Has Role",
		filters={"role": "Receptionist", "parenttype": "User"},
		fields=["parent"]
	)
	receptionist_user_ids = {user["parent"] for user in receptionist_users}

	users_with_both_roles = executive_user_ids.intersection(receptionist_user_ids)

	return list(users_with_both_roles)

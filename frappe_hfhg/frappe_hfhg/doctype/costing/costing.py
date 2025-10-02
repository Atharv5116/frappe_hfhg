# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe.desk.form import assign_to
from frappe.model.document import Document
from frappe import _
from frappe.share import set_permission

class Costing(Document):
	def before_insert(self):
		existing_lead = frappe.db.exists("Lead", {"name": self.patient})
		if existing_lead:
			lead = frappe.get_doc("Lead", existing_lead)
			if lead.status == "Duplicate Lead":
				frappe.throw(_("You can not create a costing for a duplicate lead."))

	def autoname(self):
		available = frappe.get_all(
			"Costing",
			filters={"patient": self.patient},
		)
		if len(available) != 0:
			new_name = self.patient + " (Session - " + str(len(available) + 1) + ")"
			self.name = new_name.strip()

	def on_update(self):
		if self.surgery_date and self.status == "Booking" :
			is_exists = frappe.db.exists(
				"Surgery", {"name": self.name}
			)
			if not is_exists:
				frappe.get_doc(
					{
						"doctype": "Surgery",
						"patient": self.patient,
						"city": self.city,
						"contact_number": self.contact_number,
						"booking_date": self.book_date,
						"center": self.center,
						"doctor": self.doctor,
						"technique": self.technique,
						"surgery_date": self.surgery_date,
						"grafts": self.grafts,
						"graft_price": self.graft_price,
						"total_amount": self.total_amount,
						"amount_paid": self.amount_paid,
						"pending_amount": self.pending_amount,
						"prp": self.prp,
						"executive": self.executive,
						"assign_by": self.assign_by,
						"note": self.note
					}
				).insert(ignore_permissions=True)
		is_exists = frappe.db.exists(
			"Surgery", {"name": self.name}
		)
		if is_exists:
			surgeries = frappe.get_all('Surgery', { "patient": self.patient})
			for surgery in surgeries:
				surgery_doc = frappe.get_doc('Surgery', surgery.name)
				if surgery_doc.note != self.note:
					surgery_doc.note = self.note
					surgery_doc.save(ignore_permissions=True)
		if self.executive:
			executive = frappe.get_doc('Executive', self.executive)
			assignes = assign_to.get({
				"doctype": 'Costing',
				"name": self.name
			})

			assignes_list = [x.owner for x in assignes]

			if executive.email not in assignes_list:
				assign_to.clear('Costing',self.name)
				frappe.db.delete("DocShare", {
					"share_doctype": 'Costing',
					"share_name": self.name
				})
				assign_to.add({
					"assign_to": [executive.email],
					"doctype": 'Costing',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Costing', self.name, executive.email, 'write')
				set_permission('Costing', self.name, executive.email, 'share')

				frappe.db.commit()
			assignes = assign_to.get({
					"doctype": 'Costing',
					"name": self.name
				})
			assignes_list = [x.owner for x in assignes]
			# if self.previous_executive:
			# 	previous_executive = frappe.get_doc('Executive', self.previous_executive)
			# 	if previous_executive.email not in assignes_list:
			# 		assign_to.add({
			# 			"assign_to": [previous_executive.email],
			# 			"doctype": 'Costing',
			# 			"name": self.name
			# 		}, ignore_permissions=True)

		if self.center:
			assignes = assign_to.get({
				"doctype": 'Costing',
				"name": self.name
			})
			assignes_list = [x.owner for x in assignes]

			center = frappe.get_doc('Center', self.center)
			receptionist = frappe.get_doc('Receptionist', center.receptionist)
			if receptionist.email not in assignes_list:
				assign_to.add({
					"assign_to": [receptionist.email],
					"doctype": 'Costing',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Costing', self.name, receptionist.email, 'write')
				set_permission('Costing', self.name, receptionist.email, 'share')
			if center.clinic_manager and center.clinic_manager not in assignes_list:
				assign_to.add({
					"assign_to": [center.clinic_manager],
					"doctype": 'Costing',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Costing', self.name, center.clinic_manager, 'write')
				set_permission('Costing', self.name, center.clinic_manager, 'share')

			frappe.db.commit()

		if self.doctor:
			assignes = assign_to.get({
				"doctype": 'Costing',
				"name": self.name
			})
			assignes_list = [x.owner for x in assignes]

			doctor = frappe.get_doc('Doctor', self.doctor)
			if doctor.email not in assignes_list:
				assign_to.add({
					"assign_to": [doctor.email],
					"doctype": 'Costing',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Costing', self.name, doctor.email, 'write')
				set_permission('Costing', self.name, doctor.email, 'share')

			frappe.db.commit()

		if frappe.db.exists("Lead", self.patient):
			lead = frappe.get_doc("Lead", self.patient)
			if self.status == "Prospect" and lead.status != "HT Prospect":
				lead.status = "HT Prospect"	
			elif self.status == "Booking":
				if self.surgery_date and lead.status != "Date Given":
					lead.status = "Date Given"		
				elif not self.surgery_date and lead.status != "Booked FUP":
					lead.status = "Booked FUP"		
			lead.save(ignore_permissions=True)			
					

@frappe.whitelist()
def get_dashboard_stats(patient):
	payments = frappe.get_all("Payment", filters={"type": "Payment", "payment_type": "Costing", "patient": patient})
	if len(payments) > 0:
		refunds = frappe.get_all("Payment", filters={"type": "Refund", "refund_payment_id": payments[0].name})

	return [
		{"label": _("Payment"), "value": len(payments), "id": payments[0].name if len(payments) > 0  else ""},
		{"label": _("Refund"), "value": 0 if len(payments) == 0 else len(refunds)},
	]

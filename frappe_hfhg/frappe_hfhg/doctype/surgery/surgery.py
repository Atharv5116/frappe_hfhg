# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe.desk.form import assign_to
from frappe.model.document import Document
from frappe import _
from datetime import datetime, timedelta
from frappe.utils import getdate, today

from frappe.share import set_permission

def add_days_to_date(given_date_str, n):
	if type(given_date_str) == str:
		given_date = datetime.strptime(given_date_str, "%Y-%m-%d")
	else:
		given_date = given_date_str
	new_date = given_date + timedelta(days=n)
	return new_date.strftime("%Y-%m-%d")
class Surgery(Document):
	def autoname(self):
		available = frappe.get_all(
			"Surgery",
			filters={"patient": self.patient},
		)
		if len(available) != 0:
			new_name = self.patient + " (Session - " + str(len(available) + 1) + ")"
			self.name = new_name.strip()
	
	def before_save(self):
		if self.get_doc_before_save() and self.get_doc_before_save().surgery_date and str(self.get_doc_before_save().surgery_date) != str(self.surgery_date):
			costing = frappe.get_doc("Costing", self.patient)
			if frappe.db.exists("Lead", costing.patient):
				lead = frappe.get_doc("Lead", costing.patient)
				if lead.status != "HT Postpone":
					lead.status = "HT Postpone"
					lead.save(ignore_permissions=True)
		if self.pending_amount == 0 and self.status != "Paid":
			self.status = "Paid"

	def after_insert(self):
		if self.surgery_date:
			costing = frappe.get_doc("Costing", self.name)
			if costing.surgery_date != self.surgery_date:
				costing.surgery_date = self.surgery_date
				costing.save(ignore_permissions=True)
		costing = frappe.get_doc("Costing", self.patient)
		if frappe.db.exists("Lead", costing.patient):
			lead = frappe.get_doc("Lead", costing.patient)
			if lead.status != "Date Given":
				lead.status = "Date Given"
				lead.save(ignore_permissions=True)

	def on_update(self):
		if self.doctor and self.surgery_date:
			followup_settings = frappe.get_single("Followup Settings")
			if len(followup_settings.followup_intervals) < 18:
				frappe.throw("Followup mismatch error. Please update the followup settings for more followups.")
			else:
				all_followups = frappe.get_all(
						"Doctor Followup",
						{
							"reference_type": "Surgery",
							"reference_name": self.name,
						},
						ignore_permissions=True
					)
				missing = int(18) - len(all_followups)
				if missing > 0:
					doctor = frappe.get_doc("Doctor", self.doctor)
					for i in range(missing):
						frappe.get_doc(
							{
								"doctype": "Doctor Followup",
								"reference_type": "Surgery",
								"reference_name": self.name,
								"status": "Open",
								"title": self.name + " - " + str(len(all_followups) + i + 1),
								"allocated_to": doctor.email,
								"center": self.center,
								"surgery_date": self.surgery_date,
								"technique": self.technique,
								"grafts": self.grafts,
								"patient_name": self.patient,
								"patient_contact_number": self.contact_number,
								"date": add_days_to_date(self.surgery_date, int(followup_settings.followup_intervals[len(all_followups)+i].days)),
							}
						).insert(ignore_permissions=True)
		if self.executive:
			executive = frappe.get_doc('Executive', self.executive)
			assignes = assign_to.get({
				"doctype": 'Surgery',
				"name": self.name
			})

			assignes_list = [x.owner for x in assignes]

			if executive.email not in assignes_list:
				assign_to.clear('Surgery',self.name)
				frappe.db.delete("DocShare", {
					"share_doctype": 'Surgery',
					"share_name": self.name
				})
				assign_to.add({
					"assign_to": [executive.email],
					"doctype": 'Surgery',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Surgery', self.name, executive.email, 'write')
				set_permission('Surgery', self.name, executive.email, 'share')

				frappe.db.commit()
			assignes = assign_to.get({
					"doctype": 'Surgery',
					"name": self.name
				})
			assignes_list = [x.owner for x in assignes]
			# if self.previous_executive:
			# 	previous_executive = frappe.get_doc('Executive', self.previous_executive)
			# 	if previous_executive.email not in assignes_list:
			# 		assign_to.add({
			# 			"assign_to": [previous_executive.email],
			# 			"doctype": 'Surgery',
			# 			"name": self.name
			# 		}, ignore_permissions=True)
		if self.center:
			assignes = assign_to.get({
				"doctype": 'Surgery',
				"name": self.name
			})
			assignes_list = [x.owner for x in assignes]

			center = frappe.get_doc('Center', self.center)
			receptionist = frappe.get_doc('Receptionist', center.receptionist)
			if receptionist.email not in assignes_list:
				assign_to.add({
					"assign_to": [receptionist.email],
					"doctype": 'Surgery',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Surgery', self.name, receptionist.email, 'write')
				set_permission('Surgery', self.name, receptionist.email, 'share')
			if center.clinic_manager and center.clinic_manager not in assignes_list:
				assign_to.add({
					"assign_to": [center.clinic_manager],
					"doctype": 'Surgery',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Surgery', self.name, center.clinic_manager, 'write')
				set_permission('Surgery', self.name, center.clinic_manager, 'share')

			frappe.db.commit()

		if self.doctor:
			assignes = assign_to.get({
				"doctype": 'Surgery',
				"name": self.name
			})
			assignes_list = [x.owner for x in assignes]

			doctor = frappe.get_doc('Doctor', self.doctor)
			if doctor.email not in assignes_list:
				assign_to.add({
					"assign_to": [doctor.email],
					"doctype": 'Surgery',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Surgery', self.name, doctor.email, 'write')
				set_permission('Surgery', self.name, doctor.email, 'share')

			frappe.db.commit()

		if self.status == "Paid":
			costing = frappe.get_doc("Costing", self.patient)
			if frappe.db.exists("Lead", costing.patient):
				lead = frappe.get_doc("Lead", costing.patient)
				if lead.status != "HT Done":
					lead.status = "HT Done"
					lead.save(ignore_permissions=True)

		if frappe.db.exists("Lead", self.patient):
			lead = frappe.get_doc("Lead", self.patient)
			if self.surgery_status == "Hold" and lead.status != "HT Postpone":
				lead.status = "HT Postpone"	
			elif self.surgery_status == "Cancelled" and lead.status != "HT Cancel":
				lead.status = "HT Cancel"
			elif self.surgery_status == "Booked" and lead.status != "Date Given":
				lead.status = "Date Given"
			elif self.surgery_status == "Partially Completed" or self.surgery_status == "Completed" :
				lead.status = "HT Done"
			lead.save(ignore_permissions=True)


	def validate(self):
		if self.surgery_status != "Cancelled":
			if len(self.grafts_surgeries) == 0:
				self.pending_grafts = self.grafts
			else:
				total_grafts = 0
				for i in self.get("grafts_surgeries"):
					total_grafts += i.grafts
				if total_grafts > self.grafts:
					frappe.throw(_("Total grafts should not be greater than grafts"))
				else:
					pending_grafts = self.grafts - total_grafts
					if 0 < total_grafts < self.grafts:
						self.pending_grafts = pending_grafts
						self.surgery_status = "Partially Completed"
					elif total_grafts == self.grafts:
						self.pending_grafts = 0
						self.surgery_status = "Completed"
					
	
         

@frappe.whitelist()
def get_booking_details(patient):
	return frappe.get_doc(
		"Costing",
		 patient
	)

@frappe.whitelist()
def get_dashboard_stats(patient):
	payments = frappe.get_all("Payment", filters={"type": "Payment", "payment_type": "Surgery", "patient": patient})
	if len(payments) > 0:
		refunds = frappe.get_all("Payment", filters={"type": "Refund", "refund_payment_id": payments[0].name})
	followups = frappe.get_all("Doctor Followup", filters={"reference_type": "Surgery", "reference_name": patient})
	return [
		{"label": _("Payment"), "value": len(payments), "id": payments[0].name if len(payments) > 0  else ""},
		{"label": _("Refund"), "value": 0 if len(payments) == 0 else len(refunds)},
		{"label": _("Doctor Followup"), "value": len(followups)},
	]


@frappe.whitelist()
def cancel_surgery(surgery):
	booking = frappe.get_doc("Costing", surgery)
	if booking.status == "Booking":
		return {
			"status": "error",
			"message": _("Please refund the Booking then only you can cancel the Surgery."),
			"indicator": "red"
		}
	else:
		surgery_doc = frappe.get_doc("Surgery", surgery)
		surgery_doc.surgery_status = "Cancelled"
		surgery_doc.note = "Cancelled"
		surgery_doc.save()
		return {
			"status": "success",
			"message": _("The Surgery has been cancelled."),
			"indicator": "green"
		}
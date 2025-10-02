# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe.desk.form import assign_to
from frappe.model.document import Document
from frappe.share import set_permission
from frappe.utils.data import today
from frappe import _
from frappe.utils import getdate, nowdate

class Consultation(Document):
	def before_insert(self):
		existing_lead = frappe.db.exists("Lead", {"name": self.patient})
		if existing_lead:
			lead = frappe.get_doc("Lead", existing_lead)
			if lead.status == "Duplicate Lead":
				frappe.throw(_("You can not create a consultation for a duplicate lead."))
	def before_save(self):
		previous_doc = self.get_doc_before_save()
		if previous_doc and previous_doc.date:
			current_date = getdate(self.date)
			if current_date != previous_doc.date and self.status == "Not Visited":
				self.status = "Rescheduled"

	def on_update(self):
		if self.executive:
			executive = frappe.get_doc('Executive', self.executive)
			assignes = assign_to.get({
				"doctype": 'Consultation',
				"name": self.name
			})

			assignes_list = [x.owner for x in assignes]

			if executive.email not in assignes_list:
				assign_to.clear('Consultation',self.name)
				frappe.db.delete("DocShare", {
					"share_doctype": 'Consultation',
					"share_name": self.name
				})
				assign_to.add({
					"assign_to": [executive.email],
					"doctype": 'Consultation',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Consultation', self.name, executive.email, 'write')
				set_permission('Consultation', self.name, executive.email, 'share')

				frappe.db.commit()
			assignes = assign_to.get({
					"doctype": 'Lead',
					"name": self.name
				})
			assignes_list = [x.owner for x in assignes]
			# if self.previous_executive:
			# 	previous_executive = frappe.get_doc('Executive', self.previous_executive)
			# 	if previous_executive.email not in assignes_list:
			# 		assign_to.add({
			# 			"assign_to": [previous_executive.email],
			# 			"doctype": 'Consultation',
			# 			"name": self.name
			# 		}, ignore_permissions=True)
		
		if self.center:
			assignes = assign_to.get({
				"doctype": 'Consultation',
				"name": self.name
			})
			assignes_list = [x.owner for x in assignes]

			center = frappe.get_doc('Center', self.center)
			receptionist = frappe.get_doc('Receptionist', center.receptionist)
			if receptionist.email not in assignes_list:
				assign_to.add({
					"assign_to": [receptionist.email],
					"doctype": 'Consultation',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Consultation', self.name, receptionist.email, 'write')
				set_permission('Consultation', self.name, receptionist.email, 'share')
			if center.clinic_manager and center.clinic_manager not in assignes_list:
				assign_to.add({
					"assign_to": [center.clinic_manager],
					"doctype": 'Consultation',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Consultation', self.name, center.clinic_manager, 'write')
				set_permission('Consultation', self.name, center.clinic_manager, 'share')

				frappe.db.commit()
		
		if self.doctor:
			assignes = assign_to.get({
				"doctype": 'Consultation',
				"name": self.name
			})
			assignes_list = [x.owner for x in assignes]

			doctor = frappe.get_doc('Doctor', self.doctor)
			if doctor.email not in assignes_list:
				assign_to.add({
					"assign_to": [doctor.email],
					"doctype": 'Consultation',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Consultation', self.name, doctor.email, 'write')
				set_permission('Consultation', self.name, doctor.email, 'share')
				frappe.db.commit()
	
		lead_exists = frappe.db.exists("Lead", {"name": self.patient})
		if lead_exists:
			lead = frappe.get_doc("Lead", self.patient)
			if (self.status == "Scheduled" or self.status == "Rescheduled") and lead.status != "CS Lined Up":
				lead.status = "CS Lined Up"
				lead.save(ignore_permissions=True)
			elif (self.status == "Booked" or self.status == "Spot Booking") and lead.status != "Booked":
				lead.status = "Booked"
				lead.save(ignore_permissions=True)
			elif self.status == "Non Booked" and lead.status != "HT CS Done":
				lead.status = "HT CS Done"
				lead.save(ignore_permissions=True)
			elif self.status == "Medi-PRP" and lead.status != "Medi/PRP":
				lead.status = "Medi/PRP"
				lead.save(ignore_permissions=True)
			elif self.status == "Not Visited" and lead.status != "CS Followup":
				lead.status = "CS Followup"
				lead.save(ignore_permissions=True)


@frappe.whitelist()
def get_slots(doctor):
	consultations = frappe.get_all('Consultation', filters={'doctor': doctor, "date": [">=", today()]}, fields=['date', 'slot', 'mode'], order_by='date')
	schedules = frappe.get_all('Schedule', filters={'doctor': doctor, 'date': [">=", today()]}, fields=['date', 'slot', 'patients', 'mode'], order_by='date')

	available_slots = []

	for schedule in schedules:
		already_consulted = len([c for c in consultations if c['date'] == schedule['date'] and c['slot'] == schedule['slot']])
		count = schedule['patients'] - already_consulted

		if count > 0:
			available_slots.append({
				'date': schedule['date'],
				'slot': schedule['slot'],
				'mode': schedule['mode'],
				'doctor': doctor,
				'count': count
			})

	return available_slots


@frappe.whitelist()
def get_doctors(center, date):
	schedules = frappe.get_all('Schedule', filters={'date': ["=", date]}, fields=['date', 'slot', 'patients', 'doctor', 'mode'], order_by='date')
	consultations = frappe.get_all('Consultation', filters={"date": ["=", date]}, fields=['date', 'slot', 'doctor'], order_by='date')
	valid_doctors = frappe.get_all('Doctor', fields=['name'])

	doctors = []
	for doc in valid_doctors:
		for schedule in schedules:
			if schedule['doctor'] == doc['name']:
				doctors.append(schedule)

	available_slots = []
	for doctor in doctors:
		already_consulted = len([c for c in consultations if c['date'] == doctor['date'] and c['slot'] == doctor['slot']])
		count = doctor['patients'] - already_consulted

		if count > 0:
			available_slots.append({
				'date': doctor['date'],
				'slot': doctor['slot'],
				'mode': doctor['mode'],
				'count': count,
				'doctor': doctor['doctor']
			})
	return available_slots


@frappe.whitelist()
def get_dashboard_stats(patient):
	payments = frappe.get_all("Payment", filters={"type": "Payment", "payment_type": "Consultation", "patient": patient})

	return [
		{"label": _("Payment"), "value": len(payments), "id": payments[0].name if len(payments) > 0  else ""},
	]


import frappe
from frappe.share import add as share_add

@frappe.whitelist()
def prepare_lead_access_for_button(consultation_name, lead_name):
    user = frappe.session.user

    if not frappe.has_permission("Consultation", "read", consultation_name, user=user):
        frappe.throw("You don't have permission to access this Consultation.")

    original_user = frappe.session.user
    frappe.set_user("Administrator")

    existing = frappe.db.exists("DocShare", {
        "share_doctype": "Lead",
        "share_name": lead_name,
        "user": user,
    })
    if not existing:
        share_add("Lead", lead_name, user, read=1, write=1, share=1)

    frappe.set_user(original_user)

    return True

# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe.desk.form import assign_to
from frappe.model.document import Document
from frappe.share import set_permission


class DoctorFollowup(Document):
	def before_insert(self):
		if self.reference_type and self.reference_name:
			# Count existing followups for the same reference, sorted by creation date
			existing_followups = frappe.get_all(
				"Doctor Followup",
				filters={
					"reference_type": self.reference_type,
					"reference_name": self.reference_name
				},
				fields=["name"],
				order_by="creation asc"
			)
			# Sequence number is count + 1
			sequence_number = len(existing_followups) + 1
			self.label = self.get_followup_label(sequence_number)

	def validate(self):
		# Auto-populate label if it's empty
		if self.reference_type and self.reference_name and not self.label:
			# Count existing followups for the same reference, sorted by creation date
			existing_followups = frappe.get_all(
				"Doctor Followup",
				filters={
					"reference_type": self.reference_type,
					"reference_name": self.reference_name
				},
				fields=["name"],
				order_by="creation asc"
			)
			# Find this followup's position in the sequence
			sequence_number = None
			for i, followup in enumerate(existing_followups):
				if followup.name == self.name:
					sequence_number = i + 1
					break
			if sequence_number:
				self.label = self.get_followup_label(sequence_number)

	def on_update(self):
		pass

	def get_followup_label(self, sequence_number):
		"""Get the label for a followup based on its sequence number"""
		labels = {
			1: "Bandage Removal (1st post-transplant call)",
			2: "Head Wash Follow-Up Call",
			3: "Post Head Wash Feedback Call + Scalp Pictures + Medication Guidance",
			4: "Minoxidil Application Guidance Call",
			5: "Baby Hair & Shedding Phase Review + 1st PRP Session"
		}
		return labels.get(sequence_number, "")

	def on_update(self):
		if self.allocated_to:
			user = self.allocated_to

			assignes = assign_to.get({
				"doctype": 'Doctor Followup',
				"name": self.name
			})

			assignes_list = [x.owner for x in assignes]
			if user not in assignes_list:
				assign_to.add({
					"assign_to": [user],
					"doctype": 'Doctor Followup',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Doctor Followup', self.name, user, 'write')
				set_permission('Doctor Followup', self.name, user, 'share')
		
		if self.receptionist:
			receptionist = frappe.get_doc('Receptionist', self.receptionist)
			assignes = assign_to.get({
				"doctype": 'Doctor Followup',
				"name": self.name
			})

			assignes_list = [x.owner for x in assignes]

			if receptionist.email not in assignes_list:
				assign_to.add({
					"assign_to": [receptionist.email],
					"doctype": 'Doctor Followup',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Doctor Followup', self.name, receptionist.email, 'write')
				set_permission('Doctor Followup', self.name, receptionist.email, 'share')



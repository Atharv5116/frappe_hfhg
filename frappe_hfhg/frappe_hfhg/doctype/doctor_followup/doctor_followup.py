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
		"""Get the label for a followup based on its sequence number from Followup Settings"""
		try:
			followup_settings = frappe.get_single("Followup Settings")
			if followup_settings.followup_intervals and len(followup_settings.followup_intervals) >= sequence_number:
				# Get the label from the followup_intervals table
				# sequence_number is 1-indexed, so we need to access index (sequence_number - 1)
				# Try to find by index first (assuming table is in order)
				if sequence_number <= len(followup_settings.followup_intervals):
					interval = followup_settings.followup_intervals[sequence_number - 1]
					if interval.label:
						return interval.label
				# Fallback: try to find by followup number if it's stored as a number
				for interval in followup_settings.followup_intervals:
					# Extract number from "Followup X" format or use direct number
					followup_num = None
					if isinstance(interval.followup, (int, float)):
						followup_num = int(interval.followup)
					elif isinstance(interval.followup, str) and "Followup" in interval.followup:
						try:
							followup_num = int(interval.followup.replace("Followup", "").strip())
						except:
							pass
					if followup_num == sequence_number and interval.label:
						return interval.label
		except Exception as e:
			# Fallback to empty string if Followup Settings is not configured
			frappe.log_error(f"Error getting followup label: {str(e)}", "DoctorFollowup.get_followup_label")
		return ""

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



# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe.desk.form import assign_to
from frappe.model.document import Document
from frappe.share import set_permission


class DoctorFollowup(Document):
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



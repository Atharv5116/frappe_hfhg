# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe.desk.form import assign_to
from frappe.model.document import Document
from frappe.share import set_permission


class TaskManagement(Document):
	def on_update(self):
		if self.allocated_to:
			user = self.allocated_to

			assignes = assign_to.get({
				"doctype": 'Task Management',
				"name": self.name
			})

			assignes_list = [x.owner for x in assignes]
			if user not in assignes_list:
				assign_to.add({
					"assign_to": [user],
					"doctype": 'Task Management',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Task Management', self.name, user, 'write')
				set_permission('Task Management', self.name, user, 'share')


@frappe.whitelist()
def get_surgery_details(lead_name):
    costing = frappe.db.get_value('Costing', {'patient': lead_name}, 'name')
    if not costing:
        return {'error': 'Costing for this lead is not exist'}

    surgery = frappe.db.get_value('Surgery', {'patient': costing}, ['surgery_date', 'grafts', 'technique'], as_dict=True)
    if not surgery:
        return {'error': 'Costing for this lead is not exist'}

    return surgery
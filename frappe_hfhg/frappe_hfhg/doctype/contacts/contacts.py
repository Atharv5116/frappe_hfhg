# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _


class Contacts(Document):
	pass

@frappe.whitelist()
def get_dashboard_stats(contact):
	leads = frappe.get_all("Lead", filters={"contact": contact})

	return [
		{"label": _("Lead"), "value": len(leads)},
	]
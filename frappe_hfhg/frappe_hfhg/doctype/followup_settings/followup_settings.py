# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _

class FollowupSettings(Document):
	def validate(self):
		if int(self.followups) != len(self.followup_intervals):
			frappe.throw(_("No. of Followups and No. of Table items should be same"))

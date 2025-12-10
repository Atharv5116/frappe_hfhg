import frappe
from frappe.model.document import Document
from frappe import _
from datetime import date


class Bulletin(Document):
	def validate(self):
		# Ensure only one active bulletin exists
		if self.is_active:
			# Check if there are other active bulletins
			existing_active = frappe.db.get_value(
				"Bulletin",
				{"is_active": 1, "name": ["!=", self.name]},
				"name"
			)
			if existing_active:
				frappe.throw(_("Only one active bulletin can exist at a time. Please deactivate the existing bulletin first."))


@frappe.whitelist()
def get_active_bulletin():
	"""Get the active bulletin message for display in navbar"""
	today = date.today()
	
	# Find active bulletin that is within date range (if dates are set)
	bulletin = frappe.db.sql("""
		SELECT name, message, start_date, end_date
		FROM `tabBulletin`
		WHERE is_active = 1
		AND (
			(start_date IS NULL OR start_date <= %(today)s)
			AND (end_date IS NULL OR end_date >= %(today)s)
		)
		ORDER BY modified DESC
		LIMIT 1
	""", {"today": today}, as_dict=True)
	
	if bulletin:
		return bulletin[0]
	return None


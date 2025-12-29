import frappe
from frappe.model.document import Document
from frappe import _
from datetime import date


class Bulletin(Document):
	def validate(self):
		# Allow multiple active bulletins - validation removed
		pass


@frappe.whitelist()
def get_active_bulletin():
	"""Get all active bulletin messages for display in navbar"""
	today = date.today()
	
	# Find all active bulletins that are within date range (if dates are set)
	# Use get_all for better compatibility
	bulletins = frappe.get_all(
		"Bulletin",
		filters={
			"is_active": 1
		},
		fields=["name", "message", "start_date", "end_date"],
		order_by="modified DESC"
	)
	
	# Filter by date range manually to handle NULL dates properly
	filtered_bulletins = []
	for bulletin in bulletins:
		start_date = bulletin.get("start_date")
		end_date = bulletin.get("end_date")
		
		# Check if bulletin is within date range
		# If start_date is set, today must be >= start_date
		# If end_date is set, today must be <= end_date
		# If dates are NULL, bulletin is always valid
		start_valid = start_date is None or start_date <= today
		end_valid = end_date is None or end_date >= today
		
		if start_valid and end_valid:
			filtered_bulletins.append(bulletin)
	
	return filtered_bulletins


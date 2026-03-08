# Copyright (c) 2025, Frappe Hfhg and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class CurlLeadForm(Document):
	"""Form configuration for leads coming via curl/API. Defines field mapping from incoming payload to Lead doctype."""

	def validate(self):
		self.validate_mapping()

	def validate_mapping(self):
		"""Ensure mapping has required rows for core Lead fields."""
		seen_lead_fields = set()
		for row in self.mapping:
			if row.lead_doctype_field:
				if row.lead_doctype_field in seen_lead_fields:
					frappe.throw(
						_(f"Duplicate mapping for Lead field '{row.lead_doctype_field}'."),
						title=_("Validation Error")
					)
				seen_lead_fields.add(row.lead_doctype_field)
			if row.lead_doctype_field and not row.incoming_field and not row.default_value:
				frappe.throw(
					_(f"Row for '{row.lead_doctype_field}' must have Incoming Field or Default Value."),
					title=_("Validation Error")
				)

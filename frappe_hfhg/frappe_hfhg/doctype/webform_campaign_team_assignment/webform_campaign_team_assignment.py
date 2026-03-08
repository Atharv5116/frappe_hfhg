# Copyright (c) 2025, Frappe Hfhg and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class WebformCampaignTeamAssignment(Document):
	"""Mapping: select Webform Campaign and assign a Campaign Team (or User). Leads for that campaign get round-robin assignment from this team."""

	def on_update(self):
		self.sync_assignment_to_campaign()

	def sync_assignment_to_campaign(self):
		"""Sync assignee_doctype and assign_to to Webform Campaign for display/consistency (assignment is always read from this mapping)."""
		if not self.webform_campaign or not self.enabled:
			return
		try:
			campaign = frappe.get_doc("Webform Campaign", self.webform_campaign)
			# Store optional display fields on campaign if needed; for now we only read from this mapping in Lead logic
			# Uncomment below to sync assign_to to a custom field on Webform Campaign:
			# campaign.db_set("assign_to_display", self.assign_to, update_modified=False)
			campaign.clear_cache()
		except Exception:
			pass

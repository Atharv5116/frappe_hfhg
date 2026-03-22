# Copyright (c) 2025, Frappe Hfhg and contributors
# For license information, please see license.txt
"""Webform Campaign DocType + safe `name` helpers for curl/webform integrations.

Marketing strings often contain `>` / `<` (e.g. Google>HT>Consultation>...).
Frappe's validate_name() rejects `<` and `>` in document `name`.
Field values (campaign_name, form_key) keep the original text; only `name` is sanitized.

`make_curl_lead_form_name` is also defined here and imported by Curl Lead Form to avoid a separate module.
"""

from __future__ import annotations

import re

import frappe
from frappe.model.document import Document
from frappe.model.naming import append_number_if_name_exists


def safe_doc_name_fragment(value: str | None, max_len: int = 120) -> str:
	"""Strip and replace characters that are invalid or risky in DocType `name`."""
	if value is None:
		return ""
	s = str(value).strip()
	# frappe.model.naming.validate_name rejects < and >
	s = re.sub(r"[<>]", "-", s)
	# Other characters that often break names / URLs
	s = re.sub(r'["\'\\|?*%#\n\r\t]', "-", s)
	s = re.sub(r"\s+", "-", s)
	s = re.sub(r"/+", "-", s)
	s = re.sub(r"-+", "-", s).strip("-")
	if len(s) > max_len:
		s = s[:max_len].rstrip("-")
	return s


def make_webform_campaign_name(source: str | None, campaign_name: str | None) -> str:
	"""Build a unique, valid `name` for Webform Campaign; lookup remains by campaign_name + source."""
	s_part = safe_doc_name_fragment(source or "", 40)
	c_part = safe_doc_name_fragment(campaign_name or "", 80)
	if s_part and c_part:
		base = f"{s_part}-{c_part}"
	elif c_part:
		base = c_part
	elif s_part:
		base = s_part
	else:
		base = "webform-campaign"
	base = base[:140].rstrip("-")
	return append_number_if_name_exists("Webform Campaign", base)


def make_curl_lead_form_name(form_key: str | None) -> str:
	"""Build a unique, valid `name` for Curl Lead Form; `form_key` field stays unchanged."""
	base = safe_doc_name_fragment(form_key or "", 130)
	if not base:
		base = "curl-lead-form"
	base = base[:140].rstrip("-")
	return append_number_if_name_exists("Curl Lead Form", base)


class WebformCampaign(Document):
	"""Campaign definition for webform/curl leads (Google Adword, Website). Team assignment is via Webform Campaign Team Assignment."""

	def autoname(self):
		# campaign_name may contain e.g. Google>HT>... — raw format: autoname fails validate_name (< >)
		self.name = make_webform_campaign_name(self.source, self.campaign_name)

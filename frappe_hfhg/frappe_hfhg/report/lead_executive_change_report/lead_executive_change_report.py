# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import datetime
import frappe
from frappe import _
from frappe_hfhg.frappe_hfhg.doctype.centre_assignment.centre_assignment import apply_marketing_head_center_filter

Filters = frappe._dict

@frappe.whitelist()
def execute(filters = None) -> tuple:
	if not filters.to_date or not filters.from_date:
		frappe.throw(_('"From Date" and "To Date" are mandatory'))
	if filters.to_date <= filters.from_date:
		frappe.throw(_('"From Date" cannot be greater than or equal to "To Date"'))

	columns = get_columns()
	data = get_data(filters)
	return columns, data

def get_columns() -> list[dict]:
	return [
		{
			"label": _("Lead"),
			"fieldtype": "Data",
			"fieldname": "lead",
			"width": 220,
		},
		{
			"label": _("Executive From"),
			"fieldtype": "Data",
			"fieldname": "executive_from",
			"width": 230,
		}, 
        {
			"label": _("Executive To"),
			"fieldtype": "Data",
			"fieldname": "executive_to",
			"width": 230,
		}, 
		{
			"label": _("Assigned By"),
			"fieldtype": "Data",
			"fieldname": "assign_by",
			"width": 230,
		}, 
		{
			"label": _("Datetime"),
			"fieldtype": "DateTime",
			"fieldname": "date_time",
			"width": 250,
		}, 
		{
			"label": _("Patient"),
			"fieldtype": "Data",
			"fieldname": "patient_name",
			"width": 220,
		},
		{
			"label": _("Status"),
			"fieldtype": "Data",
			"fieldname": "status",
			"width": 220,
		},
		{
			"label": _("Contact number"),
			"fieldtype": "Data",
			"fieldname": "contact_number",
			"width": 220,
		},
		{
			"label": _("Lead created on"),
			"fieldtype": "Data",
			"fieldname": "lead_created_on",
			"width": 220,
		}
	]

def get_data(filters) -> list[dict]:
	query = """
		SELECT lecl.*, l.full_name as patient_name
		FROM `tabLead Executive Change Log` lecl
		LEFT JOIN `tabLead` l ON l.name = lecl.lead
		WHERE lecl.date_time BETWEEN %(from_datetime)s AND %(to_datetime)s
	"""
	params = {
		"from_datetime": filters.from_date + " 00:00:00",
		"to_datetime": filters.to_date + " 23:59:59",
	}
	if filters.get("executive_from"):
		query += " AND lecl.executive_from = %(executive_from)s"
		params["executive_from"] = filters.executive_from
	if filters.get("executive_to"):
		query += " AND lecl.executive_to = %(executive_to)s"
		params["executive_to"] = filters.executive_to

	# Marketing Head(new) only: filter by lead's center
	query, params = apply_marketing_head_center_filter(query, params, center_field="center", table_alias="l")

	logs = frappe.db.sql(query, params, as_dict=True)

	for log in logs:
		if "patient_name" not in log and log.get("lead"):
			log["patient_name"] = frappe.db.get_value("Lead", log.lead, "full_name") or log.get("lead")
	return logs

# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from urllib.parse import quote

Filters = frappe._dict

@frappe.whitelist()
def execute(filters= None) -> tuple:
	if isinstance(filters, str):
		filters = frappe.parse_json(filters)
	if filters.to_date <= filters.from_date:
		frappe.throw(_('"From Date" can not be greater than or equal to "To Date"'))

	columns = get_columns()
	data = get_data(filters)
	reference_count = len(data)
	return columns, data, {"reference_count": reference_count}


def get_columns() -> list[dict]:
	return [
		{
			"label": _("Lead Date"),
			"fieldtype": "Date",
			"fieldname": "created_on",
			"width": 150,
		},
		{
			"label": _("Source"),
			"fieldtype": "Data",
			"fieldname": "source",
			"width": 150,
		},
		{
			"label": _("Sub Source"),
			"fieldtype": "Data",
			"fieldname": "subsource",
			"width": 150,
		},
		{
			"label": _("Reference Name"),
			"fieldtype": "Data",
			"fieldname": "reference_name",
			"width": 150,
		},
		{
			"label": _("Campaign Name"),
			"fieldtype": "Data",
			"fieldname": "campaign_name",
			"width": 150,
		},
		{
			"label": _("Name"),
			"fieldtype": "Data",
			"fieldname": "name",
			"width": 150,
		},
		{
			"label": _("Phone No"),
			"fieldtype": "Data",
			"fieldname": "phone_no",
			"width": 150,
		},
		{
			"label": _("City"),
			"fieldtype": "Data",
			"fieldname": "city",
			"width": 150,
		},
		{
			"label": _("Center"),
			"fieldtype": "Data",
			"fieldname": "center",
			"width": 150,
		},
		{
			"label": _("Executive"),
			"fieldtype": "Data",
			"fieldname": "executive",
			"width": 150,
		},
		{
			"label": _("Assign By"),
			"fieldtype": "Data",
			"fieldname": "assign_by",
			"width": 150,
		},
		{
			"label": _("Lead Mode"),
			"fieldtype": "Data",
			"fieldname": "mode",
			"width": 150,
		},
		{
			"label": _("Service"),
			"fieldtype": "Data",
			"fieldname": "service",
			"width": 150,
		},
		{
			"label": _("Status"),
			"fieldtype": "Data",
			"fieldname": "status",
			"width": 150,
		},
		{
			"label": _("Active / Inactive Status"),
			"fieldtype": "Select",
			"fieldname": "active_inactive_status",
			"width": 150,
		},
	]

def get_data(filters: Filters) -> list[dict]:
	rows = []
	leads = []
	lead_filters = {
		"created_on": ["between", [filters.from_date, filters.to_date]],
		"source_reference": ["not in", [None, ""]]
	}
	if filters.reference_name:
		lead_filters["source_reference"] = ["like", f"%{filters.reference_name}%"]
	if filters.executive:
		lead_filters["executive"] = filters.executive

	if filters.center:
		lead_filters["center"] = filters.center

	if filters.source:
		lead_filters["source"] = ["like", f"%{filters.source}%"]

	if filters.subsource:
		lead_filters["subsource"] = ["like", f"%{filters.subsource}%"]

	if filters.mode:
		lead_filters["mode"] = filters.mode

	if filters.status:
		lead_filters["status"] = filters.status

	if filters.get("active_inactive_status"):
		lead_filters["active_inactive_status"] = filters["active_inactive_status"]

	if filters.contact_number:
		lead_filters["contact_number"] = ["like", f"%{filters.contact_number}%"]

	if filters.patient:
		lead_filters["name"] = ["like", f"%{filters.patient}%"]
		
	user = frappe.session.user
	is_receptionist = frappe.db.exists("Receptionist", {'email': user})
	is_executive = frappe.db.exists("Executive", {'email': user})
	roles = frappe.get_roles()
	is_marketing_head = True if "Marketing Head" in roles else False

	if is_receptionist and not is_marketing_head:
		receptionist = frappe.db.get_value('Receptionist', {'email': user}, ['name'], as_dict=1)
		center = frappe.db.get_value('Center', {'receptionist': receptionist.name}, ['name'], as_dict=1)
		lead_filters["center"] = center.name
		leads = frappe.get_all("Lead", fields=["*"], filters=lead_filters)
	
	elif is_executive and not is_marketing_head:
		executive = frappe.db.get_value('Executive', {'email': user}, ['name'], as_dict=1)
		lead_filters["executive"] = executive.name
		leads = frappe.get_all("Lead", fields=["*"], filters=lead_filters)

	else:
		leads = frappe.get_all("Lead", fields=["*"], filters=lead_filters)
	
	for lead in leads:
		row = {
			"created_on": lead.get("created_on"),
			"source": lead.get("source"),
			"subsource": lead.get("subsource") if lead.get("source") == "Meta" else "",
		"reference_name": lead.get("source_reference"),
		"campaign_name": lead.get("campaign_name"),
            "name": f'<strong><a href="/app/lead/{quote(lead.get("name"), safe="")}" style="color: inherit;">{lead.get("full_name")}</a></strong>',
		"phone_no": lead.get("contact_number"),
		"city": lead.get("city"),
			"center": lead.get("center"),
			"executive": lead.get("executive"),
			"assign_by": lead.get("assign_by"),
			"mode": lead.get("mode"),
			"service": lead.get("service"),
			"status": lead.get("status"),
			"active_inactive_status": lead.get("active_inactive_status"),
		}
		rows.append(row)

	return rows

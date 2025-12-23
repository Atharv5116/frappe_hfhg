# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import cint
from urllib.parse import quote
from datetime import date

Filters = frappe._dict


@frappe.whitelist()
def execute(filters=None) -> tuple:
	"""Execute the report and return columns and data"""
	if isinstance(filters, str):
		filters = frappe.parse_json(filters)
	
	columns = get_columns()
	data = get_data(filters)
	
	return columns, data


def get_columns() -> list[dict]:
	"""Define the report columns"""
	return [
		{
			"label": _("Mark"),
			"fieldtype": "Check",
			"fieldname": "surgery_checked",
			"width": 60,
		},
		{
			"label": _("Patient Name"),
			"fieldtype": "Data",
			"fieldname": "patient_name",
			"width": 150,
		},
		{
			"label": _("Surgery Date"),
			"fieldtype": "Date",
			"fieldname": "surgery_date",
			"width": 120,
		},
		{
			"label": _("Center"),
			"fieldtype": "Data",
			"fieldname": "center",
			"width": 120,
		},
		{
			"label": _("Doctor"),
			"fieldtype": "Data",
			"fieldname": "doctor",
			"width": 120,
		},
		{
			"label": _("Technique"),
			"fieldtype": "Data",
			"fieldname": "technique",
			"width": 120,
		},
		{
			"label": _("Grafts"),
			"fieldtype": "Int",
			"fieldname": "grafts",
			"width": 80,
		},
		{
			"label": _("Status"),
			"fieldtype": "Data",
			"fieldname": "surgery_status",
			"width": 120,
		},
		{
			"label": _("Phone No"),
			"fieldtype": "Data",
			"fieldname": "contact_number",
			"width": 120,
		},
		{
			"label": _("City"),
			"fieldtype": "Data",
			"fieldname": "city",
			"width": 100,
		},
		{
			"label": _("Executive"),
			"fieldtype": "Data",
			"fieldname": "executive",
			"width": 120,
		},
		{
			"label": _("Surgery ID"),
			"fieldtype": "Data",
			"fieldname": "surgery_id",
			"hidden": 1,
			"width": 120,
		},
	]


def get_data(filters) -> list[dict]:
	"""Get the report data filtered by user assignment and upcoming surgeries"""
	user = frappe.session.user
	
	# Check if user has required roles (System Manager, Administrator, Future Surgery)
	required_roles = ["System Manager", "Administrator", "Future Surgery"]
	user_roles = frappe.get_roles(user)
	has_required_role = any(role in user_roles for role in required_roles)
	
	if not has_required_role:
		# User doesn't have required role to access this report
		frappe.msgprint(
			_("You don't have permission to access this report. Required roles: System Manager, Administrator, or Future Surgery."),
			indicator="red",
			title=_("Access Denied")
		)
		return []
	
	# Check if user is assigned in future_surgery_assignment
	assignment = frappe.db.exists("Future Surgery Assignment", {"user": user})
	
	if not assignment:
		# User is not assigned, return empty data
		frappe.msgprint(
			_("You are not assigned to any centers in Future Surgery Assignment. Please contact administrator."),
			indicator="orange",
			title=_("No Access")
		)
		return []
	
	# Get the assignment document to fetch centers
	assignment_doc = frappe.get_doc("Future Surgery Assignment", assignment)
	
	# Extract center names from the centers table
	assigned_centers = [center.center for center in assignment_doc.centers]
	
	if not assigned_centers:
		# No centers assigned
		frappe.msgprint(
			_("No centers assigned to you in Future Surgery Assignment."),
			indicator="orange",
			title=_("No Centers Assigned")
		)
		return []
	
	# Get today's date for filtering upcoming surgeries
	today = date.today()
	
	# Build query to get upcoming surgeries from assigned centers
	query = """
		SELECT 
			s.name,
			s.patient,
			s.surgery_date,
			s.center,
			s.doctor,
			s.technique,
			s.grafts,
			s.surgery_status,
			s.surgery_checked,
			s.contact_number,
			s.city,
			s.executive,
			l.full_name as patient_name
		FROM
			`tabSurgery` s
		LEFT JOIN
			`tabLead` l
		ON
			l.name = s.patient
		WHERE
			s.surgery_date >= %(today)s
			AND s.center IN %(centers)s
	"""
	
	params = {
		"today": today,
		"centers": assigned_centers,
	}
	
	# Add optional filters
	if filters.get("center"):
		# Validate that the filtered center is in assigned centers
		if filters.get("center") in assigned_centers:
			query += " AND s.center = %(filter_center)s"
			params["filter_center"] = filters.get("center")
	
	if filters.get("surgery_status"):
		query += " AND s.surgery_status = %(status)s"
		params["status"] = filters.get("surgery_status")
	
	if filters.get("doctor"):
		query += " AND s.doctor = %(doctor)s"
		params["doctor"] = filters.get("doctor")
	
	if filters.get("from_date"):
		query += " AND s.surgery_date >= %(from_date)s"
		params["from_date"] = filters.get("from_date")
	
	if filters.get("to_date"):
		query += " AND s.surgery_date <= %(to_date)s"
		params["to_date"] = filters.get("to_date")
	
	query += " ORDER BY s.surgery_checked ASC, s.surgery_date ASC"
	
	# Execute query
	surgeries = frappe.db.sql(query, params, as_dict=True)
	
	# Format data for report
	rows = []
	for surgery in surgeries:
		rows.append({
			"surgery_checked": surgery.get("surgery_checked"),
			"patient_name": f'<strong><a href="/app/surgery/{quote(surgery.get("name"), safe="")}" style="color: inherit;">{surgery.get("patient_name") or surgery.get("patient")}</a></strong>',
			"surgery_date": surgery.get("surgery_date"),
			"center": surgery.get("center"),
			"doctor": surgery.get("doctor"),
			"technique": surgery.get("technique"),
			"grafts": surgery.get("grafts"),
			"surgery_status": surgery.get("surgery_status"),
			"contact_number": surgery.get("contact_number"),
			"city": surgery.get("city"),
			"executive": surgery.get("executive"),
			"surgery_id": surgery.get("name"),
		})
	
	return rows


@frappe.whitelist()
def update_surgery_checked(surgery_id: str, checked: int) -> dict:
	"""Update the checkbox on Surgery from the report"""
	user = frappe.session.user
	required_roles = ["System Manager", "Administrator", "Future Surgery"]
	user_roles = frappe.get_roles(user)
	has_required_role = any(role in user_roles for role in required_roles)

	if not has_required_role:
		frappe.throw(_("You don't have permission to update this surgery."))

	assignment = frappe.db.exists("Future Surgery Assignment", {"user": user})

	if not assignment:
		frappe.throw(_("You are not assigned to any centers in Future Surgery Assignment."))

	assignment_doc = frappe.get_doc("Future Surgery Assignment", assignment)
	assigned_centers = [center.center for center in assignment_doc.centers]

	if not assigned_centers:
		frappe.throw(_("No centers assigned to you in Future Surgery Assignment."))

	surgery = frappe.get_doc("Surgery", surgery_id)

	if surgery.center not in assigned_centers:
		frappe.throw(_("You are not allowed to update this surgery."))

	surgery.db_set("surgery_checked", 1 if cint(checked) else 0, update_modified=False)
	return {"surgery_checked": surgery.surgery_checked}


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_assigned_centers_for_filter(doctype, txt, searchfield, start, page_len, filters):
	"""Custom query to get only centers assigned to the current user in Future Surgery Assignment"""
	user = frappe.session.user
	
	# Check if user is assigned
	assignment = frappe.db.exists("Future Surgery Assignment", {"user": user})
	
	if not assignment:
		# Return empty list if user not assigned
		return []
	
	# Get the assignment document
	assignment_doc = frappe.get_doc("Future Surgery Assignment", assignment)
	assigned_centers = [center.center for center in assignment_doc.centers]
	
	if not assigned_centers:
		return []
	
	# Build query to search centers
	if not txt or txt.strip() == '':
		return frappe.db.sql("""
			SELECT name, COALESCE(city, name) as city
			FROM `tabCenter`
			WHERE name IN %(centers)s
			ORDER BY city ASC
			LIMIT %(limit)s
		""", {
			'centers': assigned_centers,
			'limit': page_len or 20
		})
	
	# Handle search term
	return frappe.db.sql("""
		SELECT name, COALESCE(city, name) as city
		FROM `tabCenter`
		WHERE name IN %(centers)s
			AND (name LIKE %(txt)s OR city LIKE %(txt)s)
		ORDER BY city ASC
		LIMIT %(limit)s
	""", {
		'centers': assigned_centers,
		'txt': f'%{txt}%',
		'limit': page_len or 20
	})


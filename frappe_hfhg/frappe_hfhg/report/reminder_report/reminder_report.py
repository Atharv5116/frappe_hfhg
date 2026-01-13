# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.email.receive import add_days
from frappe.utils import getdate
from frappe.utils.data import today
from frappe_hfhg.frappe_hfhg.doctype.centre_assignment.centre_assignment import apply_marketing_head_center_filter

Filters = frappe._dict

@frappe.whitelist()
def execute(filters= None) -> tuple:
	if isinstance(filters, str):
		filters = frappe.parse_json(filters)
	if not filters.to_date or not filters.from_date:
		frappe.throw(_('"From Date" and "To Date" are mandatory'))
	if filters.to_date < filters.from_date:
		frappe.throw(_('"From Date" can not be greater than or equal to "To Date"'))
	if "from_date" in filters and "to_date" in filters:
		from_date = getdate(filters["from_date"])
		to_date = getdate(filters["to_date"])
		if (to_date - from_date).days > 3:
			frappe.throw("Date range cannot be more than 3 days.")

	columns = get_columns()
	data = get_data(filters)

	reminder_count = len(data)
	return columns, data, {"reminder_count": reminder_count}

@frappe.whitelist()
def get_reminder_count(filters=None):
	reminder_count=0
	if isinstance(filters, str):
		filters = frappe.parse_json(filters)
	if not filters.to_date or not filters.from_date:
		return {"reminder_count": 0}
	if filters.to_date < filters.from_date:
		frappe.throw(_('"From Date" can not be greater than or equal to "To Date"'))

	# reminder_filters = get_query_filters(filters)

	# reminder_count = frappe.db.count("Reminders", filters=reminder_filters)
	return {"reminder_count": 3}

def get_columns() -> list[dict]:
	return [
		{
			"label": _("Date"),
			"fieldtype": "Date",
			"fieldname": "date",
			"width": 150,
		},
		{
			"label": _("Patient Name"),
			"fieldtype": "Data",
			"fieldname": "patient_name",
			"width": 200,
		},
		{
			"label": _("Lead"),
			"fieldtype": "Link",
			"fieldname": "lead",
			"options": "Lead",
			"width": 130,
		},
		{
			"label": _("Executive"),
			"fieldtype": "Data",
			"fieldname": "executive",
			"width": 120,
		},
		{
			"label": _("Description"),
			"fieldtype": "Text",
			"fieldname": "description",
			"width": 400,
		},
		{
			"label": _("Status"),
			"fieldtype": "Select",
			"fieldname": "status",
			"width": 80,
			"options": ["Open", "Close"],
		},
		{
			"label": _("Center"),
			"fieldtype": "Data",
			"fieldname": "center",
			"width": 120,
		},
		{
			"label": _("Distance"),
			"fieldtype": "Data",
			"fieldname": "distance",
			"width": 120,
		},
		{
			"label": _("Contact Number"),
			"fieldtype": "Data",
			"fieldname": "contact_number",
			"width": 160,
		},
		{
			"label": _("Alternative Number"),
			"fieldtype": "Data",
			"fieldname": "alternative_number",
			"width": 160,
		},
		{
			"label": _("Service"),
			"fieldtype": "Data",
			"fieldname": "service",
			"width": 120,
		},
		{
			"label": _("City"),
			"fieldtype": "Data",
			"fieldname": "city",
			"width": 120,
		},
		{
			"label": _("Lead Status"),
			"fieldtype": "Data",
			"fieldname": "lead_status",
			"width": 120,
		},
		{
			"label": _("Active / Inactive Status"),
			"fieldtype": "Select",
			"fieldname": "active_inactive_status",
			"width": 150,
		},
		{
			"label": _("Lead Mode"),
			"fieldtype": "Data",
			"fieldname": "mode",
			"width": 120,
		},
		{
			"label": _("Source"),
			"fieldtype": "Data",
			"fieldname": "source",
			"width": 120,
		},
		{
			"label": _("Sub Source"),
			"fieldtype": "Data",
			"fieldname": "subsource",
			"width": 120,
		},
		{
			"label": _("Consultation Date"),
			"fieldtype": "Date",
			"fieldname": "cs_date",
			"width": 150,
		},
		{
			"label": _("Consultation Status"),
			"fieldtype": "Data",
			"fieldname": "cs_status",
			"width": 120,
		},
  {
			"label": _("Surgery Status"),
			"fieldtype": "Data",
			"fieldname": "surgery_status",
			"width": 120,
		},
  {
			"label": _("Surgery Date"),
			"fieldtype": "Data",
			"fieldname": "surgery_date",
			"width": 120,
		},
  
  
	]


def get_query_filters(filters):
	if filters.to_date < filters.from_date:
		frappe.throw(_('"From Date" cannot be greater than or equal to "To Date"'))

	today_date = today()
	status, from_date, to_date = filters.status, filters.from_date, filters.to_date
	if status == "Missed":
		from_date = from_date if from_date <= today_date else today_date
		to_date = add_days(today_date, -1) if to_date >= today_date else to_date
	elif status == "Upcoming":
		from_date = add_days(today_date, 1) if from_date < today_date else from_date
		to_date = to_date if to_date >= today_date else add_days(today_date, 1)

	reminder_filters = {
		"date": ["between", [from_date, to_date]],
	}
	if filters.executive:
		executives = frappe.db.get_all(
        "Executive",
        filters={"name": ["like", f"%{filters.executive}%"]},
        # or_filters={"fullname": ["like", f"%{filters.executive}%"]},  # Check both name and username
        fields=["name", "fullname"]
        )
		if executives:
			executive_names = [exec["name"] for exec in executives]
			executive_usernames = [exec["fullname"] for exec in executives]
			reminder_filters["executive"] = ["in", executive_names + executive_usernames]
		else:
			reminder_filters["executive"] = ["in", filters.executive]

	if filters.center:
		reminder_filters["center"] = filters.center
	if filters.status:
		reminder_filters["status"] = "Open" if filters.status in ["Missed", "Upcoming"] else "Close"
	if filters.lead_status:
		reminder_filters["lead_status"] = filters.lead_status
	if filters.lead_mode:
		reminder_filters["mode"] = filters.lead_mode
	if filters.source:
		reminder_filters["cs.lead_source"] = filters.source
	if filters.cs_date:
		reminder_filters["cs_date"] = filters.cs_date
	if filters.cs_status:
		reminder_filters["cs.status"] = filters.cs_status
	if filters.surgery_date:
		reminder_filters["surgery.surgery_date"] = filters.surgery_date
	if filters.surgery_status:
		reminder_filters["surgery.surgery_status"] = filters.surgery_status

	user = frappe.session.user
	is_executive = frappe.db.exists("Executive", {'email': user})
	roles = frappe.get_roles()
	is_marketing_head = "Marketing Head" in roles
	
	if is_executive and not is_marketing_head:
			executive = frappe.db.get_value('Executive', {'email': user}, ['name', 'fullname'], as_dict=1)
			if executive:
					reminder_filters["executive"] = ["in", [executive.name, executive.fullname]]
	
	return reminder_filters


def get_data(filters):
    if filters.to_date < filters.from_date:
        frappe.throw(_('"From Date" cannot be greater than or equal to "To Date"'))

    today_date = today()
    status, from_date, to_date = filters.status, filters.from_date, filters.to_date
    if status == "Missed":
        from_date = from_date if from_date <= today_date else today_date
        to_date = add_days(today_date, -1) if to_date >= today_date else to_date
    elif status == "Upcoming":
        from_date = add_days(today_date, 1) if from_date < today_date else from_date
        to_date = to_date if to_date >= today_date else add_days(today_date, 1)

    query = """
        SELECT 
            rm.name AS reminder_id, 
            l.name AS lead,
            l.full_name,
            rm.date, 
            rm.status, 
            rm.executive,
            rm.description, 
            rm.center, 
            rm.distance, 
            rm.contact_number, 
            rm.alternative_number,
            rm.service, 
            rm.city, 
            rm.lead_status, 
            l.mode, 
            l.source,
            l.subsource,
            l.active_inactive_status,
            latest_consultation.latest_consultation_date AS cs_date, 
            latest_consultation.cs_status, 
            latest_surgery.latest_surgery_date AS surgery_date, 
            latest_surgery.surgery_status
        FROM 
            `tabReminders` rm
        LEFT JOIN 
            `tabLead` l ON l.name = rm.parent
        LEFT JOIN 
            (SELECT patient, MAX(date) AS latest_consultation_date, status AS cs_status
             FROM `tabConsultation` 
             WHERE date BETWEEN %(from_date)s AND %(to_date)s
             GROUP BY patient) latest_consultation
            ON latest_consultation.patient = l.name
        LEFT JOIN 
            (SELECT patient, MAX(surgery_date) AS latest_surgery_date, surgery_status
             FROM `tabSurgery` 
             WHERE surgery_date BETWEEN %(from_date)s AND %(to_date)s
             GROUP BY patient) latest_surgery
            ON latest_surgery.patient = l.name
        WHERE 
            rm.date BETWEEN %(from_date)s AND %(to_date)s AND l.status != 'Duplicate Lead'
    """

    params = {
        "from_date": filters.from_date,
        "to_date": filters.to_date,
    }

    if filters.executive:
        query += """
            AND (
                rm.executive IN (
                    SELECT name FROM `tabExecutive` WHERE name LIKE %(executive_like)s
                )
                OR rm.executive IN (
                    SELECT fullname FROM `tabExecutive` WHERE fullname LIKE %(executive_like)s
                )
            )
        """
        params["executive_like"] = f"%{filters.executive}%"
    if filters.center:
        query += " AND rm.center = %(center)s"
        params["center"] = filters.center
    if filters.lead_status:
        query += " AND rm.lead_status = %(lead_status)s"
        params["lead_status"] = filters.lead_status
    if filters.get("active_inactive_status"):
        query += " AND l.active_inactive_status = %(active_inactive_status)s"
        params["active_inactive_status"] = filters["active_inactive_status"]
    if filters.lead_mode:
        query += " AND l.mode = %(lead_mode)s"
        params["lead_mode"] = filters.lead_mode
    if filters.source:
        query += " AND l.source = %(source)s"
        params["source"] = filters.source
    if filters.subsource:
        query += " AND l.subsource = %(subsource)s"
        params["subsource"] = filters.subsource
    if filters.cs_date:
        query += " AND latest_consultation.latest_consultation_date = %(cs_date)s"
        params["cs_date"] = filters.cs_date
    if filters.cs_status:
        query += " AND latest_consultation.cs_status = %(cs_status)s"
        params["cs_status"] = filters.cs_status
    if filters.surgery_date:
        query += " AND latest_surgery.latest_surgery_date = %(surgery_date)s"
        params["surgery_date"] = filters.surgery_date
    if filters.surgery_status:
        query += " AND latest_surgery.surgery_status = %(surgery_status)s"
        params["surgery_status"] = filters.surgery_status
    if filters.status:
        status_value = "Open" if filters.status in ["Missed", "Upcoming"] else "Close"
        query += " AND rm.status = %(status)s"
        params["status"] = status_value
	
    user = frappe.session.user
    is_executive = frappe.db.exists("Executive", user)
    roles = frappe.get_roles()
    is_marketing_head = "Marketing Head" in roles
    if is_executive and not is_marketing_head:
        executive = frappe.db.get_value("Executive", user, "name")
        params["executive_like"] = f"%{executive}%"

    user = frappe.session.user
    is_executive = frappe.db.exists("Executive", {'email': user})
    roles = frappe.get_roles()
    is_marketing_head = "Marketing Head" in roles
    
    if is_executive and not is_marketing_head:
        executive = frappe.db.get_value('Executive', {'email': user}, ['name', 'fullname'], as_dict=1)
        if executive and executive.get("name") and executive.get("fullname"):
            query += " AND rm.executive IN (%(executive_name)s, %(executive_fullname)s)"
            params["executive_name"] = executive["name"]
            params["executive_fullname"] = executive["fullname"]
    
    # Apply center filtering for Marketing Head(new) role
    query, params = apply_marketing_head_center_filter(query, params, center_field="center", table_alias="rm")

    rows = frappe.db.sql(query, params, as_dict=True)

    final_rows = []
    for row in rows:
        new_row = {
            "date": row.date,
            "patient_name": row.full_name,
            "executive": row.executive,
            "description": row.description,
            "status": row.status,
            "lead": row.lead,
            "contact_number": row.contact_number,
            "alternative_number": row.alternative_number,
            "service": row.service,
            "city": row.city,
            "center": row.center,
            "distance": row.distance,
            "lead_status": row.lead_status,
            "active_inactive_status": row.active_inactive_status,
            "mode": row.mode,
            "source": row.source,
            "subsource": row.subsource if row.source == "Meta" else "",
            "cs_date": row.cs_date,
            "cs_status": row.cs_status,
            "surgery_date": row.surgery_date,
            "surgery_status": row.surgery_status
        }
        final_rows.append(new_row)

    return final_rows

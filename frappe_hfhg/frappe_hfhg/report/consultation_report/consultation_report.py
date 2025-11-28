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
	if not filters.to_date or not filters.from_date:
		frappe.throw(_('"From Date" and "To Date" are mandatory'))
	if filters.to_date < filters.from_date:
		frappe.throw(_('"From Date" can not be greater than "To Date"'))

	columns = get_columns()
	data = get_data(filters)
	consultation_count = len(data)
	return columns, data, {"consultation_count": consultation_count}


def get_columns() -> list[dict]:
	return [
		{
			"label": _("Patient Name"),
			"fieldtype": "Data",
			"fieldname": "patient_name",
			"width": 150,
		},
		{
			"label": _("Month"),
			"fieldtype": "Data",
			"fieldname": "month",
			"width": 150,
		},
		{
			"label": _("Year"),
			"fieldtype": "Data",
			"fieldname": "year",
			"width": 150,
		},
		{
			"label": _("Lead Date"),
			"fieldtype": "Date",
			"fieldname": "lead_date",
			"width": 150,
		},
		{
			"label": _("Consultation Date"),
			"fieldtype": "Date",
			"fieldname": "consultation_date",
			"width": 150,
		},
		{
            "label": _("Prospect Date"),
            "fieldtype": "Date",
            "fieldname": "costing_date",
            "width": 150,
        },
		{
            "label": _("Booking Date"),
            "fieldtype": "Date",
            "fieldname": "book_date",
            "width": 150,
        },
        {
            "label": _("Surgery Date"),
            "fieldtype": "Date",
            "fieldname": "surgery_date",
            "width": 150,
        },
		{
			"label": _("Surgery Status"),
			"fieldtype": "Data",
			"fieldname": "surgery_status",
			"width": 150,
		},
		{
			"label": _("Source"),
			"fieldtype": "Data",
			"fieldname": "source",
			"width": 150,
		},
		
		{
			"label": _("Center"),
			"fieldtype": "Data",
			"fieldname": "center",
			"width": 150,
		},
		{
			"label": _("Doctor"),
			"fieldtype": "Link",
			"fieldname": "doctor",
			"options": "Doctor",
			"width": 150,
		},
		{
			"label": _("Profession"),
			"fieldtype": "Data",
			"fieldname": "profession",
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
			"label": _("Paid/FOC"),
			"fieldtype": "Data",
			"fieldname": "payment",
			"width": 150,
		},
		{
			"label": _("Executive"),
			"fieldtype": "Data",
			"fieldname": "executive",
			"width": 150,
		},
		{
			"label": _("Old Executive"),
			"fieldtype": "Data",
			"fieldname": "old_executive",
			"width": 150,
		},
		{
			"label": _("Executive Changed Date"),
			"fieldtype": "Date",
			"fieldname": "executive_changed_date",
			"width": 190,
		},
		{
			"label": _("CS Status"),
			"fieldtype": "Data",
			"fieldname": "cs_status",
			"width": 150,
		},
		{
			"label": _("Assign By"),
			"fieldtype": "Data",
			"fieldname": "assign_by",
			"width": 150,
		},
		{
			"label": _("Campaign"),
			"fieldtype": "Data",
			"fieldname": "campaign_name",
			"width": 150,
		},
		{
			"label": _("Lead Mode"),
			"fieldtype": "Data",
			"fieldname": "mode",
			"width": 150,
		},
		{
			"label": _("CS Mode"),
			"fieldtype": "Data",
			"fieldname": "apnt_mode",
			"width": 150,
		},
		{
			"label": _("HT Eligible"),
			"fieldtype": "Data",
			"fieldname": "ht_eligible",
			"width": 150,

		},
		{
			"label": _("HT Eligible Reason"),
			"fieldtype": "Data",
			"fieldname": "ht_eligible_reason",
			"width": 150,
		},
		{
			"label": _("Lead Status"),
			"fieldtype": "Data",
			"fieldname": "lead_status",
			"width": 150,
		},
		{
			"label": _("Active / Inactive Status"),
			"fieldtype": "Select",
			"fieldname": "active_inactive_status",
			"width": 150,
		},
		{
            "label": _("Reference name"),
            "fieldtype": "Data",
            "fieldname": "source_reference",
            "width": 150,
        },
		{
            "label": _("Handle by"),
            "fieldtype": "Data",
            "fieldname": "handle_by",
            "width": 150,
        },
	]


def get_data(filters: Filters) -> list[dict]:
	rows = []
	if filters.to_date < filters.from_date:
		frappe.throw(_('"From Date" cannot be greater than "To Date"'))

	query = """
		SELECT 
			c.date,
			c.name,
			c.first_name,
			c.profession,
			c.status as cs_status,
			c.city, 
			c.center, 
			c.doctor,
			c.previous_executive as old_executive, 
			c.executive_changed_date,
			c.payment,
			c.mode as apnt_mode,
			c.handle_by,
			l.name AS patient,
			c.executive, 
			l.source, 
			l.campaign_name, 
			l.contact_number, 
			l.ht_eligible, 
			l.assign_by, 
			l.mode, 
			l.full_name,
			l.status as lead_status, 
			l.created_on,
			l.ht_eligible_reason,
			l.source_reference,
			l.active_inactive_status,
			latest_surgery.surgery_date, 
			latest_surgery.surgery_status,
			latest_costing.booking_date AS costing_date,
			latest_costing.book_date
		FROM 
			`tabConsultation` c
		LEFT JOIN 
			`tabLead` l
		ON 
			c.patient = l.name
		LEFT JOIN 
			(SELECT patient, MAX(surgery_date) AS surgery_date, surgery_status
				FROM `tabSurgery` 
				GROUP BY patient) latest_surgery
		ON 
			latest_surgery.patient = l.name
		LEFT JOIN 
			(SELECT patient, MAX(booking_date) AS booking_date, book_date
				FROM `tabCosting` 
				GROUP BY patient) latest_costing
		ON 
			latest_costing.patient = l.name
		WHERE 
			c.date BETWEEN %(from_date)s AND %(to_date)s
			AND c.status IN ("Booked","Medi-PRP","Non Booked","Spot Booking")
	"""

	params = {
		"from_date": filters.get("from_date"),
		"to_date": filters.get("to_date"),
	}

	if filters.get("cs_status"):
		query += "AND c.status = %(cs_status)s"
		params["cs_status"] = filters["cs_status"]

	if filters.get("lead_status"):
		query += "AND l.status = %(lead_status)s"
		params["lead_status"] = filters["lead_status"]

	if filters.get("active_inactive_status"):
		query += " AND l.active_inactive_status = %(active_inactive_status)s"
		params["active_inactive_status"] = filters["active_inactive_status"]

	if filters.get("center"):
		query += " AND c.center = %(center)s"
		params["center"] = filters["center"]

	if filters.get("executive"):
		query += " AND c.executive = %(executive)s"
		params["executive"] = filters["executive"]

	if filters.get("source"):
		query += " AND l.source = %(source)s"
		params["source"] = filters["source"]

	if filters.get("apnt_mode"):
		query += " AND c.mode LIKE %(apnt_mode)s"
		params["apnt_mode"] = f"%{filters['apnt_mode']}%"

	if filters.get("mode"):
		query += " AND l.mode = %(mode)s"
		params["mode"] = filters["mode"]

	if filters.get("handle_by"):
		query += " AND c.handle_by LIKE %(handle_by)s"
		params["handle_by"] = f"%{filters['handle_by']}%"

	if filters.get("profession"):
		query += " AND c.profession LIKE %(profession)s"
		params["profession"] = f"%{filters['profession']}%"

	if filters.get("surgery_status"):
		query += " AND latest_surgery.surgery_status = %(surgery_status)s"
		params["surgery_status"] = filters["surgery_status"]
        
	if filters.get("have_surgery") == "Yes":
		query += " AND latest_surgery.surgery_date IS NOT NULL"
	elif filters.get("have_surgery") == "No":
		query += " AND latest_surgery.surgery_date IS NULL"

	if filters.get("have_costing") == "Yes":
		query += " AND latest_costing.booking_date IS NOT NULL"
	elif filters.get("have_costing") == "No":
		query += " AND latest_costing.booking_date IS NULL"

	user = frappe.session.user
	is_receptionist = frappe.db.exists("Receptionist", {"email": user})
	is_executive = frappe.db.exists("Executive", {"email": user})
	roles = frappe.get_roles()
	is_marketing_head = "Marketing Head" in roles

	if is_receptionist and not is_marketing_head:
		receptionist = frappe.db.get_value("Receptionist", {"email": user}, "name")
		if receptionist:
			center = frappe.db.get_value("Center", {"receptionist": receptionist}, "name")
			if is_executive:
				executive = frappe.db.get_value("Executive", {"email": user}, "name")
				new_center = frappe.db.get_value("Center", {"clinic_manager": user}, "name")
				if executive:
					query += " AND (c.executive = %(executive)s OR c.center = %(center)s)"
					params["executive"] = executive
					params["center"] = new_center
			else:
				if center:
					query += " AND c.center = %(center)s"
					params["center"] = center
	elif is_executive and not is_marketing_head:
		executive = frappe.db.get_value("Executive", {"email": user}, "name")
		if executive:
			query += " AND c.executive = %(executive)s"
			params["executive"] = executive

	consultations = frappe.db.sql(query, params, as_dict=True)

	for consultation in consultations:
		
		row = {
			"month": consultation.get("created_on").strftime("%B"),
            "year": consultation.get("created_on").strftime("%Y"),
			"lead_date": consultation.get("created_on"),
			"source": consultation.get("source"),
			"assign_by": consultation.get("assign_by"),
			"campaign_name": consultation.get("campaign_name"),
			"mode": consultation.get("mode"),
			"apnt_mode": consultation.get("apnt_mode"),
			"patient_name": f'<strong><a href="/app/consultation/{quote(consultation.get("name"), safe="")}" style="color: inherit;">{consultation.get("full_name")}</a></strong>',
			"phone_no": consultation.get("contact_number"),
			"city": consultation.get("city"),
			"center": consultation.get("center"),
			"executive": consultation.get("executive"),
			"old_executive": consultation.get("old_executive"),
			"executive_changed_date": consultation.get("executive_changed_date"),
			"payment": consultation.get("payment"),
			"cs_status": consultation.get("cs_status"),
			"consultation_date": consultation.get("date"),
			"doctor": consultation.get("doctor"),
			"ht_eligible": consultation.get("ht_eligible"),
			"ht_eligible_reason": consultation.get("ht_eligible_reason"),
			"lead_status": consultation.get("lead_status"),
			"active_inactive_status": consultation.get("active_inactive_status"),
			"costing_date": consultation.get("costing_date"),
			"book_date": consultation.get("book_date"),
			"surgery_date": consultation.get("surgery_date"),
			"source_reference": consultation.get("source_reference"),
			"handle_by": consultation.get("handle_by"),
			"surgery_status": consultation.get("surgery_status"),
			"profession": consultation.get("profession")
		}
		rows.append(row)
	rows = sorted(rows, key=lambda x: x.get("consultation_date") or "")

	return rows

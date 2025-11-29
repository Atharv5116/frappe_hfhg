# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import datetime
import frappe
from frappe import _
from urllib.parse import quote

Filters = frappe._dict

@frappe.whitelist()
def execute(filters = None) -> tuple:
	if isinstance(filters, str):
		filters = frappe.parse_json(filters)
	if not filters.to_date or not filters.from_date:
		frappe.throw(_('"From Date" and "To Date" are mandatory'))
	if filters.to_date <= filters.from_date:
		frappe.throw(_('"From Date" can not be greater than or equal to "To Date"'))

	columns = get_columns()
	data = get_data(filters)
	total_amount = sum([row['package'] for row in data])
	total_booking_amount = sum([row['booking_amount'] for row in data])
	costing_count = len(data)
	return columns, data, { "total_amount": total_amount, "total_booking_amount":total_booking_amount, "costing_count": costing_count}


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
			"label": _("Lead Entered Date"),
			"fieldtype": "Date",
			"fieldname": "lead_date",
			"width": 150,
		},
		{
			"label": _("Booking Date"),
			"fieldtype": "Date",
			"fieldname": "booking_date",
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
			"label": _("Consultation Date"),
			"fieldtype": "Date",
			"fieldname": "consultation_date",
			"width": 150,
		},
		{
			"label": _("Consultation Status"),
			"fieldtype": "Data",
			"fieldname": "consultation_status",
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
			"label": _("Technique Name"),
			"fieldtype": "Data",
			"fieldname": "technique",
			"width": 140,
		},
		{
			"label": _("Grafts"),
			"fieldtype": "Data",
			"fieldname": "grafts",
			"width": 150,
		},
		{
			"label": _("Package"),
			"fieldtype": "Data",
			"fieldname": "package",
			"width": 150,
		},
		{
			"label": _("Booking Amount"),
			"fieldtype": "Data",
			"fieldname": "booking_amount",
			"width": 150,
		},
		{
			"label": _("Booking GST"),
			"fieldtype": "Data",
			"fieldname": "booking_gst",
			"width": 150,
		},
		{
			"label": _("Pending Amount"),
			"fieldtype": "Data",
			"fieldname": "pending_amount",
			"width": 150,
		},
		{
			"label": _("Payment Mode"),
			"fieldtype": "Data",
			"fieldname": "payment_mode",
			"width": 150,
		},
		{
			"label": _("Payment In"),
			"fieldtype": "Data",
			"fieldname": "payment_in",
			"width": 150,
		},
		{
			"label": _("Source"),
			"fieldtype": "Data",
			"fieldname": "source",
			"width": 150,
		},
		{
			"label": _("Payment Status"),
			"fieldtype": "Data",
			"fieldname": "payment_status",
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
			"fieldname": "lead_mode",
			"width": 150,
		},
		{
			"label": _("Campaign Name"),
			"fieldtype": "Data",
			"fieldname": "campaign_name",
			"width": 150,
		},
		{
			"label": _("Lead Status"),
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

def get_data(filters) -> list[dict]:
	if filters.to_date <= filters.from_date:
		frappe.throw(_('"From Date" cannot be greater than or equal to "To Date"'))

	rows = []

	query = """
		SELECT 
			c.*, 
			l.name AS lead_name,
			l.source, 
			l.campaign_name, 
			l.contact_number, 
			l.city, 
			c.center, 
			l.distance, 
			l.executive, 
			l.assign_by, 
			l.mode, 
			l.service, 
			l.status as lead_status, 
			l.full_name,
			l.active_inactive_status,
			latest_consultation.date AS consultation_date, 
			latest_consultation.status as consultation_status,
			latest_surgery.surgery_date,
			latest_surgery.surgery_status
		FROM 
			`tabCosting` c
		LEFT JOIN 
			`tabLead` l
		ON 
			c.patient = l.name
		LEFT JOIN 
			(SELECT patient, MAX(date) AS date, status
				FROM `tabConsultation` 
				GROUP BY patient) latest_consultation
		ON 
			latest_consultation.patient = l.name
		LEFT JOIN 
			(SELECT patient, MAX(surgery_date) AS surgery_date, surgery_status
				FROM `tabSurgery` 
				GROUP BY patient) latest_surgery
		ON 
			latest_surgery.patient = l.name
		WHERE 
			c.booking_date BETWEEN %(from_date)s AND %(to_date)s
	"""

	params = {
		"from_date": filters.get("from_date"),
		"to_date": filters.get("to_date"),
	}

	if filters.center:
		query += " AND c.center = %(center)s"
		params["center"] = filters.center

	if filters.executive:
		query += " AND c.executive = %(executive)s"
		params["executive"] = filters.executive

	if filters.source:
		query += " AND l.source = %(source)s"
		params["source"] = filters["source"]

	if filters.status:
		query += " AND c.status = %(status)s"
		params["status"] = filters["status"]

	if filters.lead_status:
		query += " AND l.status = %(lead_status)s"
		params["lead_status"] = filters["lead_status"]

	if filters.get("active_inactive_status"):
		query += " AND l.active_inactive_status = %(active_inactive_status)s"
		params["active_inactive_status"] = filters["active_inactive_status"]

	if filters.mode:
		query += " AND l.mode = %(mode)s"
		params["mode"] = filters["mode"]

	if filters.surgery_status:
		query += " AND latest_surgery.surgery_status = %(surgery_status)s"
		params["surgery_status"] = filters["surgery_status"]

	if filters.get("cs_status"):
		query += " AND latest_consultation.status = %(cs_status)s"
		params["cs_status"] = filters["cs_status"]

	if filters.get("have_surgery") == "Yes":
		query += " AND latest_surgery.surgery_date IS NOT NULL"
	elif filters.get("have_surgery") == "No":
		query += " AND latest_surgery.surgery_date IS NULL"

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

	costings = frappe.db.sql(query, params, as_dict=True)
	for costing in costings:
		payment_mode = ""
		payment_in = ""
		booking_payment = None

		booking_payment_exists = frappe.db.exists("Payment", {"payment_type": "Costing", "type": "Payment", "patient": costing.get("patient")}, ["*"])
		if booking_payment_exists:
			booking_payment = frappe.get_doc("Payment", {"payment_type": "Costing", "type": "Payment", "patient": costing.get("patient")}, ["*"])
			if booking_payment:
				if booking_payment.get("with_gst_amount") and len(booking_payment.get("gst_payment_entries")) > 0:
					payment_mode = booking_payment.get("gst_payment_entries")[0].get("method")
					payment_in = booking_payment.get("gst_payment_entries")[0].get("payment_in")
				elif booking_payment.get("without_gst_amount") and len(booking_payment.get("payment_entries")) > 0:
					payment_mode = booking_payment.get("payment_entries")[0].get("method")
					payment_in = booking_payment.get("payment_entries")[0].get("payment_in")
			
		row = {
			"month": costing.get("booking_date").strftime("%B") if costing.get("booking_date") else "",
			"year": costing.get("booking_date").strftime("%Y") if costing.get("booking_date") else "",
			"surgery_date": costing.get("surgery_date"),
			"source": costing.get("lead_source"),
			"center": costing.get("center"),
			"technique": costing.get("technique"),
			"patient_name": f'<strong><a href="/app/costing/{quote(costing.get("name"), safe="")}"style="color: inherit;">{costing.get("full_name")}</a></strong>',
			"phone_no": costing.get("contact_number"),
			"city": costing.get("city"),
			"executive": costing.get("executive"),
			"grafts": costing.get("grafts"),
			"package": costing.get("total_amount"),
			"pending_amount": costing.get("pending_amount"),
			"booking_amount": booking_payment.get("total_amount") if booking_payment else 0,
			"booking_gst": booking_payment.get("with_gst_amount") if booking_payment else 0,
			"payment_mode": payment_mode,
			"payment_in": payment_in,
			"booking_date": costing.get("booking_date"),
			"lead_date": costing.get("lead_created_date"),
			"surgery_date": costing.get("surgery_date"),
			"consultation_date": costing.get("consultation_date"),
			"payment_status": costing.get("status"),
			"assign_by": costing.get("assign_by"),
			"lead_mode": costing.get("mode"),
			"campaign_name": costing.get("campaign_name"),
			"status": costing.get("lead_status"),
			"active_inactive_status": costing.get("active_inactive_status"),
			"surgery_status": costing.get("surgery_status"),
			"consultation_status": costing.get("consultation_status")

		}
		rows.append(row)
	rows = sorted(rows, key=lambda x: x.get("booking_date") or "")

	return rows

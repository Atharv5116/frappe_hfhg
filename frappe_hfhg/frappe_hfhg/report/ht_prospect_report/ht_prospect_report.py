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
    if not filters.get('from_date') or not filters.get('to_date'):
        frappe.throw(_("Both 'From Date' and 'To Date' must be provided"))

    # Now it's safe to compare them
    if filters.to_date <= filters.from_date:
        frappe.throw(_('"From Date" cannot be greater than or equal to "To Date"'))

    columns = get_columns()
    data = get_data(filters)
    ht_prospect_count = len(data)
    total_amount = sum([row['package'] for row in data])
	
    return columns, data, {"total_amount": total_amount, "ht_prospect_count": ht_prospect_count}

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
			"label": _("Prospect Date"),
			"fieldtype": "Date",
			"fieldname": "booking_date",
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
			"label": _("Technique"),
			"fieldtype": "Data",
			"fieldname": "technique",
			"width": 150,
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
			"fieldname": "mode",
			"width": 150,
		},
		{
			"label": _("Lead Status"),
			"fieldtype": "Data",
			"fieldname": "lead_status",
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
	]

def get_data(filters) -> list[dict]:
	if filters.to_date <= filters.from_date:
		frappe.throw(_('"From Date" cannot be greater than or equal to "To Date"'))
	rows = []
	query = """
        SELECT
		   c.*, l.mode, l.status as lead_status, l.campaign_name, l.full_name,
		   latest_consultation.date AS consultation_date,
		   latest_consultation.status AS consultation_status, 
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
			AND c.status = "prospect"
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
		query += " AND c.lead_source = %(source)s"
		params["source"] = filters["source"]

	if filters.lead_status:
		query += " AND l.status = %(lead_status)s"
		params["lead_status"] = filters["lead_status"]

	if filters.mode:
		query += " AND l.mode = %(mode)s"
		params["mode"] = filters["mode"]

	if filters.get("surgery_status"):
		query += " AND latest_surgery.surgery_status = %(surgery_status)s"
		params["surgery_status"] = filters["surgery_status"]

	if filters.get("cs_status"):
		query += " AND latest_consultation.status = %(cs_status)s"
		params["cs_status"] = filters["cs_status"]  
		
	bookings = frappe.db.sql(query,params, as_dict=True)
	# bookings = frappe.get_all("Costing", fields=["*"], filters={
	# 	"booking_date": ["between", [filters.from_date, filters.to_date]],
	# 	"status": "prospect"
	# })
	user = frappe.session.user
	is_receptionist = frappe.db.exists("Receptionist", {'email': user})
	is_executive = frappe.db.exists("Executive", {'email': user})
	roles = frappe.get_roles()
	is_marketing_head = True if "Marketing Head" in roles else False

	if is_receptionist and not is_marketing_head:
		receptionist = frappe.db.get_value('Receptionist', {'email': user}, ['name', 'email'], as_dict=1)
		center = frappe.db.get_value('Center', {'clinic_manager': receptionist.email}, ['name'], as_dict=1)
		if is_executive:
			executive = frappe.db.get_value('Executive', {'email': user}, ['name'], as_dict=1)
			bookings = list(filter(lambda x: x.get("executive") == executive.name or x.get("center") == center.name, bookings))
		else:
			bookings = list(filter(lambda x: x.get("center") == center.name, bookings))

	elif is_executive and not is_marketing_head:
		executive = frappe.db.get_value('Executive', {'email': user}, ['name'], as_dict=1)
		bookings = list(filter(lambda x: x.get("executive") == executive.name, bookings))

	
			
	for surgery in bookings:
		payment_mode = ""
		booking_payment = None
		booking_payment_exists = frappe.db.exists("Payment", {"payment_type": "Costing", "type": "Payment", "patient": surgery.get("patient")}, ["*"])
		if booking_payment_exists:
			booking_payment = frappe.get_doc("Payment", {"payment_type": "Costing", "type": "Payment", "patient": surgery.get("patient")}, ["*"])
			if booking_payment:
				if booking_payment.get("with_gst_amount") and len(booking_payment.get("gst_payment_entries")) > 0:
					payment_mode = booking_payment.get("gst_payment_entries")[0].get("method")
				elif booking_payment.get("without_gst_amount") and len(booking_payment.get("payment_entries")) > 0:
					payment_mode = booking_payment.get("payment_entries")[0].get("method")
			
		row = {
			"month": surgery.get("booking_date").strftime("%B") if surgery.get("booking_date") else "",
			"year": surgery.get("booking_date").strftime("%Y") if surgery.get("booking_date") else "",
			"source": surgery.get("lead_source"),
			"center": surgery.get("center"),
			"patient_name": f'<strong><a href="/app/costing/{quote(surgery.get("name"), safe="")}" style="color: inherit;">{surgery.get("full_name")}</a></strong>',
			"phone_no": surgery.get("contact_number"),
			"city": surgery.get("city"),
			"executive": surgery.get("executive"),
			"technique": surgery.get("technique"),
			"grafts": surgery.get("grafts"),
			"package": surgery.get("total_amount"),
			"pending_amount": surgery.get("pending_amount"),
			"booking_amount": booking_payment.get("total_amount") if booking_payment else 0,
			"booking_gst": booking_payment.get("with_gst_amount") if booking_payment else 0,
			"payment_mode": payment_mode,
			"booking_date": surgery.get("booking_date"),
			"lead_date": surgery.get("lead_created_date"),
			"payment_status": surgery.get("status"),
			"assign_by": surgery.get("assign_by"),
			"mode": surgery.get("mode"),
			"lead_status": surgery.get("lead_status"),
			"surgery_date": surgery.get("surgery_date"),
			"surgery_status": surgery.get("surgery_status"),
			"consultation_date": surgery.get("consultation_date"),
			"consultation_status": surgery.get("consultation_status")

		}
		rows.append(row)
	rows = sorted(rows, key=lambda x: x.get("booking_date") or "")

	return rows

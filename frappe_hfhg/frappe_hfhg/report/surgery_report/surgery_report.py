# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from urllib.parse import quote
from pypika.functions import Max

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
	total_values = {
		"grafts": sum([row.get("grafts", 0) or 0 for row in data]),
        "package": sum([row.get("package", 0) or 0 for row in data]),
        "inflow": sum([row.get("inflow", 0) or 0 for row in data]),
        "booking_amount": sum([row.get("booking_amount", 0) or 0 for row in data]),
        "discount": sum([row.get("discount", 0) or 0 for row in data]),
        "cash": sum([row.get("cash", 0) or 0 for row in data]),
        "online_llp": sum([row.get("online_llp", 0) or 0 for row in data]),
        "card": sum([row.get("card", 0) or 0 for row in data]),
        "gst": sum([row.get("gst", 0) or 0 for row in data]),
        "due_amount": sum([row.get("due_amount", 0) or 0 for row in data]),
        "booking_gst": sum([row.get("booking_gst", 0) or 0 for row in data]),
        "refund": sum([row.get("refund", 0) or 0 for row in data]),
    }
	total_row = {
        "patient_name": "Total",
	    "grafts": f"<b>{total_values['grafts']}</b>",
        "package": f"<b>{total_values['package']}</b>",
        "inflow": f"<b>{total_values['inflow']}</b>",
        "booking_amount": f"<b>{total_values['booking_amount']}</b>",
        "discount": f"<b>{total_values['discount']}</b>",
        "cash": f"<b>{total_values['cash']}</b>",
        "online_llp": f"<b>{total_values['online_llp']}</b>",
        "card": f"<b>{total_values['card']}</b>",
        "gst": f"<b>{total_values['gst']}</b>",
        "due_amount": f"<b>{total_values['due_amount']}</b>",
        "booking_gst": f"<b>{total_values['booking_gst']}</b>",
        "refund": f"<b>{total_values['refund']}</b>",
    }

	for col in columns:
		fieldname = col["fieldname"]
		if fieldname not in total_row:
			total_row[fieldname] = ""

	surgery_count = len(data)

	data.append(total_row)
	
	return columns, data, { "total_amount": total_values["package"] }, { "total_inflow": total_values["inflow"], "surgery_count": surgery_count}


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
			"label": _("Prospect Date"),
			"fieldtype": "Date",
			"fieldname": "prospect_date",
			"width": 150,
		},
		{
			"label": _("Booking Date"),
			"fieldtype": "Date",
			"fieldname": "booking_date",
			"width": 150,
		},
		{
			"label": _("Booking Transaction Date"),
			"fieldtype": "Date",
			"fieldname": "booking_transaction_date",
			"width": 150,
		},
		{
			"label": _("Surgery Transaction Date"),
			"fieldtype": "Date",
			"fieldname": "surgery_transaction_date",
			"width": 150,
		},
		{
			"label": _("Surgery Date"),
			"fieldtype": "Date",
			"fieldname": "surgery_date",
			"width": 150,
		},
		{
			"label": _("Status"),
			"fieldtype": "Data",
			"fieldname": "status",
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
			"label": _("Lead Entered Date"),
			"fieldtype": "Date",
			"fieldname": "lead_date",
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
			"label": _("Inflow"),
			"fieldtype": "Data",
			"fieldname": "inflow",
			"width": 150,
		},
		{
			"label": _("Executive"),
			"fieldtype": "Data",
			"fieldname": "executive",
			"width": 150,
		},
		{
			"label": _("Lead Status"),
			"fieldtype": "Data",
			"fieldname": "lead_status",
			"width": 150,
		},
		{
			"label": _("Lead Mode"),
			"fieldtype": "Data",
			"fieldname": "mode",
			"width": 150,
		},
		{
            "label": _("Reference name"),
            "fieldtype": "Data",
            "fieldname": "source_reference",
            "width": 150,
        },
		{
            "label": _("BT Status"),
            "fieldtype": "Data",
            "fieldname": "bt_status",
            "width": 150,
        },
	]

def get_data(filters) -> list[dict]:
	rows = []
	if filters.get("to_date") < filters.get("from_date"):
			frappe.throw(_('"From Date" cannot be later than "To Date"'))


	query = """
	    SELECT 
		    s.*, 
			l.status as lead_status,
		    l.full_name,l.campaign_name,
		    l.name as lead_name,l.source_reference,l.mode, 
		    latest_consultation.date AS consultation_date,latest_consultation.status as cs_status,
			c.booking_date as prospect_date,
			c.booking_transaction_date,
			c.total_amount as package
		FROM
		    `tabSurgery` s
		LEFT JOIN
		    `tabLead` l
		ON
		    s.patient = l.name
		LEFT JOIN
		    `tabCosting` c
		ON
		    c.name = s.name
		LEFT JOIN
		    (SELECT patient, MAX(date) AS date, status
            FROM `tabConsultation` 
            GROUP BY patient) latest_consultation
		ON
		    latest_consultation.patient = s.patient
		WHERE
		    s.surgery_date BETWEEN %(from_date)s AND %(to_date)s		
    """
	params = {
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
    }

	if filters.get("center"):
		query += " AND s.center = %(center)s"
		params["center"] = filters["center"]

	if filters.get("executive"):
		query += " AND s.executive = %(executive)s"
		params["executive"] = filters["executive"]

	if filters.get("source"):
		query += " AND s.lead_source = %(source)s"
		params["source"] = filters["source"]

	if filters.get("status"):
		query += " AND s.surgery_status = %(status)s"
		params["status"] = filters["status"]

	if filters.get("lead_status"):
		query += " AND l.status = %(lead_status)s"
		params["lead_status"] = filters["lead_status"]

	if filters.get("mode"):
		query += " AND l.mode LIKE %(mode)s"
		params["mode"] = f"%{filters['mode']}%"

	if filters.get("cs_status"):
		query += " AND latest_consultation.status = %(cs_status)s"
		params["cs_status"] = filters["cs_status"]

	if filters.get("technique"):
		query += " AND s.technique = %(technique)s"
		params["technique"] = filters["technique"]
		
	
	user = frappe.session.user
	is_receptionist = frappe.db.exists("Receptionist", {'email': user})
	is_executive = frappe.db.exists("Executive", {'email': user})
	roles = frappe.get_roles()
	is_marketing_head = True if "Marketing Head" in roles else False

	if is_receptionist and not is_marketing_head:
		receptionist = frappe.db.get_value("Receptionist", {"email": user}, "name")
		if receptionist:
			center = frappe.db.get_value("Center", {"receptionist": receptionist}, "name")
			if is_executive:
				executive = frappe.db.get_value("Executive", {"email": user}, ["name"], as_dict=1)
				new_center = frappe.db.get_value("Center", {"clinic_manager": user}, "name")
				if executive:
					query += " AND s.center = %(center)s"
					params["center"] = new_center
			else:
				if center:
					query += " AND s.center = %(center)s"
					params["center"] = center
	elif is_executive and not is_marketing_head:
		executive = frappe.db.get_value("Executive", {"email": user}, "name")
		if executive:
			query += " AND s.executive = %(executive)s"
			params["executive"] = executive

	surgeries = frappe.db.sql(query, params, as_dict=True)

	# Execute
	# surgeries = surgeries.run(as_dict=True)

	# if is_receptionist and not is_marketing_head:
	# 	receptionist = frappe.db.get_value('Receptionist', {'email': user}, ['name'], as_dict=1)
	# 	center = frappe.db.get_value('Center', {'receptionist': receptionist.name}, ['name'], as_dict=1)
	# 	surgeries = list(filter(lambda x: x.get("center") == center.name, surgeries))
	# elif is_executive and not is_marketing_head:
	# 	executive = frappe.db.get_value('Executive', {'email': user}, ['name'], as_dict=1)
	# 	surgeries = list(filter(lambda x: x.get("executive") == executive.name, surgeries))

	# else:
	# 	if filters.center:
	# 		surgeries = list(filter(lambda x: x.get("center") == filters.center, surgeries))

	# 	if filters.executive:
	# 		surgeries = list(filter(lambda x: x.get("executive") == filters.executive, surgeries))

	# if filters.source:
	# 	surgeries = list(filter(lambda x: filters.source in x.get("source", ""), surgeries))
			
	for surgery in surgeries:
		payment_mode = ""
		payment_in = ""
		booking_payment = None
		booking_gst_amount = 0
		cash, gst, card, online_llp, refund_amount = 0, 0, 0, 0, 0

		booking_payment_exists = frappe.db.exists("Payment", {"payment_type": "Costing", "type": "Payment", "patient": surgery.get("patient")})

		if booking_payment_exists:
			booking_payment = frappe.get_doc("Payment", {"payment_type": "Costing", "type": "Payment", "patient": surgery.get("patient")}, ["*"])
			if booking_payment:
				gst_entries = booking_payment.get("gst_payment_entries", [])
				non_gst_entries = booking_payment.get("payment_entries", [])

				if booking_payment.get("with_gst_amount") and gst_entries:
					payment_mode = gst_entries[0].get("method")
					payment_in = gst_entries[0].get("payment_in")
					booking_gst_amount = gst_entries[0].get("gst_amount")
				elif booking_payment.get("without_gst_amount") and non_gst_entries:
					payment_mode = non_gst_entries[0].get("method")
					payment_in = non_gst_entries[0].get("payment_in")
		
		payments = frappe.get_all("Payment", fields=["*"], filters={
			"payment_type": "Surgery",
			"type": "Payment",
			"patient": surgery.get("name")
		})

		for payment in payments:
			payment_doc = frappe.get_doc("Payment", payment.get("name"))
			gst_entries = payment_doc.get("gst_payment_entries", [])
			non_gst_entries = payment_doc.get("payment_entries", [])

			# GST Payment Entries
			for entry in gst_entries:
					gst += entry.get("gst_amount", 0)
					if entry.get("method") == "Cash":
							cash += entry.get("amount", 0)
					elif entry.get("method") == "Card":
							card += entry.get("amount", 0)
					else:
							online_llp += entry.get("amount", 0)

			# Non-GST Payment Entries
			for entry in non_gst_entries:
					if entry.get("method") == "Cash":
							cash += entry.get("amount", 0)
					elif entry.get("method") == "Card":
							card += entry.get("amount", 0)
					else:
							online_llp += entry.get("amount", 0)
	
		refunds = []
		payment_names = [payment["name"] for payment in payments]
		if payment_names:
			refunds = frappe.get_all(
					"Payment",
					fields=["with_gst_amount", "without_gst_amount"],
					filters={"refund_payment_id": ["in", payment_names]},
			)
			refund_amount = sum(
					refund.get("with_gst_amount", 0) + refund.get("without_gst_amount", 0) for refund in refunds
			)

		# for payment in payments:
		# 	ruffs = frappe.get_all("Payment", fields=["with_gst_amount", "without_gst_amount"], filters={
		# 		"refund_payment_id": payment.name
		# 	})
		# 	refunds.extend(ruffs)
		# refund_amount = 0
		# for refund in refunds:
		# 	refund_amount += refund.get("with_gst_amount")
		# 	refund_amount += refund.get("without_gst_amount")
		
		# lead_name = surgery.get("patient")
		# campaign_name = frappe.get_value("Lead", lead_name, "campaign_name") or ""
		# lead = frappe.get_doc("Lead", lead_name, ["campaign_name", "full_name"])

		row = {
			"month": surgery.get("surgery_date").strftime("%B"),
            "year": surgery.get("surgery_date").strftime("%Y"),
			"surgery_date": surgery.get("surgery_date"),
			"source": surgery.get("lead_source"),
		"status": surgery.get("surgery_status"),
		"center": surgery.get("center"),
		"patient_name": f'<strong><a href="/app/surgery/{quote(surgery.get("name"), safe="")}" style="color: inherit;">{surgery.get("full_name")}</a></strong>',
		"phone_no": surgery.get("contact_number"),
		"city": surgery.get("city"),
			"technique": surgery.get("technique"),
			"executive": surgery.get("executive"),
			"grafts": surgery.get("grafts"),
			"package": surgery.get("package"),
			"inflow": cash + online_llp + card + surgery.get("amount_paid") + gst + booking_gst_amount ,
			"prospect_date": surgery.get("prospect_date"),
			"booking_date": surgery.get("booking_date"),
			"booking_transaction_date": surgery.get("booking_transaction_date"),
			"surgery_transaction_date": surgery.get("surgery_transaction_date"),
			"lead_date": surgery.get("lead_created_date"),
			"lead_status": surgery.get("lead_status"),
			"mode": surgery.get("mode"),
			"source_reference": surgery.get("source_reference"),
			"consultation_date": surgery.get("consultation_date"),
			"consultation_status": surgery.get("cs_status"),
			"bt_status": surgery.get("bt_status"),
		}
		rows.append(row)		
	rows = sorted(rows, key=lambda x: x.get("surgery_date") or "")

	return rows

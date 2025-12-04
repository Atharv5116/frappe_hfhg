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
	total_amount = sum([row['package'] for row in data])
	total_inflow = sum([row['inflow'] for row in data])

	surgery_count = len(data)
	
	return columns, data, { "total_amount": total_amount }, { "total_inflow": total_inflow, "surgery_count": surgery_count}


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
            "label": _("Imported Source"),
            "fieldtype": "Data",
            "fieldname": "imported_source",
            "width": 150,
        },
		{
			"label": _("Campaign"),
			"fieldtype": "Data",
			"fieldname": "campaign_name",
			"width": 150,
		},
		{
            "label": _("Ad Name"),
            "fieldtype": "Data",
            "fieldname": "ad_name",
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
            "label": _("Payment Confirmation"),
            "fieldtype": "Data",
            "fieldname": "payment_confirmation",
            "width": 150,
        },
		{
			"label": _("Discount"),
			"fieldtype": "Data",
			"fieldname": "discount",
			"width": 150,
		},
		{
			"label": _("Cash"),
			"fieldtype": "Data",
			"fieldname": "cash",
			"width": 150,
		},
		{
			"label": _("Online/LLP"),
			"fieldtype": "Data",
			"fieldname": "online_llp",
			"width": 150,
		},
		{
			"label": _("Card"),
			"fieldtype": "Data",
			"fieldname": "card",
			"width": 150,
		},
		{
			"label": _("GST"),
			"fieldtype": "Data",
			"fieldname": "gst",
			"width": 150,
		},
		{
			"label": _("Due Amount"),
			"fieldtype": "Data",
			"fieldname": "due_amount",
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
			"label": _("Booking Payment Mode"),
			"fieldtype": "Data",
			"fieldname": "payment_mode",
			"width": 150,
		},
		{
			"label": _("Booking Payment In"),
			"fieldtype": "Data",
			"fieldname": "payment_in",
			"width": 150,
		},
		{
			"label": _("Surgery Payment Mode"),
			"fieldtype": "Data",
			"fieldname": "surgery_payment_mode",
			"width": 150,
		},
		{
			"label": _("Surgery Payment In"),
			"fieldtype": "Data",
			"fieldname": "surgery_payment_in",
			"width": 150,
		},
		{
			"label": _("Refund"),
			"fieldtype": "Data",
			"fieldname": "refund",
			"width": 150,
		},
		{
			"label": _("Refund Source"),
			"fieldtype": "Data",
			"fieldname": "refund_source",
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
			"label": _("Active / Inactive Status"),
			"fieldtype": "Select",
			"fieldname": "active_inactive_status",
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
        }
	]

def get_data(filters) -> list[dict]:
	rows = []
	if filters.get("to_date") < filters.get("from_date"):
			frappe.throw(_('"From Date" cannot be later than "To Date"'))


	query = """
	    SELECT 
		    s.*, 
			l.status as lead_status,
		    l.full_name,l.campaign_name,ad.ads_name as ad_name,
		    l.name as lead_name,l.source_reference,
			l.mode, l.imported_source, l.active_inactive_status, l.subsource,
		    latest_consultation.date AS consultation_date,latest_consultation.status as cs_status,
			c.booking_date as prospect_date,
			c.booking_transaction_date,
			c.total_amount as package,
			p.payment_confirmation
		FROM
		    `tabSurgery` s
		LEFT JOIN
		    `tabLead` l
		ON
		    s.patient = l.name
		LEFT JOIN
            `tabMeta Ads` ad 
		ON 
		    ad.name = l.ad_name
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
		LEFT JOIN (
            SELECT 
                patient, 
                payment_confirmation
            FROM 
                `tabPayment`
            WHERE 
                payment_type = 'Surgery'
                AND type = 'Payment'
                AND creation = (
                    SELECT MAX(creation)
                    FROM `tabPayment` AS p2
                    WHERE 
                        p2.patient = `tabPayment`.patient
                        AND p2.payment_type = 'Surgery'
                        AND p2.type = 'Payment'
                )
            ) p ON p.patient = s.patient

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

	if filters.get("subsource"):
		query += " AND l.subsource = %(subsource)s"
		params["subsource"] = filters["subsource"]

	if filters.get("status"):
		query += " AND s.surgery_status = %(status)s"
		params["status"] = filters["status"]

	if filters.get("lead_status"):
		query += " AND l.status = %(lead_status)s"
		params["lead_status"] = filters["lead_status"]

	if filters.get("active_inactive_status"):
		query += " AND l.active_inactive_status = %(active_inactive_status)s"
		params["active_inactive_status"] = filters["active_inactive_status"]

	if filters.get("mode"):
		query += " AND l.mode LIKE %(mode)s"
		params["mode"] = f"%{filters['mode']}%"

	if filters.get("cs_status"):
		query += " AND latest_consultation.status = %(cs_status)s"
		params["cs_status"] = filters["cs_status"]

	if filters.get("technique"):
		query += " AND s.technique = %(technique)s"
		params["technique"] = filters["technique"]

	if filters.get("payment_confirmation"):
		query += " AND p.payment_confirmation = %(payment_confirmation)s"
		params["payment_confirmation"] = filters["payment_confirmation"]
		
	
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
					query += " AND (s.executive = %(executive)s OR s.center = %(center)s)"
					params["executive"] = executive
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
		booking_amount = 0
		cash, gst, card, online_llp, refund_amount = 0, 0, 0, 0, 0

		booking_payment_exists = frappe.db.exists("Payment", {"payment_type": "Costing", "type": "Payment", "patient": surgery.get("name")})

		if booking_payment_exists:
			booking_payment = frappe.get_doc("Payment", {"payment_type": "Costing", "type": "Payment", "patient": surgery.get("name")}, ["*"])
			if booking_payment:
				for_gst_booking = 0
				for_non_gst_booking = 0
				gst_entries = booking_payment.get("gst_payment_entries", [])
				non_gst_entries = booking_payment.get("payment_entries", [])

				if booking_payment.get("with_gst_amount") and gst_entries:
					payment_mode = gst_entries[0].get("method")
					payment_in = gst_entries[0].get("payment_in")
					for_gst_booking = gst_entries[0].get("amount")
					booking_gst_amount = gst_entries[0].get("gst_amount")
				elif booking_payment.get("without_gst_amount") and non_gst_entries:
					payment_mode = non_gst_entries[0].get("method")
					payment_in = non_gst_entries[0].get("payment_in")
					for_non_gst_booking = non_gst_entries[0].get("amount")
				
				booking_amount = int(for_gst_booking) + int(for_non_gst_booking)
		
		payments = frappe.get_all("Payment", fields=["*"], filters={
			"payment_type": "Surgery",
			"type": "Payment",
			"patient": surgery.get("name")
		})
		surgery_payment_mode_list = []
		surgery_payment_in_list = []
        

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
					method = entry.get("method")
					if method:
						surgery_payment_mode_list.append(method)
					surgery_payment_in = entry.get("payment_in")
					if surgery_payment_in:
						surgery_payment_in_list.append(surgery_payment_in)
                  

			# Non-GST Payment Entries
			for entry in non_gst_entries:
					if entry.get("method") == "Cash":
							cash += entry.get("amount", 0)
					elif entry.get("method") == "Card":
							card += entry.get("amount", 0)
					else:
							online_llp += entry.get("amount", 0)
					method = entry.get("method")
					if method:
						surgery_payment_mode_list.append(method)
					surgery_payment_in = entry.get("payment_in")
					if surgery_payment_in:
						surgery_payment_in_list.append(surgery_payment_in)
	
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
			"subsource": surgery.get("subsource") if surgery.get("lead_source") == "Meta" else "",
			"imported_source": surgery.get("imported_source"),
			"status": surgery.get("surgery_status"),
			"campaign_name": surgery.get("campaign_name"),
			"ad_name": surgery.get("ad_name"),
			"center": surgery.get("center"),
			"patient_name": f'<strong><a href="/app/surgery/{quote(surgery.get("name"), safe="")}" style="color: inherit;">{surgery.get("full_name")}</a></strong>',
			"phone_no": surgery.get("contact_number"),
			"city": surgery.get("city"),
			"technique": surgery.get("technique"),
			"executive": surgery.get("executive"),
			"grafts": surgery.get("grafts"),
			"package": surgery.get("package") if surgery.get("package") else 0,
			"inflow": cash + online_llp + card + booking_amount + gst + booking_gst_amount ,
			"discount": surgery.get("discount_amount"),
			"cash": cash,
			"online_llp": online_llp,
			"card": card,
			"gst": gst,
			"due_amount": surgery.get("pending_amount"),
			"booking_amount": booking_amount,
			"booking_gst": booking_gst_amount if booking_payment else 0,
			"payment_mode": payment_mode,
			"payment_in": payment_in,
			"refund": refund_amount,
			"refund_source": "",
			"prospect_date": surgery.get("prospect_date"),
			"booking_date": surgery.get("booking_date"),
			"booking_transaction_date": surgery.get("booking_transaction_date"),
			"surgery_transaction_date": surgery.get("surgery_transaction_date"),
			"lead_date": surgery.get("lead_created_date"),
			"lead_status": surgery.get("lead_status"),
			"active_inactive_status": surgery.get("active_inactive_status"),
			"mode": surgery.get("mode"),
			"source_reference": surgery.get("source_reference"),
			"consultation_date": surgery.get("consultation_date"),
			"consultation_status": surgery.get("cs_status"),
			"surgery_payment_mode" :", ".join(set(surgery_payment_mode_list)),
			"surgery_payment_in" : ", ".join(set(surgery_payment_in_list)),
			"bt_status": surgery.get("bt_status"),
			"payment_confirmation": surgery.get("payment_confirmation"),
			"patient_docname": surgery.get("name"),

		}
		rows.append(row)		
	rows = sorted(rows, key=lambda x: x.get("surgery_date") or "")

	return rows

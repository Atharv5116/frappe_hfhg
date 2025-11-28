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
        frappe.throw(_('"From Date" cannot be greater than or equal to "To Date"'))

    columns = get_columns()
    data = get_data(filters)
    pie_chart_data = get_pie_chart_data(data)
    chart_data = {
        "data": {
            "labels": list(pie_chart_data.keys()),
            "datasets": [
                {
                    "name": "Leads Count",
                    "values": list(pie_chart_data.values())
                }
            ]
        },
        "type": "donut",
        "options": {
            "centerText": {
                "value": f"Total Leads: {sum(pie_chart_data.values())}",
                "color": "#FF5733",
                "fontSize": 24,
                "fontWeight": "bold"
            }
        }
    }
    lead_count = len(data)
    return columns, data, {"lead_count": lead_count}, chart_data

def get_columns() -> list[dict]:
    return [
        {
            "label": _("Name"),
            "fieldtype": "Data",
            "fieldname": "name",     
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
            "fieldname": "created_on",
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
            "label": _("Consultation Date"),
            "fieldtype": "Date",
            "fieldname": "consultation_date",
            "width": 150,
        },
        {
            "label": _("CS Status"),
            "fieldtype": "Data",
            "fieldname": "cs_status",
            "width": 150,
        },
        {
            "label": _("Source"),
            "fieldtype": "Data",
            "fieldname": "source",
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
            "label": _("Distance"),
            "fieldtype": "Select",
            "fieldname": "distance",
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
        {
            "label": _("Reference name"),
            "fieldtype": "Data",
            "fieldname": "source_reference",
            "width": 150,
        },
    ]

def get_data(filters: Filters) -> list[dict]:
    if isinstance(filters, str):
        filters = frappe.parse_json(filters)
    
    if filters.to_date < filters.from_date:
        frappe.throw(_('"From Date" cannot be greater than or equal to "To Date"'))
    
    rows = []
    leads = []

    query = """
        SELECT 
            l.name, l.source, l.campaign_name, l.contact_number, l.city, l.center, l.first_name,
            l.distance, l.executive, l.assign_by, l.mode, l.service, l.status, 
            l.created_on, l.full_name,l.source_reference, l.active_inactive_status, ad.ads_name as ad_name,
            latest_surgery.surgery_date, 
            latest_costing.booking_date AS costing_date,
            latest_costing.book_date,
            latest_consultation.date AS consultation_date,
            latest_surgery.surgery_status,
            latest_consultation.status as cs_status
        FROM 
            `tabLead` l
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
        LEFT JOIN 
            (SELECT patient, MAX(date) AS date, status
             FROM `tabConsultation` 
             GROUP BY patient) latest_consultation
        ON 
            latest_consultation.patient = l.name
        LEFT JOIN
            `tabMeta Ads` ad ON ad.name = l.ad_name
        WHERE 
            l.created_on BETWEEN %(from_date)s AND %(to_date)s
    """
    
    params = {
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
    }

    if filters.get("center"):
        query += " AND l.center = %(center)s"
        params["center"] = filters["center"]

    if filters.get("executive"):
        query += " AND l.executive = %(executive)s"
        params["executive"] = filters["executive"]

    if filters.get("assign_by"):
        query += " AND l.assign_by = %(assign_by)s"
        params["assign_by"] = filters["assign_by"]

    if filters.get("source"):
        query += " AND l.source = %(source)s"
        params["source"] = filters["source"]

    if filters.get("mode"):
        query += " AND l.mode LIKE %(mode)s"
        params["mode"] = f"%{filters['mode']}%"

    if filters.get("status"):
        query += " AND l.status = %(status)s"
        params["status"] = filters["status"]

    if filters.get("active_inactive_status"):
        query += " AND l.active_inactive_status = %(active_inactive_status)s"
        params["active_inactive_status"] = filters["active_inactive_status"]

    if filters.get("surgery_status"):
        query += " AND latest_surgery.surgery_status = %(surgery_status)s"
        params["surgery_status"] = filters["surgery_status"]

    if filters.get("cs_status"):
        query += " AND latest_consultation.status = %(cs_status)s"
        params["cs_status"] = filters["cs_status"]

    if filters.get("source_reference"):
        query += " AND l.source_reference LIKE %(source_reference)s"
        params["source_reference"] = f"%{filters['source_reference']}%"

    if filters.get("ad_name"):
        query += " AND ad.ads_name LIKE %(ad_name)s"
        params["ad_name"] = f"%{filters['ad_name']}%"

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
                    query += " AND (l.executive = %(executive)s OR l.center = %(center)s)"
                    params["executive"] = executive
                    params["center"] = new_center
            else:
                if center:
                    query += " AND l.center = %(center)s"
                    params["center"] = center

    elif is_executive and not is_marketing_head:
        executive = frappe.db.get_value("Executive", {"email": user}, "name")
        if executive:
            query += " AND l.executive = %(executive)s"
            params["executive"] = executive

    if filters.get("have_surgery") == "Yes":
        query += " AND latest_surgery.surgery_date IS NOT NULL"
    elif filters.get("have_surgery") == "No":
        query += " AND latest_surgery.surgery_date IS NULL"

    if filters.get("have_costing") == "Yes":
        query += " AND latest_costing.booking_date IS NOT NULL"
    elif filters.get("have_costing") == "No":
        query += " AND latest_costing.booking_date IS NULL"

    if filters.get("have_consultation") == "Yes":
        query += " AND latest_consultation.date IS NOT NULL"
    elif filters.get("have_consultation") == "No":
        query += " AND latest_consultation.date IS NULL"

    leads = frappe.db.sql(query, params, as_dict=True)

    for lead in leads:
        row = {
            "month": lead.get("created_on").strftime("%B"),
            "year": lead.get("created_on").strftime("%Y"),
            "created_on": lead.get("created_on"),
            "source": lead.get("source"),
            "name": f'<strong><a href="/app/lead/{quote(lead.get("name"), safe="")}" style="color: inherit;">{lead.get("full_name")}</a></strong>',
            "phone_no": lead.get("contact_number"),
            "city": lead.get("city"),
            "center": lead.get("center"),
            "distance": lead.get("distance"),
            "executive": lead.get("executive"),
            "assign_by": lead.get("assign_by"),
            "mode": lead.get("mode"),
            "service": lead.get("service"),
            "status": lead.get("status"),
            "active_inactive_status": lead.get("active_inactive_status"),
            "costing_date": lead.get("costing_date"),
            "book_date": lead.get("book_date"),
            "surgery_date": lead.get("surgery_date"),
            "consultation_date": lead.get("consultation_date"),
            "source_reference": lead.get("source_reference"),
            "surgery_status": lead.get("surgery_status"),
            "cs_status": lead.get("cs_status")
        }
        rows.append(row)
    rows = sorted(rows, key=lambda x: x.get("created_on") or "")

    return rows

def get_pie_chart_data(data):
    counts = {
        "Have Costing": 0,
        "Have Surgery": 0,
        "Have Consultation": 0,
        "Remaining Leads": 0,  # New category for leads without any conversion
    }

    for lead in data:
        has_costing = bool(lead.get("costing_date"))
        has_surgery = bool(lead.get("surgery_date"))
        has_consultation = bool(lead.get("consultation_date"))

        if has_costing:
            counts["Have Costing"] += 1
        if has_surgery:
            counts["Have Surgery"] += 1
        if has_consultation:
            counts["Have Consultation"] += 1
        
        # If the lead has none of the three, classify it as "Not Converted"
        if not (has_costing or has_surgery or has_consultation):
            counts["Remaining Leads"] += 1

    return counts


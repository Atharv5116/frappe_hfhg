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
    if filters.to_date <= filters.from_date:
        frappe.throw(_('"From Date" cannot be greater than or equal to "To Date"'))

    columns = get_columns()  
    data = get_data(filters)  
    total_expense = get_campaign_expenses(filters)
    camp_row_count = len(data)
    return columns, data, {"camp_row_count": camp_row_count, "total_expense": total_expense}

def get_columns() -> list[dict]:
    return [
        {
            "label": _("Ad Name"),
            "fieldtype": "Data",
            "fieldname": "ad_name",
            "width": 300,
        },
        {
            "label": _("Campaign Name"),
            "fieldtype": "Data", 
            "fieldname": "campaign_name",
            "width": 300,
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
            "label": _("Status"),
            "fieldtype": "Data",
            "fieldname": "status",
            "width": 150,
        },
        {
            "label": _("Executive"),
            "fieldtype": "Data",
            "fieldname": "executive",
            "width": 150,
        },
        {
            "label": _("Center"),
            "fieldtype": "Data",
            "fieldname": "center",
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
            "label": _("CS Status"),
            "fieldtype": "Data",
            "fieldname": "cs_status",
            "width": 150,
        },
        {
            "label": _("Booking Date"),
            "fieldtype": "Date",
            "fieldname": "costing_date",
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
    ]

def get_data(filters: Filters) -> list[dict]:
    if isinstance(filters, str):
        filters = frappe.parse_json(filters)
    
    if filters.to_date <= filters.from_date:
        frappe.throw(_('"From Date" cannot be greater than or equal to "To Date"'))
    
    rows = []
    leads = []

    query = """
        SELECT 
            l.name, l.campaign_name, l.contact_number, l.status, l.first_name,
            l.created_on, l.executive, l.center, ad.ads_name as ad_name,l.source,
            latest_surgery.surgery_date, 
            latest_costing.booking_date AS costing_date, 
            latest_consultation.date AS consultation_date,
            latest_surgery.surgery_status,
            latest_consultation.status as cs_status
        FROM 
            `tabLead` l
        LEFT JOIN 
            `tabMeta Ads` ad ON ad.name = l.ad_name
        LEFT JOIN 
            (SELECT patient, MAX(surgery_date) AS surgery_date, surgery_status
             FROM `tabSurgery` 
             GROUP BY patient) latest_surgery
        ON 
            latest_surgery.patient = l.name
        LEFT JOIN 
            (SELECT patient, MAX(booking_date) AS booking_date 
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
        WHERE 
            l.created_on BETWEEN %(from_date)s AND %(to_date)s
            AND (l.ad_name IS NOT NULL AND l.ad_name != '' 
            OR l.campaign_name IS NOT NULL AND l.campaign_name != '')
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

    if filters.get("source"):
        query += " AND l.source LIKE %(source)s"
        params["source"] = f"%{filters['source']}%"

    if filters.get("ad_name"):
        query += " AND ad.ads_name LIKE %(ad_name)s"
        params["ad_name"] = f"%{filters['ad_name']}%"

    if filters.get("status"):
        query += " AND l.status = %(status)s"
        params["status"] = filters["status"]

    if filters.get("surgery_status"):
        query += " AND latest_surgery.surgery_status = %(surgery_status)s"
        params["surgery_status"] = filters["surgery_status"]

    if filters.get("cs_status"):
        query += " AND latest_consultation.status = %(cs_status)s"
        params["cs_status"] = filters["cs_status"]

    if filters.get("campaign_name"):
        if frappe.db.exists({ "doctype": "Meta Campaign", "campaign_name": filters["campaign_name"]}):
            campaign_id = frappe.db.get_value("Meta Campaign", {"campaign_name": filters["campaign_name"]}, "name")
            query += "AND (l.campaign_name = %(campaign_name)s OR l.campaign_name = %(campaign_id)s)"
            params["campaign_name"] = filters["campaign_name"]
            params["campaign_id"] = campaign_id
        else:
            query += " AND l.campaign_name LIKE %(campaign_name)s"
            params["campaign_name"] = f"%{filters['campaign_name']}%"
    else:
        query += " AND l.campaign_name IS NOT NULL"

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
            "campaign_name": lead.get("campaign_name"),
            "ad_name": lead.get("ad_name"),
            "name": f'<strong><a href="/app/lead/{quote(lead.get("name"), safe="")}" style="color: inherit;">{lead.get("full_name")}</a></strong>',
            "phone_no": lead.get("contact_number"),
            "status": lead.get("status"),
            "executive": lead.get("executive"),
            "center": lead.get("center"),
            "lead_date": lead.get("created_on"),
            "costing_date": lead.get("costing_date"),
            "surgery_date": lead.get("surgery_date"),
            "consultation_date": lead.get("consultation_date"),
            "surgery_status": lead.get("surgery_status"),
            "cs_status": lead.get("cs_status"),
            "source": lead.get("source")
        }
        rows.append(row)

    return rows


def get_campaign_expenses(filters: Filters) -> float:
    query = """
        SELECT SUM(ce.total_amount)
        FROM `tabCampaign Expense` ce
        LEFT JOIN `tabMeta Ads` ma ON ce.ads = ma.name
        WHERE ce.date BETWEEN %(from_date)s AND %(to_date)s
    """

    params = {
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
    }

    if filters.get("ad_name"):
        query += " AND ma.ads_name LIKE %(ad_name)s"  
        params["ad_name"] = filters["ad_name"]

    total_expense = frappe.db.sql(query, params)[0][0]
    return total_expense if total_expense else 0.0

import frappe
from frappe import _
from urllib.parse import quote
from frappe_hfhg.frappe_hfhg.doctype.centre_assignment.centre_assignment import apply_marketing_head_center_filter

Filters = frappe._dict

def execute(filters: Filters | None = None) -> tuple:
    if not filters.to_date or not filters.from_date:
        frappe.throw(_('"From Date" and "To Date" are mandatory'))
    if filters.to_date <= filters.from_date:
        frappe.throw(_('"From Date" cannot be greater than or equal to "To Date"'))

    # Fetch columns and data for the report
    columns = get_columns()
    data = get_data(filters)

    return columns, data

def get_columns() -> list[dict]:
    return [
        {
            "label": _("Lead"),
            "fieldtype": "Data",
            "fieldname": "lead_name",
            "width": 150,
        },
        {
            "label": _("Old Status"),
            "fieldtype": "Data",
            "fieldname": "old_status",
            "width": 150,
        },
        {
            "label": _("New Status"),
            "fieldtype": "Data",
            "fieldname": "new_status",
            "width": 150,
        },
        {
            "label": _("Date"),
            "fieldtype": "Date",
            "fieldname": "date",
            "width": 150,
        },
        {
            "label": _("User"),
            "fieldtype": "Data",
            "fieldname": "user",
            "width": 150,
        }
    ]

def get_data(filters: Filters) -> list[dict]:
    rows = []

    query = """
        SELECT lst.lead, lst.old_status, lst.new_status, lst.date, lst.user
        FROM `tabLead Status Track` lst
        LEFT JOIN `tabLead` l ON l.name = lst.lead
        WHERE lst.date BETWEEN %(from_date)s AND %(to_date)s
    """
    params = {"from_date": filters.from_date, "to_date": filters.to_date}
    if filters.get("lead"):
        query += " AND lst.lead = %(lead)s"
        params["lead"] = filters.lead

    # Marketing Head(new) only: filter by lead's center
    query, params = apply_marketing_head_center_filter(query, params, center_field="center", table_alias="l")

    lead_status_data = frappe.db.sql(query, params, as_dict=True)


    
    
    # Format data for report
    for status in lead_status_data:
        row = {
            "lead_name": f'<strong><a href="/app/lead/{quote(status.get("lead"), safe="")}" style="color: inherit;">{status.get("lead")}</a></strong>',
            "old_status": status.get("old_status"),
            "new_status": status.get("new_status"),
            "date": status.get("date"),
            "user": status.get("user")
        }
        rows.append(row)
    
    return rows

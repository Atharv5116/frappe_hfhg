import frappe
from frappe import _
from urllib.parse import quote

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
    
    # Fetch the relevant data based on filters
    query_filters = {
        "date": ["between", [filters.from_date, filters.to_date]]
    }
    if filters.lead:
        query_filters["lead"] = filters.lead

    lead_status_data = frappe.get_all(
        "Lead Status Track", 
        filters=query_filters, 
        fields=["lead", "old_status", "new_status", "date", "user"]
    )


    
    
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

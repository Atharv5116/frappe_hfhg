import frappe
from frappe import _
from urllib.parse import quote

Filters = frappe._dict

@frappe.whitelist()
def execute(filters= None) -> tuple:
    if isinstance(filters, str):
        filters = frappe.parse_json(filters)
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns() -> list[dict]:
    return [
        {
            "label": _("Name"),
            "fieldtype": "Data",
            "fieldname": "name",
            
            "width": 250,
        },
        {
			"label": _("Contact Number"),
			"fieldtype": "Data",
			"fieldname": "contact_number",
			"width": 190,
		},
		{
			"label": _("Alternative Number"),
			"fieldtype": "Data",
			"fieldname": "alternative_number",
			"width": 190,
		},
		{
			"label": _("Executive"),
			"fieldtype": "Data",
			"fieldname": "executive",
			"width": 190,
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
            "label": _("Status"),
            "fieldtype": "Data",
            "fieldname": "status",
            "width": 160,
        },
        {
            "label": _("Active / Inactive Status"),
            "fieldtype": "Select",
            "fieldname": "active_inactive_status",
            "width": 150,
        },
        {
            "label": _("Created Date"),
            "fieldtype": "Date",
            "fieldname": "created_on",
            "width": 120,
        },
        {
            "label": _("Show Conversations"),
            "fieldtype": "Data",
            "fieldname": "show_conversations",
            "width": 150,
        },
    ]

def get_data(filters: Filters) -> list[dict]:
    if isinstance(filters, str):
        filters = frappe.parse_json(filters)

    rows = []
    leads = []
    
    # Build query conditions
    conditions = []
    params = {}
    
    if filters.get("contact_number"):
        conditions.append("(l.contact_number LIKE %(contact_number)s OR l.alternative_number LIKE %(contact_number)s)")
        params["contact_number"] = f"%{filters['contact_number']}%"

    if filters.get("name"):
        conditions.append("l.name LIKE %(name)s")
        params["name"] = f"%{filters['name']}%"
    
    if filters.get("source"):
        conditions.append("l.source = %(source)s")
        params["source"] = filters["source"]
    
    if filters.get("subsource"):
        conditions.append("l.subsource = %(subsource)s")
        params["subsource"] = filters["subsource"]
    
    if filters.get("executive"):
        conditions.append("l.executive = %(executive)s")
        params["executive"] = filters["executive"]
    
    if filters.get("active_inactive_status"):
        conditions.append("l.active_inactive_status = %(active_inactive_status)s")
        params["active_inactive_status"] = filters["active_inactive_status"]
    
    # Only run query if there are conditions
    if conditions:
        where_clause = " AND ".join(conditions)
        query = """
            SELECT 
                l.name, l.status, l.contact_number, l.alternative_number, l.executive, 
                l.created_on, l.first_name, l.source, l.subsource, l.active_inactive_status
            FROM 
                `tabLead` l
            WHERE 
                {where_clause}
        """.format(where_clause=where_clause)
        
        leads = frappe.db.sql(query, params, as_dict=True)

    for lead in leads:
        lead_name = lead.get("name", "")
        row = {
            "name": f'<strong><a href="/app/lead/{quote(lead_name, safe="")}" style="color: inherit;">{lead_name}</a></strong>',
            "contact_number": lead.get("contact_number"),
            "alternative_number": lead.get("alternative_number"),
            "executive": lead.get("executive"),
            "source": lead.get("source"),
            "subsource": lead.get("subsource"),  # Will be formatted in JS to show only when source is Meta
            "status": lead.get("status"),
            "active_inactive_status": lead.get("active_inactive_status"),
            "created_on": lead.get("created_on"),
            "show_conversations": lead_name,  # Store lead name for button click handler
            "first_name": lead.get("first_name", ""),  # Store first_name for modal display
        }
        rows.append(row)

    return rows

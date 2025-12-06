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
            "label": _("Status"),
            "fieldtype": "Data",
            "fieldname": "status",
            "width": 160,
        },
        {
            "label": _("Show Conversations"),
            "fieldtype": "Data",
            "fieldname": "show_conversations",
            "width": 180,
        },
    ]

def get_data(filters: Filters) -> list[dict]:
    if isinstance(filters, str):
        filters = frappe.parse_json(filters)

    rows = []
    leads = []
    
    if filters.get("contact_number") or filters.get("name"):
        query = """
            SELECT 
                l.name, l.status, l.contact_number, l.alternative_number, l.executive
            FROM 
                `tabLead` l
            WHERE 
        """
        
        params = {}
        
        if filters.get("contact_number"):
            query += "l.contact_number LIKE %(contact_number)s OR l.alternative_number LIKE %(contact_number)s"
            params["contact_number"] = f"%{filters['contact_number']}%"

        if filters.get("name"):
            query += " OR l.name LIKE %(name)s"
            params["name"] = f"%{filters['name']}%"

        leads = frappe.db.sql(query, params, as_dict=True)

    for lead in leads:
        row = {
            "name": f'<strong><a href="/app/lead/{quote(lead.get("name"), safe="")}" style="color: inherit;">{lead.get("name")}</a></strong>',
            "contact_number": lead.get("contact_number"),
            "alternative_number": lead.get("alternative_number"),
            "executive": lead.get("executive"),
            "status": lead.get("status"),
            "show_conversations": lead.get("name"),  # Store lead name for button click handler
        }
        rows.append(row)

    return rows

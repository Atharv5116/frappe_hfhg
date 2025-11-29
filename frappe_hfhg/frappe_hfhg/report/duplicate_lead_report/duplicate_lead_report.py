import frappe
from frappe import _
from urllib.parse import quote
import json

Filters = frappe._dict

@frappe.whitelist()
def execute(filters=None) -> tuple:
	columns = get_columns()
	data = get_data(filters)
	lead_count = len(data)
    
	return columns, data, {"lead_count": lead_count}


def get_columns() -> list[dict]:
	return [
		{
            "label": _("Duplicate Lead"),
            "fieldtype": "Data",
            "fieldname": "dl_name",     
            "width": 150,
        },
		{
            "label": _("Lead Date"),
            "fieldtype": "Date",
            "fieldname": "dl_created_on",
            "width": 150,
        },
		{
            "label": _("Count"),
            "fieldtype": "Data",
            "fieldname": "count",     
            "width": 150,
        },
		{
            "label": _("Source"),
            "fieldtype": "Data",
            "fieldname": "source",     
            "width": 150,
        },
		{
            "label": _("Mode"),
            "fieldtype": "Data",
            "fieldname": "mode",     
            "width": 150,
        },
        {
            "label": _("Camapign Name"),
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
            "label": _("Attended"),
            "fieldtype": "Data",
            "fieldname": "attended",     
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
            "label": _("Phone No"),
            "fieldtype": "Data",
            "fieldname": "contact_number",
            "width": 150,
        },
		{
            "label": _("Original Lead"),
            "fieldtype": "Data",
            "fieldname": "ol_name",     
            "width": 150,
        },
		{
            "label": _("Lead Date"),
            "fieldtype": "Date",
            "fieldname": "ol_created_on",
            "width": 150,
        },
		{
            "label": _("Previous OL Status"),
            "fieldtype": "Data",
            "fieldname": "previous_ol_status",     
            "width": 150,
        },
		{
            "label": _("Current OL Status"),
            "fieldtype": "Data",
            "fieldname": "current_ol_status",     
            "width": 150,
        },
		{
            "label": _("OL Full Name"),
            "fieldtype": "Data",
            "fieldname": "full_name",     
            "width": 150,
        },
		{
            "label": _("OL Source"),
            "fieldtype": "Data",
            "fieldname": "ol_source",     
            "width": 150,
        },
		{
            "label": _("Imported Source"),
            "fieldtype": "Data",
            "fieldname": "imported_source",     
            "width": 150,
        },
		{
            "label": _("OL Mode"),
            "fieldtype": "Data",
            "fieldname": "ol_mode",     
            "width": 150,
        },
        {
            "label": _("OL Camapign Name"),
            "fieldtype": "Data",
            "fieldname": "ol_campaign_name",     
            "width": 150,
        },
        {
            "label": _("OL Ad Name"),
            "fieldtype": "Data",
            "fieldname": "ol_ad_name",     
            "width": 150,
        },
		{
            "label": _("OL Executive"),
            "fieldtype": "Data",
            "fieldname": "ol_executive",     
            "width": 150,
        },
		{
            "label": _("OL Center"),
            "fieldtype": "Data",
            "fieldname": "ol_center",     
            "width": 150,
        },
		{
            "label": _("Active / Inactive Status"),
            "fieldtype": "Select",
            "fieldname": "active_inactive_status",     
            "width": 150,
        },

	]


def get_data(filters: Filters) -> list[dict]:
	
  
	rows = []
	leads = []        

	query = """
        WITH original_leads AS (
            SELECT
                ol.*,
                ROW_NUMBER() OVER (PARTITION BY ol.contact_number ORDER BY ol.created_on ASC) AS rn
            FROM `tabLead` ol
            WHERE ol.status != 'Duplicate Lead'
            ),
            filtered_original_leads AS (
                SELECT * FROM original_leads WHERE rn = 1
            )
        SELECT
            dl.name AS dl_name,
			dl.full_name AS dl_first_name,
            dl.created_on AS dl_created_on,
            dl.contact_number,
            dl.source,
            dl.mode,
            dl.campaign_name,
            dl.ad_name,
            dl.attended,
            dl.executive,
            dl.center,
            dl.active_inactive_status,
            COUNT(dl.contact_number) OVER (PARTITION BY dl.contact_number) AS count,
            ol.name AS ol_name,
			ol.full_name AS ol_first_name,
            ol.created_on AS ol_created_on,
            ol.status AS current_ol_status,
            ol.full_name,
            ol.source AS ol_source,
            ol.imported_source,
            ol.mode AS ol_mode,
            ol.campaign_name AS ol_campaign_name,
            ol.ad_name AS ol_ad_name,
            ol.executive AS ol_executive,
            ol.center AS ol_center,
            logs.object AS log_object
        FROM `tabLead` dl
        JOIN filtered_original_leads ol ON dl.contact_number = ol.contact_number
        LEFT JOIN `tabDuplicate Leads Logs` logs ON logs.lead = dl.name
        WHERE dl.status = 'Duplicate Lead'
        AND dl.created_on BETWEEN %(from_date)s AND %(to_date)s
        """
	if isinstance(filters, str): 
		filters = frappe.parse_json(filters)
	params = {
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
    }
    
    if filters.get("active_inactive_status"):
        query += " AND dl.active_inactive_status = %(active_inactive_status)s"
        params["active_inactive_status"] = filters["active_inactive_status"]
	
	leads = frappe.db.sql(query, params, as_dict=True)

	for lead in leads:
		# Get current status from the query
		current_status = lead.get("current_ol_status", "")
		original_lead_name = lead.get("ol_name", "")
		
		# Get previous status from Lead Status Track (most recent status change)
		previous_status = current_status  # Default to current status
		
		if original_lead_name:
			# Query the most recent status change for the original lead
			status_track = frappe.db.sql("""
				SELECT old_status
				FROM `tabLead Status Track`
				WHERE lead = %(lead_name)s
				ORDER BY date DESC, modified DESC
				LIMIT 1
			""", {"lead_name": original_lead_name}, as_dict=True)
			
			if status_track and status_track[0].get("old_status"):
				# Use the old_status from the most recent change
				previous_status = status_track[0].get("old_status")
			else:
				# Fallback: Try to extract from log object if no status track exists
				log_object = lead.get("log_object")
				if log_object:
					try:
						# The log_object contains TWO concatenated JSON objects
						decoder = json.JSONDecoder()
						first_json, idx = decoder.raw_decode(log_object)
						
						if idx < len(log_object):
							second_json, _ = decoder.raw_decode(log_object, idx)
							if isinstance(second_json, dict):
								previous_status = second_json.get("status", current_status)
						else:
							if isinstance(first_json, dict):
								previous_status = first_json.get("status", current_status)
					except (json.JSONDecodeError, TypeError, AttributeError, ValueError):
						# If parsing fails, use current status as previous
						previous_status = current_status
		
		row = {
			"dl_name": f'<strong><a href="/app/lead/{quote(lead.get("dl_name"), safe="")}" style="color: inherit;">{lead.get("dl_first_name")}</a></strong>',
			"dl_created_on": lead.get("dl_created_on"),
			"source": lead.get("source"),
			"mode": lead.get("mode"),
			"campaign_name": lead.get("campaign_name"),
			"ad_name": lead.get("ad_name"),
			"attended": lead.get("attended"),
			"executive": lead.get("executive"),
			"center": lead.get("center"),
			"contact_number": lead.get("contact_number"),
			"count": lead.get("count"),
            "ol_name": lead.get("ol_first_name"),
		    "ol_created_on": lead.get("ol_created_on"),
		    "previous_ol_status": previous_status,
		    "current_ol_status": current_status,
		    "full_name": lead.get("full_name"),
		    "ol_source": lead.get("ol_source"),
		    "imported_source": lead.get("imported_source"),
			"ol_mode": lead.get("ol_mode"),
			"ol_campaign_name": lead.get("ol_campaign_name"),
			"ol_ad_name": lead.get("ol_ad_name"),
			"ol_executive": lead.get("ol_executive"),
			"ol_center": lead.get("ol_center"),
			"active_inactive_status": lead.get("active_inactive_status"),	
		}
		rows.append(row)
    
	return rows
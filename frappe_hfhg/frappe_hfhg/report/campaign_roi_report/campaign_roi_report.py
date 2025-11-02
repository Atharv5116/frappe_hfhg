import frappe
from frappe import _

Filters = frappe._dict

@frappe.whitelist()
def execute(filters=None) -> tuple:
    if isinstance(filters, str):
        filters = frappe.parse_json(filters)
    
    if not filters.get("to_date") or not filters.get("from_date"):
        frappe.throw(_('"From Date" and "To Date" are mandatory'))
    
    if filters.get("to_date") <= filters.get("from_date"):
        frappe.throw(_('"From Date" cannot be greater than or equal to "To Date"'))
    
    columns = get_columns(filters)
    data = get_data(filters)
    
    return columns, data

def get_columns(filters: Filters) -> list[dict]:
    columns: list[dict] = [
        {
            "label": _("Campaign Name"),
            "fieldtype": "Data",
            "fieldname": "campaign_name",
            "width": 250,
        },
        {
            "label": _("Total Expense (₹)"),
            "fieldtype": "Float",
            "fieldname": "total_expense",
            "width": 150,
            "precision": 2,
        },
        {
            "label": _("Total Income (₹)"),
            "fieldtype": "Float",
            "fieldname": "total_income",
            "width": 150,
            "precision": 2,
        },
    ]

    # If a source filter is selected, add a dynamic column for that source's income
    source = (filters.get("source") or "").strip() if isinstance(filters, dict) else ""
    if source:
        columns.append({
            "label": _(f"Income - {source} (₹)"),
            "fieldtype": "Float",
            "fieldname": "source_income",
            "width": 170,
            "precision": 2,
        })

    columns.extend([
        {
            "label": _("Net Profit/Loss (₹)"),
            "fieldtype": "Float",
            "fieldname": "net_profit",
            "width": 150,
            "precision": 2,
        },
        {
            "label": _("ROI %"),
            "fieldtype": "Percent",
            "fieldname": "roi_percent",
            "width": 120,
        },
    ])

    return columns

def get_data(filters: Filters) -> list[dict]:
    # Get all campaigns that have either expenses or leads in the date range
    campaigns = get_campaigns_in_range(filters)
    
    rows = []
    for campaign in campaigns:
        campaign_name = campaign.get("campaign_name")
        
        # Get total expenses for this campaign
        total_expense = get_campaign_expenses(filters, campaign_name)
        
        # Get total income for this campaign (ALL sources)
        total_income = get_campaign_income_for_source(filters, campaign_name, source=None)

        # If a source is selected, get income only from that source as a separate column
        source = (filters.get("source") or "").strip()
        source_income = None
        if source:
            source_income = get_campaign_income_for_source(filters, campaign_name, source)
        
        net_profit = total_income - total_expense
        
        # Calculate ROI percentage
        roi_percent = 0
        if total_expense > 0:
            roi_percent = ((total_income - total_expense) / total_expense) * 100
        
        row = {
            "campaign_name": campaign_name,
            "total_expense": total_expense,
            "total_income": total_income,
            "net_profit": net_profit,
            "roi_percent": roi_percent,
        }

        if source_income is not None:
            row["source_income"] = source_income
        rows.append(row)
    
    return rows

def get_campaigns_in_range(filters: Filters) -> list[dict]:
    """Get all unique campaigns that have activity in the date range"""
    query = """
        SELECT DISTINCT campaign_name
        FROM (
            SELECT l.campaign_name
            FROM `tabLead` l
            WHERE l.campaign_name IS NOT NULL 
            AND l.campaign_name != ''
            AND l.created_on BETWEEN %(from_date)s AND %(to_date)s
            
            UNION
            
            SELECT DISTINCT ce.campaign as campaign_name
            FROM `tabCampaign Expense` ce
            WHERE ce.date BETWEEN %(from_date)s AND %(to_date)s
            AND ce.campaign IS NOT NULL
            AND ce.campaign != ''
        ) AS campaigns
        ORDER BY campaign_name
    """
    
    params = {
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
    }
    
    campaigns = frappe.db.sql(query, params, as_dict=True)
    return campaigns

def get_campaign_expenses(filters: Filters, campaign_name: str) -> float:
    """Get total expenses for a specific campaign"""
    query = """
        SELECT COALESCE(SUM(CAST(ce.total_amount AS DECIMAL(10,2))), 0) as total_expense
        FROM `tabCampaign Expense` ce
        WHERE ce.date BETWEEN %(from_date)s AND %(to_date)s
        AND ce.campaign = %(campaign_name)s
    """
    
    params = {
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
        "campaign_name": campaign_name,
    }
    
    result = frappe.db.sql(query, params, as_dict=True)
    return float(result[0].get("total_expense", 0)) if result else 0.0

def get_campaign_income_for_source(filters: Filters, campaign_name: str, source: str | None) -> float:
    """Get income for a specific campaign. If source is provided, filter by that source; otherwise sum all sources."""
    
    # Single unified query to get all payments correctly
    query = """
        SELECT 
            COALESCE(SUM(
                CASE 
                    WHEN p.total_amount_received IS NOT NULL AND p.total_amount_received != ''
                    THEN CAST(p.total_amount_received AS DECIMAL(10,2))
                    ELSE 0
                END
            ), 0) as income
        FROM `tabPayment` p
        INNER JOIN (
            -- Payments via Costing
            SELECT c.name as payment_patient, l.source
            FROM `tabCosting` c
            INNER JOIN `tabLead` l ON c.patient = l.name
            WHERE l.campaign_name = %(campaign_name)s
            
            UNION ALL
            
            -- Payments via Surgery
            SELECT s.name as payment_patient, l.source
            FROM `tabSurgery` s
            INNER JOIN `tabCosting` c ON s.patient = c.name
            INNER JOIN `tabLead` l ON c.patient = l.name
            WHERE l.campaign_name = %(campaign_name)s
        ) AS lead_data ON p.patient = lead_data.payment_patient
        WHERE p.transaction_date BETWEEN %(from_date)s AND %(to_date)s
        AND p.type = 'Payment'
    """
    
    # Add source filter if specified (ignore empty strings)
    if source and source.strip():
        query += " AND lead_data.source = %(source)s"
    
    params = {
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
        "campaign_name": campaign_name,
    }
    
    if source and source.strip():
        params["source"] = source.strip()
    
    # Execute query
    result = frappe.db.sql(query, params, as_dict=True)
    
    return float(result[0].get("income", 0)) if result else 0.0

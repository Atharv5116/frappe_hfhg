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
            "label": _("Ad ID"),
            "fieldtype": "Link",
            "fieldname": "ad_id",
            "options": "Meta Ads",
            "width": 150,
        },
        {
            "label": _("Ad Name"),
            "fieldtype": "Data",
            "fieldname": "ad_display_name",
            "width": 250,
        },
        {
            "label": _("Ad Status"),
            "fieldtype": "Data",
            "fieldname": "ad_status",
            "width": 120,
        },
        {
            "label": _("Ad Created Date"),
            "fieldtype": "Date",
            "fieldname": "ad_created_date",
            "width": 130,
        },
        {
            "label": _("Source"),
            "fieldtype": "Data",
            "fieldname": "source",
            "width": 120,
        },
        {
            "label": _("Total Expense (₹)"),
            "fieldtype": "Float",
            "fieldname": "total_expense",
            "width": 150,
            "precision": 2,
        },
        {
            "label": _("Lifetime Revenue (₹)"),
            "fieldtype": "Float",
            "fieldname": "lifetime_revenue",
            "width": 170,
            "precision": 2,
        },
        {
            "label": _("Period Revenue (₹)"),
            "fieldtype": "Float",
            "fieldname": "period_revenue",
            "width": 150,
            "precision": 2,
        },
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
    ]

    return columns

def get_data(filters: Filters) -> list[dict]:
    # Get all ads that have either expenses or revenue
    ads_data = get_ads_with_activity(filters)
    
    rows = []
    # Group ads by ad_name only (not by source)
    ad_names = list(set([ad.get("ad_name") for ad in ads_data]))
    
    for ad_name in ad_names:
        # Get total expenses for this ad (within date range)
        total_expense = get_ad_expenses(filters, ad_name)
        
        # Always get revenue from ALL sources
        lifetime_revenue = get_ad_revenue(filters, ad_name, None, lifetime=True)
        period_revenue = get_ad_revenue(filters, ad_name, None, lifetime=False)
        
        # Get the source for this ad from the Lead table
        source = get_ad_source(ad_name)
        
        # Get ad display name and status from Meta Ads
        ad_details = get_ad_details(ad_name)
        
        # Get ad creation date from Meta Lead Form
        ad_created_date = get_ad_created_date(ad_name)
        
        # Net profit is based on period revenue from all sources
        net_profit = period_revenue - total_expense
        
        # Calculate ROI percentage based on period revenue from all sources
        roi_percent = 0
        if total_expense > 0:
            roi_percent = ((period_revenue - total_expense) / total_expense) * 100
        
        row = {
            "ad_id": ad_name,  # ad_name is actually the ad_id (document name)
            "ad_display_name": ad_details.get("ads_name", ad_name),
            "ad_status": ad_details.get("status", ""),
            "ad_created_date": ad_created_date,
            "source": source,
            "total_expense": total_expense,
            "lifetime_revenue": lifetime_revenue,
            "period_revenue": period_revenue,
            "net_profit": net_profit,
            "roi_percent": roi_percent,
        }
        rows.append(row)
    
    return rows

def get_ads_with_activity(filters: Filters) -> list[dict]:
    """Get all unique ads that have either expenses or revenue, grouped by source"""
    query = """
        SELECT DISTINCT ad_name, source
        FROM (
            -- Ads from Campaign Expense
            SELECT DISTINCT ce.ad_name, NULL as source
            FROM `tabCampaign Expense` ce
            WHERE ce.ad_name IS NOT NULL 
            AND ce.ad_name != ''
            AND ce.date BETWEEN %(from_date)s AND %(to_date)s
            
            UNION
            
            -- Ads from Leads (that have payments via Surgery within date range OR all time)
            SELECT DISTINCT l.ad_name, l.source
            FROM `tabLead` l
            INNER JOIN (
                -- Leads with payments via Surgery
                SELECT DISTINCT c.patient
                FROM `tabSurgery` s
                INNER JOIN `tabCosting` c ON s.patient = c.name
                INNER JOIN `tabPayment` p ON p.patient = s.name
                WHERE p.type = 'Payment'
                AND p.payment_type = 'Surgery'
                AND (
                    p.transaction_date BETWEEN %(from_date)s AND %(to_date)s
                    OR p.transaction_date IS NULL
                )
            ) AS leads_with_payments ON l.name = leads_with_payments.patient
            WHERE l.ad_name IS NOT NULL 
            AND l.ad_name != ''
        ) AS ads_activity
        WHERE ad_name IS NOT NULL AND ad_name != ''
        ORDER BY ad_name, source
    """
    
    params = {
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
    }
    
    # Apply ad name filter if provided
    ad_name_filter = (filters.get("ad_name") or "").strip()
    if ad_name_filter:
        # Add ad name filter to WHERE clause
        query = query.replace(
            "WHERE ad_name IS NOT NULL AND ad_name != ''",
            "WHERE ad_name IS NOT NULL AND ad_name != '' AND ad_name LIKE %(ad_name_filter)s"
        )
        params["ad_name_filter"] = f"%{ad_name_filter}%"
    
    ads = frappe.db.sql(query, params, as_dict=True)
    
    # Filter: only keep ads that have expense OR revenue WITHIN THE SELECTED DATE RANGE
    # The source filter should NOT affect which ads are displayed - it only affects the Source Revenue column
    filtered_ads = []
    seen_ad_names = set()
    
    for ad_info in ads:
        ad_name = ad_info.get("ad_name")
        
        # Only process each ad once (not per source)
        if ad_name in seen_ad_names:
            continue
        seen_ad_names.add(ad_name)
        
        # Check if ad has expense within date range
        has_expense = get_ad_expenses(filters, ad_name) > 0
        
        # ALWAYS check if ad has revenue from ANY source (regardless of source filter)
        # The source filter should only affect the Source Revenue column, not which ads appear
        has_revenue = get_ad_revenue(filters, ad_name, None, lifetime=False) > 0
        
        if has_expense or has_revenue:
            filtered_ads.append(ad_info)
    
    return filtered_ads

def get_ad_source(ad_name: str) -> str:
    """Get the source for a specific ad from the Lead table"""
    query = """
        SELECT l.source
        FROM `tabLead` l
        WHERE l.ad_name = %(ad_name)s
        AND l.source IS NOT NULL
        AND l.source != ''
        LIMIT 1
    """
    
    result = frappe.db.sql(query, {"ad_name": ad_name}, as_dict=True)
    return result[0].get("source", "") if result else ""

def get_ad_details(ad_id: str) -> dict:
    """Get ad display name and status from Meta Ads doctype"""
    try:
        # Check if Meta Ads exists
        if not frappe.db.exists("Meta Ads", ad_id):
            return {"ads_name": ad_id, "status": ""}
        
        # Fetch ad details
        ad = frappe.db.get_value(
            "Meta Ads",
            ad_id,
            ["ads_name", "status"],
            as_dict=True
        )
        
        if ad:
            return {
                "ads_name": ad.get("ads_name") or ad_id,
                "status": ad.get("status") or ""
            }
        else:
            return {"ads_name": ad_id, "status": ""}
    except Exception:
        # If any error, return the ad_id as name
        return {"ads_name": ad_id, "status": ""}

def get_ad_created_date(ad_id: str) -> str | None:
    """Get ad creation date from Meta Lead Form doctype"""
    try:
        # Query Meta Lead Form for created_at date where ads field matches ad_id
        query = """
            SELECT created_at
            FROM `tabMeta Lead Form`
            WHERE ads = %(ad_id)s
            ORDER BY created_at ASC
            LIMIT 1
        """
        
        result = frappe.db.sql(query, {"ad_id": ad_id}, as_dict=True)
        
        if result and result[0].get("created_at"):
            # Return only the date part (YYYY-MM-DD)
            created_at = result[0].get("created_at")
            if created_at:
                return str(created_at).split()[0]  # Get date part only
        
        return None
    except Exception:
        # If any error, return None
        return None

def get_ad_expenses(filters: Filters, ad_name: str) -> float:
    """Get total expenses for a specific ad within the date range"""
    query = """
        SELECT COALESCE(SUM(CAST(ce.total_amount AS DECIMAL(10,2))), 0) as total_expense
        FROM `tabCampaign Expense` ce
        WHERE ce.date BETWEEN %(from_date)s AND %(to_date)s
        AND ce.ad_name = %(ad_name)s
    """
    
    params = {
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
        "ad_name": ad_name,
    }
    
    result = frappe.db.sql(query, params, as_dict=True)
    return float(result[0].get("total_expense", 0)) if result else 0.0

def get_ad_revenue(filters: Filters, ad_name: str, source: str | None, lifetime: bool = False) -> float:
    """Get revenue for a specific ad and source.
    
    Args:
        filters: Report filters
        ad_name: The ad name
        source: The source (can be None for all sources)
        lifetime: If True, get all-time revenue. If False, get revenue within date range.
    """
    
    # Build the date condition
    date_condition = ""
    if not lifetime:
        date_condition = "AND p.transaction_date BETWEEN %(from_date)s AND %(to_date)s"
    
    # Query to get only Surgery payments
    query = f"""
        SELECT 
            COALESCE(SUM(
                CASE 
                    WHEN p.total_amount_received IS NOT NULL AND p.total_amount_received != ''
                    THEN CAST(p.total_amount_received AS DECIMAL(10,2))
                    ELSE 0
                END
            ), 0) as revenue
        FROM `tabPayment` p
        INNER JOIN (
            -- Payments via Surgery only
            SELECT s.name as payment_patient, l.source, l.ad_name
            FROM `tabSurgery` s
            INNER JOIN `tabCosting` c ON s.patient = c.name
            INNER JOIN `tabLead` l ON c.patient = l.name
            WHERE l.ad_name = %(ad_name)s
        ) AS lead_data ON p.patient = lead_data.payment_patient
        WHERE p.type = 'Payment'
        AND p.payment_type = 'Surgery'
        {date_condition}
    """
    
    # Add source filter if specified (ignore empty strings)
    if source and source.strip():
        query += " AND lead_data.source = %(source)s"
    
    params = {
        "ad_name": ad_name,
    }
    
    if not lifetime:
        params["from_date"] = filters.get("from_date")
        params["to_date"] = filters.get("to_date")
    
    if source and source.strip():
        params["source"] = source.strip()
    
    # Execute query
    result = frappe.db.sql(query, params, as_dict=True)
    
    return float(result[0].get("revenue", 0)) if result else 0.0

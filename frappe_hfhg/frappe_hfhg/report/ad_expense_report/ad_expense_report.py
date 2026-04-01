import frappe
from frappe import _
from frappe_hfhg.frappe_hfhg.doctype.centre_assignment.centre_assignment import apply_marketing_head_center_filter

Filters = frappe._dict

META_ADS_BY_TRIMMED_NAME_SQL = """
    SELECT
        TRIM(ads_name) AS trimmed_ads_name,
        COUNT(*) AS match_count,
        IF(COUNT(*) = 1, MAX(name), NULL) AS single_meta_id,
        MAX(ads_name) AS display_ads_name
    FROM `tabMeta Ads`
    WHERE ads_name IS NOT NULL
      AND ads_name != ''
    GROUP BY TRIM(ads_name)
"""

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
    group_by = (filters or {}).get("group_by") or "Campaign"
    if group_by == "Form":
        return [
            {
                "label": _("Form ID"),
                "fieldtype": "Data",
                "fieldname": "form_id",
                "width": 160,
            },
            {
                "label": _("Form Name"),
                "fieldtype": "Data",
                "fieldname": "form_name",
                "width": 260,
            },
            {
                "label": _("Campaign ID"),
                "fieldtype": "Data",
                "fieldname": "campaign_id",
                "width": 170,
            },
            {
                "label": _("Campaign Name"),
                "fieldtype": "Data",
                "fieldname": "campaign_name",
                "width": 280,
            },
            {
                "label": _("Source"),
                "fieldtype": "Data",
                "fieldname": "source",
                "width": 120,
            },
            {
                "label": _("Sub Source"),
                "fieldtype": "Data",
                "fieldname": "subsource",
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
                "label": _("Leads Generated"),
                "fieldtype": "Int",
                "fieldname": "leads_in_period",
                "width": 130,
            },
            {
                "label": _("Cost Per Lead (₹)"),
                "fieldtype": "Float",
                "fieldname": "cost_per_lead",
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
    if group_by == "Campaign":
        return [
            {
                "label": _("Campaign ID"),
                "fieldtype": "Data",
                "fieldname": "campaign_id",
                "width": 170,
            },
            {
                "label": _("Campaign Name"),
                "fieldtype": "Data",
                "fieldname": "campaign_name",
                "width": 280,
            },
            {
                "label": _("Form ID"),
                "fieldtype": "Data",
                "fieldname": "form_id",
                "width": 160,
            },
            {
                "label": _("Source"),
                "fieldtype": "Data",
                "fieldname": "source",
                "width": 120,
            },
            {
                "label": _("Sub Source"),
                "fieldtype": "Data",
                "fieldname": "subsource",
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
                "label": _("Leads Generated"),
                "fieldtype": "Int",
                "fieldname": "leads_in_period",
                "width": 130,
            },
            {
                "label": _("Cost Per Lead (₹)"),
                "fieldtype": "Float",
                "fieldname": "cost_per_lead",
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

    return [
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
            "label": _("Sub Source"),
            "fieldtype": "Data",
            "fieldname": "subsource",
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
        {
            "label": _("Details"),
            "fieldtype": "Data",
            "fieldname": "details_button",
            "width": 110,
        },
    ]

def get_data(filters: Filters) -> list[dict]:
    group_by = (filters or {}).get("group_by") or "Ad"
    if group_by == "Form":
        expense_map, expense_details = get_campaign_expense_summary_by_form(filters)
        revenue_period_map, revenue_period_details = get_surgery_revenue_summary_by_form(filters, lifetime=False)
        revenue_lifetime_map, revenue_lifetime_details = get_surgery_revenue_summary_by_form(filters, lifetime=True)

        all_keys: set[str] = set(expense_map.keys())
        all_keys.update(revenue_period_map.keys())
        all_keys.update(revenue_lifetime_map.keys())
        if not all_keys:
            return []

        merged_details = merge_form_details(
            list(all_keys),
            expense_details,
            revenue_period_details,
            revenue_lifetime_details,
        )
        sources = get_lead_sources_for_form_keys(all_keys, filters)
        subsources = get_lead_subsources_for_form_keys(all_keys, filters)

        rows: list[dict] = []
        for key in sorted(all_keys, key=lambda value: (merged_details.get(value, {}).get("form_name") or value)):
            period_revenue = float(revenue_period_map.get(key, 0.0))
            total_expense = float(expense_map.get(key, 0.0))
            if total_expense == 0 and period_revenue == 0:
                continue

            lifetime_revenue = float(revenue_lifetime_map.get(key, 0.0))
            net_profit = period_revenue - total_expense
            roi_percent = ((period_revenue - total_expense) / total_expense * 100) if total_expense else 0.0
            detail = merged_details.get(key, {})
            source_value = sources.get(key, "")

            rows.append({
                "form_id": detail.get("form_id") or key,
                "form_name": detail.get("form_name") or key,
                "campaign_id": detail.get("campaign_id") or "",
                "campaign_name": detail.get("campaign_name") or "",
                "source": source_value,
                "subsource": subsources.get(key, "") if source_value == "Meta" else "",
                "total_expense": total_expense,
                "lifetime_revenue": lifetime_revenue,
                "period_revenue": period_revenue,
                "net_profit": net_profit,
                "roi_percent": roi_percent,
            })

        return rows
    if group_by == "Campaign":
        expense_map, expense_names = get_campaign_expense_summary_by_campaign(filters)
        revenue_period_map, revenue_period_names = get_surgery_revenue_summary_by_campaign(filters, lifetime=False)
        revenue_lifetime_map, revenue_lifetime_names = get_surgery_revenue_summary_by_campaign(filters, lifetime=True)

        all_keys: set[str] = set(expense_map.keys())
        all_keys.update(revenue_period_map.keys())
        all_keys.update(revenue_lifetime_map.keys())
        if not all_keys:
            return []

        campaign_details = get_meta_campaign_details(list(all_keys), {
            **expense_names,
            **revenue_period_names,
            **revenue_lifetime_names,
        })
        latest_lead_details = get_latest_lead_details_for_campaign_keys(all_keys, filters)
        lead_counts = get_lead_counts_for_campaign_keys(all_keys, filters)

        rows: list[dict] = []
        for key in sorted(all_keys, key=lambda value: (campaign_details.get(value, {}).get("campaign_name") or value)):
            period_revenue = float(revenue_period_map.get(key, 0.0))
            total_expense = float(expense_map.get(key, 0.0))
            if total_expense == 0 and period_revenue == 0:
                continue

            lifetime_revenue = float(revenue_lifetime_map.get(key, 0.0))
            meta = campaign_details.get(key, {
                "campaign_id": key,
                "campaign_name": expense_names.get(key) or revenue_period_names.get(key) or revenue_lifetime_names.get(key) or key,
            })
            net_profit = period_revenue - total_expense
            roi_percent = ((period_revenue - total_expense) / total_expense * 100) if total_expense else 0.0
            leads_in_period = int(lead_counts.get(key, 0))
            cost_per_lead = (total_expense / leads_in_period) if leads_in_period else 0.0
            lead_detail = latest_lead_details.get(key, {})
            source = lead_detail.get("source") or ""
            form_id = lead_detail.get("form_id") or ""

            rows.append({
                "campaign_id": meta.get("campaign_id") or key,
                "campaign_name": meta.get("campaign_name") or key,
                "form_id": form_id,
                "source": source,
                "subsource": (lead_detail.get("subsource") or "") if source == "Meta" else "",
                "total_expense": total_expense,
                "leads_in_period": leads_in_period,
                "cost_per_lead": cost_per_lead,
                "lifetime_revenue": lifetime_revenue,
                "period_revenue": period_revenue,
                "net_profit": net_profit,
                "roi_percent": roi_percent,
            })

        return rows

    # Aggregate expenses and revenues using Meta Ads as the canonical reference
    expense_map, expense_fallback_names = get_campaign_expense_summary(filters)
    revenue_period_map, revenue_period_fallbacks = get_surgery_revenue_summary(filters, lifetime=False)
    revenue_lifetime_map, revenue_lifetime_fallbacks = get_surgery_revenue_summary(filters, lifetime=True)

    all_canonical_ids: set[str] = set(expense_map.keys())
    all_canonical_ids.update(revenue_period_map.keys())
    all_canonical_ids.update(revenue_lifetime_map.keys())

    if not all_canonical_ids:
        return []

    # Merge fallback names (used for display and secondary lookups)
    all_fallback_names: dict[str, str] = {}
    all_fallback_names.update(expense_fallback_names)
    all_fallback_names.update(revenue_period_fallbacks)
    all_fallback_names.update(revenue_lifetime_fallbacks)

    # Fetch metadata keyed by canonical Meta Ads docname
    meta_details = get_meta_ads_details(list(all_canonical_ids), all_fallback_names)
    creation_dates = get_meta_lead_form_dates(all_canonical_ids, all_fallback_names)
    sources = get_lead_sources_for_canonical_ids(all_canonical_ids, all_fallback_names, filters)
    subsources = get_lead_subsources_for_canonical_ids(all_canonical_ids, all_fallback_names, filters)

    rows: list[dict] = []
    for canonical_id in sorted(all_canonical_ids, key=lambda value: (all_fallback_names.get(value) or value)):
        period_revenue = float(revenue_period_map.get(canonical_id, 0.0))
        total_expense = float(expense_map.get(canonical_id, 0.0))

        # Skip rows that have neither expense nor revenue in the filtered range
        if total_expense == 0 and period_revenue == 0:
            continue

        lifetime_revenue = float(revenue_lifetime_map.get(canonical_id, 0.0))
        meta = meta_details.get(canonical_id, {
            "ad_id": canonical_id,
            "ads_name": all_fallback_names.get(canonical_id) or canonical_id,
            "status": "",
        })

        display_name = meta.get("ads_name") or all_fallback_names.get(canonical_id) or canonical_id
        status = meta.get("status") or ""
        ad_created_date = creation_dates.get(canonical_id)
        net_profit = period_revenue - total_expense
        roi_percent = ((period_revenue - total_expense) / total_expense * 100) if total_expense else 0.0

        rows.append({
            "ad_id": meta.get("ad_id") or canonical_id,
            "ad_display_name": display_name,
            "ad_status": status,
            "ad_created_date": ad_created_date,
            "source": sources.get(canonical_id, ""),
            "subsource": subsources.get(canonical_id, "") if sources.get(canonical_id, "") == "Meta" else "",
            "total_expense": total_expense,
            "lifetime_revenue": lifetime_revenue,
            "period_revenue": period_revenue,
            "net_profit": net_profit,
            "roi_percent": roi_percent,
            "details_button": _("Details"),
        })

    return rows


def normalize_identifier(value: str | None) -> str:
    return str(value).strip() if value else ""


def make_identifier_tuple(values: set[str]) -> tuple[str, ...]:
    cleaned = tuple(sorted({normalize_identifier(v) for v in values if normalize_identifier(v)}))
    return cleaned


def cast_to_float(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def get_revenue_ad_identifiers(filters: Filters) -> tuple[list[str], dict[str, str]]:
    """Get ad identifiers from surgery payments in the date range."""
    params = {
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
    }
    if filters.get("source"):
        params["source"] = filters["source"]
    if filters.get("subsource"):
        params["subsource"] = filters["subsource"]

    query = (
        f"""
        SELECT DISTINCT
            CASE
                WHEN ma_by_name.name IS NOT NULL THEN ma_by_name.name
                WHEN ma_by_ads_unique.single_meta_id IS NOT NULL THEN ma_by_ads_unique.single_meta_id
                ELSE TRIM(l.ad_name)
            END AS ad_identifier,
            MIN(TRIM(l.ad_name)) AS fallback_ad_name
        FROM `tabPayment` p
        INNER JOIN `tabSurgery` s ON s.name = p.patient
        INNER JOIN `tabCosting` c ON s.patient = c.name
        INNER JOIN `tabLead` l ON c.patient = l.name
        LEFT JOIN `tabMeta Ads` ma_by_name ON ma_by_name.name = l.ad_name
        LEFT JOIN (
            {META_ADS_BY_TRIMMED_NAME_SQL}
        ) ma_by_ads_unique ON ma_by_ads_unique.trimmed_ads_name = TRIM(l.ad_name)
        WHERE p.docstatus < 2
          AND p.type = 'Payment'
          AND p.payment_type = 'Surgery'
          AND IFNULL(s.pending_amount, 0) = 0
          AND p.transaction_date BETWEEN %(from_date)s AND %(to_date)s
          AND l.ad_name IS NOT NULL
          AND l.ad_name != ''
        """
        + (f" AND l.source = %(source)s" if filters.get("source") else "")
        + (f" AND l.subsource = %(subsource)s" if filters.get("subsource") else "")
        + """
        GROUP BY ad_identifier
        HAVING ad_identifier IS NOT NULL AND ad_identifier != ''
        """
    )
    query, params = apply_marketing_head_center_filter(query, params, center_field="center", table_alias="l")
    rows = frappe.db.sql(query, params, as_dict=True)
    
    identifiers: list[str] = []
    fallback_names: dict[str, str] = {}
    
    for row in rows:
        identifier = normalize_identifier(row.get("ad_identifier"))
        if not identifier:
            continue
        if identifier not in identifiers:
            identifiers.append(identifier)
        fallback_name = normalize_identifier(row.get("fallback_ad_name"))
        if fallback_name:
            fallback_names[identifier] = fallback_name
    
    return identifiers, fallback_names


def get_campaign_expense_summary(filters: Filters) -> tuple[dict[str, float], dict[str, str]]:
    params = {
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
    }
    campaign_name_filter = normalize_identifier(filters.get("campaign_name"))

    filter_clause = ""
    if campaign_name_filter:
        params["campaign_name_filter"] = f"%{campaign_name_filter}%"
        filter_clause = (
            "AND TRIM(ce.campaign) LIKE %(campaign_name_filter)s"
        )

    records = frappe.db.sql(
        f"""
        SELECT 
            CASE
                WHEN ce.meta_ad_id IS NOT NULL AND ce.meta_ad_id != '' THEN ce.meta_ad_id
                WHEN ma_by_ads_unique.single_meta_id IS NOT NULL THEN ma_by_ads_unique.single_meta_id
                ELSE TRIM(ce.ad_name)
            END AS canonical_id,
            COALESCE(
                ma_by_id.ads_name,
                CASE
                    WHEN ma_by_ads_unique.single_meta_id IS NOT NULL THEN ma_by_ads_unique.display_ads_name
                    ELSE NULL
                END,
                TRIM(ce.ad_name)
            ) AS display_name,
            COALESCE(SUM(
                CASE 
                    WHEN ce.total_amount IS NOT NULL AND ce.total_amount != ''
                    THEN CAST(ce.total_amount AS DECIMAL(18,2))
                    ELSE 0
                END
            ), 0) AS total_expense
        FROM `tabCampaign Expense` ce
        LEFT JOIN `tabMeta Ads` ma_by_id ON ma_by_id.name = ce.meta_ad_id
        LEFT JOIN (
            {META_ADS_BY_TRIMMED_NAME_SQL}
        ) ma_by_ads_unique ON ma_by_ads_unique.trimmed_ads_name = TRIM(ce.ad_name)
        WHERE (
              (ce.meta_ad_id IS NOT NULL AND ce.meta_ad_id != '')
              OR (ce.ad_name IS NOT NULL AND ce.ad_name != '')
          )
          AND ce.date BETWEEN %(from_date)s AND %(to_date)s
          {filter_clause}
        GROUP BY canonical_id, display_name
        HAVING canonical_id IS NOT NULL AND canonical_id != ''
        ORDER BY canonical_id
        """,
        params,
        as_dict=True,
    )

    expense_map: dict[str, float] = {}
    fallback_names: dict[str, str] = {}

    for row in records:
        canonical_id = normalize_identifier(row.get("canonical_id"))
        if not canonical_id:
            continue
        expense_map[canonical_id] = cast_to_float(row.get("total_expense"))
        display_name = normalize_identifier(row.get("display_name"))
        if display_name:
            fallback_names[canonical_id] = display_name

    return expense_map, fallback_names


def get_campaign_expense_summary_by_campaign(filters: Filters) -> tuple[dict[str, float], dict[str, str]]:
    params = {
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
    }
    campaign_name_filter = normalize_identifier(filters.get("campaign_name"))

    filter_clause = ""
    if campaign_name_filter:
        params["name_filter"] = f"%{campaign_name_filter}%"
        filter_clause = "AND (TRIM(mc.campaign_name) LIKE %(name_filter)s OR TRIM(ce.campaign) LIKE %(name_filter)s)"

    records = frappe.db.sql(
        f"""
        SELECT
            COALESCE(mlf.campaign, ma_by_id.campaign, TRIM(ce.campaign)) AS campaign_key,
            COALESCE(mc.campaign_name, TRIM(ce.campaign)) AS campaign_name,
            COALESCE(SUM(
                CASE
                    WHEN ce.total_amount IS NOT NULL AND ce.total_amount != ''
                    THEN CAST(ce.total_amount AS DECIMAL(18,2))
                    ELSE 0
                END
            ), 0) AS total_expense
        FROM `tabCampaign Expense` ce
        LEFT JOIN `tabMeta Lead Form` mlf ON mlf.name = ce.meta_lead_form
        LEFT JOIN `tabMeta Ads` ma_by_id ON ma_by_id.name = ce.meta_ad_id
        LEFT JOIN `tabMeta Campaign` mc ON mc.name = COALESCE(mlf.campaign, ma_by_id.campaign)
        WHERE ce.date BETWEEN %(from_date)s AND %(to_date)s
          AND (
                (ce.meta_lead_form IS NOT NULL AND ce.meta_lead_form != '')
                OR (ce.meta_ad_id IS NOT NULL AND ce.meta_ad_id != '')
                OR (ce.campaign IS NOT NULL AND ce.campaign != '')
          )
          {filter_clause}
        GROUP BY campaign_key, campaign_name
        HAVING campaign_key IS NOT NULL AND campaign_key != ''
        ORDER BY campaign_key
        """,
        params,
        as_dict=True,
    )

    expense_map: dict[str, float] = {}
    name_map: dict[str, str] = {}

    for row in records:
        key = normalize_identifier(row.get("campaign_key"))
        if not key:
            continue
        expense_map[key] = cast_to_float(row.get("total_expense"))
        cname = normalize_identifier(row.get("campaign_name"))
        if cname:
            name_map[key] = cname

    return expense_map, name_map


def get_campaign_expense_summary_by_form(filters: Filters) -> tuple[dict[str, float], dict[str, dict]]:
    params = {
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
    }
    campaign_name_filter = normalize_identifier(filters.get("campaign_name"))

    filter_clause = ""
    if campaign_name_filter:
        params["name_filter"] = f"%{campaign_name_filter}%"
        filter_clause = "AND (TRIM(mc.campaign_name) LIKE %(name_filter)s OR TRIM(ce.campaign) LIKE %(name_filter)s)"

    records = frappe.db.sql(
        f"""
        SELECT
            TRIM(ce.meta_lead_form) AS form_key,
            mlf.form_id AS form_id,
            mlf.form_name AS form_name,
            mlf.campaign AS campaign_id,
            mc.campaign_name AS campaign_name,
            COALESCE(SUM(
                CASE
                    WHEN ce.total_amount IS NOT NULL AND ce.total_amount != ''
                    THEN CAST(ce.total_amount AS DECIMAL(18,2))
                    ELSE 0
                END
            ), 0) AS total_expense
        FROM `tabCampaign Expense` ce
        LEFT JOIN `tabMeta Lead Form` mlf ON mlf.name = ce.meta_lead_form
        LEFT JOIN `tabMeta Campaign` mc ON mc.name = mlf.campaign
        WHERE ce.date BETWEEN %(from_date)s AND %(to_date)s
          AND ce.meta_lead_form IS NOT NULL
          AND ce.meta_lead_form != ''
          {filter_clause}
        GROUP BY form_key, form_id, form_name, campaign_id, campaign_name
        HAVING form_key IS NOT NULL AND form_key != ''
        ORDER BY form_key
        """,
        params,
        as_dict=True,
    )

    expense_map: dict[str, float] = {}
    details_map: dict[str, dict] = {}
    for row in records:
        key = normalize_identifier(row.get("form_key"))
        if not key:
            continue
        expense_map[key] = cast_to_float(row.get("total_expense"))
        details_map[key] = {
            "form_id": row.get("form_id") or key,
            "form_name": row.get("form_name") or key,
            "campaign_id": row.get("campaign_id") or "",
            "campaign_name": row.get("campaign_name") or "",
        }

    return expense_map, details_map


def get_surgery_revenue_summary_by_form(filters: Filters, lifetime: bool) -> tuple[dict[str, float], dict[str, dict]]:
    date_condition = ""
    params: dict[str, object] = {}
    if not lifetime:
        date_condition = "AND p.transaction_date BETWEEN %(from_date)s AND %(to_date)s"
        params.update({
            "from_date": filters.get("from_date"),
            "to_date": filters.get("to_date"),
        })

    if filters.get("source"):
        params["source"] = filters["source"]
    if filters.get("subsource"):
        params["subsource"] = filters["subsource"]
    if filters.get("campaign_name"):
        params["campaign_name_filter"] = f"%{normalize_identifier(filters.get('campaign_name'))}%"

    revenue_query = (
        f"""
        SELECT
            TRIM(l.form_id) AS form_key,
            mlf.form_id AS form_id,
            mlf.form_name AS form_name,
            mlf.campaign AS campaign_id,
            mc.campaign_name AS campaign_name,
            COALESCE(SUM(
                CASE
                    WHEN p.total_amount_received IS NOT NULL AND p.total_amount_received != ''
                    THEN CAST(p.total_amount_received AS DECIMAL(18,2))
                    ELSE 0
                END
            ), 0) AS revenue
        FROM `tabPayment` p
        INNER JOIN `tabSurgery` s ON s.name = p.patient
        INNER JOIN `tabCosting` c ON s.patient = c.name
        INNER JOIN `tabLead` l ON c.patient = l.name
        LEFT JOIN `tabMeta Lead Form` mlf ON mlf.name = l.form_id
        LEFT JOIN `tabMeta Campaign` mc ON mc.name = mlf.campaign
        WHERE p.docstatus < 2
          AND p.type = 'Payment'
          AND p.payment_type = 'Surgery'
          AND IFNULL(s.pending_amount, 0) = 0
          AND l.form_id IS NOT NULL
          AND l.form_id != ''
          {date_condition}
        """
        + (" AND l.source = %(source)s" if filters.get("source") else "")
        + (" AND l.subsource = %(subsource)s" if filters.get("subsource") else "")
        + (" AND (TRIM(mc.campaign_name) LIKE %(campaign_name_filter)s OR TRIM(l.campaign_name) LIKE %(campaign_name_filter)s)" if filters.get("campaign_name") else "")
        + """
        GROUP BY form_key, form_id, form_name, campaign_id, campaign_name
        HAVING form_key IS NOT NULL AND form_key != ''
        """
    )
    revenue_query, params = apply_marketing_head_center_filter(revenue_query, params, center_field="center", table_alias="l")
    revenue_rows = frappe.db.sql(revenue_query, params, as_dict=True)

    revenue_map: dict[str, float] = {}
    details_map: dict[str, dict] = {}
    for row in revenue_rows:
        key = normalize_identifier(row.get("form_key"))
        if not key:
            continue
        revenue_map[key] = cast_to_float(row.get("revenue"))
        details_map[key] = {
            "form_id": row.get("form_id") or key,
            "form_name": row.get("form_name") or key,
            "campaign_id": row.get("campaign_id") or "",
            "campaign_name": row.get("campaign_name") or "",
        }

    return revenue_map, details_map


def merge_form_details(keys: list[str], *detail_maps: dict[str, dict]) -> dict[str, dict]:
    merged: dict[str, dict] = {}
    for key in keys:
        merged[key] = {"form_id": key, "form_name": key, "campaign_id": "", "campaign_name": ""}
        for dm in detail_maps:
            if key in dm and isinstance(dm[key], dict):
                merged[key].update({k: v for k, v in dm[key].items() if v is not None and v != ""})
    return merged


def get_lead_sources_for_form_keys(form_keys: set[str], filters: Filters) -> dict[str, str]:
    ids_tuple = make_identifier_tuple(set(form_keys))
    if not ids_tuple:
        return {}

    params: dict[str, object] = {"form_keys": ids_tuple}
    if filters and filters.get("source"):
        params["source"] = filters["source"]
    if filters and filters.get("subsource"):
        params["subsource"] = filters["subsource"]

    query = (
        """
        SELECT
            TRIM(l.form_id) AS form_key,
            l.source,
            l.subsource,
            l.modified
        FROM `tabLead` l
        WHERE l.docstatus < 2
          AND TRIM(l.form_id) IN %(form_keys)s
        """
        + (" AND l.source = %(source)s" if filters and filters.get("source") else "")
        + (" AND l.subsource = %(subsource)s" if filters and filters.get("subsource") else "")
    )
    query, params = apply_marketing_head_center_filter(query, params, center_field="center", table_alias="l")
    query += """
        ORDER BY l.modified DESC
        """
    rows = frappe.db.sql(query, params, as_dict=True)

    source_map: dict[str, str] = {}
    for row in rows:
        key = normalize_identifier(row.get("form_key"))
        if not key or key in source_map:
            continue
        source_map[key] = row.get("source") or ""

    return source_map


def get_lead_subsources_for_form_keys(form_keys: set[str], filters: Filters) -> dict[str, str]:
    ids_tuple = make_identifier_tuple(set(form_keys))
    if not ids_tuple:
        return {}

    params: dict[str, object] = {"form_keys": ids_tuple}
    if filters and filters.get("source"):
        params["source"] = filters["source"]
    if filters and filters.get("subsource"):
        params["subsource"] = filters["subsource"]

    query = (
        """
        SELECT
            TRIM(l.form_id) AS form_key,
            l.subsource,
            l.modified
        FROM `tabLead` l
        WHERE l.docstatus < 2
          AND TRIM(l.form_id) IN %(form_keys)s
          AND l.subsource IS NOT NULL
          AND l.subsource != ''
        """
        + (" AND l.source = %(source)s" if filters and filters.get("source") else "")
        + (" AND l.subsource = %(subsource)s" if filters and filters.get("subsource") else "")
    )
    query, params = apply_marketing_head_center_filter(query, params, center_field="center", table_alias="l")
    query += """
        ORDER BY l.modified DESC
        """
    rows = frappe.db.sql(query, params, as_dict=True)

    subsource_map: dict[str, str] = {}
    for row in rows:
        key = normalize_identifier(row.get("form_key"))
        if not key or key in subsource_map:
            continue
        subsource_map[key] = row.get("subsource") or ""

    return subsource_map


def get_surgery_revenue_summary_by_campaign(filters: Filters, lifetime: bool) -> tuple[dict[str, float], dict[str, str]]:
    date_condition = ""
    params: dict[str, object] = {}
    if not lifetime:
        date_condition = "AND p.transaction_date BETWEEN %(from_date)s AND %(to_date)s"
        params.update({
            "from_date": filters.get("from_date"),
            "to_date": filters.get("to_date"),
        })

    if filters.get("source"):
        params["source"] = filters["source"]
    if filters.get("subsource"):
        params["subsource"] = filters["subsource"]
    if filters.get("campaign_name"):
        params["campaign_name_filter"] = f"%{normalize_identifier(filters.get('campaign_name'))}%"

    revenue_query = (
        f"""
        SELECT
            COALESCE(mlf.campaign, TRIM(l.campaign_name)) AS campaign_key,
            COALESCE(mc.campaign_name, TRIM(l.campaign_name)) AS campaign_name,
            COALESCE(SUM(
                CASE
                    WHEN p.total_amount_received IS NOT NULL AND p.total_amount_received != ''
                    THEN CAST(p.total_amount_received AS DECIMAL(18,2))
                    ELSE 0
                END
            ), 0) AS revenue
        FROM `tabPayment` p
        INNER JOIN `tabSurgery` s ON s.name = p.patient
        INNER JOIN `tabCosting` c ON s.patient = c.name
        INNER JOIN `tabLead` l ON c.patient = l.name
        LEFT JOIN `tabMeta Lead Form` mlf ON mlf.name = l.form_id
        LEFT JOIN `tabMeta Campaign` mc ON mc.name = mlf.campaign
        WHERE p.docstatus < 2
          AND p.type = 'Payment'
          AND p.payment_type = 'Surgery'
          AND IFNULL(s.pending_amount, 0) = 0
          {date_condition}
        """
        + (" AND l.source = %(source)s" if filters.get("source") else "")
        + (" AND l.subsource = %(subsource)s" if filters.get("subsource") else "")
        + (" AND (TRIM(mc.campaign_name) LIKE %(campaign_name_filter)s OR TRIM(l.campaign_name) LIKE %(campaign_name_filter)s)" if filters.get("campaign_name") else "")
        + """
        GROUP BY campaign_key, campaign_name
        HAVING campaign_key IS NOT NULL AND campaign_key != ''
        """
    )
    revenue_query, params = apply_marketing_head_center_filter(revenue_query, params, center_field="center", table_alias="l")
    revenue_rows = frappe.db.sql(revenue_query, params, as_dict=True)

    revenue_map: dict[str, float] = {}
    name_map: dict[str, str] = {}
    for row in revenue_rows:
        key = normalize_identifier(row.get("campaign_key"))
        if not key:
            continue
        revenue_map[key] = cast_to_float(row.get("revenue"))
        cname = normalize_identifier(row.get("campaign_name"))
        if cname:
            name_map[key] = cname

    return revenue_map, name_map


def get_meta_campaign_details(campaign_keys: list[str], fallback_names: dict[str, str]) -> dict[str, dict]:
    details: dict[str, dict] = {}
    key_tuple = make_identifier_tuple(set(campaign_keys))
    if key_tuple:
        rows = frappe.db.sql(
            """
            SELECT name, campaign_name
            FROM `tabMeta Campaign`
            WHERE name IN %(names)s
            """,
            {"names": key_tuple},
            as_dict=True,
        )
        for row in rows:
            key = normalize_identifier(row.get("name"))
            if not key:
                continue
            details[key] = {
                "campaign_id": row.get("name"),
                "campaign_name": row.get("campaign_name") or fallback_names.get(key) or key,
            }

    for key in campaign_keys:
        if key not in details:
            details[key] = {
                "campaign_id": key,
                "campaign_name": fallback_names.get(key) or key,
            }

    return details


def get_lead_sources_for_campaign_keys(campaign_keys: set[str], filters: Filters) -> dict[str, str]:
    ids_tuple = make_identifier_tuple(set(campaign_keys))
    if not ids_tuple:
        return {}

    params: dict[str, object] = {"campaign_keys": ids_tuple}
    if filters and filters.get("source"):
        params["source"] = filters["source"]
    if filters and filters.get("subsource"):
        params["subsource"] = filters["subsource"]

    query = (
        """
        SELECT
            COALESCE(mlf.campaign, TRIM(l.campaign_name)) AS campaign_key,
            l.source,
            l.subsource,
            l.modified
        FROM `tabLead` l
        LEFT JOIN `tabMeta Lead Form` mlf ON mlf.name = l.form_id
        WHERE l.docstatus < 2
          AND COALESCE(mlf.campaign, TRIM(l.campaign_name)) IN %(campaign_keys)s
        """
        + (" AND l.source = %(source)s" if filters and filters.get("source") else "")
        + (" AND l.subsource = %(subsource)s" if filters and filters.get("subsource") else "")
    )
    query, params = apply_marketing_head_center_filter(query, params, center_field="center", table_alias="l")
    query += """
        ORDER BY l.modified DESC
        """
    rows = frappe.db.sql(query, params, as_dict=True)

    source_map: dict[str, str] = {}
    for row in rows:
        key = normalize_identifier(row.get("campaign_key"))
        if not key or key in source_map:
            continue
        source_map[key] = row.get("source") or ""

    return source_map


def get_lead_subsources_for_campaign_keys(campaign_keys: set[str], filters: Filters) -> dict[str, str]:
    ids_tuple = make_identifier_tuple(set(campaign_keys))
    if not ids_tuple:
        return {}

    params: dict[str, object] = {"campaign_keys": ids_tuple}
    if filters and filters.get("source"):
        params["source"] = filters["source"]
    if filters and filters.get("subsource"):
        params["subsource"] = filters["subsource"]

    query = (
        """
        SELECT
            COALESCE(mlf.campaign, TRIM(l.campaign_name)) AS campaign_key,
            l.subsource,
            l.modified
        FROM `tabLead` l
        LEFT JOIN `tabMeta Lead Form` mlf ON mlf.name = l.form_id
        WHERE l.docstatus < 2
          AND COALESCE(mlf.campaign, TRIM(l.campaign_name)) IN %(campaign_keys)s
          AND l.subsource IS NOT NULL
          AND l.subsource != ''
        """
        + (" AND l.source = %(source)s" if filters and filters.get("source") else "")
        + (" AND l.subsource = %(subsource)s" if filters and filters.get("subsource") else "")
    )
    query, params = apply_marketing_head_center_filter(query, params, center_field="center", table_alias="l")
    query += """
        ORDER BY l.modified DESC
        """
    rows = frappe.db.sql(query, params, as_dict=True)

    subsource_map: dict[str, str] = {}
    for row in rows:
        key = normalize_identifier(row.get("campaign_key"))
        if not key or key in subsource_map:
            continue
        subsource_map[key] = row.get("subsource") or ""

    return subsource_map


def get_latest_lead_details_for_campaign_keys(campaign_keys: set[str], filters: Filters) -> dict[str, dict[str, str]]:
    ids_tuple = make_identifier_tuple(set(campaign_keys))
    if not ids_tuple:
        return {}

    params: dict[str, object] = {"campaign_keys": ids_tuple}
    if filters and filters.get("source"):
        params["source"] = filters["source"]
    if filters and filters.get("subsource"):
        params["subsource"] = filters["subsource"]

    query = (
        """
        SELECT
            COALESCE(mlf.campaign, TRIM(l.campaign_name)) AS campaign_key,
            l.form_id,
            l.source,
            l.subsource,
            l.modified
        FROM `tabLead` l
        LEFT JOIN `tabMeta Lead Form` mlf ON mlf.name = l.form_id
        WHERE l.docstatus < 2
          AND COALESCE(mlf.campaign, TRIM(l.campaign_name)) IN %(campaign_keys)s
        """
        + (" AND l.source = %(source)s" if filters and filters.get("source") else "")
        + (" AND l.subsource = %(subsource)s" if filters and filters.get("subsource") else "")
    )
    query, params = apply_marketing_head_center_filter(query, params, center_field="center", table_alias="l")
    query += """
        ORDER BY l.modified DESC
        """
    rows = frappe.db.sql(query, params, as_dict=True)

    detail_map: dict[str, dict[str, str]] = {}
    for row in rows:
        key = normalize_identifier(row.get("campaign_key"))
        if not key or key in detail_map:
            continue
        detail_map[key] = {
            "form_id": row.get("form_id") or "",
            "source": row.get("source") or "",
            "subsource": row.get("subsource") or "",
        }

    return detail_map


def get_lead_counts_for_campaign_keys(campaign_keys: set[str], filters: Filters) -> dict[str, int]:
    ids_tuple = make_identifier_tuple(set(campaign_keys))
    if not ids_tuple:
        return {}

    params: dict[str, object] = {
        "campaign_keys": ids_tuple,
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
    }
    if filters and filters.get("source"):
        params["source"] = filters["source"]
    if filters and filters.get("subsource"):
        params["subsource"] = filters["subsource"]

    query = (
        """
        SELECT
            COALESCE(mlf.campaign, TRIM(l.campaign_name)) AS campaign_key,
            COUNT(*) AS lead_count
        FROM `tabLead` l
        LEFT JOIN `tabMeta Lead Form` mlf ON mlf.name = l.form_id
        WHERE l.docstatus < 2
          AND COALESCE(mlf.campaign, TRIM(l.campaign_name)) IN %(campaign_keys)s
          AND COALESCE(l.created_on, DATE(l.creation)) BETWEEN %(from_date)s AND %(to_date)s
        """
        + (" AND l.source = %(source)s" if filters and filters.get("source") else "")
        + (" AND l.subsource = %(subsource)s" if filters and filters.get("subsource") else "")
        + """
        GROUP BY campaign_key
        """
    )
    query, params = apply_marketing_head_center_filter(query, params, center_field="center", table_alias="l")
    rows = frappe.db.sql(query, params, as_dict=True)

    count_map: dict[str, int] = {}
    for row in rows:
        key = normalize_identifier(row.get("campaign_key"))
        if not key:
            continue
        count_map[key] = int(row.get("lead_count") or 0)

    return count_map


def get_surgery_revenue_summary(filters: Filters, lifetime: bool) -> tuple[dict[str, float], dict[str, str]]:
    date_condition = ""
    params: dict[str, object] = {}
    if not lifetime:
        date_condition = "AND p.transaction_date BETWEEN %(from_date)s AND %(to_date)s"
        params.update({
            "from_date": filters.get("from_date"),
            "to_date": filters.get("to_date"),
        })
    
    if filters.get("source"):
        params["source"] = filters["source"]
    if filters.get("subsource"):
        params["subsource"] = filters["subsource"]
    if filters.get("campaign_name"):
        params["campaign_name_filter"] = f"%{normalize_identifier(filters.get('campaign_name'))}%"

    revenue_query = (
        f"""
        SELECT 
            CASE
                WHEN ma_by_name.name IS NOT NULL THEN ma_by_name.name
                WHEN ma_by_ads_unique.single_meta_id IS NOT NULL THEN ma_by_ads_unique.single_meta_id
                ELSE TRIM(l.ad_name)
            END AS canonical_id,
            COALESCE(
                ma_by_name.ads_name,
                CASE
                    WHEN ma_by_ads_unique.single_meta_id IS NOT NULL THEN ma_by_ads_unique.display_ads_name
                    ELSE NULL
                END,
                TRIM(l.ad_name)
            ) AS display_name,
            COALESCE(SUM(
                CASE 
                    WHEN p.total_amount_received IS NOT NULL AND p.total_amount_received != ''
                    THEN CAST(p.total_amount_received AS DECIMAL(18,2))
                    ELSE 0
                END
            ), 0) AS revenue
        FROM `tabPayment` p
        INNER JOIN `tabSurgery` s ON s.name = p.patient
        INNER JOIN `tabCosting` c ON s.patient = c.name
        INNER JOIN `tabLead` l ON c.patient = l.name
        LEFT JOIN `tabMeta Ads` ma_by_name ON ma_by_name.name = l.ad_name
        LEFT JOIN (
            {META_ADS_BY_TRIMMED_NAME_SQL}
        ) ma_by_ads_unique ON ma_by_ads_unique.trimmed_ads_name = TRIM(l.ad_name)
        WHERE p.docstatus < 2
          AND p.type = 'Payment'
          AND p.payment_type = 'Surgery'
          AND IFNULL(s.pending_amount, 0) = 0
          {date_condition}
        """
        + (f" AND l.source = %(source)s" if filters.get("source") else "")
        + (f" AND l.subsource = %(subsource)s" if filters.get("subsource") else "")
        + (f" AND TRIM(l.campaign_name) LIKE %(campaign_name_filter)s" if filters.get("campaign_name") else "")
        + """
        GROUP BY canonical_id, display_name
        HAVING canonical_id IS NOT NULL AND canonical_id != ''
        """
    )
    revenue_query, params = apply_marketing_head_center_filter(revenue_query, params, center_field="center", table_alias="l")
    revenue_rows = frappe.db.sql(revenue_query, params, as_dict=True)

    revenue_map: dict[str, float] = {}
    fallback_names: dict[str, str] = {}

    for row in revenue_rows:
        canonical_id = normalize_identifier(row.get("canonical_id"))
        if not canonical_id:
            continue
        revenue_map[canonical_id] = cast_to_float(row.get("revenue"))
        display_name = normalize_identifier(row.get("display_name"))
        if display_name:
            fallback_names[canonical_id] = display_name

    return revenue_map, fallback_names


def get_meta_ads_details(canonical_ids: list[str], fallback_names: dict[str, str]) -> dict[str, dict]:
    details: dict[str, dict] = {}
    canonical_tuple = make_identifier_tuple(set(canonical_ids))

    if canonical_tuple:
        rows = frappe.db.sql(
            """
            SELECT name, ads_name, status
            FROM `tabMeta Ads`
            WHERE name IN %(names)s
            """,
            {"names": canonical_tuple},
            as_dict=True,
        )
        for row in rows:
            identifier = normalize_identifier(row.get("name"))
            if not identifier:
                continue
            details[identifier] = {
                "ad_id": row.get("name"),
                "ads_name": row.get("ads_name") or fallback_names.get(identifier) or identifier,
                "status": row.get("status") or "",
            }

    # Populate fallbacks for canonical IDs that are not Meta Ads docnames
    for canonical_id in canonical_ids:
        if canonical_id not in details:
            fallback = fallback_names.get(canonical_id)
            details[canonical_id] = {
                "ad_id": canonical_id,
                "ads_name": fallback or canonical_id,
                "status": "",
            }

    return details


def get_meta_lead_form_dates(canonical_ids: set[str], fallback_names: dict[str, str]) -> dict[str, str | None]:
    lookup_values = {normalize_identifier(value) for value in canonical_ids}
    lookup_values.update({normalize_identifier(name) for name in fallback_names.values() if name})

    id_tuple = make_identifier_tuple(lookup_values)
    if not id_tuple:
        return {}

    rows = frappe.db.sql(
        """
        SELECT ads, MIN(created_at) AS created_at
        FROM `tabMeta Lead Form`
        WHERE ads IN %(ids)s
        GROUP BY ads
        """,
        {"ids": id_tuple},
        as_dict=True,
    )

    # Build reverse lookup for fallback names
    fallback_to_canonical = {
        normalize_identifier(value): key
        for key, value in fallback_names.items()
        if normalize_identifier(value)
    }

    creation_map: dict[str, str | None] = {}
    canonical_set = {normalize_identifier(value) for value in canonical_ids}

    for row in rows:
        ads_value = normalize_identifier(row.get("ads"))
        if not ads_value:
            continue
        if ads_value in canonical_set:
            canonical_id = ads_value
        else:
            canonical_id = fallback_to_canonical.get(ads_value)
        if not canonical_id:
            continue
        creation_map[canonical_id] = str(row.get("created_at")).split()[0] if row.get("created_at") else None

    return creation_map


def get_lead_sources_for_canonical_ids(canonical_ids: set[str], fallback_names: dict[str, str], filters: Filters = None) -> dict[str, str]:
    if not canonical_ids and not fallback_names:
        return {}

    canonical_tuple = make_identifier_tuple(set(canonical_ids)) if canonical_ids else tuple()
    lookup_values = {normalize_identifier(value) for value in fallback_names.values() if value}
    lookup_values.update({normalize_identifier(value) for value in canonical_ids})
    lookup_tuple = make_identifier_tuple(lookup_values) if lookup_values else tuple()

    filter_clauses: list[str] = []
    params: dict[str, object] = {}

    if canonical_tuple:
        params["canonical_ids"] = canonical_tuple
        filter_clauses.append("ma_by_name.name IN %(canonical_ids)s")
        filter_clauses.append("ma_by_ads_unique.single_meta_id IN %(canonical_ids)s")
    if lookup_tuple:
        params["lookup_values"] = lookup_tuple
        filter_clauses.append("TRIM(l.ad_name) IN %(lookup_values)s")

    if not filter_clauses:
        return {}

    where_matcher = " AND (" + " OR ".join(filter_clauses) + ")"
    
    if filters:
        if filters.get("source"):
            params["source"] = filters["source"]
        if filters.get("subsource"):
            params["subsource"] = filters["subsource"]

    query = (
        f"""
        SELECT 
            CASE
                WHEN ma_by_name.name IS NOT NULL THEN ma_by_name.name
                WHEN ma_by_ads_unique.single_meta_id IS NOT NULL THEN ma_by_ads_unique.single_meta_id
                ELSE TRIM(l.ad_name)
            END AS canonical_id,
            l.source,
            l.subsource
        FROM `tabLead` l
        LEFT JOIN `tabMeta Ads` ma_by_name ON ma_by_name.name = l.ad_name
        LEFT JOIN (
            {META_ADS_BY_TRIMMED_NAME_SQL}
        ) ma_by_ads_unique ON ma_by_ads_unique.trimmed_ads_name = TRIM(l.ad_name)
        WHERE l.source IS NOT NULL
          AND l.source != ''
          AND l.ad_name IS NOT NULL
          AND l.ad_name != ''
          {where_matcher}
        """
        + (f" AND l.source = %(source)s" if filters and filters.get("source") else "")
        + (f" AND l.subsource = %(subsource)s" if filters and filters.get("subsource") else "")
    )
    query, params = apply_marketing_head_center_filter(query, params, center_field="center", table_alias="l")
    query += """
        ORDER BY l.modified DESC
        """
    rows = frappe.db.sql(query, params, as_dict=True)

    source_map: dict[str, str] = {}
    for row in rows:
        canonical_id = normalize_identifier(row.get("canonical_id"))
        if not canonical_id or canonical_id in source_map:
            continue
        source_map[canonical_id] = row.get("source") or ""

    return source_map


def get_lead_subsources_for_canonical_ids(canonical_ids: set[str], fallback_names: dict[str, str], filters: Filters = None) -> dict[str, str]:
    if not canonical_ids and not fallback_names:
        return {}

    canonical_tuple = make_identifier_tuple(set(canonical_ids)) if canonical_ids else tuple()
    lookup_values = {normalize_identifier(value) for value in fallback_names.values() if value}
    lookup_values.update({normalize_identifier(value) for value in canonical_ids})
    lookup_tuple = make_identifier_tuple(lookup_values) if lookup_values else tuple()

    filter_clauses: list[str] = []
    params: dict[str, object] = {}

    if canonical_tuple:
        params["canonical_ids"] = canonical_tuple
        filter_clauses.append("ma_by_name.name IN %(canonical_ids)s")
        filter_clauses.append("ma_by_ads_unique.single_meta_id IN %(canonical_ids)s")
    if lookup_tuple:
        params["lookup_values"] = lookup_tuple
        filter_clauses.append("TRIM(l.ad_name) IN %(lookup_values)s")

    if not filter_clauses:
        return {}

    where_matcher = " AND (" + " OR ".join(filter_clauses) + ")"
    
    if filters:
        if filters.get("source"):
            params["source"] = filters["source"]
        if filters.get("subsource"):
            params["subsource"] = filters["subsource"]

    query = (
        f"""
        SELECT 
            CASE
                WHEN ma_by_name.name IS NOT NULL THEN ma_by_name.name
                WHEN ma_by_ads_unique.single_meta_id IS NOT NULL THEN ma_by_ads_unique.single_meta_id
                ELSE TRIM(l.ad_name)
            END AS canonical_id,
            l.subsource
        FROM `tabLead` l
        LEFT JOIN `tabMeta Ads` ma_by_name ON ma_by_name.name = l.ad_name
        LEFT JOIN (
            {META_ADS_BY_TRIMMED_NAME_SQL}
        ) ma_by_ads_unique ON ma_by_ads_unique.trimmed_ads_name = TRIM(l.ad_name)
        WHERE l.source = 'Meta'
          AND l.subsource IS NOT NULL
          AND l.subsource != ''
          AND l.ad_name IS NOT NULL
          AND l.ad_name != ''
          {where_matcher}
        """
        + (f" AND l.source = %(source)s" if filters and filters.get("source") else "")
        + (f" AND l.subsource = %(subsource)s" if filters and filters.get("subsource") else "")
    )
    query, params = apply_marketing_head_center_filter(query, params, center_field="center", table_alias="l")
    query += """
        ORDER BY l.modified DESC
        """
    rows = frappe.db.sql(query, params, as_dict=True)

    subsource_map: dict[str, str] = {}
    for row in rows:
        canonical_id = normalize_identifier(row.get("canonical_id"))
        if not canonical_id or canonical_id in subsource_map:
            continue
        subsource_map[canonical_id] = row.get("subsource") or ""

    return subsource_map


def get_surgery_date_clause() -> str:
    return "COALESCE(s.surgery_date, DATE(s.creation))"


@frappe.whitelist()
def get_ad_activity_stats(ad_id: str, from_date: str | None = None, to_date: str | None = None) -> dict:
    """Return lead, consultation, costing payment, and surgery counts for an ad within the selected period."""
    ad_identifier = normalize_identifier(ad_id)
    if not ad_identifier:
        frappe.throw(_("Ad ID is required"), title=_("Missing Ad ID"))

    if not from_date or not to_date:
        frappe.throw(_("From Date and To Date are required"), title=_("Missing Date Range"))

    from_date = str(from_date)
    to_date = str(to_date)
    end_date = str(frappe.utils.add_days(to_date, 1))

    params = {
        "ad_identifier": ad_identifier,
        "from_datetime": f"{from_date} 00:00:00",
        "to_datetime": f"{end_date} 00:00:00",
        "from_date": from_date,
        "to_date": to_date,
    }

    total_leads = frappe.db.sql(
        f"""
        SELECT COUNT(*)
        FROM `tabLead` l
        LEFT JOIN `tabMeta Ads` ma_by_name ON ma_by_name.name = l.ad_name
        LEFT JOIN (
            {META_ADS_BY_TRIMMED_NAME_SQL}
        ) ma_by_ads_unique ON ma_by_ads_unique.trimmed_ads_name = TRIM(l.ad_name)
        WHERE l.docstatus < 2
          AND COALESCE(ma_by_name.name, ma_by_ads_unique.single_meta_id, TRIM(l.ad_name)) = %(ad_identifier)s
          AND l.creation >= %(from_datetime)s
          AND l.creation < %(to_datetime)s
        """,
        params,
    )[0][0] or 0

    consultations = frappe.db.sql(
        f"""
        SELECT COUNT(*)
        FROM `tabConsultation` cons
        INNER JOIN `tabLead` l ON l.name = cons.patient
        LEFT JOIN `tabMeta Ads` ma_by_name ON ma_by_name.name = l.ad_name
        LEFT JOIN (
            {META_ADS_BY_TRIMMED_NAME_SQL}
        ) ma_by_ads_unique ON ma_by_ads_unique.trimmed_ads_name = TRIM(l.ad_name)
        WHERE cons.docstatus < 2
          AND l.docstatus < 2
          AND COALESCE(ma_by_name.name, ma_by_ads_unique.single_meta_id, TRIM(l.ad_name)) = %(ad_identifier)s
          AND cons.date BETWEEN %(from_date)s AND %(to_date)s
        """,
        params,
    )[0][0] or 0

    booked_leads = frappe.db.sql(
        f"""
        SELECT COUNT(DISTINCT l.name)
        FROM `tabPayment` p
        INNER JOIN `tabCosting` c ON p.patient = c.name
        INNER JOIN `tabLead` l ON c.patient = l.name
        LEFT JOIN `tabMeta Ads` ma_by_name ON ma_by_name.name = l.ad_name
        LEFT JOIN (
            {META_ADS_BY_TRIMMED_NAME_SQL}
        ) ma_by_ads_unique ON ma_by_ads_unique.trimmed_ads_name = TRIM(l.ad_name)
        WHERE p.docstatus < 2
          AND p.type = 'Payment'
          AND p.payment_type = 'Costing'
          AND COALESCE(ma_by_name.name, ma_by_ads_unique.single_meta_id, TRIM(l.ad_name)) = %(ad_identifier)s
          AND p.transaction_date BETWEEN %(from_date)s AND %(to_date)s
        """,
        params,
    )[0][0] or 0

    surgeries_completed = frappe.db.sql(
        f"""
        SELECT COUNT(DISTINCT s.name)
        FROM `tabSurgery` s
        INNER JOIN `tabCosting` c ON s.patient = c.name
        INNER JOIN `tabLead` l ON c.patient = l.name
        LEFT JOIN `tabMeta Ads` ma_by_name ON ma_by_name.name = l.ad_name
        LEFT JOIN (
            {META_ADS_BY_TRIMMED_NAME_SQL}
        ) ma_by_ads_unique ON ma_by_ads_unique.trimmed_ads_name = TRIM(l.ad_name)
        LEFT JOIN `tabPayment` p ON p.patient = s.name
            AND p.docstatus < 2
            AND p.type = 'Payment'
            AND p.payment_type = 'Surgery'
        WHERE s.docstatus < 2
          AND c.docstatus < 2
          AND l.docstatus < 2
          AND COALESCE(ma_by_name.name, ma_by_ads_unique.single_meta_id, TRIM(l.ad_name)) = %(ad_identifier)s
          AND IFNULL(s.pending_amount, 0) = 0
          AND {get_surgery_date_clause()} BETWEEN %(from_date)s AND %(to_date)s
        """,
        params,
    )[0][0] or 0

    return {
        "leads_created": int(total_leads),
        "consultations_created": int(consultations),
        "booked_leads": int(booked_leads),
        "surgeries_completed": int(surgeries_completed),
        # Backwards-compatible aliases
        "total_leads": int(total_leads),
        "costing_payments": int(booked_leads),
        "surgery_created": int(surgeries_completed),
        "consultation_created": int(consultations),
    }
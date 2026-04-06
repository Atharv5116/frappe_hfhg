import re

import frappe
from frappe.model.document import Document
import pandas as pd
import os
from frappe import _
from frappe.utils import formatdate, flt


def _normalize_excel_header(name):
    """Strip BOM, NBSP, odd whitespace so headers match the mapping."""
    s = str(name).strip()
    s = s.replace("\ufeff", "").replace("\xa0", " ")
    s = re.sub(r"\s+", " ", s)
    return s.casefold().strip()


# Logical field → acceptable header texts (after _normalize_excel_header)
EXCEL_COLUMN_ALIASES = {
    "campaign_name": ("campaign name", "campaign", "campaign_name"),
    "cost": ("cost",),
    "gst_amount": ("gst amount", "gst", "gst amt", "gstamount"),
    "total_amount": ("total amount", "total", "total amt", "totalamount"),
    "form_id": ("form id", "formid", "lead form", "meta lead form"),
    "ad_id": ("ad id", "adid", "ad_id"),
    "source": (
        "source",
        "mode",
        "expense source",
        "channel",
        "sourcce",
        "sources",
    ),
}

class CampaignExpense(Document):
    def validate(self):
        if getattr(self, "meta_lead_form", None) and not getattr(self, "meta_ad_id", None):
            linked_ads = frappe.db.get_value("Meta Lead Form", self.meta_lead_form, "ads")
            if linked_ads:
                self.meta_ad_id = linked_ads

        # Synchronize legacy and new ad identifiers
        if getattr(self, "ad_name", None) and not getattr(self, "ads", None):
            self.ads = self.ad_name
        if getattr(self, "ads", None) and not getattr(self, "ad_name", None):
            self.ad_name = self.ads

        # Calculate the total amount if both amount and gst_amount are provided
        if self.amount and self.gst_amount:
            try:
                self.total_amount = float(self.amount) + float(self.gst_amount)
            except (ValueError, TypeError):
                frappe.throw("Amount and GST Amount must be valid numbers")
        elif self.amount or self.gst_amount:
            # If only one is provided
            try:
                self.total_amount = float(self.amount or 0) + float(self.gst_amount or 0)
            except (ValueError, TypeError):
                frappe.throw("Amount and GST Amount must be valid numbers")
        else:
            # If neither is provided, set total to None or 0
            self.total_amount = None
        
        self.ensure_campaign_daily_entry_limit()
    
    def after_insert(self):
        """Import expenses from Excel file if uploaded"""
        self.import_expenses_from_excel()
    
    def import_expenses_from_excel(self):
        """Parse Excel file and create Campaign Expense records"""
        if not hasattr(self, 'custom_upload_campaignad_expense_file_'):
            return
        
        file_path = self.get('custom_upload_campaignad_expense_file_')
        if not file_path:
            return
        
        try:
            # Get the full file path
            site_path = frappe.get_site_path()
            full_file_path = os.path.join(site_path, file_path.lstrip('/'))
            
            # Read Excel file
            df = pd.read_excel(full_file_path)

            # Keep stable pandas column labels (original stripped) for row[col] access
            raw_headers = [str(c).strip() for c in df.columns]
            df.columns = raw_headers

            norm_to_actual = {}
            for col in df.columns:
                nk = _normalize_excel_header(col)
                if nk and nk not in norm_to_actual:
                    norm_to_actual[nk] = col

            def resolve_column(field_key):
                for alias in EXCEL_COLUMN_ALIASES.get(field_key, ()):
                    a = _normalize_excel_header(alias)
                    if a in norm_to_actual:
                        return norm_to_actual[a]
                return None

            def resolve_source_column():
                """Map Excel → DocType field `source` (fieldname must stay `source`)."""
                col = resolve_column("source")
                if col:
                    return col
                for norm, actual in norm_to_actual.items():
                    if "source" in norm:
                        return actual
                return None

            col_campaign = resolve_column("campaign_name")
            col_cost = resolve_column("cost")
            col_gst = resolve_column("gst_amount")
            col_total = resolve_column("total_amount")
            col_form = resolve_column("form_id")
            col_ad = resolve_column("ad_id")
            col_source = resolve_source_column()
            required = {
                "Campaign name": col_campaign,
                "Cost": col_cost,
                "GST amount": col_gst,
                "Total amount": col_total,
                "Source": col_source,
            }
            missing = [label for label, c in required.items() if c is None]
            if missing:
                found = ", ".join(repr(c) for c in df.columns)
                frappe.throw(
                    _(
                        "Missing required columns: {0}. Columns found in file: {1}"
                    ).format(", ".join(missing), found or "(none)")
                )

            created_count = 0
            duplicate_count = 0
            parent_row_merged = False

            def normalize_identifier(value):
                if pd.isna(value):
                    return ""
                if isinstance(value, float) and value.is_integer():
                    value = int(value)
                return str(value).strip()

            def cell_raw(row, col_name):
                if col_name is None:
                    return None
                return row[col_name]

            def cell_str_from_col(row, col_name):
                val = cell_raw(row, col_name)
                if val is None or pd.isna(val):
                    return ""
                if isinstance(val, float) and val.is_integer():
                    val = int(val)
                return str(val).strip()

            def cell_float_from_col(row, col_name):
                val = cell_raw(row, col_name)
                if val is None or pd.isna(val):
                    return 0.0
                return float(val)

            for index, row in df.iterrows():
                try:
                    form_id = normalize_identifier(cell_raw(row, col_form))
                    ad_id_excel = normalize_identifier(cell_raw(row, col_ad))
                    source_val = cell_str_from_col(row, col_source)

                    campaign_name = cell_str_from_col(row, col_campaign)

                    meta_lead_form = form_id or None
                    ad_id_from_form = normalize_identifier(
                        frappe.db.get_value("Meta Lead Form", meta_lead_form, "ads")
                    ) if meta_lead_form else ""
                    meta_ad_link = ad_id_from_form
                    if ad_id_excel and frappe.db.exists("Meta Ads", ad_id_excel):
                        meta_ad_link = ad_id_excel
                    ads_value = ad_id_excel or ad_id_from_form or meta_lead_form

                    expense_date = self.date or frappe.utils.today()

                    parent_campaign = (getattr(self, "campaign", None) or "").strip()
                    parent_date = getattr(self, "date", None)
                    same_as_upload_row = (
                        parent_campaign.casefold() == campaign_name.casefold()
                        and parent_date is not None
                        and str(parent_date) == str(expense_date)
                    )

                    if same_as_upload_row:
                        if parent_row_merged:
                            duplicate_count += 1
                            continue
                        parent_row_merged = True
                        # DocType fieldname is `source` (matches DB column `source`)
                        src_db = source_val if source_val else None
                        
                        self.source = src_db
                        self.ad_id = ad_id_excel or None
                        self.meta_lead_form = meta_lead_form
                        self.ads = ads_value
                        if meta_ad_link:
                            self.meta_ad_id = meta_ad_link
                        self.amount = flt(cell_float_from_col(row, col_cost))
                        self.gst_amount = flt(cell_float_from_col(row, col_gst))
                        self.total_amount = flt(cell_float_from_col(row, col_total))

                        frappe.db.set_value(
                            "Campaign Expense",
                            self.name,
                            {
                                "source": self.source,
                                "ad_id": self.ad_id,
                                "meta_lead_form": self.meta_lead_form,
                                "ads": self.ads,
                                "meta_ad_id": getattr(self, "meta_ad_id", None),
                                "amount": self.amount,
                                "gst_amount": self.gst_amount,
                                "total_amount": self.total_amount,
                            },
                            update_modified=True,
                        )
                        frappe.clear_document_cache("Campaign Expense", self.name)
                        created_count += 1
                        continue

                    existing_entries = self.get_campaign_entries_count(
                        expense_date, campaign_name, exclude_name=self.name
                    )
                    if existing_entries >= 1:
                        duplicate_count += 1
                        continue

                    expense = frappe.new_doc("Campaign Expense")
                    expense.meta_lead_form = meta_lead_form
                    expense.ad_id = ad_id_excel or None
                    expense.ads = ads_value
                    expense.meta_ad_id = meta_ad_link if meta_ad_link else None
                    expense.campaign = campaign_name
                    expense.date = expense_date

                    expense.amount = cell_float_from_col(row, col_cost)
                    expense.gst_amount = cell_float_from_col(row, col_gst)
                    expense.total_amount = cell_float_from_col(row, col_total)
                    
                    if source_val:
                        expense.source = source_val
                        
                    expense.insert(ignore_permissions=True)

                    created_count += 1
                    
                except Exception as row_error:
                    frappe.log_error(f"Error processing row {index}: {str(row_error)}", "Campaign Expense Excel Import")
                    continue
            
            if created_count > 0:
                frappe.msgprint(f"Successfully imported {created_count} expense records from Excel file")
            
            if duplicate_count > 0:
                frappe.msgprint(
                    _(f"Skipped {duplicate_count} rows because an expense for the same campaign and date already exists."),
                    indicator="orange",
                    title="Duplicate Entries Skipped"
                )
            
        except Exception as e:
            frappe.log_error(f"Error importing expenses from Excel: {str(e)}", "Campaign Expense Excel Import")
            frappe.throw(f"Failed to import expenses from Excel: {str(e)}")

    def ensure_campaign_daily_entry_limit(self):
        if not self.date:
            return

        campaign_value = (getattr(self, "campaign", None) or "").strip()
        if not campaign_value:
            return

        existing_entries = self.get_campaign_entries_count(self.date, campaign_value, exclude_name=self.name)
        if existing_entries >= 1:
            frappe.throw(
                _(f"An expense for campaign '{campaign_value}' already exists on {formatdate(self.date)}."),
                title="Campaign Entry Limit Reached"
            )

    def get_campaign_entries_count(self, expense_date, campaign_value, exclude_name=None):
        filters = {
            "date": expense_date,
            "campaign": (campaign_value or "").strip(),
        }
        if exclude_name:
            filters["name"] = ["!=", exclude_name]
        return int(frappe.db.count("Campaign Expense", filters=filters) or 0)

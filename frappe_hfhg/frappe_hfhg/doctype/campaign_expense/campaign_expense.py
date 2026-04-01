import frappe
from frappe.model.document import Document
import pandas as pd
import os
from frappe import _
from frappe.utils import formatdate

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
            
            # Strip spaces from column names for easier matching
            df.columns = df.columns.str.strip()
            
            # Expected columns: Campaign name, Form ID, Cost, GST amount, Total amount
            required_columns = {"Campaign name", "Form ID", "Cost", "GST amount", "Total amount"}
            missing_columns = required_columns - set(df.columns)
            if missing_columns:
                frappe.throw(
                    _(
                        "Missing required columns in uploaded file: {0}".format(
                            ", ".join(sorted(missing_columns))
                        )
                    )
                )

            created_count = 0
            duplicate_count = 0
            
            def normalize_identifier(value):
                if pd.isna(value):
                    return ""
                if isinstance(value, float) and value.is_integer():
                    value = int(value)
                return str(value).strip()
            
            for index, row in df.iterrows():
                try:
                    # Form ID (Meta Lead Form) is the primary identifier for imports
                    form_id = normalize_identifier(row.get('Form ID', ''))

                    # Get campaign from 'Campaign name' column
                    campaign_name = str(row.get('Campaign name', '')).strip()

                    if not form_id:
                        continue

                    meta_lead_form = form_id or None
                    ad_id = normalize_identifier(
                        frappe.db.get_value("Meta Lead Form", meta_lead_form, "ads")
                    ) if meta_lead_form else ""
                    
                    expense_date = self.date or frappe.utils.today()
                    
                    existing_entries = self.get_campaign_entries_count(expense_date, campaign_name)
                    # Allow only 1 entry per campaign per date; skip duplicates.
                    if existing_entries >= 1:
                        duplicate_count += 1
                        continue
                    
                    # Create Campaign Expense entry directly
                    expense = frappe.new_doc("Campaign Expense")
                    expense.meta_lead_form = meta_lead_form
                    expense.ads = ad_id or meta_lead_form
                    expense.meta_ad_id = ad_id if ad_id else None
                    expense.campaign = campaign_name
                    expense.date = expense_date
                    
                    # Get amounts from exact column names
                    expense.amount = float(row.get('Cost', 0) or 0)
                    expense.gst_amount = float(row.get('GST amount', 0) or 0)
                    expense.total_amount = float(row.get('Total amount', 0) or 0)
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

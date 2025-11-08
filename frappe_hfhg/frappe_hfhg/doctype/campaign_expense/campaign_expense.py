import frappe
from frappe.model.document import Document
import pandas as pd
import os
from frappe import _
from frappe.utils import formatdate

class CampaignExpense(Document):
    def validate(self):
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
        
        self.ensure_unique_ad_date()
    
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
            
            # Expected columns: Campaign name, Ad name, Ad ID, Cost, GST amount, Total amount
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
                    # Get ad_name from 'Ad name' column
                    ad_name = normalize_identifier(row.get('Ad name', ''))
                    
                    # Get ad_id from 'Ad ID' column if present
                    ad_id = normalize_identifier(row.get('Ad ID', ''))
                    
                    # Get campaign from 'Campaign name' column
                    campaign_name = str(row.get('Campaign name', '')).strip()
                    
                    if not ad_name and not ad_id:
                        continue
                    
                    expense_date = self.date or frappe.utils.today()
                    
                    duplicate_filters = {"date": expense_date}
                    if ad_id:
                        duplicate_filters["meta_ad_id"] = ad_id
                    else:
                        duplicate_filters["ad_name"] = ad_name
                    
                    # Skip if a record with the same ad and date already exists
                    if frappe.db.exists("Campaign Expense", duplicate_filters):
                        duplicate_count += 1
                        continue
                    
                    # Create Campaign Expense entry directly
                    expense = frappe.new_doc("Campaign Expense")
                    expense.ads = ad_name or ad_id
                    expense.ad_name = ad_name
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
                    _(f"Skipped {duplicate_count} rows because an expense for the same ad and date already exists."),
                    indicator="orange",
                    title="Duplicate Entries Skipped"
                )
            
        except Exception as e:
            frappe.log_error(f"Error importing expenses from Excel: {str(e)}", "Campaign Expense Excel Import")
            frappe.throw(f"Failed to import expenses from Excel: {str(e)}")

    def ensure_unique_ad_date(self):
        if not self.date:
            return
        
        identifier_value = None
        identifier_field = None
        if getattr(self, "meta_ad_id", None):
            identifier_field = "meta_ad_id"
            identifier_value = self.meta_ad_id
        elif getattr(self, "ad_name", None):
            identifier_field = "ad_name"
            identifier_value = self.ad_name
        elif getattr(self, "ads", None):
            identifier_field = "ads"
            identifier_value = self.ads
        
        if not identifier_field or not identifier_value:
            return
        
        filters = {
            identifier_field: identifier_value,
            "date": self.date,
        }
        
        if self.name:
            filters["name"] = ["!=", self.name]
        
        if frappe.db.exists("Campaign Expense", filters):
            frappe.throw(
                _(f"An expense for identifier '{identifier_value}' already exists on {formatdate(self.date)}."),
                title="Duplicate Ad Expense"
            )

import frappe
from frappe.model.document import Document
import pandas as pd
import os
from frappe import _
from frappe.utils import formatdate

class CampaignExpense(Document):
    def validate(self):
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
            
            # Expected columns: Campaign name, Ad name, Cost, GST amount, Total amount
            created_count = 0
            duplicate_count = 0
            
            for index, row in df.iterrows():
                try:
                    # Get ad_name from 'Ad name' column
                    ad_name = str(row.get('Ad name', '')).strip()
                    
                    # Get campaign from 'Campaign name' column
                    campaign_name = str(row.get('Campaign name', '')).strip()
                    
                    if not ad_name:
                        continue
                    
                    expense_date = self.date or frappe.utils.today()
                    
                    # Skip if a record with the same ad and date already exists
                    if frappe.db.exists("Campaign Expense", {"ads": ad_name, "date": expense_date}):
                        duplicate_count += 1
                        continue
                    
                    # Create Campaign Expense entry directly
                    expense = frappe.new_doc("Campaign Expense")
                    expense.ads = ad_name  # Now a Data field, just store the ad name
                    expense.ad_name = ad_name
                    expense.campaign = campaign_name
                    expense.date = expense_date
                    
                    # Get amounts from exact column names
                    expense.amount = float(row.get('Cost', 0))
                    expense.gst_amount = float(row.get('GST amount', 0))
                    expense.total_amount = float(row.get('Total amount', 0))
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
        if not self.ads or not self.date:
            return
        
        filters = {
            "ads": self.ads,
            "date": self.date,
        }
        
        if self.name:
            filters["name"] = ["!=", self.name]
        
        if frappe.db.exists("Campaign Expense", filters):
            frappe.throw(
                _(f"An expense for ad '{self.ads}' already exists on {formatdate(self.date)}."),
                title="Duplicate Ad Expense"
            )

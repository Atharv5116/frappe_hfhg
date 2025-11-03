import frappe
from frappe.model.document import Document
import pandas as pd
import os

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
            
            # Expected columns: 'campaign name ', 'ad name', 'cost', 'gst', 'total '
            created_count = 0
            
            for index, row in df.iterrows():
                try:
                    # Get or create Meta Ads entry
                    ad_name = str(row.get('ad name', '')).strip()
                    campaign_name = str(row.get('campaign name ', '')).strip()
                    
                    if not ad_name:
                        continue
                    
                    # Create Campaign Expense entry directly
                    expense = frappe.new_doc("Campaign Expense")
                    expense.ads = ad_name  # Now a Data field, just store the ad name
                    expense.ad_name = ad_name
                    expense.campaign = campaign_name
                    expense.date = self.date or frappe.utils.today()
                    expense.amount = float(row.get('cost', 0))
                    expense.gst_amount = float(row.get('gst', 0))
                    expense.total_amount = float(row.get('total ', 0))
                    expense.insert(ignore_permissions=True)
                    
                    created_count += 1
                    
                except Exception as row_error:
                    frappe.log_error(f"Error processing row {index}: {str(row_error)}", "Campaign Expense Excel Import")
                    continue
            
            if created_count > 0:
                frappe.msgprint(f"Successfully imported {created_count} expense records from Excel file")
            
        except Exception as e:
            frappe.log_error(f"Error importing expenses from Excel: {str(e)}", "Campaign Expense Excel Import")
            frappe.throw(f"Failed to import expenses from Excel: {str(e)}")

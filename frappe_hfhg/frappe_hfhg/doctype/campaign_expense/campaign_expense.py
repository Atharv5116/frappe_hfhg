import frappe
from frappe.model.document import Document

class CampaignExpense(Document):
    def validate(self):
        # Calculate the total amount
        self.total_amount = float(self.amount) + float(self.gst_amount)

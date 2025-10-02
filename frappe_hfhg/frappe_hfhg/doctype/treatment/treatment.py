# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _


class Treatment(Document):
	pass

@frappe.whitelist()
def get_treatment_details(patient_id):
	patient = frappe.get_doc("Costing", patient_id, ["prp"])
	treaments = frappe.get_all("Treatment", filters={"patient": patient_id})
	count = len(treaments) + 1
	return {
		"session": count,
		"paid": True if int(patient.prp) < count else False,
	}

@frappe.whitelist()
def get_dashboard_stats(patient):
	payments = frappe.get_all("Payment", filters={"type": "Payment", "payment_type": "Treatment", "patient": patient})
	if len(payments) > 0:
		refunds = frappe.get_all("Payment", filters={"type": "Refund", "refund_payment_id": payments[0].name})

	return [
		{"label": _("Payment"), "value": len(payments), "id": payments[0].name if len(payments) > 0  else ""},
		{"label": _("Refund"), "value": 0 if len(payments) == 0 else len(refunds)},
	]

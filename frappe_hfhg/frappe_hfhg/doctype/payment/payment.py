# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
import math

class Payment(Document):
	def validate(self):
		self.validate_payment_amount()

	def validate_payment_amount(self):
		if self.type == "Payment":
			if self.payment_type == "Costing":
				paid_amount = 0
				if self.with_gst_check:
					paid_amount =  self.without_gst_amount + self.with_gst_amount
				else:
					paid_amount = self.without_gst_amount
				if paid_amount < 1:
					frappe.throw(_("Total paid amount should be greater than 0."))
				if self.total_amount < paid_amount:
					frappe.throw(_("Total paid amount should be not greater than total amount."))
				# Note: Costing update moved to after_insert to ensure payment is actually saved
			else:
				paid_amount = 0
				if self.with_gst_check:
					paid_amount =  math.floor(self.without_gst_amount + self.with_gst_amount)
				else:
					paid_amount = math.floor(self.without_gst_amount)
				if self.total_amount != paid_amount and self.payment_type != "Surgery":
					frappe.throw(_("Total paid amount should be equal to total amount."))
				else:
					if self.payment_type == "Surgery":
						surgery = frappe.get_doc("Surgery", self.patient)
						
						# Validations only - no updates here
						if paid_amount < 1:
							frappe.throw(_("Paid amount should be greater than 0."))
						if paid_amount > surgery.pending_amount:
							frappe.throw(_("Paid amount should not be greater than pending amount."))
						# Note: Surgery update moved to after_insert to ensure payment is actually saved
					elif self.payment_type == "Consultation":
						consultation = frappe.get_doc("Consultation", self.patient)
						consultation.payment_status = "Paid"
						consultation.save(ignore_permissions=True)
					else:
						treatment = frappe.get_doc("Treatment", self.patient)
						treatment.status = "Paid"
						treatment.save(ignore_permissions=True)
		else:
			if self.with_gst_amount == 0 and self.without_gst_amount == 0:
				frappe.throw(_("Refund amount should be greater than 0."))
			if self.with_gst_amount > self.paid_amount_with_gst:
				frappe.throw(_("With GST amount should not be greater than paid amount with GST."))
			if self.without_gst_amount > self.paid_amount_without_gst:
				frappe.throw(_("Without GST amount should not be greater than paid amount without GST."))
			payment_id = frappe.get_doc("Payment", self.refund_payment_id)
			if payment_id.payment_type == "Costing":
				surgery_exists = frappe.db.exists(
					"Surgery", {"name": payment_id.patient}
				)
				if surgery_exists:
					surgery = frappe.get_doc("Surgery", payment_id.patient)
					if surgery.surgery_status == "Completed":
						frappe.throw(_("Surgery is already completed."))
					surgery.surgery_status = "Cancelled"
					surgery.save(ignore_permissions=True)
				booking = frappe.get_doc("Costing", payment_id.patient)
				booking.status = "Refunded"
				booking.prp = "0"
				booking.save(ignore_permissions=True)
			elif payment_id.payment_type == "Surgery":
				refunds = frappe.get_all("Payment", filters={"type": "Refund", "refund_payment_id": self.refund_payment_id}, fields=["name", "without_gst_amount", "with_gst_amount"])
				total_refund_amount = self.without_gst_amount + self.with_gst_amount
				total_amount = self.paid_amount_without_gst + self.paid_amount_with_gst
				for refund in refunds:
					total_refund_amount += (refund.without_gst_amount or 0)
					total_refund_amount += (refund.without_gst_amount or 0)
				if total_refund_amount > total_amount:
					frappe.throw(_("Refund amount should not be greater than total refund amount." + str(total_refund_amount) + " " + str(total_amount)))

				if total_refund_amount == total_amount:
					surgery = frappe.get_doc("Surgery", payment_id.patient)
					surgery.status = "Refunded"
					surgery.surgery_status = "Cancelled"
					surgery.save(ignore_permissions=True)

	def after_insert(self):
		"""Update Costing and Surgery only after Payment is successfully saved"""
		if self.type == "Payment":
			if self.payment_type == "Costing":
				paid_amount = 0
				if self.with_gst_check:
					paid_amount = self.without_gst_amount + self.with_gst_amount
				else:
					paid_amount = self.without_gst_amount

				booking = frappe.get_doc("Costing", self.patient)
				booking.status = "Booking"
				booking.amount_paid = paid_amount
				booking.pending_amount = self.total_amount - paid_amount
				booking.book_date = self.creation
				booking.booking_transaction_date = self.transaction_date
				booking.save(ignore_permissions=True)
				surgery_exists = frappe.db.exists(
					"Surgery", {"name": self.patient}
				)
				if surgery_exists:
					surgery = frappe.get_doc("Surgery", self.patient)
					surgery.amount_paid = paid_amount
					surgery.pending_amount = surgery.total_amount - paid_amount
					surgery.save(ignore_permissions=True)
			elif self.payment_type == "Surgery":
				paid_amount = 0
				if self.with_gst_check:
					paid_amount = math.floor(self.without_gst_amount + self.with_gst_amount)
				else:
					paid_amount = math.floor(self.without_gst_amount)
				
				surgery = frappe.get_doc("Surgery", self.patient)
				
				if paid_amount >= 1 and paid_amount < surgery.pending_amount:
					surgery.pending_amount = surgery.pending_amount - paid_amount
					surgery.status = "Partially Paid"
					surgery.surgery_transaction_date = self.transaction_date
				elif paid_amount == surgery.pending_amount:
					surgery.pending_amount = 0
					surgery.status = "Paid"
					surgery.surgery_transaction_date = self.transaction_date
				surgery.save(ignore_permissions=True)

	def on_update(self):
		"""Update Costing and Surgery when an existing Payment is edited"""
		if self.type == "Payment":
			if self.payment_type == "Costing":
				paid_amount = 0
				if self.with_gst_check:
					paid_amount = self.without_gst_amount + self.with_gst_amount
				else:
					paid_amount = self.without_gst_amount

				booking = frappe.get_doc("Costing", self.patient)
				booking.status = "Booking"
				booking.amount_paid = paid_amount
				booking.pending_amount = self.total_amount - paid_amount
				booking.book_date = self.creation
				booking.booking_transaction_date = self.transaction_date
				booking.save(ignore_permissions=True)
				surgery_exists = frappe.db.exists(
					"Surgery", {"name": self.patient}
				)
				if surgery_exists:
					surgery = frappe.get_doc("Surgery", self.patient)
					surgery.amount_paid = paid_amount
					surgery.pending_amount = surgery.total_amount - paid_amount
					surgery.save(ignore_permissions=True)
			elif self.payment_type == "Surgery":
				paid_amount = 0
				if self.with_gst_check:
					paid_amount = math.floor(self.without_gst_amount + self.with_gst_amount)
				else:
					paid_amount = math.floor(self.without_gst_amount)
				
				surgery = frappe.get_doc("Surgery", self.patient)
				
				if paid_amount >= 1 and paid_amount < surgery.pending_amount:
					surgery.pending_amount = surgery.pending_amount - paid_amount
					surgery.status = "Partially Paid"
					surgery.surgery_transaction_date = self.transaction_date
				elif paid_amount == surgery.pending_amount:
					surgery.pending_amount = 0
					surgery.status = "Paid"
					surgery.surgery_transaction_date = self.transaction_date
				surgery.save(ignore_permissions=True)

	def on_trash(self):
		if self.type == "Payment":
			if self.payment_type == "Costing":
				booking = frappe.get_doc("Costing", self.patient)
				amount_paid = booking.amount_paid
				booking.status = "Prospect"
				booking.pending_amount += amount_paid
				booking.amount_paid = 0
				booking.save(ignore_permissions=True)
				surgery_exists = frappe.db.exists("Surgery", {"name": self.patient})
				if surgery_exists:
					surgery = frappe.get_doc("Surgery", self.patient)
					surgery.amount_paid = 0
					surgery.pending_amount += amount_paid
					surgery.save(ignore_permissions=True)
			elif self.payment_type == "Consultation":
				consultation = frappe.get_doc("Consultation", self.patient)
				consultation.payment_status = "Not Paid"
				consultation.save(ignore_permissions=True)
			elif self.payment_type == "Surgery":
				surgery = frappe.get_doc("Surgery", self.patient)
				paid_amount = 0
				if self.with_gst_check:
					paid_amount =  self.without_gst_amount + int(self.with_gst_amount / (1 + 0.05))
				else:
					paid_amount = self.without_gst_amount
				surgery.pending_amount += paid_amount
				if surgery.pending_amount + surgery.amount_paid == surgery.total_amount:
					surgery.status = "Not Paid"
				else:
					surgery.status = "Partially Paid"
				surgery.save(ignore_permissions=True)
			elif self.payment_type == "Treatment":
				treatment = frappe.get_doc("Treatment", self.patient)
				treatment.status = "Not Paid"
				treatment.save(ignore_permissions=True)
		else:
			payment_id = frappe.get_doc("Payment", self.refund_payment_id)
			if payment_id.payment_type == "Costing":
				booking = frappe.get_doc("Costing", payment_id.patient)
				booking.status = "Booking"
				booking.save(ignore_permissions=True)
			elif payment_id.payment_type == "Surgery":
				surgery = frappe.get_doc("Surgery", payment_id.patient)
				total_refund_amount = self.without_gst_amount + self.with_gst_amount
				surgery.pending_amount += total_refund_amount
				if surgery.status == "Refunded":
					surgery.status = "Partially Paid"
				surgery.save(ignore_permissions=True)

				
@frappe.whitelist()
def get_payment_amount(patient, payment_type):
	if payment_type == "Treatment":
		return frappe.get_value("Treatment", {"name": patient }, "total_amount")
	if payment_type == "Surgery":
		return frappe.get_value("Surgery", {"name": patient }, "pending_amount")
	if payment_type == "Costing":
		return frappe.get_value("Costing", {"name": patient }, "total_amount")
	if payment_type == "Consultation":
		return frappe.get_value("Consultation", {"name": patient }, "total_amount")
	return 0

@frappe.whitelist()
def get_refund_amount(payment_id):
	doc = frappe.get_doc("Payment", payment_id)

	return {
		"total_paid_amount": doc.total_amount,
		"with_gst_amount": doc.with_gst_amount,
		"without_gst_amount": doc.without_gst_amount
	}
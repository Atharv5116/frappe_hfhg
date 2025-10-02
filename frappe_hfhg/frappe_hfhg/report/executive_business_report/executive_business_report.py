# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils.data import today
from datetime import datetime, date

Filters = frappe._dict


def execute(filters: Filters | None = None) -> tuple:
	if not filters.to_date or not filters.from_date:
		frappe.throw(_('"From Date" and "To Date" are mandatory'))
	if filters.to_date <= filters.from_date:
		frappe.throw(_('"From Date" can not be greater than or equal to "To Date"'))

	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns() -> list[dict]:
	return [
		{
			"label": _("Executive"),
			"fieldtype": "Data",
			"fieldname": "executive",
			"width": 150,
		},
		{
			"label": _("Leads By System"),
			"fieldtype": "Data",
			"fieldname": "system_leads",
			"width": 150,
		},
		{
			"label": _("Self Leads"),
			"fieldtype": "Data",
			"fieldname": "self_leads",
			"width": 150,
		},
		{
			"label": _("Total Reminder"),
			"fieldtype": "Data",
			"fieldname": "total_reminder",
			"width": 150,
		},
		{
			"label": _("Total Missed Reminder"),
			"fieldtype": "Data",
			"fieldname": "total_missed_reminder",
			"width": 150,
		},
		{
			"label": _("Total Reminder Attended "),
			"fieldtype": "Data",
			"fieldname": "total_reminder_attended",
			"width": 150,
		},
		{
			"label": _("Total Consultation"),
			"fieldtype": "Data",
			"fieldname": "total_consultation",
			"width": 150,
		},
		{
			"label": _("Total Consultation Done"),
			"fieldtype": "Data",
			"fieldname": "total_consultation_done",
			"width": 150,
		},
		{
			"label": _("Total Consultation Pending"),
			"fieldtype": "Data",
			"fieldname": "total_consultation_pending",
			"width": 150,
		},
		{
			"label": _("No. Of Costing"),
			"fieldtype": "Data",
			"fieldname": "no_of_costing",
			"width": 150,
		},
		{
			"label": _("Booking Amount"),
			"fieldtype": "Data",
			"fieldname": "booking_amount",
			"width": 150,
		},
		{
			"label": _("Income Generated"),
			"fieldtype": "Data",
			"fieldname": "income_generated",
			"width": 150,
		}
	]

def get_data(filters: Filters) -> list[dict]:
	rows = []
	executives = frappe.get_all("Executive", fields=["*"])
	user = frappe.session.user
	is_receptionist = frappe.db.exists("Receptionist", {'email': user})
	is_executive = frappe.db.exists("Executive", {'email': user})
	roles = frappe.get_roles()
	is_marketing_head = "Marketing Head" in roles

	if is_receptionist and not is_marketing_head:
		receptionist = frappe.db.get_value('Receptionist', {'email': user}, ['name','email'], as_dict=1)
		center = frappe.db.get_value('Center', {'clinic_manager': receptionist.email}, ['name'], as_dict=1)
		executives = frappe.get_all("Executive", fields=["*"], filters={"email": user})
	
	if is_executive and not is_marketing_head:
		executives = frappe.get_all("Executive", fields=["*"], filters={"email": user})

	for executive in executives:
		leads = frappe.get_all(
			"Lead",
			filters={
				"executive": executive.get("name"),
				"creation": ["between", (filters.from_date, filters.to_date)]
			},
			fields=["name", "assign_by", "executive"],
		)
		self_leads = 0
		system_leads = 0

		for lead in leads:
			if lead.get("assign_by") == executive.get("email"):
				self_leads+=1
			else:
				system_leads+=1		

		reminders = frappe.get_all(
					"Reminders",
					filters={
						"executive": executive.get("name"),
						"date": ["between", (filters.from_date, filters.to_date)]
					},
					fields=["date", "executive", "description", "status", "parent"],
				)
		total_reminders = len(reminders)
		total_missed_reminder = 0
		total_reminder_attended = 0

		for rem in reminders:
			status = rem.get("status")
			if status == "Close":
				total_reminder_attended+=1
			else:
				if rem["date"] < datetime.now().date():
					total_missed_reminder+=1

		consultations = frappe.db.count(
					"Consultation",
					filters={
						"executive": executive.get("name"),
						"date": ["between", (filters.from_date, filters.to_date)]
					},
				)
		consultations_done = frappe.db.count(
					"Consultation",
					filters={
						"executive": executive.get("name"),
						"date": ["between", (filters.from_date, filters.to_date)],
						"status": ["in", ["Booked","Spot Booking","Non Booked","Medi-PRP"]]
					},
				)
		consultation_pending = frappe.db.count(
					"Consultation",
					filters={
						"executive": executive.get("name"),
						"date": ["between", (filters.from_date, filters.to_date)],
						"status": ["not in", ["Medi-PRP", "Not Visited"]]
					},
				)
		bookings = frappe.get_all(
					"Costing",
					filters={
						"executive": executive.get("name"),
						"booking_date": ["between", (filters.from_date, filters.to_date)]
					},
					fields=["name", "amount_paid"],
				)
		
		booking_amount = 0
		for booking in bookings:
			booking_amount += booking.get("amount_paid")

		surgeries = frappe.get_all(
					"Surgery",
					filters={
						"executive": executive.get("name"),
						"surgery_date": ["between", (filters.from_date, filters.to_date)]
					},
					fields=["surgery_status", "total_amount"],
				)
		
		income_generated = 0
		for surgery in surgeries:
			if surgery.get("surgery_status") == "Completed":
				income_generated += surgery.get("total_amount")
		row = {
			"executive": executive.get("name"),
			"self_leads": self_leads,
			"system_leads": system_leads,
			"total_reminder": total_reminders,
			"total_missed_reminder": total_missed_reminder,
			"total_reminder_attended": total_reminder_attended,
			"total_consultation": consultations,
			"total_consultation_done": consultations_done,
			"total_consultation_pending": consultation_pending,
			"no_of_costing": len(bookings),
			"booking_amount": booking_amount,
			"income_generated": income_generated
		}
		rows.append(row)

	return rows

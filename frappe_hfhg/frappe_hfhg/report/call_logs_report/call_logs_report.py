# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe import _

Filters = frappe._dict


def execute(filters: Filters | None = None) -> tuple:
	print(filters)
	if filters.to_date <= filters.from_date:
		frappe.throw(_('"From Date" can not be greater than or equal to "To Date"'))
	if not filters.to_date or not filters.from_date:
		frappe.throw(_('"From Date" and "To Date" are mandatory'))
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns() -> list[dict]:
	return [
		{
			"label": _("Datetime"),
			"fieldtype": "Datetime",
			"fieldname": "datetime",
			"width": 200,
		},
		{
			"label": _("Device Id"),
			"fieldtype": "Data",
			"fieldname": "device_id",
			"width": 150,
		},
		{
			"label": _("Phone No"),
			"fieldtype": "Data",
			"fieldname": "phone_no",
			"width": 150,
		},
		{
			"label": _("Duration"),
			"fieldtype": "Data",
			"fieldname": "duration",
			"width": 150,
		},
		{
			"label": _("Status"),
			"fieldtype": "Data",
			"fieldname": "status",
			"width": 150,
		},
	]

def get_data(filters: Filters) -> list[dict]:
	rows = []
	if filters.status: 
		if filters.device_id: 
			logs = frappe.get_all("Call Logs", fields=["*"], filters={
				"datetime": ["between", [filters.from_date + " 00:00:00", filters.to_date + " 23:59:59"]],
				"device_id": ["like", "%" + filters.device_id + "%"],
				"status": filters.status
			})
		else:
			logs = frappe.get_all("Call Logs", fields=["*"], filters={
				"datetime": ["between", [filters.from_date + " 00:00:00", filters.to_date + " 23:59:59"]],
				"status": filters.status
			})
	else:
		if filters.device_id: 
			logs = frappe.get_all("Call Logs", fields=["*"], filters={
				"datetime": ["between", [filters.from_date + " 00:00:00", filters.to_date + " 23:59:59"]],
				"device_id": ["like", "%" + filters.device_id + "%"]
			})
		else:
			logs = frappe.get_all("Call Logs", fields=["*"], filters={
				"datetime": ["between", [filters.from_date + " 00:00:00", filters.to_date + " 23:59:59"]]
			})

	for log in logs:
		row = {
			"datetime": log.get("datetime"),
			"device_id": log.get("device_id"), 
			"duration": log.get("duration"),
			"status": log.get("status"),
			"phone_no": log.get("phone_number"),
		}
		rows.append(row)

	return rows

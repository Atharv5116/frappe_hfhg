# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _

class Doctor(Document):
	def after_insert(self):
		user = frappe.get_doc(
			{
				"doctype": "User",
				"email": self.email,
				"first_name": self.name,
				"send_welcome_email": 0,
				"new_password": "ashish@12345",
				"roles": [{"role": "Doctor"}],
				"mobile_no": self.contact_number,
			}
		)
		user.insert(ignore_permissions=True)
		block_modules = frappe.get_all(
			"Module Def",
			fields=["name as module"],
			filters={"name": ["not in", ["Frappe Hfhg"]]},
		)
		user.set("block_modules", block_modules)
		user.save(ignore_permissions=True)
		frappe.db.commit()
		
	def before_insert(self):
		available = frappe.get_all(
			"Doctor",
			filters={"name": self.fullname},
		)
		if len(available) != 0:
			old_name = self.fullname
			self.fullname = self.fullname + "-" + str(len(available) + 1)
			frappe.msgprint(
				_("Changed doctor name to '{}' as '{}' already exists.").format(
					self.fullname, old_name
				),
				title=_("Note"),
				indicator="yellow",
			)


@frappe.whitelist()
def get_doctor_schedule_slots(doctor, start_date=None, end_date=None):
	"""
	Get all schedule slots for a doctor within a date range
	Schedule is a child table, so we need to get it from the Doctor document
	"""
	from frappe.utils import getdate, today
	
	if not doctor:
		return []
	
	try:
		doctor_doc = frappe.get_doc("Doctor", doctor)
		all_slots = doctor_doc.get("table_schedule", [])
		
		# Filter by date range
		filtered_slots = []
		for slot in all_slots:
			if not slot.date:
				continue
			
			slot_date = getdate(slot.date)
			
			# Check date range
			if start_date:
				start = getdate(start_date)
				if slot_date < start:
					continue
			
			if end_date:
				end = getdate(end_date)
				if slot_date > end:
					continue
			
			# Add slot with all details
			filtered_slots.append({
				"name": slot.name,
				"date": str(slot.date),
				"slot": slot.slot,
				"day": slot.day,
				"mode": slot.mode,
				"patients": slot.patients,
				"doctor": slot.doctor
			})
		
		# Sort by date and slot
		filtered_slots.sort(key=lambda x: (x["date"], x["slot"]))
		
		return filtered_slots
		
	except Exception as e:
		frappe.log_error(f"Error getting doctor slots: {str(e)}", "get_doctor_schedule_slots")
		return []


@frappe.whitelist()
def delete_schedule_slot(slot_name):
	"""
	Delete a schedule slot by its name
	Since Schedule is a child table, we need to remove it from the parent Doctor document
	"""
	if not slot_name:
		frappe.throw("Slot name is required")
	
	try:
		# Get the slot to find its parent doctor
		slot = frappe.get_doc("Schedule", slot_name)
		doctor_name = slot.doctor
		
		# Load the doctor document
		doctor_doc = frappe.get_doc("Doctor", doctor_name)
		
		# Find and remove the slot from table_schedule
		slots_to_keep = [s for s in doctor_doc.get("table_schedule", []) if s.name != slot_name]
		
		if len(slots_to_keep) == len(doctor_doc.get("table_schedule", [])):
			frappe.throw(f"Slot {slot_name} not found in doctor's schedule")
		
		# Replace the table_schedule
		doctor_doc.set("table_schedule", slots_to_keep)
		doctor_doc.save(ignore_permissions=True)
		frappe.db.commit()
		
		return {"success": True, "message": "Slot deleted successfully"}
		
	except Exception as e:
		frappe.log_error(f"Error deleting slot: {str(e)}", "delete_schedule_slot")
		frappe.db.rollback()
		frappe.throw(f"Error deleting slot: {str(e)}")


@frappe.whitelist()
def generate_monthly_slots_background(skip_processed=False):
	"""
	Generate schedule slots for current month for all doctors
	Runs as a background job to avoid timeout issues
	
	Args:
		skip_processed: If True, skip doctors that already have slots for current month
	"""
	from frappe_hfhg.doctor_scheduler import add_schedule_entry
	from frappe.utils.background_jobs import enqueue
	
	# Enqueue as background job with longer timeout (30 minutes)
	enqueue(
		method=add_schedule_entry,
		queue="long",
		timeout=1800,  # 30 minutes timeout
		job_name="generate_monthly_slots",
		is_async=True,
		kwargs={"skip_processed": skip_processed}
	)
	
	return {
		"success": True,
		"message": "Schedule generation started in background. Check progress in Scheduled Job Log."
	}


@frappe.whitelist()
def delete_multiple_schedule_slots(slot_names):
	"""
	Delete multiple schedule slots
	"""
	import json
	from collections import defaultdict
	
	if isinstance(slot_names, str):
		slot_names = json.loads(slot_names)
	
	if not slot_names or not isinstance(slot_names, list):
		frappe.throw("Invalid slot names provided")
	
	try:
		# Group slots by doctor
		slots_by_doctor = defaultdict(list)
		
		for slot_name in slot_names:
			try:
				slot = frappe.get_doc("Schedule", slot_name)
				slots_by_doctor[slot.doctor].append(slot_name)
			except Exception as e:
				frappe.logger().warning(f"Could not find slot {slot_name}: {str(e)}")
		
		deleted_count = 0
		errors = []
		
		# Process each doctor
		for doctor_name, doctor_slot_names in slots_by_doctor.items():
			try:
				doctor_doc = frappe.get_doc("Doctor", doctor_name)
				all_slots = doctor_doc.get("table_schedule", [])
				
				# Filter out slots to delete
				slots_to_keep = [
					s for s in all_slots 
					if s.name not in doctor_slot_names
				]
				
				# Update doctor document
				doctor_doc.set("table_schedule", slots_to_keep)
				doctor_doc.save(ignore_permissions=True)
				
				deleted_count += len(doctor_slot_names)
				
			except Exception as e:
				error_msg = f"Error processing doctor {doctor_name}: {str(e)}"
				errors.append(error_msg)
				frappe.log_error(error_msg, "delete_multiple_schedule_slots")
		
		frappe.db.commit()
		
		return {
			"success": True,
			"deleted_count": deleted_count,
			"errors": errors,
			"message": f"Deleted {deleted_count} slot(s)"
		}
		
	except Exception as e:
		frappe.log_error(f"Error deleting slots: {str(e)}", "delete_multiple_schedule_slots")
		frappe.db.rollback()
		frappe.throw(f"Error deleting slots: {str(e)}")

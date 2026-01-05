# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
import calendar
from frappe.utils import getdate, add_days, now
from frappe.utils.background_jobs import enqueue

# All available time slots (matching doctor.js)
ALL_SLOTS = [
    "12:00 AM", "12:30 AM", "01:00 AM", "01:30 AM", "02:00 AM", "02:30 AM",
    "03:00 AM", "03:30 AM", "04:00 AM", "04:30 AM", "05:00 AM", "05:30 AM",
    "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM",
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
    "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM",
    "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM"
]

# Day names mapping (Python weekday: 0=Monday, 6=Sunday)
# JavaScript weekday: 0=Sunday, 6=Saturday
DAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
DAY_CHECKBOXES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


def add_schedule_entry_scheduler():
    """
    Wrapper function for scheduler to enqueue the job as a background job.
    This prevents timeout issues when processing many doctors.
    """
    try:
        from frappe.utils.background_jobs import is_job_enqueued
        
        # Use a unique job_id to prevent duplicate jobs
        job_id = "generate_monthly_slots_scheduler"
        
        # Check if job is already enqueued or running
        if is_job_enqueued(job_id):
            frappe.logger().info("Schedule generation job already running, skipping duplicate")
            return
        
        # Enqueue as background job with extended timeout (60 minutes)
        enqueue(
            method=add_schedule_entry,
            queue="long",
            timeout=3600,  # 60 minutes timeout
            job_id=job_id,
            deduplicate=True,  # Prevent duplicate jobs
            is_async=True,
            skip_processed=False  # Pass directly as keyword argument
        )
        
        frappe.logger().info("Schedule generation job enqueued successfully")
        
    except Exception as e:
        error_msg = str(e)[:500] if len(str(e)) > 500 else str(e)
        frappe.log_error(
            f"Error enqueuing schedule generation job: {error_msg}",
            "add_schedule_entry_scheduler"
        )
        raise


def add_schedule_entry(skip_processed=False, batch_size=10):
    """
    Automatically add schedule slots for all doctors on the 1st of every month.
    Generates slots for the next 3 months (current month + next 2 months) based on each doctor's settings:
    - from_slot and to_slot (time range)
    - patients_per_slot
    - Day checkboxes (sunday, monday, tuesday, etc.)
    - Creates slots for BOTH modes: In-Person AND Call (irrespective of doctor's mode_of_appointment setting)
    
    Args:
        skip_processed: If True, skip doctors that already have from_date set to first day of current month
        batch_size: Number of doctors to process before committing (default: 10)
    """
    try:
        # Get current date and determine the date range for next 3 months
        today = getdate(now())
        current_month = today.month
        current_year = today.year
        
        # Get first day of current month (start date)
        first_day_month = today.replace(day=1)
        
        # Calculate last day of 3rd month (current + 2 more months)
        # Calculate the month number for the 3rd month
        target_month = current_month + 2  # 2 months ahead (3rd month total)
        
        # Handle year rollover
        if target_month > 12:
            target_month = target_month - 12
            target_year = current_year + 1
        else:
            target_year = current_year
        
        # Get last day of the 3rd month
        days_in_last_month = calendar.monthrange(target_year, target_month)[1]
        last_day_range = getdate(f"{target_year}-{target_month:02d}-{days_in_last_month}")
        
        # Calculate total days across 3 months
        total_days = (last_day_range - first_day_month).days + 1
        
        # Get all doctors with their schedule settings
        doctors = frappe.get_all(
            "Doctor",
            fields=[
                "name",
                "from_slot",
                "to_slot",
                "mode_of_appointment",
                "patients_per_slot",
                "sunday",
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "from_date"
            ]
        )
        
        # Filter out already processed doctors if skip_processed is True
        if skip_processed:
            doctors = [d for d in doctors if d.get('from_date') != first_day_month]
            frappe.logger().info(f"Skipping already processed doctors. Remaining: {len(doctors)}")
        
        if not doctors:
            frappe.log_error("No doctors found for schedule generation", "add_schedule_entry")
            return
        
        slots_added_count = 0
        doctors_processed = 0
        total_doctors = len(doctors)
        
        print(f"\n📋 Processing {total_doctors} doctors for next 3 months")
        print(f"   Date range: {first_day_month} to {last_day_range} ({total_days} days)\n")
        
        for idx, doctor in enumerate(doctors, 1):
            doctor_name = doctor['name']
            
            try:
                # Skip if doctor doesn't have required settings
                if not doctor.get('from_slot') or not doctor.get('to_slot'):
                    frappe.logger().info(f"Skipping doctor {doctor_name}: Missing from_slot or to_slot")
                    continue
                
                # Get doctor's slot range
                from_slot = doctor.get('from_slot', '').strip()
                to_slot = doctor.get('to_slot', '').strip()
                
                # Find indices in ALL_SLOTS array
                try:
                    from_slot_index = ALL_SLOTS.index(from_slot)
                    to_slot_index = ALL_SLOTS.index(to_slot)
                except ValueError:
                    frappe.logger().warning(f"Invalid slot time for doctor {doctor_name}: {from_slot} - {to_slot}")
                    continue
                
                if from_slot_index > to_slot_index:
                    frappe.logger().warning(f"Invalid slot range for doctor {doctor_name}: from_slot > to_slot")
                    continue
                
                # Get doctor's other settings
                # Note: We'll create slots for BOTH modes regardless of doctor's setting
                patients_per_slot = doctor.get('patients_per_slot') or 0
                appointment_modes = ["In-Person", "Call"]  # Generate slots for both modes
                
                # Get enabled days (checkboxes that are checked)
                enabled_days = []
                for day in DAY_CHECKBOXES:
                    if doctor.get(day):
                        enabled_days.append(day)
                
                if not enabled_days:
                    frappe.logger().info(f"Skipping doctor {doctor_name}: No days selected")
                    continue
                
                # Query existing slots for this doctor in the 3-month range to avoid duplicates
                # This is much faster than loading the full doctor document with all slots
                # Include mode in the check to avoid duplicates
                existing_slots_set = set()
                
                existing_slots = frappe.get_all(
                    "Schedule",
                    filters=[
                        ["doctor", "=", doctor_name],
                        ["date", ">=", first_day_month],
                        ["date", "<=", last_day_range]
                    ],
                    fields=["date", "slot", "mode"]
                )
                
                for existing_slot in existing_slots:
                    if existing_slot.date and existing_slot.slot and existing_slot.mode:
                        date_str = getdate(existing_slot.date).strftime("%Y-%m-%d")
                        existing_slots_set.add((date_str, existing_slot.slot, existing_slot.mode))
                
                # Load doctor document only when we need to add slots
                doctor_doc = None
                
                new_slots_added = False
                doctor_slots_count = 0
                
                # Generate slots for each day in the 3-month range
                for day_offset in range(total_days):
                    current_date = add_days(first_day_month, day_offset)
                    
                    # Skip if date is beyond the 3-month range
                    if current_date > last_day_range:
                        break
                    
                    # Get Python weekday (0=Monday, 6=Sunday)
                    python_weekday = current_date.weekday()
                    
                    # Get day name
                    day_name = DAY_NAMES[python_weekday]
                    
                    # Skip if this day is not enabled
                    if day_name not in enabled_days:
                        continue
                    
                    # Generate slots for the time range
                    for slot_index in range(from_slot_index, to_slot_index + 1):
                        slot_time = ALL_SLOTS[slot_index]
                        
                        # Create slots for BOTH modes (In-Person and Call)
                        for mode_of_appointment in appointment_modes:
                            # Check if slot already exists (with mode)
                            date_str = current_date.strftime("%Y-%m-%d")
                            if (date_str, slot_time, mode_of_appointment) in existing_slots_set:
                                continue
                            
                            # Lazy load doctor document only when we need to add slots
                            if doctor_doc is None:
                                doctor_doc = frappe.get_doc("Doctor", doctor_name)
                            
                            # Add new slot for this mode
                            doctor_doc.append("table_schedule", {
                                "doctor": doctor_name,
                                "date": current_date,
                                "day": day_name,
                                "slot": slot_time,
                                "mode": mode_of_appointment,
                                "patients": patients_per_slot
                            })
                            new_slots_added = True
                            doctor_slots_count += 1
                            slots_added_count += 1
                
                # Update from_date and to_date to reflect the 3-month date range for which slots were generated
                # Only load and save doctor document if we added new slots or dates need updating
                if new_slots_added:
                    # doctor_doc is already loaded if we added slots
                    doctor_doc.from_date = first_day_month
                    doctor_doc.to_date = last_day_range
                    doctor_doc.save(ignore_permissions=True)
                else:
                    # Check if dates need updating even if no new slots
                    doctor_doc = frappe.get_doc("Doctor", doctor_name)
                    if doctor_doc.from_date != first_day_month or doctor_doc.to_date != last_day_range:
                        doctor_doc.from_date = first_day_month
                        doctor_doc.to_date = last_day_range
                        doctor_doc.save(ignore_permissions=True)
                
                if new_slots_added:
                    frappe.logger().info(f"Added {doctor_slots_count} slots for doctor {doctor_name}")
                else:
                    frappe.logger().info(f"No new slots added for doctor {doctor_name} (all slots already exist)")
                
                # Commit after each doctor to ensure progress is saved
                frappe.db.commit()
                doctors_processed += 1
                
                # Progress logging
                if new_slots_added:
                    print(f"   [{idx}/{total_doctors}] ✅ {doctor_name}: Added {doctor_slots_count} slots")
                else:
                    print(f"   [{idx}/{total_doctors}] ⏭️  {doctor_name}: No new slots (already exist)")
                
                # Periodic progress update every batch_size doctors
                if idx % batch_size == 0:
                    frappe.logger().info(f"Progress: Processed {idx}/{total_doctors} doctors, {slots_added_count} slots added so far")
                    
            except Exception as e:
                # Truncate error message to 140 characters to avoid CharacterLengthExceededError
                error_msg = str(e)[:140] if len(str(e)) > 140 else str(e)
                error_title = f"Error for {doctor_name}"[:140]
                
                try:
                    frappe.log_error(
                        f"Error processing doctor {doctor_name}: {error_msg}",
                        error_title
                    )
                except Exception:
                    # If logging fails, just log to console
                    frappe.logger().error(f"Error processing doctor {doctor_name}: {error_msg}")
                
                # Rollback this doctor's transaction and continue with next doctor
                frappe.db.rollback()
                continue
        
        frappe.logger().info(f"Schedule generation completed. Processed {doctors_processed} doctors, Total slots added: {slots_added_count}")
        
        # Log final summary
        print(f"\n✅ Schedule generation completed!")
        print(f"   Doctors processed: {doctors_processed}")
        print(f"   Total slots added: {slots_added_count}")
        
        return {
            "success": True,
            "doctors_processed": doctors_processed,
            "slots_added": slots_added_count
        }
        
    except Exception as e:
        # Truncate error message to avoid CharacterLengthExceededError
        traceback_str = frappe.get_traceback()
        error_msg = traceback_str[:5000] if len(traceback_str) > 5000 else traceback_str  # Limit to 5000 chars for message
        error_title = "add_schedule_entry Error"[:140]  # Limit title to 140 chars
        
        try:
            frappe.log_error(error_msg, error_title)
        except Exception:
            # If logging fails, just log to console
            frappe.logger().error(f"add_schedule_entry failed: {str(e)[:200]}")
        
        frappe.db.rollback()
        raise  # Re-raise the exception so caller knows it failed


import frappe
import calendar
from datetime import datetime, timedelta
from frappe.query_builder import DocType
from frappe.utils import getdate, add_days, now, cint

SLOTS = [
    "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", 
    "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", 
    "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM"
]


WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"]

def add_schedule_entry():
    doctors = frappe.get_all("Doctor", fields=["name"])

    today = getdate(now())
    first_day_next_month = (today.replace(day=1) + timedelta(days=32)).replace(day=1)
    days_in_next_month = calendar.monthrange(first_day_next_month.year, first_day_next_month.month)[1]

    for doctor in doctors:
        for day_offset in range(days_in_next_month):
            current_date = add_days(first_day_next_month, day_offset)
            current_weekday = current_date.weekday() 
            
            if current_weekday in [5, 6]:
                continue
            
            current_day_name = WEEKDAYS[current_weekday]
            
            for slot in SLOTS:
                doctor_doc = frappe.get_doc("Doctor", doctor['name'])
                doctor_doc.append("table_schedule", {
                    "doctor": doctor['name'],
                    "date": current_date,
                    "day": current_day_name,
                    "patients": 2, 
                    "mode": "In-Person", 
                    "slot": slot
                })
                
                doctor_doc.save()
        frappe.db.commit()


def whatsapp_message_notification(doc, method):
    try:
        # Only proceed if the message type is 'Incoming'
        if doc.type != 'Incoming':
            return

        # Normalize phone number by removing non-digit characters
        message_from = ''.join(filter(str.isdigit, getattr(doc, 'from', '') or ''))

        # Define Lead Doctype for Query Builder
        Lead = DocType('Lead')

        # Query to find matching leads (excluding Duplicate Lead)
        query = (
            frappe.qb.from_(Lead)
            .select(
                Lead.name,
                Lead.first_name,
                Lead.contact_number,
                Lead.executive
            )
            .where(
                (Lead.status != 'Duplicate Lead')
                & (Lead.contact_number.like(f"%{message_from}%"))
            )
            .groupby(Lead.executive)
            .orderby(Lead.creation, order=frappe.qb.terms.Order.desc)
            .limit(1)
        )

        # Execute the query
        lead = query.run(as_dict=True)

        if lead:
            lead = lead[0]  # Get the first matching lead
            executive = lead.get('executive')
            lead_name = lead.get('first_name') or lead.get('name')
            lead_name = frappe.bold(lead_name)  # Highlight the lead's name
            lead_link = frappe.utils.get_url(f"/app/lead/{lead.get('name')}")

            if executive:

                # if doesn't find it thows error, since this is rare case, we can ignore it to save query
                # user_email = frappe.db.get_value('User', {'full_name': executive}, 'name')
                # if not user_email:
                #     frappe.logger().warning(f"No user found for Executive: {executive}")
                #     return
                
                # Create Notification with Link to Lead
                title = f"New WhatsApp Message from {lead_name}"
                message = (
                    f"{lead_name} sent a new WhatsApp message:<br><br>"
                    f"<blockquote>{doc.message}</blockquote>"
                    f"<br>👉 <a href='{lead_link}' target='_blank'>View Lead</a>"
                )

                # Send Notification to Executive
                # frappe.publish_realtime(
                #     event='msgprint',
                #     message=message,
                #     user=frappe.db.get_value('User', {'full_name': executive}, 'name')
                # )

                # Create Notification Record
                notification_doc = frappe.get_doc({
                    "doctype": "Notification Log",
                    "subject": title,
                    "email_content": message,
                    "document_type": "Lead",
                    "document_name": lead.get('name'),
                    "for_user": frappe.db.get_value("User", {"full_name": executive}, "name"),
                    "type": "Alert"
                })
                notification_doc.insert(ignore_permissions=True)
                frappe.db.commit()

                # Log notification for reference
                # frappe.logger().info(f"Notification sent to Executive: {executive}")
        else:
            frappe.logger().warning(f"No lead found for phone number: {message_from}")
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), f"WhatsApp Message Notification Error: {e}")
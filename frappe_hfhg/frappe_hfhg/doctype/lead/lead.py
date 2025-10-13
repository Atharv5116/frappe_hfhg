# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import json
import frappe
from frappe.desk.form import assign_to
from frappe.model.document import Document
from frappe import _
from frappe.share import set_permission, remove
import random
from datetime import datetime
from frappe.utils import today

class Lead(Document):
	def validate(self):
		self.contact_number_copy = self.contact_number.split("-")[-1] if self.contact_number else None
		self.alternative_number_copy = self.alternative_number.split("-")[-1] if self.alternative_number else None

		for reminder in self.get("reminders"):
			reminder.service = self.service
			reminder.center = self.center
			reminder.lead_status = self.status
			reminder.distance = self.distance
			reminder.contact_number = self.contact_number
			reminder.alternative_number = self.alternative_number
			reminder.city = self.city

		if self.contact_number: 
			validate_phone_number(self.contact_number)

		if self.alternative_number:
			validate_phone_number(self.alternative_number)

		if self.contact_number:
			number = self.contact_number.split("-")[-1]
			if len(number) > 10 and number[0] == "0":
				number = number[1:]
				self.contact_number = self.contact_number.split("-")[0]+ "-" + number

		if self.alternative_number:
			number = self.alternative_number.split("-")[-1]
			if len(number) > 10 and number[0] == "0":
				number = number[1:]
				self.alternative_number = self.alternative_number.split("-")[0] + "-" + number 

	def after_insert(self):
		lead = get_original_lead_name(self.contact_number, self.alternative_number)
		if lead:
			lead_doc = frappe.get_doc("Lead", lead)
			if lead == self.name:
				contact = None
				if frappe.db.exists("Contacts", {"contact_number": self.contact_number}):
					contact_doc = frappe.get_doc("Contacts", {"contact_number": self.contact_number})
					contact = contact_doc.name
				elif frappe.db.exists("Contacts", {"alternative_number": self.contact_number}):
					contact_doc = frappe.get_doc("Contacts", {"alternative_number": self.contact_number})
					contact = contact_doc.name
				elif self.alternative_number and frappe.db.exists("Contacts", {"contact_number": self.alternative_number}):
					contact_doc = frappe.get_doc("Contacts", {"contact_number": self.alternative_number})
					contact = contact_doc.name
				elif self.alternative_number and frappe.db.exists("Contacts", {"alternative_number": self.alternative_number}):
					contact_doc = frappe.get_doc("Contacts", {"alternative_number": self.alternative_number})
					contact = contact_doc.name
				
				if contact:
					self.contact = contact
					self.save(ignore_permissions=True, ignore_version=True)
				else:
					contact_doc = frappe.get_doc({
						"doctype": "Contacts",
						"full_name": self.name,
						"contact_number": self.contact_number,
						"alternative_number": self.alternative_number,
					})
					contact_doc.insert(ignore_permissions=True)
					self.contact = contact_doc.name
					self.save(ignore_permissions=True, ignore_version=True)
			else:
				if lead_doc.contact:
					frappe.get_doc({
						"doctype": "Duplicate Leads Logs",
						"lead": self.name,
						"contacts": lead_doc.contact,
						"contact_number": self.contact_number,
						"object": json.dumps(self.as_dict(), default=str) + json.dumps(lead_doc.as_dict(), default=str),
					}).insert(ignore_permissions=True)
					self.status = "Duplicate Lead"
					self.contact = lead_doc.contact
					self.executive = lead_doc.executive
					self.assign_by = lead_doc.assign_by
					self.save(ignore_permissions=True, ignore_version=True)
					frappe.msgprint(
						_("<h4>The lead '{}' already exists. so it will be assigned to {}.</h4>Created on: {} <br>City: {} <br>Source: {}").format(
							lead_doc.name, self.executive, lead_doc.created_on.strftime("%d-%m-%Y"), lead_doc.city, lead_doc.source
						),
						title=_("Message"),
						indicator="green",
					)

	def before_save(self):
		self.validate_child_table_descriptions("reminders", "description", 100000)
		self.validate_child_table_descriptions("conversations", "description", 100000)
		old_doc = self.get_doc_before_save()

		if old_doc and old_doc.executive != self.executive:
			log_executive_change(self)
			self.previous_executive = old_doc.executive
			self.executive_changed_date = today()
			for reminder in self.reminders:
					if reminder.status == "Open":
						reminder.executive = self.executive
		
		if old_doc and old_doc.contact_number != self.contact_number:
			contact_exists = frappe.db.exists("Contacts", {"contact_number": old_doc.contact_number})
			if contact_exists:
				contact = frappe.get_doc("Contacts", {"contact_number": old_doc.contact_number})
				contact.contact_number = self.contact_number
				contact.save()

		if old_doc and old_doc.alternative_number != self.alternative_number:
			contact_exists = frappe.db.exists("Contacts", {"alternative_number": old_doc.alternative_number})
			if contact_exists:
				contact = frappe.get_doc("Contacts", {"alternative_number": old_doc.alternative_number})
				contact.alternative_number = self.alternative_number
				contact.save()

		if old_doc:
			old_status = old_doc.status
			new_status = self.status
			if old_status != new_status:
				self.log_status_change(old_status, new_status)

	def log_status_change(self, old_status, new_status):
		frappe.get_doc({
			"doctype": "Lead Status Track",
            "lead": self.name,
            "old_status": old_status,
            "new_status": new_status,
            "user": frappe.session.user,
            "date": frappe.utils.now()
        }).insert(ignore_permissions=True)
		

	def validate_child_table_descriptions(self, table_fieldname, child_fieldname, max_chars):
		child_table = self.get(table_fieldname)
		if not child_table:
			return
		for row in child_table:
			description = row.get(child_fieldname)
			if description and len(description) > max_chars:
				frappe.throw(
                    _(f"The {child_fieldname.capitalize()} field in row {row.idx} of {table_fieldname.capitalize()} "
                      f"cannot exceed {max_chars} characters. You currently have {len(description)} characters.")
                )

	
	def before_insert(self):
		assignee_doctype, assign_to = None, None  # Ensure these variables are always defined

		if self.campaign_name:
			# Special handling for SEO_Form campaign (curl imports)
			if self.campaign_name == "SEO_Form":
				try:
					# Get all executives from "website form" campaign team
					website_form_executives = frappe.get_all(
						"Campaign Team Executives",
						filters={"parent": "website form"},
						fields=["executive"]
					)

					if website_form_executives:
						# Count how many leads each member currently has assigned today
						today_date = datetime.now().strftime("%Y-%m-%d")
						lead_counts = {}
						
						for record in website_form_executives:
							executive_name = record["executive"]
							lead_count = frappe.db.count(
								"Lead",
								filters={
									"executive": executive_name,
									"created_on": ["between", [f"{today_date} 00:00:00", f"{today_date} 23:59:59"]],
									"status": ["!=", "Duplicate Lead"]
								}
							)
							lead_counts[executive_name] = lead_count

						# Find executive with the lowest number of leads
						min_leads = min(lead_counts.values(), default=0)
						least_loaded_executives = [exec_name for exec_name, count in lead_counts.items() if count == min_leads]

						assigned_executive = random.choice(least_loaded_executives)
						self.executive = assigned_executive
						
						frappe.logger().info(f"SEO_Form campaign: Assigned lead to executive: {assigned_executive} (daily count: {min_leads})")
					else:
						frappe.log_error("No executives found in 'website form' campaign team for SEO_Form campaign. Skipping assignment.")

				except Exception as e:
					frappe.log_error(f"Error in assigning executive from website form team for SEO_Form campaign: {str(e)}")
			else:
				# Regular Meta Campaign handling (original logic)
				try:
					campaign = frappe.get_doc("Meta Campaign", self.campaign_name)
					assignee_doctype = getattr(campaign, "assignee_doctype", None)
					assign_to = getattr(campaign, "assign_to", None)
				except frappe.DoesNotExistError:
					frappe.log_error(f"Campaign '{self.campaign_name}' not found. Skipping campaign-based assignment.")

		if self.ad_name:
			try:
					# Get the latest webhook log entry for the `ad_id`
					webhook_log = frappe.get_all(
							"Meta Webhook Lead Logs",
							filters={"ad_id": self.ad_name},
							fields=["form_id"],
							order_by="received_time DESC",  # Sort by latest `received_time`
							limit_page_length=1  # Fetch only the latest record
					)

					if webhook_log:
							form_id = webhook_log[0].get("form_id")  # Use `.get()` to avoid KeyError

							# Use `form_id` to find assignment details in `Meta Lead Form`
							lead_form = frappe.get_all(
									"Meta Lead Form",
									filters={"form_id": form_id},
									fields=["assignee_doctype", "assign_to"]
							)

							if lead_form:
									assignee_doctype = lead_form[0].get("assignee_doctype")
									assign_to = lead_form[0].get("assign_to")

			except Exception as e:
					frappe.log_error(f"Error in fetching Meta Webhook Lead Logs or Lead Form: {str(e)}")

		if assignee_doctype and assign_to:
			try:
					if assignee_doctype == "User":
							if frappe.db.exists("Executive", {"email": assign_to}):
									executive = frappe.get_doc("Executive", {"email": assign_to})
									self.executive = executive.name

					elif assignee_doctype == "Campaign Team":
							all_team_executives = frappe.get_all(
									"Campaign Team Executives",
									filters={"parent": assign_to},
									fields=["executive"]
							)

							if all_team_executives:
									# **New Logic: Assign to the executive with the least workload**
									today_date = datetime.now().strftime("%Y-%m-%d")
									lead_counts = {
                    record["executive"]: frappe.db.count(
                        "Lead",
                        filters={
                            "executive": record["executive"],
                            "created_on": ["between", [f"{today_date} 00:00:00", f"{today_date} 23:59:59"]],
                            "status": ["!=", "Duplicate Lead"],
                            **({"ad_name": self.ad_name} if self.ad_name else {}),
                            **({"campaign_name": self.campaign_name} if self.campaign_name else {})
                        }
                    )
                    for record in all_team_executives
                	}

									# **Find executive with the least assigned leads**
									min_leads = min(lead_counts.values(), default=0)
									least_loaded_executives = [exec_name for exec_name, count in lead_counts.items() if count == min_leads]

									# **Randomly assign from least-loaded**
									assigned_executive = random.choice(least_loaded_executives)
									self.executive = assigned_executive
							else:
									frappe.log_error(f"No executives found in Campaign Team '{assign_to}'. Skipping assignment.")

			except Exception as e:
					frappe.logger().warning(f"Error in assigning executive: {str(e)}")
	
		self.status = "New Lead"

	def on_update(self):
		old_doc = self.get_doc_before_save()
		if self.executive:
			executive = frappe.get_doc('Executive', self.executive)
			assignes = assign_to.get({
				"doctype": 'Lead',
				"name": self.name
			})

			assignes_list = [x.owner for x in assignes]

			if (executive.email not in assignes_list) or (old_doc.executive != self.executive):
				assign_to.clear('Lead',self.name)
				frappe.db.delete("DocShare", {
					"share_doctype": 'Lead',
					"share_name": self.name
				})

				assign_to.add({
					"assign_to": [executive.email],
					"doctype": 'Lead',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Lead', self.name, executive.email, 'write')
				set_permission('Lead', self.name, executive.email, 'share')
				frappe.db.commit()
			else:	
				has_write_access = frappe.db.exists("DocShare", {
                    "share_doctype": 'Lead',
                    "share_name": self.name,
                    "user": executive.email,
                    "read": 1,
                    "write": 1 
                })
				if not has_write_access and self.executive == executive.name:
					set_permission('Lead', self.name, executive.email, 'write')
					set_permission('Lead', self.name, executive.email, 'share')
					frappe.db.commit()
				
			assignes = assign_to.get({
					"doctype": 'Lead',
					"name": self.name
				    })
			assignes_list = [x.owner for x in assignes]
			
			costing_exists = frappe.db.exists("Costing", {"patient": self.name})
			if costing_exists:
				costing = frappe.get_doc('Costing', {"patient": self.name})
				if costing.executive != self.executive or costing.assign_by != self.assign_by or costing.previous_executive != self.previous_executive or str(costing.executive_changed_date) != str(self.executive_changed_date):
					costing.executive = self.executive
					costing.assign_by = self.assign_by
					if self.previous_executive:
						costing.previous_executive = self.previous_executive
						costing.executive_changed_date = self.executive_changed_date
					costing.save(ignore_permissions=True)

			surgery_exists = frappe.db.exists("Surgery", {"patient": self.name})
			if surgery_exists:
				surgery = frappe.get_doc('Surgery', {"patient": self.name})
				if surgery.executive != self.executive or surgery.assign_by != self.assign_by or surgery.previous_executive != self.previous_executive or str(surgery.executive_changed_date) != str(self.executive_changed_date):
					surgery.executive = self.executive
					surgery.assign_by = self.assign_by
					if self.previous_executive:
						surgery.previous_executive = self.previous_executive
						surgery.executive_changed_date = self.executive_changed_date
					surgery.save(ignore_permissions=True)

		if self.receptionist:
			receptionist = frappe.get_doc('Receptionist', self.receptionist)
			assignes = assign_to.get({
				"doctype": 'Lead',
				"name": self.name
			})

			assignes_list = [x.owner for x in assignes]

			if receptionist.email not in assignes_list:
				assign_to.add({
					"assign_to": [receptionist.email],
					"doctype": 'Lead',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Lead', self.name, receptionist.email, 'write')
				set_permission('Lead', self.name, receptionist.email, 'share')
				frappe.db.commit()

		if self.center:
			assignes = assign_to.get({
				"doctype": 'Lead',
				"name": self.name
			})
			assignes_list = [x.owner for x in assignes]

		# Check if center exists before trying to get it
		if frappe.db.exists('Center', self.center):
			center = frappe.get_doc('Center', self.center)
			if center.clinic_manager and center.clinic_manager not in assignes_list:
				assign_to.add({
					"assign_to": [center.clinic_manager],
					"doctype": 'Lead',
					"name": self.name
				}, ignore_permissions=True)
				set_permission('Lead', self.name, center.clinic_manager, 'write')
				set_permission('Lead', self.name, center.clinic_manager, 'share')

				frappe.db.commit()
		else:
			frappe.logger().warning(f"Center '{self.center}' not found for lead {self.name}. Skipping clinic manager assignment.")

		if old_doc and old_doc.center and old_doc.center != self.center:
			assignes = assign_to.get({
				"doctype": 'Lead',
				"name": self.name
			})
			assignes_list = [x.owner for x in assignes]

			old_center = frappe.get_doc('Center', old_doc.center)
			old_receptionist = frappe.get_doc('Receptionist', old_center.receptionist)

			if old_receptionist.email in assignes_list:
				assign_to.remove("Lead", self.name, old_receptionist.email, ignore_permissions=True)
				set_permission('Lead', self.name, old_receptionist.email, 'read', 0)
				frappe.db.commit()
			
			if old_center.clinic_manager and old_center.clinic_manager in assignes_list:
				assign_to.remove("Lead", self.name, old_center.clinic_manager, ignore_permissions=True)
				set_permission('Lead', self.name, old_center.clinic_manager, 'read', 0)
				frappe.db.commit()

		if old_doc and old_doc.executive and old_doc.executive != self.executive:
			restricted_statuses = ["Booked", "Spot Booking", "Non Booked", "Medi-PRP"]
			if frappe.db.exists("Consultation", {"patient": self.name}):
				consultations = frappe.get_all("Consultation", filters={"patient": self.name}, fields=["name", "status", "executive", "previous_executive"])
				for consultation in consultations:
					assign_to.add({
                       "assign_to": [executive.email],
                       "doctype": "Consultation",
                       "name": consultation.name
                    }, ignore_permissions=True)
					set_permission("Consultation", consultation.name, executive.email, "read")
					if consultation.status not in restricted_statuses:
						set_permission("Consultation", consultation.name, executive.email, "write")
						set_permission('Consultation', consultation.name, executive.email, 'share')
						frappe.db.set_value("Consultation", consultation.name, "previous_executive", self.previous_executive)
						frappe.db.set_value("Consultation", consultation.name, "executive", self.executive)
            
					attachments = frappe.get_all("File", filters={
                        "attached_to_doctype": "Consultation",
                        "attached_to_name": consultation.name
                    }, fields=["name"])
					for attachment in attachments:
						set_permission("File", attachment.name, executive.email, "read")
				frappe.db.commit()


	def autoname(self):
		fullname = self.first_name
		if self.middle_name:
			fullname = fullname + " " + self.middle_name
		if self.last_name:
			fullname = fullname + " " + self.last_name
		available = frappe.get_all(
			"Lead",
			filters={"name": fullname},
		)
		new_name = fullname
		if len(available) != 0:
			new_name = fullname + " - " + str(len(available) + 1)
			exists = True
			count = 3
			while exists:
				available = frappe.get_all(
					"Lead",
					filters={"name": new_name},
				)
				if len(available) != 0:
					new_name = fullname + " - " + str(count)
					count += 1
				else:
					exists = False
			frappe.msgprint(
				_("Changed lead name to '{}' as '{}' already exists.").format(
					new_name, fullname
				),
				title=_("Note"),
				indicator="yellow",
			)
			self.name = new_name.strip()
		self.full_name = fullname.strip()
		new_name = new_name.strip()

		is_executive_exist = frappe.db.exists({"doctype": "Executive", "email": frappe.session.user})

		if is_executive_exist:
			executive = frappe.get_doc("Executive", {"email": frappe.session.user})
			self.executive = executive.name
			self.assign_by = frappe.session.user
		
		
		
def validate_phone_number(phone):
    import re
    phone_regex = r'^\+\d{1,4}-\d{7,15}$'
    if not re.match(phone_regex, phone):
        frappe.throw(f"Phone number '{phone}' must be in the format +<country code>-<number>, e.g., +91-7699889988.")

def log_executive_change(lead_doc):
    frappe.get_doc({
        'doctype': 'Lead Executive Change Log',
        'lead': lead_doc.name,
        'executive_from': lead_doc.get_doc_before_save().executive,
        'executive_to': lead_doc.executive,
        'date_time': frappe.utils.now_datetime(),
        'assign_by': frappe.session.user
    }).insert(ignore_permissions=True)

@frappe.whitelist()
def get_dashboard_stats(lead):
	consultations = frappe.get_all("Consultation", filters={"patient": lead})
	bookings = frappe.get_all("Costing", filters={"patient": lead})
	surgeries = frappe.get_all("Surgery", filters={"patient": lead})

	return [
		{"label": _("Consultation"), "value": len(consultations)},
		{"label": _("Costing"), "value": len(bookings)},
		{"label": _("Surgery"), "value": len(surgeries)},
	]

@frappe.whitelist()
def get_original_lead_name(contact_number, alternative_number=None, frontend_call=False):
	if not contact_number:
		return None
	leads_1 = frappe.get_all("Lead", fields=["name", "status", "creation"], filters={"contact_number": contact_number}, ignore_permissions=True)
	leads_2 = frappe.get_all("Lead", fields=["name", "status", "creation"], filters={"alternative_number": contact_number}, ignore_permissions=True)
	leads = leads_1 + leads_2 
	if alternative_number:
		leads_3 = frappe.get_all("Lead", fields=["name", "status", "creation"], filters={"alternative_number": alternative_number}, ignore_permissions=True)
		leads_4 = frappe.get_all("Lead", fields=["name", "status", "creation"], filters={"contact_number": alternative_number}, ignore_permissions=True)
		leads = leads + leads_3 + leads_4
	new_leads = []
	for lead in leads:
		if lead["status"] != "Duplicate Lead":
			new_leads.append(lead)
	if len(new_leads) == 1:
		return new_leads[0]["name"]
	elif len(new_leads) > 1:
		new_leads.sort(key=lambda lead: lead["creation"])
		return new_leads[0]["name"]
	
	if frontend_call:
		for lead in leads:
			if lead.status == "Duplicate Lead":
				lead_doc = frappe.get_doc("Lead", lead.name)
				lead_doc.status = "New Lead"
				lead_doc.save(ignore_permissions=True)
	return None

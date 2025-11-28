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

AUTO_LINK_SOURCE_EXCLUSIONS = {"META", "FACEBOOK", "INSTAGRAM"}


def auto_link_ad_name_from_source(lead_doc: Document) -> None:
	source_value = (getattr(lead_doc, "source", "") or "").strip()
	if not source_value:
		return
	if source_value.upper() in AUTO_LINK_SOURCE_EXCLUSIONS:
		return

	meta_ad_name = frappe.db.get_value("Meta Ads", {"ads_name": source_value}, "name")
	if not meta_ad_name:
		meta_ad_name = frappe.db.sql(
			"""
			SELECT name
			FROM `tabMeta Ads`
			WHERE UPPER(TRIM(ads_name)) = UPPER(TRIM(%s))
			LIMIT 1
			""",
			source_value,
		)
		meta_ad_name = meta_ad_name[0][0] if meta_ad_name else None

	if meta_ad_name:
		existing_ad_name = (getattr(lead_doc, "ad_name", "") or "").strip()
		if not existing_ad_name:
			lead_doc.ad_name = meta_ad_name
			return

		source_changed = False
		if hasattr(lead_doc, "get_doc_before_save"):
			try:
				old_doc = lead_doc.get_doc_before_save()
			except Exception:  # pragma: no cover - defensive
				old_doc = None
			if old_doc:
				old_source = (getattr(old_doc, "source", "") or "").strip()
				source_changed = old_source != source_value

		if existing_ad_name != meta_ad_name:
			existing_is_meta_name = frappe.db.exists("Meta Ads", {"name": existing_ad_name})
			if source_changed or not existing_is_meta_name:
				lead_doc.ad_name = meta_ad_name
			elif not existing_is_meta_name and frappe.db.exists("Meta Ads", {"ads_name": existing_ad_name}):
				lead_doc.ad_name = meta_ad_name


class Lead(Document):
	def validate(self):
		auto_link_ad_name_from_source(self)
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

		# Validate that only the creator can close their reminder
		self.validate_reminder_close_permission()

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
		
		# Validate mandatory fields when status is changed (except for specific statuses)
		self.validate_mandatory_fields_on_status_change()

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
		auto_link_ad_name_from_source(self)
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

	def validate_reminder_close_permission(self):
		"""Validate that only the creator of a reminder can close it"""
		# Get current user's full name
		current_user = frappe.session.user
		current_user_fullname = frappe.db.get_value("User", current_user, "full_name")
		
		# Get old document to compare status changes
		old_doc = None
		if hasattr(self, "get_doc_before_save"):
			try:
				old_doc = self.get_doc_before_save()
			except Exception:
				old_doc = None
		
		# If no old document, this is a new document, so no validation needed
		if not old_doc:
			return
		
		# Create a map of old reminders by name or idx for comparison
		old_reminders_map = {}
		if old_doc and hasattr(old_doc, "reminders"):
			for old_reminder in old_doc.reminders:
				# Use name if exists, otherwise use idx
				key = old_reminder.name if old_reminder.name else old_reminder.idx
				old_reminders_map[key] = old_reminder
		
		# Check each reminder in the current document
		for reminder in self.get("reminders", []):
			# Find the corresponding old reminder
			old_reminder = None
			if reminder.name:
				old_reminder = old_reminders_map.get(reminder.name)
			else:
				# For new reminders, check by idx
				old_reminder = old_reminders_map.get(reminder.idx)
			
			# If reminder status changed from "Open" to "Close"
			if old_reminder and old_reminder.status == "Open" and reminder.status == "Close":
				# Check if current user is the executive who created this reminder
				reminder_executive = reminder.executive or old_reminder.executive
				if reminder_executive and reminder_executive != current_user_fullname:
					frappe.throw(
						_("You cannot close a reminder created by '{0}'. Only the creator can close their own reminder.").format(
							reminder_executive
						),
						title=_("Permission Denied")
					)
	
	def before_insert(self):
		auto_link_ad_name_from_source(self)
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
	
		# Only set to "New Lead" if status is not already set or is not one of the exempt statuses
		exempt_statuses = ["Not Connected", "Fake Lead", "Invalid Number", "Duplicate Lead"]
		if not self.status or self.status not in exempt_statuses:
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
			
			# Sync executive change to duplicate leads (if this is an original lead)
			if old_doc and old_doc.executive != self.executive and self.status != "Duplicate Lead":
				sync_executive_to_duplicates(self.name)
			
			# Sync executive change from duplicate lead to original lead
			if old_doc and old_doc.executive != self.executive and self.status == "Duplicate Lead":
				sync_executive_to_original_lead(self)
			
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
	
	def validate_mandatory_fields_on_status_change(self):
		"""
		Validate that all mandatory fields are filled when status changes to
		anything other than exempt statuses or when saving for the first time
		"""
		# Skip validation for new documents (first save)
		if self.is_new():
			return
		
		# If "Is Applicable" checkbox is not checked, don't require mandatory fields
		if not self.get('is_applicable'):
			return
		
		# If no status is selected, don't require mandatory fields
		if not self.status:
			return
		
		# Statuses that don't require mandatory fields
		exempt_statuses = ["New Lead", "Not Connected", "Fake Lead", "Invalid Number", "Duplicate Lead", "Not Interested", "Connected"]
		
		# Only validate if status is not in exempt list
		if self.status not in exempt_statuses:
			missing_fields = []
			
			# Check basic fields
			if not self.distance:
				missing_fields.append("Distance")
			
			if not self.first_name:
				missing_fields.append("First Name")
			
			if not self.middle_name:
				missing_fields.append("Middle Name")
			
			if not self.last_name:
				missing_fields.append("Last Name")
			
			if not self.age:
				missing_fields.append("Age")
			
			if not self.profession:
				missing_fields.append("Profession")
			
			if not self.mode:
				missing_fields.append("Mode")
			
			if not self.current_treatment:
				missing_fields.append("Have you taken or currently taking any hair treatment?")
			
			if not self.treatment_type:
				missing_fields.append("What treatment option you are interested in?")
			
			if not self.planning_time:
				missing_fields.append("How soon you are planning to start hair treatment?")
			
			if not self.consultation_type:
				missing_fields.append("What mode of consultation you like to have?")
			
			if not self.family_history:
				missing_fields.append("Family History")
			
			# Check if at least one hair loss type is selected
			hair_loss_selected = (
				self.hair_problem_hair_loss_check or 
				self.hair_problem_baldness_check or 
				self.hair_problem_handruff_check
			)
			if not hair_loss_selected:
				missing_fields.append("Select hair loss problem type (at least one)")
			
			# Check if at least one baldness stage is selected
			baldness_stage_selected = (
				self.i or self.ii or self.ii_a or self.iii or self.iii_a or 
				self.iii_vertex or self.iv or self.iv_a or self.v or 
				self.v_a or self.vi or self.vii
			)
			if not baldness_stage_selected:
				missing_fields.append("Select current level of baldness/hair loss stage (at least one)")
			
			# If there are missing fields, throw an error
			if missing_fields:
				frappe.throw(
					_("The following fields are mandatory when status is '{}':<br><br>{}").format(
						self.status,
						"<br>".join([f"• {field}" for field in missing_fields])
					),
					title=_("Mandatory Fields Required")
				)

		
		
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

@frappe.whitelist()
def get_source_list():
	"""Return all Source records without limit for the source field dropdown"""
	return frappe.get_all("Source", fields=["name"], order_by="name asc", limit_page_length=0)

@frappe.whitelist()
def get_executive_list():
	"""Return all Executive records with limit of 50 for the executive field dropdown"""
	return frappe.get_all("Executive", fields=["name"], order_by="name asc", limit_page_length=50)

@frappe.whitelist()
def get_dynamic_source_fields():
	"""Return Source records that have show_additional_field checked"""
	sources = frappe.get_all("Source", 
		filters={"show_additional_field": 1}, 
		fields=["name", "source_name"], 
		order_by="name asc"
	)
	
	# Create field mapping: source_name -> field_name
	field_mapping = {}
	for source in sources:
		field_name = f"{source.source_name.lower().replace(' ', '_')}_name"
		field_mapping[source.name] = {
			"field_name": field_name,
			"label": f"{source.source_name} Name"
		}
	
	return field_mapping

@frappe.whitelist()
def sync_executive_to_duplicates(lead_name):
	"""
	Sync executive changes from original lead to all duplicate leads.
	Can be called from Lead.on_update() or manually.
	
	Args:
		lead_name: Name of the original lead
	"""
	try:
		lead = frappe.get_doc("Lead", lead_name)
		
		# Only proceed if this is not a duplicate lead
		if lead.status == "Duplicate Lead":
			return
		
		# Find all duplicate leads with same contact number
		duplicate_leads = frappe.get_all(
			"Lead",
			filters={
				"contact_number": lead.contact_number,
				"status": "Duplicate Lead"
			},
			fields=["name", "executive"]
		)
		
		# Also check alternative number
		if lead.alternative_number:
			alt_duplicates = frappe.get_all(
				"Lead",
				filters={
					"contact_number": lead.alternative_number,
					"status": "Duplicate Lead"
				},
				fields=["name", "executive"]
			)
			duplicate_leads.extend(alt_duplicates)
		
		if not duplicate_leads:
			frappe.logger().info(f"No duplicate leads found for {lead_name}")
			return 0
		
		# Update executive for each duplicate lead
		updated_count = 0
		executive = frappe.get_doc('Executive', lead.executive)
		
		for duplicate in duplicate_leads:
			if duplicate.executive != lead.executive:
				# Update executive field
				frappe.db.set_value(
					"Lead", 
					duplicate.name, 
					{
						"executive": lead.executive,
						"assign_by": lead.assign_by
					},
					update_modified=True
				)
				
				# Update assignments and permissions (like original lead)
				try:
					# Clear old assignments
					assign_to.clear('Lead', duplicate.name)
					
					# Clear old permissions
					frappe.db.delete("DocShare", {
						"share_doctype": 'Lead',
						"share_name": duplicate.name
					})
					
					# Add new assignment to executive
					assign_to.add({
						"assign_to": [executive.email],
						"doctype": 'Lead',
						"name": duplicate.name
					}, ignore_permissions=True)
					
					# Set permissions for executive
					set_permission('Lead', duplicate.name, executive.email, 'write')
					set_permission('Lead', duplicate.name, executive.email, 'share')
					
					frappe.logger().info(f"Synced executive and permissions to duplicate lead: {duplicate.name}")
				except Exception as perm_error:
					frappe.logger().error(f"Error setting permissions for {duplicate.name}: {str(perm_error)}")
				
				updated_count += 1
		
		if updated_count > 0:
			frappe.db.commit()
			frappe.msgprint(
				f"Executive updated in {updated_count} duplicate lead(s)",
				title="Duplicate Leads Synced",
				indicator="blue"
			)
			frappe.logger().info(f"Synced executive '{lead.executive}' to {updated_count} duplicate leads for {lead_name}")
		
		return updated_count
	
	except Exception as e:
		frappe.logger().error(f"Error syncing executive to duplicates for {lead_name}: {str(e)}")
		frappe.log_error(f"Error syncing executive to duplicates: {str(e)}", "Lead Executive Sync")
		return 0


@frappe.whitelist()
def sync_executive_to_original_lead(duplicate_lead):
	"""
	Sync executive changes from duplicate lead to original lead.
	This will then automatically sync to all other duplicate leads via the original lead's on_update.
	
	Args:
		duplicate_lead: Duplicate Lead document or name
	"""
	try:
		# Get the duplicate lead document
		if isinstance(duplicate_lead, str):
			duplicate_lead = frappe.get_doc("Lead", duplicate_lead)
		
		# Only proceed if this is a duplicate lead
		if duplicate_lead.status != "Duplicate Lead":
			return
		
		# Find the original lead using the get_original_lead_name function
		original_lead_name = get_original_lead_name(
			duplicate_lead.contact_number, 
			duplicate_lead.alternative_number
		)
		
		if not original_lead_name:
			frappe.logger().warning(f"No original lead found for duplicate lead: {duplicate_lead.name}")
			return
		
		# Get the original lead document
		original_lead = frappe.get_doc("Lead", original_lead_name)
		
		# Check if executive needs to be updated
		if original_lead.executive != duplicate_lead.executive:
			frappe.logger().info(
				f"Syncing executive from duplicate lead '{duplicate_lead.name}' to original lead '{original_lead.name}'"
			)
			
			# Update the original lead's executive
			original_lead.executive = duplicate_lead.executive
			original_lead.assign_by = duplicate_lead.assign_by
			
			# Save the original lead (this will trigger sync_executive_to_duplicates automatically)
			original_lead.save(ignore_permissions=True)
			frappe.db.commit()
			
			frappe.msgprint(
				f"Executive updated in original lead '{original_lead.name}' and all duplicate leads",
				title="Executive Synced",
				indicator="green"
			)
			
			frappe.logger().info(
				f"Successfully synced executive '{duplicate_lead.executive}' from duplicate to original lead"
			)
			
			return True
		
		return False
	
	except Exception as e:
		frappe.logger().error(f"Error syncing executive to original lead: {str(e)}")
		frappe.log_error(f"Error syncing executive to original lead: {str(e)}", "Lead Executive Sync to Original")
		return False
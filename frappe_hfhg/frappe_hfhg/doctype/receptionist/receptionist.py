# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _

class Receptionist(Document):
	def after_insert(self):
		if frappe.db.exists("User", self.email):
			user = frappe.get_doc("User", self.email)
			existing_roles = [role.role for role in user.roles]
			if "Receptionist" not in existing_roles:
				user.append("roles", {"role": "Receptionist"})
				user.save(ignore_permissions=True)
				frappe.db.commit()
		else:
			user = frappe.get_doc(
				{
					"doctype": "User",
					"email": self.email,
					"first_name": self.name,
					"send_welcome_email": 0,
					"new_password": "ashish@12345",
					"roles": [{"role": "Receptionist"}],
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
			"Receptionist",
			filters={"name": self.fullname},
		)
		if len(available) != 0:
			old_name = self.fullname
			self.fullname = self.fullname + "-" + str(len(available) + 1)
			frappe.msgprint(
				_("Changed receptionist name to '{}' as '{}' already exists.").format(
					self.fullname, old_name
				),
				title=_("Note"),
				indicator="yellow",
			)
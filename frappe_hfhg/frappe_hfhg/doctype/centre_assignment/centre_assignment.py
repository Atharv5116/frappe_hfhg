# Copyright (c) 2025, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _


class CentreAssignment(Document):
	def validate(self):
		# Ensure at least one centre is selected
		if not self.centres or len(self.centres) == 0:
			frappe.throw(_("Please select at least one centre."))
		
		# Check for duplicate centres
		centres_list = [c.center for c in self.centres]
		if len(centres_list) != len(set(centres_list)):
			frappe.throw(_("Duplicate centres are not allowed."))
	
	def on_update(self):
		"""Grant permissions when centres are assigned"""
		if self.user:
			self.ensure_user_has_role()
			self.grant_doctype_permissions()
			self.grant_report_permissions()
			self.setup_user_permissions()
	
	def ensure_user_has_role(self):
		"""Ensure user has Marketing Head(new) role"""
		role = "Marketing Head(new)"
		user_doc = frappe.get_doc("User", self.user)
		user_roles = [r.role for r in user_doc.roles]
		
		if role not in user_roles:
			user_doc.append("roles", {"role": role})
			user_doc.save(ignore_permissions=True)
			frappe.logger().info(f"Added role {role} to user {self.user}")
	
	def grant_doctype_permissions(self):
		"""Grant permissions for Costing, Lead, Consultation, Surgery doctypes"""
		doctypes = ["Costing", "Lead", "Consultation", "Surgery"]
		role = "Marketing Head(new)"
		
		for doctype in doctypes:
			# Check if custom permissions exist, if not create them
			existing_perms = frappe.get_all(
				"Custom DocPerm",
				filters={
					"parent": doctype,
					"role": role
				},
				fields=["name"]
			)
			
			if not existing_perms:
				# Create custom permissions for the role
				try:
					frappe.permissions.add_permission(doctype, role, permlevel=0, ptype="read")
					frappe.permissions.add_permission(doctype, role, permlevel=0, ptype="write")
					frappe.permissions.add_permission(doctype, role, permlevel=0, ptype="create")
					frappe.permissions.add_permission(doctype, role, permlevel=0, ptype="delete")
					frappe.permissions.add_permission(doctype, role, permlevel=0, ptype="submit")
					frappe.permissions.add_permission(doctype, role, permlevel=0, ptype="cancel")
					frappe.permissions.add_permission(doctype, role, permlevel=0, ptype="amend")
					frappe.permissions.add_permission(doctype, role, permlevel=0, ptype="print")
					frappe.permissions.add_permission(doctype, role, permlevel=0, ptype="email")
					frappe.permissions.add_permission(doctype, role, permlevel=0, ptype="report")
					frappe.permissions.add_permission(doctype, role, permlevel=0, ptype="export")
					frappe.permissions.add_permission(doctype, role, permlevel=0, ptype="share")
					frappe.logger().info(f"Granted permissions for {doctype} to role {role}")
				except Exception as e:
					frappe.logger().error(f"Error granting permissions for {doctype}: {str(e)}")
	
	def grant_report_permissions(self):
		"""Grant permissions for reports excluding master reports
		This method automatically syncs all roles from Report JSON files to Custom Role records,
		ensuring that any new roles added to JSON files are automatically included.
		"""
		role = "Marketing Head(new)"
		
		# Get all reports excluding master reports
		reports = frappe.get_all(
			"Report",
			filters={
				"name": ["not like", "Master%"],
				"disabled": 0
			},
			fields=["name"]
		)
		
		for report in reports:
			report_name = report.name
			try:
				# Get standard roles from the report JSON file
				report_doc = frappe.get_doc("Report", report_name)
				json_roles = [r.role for r in report_doc.roles]
				
				# Check if Custom Role exists for this report
				custom_role_name = frappe.db.get_value(
					"Custom Role",
					{"report": report_name},
					"name"
				)
				
				if custom_role_name:
					# Custom Role exists - sync roles from JSON and ensure our role is present
					custom_role_doc = frappe.get_doc("Custom Role", custom_role_name)
					existing_custom_roles = [r.role for r in custom_role_doc.roles]
					
					# Start with all roles from JSON (source of truth)
					# This ensures any new roles added to JSON are automatically included
					final_roles = json_roles.copy()
					
					# Add "Marketing Head(new)" role if not already in JSON roles
					if role not in final_roles:
						final_roles.append(role)
					
					# Check if Custom Role needs to be updated
					# Update if: roles differ or "Marketing Head(new)" is missing
					roles_changed = set(existing_custom_roles) != set(final_roles)
					
					if roles_changed:
						# Clear existing roles and rebuild from final_roles
						custom_role_doc.set("roles", [])
						for role_name in final_roles:
							custom_role_doc.append("roles", {"role": role_name})
						
						custom_role_doc.save(ignore_permissions=True)
						frappe.db.commit()
						frappe.logger().info(
							f"Synced roles for report {report_name}: {final_roles} "
							f"(updated from JSON: {json_roles})"
						)
				else:
					# No Custom Role exists - create one with all JSON roles + our role
					final_roles = json_roles.copy()
					
					# Add our role if not already present
					if role not in final_roles:
						final_roles.append(role)
					
					# Create Custom Role with all roles
					roles_list = [{"role": r} for r in final_roles]
					custom_role_doc = frappe.get_doc({
						"doctype": "Custom Role",
						"report": report_name,
						"roles": roles_list
					})
					custom_role_doc.insert(ignore_permissions=True)
					frappe.db.commit()
					frappe.logger().info(
						f"Created Custom Role for report {report_name} with roles: {final_roles}"
					)
			except Exception as e:
				frappe.logger().error(f"Error granting report permission for {report_name}: {str(e)}")
	
	def setup_user_permissions(self):
		"""Create User Permissions to restrict access to selected centres only"""
		if not self.user or not self.centres:
			return
		
		# Get current user permissions for Center
		existing_perms = frappe.get_all(
			"User Permission",
			filters={
				"user": self.user,
				"allow": "Center"
			},
			fields=["name", "for_value", "apply_to_all_doctypes"]
		)
		
		# Get list of currently assigned centres
		current_centres = [c.center for c in self.centres]
		
		# Remove permissions for centres that are no longer assigned
		for perm in existing_perms:
			if perm.for_value not in current_centres:
				try:
					frappe.delete_doc("User Permission", perm.name, ignore_permissions=True)
					frappe.logger().info(f"Removed user permission for Center {perm.for_value} from user {self.user}")
				except Exception as e:
					frappe.logger().error(f"Error removing user permission: {str(e)}")
		
		# Add permissions for newly assigned centres
		existing_centre_names = [p.for_value for p in existing_perms]
		
		for centre in current_centres:
			if centre not in existing_centre_names:
				try:
					# Create user permission for Center that applies to ALL doctypes (including reports)
					# This ensures reports also respect the center restriction
					frappe.get_doc({
						"doctype": "User Permission",
						"user": self.user,
						"allow": "Center",
						"for_value": centre,
						"apply_to_all_doctypes": 1,
						"is_default": 0,
						"hide_descendants": 0
					}).insert(ignore_permissions=True)
					frappe.logger().info(f"Granted user permission for Center {centre} to user {self.user} (applies to all doctypes)")
				except Exception as e:
					# If permission already exists, skip
					if "DuplicateEntryError" not in str(type(e).__name__):
						frappe.logger().error(f"Error granting user permission for Center {centre}: {str(e)}")
		
		# Clear user permissions cache
		frappe.cache().delete_value(f"user_permissions:{self.user}")
		frappe.clear_cache(user=self.user)


@frappe.whitelist()
def get_assigned_centres_for_user(user=None):
	"""Helper function for reports to get assigned centres for a user"""
	if not user:
		user = frappe.session.user
	
	# Check if user has Centre Assignment
	assignment = frappe.db.exists("Centre Assignment", {"user": user})
	
	if not assignment:
		return []
	
	# Get the assignment document
	assignment_doc = frappe.get_doc("Centre Assignment", assignment)
	
	# Return list of assigned centre names
	return [c.center for c in assignment_doc.centres]


def apply_marketing_head_center_filter(query, params, center_field="center", table_alias=""):
	"""Helper function for reports to apply center filtering for Marketing Head(new) role
	Returns modified query and params with center filtering applied
	
	Args:
		query: SQL query string
		params: Query parameters dict
		center_field: Name of the center field (default: "center")
		table_alias: Table alias prefix (e.g., "l." for leads table)
	
	Returns:
		tuple: (modified_query, modified_params)
	"""
	user = frappe.session.user
	roles = frappe.get_roles()
	
	# Check if user has Marketing Head(new) role
	if "Marketing Head(new)" not in roles:
		return query, params
	
	# Get assigned centres for the user
	assigned_centres = get_assigned_centres_for_user(user)
	
	if not assigned_centres:
		# No centres assigned, return query that matches nothing
		return query + " AND 1=0", params
	
	# Add center filter to query
	center_prefix = f"{table_alias}." if table_alias else ""
	if len(assigned_centres) == 1:
		query += f" AND {center_prefix}`{center_field}` = %(marketing_head_center)s"
		params["marketing_head_center"] = assigned_centres[0]
	else:
		query += f" AND {center_prefix}`{center_field}` IN %(marketing_head_centres)s"
		params["marketing_head_centres"] = tuple(assigned_centres)
	
	return query, params


def filter_data_by_assigned_centres(data, center_field="center"):
	"""Helper function to filter data list by assigned centres for Marketing Head(new) role
	Useful for reports that fetch data first and then filter
	
	Args:
		data: List of dictionaries containing report data
		center_field: Name of the center field in the data
	
	Returns:
		Filtered list of data
	"""
	user = frappe.session.user
	roles = frappe.get_roles()
	
	# Check if user has Marketing Head(new) role
	if "Marketing Head(new)" not in roles:
		return data
	
	# Get assigned centres for the user
	assigned_centres = get_assigned_centres_for_user(user)
	
	if not assigned_centres:
		# No centres assigned, return empty list
		return []
	
	# Filter data by assigned centres
	return [row for row in data if row.get(center_field) in assigned_centres]


def get_center_permission_query_condition(user, doctype=None):
	"""Permission query condition to filter by assigned centres for Marketing Head(new) role
	Similar to how executives are filtered to only see their assigned leads"""
	# Check if user has Marketing Head(new) role
	user_roles = frappe.get_roles(user)
	if "Marketing Head(new)" not in user_roles:
		# Not a Marketing Head, return empty (no additional filtering)
		return ""
	
	# Check if user has Centre Assignment (similar to checking if user is Executive)
	assignment_exists = frappe.db.exists("Centre Assignment", {"user": user})
	
	if not assignment_exists:
		# No centre assignment, return empty
		return ""
	
	# Get the assignment document to fetch assigned centres
	try:
		assignment_doc = frappe.get_doc("Centre Assignment", {"user": user})
		assigned_centres = [c.center for c in assignment_doc.centres]
		
		if not assigned_centres:
			return ""
		
		# Return SQL condition to filter by assigned centres
		# Use proper SQL escaping to prevent injection
		# Handle both single and multiple centres
		if len(assigned_centres) == 1:
			# Escape the centre name
			escaped_centre = frappe.db.escape(assigned_centres[0])
			return f"`tab{doctype}`.center = {escaped_centre}"
		else:
			# Escape all centre names
			escaped_centres = [frappe.db.escape(centre) for centre in assigned_centres]
			centres_str = ", ".join(escaped_centres)
			return f"`tab{doctype}`.center IN ({centres_str})"
	except Exception as e:
		frappe.logger().error(f"Error in get_center_permission_query_condition: {str(e)}")
		return ""


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_all_users(doctype, txt, searchfield, start, page_len, filters):
	"""Custom query to get users with 'Marketing Head(new)' role - returns tuples like (name, full_name)"""
	# Use a very high limit to ensure all users are returned
	limit = max(page_len or 10, 10000)
	role = "Marketing Head(new)"
	
	# Strictly check if the exact role exists, return empty if not
	role_exists = frappe.db.exists("Role", role)
	
	if not role_exists:
		# Role doesn't exist, return empty list
		frappe.logger().warning(f"Role 'Marketing Head(new)' not found")
		return []
	
	# Get users with the exact role only
	users_with_role = frappe.db.sql("""
		SELECT DISTINCT hr.parent as user_name
		FROM `tabHas Role` hr
		INNER JOIN `tabUser` u ON hr.parent = u.name
		WHERE hr.role = %(role)s
			AND hr.parenttype = 'User'
			AND u.enabled = 1
			AND u.name != 'Guest'
	""", {
		'role': role
	}, as_dict=True)
	
	if not users_with_role:
		frappe.logger().warning(f"No users found with role '{role}'")
		return []
	
	user_names = [u.user_name for u in users_with_role]
	
	# Build query to get user details with search
	if not txt or txt.strip() == '':
		users = frappe.get_all(
			"User",
			filters={
				"name": ["in", user_names],
				"enabled": 1
			},
			fields=["name", "full_name"],
			limit=limit,
			order_by="full_name asc"
		)
	else:
		# Use SQL for better search with OR condition
		txt_param = f'%{txt}%'
		# Handle single user case for IN clause
		if len(user_names) == 1:
			users = frappe.db.sql("""
				SELECT name, COALESCE(full_name, name) as full_name
				FROM `tabUser`
				WHERE name = %(user_name)s
					AND enabled = 1
					AND (name LIKE %(txt)s OR full_name LIKE %(txt)s)
				ORDER BY full_name ASC
				LIMIT %(limit)s
			""", {
				'user_name': user_names[0],
				'txt': txt_param,
				'limit': limit
			}, as_dict=True)
		else:
			users = frappe.db.sql("""
				SELECT name, COALESCE(full_name, name) as full_name
				FROM `tabUser`
				WHERE name IN %(user_names)s
					AND enabled = 1
					AND (name LIKE %(txt)s OR full_name LIKE %(txt)s)
				ORDER BY full_name ASC
				LIMIT %(limit)s
			""", {
				'user_names': tuple(user_names),
				'txt': txt_param,
				'limit': limit
			}, as_dict=True)
	
	# Return in the format expected by Frappe's link field (list of tuples)
	result = []
	for u in users:
		if isinstance(u, dict):
			result.append((u.get('name'), u.get('full_name') or u.get('name')))
		else:
			result.append((u.name, u.full_name or u.name))
	return result


@frappe.whitelist()
def debug_marketing_head_users():
	"""Debug function to check users with Marketing Head(new) role"""
	role = "Marketing Head(new)"
	
	# Check if role exists
	role_exists = frappe.db.exists("Role", role)
	
	# Get all roles with "Marketing" in name
	all_marketing_roles = frappe.get_all("Role", filters={"name": ["like", "%Marketing%"]}, fields=["name"])
	
	# Get users with the specific role
	users_with_role = frappe.db.sql("""
		SELECT DISTINCT hr.parent as user_name, hr.role, u.full_name, u.enabled
		FROM `tabHas Role` hr
		LEFT JOIN `tabUser` u ON hr.parent = u.name
		WHERE hr.role = %(role)s
			AND hr.parenttype = 'User'
	""", {
		'role': role
	}, as_dict=True)
	
	# Get all users with any Marketing role
	all_marketing_users = frappe.db.sql("""
		SELECT DISTINCT hr.parent as user_name, hr.role, u.full_name, u.enabled
		FROM `tabHas Role` hr
		LEFT JOIN `tabUser` u ON hr.parent = u.name
		WHERE hr.role LIKE %(role_pattern)s
			AND hr.parenttype = 'User'
	""", {
		'role_pattern': '%Marketing%'
	}, as_dict=True)
	
	return {
		"role_exists": role_exists,
		"all_marketing_roles": [r.name for r in all_marketing_roles],
		"users_with_specific_role": users_with_role,
		"all_marketing_users": all_marketing_users
	}


def sync_single_report_permissions(doc, method):
	"""Sync permissions for a single report when it's updated.
	This is called via doc_events hook when a Report is saved.
	"""
	# Skip master reports
	if doc.name.startswith("Master"):
		return
	
	# Skip if report is disabled
	if doc.disabled:
		return
	
	try:
		role = "Marketing Head(new)"
		report_name = doc.name
		
		# Get standard roles from the report JSON file (now in doc)
		json_roles = [r.role for r in doc.roles]
		
		# Check if Custom Role exists for this report
		custom_role_name = frappe.db.get_value(
			"Custom Role",
			{"report": report_name},
			"name"
		)
		
		if custom_role_name:
			# Custom Role exists - sync roles from JSON
			custom_role_doc = frappe.get_doc("Custom Role", custom_role_name)
			existing_custom_roles = [r.role for r in custom_role_doc.roles]
			
			# Start with all roles from JSON (source of truth)
			final_roles = json_roles.copy()
			
			# Add "Marketing Head(new)" role if not already in JSON roles
			if role not in final_roles:
				final_roles.append(role)
			
			# Check if Custom Role needs to be updated
			roles_changed = set(existing_custom_roles) != set(final_roles)
			
			if roles_changed:
				# Clear existing roles and rebuild from final_roles
				custom_role_doc.set("roles", [])
				for role_name in final_roles:
					custom_role_doc.append("roles", {"role": role_name})
				
				custom_role_doc.save(ignore_permissions=True)
				frappe.db.commit()
				frappe.logger().info(
					f"Synced roles for report {report_name} on update: {final_roles}"
				)
		else:
			# No Custom Role exists - create one with all JSON roles + our role
			final_roles = json_roles.copy()
			
			# Add our role if not already present
			if role not in final_roles:
				final_roles.append(role)
			
			# Create Custom Role with all roles
			roles_list = [{"role": r} for r in final_roles]
			custom_role_doc = frappe.get_doc({
				"doctype": "Custom Role",
				"report": report_name,
				"roles": roles_list
			})
			custom_role_doc.insert(ignore_permissions=True)
			frappe.db.commit()
			frappe.logger().info(
				f"Created Custom Role for report {report_name} on update with roles: {final_roles}"
			)
	except Exception as e:
		frappe.logger().error(f"Error syncing report permission for {doc.name}: {str(e)}")


@frappe.whitelist()
def sync_all_report_permissions():
	"""Standalone function to sync all report permissions from JSON files to Custom Role records.
	This ensures that any roles added to Report JSON files are automatically included in Custom Role records.
	
	Can be called via:
	- bench --site [site] console: exec(open('path/to/centre_assignment.py').read()); sync_all_report_permissions()
	- Or via API: frappe.call('frappe_hfhg.frappe_hfhg.doctype.centre_assignment.centre_assignment.sync_all_report_permissions')
	"""
	role = "Marketing Head(new)"
	synced_count = 0
	created_count = 0
	error_count = 0
	
	# Get all reports excluding master reports
	reports = frappe.get_all(
		"Report",
		filters={
			"name": ["not like", "Master%"],
			"disabled": 0
		},
		fields=["name"]
	)
	
	for report in reports:
		report_name = report.name
		try:
			# Get standard roles from the report JSON file
			report_doc = frappe.get_doc("Report", report_name)
			json_roles = [r.role for r in report_doc.roles]
			
			# Check if Custom Role exists for this report
			custom_role_name = frappe.db.get_value(
				"Custom Role",
				{"report": report_name},
				"name"
			)
			
			if custom_role_name:
				# Custom Role exists - sync roles from JSON
				custom_role_doc = frappe.get_doc("Custom Role", custom_role_name)
				existing_custom_roles = [r.role for r in custom_role_doc.roles]
				
				# Start with all roles from JSON (source of truth)
				final_roles = json_roles.copy()
				
				# Add "Marketing Head(new)" role if not already in JSON roles
				if role not in final_roles:
					final_roles.append(role)
				
				# Check if Custom Role needs to be updated
				roles_changed = set(existing_custom_roles) != set(final_roles)
				
				if roles_changed:
					# Clear existing roles and rebuild from final_roles
					custom_role_doc.set("roles", [])
					for role_name in final_roles:
						custom_role_doc.append("roles", {"role": role_name})
					
					custom_role_doc.save(ignore_permissions=True)
					synced_count += 1
			else:
				# No Custom Role exists - create one with all JSON roles + our role
				final_roles = json_roles.copy()
				
				# Add our role if not already present
				if role not in final_roles:
					final_roles.append(role)
				
				# Create Custom Role with all roles
				roles_list = [{"role": r} for r in final_roles]
				custom_role_doc = frappe.get_doc({
					"doctype": "Custom Role",
					"report": report_name,
					"roles": roles_list
				})
				custom_role_doc.insert(ignore_permissions=True)
				created_count += 1
		except Exception as e:
			error_count += 1
			frappe.logger().error(f"Error syncing report permission for {report_name}: {str(e)}")
	
	# Commit all changes
	frappe.db.commit()
	
	# Clear cache
	frappe.clear_cache()
	frappe.cache().delete_value("has_role:Report", user=frappe.session.user)
	
	return {
		"status": "success",
		"synced": synced_count,
		"created": created_count,
		"errors": error_count,
		"total_reports": len(reports),
		"message": f"Synced {synced_count} reports, created {created_count} new Custom Role records, {error_count} errors"
	}


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_all_centres(doctype, txt, searchfield, start, page_len, filters):
	"""Custom query to get all centres without limit - returns tuples like (name, city)"""
	# Use a very high limit to ensure all centres are returned
	limit = max(page_len or 10, 10000)
	
	# Handle empty search term - show all centres
	if not txt or txt.strip() == '':
		return frappe.db.sql("""
			SELECT name, COALESCE(city, name) as city
			FROM `tabCenter`
			ORDER BY city ASC
			LIMIT %(limit)s
		""", {
			'limit': limit
		})
	
	# Handle search term
	return frappe.db.sql("""
		SELECT name, COALESCE(city, name) as city
		FROM `tabCenter`
		WHERE name LIKE %(txt)s OR city LIKE %(txt)s
		ORDER BY city ASC
		LIMIT %(limit)s
	""", {
		'txt': f'%{txt}%',
		'limit': limit
	})


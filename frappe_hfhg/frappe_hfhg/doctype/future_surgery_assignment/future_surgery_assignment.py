# Copyright (c) 2024, redsoft and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class FutureSurgeryAssignment(Document):
	pass


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_all_users(doctype, txt, searchfield, start, page_len, filters):
	"""Custom query to get all users without limit - returns tuples like (name, full_name)"""
	# Use a very high limit to ensure all users are returned
	limit = max(page_len or 10, 10000)
	
	# Handle empty search term - show all users
	if not txt or txt.strip() == '':
		return frappe.db.sql("""
			SELECT name, COALESCE(full_name, name) as full_name
			FROM `tabUser`
			WHERE enabled = 1
				AND name != 'Guest'
			ORDER BY full_name ASC
			LIMIT %(limit)s
		""", {
			'limit': limit
		})
	
	# Handle search term
	return frappe.db.sql("""
		SELECT name, COALESCE(full_name, name) as full_name
		FROM `tabUser`
		WHERE enabled = 1
			AND name != 'Guest'
			AND (name LIKE %(txt)s OR full_name LIKE %(txt)s)
		ORDER BY full_name ASC
		LIMIT %(limit)s
	""", {
		'txt': f'%{txt}%',
		'limit': limit
	})


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_all_centers(doctype, txt, searchfield, start, page_len, filters):
	"""Custom query to get all centers without limit - returns tuples like (name, city)"""
	# Use a very high limit to ensure all centers are returned
	limit = max(page_len or 10, 10000)
	
	# Handle empty search term - show all centers
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


def get_future_surgery_permission_query_condition(user, doctype=None):
	"""Permission query condition to filter by assigned centres for Future Surgery role
	Users with Future Surgery role can only view followups from centers assigned to them
	in Future Surgery Assignment"""
	# Check if user has Future Surgery role
	user_roles = frappe.get_roles(user)
	if "Future Surgery" not in user_roles:
		# Not a Future Surgery user, return empty (no additional filtering)
		return ""
	
	# Check if user has Future Surgery Assignment
	assignment_exists = frappe.db.exists("Future Surgery Assignment", {"user": user})
	
	if not assignment_exists:
		# No assignment, return empty (user won't see any followups)
		return ""
	
	# Get the assignment document to fetch assigned centres
	try:
		assignment_doc = frappe.get_doc("Future Surgery Assignment", {"user": user})
		assigned_centers = [center.center for center in assignment_doc.centers]
		
		if not assigned_centers:
			# No centers assigned, return a condition that matches nothing
			return "1=0"
		
		# Return SQL condition to filter by assigned centres
		# Use proper SQL escaping to prevent injection
		# Handle both single and multiple centres
		if len(assigned_centers) == 1:
			# Escape the centre name
			escaped_center = frappe.db.escape(assigned_centers[0])
			return f"`tab{doctype}`.center = {escaped_center}"
		else:
			# Escape all centre names
			escaped_centers = [frappe.db.escape(center) for center in assigned_centers]
			centers_str = ", ".join(escaped_centers)
			return f"`tab{doctype}`.center IN ({centers_str})"
	except Exception as e:
		frappe.logger().error(f"Error in get_future_surgery_permission_query_condition: {str(e)}")
		return ""


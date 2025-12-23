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


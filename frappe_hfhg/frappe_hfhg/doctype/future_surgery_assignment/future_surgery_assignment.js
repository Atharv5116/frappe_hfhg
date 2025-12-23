// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.ui.form.on('Future Surgery Assignment', {
	refresh: function(frm) {
		// Ensure center field query is set up
		frm.set_query('center', 'centers', function() {
			return {
				query: 'frappe_hfhg.frappe_hfhg.doctype.future_surgery_assignment.future_surgery_assignment.get_all_centers'
			};
		});
		
		// Also configure all existing center fields in the grid
		if (frm.fields_dict.centers && frm.fields_dict.centers.grid) {
			frm.fields_dict.centers.grid.refresh();
			setTimeout(function() {
				frm.fields_dict.centers.grid.grid_rows.forEach(function(row) {
					let center_field = row.grid.get_field('center', row.doc.name);
					if (center_field && center_field.set_custom_query) {
						let original_set_custom_query = center_field.set_custom_query;
						center_field.set_custom_query = function(args) {
							if (original_set_custom_query) {
								original_set_custom_query.call(this, args);
							}
							args.page_length = 10000;
						};
					}
				});
			}, 200);
		}
	},
	
	user: function(frm) {
		// Optional: Add logic when user is selected
	},
	
	setup: function(frm) {
		// Configure User field to show all users using custom query
		frm.set_query('user', function() {
			return {
				query: 'frappe_hfhg.frappe_hfhg.doctype.future_surgery_assignment.future_surgery_assignment.get_all_users'
			};
		});
		
		// Configure Center field in the table to show all centers using custom query
		frm.set_query('center', 'centers', function() {
			return {
				query: 'frappe_hfhg.frappe_hfhg.doctype.future_surgery_assignment.future_surgery_assignment.get_all_centers'
			};
		});
		
		// Override page_length on the field control for autocomplete
		setTimeout(function() {
			let user_field = frm.fields_dict.user;
			if (user_field) {
				// Override set_custom_query to set high page_length
				if (user_field.set_custom_query) {
					let original_set_custom_query = user_field.set_custom_query;
					user_field.set_custom_query = function(args) {
						if (original_set_custom_query) {
							original_set_custom_query.call(this, args);
						}
						args.page_length = 10000;  // Set very high limit for all users
					};
				}
				
				// Also override the input event handler
				if (user_field.$input) {
					user_field.$input.off('input').on('input', frappe.utils.debounce(function(e) {
						var doctype = user_field.get_options();
						if (!doctype) return;
						
						var term = e.target.value;
						var args = {
							txt: term,
							doctype: doctype,
							page_length: 10000  // High limit
						};
						
						user_field.set_custom_query(args);
						
						frappe.call({
							type: "POST",
							method: "frappe.desk.search.search_link",
							no_spinner: true,
							args: args,
							callback: function(r) {
								if (r.message) {
									user_field.awesomplete.list = r.message;
								}
							}
						});
					}, 300));
				}
			}
		}, 200);
	},
	
	centers_add: function(frm, cdt, cdn) {
		// When a new row is added, configure the center field
		setTimeout(function() {
			let grid = frm.fields_dict.centers.grid;
			let row = grid.get_row(cdn);
			if (row) {
				let center_field = row.grid.get_field('center', cdn);
				if (center_field) {
					// Override set_custom_query for this field
					if (center_field.set_custom_query) {
						let original_set_custom_query = center_field.set_custom_query;
						center_field.set_custom_query = function(args) {
							if (original_set_custom_query) {
								original_set_custom_query.call(this, args);
							}
							args.page_length = 10000;  // Set very high limit for all centers
						};
					}
					
					// Override the get_query method to ensure custom query is used
					if (center_field.df) {
						center_field.df.get_query = function() {
							return {
								query: 'frappe_hfhg.frappe_hfhg.doctype.future_surgery_assignment.future_surgery_assignment.get_all_centers'
							};
						};
					}
					
					// Also override the input handler to use custom query directly
					if (center_field.$input) {
						center_field.$input.off('input').on('input', frappe.utils.debounce(function(e) {
							var doctype = center_field.get_options();
							if (!doctype) return;
							
							var term = e.target.value || '';
							frappe.call({
								type: "POST",
								method: "frappe_hfhg.frappe_hfhg.doctype.future_surgery_assignment.future_surgery_assignment.get_all_centers",
								args: {
									doctype: doctype,
									txt: term,
									searchfield: 'name',
									start: 0,
									page_len: 10000,
									filters: {}
								},
								no_spinner: true,
								callback: function(r) {
									if (r.message && center_field.awesomplete) {
										// Convert tuples to format awesomplete expects
										var list = r.message.map(function(item) {
											return {
												value: item[0],
												label: item[1] || item[0]
											};
										});
										center_field.awesomplete.list = list;
									}
								}
							});
						}, 300));
					}
				}
			}
		}, 150);
	}
});


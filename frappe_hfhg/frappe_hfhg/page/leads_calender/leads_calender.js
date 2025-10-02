frappe.pages['leads-calender'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Leads Calender',
		single_column: true
	});
}
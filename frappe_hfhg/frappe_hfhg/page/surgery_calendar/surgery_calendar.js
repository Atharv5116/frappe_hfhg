frappe.pages['surgery-calendar'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Surgery Calendar',
		single_column: true
	});
}
frappe.pages["surgery-calendar"].on_page_show = function (wrapper) {
	if (!has_surgery_calendar_access()) {
		frappe.msgprint(__("You don't have permission to access Surgery Calendar."));
		frappe.set_route("Workspaces");
		return;
	}
	load_surgery_ui(wrapper);
  };

  function has_surgery_calendar_access() {
	const allowed_roles = ["Administrator", "HOD"];
	return allowed_roles.some((role) => (frappe.user_roles || []).includes(role));
  }
  
  function load_surgery_ui(wrapper) {
	let $parent = $(wrapper).find(".layout-main-section");
	$parent.empty();
  
	frappe.require("surgery_ui.bundle.jsx").then(() => {
	  new surgery.ui.SurgeryUI({
		wrapper: $parent,
		page: wrapper.page,
	  });
	});
  }
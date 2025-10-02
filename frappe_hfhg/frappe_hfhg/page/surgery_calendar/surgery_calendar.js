frappe.pages['surgery-calendar'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Surgery Calendar',
		single_column: true
	});
}
frappe.pages["surgery-calendar"].on_page_show = function (wrapper) {
	load_surgery_ui(wrapper);
  };
  
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
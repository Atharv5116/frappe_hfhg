frappe.pages['treatment-calendar'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Treatment Calendar',
		single_column: true
	});
}

frappe.pages["treatment-calendar"].on_page_show = function (wrapper) {
	load_treatment_ui(wrapper);
  };
  
  function load_treatment_ui(wrapper) {
	let $parent = $(wrapper).find(".layout-main-section");
	$parent.empty();
  
	frappe.require("treatment_ui.bundle.jsx").then(() => {
	  new treatment.ui.TreatmentUI({
		wrapper: $parent,
		page: wrapper.page,
	  });
	});
  }
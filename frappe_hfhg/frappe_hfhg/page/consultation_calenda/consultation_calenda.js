frappe.pages['consultation-calenda'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Consultation Calendar',
		single_column: true
	});
}

frappe.pages["consultation-calenda"].on_page_show = function (wrapper) {
	load_consultation_ui(wrapper);
  };
  
  function load_consultation_ui(wrapper) {
	let $parent = $(wrapper).find(".layout-main-section");
	$parent.empty();
  
	frappe.require("consultation_ui.bundle.jsx").then(() => {
	  new consultation.ui.ConsultationUI({
		wrapper: $parent,
		page: wrapper.page,
	  });
	});
  }
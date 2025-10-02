frappe.pages['appointment-calendar'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Appointment Calendar',
		single_column: true
	});
}	
frappe.pages["appointment-calendar"].on_page_show = function (wrapper) {
	load_appointment_ui(wrapper);
  };
  
  function load_appointment_ui(wrapper) {
	let $parent = $(wrapper).find(".layout-main-section");
	$parent.empty();
  
	frappe.require("appointment_ui.bundle.jsx").then(() => {
	  new appointment.ui.AppointmentUI({
		wrapper: $parent,
		page: wrapper.page,
	  });
	});
  }
// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Master Booking Report"] = {
	onload: async function (report) {
	  frappe.call({
		method: "frappe_hfhg.api.get_user_role",
		callback: function (r) {
		  if (r.message) {
			if (r.message.role === "Executive") {
			  let executive_filter = report.get_filter("executive");
			  report.set_filter_value("executive", r.message.executive);
			  executive_filter.df.read_only = 1;
			  report.refresh();
			  executive_filter.refresh();
			} else if (r.message.role === "Receptionist") {
			  let center_filter = report.get_filter("center");
			  report.set_filter_value("center", r.message.center);
			  center_filter.df.read_only = 1;
			  center_filter.refresh();
			  report.refresh();
			}
		  }
		},
	  });
  
	  setTimeout(() => {
		let style = document.createElement("style");
		style.innerHTML = `
			/* Sticky First Column (Column 0 - TD) */
			.dt-cell--col-0 {
				position: sticky !important;
				left: 0;
				background: white !important;
				z-index: 2;
				box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
			}
	
			/* Sticky Second Column (Column 1 - TD) */
			.dt-cell--col-1 {
				position: sticky !important;
				left: 42px; /* Adjust based on column width */
				background: white !important;
				z-index: 2;
				box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
			}
	
		`;
		document.head.appendChild(style);
	  }, 1000);
  
	  updateTotalAmount(report);
  
	  report.filters.forEach(function (filter) {
		let original_on_change = filter.df.onchange;
		filter.df.onchange = function () {
		  if (original_on_change) {
			original_on_change.apply(this, arguments);
		  }
		  updateTotalAmount(report);
		};
	  });
	  $(document).on("change", ".dt-filter.dt-input", function () {
		updateTotalAmount(report);
	  });
	},
	refresh: function (report) {
	  updateTotalAmount(report);
	  frappe.call({
		method: "frappe_hfhg.api.get_user_role",
		callback: function (r) {
		  if (r.message) {
			if (r.message.role === "Executive") {
			  let executive_filter = report.get_filter("executive");
			  report.set_filter_value("executive", r.message.executive);
			  executive_filter.df.read_only = 1;
			  report.refresh();
			  executive_filter.refresh();
			} else if (r.message.role === "Receptionist") {
			  let center_filter = report.get_filter("center");
			  report.set_filter_value("center", r.message.center);
			  center_filter.df.read_only = 1;
			  center_filter.refresh();
			  report.refresh();
			}
		  }
		},
	  });
	},
	filters: [
	  {
		fieldname: "from_date",
		label: __("From Date"),
		fieldtype: "Date",
		reqd: 1,
		default: new Date(new Date().setMonth(new Date().getMonth() - 1)),
	  },
	  {
		fieldname: "to_date",
		label: __("To Date"),
		fieldtype: "Date",
		reqd: 1,
		default: new Date(),
	  },
	  {
		fieldname: "center",
		label: __("Center"),
		fieldtype: "Link",
		options: "Center",
	  },
	  {
		fieldname: "source",
		label: __("Source"),
		fieldtype: "Select",
		options: [
		  "",
		  "Website",
		  "Website Form",
		  "Google Adword",
		  "Google GMB",
		  "Facebook",
		  "Instagram",
		  "Hoarding",
		  "References",
		  "Youtube",
		  "Youtuber",
		  "Quora",
		  "Pinterest",
		  "Twitter",
		  "Just dial",
		  "Imported Data",
		],
	  },
	  {
		fieldname: "subsource",
		label: __("Sub Source"),
		fieldtype: "Select",
		options: ["", "Facebook", "Instagram"],
	  },
	  {
		fieldname: "lead_status",
		label: __("Lead Status"),
		fieldtype: "Select",
		options: [
		  "",
		  "New Lead",
		  "Duplicate Lead",
		  "Fake Lead",
		  "Invalid Number",
		  "Not Connected",
		  "Not Interested",
		  "Callback",
		  "Connected",
		  "CS Followup",
		  "CS Lined Up",
		  "HT CS Done",
		  "Budget Issue",
		  "Costing Done",
		  "Hairfall PT",
		  "Medi/PRP",
		  "Booked",
		  "Date Given",
		  "HT Postpone",
		  "BHT Followup",
		  "HT Done",
		  "HT Not Possible",
		  "Alopecia Case",
		  "Loan/EMI",
		  "Beard HT",
		  "2nd session",
		  "HT Prospect",
		  "Medi/PRP FUP",
		  "HT Done FUP",
		  "Booked FUP",
		  "Appointment Fix FUP",
		  "Clinic Visit FUP",
		],
	  },
	  {
		fieldname: "active_inactive_status",
		label: __("Active / Inactive Status"),
		fieldtype: "Select",
		options: ["", "Active", "Inactive"],
	  },
	  {
		fieldname: "executive",
		label: __("Executive"),
		fieldtype: "Link",
		options: "Executive",
	  },
	  {
		fieldname: "lead_mode",
		label: __("Lead Mode"),
		fieldtype: "Select",
		options: ["", "Call", "Whatsapp","Walkin","Workflow","Afzal"],
	  },
	  {
		fieldname: "cs_status",
		label: __("CS Status"),
		fieldtype: "Select",
		options: [
		  "",
		  "Booked",
		  "Non Booked",
		  "Medi-PRP",
		  "Spot Booking",
		  "Scheduled",
		  "Not Visited",
		  "Rescheduled"
		],
	  },
	  {
		fieldname: "surgery_status",
		label: __("Surgery Status"),
		fieldtype: "Select",
		options: ["", "Booked", "Partially Completed", "Completed", "Cancelled"],
	  },
	],
  };
  
  const updateTotalAmount = function (report) {
	frappe.call({
	  method:
		"frappe_hfhg.frappe_hfhg.report.master_booking_report.master_booking_report.execute",
	  args: {
		filters: report.get_values(),
	  },
	  callback: function (r) {
		if (r.message) {
		  let total_amount = r.message[2].total_amount;
		  let total_booking_amount = r.message[2].total_booking_amount;
		  let booking_count = r.message[2].booking_count;
		  report.page.wrapper.find(".total-amount-header").remove();
		  report.page.wrapper.find(".booking-count-header").remove();
  
		  let header_html = `<h5 class="total-amount-header" style="margin-left: 20px; display: flex; align-items: center;">Total Package: ${total_amount}</h5>
		  <h5 class="total-amount-header" style="margin-left: 20px; display: flex; align-items: center;">Total Booking Amount: ${total_booking_amount}</h5>
		   <h5 class="booking-count-header" style="margin-left: 20px; display: flex; align-items: center;">
					  Booking Count: ${booking_count}
				  </h5>
		  `;
  
		  let filter_section = report.page.wrapper.find(".page-form");
		  if (filter_section.length) {
			filter_section.css("display", "flex");
			filter_section.css("align-items", "center");
			filter_section.append(header_html);
		  }
		}
	  },
	});
  
	$(document).ready(function () {
	  const breadcrumbContainer = $("#navbar-breadcrumbs");
	  const breadcrumbExists =
		breadcrumbContainer.find('a[href="/app/costing/view/list"]').length > 0;
  
	  if (breadcrumbContainer.length && !breadcrumbExists) {
		const newBreadcrumb = $(
		  '<li><a href="/app/costing/view/list">Booking</a></li>'
		);
  
		breadcrumbContainer.append(newBreadcrumb);
	  }
	});
	report.refresh();
  };
  
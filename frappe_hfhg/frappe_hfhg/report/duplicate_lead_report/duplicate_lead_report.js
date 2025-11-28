// Copyright (c) 2025, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Duplicate Lead Report"] = {
	onload: async function (report) {
		updateLeadCount(report);
		report.filters.forEach(function (filter) {
		  let original_on_change = filter.df.onchange;
		  filter.df.onchange = function () {
			if (original_on_change) {
			  original_on_change.apply(this, arguments);
			}
			updateLeadCount(report);
		  };
		});
	},
	refresh: function (report) {
		updateLeadCount(report);
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
			fieldname: "active_inactive_status",
			label: __("Active / Inactive Status"),
			fieldtype: "Select",
			options: ["", "Active", "Inactive"],
		  },

	]
};

const updateLeadCount = function (report) {
	frappe.call({
	  method: "frappe_hfhg.frappe_hfhg.report.duplicate_lead_report.duplicate_lead_report.execute",
	  args: {
		filters: report.get_values(),
	  },
	  callback: function (r) {
		if (r.message) {
		  let lead_count = r.message[2].lead_count;
  
		  report.page.wrapper.find(".total-amount-header").remove();
  
		  let header_html = `<h5 class="total-amount-header" style="margin-left: 20px; display: flex; align-items: center;">Duplicate Lead Count: ${lead_count}</h5>`;
  
		  let filter_section = report.page.wrapper.find(".page-form");
		  if (filter_section.length) {
			filter_section.css("display", "flex");
			filter_section.css("align-items", "center");
			filter_section.append(header_html);
		  }
		}
	  },
	});
}

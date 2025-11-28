// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Master Surgery Report"] = {
	onload: async function (report) {
	  frappe.call({
		method: "frappe_hfhg.api.get_user_role",
		callback: function (r) {
		  if (r.message) {
			if (r.message.role === "Executive") {
			  let executive_filter = report.get_filter("executive");
			  report.set_filter_value("executive", r.message.executive);
  
			  report.refresh();
			  executive_filter.refresh();
			} else if (r.message.role === "Receptionist") {
			  let center_filter = report.get_filter("center");
			  report.set_filter_value("center", r.message.center);
  
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
				left: 33px; /* Adjust based on column width */
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
  
	  $(document).ready(function () {
		const breadcrumbContainer = $("#navbar-breadcrumbs");
		const breadcrumbExists =
		  breadcrumbContainer.find('a[href="/app/surgery/view/list"]').length > 0;
  
		if (breadcrumbContainer.length && !breadcrumbExists) {
		  const newBreadcrumb = $(
			'<li><a href="/app/surgery/view/list">Surgery</a></li>'
		  );
  
		  breadcrumbContainer.append(newBreadcrumb);
		}
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
  
			  report.refresh();
			  executive_filter.refresh();
			} else if (r.message.role === "Receptionist") {
			  let center_filter = report.get_filter("center");
			  report.set_filter_value("center", r.message.center);
  
			  center_filter.refresh();
			  report.refresh();
			}
		  }
		},
	  });
	},
formatter: function(value, row, column, data, default_formatter) {
    // default formatting
    let out = default_formatter(value, row, column, data);

    // Highlight entire row green if payment_confirmation is "Received"
    if (data && data.payment_confirmation === "Received") {
        // Wrap the cell content with green background
        out = '<div style="background-color: #d4edda; padding: 4px;">' + out + '</div>';
    }

    // only for payment_confirmation column
    if (column && column.fieldname === "payment_confirmation") {
        // skip for total / summary rows (they don't have patient_doc)
        if (!data || !data.patient_docname) {
            return out;  // just render as plain text
        }

        // current value: "Received", "Not Received", "Partial Received" or empty
        const current = value || "";

        // patient docname we added in Python
        const patient_doc = frappe.utils.escape_html(data.patient_docname);

        // Check user roles - only System Manager and Accountant can edit
        let user_roles = [];
        let can_edit = false;
        try {
            user_roles = frappe.user_roles || [];
            can_edit = user_roles.includes("System Manager") || user_roles.includes("Accountant");
            console.log("User roles:", user_roles, "Can edit:", can_edit, "Current status:", current);
        } catch (e) {
            console.warn("Could not access user roles:", e);
        }
        
        // If status is "Received", make it read-only for everyone (no exceptions)
        // Otherwise, only System Manager and Accountant can edit
        const is_readonly = (current === "Received") || !can_edit;
        console.log("Is readonly:", is_readonly);

        if (is_readonly) {
            // Show as read-only text
            return `<span class="payment-confirm-readonly" style="padding: 4px 8px; border: 1px solid #ddd; border-radius: 3px; background-color: #f9f9f9; color: #666;">
                ${current || "-- Select --"}
            </span>`;
        } else {
            // Show as editable dropdown
            return `
                <select class="payment-confirm-select" data-patient-doc="${patient_doc}">
                    <option value="">-- Select --</option>
                    <option value="Received" ${current === "Received" ? "selected" : ""}>Received</option>
                    <option value="Not Received" ${current === "Not Received" ? "selected" : ""}>Not Received</option>
                    <option value="Partial Received" ${current === "Partial Received" ? "selected" : ""}>Partial Received</option>
                </select>
            `;
        }
    }

    return out;
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
		fieldname: "technique",
		label: __("Technique"),
		fieldtype: "Select",
		options: ["", "FUE", "B-FUE", "I-FUE", "Big-FUE", "DHI"],
	  },
	  {
		fieldname: "status",
		label: __("Surgery Status"),
		fieldtype: "Select",
		options: ["", "Booked", "Partially Completed", "Completed", "Cancelled"],
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
		fieldname: "executive",
		label: __("Executive"),
		fieldtype: "Link",
		options: "Executive",
	  },
	  {
		fieldname: "mode",
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
		fieldname: "payment_confirmation",
		label: __("Payment Confirmation"),
		fieldtype: "Select",
		options: [
		  "",
		  "Received",
		  "Not Received",
		  "Partial Received",
		],
	  },
	],
  };
// delegated handler for select change
$(document).on("change", ".payment-confirm-select", function() {
    const $sel = $(this);
    const status = $sel.val();
    const patient_doc = $sel.data("patient-doc"); // this should be the Surgery docname

    if (!patient_doc) {
        frappe.msgprint("Missing surgery reference for this row.");
        return;
    }
    if (!status) {
        // user cleared selection; ignore or handle as needed
        return;
    }

    // disable while updating
    $sel.prop("disabled", true);

    // call server method
    frappe.call({
        method: "frappe_hfhg.api.update_payment_confirmation_by_surgery",
        args: {
            surgery_name: patient_doc,  // ✅ use surgery_name, not patient_docname
            status: status
        },
        callback: function(r) {
            if (r && r.message && r.message.success) {
                frappe.show_alert({ message: r.message.msg, indicator: "green" });
                
                // If Payment Confirmation status is "Received", make it read-only immediately
                if (status === "Received") {
                    // Get the row reference BEFORE replacing the dropdown
                    const $row = $sel.closest('tr');
                    console.log("Row found:", $row.length);
                    
                    // Replace the dropdown with read-only text
                    $sel.replaceWith(`
                        <span class="payment-confirm-readonly" style="padding: 4px 8px; border: 1px solid #ddd; border-radius: 3px; background-color: #f9f9f9; color: #666;">
                            Received
                        </span>
                    `);
                    
                    // Change row color to green immediately
                    if ($row.length) {
                        console.log("Changing row background to green...");
                        
                        // Find all cells in this row
                        $row.find('td').each(function() {
                            const $cell = $(this);
                            
                            // Check if cell already has a green div from formatter
                            const $greenDiv = $cell.find('div[style*="background-color: #d4edda"]');
                            
                            if ($greenDiv.length === 0) {
                                // No green div yet, wrap the content
                                const cellContent = $cell.html();
                                $cell.html('<div style="background-color: #d4edda; padding: 4px;">' + cellContent + '</div>');
                            }
                            // If already has green div, do nothing (already green from formatter)
                        });
                        
                        console.log("Row turned green instantly!");
                    }
                } else {
                    // Re-enable the dropdown for other statuses
                    $sel.prop("disabled", false);
                }
            } else {
                const msg = r && r.message && r.message.msg ? r.message.msg : "Failed to update payment";
                frappe.msgprint(msg);
                $sel.prop("disabled", false);
            }
        },
        error: function(err) {
            frappe.msgprint("Server error while updating payment confirmation.");
            console.error(err);
            $sel.prop("disabled", false);
        }
    });
});


  
  const updateTotalAmount = function (report) {
	frappe.call({
	  method:
		"frappe_hfhg.frappe_hfhg.report.master_surgery_report.master_surgery_report.execute",
	  args: {
		filters: report.get_values(),
	  },
	  callback: function (r) {
		if (r.message) {
		  let total_amount = r.message[2].total_amount;
		  let total_inflow = r.message[3].total_inflow;
		  let surgery_count = r.message[3].surgery_count;
		  report.page.wrapper.find(".total-amount-header").remove();
  
		  let header_html = `<h5 class="total-amount-header" style="margin-left: 20px; display: flex; align-items: center;">Total Package: ${total_amount}</h5><h5 class="total-amount-header" style="margin-left: 20px; display: flex; align-items: center;">Total Inflow: ${total_inflow}</h5><h5 class="total-amount-header" style="margin-left: 20px; display: flex; align-items: center;">Surgery Count: ${surgery_count}</h5>`;
  
		  let filter_section = report.page.wrapper.find(".page-form");
		  if (filter_section.length) {
			filter_section.css("display", "flex");
			filter_section.css("align-items", "center");
			filter_section.append(header_html);
		  }
		}
	  },
	});
	report.refresh();
  };
  
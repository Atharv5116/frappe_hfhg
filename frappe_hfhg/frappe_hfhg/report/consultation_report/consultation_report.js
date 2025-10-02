// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Consultation Report"] = {
  onload: async function (report) {
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

    $(document).on("change", ".dt-filter.dt-input", function () {
      updateTotalAmount(report);
    });
  },
  refresh: function (report) {
    updateTotalAmount(report);
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
      fieldname: "cs_status",
      label: __("CS Status"),
      fieldtype: "Select",
      options: [
        "",
        "Booked",
        "Non Booked",
        "Medi-PRP",
        "Spot Booking"   
      ],
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
      fieldname: "apnt_mode",
      label: __("CS Mode"),
      fieldtype: "Select",
      options: ["", "In-Person", "Call"],
    },
    {
      fieldname: "executive",
      label: __("Executive"),
      fieldtype: "Link",
      options: "Executive",
    },
    {
      fieldname: "have_costing",
      label: __("Have Costing"),
      fieldtype: "Select",
      options: ["", "Yes", "No"],
    },
    {
      fieldname: "have_surgery",
      label: __("Have Surgery"),
      fieldtype: "Select",
      options: ["", "Yes", "No"],
    },
    {
      fieldname: "mode",
      label: __("Lead Mode"),
      fieldtype: "Select",
      options: ["", "Call", "Whatsapp","Walkin","Workflow","Afzal"],
    },
    {
      fieldname: "handle_by",
      label: __("Handle by"),
      fieldtype: "Data"
    },
    {
      fieldname: "surgery_status",
      label: __("Surgery Status"),
      fieldtype: "Select",
      options: ["", "Booked", "Partially Completed", "Completed", "Cancelled"],
    },
    {
      fieldname: "profession",
      label: __("Profession"),
      fieldtype: "Data"
    },
  ],
};

const updateTotalAmount = function (report) {
  frappe.call({
    method:
      "frappe_hfhg.frappe_hfhg.report.consultation_report.consultation_report.execute",
    args: {
      filters: report.get_values(),
    },
    callback: function (r) {
      if (r.message) {
        let consultation_count = r.message[2].consultation_count;

        report.page.wrapper.find(".total-amount-header").remove();

        let header_html = `<h5 class="total-amount-header" style="margin-left: 20px; display: flex; align-items: center;">Consultation Count: ${consultation_count}</h5>
         
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
      breadcrumbContainer.find('a[href="/app/consultation/view/list"]').length >
      0;

    if (breadcrumbContainer.length && !breadcrumbExists) {
      const newBreadcrumb = $(
        '<li><a href="/app/consultation/view/list">Consultation</a></li>'
      );

      breadcrumbContainer.append(newBreadcrumb);
    }
  });
  report.refresh();
};

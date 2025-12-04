// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Reference Report"] = {
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
      fieldname: "reference_name",
      label: __("Reference Name"),
      fieldtype: "Data",
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
      fieldname: "executive",
      label: __("Executive"),
      fieldtype: "Link",
      options: "Executive",
    },
    {
      fieldname: "mode",
      label: __("Mode"),
      fieldtype: "Select",
      options: [
        "",
        "Call",
        "Whatsapp",
        "Walkin",
        "Workflow",
        "Afzal"
      ]
    },
    {
      fieldname: "status",
      label: __("Status"),
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
      fieldname: "contact_number",
      label: __("Contact Number"),
      fieldtype: "Data",
    },
    {
      fieldname: "patient",
      label: __("Patient"),
      fieldtype: "Link",
      options: "Lead",
    },
  ],
};

const updateTotalAmount = function (report) {
  frappe.call({
    method:
      "frappe_hfhg.frappe_hfhg.report.reference_report.reference_report.execute",
    args: {
      filters: report.get_values(),
    },
    callback: function (r) {
      if (r.message) {
        let reference_count = r.message[2].reference_count;

        report.page.wrapper.find(".total-amount-header").remove();

        let header_html = `<h5 class="total-amount-header" style="margin-left: 20px; display: flex; align-items: center;">Reference Count: ${reference_count}</h5>
         
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
      breadcrumbContainer.find('a[href="/app/lead/view/list"]').length > 0;

    if (breadcrumbContainer.length && !breadcrumbExists) {
      const newBreadcrumb = $(
        '<li><a href="/app/lead/view/list">Lead</a></li>'
      );

      breadcrumbContainer.append(newBreadcrumb);
    }
  });
  report.refresh();
};

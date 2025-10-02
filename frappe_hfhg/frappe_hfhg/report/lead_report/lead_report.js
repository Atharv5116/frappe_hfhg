// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Lead Report"] = {
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
      updateLeadCount(report);
    });
    frappe.call({
      method: "frappe_hfhg.api.get_ad_names",
      callback: function (response) {
        if (response.message) {
          let ad_names = response.message;

          let $input = $(`.frappe-control[data-fieldname="ad_name"] input`);

          if ($input.length) {
            $input.attr("placeholder", "Ad Name");
            $input.attr("autocomplete", "off");

            new Awesomplete($input[0], {
              list: ad_names,
              minChars: 1,
              autoFirst: true,
            });

            $input.on("input", function () {
              let search_term = $(this).val().toLowerCase();
              let filtered_options = ad_names.filter(name =>
                name.toLowerCase().includes(search_term)
              );

              this.awesomplete.list = filtered_options;
            });
          }
        }
      },
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
      fieldname: "center",
      label: __("Center"),
      fieldtype: "Link",
      options: "Center",
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
      fieldname: "mode",
      label: __("Lead mode"),
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
      fieldname: "executive",
      label: __("Executive"),
      fieldtype: "Link",
      options: "Executive",
    },
    {
      fieldname: "assign_by",
      label: __("Assign By"),
      fieldtype: "Link",
      options: "User",
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
      fieldname: "have_consultation",
      label: __("Have Consultation"),
      fieldtype: "Select",
      options: ["", "Yes", "No"],
    },
    {
      fieldname: "source_reference",
      label: __("Reference name"),
      fieldtype: "Data",
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
    {
      fieldname: "ad_name",
      label: __("Ad Name"),
      fieldtype: "Data",
      
    },
  ],
};

const updateLeadCount = function (report) {
  frappe.call({
    method: "frappe_hfhg.frappe_hfhg.report.lead_report.lead_report.execute",
    args: {
      filters: report.get_values(),
    },
    callback: function (r) {
      if (r.message) {
        let lead_count = r.message[2].lead_count;

        report.page.wrapper.find(".total-amount-header").remove();

        let header_html = `<h5 class="total-amount-header" style="margin-left: 20px; display: flex; align-items: center;">Lead Count: ${lead_count}</h5>`;

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

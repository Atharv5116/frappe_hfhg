// Copyright (c) 2025, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Master Reminder Report"] = {
  onload: async function (report) {
    let roles = await frappe.call({
      method: "frappe.client.get_value",
      args: {
        doctype: "User",
        filters: { name: frappe.session.user },
        fieldname: "roles",
      },
    });
    if (roles.message) {
      let user_roles = await frappe.user_roles;
      if (
        user_roles.includes("Executive") &&
        !user_roles.includes("Marketing Head")
      ) {
        frappe.query_report.set_filter_value({
          executive: frappe.session.user_fullname,
        });

        let executive_filter = report.get_filter("executive");
        executive_filter.df.read_only = 1;
        report.refresh();
        executive_filter.refresh();
      }
    }
    updateReminderCount(report);
    report.filters.forEach(function (filter) {
      let original_on_change = filter.df.onchange;
      filter.df.onchange = function () {
        if (original_on_change) {
          original_on_change.apply(this, arguments);
        }
        updateReminderCount(report);
      };
    });
    $(document).on("change", ".dt-filter.dt-input", function () {
      updateReminderCount(report);
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") {
        updateReminderCount(report);
        report.build_report();
      }
    });
  },
  refresh: function (report) {
    updateReminderCount(report);
  },
  filters: [
    {
      fieldname: "from_date",
      label: __("From Date"),
      fieldtype: "Date",
      reqd: 1,
      default: new Date(),
    },
    {
      fieldname: "to_date",
      label: __("To Date"),
      fieldtype: "Date",
      reqd: 1,
      default: new Date(),
    },
    {
      fieldname: "executive",
      label: __("Executive"),
      fieldtype: "Link",
      options: "Executive",
    },
    {
      fieldname: "status",
      label: __("Status"),
      fieldtype: "Select",
      options: "\nUpcoming\nMissed\nCompleted",
    },
    {
      fieldname: "lead_status",
      label: __("Lead Status"),
      fieldtype: "Select",
      options:
        "\nNew Lead\nDuplicate Lead\nFake Lead\nInvalid Number\nNot Connected\nNot Interested\nCallback\nConnected\nCS Followup\nCS Lined Up\nHT CS Done\nBudget Issue\nCosting Done\nHairfall PT\nMedi/PRP\nBooked\nDate Given\nHT Postpone\nBHT Followup\nHT Done\nHT Not Possible\nAlopecia Case\nLoan/EMI\nBeard HT\n2nd session\nHT Prospect\nMedi/PRP FUP\nHT Done FUP\nBooked FUP\nAppointment Fix FUP\nClinic Visit FUP",
    },
    {
      fieldname: "active_inactive_status",
      label: __("Active / Inactive Status"),
      fieldtype: "Select",
      options: ["", "Active", "Inactive"],
    },
    {
      fieldname: "center",
      label: __("Center"),
      fieldtype: "Link",
      options: "Center",
    },
    {
      fieldname: "lead_mode",
      label: __("Lead Mode"),
      fieldtype: "Select",
      options: "\nWorkflow\nWhatsapp\nAfzal\nCall\nWalkin",
    },
    {
      fieldname: "source",
      label: __("Source"),
      fieldtype: "Select",
      options:
        "\nWebsite\nWebsite Form\nGoogle Adword\nGoogle GMB\nFacebook\nInstagram\nHoarding\nReferences\nYoutube\nYoutuber\nQuora\nPinterest\nTwitter\nWalk In\nCall\nEmail\nJust dial\nImported Data",
    },
    {
      fieldname: "cs_date",
      label: __("Consultation Date"),
      fieldtype: "Date",
    },
    {
      fieldname: "cs_status",
      label: __("Consultation Status"),
      fieldtype: "Select",
      options:
        "\nScheduled\nBooked\nSpot Booking\nNon Booked\nMedi-PRP\nNot Visited\nRescheduled",
    },
    {
      fieldname: "surgery_status",
      label: __("Surgery Status"),
      fieldtype: "Select",
      options: "\nPartially Completed\nCompleted\nBooked\nCancelled",
    },
    {
      fieldname: "surgery_date",
      label: __("Surgery Date"),
      fieldtype: "Date",
    },
  ],
};

const updateReminderCount = function (report) {
  frappe.call({
    method:
      "frappe_hfhg.frappe_hfhg.report.master_reminder_report.master_reminder_report.execute",
    args: {
      filters: report.get_values(),
    },
    callback: function (r) {
      if (r.message) {
        let reminder_count = r.message[2].reminder_count;

        report.page.wrapper.find(".total-amount-header").remove();

        let header_html = `<h5 class="total-amount-header" style="margin-left: 20px; display: flex; align-items: center;">Reminder Count: ${reminder_count}</h5>`;

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

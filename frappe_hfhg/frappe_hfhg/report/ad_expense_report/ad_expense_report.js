// Copyright (c) 2025, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Ad Expense Report"] = {
  onload: async function (report) {
    setupShowDetailHandler(report);
    updateSummary(report);

    // Update summary when filters change
    report.filters.forEach(function (filter) {
      let original_on_change = filter.df.onchange;
      filter.df.onchange = function () {
        if (original_on_change) {
          original_on_change.apply(this, arguments);
        }
        updateSummary(report);
      };
    });
  },
  
  refresh: function (report) {
    setupShowDetailHandler(report);
    updateSummary(report);
  },
  formatter: function (value, row, column, data, default_formatter) {
    const formatted = default_formatter(value, row, column, data);
    if (column.fieldname !== "details_button") {
      return formatted;
    }

    if (!data || data.is_total_row || data.__is_total_row) {
      return "";
    }

    const encodedSource = encodeURIComponent(data.source || "");
    const encodedCampaign = encodeURIComponent(data.campaign_name || "");
    const encodedAdId = encodeURIComponent(data.ad_id || "");

    return `
      <button
        type="button"
        class="btn btn-xs btn-default ad-expense-show-detail"
        data-source="${encodedSource}"
        data-campaign-name="${encodedCampaign}"
        data-ad-id="${encodedAdId}"
      >
        ${__("Show Detail")}
      </button>
    `;
  },

  filters: [
    {
      fieldname: "from_date",
      label: __("From Date"),
      fieldtype: "Date",
      reqd: 1,
      default: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    },

    {
      fieldname: "to_date",
      label: __("To Date"),
      fieldtype: "Date",
      reqd: 1,
      default: new Date(), // Today
    },
    {
      fieldname: "campaign_name",
      label: __("Campaign Name"),
      fieldtype: "Data",
    },
    {
      fieldname: "source",
      label: __("Source"),
      fieldtype: "Select",
      options: ["", "Meta", "Google Adword"],
    },
    {
      fieldname: "ad_id",
      label: __("Ad ID"),
      fieldtype: "Data",
    },
  ],
};

const setupShowDetailHandler = function (report) {
  const wrapper = report.page.wrapper;
  wrapper.off("click.ad_expense_show_detail");
  wrapper.on("click.ad_expense_show_detail", ".ad-expense-show-detail", function () {
    const $button = $(this);
    const source = decodeURIComponent($button.attr("data-source") || "");
    const campaign_name = decodeURIComponent($button.attr("data-campaign-name") || "");
    const ad_id = decodeURIComponent($button.attr("data-ad-id") || "");

    frappe.call({
      method:
        "frappe_hfhg.frappe_hfhg.report.ad_expense_report.ad_expense_report.get_row_lifetime_details",
      args: { source, campaign_name, ad_id },
      freeze: true,
      freeze_message: __("Fetching details..."),
      callback: function (r) {
        const details = r.message || {};
        const lifetimeExpense = details.lifetime_expense || 0;
        const lifetimeRevenue = details.lifetime_revenue || 0;
        frappe.msgprint({
          title: __("Lifetime Details"),
          message: `
            <div>
              <p><strong>${__("Leads Generated")}:</strong> ${details.leads_created_lifetime || 0}</p>
              <p><strong>${__("Booking Count")}:</strong> ${details.costings_created_lifetime || 0}</p>
              <p><strong>${__("Surgery Count")}:</strong> ${details.surgeries_created_lifetime || 0}</p>
              <p><strong>${__("Lifetime Expense")}:</strong> ₹ ${frappe.format(lifetimeExpense, {fieldtype: 'Float', precision: 2})}</p>
              <p><strong>${__("Lifetime Revenue")}:</strong> ₹ ${frappe.format(lifetimeRevenue, {fieldtype: 'Float', precision: 2})}</p>
            </div>
          `,
          indicator: "blue",
        });
      },
    });
  });
};

const updateSummary = function (report) {
  frappe.call({
    method:
      "frappe_hfhg.frappe_hfhg.report.ad_expense_report.ad_expense_report.execute",
    args: {
      filters: report.get_values(),
    },
    callback: function (r) {
      if (r.message && r.message[1]) {
        let data = r.message[1];

        // Calculate totals
        let totalExpense = 0;
        let totalLeads = 0;
        let totalSurgeryRevenue = 0;

        data.forEach(function(row) {
          totalExpense += row.total_expense || 0;
          totalLeads += row.leads_in_period || 0;
          totalSurgeryRevenue += row.surgery_revenue || 0;
        });
        const avgCpl = totalLeads > 0 ? (totalExpense / totalLeads) : 0;

        // Remove existing summary
        report.page.wrapper.find(".campaign-roi-summary").remove();

        // Build summary HTML
        let summary_parts = [];

        summary_parts.push(`
          <h5 style="margin: 0;">
            <strong>${__("Rows")}:</strong> ${data.length}
          </h5>
        `);

        summary_parts.push(`
          <h5 style="margin: 0; color: #d9534f;">
            <strong>${__("Total Expense")}:</strong> ₹ ${frappe.format(totalExpense, {fieldtype: 'Float', precision: 2})}
          </h5>
        `);

        summary_parts.push(`
          <h5 style="margin: 0; color: #0d6efd;">
            <strong>${__("Leads Generated")}:</strong> ${totalLeads}
          </h5>
        `);

        summary_parts.push(`
          <h5 style="margin: 0; color: #5cb85c;">
            <strong>${__("Surgery Revenue")}:</strong> ₹ ${frappe.format(totalSurgeryRevenue, {fieldtype: 'Float', precision: 2})}
          </h5>
        `);

        summary_parts.push(`
          <h5 style="margin: 0; color: #7952b3;">
            <strong>${__("Average CPL")}:</strong> ₹ ${frappe.format(avgCpl, {fieldtype: 'Float', precision: 2})}
          </h5>
        `);

        let summary_html = `
          <div class="campaign-roi-summary" style="margin-left: 20px; display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
            ${summary_parts.join('')}
          </div>
        `;
        
        // Append summary to filter section
        let filter_section = report.page.wrapper.find(".page-form");
        if (filter_section.length) {
          filter_section.css("display", "flex");
          filter_section.css("align-items", "center");
          filter_section.append(summary_html);
        }
      }
    },
  });
};
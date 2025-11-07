// Copyright (c) 2025, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Ad Expense Report"] = {
  onload: async function (report) {
    updateSummary(report);
    
    setupAdDetailsButton(report);
    
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
    updateSummary(report);
  },
  
  formatter: function (value, row, column, data, default_formatter) {
    if (column.fieldname === "details_button") {
      const adId = (data && data.ad_id) || "";
      const adLabel = (data && data.ad_display_name) || adId;
      const adIdAttr = frappe.utils.escape_html(adId || "");
      const adLabelAttr = frappe.utils.escape_html(adLabel || "");
      return `
        <button type="button" class="btn btn-xs btn-primary ad-details-btn" data-ad-id="${adIdAttr}" data-ad-label="${adLabelAttr}">
          ${__("Details")}
        </button>
      `;
    }
    return default_formatter(value, row, column, data);
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
      fieldname: "ad_name",
      label: __("Ad Name"),
      fieldtype: "Data",
    },
  ],
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
        let total_expense = 0;
        let total_lifetime_revenue = 0;
        let total_period_revenue = 0;
        let total_profit = 0;
        
        data.forEach(function(row) {
          total_expense += row.total_expense || 0;
          total_lifetime_revenue += row.lifetime_revenue || 0;
          total_period_revenue += row.period_revenue || 0;
          total_profit += row.net_profit || 0;
        });
        
        let avg_roi = 0;
        if (total_expense > 0) {
          avg_roi = ((total_period_revenue - total_expense) / total_expense) * 100;
        }
        
        // Remove existing summary
        report.page.wrapper.find(".campaign-roi-summary").remove();
        
        // Build summary HTML
        let summary_parts = [];
        
        summary_parts.push(`
          <h5 style="margin: 0;">
            <strong>Ads:</strong> ${data.length}
          </h5>
        `);
        
        summary_parts.push(`
          <h5 style="margin: 0; color: #d9534f;">
            <strong>Total Expense:</strong> ₹ ${frappe.format(total_expense, {fieldtype: 'Float', precision: 2})}
          </h5>
        `);
        
        summary_parts.push(`
          <h5 style="margin: 0; color: #0d6efd;">
            <strong>Lifetime Revenue:</strong> ₹ ${frappe.format(total_lifetime_revenue, {fieldtype: 'Float', precision: 2})}
          </h5>
        `);
        
        summary_parts.push(`
          <h5 style="margin: 0; color: #5cb85c;">
            <strong>Period Revenue:</strong> ₹ ${frappe.format(total_period_revenue, {fieldtype: 'Float', precision: 2})}
          </h5>
        `);
        
        summary_parts.push(`
          <h5 style="margin: 0; color: ${total_profit >= 0 ? '#5cb85c' : '#d9534f'};">
            <strong>Net Profit:</strong> ₹ ${frappe.format(total_profit, {fieldtype: 'Float', precision: 2})}
          </h5>
        `);
        
        summary_parts.push(`
          <h5 style="margin: 0; color: ${avg_roi >= 0 ? '#5cb85c' : '#d9534f'};">
            <strong>Avg ROI:</strong> ${avg_roi.toFixed(2)}%
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
  
  report.refresh();
};

function setupAdDetailsButton(report) {
  report.page.wrapper.off("click", ".ad-details-btn");
  report.page.wrapper.on("click", ".ad-details-btn", function (event) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    const adId = button.getAttribute("data-ad-id");
    const adLabel = button.getAttribute("data-ad-label");
    
    if (!adId) {
      frappe.msgprint({
        title: __("Details"),
        message: __("Ad ID not found for this row."),
        indicator: "orange",
      });
      return;
    }
    
    // Get all-time data - no date filters applied
    frappe.call({
      method:
        "frappe_hfhg.frappe_hfhg.report.ad_expense_report.ad_expense_report.get_ad_activity_stats",
      args: {
        ad_id: adId,
      },
      freeze: true,
      freeze_message: __("Fetching ad details..."),
      callback: function (r) {
        if (!r.message) {
          frappe.msgprint({
            title: __("Details"),
            message: __("No data found."),
            indicator: "orange",
          });
          return;
        }
        
        const stats = r.message;
        const html = `
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div><strong>${__("Total Leads")}:</strong> ${stats.total_leads || 0}</div>
            <div><strong>${__("Costing Payments")}:</strong> ${stats.costing_payments || 0}</div>
            <div><strong>${__("Surgeries Created")}:</strong> ${stats.surgery_created || 0}</div>
            <div><strong>${__("Consultations Created")}:</strong> ${stats.consultation_created || 0}</div>
          </div>
          <div style="margin-top: 10px; font-size: 12px; color: #666;">
            ${__("All-time data (not filtered by date range)")}
          </div>
        `;
        
        frappe.msgprint({
          title: `${__("Ad Details")}: ${adLabel || adId}`,
          message: html,
          indicator: "blue",
        });
      },
      error: function (err) {
        frappe.msgprint({
          title: __("Details"),
          message: err.message || __("Failed to fetch ad details."),
          indicator: "red",
        });
      },
    });
  });
}

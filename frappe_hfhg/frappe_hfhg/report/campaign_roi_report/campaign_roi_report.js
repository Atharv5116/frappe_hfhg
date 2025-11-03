// Copyright (c) 2025, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Ad Expense Report"] = {
  onload: async function (report) {
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
    updateSummary(report);
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
      label: __("Ad Name "),
      fieldtype: "Data",
    },
    {
      fieldname: "source",
      label: __("Select Source Revenue"),
      fieldtype: "Link",
      options: "Source",
      get_query: function() {
        return {
          filters: {},
          page_length: 9999, // Show all sources
        };
      },
    },
  ],
};

const updateSummary = function (report) {
  frappe.call({
    method:
      "frappe_hfhg.frappe_hfhg.report.campaign_roi_report.campaign_roi_report.execute",
    args: {
      filters: report.get_values(),
    },
    callback: function (r) {
      if (r.message && r.message[1]) {
        let data = r.message[1];
        
        // Calculate totals
        let total_expense = 0;
        let total_source_revenue = 0;
        let total_lifetime_revenue = 0;
        let total_period_revenue = 0;
        let total_profit = 0;
        
        data.forEach(function(row) {
          total_expense += row.total_expense || 0;
          total_source_revenue += row.source_revenue || 0;
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
        
        // Show source revenue total if source filter is selected
        let filters = report.get_values();
        let selected_source = filters.source;
        if (selected_source && selected_source.trim()) {
          summary_parts.push(`
            <h5 style="margin: 0; color: #17a2b8;">
              <strong>${selected_source} Revenue:</strong> ₹ ${frappe.format(total_source_revenue, {fieldtype: 'Float', precision: 2})}
            </h5>
          `);
        }
        
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

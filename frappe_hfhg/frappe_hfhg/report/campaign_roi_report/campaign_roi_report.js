// Copyright (c) 2025, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Campaign ROI Report"] = {
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
      fieldname: "campaign_name",
      label: __("Campaign Name"),
      fieldtype: "Data",
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
        let total_income = 0;
        let total_profit = 0;
        let total_source_income = 0;
        
        data.forEach(function(row) {
          total_expense += row.total_expense || 0;
          total_income += row.total_income || 0;
          total_profit += row.net_profit || 0;
          if (row.source_income !== undefined) {
            total_source_income += row.source_income || 0;
          }
        });
        
        let avg_roi = 0;
        if (total_expense > 0) {
          avg_roi = ((total_income - total_expense) / total_expense) * 100;
        }
        
        // Remove existing summary
        report.page.wrapper.find(".campaign-roi-summary").remove();
        
        // Get filter values
        let filters = report.get_values();
        let source = filters.source;
        
        // Build summary HTML
        let summary_parts = [];
        
        summary_parts.push(`
          <h5 style="margin: 0;">
            <strong>Campaigns:</strong> ${data.length}
          </h5>
        `);
        
        summary_parts.push(`
          <h5 style="margin: 0; color: #d9534f;">
            <strong>Total Expense:</strong> ₹ ${frappe.format(total_expense, {fieldtype: 'Float', precision: 2})}
          </h5>
        `);
        
        summary_parts.push(`
          <h5 style="margin: 0; color: #5cb85c;">
            <strong>Total Income:</strong> ₹ ${frappe.format(total_income, {fieldtype: 'Float', precision: 2})}
          </h5>
        `);
        
        // If a source filter is selected, show the source-specific income
        if (source && source.trim()) {
          summary_parts.push(`
            <h5 style="margin: 0; color: #0d6efd;">
              <strong>${source}:</strong> ₹ ${frappe.format(total_source_income, {fieldtype: 'Float', precision: 2})}
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

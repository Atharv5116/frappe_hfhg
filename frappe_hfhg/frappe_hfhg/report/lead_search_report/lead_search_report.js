// Copyright (c) 2025, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Lead Search Report"] = {
  filters: [
    {
      fieldname: "contact_number",
      label: __("Contact Number"),
      fieldtype: "Data",
    },
    {
      fieldname: "name",
      label: __("Name"),
      fieldtype: "Data",
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
        "Meta",
      ],
    },
    {
      fieldname: "subsource",
      label: __("Sub Source"),
      fieldtype: "Select",
      options: ["", "Facebook", "Instagram"],
    },
  ],
  
  formatter: function (value, row, column, data, default_formatter) {
    if (column.fieldname === "show_conversations") {
      const leadName = (data && data.show_conversations) || "";
      if (!leadName) {
        return "";
      }
      const leadNameAttr = frappe.utils.escape_html(leadName || "");
      return `
        <button type="button" class="btn btn-xs btn-primary show-conversations-btn" data-lead-name="${leadNameAttr}">
          ${__("Show Conversations")}
        </button>
      `;
    }
    return default_formatter(value, row, column, data);
  },
  
  onload: function (report) {
    // Add event delegation for the Show Conversations button
    // This handler will work for both new and existing buttons
    const handleShowConversationClick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      
      const $btn = $(this);
      let leadName = $btn.attr("data-lead-name");
      
      // If no data attribute, try to get lead name from the row
      if (!leadName) {
        const $row = $btn.closest("tr");
        // Find the row index in the data table
        const $table = $row.closest("table");
        const rowIndex = $row.index() - 1; // Subtract 1 for header row
        
        if (report.data && report.data[rowIndex]) {
          const rowData = report.data[rowIndex];
          // Try to get lead name from various possible fields
          leadName = rowData.name || rowData.lead || rowData.lead_name || rowData.show_conversations;
          
          // If name is HTML link, extract the actual name
          if (leadName && typeof leadName === 'string') {
            if (leadName.includes('href')) {
              const match = leadName.match(/href="[^"]*\/lead\/([^"\/]+)/);
              if (match) {
                leadName = decodeURIComponent(match[1]);
              }
            }
            // Remove HTML tags if present
            leadName = leadName.replace(/<[^>]*>/g, '').trim();
          }
        }
      }
      
      if (!leadName) {
        frappe.msgprint({
          title: __("Error"),
          message: __("Could not determine lead name"),
          indicator: "red",
        });
        return false;
      }
      
      frappe.call({
        method: "frappe_hfhg.api.get_lead_ignoring_permissions",
        args: {
          lead_name: leadName,
        },
        callback: function (r) {
          if (r.message) {
            const lead = r.message;
            if (lead.status !== "Duplicate Lead") {
              MyUtils.showConversations(lead);
            } else {
              frappe.msgprint({
                title: __("Error"),
                message: __("Patient is a duplicate lead"),
                indicator: "orange",
              });
            }
          }
        },
        error: function (r) {
          frappe.msgprint({
            title: __("Error"),
            message: r.message || __("Failed to load lead conversations"),
            indicator: "red",
          });
        },
      });
      
      return false;
    };
    
    // Remove existing handlers and attach new one
    $(document).off("click", ".show-conversations-btn", handleShowConversationClick);
    $(document).on("click", ".show-conversations-btn", handleShowConversationClick);
    
    // Also handle any existing buttons that might have different classes
    // Wait for report to render, then attach handlers to existing buttons
    setTimeout(function() {
      $(report.$result || document).find("button").each(function() {
        const $btn = $(this);
        const btnText = $btn.text().trim();
        if (btnText === "Show Conversation" || btnText === "Show Conversations") {
          if (!$btn.hasClass("show-conversations-btn")) {
            $btn.addClass("show-conversations-btn");
            // Extract lead name from row if not already set
            if (!$btn.attr("data-lead-name")) {
              const $row = $btn.closest("tr");
              const rowIndex = $row.index() - 1;
              if (report.data && report.data[rowIndex]) {
                const rowData = report.data[rowIndex];
                let leadName = rowData.name || rowData.lead || rowData.lead_name;
                if (leadName && typeof leadName === 'string') {
                  if (leadName.includes('href')) {
                    const match = leadName.match(/href="[^"]*\/lead\/([^"\/]+)/);
                    if (match) {
                      leadName = decodeURIComponent(match[1]);
                    }
                  }
                  leadName = leadName.replace(/<[^>]*>/g, '').trim();
                  if (leadName) {
                    $btn.attr("data-lead-name", leadName);
                  }
                }
              }
            }
          }
        }
      });
    }, 500);
  },
  
  refresh: function (report) {
    // Re-attach handlers after report refresh
    this.onload(report);
  },
};

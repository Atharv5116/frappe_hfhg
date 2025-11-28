// Copyright (c) 2025, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Lead Search Report"] = {
  formatter: function (value, row, column, data, default_formatter) {
    if (column.fieldname === "show_conversations") {
      const leadName = data && data.show_conversations;
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
    if (column.fieldname === "source") {
      // Format source as clickable link to Source doctype - show all sources
      if (value) {
        const sourceValue = frappe.utils.escape_html(String(value));
        return `<a href="/app/source/${encodeURIComponent(sourceValue)}" style="color: var(--link-color); text-decoration: underline;">${sourceValue}</a>`;
      }
      return "";
    }
    if (column.fieldname === "subsource") {
      // Show subsource only when source is "Meta"
      const source = data && data.source;
      if (source && source.toLowerCase() === "meta" && value) {
        const subsourceValue = frappe.utils.escape_html(String(value));
        return subsourceValue;
      }
      return ""; // Return empty for non-Meta sources
    }
    return default_formatter(value, row, column, data);
  },
  
  onload: function (report) {
    // Cache theme on page load for better performance
    let cachedTheme = null;
    let themeLoaded = false;
    
    function loadTheme(callback) {
      if (themeLoaded && cachedTheme !== null) {
        callback(cachedTheme);
        return;
      }
      frappe.call({
        method: "frappe.client.get_value",
        args: {
          doctype: "User",
          fieldname: "desk_theme",
          filters: { name: frappe.session.user },
        },
        callback: function (response) {
          cachedTheme = response.message?.desk_theme || "Light";
          themeLoaded = true;
          callback(cachedTheme);
        },
      });
    }
    
    // Preload theme for faster modal opening
    loadTheme(() => {});
    
    // Temporarily override link_field_results_limit to show all sources
    const originalLimit = frappe.boot.sysdefaults.link_field_results_limit;
    frappe.boot.sysdefaults.link_field_results_limit = 1000; // High limit instead of default 10
    
    // Override source filter to use higher page_length
    setTimeout(function() {
      const sourceFilter = report.page.fields_dict && report.page.fields_dict.source;
      if (sourceFilter) {
        // Re-initialize the field to pick up the new limit
        if (sourceFilter.setup_awesomeplete) {
          sourceFilter.setup_awesomeplete();
        }
      }
    }, 500);
    
    // Attach click handler for Show Conversations buttons
    $(document).on("click", ".show-conversations-btn", function () {
      const leadName = $(this).data("lead-name");
      if (leadName) {
        showConversationsModal(leadName, loadTheme);
      }
    });
  },
  
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
      fieldtype: "Link",
      options: "Source",
    },
    {
      fieldname: "executive",
      label: __("Executive"),
      fieldtype: "Link",
      options: "Executive",
    },
  ],
};

function showConversationsModal(leadName, loadTheme) {
  // Fetch lead data
  frappe.call({
    method: "frappe.client.get",
    args: {
      doctype: "Lead",
      name: leadName,
    },
    callback: function (response) {
      if (response.message) {
        loadTheme((theme) => {
          openReadOnlyConversationsModal(response.message, theme);
        });
      }
    },
  });
}

function openReadOnlyConversationsModal(leadDoc, theme) {
  const isDarkTheme = (theme || "Light").toLowerCase() === "dark";
  const styles = {
    bg: isDarkTheme ? "#171717" : "#ffffff",
    text: isDarkTheme ? "#f5f5f5" : "#000000",
    close: isDarkTheme ? "#ff6b6b" : "#d32f2f",
    overlay: isDarkTheme ? "#333" : "#F5F5F5",
    border: isDarkTheme ? "#232323" : "#ededed",
    header: isDarkTheme ? "#232323" : "#f3f3f3",
    textMuted: isDarkTheme ? "#c7c7c7" : "#525252",
    textLight: isDarkTheme ? "#7c7c7c" : "#7c7c7c",
  };

  // Build modal using DOM methods for better performance
  const modal = document.createElement("div");
  modal.id = "customModal";
  modal.className = "modal";
  modal.style.cssText = `display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;width:100%;height:100%;background-color:${styles.overlay};z-index:9999;`;
  
  const content = document.createElement("div");
  content.className = "modal-content";
  content.style.cssText = `border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.3);padding:5px;width:90%;max-width:1600px;height:90vh;max-height:100vh;overflow:hidden;background-color:${styles.bg};position:relative;`;
  
  const closeBtn = document.createElement("span");
  closeBtn.id = "closeModal";
  closeBtn.innerHTML = "&times;";
  closeBtn.style.cssText = `cursor:pointer;color:${styles.close};font-size:24px;font-weight:bold;position:absolute;top:15px;right:15px;z-index:999;`;
  
  const header = document.createElement("div");
  header.style.cssText = "display:flex;gap:60px;justify-content:center;position:relative;margin-top:25px;";
  header.innerHTML = `
    <h2 style="color:${styles.textMuted};font-weight:500;font-size:13px;margin-bottom:6px;">Patient: ${leadDoc.first_name || leadDoc.name || ""}</h2>
    <h2 style="color:${styles.textMuted};font-weight:500;font-size:13px;margin-bottom:6px;">Contact No.: ${leadDoc.contact_number || ""}</h2>
  `;
  
  const body = document.createElement("div");
  body.className = "modal-body";
  body.style.cssText = "display:flex;gap:20px;justify-content:space-between;max-height:90%;position:relative;";
  
  // Create table sections
  const remindersDiv = createTableSection("Reminders", "remindersTable", true, styles);
  const conversationsDiv = createTableSection("Conversations", "conversationsTable", false, styles);
  
  body.appendChild(remindersDiv);
  body.appendChild(conversationsDiv);
  
  // Create footer with Service and Status dropdowns (read-only)
  const footer = document.createElement("div");
  footer.style.cssText = "display:flex;gap:20px;justify-content:flex-end;align-items:flex-end;position:absolute;bottom:20px;right:40px;";
  
  const serviceDiv = document.createElement("div");
  serviceDiv.style.cssText = "display:block;width:200px;font-size:13px;";
  const serviceLabel = document.createElement("label");
  serviceLabel.textContent = "Service";
  serviceLabel.style.cssText = `font-weight:500;font-size:13px;color:${styles.textMuted};display:block;margin-bottom:5px;`;
  const serviceSelect = document.createElement("select");
  serviceSelect.id = "leadservice";
  serviceSelect.disabled = true; // Read-only
  serviceSelect.readOnly = true; // Additional read-only attribute
  serviceSelect.style.cssText = `width:100%;padding:8px;border-radius:8px;outline:none;border:none;background-color:${styles.header};color:${styles.textMuted};cursor:not-allowed;opacity:0.8;`;
  serviceDiv.appendChild(serviceLabel);
  serviceDiv.appendChild(serviceSelect);
  
  const statusDiv = document.createElement("div");
  statusDiv.style.cssText = "display:block;width:200px;font-size:13px;";
  const statusLabel = document.createElement("label");
  statusLabel.textContent = "Status";
  statusLabel.style.cssText = `font-weight:500;font-size:13px;color:${styles.textMuted};display:block;margin-bottom:5px;`;
  const statusSelect = document.createElement("select");
  statusSelect.id = "leadStatus";
  statusSelect.disabled = true; // Read-only
  statusSelect.readOnly = true; // Additional read-only attribute
  statusSelect.style.cssText = `width:100%;padding:8px;border-radius:8px;outline:none;border:none;background-color:${styles.header};color:${styles.textMuted};cursor:not-allowed;opacity:0.8;`;
  statusDiv.appendChild(statusLabel);
  statusDiv.appendChild(statusSelect);
  
  footer.appendChild(serviceDiv);
  footer.appendChild(statusDiv);
  
  content.appendChild(closeBtn);
  content.appendChild(header);
  content.appendChild(body);
  content.appendChild(footer);
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Event handlers
  const removeModal = () => modal.remove();
  closeBtn.addEventListener("click", removeModal);
  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      removeModal();
    }
  });
  
  // Populate Service dropdown
  frappe.call({
    method: "frappe.client.get_list",
    args: {
      doctype: "Service",
      fields: ["name"],
      limit_page_length: 1000,
      order_by: "name asc"
    },
    callback: function (r) {
      if (r.message) {
        const currentService = leadDoc.service || "";
        let options = '<option value="">-- Select Service --</option>';
        r.message.forEach(function (s) {
          const selected = currentService === s.name ? " selected" : "";
          options += `<option value="${s.name}"${selected}>${s.name}</option>`;
        });
        serviceSelect.innerHTML = options;
      }
    }
  });
  
  // Populate Status dropdown
  frappe.call({
    method: "frappe.client.get_list",
    args: {
      doctype: "Status",
      fields: ["name"],
      limit_page_length: 1000,
      order_by: "name asc"
    },
    callback: function (r) {
      if (r.message) {
        const currentStatus = leadDoc.status || "";
        let options = '<option value="">-- Select Status --</option>';
        r.message.forEach(function (s) {
          const selected = currentStatus === s.name ? " selected" : "";
          options += `<option value="${s.name}"${selected}>${s.name}</option>`;
        });
        statusSelect.innerHTML = options;
      }
    }
  });
  
  // Populate tables efficiently
  populateTable(document.querySelector("#conversationsTable tbody"), leadDoc.conversations || [], false, styles);
  populateTable(document.querySelector("#remindersTable tbody"), leadDoc.reminders || [], true, styles);
}

function createTableSection(title, tableId, isReminders, styles) {
  const container = document.createElement("div");
  container.className = "table-container";
  container.style.cssText = `flex:1;background:${styles.bg};color:${styles.text};border-radius:8px;padding:10px;`;
  
  const h3 = document.createElement("h3");
  h3.textContent = title;
  h3.style.cssText = `color:${styles.textMuted};font-weight:500;font-size:13px;margin-bottom:6px;`;
  
  const scrollDiv = document.createElement("div");
  scrollDiv.style.cssText = `max-height:85%;overflow-y:auto;border-radius:8px;border:1px solid ${styles.header};`;
  
  const table = document.createElement("table");
  table.id = tableId;
  table.className = "data-table";
  table.style.cssText = `width:100%;border-collapse:separate;border-spacing:0;font-size:13px;color:${styles.textLight};`;
  
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  tbody.style.cssText = `color:${styles.textMuted};font-weight:600;`;
  
  const headerRow = document.createElement("tr");
  headerRow.style.cssText = `background-color:${styles.header};`;
  
  if (isReminders) {
    headerRow.innerHTML = `
      <th style="border:1px solid ${styles.border};padding:6px 8px;width:25%;font-weight:500;">Date</th>
      <th style="border:1px solid ${styles.border};padding:6px 8px;width:50%;max-width:60%;font-weight:500;">Description</th>
      <th style="border:1px solid ${styles.border};padding:6px 8px;width:10%;font-weight:500;">Status</th>
      <th style="border:1px solid ${styles.border};padding:6px 8px;width:10%;font-weight:500;">Created By</th>
    `;
  } else {
    headerRow.innerHTML = `
      <th style="border:1px solid ${styles.border};padding:6px 8px;width:70%;max-width:70%;font-weight:500;">Description</th>
      <th style="border:1px solid ${styles.border};padding:6px 8px;width:20%;font-weight:500;">Created By</th>
    `;
  }
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  table.appendChild(tbody);
  scrollDiv.appendChild(table);
  container.appendChild(h3);
  container.appendChild(scrollDiv);
  
  return container;
}

function populateTable(tableBody, items, isReminders, styles) {
  if (!items || items.length === 0) {
    const colspan = isReminders ? "4" : "2";
    tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center;padding:20px;">No data available</td></tr>`;
    return;
  }
  
  // Sort once
  items.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });
  
  // Optimized: Build HTML string once (much faster than innerHTML += in loop)
  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return `${day}-${month}-${year} ${h}:${m} ${ampm}`;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const parts = dateString.split("-");
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : "";
  };
  
  const rows = items.map(item => {
    const date = item.date ? formatDate(item.date) : "";
    const exec = item.executive || "";
    const created = item.created_at ? formatDateTime(item.created_at) : "";
    const desc = (item.description || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const borderStyle = `border:1px solid ${styles.border};padding:10px 8px;`;
    
    if (isReminders) {
      return `<tr>
        <td style="${borderStyle}">${date}</td>
        <td style="${borderStyle}word-break:break-all;white-space:normal;">${desc}</td>
        <td style="${borderStyle}">${item.status || ""}</td>
        <td style="${borderStyle}">${exec}${created ? "<br>" + created : ""}</td>
      </tr>`;
    } else {
      return `<tr>
        <td style="${borderStyle}word-break:break-all;white-space:normal;">${desc}</td>
        <td style="${borderStyle}">${exec}${created ? "<br>" + created : ""}</td>
      </tr>`;
    }
  }).join("");
  
  tableBody.innerHTML = rows;
}

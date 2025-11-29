// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

let scalp_areas = [
  "1, 2",
  "3 A",
  "3 V",
  "4",
  "5",
  "6",
  "7",
  "Template",
  "Total",
];

let donor_areas = ["1", "2,3 & more", "Total"];

frappe.ui.form.on("Lead", {
  onload(frm) {
    // Update full_name on load if it's empty or outdated
    update_full_name(frm);
    
    if (frm.doc.contact_number && frm.doc.contact_number.length > 10) {
      frm.doc.whatsapp_no = frm.doc.contact_number;
      fetch_and_inject_custom_html(frm);
    }
    
    // Apply mandatory field rules based on current status
    apply_mandatory_field_rules(frm);
    
    // If source is "References" and source_reference has a value, fetch surgery info
    if (frm.doc.source === "References" && frm.doc.source_reference) {
      fetch_reference_surgery_info(frm);
    }
  },
  
  status: function(frm) {
    // When status changes, update mandatory field rules immediately
    apply_mandatory_field_rules(frm);
    
    // Also run in setTimeout to ensure it applies after value is set
    setTimeout(() => {
      apply_mandatory_field_rules(frm);
    }, 0);
  },
  
  is_applicable: function(frm) {
    // When Is Applicable checkbox changes, update mandatory field rules
    apply_mandatory_field_rules(frm);
  },
  
  before_save: function(frm) {
    // First apply the mandatory field rules to ensure fields are marked correctly
    apply_mandatory_field_rules(frm);
    
    // Then validate mandatory fields before saving (except for new documents)
    if (!frm.is_new()) {
      return validate_mandatory_fields(frm);
    }
    return true;
  },
  
  validate: function(frm) {
    // Ensure mandatory field rules are applied before validation
    apply_mandatory_field_rules(frm);
    
    // If status is exempt or is_applicable is unchecked, clear any validation errors
    const exempt_statuses = [
        "New Lead", 
        "Not Connected", 
        "Fake Lead", 
        "Invalid Number", 
        "Duplicate Lead", 
        "Not Interested",
        "Connected"
    ];
    
    if (!frm.doc.is_applicable || !frm.doc.status || exempt_statuses.includes(frm.doc.status)) {
        // Clear validation errors for our mandatory fields
        const mandatory_fields = [
            'distance', 'middle_name', 'last_name', 'age', 'profession',
            'mode', 'current_treatment', 'treatment_type', 'planning_time',
            'consultation_type', 'family_history'
        ];
        
        mandatory_fields.forEach(fieldname => {
            frm.set_df_property(fieldname, 'reqd', 0);
        });
        
        // Force frappe to accept the validation
        frappe.validated = true;
    }
  },
  
  contact_number: function (frm) {
    if (frm.doc.contact_number && frm.doc.contact_number.length > 10) {
      frm.doc.whatsapp_no = frm.doc.contact_number;
      fetch_and_inject_custom_html(frm);
    }
  },
  first_name: function(frm) {
    update_full_name(frm);
  },
  middle_name: function(frm) {
    update_full_name(frm);
  },
  last_name: function(frm) {
    update_full_name(frm);
  },
  source: function(frm) {
    // When source changes, handle dynamic source fields
    handle_dynamic_source_fields(frm);
    
    // If source is "References", show the source_reference field and fetch data if it exists
    if (frm.doc.source === "References" && frm.doc.source_reference) {
      fetch_reference_surgery_info(frm);
    } else {
      // Hide reference surgery info if source is not References
      frm.set_df_property("reference_surgery_info", "hidden", 1);
    }
  },
  source_reference: function(frm) {
    // When source_reference field changes, fetch surgery info if source is References
    if (frm.doc.source === "References") {
      fetch_reference_surgery_info(frm);
    }
  },
  refresh(frm) {
    // showWhatsAppTab()
    // Load Whtsapp Button
    if (frm.doc.contact_number) {
      frm
        .add_custom_button("", function () {
          let phone = frm.doc.contact_number.replace(/\D/g, ""); // Remove non-numeric chars
          let message = `Hello ${frm.doc.first_name}, I'm reaching out regarding your inquiry. `;

          // Detect if user is on a desktop
          let userAgent = navigator.userAgent.toLowerCase();
          let isDesktop =
            userAgent.includes("windows") ||
            userAgent.includes("mac") ||
            userAgent.includes("linux");

          let baseURL = isDesktop
            ? "https://web.whatsapp.com"
            : "https://wa.me";
          let url = `${baseURL}/send?phone=${phone}&text=${encodeURIComponent(
            message
          )}`;

          window.open(url, "_blank"); // Open in a new tab
        })
        .addClass("btn btn-success whatsapp-btn")
        .html('<i class="fa fa-whatsapp"></i>')
        .attr("title", "Chat on WhatsApp")
        .tooltip(); // Activate Bootstrap Tooltip

      frm.doc.whatsapp_no = frm.doc.contact_number;
      fetch_and_inject_custom_html(frm);
    }


    if (!frm.is_new()) {
      frm.add_custom_button("Update Image", function () {
        console.log("Upload Lead Image button clicked!");
        console.log("Form doctype:", frm.doctype);
        console.log("Form doc name:", frm.doc.name);
        console.log("Form doc patient:", frm.doc.patient);
        try {
          show_unified_image_dialog(frm);
        } catch(e) {
          console.error("Error calling show_unified_image_dialog:", e);
          frappe.msgprint("Error: " + e.message);
        }
      });
    }

    if (!frm.is_new()) {
      frm.add_custom_button(__("View Activity"), function () {
        frappe.call({
          method: "frappe_hfhg.api.get_lead_change_history",
          args: { lead_name: frm.doc.name },
          callback: function (response) {
            if (response.message) {
              const history = response.message;
              let table_html = `
                        <table class="table table-bordered" style="table-layout: fixed; width: 100%;">
                            <thead>
                                <tr>
                                    <th style="width: 8%;">Doctype</th>
                                    <th style="width: 33%;">Old Value</th>
                                    <th style="width: 33%;">New Value</th>
                                    <th style="width: 11%;">Modified By</th>
                                    <th style="width: 10%;">Modified On</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
              history.forEach((h) => {
                table_html += `
                            <tr>
                                <td>${h.doctype}</td>
                                <td><pre>${JSON.stringify(
                                  h.old_value || {},
                                  null,
                                  2
                                )}</pre></td>
                                <td>${
                                  h.type == "creation"
                                    ? `New ${
                                        h.doctype
                                      } added. <br/> <a target="_blank" rel="noopener noreferrer" style="color:rgb(88, 72, 233);text-decoration: underline;" href="/app/${h.doctype.toLowerCase()}/${
                                        h.name
                                      }">${h.name}</a>`
                                    : `<pre>${JSON.stringify(
                                        h.new_value || {},
                                        null,
                                        2
                                      )}</pre>`
                                }</td>
                                <td>${h.modified_by}</td>
                                <td>${h.modified}</td>
                            </tr>
                        `;
              });
              table_html += `</tbody></table>`;

              const dialog = new frappe.ui.Dialog({
                title: __("Lead Activity History"),
                fields: [
                  {
                    fieldname: "history_table",
                    fieldtype: "HTML",
                    options: `<div style="max-height: 650px; width: 100%; overflow-y: auto; margin: auto;">${table_html}</div>`,
                  },
                ],
              });
              const themeMode =
                document.documentElement.getAttribute("data-theme-mode");
              dialog.$wrapper.find(".modal-dialog").css({
                width: "90%",
                maxWidth: "2800px",
              });
              dialog.$wrapper.find("pre").css({
                fontFamily: "monospace",
                background: themeMode === "dark" ? "#232323" : "#f4f4f4",
                padding: "10px",
                borderRadius: "5px",
                color: themeMode === "dark" ? "#f5f5f5" : "#333",
              });
              dialog.$wrapper.find("th, td").css({
                wordBreak: "break-all",
              });
              dialog.show();
            }
          },
        });
      });

      if (frm.doc.status !== "Duplicate Lead") {
        frm.add_custom_button("Show Conversations", function () {
          frappe.call({
            method: "frappe.client.get_value",
            args: {
              doctype: "User",
              fieldname: "desk_theme",
              filters: {
                name: frappe.session.user,
              },
            },
            callback: function (response) {
              let desk_theme = response.message.desk_theme || "Light"; // Default to Light if theme not set

              // Define colors based on theme
              const isDarkTheme = desk_theme.toLowerCase() === "dark";
              const modalBackgroundColor = isDarkTheme ? "#171717" : "#ffffff";
              const textColor = isDarkTheme ? "#f5f5f5" : "#000000";
              const buttonBackgroundColor = isDarkTheme ? "#444" : "light-gray";
              const closeButtonColor = isDarkTheme ? "#ff6b6b" : "#d32f2f";

              // Create modal HTML with theme-based styles
              const modalHTML = `
                  <div id="customModal" class="modal" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: ${
                    isDarkTheme ? "#333" : "#F5F5F5"
                  }; z-index: 9999;">
                      <div class="modal-content" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); padding: 5px; width: 90%; max-width: 1600px; height:90vh; max-height: 100vh; overflow: hidden; background-color: ${modalBackgroundColor};">
                          <span class="close-button" id="closeModal" style="cursor: pointer; color: ${closeButtonColor}; font-size: 24px; font-weight: bold; position: absolute; top: 15px; right: 15px; z-index:999;">&times;</span>

                          <div style="display: flex; gap: 60px; justify-content: center;  position: relative; margin-top: 25px;"> 
                            <h2 style="color: ${
                              isDarkTheme ? "#c7c7c7" : "#525252"
                            }; font-weight: 500; font-size: 13px; margin-bottom: 6px;">Patient: ${
                frm.doc.first_name
              }</h2>
                            <h2 style="color: ${
                              isDarkTheme ? "#c7c7c7" : "#525252"
                            }; font-weight: 500; font-size: 13px; margin-bottom: 6px;">Contact No.: ${
                frm.doc.contact_number
              }</h2>
                          </div>
                          
                          <div class="modal-body" style="display: flex; gap: 20px; justify-content: space-between; max-height: 90%; position: relative;">
                          
                              <div class="table-container" style="flex:1; background: ${modalBackgroundColor}; color: ${textColor}; border-radius: 8px; padding: 10px;">
                                  <h3 style="color: ${
                                    isDarkTheme ? "#c7c7c7" : "#525252"
                                  }; font-weight: 500; font-size: 13px; margin-bottom: 6px;">Reminders</h3>
                                  <div style="max-height: 85%; overflow-y: auto; border-radius: 8px ; border: 1px solid ${
                                    isDarkTheme ? "#232323" : "#f3f3f3"
                                  };">
                                      <table id="remindersTable" class="data-table" style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; color: ${
                                        isDarkTheme ? "#7c7c7c" : "#7c7c7c"
                                      }; bordercolor: #232323; ">
                                          <thead >
                                              <tr style="background-color: ${
                                                isDarkTheme
                                                  ? "#232323"
                                                  : "#f3f3f3"
                                              }; ">
                                                  <th style="border: 1px solid ${
                                                    isDarkTheme
                                                      ? "#232323"
                                                      : "#ededed"
                                                  }; padding: 6px 8px; width: 25%; font-weight: 500;">Date<span style="color: red;">*</span></th>
                                                  <th style="border: 1px solid ${
                                                    isDarkTheme
                                                      ? "#232323"
                                                      : "#ededed"
                                                  }; padding: 6px 8px; width: 50%; max-width: 60%; font-weight: 500;">Description<span style="color: red;">*</span></th>
                                                  <th style="border: 1px solid ${
                                                    isDarkTheme
                                                      ? "#232323"
                                                      : "#ededed"
                                                  }; padding: 6px 8px; width: 10%; font-weight: 500;">Status<span style="color: red;">*</span></th>
                                                  <th style="border: 1px solid ${
                                                    isDarkTheme
                                                      ? "#232323"
                                                      : "#ededed"
                                                  }; padding: 6px 8px; width: 10%; font-weight: 500;">Created By</th>
                                              </tr>
                                          </thead>
                                          <tbody style="color: ${
                                            isDarkTheme ? "#c7c7c7" : "#525252"
                                          }; font-weight:600;"></tbody>
                                      </table>
                                  </div>
                                  <button id="addReminder" style="margin-top: 10px; background-color: ${
                                    isDarkTheme ? "#232323" : "#f3f3f3"
                                  }; color: ${
                isDarkTheme ? "#f8f8f8" : "#383838"
              }; padding: 4px 8px; font-size:14px; border: none; border-radius: 10px; cursor: pointer;">Add Row</button>
                              </div>
                              <div class="table-container" style="flex:1; background: ${modalBackgroundColor}; color: ${textColor}; border-radius: 8px; padding: 15px;">
                                  <h3 style="color: ${
                                    isDarkTheme ? "#c7c7c7" : "#525252"
                                  }; font-weight: 500; font-size: 13px; margin-bottom: 6px;">Conversations</h3>
                                  <div style="max-height: 85%; overflow-y: auto; border-radius: 8px ; border: 1px solid ${
                                    isDarkTheme ? "#232323" : "#f3f3f3"
                                  };">
                                      <table id="conversationsTable" class="data-table" style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; color: ${
                                        isDarkTheme ? "#7c7c7c" : "#7c7c7c"
                                      };">
                                          <thead>
                                              <tr style="background-color: ${
                                                isDarkTheme
                                                  ? "#232323"
                                                  : "#f3f3f3"
                                              };">
                                                  
                                                  <th style="border: 1px solid ${
                                                    isDarkTheme
                                                      ? "#232323"
                                                      : "#ededed"
                                                  }; padding: 6px 8px; width: 70%; max-width: 70%; font-weight: 500;">Description<span style="color: red;">*</span></th>
                                                  <th style="border: 1px solid ${
                                                    isDarkTheme
                                                      ? "#232323"
                                                      : "#ededed"
                                                  }; padding: 6px 8px; width: 20%; font-weight: 500;">Created By</th>
                                                  
                                                  
                                              </tr>
                                          </thead>
                                          <tbody style="color: ${
                                            isDarkTheme ? "#c7c7c7" : "#525252"
                                          }; font-weight: 600;"></tbody>
                                      </table>
                                  </div>
                                  <button id="addConversation" style="margin-top: 10px; background-color: ${
                                    isDarkTheme ? "#232323" : "#f3f3f3"
                                  }; color: ${
                isDarkTheme ? "#f8f8f8" : "#383838"
              }; padding: 4px 8px; font-size:14px; border: none; border-radius: 10px; cursor: pointer;">Add Row</button>
                              </div>
                          </div>

                          <div style="display: block; width: 200px; position: absolute; bottom: 20px; right: 350px;  font-size: 13px; border: none; ">
  <label for="leadservice" style="font-weight: 500; font-size: 13px; color: ${
    isDarkTheme ? "#c7c7c7" : "#525252"
  };">Service</label>
  <select id="leadservice" style="width: 100%; padding: 8px; border-radius: 8px; outline:none; border:none; background-color: ${
    isDarkTheme ? "#232323" : "#f3f3f3"
  };">
    <option value="">-- Select Service --</option>
  </select>
</div>


                          <div style="display: block; width: 200px; position: absolute; bottom: 20px; right: 110px; font-size: 13px; border: none;">
  <label for="leadStatus" style="font-weight: 500; font-size: 13px; color: ${
    isDarkTheme ? "#c7c7c7" : "#525252"
  };">Status</label>
  <select id="leadStatus" style="width: 100%; padding: 8px; border-radius: 8px; outline:none; border:none; background-color: ${
    isDarkTheme ? "#232323" : "#f3f3f3"
  };">
    <option value="">-- Select Status --</option>
  </select>
</div>

            
          
                          <button id="saveChanges" style="display: block; width: 60px; position: absolute; bottom: 20px; right: 40px; background-color: ${
                            isDarkTheme ? "white" : "#171717"
                          }; color: ${
                isDarkTheme ? "black" : "#fff"
              }; padding: 4px 5px; font-size: 14px; border: none; border-radius: 10px; cursor: pointer;">
                              Save 
                          </button>
                      </div>
                  </div>
              `;
              console.log(">>> Rendering Service & Status dropdowns...");
              

              document.body.insertAdjacentHTML("beforeend", modalHTML);
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
      // build options and select the current frm.doc.service if present
      const currentService = frm.doc.service || "";
      let options = '<option value="">-- Select Service --</option>';
      r.message.forEach(function (s) {
        const selected = currentService === s.name ? " selected" : "";
        options += `<option value="${s.name}"${selected}>${s.name}</option>`;
      });
      const $leadservice = $("#leadservice");
      $leadservice.html(options);
    }
  }
});
  // Populate Status dropdown dynamically from Status doctype
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
      const currentStatus = frm.doc.status || "";
      let options = '<option value="">-- Select Status --</option>';
      r.message.forEach(function (s) {
        const selected = currentStatus === s.name ? " selected" : "";
        options += `<option value="${s.name}"${selected}>${s.name}</option>`;
      });
      const el = document.getElementById("leadStatus");
      if (el) el.innerHTML = options;
    }
  }
});



              document
                .getElementById("closeModal")
                .addEventListener("click", function () {
                  document.getElementById("customModal").remove(); // Hides the modal
                });

              function formatDateTime(dateString) {
                const date = new Date(dateString);
                const day = String(date.getDate()).padStart(2, "0");
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const year = date.getFullYear();

                // Format the time as hh:mm am/pm
                let hours = date.getHours();
                const minutes = String(date.getMinutes()).padStart(2, "0");
                const ampm = hours >= 12 ? "pm" : "am";
                hours = hours % 12;
                hours = hours ? hours : 12; // The hour '0' should be '12'

                return `${day}-${month}-${year}\n${hours}:${minutes} ${ampm}`;
              }

              const populateTable = (tableBody, items, isReminders = false) => {
                items.sort(
                  (a, b) => new Date(b.created_at) - new Date(a.created_at)
                );

                tableBody.innerHTML = "";
                items.forEach((item, index) => {
                  const formattedDate = item.date ? formatDate(item.date) : ""; // Format the date for display
                  const executive = item.executive || ""; // Get the executive or default to an empty string
                  const createdAt = item.created_at
                    ? formatDateTime(item.created_at)
                    : "";
                  const row = `<tr data-index="${index}">
                                    ${
                                      isReminders
                                        ? `<td class="editable" data-field="date" style="border: 1px solid ${
                                            isDarkTheme ? "#232323" : "#ededed"
                                          }; padding: 10px 10px;">${formattedDate}</td>`
                                        : ""
                                    }
                                <td class="editable" data-field="description" style="border: 1px solid ${
                                  isDarkTheme ? "#232323" : "#ededed"
                                }; padding: 10px 8px; word-break: break-all; white-space: normal;">${
                    item.description || ""
                  }</td>
                                ${
                                  isReminders
                                    ? `<td class="editable" data-field="status" style="border: 1px solid ${
                                        isDarkTheme ? "#232323" : "#ededed"
                                      }; padding: 10px 8px;">${
                                        item.status || ""
                                      }</td>`
                                    : ""
                                }
                                <td style="border: 1px solid ${
                                  isDarkTheme ? "#232323" : "#ededed"
                                }; padding: 10px 8px;">
                                  ${executive}<br>
                                  ${createdAt}
                                </td>
                                
                            </tr>`;
                  tableBody.innerHTML += row;
                });
              };

              function formatDate(dateString) {
                const [year, month, day] = dateString.split("-");
                return `${day}-${month}-${year}`; // Convert to dd-mm-yyyy
              }

              const updateTables = () => {
                populateTable(
                  document.querySelector("#conversationsTable tbody"),
                  frm.doc.conversations || []
                );
                populateTable(
                  document.querySelector("#remindersTable tbody"),
                  frm.doc.reminders || [],
                  true
                );
                makeCellsEditable();
                attachDeleteRowEvent();
              };

              updateTables();

              function makeCellsEditable() {
                const editableCells = document.querySelectorAll(".editable");

                editableCells.forEach((cell) => {
                  const rowIndex = cell.parentElement.dataset.index;
                  const isConversationsTable = cell.closest(
                    "#conversationsTable"
                  );
                  const items = isConversationsTable
                    ? frm.doc.conversations
                    : frm.doc.reminders;

                  const field = cell.dataset.field;
                  const originalValue = cell.innerText.trim();
                  const isDescriptionField = field === "description";
                  if (
                    isConversationsTable &&
                    isDescriptionField &&
                    !items[rowIndex].name?.startsWith("new-")
                  ) {
                    cell.classList.add("disabled");
                    return;
                  }

                  cell.addEventListener("click", function () {
                    if (this.querySelector("input, select, textarea")) return;
                    const field = this.dataset.field;
                    const originalValue = this.innerText.trim();

                    let input;

                    if (field === "date") {
                      input = document.createElement("input");
                      input.type = "date";
                      input.value = originalValue
                        ? formatToInputDate(originalValue)
                        : ""; // Set value in yyyy-mm-dd format
                      input.style.width = "100%";
                      if (this.closest("table").id === "remindersTable") {
                        const today = new Date().toISOString().split("T")[0]; // Get current date in yyyy-mm-dd format
                        input.setAttribute("min", today); // Set min attribute to today
                      }
                    } else if (field === "status") {
                      input = document.createElement("select");
                      const openOption = new Option("Open", "Open");
                      const closeOption = new Option("Close", "Close");
                      input.add(openOption);
                      input.add(closeOption);
                      input.value = originalValue || "Open";
                      
                      // If this is a reminder status field, check if user can close it
                      if (this.closest("table").id === "remindersTable") {
                        const rowIndex = parseInt(this.parentElement.dataset.index);
                        const reminder = frm.doc.reminders[rowIndex];
                        const currentUserInfo = frappe.user_info(frappe.session.user);
                        const currentUserName = currentUserInfo.fullname;
                        const reminderExecutive = reminder.executive;
                        
                        // If current user is not the executive, disable the Close option
                        if (reminderExecutive && reminderExecutive !== currentUserName) {
                          closeOption.disabled = true;
                          // If current value is Close but user can't close, reset to Open
                          if (input.value === "Close") {
                            input.value = "Open";
                          }
                        }
                      }
                    } else {
                      input = document.createElement("textarea");
                      input.value = originalValue;
                      input.style.width = "100%";
                      input.rows = field === "description" ? 4 : 1;
                    }

                    this.innerHTML = "";
                    this.appendChild(input);
                    input.focus();


                    // Save changes on blur
                    input.addEventListener("blur", () => {
                      const rowIndex = parseInt(this.parentElement.dataset.index);
                      const items = this.closest("#conversationsTable")
                        ? frm.doc.conversations
                        : frm.doc.reminders;
                      const isRemindersTable = this.closest("table").id === "remindersTable";

                      // Validate reminder close permission
                      if (field === "status" && isRemindersTable) {
                        const reminder = items[rowIndex];
                        const currentUserInfo = frappe.user_info(frappe.session.user);
                        const currentUserName = currentUserInfo.fullname;
                        const reminderExecutive = reminder.executive;
                        const newStatus = input.value;
                        const oldStatus = originalValue || "Open";
                        
                        // If trying to change from Open to Close, check permission
                        if (oldStatus === "Open" && newStatus === "Close") {
                          if (reminderExecutive && reminderExecutive !== currentUserName) {
                            frappe.msgprint({
                              message: `You cannot close a reminder created by '${reminderExecutive}'. Only the creator can close their own reminder.`,
                              indicator: "orange",
                              title: "Permission Denied"
                            });
                            // Revert to original value
                            input.value = oldStatus;
                            this.innerText = oldStatus;
                            return;
                          }
                        }
                      }

                      if (field === "date") {
                        const dateValue = input.value || originalValue;
                        items[rowIndex][field] = dateValue; // Date is already in yyyy-mm-dd format from the input
                      } else {
                        items[rowIndex][field] = input.value || originalValue;
                      }

                      this.innerText = items[rowIndex][field];
                      frm.refresh_field(
                        this.closest("#conversationsTable")
                          ? "conversations"
                          : "reminders"
                      );
                      frm.dirty();
                    });

                    // Save changes on Enter key....
                    input.addEventListener("keypress", (e) => {
                      if (e.key === "Enter") {
                        input.blur();
                      }
                    });
                  });
                });
              }

              function formatToInputDate(dateString) {
                const [day, month, year] = dateString.split("-");
                return `${year}-${month}-${day}`; // Convert to yyyy-mm-dd for input
              }

              function attachDeleteRowEvent() {
                const deleteButtons = document.querySelectorAll(".delete-row");

                deleteButtons.forEach((button) => {
                  button.addEventListener("click", function () {
                    const row = this.closest("tr"); // Get the closest row (tr)
                    const index = row.dataset.index; // Get the index from the row's data-index
                    const tableType = this.closest("table").id;
                    const tableItems =
                      tableType === "conversationsTable"
                        ? frm.doc.conversations
                        : frm.doc.reminders;

                    tableItems.splice(index, 1); // Remove the selected item from the array
                    frm.refresh_field(
                      tableType === "conversationsTable"
                        ? "conversations"
                        : "reminders"
                    );
                    updateTables(); // Refresh table display
                    frm.dirty();
                  });
                });
              }

              function saveCurrentEdits() {
                const allTables = [
                  {
                    selector: "#conversationsTable",
                    items: frm.doc.conversations,
                  },
                  { selector: "#remindersTable", items: frm.doc.reminders },
                ];

                allTables.forEach(({ selector, items }) => {
                  const rows = document.querySelectorAll(
                    `${selector} tbody tr`
                  );
                  rows.forEach((row, index) => {
                    const cells = row.querySelectorAll(".editable");
                    cells.forEach((cell) => {
                      const input = cell.querySelector(
                        "input, select, textarea"
                      );
                      if (!input) return;

                      const field = cell.dataset.field;
                      if (!items[index]) items[index] = {};
                      items[index][field] = input.value;
                    });
                  });
                });
              }

              document.getElementById("addConversation").onclick = function () {
                let tableBody = document.querySelector(
                  "#conversationsTable tbody"
                );
                let rows = tableBody.getElementsByTagName("tr");
                for (let row of rows) {
                  let descriptionCell = row.querySelector(
                    "[data-field='description']"
                  );
                  if (descriptionCell) {
                    let descriptionText = descriptionCell.innerText.trim();
                    if (!descriptionText) {
                      alert(
                        "Please fill the description before adding a new conversation."
                      );
                      return;
                    }
                  }
                }
                saveCurrentEdits();

                const newConversation = frm.add_child("conversations");
                const today = new Date();
                const formattedDate = today.toISOString().split("T")[0]; // Format date as yyyy-mm-dd
                const currentUserInfo = frappe.user_info(frappe.session.user);
                const currentUserName = currentUserInfo.fullname;
                const currentDatetime = frappe.datetime.now_datetime();
                newConversation.date = formattedDate;
                newConversation.description = " ";
                newConversation.executive = currentUserName;
                newConversation.created_at = currentDatetime;
                frm.doc.conversations.pop();
                frm.doc.conversations.unshift(newConversation);
                frm.refresh_field("conversations");
                updateTables();
              };

              document.getElementById("addReminder").onclick = function () {
                saveCurrentEdits();

                // Get current user's fullname
                const currentUserInfo = frappe.user_info(frappe.session.user);
                const currentUserName = currentUserInfo.fullname;

                // Check if current user already has an open reminder
                const userHasOpenReminder = frm.doc.reminders.some(
                  (reminder) => reminder.status === "Open" && reminder.executive === currentUserName
                );
                
                if (userHasOpenReminder) {
                  alert(
                    "You already have an open reminder. Please close it before adding a new one."
                  );
                  return;
                }

                const newReminder = frm.add_child("reminders");
                const currentDatetime = frappe.datetime.now_datetime();
                newReminder.date = "";
                newReminder.description = " ";
                newReminder.status = "Open";
                newReminder.executive = currentUserName;
                newReminder.created_at = currentDatetime;
                frm.doc.reminders.pop();
                frm.doc.reminders.unshift(newReminder);
                frm.refresh_field("reminders");
                updateTables();
              };

              document.getElementById("saveChanges").onclick = function () {
                // Flush all editable fields before validating
                document.querySelectorAll(".editable").forEach((cell) => {
                  const input = cell.querySelector("input, select, textarea");
                  if (!input) return;

                  const rowIndex = cell.parentElement.dataset.index;
                  const isConversationsTable = cell.closest(
                    "#conversationsTable"
                  );
                  const items = isConversationsTable
                    ? frm.doc.conversations
                    : frm.doc.reminders;
                  const field = cell.dataset.field;
                  const newValue = input.value.trim();

                  if (newValue) {
                    items[rowIndex][field] = newValue;
                    cell.innerText = newValue;
                    frm.dirty();
                  }
                });

                frm.refresh_field("conversations");
                frm.refresh_field("reminders");
                // Validate required fields in each conversation row
                const selectedStatus =
                  document.getElementById("leadStatus").value;
                const selectedService =
                  document.getElementById("leadservice").value;
                let isValid = true;
                frm.doc.conversations.forEach((conversation, index) => {
                  if (!conversation.date || !conversation.description.trim()) {
                    isValid = false;
                    alert(
                      `Please fill the required details in conversation row ${
                        index + 1
                      }.`
                    );
                  }
                });
                frm.doc.reminders.forEach((reminder, index) => {
                  if (!reminder.date || !reminder.description.trim()) {
                    isValid = false;
                    alert(
                      `Please fill the required details in reminder row ${
                        index + 1
                      }.`
                    );
                  }
                });

                if (selectedStatus === "Duplicate Lead") {
                  if (!frappe.user_roles.includes("Duplicate Allow")) {
                    alert("You are not allowed to set Dupliate lead status");
                    return;
                  } else {
                    if (isValid) {
                      frm.doc["status"] = selectedStatus;
                      frm.doc["service"] = selectedService;
                      frm.dirty();
                      frm.save();
                      document.getElementById("customModal").remove();
                    }
                  }
                } else {
                  // Save normally if status is not "Duplicate Lead"
                  if (isValid) {
                    frm.doc["status"] = selectedStatus;
                    frm.doc["service"] = selectedService;
                    frm.dirty();
                    frm.save();
                    document.getElementById("customModal").remove();
                  }
                }
              };

              document.getElementById("customModal").onclick = function (
                event
              ) {
                if (event.target === this) {
                  document.getElementById("customModal").remove();
                }
              };
            },
          });
        });

        frm.add_custom_button(
          __("Consultation"),
          () => {
            frappe.set_route("consultation", "new", {
              patient: frm.doc.name,
              executive: frm.doc.executive,
              assign_by: frm.doc.assign_by,
            });
          },
          __("Create")
        );
        frm.add_custom_button(
          __("Costing"),
          () => {
            frappe.set_route("costing", "new", {
              patient: frm.doc.name,
              executive: frm.doc.executive,
              assign_by: frm.doc.assign_by,
            });
          },
          __("Create")
        );
        setTimeout(() => {
          $(`[data-doctype='Surgery']`).hide();
          frappe.call({
            method:
              "frappe_hfhg.frappe_hfhg.doctype.lead.lead.get_dashboard_stats",
            args: { lead: frm.doc.name },
            callback: function (r) {
              if (r.message && r.message.length > 0) {
                r.message.map((stat) => {
                  let link = frm.dashboard.links_area.body.find(
                    `[data-doctype=${stat.label}].document-link-badge`
                  );
                  if (link.length) {
                    link.prepend(`<span class="count">${stat.value}</span>`);
                    link.on("click", () => {
                      frappe.set_route("List", stat.label, {
                        patient: frm.doc.name,
                      });
                    });
                  }
                  if (stat.label === "Costing" && stat.value > 0) {
                    frm.add_custom_button(
                      __("Surgery"),
                      () => {
                        frappe.set_route("surgery", "new", {
                          patient: frm.doc.name,
                        });
                      },
                      __("Create")
                    );
                    $(`[data-doctype='Surgery']`).show();
                  }
                });
              }
            },
          });
        }, 0);

        if (!frm.sidebar) {
          return;
        }

        let custom_html = `
          <div class="custom-sidebar-section">
              <p>${__("First Name")}</p>
              <h5>${frm.doc.first_name}</h5>
              <p>${__("Contact Number")}</p>
              <h5>${frm.doc.contact_number}</h5>
              <p>${__("City")}</p>
              <h5>${frm.doc.city || "-"}</h5>
              <p>${__("Source")}</p>
              <h5>${frm.doc.source || "-"}</h5>
          </div>
        `;

        frm.sidebar.sidebar.find(".custom-sidebar-section").remove();
        frm.sidebar.sidebar.prepend(custom_html);
      } else {
        frm.add_custom_button("Original Lead", () => {
          frappe.call({
            method:
              "frappe_hfhg.frappe_hfhg.doctype.lead.lead.get_original_lead_name",
            args: {
              contact_number: frm.doc.contact_number,
              alternative_number: frm.doc.alternative_number,
              frontend_call: true,
            },
            callback: function (r) {
              if (r.message) {
                frappe.set_route("Form", "Lead", r.message);
              } else {
                frappe.msgprint(
                  "No original lead found. so converting to new lead"
                );
                frm.reload_doc();
              }
            },
          });
        });
        setTimeout(() => {
          frm.set_df_property("executive", "read_only", true);
          frm.set_df_property("assign_by", "read_only", true);
          frm.set_df_property("status", "read_only", true);
          frm.set_df_property("source", "read_only", true);
          frm.set_df_property("contact_number", "read_only", true);
          frm.set_df_property("alternative_number", "read_only", true);
          frm.set_df_property("city", "read_only", true);
          frm.set_df_property("age", "read_only", true);
          frm.set_df_property("address", "read_only", true);
          frm.set_df_property("message", "read_only", true);
          frm.set_df_property("distance", "read_only", true);
          frm.set_df_property("ht_sessions", "read_only", true);
          frm.set_df_property("date", "read_only", true);
          frm.set_df_property("first_name", "read_only", true);
          frm.set_df_property("middle_name", "read_only", true);
          frm.set_df_property("last_name", "read_only", true);
          frm.set_df_property("center", "read_only", true);
          frm.set_df_property("service", "read_only", true);
          frm.set_df_property("mode", "read_only", true);
          frm.set_df_property("campaign_name", "read_only", true);
          frm.set_df_property("email", "read_only", true);
        }, 0);
      }
    }

    if (!frm.doc.implant_area_anlaysis?.length) {
      frm.clear_table("implant_area_anlaysis");
      scalp_areas.map((area) => {
        frm.add_child("implant_area_anlaysis", {
          scalp_area: area,
        });
      });
      frm.refresh_field("implant_area_anlaysis");
    }

    if (!frm.doc.donor_area_analysis?.length) {
      frm.clear_table("donor_area_analysis");
      donor_areas.map((area) => {
        frm.add_child("donor_area_analysis", {
          hairs_per_graft: area,
        });
      });
      frm.refresh_field("donor_area_analysis");
    }

    frm.fields_dict["implant_area_anlaysis"].grid.wrapper.on(
      "change",
      'input[data-fieldname="grafts_required"]',
      function () {
        calculate_total_implant(frm);
      }
    );
    frm.fields_dict["donor_area_analysis"].grid.wrapper.on(
      "change",
      'input[data-fieldname="scalp"]',
      function () {
        calculate_total_donor(frm);
      }
    );
    frm.fields_dict["donor_area_analysis"].grid.wrapper.on(
      "change",
      'input[data-fieldname="body"]',
      function () {
        calculate_total_donor(frm);
      }
    );

    if (
      frappe.user_roles.includes("Executive") &&
      !frappe.user_roles.includes("Receptionist") &&
      !frappe.user_roles.includes("Doctor") &&
      !frappe.user_roles.includes("HOD") &&
      !frappe.user_roles.includes("Lead Distributor") &&
      !frappe.user_roles.includes("Marketing Head") &&
      !frappe.user_roles.includes("Surbhi-backend") &&
      !frappe.user_roles.includes("Accountant") &&
      !frappe.user_roles.includes("Lead checker")
    ) {
      frm.set_df_property("executive", "read_only", 1);
      frm.set_df_property("assign_by", "read_only", 1);
    } else {
      frm.set_df_property("executive", "read_only", 0);
      frm.set_df_property("assign_by", "read_only", 0);
    }

    // Set active_inactive_status field editable only for Admin, Lead Manager, and Executive roles
    if (
      frappe.user_roles.includes("Administrator") ||
      frappe.user_roles.includes("System Manager") ||
      frappe.user_roles.includes("Lead Manager") ||
      frappe.user_roles.includes("Executive")
    ) {
      frm.set_df_property("active_inactive_status", "read_only", 0);
    } else {
      frm.set_df_property("active_inactive_status", "read_only", 1);
    }

    if (frm.doc.hair_problem_hair_loss_check && frm.doc.remark_hair_loss) {
      frm.set_df_property("remark_hair_loss", "hidden", 0);
    }
    if (frm.doc.hair_problem_baldness_check && frm.doc.remark_baldness) {
      frm.set_df_property("remark_baldness", "hidden", 0);
    }
    if (frm.doc.hair_problem_handruff_check && frm.doc.remark_dandruff) {
      frm.set_df_property("remark_dandruff", "hidden", 0);
    }

    // Set query for source field to show all records
    frm.set_query("source", function() {
      return {
        page_length: 1000
      };
    });

    // Load dynamic source fields and setup conditional logic
    load_dynamic_source_fields(frm);

    hideSidebarToggle();
  },

  source(frm) {
    // Handle dynamic source field visibility
    handle_dynamic_source_fields(frm);
  },
  
  executive(frm) {
    if (frm.doc.executive) {
      frm.set_value("assign_by", frappe.session.user_email);
    }
  },

  hair_problem_hair_loss_check(frm) {
    frm.set_df_property(
      "remark_hair_loss",
      "hidden",
      !frm.doc.hair_problem_hair_loss_check
    );
  },
  hair_problem_baldness_check(frm) {
    frm.set_df_property(
      "remark_baldness",
      "hidden",
      !frm.doc.hair_problem_baldness_check
    );
  },
  hair_problem_handruff_check(frm) {
    frm.set_df_property(
      "remark_dandruff",
      "hidden",
      !frm.doc.hair_problem_handruff_check
    );
  },

  onload: function (frm) {
    frm.fields_dict["implant_area_anlaysis"].grid.cannot_add_rows = true;
    frm.fields_dict["implant_area_anlaysis"].grid.cannot_delete_rows = true;
    frm.refresh_field("implant_area_anlaysis");

    frm.fields_dict["donor_area_analysis"].grid.cannot_add_rows = true;
    frm.fields_dict["donor_area_analysis"].grid.cannot_delete_rows = true;
    frm.refresh_field("donor_area_analysis");

    if (
      frappe.user_roles.includes("Executive") &&
      frappe.user_roles.length == 4
    ) {
      frm.set_df_property("contact_number", "read_only", 1);
    }

    if (
      frappe.user_roles.includes("Executive") &&
      !frappe.user_roles.includes("Receptionist") &&
      !frappe.user_roles.includes("Doctor") &&
      !frappe.user_roles.includes("HOD") &&
      !frappe.user_roles.includes("Lead Distributor") &&
      !frappe.user_roles.includes("Marketing Head") &&
      !frappe.user_roles.includes("Surbhi-backend") &&
      !frappe.user_roles.includes("Accountant") &&
      !frappe.user_roles.includes("Lead checker")
    ) {
      frm.set_df_property("executive", "read_only", 1);
      frm.set_df_property("assign_by", "read_only", 1);
    } else {
      frm.set_df_property("executive", "read_only", 0);
      frm.set_df_property("assign_by", "read_only", 0);
    }

    hideSidebarToggle();

    setTimeout(() => {
      const $el = $("div[data-fieldname='assign_by'] a");

      if ($el.length && $el.text().trim() !== frm.doc.assign_by) {
        frappe.db.get_value("User", frm.doc.assign_by, "email").then((r) => {
          if (r.message?.email) {
            $el.text(r.message.email);
          }
        });
      }
    }, 300);
  },
  before_save(frm) {
    calculate_total_implant(frm);
  },
});

frappe.ui.form.on("Reminders", {
  reminders_add(frm, cdt, cdn) {
    var child = locals[cdt][cdn];
    
    // Set executive to current user (not the lead's executive)
    const currentUserInfo = frappe.user_info(frappe.session.user);
    const currentUserName = currentUserInfo.fullname;
    
    // Only set executive if not already set (preserves existing reminders)
    if (!child.executive) {
      child.executive = currentUserName;
    }
    
    // If this is a new open reminder, check if current user already has one
    // Exclude the current child by comparing the child document name (cdn)
    if ((child.status === "Open" || !child.status) && child.executive === currentUserName) {
      const userHasOpenReminder = frm.doc.reminders.some(
        (reminder) => {
          // Get the child document name for comparison
          const reminderCdn = reminder.name || (reminder.__islocal ? reminder.__name : null);
          const isCurrentChild = reminderCdn === cdn;
          return !isCurrentChild &&
                 reminder.status === "Open" && 
                 reminder.executive === currentUserName;
        }
      );
      
      if (userHasOpenReminder) {
        frappe.msgprint({
          message: "You already have an open reminder. Please close it before adding a new one.",
          indicator: "orange",
          title: "Cannot Add Reminder"
        });
        // Set status to Close to prevent adding an open reminder
        child.status = "Close";
      }
    }
    
    frm.doc.reminders.pop();
    frm.doc.reminders.unshift(child);
    frm.refresh_field("reminders");
  },
  
  reminders_refresh(frm) {
    // Make status field read-only for reminders that don't belong to current user
    const currentUserInfo = frappe.user_info(frappe.session.user);
    const currentUserName = currentUserInfo.fullname;
    
    frm.fields_dict.reminders.grid.refresh();
    
    // Wait for grid to render, then make status read-only for non-owner reminders
    setTimeout(() => {
      if (frm.fields_dict.reminders && frm.fields_dict.reminders.grid) {
        frm.fields_dict.reminders.grid.grid_rows.forEach((row) => {
          const reminder = row.doc;
          if (reminder && reminder.executive && reminder.executive !== currentUserName) {
            // Make status field read-only for this row
            const statusField = row.grid_form.fields_dict.status;
            if (statusField) {
              statusField.df.read_only = 1;
              statusField.refresh();
            }
          }
        });
      }
    }, 100);
  },
});

frappe.ui.form.on("Conversation", {
  conversations_add(frm, cdt, cdn) {
    var child = locals[cdt][cdn];
    frm.doc.conversations.pop();
    frm.doc.conversations.unshift(child);
    frm.refresh_field("conversations");
  },
});

function calculate_total_implant(frm) {
  let total = 0;
  frm.doc.implant_area_anlaysis.forEach((row) => {
    if (row.idx !== 9) {
      total += row.grafts_required;
    }
  });
  frm.set_value("grafts_required", total);
  frm.doc.implant_area_anlaysis[8].grafts_required = total;
  frm.refresh_field("implant_area_anlaysis");
}

function calculate_total_donor(frm) {
  let total_scalp = 0;
  let total_body = 0;
  frm.doc.donor_area_analysis.forEach((row) => {
    if (row.idx !== 3) {
      total_scalp += row.scalp;
      total_body += row.body;
    }
  });
  frm.doc.donor_area_analysis[0].total =
    frm.doc.donor_area_analysis[0].body + frm.doc.donor_area_analysis[0].scalp;
  frm.doc.donor_area_analysis[1].total =
    frm.doc.donor_area_analysis[1].body + frm.doc.donor_area_analysis[1].scalp;

  frm.doc.donor_area_analysis[2].scalp = total_scalp;
  frm.doc.donor_area_analysis[2].body = total_body;
  frm.doc.donor_area_analysis[2].total = total_body + total_scalp;

  frm.refresh_field("donor_area_analysis");
}

function hideSidebarToggle() {
  // Hide the sidebar toggle button
  const toggleButton = document.querySelector(".sidebar-toggle-btn");
  if (toggleButton) {
    toggleButton.remove(); // Completely removes it from DOM
  }

  const sidebar = document.querySelector(".layout-side-section");
  if (sidebar) {
    sidebar.classList.remove("hidden");
    sidebar.style.display = "block";
  }

  // Prevent the sidebar from being toggled
  frappe.ui.toolbar.toggle_full_width = function () {};
}

// Function to fetch and inject HTML
// TODO: Direct HTML Mounting/Injection did not work. approching alt. with iframe
// function fetch_and_inject_custom_html(frm) {
//   const whatsappTab = document.querySelector('#lead-whatsapp_tab');
//   const appContainer = document.createElement('div');
//   appContainer.id = 'app'; // Assign a unique ID
//   whatsappTab.appendChild(appContainer);

//   fetch("/assets/frappe_hfhg/whatsapp/index.html")
//     .then(response => {
//       if (!response.ok) {
//         throw new Error("Failed to fetch HTML");
//       }
//       return response.text();
//     })
//     .then(html => {
//       // const whatsappTab = document.querySelector('#lead-whatsapp_tab');

//       if (whatsappTab) {
//         // Create a unique container for your app
//         // const appContainer = document.createElement('div');
//         // appContainer.id = 'app-container'; // Assign a unique ID
//         // appContainer.innerHTML = html
//         // whatsappTab.appendChild(appContainer);

//         // Parse the fetched HTML
//         const tempDiv = document.createElement('div');
//         tempDiv.innerHTML = html;

//         // Extract styles (link tags) and scripts
//         const styles = tempDiv.querySelectorAll('link[rel="stylesheet"]');
//         const scripts = tempDiv.querySelectorAll('script');
//         // const appDiv = tempDiv.querySelector('#app');

//         // Dynamically inject styles scoped to this container
//         // const styles = appContainer.querySelectorAll('link[rel="stylesheet"]');
//         styles.forEach(link => {
//           fetch(link.href)
//             .then(res => res.text())
//             .then(cssText => {
//               const styleElement = document.createElement('style');
//               // Scope the CSS to only apply within the app div
//               styleElement.textContent = `#app { ${cssText} }`;
//               appContainer.appendChild(styleElement);
//             });
//         });

//         // if (appDiv) {
//         //   appContainer.appendChild(appDiv.cloneNode(true));
//         // }
//         // Dynamically load JavaScript scripts
//         // const scripts = appContainer.querySelectorAll('script');
//         scripts.forEach(script => {
//           const scriptElement = document.createElement('script');
//           if (script.src) {
//             scriptElement.src = script.src;
//             appContainer.appendChild(scriptElement);
//           } else {
//             scriptElement.textContent = script.textContent;
//             appContainer.appendChild(scriptElement);
//           }
//         });
//       } else {
//         console.error('WhatsApp tab not found!');
//       }
//     })
//     .catch(error => {
//       console.error("Error loading custom HTML:", error);
//       frappe.msgprint({
//         title: __("Error"),
//         message: __("Failed to load custom sidebar content"),
//         indicator: "red"
//       });
//     });
// }

function fetch_and_inject_custom_html(frm) {
  const whatsappTab = document.querySelector("#lead-whatsapp_tab");
  if (!whatsappTab) {
    console.error("WhatsApp tab not found!");
    return;
  }

  // Function to remove warning if it exists
  function removeWarning() {
    const warningDiv = document.getElementById("whatsapp-warning");
    if (warningDiv) {
      warningDiv.remove();
    }
  }

  // Function to remove iframe if it exists
  function removeIframe() {
    const iframeContainer = document.getElementById("iframe-container");
    if (iframeContainer) {
      iframeContainer.remove();
    }
  }

  window.csrf_token = frappe.csrf_token;
  window.sitename = frappe.boot.sitename;
  if (
    !frm ||
    !frm.doctype ||
    !frm.docname ||
    frm.is_new() ||
    frm.doc.contact_number.length < 9
  ) {
    let message = "The document must be saved to load WhatsApp chat.";
    if (frm.doc.contact_number.length < 9) {
      message = "Please Check Contact Number, it's less then 9 digit";
    }

    console.warn(
      "Doctype and Docname are missing or the document is not saved."
    );
    removeIframe();

    if (!document.querySelector("#whatsapp-warning")) {
      const warningDiv = document.createElement("div");
      warningDiv.id = "whatsapp-warning"; // Ensure unique ID for warning message
      warningDiv.style.display = "flex";
      warningDiv.style.justifyContent = "center";
      warningDiv.style.alignItems = "center";
      warningDiv.style.height = "100%";
      warningDiv.style.textAlign = "center";

      warningDiv.innerHTML = `
                <div>
                    <h3 style="color: #ff4d4f;">⚠️ Warning</h3>
                    <p>${message}</p>
                </div>
            `;
      whatsappTab.appendChild(warningDiv);
    }
    // showWhatsAppTab(frm)
    return; // Allow rendering of the warning without injecting further content
  }

  let phone = frm.doc.contact_number.replace(/\D/g, ""); // Remove non-numeric chars

  if (phone.length > 9) {
    removeWarning();
    // Construct the iframe URL
    const iframeUrl = `/app/whatsapp_chat?doctype=${encodeURIComponent(
      frm.doctype
    )}&docname=${encodeURIComponent(frm.docname)}&phone=${phone}`;
    let existingIframeContainer = document.getElementById("iframe-container");
    if (existingIframeContainer) {
      // If iframe exists, just update the src to refresh content
      const existingIframe = existingIframeContainer.querySelector("iframe");
      if (existingIframe && existingIframe.src !== iframeUrl) {
        existingIframe.src = iframeUrl; // Refresh iframe with new URL
      } else {
        existingIframe.contentWindow.location.reload(true);
      }
    } else {
      // Create a unique container for the iframe
      const appContainer = document.createElement("div");
      appContainer.id = "iframe-container"; // Assign a unique ID
      appContainer.style.height = "100vh"; // Ensure it occupies the full tab height
      appContainer.style.width = "100%"; // Ensure it occupies the full tab width
      appContainer.style.overflow = "hidden"; // Prevent unwanted scrollbars
      appContainer.style.display = "flex"; // Use flexbox to ensure proper layout

      // Create and configure the iframe
      const iframe = document.createElement("iframe");
      iframe.src = iframeUrl;
      // iframe.style.height = '100%';
      iframe.style.width = "100%";
      iframe.style.border = "none"; // Remove iframe borders for a seamless look
      iframe.allow = "fullscreen"; // Allow fullscreen for the iframe if required
      iframe.style.flex = "1"; // Ensure it stretches to fill the container
      iframe.allow = "fullscreen"; // Allow fullscreen for the iframe if required

      // Remove warning when iframe is successfully loaded
      iframe.onload = () => {
        removeWarning();
      };
      // Append the iframe to the container
      appContainer.appendChild(iframe);
      // Append the container to the WhatsApp tab
      // whatsappTab.innerHTML = ''; // Clear any existing content in the tab
      whatsappTab.appendChild(appContainer);
    }
  }

  // showWhatsAppTab(frm)
}

// function showWhatsAppTab(frm) {
//   const tabFieldname = 'whatsapp_tab';
//   const whatsappTab = document.querySelector('#lead-whatsapp_tab');

//   // Delay to ensure it runs after Frappe's refresh logic
//   setTimeout(() => {
//     const tabElement = $(`.form-tabs-list a[data-fieldname="${tabFieldname}"]`).closest("li.nav-item");

//     if (tabElement.length) {
//       if (tabElement.hasClass("hide")) {
//         tabElement.removeClass("hide").addClass("show");
//       } else {
//         console.log("WhatsApp tab is already visible.");
//       }

//       // Attach click event to the WhatsApp tab link
//       $(`.form-tabs-list a[data-fieldname="${tabFieldname}"]`).off('click').on('click', function () {
//         if (whatsappTab) {
//           // Ensure the WhatsApp tab content is visible
//           whatsappTab.classList.remove('hide');
//           whatsappTab.classList.add('show');
//         } else {
//           console.warn("WhatsApp tab section not found.");
//         }
//       });
//     } else {
//       console.warn("WhatsApp tab element not found.");
//     }
//   }, 500);  // Run after 500ms to bypass refresh overwrite
// }

// Unified Image Dialog - Shows ALL images from ALL sources across all doctypes
function show_unified_image_dialog(frm) {
    const patient_name = frm.doctype === 'Lead' ? frm.doc.name : frm.doc.patient;
    
    if (!patient_name) {
        frappe.msgprint(__('No patient linked'));
        return;
    }

    const d = new frappe.ui.Dialog({
        title: __('Patient Images - {0}', [patient_name]),
        size: 'extra-large',
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'image_area'
            }
        ]
    });

    function load_images() {
        frappe.call({
            method: 'frappe_hfhg.api.get_all_patient_images_unified',
            args: { patient_name: patient_name },
            callback: function(r) {
                let html = `
                    <div style="margin-bottom: 20px;">
                        <button class="btn btn-primary btn-sm upload-new-image">
                            <i class="fa fa-upload"></i> Upload New Image
                        </button>
                        <button class="btn btn-secondary btn-sm refresh-images" style="margin-left: 10px;">
                            <i class="fa fa-refresh"></i> Refresh
                        </button>
                    </div>
                `;
                
                if (r.message && r.message.length > 0) {
                    html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">';
                    r.message.forEach((img, index) => {
                        html += `
                            <div class="image-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; background: white;">
                                <img src="${img.image_url}" 
                                     style="width: 100%; height: 180px; object-fit: cover; border-radius: 5px; cursor: pointer;" 
                                     data-url="${img.image_url}"
                                     class="view-full-image"
                                     title="Click to view full size">
                                <div style="margin-top: 8px; font-size: 11px; color: #666;">
                                    <strong>${img.source}</strong><br>
                                    <small>${img.uploaded_on}</small>
                                </div>
                                <button class="btn btn-xs btn-danger delete-image" 
                                        data-id="${img.id}" 
                                        data-source="${img.source}"
                                        data-source-type="${img.source_type}"
                                        style="margin-top: 8px; width: 100%;">
                                    <i class="fa fa-trash"></i> Delete
                                </button>
                            </div>
                        `;
                    });
                    html += '</div>';
                } else {
                    html += `
                        <div style="padding: 40px; text-align: center; color: #999;">
                            <i class="fa fa-image" style="font-size: 48px; margin-bottom: 10px; display: block; color: #ccc;"></i>
                            <p>No images found. Click "Upload New Image" to add images.</p>
                        </div>
                    `;
                }
                
                d.fields_dict.image_area.$wrapper.html(html);
                
                // Bind click event to view full image in new tab
                d.fields_dict.image_area.$wrapper.find('.view-full-image').on('click', function() {
                    const img_url = $(this).data('url');
                    // Create a new window/tab with HTML that displays the image
                    const imageWindow = window.open('', '_blank');
                    imageWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Image Viewer</title>
                            <style>
                                body {
                                    margin: 0;
                                    padding: 0;
                                    background: #000;
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    min-height: 100vh;
                                }
                                img {
                                    max-width: 100%;
                                    max-height: 100vh;
                                    object-fit: contain;
                                }
                            </style>
                        </head>
                        <body>
                            <img src="${img_url}" alt="Patient Image">
                        </body>
                        </html>
                    `);
                    imageWindow.document.close();
                });
                
                // Bind delete button
                d.fields_dict.image_area.$wrapper.find('.delete-image').on('click', function() {
                    const img_id = $(this).data('id');
                    const source = $(this).data('source');
                    const source_type = $(this).data('source-type');
                    
                    frappe.confirm(__('Delete this image from {0}?', [source]), () => {
                        frappe.call({
                            method: 'frappe_hfhg.api.delete_patient_image_unified',
                            args: { 
                                patient_name: patient_name, 
                                image_id: img_id, 
                                source: source 
                            },
                            callback: function(r) {
                                if (r.message && r.message.success) {
                                    frappe.show_alert({message: __('Image deleted'), indicator: 'green'});
                                    load_images();
                                    frm.reload_doc();
                                } else {
                                    frappe.msgprint(__('Error deleting image: {0}', [r.message.message || 'Unknown error']));
                                }
                            }
                        });
                    });
                });
                
                // Bind upload button
                d.fields_dict.image_area.$wrapper.find('.upload-new-image').on('click', function() {
                    new frappe.ui.FileUploader({
                        allow_multiple: true,
                        restrictions: { allowed_file_types: ['image/*'] },
                        on_success(file) {
                            frappe.call({
                                method: 'frappe_hfhg.api.upload_patient_image_unified',
                                args: { 
                                    patient_name: patient_name, 
                                    file_url: file.file_url 
                                },
                                callback: function(r) {
                                    if (r.message && r.message.success) {
                                        frappe.show_alert({message: __('Image uploaded'), indicator: 'green'});
                                        load_images();
                                        frm.reload_doc();
                                    }
                                }
                            });
                        }
                    });
                });
                
                // Bind refresh button
                d.fields_dict.image_area.$wrapper.find('.refresh-images').on('click', function() {
                    load_images();
                });
            }
        });
    }

    d.show();
    load_images();
}

// Helper functions for dynamic source fields
function load_dynamic_source_fields(frm) {
    frappe.call({
        method: "frappe_hfhg.frappe_hfhg.doctype.lead.lead.get_dynamic_source_fields",
        callback: function(r) {
            if (r.message) {
                frm.dynamic_source_fields = r.message;
                handle_dynamic_source_fields(frm);
            }
        }
    });
}

function handle_dynamic_source_fields(frm) {
    if (!frm.dynamic_source_fields || !frm.doc.source) {
        // Hide dynamic field if no source selected
        frm.set_df_property("dynamic_source_name", "hidden", 1);
        return;
    }

    // Check if selected source has show_additional_field enabled
    const selected_source_info = frm.dynamic_source_fields[frm.doc.source];
    if (selected_source_info) {
        // Show the dynamic field and update its label
        frm.set_df_property("dynamic_source_name", "hidden", 0);
        frm.set_df_property("dynamic_source_name", "label", selected_source_info.label);
    } else {
        // Hide the dynamic field if source doesn't have additional field enabled
        frm.set_df_property("dynamic_source_name", "hidden", 1);
    }

}

// Fetch surgery information for reference patient
function fetch_reference_surgery_info(frm) {
    if (!frm.doc.source_reference) {
        console.log("No patient identifier, hiding field");
        frm.set_df_property("reference_surgery_info", "options", "");
        frm.set_df_property("reference_surgery_info", "hidden", 1);
        return;
    }
    
    const patient_identifier = frm.doc.source_reference.trim();
    
    console.log("Fetching surgery info for:", patient_identifier);
    
    if (!patient_identifier) {
        console.log("No patient identifier, hiding field");
        frm.set_df_property("reference_surgery_info", "options", "");
        frm.set_df_property("reference_surgery_info", "hidden", 1);
        return;
    }

    // Hide field initially while loading
    frm.set_df_property("reference_surgery_info", "hidden", 1);

    // Check if input is a phone number (contains digits)
    const is_phone_number = /\d{8,}/.test(patient_identifier);
    
    console.log("Input type detected:", is_phone_number ? "Phone Number" : "Patient Name");
    
    // Search Surgery directly - much simpler approach!
    search_surgery_directly(patient_identifier, is_phone_number, frm);
}

// Direct search in Surgery doctype - much simpler!
function search_surgery_directly(identifier, is_phone_number, frm) {
    console.log("Searching Surgery directly for:", identifier, is_phone_number ? "(phone)" : "(name)");
    
    let filters = {};
    
    if (is_phone_number) {
        // Search by contact_number - partial match for phone numbers
        filters = {
            'contact_number': ['like', '%' + identifier + '%']
        };
    } else {
        // Search by first_name - EXACT match for names
        filters = {
            'first_name': identifier
        };
    }
    
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Surgery',
            filters: filters,
            fields: ['name', 'patient', 'first_name', 'contact_number', 'surgery_date', 'center', 'technique', 'note', 'grafts'],
            order_by: 'surgery_date desc',
            limit_page_length: 0
        },
        callback: function(r) {
            console.log("Surgery data received:", r.message);
            display_surgery_results(r.message, identifier, null, frm);
        },
        error: function(err) {
            console.error("Error fetching surgery data:", err);
            frm.set_df_property("reference_surgery_info", "options", "");
            frm.set_df_property("reference_surgery_info", "hidden", 1);
        }
    });
}

    // Helper function to search Surgery by patient name
    function search_surgery_by_name(patient_name, lead_data, frm) {
        console.log("Searching Surgery records for patient name:", patient_name);
        
        // First try exact match
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Surgery',
                filters: {
                    'patient': patient_name  // Exact match first
                },
                fields: ['name', 'patient', 'surgery_date', 'center', 'technique', 'note', 'grafts'],
                order_by: 'surgery_date desc',
                limit_page_length: 0
            },
            callback: function(r) {
                console.log("Surgery data received (exact match):", r.message);
                
                // If no exact match, try starts with pattern
                if (!r.message || r.message.length === 0) {
                    console.log("No exact match found, trying starts with pattern...");
                    frappe.call({
                        method: 'frappe.client.get_list',
                        args: {
                            doctype: 'Surgery',
                            filters: {
                                'patient': ['like', patient_name + '%']  // Starts with patient_name
                            },
                            fields: ['name', 'patient', 'surgery_date', 'center', 'technique', 'note', 'grafts'],
                            order_by: 'surgery_date desc',
                            limit_page_length: 0
                        },
                        callback: function(r2) {
                            console.log("Surgery data received (starts with):", r2.message);
                            display_surgery_results(r2.message, patient_name, lead_data, frm);
                        },
                        error: function(err) {
                            console.error("Error fetching surgery data (starts with):", err);
                            frm.set_df_property("reference_surgery_info", "hidden", 1);
                        }
                    });
                    return;
                }
                
                // Display exact match results
                display_surgery_results(r.message, patient_name, lead_data, frm);
            },
            error: function(err) {
                console.error("Error fetching surgery data:", err);
                frm.set_df_property("reference_surgery_info", "options", "");
                frm.set_df_property("reference_surgery_info", "hidden", 1);
            }
        });
    }

// Display surgery results in HTML field
function display_surgery_results(surgeries, patient_name, lead_data, frm) {
            if (surgeries && surgeries.length > 0) {
                console.log("Found", surgeries.length, "surgery records, showing field");
                // Build HTML to display surgery information
                let html = '<div style="border: 1px solid #d1d8dd; border-radius: 4px; padding: 15px; background: #f9fafb; margin-top: 10px;">';
                html += '<h4 style="margin-top: 0; margin-bottom: 15px; color: #36414c; font-size: 14px;">Surgery Records</h4>';
                
                if (lead_data) {
                    html += '<div style="margin-bottom: 15px; padding: 10px; background: #e3f2fd; border-radius: 4px;">';
                    html += '<strong>Patient:</strong> ' + frappe.utils.escape_html(lead_data.full_name || lead_data.first_name) + ' (' + lead_data.name + ')<br>';
                    html += '<strong>Contact:</strong> ' + (lead_data.contact_number || 'N/A');
                    html += '</div>';
                } else {
                    html += '<div style="margin-bottom: 15px; padding: 10px; background: #e3f2fd; border-radius: 4px;">';
                    html += '<strong>Patient:</strong> ' + frappe.utils.escape_html(surgeries[0].patient);
                    html += '</div>';
                }
                
                surgeries.forEach((surgery, index) => {
                    html += '<div style="background: white; padding: 12px; margin-bottom: 10px; border-radius: 4px; border-left: 3px solid #2490ef;">';
                    html += '<div style="font-weight: 600; color: #36414c; margin-bottom: 8px;">Surgery #' + (index + 1) + ' - ' + surgery.name + '</div>';
                    html += '<table style="width: 100%; font-size: 13px;">';
                    html += '<tr><td style="padding: 4px 0; width: 150px; color: #6c7680;"><strong>Surgery Date:</strong></td><td style="padding: 4px 0;">' + (surgery.surgery_date || 'N/A') + '</td></tr>';
                    html += '<tr><td style="padding: 4px 0; color: #6c7680;"><strong>Center:</strong></td><td style="padding: 4px 0;">' + (surgery.center || 'N/A') + '</td></tr>';
                    html += '<tr><td style="padding: 4px 0; color: #6c7680;"><strong>Technique:</strong></td><td style="padding: 4px 0;">' + (surgery.technique || 'N/A') + '</td></tr>';
                    html += '<tr><td style="padding: 4px 0; color: #6c7680;"><strong>Grafts:</strong></td><td style="padding: 4px 0;">' + (surgery.grafts || 'N/A') + '</td></tr>';
                    if (surgery.note) {
                        html += '<tr><td style="padding: 4px 0; color: #6c7680; vertical-align: top;"><strong>Note:</strong></td><td style="padding: 4px 0;">' + frappe.utils.escape_html(surgery.note) + '</td></tr>';
                    }
                    html += '</table>';
                    html += '</div>';
                });
                
                html += '</div>';
                
                // Show field only if data is found
                console.log("Setting HTML content to field...");
                
                // Try multiple methods to show the field
                frm.set_df_property("reference_surgery_info", "hidden", 0);
                frm.set_df_property("reference_surgery_info", "options", html);
                
                // Also set directly via wrapper
                if (frm.fields_dict.reference_surgery_info) {
                    frm.fields_dict.reference_surgery_info.$wrapper.html(html);
                    frm.fields_dict.reference_surgery_info.$wrapper.show();
                    console.log("Field wrapper updated directly");
                }
                
                frm.refresh_field("reference_surgery_info");
                console.log("Field updated and refreshed");
            } else {
                // No surgery found - keep field hidden
                console.log("No surgery records found for patient name:", patient_name);
                frm.set_df_property("reference_surgery_info", "options", "");
                frm.set_df_property("reference_surgery_info", "hidden", 1);
            }
}

// Helper function to update full_name when first/middle/last name changes
function update_full_name(frm) {
    let full_name_parts = [];
    
    if (frm.doc.first_name) {
        full_name_parts.push(frm.doc.first_name.trim());
    }
    
    if (frm.doc.middle_name) {
        full_name_parts.push(frm.doc.middle_name.trim());
    }
    
    if (frm.doc.last_name) {
        full_name_parts.push(frm.doc.last_name.trim());
    }
    
    // Join the parts with space and set to full_name field
    frm.set_value('full_name', full_name_parts.join(' '));

}

// Apply mandatory field rules based on status
function apply_mandatory_field_rules(frm) {
    // Define the fields that can be mandatory
    const mandatory_fields = [
        'distance',
        'middle_name',
        'last_name',
        'age',
        'profession',
        'mode',
        'current_treatment',
        'treatment_type',
        'planning_time',
        'consultation_type',
        'family_history'
    ];
    
    // Master switch: If "Is Applicable" checkbox is NOT checked, remove all mandatory flags
    if (!frm.doc.is_applicable) {
        mandatory_fields.forEach(fieldname => {
            const field = frm.fields_dict[fieldname];
            if (field) {
                frm.set_df_property(fieldname, 'reqd', 0);
                frm.refresh_field(fieldname);
            }
        });
        frm.refresh_fields();
        return;
    }
    
    // "Is Applicable" is checked, so apply status-based logic
    
    // If no status is selected, don't require mandatory fields
    if (!frm.doc.status) {
        mandatory_fields.forEach(fieldname => {
            const field = frm.fields_dict[fieldname];
            if (field) {
                frm.set_df_property(fieldname, 'reqd', 0);
                frm.refresh_field(fieldname);
            }
        });
        frm.refresh_fields();
        return;
    }
    
    // Statuses that don't require mandatory fields
    const exempt_statuses = [
        "New Lead", 
        "Not Connected", 
        "Fake Lead", 
        "Invalid Number", 
        "Duplicate Lead", 
        "Not Interested",
        "Connected"
    ];
    
    // Check if current status is exempt
    const is_exempt = exempt_statuses.includes(frm.doc.status);
    
    // Debug log
    console.log('Mandatory Field Rules:', {
        status: frm.doc.status,
        is_applicable: frm.doc.is_applicable,
        is_exempt: is_exempt,
        should_be_mandatory: !is_exempt
    });
    
    if (is_exempt) {
        // Status is exempt, remove mandatory flags
        console.log('Removing mandatory flags (exempt status)');
        mandatory_fields.forEach(fieldname => {
            const field = frm.fields_dict[fieldname];
            if (field) {
                frm.set_df_property(fieldname, 'reqd', 0);
                frm.refresh_field(fieldname);
            }
        });
    } else {
        // Status is NOT exempt, make fields mandatory
        console.log('Adding mandatory flags (non-exempt status)');
        mandatory_fields.forEach(fieldname => {
            const field = frm.fields_dict[fieldname];
            if (field) {
                frm.set_df_property(fieldname, 'reqd', 1);
                frm.refresh_field(fieldname);
            }
        });
    }
    
    // Final refresh to ensure all changes are visible
    frm.refresh_fields();
}

// Validate mandatory fields before save
function validate_mandatory_fields(frm) {
    // Skip for new documents
    if (frm.is_new()) {
        return true;
    }
    
    // If "Is Applicable" checkbox is not checked, don't require mandatory fields
    if (!frm.doc.is_applicable) {
        return true;
    }
    
    // If no status is selected, don't require mandatory fields
    if (!frm.doc.status) {
        return true;
    }
    
    // Statuses that don't require mandatory fields
    const exempt_statuses = [
        "New Lead", 
        "Not Connected", 
        "Fake Lead", 
        "Invalid Number", 
        "Duplicate Lead", 
        "Not Interested",
        "Connected"
    ];
    
    // If status is exempt, skip validation
    if (exempt_statuses.includes(frm.doc.status)) {
        return true;
    }
    
    // Fields to validate
    const missing_fields = [];
    
    // Check each mandatory field
    if (!frm.doc.distance) missing_fields.push("Distance");
    if (!frm.doc.middle_name) missing_fields.push("Middle Name");
    if (!frm.doc.last_name) missing_fields.push("Last Name");
    if (!frm.doc.age) missing_fields.push("Age");
    if (!frm.doc.profession) missing_fields.push("Profession");
    if (!frm.doc.mode) missing_fields.push("Mode");
    if (!frm.doc.current_treatment) missing_fields.push("Have you taken or currently taking any hair treatment?");
    if (!frm.doc.treatment_type) missing_fields.push("What treatment option you are interested in?");
    if (!frm.doc.planning_time) missing_fields.push("How soon you are planning to start hair treatment?");
    if (!frm.doc.consultation_type) missing_fields.push("What mode of consultation you like to have?");
    if (!frm.doc.family_history) missing_fields.push("Family History");
    
    // Check if at least one hair loss type is selected
    const hair_loss_selected = (
        frm.doc.hair_problem_hair_loss_check || 
        frm.doc.hair_problem_baldness_check || 
        frm.doc.hair_problem_handruff_check
    );
    if (!hair_loss_selected) {
        missing_fields.push("Select hair loss problem type (at least one)");
    }
    
    // Check if at least one baldness stage is selected
    const baldness_stage_selected = (
        frm.doc.i || frm.doc.ii || frm.doc.ii_a || frm.doc.iii || frm.doc.iii_a ||
        frm.doc.iii_vertex || frm.doc.iv || frm.doc.iv_a || frm.doc.v ||
        frm.doc.v_a || frm.doc.vi || frm.doc.vii
    );
    if (!baldness_stage_selected) {
        missing_fields.push("Select current level of baldness/hair loss stage (at least one)");
    }
    
    // If there are missing fields, show error and prevent save
    if (missing_fields.length > 0) {
        let message = `<b>The following fields are mandatory when status is '${frm.doc.status}':</b><br><br>`;
        message += missing_fields.map(field => `• ${field}`).join('<br>');
        
        frappe.msgprint({
            title: __('Mandatory Fields Required'),
            indicator: 'red',
            message: message
        });
        
        // Prevent save
        frappe.validated = false;
    }
    
    return true;
}
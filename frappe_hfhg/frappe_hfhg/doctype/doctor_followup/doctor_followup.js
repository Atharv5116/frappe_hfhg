// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Doctor Followup", {
	refresh(frm) {
        if ((!frm.is_new(), frm.doc.title)) {
            frm.add_custom_button("Show Conversations", function () {
              
                frappe.db.get_doc("Surgery", frm.doc.patient_name).then((surgery) => {
                    frappe.db.get_doc("Costing", surgery.patient).then((costing) => {
                        frappe.db.get_doc("Lead", costing.patient).then((lead) => {
                          if (lead.status !== "Duplicate Lead") {
                            // Use the same implementation as Lead doctype
                            showConversationsModal(lead);
                          } else {
                            frappe.msgprint({
                              title: "Error",
                              message: "Patient is a duplicate lead",
                              indicator: "orange",
                            });
                          }
                        });
                      });

                })  
            });
          }

	},
});

// Copy the exact implementation from Lead doctype
function showConversationsModal(leadDoc) {
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
      let desk_theme = response.message.desk_theme || "Light";

      const isDarkTheme = desk_theme.toLowerCase() === "dark";
      const modalBackgroundColor = isDarkTheme ? "#171717" : "#ffffff";
      const textColor = isDarkTheme ? "#f5f5f5" : "#000000";
      const buttonBackgroundColor = isDarkTheme ? "#444" : "light-gray";
      const closeButtonColor = isDarkTheme ? "#ff6b6b" : "#d32f2f";

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
        leadDoc.first_name
      }</h2>
                    <h2 style="color: ${
                      isDarkTheme ? "#c7c7c7" : "#525252"
                    }; font-weight: 500; font-size: 13px; margin-bottom: 6px;">Contact No.: ${
        leadDoc.contact_number
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

      document.body.insertAdjacentHTML("beforeend", modalHTML);

      document
        .getElementById("closeModal")
        .addEventListener("click", function () {
          document.getElementById("customModal").remove();
        });

      function formatDateTime(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();

        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const ampm = hours >= 12 ? "pm" : "am";
        hours = hours % 12;
        hours = hours ? hours : 12;

        return `${day}-${month}-${year}\n${hours}:${minutes} ${ampm}`;
      }

      const populateTable = (tableBody, items, isReminders = false) => {
        items.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        tableBody.innerHTML = "";
        items.forEach((item, index) => {
          const formattedDate = item.date ? formatDate(item.date) : "";
          const executive = item.executive || "";
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
        return `${day}-${month}-${year}`;
      }

      const updateTables = async () => {
        const remindersChanged = await auto_close_disabled_user_reminders(leadDoc.reminders || []);

        if (remindersChanged) {
          // Update the lead document
          leadDoc.reminders = leadDoc.reminders || [];
        }

        populateTable(
          document.querySelector("#conversationsTable tbody"),
          leadDoc.conversations || []
        );
        populateTable(
          document.querySelector("#remindersTable tbody"),
          leadDoc.reminders || [],
          true
        );
        makeCellsEditable();
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
            ? leadDoc.conversations
            : leadDoc.reminders;

          const field = cell.dataset.field;
          const originalValue = cell.innerText.trim();
          // Allow all conversations to be editable in Doctor Followup

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
                : "";
              input.style.width = "100%";
              if (this.closest("table").id === "remindersTable") {
                const today = new Date().toISOString().split("T")[0];
                input.setAttribute("min", today);
              }
            } else if (field === "status") {
              input = document.createElement("select");
              const openOption = new Option("Open", "Open");
              const closeOption = new Option("Close", "Close");
              input.add(openOption);
              input.add(closeOption);
              input.value = originalValue || "Open";
            } else {
              input = document.createElement("textarea");
              input.value = originalValue;
              input.style.width = "100%";
              input.rows = field === "description" ? 4 : 1;
            }

            this.innerHTML = "";
            this.appendChild(input);
            input.focus();

            input.addEventListener("blur", () => {
              const rowIndex = parseInt(this.parentElement.dataset.index);
              const items = this.closest("#conversationsTable")
                ? leadDoc.conversations
                : leadDoc.reminders;

              if (field === "date") {
                const dateValue = input.value || originalValue;
                items[rowIndex][field] = dateValue;
                // Format for display (dd-mm-yyyy)
                if (dateValue) {
                  const [year, month, day] = dateValue.split("-");
                  this.innerText = `${day}-${month}-${year}`;
                } else {
                  this.innerText = "";
                }
              } else {
                items[rowIndex][field] = input.value || originalValue;
                this.innerText = items[rowIndex][field];
              }
            });

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
        return `${year}-${month}-${day}`;
      }

      function saveCurrentEdits() {
        const allTables = [
          {
            selector: "#conversationsTable",
            items: leadDoc.conversations,
          },
          { selector: "#remindersTable", items: leadDoc.reminders },
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

        const newConversation = {};
        const today = new Date();
        const formattedDate = today.toISOString().split("T")[0];
        const currentUserInfo = frappe.user_info(frappe.session.user);
        const currentUserName = currentUserInfo.fullname;
        const currentDatetime = frappe.datetime.now_datetime();
        newConversation.date = formattedDate;
        newConversation.description = " ";
        newConversation.executive = currentUserName;
        newConversation.created_at = currentDatetime;
        if (!leadDoc.conversations) leadDoc.conversations = [];
        leadDoc.conversations.unshift(newConversation);
        updateTables();
      };

      document.getElementById("addReminder").onclick = async function () {
        saveCurrentEdits();

        const currentUserInfo = frappe.user_info(frappe.session.user);
        const currentUserName = currentUserInfo.fullname;
        const currentUserEmail = frappe.session.user;

        const userEnabled = await check_user_enabled(currentUserEmail);
        if (!userEnabled) {
          frappe.msgprint({
            title: __("Permission Denied"),
            message: __("You cannot create reminders because your user account is disabled or does not exist."),
            indicator: "red"
          });
          return;
        }

        const userHasOpenReminder = (leadDoc.reminders || []).some(
          (reminder) => reminder.status === "Open" && reminder.executive === currentUserName
        );

        if (userHasOpenReminder) {
          alert(
            "You already have an open reminder. Please close it before adding a new one."
          );
          return;
        }

        const newReminder = {};
        const currentDatetime = frappe.datetime.now_datetime();
        newReminder.date = "";
        newReminder.description = " ";
        newReminder.status = "Open";
        newReminder.executive = currentUserName;
        newReminder.created_at = currentDatetime;
        if (!leadDoc.reminders) leadDoc.reminders = [];
        leadDoc.reminders.unshift(newReminder);
        updateTables();
      };

      document.getElementById("saveChanges").onclick = function () {
        document.querySelectorAll(".editable").forEach((cell) => {
          const input = cell.querySelector("input, select, textarea");
          if (!input) return;

          const rowIndex = cell.parentElement.dataset.index;
          const isConversationsTable = cell.closest(
            "#conversationsTable"
          );
          const items = isConversationsTable
            ? leadDoc.conversations
            : leadDoc.reminders;
          const field = cell.dataset.field;
          const newValue = input.value.trim();

          if (newValue) {
            items[rowIndex][field] = newValue;
            cell.innerText = newValue;
          }
        });

        let isValid = true;
        (leadDoc.conversations || []).forEach((conversation, index) => {
          if (!conversation.date || !conversation.description.trim()) {
            isValid = false;
            alert(
              `Please fill the required details in conversation row ${
                index + 1
              }.`
            );
          }
        });
        (leadDoc.reminders || []).forEach((reminder, index) => {
          if (!reminder.date || !reminder.description.trim()) {
            isValid = false;
            alert(
              `Please fill the required details in reminder row ${
                index + 1
              }.`
            );
          }
        });

        if (isValid) {
          frappe.call({
            method: "frappe_hfhg.api.update_lead_conversations_and_reminders",
            args: {
              lead_name: leadDoc.name,
              conversations: JSON.stringify(leadDoc.conversations || []),
              reminders: JSON.stringify(leadDoc.reminders || []),
            },
            callback: function (r) {
              if (r.message) {
                frappe.show_alert({
                  message: __("Changes saved!"),
                  indicator: "green",
                });
              }
              document.getElementById("customModal").remove();
            },
            error: function (r) {
              frappe.msgprint(r.message);
              document.getElementById("customModal").remove();
            },
          });
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
}

// Helper functions from Lead doctype
function check_user_enabled(user_email) {
  return new Promise((resolve, reject) => {
    frappe.call({
      method: "frappe.client.get_value",
      args: {
        doctype: "User",
        fieldname: "enabled",
        filters: {
          name: user_email,
        },
      },
      callback: function (response) {
        if (response.message) {
          resolve(response.message.enabled === 1);
        } else {
          resolve(false);
        }
      },
      error: function (err) {
        console.error("Error checking user status:", err);
        resolve(false);
      },
    });
  });
}

async function auto_close_disabled_user_reminders(reminders) {
  let needsRefresh = false;

  for (let i = 0; i < reminders.length; i++) {
    const reminder = reminders[i];
    if (reminder.status === "Open" && reminder.executive) {
      const userEmail = await get_user_email_from_name(reminder.executive);

      if (userEmail) {
        const userEnabled = await check_user_enabled(userEmail);
        if (!userEnabled) {
          reminder.status = "Close";
          needsRefresh = true;
        }
      } else {
        reminder.status = "Close";
        needsRefresh = true;
      }
    }
  }

  return needsRefresh;
}

function get_user_email_from_name(fullname) {
  return new Promise((resolve, reject) => {
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "User",
        fields: ["name"],
        filters: {
          full_name: fullname,
        },
        limit_page_length: 1,
      },
      callback: function (response) {
        if (response.message && response.message.length > 0) {
          resolve(response.message[0].name);
        } else {
          resolve(null);
        }
      },
      error: function (err) {
        console.error("Error getting user email from name:", err);
        resolve(null);
      },
    });
  });
}

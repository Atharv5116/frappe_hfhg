frappe.ui.keys.add_shortcut({
  shortcut: "shift+ctrl+d",
  action: function () {
    frappe.set_route("appointment-calendar");
  },
  description: __("Appointment Calendar"),
});

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    $('a.item-anchor[title="HT Prospect"]').attr(
      "href",
      "/app/query-report/HT%20Prospect%20Report"
    );
  }, 2000);
});

frappe.provide("frappe.ui");
frappe.ui.Notifications = class Notifications extends frappe.ui.Notifications {
  constructor() {
    super();
    this.setup_observers();
  }

  setup_observers() {
    frappe.realtime.on("notification", function (data) {
      playNotificationSound();
    });
  }
};

function playNotificationSound() {
  const audio = new Audio("/files/notification-sound.mp3");
  audio.play().catch(function (error) {
    console.error("Error playing the sound:", error);
  });
}

window.MyUtils = {
  showConversations(leadFrm) {
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
          leadFrm.first_name
        }</h2>
                            <h2 style="color: ${
                              isDarkTheme ? "#c7c7c7" : "#525252"
                            }; font-weight: 500; font-size: 13px; margin-bottom: 6px;">Contact No.: ${
          leadFrm.contact_number
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
                                            isDarkTheme ? "#232323" : "#f3f3f3"
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
                                            isDarkTheme ? "#232323" : "#f3f3f3"
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
          items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
            leadFrm.conversations || []
          );
          populateTable(
            document.querySelector("#remindersTable tbody"),
            leadFrm.reminders || [],
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
            const isConversationsTable = cell.closest("#conversationsTable");
            const items = isConversationsTable
              ? leadFrm.conversations
              : leadFrm.reminders;

            const field = cell.dataset.field;
            const originalValue = cell.innerText.trim();
            const isDescriptionField = field === "description";
            if (
              isConversationsTable &&
              isDescriptionField &&
              items[rowIndex].name?.startsWith("new-")
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
                const rowIndex = this.parentElement.dataset.index;
                const items = this.closest("#conversationsTable")
                  ? leadFrm.conversations
                  : leadFrm.reminders;

                if (field === "date") {
                  const dateValue = input.value || originalValue;
                  items[rowIndex][field] = dateValue; // Date is already in yyyy-mm-dd format from the input
                } else {
                  items[rowIndex][field] = input.value || originalValue;
                }

                this.innerText = items[rowIndex][field];
                // leadFrm.refresh_field(
                //   this.closest("#conversationsTable")
                //     ? "conversations"
                //     : "reminders"
                // );
                // leadFrm.dirty();
              });

              // Save changes on Enter key
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
                  ? leadFrm.conversations
                  : leadFrm.reminders;

              tableItems.splice(index, 1); // Remove the selected item from the array
              // leadFrm.refresh_field(
              //   tableType === "conversationsTable"
              //     ? "conversations"
              //     : "reminders"
              // );
              updateTables(); // Refresh table display
              // leadFrm.dirty();
            });
          });
        }

        function saveCurrentEdits() {
          const allTables = [
            {
              selector: "#conversationsTable",
              items: leadFrm.conversations,
            },
            { selector: "#remindersTable", items: leadFrm.reminders },
          ];

          allTables.forEach(({ selector, items }) => {
            const rows = document.querySelectorAll(`${selector} tbody tr`);
            rows.forEach((row, index) => {
              const cells = row.querySelectorAll(".editable");
              cells.forEach((cell) => {
                const input = cell.querySelector("input, select, textarea");
                if (!input) return;

                const field = cell.dataset.field;
                if (!items[index]) items[index] = {};
                items[index][field] = input.value;
              });
            });
          });
        }

        document.getElementById("addConversation").onclick = function () {
          let tableBody = document.querySelector("#conversationsTable tbody");
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
          const formattedDate = today.toISOString().split("T")[0]; // Format date as yyyy-mm-dd
          const currentUserInfo = frappe.user_info(frappe.session.user);
          const currentUserName = currentUserInfo.fullname;
          const currentDatetime = frappe.datetime.now_datetime();
          newConversation.date = formattedDate;
          newConversation.description = " ";
          newConversation.executive = currentUserName;
          newConversation.created_at = currentDatetime;
          leadFrm.conversations.unshift(newConversation);
          updateTables();
        };

        document.getElementById("addReminder").onclick = function () {
          // Check if all reminders are closed
          const allClosed = leadFrm.reminders.every(
            (reminder) => reminder.status === "Close"
          );
          if (!allClosed) {
            alert(
              "You can only add a new reminder when all existing reminders are closed."
            );
            return;
          }
          saveCurrentEdits();

          const newReminder = {};
          const currentDatetime = frappe.datetime.now_datetime();
          const currentUserInfo = frappe.user_info(frappe.session.user);
          const currentUserName = currentUserInfo.fullname;
          newReminder.date = "";
          newReminder.description = " ";
          newReminder.status = "Open";
          newReminder.executive = currentUserName;
          newReminder.created_at = currentDatetime;
          leadFrm.reminders.unshift(newReminder);
          updateTables();
        };

        document.getElementById("saveChanges").onclick = function () {
          // Flush all editable fields before validating
          document.querySelectorAll(".editable").forEach((cell) => {
            const input = cell.querySelector("input, select, textarea");
            if (!input) return;

            const rowIndex = cell.parentElement.dataset.index;
            const isConversationsTable = cell.closest("#conversationsTable");
            const items = isConversationsTable
              ? leadFrm.conversations
              : leadFrm.reminders;
            const field = cell.dataset.field;
            const newValue = input.value.trim();

            if (newValue) {
              items[rowIndex][field] = newValue;
              cell.innerText = newValue;
            }
          });

          let isValid = true;
          leadFrm.conversations.forEach((conversation, index) => {
            if (!conversation.date || !conversation.description.trim()) {
              isValid = false;
              alert(
                `Please fill the required details in conversation row ${
                  index + 1
                }.`
              );
            }
          });
          leadFrm.reminders.forEach((reminder, index) => {
            if (!reminder.date || !reminder.description.trim()) {
              isValid = false;
              alert(
                `Please fill the required details in reminder row ${index + 1}.`
              );
            }
          });
          if (isValid) {
            frappe.call({
              method: "frappe_hfhg.api.update_lead_conversations_and_reminders",
              args: {
                lead_name: leadFrm.name,
                conversations: JSON.stringify(leadFrm.conversations),
                reminders: JSON.stringify(leadFrm.reminders),
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

        document.getElementById("customModal").onclick = function (event) {
          if (event.target === this) {
            document.getElementById("customModal").remove();
          }
        };
      },
    });
  },
};


document.addEventListener("DOMContentLoaded", () => {
  console.log("[Init] Script loaded");

  // Inject highlight styles
  const style = document.createElement("style");
  style.innerHTML = `
    .custom-highlight-cell {
      background-color: rgba(227, 24, 61, 0.9) !important;
      color: white !important;
    }
  `;
  document.head.appendChild(style);

  let selectedRowIndex = null;

  // Apply highlight to a specific row index
  function applyHighlight() {
    if (selectedRowIndex === null) return;

    const targetRow = document.querySelector(`.dt-row[data-row-index="${selectedRowIndex}"]`);
    if (targetRow) {
      targetRow.querySelectorAll(".dt-cell__content").forEach(cell => {
        cell.classList.add("custom-highlight-cell");
      });
    }
  }

  // Remove highlight from all rows
  function removeAllHighlights() {
    document.querySelectorAll(".dt-cell__content.custom-highlight-cell").forEach(cell => {
      cell.classList.remove("custom-highlight-cell");
    });
  }

  // Handle click/focus to highlight row
  function highlightRow(event) {
    const cell = event.target.closest(".dt-cell");
    const row = cell?.closest(".dt-row");

    if (row) {
      selectedRowIndex = row.getAttribute("data-row-index");

      removeAllHighlights();
      row.querySelectorAll(".dt-cell__content").forEach(cell => {
        cell.classList.add("custom-highlight-cell");
      });

      console.log(`[Highlight] Row ${selectedRowIndex} highlighted`);
    }
  }

  // Attach click/focus listeners to all cells
  function attachListeners() {
    const cellContents = document.querySelectorAll(".dt-cell__content");

    cellContents.forEach(cell => {
      if (!cell.classList.contains("listener-attached")) {
        cell.addEventListener("click", highlightRow);
        cell.addEventListener("focus", highlightRow);
        cell.classList.add("listener-attached");
      }
    });

    applyHighlight(); // Re-apply highlight on newly rendered rows
  }

  // Observe table changes continuously (don't disconnect)
  const observer = new MutationObserver(() => {
    attachListeners();
  });

  const waitForTable = setInterval(() => {
    const scrollable = document.querySelector(".dt-scrollable");
    if (scrollable) {
      observer.observe(scrollable, { childList: true, subtree: true });
      attachListeners();
      clearInterval(waitForTable);
      console.log("[Observer] Watching .dt-scrollable");
    }
  }, 300);
});

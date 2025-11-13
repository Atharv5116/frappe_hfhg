// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Surgery", {
  onload: function (frm) {
    // Always make surgery_date read-only
    frm.set_df_property("surgery_date", "read_only", 1);
    
    // Check if surgery date has passed and make all fields read-only
    if (!frm.is_new() && frm.doc.surgery_date) {
      const surgery_date_passed =
        frappe.datetime.str_to_obj(frm.doc.surgery_date) <
        frappe.datetime.str_to_obj(frappe.datetime.get_today());
      const pending_amount = frm.doc.pending_amount || 0;
      const should_lock = surgery_date_passed && pending_amount === 0;

      if (should_lock) {
        make_all_fields_read_only(frm);
      } else {
        make_fields_editable(frm);
      }
    }
    
    if (!frm.is_new()) {
      if (frm.doc.surgery_status == "Completed") {
        if (!frappe.user_roles.includes("System Manager")) {
          frm.set_df_property("surgery_date", "read_only", 1);
          frm.set_df_property("grafts", "read_only", 1);
          frm.set_df_property("graft_price", "read_only", 1);
          frm.set_df_property("total_amount", "read_only", 1);
          frm.set_df_property("discount_amount", "read_only", 1);
          frm.set_df_property("doctor", "read_only", 1);
          frm.set_df_property("center", "read_only", 1);
          frm.set_df_property("technique", "read_only", 1);
          frm.set_df_property("prp", "read_only", 1);
          frm.set_df_property("grafts_surgeries", "read_only", 1);
          frm.set_df_property("blood_test_table", "read_only", 1);
          frm.set_df_property("note", "read_only", 1);
          frm.set_df_property("bt_status", "read_only", 1);
        }
      }
    }
    if (!frappe.user_roles.includes("Backend")) {
      frm.set_df_property("bt_status", "read_only", 1);
    }
  },

  refresh(frm) {
    // Always make surgery_date read-only
    frm.set_df_property("surgery_date", "read_only", 1);
    
    if (!frm.is_new()) {
      // Add Upload Lead Image button
      if (frm.doc.patient) {
        frm.add_custom_button("Update Image", function () {
          show_unified_image_dialog(frm);
        });
      }
      
      if (frm.doc.status !== "Paid" && frm.doc.surgery_status != "Cancelled") {
        frm.add_custom_button(__("Get Discount"), function () {
          // Create and show the discount dialog
          show_discount_dialog(frm);
        });
      }
      
      // Check if surgery date has passed AND pending_amount is 0
      const surgery_date_passed =
        frm.doc.surgery_date &&
        frappe.datetime.str_to_obj(frm.doc.surgery_date) <
          frappe.datetime.str_to_obj(frappe.datetime.get_today());
      const pending_amount = frm.doc.pending_amount || 0;
      const should_hide_buttons = surgery_date_passed && pending_amount === 0;
      
      if (!["Cancelled", "Completed"].includes(frm.doc.surgery_status) && !should_hide_buttons) {
        frm.add_custom_button(__("Cancel Surgery"), function () {
          let d = new frappe.ui.Dialog({
            title: "Cancel Surgery",
            fields: [
              {
                fieldname: "cancel_type",
                fieldtype: "Select",
                label: "Cancel Type",
                options: "With Refund\nWithout Refund",
                reqd: 1,
              },
              {
                fieldname: "reason_for_cancel",
                fieldtype: "Data",
                label: "Reason for Cancel",
                reqd: 1,
              },
            ],
            primary_action_label: "Save",
            primary_action(values) {
              // Set values in the form
              frm.set_value("cancel_type", values.cancel_type);
              frm.set_value("reason_for_cancel", values.reason_for_cancel);
              frm.set_value("surgery_status", "Cancelled");

              frm.save().then(() => {
                frappe.msgprint(__("Surgery has been cancelled."));
                d.hide();

                if (values.cancel_type === "With Refund") {
                  // call get_dashboard_stats to get payment id
                  frappe.call({
                    method:
                      "frappe_hfhg.frappe_hfhg.doctype.surgery.surgery.get_dashboard_stats", // your current method
                    args: {
                      patient: frm.doc.patient,
                    },
                    callback: function (r) {
                      if (r.message && r.message.length > 0) {
                        let payment_info = r.message[0]; // Payment info
                        if (
                          payment_info &&
                          payment_info.value > 0 &&
                          payment_info.id
                        ) {
                          frappe.set_route("payment", "new", {
                            type: "Refund",
                            refund_payment_id: payment_info.id,
                          });
                        } else {
                          frappe.msgprint(
                            __("No payment found to create refund.")
                          );
                        }
                      } else {
                        frappe.msgprint(__("No payment information found."));
                      }
                    },
                  });
                }
              });
            },
          });

          d.show();
        });
      }

      if (!should_hide_buttons) {
        frm.add_custom_button(__("Postpone Surgery"), function () {
        let existing_entries = (frm.doc.postpone_surgery || []).map((row) => {
          return {
            postpone_date: row.postpone_date,
            reason: row.reason,
            old_date: row.old_date,
          };
        });

        let d = new frappe.ui.Dialog({
          title: "Manage Postponed Surgeries",
          fields: [
            {
              fieldname: "postpone_surgeries",
              fieldtype: "Table",
              label: "Postpone Surgeries",
              cannot_add_rows: 0,
              cannot_delete_rows: 1,
              in_place_edit: 1,
              fields: [
                {
                  label: "Postpone Date",
                  fieldname: "postpone_date",
                  fieldtype: "Date",
                  in_list_view: 1,
                },
                {
                  label: "Reason",
                  fieldname: "reason",
                  fieldtype: "Data",
                  reqd: 1,
                  in_list_view: 1,
                },
                {
                  label: "Old Date",
                  fieldname: "old_date",
                  fieldtype: "Date",
                  read_only: 1,
                  in_list_view: 1,
                },
              ],
              data: existing_entries,
            },
          ],
          primary_action_label: "Save",
          primary_action(values) {
            let new_data = d.fields_dict.postpone_surgeries.grid.get_data();

            frm.clear_table("postpone_surgery");

            // Loop and update each entry
            (new_data || []).forEach((entry) => {
              let row = frm.add_child("postpone_surgery");
              row.postpone_date = entry.postpone_date;
              row.reason = entry.reason;
              row.old_date = entry.old_date || frm.doc.surgery_date;
            });

            frm.refresh_field("postpone_surgery");

            // ✅ Logic to set surgery_date and surgery_status
            if (new_data && new_data.length > 0) {
              // Get the latest postpone_date
              let latest_postpone_date =
                new_data[new_data.length - 1].postpone_date;

              if (latest_postpone_date) {
                frm.set_value("surgery_date", latest_postpone_date);
                frm.set_value("surgery_status", "Booked");
              } else {
                frm.set_value("surgery_date", null);
                frm.set_value("surgery_status", "Hold");
              }
            } else {
              frm.set_value("surgery_date", null);
              frm.set_value("surgery_status", "Hold");
            }

            frm.save().then(() => {
              frappe.msgprint(__("Postponed Surgeries saved successfully."));
              d.hide();
            });
          },
        });

        d.show();
      });
      }

      frm.set_df_property("patient", "read_only", 1);
      setTimeout(() => {
        frappe.call({
          method:
            "frappe_hfhg.frappe_hfhg.doctype.surgery.surgery.get_dashboard_stats",
          args: { patient: frm.doc.name },
          callback: function (r) {
            if (r.message && r.message.length > 0) {
              let payment_container = frm.dashboard.links_area.body.find(
                `[data-doctype=Payment].document-link`
              );
              let payment_link = frm.dashboard.links_area.body.find(
                `[data-doctype=Payment].document-link-badge`
              );
              let payment_plusIcon = frm.dashboard.links_area.body.find(
                `[data-doctype=Payment].icon-btn.btn-new`
              );

              if (payment_link.length && payment_plusIcon.length) {
                payment_link.prepend(
                  `<span class="count">${r.message[0].value}</span>`
                );
                payment_link.on("click", () => {
                  frappe.set_route("List", "Payment", {
                    payment_type: "Surgery",
                    patient: frm.doc.name,
                  });
                });
                payment_plusIcon.hide();
                payment_container.append(
                  `<button class="btn btn-new btn-secondary btn-xs icon-btn" data-doctype="Payment" onclick="frappe.set_route('payment', 'new-payment', { 'payment_type': 'Surgery', 'patient': '${frm.doc.name}'})"><svg class="icon icon-sm"><use href="#icon-add"></use></svg></button>`
                );
                if (r.message[0].value == 0 || frm.doc.status != "Paid") {
                  frm.add_custom_button(__("Make a Payment"), function () {
                    frappe.set_route("payment", "new", {
                      payment_type: "Surgery",
                      patient: frm.doc.name,
                    });
                  });
                }
              }
              let refund_container = frm.dashboard.links_area.body.find(
                `[data-doctype=Refund].document-link`
              );

              if (r.message[0].value == 1 && !refund_container.length) {
                frm.dashboard.links_area.body.append(`
                    <div class="document-link" data-doctype="Refund">
                    <div class="document-link-badge" data-doctype="Refund"><span class="count">${r.message[1].value}</span>
                    <a class="badge-link" onclick="frappe.set_route('List', 'Payment', { 'type': 'Refund', 'refund_payment_id': '${r.message[0].id}'})">Refund</a></div>
                    <button class="btn btn-new btn-secondary btn-xs icon-btn" data-doctype="Payment" onclick="frappe.set_route('payment', 'new-payment', { 'type': 'Refund', 'refund_payment_id': '${r.message[0].id}'})">
                    <svg class="icon icon-sm"><use href="#icon-add"></use></svg></button></div>`);
              }

              if (
                r.message[0].value == 1 &&
                r.message[1].value == 0 &&
                frm.doc.surgery_status == "Cancelled"
              ) {
                frm.add_custom_button(__("Refund"), function () {
                  frappe.set_route("payment", "new", {
                    type: "Refund",
                    refund_payment_id: r.message[0].id,
                  });
                });
              }

              let followup_container = frm.dashboard.links_area.body.find(
                `[data-doctype="Doctor Followup"].document-link`
              );
              let followup_link = frm.dashboard.links_area.body.find(
                `[data-doctype="Doctor Followup"].document-link-badge`
              );
              let followup_plusIcon = frm.dashboard.links_area.body.find(
                `[data-doctype="Doctor Followup"].icon-btn.btn-new`
              );

              if (followup_link.length && followup_plusIcon.length) {
                followup_link.prepend(
                  `<span class="count">${r.message[2].value}</span>`
                );
                followup_link.on("click", () => {
                  frappe.set_route("List", "Doctor Followup", {
                    reference_type: "Surgery",
                    reference_name: frm.doc.name,
                  });
                });
                followup_plusIcon.hide();
                followup_container.append(
                  `<button class="btn btn-new btn-secondary btn-xs icon-btn" data-doctype="Doctor Followup" onclick="frappe.set_route('doctor-followup', 'new-followup', { 'reference_type': 'Surgery', 'reference_name': '${frm.doc.name}'})"><svg class="icon icon-sm"><use href="#icon-add"></use></svg></button>`
                );
              }
            }
          },
        });
      }, 0);
    }
    if ((!frm.is_new(), frm.doc.patient)) {
      frm.add_custom_button("Show Conversations", function () {
        frappe.db.get_doc("Costing", frm.doc.patient).then((costing) => {
          frappe.call({
            method: "frappe_hfhg.api.get_lead_ignoring_permissions",
            args: {
              lead_name: costing.patient,
            },
            callback: function (r) {
              if (r.message) {
                const lead = r.message;
                if (lead.status !== "Duplicate Lead") {
                  MyUtils.showConversations(lead);
                } else {
                  frappe.msgprint({
                    title: "Error",
                    message: "Patient is a duplicate lead",
                    indicator: "orange",
                  });
                }
              }
            },
          });
        });
      });
    }

    frm.trigger("toggle_grafts_read_only");
  },
  // doctor(frm) {
  //   if (frm.doc.doctor && !frm.doc.center) {
  //     frappe.msgprint({
  //       title: "Error",
  //       message: "Please select center",
  //       indicator: "orange",
  //     });
  //     frm.set_value("doctor", "");
  //     frm.refresh_field("doctor");
  //   }
  // },
  // center(frm) {
  //   if (frm.doc.center) {
  //     frm.set_query("doctor", function () {
  //       let filters = {
  //         center: ["=", frm.doc.center],
  //       };
  //       return {
  //         filters: filters,
  //       };
  //     });
  //   }
  // },
  grafts(frm) {
    if (frm.doc.graft_price != null && frm.doc.grafts != null) {
      frm.set_value("total_amount", frm.doc.grafts * frm.doc.graft_price);
      frm.set_value(
        "pending_amount",
        frm.doc.total_amount - (frm.doc.amount_paid + frm.doc.discount_amount)
      );
    }
  },
  amount_paid(frm) {
    if (frm.doc.amount_paid) {
      if (frm.doc.total_amount) {
        if (frm.doc.amount_paid > frm.doc.total_amount) {
          frappe.msgprint({
            title: "Error",
            message: "Amount paid cannot be greater than total package",
            indicator: "orange",
          });
          frm.set_value("amount_paid", 0);
        } else {
          frm.set_value(
            "pending_amount",
            frm.doc.total_amount -
              (frm.doc.amount_paid + frm.doc.discount_amount)
          );
        }
      } else {
        frappe.msgprint({
          title: "Error",
          message: "Please enter total package first",
          indicator: "orange",
        });
        frm.set_value("amount_paid", 0);
      }
    }
  },
  patient(frm) {
    if (frm.doc.patient) {
      frappe.call({
        method:
          "frappe_hfhg.frappe_hfhg.doctype.surgery.surgery.get_booking_details",
        args: { patient: frm.doc.patient },
        callback: function (r) {
          if (r.message) {
            frm.set_value("booking_date", r.message.booking_date);
            frm.set_value("center", r.message.center);
            frm.set_value("doctor", r.message.doctor);
            frm.set_value("surgery_date", r.message.surgery_date);
            frm.set_value("total_amount", r.message.total_amount);
            frm.set_value("grafts", r.message.grafts);
            frm.set_value("graft_price", r.message.graft_price);
            frm.set_value("amount_paid", r.message.amount_paid);
            frm.set_value(
              "pending_amount",
              r.message.pending_amount - frm.doc.discount_amount
            );
            frm.set_value("prp", r.message.prp);
            frm.set_value("technique", r.message.technique);
          }
        },
      });
    }
  },
  graft_price(frm) {
    if (frm.doc.graft_price != null && frm.doc.grafts != null) {
      frm.set_value("total_amount", frm.doc.graft_price * frm.doc.grafts);
      frm.set_value(
        "pending_amount",
        frm.doc.total_amount - (frm.doc.amount_paid + frm.doc.discount_amount)
      );
    }
  },
  total_amount(frm) {
    if (frm.doc.total_amount) {
      frm.set_value(
        "pending_amount",
        frm.doc.total_amount - frm.doc.amount_paid
      );
      if (frm.doc.grafts) {
        frm.set_value("graft_price", frm.doc.total_amount / frm.doc.grafts);
      }
    }
  },
  executive(frm) {
    if (frm.doc.executive) {
      frm.set_value("assign_by", frappe.session.user_email);
    }
  },
  surgery_date(frm) {
    // Always keep surgery_date read-only
    frm.set_df_property("surgery_date", "read_only", 1);
    
    frm.trigger("toggle_grafts_read_only");
    // Check if surgery date has passed and make all fields read-only
    if (!frm.is_new() && frm.doc.surgery_date) {
      const surgery_date_passed = 
        frappe.datetime.str_to_obj(frm.doc.surgery_date) < 
        frappe.datetime.str_to_obj(frappe.datetime.get_today());
      
      if (surgery_date_passed) {
        const pending_amount = frm.doc.pending_amount || 0;
        if (pending_amount === 0) {
          make_all_fields_read_only(frm);
        } else {
          make_fields_editable(frm);
        }
      } else {
        // If date is in future, make fields editable again (except those that should always be read-only)
        make_fields_editable(frm);
      }
    }
  },
  toggle_grafts_read_only(frm) {
    if (!frm.fields_dict.grafts_surgeries) return;
    const is_future =
      frm.doc.surgery_date &&
      frappe.datetime.str_to_obj(frm.doc.surgery_date) >
        frappe.datetime.str_to_obj(frappe.datetime.get_today());
    frm.fields_dict.grafts_surgeries.grid.update_docfield_property(
      "grafts",
      "read_only",
      is_future
    );
  },
});

function show_discount_dialog(frm) {
  // Create a new dialog
  let dialog = new frappe.ui.Dialog({
    title: __("Apply Discount"),
    fields: [
      {
        label: "Discount Type",
        fieldname: "discount_type",
        fieldtype: "Select",
        options: ["Amount", "Percentage"],
        default: "Amount",
        reqd: 1,
      },
      {
        label: "Discount Value",
        fieldname: "discount_value",
        fieldtype: "Float",
        reqd: 1,
      },
    ],
    primary_action_label: __("Apply"),
    primary_action: function (values) {
      apply_discount(frm, values);
      dialog.hide();
    },
  });

  // Show the dialog
  dialog.show();
}

function apply_discount(frm, values) {
  let pending_amount = frm.doc.pending_amount || 0;
  let curr_discount_amount = frm.doc.discount_amount || 0;
  let discount_value = values.discount_value;

  if (values.discount_type === "Percentage") {
    // Calculate discount as a percentage
    discount_value = (pending_amount * discount_value) / 100;
  }

  if (discount_value > pending_amount) {
    frappe.msgprint({
      title: "Error",
      message: "Discount value cannot be greater than pending amount",
      indicator: "orange",
    });
    return;
  }

  // Apply the discount to the pending amount
  let new_pending_amount = pending_amount - discount_value;

  // Update the pending amount field in the form
  frm.set_value("pending_amount", new_pending_amount);
  frm.set_value("discount_amount", curr_discount_amount + discount_value);

  // Refresh the form to reflect changes
  frm.refresh_field("pending_amount");
  frm.refresh_field("discount_amount");
}

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

// Helper function to make all fields read-only when surgery date has passed
function make_all_fields_read_only(frm) {
  // List of all main fields in Surgery doctype
  const fields_to_lock = [
    "surgery_date", "grafts", "graft_price", "total_amount", "discount_amount",
    "doctor", "center", "technique", "prp", "grafts_surgeries", 
    "blood_test_table", "note", "bt_status", "surgery_status", "status",
    "patient", "executive", "assign_by", "previous_executive", "executive_changed_date",
    "booking_date", "amount_paid", "pending_amount", "pending_grafts",
    "contact_number", "cancel_type", "reason_for_cancel", "postpone_surgery"
  ];
  
  fields_to_lock.forEach(field => {
    if (frm.fields_dict[field]) {
      frm.set_df_property(field, "read_only", 1);
    }
  });
  
  // Also lock child table fields
  if (frm.fields_dict.grafts_surgeries) {
    frm.fields_dict.grafts_surgeries.grid.update_docfield_property("grafts", "read_only", 1);
  }
  if (frm.fields_dict.blood_test_table) {
    frm.fields_dict.blood_test_table.grid.update_docfield_property("test_name", "read_only", 1);
    frm.fields_dict.blood_test_table.grid.update_docfield_property("test_result", "read_only", 1);
  }
  if (frm.fields_dict.postpone_surgery) {
    frm.fields_dict.postpone_surgery.grid.update_docfield_property("postpone_date", "read_only", 1);
    frm.fields_dict.postpone_surgery.grid.update_docfield_property("reason", "read_only", 1);
    frm.fields_dict.postpone_surgery.grid.update_docfield_property("old_date", "read_only", 1);
  }
}

// Helper function to make fields editable again (when date is in future)
function make_fields_editable(frm) {
  // Only make editable if surgery_status is not "Completed" or "Cancelled"
  if (frm.doc.surgery_status === "Completed" || frm.doc.surgery_status === "Cancelled") {
    return; // Don't make editable if status is Completed or Cancelled
  }
  
  const fields_to_unlock = [
    "grafts", "graft_price", "total_amount", "discount_amount",
    "doctor", "center", "technique", "prp", "note", "surgery_status",
    "executive", "assign_by", "amount_paid", "pending_amount", "pending_grafts",
    "contact_number", "cancel_type", "reason_for_cancel"
  ];
  
  fields_to_unlock.forEach(field => {
    if (frm.fields_dict[field]) {
      // Don't unlock patient, booking_date, surgery_date, or other fields that should always be read-only
      if (field !== "patient" && field !== "booking_date" && field !== "surgery_date") {
        frm.set_df_property(field, "read_only", 0);
      }
    }
  });
  
  // Keep grafts_surgeries read-only if date is in future (existing logic)
  if (frm.fields_dict.grafts_surgeries) {
    const is_future =
      frm.doc.surgery_date &&
      frappe.datetime.str_to_obj(frm.doc.surgery_date) >
        frappe.datetime.str_to_obj(frappe.datetime.get_today());
    frm.fields_dict.grafts_surgeries.grid.update_docfield_property("grafts", "read_only", is_future ? 1 : 0);
  }
  
  // Keep bt_status read-only for non-Backend users
  if (!frappe.user_roles.includes("Backend") && frm.fields_dict.bt_status) {
    frm.set_df_property("bt_status", "read_only", 1);
  }
}

// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Surgery", {
  onload: function (frm) {
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
    
    if (!frm.is_new()) {
      if (frm.doc.status !== "Paid" && frm.doc.surgery_status != "Cancelled") {
        frm.add_custom_button(__("Get Discount"), function () {
          // Create and show the discount dialog
          show_discount_dialog(frm);
        });
      }
      if (!["Cancelled", "Completed"].includes(frm.doc.surgery_status)) {
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
    frm.trigger("toggle_grafts_read_only");
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

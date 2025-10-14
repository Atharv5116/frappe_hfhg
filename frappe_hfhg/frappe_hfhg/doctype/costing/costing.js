// Copyright (c) 2024, redsoft and contributors...
// For license information, please see license.txt

frappe.ui.form.on("Costing", {
  onload: function (frm) {
    frm.set_query("patient", function () {
      return {
        filters: {
          status: ["!=", "Duplicate Lead"],
        },
      };
    });

    if (!frm.doc.book_date && frm.doc.status == "Prospect") {
      frm.set_df_property("surgery_date", "read_only", 1);
    }

    if (frm.doc.surgery_date) {
      if (
        frappe.user_roles.includes("Executive") &&
        !frappe.user_roles.includes("System Manager")
      ) {
        frm.set_df_property("surgery_date", "read_only", 1);
        frm.set_df_property("grafts", "read_only", 1);
        frm.set_df_property("graft_price", "read_only", 1);
        frm.set_df_property("total_amount", "read_only", 1);
        frm.set_df_property("doctor", "read_only", 1);
        frm.set_df_property("center", "read_only", 1);
        frm.set_df_property("technique", "read_only", 1);
        frm.set_df_property("prp", "read_only", 1);
        frm.set_df_property("note", "read_only", 1);
      }
    }
  },
  refresh(frm) {
    if (!frm.is_new()) {
      setTimeout(() => {
        frappe.call({
          method:
            "frappe_hfhg.frappe_hfhg.doctype.costing.costing.get_dashboard_stats",
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
                    payment_type: "Costing",
                    patient: frm.doc.name,
                  });
                });
                payment_plusIcon.hide();
                payment_container.append(
                  `<button class="btn btn-new btn-secondary btn-xs icon-btn" data-doctype="Payment" onclick="frappe.set_route('payment', 'new-payment', { 'payment_type': 'Costing', 'patient': '${frm.doc.name}'})"><svg class="icon icon-sm"><use href="#icon-add"></use></svg></button>`
                );
                if (r.message[0].value == 0) {
                  frm.add_custom_button(__("Make a Payment"), function () {
                    frappe.set_route("payment", "new", {
                      payment_type: "Costing",
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

              if (r.message[0].value == 1 && r.message[1].value == 0) {
                frm.add_custom_button(__("Refund"), function () {
                  frappe.set_route("payment", "new", {
                    type: "Refund",
                    refund_payment_id: r.message[0].id,
                  });
                });
              }
            }
          },
        });
      }, 0);
    }

    if ((!frm.is_new(), frm.doc.patient)) {
      frm.add_custom_button("Show Conversations", function () {
        frappe.call({
          method: "frappe_hfhg.api.get_lead_ignoring_permissions",
          args: {
            lead_name: frm.doc.patient,
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
    }
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
    if (frm.doc.grafts && frm.doc.graft_price) {
      frm.set_value("total_amount", frm.doc.grafts * frm.doc.graft_price);
      frm.set_value(
        "pending_amount",
        frm.doc.total_amount - frm.doc.amount_paid
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
            frm.doc.total_amount - frm.doc.amount_paid
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
  graft_price(frm) {
    if (frm.doc.graft_price && frm.doc.grafts) {
      frm.set_value("total_amount", frm.doc.graft_price * frm.doc.grafts);
      frm.set_value(
        "pending_amount",
        frm.doc.total_amount - frm.doc.amount_paid
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
  validate(frm) {
    const note = frm.doc.note;
    const maxChars = 1000;
    const charCount = note ? note.length : 0;

    if (charCount > maxChars) {
      frappe.msgprint({
        title: "Character Limit Exceeded",
        message: `The Note field cannot exceed ${maxChars} characters. You currently have ${charCount} characters.`,
        indicator: "orange",
      });
      frappe.validated = false;
    }
  },
  with_gst_amount: function (frm) {
    if (frm.doc.total_amount && frm.doc.with_gst_amount) {
      frm.set_value(
        "without_gst_amount",
        frm.doc.total_amount - frm.doc.with_gst_amount
      );
    }
  },
});

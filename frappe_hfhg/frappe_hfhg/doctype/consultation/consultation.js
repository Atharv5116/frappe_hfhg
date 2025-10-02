// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

let all_slots = [
  "12:00 AM",
  "12:30 AM",
  "01:00 AM",
  "01:30 AM",
  "02:00 AM",
  "02:30 AM",
  "03:00 AM",
  "03:30 AM",
  "04:00 AM",
  "04:30 AM",
  "05:00 AM",
  "05:30 AM",
  "06:00 AM",
  "06:30 AM",
  "07:00 AM",
  "07:30 AM",
  "08:00 AM",
  "08:30 AM",
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
  "06:30 PM",
  "07:00 PM",
  "07:30 PM",
  "08:00 PM",
  "08:30 PM",
  "09:00 PM",
  "09:30 PM",
  "10:00 PM",
  "10:30 PM",
  "11:00 PM",
  "11:30 PM",
];

const slotsOrderMap = new Map();
all_slots.forEach((day, index) => {
  slotsOrderMap.set(day, index);
});

let available_slots = [];

frappe.ui.form.on("Consultation", {
  onload(frm) {
    frm.set_query("patient", function () {
      return {
        filters: {
          status: ["!=", "Duplicate Lead"],
        },
      };
    });
    if (frm.is_new()) {
      frm.set_df_property("patient", "read_only", 0);
      frm.set_df_property("center", "read_only", 0);
      frm.set_df_property("payment", "read_only", 0);
      frm.set_df_property("total_amount", "read_only", 0);
      frm.set_df_property("mode", "read_only", 0);
      frm.set_df_property("date", "read_only", 0);
      frm.set_df_property("doctor", "read_only", 0);
      frm.set_df_property("slot", "read_only", 0);
    } else {
      frm.set_df_property("patient", "read_only", 1);
      frm.set_df_property("center", "read_only", 1);
      frm.set_df_property("total_amount", "read_only", 1);
      frm.set_df_property("mode", "read_only", 1);
      frm.set_df_property("date", "read_only", 1);
      frm.set_df_property("doctor", "read_only", 1);
      frm.set_df_property("slot", "read_only", 1);
      let roles = frappe.user_roles;
      if (
        roles.includes("Receptionist") ||
        roles.includes("Surbhi-backend") ||
        roles.includes("HOD") ||
        roles.includes("Marketing Head") ||
        roles.includes("Lead checker") ||
        roles.includes("Lead Distributor")
      ) {
        frm.set_df_property("status", "read_only", 0);
        frm.set_df_property("payment", "read_only", 0);
      } else {
        frm.set_df_property("status", "read_only", 1);
        frm.set_df_property("payment", "read_only", 1);
      }
    }
  },
  refresh(frm) {
    if (frm.is_new()) {
      frm.fields_dict.date.datepicker.update({
        minDate: new Date(frappe.datetime.get_today()),
      });
      frm.set_df_property("slot", "options", [""]);
      frm.set_df_property("patient", "read_only", 0);
      frm.set_df_property("center", "read_only", 0);
      frm.set_df_property("payment", "read_only", 0);
      frm.set_df_property("total_amount", "read_only", 0);
      frm.set_df_property("mode", "read_only", 0);
      frm.set_df_property("date", "read_only", 0);
      frm.set_df_property("doctor", "read_only", 0);
      frm.set_df_property("slot", "read_only", 0);
    }
    if (!frm.is_new()) {
      frm.set_df_property("patient", "read_only", 1);
      frm.set_df_property("center", "read_only", 1);
      frm.set_df_property("total_amount", "read_only", 1);
      frm.set_df_property("mode", "read_only", 1);
      if (frm.doc.status == "Not Visited") {
        frm.set_df_property("date", "read_only", 0);
        frm.set_df_property("slot", "read_only", 0);
      } else {
        frm.set_df_property("date", "read_only", 1);
        frm.set_df_property("slot", "read_only", 1);
      }
      frm.set_df_property("doctor", "read_only", 1);

      let roles = frappe.user_roles;
      if (
        roles.includes("Receptionist") ||
        roles.includes("Surbhi-backend") ||
        roles.includes("HOD") ||
        roles.includes("Marketing Head") ||
        roles.includes("Lead checker") ||
        roles.includes("Lead Distributor")
      ) {
        frm.set_df_property("status", "read_only", 0);
        frm.set_df_property("payment", "read_only", 0);
      } else {
        frm.set_df_property("status", "read_only", 1);
        frm.set_df_property("payment", "read_only", 1);
      }
      frm.add_custom_button(
        __("Reminders"),
        () => {
          frappe.set_route("lead", frm.doc.patient);
        },
        __("Create")
      );
    }

    if (!frm.is_new()) {
      frappe.call({
        method:
          "frappe_hfhg.frappe_hfhg.doctype.consultation.consultation.get_dashboard_stats",
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
                  payment_type: "Consultation",
                  patient: frm.doc.name,
                });
              });
              payment_plusIcon.hide();
              payment_container.append(
                `<button class="btn btn-new btn-secondary btn-xs icon-btn" data-doctype="Payment" onclick="frappe.set_route('payment', 'new-payment', { 'payment_type': 'Consultation', 'patient': '${frm.doc.name}'})"><svg class="icon icon-sm"><use href="#icon-add"></use></svg></button>`
              );
              if (r.message[0].value == 0) {
                frm.add_custom_button(__("Make a Payment"), function () {
                  frappe.set_route("payment", "new", {
                    payment_type: "Consultation",
                    patient: frm.doc.name,
                  });
                });
              }
            }
          }
        },
      });
    }

    if (frm.doc.status === "Spot Booking" || frm.doc.handle_by) {
      frm.set_df_property("handle_by", "hidden", 0);
    } else {
      frm.set_df_property("handle_by", "hidden", 1);
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
  doctor(frm) {
    if (!frm.doc.center && frm.doc.doctor) {
      frappe.msgprint({
        title: "Error",
        message: "Please select center",
        indicator: "orange",
      });
      frm.set_value("doctor", "");
      frm.refresh_field("doctor");
    } else {
      if (!frm.doc.doctor) {
        frm.set_value("date", "");
        frm.refresh_field("date");
        frm.set_value("slot", "");
        frm.refresh_field("slot");
      } else {
        if (!frm.doc.date) {
          frappe.call({
            method:
              "frappe_hfhg.frappe_hfhg.doctype.consultation.consultation.get_slots",
            args: {
              doctor: frm.doc.doctor,
            },
            callback: function (r) {
              if (r.message) {
                if (r.message.length > 0) {
                  available_slots = r.message;
                  frm.fields_dict.date.datepicker.update({
                    minDate: new Date(r.message[0].date),
                    maxDate: new Date(r.message[r.message.length - 1].date),
                  });
                }
                frm.set_value("date", "");
                frm.refresh_field("date");
                frm.set_value("slot", "");
                frm.refresh_field("slot");
              }
            },
          });
        } else {
          slots = available_slots
            .filter(
              (slot) =>
                slot.date == frm.doc.date &&
                slot.mode == frm.doc.mode &&
                slot.doctor == frm.doc.doctor
            )
            .map((e) => e.slot);
          frm.set_value("slot", "");
          frm.refresh_field("slot");
          if (slots.length == 0) {
            slots.push("");
            frm.set_df_property("slot", "options", slots);
          } else {
            slots.sort((a, b) => {
              return slotsOrderMap.get(a) - slotsOrderMap.get(b);
            });
            frm.set_df_property("slot", "options", slots);
          }
        }
      }
    }
  },
  date(frm) {
    if (!frm.doc.center && frm.doc.date) {
      frappe.msgprint({
        title: "Error",
        message: "Please select center",
        indicator: "orange",
      });
      frm.set_value("date", "");
      frm.refresh_field("date");
    } else {
      if (!frm.doc.date) {
        frm.set_value("slot", "");
        frm.refresh_field("slot");
        frm.set_query("doctor", function () {
          return {
            filters: {},
          };
        });
      } else {
        if (!frm.doc.doctor) {
          frappe.call({
            method:
              "frappe_hfhg.frappe_hfhg.doctype.consultation.consultation.get_doctors",
            args: {
              center: frm.doc.center,
              date: frm.doc.date,
            },
            callback: function (r) {
              if (r.message) {
                available_slots = r.message;
                if (available_slots.length > 0) {
                  frm.set_query("doctor", function () {
                    let filters = {
                      name: [
                        "in",
                        [...new Set(available_slots.map((e) => e.doctor))],
                      ],
                    };
                    return {
                      filters: filters,
                    };
                  });
                } else {
                  frm.set_df_property("doctor", "options", null);
                }
                frm.set_value("slot", "");
                frm.refresh_field("slot");
              }
            },
          });
        } else {
          slots = available_slots
            .filter(
              (slot) =>
                slot.date == frm.doc.date &&
                slot.mode == frm.doc.mode &&
                slot.doctor == frm.doc.doctor
            )
            .map((e) => e.slot);
          frm.set_value("slot", "");
          frm.refresh_field("slot");
          if (slots.length == 0) {
            slots.push("");
          } else {
            slots.sort((a, b) => {
              return slotsOrderMap.get(a) - slotsOrderMap.get(b);
            });
            frm.set_df_property("slot", "options", slots);
          }
        }
      }
    }
  },
  mode(frm) {
    if (frm.doc.date && frm.doc.doctor && frm.doc.mode) {
      slots = available_slots
        .filter(
          (slot) =>
            slot.date == frm.doc.date &&
            slot.mode == frm.doc.mode &&
            slot.doctor == frm.doc.doctor
        )
        .map((e) => e.slot);
      frm.set_value("slot", "");
      frm.refresh_field("slot");
      if (slots.length == 0) {
        slots.push("");
        frm.set_df_property("slot", "options", slots);
      } else {
        frm.set_df_property("slot", "options", slots);
      }
    }
  },
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
  executive(frm) {
    if (frm.doc.executive) {
      frm.set_value("assign_by", frappe.session.user_email);
    }
  },
  status(frm) {
    if (frm.doc.status === "Spot Booking") {
      frm.set_df_property("handle_by", "hidden", 0);
    } else {
      frm.set_df_property("handle_by", "hidden", 1);
    }
  },
});

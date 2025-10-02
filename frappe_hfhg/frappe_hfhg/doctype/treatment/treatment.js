// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Treatment", {
  refresh(frm) {
    if (!frm.is_new() && frm.doc.session_type === "Paid Session") {
      frappe.call({
        method:
          "frappe_hfhg.frappe_hfhg.doctype.treatment.treatment.get_dashboard_stats",
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
                  payment_type: "Treatment",
                  patient: frm.doc.name,
                });
              });
              payment_plusIcon.hide();
              payment_container.append(
                `<button class="btn btn-new btn-secondary btn-xs icon-btn" data-doctype="Payment" onclick="frappe.set_route('payment', 'new-payment', { 'payment_type': 'Treatment', 'patient': '${frm.doc.name}'})"><svg class="icon icon-sm"><use href="#icon-add"></use></svg></button>`
              );
              if (r.message[0].value == 0) {
                frm.add_custom_button(__("Make a Payment"), function () {
                  frappe.set_route("payment", "new", {
                    payment_type: "Treatment",
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
    }
  },
  patient(frm) {
    if (frm.is_new() && frm.doc.patient) {
      frappe.call({
        method:
          "frappe_hfhg.frappe_hfhg.doctype.treatment.treatment.get_treatment_details",
        args: { patient_id: frm.doc.patient },
        callback: function (r) {
          if (r.message) {
            frm.set_value("session", "Session" + r.message.session);
            frm.set_value(
              "session_type",
              r.message.paid ? "Paid Session" : "Free Session"
            );
            frm.set_value("status", r.message.paid ? "Not Paid" : "Free");
          }
        },
      });
    }
  },
});

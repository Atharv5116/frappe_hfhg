// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Center", {
  refresh(frm) {
    if (!frm.is_new()) {
      frm.add_custom_button(
        __("Doctor"),
        () => {
          frappe.set_route("doctor", "new", {
            center: frm.doc.name,
          });
        },
        __("Create")
      );
      frm.add_custom_button(
        __("Receptionist"),
        () => {
          frappe.set_route("receptionist", "new", {
            center: frm.doc.name,
          });
        },
        __("Create")
      );
    }
    frappe.call({
      method:
        "frappe_hfhg.frappe_hfhg.doctype.center.center.get_clinic_managers",
      callback: function (r) {
        if (r.message) {
          frm.set_query("clinic_manager", function () {
            return {
              filters: {
                name: ["in", r.message],
              },
            };
          });
        }
      },
    });
    frm.add_custom_button("Copy Details", function () {
  
      let htmlDetails = "<div>";
  
      if (frm.doc.city) {
          htmlDetails += `<div>Center: ${frm.doc.city}</div>`;
      }
      if (frm.doc.receptionist) {
        htmlDetails += `<div>Receptionist: ${frm.doc.receptionist}</div>`;
      }
      if (frm.doc.contact_number) {
          htmlDetails += `<div>Contact Number: ${frm.doc.contact_number}</div>`;
      }
      if (frm.doc.clinic_manager) {
        htmlDetails += `<div>Clinic Manager: ${frm.doc.clinic_manager}</div>`;
      }
      if (frm.doc.followup_doctor) {
        htmlDetails += `<div>Followup Doctor: ${frm.doc.followup_doctor}</div>`;
      }
      if (frm.doc.doctors) {
          htmlDetails += `<div>Doctors: ${frm.doc.doctors}</div>`;
      }
      
  
      htmlDetails += "</div>";
  
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = htmlDetails;
      document.body.appendChild(tempDiv);
  
      const range = document.createRange();
      range.selectNode(tempDiv);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
  
      try {
          document.execCommand("copy");
          frappe.show_alert({
              message: __("Center details copied!"),
              indicator: "green",
          });
      } catch (err) {
          frappe.msgprint("Failed to copy center details.");
      }
  
      document.body.removeChild(tempDiv);
  });
  
  },
});

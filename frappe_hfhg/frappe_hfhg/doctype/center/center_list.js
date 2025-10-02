frappe.listview_settings["Center"] = {
  hide_name_column: true,
  onload: function (listview) {
    listview.page.add_inner_button(__('Copy Details'), async function () {
      const selected = listview.get_checked_items();

      if (!selected.length) {
        frappe.msgprint("Please select at least one Center.");
        return;
      }

      let htmlDetails = "";

      for (let i = 0; i < selected.length; i++) {
        const item = selected[i];
        const doc = await frappe.db.get_doc('Center', item.name);

        let centerDetails = `<div style='margin-bottom: 1.5em; padding: 0.5em; border: 1px solid #ccc; border-radius: 6px;'>`;
        centerDetails += `<h4 style="margin-top:0;">Center ${i + 1}</h4>`;

        if (doc.city) {
          centerDetails += `<div>Center: ${doc.city}</div>`;
        }
        if (doc.receptionist) {
          centerDetails += `<div>Receptionist: ${doc.receptionist}</div>`;
        }
        if (doc.contact_number) {
          centerDetails += `<div>Contact Number: ${doc.contact_number}</div>`;
        }
        if (doc.clinic_manager) {
          centerDetails += `<div>Clinic Manager: ${doc.clinic_manager}</div>`;
        }
        if (doc.followup_doctor) {
          centerDetails += `<div>Followup Doctor: ${doc.followup_doctor}</div>`;
        }
        if (doc.doctors) {
          centerDetails += `<div>Doctors: ${doc.doctors}</div>`;
        }

        centerDetails += "</div>";

        htmlDetails += centerDetails;
      }

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
          message: __("All selected center details copied!"),
          indicator: "green",
        });
      } catch (err) {
        frappe.msgprint("Failed to copy center details.");
      }

      document.body.removeChild(tempDiv);
    });
  }
};

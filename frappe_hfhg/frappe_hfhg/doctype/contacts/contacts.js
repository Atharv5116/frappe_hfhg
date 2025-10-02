// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Contacts", {
  refresh(frm) {
    setTimeout(() => {
      frappe.call({
        method:
          "frappe_hfhg.frappe_hfhg.doctype.contacts.contacts.get_dashboard_stats",
        args: { contact: frm.doc.name },
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
                    contact: frm.doc.name,
                  });
                });
              }
            });
          }
        },
      });
    }, 0);
  },
});

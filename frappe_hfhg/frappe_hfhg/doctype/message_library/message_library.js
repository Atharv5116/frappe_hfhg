// Copyright (c) 2025, redsoft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Message Library", {
    onload(frm) {
        if (frm.is_new() && !frm.doc.created_by) {
            frm.set_value("created_by", frappe.session.user_fullname);
        }
    },
	refresh(frm) {
        frm.add_custom_button("Copy Message", function () {
            if (!frm.doc.message_title && !frm.doc.message_description) {
                frappe.msgprint("Message description is empty.");
                return;
            }
        
            const htmlContent = `
                <div>
                    <div>Title: ${frm.doc.message_title || ""}</div>
                    <div>${frm.doc.message_description || ""}</div>
                </div>
            `.trim();
        
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = htmlContent;
            document.body.appendChild(tempDiv);
        
            const range = document.createRange();
            range.selectNode(tempDiv);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        
            try {
                document.execCommand("copy");
                frappe.show_alert({
                    message: __("Message copied!"),
                    indicator: "green"
                });
            } catch (err) {
                frappe.msgprint("Failed to copy message.");
            }
        
            document.body.removeChild(tempDiv);
        });
        

	},
});

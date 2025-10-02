// Copyright (c) 2025, redsoft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Media Library", {
    onload(frm) {
        if (frm.is_new() && !frm.doc.created_by) {
            frm.set_value("created_by", frappe.session.user_fullname);
        }
    },
    refresh(frm) {
        frm.add_custom_button("Copy Media Link", function () {
    if (!frm.doc.media_link && !frm.doc.media_description) {
        frappe.msgprint("Media link and title are empty.");
        return;
    }

    const htmlContent = `
        <div>
            <div>Title: ${frm.doc.media_description || ""}</div>
            <div>${frm.doc.media_link || ""}</div>
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
            message: __("Media link copied with title!"),
            indicator: "green"
        });
    } catch (err) {
        frappe.msgprint("Failed to copy media link.");
    }

    document.body.removeChild(tempDiv);
});

    }
});


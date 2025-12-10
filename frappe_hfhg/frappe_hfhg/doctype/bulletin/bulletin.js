// Copyright (c) 2025, redsoft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Bulletin", {
	refresh: function(frm) {
		// Hide the preview button (eye icon)
		if (frm.page && frm.page.actions) {
			// Hide standard preview button
			const previewBtn = frm.page.actions.find('.btn-preview');
			if (previewBtn && previewBtn.length) {
				previewBtn.hide();
			}
			
			// Also try to hide via menu actions
			const menuActions = frm.page.actions.find('.menu-btn-group');
			if (menuActions && menuActions.length) {
				menuActions.find('.btn-preview').hide();
			}
		}
		
		// Hide preview button using jQuery selector
		setTimeout(function() {
			$('.btn-preview, [data-label="Preview"], .form-actions .btn[title*="Preview"]').hide();
		}, 100);
	},
	
	validate: function(frm) {
		// Validate date range
		if (frm.doc.start_date && frm.doc.end_date) {
			if (frm.doc.start_date > frm.doc.end_date) {
				frappe.msgprint(__("Start Date cannot be after End Date."));
				frappe.validated = false;
			}
		}
	}
});


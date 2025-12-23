// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Upcoming Surgeries Report"] = {
	filters: [
		{
			fieldname: "center",
			label: __("Center"),
			fieldtype: "Link",
			options: "Center",
			get_query: function() {
				return {
					query: "frappe_hfhg.frappe_hfhg.report.upcoming_surgeries_report.upcoming_surgeries_report.get_assigned_centers_for_filter"
				};
			},
		},
		{
			fieldname: "surgery_status",
			label: __("Surgery Status"),
			fieldtype: "Select",
			options: ["", "Booked", "Partially Completed", "Completed", "Cancelled", "Hold"],
		},
		{
			fieldname: "doctor",
			label: __("Doctor"),
			fieldtype: "Link",
			options: "Doctor",
		},
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_days(frappe.datetime.get_today(), 6),
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_days(frappe.datetime.get_today(), 6),
		},
	],
	
	onload: function(report) {
		const sevenDaysFromNow = frappe.datetime.add_days(frappe.datetime.get_today(), 6);
		report.page.fields_dict.from_date.set_value(sevenDaysFromNow);
		report.page.fields_dict.to_date.set_value(sevenDaysFromNow);

		// Delegate checkbox change to update the linked Surgery record
		$(document).off('change', '.surgery-check-toggle').on('change', '.surgery-check-toggle', function() {
			const checkbox = $(this);
			const surgeryId = checkbox.data('surgery-id');

			if (!surgeryId) {
				return;
			}

			const checked = checkbox.is(':checked') ? 1 : 0;
			checkbox.prop('disabled', true);

			frappe.call({
				method: "frappe_hfhg.frappe_hfhg.report.upcoming_surgeries_report.upcoming_surgeries_report.update_surgery_checked",
				args: {
					surgery_id: surgeryId,
					checked: checked
				}
			}).then(() => {
				frappe.show_alert(
					{
						message: checked ? __('Marked in Surgery') : __('Unmarked in Surgery'),
						indicator: checked ? 'green' : 'gray'
					},
					2
				);
			}).catch(() => {
				checkbox.prop('checked', !checked);
				frappe.msgprint(__('Could not update the Surgery record. Please try again.'));
			}).finally(() => {
				checkbox.prop('disabled', false);
			});
		});
	},

	formatter: function(value, row, column, data, default_formatter) {
		if (column.fieldname === "surgery_checked") {
			const surgeryId = data.surgery_id || "";
			const checkedAttr = value ? "checked" : "";
			return `<input type="checkbox" class="surgery-check-toggle" data-surgery-id="${surgeryId}" ${checkedAttr}>`;
		}
		return default_formatter(value, row, column, data);
	},
};


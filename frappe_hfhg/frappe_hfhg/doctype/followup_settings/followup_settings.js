// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

let followup_map = [
  { followup: 1, days: 1, label: "Bandage Removal (1st post-transplant call)" },
  { followup: 2, days: 4, label: "Head Wash Follow-Up Call" },
  { followup: 3, days: 6, label: "Post Head Wash Feedback Call + Scalp Pictures + Medication Guidance" },
  { followup: 4, days: 9, label: "Minoxidil Application Guidance Call" },
  { followup: 5, days: 19, label: "Baby Hair & Shedding Phase Review + 1st PRP Session" },
  { followup: 6, days: 29, label: "Monthly hair growth follow up 1" },
  { followup: 7, days: 59, label: "Monthly hair growth follow up 2" },
  { followup: 8, days: 89, label: "Monthly hair growth follow up 3" },
  { followup: 9, days: 119, label: "Monthly hair growth follow up 4" },
  { followup: 10, days: 149, label: "Monthly hair growth follow up 5" },
  { followup: 11, days: 179, label: "Monthly hair growth follow up 6" },
  { followup: 12, days: 209, label: "Monthly hair growth follow up 7" },
  { followup: 13, days: 239, label: "Monthly hair growth follow up 8" },
  { followup: 14, days: 269, label: "Monthly hair growth follow up 9" },
  { followup: 15, days: 299, label: "Monthly hair growth follow up 10" },
  { followup: 16, days: 329, label: "Monthly hair growth follow up 11" },
  { followup: 17, days: 359, label: "Monthly hair growth follow up 12" },
  { followup: 18, days: 389, label: "Final Follow-up" },
];
frappe.ui.form.on("Followup Settings", {
  refresh(frm) {},
  followups: function (frm) {
    if (frm.doc.followups) {
      frm.clear_table("followup_intervals");
      for (var i = 0; i < frm.doc.followups; i++) {
        var followup_data = followup_map[i] || { 
          followup: i + 1, 
          days: 30 * (i + 1), 
          label: `Followup ${i + 1}` 
        };
        frm.add_child("followup_intervals", {
          followup: `Followup ${followup_data.followup}`,
          days: followup_data.days,
          label: followup_data.label || `Followup ${i + 1}`,
        });
      }
    }

    frm.refresh_field("followup_intervals");
  },
  onload: function (frm) {
    // Initialize table if empty
    if (!frm.doc.followup_intervals || frm.doc.followup_intervals.length === 0) {
      if (frm.doc.followups) {
        frm.clear_table("followup_intervals");
        for (var i = 0; i < frm.doc.followups; i++) {
          var followup_data = followup_map[i] || { 
            followup: i + 1, 
            days: 30 * (i + 1), 
            label: `Followup ${i + 1}` 
          };
          frm.add_child("followup_intervals", {
            followup: `Followup ${followup_data.followup}`,
            days: followup_data.days,
            label: followup_data.label || `Followup ${i + 1}`,
          });
        }
        frm.refresh_field("followup_intervals");
      }
    }
    // Allow editing of days and labels, but not followup number
    frm.fields_dict["followup_intervals"].grid.cannot_add_rows = true;
    frm.fields_dict["followup_intervals"].grid.cannot_delete_rows = true;
    frm.refresh_field("followup_intervals");
  },
});

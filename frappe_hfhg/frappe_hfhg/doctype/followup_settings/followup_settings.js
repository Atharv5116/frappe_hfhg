// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

let followup_map = [
  { followup: "Dressing details", days: 1 },
  { followup: "Normal hair wash", days: 4 },
  { followup: "Gillette hair done wash / Clot removal", days: 6 },
  { followup: "Start hair growth medication", days: 9 },
  { followup: "Start hair grwoth solution", days: 19 },
  { followup: "Shedding phase", days: 29 },
  { followup: "Monthly hair growth follow up 1", days: "month" },
  { followup: "Monthly hair growth follow up 2", days: "month" },
  { followup: "Monthly hair growth follow up 3", days: "month" },
  { followup: "Monthly hair growth follow up 4", days: "month" },
  { followup: "Monthly hair growth follow up 5", days: "month" },
  { followup: "Monthly hair growth follow up 6", days: "month" },
  { followup: "Monthly hair growth follow up 7", days: "month" },
  { followup: "Monthly hair growth follow up 8", days: "month" },
  { followup: "Monthly hair growth follow up 9", days: "month" },
  { followup: "Monthly hair growth follow up 10", days: "month" },
  { followup: "Monthly hair growth follow up 11", days: "month" },
  { followup: "Monthly hair growth follow up 12", days: "month" },
];
frappe.ui.form.on("Followup Settings", {
  refresh(frm) {},
  followups: function (frm) {
    if (frm.doc.followups) {
      frm.clear_table("followup_intervals");
      for (var i = 0; i < frm.doc.followups; i++) {
        frm.add_child("followup_intervals", {
          followup: followup_map[i].followup,
          days:
            followup_map[i].days == "month"
              ? followup_map[5].days + (i - 5) * 30
              : followup_map[i].days,
        });
      }
    }

    frm.refresh_field("followup_intervals");
  },
  onload: function (frm) {
    frm.fields_dict["followup_intervals"].grid.cannot_add_rows = true;
    frm.fields_dict["followup_intervals"].grid.cannot_delete_rows = true;
    frm.refresh_field("followup_intervals");
  },
});

frappe.listview_settings["Doctor Followup"] = {
  hide_name_column: true,
  onload: function (listview) {
    $(".layout-side-section").hide();
    
    const today = frappe.datetime.get_today();
      listview.filter_area.add([
        ["Doctor Followup", "date", "=", today],
      ]);
    
  },
};

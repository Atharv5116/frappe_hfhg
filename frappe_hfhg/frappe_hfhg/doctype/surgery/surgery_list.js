frappe.listview_settings["Surgery"] = {
  render_row_style: function (listview) {
    listview.data.forEach((doc, i) => {
      let row = listview.$result.find(`.list-row-container:nth-child(${i + 3})`);
      if (doc.surgery_date) {
        row.css("background-color", "rgb(0, 255, 127)");
      } 
    });
  },

  onload: function (listview) {
    this.render_row_style(listview);
  },

  refresh: function (listview) {
    this.render_row_style(listview);
  }
};

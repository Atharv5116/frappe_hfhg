frappe.listview_settings["Consultation"] = {
  render_row_style: function (listview) {
    listview.data.forEach((doc, i) => {
      let row = listview.$result.find(`.list-row-container:nth-child(${i + 3})`);
      if (doc.status === "Booked") {
        row.css("background-color", "rgb(70, 130, 180)");
      } else if (doc.status === "Non Booked") {
        row.css("background-color", "rgb(255, 140, 0)");
      } else if (doc.status === "Medi-PRP") {
        row.css("background-color", "rgb(255, 255, 0)");
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

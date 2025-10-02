frappe.listview_settings["Lead"] = {
  hide_name_column: true,
  onload: function (listview) {
    $(".layout-side-section").hide();

    this.render_row_style(listview);
    is_executive = frappe.db.exists("Executive", frappe.session.user_fullname);
    if (is_executive) {
      listview.filter_area.add([
        ["Lead", "executive", "=", frappe.session.user_fullname],
      ]);
    }
  },
  refresh: function (listview) {
    var columnIndex = $('div.dt-cell__content[title="Contact Number"]')
      .closest(".dt-cell")
      .index();
    $("div.dt-cell").each(function () {
      if ($(this).index() === columnIndex) {
        $(this).find(".dt-cell__content").css("width", "170px");
      }
    });
    this.render_row_style(listview);
  },
  render_row_style: function (listview) {
    listview.data.forEach((doc, i) => {
      let row = listview.$result.find(
        `.list-row-container:nth-child(${i + 3})`
      );
      if (doc.status === "Not Connected" || doc.status === "Invalid Number") {
        row.css("background-color", "rgb(205, 92, 92)");
      } else if (doc.status === "Fake Lead" || doc.status === "Not Interested") {
        row.css("background-color", "rgb(255, 105, 180)");
      } else if (doc.status === "HT Done") {
        row.css("background-color", "rgb(34, 139, 34)");
      } else if (doc.status === "HT CS Done") {
        row.css("background-color", "rgb(255, 140, 0)");
      } else if (doc.status === "Medi/PRP") {
        row.css("background-color", "rgb(255, 255, 0)");
      } else if (doc.status === "HT Prospect") {
        row.css("background-color", "rgb(0, 255, 255)");
      } else if (doc.status === "Booked") {
        row.css("background-color", "rgb(70, 130, 180)");
      } else if (doc.status === "Budget Issue") {
        row.css("background-color", "rgb(221, 160, 221)");
      } else if (doc.status === "Date Given") {
        row.css("background-color", "rgb(0, 255, 127)");
      } else if (doc.status === "HT Not Possible") {
        row.css("background-color", "rgb(192, 192, 192)");
      } else if (doc.status === "HT Postpone") {
        row.css("background-color", "rgb(188, 143, 143)");
      } else if (doc.status === "Duplicate Lead") {
        if (doc.attended === "Yes") {
          row.css("background-color", "rgb(255, 160, 122)");
        }
      }
    });
    listview.data.forEach((doc, i) => {
      let row = listview.$result.find(`.dt-row:nth-child(${i + 2})`);
      let color;
      if (doc.status === "Not Interested") {
        color = "rgba(242, 48, 48, 0.4)";
      } else if (doc.status === "HT Done") {
        color = "rgba(44, 242, 120, 0.4)";
      } else if (doc.status === "HT CS Done") {
        color = "rgba(235, 128, 35, 0.4)";
      } else if (doc.status === "Costing Done") {
        color = "rgba(35, 88, 235, 0.4)";
      } else if (doc.status === "Duplicate Lead") {
        if (doc.attended === "Yes") {
          row.css("background-color", "rgba(44, 242, 120, 0.4)");
        }
      }
      row
        .find(".dt-cell")
        .not(".dt-cell--filter")
        .each(function () {
          $(this).attr("style", `background-color: ${color} !important;`);
        });
    });
  },
};

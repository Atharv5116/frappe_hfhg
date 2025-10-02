// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.query_reports["Executive Business Report"] = {
  onload: function (report) {
    $(document).ready(function () {
      const breadcrumbContainer = $("#navbar-breadcrumbs");
      const breadcrumbExists =
        breadcrumbContainer.find('a[href="/app/surgery/view/list"]').length > 0;

      if (breadcrumbContainer.length && !breadcrumbExists) {
        const newBreadcrumb = $(
          '<li><a href="/app/surgery/view/list">Surgery</a></li>'
        );

        breadcrumbContainer.append(newBreadcrumb);
      }
    });
  },
  filters: [
    {
      fieldname: "from_date",
      label: __("From Date"),
      fieldtype: "Date",
      reqd: 1,
      default: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    },
    {
      fieldname: "to_date",
      label: __("To Date"),
      fieldtype: "Date",
      reqd: 1,
      default: new Date(),
    },
  ],
};

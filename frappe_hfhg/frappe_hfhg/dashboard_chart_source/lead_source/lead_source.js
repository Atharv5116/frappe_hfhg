frappe.provide("frappe.desk.doctype.dashboard_chart_source.dashboard_chart_source");


frappe.desk.doctype.dashboard_chart_source.dashboard_chart_source['Lead Source'] = {
    method: "frappe_hfhg.dashboard_chart_source.lead_source.lead_source.get_consultation_lead_source_data",
    
    chart_type: "Bar",
    color: "blue",
};

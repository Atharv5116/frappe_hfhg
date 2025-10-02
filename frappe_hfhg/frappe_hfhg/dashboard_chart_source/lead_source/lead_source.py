import frappe

@frappe.whitelist()
def get_consultation_lead_source_data():
    data = frappe.db.sql("""
        SELECT lead_source, COUNT(patient) AS count
        FROM `tabConsultation`
        GROUP BY lead_source
    """, as_dict=True)

    labels = [d['lead_source'] for d in data]
    values = [d['count'] for d in data]

    return {
        "labels": labels,
        "datasets": [{
            "name": "Consultations by Lead Source",
            "values": values
        }]
    }

import frappe

def after_install():
    if not frappe.db.exists('Workspace', 'HFHG'):
        create_custom_workspace()

    frappe.db.commit()

def create_custom_workspace():
    workspace = frappe.get_doc({
        'doctype': 'Workspace',
        'name': 'HFHG',
        "label": 'HFHG',
        "title": 'HFHG',
        'icon': 'milestone',
        "module": 'Frappe Hfhg',
        "is_enabled": 1,
        'public': 1,
        "content": "[{\"type\":\"header\",\"data\":{\"text\":\"HFHG\"}},{\"type\":\"shortcut\",\"data\":{\"shortcut_name\":\"Receptionist\"}},{\"type\":\"shortcut\",\"data\":{\"shortcut_name\":\"Lead\"}}, {\"type\":\"shortcut\",\"data\":{\"shortcut_name\":\"Executive\"}}, {\"type\":\"shortcut\",\"data\":{\"shortcut_name\":\"Doctor\"}}, {\"type\":\"shortcut\",\"data\":{\"shortcut_name\":\"Center\"}}, {\"type\":\"shortcut\",\"data\":{\"shortcut_name\":\"Consultation\"}},{\"type\":\"shortcut\",\"data\":{\"shortcut_name\":\"Doctor Followup\"}}]",
        "selected": 1,
        "shortcuts": [
            {
                "label": "Receptionist",
                "link_to": "Receptionist",
                "type": "DocType",
                "doc_view": "List",
                "color": "Grey"
            },
            {
                "label": "Lead",
                "link_to": "Lead",
                "type": "DocType",
                "doc_view": "List",
                "color": "Grey"
            },
            {
                "label": "Executive",
                "link_to": "Executive",
                "type": "DocType",
                "doc_view": "List",
                "color": "Grey"
            },
            {
                "label": "Doctor",
                "link_to": "Doctor",
                "type": "DocType",
                "doc_view": "List",
                "color": "Grey"
            },
            {
                "label": "Center",
                "link_to": "Center",
                "type": "DocType",
                "doc_view": "List",
                "color": "Grey"
            },
            {
                "label": "Consultation",
                "link_to": "Consultation",
                "type": "DocType",
                "doc_view": "List",
                "color": "Grey"
            },
            {
                "label": "Doctor Followup",
                "link_to": "Doctor Followup",
                "type": "DocType",
                "doc_view": "List",
                "color": "Grey"
            }
        ]
    })

    workspace.insert(ignore_permissions=True)

    frappe.clear_cache()
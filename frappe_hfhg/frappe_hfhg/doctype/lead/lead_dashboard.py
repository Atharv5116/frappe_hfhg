from frappe import _


def get_data():
	return { "transactions": [{"label": _("Reference"), "items": ["Consultation", "Costing", "Surgery"]}]}

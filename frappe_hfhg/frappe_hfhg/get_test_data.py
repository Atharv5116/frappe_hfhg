import frappe
import json

frappe.init(site="hfhg", sites_path="sites")
frappe.connect()

def get_info():
    surgery = frappe.db.get_list('Surgery', limit=1)
    lead = frappe.db.get_list('Lead', limit=1)
    costing = frappe.db.get_list('Costing', limit=1)
    
    user = frappe.get_doc('User', 'Administrator')
    if not user.api_key:
        user.api_key = frappe.generate_hash(length=15)
    api_secret = user.get_password('api_secret')
    if not api_secret:
        api_secret = frappe.generate_hash(length=15)
        user.api_secret = api_secret
    user.save(ignore_permissions=True)
    frappe.db.commit()
    
    print(json.dumps({
        "surgery": surgery[0].name if surgery else None,
        "lead": lead[0].name if lead else None,
        "costing": costing[0].name if costing else None,
        "api_key": user.api_key,
        "api_secret": api_secret
    }, indent=4))

if __name__ == "__main__":
    get_info()

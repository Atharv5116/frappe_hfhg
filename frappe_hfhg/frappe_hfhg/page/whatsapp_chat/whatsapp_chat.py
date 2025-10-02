import frappe

no_cache = 1

def get_context():
    """Inject CSRF token into the Desk Page context"""
    # context.csrf_token = frappe.sessions.get_csrf_token()
    frappe.db.commit()  # nosemgrep
    context = frappe._dict()
    context.boot = get_boot()
    return context


@frappe.whitelist(methods=["POST"], allow_guest=True)
def get_context_for_dev():
    if not frappe.conf.developer_mode:
        frappe.throw("This method is only meant for developer mode")
    return get_boot()

def get_boot():
    return frappe._dict(
        {
            "frappe_version": frappe.__version__,
            "site_name": frappe.local.site,
            "read_only_mode": frappe.flags.read_only,
            "csrf_token": frappe.sessions.get_csrf_token(),
        }
    )


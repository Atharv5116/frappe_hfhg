app_name = "frappe_hfhg"
app_title = "Frappe Hfhg"
app_publisher = "redsoft"
app_description = "hfhg"
app_email = "ashish.barvaliya@redsoftware.in"
app_license = "mit"
# required_apps = []

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "assets/frappe_hfhg/js/appointment_ui.bundle.css"
app_include_js = [
    "/assets/frappe_hfhg/js/app_customizations.js"
]

# include js, css files in header of web template
# web_include_css = "/assets/frappe_hfhg/css/frappe_hfhg.css"
# web_include_js = "/assets/frappe_hfhg/js/frappe_hfhg.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "frappe_hfhg/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "frappe_hfhg/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
#	"methods": "frappe_hfhg.utils.jinja_methods",
#	"filters": "frappe_hfhg.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "frappe_hfhg.install.before_install"
# after_install = "frappe_hfhg.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "frappe_hfhg.uninstall.before_uninstall"
# after_uninstall = "frappe_hfhg.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "frappe_hfhg.utils.before_app_install"
# after_app_install = "frappe_hfhg.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "frappe_hfhg.utils.before_app_uninstall"
# after_app_uninstall = "frappe_hfhg.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "frappe_hfhg.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
#	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
#	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
#	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
    "WhatsApp Message": {
        "validate": ["frappe_hfhg.api.whatsapp.validate"],
        "on_update": ["frappe_hfhg.api.whatsapp.on_update"],
        # "after_insert": "frappe_hfhg.tasks.whatsapp_message_notification"
    },
    "Meta Ads": {
        "validate": ["frappe_hfhg.api.meta_ads.clean_meta_ads_name"],
    },
    "Lead": {
        "before_insert": ["frappe_hfhg.api.set_meta_lead_source"],
        "after_insert": ["frappe_hfhg.api.after_insert_lead_logs"],
    }
}

# doc_events = {
#	"*": {
#		"on_update": "method",
#		"on_cancel": "method",
#		"on_trash": "method"
#	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
#	"all": [
#		"frappe_hfhg.tasks.all"
#	],
#	"daily": [
#		"frappe_hfhg.tasks.daily"
#	],
#	"hourly": [
#		"frappe_hfhg.tasks.hourly"
#	],
#	"weekly": [
#		"frappe_hfhg.tasks.weekly"
#	],
#	"monthly": [
#		"frappe_hfhg.tasks.monthly"
#	],
# }

# Testing
# -------

# before_tests = "frappe_hfhg.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
#	"frappe.desk.doctype.event.event.get_events": "frappe_hfhg.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
#	"Task": "frappe_hfhg.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["frappe_hfhg.utils.before_request"]
# after_request = ["frappe_hfhg.utils.after_request"]

# Job Events
# ----------
# before_job = ["frappe_hfhg.utils.before_job"]
# after_job = ["frappe_hfhg.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
#	{
#		"doctype": "{doctype_1}",
#		"filter_by": "{filter_by}",
#		"redact_fields": ["{field_1}", "{field_2}"],
#		"partial": 1,
#	},
#	{
#		"doctype": "{doctype_2}",
#		"filter_by": "{filter_by}",
#		"partial": 1,
#	},
#	{
#		"doctype": "{doctype_3}",
#		"strict": False,
#	},
#	{
#		"doctype": "{doctype_4}"
#	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
#	"frappe_hfhg.auth.validate"
# ]

override_doctype_class = {
	"Notification Log": "frappe_hfhg.api.CustomNotificationLog"
}

override_whitelisted_methods = {
    "frappe.utils.global_search.search": "frappe_hfhg.api.custom_global_search"
}

# permission_query_conditions = {
#     "Payment": "frappe_hfhg.api.payment_permission_query_conditions",
# }

after_install = "frappe_hfhg.install.after_install"
app_include_css = "/assets/frappe_hfhg/css/custom.css"

scheduler_events = {
    "cron": {
        "0 0 1 * *": [
            "frappe_hfhg.tasks.add_schedule_entry"
        ]
    }
}
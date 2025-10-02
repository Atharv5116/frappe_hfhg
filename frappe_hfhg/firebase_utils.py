import firebase_admin
from firebase_admin import credentials, messaging
import frappe

def get_fcm_credentials():
    settings = frappe.get_doc("FCM Settings", "FCM Settings")  
    return {
        "project_id": settings.project_id,
        "private_key": settings.private_key,
        "client_email": settings.client_email,
        "token_uri": settings.token_uri
    }

def initialize_firebase():
    try:
        creds = get_fcm_credentials()
        firebase_cred = credentials.Certificate({
            "type": "service_account",
            "project_id": creds["project_id"],
            "private_key": creds["private_key"].replace("\\n", "\n"), 
            "client_email": creds["client_email"],
            "token_uri": creds["token_uri"]
        })
        if not firebase_admin._apps:
            firebase_admin.initialize_app(firebase_cred)
    except Exception as e:
        frappe.log_error(f"Error initializing Firebase: {e}", "FCM Initialization Error")

def send_push_notification(device_token, title, body, user):
    try:
        initialize_firebase()
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            token=device_token,
        )
        response = messaging.send(message)
        return {"status": "success", "response": response}
    except Exception as e:
        return {"status": "error", "error": str(e)}

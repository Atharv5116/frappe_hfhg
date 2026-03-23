#!/usr/bin/env python3
"""
Facebook Graph API Integration for frappe_hfhg
Get lead generation forms and integrate with existing Meta Ads system
"""

import requests
import json
import frappe

def get_facebook_lead_forms():
    """
    Get Facebook lead generation forms using Graph API
    Integrates with existing frappe_hfhg Meta Ads configuration
    """
    
    try:
        # Try to get Facebook API settings from system
        # You may need to create a Meta Settings DocType for this
        api_version = "v18.0"  # Current Facebook Graph API version
        
        # Method 1: Check if there's a Meta Settings doctype
        if frappe.db.exists("DocType", "Meta Settings"):
            settings = frappe.get_single("Meta Settings")
            page_id = settings.page_id
            page_access_token = settings.get_password("page_access_token")
        else:
            # Method 2: Use environment variables or system defaults
            page_id = frappe.get_conf("facebook_page_id", "")
            page_access_token = frappe.get_conf("facebook_page_access_token", "")
        
        if not page_id or not page_access_token:
            return {
                "success": False,
                "error": "Facebook Page credentials not configured",
                "message": "Please configure Facebook Page ID and Access Token in Meta Settings"
            }
        
        # Construct API URL
        url = f"https://graph.facebook.com/{api_version}/{page_id}/leadgen_forms"
        
        # API parameters
        params = {
            'fields': 'id,name,created_time,locale,status,leadgen_export_csv_url,follow_up_action_url',
            'access_token': page_access_token,
            'limit': 50  # Limit results per page
        }
        
        # Make API call
        response = requests.get(url, params=params, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            forms = data.get('data', [])
            
            # Process and store forms
            processed_forms = []
            for form in forms:
                form_data = {
                    'form_id': form.get('id'),
                    'form_name': form.get('name'),
                    'created_time': form.get('created_time'),
                    'locale': form.get('locale'),
                    'status': form.get('status'),
                    'export_csv_url': form.get('leadgen_export_csv_url'),
                    'follow_up_url': form.get('follow_up_action_url'),
                    'page_id': page_id
                }
                processed_forms.append(form_data)
                
                # Update or create Meta Lead Form record
                update_meta_lead_form(form_data)
            
            return {
                "success": True,
                "forms": processed_forms,
                "total": len(processed_forms),
                "paging": data.get('paging', {})
            }
            
        else:
            error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
            return {
                "success": False,
                "error": "API call failed",
                "status_code": response.status_code,
                "response": error_data or response.text
            }
            
    except Exception as e:
        frappe.log_error(f"Facebook API Error: {str(e)}", "Facebook Lead Forms Sync")
        return {
            "success": False,
            "error": str(e)
        }

def update_meta_lead_form(form_data):
    """
    Update or create Meta Lead Form doctype record
    """
    try:
        # Check if Meta Lead Form exists
        if frappe.db.exists("Meta Lead Form", {"form_id": form_data['form_id']}):
            # Update existing record
            doc = frappe.get_doc("Meta Lead Form", {"form_id": form_data['form_id']})
            doc.form_name = form_data['form_name']
            doc.status = form_data['status']
            doc.created_time = form_data['created_time']
            doc.locale = form_data['locale']
            doc.export_csv_url = form_data.get('export_csv_url')
            doc.follow_up_url = form_data.get('follow_up_url')
            doc.save(ignore_permissions=True)
        else:
            # Create new record
            doc = frappe.new_doc("Meta Lead Form")
            doc.form_id = form_data['form_id']
            doc.form_name = form_data['form_name']
            doc.status = form_data['status']
            doc.created_time = form_data['created_time']
            doc.locale = form_data['locale']
            doc.page_id = form_data['page_id']
            doc.enabled = 1
            doc.insert(ignore_permissions=True)
            
        frappe.db.commit()
        
    except Exception as e:
        frappe.log_error(f"Error updating Meta Lead Form {form_data['form_id']}: {str(e)}", "Meta Lead Form Update")

@frappe.whitelist()
def sync_facebook_lead_forms():
    """
    Whitelisted function to sync Facebook lead forms
    Can be called from frontend or scheduled job
    """
    result = get_facebook_lead_forms()
    return result

def test_api_with_credentials(page_id, access_token):
    """
    Test API with provided credentials
    """
    api_version = "v18.0"
    url = f"https://graph.facebook.com/{api_version}/{page_id}/leadgen_forms"
    
    params = {
        'fields': 'id,name,created_time,locale,status',
        'access_token': access_token,
        'limit': 5  # Just get 5 forms for testing
    }
    
    try:
        response = requests.get(url, params=params, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            return {
                "success": True,
                "message": f"Successfully retrieved {len(data.get('data', []))} forms",
                "data": data
            }
        else:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}",
                "response": response.text
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    # This would be called from Frappe bench context
    # result = sync_facebook_lead_forms()
    # print(json.dumps(result, indent=2))
    pass

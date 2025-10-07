// Patient Photo Manager - Shared across Lead, Payment, and Costing
window.show_patient_photo_dialog = function(frm, patient_name) {
  // If current doctype is not Lead, get the patient name
  const linked_patient = frm.doctype === 'Lead' ? frm.doc.name : frm.doc.patient;
  
  if (!linked_patient) {
    frappe.msgprint(__('No patient linked to this document'));
    return;
  }

  // Create a dialog to show upload and view images
  const photo_dialog = new frappe.ui.Dialog({
    title: __("Patient Photos - Upload & View"),
    size: 'large',
    fields: [
      {
        fieldname: 'patient_info',
        fieldtype: 'HTML',
        options: `<div style="padding: 10px; background: #f0f4f8; border-radius: 5px; margin-bottom: 15px;">
          <strong>Patient:</strong> ${linked_patient}<br>
          <small style="color: #666;">Photos are shared across Lead, Costing, and Payment</small>
        </div>`
      },
      {
        fieldname: 'upload_section',
        fieldtype: 'Section Break',
        label: __('Upload New Photos')
      },
      {
        fieldname: 'upload_button_html',
        fieldtype: 'HTML',
        options: `
          <div style="margin-bottom: 20px;">
            <button class="btn btn-primary btn-sm" id="upload-photo-btn">
              <i class="fa fa-upload"></i> Select Photos to Upload
            </button>
            <p style="margin-top: 10px; color: #888; font-size: 12px;">
              You can upload multiple images at once. Only image files are allowed.
            </p>
          </div>
        `
      },
      {
        fieldname: 'existing_section',
        fieldtype: 'Section Break',
        label: __('Uploaded Photos')
      },
      {
        fieldname: 'photos_html',
        fieldtype: 'HTML'
      }
    ]
  });

  // Function to load and display existing photos from Lead
  function load_photos() {
    frappe.call({
      method: 'frappe_hfhg.api.get_patient_photos',
      args: {
        patient_name: linked_patient
      },
      callback: function(r) {
        let photos_html = '';
        
        if (r.message && r.message.length > 0) {
          photos_html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-top: 10px;">';
          
          r.message.forEach((photo, index) => {
            if (photo.image) {
              photos_html += `
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; text-align: center; background: #f9f9f9;">
                  <img src="${photo.image}" 
                       style="width: 100%; height: 200px; object-fit: cover; border-radius: 5px; cursor: pointer;" 
                       onclick="window.open('${photo.image}', '_blank')"
                       title="Click to view full size">
                  <div style="margin-top: 10px; font-size: 11px; color: #666;">
                    ${photo.description || 'No description'}<br>
                    <small>Uploaded: ${photo.uploaded_on || ''}</small>
                  </div>
                  <div style="margin-top: 10px;">
                    <button class="btn btn-xs btn-danger delete-photo-btn" data-photo-name="${photo.name}">
                      <i class="fa fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
              `;
            }
          });
          
          photos_html += '</div>';
        } else {
          photos_html = '<div style="padding: 40px; text-align: center; color: #999; border: 2px dashed #ddd; border-radius: 8px; margin-top: 10px;"><i class="fa fa-image" style="font-size: 48px; margin-bottom: 10px; display: block;"></i>No photos uploaded yet. Click the button above to upload photos.</div>';
        }
        
        photo_dialog.fields_dict.photos_html.$wrapper.html(photos_html);
        
        // Attach delete button event handlers
        photo_dialog.fields_dict.photos_html.$wrapper.find('.delete-photo-btn').on('click', function() {
          const photo_name = $(this).data('photo-name');
          frappe.confirm(
            __('Are you sure you want to delete this photo? It will be removed from Lead, Costing, and Payment.'),
            () => {
              frappe.call({
                method: 'frappe_hfhg.api.delete_patient_photo',
                args: {
                  patient_name: linked_patient,
                  photo_name: photo_name
                },
                callback: function(r) {
                  if (r.message && r.message.success) {
                    load_photos(); // Refresh the display
                    frappe.show_alert({
                      message: __('Photo deleted successfully'),
                      indicator: 'red'
                    });
                  }
                }
              });
            }
          );
        });
      }
    });
  }

  // Handle upload button click
  photo_dialog.fields_dict.upload_button_html.$wrapper.find('#upload-photo-btn').on('click', function() {
    new frappe.ui.FileUploader({
      allow_multiple: true,
      restrictions: {
        allowed_file_types: ['image/*']
      },
      on_success(file) {
        // Upload photo to Lead's child table
        frappe.call({
          method: 'frappe_hfhg.api.upload_patient_photo',
          args: {
            patient_name: linked_patient,
            file_url: file.file_url,
            uploaded_by: frappe.session.user
          },
          callback: function(r) {
            if (r.message && r.message.success) {
              load_photos(); // Refresh the photo display
              frappe.show_alert({
                message: __('Image uploaded successfully'),
                indicator: 'green'
              });
            }
          }
        });
      }
    });
  });

  // Load existing photos
  load_photos();
  
  // Show the dialog...
  photo_dialog.show();
}; 
// Copyright (c) 2024, redsoft and contributors...
// For license information, please see license.txt

frappe.ui.form.on("Costing", {
  onload: function (frm) {
    frm.set_query("patient", function () {
      return {
        filters: {
          status: ["!=", "Duplicate Lead"],
        },
      };
    });

    if (!frm.doc.book_date && frm.doc.status == "Prospect") {
      frm.set_df_property("surgery_date", "read_only", 1);
    }

    // Check if booking payment done AND surgery_date is set - make entire form read-only
    if (!frm.is_new() && frm.doc.status === "Booking" && frm.doc.surgery_date) {
      make_costing_readonly(frm);
      console.log("Costing locked: Booking payment done and surgery date saved");
    } else if (frm.doc.surgery_date) {
      // Old logic: If surgery_date set but no booking, only lock for Executives
      if (
        frappe.user_roles.includes("Executive") &&
        !frappe.user_roles.includes("System Manager")
      ) {
        frm.set_df_property("surgery_date", "read_only", 1);
        frm.set_df_property("grafts", "read_only", 1);
        frm.set_df_property("graft_price", "read_only", 1);
        frm.set_df_property("total_amount", "read_only", 1);
        frm.set_df_property("doctor", "read_only", 1);
        frm.set_df_property("center", "read_only", 1);
        frm.set_df_property("technique", "read_only", 1);
        frm.set_df_property("prp", "read_only", 1);
        frm.set_df_property("note", "read_only", 1);
      }
    }
  },
  refresh(frm) {
    // Check if booking payment done AND surgery_date is set - make entire form read-only
    if (!frm.is_new() && frm.doc.status === "Booking" && frm.doc.surgery_date) {
      make_costing_readonly(frm);
      console.log("Costing locked: Booking payment done and surgery date saved");
    }
    
    // Add Upload Lead Image button
    if (!frm.is_new() && frm.doc.patient) {
      frm.add_custom_button("Update Image", function () {
        show_unified_image_dialog(frm);
      });
    }

    if (!frm.is_new()) {
      setTimeout(() => {
        frappe.call({
          method:
            "frappe_hfhg.frappe_hfhg.doctype.costing.costing.get_dashboard_stats",
          args: { patient: frm.doc.name },
          callback: function (r) {
            if (r.message && r.message.length > 0) {
              let payment_container = frm.dashboard.links_area.body.find(
                `[data-doctype=Payment].document-link`
              );
              let payment_link = frm.dashboard.links_area.body.find(
                `[data-doctype=Payment].document-link-badge`
              );
              let payment_plusIcon = frm.dashboard.links_area.body.find(
                `[data-doctype=Payment].icon-btn.btn-new`
              );

              if (payment_link.length && payment_plusIcon.length) {
                payment_link.prepend(
                  `<span class="count">${r.message[0].value}</span>`
                );
                payment_link.on("click", () => {
                  frappe.set_route("List", "Payment", {
                    payment_type: "Costing",
                    patient: frm.doc.name,
                  });
                });
                payment_plusIcon.hide();
                payment_container.append(
                  `<button class="btn btn-new btn-secondary btn-xs icon-btn" data-doctype="Payment" onclick="frappe.set_route('payment', 'new-payment', { 'payment_type': 'Costing', 'patient': '${frm.doc.name}'})"><svg class="icon icon-sm"><use href="#icon-add"></use></svg></button>`
                );
                if (r.message[0].value == 0) {
                  frm.add_custom_button(__("Make a Payment"), function () {
                    frappe.set_route("payment", "new", {
                      payment_type: "Costing",
                      patient: frm.doc.name,
                    });
                  });
                }
              }
              let refund_container = frm.dashboard.links_area.body.find(
                `[data-doctype=Refund].document-link`
              );

              if (r.message[0].value == 1 && !refund_container.length) {
                frm.dashboard.links_area.body.append(`
                    <div class="document-link" data-doctype="Refund">
                    <div class="document-link-badge" data-doctype="Refund"><span class="count">${r.message[1].value}</span>
                    <a class="badge-link" onclick="frappe.set_route('List', 'Payment', { 'type': 'Refund', 'refund_payment_id': '${r.message[0].id}'})">Refund</a></div>
                    <button class="btn btn-new btn-secondary btn-xs icon-btn" data-doctype="Payment" onclick="frappe.set_route('payment', 'new-payment', { 'type': 'Refund', 'refund_payment_id': '${r.message[0].id}'})">
                    <svg class="icon icon-sm"><use href="#icon-add"></use></svg></button></div>`);
              }

              if (r.message[0].value == 1 && r.message[1].value == 0) {
                frm.add_custom_button(__("Refund"), function () {
                  frappe.set_route("payment", "new", {
                    type: "Refund",
                    refund_payment_id: r.message[0].id,
                  });
                });
              }
            }
          },
        });
      }, 0);
    }

    if ((!frm.is_new(), frm.doc.patient)) {
      frm.add_custom_button("Show Conversations", function () {
        frappe.call({
          method: "frappe_hfhg.api.get_lead_ignoring_permissions",
          args: {
            lead_name: frm.doc.patient,
          },
          callback: function (r) {
            if (r.message) {
              const lead = r.message;
              if (lead.status !== "Duplicate Lead") {
                MyUtils.showConversations(lead);
              } else {
                frappe.msgprint({
                  title: "Error",
                  message: "Patient is a duplicate lead",
                  indicator: "orange",
                });
              }
            }
          },
        });
      });
    }
  },
  // doctor(frm) {
  //   if (frm.doc.doctor && !frm.doc.center) {
  //     frappe.msgprint({
  //       title: "Error",
  //       message: "Please select center",
  //       indicator: "orange",
  //     });
  //     frm.set_value("doctor", "");
  //     frm.refresh_field("doctor");
  //   }
  // },
  // center(frm) {
  //   if (frm.doc.center) {
  //     frm.set_query("doctor", function () {
  //       let filters = {
  //         center: ["=", frm.doc.center],
  //       };
  //       return {
  //         filters: filters,
  //       };
  //     });
  //   }
  // },
  grafts(frm) {
    if (frm.doc.grafts && frm.doc.graft_price) {
      frm.set_value("total_amount", frm.doc.grafts * frm.doc.graft_price);
      frm.set_value(
        "pending_amount",
        frm.doc.total_amount - frm.doc.amount_paid
      );
    }
  },
  amount_paid(frm) {
    if (frm.doc.amount_paid) {
      if (frm.doc.total_amount) {
        if (frm.doc.amount_paid > frm.doc.total_amount) {
          frappe.msgprint({
            title: "Error",
            message: "Amount paid cannot be greater than total package",
            indicator: "orange",
          });
          frm.set_value("amount_paid", 0);
        } else {
          frm.set_value(
            "pending_amount",
            frm.doc.total_amount - frm.doc.amount_paid
          );
        }
      } else {
        frappe.msgprint({
          title: "Error",
          message: "Please enter total package first",
          indicator: "orange",
        });
        frm.set_value("amount_paid", 0);
      }
    }
  },
  graft_price(frm) {
    if (frm.doc.graft_price && frm.doc.grafts) {
      frm.set_value("total_amount", frm.doc.graft_price * frm.doc.grafts);
      frm.set_value(
        "pending_amount",
        frm.doc.total_amount - frm.doc.amount_paid
      );
    }
  },
  total_amount(frm) {
    if (frm.doc.total_amount) {
      frm.set_value(
        "pending_amount",
        frm.doc.total_amount - frm.doc.amount_paid
      );
      if (frm.doc.grafts) {
        frm.set_value("graft_price", frm.doc.total_amount / frm.doc.grafts);
      }
    }
  },
  executive(frm) {
    if (frm.doc.executive) {
      frm.set_value("assign_by", frappe.session.user_email);
    }
  },
  validate(frm) {
    const note = frm.doc.note;
    const maxChars = 1000;
    const charCount = note ? note.length : 0;

    if (charCount > maxChars) {
      frappe.msgprint({
        title: "Character Limit Exceeded",
        message: `The Note field cannot exceed ${maxChars} characters. You currently have ${charCount} characters.`,
        indicator: "orange",
      });
      frappe.validated = false;
    }
  },
  with_gst_amount: function (frm) {
    if (frm.doc.total_amount && frm.doc.with_gst_amount) {
      frm.set_value(
        "without_gst_amount",
        frm.doc.total_amount - frm.doc.with_gst_amount
      );
    }
  },
});

// Helper function to make entire Costing form read-only
function make_costing_readonly(frm) {
  // Make all editable fields read-only for everyone
  frm.set_df_property("surgery_date", "read_only", 1);
  frm.set_df_property("grafts", "read_only", 1);
  frm.set_df_property("graft_price", "read_only", 1);
  frm.set_df_property("total_amount", "read_only", 1);
  frm.set_df_property("doctor", "read_only", 1);
  frm.set_df_property("center", "read_only", 1);
  frm.set_df_property("technique", "read_only", 1);
  frm.set_df_property("prp", "read_only", 1);
  frm.set_df_property("note", "read_only", 1);
  frm.set_df_property("with_gst_amount", "read_only", 1);
  frm.set_df_property("without_gst_amount", "read_only", 1);
  
  // Show a message to the user
  if (!frm.__readonly_message_shown) {
    frappe.show_alert({
      message: __('This Costing record is locked (Booking payment done and surgery date saved)'),
      indicator: 'orange'
    }, 5);
    frm.__readonly_message_shown = true;
  }
}

// Unified Image Dialog - Shows ALL images from ALL sources across all doctypes
function show_unified_image_dialog(frm) {
    const patient_name = frm.doctype === 'Lead' ? frm.doc.name : frm.doc.patient;
    
    if (!patient_name) {
        frappe.msgprint(__('No patient linked'));
        return;
    }

    const d = new frappe.ui.Dialog({
        title: __('Patient Images - {0}', [patient_name]),
        size: 'extra-large',
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'image_area'
            }
        ]
    });

    function load_images() {
        frappe.call({
            method: 'frappe_hfhg.api.get_all_patient_images_unified',
            args: { patient_name: patient_name },
            callback: function(r) {
                let html = `
                    <div style="margin-bottom: 20px;">
                        <button class="btn btn-primary btn-sm upload-new-image">
                            <i class="fa fa-upload"></i> Upload New Image
                        </button>
                        <button class="btn btn-secondary btn-sm refresh-images" style="margin-left: 10px;">
                            <i class="fa fa-refresh"></i> Refresh
                        </button>
                    </div>
                `;
                
                if (r.message && r.message.length > 0) {
                    html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">';
                    r.message.forEach((img, index) => {
                        html += `
                            <div class="image-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; background: white;">
                                <img src="${img.image_url}" 
                                     style="width: 100%; height: 180px; object-fit: cover; border-radius: 5px; cursor: pointer;" 
                                     data-url="${img.image_url}"
                                     class="view-full-image"
                                     title="Click to view full size">
                                <div style="margin-top: 8px; font-size: 11px; color: #666;">
                                    <strong>${img.source}</strong><br>
                                    <small>${img.uploaded_on}</small>
                                </div>
                                <button class="btn btn-xs btn-danger delete-image" 
                                        data-id="${img.id}" 
                                        data-source="${img.source}"
                                        data-source-type="${img.source_type}"
                                        style="margin-top: 8px; width: 100%;">
                                    <i class="fa fa-trash"></i> Delete
                                </button>
                            </div>
                        `;
                    });
                    html += '</div>';
                } else {
                    html += `
                        <div style="padding: 40px; text-align: center; color: #999;">
                            <i class="fa fa-image" style="font-size: 48px; margin-bottom: 10px; display: block; color: #ccc;"></i>
                            <p>No images found. Click "Upload New Image" to add images.</p>
                        </div>
                    `;
                }
                
                d.fields_dict.image_area.$wrapper.html(html);
                
                // Bind click event to view full image in new tab
                d.fields_dict.image_area.$wrapper.find('.view-full-image').on('click', function() {
                    const img_url = $(this).data('url');
                    // Create a new window/tab with HTML that displays the image
                    const imageWindow = window.open('', '_blank');
                    imageWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Image Viewer</title>
                            <style>
                                body {
                                    margin: 0;
                                    padding: 0;
                                    background: #000;
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    min-height: 100vh;
                                }
                                img {
                                    max-width: 100%;
                                    max-height: 100vh;
                                    object-fit: contain;
                                }
                            </style>
                        </head>
                        <body>
                            <img src="${img_url}" alt="Patient Image">
                        </body>
                        </html>
                    `);
                    imageWindow.document.close();
                });
                
                // Bind delete button
                d.fields_dict.image_area.$wrapper.find('.delete-image').on('click', function() {
                    const img_id = $(this).data('id');
                    const source = $(this).data('source');
                    const source_type = $(this).data('source-type');
                    
                    frappe.confirm(__('Delete this image from {0}?', [source]), () => {
                        frappe.call({
                            method: 'frappe_hfhg.api.delete_patient_image_unified',
                            args: { 
                                patient_name: patient_name, 
                                image_id: img_id, 
                                source: source 
                            },
                            callback: function(r) {
                                if (r.message && r.message.success) {
                                    frappe.show_alert({message: __('Image deleted'), indicator: 'green'});
                                    load_images();
                                    frm.reload_doc();
                                } else {
                                    frappe.msgprint(__('Error deleting image: {0}', [r.message.message || 'Unknown error']));
                                }
                            }
                        });
                    });
                });
                
                // Bind upload button
                d.fields_dict.image_area.$wrapper.find('.upload-new-image').on('click', function() {
                    new frappe.ui.FileUploader({
                        allow_multiple: true,
                        restrictions: { allowed_file_types: ['image/*'] },
                        on_success(file) {
                            frappe.call({
                                method: 'frappe_hfhg.api.upload_patient_image_unified',
                                args: { 
                                    patient_name: patient_name, 
                                    file_url: file.file_url 
                                },
                                callback: function(r) {
                                    if (r.message && r.message.success) {
                                        frappe.show_alert({message: __('Image uploaded'), indicator: 'green'});
                                        load_images();
                                        frm.reload_doc();
                                    }
                                }
                            });
                        }
                    });
                });
                
                // Bind refresh button
                d.fields_dict.image_area.$wrapper.find('.refresh-images').on('click', function() {
                    load_images();
                });
            }
        });
    }

    d.show();
    load_images();
}

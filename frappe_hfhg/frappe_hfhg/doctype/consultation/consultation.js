// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

let all_slots = [
  "12:00 AM",
  "12:30 AM",
  "01:00 AM",
  "01:30 AM",
  "02:00 AM",
  "02:30 AM",
  "03:00 AM",
  "03:30 AM",
  "04:00 AM",
  "04:30 AM",
  "05:00 AM",
  "05:30 AM",
  "06:00 AM",
  "06:30 AM",
  "07:00 AM",
  "07:30 AM",
  "08:00 AM",
  "08:30 AM",
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
  "06:30 PM",
  "07:00 PM",
  "07:30 PM",
  "08:00 PM",
  "08:30 PM",
  "09:00 PM",
  "09:30 PM",
  "10:00 PM",
  "10:30 PM",
  "11:00 PM",
  "11:30 PM",
];

const slotsOrderMap = new Map();
all_slots.forEach((day, index) => {
  slotsOrderMap.set(day, index);
});

let available_slots = [];

frappe.ui.form.on("Consultation", {
  onload(frm) {
    frm.set_query("patient", function () {
      return {
        filters: {
          status: ["!=", "Duplicate Lead"],
        },
      };
    });
    if (frm.is_new()) {
      frm.set_df_property("patient", "read_only", 0);
      frm.set_df_property("center", "read_only", 0);
      frm.set_df_property("payment", "read_only", 0);
      frm.set_df_property("total_amount", "read_only", 0);
      frm.set_df_property("mode", "read_only", 0);
      frm.set_df_property("date", "read_only", 0);
      frm.set_df_property("doctor", "read_only", 0);
      frm.set_df_property("slot", "read_only", 0);
    } else {
      frm.set_df_property("patient", "read_only", 1);
      frm.set_df_property("center", "read_only", 1);
      frm.set_df_property("total_amount", "read_only", 1);
      frm.set_df_property("mode", "read_only", 1);
      frm.set_df_property("date", "read_only", 1);
      frm.set_df_property("doctor", "read_only", 1);
      frm.set_df_property("slot", "read_only", 1);
      let roles = frappe.user_roles;
      if (
        roles.includes("Receptionist") ||
        roles.includes("Surbhi-backend") ||
        roles.includes("HOD") ||
        roles.includes("Marketing Head") ||
        roles.includes("Lead checker") ||
        roles.includes("Lead Distributor")
      ) {
        frm.set_df_property("status", "read_only", 0);
        frm.set_df_property("payment", "read_only", 0);
      } else {
        frm.set_df_property("status", "read_only", 1);
        frm.set_df_property("payment", "read_only", 1);
      }
    }
  },
  refresh(frm) {
    if (frm.is_new()) {
      frm.fields_dict.date.datepicker.update({
        minDate: new Date(frappe.datetime.get_today()),
      });
      frm.set_df_property("slot", "options", [""]);
      frm.set_df_property("patient", "read_only", 0);
      frm.set_df_property("center", "read_only", 0);
      frm.set_df_property("payment", "read_only", 0);
      frm.set_df_property("total_amount", "read_only", 0);
      frm.set_df_property("mode", "read_only", 0);
      frm.set_df_property("date", "read_only", 0);
      frm.set_df_property("doctor", "read_only", 0);
      frm.set_df_property("slot", "read_only", 0);
    }
    if (!frm.is_new()) {
      frm.set_df_property("patient", "read_only", 1);
      frm.set_df_property("center", "read_only", 1);
      frm.set_df_property("total_amount", "read_only", 1);
      frm.set_df_property("mode", "read_only", 1);
      if (frm.doc.status == "Not Visited") {
        frm.set_df_property("date", "read_only", 0);
        frm.set_df_property("slot", "read_only", 0);
      } else {
        frm.set_df_property("date", "read_only", 1);
        frm.set_df_property("slot", "read_only", 1);
      }
      frm.set_df_property("doctor", "read_only", 1);

      let roles = frappe.user_roles;
      if (
        roles.includes("Receptionist") ||
        roles.includes("Surbhi-backend") ||
        roles.includes("HOD") ||
        roles.includes("Marketing Head") ||
        roles.includes("Lead checker") ||
        roles.includes("Lead Distributor")
      ) {
        frm.set_df_property("status", "read_only", 0);
        frm.set_df_property("payment", "read_only", 0);
      } else {
        frm.set_df_property("status", "read_only", 1);
        frm.set_df_property("payment", "read_only", 1);
      }
      frm.add_custom_button(
        __("Reminders"),
        () => {
          frappe.set_route("lead", frm.doc.patient);
        },
        __("Create")
      );
    }

    if (!frm.is_new()) {
      frappe.call({
        method:
          "frappe_hfhg.frappe_hfhg.doctype.consultation.consultation.get_dashboard_stats",
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
                  payment_type: "Consultation",
                  patient: frm.doc.name,
                });
              });
              payment_plusIcon.hide();
              payment_container.append(
                `<button class="btn btn-new btn-secondary btn-xs icon-btn" data-doctype="Payment" onclick="frappe.set_route('payment', 'new-payment', { 'payment_type': 'Consultation', 'patient': '${frm.doc.name}'})"><svg class="icon icon-sm"><use href="#icon-add"></use></svg></button>`
              );
              if (r.message[0].value == 0) {
                frm.add_custom_button(__("Make a Payment"), function () {
                  frappe.set_route("payment", "new", {
                    payment_type: "Consultation",
                    patient: frm.doc.name,
                  });
                });
              }
            }
          }
        },
      });
    }

    if (frm.doc.status === "Spot Booking" || frm.doc.handle_by) {
      frm.set_df_property("handle_by", "hidden", 0);
    } else {
      frm.set_df_property("handle_by", "hidden", 1);
    }
    // Add Upload Lead Image button
    if (!frm.is_new() && frm.doc.patient) {
      frm.add_custom_button("Upload Lead Image", function () {
        show_unified_image_dialog(frm);
      });
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
  doctor(frm) {
    if (!frm.doc.center && frm.doc.doctor) {
      frappe.msgprint({
        title: "Error",
        message: "Please select center",
        indicator: "orange",
      });
      frm.set_value("doctor", "");
      frm.refresh_field("doctor");
    } else {
      if (!frm.doc.doctor) {
        frm.set_value("date", "");
        frm.refresh_field("date");
        frm.set_value("slot", "");
        frm.refresh_field("slot");
      } else {
        if (!frm.doc.date) {
          frappe.call({
            method:
              "frappe_hfhg.frappe_hfhg.doctype.consultation.consultation.get_slots",
            args: {
              doctor: frm.doc.doctor,
            },
            callback: function (r) {
              if (r.message) {
                if (r.message.length > 0) {
                  available_slots = r.message;
                  frm.fields_dict.date.datepicker.update({
                    minDate: new Date(r.message[0].date),
                    maxDate: new Date(r.message[r.message.length - 1].date),
                  });
                }
                frm.set_value("date", "");
                frm.refresh_field("date");
                frm.set_value("slot", "");
                frm.refresh_field("slot");
              }
            },
          });
        } else {
          slots = available_slots
            .filter(
              (slot) =>
                slot.date == frm.doc.date &&
                slot.mode == frm.doc.mode &&
                slot.doctor == frm.doc.doctor
            )
            .map((e) => e.slot);
          frm.set_value("slot", "");
          frm.refresh_field("slot");
          if (slots.length == 0) {
            slots.push("");
            frm.set_df_property("slot", "options", slots);
          } else {
            slots.sort((a, b) => {
              return slotsOrderMap.get(a) - slotsOrderMap.get(b);
            });
            frm.set_df_property("slot", "options", slots);
          }
        }
      }
    }
  },
  date(frm) {
    if (!frm.doc.center && frm.doc.date) {
      frappe.msgprint({
        title: "Error",
        message: "Please select center",
        indicator: "orange",
      });
      frm.set_value("date", "");
      frm.refresh_field("date");
    } else {
      if (!frm.doc.date) {
        frm.set_value("slot", "");
        frm.refresh_field("slot");
        frm.set_query("doctor", function () {
          return {
            filters: {},
          };
        });
      } else {
        if (!frm.doc.doctor) {
          frappe.call({
            method:
              "frappe_hfhg.frappe_hfhg.doctype.consultation.consultation.get_doctors",
            args: {
              center: frm.doc.center,
              date: frm.doc.date,
            },
            callback: function (r) {
              if (r.message) {
                available_slots = r.message;
                if (available_slots.length > 0) {
                  frm.set_query("doctor", function () {
                    let filters = {
                      name: [
                        "in",
                        [...new Set(available_slots.map((e) => e.doctor))],
                      ],
                    };
                    return {
                      filters: filters,
                    };
                  });
                } else {
                  frm.set_df_property("doctor", "options", null);
                }
                frm.set_value("slot", "");
                frm.refresh_field("slot");
              }
            },
          });
        } else {
          slots = available_slots
            .filter(
              (slot) =>
                slot.date == frm.doc.date &&
                slot.mode == frm.doc.mode &&
                slot.doctor == frm.doc.doctor
            )
            .map((e) => e.slot);
          frm.set_value("slot", "");
          frm.refresh_field("slot");
          if (slots.length == 0) {
            slots.push("");
          } else {
            slots.sort((a, b) => {
              return slotsOrderMap.get(a) - slotsOrderMap.get(b);
            });
            frm.set_df_property("slot", "options", slots);
          }
        }
      }
    }
  },
  mode(frm) {
    if (frm.doc.date && frm.doc.doctor && frm.doc.mode) {
      slots = available_slots
        .filter(
          (slot) =>
            slot.date == frm.doc.date &&
            slot.mode == frm.doc.mode &&
            slot.doctor == frm.doc.doctor
        )
        .map((e) => e.slot);
      frm.set_value("slot", "");
      frm.refresh_field("slot");
      if (slots.length == 0) {
        slots.push("");
        frm.set_df_property("slot", "options", slots);
      } else {
        frm.set_df_property("slot", "options", slots);
      }
    }
  },
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
  executive(frm) {
    if (frm.doc.executive) {
      frm.set_value("assign_by", frappe.session.user_email);
    }
  },
  status(frm) {
    if (frm.doc.status === "Spot Booking") {
      frm.set_df_property("handle_by", "hidden", 0);
    } else {
      frm.set_df_property("handle_by", "hidden", 1);
    }
  },
});

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

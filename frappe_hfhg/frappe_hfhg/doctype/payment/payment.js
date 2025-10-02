// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt

frappe.ui.form.on("Payment", {
  refresh: function (frm) {
    // Add Upload Patient Photo button
    if (!frm.is_new() && frm.doc.patient) {
      frm.add_custom_button("Upload Patient Photo", function () {
        show_patient_photo_dialog(frm);
      });
    }

    frm.fields_dict["gst_payment_entries"].grid.wrapper.on(
      "change",
      'input[data-fieldname="amount"]',
      function (e) {

        const $input = $(e.currentTarget);
        const row_name = $input.closest(".grid-row").attr("data-name");
    
        if (row_name) {
          let row = frm.doc.gst_payment_entries.find(r => r.name === row_name);
          if (row && row.amount != null) {
            row.amount = Math.ceil(parseFloat(row.amount) || 0);
    
            // Update field in model and UI
            frappe.model.set_value(row.doctype, row.name, "amount", row.amount);
          }
        }

        calculate_gst(frm);
        calculate_total_with_gst(frm);
      }
    );
    frm.fields_dict["payment_entries"].grid.wrapper.on(
      "change",
      'input[data-fieldname="amount"]',
      function () {
        calculate_total(frm);
      }
    );
    frm.fields_dict["refund_gst_payment_entries"].grid.wrapper.on(
      "change",
      'input[data-fieldname="amount"]',
      function () {
        calculate_total_with_gst_refund(frm);
      }
    );
    frm.fields_dict["payment_entries"].grid.get_field("payment_in").get_query =
      function (doc, cdt, cdn) {
        const current_row = frappe.get_doc(cdt, cdn);
        if (current_row.method === "Cash") {
          return {
            filters: [["for_cash", "=", 1]],
          };
        } else {
          return { filters: [["for_net_banking", "=", 1]] };
        }
      };

    frm.fields_dict["gst_payment_entries"].grid.get_field(
      "payment_in"
    ).get_query = function (doc, cdt, cdn) {
      const current_row = frappe.get_doc(cdt, cdn);
      if (current_row.method === "Cash") {
        return {
          filters: [["for_cash", "=", 1]],
        };
      } else {
        return { filters: [["for_net_banking", "=", 1]] };
      }
    };

    if (frm.doc.with_gst_check) {
      frm.add_custom_button(__('GST Calculator'), () => {
        show_gst_calculator_dialog(frm);
      });
    }
  },
  with_gst_check(frm) {
    frm.refresh(); 
  },
  onload(frm) {
    frm.set_query("payment_type", function () {
      return {
        filters: {
          name: ["in", ["Costing", "Treatment", "Surgery", "Consultation"]],
        },
      };
    });
    frm.set_query("refund_payment_id", function () {
      return {
        filters: {
          type: "Payment",
        },
      };
    });
    if (frm.is_new() && frm.doc.patient) {
      get_payment_amount(frm);
    }

    if (!frappe.user_roles.includes("Accountant")) {
      frm.set_df_property("payment_confirmation", "read_only", 1);
    }
  },
  patient(frm) {
    if (frm.is_new() && frm.doc.patient) {
      get_payment_amount(frm);
    }
  },
  refund_payment_id(frm) {
    if (frm.doc.refund_payment_id) {
      frappe.call({
        method:
          "frappe_hfhg.frappe_hfhg.doctype.payment.payment.get_refund_amount",
        args: {
          payment_id: frm.doc.refund_payment_id,
        },
        callback: function (r) {
          if (r.message) {
            frm.set_value("total_paid_amount", r.message.total_paid_amount);
            frm.set_value(
              "paid_amount_without_gst",
              r.message.without_gst_amount
            );
            frm.set_value("paid_amount_with_gst", r.message.with_gst_amount);
          }
        },
      });
    }
  },
  validate: function (frm) {
    calculate_gst(frm);
    calculate_total(frm);
    calculate_total_with_gst(frm);
    calculate_total_with_gst_refund(frm);
  },
  without_gst_amount: function (frm) {
    calculate_total_received(frm);
  },
  with_gst_amount: function (frm) {
    calculate_total_received(frm);
  },
  before_save: function(frm) {
    if(frm.doc.total_amount < frm.doc.total_amount_received) {
      frappe.throw(__('Total Amount Received cannot be greater than Total Amount'));
    }
  }
});

function get_payment_amount(frm) {
  frappe.call({
    method:
      "frappe_hfhg.frappe_hfhg.doctype.payment.payment.get_payment_amount",
    args: {
      patient: frm.doc.patient,
      payment_type: frm.doc.payment_type,
    },
    callback: function (r) {
      if (r.message) {
        frm.set_value("total_amount", r.message);
      }
    },
  });
}

function calculate_gst(frm) {
  if (frm.doc.gst_payment_entries && frm.doc.gst_payment_entries.length > 0) {
    frm.doc.gst_payment_entries.forEach((row) => {
      row.gst_amount = row.amount * 0.05;
      frm.refresh_field("gst_payment_entries");
    });
  }
}

function calculate_total(frm) {
  let total = 0;
  if (frm.doc.payment_entries && frm.doc.payment_entries.length > 0) {
    frm.doc.payment_entries.forEach((row) => {
      total += row.amount;
    });
  }
  frm.set_value("without_gst_amount", total);
}

function calculate_total_with_gst(frm) {
  if (frm.doc.gst_payment_entries && frm.doc.gst_payment_entries.length > 0) {
    let total = 0;
    frm.doc.gst_payment_entries.forEach((row) => {
      total += row.amount;
      total += row.gst_amount;
    });
    frm.set_value("with_gst_amount", total);
  }
}

function calculate_total_with_gst_refund(frm) {
  if (
    frm.doc.refund_gst_payment_entries &&
    frm.doc.refund_gst_payment_entries.length > 0
  ) {
    let total = 0;
    frm.doc.refund_gst_payment_entries.forEach((row) => {
      total += row.amount;
    });
    frm.set_value("with_gst_amount", total);
  }
}

function calculate_total_received(frm) {
  const without_gst = frm.doc.without_gst_amount || 0;
  const with_gst = frm.doc.with_gst_amount || 0;
  const total = Math.floor(without_gst + with_gst);

  frm.set_value("total_amount_received", total);
}

function show_gst_calculator_dialog(frm) {
  let gst_rate = 5;

  let dialog = new frappe.ui.Dialog({
    title: __("GST Calculator"),
    fields: [
      {
        label: "Total Amount",
        fieldname: "total_amount",
        fieldtype: "Float",
        precision: 2,
        default: 0,
      },
      {
        label: "Base Amount",
        fieldname: "amount",
        fieldtype: "Float",
        precision: 2,
        read_only: 1,
      },
      {
        label: "GST Amount (5%)",
        fieldname: "gst_amount",
        fieldtype: "Float",
        precision: 2,
        read_only: 1,
      },
      {
        label: "Calculation",
        fieldname: "calculation",
        fieldtype: "Data",
        read_only: 1,
      },
    ],
    primary_action_label: __("Calculate"),
    primary_action: function () {
      const total = dialog.get_value("total_amount") || 0;
      const base = total / (1 + gst_rate / 100);
      const gst = total - base;

      const base_amount = Math.ceil(parseFloat(base));

      dialog.set_value("amount", parseFloat(base).toFixed(2));
      dialog.set_value("gst_amount", parseFloat(gst).toFixed(2));

      dialog.set_value(
        "calculation",
        `${total} = ${parseFloat(base).toFixed(2)} +${parseFloat(gst).toFixed(2)}`
      );
      
      let child = frm.add_child("gst_payment_entries");
      child.amount = base_amount;
      console.log(child)
      frm.refresh_field("gst_payment_entries");
      
      calculate_gst(frm);
      calculate_total_with_gst(frm);
    },
    secondary_action_label: __("Close"),
    secondary_action: function (values) {
      dialog.hide();
    },
  });

  dialog.show();
}

// Copyright (c) 2024, redsoft and contributors
// For license information, please see license.txt
let days = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

let slots = [
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

frappe.ui.form.on("Doctor", {
  add_slots: function (frm) {
    let fromDate = frm.doc.from_date;
    let toDate = frm.doc.to_date;
    let fromSlot = slots.indexOf(frm.doc.from_slot.trim());
    let toSlot = slots.indexOf(frm.doc.to_slot.trim());
    let modeOfAppointment = frm.doc.mode_of_appointment;
    let patientsPerSlot = frm.doc.patients_per_slot;

    if (!fromDate || !toDate) {
      frappe.msgprint({
        title: "Error",
        message: "Please specify From Date and To Date",
        indicator: "orange",
      });
      return;
    }
    if (fromDate > toDate) {
      frappe.msgprint({
        title: "Error",
        message: "From Date cannot be greater than To Date",
        indicator: "orange",
      });
      return;
    }

    if (fromSlot > toSlot) {
      frappe.msgprint({
        title: "Error",
        message: "From Slot cannot be greater than To Slot",
        indicator: "orange",
      });
      return;
    }

    let ignoreDays = [];

    for (let i = 0; i < days.length; i++) {
      if (!frm.doc[days[i]]) {
        ignoreDays.push(days[i]);
      }
    }

    let startDate = moment(fromDate);
    let endDate = moment(toDate);

    let dateArray = [];

    const ignoreDaysIndices = ignoreDays.map((day) => days.indexOf(day));

    for (let dt = moment(startDate); dt <= endDate; dt.add(1, "days")) {
      if (!ignoreDaysIndices.includes(dt.day())) {
        dateArray.push({ date: dt.format("YYYY-MM-DD"), day: days[dt.day()] });
      }
    }
    for (let j = 0; j < dateArray.length; j++) {
      for (let i = fromSlot; i <= toSlot; i++) {
        let slot = slots[i];
        let date = dateArray[j].date;
        let day = dateArray[j].day;
        frm.add_child("table_schedule", {
          doctor: frm.doc.name,
          slot: slot,
          date: date,
          day: day,
          mode: modeOfAppointment,
          patients: patientsPerSlot,
        });
        frm.refresh_field("table_schedule");
      }
    }
  },
});

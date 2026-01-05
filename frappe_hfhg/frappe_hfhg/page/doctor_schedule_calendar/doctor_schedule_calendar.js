frappe.pages['doctor-schedule-calendar'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Doctor Schedule Calendar',
		single_column: true
	});
	
	load_doctor_schedule_calendar(wrapper);
};

function load_doctor_schedule_calendar(wrapper) {
	let $parent = $(wrapper).find(".layout-main-section");
	$parent.empty();
	
	// Create container
	let $container = $(`
		<div class="doctor-schedule-calendar-container" style="padding: 20px;">
			<div class="row" style="margin-bottom: 20px;">
				<div class="col-md-4">
					<div class="form-group">
						<label class="form-label">Select Doctor</label>
						<div class="doctor-select-wrapper"></div>
					</div>
				</div>
				<div class="col-md-4">
					<div class="form-group">
						<label class="form-label">Start Date</label>
						<input type="date" class="form-control start-date" style="width: 100%;">
					</div>
					<div class="form-group">
						<label class="form-label">End Date</label>
						<input type="date" class="form-control end-date" style="width: 100%;">
					</div>
				</div>
				<div class="col-md-4">
					<div class="form-group" style="display: flex; flex-direction: column; justify-content: flex-start; padding-top: 25px;">
						<button class="btn btn-primary btn-sm load-slots-btn" style="margin-bottom: 5px; width: 100%;">
							<i class="fa fa-refresh"></i> Load Slots
						</button>
						<button class="btn btn-danger btn-sm delete-selected-btn" style="margin-bottom: 5px; width: 100%;" disabled>
							<i class="fa fa-trash"></i> Delete Selected
						</button>
						<button class="btn btn-info btn-sm manage-doctors-btn" style="width: 100%;">
							<i class="fa fa-user-md"></i> Manage Doctors
						</button>
					</div>
				</div>
			</div>
			<div class="calendar-container" style="margin-top: 20px;">
				<div class="alert alert-info">
					Please select a doctor and date range to view slots
				</div>
			</div>
		</div>
	`).appendTo($parent);
	
	// Create dynamic Link field for Doctor selection
	let doctor_field = frappe.ui.form.make_control({
		df: {
			fieldtype: 'Link',
			fieldname: 'doctor',
			options: 'Doctor',
			label: '',  // Empty label since we already have one in HTML template
			placeholder: 'Select Doctor',
			get_query: function() {
				return {
					filters: {},
					page_length: 1000  // Set high limit to show all doctors
				};
			},
			change: function() {
				// Optional: Auto-load slots when doctor changes
				// You can add logic here if needed
			}
		},
		parent: $container.find(".doctor-select-wrapper"),
		render_input: true
	});
	
	// Configure the field to show more results in autocomplete
	// Override the default page_length after field is created
	doctor_field.set_custom_query = function(args) {
		args.page_length = 1000;  // Override page_length to show all doctors
	};
	
	// Ensure Link field input matches Bootstrap .form-control height (38px)
	// Wait for field to render and then match the date input styling
	function fixAlignment() {
		let $dateInput = $container.find('.start-date');
		let dateInputHeight = $dateInput.outerHeight() || 38; // Default to 38px if not found
		
		let $linkWrapper = $container.find(".doctor-select-wrapper");
		
		// Find all possible input elements in the Link field
		let $linkInput = $linkWrapper.find('input[type="text"], input.form-control, input');
		
		// Match the Bootstrap .form-control height (38px) and styling
		if ($linkInput.length) {
			$linkInput.css({
				'height': dateInputHeight + 'px',
				'line-height': $dateInput.css('line-height') || '1.42857143',
				'padding': $dateInput.css('padding') || '6px 12px',
				'box-sizing': 'border-box',
				'vertical-align': 'top'
			});
		}
		
		// Fix Frappe's internal wrapper elements to not interfere with height
		$linkWrapper.find('.control-input-wrapper, .control-input').css({
			'height': 'auto',
			'min-height': '0',
			'vertical-align': 'top'
		});
		
		// Ensure the wrapper doesn't constrain height
		$linkWrapper.css({
			'height': 'auto',
			'min-height': '0',
			'vertical-align': 'top',
			'display': 'block'
		});
		
		// Add .form-control class to the input if it doesn't have it
		if ($linkInput.length && !$linkInput.hasClass('form-control')) {
			$linkInput.addClass('form-control');
		}
	}
	
	// Try multiple times to catch the field after rendering
	setTimeout(fixAlignment, 100);
	setTimeout(fixAlignment, 300);
	setTimeout(fixAlignment, 500);
	setTimeout(fixAlignment, 800);
	
	// Store reference to the field for later use
	$container.data('doctor-field', doctor_field);
	
	// Set default date range (current month)
	let today = new Date();
	let firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
	let lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
	
	$container.find(".start-date").val(formatDate(firstDay));
	$container.find(".end-date").val(formatDate(lastDay));
	
	// Load slots button
	$container.find(".load-slots-btn").on("click", function() {
		let doctor_field = $container.data('doctor-field');
		let doctor = doctor_field ? doctor_field.get_value() : '';
		let startDate = $container.find(".start-date").val();
		let endDate = $container.find(".end-date").val();
		
		if (!doctor) {
			frappe.msgprint("Please select a doctor");
			return;
		}
		
		if (!startDate || !endDate) {
			frappe.msgprint("Please select date range");
			return;
		}
		
		loadSlots($container, doctor, startDate, endDate);
	});
	
	// Delete selected button
	$container.find(".delete-selected-btn").on("click", function() {
		let selectedSlots = $container.find(".slot-checkbox:checked").map(function() {
			return $(this).data("slot-name");
		}).get();
		
		if (selectedSlots.length === 0) {
			frappe.msgprint("Please select slots to delete");
			return;
		}
		
		frappe.confirm(
			`Are you sure you want to delete ${selectedSlots.length} slot(s)?`,
			function() {
				deleteSlots(selectedSlots, $container);
			}
		);
	});
	
	// Manage doctors button
	$container.find(".manage-doctors-btn").on("click", function() {
		showManageDoctorsDialog();
	});
}

function showManageDoctorsDialog() {
	let dialog = new frappe.ui.Dialog({
		title: 'Manage Doctors',
		fields: [
			{
				fieldtype: 'HTML',
				options: '<div id="doctors-list-container" style="max-height: 500px; overflow-y: auto;"></div>'
			}
		],
		primary_action_label: 'Close',
		primary_action: function() {
			dialog.hide();
		}
	});
	
	// Load doctors list - fetch all doctors (no limit)
	frappe.call({
		method: "frappe.client.get_list",
		args: {
			doctype: "Doctor",
			fields: ["name", "fullname", "email", "contact_number", "center", "gender", 
				"from_slot", "to_slot", "mode_of_appointment", "patients_per_slot",
				"sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
				"from_date", "to_date"],
			order_by: "fullname asc",
			limit_page_length: 0  // 0 means no limit - fetch all records
		},
		callback: function(r) {
			if (r.message) {
				displayDoctorsList(r.message, dialog);
			}
		}
	});
	
	dialog.show();
}

function displayDoctorsList(doctors, dialog) {
	let $container = dialog.$body.find("#doctors-list-container");
	
	if (doctors.length === 0) {
		$container.html('<div class="alert alert-info">No doctors found</div>');
		return;
	}
	
	let html = `
		<div class="doctors-list">
			<div class="panel panel-default">
				<div class="panel-heading">
					<h4>All Doctors (${doctors.length})</h4>
				</div>
				<div class="panel-body">
					<table class="table table-bordered table-striped table-hover">
						<thead>
							<tr>
								<th>Full Name</th>
								<th>Email</th>
								<th>Contact</th>
								<th>Center</th>
								<th>Gender</th>
								<th>Schedule</th>
								<th>Action</th>
							</tr>
						</thead>
						<tbody>
	`;
	
	doctors.forEach(function(doctor) {
		// Format schedule info
		let scheduleInfo = '';
		if (doctor.from_slot && doctor.to_slot) {
			scheduleInfo = `${doctor.from_slot} - ${doctor.to_slot}`;
		}
		
		// Format days
		let days = [];
		if (doctor.sunday) days.push('Sun');
		if (doctor.monday) days.push('Mon');
		if (doctor.tuesday) days.push('Tue');
		if (doctor.wednesday) days.push('Wed');
		if (doctor.thursday) days.push('Thu');
		if (doctor.friday) days.push('Fri');
		if (doctor.saturday) days.push('Sat');
		let daysStr = days.length > 0 ? days.join(', ') : 'None';
		
		html += `
			<tr>
				<td><strong>${doctor.fullname || doctor.name}</strong></td>
				<td>${doctor.email || 'N/A'}</td>
				<td>${doctor.contact_number || 'N/A'}</td>
				<td>${doctor.center || 'N/A'}</td>
				<td>${doctor.gender || 'N/A'}</td>
				<td>
					<div style="font-size: 11px;">
						<div><strong>Time:</strong> ${scheduleInfo || 'N/A'}</div>
						<div><strong>Days:</strong> ${daysStr}</div>
						<div><strong>Mode:</strong> ${doctor.mode_of_appointment || 'N/A'}</div>
						<div><strong>Patients/Slot:</strong> ${doctor.patients_per_slot || 0}</div>
						${doctor.from_date && doctor.to_date ? 
							`<div><strong>Date Range:</strong> ${formatDisplayDate(doctor.from_date)} - ${formatDisplayDate(doctor.to_date)}</div>` : 
							''}
					</div>
				</td>
				<td>
					<button class="btn btn-xs btn-primary edit-doctor-btn" data-doctor-name="${doctor.name}">
						<i class="fa fa-edit"></i> Edit
					</button>
				</td>
			</tr>
		`;
	});
	
	html += `
						</tbody>
					</table>
				</div>
			</div>
		</div>
	`;
	
	$container.html(html);
	
	// Add click handler for edit buttons
	$container.find(".edit-doctor-btn").on("click", function() {
		let doctorName = $(this).data("doctor-name");
		editDoctor(doctorName);
		dialog.hide();
	});
}

function editDoctor(doctorName) {
	// Open doctor form in a new form
	frappe.set_route("Form", "Doctor", doctorName);
}

function formatDate(date) {
	let year = date.getFullYear();
	let month = String(date.getMonth() + 1).padStart(2, '0');
	let day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function loadSlots($container, doctor, startDate, endDate) {
	let $calendarContainer = $container.find(".calendar-container");
	$calendarContainer.html('<div class="text-center"><i class="fa fa-spinner fa-spin fa-2x"></i> Loading slots...</div>');
	
	// First get doctor's full name
	frappe.db.get_value('Doctor', doctor, 'fullname').then(function(doctor_info) {
		let doctorName = doctor_info.message.fullname || doctor;
		
		// Then load slots
		frappe.call({
			method: "frappe_hfhg.frappe_hfhg.doctype.doctor.doctor.get_doctor_schedule_slots",
			args: {
				doctor: doctor,
				start_date: startDate,
				end_date: endDate
			},
			callback: function(r) {
				if (r.message) {
					displaySlots($container, r.message, doctor, doctorName);
				} else {
					$calendarContainer.html('<div class="alert alert-warning">No slots found for the selected date range</div>');
				}
			},
			error: function(r) {
				$calendarContainer.html('<div class="alert alert-danger">Error loading slots: ' + (r.message || "Unknown error") + '</div>');
			}
		});
	});
}

function displaySlots($container, slots, doctor, doctorName) {
	let $calendarContainer = $container.find(".calendar-container");
	
	if (slots.length === 0) {
		$calendarContainer.html('<div class="alert alert-warning">No slots found for the selected date range</div>');
		return;
	}
	
	// Group slots by date
	let slotsByDate = {};
	slots.forEach(function(slot) {
		if (!slotsByDate[slot.date]) {
			slotsByDate[slot.date] = [];
		}
		slotsByDate[slot.date].push(slot);
	});
	
	// Create calendar view
	let html = `
		<div class="slots-calendar">
			<div class="row">
				<div class="col-md-12">
					<div class="panel panel-default">
						<div class="panel-heading">
							<h4>Schedule Slots for ${doctorName || doctor}</h4>
							<label style="margin-top: 10px;">
								<input type="checkbox" class="select-all-checkbox"> Select All
							</label>
						</div>
						<div class="panel-body" style="max-height: 600px; overflow-y: auto;">
							<table class="table table-bordered table-striped">
								<thead>
									<tr>
										<th style="width: 30px;">
											<input type="checkbox" class="select-all-checkbox">
										</th>
										<th>Date</th>
										<th>Day</th>
										<th>Slot</th>
										<th>Mode</th>
										<th>Patients</th>
										<th>Action</th>
									</tr>
								</thead>
								<tbody>
	`;
	
	// Helper function to convert slot time to sortable minutes
	function getSlotTimeIndex(slotTime) {
		if (!slotTime) return 0;
		try {
			// Parse time string like "10:00 AM" or "01:00 PM"
			let timeStr = slotTime.replace(/\s/g, '');
			let timePart = timeStr.slice(0, -2); // "10:00" or "01:00"
			let ampm = timeStr.slice(-2).toUpperCase(); // "AM" or "PM"
			let [hour, minute] = timePart.split(':').map(Number);
			
			// Convert to 24-hour format
			if (ampm === 'PM' && hour !== 12) {
				hour += 12;
			} else if (ampm === 'AM' && hour === 12) {
				hour = 0;
			}
			
			// Return minutes since midnight for sorting
			return hour * 60 + minute;
		} catch (e) {
			return 0;
		}
	}
	
	// Sort dates
	let sortedDates = Object.keys(slotsByDate).sort();
	
	sortedDates.forEach(function(date) {
		let dateSlots = slotsByDate[date];
		// Sort slots within each date by time, then by mode
		dateSlots.sort(function(a, b) {
			let timeA = getSlotTimeIndex(a.slot);
			let timeB = getSlotTimeIndex(b.slot);
			if (timeA !== timeB) {
				return timeA - timeB;
			}
			// If same time, sort by mode (In-Person before Call)
			return (a.mode || '').localeCompare(b.mode || '');
		});
		
		let dateObj = new Date(date);
		let dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
		
		dateSlots.forEach(function(slot, index) {
			let isFirst = index === 0;
			html += `
				<tr>
					<td>
						<input type="checkbox" class="slot-checkbox" data-slot-name="${slot.name}">
					</td>
					<td>${isFirst ? `<strong>${formatDisplayDate(date)}</strong>` : ''}</td>
					<td>${isFirst ? dayName : ''}</td>
					<td>${slot.slot}</td>
					<td>${slot.mode || 'N/A'}</td>
					<td>${slot.patients || 0}</td>
					<td>
						<button class="btn btn-xs btn-danger delete-single-slot" data-slot-name="${slot.name}">
							<i class="fa fa-trash"></i> Delete
						</button>
					</td>
				</tr>
			`;
		});
	});
	
	html += `
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;
	
	$calendarContainer.html(html);
	
	// Enable delete button
	$container.find(".delete-selected-btn").prop("disabled", false);
	
	// Select all checkbox
	$container.find(".select-all-checkbox").on("change", function() {
		let checked = $(this).is(":checked");
		$container.find(".slot-checkbox").prop("checked", checked);
		updateDeleteButton($container);
	});
	
	// Individual checkbox change
	$container.find(".slot-checkbox").on("change", function() {
		updateDeleteButton($container);
		updateSelectAllCheckbox($container);
	});
	
	// Delete single slot
	$container.find(".delete-single-slot").on("click", function() {
		let slotName = $(this).data("slot-name");
		frappe.confirm(
			"Are you sure you want to delete this slot?",
			function() {
				deleteSlots([slotName], $container);
			}
		);
	});
}

function formatDisplayDate(dateStr) {
	let date = new Date(dateStr);
	return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function updateDeleteButton($container) {
	let checkedCount = $container.find(".slot-checkbox:checked").length;
	$container.find(".delete-selected-btn").prop("disabled", checkedCount === 0);
}

function updateSelectAllCheckbox($container) {
	let total = $container.find(".slot-checkbox").length;
	let checked = $container.find(".slot-checkbox:checked").length;
	$container.find(".select-all-checkbox").prop("checked", total > 0 && total === checked);
}

function deleteSlots(slotNames, $container) {
	frappe.call({
		method: "frappe_hfhg.frappe_hfhg.doctype.doctor.doctor.delete_multiple_schedule_slots",
		args: {
			slot_names: slotNames
		},
		callback: function(r) {
			if (r.message && r.message.success) {
				frappe.show_alert({
					message: r.message.message,
					indicator: "green"
				});
				
				// Reload slots
				let doctor_field = $container.data('doctor-field');
				let doctor = doctor_field ? doctor_field.get_value() : '';
				let startDate = $container.find(".start-date").val();
				let endDate = $container.find(".end-date").val();
				loadSlots($container, doctor, startDate, endDate);
			} else {
				frappe.msgprint("Error deleting slots");
			}
		},
		error: function(r) {
			frappe.msgprint("Error deleting slots: " + (r.message || "Unknown error"));
		}
	});
}


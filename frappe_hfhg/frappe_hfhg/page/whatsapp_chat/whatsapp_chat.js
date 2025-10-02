frappe.pages["whatsapp_chat"].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: __("whatsapp_chat"),
		single_column: true,
	});

	if (!window.csrf_token) {
		window.csrf_token = frappe.csrf_token || document.querySelector("meta[name='csrf-token']")?.getAttribute("content");
	}

	// Hide the default header dynamically
	hide_frappe_header();
};


frappe.pages["whatsapp_chat"].on_page_show = function (wrapper) {
	load_desk_page(wrapper);
};

function load_desk_page(wrapper) {
	let $parent = $(wrapper).find(".layout-main-section");
	$parent.empty();

	// frappe.require("whatsapp_chat.bundle.js").then(() => {
	// 	frappe.whatsapp_chat = new frappe.ui.Whatsapp_Chat({
	// 		wrapper: $parent,
	// 		page: wrapper.page,
	// 	});
	// });
	// Fetch the HTML file from the public directory
	fetch("/assets/frappe_hfhg/whatsapp/index.html")
		.then((response) => {
			if (!response.ok) {
				throw new Error("Failed to load HTML file");
			}
			return response.text();
		})
		.then((html) => {
			// Inject the HTML content into the parent container
			$parent.html(html);

		})
		.catch((error) => {
			console.error("Error loading the index.html:", error);
			frappe.msgprint({
				title: __("Error"),
				message: __("Failed to load the page. Please try again later."),
				indicator: "red",
			});
		});
}

// Helper function to hide the default Frappe header
function hide_frappe_header() {
	const header = document.querySelector(".page-head");
	if (header) {
		header.style.display = "none"; // Hide the header
	}

	const navbar = document.querySelector(".navbar");
	if (navbar) {
		navbar.style.display = "none"; // Hide the navbar
	}

	const breadcrumb = document.querySelector(".page-head .navbar-breadcrumb");
	if (breadcrumb) {
		breadcrumb.style.display = "none"; // Optionally hide breadcrumbs
	}
}
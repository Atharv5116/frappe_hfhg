<script setup>
import { ref, reactive, onMounted } from 'vue';
import WhatsApp from './Whatsapp.vue'; // Rendering Component
// import { FrappeApp } from 'frappe-js-sdk';

// const frappe = new FrappeApp();

// non supportive translation fn.
window.__ = (text) => text;

const doctype = ref('');
const docname = ref('');
const phone = ref('');
const whatsapp = ref(null)
const documentData = reactive({
  data: {}, // Initialize with an empty object
});
const loading = ref(true);
const error = ref('');

// Helper: Extract query parameters from URL
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    doctype: params.get('doctype') || '',
    docname: params.get('docname') || '',
    phone: params.get('phone') || '',
  };
}

// Fetch document from Frappe
async function fetchDoc(doctype, docname) {
  try {
    const res = await frappe.call({
      method: 'frappe.client.get',
      args: { doctype, name: docname },
    });
    // console.log(res)
    documentData.data = res.message || {};
    // console.log("document data", res.message);
    // console.log("document data", documentData.data);
    loading.value = false;
  } catch (err) {
    console.error('Error fetching document:', err);
    error.value = 'Failed to load document.';
    loading.value = false;
  }
}

// Check and fetch `doctype` and `docname` from either DOM or URL
function checkAndFetch() {
  const leadWhatsAppTab = document.querySelector('#lead-whatsapp_tab');

  if (leadWhatsAppTab) {
    if (frappe && frappe.csrf_token && !window.csrf_token) {
      window.csrf_token = frappe.csrf_token
    }
    // Case 1: Found `#lead-whatsapp_tab`
    console.log('Lead WhatsApp tab found.');
    const doc = typeof cur_frm !== 'undefined' ? cur_frm : null; // Ensure cur_frm is defined
    if (doc?.doctype && doc?.docname) {
      doctype.value = doc.doctype;
      docname.value = doc.docname;
      documentData.data = doc.doc;
      phone.value = doc.doc.contact_number.replace(/\D/g, "")
      loading.value = false;
      // fetchDoc(doctype.value, docname.value); // Fetch the document
    } else {
      error.value = 'Lead WhatsApp details not found.';
      loading.value = false;
    }
  } else {
    // Case 2: Use URL query parameters
    const queryParams = getQueryParams();
    if (queryParams.phone) {
      phone.value = queryParams.phone
    }
    console.log("check prop value: ", phone.value)
    if (queryParams.doctype && queryParams.docname) {
      doctype.value = queryParams.doctype;
      docname.value = queryParams.docname;
      fetchDoc(doctype.value, docname.value); // Fetch the document
    } else {
      error.value = 'Doctype and Docname missing from URL.';
      loading.value = false;
    }
  }
}

// On mount, check and fetch
onMounted(() => {
  checkAndFetch();
});
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center h-full">
    <span>Loading...</span>
  </div>
  <div v-else-if="error" class="text-red-500 text-center">
    {{ error }}
  </div>
  <WhatsApp
    v-else
    ref="whatsapp"
    :doctype="doctype"
    :docname="docname"
    :phone="phone"
    :to="documentData.data.contact_number"
    :document="documentData.data"
  />
</template>

<script setup>
import { getCurrentInstance, ref, watch, nextTick, onMounted, onBeforeUnmount, computed, h } from 'vue';
import WhatsAppArea from './WhatsAppArea.vue';
import WhatsAppBox from './WhatsAppBox.vue';
import { createResource } from 'frappe-ui';
import WhatsAppIcon from './components/Icons/WhatsAppIcon.vue';
import WhatsappTemplateSelectorModal from './components/WhatsappTemplateSelectorModal.vue';

const app = getCurrentInstance()
const { $socket } = app.appContext.config.globalProperties

const props = defineProps({
  doctype: String,
  docname: String,
  phone: String,
  to: String,
  document: {
    type: Object,
    default: () => ({}) // Provide default structure
  }
});

// const docData = computed(() => props.doc?.data || {});
// const contactNumber = computed(() => docData.value.contact_number || '');
// const doc = defineModel()
const showWhatsappTemplates = ref(false)
const whatsappEnabled = ref(true); // Set this dynamically if needed
const whatsappBox = ref(null)
const reply = ref({});
const whatsapp = ref({
  attach: '',
  content_type: 'text',
});

function sendTemplate(template) {
  showWhatsappTemplates.value = false;
  try {
    createResource({
      url: 'frappe_hfhg.api.whatsapp.send_whatsapp_template',
      params: {
        reference_doctype: props.doctype,
        reference_name: props.docname,
        to: props.phone,
        template,
      },
      auto: true,
      headers: {
        'X-Frappe-CSRF-Token': frappe.csrf_token
      }
    }).then(() => {
      console.log('Template sent successfully!');
    });
  } catch (error) {
    console.error('Error sending template:', error);
  }
}


// Resource for WhatsApp messages
const whatsappMessages = createResource({
  url: 'frappe_hfhg.api.whatsapp.get_whatsapp_messages',
  cache: ['whatsapp_messages', props.phone],
  params: {
    // reference_doctype: props.doctype,
    // reference_name: props.docname,
    phone: props.phone || props.document.contact_number.replace(/\D/g, "")
  },
  auto: true,
  headers: {
    'X-Frappe-CSRF-Token': frappe.csrf_token
  },
  transform: (data) => data.sort((a, b) => new Date(a.creation) - new Date(b.creation)),
});

// Dynamic text and icon for empty state
const title = ref('WhatsApp');
const emptyText = computed(() => 'No WhatsApp Messages');
const emptyTextIcon = h(WhatsAppIcon, { class: 'text-gray-500' });

// Scroll to the bottom of the messages container
function scrollToBottom() {
  const el = document.querySelector('.messages-container');
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
}

// Watch for new messages and scroll automatically
watch(whatsappMessages.data, () => {
  nextTick(scrollToBottom);
});

// Listen for WebSocket updates
onMounted(() => {
  $socket.on('whatsapp_message', (data) => {
    if (
      (data.reference_doctype === props.doctype &&
      data.reference_name === props.docname) ||
      data.from === props.phone || data.to === props.phone
    ) {
      whatsappMessages.reload();
    }
  });
});

onBeforeUnmount(() => {
  $socket.off('whatsapp_message');
});

</script>

<template>
  <div class="whatsapp-chat-container">
     <div class="top-bar flex items-center justify-between p-3 bg-white shadow">
      <h2 class="text-xl font-semibold text-gray-800">WhatsApp Chat</h2>
      <Button
        label="Send Template"
        class="send-template-btn text-lg"
        @click="showWhatsappTemplates = true"
      />
    </div>

    <!-- Empty State -->
    <div
      v-if="!whatsappMessages.data?.length"
      class="flex flex-1 flex-col items-center justify-center gap-3 text-xl font-medium text-gray-500"
    >
      <component :is="emptyTextIcon" class="h-10 w-10" />
      <span>{{ emptyText }}</span>
    </div>

    <!-- WhatsApp Messages -->
    <div
      v-else
      class="messages-container flex-1 p-4 overflow-y-auto"
    >
      <WhatsAppArea
        class="px-3 sm:px-10"
        v-model:reply="reply"
        :messages="whatsappMessages.data"
      />
    </div>

    <!-- Input Box -->
    <div class="chat-box-container border-t">
      <WhatsAppBox
        ref="whatsappBox"
        v-model:doc="props.document"
        v-model:reply="reply"
        v-model:whatsapp="whatsapp"
        :doctype="props.doctype"
        :docname="props.docname"
        :phone="props.phone"
        @message-sent="whatsappMessages.reload"
      />
    </div>
    <WhatsappTemplateSelectorModal
      v-if="whatsappEnabled"
      v-model="showWhatsappTemplates"
      :doctype="doctype"
      @send="(t) => sendTemplate(t)"
    />
  </div>
</template>

<style>
.whatsapp-chat-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh);
  max-height: 100%;
  background-color: #f0f2f5;
}

/* Top Bar Styling */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e0e0e0;
}

/* Send Template Button */
.send-template-btn {
  background-color: #bababa;
  padding: 6px 14px;
  border-radius: 6px;
  transition: background-color 0.3s ease;
}

.send-template-btn:hover {
  background-color: #999999;
}

.messages-container {
  overflow-y: auto;
}
</style>

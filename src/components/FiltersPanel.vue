<script setup>
const props = defineProps({
  filters: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['toggle'])

const toggle = (key) => emit('toggle', key)
</script>

<template>
  <div class="panel tight">
    <h2>Filters</h2>
    <div class="filter-grid">
      <button :class="['chip', { active: props.filters.facemesh }]" @click="toggle('facemesh')">
        🕸️ Face mesh
      </button>
      <button :class="['chip', { active: props.filters.lipstick }]" @click="toggle('lipstick')">
        💄 Lipstick
      </button>
      <button :class="['chip', { active: props.filters.eyeliner }]" @click="toggle('eyeliner')">
        👁️ Eyeliner
      </button>
      <button :class="['chip', { active: props.filters.glasses }]" @click="toggle('glasses')">
        🤓 Glasses
      </button>
      <button :class="['chip', { active: props.filters.measurements }]" @click="toggle('measurements')">
        📏 Measurements
      </button>
    </div>
    <p class="hint-text">All filters run locally via MediaPipe Tasks.</p>
  </div>
</template>

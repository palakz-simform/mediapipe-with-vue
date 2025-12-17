<script setup>
const props = defineProps({
  isCameraOn: {
    type: Boolean,
    required: true,
  },
  faceDetected: {
    type: Boolean,
    required: true,
  },
  statusMessage: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div class="panel tight status">
    <div class="status-pill" :class="{ live: props.isCameraOn }">
      <span class="dot" />
      {{ props.isCameraOn ? 'Camera on' : 'Camera off' }}
    </div>
    <div class="status-pill" :class="{ live: props.faceDetected }">
      <span class="dot" />
      {{ props.faceDetected ? 'Face detected' : 'Waiting for face' }}
    </div>
    <div class="status-pill muted">{{ props.statusMessage }}</div>
  </div>
</template>

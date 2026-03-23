<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useGame } from '@/composables/useGame'

const canvasRef = ref(null)
const webcamRef = ref(null)

const {
  gameState,
  score,
  handLabel,
  overlayVisible,
  overlayMessage,
  actionBtnText,
  setup,
  teardown,
  onActionClick,
} = useGame(canvasRef, webcamRef)

onMounted(setup)
onUnmounted(teardown)
</script>

<template>
  <main class="app">
    <h1>Hand Gesture Runner</h1>

    <section class="game-wrap">
      <canvas ref="canvasRef" width="900" height="420" />

      <div class="hud">
        <div><strong>State:</strong> <span>{{ gameState }}</span></div>
        <div><strong>Score:</strong> <span>{{ Math.floor(score) }}</span></div>
        <div><strong>Hand:</strong> <span>{{ handLabel }}</span></div>
      </div>

      <div v-if="overlayVisible" class="overlay">
        <p>{{ overlayMessage }}</p>
        <button @click="onActionClick">{{ actionBtnText }}</button>
      </div>
    </section>

    <div class="camera-box">
      <video
        ref="webcamRef"
        playsinline
        muted
        autoplay
        class="webcam-preview"
      />
      <span class="camera-label">Live Camera</span>
    </div>

    <p class="instructions">Move your index finger upward quickly to jump.</p>
  </main>
</template>

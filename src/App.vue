<script setup>
import { ref, watch } from 'vue'
import FiltersPanel from './components/FiltersPanel.vue'
import StatusPanel from './components/StatusPanel.vue'
import { useFaceOverlay } from './composables/useFaceOverlay'
import { use3DAvatar } from './composables/use3DAvatar'

const videoRef = ref(null)
const canvasRef = ref(null)
const canvas3DRef = ref(null)

const {
  isCameraOn,
  isLoadingModel,
  statusMessage,
  faceDetected,
  faceLandmarks,
  blendShapes,
  filters,
  measurements,
  showMeasurements,
  startCamera,
  stopCamera,
  toggleFilter,
} = useFaceOverlay(videoRef, canvasRef)

const {
  isModelLoaded,
  isAvatarVisible,
  updateAvatar,
  handleResize,
  toggleVisibility,
  setAvatarVisible,
} = use3DAvatar(canvas3DRef, videoRef)

// Update 3D avatar when face data changes
watch([faceLandmarks, blendShapes], ([landmarks, shapes]) => {
  if (landmarks && isModelLoaded.value) {
    updateAvatar(landmarks, shapes)
  }
})

watch(isCameraOn, (isOn) => {
  if (!isOn) {
    setAvatarVisible(false)
  }
})

// Handle video metadata loaded for canvas sizing
const onVideoMetadataLoaded = () => {
  handleResize()
}
</script>

<template>
  <div class="page">
    <header class="hero">
      <div>
        <p class="eyebrow">MediaPipe Tasks</p>
        <h1>Face mesh, makeup, glasses, and measurements with the latest API.</h1>
        <p class="lede">Turn the camera on, toggle filters, and view live measurements.</p>
      </div>
      <div class="controls">
        <button class="btn primary" :disabled="isLoadingModel || isCameraOn" @click="startCamera">
          {{ isLoadingModel ? 'Loading model...' : isCameraOn ? 'Camera running' : 'Turn camera on' }}
        </button>
        <button class="btn ghost" :disabled="!isCameraOn" @click="stopCamera">Turn camera off</button>
      </div>
    </header>

    <section class="stage">
      <div class="left-panel">
        <FiltersPanel 
          :filters="filters" 
          :isAvatarVisible="isAvatarVisible"
          :isModelLoaded="isModelLoaded"
          @toggle="toggleFilter" 
          @toggleAvatar="toggleVisibility"
        />
        <StatusPanel
          :isCameraOn="isCameraOn"
          :faceDetected="faceDetected"
          :statusMessage="statusMessage"
        />
      </div>

      <div class="video-card">
        <div class="video-shell">
          <video
            ref="videoRef"
            class="video-element"
            autoplay
            muted
            playsinline
            @loadedmetadata="onVideoMetadataLoaded"
            aria-label="Camera feed"
          ></video>
          <canvas ref="canvas3DRef" class="overlay-3d" aria-label="3D Avatar overlay"></canvas>
          <canvas ref="canvasRef" class="overlay" aria-label="Face mesh overlay"></canvas>
          <div v-if="!isCameraOn" class="hint">
            <p>Press "Turn camera on" and allow permission.</p>
          </div>
        </div>
        <div class="metrics" v-if="showMeasurements">
          <div class="metric"><span>PD</span><strong>{{ measurements.pd }} px</strong></div>
          <div class="metric"><span>PD Left</span><strong>{{ measurements.pdLeft }} px</strong></div>
          <div class="metric"><span>PD Right</span><strong>{{ measurements.pdRight }} px</strong></div>
          <div class="metric"><span>Face width</span><strong>{{ measurements.faceWidth }} px</strong></div>
          <div class="metric"><span>Face shape</span><strong>{{ measurements.faceShape }}</strong></div>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.eyebrow {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.75rem;
  color: #8aa4ff;
  margin-bottom: 0.35rem;
}

h1 {
  font-size: 2rem;
  margin: 0.1rem 0 0.4rem;
  line-height: 1.2;
}

.lede {
  color: #c9d4e4;
  max-width: 36rem;
}

.controls {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.btn {
  padding: 0.85rem 1.1rem;
  border-radius: 12px;
  border: 1px solid transparent;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn.primary {
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  color: #0b1220;
  box-shadow: 0 12px 30px rgba(6, 182, 212, 0.25);
}

.btn.primary:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 36px rgba(6, 182, 212, 0.35);
}

.btn.ghost {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
  color: #d7e2f2;
}

.btn.ghost:not(:disabled):hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.3);
}

.stage {
  display: grid;
  grid-template-columns: 300px 1fr 280px;
  gap: 20px;
  align-items: start;
  max-width: 1400px;
  margin: 0 auto;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.panel {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1rem 1.2rem;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.panel h2 {
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.panel.tight {
  padding: 0.9rem 1rem;
}

.panel.info ul {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 0.45rem;
  color: #d7e2f2;
}

.panel.info li::before {
  content: '•';
  margin-right: 0.4rem;
  color: #7dd3fc;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
}

.chip {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 0.65rem 0.75rem;
  color: #e5ecf7;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s, border 0.2s, transform 0.15s;
}

.chip:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.chip.active {
  background: rgba(6, 182, 212, 0.16);
  border-color: rgba(6, 182, 212, 0.45);
  color: #7ee0ff;
}

.hint-text {
  margin-top: 0.35rem;
  color: #9fb3d8;
  font-size: 0.9rem;
}

.status {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.65rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd6e9;
  background: rgba(255, 255, 255, 0.03);
  font-size: 0.92rem;
}

.status-pill.live {
  border-color: rgba(52, 211, 153, 0.7);
  color: #7bf3c4;
}

.status-pill.muted {
  color: #9fb3d8;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  display: inline-block;
  box-shadow: 0 0 8px currentColor;
}

.video-card {
  width: 640px;
  height: 480px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 0.85rem;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.35);
}

.video-shell {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background: radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.12), transparent),
    #0b1220;
  height: 100%;
  width: 100%;
}

.video-element {
  width: 100%;
  display: block;
  border-radius: 12px;
  filter: brightness(0.95);
  transform: scaleX(-1);
  height: 100%;
  width: 100%;
}

.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transform: scaleX(-1);
  z-index: 2;
}

.overlay-3d {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.hint {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #cdd8ea;
  background: linear-gradient(160deg, rgba(59, 130, 246, 0.08), rgba(6, 182, 212, 0.08));
  z-index: 3;
}

.error-hint {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(239, 68, 68, 0.9);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  z-index: 4;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.6rem;
  margin-top: 0.8rem;
}

.metric {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.6rem 0.7rem;
  border-radius: 12px;
  color: #d7e2f2;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.metric span {
  font-size: 0.85rem;
  color: #9fb3d8;
}

.metric strong {
  font-size: 1rem;
}

@media (max-width: 1100px) {
  .stage {
    grid-template-columns: 1fr;
  }

  .controls {
    flex-wrap: wrap;
  }
}

@media (max-width: 720px) {
  h1 {
    font-size: 1.6rem;
  }

  .filter-grid {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
}
</style>

<script setup>
import { ref, onMounted, watch, onUnmounted } from "vue";
import specsImage from "./assets/specs.jpg";
import useFaceDetection from "./composables/useFaceDetection.js";
import useThreeJS from "./composables/useThreeJS.js";
import useARFilters from "./composables/useARFilters.js";
import useMeasurements from "./composables/useMeasurements.js";
import Header from "./components/Header.vue";
import CameraControls from "./components/CameraControls.vue";
import Filters from "./components/Filters.vue";
import MeasurementsModal from "./components/MeasurementsModal.vue";

const videoElement = ref(null);
const outputCanvas = ref(null);
const threeJsContainer = ref(null);
const isCameraOn = ref(false);
const showMeasurements = ref(false);

const { 
  initFaceDetection, 
  startCamera, 
  toggleCamera, 
  faceDetected, 
  landmarks, 
  isCameraOn: faceDetectionCameraOn, 
  canvasCtx, 
  irisConstant_avg, 
  irisConstant_left,
  irisConstant_right,
  leftIris,
  rightIris,
  leftTemple, 
  rightTemple, 
  vtoLeftTopLandmark,
  isInitialized,
  destroy: destroyFaceDetection
} = useFaceDetection(videoElement, outputCanvas);
const { initThreeJS, updateSize, vtoStart, vtoStop, normalizePoints, updateRotations, calculateHeadPose, headPose, destroy: destroyThreeJS } = useThreeJS(outputCanvas, threeJsContainer);
const { filters, applyFilters } = useARFilters(canvasCtx);
const { calculateMeasurements, detectedPD, detectedPD_L, detectedPD_R, detectedWidth, faceShape, faceSize, getFaceShape } = useMeasurements();

// Reactive measurements data
const measurements = {
  detectedPD,
  detectedPD_L,
  detectedPD_R,
  faceShape,
  faceSize,
  detectedWidth,
};

// Handle landmarks processing
const processLandmarks = () => {
  try {
    if (
      landmarks.value &&
      leftTemple?.value !== undefined &&
      rightTemple?.value !== undefined &&
      vtoLeftTopLandmark?.value !== undefined &&
      irisConstant_avg?.value !== undefined &&
      irisConstant_left?.value !== undefined &&
      irisConstant_right?.value !== undefined &&
      leftIris?.value !== undefined &&
      rightIris?.value !== undefined
    ) {
      // Only calculate measurements when measurement filter is active
      if (filters.value.faceMeasurement || showMeasurements.value) {
        calculateMeasurements(landmarks.value, irisConstant_left.value, irisConstant_right.value, leftIris, rightIris, leftTemple, rightTemple);
      }
      
      // Only update rotations and normalize points when VTO (specs) filter is active
      if (filters.value.specs) {
        updateRotations(landmarks.value, leftTemple, rightTemple);
        normalizePoints(landmarks.value, leftTemple, rightTemple, vtoLeftTopLandmark, irisConstant_avg.value);
        headPose.value = calculateHeadPose(landmarks.value);
      }
      
      // Always apply canvas filters (lipstick, eyeliner, facemesh) when any are active
      const hasCanvasFilters = filters.value.lipstick || filters.value.eyeliner || filters.value.facemesh;
      if (hasCanvasFilters) {
        applyFilters(landmarks.value, outputCanvas.value);
      }
    } else {
      console.error("One or more required refs are undefined in processLandmarks");
    }
  } catch (error) {
    console.error("Error in processLandmarks:", error);
  }
};

// Watch landmarks only after initialization
onMounted(async () => {
  await initFaceDetection();
  initThreeJS();
  updateSize();
  if (isInitialized.value) {
    watch(landmarks, processLandmarks, { deep: true });
  }
});

// Toggle camera state
const handleToggleCamera = () => {
  isCameraOn.value = !isCameraOn.value;
  toggleCamera();
  if (isCameraOn.value) {
    setTimeout(() => {
      faceDetected.value = true;
    }, 1000);
  } else {
    faceDetected.value = false;
  }
};

// Toggle filter state
const toggleFilter = (filter) => {
  filters.value[filter] = !filters.value[filter];

  if (filter === "specs") {
    if (filters.value.specs) {
      vtoStart(specsImage);
    } else {
      vtoStop();
    }
  }

  if (filter === "faceMeasurement") {
    if (filters.value[filter]) {
      getFaceShape.value = true;
      showMeasurements.value = true;
    }
  }

  if (filter === "facialShape") {
    alert("Your facial shape is " + faceShape.value);
    filters.value[filter] = false;
  }
};

const closeMeasurements = () => {
  showMeasurements.value = false;
  filters.value.faceMeasurement = false;
};

onUnmounted(() => {
  destroyFaceDetection();
  destroyThreeJS();
});
</script>

<template>
  <div class="app">
    <Header />
    <div class="main-content">
      <div class="left-panel">
        <CameraControls 
          :is-camera-on="isCameraOn"
          :face-detected="faceDetected"
          @toggle-camera="handleToggleCamera"
        />
        <Filters 
          :filters="filters"
          @toggle-filter="toggleFilter"
        />
      </div>
      <div class="video-panel">
        <div class="video-container">
          <div class="output-container">
            <canvas ref="outputCanvas" class="output_canvas_vto"></canvas>
            <div ref="threeJsContainer" id="threejs-container-vto"></div>
            <div v-if="!isCameraOn" class="camera-placeholder">
              <div class="placeholder-content">
                <div class="camera-icon">📷</div>
                <h3>Start Camera to Begin</h3>
                <p>Click "Start Camera" to activate face filters</p>
              </div>
            </div>
          </div>
        </div>
        <div class="stats-panel">
          <div class="stat-item">
            <span class="stat-label">FPS:</span>
            <span class="stat-value">30</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Filters:</span>
            <span class="stat-value">{{ Object.values(filters).filter(f => f).length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Quality:</span>
            <span class="stat-value">HD</span>
          </div>
        </div>
      </div>
      <div class="right-panel">
        <div class="info-box">
          <h3>Instructions</h3>
          <div class="instruction-steps">
            <div class="step">
              <span class="step-number">1</span>
              <p>Start your camera</p>
            </div>
            <div class="step">
              <span class="step-number">2</span>
              <p>Position your face in frame</p>
            </div>
            <div class="step">
              <span class="step-number">3</span>
              <p>Apply filters and effects</p>
            </div>
          </div>
        </div>
        <div class="features-box">
          <h3>Features</h3>
          <div class="feature-list">
            <div class="feature-item">
              <span class="feature-icon">🎭</span>
              <span>Face Mesh Detection</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">💄</span>
              <span>Makeup Filters</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🤓</span>
              <span>Virtual Try-On</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📏</span>
              <span>Face Measurements</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <video
      ref="videoElement"
      class="input_video_vto"
      style="display: none"
      autoplay
      playsinline
    ></video>
    <MeasurementsModal
      :show="showMeasurements"
      :detected-p-d="measurements.detectedPD.value"
      :detected-p-d-l="measurements.detectedPD_L.value"
      :detected-p-d-r="measurements.detectedPD_R.value"
      :face-shape="measurements.faceShape.value"
      :face-size="measurements.faceSize.value"
      :detected-width="measurements.detectedWidth.value"
      @close="closeMeasurements"
    />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.main-content {
  display: grid;
  grid-template-columns: 300px 1fr 280px;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Left Panel */
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Video Panel */
.video-panel {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.video-container {
  width: 100%;
  height: 500px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  position: relative;
}

.output-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.output_canvas_vto,
#threejs-container-vto {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 20px;
}

.output_canvas_vto {
  object-fit: cover;
}

.camera-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5));
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
}

.placeholder-content {
  text-align: center;
  color: white;
}

.camera-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.8;
}

.placeholder-content h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.placeholder-content p {
  opacity: 0.8;
  font-size: 1rem;
}

/* Stats Panel */
.stats-panel {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  padding: 15px;
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.stat-item {
  text-align: center;
  color: white;
}

.stat-label {
  display: block;
  font-size: 0.8rem;
  opacity: 0.8;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 1.2rem;
  font-weight: 600;
}

/* Right Panel */
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-box,
.features-box {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  padding: 20px;
  backdrop-filter: blur(10px);
  color: white;
}

.info-box h3,
.features-box h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 15px 0;
  color: white;
}

.instruction-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-number {
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 600;
  flex-shrink: 0;
}

.step p {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
  opacity: 0.9;
}

.feature-icon {
  font-size: 1.2rem;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 280px 1fr 250px;
  }
}

@media (max-width: 1024px) {
  .main-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
    gap: 15px;
  }
  
  .left-panel,
  .right-panel {
    flex-direction: row;
    overflow-x: auto;
  }
  
  .left-panel > *,
  .right-panel > * {
    flex-shrink: 0;
  }
  
  .video-container {
    width: 100%;
    min-height: 400px;
  }
}

@media (max-width: 768px) {
  .app {
    padding: 10px;
  }
  
  .main-content {
    gap: 10px;
  }
  
  .left-panel,
  .right-panel {
    flex-direction: column;
  }
  
  .video-container {
    width: 100%;
  }
  
  .stats-panel {
    flex-direction: column;
    gap: 10px;
  }
  
  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  
  .stat-label,
  .stat-value {
    display: inline;
  }
}

/* Hidden video element */
.input_video_vto {
  display: none;
}
</style>

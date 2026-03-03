<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { FaceLandmarker, PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

const videoRef = ref(null)
const previewRef = ref(null)
const canvasRef = ref(null)
const statusText = ref('Initializing...')

let faceLandmarker = null
let poseLandmarker = null
let scene, camera, renderer, animationId
let avatarParts = {}
let lastVideoTime = -1
const disposables = [] // geometries and materials to dispose on unmount

// ─── Build a simple 3-D humanoid avatar ────────────────────────────────────
function buildAvatar() {
  // Materials
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 })
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x4488cc })
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 })
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0xcc4444 })
  disposables.push(skinMat, shirtMat, eyeMat, mouthMat)

  // Root node (everything hangs off this)
  const root = new THREE.Group()
  scene.add(root)

  // Torso
  const torsoGeo = new THREE.BoxGeometry(1.6, 2.0, 0.7)
  disposables.push(torsoGeo)
  const torso = new THREE.Mesh(torsoGeo, shirtMat)
  torso.position.y = 0
  root.add(torso)

  // Neck
  const neckGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.45, 12)
  disposables.push(neckGeo)
  const neck = new THREE.Mesh(neckGeo, skinMat)
  neck.position.y = 1.22
  root.add(neck)

  // Head pivot (rotations applied here)
  const headPivot = new THREE.Group()
  headPivot.position.y = 1.7
  root.add(headPivot)

  // Head
  const headGeo = new THREE.SphereGeometry(0.52, 24, 24)
  disposables.push(headGeo)
  const head = new THREE.Mesh(headGeo, skinMat)
  headPivot.add(head)

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.085, 10, 10)
  disposables.push(eyeGeo)
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
  leftEye.position.set(-0.18, 0.1, 0.47)
  headPivot.add(leftEye)
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
  rightEye.position.set(0.18, 0.1, 0.47)
  headPivot.add(rightEye)

  // Mouth
  const mouthGeo = new THREE.BoxGeometry(0.28, 0.05, 0.05)
  disposables.push(mouthGeo)
  const mouth = new THREE.Mesh(mouthGeo, mouthMat)
  mouth.position.set(0, -0.2, 0.5)
  headPivot.add(mouth)

  // Shoulder pivot (lets both shoulders tilt together)
  const shoulderPivot = new THREE.Group()
  shoulderPivot.position.y = 0.8
  root.add(shoulderPivot)

  // Left shoulder / upper arm
  const armGeo = new THREE.CylinderGeometry(0.17, 0.14, 1.1, 10)
  disposables.push(armGeo)
  const leftArm = new THREE.Mesh(armGeo, shirtMat)
  leftArm.position.set(-1.05, 0, 0)
  leftArm.rotation.z = -Math.PI / 2.5
  shoulderPivot.add(leftArm)

  // Right shoulder / upper arm
  const rightArm = new THREE.Mesh(armGeo, shirtMat)
  rightArm.position.set(1.05, 0, 0)
  rightArm.rotation.z = Math.PI / 2.5
  shoulderPivot.add(rightArm)

  // Left shoulder joint sphere
  const jointGeo = new THREE.SphereGeometry(0.22, 12, 12)
  disposables.push(jointGeo)
  const leftJoint = new THREE.Mesh(jointGeo, skinMat)
  leftJoint.position.set(-0.9, 0.0, 0)
  shoulderPivot.add(leftJoint)

  // Right shoulder joint sphere
  const rightJoint = new THREE.Mesh(jointGeo, skinMat)
  rightJoint.position.set(0.9, 0.0, 0)
  shoulderPivot.add(rightJoint)

  // Store references we'll animate
  avatarParts = { root, headPivot, shoulderPivot, mouth, leftEye, rightEye }
}

// ─── Three.js scene setup ───────────────────────────────────────────────────
function initThree() {
  const canvas = canvasRef.value
  const w = canvas.clientWidth
  const h = canvas.clientHeight

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100)
  camera.position.set(0, 1.0, 6)
  camera.lookAt(0, 1.0, 0)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(w, h)
  renderer.shadowMap.enabled = true

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambient)
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
  dirLight.position.set(3, 8, 5)
  scene.add(dirLight)

  buildAvatar()
}

// ─── MediaPipe setup ────────────────────────────────────────────────────────
async function initMediaPipe() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  )

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      delegate: 'GPU'
    },
    outputFaceBlendshapes: true,
    runningMode: 'VIDEO',
    numFaces: 1
  })

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    numPoses: 1
  })

  statusText.value = 'Ready – allow camera access'
  startCamera()
}

// ─── Camera ─────────────────────────────────────────────────────────────────
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    videoRef.value.srcObject = stream
    if (previewRef.value) previewRef.value.srcObject = stream
    videoRef.value.addEventListener('loadeddata', () => {
      statusText.value = 'Tracking…'
      renderLoop()
    })
  } catch (err) {
    console.error('Camera access error:', err)
    statusText.value = 'Camera access denied'
  }
}

// ─── Utility: clamp ─────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const lerp = (a, b, t) => a + (b - a) * t

// Smooth current values for avatar rotations
const smooth = {
  headYaw: 0, headPitch: 0, headRoll: 0,
  shoulderRoll: 0, shoulderPitch: 0,
  mouthOpen: 0
}

// ─── Apply face landmarks → head rotation ───────────────────────────────────
function applyFaceLandmarks(result) {
  if (!result.faceLandmarks || result.faceLandmarks.length === 0) return

  const lm = result.faceLandmarks[0]

  // Nose tip (1), nose bridge (6), chin (152), left temple (234), right temple (454)
  const noseTip = lm[1]
  const noseBridge = lm[6]
  const chin = lm[152]
  const leftTemple = lm[234]
  const rightTemple = lm[454]

  // Yaw: horizontal offset of nose tip from centre of temples
  const faceWidth = rightTemple.x - leftTemple.x
  const noseCentreX = (leftTemple.x + rightTemple.x) / 2
  const rawYaw = (noseTip.x - noseCentreX) / (faceWidth * 0.5)
  const targetYaw = clamp(-rawYaw * 1.2, -0.8, 0.8) // mirror + scale

  // Pitch: vertical offset of nose bridge from chin–bridge midpoint
  const faceHeight = Math.abs(chin.y - noseBridge.y)
  const centreY = (chin.y + noseBridge.y) / 2
  const rawPitch = (noseTip.y - centreY) / (faceHeight * 0.5)
  const targetPitch = clamp(-rawPitch * 1.0, -0.6, 0.6)

  // Roll: tilt of line from left to right temple
  const dX = rightTemple.x - leftTemple.x
  const dY = rightTemple.y - leftTemple.y
  const targetRoll = clamp(-Math.atan2(dY, dX), -0.4, 0.4)

  // Mouth openness (blendshapes)
  let mouthOpen = 0
  if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
    const shapes = result.faceBlendshapes[0].categories
    const jawOpen = shapes.find(s => s.categoryName === 'jawOpen')
    if (jawOpen) mouthOpen = jawOpen.score
  }

  smooth.headYaw = lerp(smooth.headYaw, targetYaw, 0.2)
  smooth.headPitch = lerp(smooth.headPitch, targetPitch, 0.2)
  smooth.headRoll = lerp(smooth.headRoll, targetRoll, 0.2)
  smooth.mouthOpen = lerp(smooth.mouthOpen, mouthOpen, 0.2)
}

// ─── Apply pose landmarks → shoulder movement ───────────────────────────────
function applyPoseLandmarks(result) {
  if (!result.landmarks || result.landmarks.length === 0) return

  const lm = result.landmarks[0]
  // Landmark 11 = left shoulder, 12 = right shoulder
  const ls = lm[11]
  const rs = lm[12]
  if (!ls || !rs) return

  // Shoulder tilt (roll): difference in Y between the two shoulders
  const dx = rs.x - ls.x
  const dy = rs.y - ls.y
  const tiltAngle = Math.atan2(dy, dx) // positive → right shoulder lower
  const targetRoll = clamp(-tiltAngle * 0.8, -0.35, 0.35)

  // Shoulder pitch: average shoulder Y relative to a neutral midpoint
  const midY = (ls.y + rs.y) / 2
  const targetPitch = clamp((midY - 0.35) * 1.5, -0.3, 0.3)

  smooth.shoulderRoll = lerp(smooth.shoulderRoll, targetRoll, 0.15)
  smooth.shoulderPitch = lerp(smooth.shoulderPitch, targetPitch, 0.15)
}

// ─── Main render loop ────────────────────────────────────────────────────────
function renderLoop() {
  animationId = requestAnimationFrame(renderLoop)

  const video = videoRef.value
  if (!video || video.readyState < 2) return

  const nowMs = performance.now()
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime

    if (faceLandmarker) {
      const faceResult = faceLandmarker.detectForVideo(video, nowMs)
      applyFaceLandmarks(faceResult)
    }
    if (poseLandmarker) {
      const poseResult = poseLandmarker.detectForVideo(video, nowMs)
      applyPoseLandmarks(poseResult)
    }
  }

  // Update avatar
  if (avatarParts.headPivot) {
    avatarParts.headPivot.rotation.y = smooth.headYaw
    avatarParts.headPivot.rotation.x = smooth.headPitch
    avatarParts.headPivot.rotation.z = smooth.headRoll
  }
  if (avatarParts.shoulderPivot) {
    avatarParts.shoulderPivot.rotation.z = smooth.shoulderRoll
    avatarParts.shoulderPivot.rotation.x = smooth.shoulderPitch
  }
  if (avatarParts.mouth) {
    avatarParts.mouth.scale.y = 1 + smooth.mouthOpen * 8
    avatarParts.mouth.position.y = -0.2 - smooth.mouthOpen * 0.06
  }

  renderer.render(scene, camera)
}

// ─── Resize handler ──────────────────────────────────────────────────────────
function onResize() {
  const canvas = canvasRef.value
  if (!canvas || !renderer) return
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────
onMounted(() => {
  initThree()
  initMediaPipe()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
  if (faceLandmarker) faceLandmarker.close()
  if (poseLandmarker) poseLandmarker.close()
  disposables.forEach(obj => obj.dispose())
  renderer?.dispose()
})
</script>

<template>
  <div class="avatar-wrapper">
    <!-- Hidden video for MediaPipe input -->
    <video ref="videoRef" autoplay playsinline muted class="input-video" />

    <!-- Three.js canvas for 3D avatar -->
    <canvas ref="canvasRef" class="avatar-canvas" />

    <!-- Webcam preview overlay (small, bottom-right) -->
    <video
      ref="previewRef"
      autoplay
      playsinline
      muted
      class="camera-preview"
    />

    <!-- Status bar -->
    <div class="status-bar">{{ statusText }}</div>

    <!-- Legend -->
    <div class="legend">
      <span>😐 Head: yaw · pitch · roll from face landmarks</span>
      <span>🦾 Shoulders: tilt from pose landmarks</span>
    </div>
  </div>
</template>

<style scoped>
.avatar-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #1a1a2e;
}

.avatar-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.input-video {
  display: none;
}

.camera-preview {
  position: absolute;
  bottom: 60px;
  right: 16px;
  width: 220px;
  height: 165px;
  border-radius: 10px;
  border: 2px solid #4488cc;
  object-fit: cover;
  z-index: 10;
  transform: scaleX(-1); /* mirror */
}

.status-bar {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  padding: 6px 18px;
  border-radius: 20px;
  font-size: 0.9rem;
  z-index: 10;
}

.legend {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 24px;
  background: rgba(0, 0, 0, 0.5);
  color: #ccc;
  padding: 6px 18px;
  border-radius: 20px;
  font-size: 0.78rem;
  z-index: 10;
  white-space: nowrap;
}
</style>

import { ref } from 'vue'
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

export function useHandTracking(videoRef) {
  let handLandmarker = null
  let lastVideoTime = -1

  const ready = ref(false)
  const hasHand = ref(false)

  const smoothingWindow = 5
  const yHistory = []
  let prevY = 0
  let currentY = 0

  async function init() {
    // Start webcam stream on the video element
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    videoRef.value.srcObject = stream
    await new Promise((resolve) => {
      videoRef.value.onloadedmetadata = resolve
    })

    // Initialise HandLandmarker from the locally-served wasm (no CDN)
    const vision = await FilesetResolver.forVisionTasks('/node_modules/@mediapipe/tasks-vision/wasm')

    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: '/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
    })

    ready.value = true
  }

  function detect() {
    const video = videoRef.value
    if (!handLandmarker || !ready.value || !video || video.readyState < 2) return
    if (video.currentTime === lastVideoTime) return
    lastVideoTime = video.currentTime

    const results = handLandmarker.detectForVideo(video, performance.now())

    if (results.landmarks && results.landmarks.length > 0) {
      hasHand.value = true

      const indexTip = results.landmarks[0][8]
      const rawY = indexTip.y

      yHistory.push(rawY)
      if (yHistory.length > smoothingWindow) yHistory.shift()

      const smoothedY = yHistory.reduce((sum, y) => sum + y, 0) / yHistory.length

      if (currentY === 0 && prevY === 0) {
        currentY = smoothedY
        prevY = smoothedY
      } else {
        prevY = currentY
        currentY = smoothedY
      }
    } else {
      hasHand.value = false
      yHistory.length = 0
      prevY = currentY
    }
  }

  function getFingerMotion() {
    return {
      ready: ready.value,
      hasHand: hasHand.value,
      prevY,
      currentY,
    }
  }

  return { init, detect, getFingerMotion, ready }
}

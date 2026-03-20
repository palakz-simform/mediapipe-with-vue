import { computed, onMounted, onUnmounted, ref } from 'vue'
import { DrawingUtils, FaceLandmarker } from '@mediapipe/tasks-vision'
import specsAsset from '../assets/specs.jpg'
import { useFaceLandmarker } from './useFaceLandmarker'
import { useFaceMeasurements } from './useFaceMeasurements'

export function useFaceOverlay(videoRef, canvasRef) {
  const faceDetected = ref(false)
  const faceLandmarks = ref(null)
  const blendShapes = ref(null)

  const filters = ref({
    facemesh: false,
    lipstick: false,
    eyeliner: false,
    glasses: false,
    measurements: false,
  })

  let drawingUtils
  let specsImg
  let specsReady = false

  const getCtx = () => {
    const canvas = canvasRef.value
    if (!canvas) return null
    return canvas.getContext('2d')
  }

  const ensureSpecsImage = () => {
    if (specsReady || specsImg) return
    specsImg = new Image()
    specsImg.onload = () => {
      specsReady = true
    }
    specsImg.src = specsAsset
  }

  const resizeCanvasToVideo = () => {
    const video = videoRef.value
    const canvas = canvasRef.value
    if (!video || !canvas) return

    const { videoWidth, videoHeight } = video
    if (videoWidth === 0 || videoHeight === 0) return

    canvas.width = videoWidth
    canvas.height = videoHeight
  }

  const toPixels = (landmark) => {
    const canvas = canvasRef.value
    if (!canvas || !landmark) return { x: 0, y: 0 }
    return {
      x: landmark.x * canvas.width,
      y: landmark.y * canvas.height,
    }
  }

  const drawFaceMesh = (landmarks) => {
    const ctx = getCtx()
    if (!ctx || !landmarks?.length) return
    if (!drawingUtils) drawingUtils = new DrawingUtils(ctx)

    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
      color: '#f472b6',
      lineWidth: 2,
    })
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, {
      color: '#22d3ee',
      lineWidth: 1.5,
    })
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, {
      color: '#a855f7',
      lineWidth: 1.5,
    })
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, {
      color: '#fbbf24',
      lineWidth: 1.5,
    })
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, {
      color: '#fbbf24',
      lineWidth: 1.5,
    })
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, {
      color: '#5eead4',
      lineWidth: 2,
    })

    ctx.fillStyle = '#ffffff'
    landmarks.forEach((landmark) => {
      const { x, y } = toPixels(landmark)
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, 2 * Math.PI)
      ctx.fill()
    })
  }

  const drawLipstick = (landmarks) => {
    const ctx = getCtx()
    if (!ctx || !landmarks?.length) return
    const outerLipIndices = [
      61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146,
    ]
    const innerLipIndices = [
      78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191,
    ]

    ctx.save()
    ctx.fillStyle = 'rgba(142, 22, 66, 0.55)'
    ctx.beginPath()
    const moveTo = (index, first = false) => {
      const { x, y } = toPixels(landmarks[index])
      if (first) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    moveTo(outerLipIndices[0], true)
    outerLipIndices.slice(1).forEach((i) => moveTo(i))
    ctx.closePath()
    moveTo(innerLipIndices[0], true)
    innerLipIndices.slice(1).forEach((i) => moveTo(i))
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  const drawEyeliner = (landmarks) => {
    const ctx = getCtx()
    if (!ctx || !landmarks?.length) return
    const paths = [
      [33, 160, 158, 133],
      [263, 387, 385, 362],
    ]
    ctx.save()
    ctx.strokeStyle = 'rgba(10, 10, 10, 0.75)'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    paths.forEach((indices) => {
      indices.forEach((index, idx) => {
        const { x, y } = toPixels(landmarks[index])
        if (idx === 0) ctx.beginPath()
        if (idx === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    })
    ctx.restore()
  }

  const drawGlasses = (landmarks) => {
    const ctx = getCtx()
    if (!ctx || !landmarks?.length) return
    ensureSpecsImage()
    if (!specsReady) return

    const leftEye = toPixels(landmarks[33])
    const rightEye = toPixels(landmarks[263])
    const noseBridge = toPixels(landmarks[6])
    const noseTip = toPixels(landmarks[1])
    const leftCheek = toPixels(landmarks[234])
    const rightCheek = toPixels(landmarks[454])

    const eyeMidY = (leftEye.y + rightEye.y) / 2
    const eyeDistance = Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y)
    const width = eyeDistance * 1.6
    const height = width * (specsImg.height > 0 ? specsImg.height / specsImg.width : 0.35)
    const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x)
    const faceWidth = Math.hypot(leftCheek.x - rightCheek.x, leftCheek.y - rightCheek.y)
    const yaw = -((noseTip.x - (leftCheek.x + rightCheek.x) / 2) / (faceWidth / 2)) * 0.5

    ctx.save()
    ctx.translate(noseBridge.x, eyeMidY + height * 0.15)
    ctx.rotate(angle)
    ctx.transform(1, 0, -Math.tan(yaw) * 0.3, 1, 0, 0)
    ctx.drawImage(specsImg, -width * Math.cos(yaw) / 2, -height / 2, width * Math.cos(yaw), height)
    ctx.restore()
  }

  
  const distance = (a, b) => {
    if (!a || !b) return 0
    const p1 = toPixels(a)
    const p2 = toPixels(b)
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  const {
    measurements,
    showMeasurements,
    updateMeasurements,
  } = useFaceMeasurements(distance)

  const applyFilters = (landmarks) => {
    if (filters.value.facemesh) drawFaceMesh(landmarks)
    if (filters.value.lipstick) drawLipstick(landmarks)
    if (filters.value.eyeliner) drawEyeliner(landmarks)
    if (filters.value.glasses) drawGlasses(landmarks)
  }

  const drawResults = (results) => {
    const video = videoRef.value
    const ctx = getCtx()
    if (!ctx || !video) return

    resizeCanvasToVideo()
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    const landmarks = results?.faceLandmarks?.[0]
    if (!landmarks) {
      faceDetected.value = false
      faceLandmarks.value = null
      blendShapes.value = null
      statusMessage.value = isCameraOn.value ? 'No face detected' : 'Camera is off'
      return
    }

    faceDetected.value = true
    statusMessage.value = 'Face detected'
    faceLandmarks.value = landmarks
    blendShapes.value = results.faceBlendshapes?.[0]?.categories ?? null
    applyFilters(landmarks)
  }

  const {
    isCameraOn,
    isLoadingModel,
    statusMessage,
    startCamera,
    stopCamera: stopLandmarkerCamera,
    dispose,
  } = useFaceLandmarker(videoRef, { onResults: drawResults })

  const captureMeasurements = () => {
    if (faceLandmarks.value) {
      updateMeasurements(faceLandmarks.value)
    }
  }

  const stopCamera = () => {
    stopLandmarkerCamera()

    const clearCtx = getCtx()
    if (clearCtx) {
      clearCtx.clearRect(0, 0, clearCtx.canvas.width, clearCtx.canvas.height)
    }

    faceDetected.value = false
    faceLandmarks.value = null
    blendShapes.value = null
  }

  const toggleFilter = (key) => {
    filters.value[key] = !filters.value[key]
  }

  onMounted(() => {
    ensureSpecsImage()
    statusMessage.value = 'Load the model and start the camera to see the overlays.'
  })

  onUnmounted(() => {
    dispose()
  })

  return {
    isCameraOn,
    isLoadingModel,
    statusMessage,
    faceDetected,
    faceLandmarks,
    blendShapes,
    filters,
    measurements,
    showMeasurements: computed(() => showMeasurements.value && faceDetected.value),
    startCamera,
    stopCamera,
    toggleFilter,
    captureMeasurements,
  }
}

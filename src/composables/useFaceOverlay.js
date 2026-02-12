import { computed, onMounted, onUnmounted, ref } from 'vue'
import { FaceLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'
import specsAsset from '../assets/specs.jpg'

export function useFaceOverlay(videoRef, canvasRef) {
  const isCameraOn = ref(false)
  const isLoadingModel = ref(false)
  const statusMessage = ref('Camera is off')
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

  const measurements = ref({
    pd: 0,
    pdLeft: 0,
    pdRight: 0,
    faceWidth: 0,
    faceShape: '-',
  })

  const showMeasurements = computed(() => filters.value.measurements && faceDetected.value)

  let faceLandmarker
  let drawingUtils
  let animationFrameId
  let mediaStream
  let specsImg
  let specsReady = false

  const modelAssetUrl = '/face_landmarker.task'

  const ensureSpecsImage = () => {
    if (specsReady || specsImg) return
    specsImg = new Image()
    specsImg.onload = () => {
      specsReady = true
    }
    specsImg.src = specsAsset
  }

  const ensureFaceLandmarker = async () => {
    if (faceLandmarker) return faceLandmarker

    isLoadingModel.value = true
    statusMessage.value = 'Loading MediaPipe model...'

    const filesetResolver = await FilesetResolver.forVisionTasks(
      '/node_modules/@mediapipe/tasks-vision/wasm'
    )

    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: modelAssetUrl,
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
    })

    isLoadingModel.value = false
    statusMessage.value = 'Model loaded. Start the camera to see overlays.'
    return faceLandmarker
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

  const drawLipstick = (landmarks) => {
    const canvas = canvasRef.value
    if (!canvas || !landmarks?.length) return
    const ctx = canvas.getContext('2d')
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
    const canvas = canvasRef.value
    if (!canvas || !landmarks?.length) return
    const ctx = canvas.getContext('2d')
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
    const canvas = canvasRef.value
    if (!canvas || !landmarks?.length) return
    ensureSpecsImage()
    if (!specsReady) return

    const ctx = canvas.getContext('2d')
    const leftEye = toPixels(landmarks[33])
    const rightEye = toPixels(landmarks[263])
    const center = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 }

    // Calculate rotation angle from eye positions
    const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x)

    const eyeDistance = Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y)
    const width = eyeDistance * 1.6
    const aspect = specsImg.height > 0 ? specsImg.height / specsImg.width : 0.35
    const height = width * aspect
    const offsetY = -height * 0.15 // drop glasses slightly below the eye line

    ctx.save()
    // Translate to center, rotate, then draw
    ctx.translate(center.x, center.y - offsetY)
    ctx.rotate(angle)
    ctx.drawImage(specsImg, -width / 2, -height / 2, width, height)
    ctx.restore()
  }

  const drawFaceMesh = (landmarks) => {
    const canvas = canvasRef.value
    if (!canvas || !landmarks?.length) return
    const ctx = canvas.getContext('2d')
    if (!drawingUtils) drawingUtils = new DrawingUtils(ctx)

    // Draw only key facial feature connectors
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

    // Draw landmark dots
    ctx.fillStyle = '#ffffff'
    landmarks.forEach((landmark) => {
      const { x, y } = toPixels(landmark)
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, 2 * Math.PI)
      ctx.fill()
    })
  }

  const distance = (a, b) => {
    if (!a || !b) return 0
    const p1 = toPixels(a)
    const p2 = toPixels(b)
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  const classifyFaceShape = (landmarks) => {
    const top = landmarks[10]
    const bottom = landmarks[152]
    const left = landmarks[234]
    const right = landmarks[454]
    if (!top || !bottom || !left || !right) return '-'
    const length = distance(top, bottom)
    const width = distance(left, right)
    const ratio = width / (length || 1)
    if (ratio >= 0.68) return 'Round'
    if (ratio >= 0.63 && ratio < 0.68) return 'Oval'
    if (ratio >= 0.6 && ratio < 0.63) return 'Oblong'
    return 'Square'
  }

  const updateMeasurements = (landmarks) => {
    const leftIris = landmarks[468]
    const rightIris = landmarks[473]
    const leftTemple = landmarks[127]
    const rightTemple = landmarks[356]
    const pdLeft = distance(leftIris, rightIris) / 2
    const pdRight = pdLeft
    const pd = distance(leftIris, rightIris)
    const faceWidth = distance(leftTemple, rightTemple)
    measurements.value = {
      pd: Math.round(pd),
      pdLeft: Math.round(pdLeft),
      pdRight: Math.round(pdRight),
      faceWidth: Math.round(faceWidth),
      faceShape: classifyFaceShape(landmarks),
    }
  }

  const applyFilters = (landmarks) => {
    if (filters.value.facemesh) drawFaceMesh(landmarks)
    if (filters.value.lipstick) drawLipstick(landmarks)
    if (filters.value.eyeliner) drawEyeliner(landmarks)
    if (filters.value.glasses) drawGlasses(landmarks)
    if (filters.value.measurements) updateMeasurements(landmarks)
  }

  const drawResults = (results) => {
    const canvas = canvasRef.value
    const video = videoRef.value
    if (!canvas || !video) return

    resizeCanvasToVideo()

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)                
    console.log('Drawing results:', results)
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
    
    // Store landmarks for 3D avatar positioning
    faceLandmarks.value = landmarks
    
    // Store blend shapes for 3D avatar
    if (results.faceBlendshapes?.[0]?.categories) {
      blendShapes.value = results.faceBlendshapes[0].categories
    }
    
    applyFilters(landmarks)
  }

  const runDetectionLoop = () => {
    const video = videoRef.value
    if (!video || !faceLandmarker) return

    if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      animationFrameId = requestAnimationFrame(runDetectionLoop)
      return
    }

    const nowMs = performance.now()
    const results = faceLandmarker.detectForVideo(video, nowMs)
    drawResults(results)
    animationFrameId = requestAnimationFrame(runDetectionLoop)
  }

  const startCamera = async () => {
    if (isCameraOn.value || isLoadingModel.value) return

    try {
      await ensureFaceLandmarker()
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      const video = videoRef.value
      video.srcObject = mediaStream

      await video.play()
      resizeCanvasToVideo()

      isCameraOn.value = true
      statusMessage.value = 'Looking for faces...'
      runDetectionLoop()
    } catch (err) {
      console.error(err)
      statusMessage.value = 'Camera or model failed to start. Check permissions.'
    }
  }

  const stopCamera = () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
    animationFrameId = undefined

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop())
      mediaStream = null
    }

    const video = videoRef.value
    if (video) {
      video.pause()
      video.srcObject = null
    }

    const canvas = canvasRef.value
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    isCameraOn.value = false
    faceDetected.value = false
    statusMessage.value = 'Camera is off'
  }

  const toggleFilter = (key) => {
    filters.value[key] = !filters.value[key]
  }

  onMounted(() => {
    ensureSpecsImage()
    statusMessage.value = 'Load the model and start the camera to see the overlays.'
  })

  onUnmounted(() => {
    stopCamera()
    if (faceLandmarker) {
      faceLandmarker.close()
      faceLandmarker = null
    }
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
    showMeasurements,
    startCamera,
    stopCamera,
    toggleFilter,
  }
}

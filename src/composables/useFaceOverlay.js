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
    faceShape: '-',
  })

  const hasMeasurements = ref(false)
  const showMeasurements = computed(() => hasMeasurements.value && faceDetected.value)

  let faceLandmarker
  let drawingUtils
  let animationFrameId
  let mediaStream
  let specsImg
  let specsReady = false
  let ctx = null
  const AVERAGE_IRIS_DIAMETER_MM = 11.8

  const modelAssetUrl = '/face_landmarker.task'

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

    // Key landmark points
    const leftEye = toPixels(landmarks[33])
    const rightEye = toPixels(landmarks[263])
    const noseBridge = toPixels(landmarks[6])
    const noseTip = toPixels(landmarks[1])
    const leftCheek = toPixels(landmarks[234])
    const rightCheek = toPixels(landmarks[454])

    // Position: nose bridge X + eye midpoint Y, shifted down slightly
    const eyeMidY = (leftEye.y + rightEye.y) / 2
    const eyeDistance = Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y)
    const width = eyeDistance * 1.6
    const height = width * (specsImg.height > 0 ? specsImg.height / specsImg.width : 0.35)

    // Roll: tilt between eyes
    const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x)

    // Yaw: horizontal head turn from nose offset relative to face center
    const faceWidth = Math.hypot(leftCheek.x - rightCheek.x, leftCheek.y - rightCheek.y)
    const yaw = -((noseTip.x - (leftCheek.x + rightCheek.x) / 2) / (faceWidth / 2)) * 0.5

    ctx.save()
    ctx.translate(noseBridge.x, eyeMidY + height * 0.15) // shift glasses below eye line
    ctx.rotate(angle)
    ctx.transform(1, 0, -Math.tan(yaw) * 0.3, 1, 0, 0) // skew for yaw perspective
    ctx.drawImage(specsImg, -width * Math.cos(yaw) / 2, -height / 2, width * Math.cos(yaw), height)
    ctx.restore()
  }

  const drawFaceMesh = (landmarks) => {
    const ctx = getCtx()
    if (!ctx || !landmarks?.length) return
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
    const noseBridge = landmarks[6]
    const leftIris = landmarks[468]
    const rightIris = landmarks[473]

    // Estimate px->mm scale using iris diameter landmarks.
    // Left iris ring: 469,470,471,472 | Right iris ring: 474,475,476,477
    const leftIrisHorizontal = distance(landmarks[469], landmarks[471])
    const leftIrisVertical = distance(landmarks[470], landmarks[472])
    const rightIrisHorizontal = distance(landmarks[474], landmarks[476])
    const rightIrisVertical = distance(landmarks[475], landmarks[477])

    const irisDiameterPx =
      (leftIrisHorizontal + leftIrisVertical + rightIrisHorizontal + rightIrisVertical) / 4
    const pxPerMm = irisDiameterPx > 0 ? irisDiameterPx / AVERAGE_IRIS_DIAMETER_MM : 0
    const pdLeftPx = distance(noseBridge, leftIris)
    const pdRightPx = distance(noseBridge, rightIris)
    const pdPx = distance(leftIris, rightIris)

    const pdLeft = pxPerMm > 0 ? pdLeftPx / pxPerMm : 0
    const pdRight = pxPerMm > 0 ? pdRightPx / pxPerMm : 0
    const pd = pxPerMm > 0 ? pdPx / pxPerMm : 0

    measurements.value = {
      pd: Math.round(pd),
      pdLeft: Math.round(pdLeft),
      pdRight: Math.round(pdRight),
      faceShape: classifyFaceShape(landmarks),
    }
    hasMeasurements.value = true
  }

  const captureMeasurements = () => {
    if (faceLandmarks.value) {
      updateMeasurements(faceLandmarks.value)
    }
  }

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
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true })
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

    const clearCtx = getCtx()
    if (clearCtx) {
      clearCtx.clearRect(0, 0, clearCtx.canvas.width, clearCtx.canvas.height)
    }
    ctx = null

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
    captureMeasurements,
  }
}

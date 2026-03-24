import { ref } from 'vue'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

export function useFaceLandmarker(videoRef, { onResults } = {}) {
  const modelAssetUrl = '/face_landmarker.task'
  const isCameraOn = ref(false)
  const isLoadingModel = ref(false)
  const statusMessage = ref('Camera is off')

  let faceLandmarker = null
  let animationFrameId = null
  let mediaStream = null

  const ensureFaceLandmarker = async () => {
    if (faceLandmarker) return faceLandmarker

    isLoadingModel.value = true
    statusMessage.value = 'Loading MediaPipe model...'

    try {
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

      statusMessage.value = 'Model loaded. Start the camera to see overlays.'
      return faceLandmarker
    } catch (err) {
      statusMessage.value = 'Failed to load MediaPipe model.'
      throw err
    } finally {
      isLoadingModel.value = false
    }
  }

  const runDetectionLoop = () => {
    const video = videoRef.value
    if (!video || !faceLandmarker) return

    if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      animationFrameId = requestAnimationFrame(runDetectionLoop)
      return
    }

    const milliSec = performance.now()
    const results = faceLandmarker.detectForVideo(video, milliSec)
    onResults?.(results)
    animationFrameId = requestAnimationFrame(runDetectionLoop)
  }

  const startCamera = async () => {
    if (isCameraOn.value || isLoadingModel.value) return

    try {
      await ensureFaceLandmarker()
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true })
      const video = videoRef.value
      if (!video) return

      video.srcObject = mediaStream
      await video.play()

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
    animationFrameId = null

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop())
      mediaStream = null
    }

    const video = videoRef.value
    if (video) {
      video.pause()
      video.srcObject = null
    }

    isCameraOn.value = false
    statusMessage.value = 'Camera is off'
  }

  const dispose = () => {
    stopCamera()
    if (faceLandmarker) {
      faceLandmarker.close()
      faceLandmarker = null
    }
  }

  return {
    isCameraOn,
    isLoadingModel,
    statusMessage,
    startCamera,
    stopCamera,
    dispose,
  }
}

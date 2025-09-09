import { ref } from "vue";
import * as cam from "@mediapipe/camera_utils";
import { FaceMesh, FACEMESH_RIGHT_IRIS, FACEMESH_LEFT_IRIS } from "@mediapipe/face_mesh";
import * as draw from "@mediapipe/drawing_utils";

export default function useFaceDetection(videoElementRef, canvasElementRef) {
  const faceDetected = ref(false);
  const canvasCtx = ref(null);
  const irisSize = ref(12.2);
  const irisConstant_left = ref(0);
  const irisConstant_right = ref(0);
  const irisConstant_avg = ref(0);
  const irisConstant_max = ref(0);
  const irisConstant_min = ref(0);
  const leftInnerIrisEdge = ref(469);
  const leftOuterIrisEdge = ref(471);
  const rightInnerIrisEdge = ref(476);
  const rightOuterIrisEdge = ref(474);
  const leftIris = ref(468);
  const rightIris = ref(473);
  const leftTemple = ref(143);
  const rightTemple = ref(372);
  const vtoLeftTopLandmark = ref(8);
  const isOriented = ref(false);
  let faceMesh = null;
  let camera = null;
  const isCameraOn = ref(false);
  const messages = ref(["", "Are you ready?", "Look at the camera", "3", "2", "1", ""]);
  const currentIndex = ref(0);
  const showMessage = ref(false);
  const landmarks = ref(null);
  const isInitialized = ref(false); // New ref to track initialization

  const initFaceDetection = async () => {
    if (!videoElementRef.value || !canvasElementRef.value) {
      console.error("Video or canvas element not available");
      return;
    }
    canvasCtx.value = canvasElementRef.value.getContext("2d");

    faceMesh = new FaceMesh({
      locateFile: (file) => `../../public/mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      selfieMode: true,
      maxNumFaces: 3,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    faceMesh.onResults(onResults);

    camera = new cam.Camera(videoElementRef.value, {
      onFrame: async () => {
        await faceMesh.send({ image: videoElementRef.value });
      },
    });

    isInitialized.value = true; // Mark as initialized
  };

  const startCamera = async () => {
    if (!camera) {
      console.error("Camera not initialized");
      return;
    }
    await camera.start();
    isCameraOn.value = true;
  };

  const stopCamera = () => {
    if (camera) {
      camera.stop();
      isCameraOn.value = false;
    }
  };

  const toggleCamera = () => {
    if (isCameraOn.value) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const prepareCanvas = (results) => {
    if (!canvasElementRef.value || !videoElementRef.value || !canvasCtx.value) return;

    canvasElementRef.value.width = videoElementRef.value.videoWidth;
    canvasElementRef.value.height = videoElementRef.value.videoHeight;
    faceDetected.value = false;

    canvasCtx.value.save();
    canvasCtx.value.clearRect(0, 0, canvasElementRef.value.width, canvasElementRef.value.height);
    canvasCtx.value.drawImage(
      results.image,
      0,
      0,
      canvasElementRef.value.width,
      canvasElementRef.value.height
    );
  };

  const drawIrisConnectorsAndCircles = (landmarks) => {
    draw.drawConnectors(canvasCtx.value, landmarks, FACEMESH_RIGHT_IRIS, {
      color: "#30FF30",
      lineWidth: 0.25,
    });
    draw.drawConnectors(canvasCtx.value, landmarks, FACEMESH_LEFT_IRIS, {
      color: "#30FF30",
      lineWidth: 0.25,
    });
  };

  const calculateDistance = (landmark1, landmark2, d2 = true) => {
    const dx = landmark1.x - landmark2.x;
    const dy = landmark1.y - landmark2.y;
    if (d2) {
      return Math.sqrt(dx * dx + dy * dy);
    } else {
      const dz = landmark1.z - landmark2.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  };

  const findMidPoint = (pointA, pointB) => {
    const midX = (pointA.x + pointB.x) / 2;
    const midY = (pointA.y + pointB.y) / 2;
    const midZ = (pointA.z + pointB.z) / 2;
    return { x: midX, y: midY, z: midZ };
  };

  const calculateIrisConstants = (landmarks) => {
    const leftIrisRelativeDistance = calculateDistance(
      landmarks[leftInnerIrisEdge.value],
      landmarks[leftOuterIrisEdge.value]
    );
    const rightIrisRelativeDistance = calculateDistance(
      landmarks[rightInnerIrisEdge.value],
      landmarks[rightOuterIrisEdge.value]
    );

    irisConstant_left.value = irisSize.value / leftIrisRelativeDistance;
    irisConstant_right.value = irisSize.value / rightIrisRelativeDistance;
    irisConstant_max.value = Math.max(irisConstant_left.value, irisConstant_right.value);
    irisConstant_min.value = Math.min(irisConstant_left.value, irisConstant_right.value);
    irisConstant_avg.value = (irisConstant_left.value + irisConstant_right.value) / 2;
  };

  const onResults = (results) => {
    prepareCanvas(results);

    if (results.multiFaceLandmarks.length > 0) {
      for (const detectedLandmarks of results.multiFaceLandmarks) {
        landmarks.value = detectedLandmarks;
        faceDetected.value = true;
        drawIrisConnectorsAndCircles(detectedLandmarks);
        calculateIrisConstants(detectedLandmarks);
      }
    } else {
      landmarks.value = null;
      faceDetected.value = false;
    }
    canvasCtx.value?.restore();
  };

  const destroy = () => {
    stopCamera();
    if (faceMesh) {
      faceMesh.close();
      faceMesh = null;
    }
  };

  return {
    initFaceDetection,
    startCamera,
    stopCamera,
    toggleCamera,
    faceDetected,
    landmarks,
    isCameraOn,
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
    destroy,
  };
}
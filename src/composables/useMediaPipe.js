import { ref } from "vue";
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/+esm";
import * as cam from "@mediapipe/camera_utils";
import * as draw from "@mediapipe/drawing_utils";
import { Holistic } from "@mediapipe/holistic";
import specsImage from "@/assets/specs.jpg";
import {
  FaceMesh,
  FACEMESH_RIGHT_IRIS,
  FACEMESH_LEFT_IRIS,
} from "@mediapipe/face_mesh";

export default function useMediaPipe() {
  // Refs for elements and states
  let frameImage = new Image();
  const input_video = ref(null);
  const output_canvas = ref(null);
  const threejs_container = ref(null); // remove if not needed
  const faceDetected = ref(false);

  // Measurement refs
  const detectedPD_L = ref(0);
  const detectedPD_R = ref(0);
  const detectedPD = ref(0);
  const detectedBridge = ref(0);
  const detectedWidth = ref(0);

  // Rolling averages
  const rollingAverage = ref({
    pd: [],
    pd_l: [],
    pd_r: [],
    bridge: [],
    width: [],
    height: [],
  });

  // Iris related refs
  const irisSize = ref(12.2);
  const irisConstant_left = ref(0);
  const irisConstant_right = ref(0);
  const irisConstant_max = ref(0);
  const irisConstant_min = ref(0);
  const irisConstant_avg = ref(0);

  // Landmark indices
  const leftInnerIrisEdge = ref(469);
  const leftOuterIrisEdge = ref(471);
  const rightInnerIrisEdge = ref(476);
  const rightOuterIrisEdge = ref(474);
  const leftIris = ref(468);
  const rightIris = ref(473);
  const leftTemple = ref(143);
  const rightTemple = ref(372);

  // Messages for countdown
  const messages = ref([
    "",
    "Are you ready?",
    "Look at the camera",
    "3",
    "2",
    "1",
    "",
  ]);
  const currentIndex = ref(0);
  const showMessage = ref(false);

  // Virtual Try-On refs
  const isTryOn = ref(false);
  const imageAspectRatio = ref(null);
  const glassesTexture = ref(null);
  const glassesMaterial = ref(null);
  const glassesGeometry = ref(null);
  const glassesHeight = ref(null);
  const glassesWidth = ref(null);
  let glassesMesh = null;
  const vtoWidth = ref(null);
  const vtoX = ref(null);
  const vtoY = ref(null);
  const vtoZ = ref(null);
  const vtoNormalizedX = ref(null);
  const vtoNormalizedY = ref(null);
  const vtoAspectRatio = ref(null);
  const vtoRotationX = ref(null);
  const vtoRotationZ = ref(null);
  const vtoRotationY = ref(null);
  const vtoLeftTopLandmark = ref(8);

  // Video and canvas
  const videoElement = ref(null);
  const canvasElement = ref(null);
  const canvasCtx = ref(null);

  // Orientation and instances
  const isOriented = ref(false);
  let faceMesh = null;
  let holistic = null;
  let camera = null;
  const isCameraOn = ref(false);

  // Three.js instances
  let scene = null;
  let threeJSCamera = null;
  let renderer = null;

  // Other refs
  const zDampingFactor = ref(0.6);
  const xDampingFactor = ref(0.8);
  const yDampingFactor = ref(0.6);
  const sizeScaleFactor = ref(1.1);
  const headPose = ref(null);
  const getFaceShape = ref(false);
  const isModal = ref(false);
  const faceSize = ref(null);
  const faceShape = ref(null);
  const showEyeBridgeMid = ref(false);
  const filters = ref({
    specs: false,
    lipstick: false,
    eyeliner: false,
    facemesh: false,
    facialShape: false,
  });

  // Initialization functions
  const initMediaPipe = () => {
    videoElement.value = input_video.value;
    canvasElement.value = output_canvas.value;
    canvasCtx.value = canvasElement.value.getContext("2d");

    holistic = new Holistic({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
    });
    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    holistic.onResults(onResults);

    faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    faceMesh.setOptions({
      selfieMode: true,
      maxNumFaces: 3,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    faceMesh.onResults(onResults);

    camera = new cam.Camera(videoElement.value, {
      onFrame: async () => {
        await faceMesh.send({ image: videoElement.value });
      },
    });
  };

  const initThreeJS = () => {
    scene = new THREE.Scene();
    const FOV = getFOV();
    threeJSCamera = new THREE.PerspectiveCamera(
      FOV,
      canvasElement.value.clientWidth / canvasElement.value.clientHeight,
      0.001,
      10
    );
    threeJSCamera.position.set(0, 0, 1);
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setSize(
      canvasElement.value.clientWidth,
      canvasElement.value.clientHeight,
      false
    );
    document.getElementById("threejs-container-vto").appendChild(renderer.domElement);

    animate();
  };

  const init = () => {
    initMediaPipe();
    initThreeJS();
  };

  // Size update
  const updateSize = () => {
    const width = canvasElement.value?.clientWidth;
    const height = canvasElement.value?.clientHeight;

    if (width > 0 && height > 0) {
      const FOV = getFOV();

      threeJSCamera = new THREE.PerspectiveCamera(
        FOV,
        width / height,
        0.001,
        10
      );
      threeJSCamera.position.set(0, 0, 1);
      threeJSCamera.aspect = width / height;
      threeJSCamera.updateProjectionMatrix();

      renderer.setSize(width, height, false);
    }
  };

  // Animation loop
  const animate = () => {
    requestAnimationFrame(animate);
    if (renderer && scene && threeJSCamera) {
      renderTryOn();
      renderer.render(scene, threeJSCamera);
    }
  };

  // Render Virtual Try-On
  const renderTryOn = () => {
    if (isTryOn.value && glassesMesh) {
      const nullProperties = [];
      if (vtoWidth.value === null) nullProperties.push("vtoWidth");
      if (vtoNormalizedX.value === null) nullProperties.push("vtoNormalizedX");
      if (vtoNormalizedY.value === null) nullProperties.push("vtoNormalizedY");
      if (vtoRotationZ.value === null) nullProperties.push("vtoRotationZ");

      if (nullProperties.length === 0) {
        const { yaw, pitch, roll } = headPose.value;
        glassesMesh.position.set(
          vtoNormalizedX.value,
          vtoNormalizedY.value / 2 - 0.05,
          0.05
        );
        glassesMesh.scale.set(vtoWidth.value, vtoWidth.value, 1);
        const adjustedPitch = pitch + Math.PI / 2 + Math.PI / 8;
        glassesMesh.rotation.set(
          -Math.sin(adjustedPitch),
          vtoRotationZ.value,
          Math.cos(roll)
        );
        glassesMesh.visible = true;
      } else {
        glassesMesh.visible = false;
      }
    } else if (glassesMesh) {
      glassesMesh.visible = false;
    }
  };

  // Results handling broken into smaller functions
  const prepareCanvas = (results) => {
    if (!canvasElement.value || !videoElement.value || !canvasCtx.value) return;

    canvasElement.value.width = videoElement.value.videoWidth;
    canvasElement.value.height = videoElement.value.videoHeight;
    faceDetected.value = false;

    canvasCtx.value.save();
    canvasCtx.value.clearRect(0, 0, canvasElement.value.width, canvasElement.value.height);
    canvasCtx.value.drawImage(
      results.image,
      0,
      0,
      canvasElement.value.width,
      canvasElement.value.height
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

    const x_l = landmarks[leftIris.value].x * canvasElement.value.width;
    const y_l = landmarks[leftIris.value].y * canvasElement.value.height;
    const x_r = landmarks[rightIris.value].x * canvasElement.value.width;
    const y_r = landmarks[rightIris.value].y * canvasElement.value.height;

    const leftIrisRelativeDistance = calculateDistance(
      landmarks[leftInnerIrisEdge.value],
      landmarks[leftOuterIrisEdge.value]
    );
    const rightIrisRelativeDistance = calculateDistance(
      landmarks[rightInnerIrisEdge.value],
      landmarks[rightOuterIrisEdge.value]
    );

    canvasCtx.value.strokeStyle = "red";
    canvasCtx.value.lineWidth = 1;
    canvasCtx.value.beginPath();
    canvasCtx.value.arc(x_l, y_l, leftIrisRelativeDistance, 0, 2 * Math.PI);
    canvasCtx.value.stroke();

    canvasCtx.value.beginPath();
    canvasCtx.value.arc(x_r, y_r, rightIrisRelativeDistance, 0, 2 * Math.PI);
    canvasCtx.value.stroke();
  };

  const checkOrientation = (landmarks) => {
    const cheek_z_l = landmarks[leftTemple.value].z;
    const cheek_z_r = landmarks[rightTemple.value].z;
    compareZDeviation(cheek_z_l, cheek_z_r, 0.01);
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

  const calculatePDs = (landmarks) => {
    const bridgeMid = findMidPoint(landmarks[leftIris.value], landmarks[rightIris.value]);
    const irisRelativeDistanceLeft = calculateDistance(landmarks[leftIris.value], bridgeMid, false);
    const irisRelativeDistanceRight = calculateDistance(landmarks[rightIris.value], bridgeMid, false);

    let pd_left = irisConstant_left.value * irisRelativeDistanceLeft * 2;
    let pd_right = irisConstant_right.value * irisRelativeDistanceRight * 2;

    detectedPD_L.value = addDataPointSize(rollingAverage.value, "pd_l", pd_left, 500);
    detectedPD_R.value = addDataPointSize(rollingAverage.value, "pd_r", pd_right, 500);
    detectedPD.value = addDataPointSize(rollingAverage.value, "pd", (pd_left + pd_right) / 2, 500);
  };

  const calculateWidths = (landmarks) => {
    const templeMidPoint = findMidPoint(landmarks[leftTemple.value], landmarks[rightTemple.value]);
    const detectedWidth_L = calculateDistance(landmarks[leftTemple.value], templeMidPoint, false) * irisConstant_left.value;
    const detectedWidth_R = calculateDistance(landmarks[rightTemple.value], templeMidPoint, false) * irisConstant_right.value;

    detectedWidth.value = addDataPointSize(rollingAverage.value, "width", detectedWidth_L + detectedWidth_R, 500);

    if (getFaceShape.value) {
      const b_measurement = detectedWidth.value;
      if (b_measurement < 108) faceSize.value = "Petite";
      else if (b_measurement <= 113) faceSize.value = "Small";
      else if (b_measurement <= 127) faceSize.value = "Medium";
      else faceSize.value = "Large";
    }
  };

  const updateRotations = (landmarks) => {
    vtoRotationX.value = angleFromXAxis(landmarks[leftTemple.value], landmarks[rightTemple.value], xDampingFactor.value);
    vtoRotationZ.value = angleFromZAxis(landmarks[leftTemple.value], landmarks[rightTemple.value], zDampingFactor.value);
    vtoRotationY.value = angleFromYAxis(landmarks[leftTemple.value], landmarks[rightTemple.value], yDampingFactor.value);
  };

  const normalizePoints = (landmarks) => {
    vtoX.value = landmarks[vtoLeftTopLandmark.value].x * canvasElement.value.width;
    vtoY.value = landmarks[vtoLeftTopLandmark.value].y * canvasElement.value.height;
    vtoZ.value = 1 / (Math.abs(landmarks[vtoLeftTopLandmark.value].z) * irisConstant_avg.value);
    vtoNormalizedX.value = (vtoX.value / canvasElement.value.width) * 2 - 1;
    vtoNormalizedY.value = -((vtoY.value / canvasElement.value.height) * 2 - 1);

    vtoAspectRatio.value = canvasElement.value.width / canvasElement.value.height;

    const templeMidPoint = findMidPoint(landmarks[leftTemple.value], landmarks[rightTemple.value]);

    const normalizedLeftTemple = {
      x: (landmarks[leftTemple.value].x * 2 - 1) * vtoAspectRatio.value,
      y: -(landmarks[leftTemple.value].y * 2 - 1),
      z: landmarks[leftTemple.value].z,
    };
    const normalizedRightTemple = {
      x: (landmarks[rightTemple.value].x * 2 - 1) * vtoAspectRatio.value,
      y: -(landmarks[rightTemple.value].y * 2 - 1),
      z: landmarks[rightTemple.value].z,
    };
    const normalizedMidTemple = {
      x: (templeMidPoint.x * 2 - 1) * vtoAspectRatio.value,
      y: -(templeMidPoint.y * 2 - 1),
      z: templeMidPoint.z,
    };

    vtoWidth.value = calculateDistance(normalizedLeftTemple, normalizedMidTemple, false) + calculateDistance(normalizedRightTemple, normalizedMidTemple, false);
    vtoWidth.value *= sizeScaleFactor.value;
  };

  const applyFilters = (landmarks) => {
    if (filters.value.lipstick) drawFullLipstick(landmarks);
    if (filters.value.eyeliner) drawEyeliner(landmarks);
    if (filters.value.facemesh) drawFaceMesh(landmarks);
  };

  const handleLandmarks = (landmarks) => {
    faceDetected.value = true;

    drawIrisConnectorsAndCircles(landmarks);
    checkOrientation(landmarks);
    calculateIrisConstants(landmarks);
    calculatePDs(landmarks);
    calculateWidths(landmarks);
    updateRotations(landmarks);
    normalizePoints(landmarks);

    const headPoseData = calculateHeadPose(landmarks);
    headPose.value = headPoseData;

    applyFilters(landmarks);
    determineFaceShape(landmarks);
  };

  const drawMessage = () => {
    if (showMessage.value) {
      canvasCtx.value.font = currentIndex.value < 3 ? "48px Arial" : "96px Arial";
      canvasCtx.value.fillStyle = "white";
      canvasCtx.value.textAlign = "center";
      canvasCtx.value.fillText(
        messages.value[currentIndex.value],
        canvasElement.value.width / 2,
        canvasElement.value.height / 2
      );
    }
  };

  const onResults = (results) => {
    prepareCanvas(results);

    if (results.multiFaceLandmarks.length > 0) {
      for (const landmarks of results.multiFaceLandmarks) {
        handleLandmarks(landmarks);
      }
    }

    drawMessage();
    canvasCtx.value.restore();
  };

  // Other helper functions remain the same
  const compareZDeviation = (cheek_z_l, cheek_z_r, threshold) => {
    const deviation = Math.abs(cheek_z_l - cheek_z_r);

    if (deviation > threshold) {
      isOriented.value = false;
      return cheek_z_l > cheek_z_r ? { left: "red", right: "blue" } : { left: "blue", right: "red" };
    } else {
      isOriented.value = true;
      return { left: "blue", right: "blue" };
    }
  };

  const angleFromXAxis = (point1, point2, dampingFactor = 1) => {
    const deltaX = point2.x - point1.x;
    const deltaY = (point2.y - point1.y) * dampingFactor;
    const angleRadians = Math.atan2(deltaY, deltaX);
    return (angleRadians + 2 * Math.PI) % (2 * Math.PI);
  };

  const angleFromZAxis = (point1, point2, dampingFactor = 1) => {
    const deltaX = point2.x - point1.x;
    const deltaZ = (point2.z - point1.z) * dampingFactor;
    const angleRadians = Math.atan2(deltaZ, deltaX);
    return (angleRadians + 2 * Math.PI) % (2 * Math.PI);
  };

  const angleFromYAxis = (point1, point2, dampingFactor = 1) => {
    const deltaY = (point2.z - point1.z) * dampingFactor;
    const deltaX = point2.y - point1.y;
    const angleRadians = Math.atan2(deltaX, Math.abs(deltaY));
    return (angleRadians + 2 * Math.PI) % (2 * Math.PI);
  };

  const stop = () => {
    faceSize.value = "";
    faceShape.value = "";
    camera.stop();
    if (glassesMesh) {
      scene.remove(glassesMesh);
    }
    isCameraOn.value = false;
  };

  const toggleCamera = () => {
    if (isCameraOn.value) {
      stop();
    } else {
      start();
    }
  };

  const start = () => {
    camera.start();
    isCameraOn.value = true;
  };

  const vtoStart = (imageUrl) => {
    const img = new Image();
    img.src = imageUrl;

    img.onload = () => {
      imageAspectRatio.value = img.width / img.height;
      glassesWidth.value = 1.0;
      glassesHeight.value = img.height / img.width;

      disposeGeometry();

      const textureLoader = new THREE.TextureLoader();
      glassesTexture.value = textureLoader.load(imageUrl, (texture) => {
        texture.encoding = THREE.sRGBEncoding;
      });

      glassesMaterial.value = new THREE.MeshBasicMaterial({
        map: glassesTexture.value,
        transparent: true,
        side: THREE.DoubleSide,
      });

      glassesGeometry.value = new THREE.PlaneGeometry(
        glassesWidth.value,
        glassesHeight.value
      );
      glassesMesh = new THREE.Mesh(glassesGeometry.value, glassesMaterial.value);
      scene.add(glassesMesh);

      isTryOn.value = true;
    };
  };

  const vtoStop = () => {
    isTryOn.value = false;
    disposeGeometry();
  };

  const disposeGeometry = () => {
    if (glassesTexture.value) {
      glassesTexture.value.dispose();
      glassesTexture.value = null;
    }

    if (glassesMaterial.value) {
      glassesMaterial.value.dispose();
      glassesMaterial.value = null;
    }

    if (glassesGeometry.value) {
      glassesGeometry.value.dispose();
      glassesGeometry.value = null;
    }

    if (glassesMesh && scene) {
      scene.remove(glassesMesh);
      glassesMesh = null;
    }
  };

  const euclideanDistance = (point1, point2) => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
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

  const calculateAngle = (a, b, c) => {
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const bc = { x: c.x - b.x, y: c.y - b.y };
    const dotProduct = ab.x * bc.x + ab.y * bc.y;
    const magnitudeAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
    const magnitudeBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
    const angleRad = Math.acos(dotProduct / (magnitudeAB * magnitudeBC));
    return angleRad * (180 / Math.PI);
  };

  const findMidPoint = (pointA, pointB) => {
    const midX = (pointA.x + pointB.x) / 2;
    const midY = (pointA.y + pointB.y) / 2;
    const midZ = (pointA.z + pointB.z) / 2;
    return { x: midX, y: midY, z: midZ };
  };

  const determineFaceShape = (landmarks) => {
    const faceLength = euclideanDistance(landmarks[10], landmarks[152]);
    const faceWidth = euclideanDistance(landmarks[234], landmarks[454]);
    const jawlineAngle = calculateAngle(landmarks[234], landmarks[152], landmarks[454]).toFixed(2);

    const ratio = faceWidth / faceLength;
    const widthToLengthRatio = parseFloat(ratio.toFixed(2));
    const angle = parseFloat(jawlineAngle);

    if (widthToLengthRatio >= 0.63 && widthToLengthRatio <= 0.65 && angle >= 119 && angle <= 121.99) {
      faceShape.value = "Square";
    } else if (widthToLengthRatio <= 0.61 && angle >= 123 && angle <= 128.99) {
      faceShape.value = "Oblong";
    } else if (widthToLengthRatio >= 0.61 && widthToLengthRatio <= 0.63 && angle >= 121 && angle <= 124.99) {
      faceShape.value = "Oval";
    } else if (widthToLengthRatio >= 0.68 && angle <= 120.99) {
      faceShape.value = "Round";
    } else if (widthToLengthRatio >= 0.63 && widthToLengthRatio <= 0.66 && angle >= 121 && angle <= 127.99) {
      faceShape.value = "Heart";
    } else {
      faceShape.value = "Unclassified";
    }

    return faceShape.value;
  };

  const addDataPointSize = (rollingAverage, property, newDataPoint, maxDataPoints = 250) => {
    if (Object.prototype.hasOwnProperty.call(rollingAverage, property)) {
      rollingAverage[property].unshift(newDataPoint);
    } else {
      rollingAverage[property] = [newDataPoint];
    }

    if (rollingAverage[property].length > maxDataPoints) {
      rollingAverage[property].pop();
    }

    return rollingAverage[property].reduce((sum, value) => sum + value, 0) / rollingAverage[property].length;
  };

  const calculateHeadPose = (landmarks) => {
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const chin = landmarks[152];

    const yaw = Math.atan2(rightEye.x - leftEye.x, rightEye.z - leftEye.z);
    const pitch = Math.atan2(nose.y - chin.y, nose.z - chin.z);
    const roll = Math.atan2(leftEye.x - rightEye.x, leftEye.y - rightEye.y);

    return { yaw, pitch, roll };
  };

  const drawFullLipstick = (landmarks) => {
    if (!landmarks || landmarks.length === 0) return;

    const canvasWidth = canvasElement.value.width;
    const canvasHeight = canvasElement.value.height;

    const toCanvasCoords = (index) => {
      const point = landmarks[index];
      return [point.x * canvasWidth, point.y * canvasHeight];
    };

    // Combined outer and inner lip landmarks
    const outerUpperLip = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
    const outerLowerLip = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
    const innerUpperLip = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308];
    const innerLowerLip = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];

    canvasCtx.value.save();
    canvasCtx.value.fillStyle = "rgba(139, 25, 69, 0.6)";
    canvasCtx.value.beginPath();

    const allOuter = [...outerUpperLip, ...outerLowerLip.reverse()];
    let [startX, startY] = toCanvasCoords(allOuter[0]);
    canvasCtx.value.moveTo(startX, startY);
    for (let i = 1; i < allOuter.length; i++) {
      const [x, y] = toCanvasCoords(allOuter[i]);
      canvasCtx.value.lineTo(x, y);
    }
    canvasCtx.value.closePath();

    canvasCtx.value.moveTo(...toCanvasCoords(innerUpperLip[0]));
    for (let i = 1; i < innerUpperLip.length; i++) {
      const [x, y] = toCanvasCoords(innerUpperLip[i]);
      canvasCtx.value.lineTo(x, y);
    }
    for (let i = 0; i < innerLowerLip.length; i++) {
      const [x, y] = toCanvasCoords(innerLowerLip[i]);
      canvasCtx.value.lineTo(x, y);
    }
    canvasCtx.value.closePath();

    canvasCtx.value.fill("evenodd");
    canvasCtx.value.restore();
  };

  const drawEyeliner = (landmarks) => {
    if (!landmarks || landmarks.length === 0) return;

    const canvasWidth = canvasElement.value.width;
    const canvasHeight = canvasElement.value.height;

    const toCanvasCoords = (index) => {
      const point = landmarks[index];
      return [point.x * canvasWidth, point.y * canvasHeight];
    };

    const drawEyeLinerPath = (indices) => {
      canvasCtx.value.beginPath();
      const [startX, startY] = toCanvasCoords(indices[0]);
      canvasCtx.value.moveTo(startX, startY);

      for (let i = 1; i < indices.length; i++) {
        const [x, y] = toCanvasCoords(indices[i]);
        canvasCtx.value.lineTo(x, y);
      }

      canvasCtx.value.stroke();
    };

    canvasCtx.value.save();
    canvasCtx.value.strokeStyle = "rgba(0, 0, 0, 0.7)";
    canvasCtx.value.lineWidth = 2;
    canvasCtx.value.lineCap = "round";

    drawEyeLinerPath([33, 160, 158, 133]);
    drawEyeLinerPath([263, 387, 385, 362]);

    canvasCtx.value.restore();
  };

  const drawFaceMesh = (landmarks) => {
    if (!landmarks || landmarks.length === 0) return;

    const canvasWidth = canvasElement.value.width;
    const canvasHeight = canvasElement.value.height;

    const toCanvasCoords = (index) => {
      const point = landmarks[index];
      return [point.x * canvasWidth, point.y * canvasHeight];
    };

    const drawPath = (indices, closed = false) => {
      canvasCtx.value.beginPath();
      const [startX, startY] = toCanvasCoords(indices[0]);
      canvasCtx.value.moveTo(startX, startY);
      for (let i = 1; i < indices.length; i++) {
        const [x, y] = toCanvasCoords(indices[i]);
        canvasCtx.value.lineTo(x, y);
      }
      if (closed) canvasCtx.value.closePath();
      canvasCtx.value.stroke();
    };

    canvasCtx.value.save();
    canvasCtx.value.strokeStyle = "rgba(0, 255, 0, 0.5)";
    canvasCtx.value.lineWidth = 1;

    // Jawline
    drawPath([234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288]);

    // Eyebrows
    drawPath([70, 63, 105, 66, 107], false);
    drawPath([336, 296, 334, 293, 300], false);

    // Eyes
    drawPath([33, 160, 158, 133, 153, 144, 163, 7], true);
    drawPath([263, 387, 385, 362, 380, 373, 390, 249], true);

    // Lips
    drawPath([61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291], false);
    drawPath([61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291], false);
    drawPath([78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308], false);
    drawPath([78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308], false);

    // Nose
    drawPath([168, 6, 197, 195, 5, 4, 1, 19, 94, 2]);

    canvasCtx.value.restore();

    // Points
    canvasCtx.value.fillStyle = "rgba(255, 0, 0, 0.5)";
    for (let i = 0; i < landmarks.length; i++) {
      const [x, y] = toCanvasCoords(i);
      canvasCtx.value.beginPath();
      canvasCtx.value.arc(x, y, 1.2, 0, 2 * Math.PI);
      canvasCtx.value.fill();
    }
  };

  const getFOV = () => {
    const width = canvasElement.value?.clientWidth || 0;

    function calculateFOV(width) {
      if (width >= 1564) return 40;
      if (width <= 288) return 87;

      const ranges = [
        { min: 288, max: 388, start: 87, end: 85.95 },
        { min: 388, max: 488, start: 85.95, end: 84.64 },
        { min: 488, max: 588, start: 84.64, end: 86 },
        { min: 588, max: 688, start: 86, end: 84 },
        { min: 688, max: 788, start: 84, end: 78 },
        { min: 788, max: 888, start: 78, end: 68 },
        { min: 888, max: 988, start: 68, end: 80 },
        { min: 988, max: 1031, start: 80, end: 60 },
        { min: 1031, max: 1164, start: 60, end: 53 },
        { min: 1164, max: 1231, start: 53, end: 52 },
        { min: 1231, max: 1297, start: 52, end: 50 },
        { min: 1297, max: 1364, start: 50, end: 47 },
        { min: 1364, max: 1431, start: 47, end: 44 },
        { min: 1431, max: 1497, start: 44, end: 42 },
        { min: 1497, max: 1564, start: 42, end: 40 },
      ];

      for (const range of ranges) {
        if (width > range.min && width <= range.max) {
          const m = (range.end - range.start) / (range.max - range.min);
          const c = range.start - m * range.min;
          return m * width + c;
        }
      }

      return 40;
    }

    function calculateScalingFactor(width) {
      const actualFOV = calculateFOV(width);
      const baseFOV = calculateFOV(width);
      return baseFOV / actualFOV;
    }

    const scalingFactor = calculateScalingFactor(width) / (isModal.value ? 1 : 1);
    const FOV = calculateFOV(width) * scalingFactor;
    return FOV + 7;
  };

  return {
    input_video,
    output_canvas,
    threejs_container,
    init,
    updateSize,
    start,
    toggleCamera,
    isModal,
    vtoStart,
    frameImage,
    faceShape,
    filters,
  };
}
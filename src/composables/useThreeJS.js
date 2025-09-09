import { ref } from "vue";
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/+esm";

export default function useThreeJS(canvasElementRef, threejsContainerRef) {
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
  const sizeScaleFactor = ref(1.1);
  const xDampingFactor = ref(0.8);
  const yDampingFactor = ref(0.6);
  const zDampingFactor = ref(0.6);
  let scene = null;
  let threeJSCamera = null;
  let renderer = null;
  const headPose = ref(null);

  const getFOV = () => {
    const width = canvasElementRef.value?.clientWidth || 0;

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

    const scalingFactor = calculateScalingFactor(width);
    const FOV = calculateFOV(width) * scalingFactor;
    return FOV + 7;
  };

  const initThreeJS = () => {
    if (!canvasElementRef.value || !threejsContainerRef.value) {
      console.error("Canvas or Three.js container not available");
      return;
    }

    scene = new THREE.Scene();
    const FOV = getFOV();
    threeJSCamera = new THREE.PerspectiveCamera(
      FOV,
      canvasElementRef.value.clientWidth / canvasElementRef.value.clientHeight,
      0.001,
      10
    );
    threeJSCamera.position.set(0, 0, 1);
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setSize(
      canvasElementRef.value.clientWidth,
      canvasElementRef.value.clientHeight,
      false
    );
    threejsContainerRef.value.appendChild(renderer.domElement);

    animate();
  };

  const updateSize = () => {
    const width = canvasElementRef.value?.clientWidth;
    const height = canvasElementRef.value?.clientHeight;

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

  const animate = () => {
    requestAnimationFrame(animate);
    if (renderer && scene && threeJSCamera) {
      renderTryOn();
      renderer.render(scene, threeJSCamera);
    }
  };

  const renderTryOn = () => {
    if (isTryOn.value && glassesMesh) {
      const nullProperties = [];
      if (vtoWidth.value === null) nullProperties.push("vtoWidth");
      if (vtoNormalizedX.value === null) nullProperties.push("vtoNormalizedX");
      if (vtoNormalizedY.value === null) nullProperties.push("vtoNormalizedY");
      if (vtoRotationZ.value === null) nullProperties.push("vtoRotationZ");

      if (nullProperties.length === 0 && headPose.value) {
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

  const calculateHeadPose = (landmarks) => {
    if (!landmarks || !landmarks[1] || !landmarks[33] || !landmarks[263] || !landmarks[152]) {
      console.error("Invalid landmarks data in calculateHeadPose");
      return { yaw: 0, pitch: 0, roll: 0 };
    }

    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const chin = landmarks[152];

    const yaw = Math.atan2(rightEye.x - leftEye.x, rightEye.z - leftEye.z);
    const pitch = Math.atan2(nose.y - chin.y, nose.z - chin.z);
    const roll = Math.atan2(leftEye.x - rightEye.x, leftEye.y - rightEye.y);

    return { yaw, pitch, roll };
  };

  const normalizePoints = (landmarks, leftTemple, rightTemple, vtoLeftTopLandmark, irisConstant_avg) => {
    if (
      !canvasElementRef.value ||
      !landmarks ||
      !vtoLeftTopLandmark ||
      !leftTemple ||
      !rightTemple ||
      !irisConstant_avg ||
      !landmarks[vtoLeftTopLandmark.value] ||
      !landmarks[leftTemple.value] ||
      !landmarks[rightTemple.value]
    ) {
      console.error("Invalid canvas or landmarks data in normalizePoints");
      return;
    }

    vtoX.value = landmarks[vtoLeftTopLandmark.value].x * canvasElementRef.value.width;
    vtoY.value = landmarks[vtoLeftTopLandmark.value].y * canvasElementRef.value.height;
    vtoZ.value = 1 / (Math.abs(landmarks[vtoLeftTopLandmark.value].z) * irisConstant_avg.value);
    vtoNormalizedX.value = (vtoX.value / canvasElementRef.value.width) * 2 - 1;
    vtoNormalizedY.value = -((vtoY.value / canvasElementRef.value.height) * 2 - 1);

    vtoAspectRatio.value = canvasElementRef.value.width / canvasElementRef.value.height;

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

  const updateRotations = (landmarks, leftTemple, rightTemple) => {
    if (!landmarks || !landmarks[leftTemple.value] || !landmarks[rightTemple.value]) {
      console.error("Invalid landmarks data in updateRotations");
      return;
    }

    vtoRotationX.value = angleFromXAxis(landmarks[leftTemple.value], landmarks[rightTemple.value], xDampingFactor.value);
    vtoRotationZ.value = angleFromZAxis(landmarks[leftTemple.value], landmarks[rightTemple.value], zDampingFactor.value);
    vtoRotationY.value = angleFromYAxis(landmarks[leftTemple.value], landmarks[rightTemple.value], yDampingFactor.value);
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

  const destroy = () => {
    vtoStop();
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
    if (scene) {
      scene = null;
    }
    if (threeJSCamera) {
      threeJSCamera = null;
    }
  };

  return {
    initThreeJS,
    updateSize,
    vtoStart,
    vtoStop,
    normalizePoints,
    updateRotations,
    calculateHeadPose,
    headPose,
    destroy,
  };
}
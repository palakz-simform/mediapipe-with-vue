import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/+esm";

export function useVirtualTryOn() {
  let isTryOn = false;
  let imageAspectRatio = null;
  let glassesTexture = null;
  let glassesMaterial = null;
  let glassesGeometry = null;
  let glassesHeight = null;
  let glassesWidth = null;
  let glassesMesh = null;

  // VTO positioning
  let vtoWidth = null;
  let vtoX = null;
  let vtoY = null;
  let vtoZ = null;
  let vtoNormalizedX = null;
  let vtoNormalizedY = null;
  let vtoAspectRatio = null;
  let vtoRotationX = null;
  let vtoRotationZ = null;
  let vtoRotationY = null;
  let vtoLeftTopLandmark = 8;

  // Damping factors
  let zDampingFactor = 0.6;
  let xDampingFactor = 0.8;
  let yDampingFactor = 0.6;
  let sizeScaleFactor = 1.1;

  const start = (imageUrl, scene) => {
    if (!scene) {
      console.error('VTO Error: Scene is null or undefined. Make sure Three.js is initialized first.');
      return;
    }

    const img = new Image();
    img.src = imageUrl;

    img.onload = () => {
      imageAspectRatio = img.width / img.height;
      glassesWidth = 1.0;
      glassesHeight = img.height / img.width;

      disposeGeometry(scene);

      const textureLoader = new THREE.TextureLoader();
      glassesTexture = textureLoader.load(imageUrl, (texture) => {
        texture.encoding = THREE.sRGBEncoding;
      });

      glassesMaterial = new THREE.MeshBasicMaterial({
        map: glassesTexture,
        transparent: true,
        side: THREE.DoubleSide,
      });

      glassesGeometry = new THREE.PlaneGeometry(
        glassesWidth,
        glassesHeight
      );
      glassesMesh = new THREE.Mesh(
        glassesGeometry,
        glassesMaterial
      );
      
      try {
        scene.add(glassesMesh);
        console.log('Glasses mesh added to scene successfully');
      } catch (error) {
        console.error('Error adding glasses mesh to scene:', error);
        return;
      }

      isTryOn = true;
      if (isTryOn) {
        console.log(`VTO ON: ${imageUrl} ${img.width} x ${img.height}`);
      }
    };

    img.onerror = () => {
      console.error('Failed to load image for VTO:', imageUrl);
    };
  };

  const stop = (scene) => {
    isTryOn = false;
    if (scene) {
      disposeGeometry(scene);
    } else {
      console.warn('VTO Stop: Scene is null, disposing geometry without scene reference');
      disposeGeometry(null);
    }
  };

  const render = (headPose) => {
    if (!isTryOn || !glassesMesh) {
      hideGlasses();
      return;
    }

    const nullProperties = validateProperties();
    
    if (nullProperties.length === 0 && headPose) {
      positionGlasses(headPose);
    } else {
      if (nullProperties.length > 0) {
        console.log(
          `mesh is NOT visible due to null properties: ${nullProperties.join(", ")}`
        );
      }
      hideGlasses();
    }
  };

  const validateProperties = () => {
    const nullProperties = [];
    if (vtoWidth === null) nullProperties.push("vtoWidth");
    if (vtoNormalizedX === null) nullProperties.push("vtoNormalizedX");
    if (vtoNormalizedY === null) nullProperties.push("vtoNormalizedY");
    if (vtoRotationZ === null) nullProperties.push("vtoRotationZ");
    return nullProperties;
  };

  const positionGlasses = (headPose) => {
    const { pitch, roll } = headPose;
    
    // Position
    glassesMesh.position.set(
      vtoNormalizedX,
      vtoNormalizedY / 2 - 0.05,
      0.05
    );
    
    // Scale
    glassesMesh.scale.set(vtoWidth, vtoWidth, 1);
    
    // Rotation
    const adjustedPitch = pitch + Math.PI / 2 + Math.PI / 8;
    glassesMesh.rotation.set(
      -Math.sin(adjustedPitch),
      vtoRotationZ,
      Math.cos(roll)
    );
    
    // Visibility
    glassesMesh.visible = true;
  };

  const hideGlasses = () => {
    if (glassesMesh) {
      glassesMesh.visible = false;
    }
  };

  const updatePositioning = (landmarks, canvasElement, templeMidPoint, irisConstant_avg, leftTemple, rightTemple) => {
    if (!landmarks || !canvasElement) return;

    vtoX = landmarks[vtoLeftTopLandmark].x * canvasElement.width;
    vtoY = landmarks[vtoLeftTopLandmark].y * canvasElement.height;
    vtoZ = 1 / (Math.abs(landmarks[vtoLeftTopLandmark].z) * irisConstant_avg);
    vtoNormalizedX = (vtoX / canvasElement.width) * 2 - 1;
    vtoNormalizedY = -((vtoY / canvasElement.height) * 2 - 1);

    vtoAspectRatio = canvasElement.width / canvasElement.height;

    const normalizedLeftTemple = {
      x: (landmarks[leftTemple].x * 2 - 1) * vtoAspectRatio,
      y: -(landmarks[leftTemple].y * 2 - 1),
      z: landmarks[leftTemple].z,
    };
    const normalizedRightTemple = {
      x: (landmarks[rightTemple].x * 2 - 1) * vtoAspectRatio,
      y: -(landmarks[rightTemple].y * 2 - 1),
      z: landmarks[rightTemple].z,
    };
    const normalizedMidTemple = {
      x: (templeMidPoint.x * 2 - 1) * vtoAspectRatio,
      y: -(templeMidPoint.y * 2 - 1),
      z: templeMidPoint.z,
    };

    const calculateDistance = (point1, point2) => {
      const dx = point1.x - point2.x;
      const dy = point1.y - point2.y;
      const dz = point1.z - point2.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    vtoWidth =
      calculateDistance(normalizedLeftTemple, normalizedMidTemple) +
      calculateDistance(normalizedRightTemple, normalizedMidTemple);
    vtoWidth *= sizeScaleFactor;

    // Calculate rotations
    vtoRotationX = angleFromXAxis(
      landmarks[leftTemple],
      landmarks[rightTemple],
      xDampingFactor
    );
    vtoRotationZ = angleFromZAxis(
      landmarks[leftTemple],
      landmarks[rightTemple],
      zDampingFactor
    );
    vtoRotationY = angleFromYAxis(
      landmarks[leftTemple],
      landmarks[rightTemple],
      yDampingFactor
    );
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

  const disposeGeometry = (scene) => {
    if (glassesTexture) {
      glassesTexture.dispose();
      glassesTexture = null;
    }

    if (glassesMaterial) {
      glassesMaterial.dispose();
      glassesMaterial = null;
    }

    if (glassesGeometry) {
      glassesGeometry.dispose();
      glassesGeometry = null;
    }

    if (glassesMesh) {
      if (scene) {
        scene.remove(glassesMesh);
      }
      glassesMesh = null;
    }
  };

  return {
    get isTryOn() { return isTryOn; },
    get vtoWidth() { return vtoWidth; },
    get vtoNormalizedX() { return vtoNormalizedX; },
    get vtoNormalizedY() { return vtoNormalizedY; },
    get vtoRotationX() { return vtoRotationX; },
    get vtoRotationZ() { return vtoRotationZ; },
    get vtoRotationY() { return vtoRotationY; },
    start,
    stop,
    render,
    updatePositioning,
    disposeGeometry,
  };
}

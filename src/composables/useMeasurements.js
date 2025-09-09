import { ref } from "vue";

export default function useMeasurements() {
  const detectedPD_L = ref(0);
  const detectedPD_R = ref(0);
  const detectedPD = ref(0);
  const detectedBridge = ref(0);
  const detectedWidth = ref(0);
  const rollingAverage = ref({
    pd: [],
    pd_l: [],
    pd_r: [],
    bridge: [],
    width: [],
    height: [],
  });
  const faceSize = ref(null);
  const faceShape = ref(null);
  const getFaceShape = ref(true); // Enable by default

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

  const calculatePDs = (landmarks, irisConstant_left, irisConstant_right, leftIris, rightIris) => {
    const bridgeMid = findMidPoint(landmarks[leftIris.value], landmarks[rightIris.value]);
    const irisRelativeDistanceLeft = calculateDistance(landmarks[leftIris.value], bridgeMid, false);
    const irisRelativeDistanceRight = calculateDistance(landmarks[rightIris.value], bridgeMid, false);

    let pd_left = irisConstant_left * irisRelativeDistanceLeft * 2;
    let pd_right = irisConstant_right * irisRelativeDistanceRight * 2;

    detectedPD_L.value = addDataPointSize(rollingAverage.value, "pd_l", pd_left, 500);
    detectedPD_R.value = addDataPointSize(rollingAverage.value, "pd_r", pd_right, 500);
    detectedPD.value = addDataPointSize(rollingAverage.value, "pd", (pd_left + pd_right) / 2, 500);
  };

  const calculateWidths = (landmarks, irisConstant_left, irisConstant_right, leftTemple, rightTemple) => {
    const templeMidPoint = findMidPoint(landmarks[leftTemple.value], landmarks[rightTemple.value]);
    const detectedWidth_L = calculateDistance(landmarks[leftTemple.value], templeMidPoint, false) * irisConstant_left;
    const detectedWidth_R = calculateDistance(landmarks[rightTemple.value], templeMidPoint, false) * irisConstant_right;

    detectedWidth.value = addDataPointSize(rollingAverage.value, "width", detectedWidth_L + detectedWidth_R, 500);

    if (getFaceShape.value) {
      const b_measurement = detectedWidth.value;
      if (b_measurement < 108) faceSize.value = "Petite";
      else if (b_measurement <= 113) faceSize.value = "Small";
      else if (b_measurement <= 127) faceSize.value = "Medium";
      else faceSize.value = "Large";
    }
  };

  const euclideanDistance = (point1, point2) => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
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

  const calculateMeasurements = (landmarks, irisConstant_left, irisConstant_right, leftIris, rightIris, leftTemple, rightTemple) => {
    calculatePDs(landmarks, irisConstant_left, irisConstant_right, leftIris, rightIris);
    calculateWidths(landmarks, irisConstant_left, irisConstant_right, leftTemple, rightTemple);
    determineFaceShape(landmarks);
  };

  return {
    calculateMeasurements,
    detectedPD,
    detectedPD_L,
    detectedPD_R,
    detectedWidth,
    faceShape,
    faceSize,
    getFaceShape,
  };
}
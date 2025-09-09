import { ref } from "vue";
import * as draw from "@mediapipe/drawing_utils";
import { 
  FACEMESH_FACE_OVAL, 
  FACEMESH_LEFT_EYE, 
  FACEMESH_LEFT_EYEBROW, 
  FACEMESH_LEFT_IRIS,
  FACEMESH_RIGHT_EYE, 
  FACEMESH_RIGHT_EYEBROW, 
  FACEMESH_RIGHT_IRIS,
  FACEMESH_LIPS,
  FACEMESH_NOSE
} from "@mediapipe/face_mesh";

export default function useARFilters(canvasCtxRef) {
  const filters = ref({
    specs: false,
    lipstick: false,
    eyeliner: false,
    facemesh: false,
    facialShape: false,
    faceMeasurement: false,
  });

  const drawFullLipstick = (faceLandmarks, canvasElement) => {
    if (!faceLandmarks?.length) return;

    const ctx = canvasCtxRef.value; 
    const canvasWidth = canvasElement.width;
    const canvasHeight = canvasElement.height;

    // Convert a landmark index into pixel coordinates on the canvas
    const toCanvasCoords = (index) => [
      faceLandmarks[index].x * canvasWidth,
      faceLandmarks[index].y * canvasHeight,
    ];

    // Use MediaPipe's predefined lip connections for consistency
    const outerLipIndices = [
      61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
      375, 321, 405, 314, 17, 84, 181, 91, 146,
    ];

    const innerLipIndices = [
      78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308,
      415, 310, 311, 312, 13, 82, 81, 80, 191,
    ];

    ctx.save();
    ctx.fillStyle = "rgba(139, 25, 69, 0.6)";
    ctx.beginPath();

    // Draw outer lip polygon
    ctx.moveTo(...toCanvasCoords(outerLipIndices[0]));
    outerLipIndices.slice(1).forEach((index) => {
      ctx.lineTo(...toCanvasCoords(index));
    });
    ctx.closePath();

    // Draw inner lip polygon (to cut a hole)
    ctx.moveTo(...toCanvasCoords(innerLipIndices[0]));
    innerLipIndices.slice(1).forEach((index) => {
      ctx.lineTo(...toCanvasCoords(index));
    });
    ctx.closePath();

    ctx.fill("evenodd");
    ctx.restore();
  };

  const drawEyeliner = (landmarks, canvasElement) => {
    if (!landmarks || landmarks.length === 0) {
      console.log("Eyeliner: No landmarks provided");
      return;
    }

    // FACEMESH_LEFT_EYE and FACEMESH_RIGHT_EYE provide the eye outlines
    
    // Draw left eye outline (which serves as eyeliner)
    draw.drawConnectors(canvasCtxRef.value, landmarks, FACEMESH_LEFT_EYE, {
      color: "#000000",
      lineWidth: 2,  // Even thicker for visibility
    });

    // Draw right eye outline (which serves as eyeliner)
    draw.drawConnectors(canvasCtxRef.value, landmarks, FACEMESH_RIGHT_EYE, {
      color: "#000000",
      lineWidth: 2,  // Even thicker for visibility
    });

    console.log("Eyeliner drawn successfully");
  };

  const drawFaceMesh = (landmarks, canvasElement) => {
    if (!landmarks || landmarks.length === 0) return;

    // Draw face oval
    draw.drawConnectors(canvasCtxRef.value, landmarks, FACEMESH_FACE_OVAL, {
      color: "#00FF00",
      lineWidth: 1,
    });

    // Draw left eye
    draw.drawConnectors(canvasCtxRef.value, landmarks, FACEMESH_LEFT_EYE, {
      color: "#00FF00",
      lineWidth: 1,
    });

    // Draw right eye
    draw.drawConnectors(canvasCtxRef.value, landmarks, FACEMESH_RIGHT_EYE, {
      color: "#00FF00",
      lineWidth: 1,
    });

    // Draw left eyebrow
    draw.drawConnectors(canvasCtxRef.value, landmarks, FACEMESH_LEFT_EYEBROW, {
      color: "#00FF00",
      lineWidth: 1,
    });

    // Draw right eyebrow
    draw.drawConnectors(canvasCtxRef.value, landmarks, FACEMESH_RIGHT_EYEBROW, {
      color: "#00FF00",
      lineWidth: 1,
    });

    // Draw left iris
    draw.drawConnectors(canvasCtxRef.value, landmarks, FACEMESH_LEFT_IRIS, {
      color: "#00FF00",
      lineWidth: 1,
    });

    // Draw right iris
    draw.drawConnectors(canvasCtxRef.value, landmarks, FACEMESH_RIGHT_IRIS, {
      color: "#00FF00",
      lineWidth: 1,
    });

    // Draw lips
    draw.drawConnectors(canvasCtxRef.value, landmarks, FACEMESH_LIPS, {
      color: "#00FF00",
      lineWidth: 1,
    });

    // Draw nose
    draw.drawConnectors(canvasCtxRef.value, landmarks, FACEMESH_NOSE, {
      color: "#00FF00",
      lineWidth: 1,
    });

    // Draw all landmarks as red dots
    draw.drawLandmarks(canvasCtxRef.value, landmarks, {
      color: "#FF0000",
      lineWidth: 1,
      radius: 1.2,
    });
  };

  const applyFilters = (landmarks, canvasElement) => {
    console.log("Applying filters:", {
      lipstick: filters.value.lipstick,
      eyeliner: filters.value.eyeliner,
      facemesh: filters.value.facemesh
    });

    if (filters.value.lipstick) {
      console.log("Drawing lipstick");
      drawFullLipstick(landmarks, canvasElement);
    }
    if (filters.value.eyeliner) {
      console.log("Drawing eyeliner");
      drawEyeliner(landmarks, canvasElement);
    }
    if (filters.value.facemesh) {
      console.log("Drawing face mesh");
      drawFaceMesh(landmarks, canvasElement);
    }
  };

  return {
    filters,
    applyFilters,
  };
}
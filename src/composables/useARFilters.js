import { ref } from "vue";

export default function useARFilters(canvasCtxRef) {
  const filters = ref({
    specs: false,
    lipstick: false,
    eyeliner: false,
    facemesh: false,
    facialShape: false,
    faceMeasurement: false,
  });

  const drawFullLipstick = (landmarks, canvasElement) => {
    if (!landmarks || landmarks.length === 0) return;

    const canvasWidth = canvasElement.width;
    const canvasHeight = canvasElement.height;

    const toCanvasCoords = (index) => {
      const point = landmarks[index];
      return [point.x * canvasWidth, point.y * canvasHeight];
    };

    const outerUpperLip = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
    const outerLowerLip = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
    const innerUpperLip = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308];
    const innerLowerLip = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];

    canvasCtxRef.value.save();
    canvasCtxRef.value.fillStyle = "rgba(139, 25, 69, 0.6)";
    canvasCtxRef.value.beginPath();

    const allOuter = [...outerUpperLip, ...outerLowerLip.reverse()];
    let [startX, startY] = toCanvasCoords(allOuter[0]);
    canvasCtxRef.value.moveTo(startX, startY);
    for (let i = 1; i < allOuter.length; i++) {
      const [x, y] = toCanvasCoords(allOuter[i]);
      canvasCtxRef.value.lineTo(x, y);
    }
    canvasCtxRef.value.closePath();

    canvasCtxRef.value.moveTo(...toCanvasCoords(innerUpperLip[0]));
    for (let i = 1; i < innerUpperLip.length; i++) {
      const [x, y] = toCanvasCoords(innerUpperLip[i]);
      canvasCtxRef.value.lineTo(x, y);
    }
    for (let i = 0; i < innerLowerLip.length; i++) {
      const [x, y] = toCanvasCoords(innerLowerLip[i]);
      canvasCtxRef.value.lineTo(x, y);
    }
    canvasCtxRef.value.closePath();

    canvasCtxRef.value.fill("evenodd");
    canvasCtxRef.value.restore();
  };

  const drawEyeliner = (landmarks, canvasElement) => {
    if (!landmarks || landmarks.length === 0) return;

    const canvasWidth = canvasElement.width;
    const canvasHeight = canvasElement.height;

    const toCanvasCoords = (index) => {
      const point = landmarks[index];
      return [point.x * canvasWidth, point.y * canvasHeight];
    };

    const drawEyeLinerPath = (indices) => {
      canvasCtxRef.value.beginPath();
      const [startX, startY] = toCanvasCoords(indices[0]);
      canvasCtxRef.value.moveTo(startX, startY);

      for (let i = 1; i < indices.length; i++) {
        const [x, y] = toCanvasCoords(indices[i]);
        canvasCtxRef.value.lineTo(x, y);
      }

      canvasCtxRef.value.stroke();
    };

    canvasCtxRef.value.save();
    canvasCtxRef.value.strokeStyle = "rgba(0, 0, 0, 0.7)";
    canvasCtxRef.value.lineWidth = 2;
    canvasCtxRef.value.lineCap = "round";

    drawEyeLinerPath([33, 160, 158, 133]);
    drawEyeLinerPath([263, 387, 385, 362]);

    canvasCtxRef.value.restore();
  };

  const drawFaceMesh = (landmarks, canvasElement) => {
    if (!landmarks || landmarks.length === 0) return;

    const canvasWidth = canvasElement.width;
    const canvasHeight = canvasElement.height;

    const toCanvasCoords = (index) => {
      const point = landmarks[index];
      return [point.x * canvasWidth, point.y * canvasHeight];
    };

    const drawPath = (indices, closed = false) => {
      canvasCtxRef.value.beginPath();
      const [startX, startY] = toCanvasCoords(indices[0]);
      canvasCtxRef.value.moveTo(startX, startY);
      for (let i = 1; i < indices.length; i++) {
        const [x, y] = toCanvasCoords(indices[i]);
        canvasCtxRef.value.lineTo(x, y);
      }
      if (closed) canvasCtxRef.value.closePath();
      canvasCtxRef.value.stroke();
    };

    canvasCtxRef.value.save();
    canvasCtxRef.value.strokeStyle = "rgba(0, 255, 0, 0.5)";
    canvasCtxRef.value.lineWidth = 1;

    drawPath([234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288]);
    drawPath([70, 63, 105, 66, 107], false);
    drawPath([336, 296, 334, 293, 300], false);
    drawPath([33, 160, 158, 133, 153, 144, 163, 7], true);
    drawPath([263, 387, 385, 362, 380, 373, 390, 249], true);
    drawPath([61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291], false);
    drawPath([61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291], false);
    drawPath([78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308], false);
    drawPath([78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308], false);
    drawPath([168, 6, 197, 195, 5, 4, 1, 19, 94, 2]);

    canvasCtxRef.value.restore();

    canvasCtxRef.value.fillStyle = "rgba(255, 0, 0, 0.5)";
    for (let i = 0; i < landmarks.length; i++) {
      const [x, y] = toCanvasCoords(i);
      canvasCtxRef.value.beginPath();
      canvasCtxRef.value.arc(x, y, 1.2, 0, 2 * Math.PI);
      canvasCtxRef.value.fill();
    }
  };

  const applyFilters = (landmarks, canvasElement) => {
    if (filters.value.lipstick) drawFullLipstick(landmarks, canvasElement);
    if (filters.value.eyeliner) drawEyeliner(landmarks, canvasElement);
    if (filters.value.facemesh) drawFaceMesh(landmarks, canvasElement);
  };

  return {
    filters,
    applyFilters,
  };
}
import { computed, ref } from 'vue'

const AVERAGE_IRIS_DIAMETER_MM = 11.8

export function useFaceMeasurements(distance) {
  const measurements = ref({
    pd: 0,
    pdLeft: 0,
    pdRight: 0,
    faceShape: '-',
  })

  const hasMeasurements = ref(false)
  const showMeasurements = computed(() => hasMeasurements.value)

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
    if (ratio >= 0.63) return 'Oval'
    if (ratio >= 0.6) return 'Oblong'
    return 'Square'
  }

  const updateMeasurements = (landmarks) => {
    const noseBridge = landmarks[6]
    const leftIris = landmarks[468]
    const rightIris = landmarks[473]

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

    measurements.value = {
      pd: Math.round(pxPerMm > 0 ? pdPx / pxPerMm : 0),
      pdLeft: Math.round(pxPerMm > 0 ? pdLeftPx / pxPerMm : 0),
      pdRight: Math.round(pxPerMm > 0 ? pdRightPx / pxPerMm : 0),
      faceShape: classifyFaceShape(landmarks),
    }

    hasMeasurements.value = true
  }

  return {
    measurements,
    hasMeasurements,
    showMeasurements,
    updateMeasurements,
  }
}

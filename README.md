# MediaPipe Face Tracker with 3D Avatar

A Vue 3 app that uses **MediaPipe Face Landmarker** to detect facial landmarks in real-time and overlay a 3D avatar + AR filters on your face via webcam.

---

## Features

- 🎥 Real-time face landmark detection via webcam
- 🧑‍💻 3D avatar that tracks your face movements
- 💄 AR filters (frame VTO, face overlays, measurements)
- ⚡ Powered by MediaPipe + Three.js + Vue 3

---

## Tech Stack

- [Vue 3](https://vuejs.org/) + Vite
- [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker)
- [Three.js](https://threejs.org/) for 3D rendering

---

## Setup

```sh
cd vue-project
npm install
npm run dev
```

---

## Project Structure

```
public/
├── face_landmarker.task
├── model.glb
└── wasm/

src/
├── App.vue
├── main.js
├── components/
│   ├── FiltersPanel.vue
│   └── StatusPanel.vue
└── composables/
    ├── use3DAvatar.js
    ├── useArmBone.js
    ├── useFaceLandmarker.js
    ├── useFaceMeasurements.js
    └── useFaceOverlay.js
```

---

## Requirements

- Chromium-based browser (Chrome, Edge, Brave)
- Webcam access


## Author
Palak Zalavadia (palak.z@simformsolutions.com)
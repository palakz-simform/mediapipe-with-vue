<script setup>
import { onMounted, ref } from "vue";
import { FrameVTO } from "./plugins/mediapipe.js";
import specsImage from "./assets/specs.jpg";
import useMediaPipe from "./composables/useMediaPipe.js";
const {
  input_video,
  output_canvas,
  threejs_container,
  init,
  updateSize,
  start,
  toggleCamera,
  vtoStart,
  frameImage,
} = useMediaPipe();
let vto = new FrameVTO(
  "input_video_vto",
  "output_canvas_vto",
  "threejs-container-vto"
);

const videoElement = ref(null);
const outputCanvas = ref(null);
const threeJsContainer = ref(null);
onMounted(() => {
  // vto.init();
  // vto.start();
  // vto.toggleCamera();
  // vto.updateSize();

  // vto.vtoStart(specsImage);
  input_video.value = videoElement.value;
  output_canvas.value = outputCanvas.value;
  threejs_container.value = threeJsContainer.value;

  init();
  start();
  // toggleCamera();
  updateSize();
});
const changeImg = (imgType) => {
  if (imgType === "specs") {
    vtoStart(specsImage);
  } else if (imgType === "hat") {
    vtoStart(hatImage);
  }
};
</script>

<template>
  <div class="container">
    <div
      id="facial-insights-wrapper-vto"
      class="video-container position-relative"
    >
      <div class="output-container">
        <canvas ref="outputCanvas" class="output_canvas_vto"></canvas>
        <div ref="threeJsContainer" id="threejs-container-vto"></div>
        <div
          id="facial-insights-placeholder-vto"
          style="
            width: 100%;
            height: 100%;
            color: #dedede;
            background-color: #888;
            border-radius: 20px;
          "
        >
          <div class="d-flex align-items-center w-100 h-100 text-center">
            <i class="fas fa-camera mx-auto fa-5x"></i>
          </div>
        </div>
      </div>
    </div>
    <video
      ref="videoElement"
      class="input_video_vto"
      style="display: none"
      autoplay
      playsinline
    ></video>
  </div>
  <button @click="changeImg('specs')">Specs</button>
</template>

<style scoped>
.container {
  display: flex;
  justify-content: center;
}
#favorites-wrapper .card {
  background-color: #f0efe6d4;
}
.start-80 {
  left: 80% !important;
}
.start-60 {
  left: 60% !important;
}
.start-52 {
  left: 52% !important;
}
.top-15 {
  top: 15px !important;
}
#kyte-page-container {
  width: 100%;
  padding: 0 1em;
}
.nav-tabs .nav-link {
  padding: 0.5em !important;
}
.dashboard-card,
.dashboard-card-blue {
  border-radius: 0.5rem;
  padding: 1em;
}
.dashboard-card {
  background-color: rgb(200, 205, 209);
}
.dashboard-card-blue {
  background-color: rgb(10, 68, 140);
  color: white;
}
#recentOrdersWrapper {
  height: 322px;
  overflow-y: scroll;
  overflow-x: hidden;
}
.recent-order-card:not(:last-child) {
  border-bottom: 1px solid rgb(219, 219, 219);
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}
#sortable-menu-items,
#wizard_sortable-menu-items {
  list-style: none;
}
#sortable-menu-items li,
#wizard_sortable-menu-items li {
  cursor: grab;
  padding: 0.5em 1em;
  margin: 1em 0;
  border-radius: 1em;
  border: 1px solid #37353b;
  background-color: #fff;
}

.row-grip,
.row-delete {
  align-items: center;
}

.column-style-select {
  text-decoration: none;
  display: inline-block;
  border-radius: 5px;
  color: blue;
}
.column-style-select:hover {
  background-color: rgb(133, 173, 200);
  color: blue;
}
.column-style-select.active {
  background-color: rgb(153, 212, 255);
  color: blue;
}

.product-main-image {
  border-radius: 6px !important;
}

.product-card {
  text-decoration: none;
  color: rgb(34, 34, 34);
}

@media (max-width: 1290px) {
  .variation-circle {
    width: 25px;
    height: 25px;
    margin: 0 5px;
  }
}
@media (max-width: 1054px) {
  .variation-circle {
    width: 20px;
    height: 20px;
    margin: 0 2px;
  }
}
@media (max-width: 750px) {
  .variation-circle {
    width: 30px;
    height: 30px;
    margin: 0 5px;
  }
}
@media (max-width: 560px) {
  .variation-circle {
    width: 30px;
    height: 30px;
    margin: 0 2px;
  }
  #frame-grid h6 {
    font-size: 1.2rem;
  }
}

.navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%; /* Adjust the width as needed */
}

.variations {
  display: flex;
  justify-content: center;
  overflow-x: auto;
  overflow-y: hidden;
  flex-grow: 1;
  margin: 0 10px; /* Adds spacing between the arrows and the circles */
}

.variation-circle {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  margin: 0 10px; /* Adjust spacing between circles as needed */
  cursor: pointer;
  border: 2px solid #ccc;
  display: inline-flex; /* Change from inline-block to inline-flex */
  justify-content: center;
  align-items: center;
  flex: 0 0 auto;
  overflow: hidden;
}

.variation-circle img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.navigation button {
  cursor: pointer;
}

/* .frame-view-wrapper {
    
} */
.frame-card {
  border: none;
  margin-bottom: 1em;
  box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.5);
  background-color: #fff !important;
  padding: 0.5em;
  border-radius: 6px;
}
.frame-card .product-link {
  text-decoration: none;
  color: rgb(36, 36, 36);
}
@keyframes slideFromTop {
  0% {
    height: 0;
    top: 100%;
  }
  100% {
    height: 100%;
    top: 0;
  }
}

.product-link img {
  animation: slideFromTop 0.8s ease forwards;
}

/* https://codepen.io/Cormac-Maher/pen/KGpXqZ */
.pgb .step {
  text-align: center;
  position: relative;
}
.pgb h2 {
  font-size: 1.3rem;
}
.pgb .step p {
  position: absolute;
  height: 60px;
  width: 100%;
  text-align: center;
  display: block;
  z-index: 3;
  color: #fff;
  font-size: 160%;
  line-height: 55px;
  opacity: 0.7;
}
.pgb .active.step p {
  opacity: 1;
  font-weight: 600;
}
.pgb .img-circle {
  display: inline-block;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #9e9e9e;
  border: 4px solid #fff;
}
.pgb .complete .img-circle {
  background-color: #4caf50;
}
.pgb .active .img-circle {
  background-color: #ff9800;
}
.pgb .step .img-circle:before {
  content: "";
  display: block;
  background: #9e9e9e;
  height: 4px;
  width: 50%;
  position: absolute;
  bottom: 50%;
  left: 0;
  z-index: -1;
  margin-right: 24px;
}
.pgb .step .img-circle:after {
  content: "";
  display: block;
  background: #9e9e9e;
  height: 4px;
  width: 50%;
  position: absolute;
  bottom: 50%;
  left: 50%;
  z-index: -1;
}
.pgb .step.active .img-circle:after {
  background: #9e9e9e;
}

.pgb .step.complete .img-circle:after,
.pgb .step.active .img-circle:before {
  background: #4caf50;
}

.pgb .step:last-of-type .img-circle:after,
.pgb .step:first-of-type .img-circle:before {
  display: none;
}

/* Lens Journey Modal */
.material-checkbox-wrapper {
  cursor: pointer;
}
.material-checkbox-wrapper:hover {
  background: #bac1c9 !important;
}
.material-type-option-wrapper {
  padding-bottom: 1em;
  padding-left: 1em;
  padding-right: 1em;
  margin: 1em 0;
  border: 1px solid grey;
}

#vto-favorite-frames {
  display: flex;
}

.lmItemCard {
  background: #eee;
  border-radius: 8px;
}
.lmAttributeCardHeading {
  background: #fff;
  width: 100%;
  border-radius: 8px;
}
.lmAttributeCard {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  border: 1px solid #ccc;
  border-radius: 8px;
  display: block;
  background-color: #fff;
  padding: 0.5em;
  font-size: 0.7em;
}
.orderItemCard {
  background: #eee;
  border-radius: 8px;
}
.orderAttributeCardHeading {
  background: #fff;
  width: 100%;
  border-radius: 8px;
}
.orderAttributeCard {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  border: 1px solid #ccc;
  border-radius: 8px;
  display: block;
  background-color: #fff;
  padding: 0.5em;
}
#rx-form-wrapper table {
  width: 100%; /* Make the table full width of its container */
  border-collapse: collapse; /* Remove spacing between table cells */
  border: 1px solid #ccc; /* Add a border for clarity */
}

/* Apply styles to table headers */
#rx-form-wrapper th {
  background-color: #f2f2f2; /* Background color for table headers */
  text-align: center; /* Center-align header text */
  padding: 10px; /* Add padding for spacing */
}

/* Apply styles to table cells */
#rx-form-wrapper td {
  text-align: center; /* Center-align cell text */
  padding: 10px; /* Add padding for spacing */
  border: 1px solid #ccc; /* Add borders to cell for clarity */
}

/* Apply alternate row background color */
#rx-form-wrapper tr:nth-child(even) {
  background-color: #f9f9f9; /* Alternate row background color */
}

#rx-form-wrapper select {
  width: 100%;
  padding: 8px;
}

#rx-form-wrapper textarea {
  border-radius: 10px;
  border: 1px solid #dee2e6;
  padding: 8px;
}

#rxUploadInput {
  border-radius: 10px;
  border: 1px solid #dee2e6;
  padding: 8px;
}

.lsjOption {
  cursor: pointer;
}
.lsjOption.selected {
  border-color: rgb(83, 173, 41);
  background-color: rgb(201, 253, 166);
}

/* New Order Wizard Styles */
.big-square-button {
  width: 200px; /* Large width */
  height: 200px; /* Large height, making it square */
  border-radius: 15px; /* Rounded corners */
  border: 2px solid lightgrey; /* Light grey border */
  font-size: 20px; /* Larger font size */
  margin: 10px; /* Spacing between buttons */
  display: flex;
  align-items: center;
  justify-content: center;
}

.select2-container--open {
  z-index: 100000 !important;
}

/* Facial Insights styles */
.video-container {
  width: 50%;
  height: 500px;
  overflow: hidden;
  border-radius: 20px;
}

.output-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  position: relative;
}

video {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  object-fit: cover;
  object-position: center;
}

.output_canvas,
#threejs-container,
.output_canvas_vto,
#threejs-container-vto {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.output_canvas,
.output_canvas_vto {
  width: 100%;
  object-fit: none;
  object-position: center;
}

#threejs-container,
#threejs-container-vto {
  width: 100%;
  object-fit: cover;
  object-position: center;
}

.output-overlay {
  border-radius: 20px;
  position: absolute;
  top: 0px;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 16px;
  text-align: center;
}

.output-overlay-face {
  top: 0px;
  left: 0px;
  background-color: rgba(66, 112, 197, 0.7);
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  mask-image: radial-gradient(295px 375px, transparent 50%, rgb(0, 0, 0) 50%);
}

.output-overlay-face-border {
  position: absolute;
  top: 50%;
  left: 50%;
  border: 5px dashed #ffc107;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  height: 375px;
  width: 295px;
}

.output-overlay-text,
.output-overlay-count {
  color: #fff;
  z-index: 2;
}

.output-overlay-count {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 3rem;
  border: 2px solid;
  width: 110px;
  height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 100%;
  background-color: rgba(0, 0, 0, 0.7);
}

/* Filter */

.filter-dropdowns {
  overflow-y: auto;
  height: 100%;
}

/* slideout */
.filter-slideout {
  background: #dbe2e9;
  color: #333;
  position: fixed;
  top: 0;
  right: -220px;
  width: 200px;
  height: 100%;
  -webkit-transition-duration: 0.3s;
  -moz-transition-duration: 0.3s;
  -o-transition-duration: 0.3s;
  transition-duration: 0.3s;
  z-index: 10000;
}

.filter-slideout.on {
  right: 0;
}

.slideout-toggle {
  color: #fff !important;
  background-color: #04579d;
  border-top-left-radius: 6px;
  border-bottom-left-radius: 6px;
  position: absolute;
  right: 220px;
  top: 65%;
  height: 100px;
  text-align: center;
}

.filter-slideout.on .slideout-toggle {
  right: 200px;
}

.filter-btn-label {
  transform: rotate(-90deg);
  white-space: nowrap;
  margin-top: 20px;
}

#prev-page,
#sg-prev-page {
  left: -20px;
}
#next-page,
#sg-next-page {
  right: -20px;
}

.setup-frame-gallery {
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.input-group .form-control {
  border-radius: 4px 0 0 4px;
}

.input-group .input-group-text {
  border-radius: 0 4px 4px 0;
}

#subdomainFeedback {
  font-weight: bold;
}

/* Carousel favorites btn */
.carousel-favorites {
  margin-left: -10px;
  margin-right: -10px;
}
.carousel-favorites .carousel-item {
  padding: 10px;
}
.carousel-favorites .carousel-btn {
  border-radius: 100%;
  padding: 0;
  height: 36px;
  width: 36px;
}
.carousel-favorites .carousel-btn-prev {
  margin-left: -10px;
}
.carousel-favorites .carousel-btn-next {
  margin-right: -10px;
}
.order-wrapper .order-id {
  flex: 0 0 auto;
  width: 110px;
}
.order-wrapper .order-date {
  flex: 0 0 auto;
  width: 120px;
}
.order-wrapper .order-status {
  flex: 0 0 auto;
  width: 170px;
}
.order-wrapper .order-action {
  flex: 0 0 auto;
  width: 100px;
}
.order-wrapper .order-img {
  width: 100px;
}

@media (max-width: 767.98px) {
  .order-wrapper .order-id,
  .order-wrapper .order-date,
  .order-wrapper .order-status,
  .order-wrapper .order-action {
    width: 100%;
  }

  .output-overlay-face {
    mask-image: radial-gradient(265px 345px, transparent 50%, rgb(0, 0, 0) 50%);
  }

  .output-overlay-face-border {
    height: 345px;
    width: 265px;
  }
}
</style>

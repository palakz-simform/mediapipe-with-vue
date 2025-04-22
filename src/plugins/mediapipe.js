import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm'
import * as cam from '@mediapipe/camera_utils';
import * as ctrl from '@mediapipe/control_utils';
import * as draw from '@mediapipe/drawing_utils';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Holistic } from '@mediapipe/holistic';
export class FrameVTO {
    static VERSION = '0.3.0';

    constructor(input_video, output_canvas, threejs_container) {
        this.input_video = input_video;
        this.output_canvas = output_canvas;
        this.threejs_container = threejs_container;
        this.output_selector_pd;
        this.output_selector_pd_l;
        this.output_selector_pd_r;
        this.output_selector_width;
        this.output_selector_frame;
        this.output_selector_size;
        this.output_selector_shape;
        this.output_selector_rotation;
        this.output_selector_oc;
        this.output_selector_faceAlignment;

        // PD Measurement
        this.detectedPD_L = 0; // measured PD using left iris measurement
        this.detectedPD_R = 0; // measured PD using right iris measurement
        this.detectedPD = 0; // measured PD using average of the left and right iris measurement

        // bridge measurement
        this.detectedBridge = 0;

        // A measurement
        this.detectedLeftA = 0;
        this.detectedWidth = 0;
        this.detectedRightA = 0;

        // moving average
        this.rollingAverage = {
            pd: [],
            pd_l: [],
            pd_r: [],
            bridge: [],
            width: [],  // temple width
            height: [], // height of face in center
        };

        // size and shape
        this.recommendedFramesDetected;
        this.recommendedSizeDetected;
        this.facialShapeRatio = 0;

        // average human iris diameter size in mm
        // nature paper used 12.2 https://www.nature.com/articles/s41598-023-40839-6
        this.irisSize = 12.2; // google state 11.7±0.5 mm; other data sources indicate ranges from 10.2 mm to 13.0 mm
        this.irisConstant_left = 0;
        this.irisConstant_right = 0;
        this.irisConstant_max = 0;
        this.irisConstant_min = 0;
        this.irisConstant_avg = 0;

        // landmarks for iris
        this.leftInnerIrisEdge = 469;
        this.leftOuterIrisEdge = 471;
        this.rightInnerIrisEdge = 476;
        this.rightOuterIrisEdge = 474;
        this.leftIris = 468; // iris center
        this.rightIris = 473; // iris center

        // landmarks for bridge
        this.bridgeTop = 168;
        this.bridgeBottom = 6;
        this.leftBridge = 193;//122;//196;
        this.rightBridge = 417;//351;//419;

        // landarks for temple
        this.leftTemple = 143; // 124
        this.rightTemple = 372; // 353

        this.leftBridgeLandmakr = { x: 0, y: 0 }; // Adjust this based on the landmark data
        this.frameWidth = 1; // Adjust this based on the landmark data
        this.frameHeight = 1;

        this.messages = [
            '',
            'Are you ready?',
            'Look at the camera',
            '3',
            '2',
            '1',
            ''
        ];
        this.currentIndex = 0;
        this.showMessage = false;
        this.showFlashEffect = false;

        // virtual try on
        this.isTryOn = false; // toggle for vto
        this.imageAspectRation = null;
        this.glassesTexture = null;
        this.glassesMaterial = null;
        this.glassesGeometry = null;
        this.glassesHeight = null;
        this.glassesWidth = null;
        this.glassesMesh = null;
        this.vtoWidth = null;
        this.vtoX = null;
        this.vtoY = null;
        this.vtoZ = null;
        this.vtoNormalizedX = null;
        this.vtoNormalizedY = null;
        this.vtoAspectRation = null;
        this.vtoRotationX = null;
        this.vtoRotationZ = null;
        this.vtoRotationY = null;
        this.vtoLeftTopLandmark = 8;
        // this.originalGlassesWidth = null;
        //
        this.headGuide = null;

        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;

        this.isOriented = false;

        this.faceMesh = null;
        this.holistic = null;
        this.camera = null;
        this.isCameraOn = false;

        // threejs properties
        this.scene = null;
        this.threeJSCamera = null;
        this.renderer = null

        this.zDampingFactor = 0.6;
        this.xDampingFactor = 0.8;
        this.yDampingFactor = 0.6;
        this.sizeScaleFactor = 1.1;
        this.headPose = null;
        this.getFaceShape = false;
        this.isModal = false;
        this.faceSize = null;
        this.faceShape = null;
        this.showEyeBridgeMid = false;
        this.displayFaceAlignmentMessage = false;
    }

    init = () => {
        // mediapipe initialization
        this.videoElement = document.getElementsByClassName(this.input_video)[0];
        this.canvasElement = document.getElementsByClassName(this.output_canvas)[0];
        this.canvasCtx = this.canvasElement.getContext('2d');

        this.holistic = new Holistic({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
            }
        });
        this.holistic.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        this.holistic.onResults(this.onResults);
        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });
        this.faceMesh.setOptions({
            selfieMode: true,
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        this.faceMesh.onResults(this.onResults);

        this.camera = new cam.Camera(this.videoElement, {
            onFrame: async () => {
                await this.faceMesh.send({ image: this.videoElement });
            },
        });

        // threejs initialization
        this.scene = new THREE.Scene();
        const FOV = this.getFOV();
        this.threeJSCamera = new THREE.PerspectiveCamera(FOV, this.canvasElement.clientWidth / this.canvasElement.clientHeight, 0.001, 10);
        this.threeJSCamera.position.set(0, 0, 1);
        this.renderer = new THREE.WebGLRenderer({ alpha: true });
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.setSize(this.canvasElement.clientWidth, this.canvasElement.clientHeight, false);
        document.getElementById(this.threejs_container).appendChild(this.renderer.domElement);

        this.animate();
    }

    updateSize = () => {
        if (this.canvasElement.clientWidth > 0 && this.canvasElement.clientHeight > 0) {
            const FOV = this.getFOV();
            this.threeJSCamera = new THREE.PerspectiveCamera(FOV, this.canvasElement.clientWidth / this.canvasElement.clientHeight, 0.001, 10);
            this.threeJSCamera.position.set(0, 0, 1);

            this.threeJSCamera.aspect = this.canvasElement.clientWidth / this.canvasElement.clientHeight;
            this.threeJSCamera.updateProjectionMatrix();
            this.renderer.setSize(this.canvasElement.clientWidth, this.canvasElement.clientHeight, false);
            console.log(`Updated size: ${this.canvasElement.clientWidth} x ${this.canvasElement.clientHeight}`);

        } else {
            console.error('Canvas has zero width or height, size update skipped');
        }
    }

    animate = () => {
        requestAnimationFrame(this.animate);
        this.renderTryOn();
        this.renderer.render(this.scene, this.threeJSCamera);
    }

    renderTryOn = () => {
        if (this.isTryOn) {
            let nullProperties = [];
            if (this.vtoWidth === null) nullProperties.push('vtoWidth');
            if (this.vtoNormalizedX === null) nullProperties.push('vtoNormalizedX');
            if (this.vtoNormalizedY === null) nullProperties.push('vtoNormalizedY');
            if (this.vtoRotationX === null) nullProperties.push('vtoRotationX');
            if (this.vtoTransformedLeft === null) nullProperties.push('vtoTransformedLeft');
            if (this.vtoTransformedRight === null) nullProperties.push('vtoTransformedRight');

            if (nullProperties.length === 0) {
                // Position
                // this.glassesMesh.position.set((this.vtoNormalizedX*(1.120)), this.vtoNormalizedY / 2.1, 0);
                const { yaw, pitch, roll } = this.headPose;
                this.glassesMesh.position.set(this.vtoNormalizedX, this.vtoNormalizedY / 2 - 0.05, 0.05);

                // Scale
                this.glassesMesh.scale.set(this.vtoWidth, this.vtoWidth, 1);

                // Rotation
                const adjustedPitch = pitch + Math.PI / 2 + Math.PI / 8;
                this.glassesMesh.rotation.set(-Math.sin(adjustedPitch), this.vtoRotationZ, Math.cos(roll));

                // Manage visibility
                this.glassesMesh.visible = true;
                // console.log(`mesh is visible`);
            } else {
                console.log(`mesh is NOT visible due to null properties: ${nullProperties.join(', ')}`);
                if (this.glassesMesh) {
                    this.glassesMesh.visible = false;
                }
            }
        } else {
            if (this.glassesMesh) {
                this.glassesMesh.visible = false;
            }
        }

    }

    onResults = (results) => {
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;

        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        this.canvasCtx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);


        if (results.multiFaceLandmarks.length > 0) {
            for (const landmarks of results.multiFaceLandmarks) {
                // calculate the relative distances for the LEFT iris diameter
                const leftIrisRelativeDistance = this.calculateDistance(landmarks[this.leftInnerIrisEdge], landmarks[this.leftOuterIrisEdge]);
                // calculate the relative distances for the RIGHT iris diameter
                const rightIrisRelativeDistance = this.calculateDistance(landmarks[this.rightInnerIrisEdge], landmarks[this.rightOuterIrisEdge]);

                // draw green landmarks on iris
                // drawConnectors(this.canvasCtx, landmarks, FACEMESH_RIGHT_IRIS, { color: '#30FF30', lineWidth: 0.25 });
                // drawConnectors(this.canvasCtx, landmarks, FACEMESH_LEFT_IRIS, { color: '#30FF30', lineWidth: 0.25 });
                // draw red circle around center of iris
                const x_l = landmarks[this.leftIris].x * this.canvasElement.width;
                const y_l = landmarks[this.leftIris].y * this.canvasElement.height;
                const x_r = landmarks[this.rightIris].x * this.canvasElement.width;
                const y_r = landmarks[this.rightIris].y * this.canvasElement.height;
                this.canvasCtx.strokeStyle = 'red'; // Set the outline color to red
                this.canvasCtx.lineWidth = 1; // Set the outline width (adjust as needed)
                this.canvasCtx.beginPath();
                this.canvasCtx.arc(x_l, y_l, leftIrisRelativeDistance, 0, 2 * Math.PI);
                this.canvasCtx.stroke(); // Draw an outline instead of filling
                this.canvasCtx.strokeStyle = 'red'; // Set the outline color to red
                this.canvasCtx.lineWidth = 1; // Set the outline width (adjust as needed)
                this.canvasCtx.beginPath();
                this.canvasCtx.arc(x_r, y_r, rightIrisRelativeDistance, 0, 2 * Math.PI);
                this.canvasCtx.stroke(); // Draw an outline instead of filling

                const cheek_x_l = landmarks[this.leftTemple].x * this.canvasElement.width;
                const cheek_y_l = landmarks[this.leftTemple].y * this.canvasElement.height;
                const cheek_x_r = landmarks[this.rightTemple].x * this.canvasElement.width;
                const cheek_y_r = landmarks[this.rightTemple].y * this.canvasElement.height;

                // determine color based on deviation
                const cheek_z_l = landmarks[this.leftTemple].z;
                const cheek_z_r = landmarks[this.rightTemple].z;
                const templeColor = this.compareZDeviation(cheek_z_l, cheek_z_r, 0.01);

                if (this.displayFaceAlignmentMessage) {
                    const elements = document.getElementsByClassName(this.output_selector_faceAlignment);
                    if (!this.isOriented) {
                        elements[0].classList.remove('d-none');
                    }
                    else {
                        elements[0].classList.add('d-none');
                    }
                }
                if (this.showEyeBridgeMid === true) {
                    const noseBridgeLeft = landmarks[100];
                    const noseBridgeRight = landmarks[338];

                    let noseBridgeMid = this.findMidPoint(noseBridgeLeft, noseBridgeRight);
                    const noseBridgeMidX = noseBridgeMid.x * this.canvasElement.width;
                    const noseBridgeMidY = noseBridgeMid.y * this.canvasElement.height;

                    const scaleFactorNormalized = this.calculateDistance(
                        landmarks[this.leftTemple],
                        landmarks[this.rightTemple]
                    );

                    const outerRadius = 50 * scaleFactorNormalized;
                    const innerRadius = 3;
                    const lineWidth = 2;

                    this.canvasCtx.strokeStyle = 'red';
                    this.canvasCtx.lineWidth = lineWidth;
                    this.canvasCtx.lineCap = 'round';
                    this.canvasCtx.lineJoin = 'round';
                    const targetY = noseBridgeMidY + 15;
                    const targetX = noseBridgeMidX + 3
                }

                // calculate the iris constants for each eye used to determine actual measurements
                this.irisConstant_left = this.irisSize / leftIrisRelativeDistance;
                this.irisConstant_right = this.irisSize / rightIrisRelativeDistance;
                this.irisConstant_max = Math.max(this.irisConstant_left, this.irisConstant_right);
                this.irisConstant_min = Math.min(this.irisConstant_left, this.irisConstant_right);
                this.irisConstant_avg = (this.irisConstant_left, this.irisConstant_right) / 2;

                // let bridgeMid = this.findMidPoint(landmarks[this.leftIris], landmarks[this.rightIris]);
                let bridgeMid = this.findMidPoint(landmarks[this.leftIris], landmarks[this.rightIris]);
                const irisRelativeDistanceLeft = this.calculateDistance(landmarks[this.leftIris], bridgeMid, false);
                const irisRelativeDistanceRight = this.calculateDistance(landmarks[this.rightIris], bridgeMid, false);
                let pd_left = this.irisConstant_left * irisRelativeDistanceLeft * 2;
                let pd_right = this.irisConstant_right * irisRelativeDistanceRight * 2;

                if (document.getElementsByClassName(this.output_selector_pd)[0] && this.getFaceShape === true) {
                    document.getElementsByClassName(this.output_selector_pd)[0].innerHTML = this.detectedPD.toFixed(1) + ' <small class="text-muted">mm</small>';
                }
                if (document.getElementsByClassName(this.output_selector_pd_l)[0]) {
                    document.getElementsByClassName(this.output_selector_pd_l)[0].innerHTML = this.detectedPD_L.toFixed(1) + ' <small class="text-muted">mm</small>';
                }
                if (document.getElementsByClassName(this.output_selector_pd_r)[0]) {
                    document.getElementsByClassName(this.output_selector_pd_r)[0].innerHTML = this.detectedPD_R.toFixed(1) + ' <small class="text-muted">mm</small>';
                }

                // frame width
                let templeMidPoint = this.findMidPoint(landmarks[this.leftTemple], landmarks[this.rightTemple]);
                let detectedWidth_L = this.calculateDistance(landmarks[this.leftTemple], templeMidPoint, false) * this.irisConstant_left;
                let detectedWidth_R = this.calculateDistance(landmarks[this.rightTemple], templeMidPoint, false) * this.irisConstant_right;
                if (document.getElementsByClassName(this.output_selector_width)[0]) {
                    document.getElementsByClassName(this.output_selector_width)[0].innerHTML = this.detectedWidth.toFixed(1) + ' <small class="text-muted">mm</small>';
                }
                if (document.getElementsByClassName(this.output_selector_size)[0] && this.getFaceShape === true) {
                    let b_measurement = this.detectedWidth;
                    if (b_measurement < 108) {
                        this.faceSize = 'Petite'
                        // document.getElementsByClassName(this.output_selector_size)[0].innerHTML = 'Petite';
                    } else if (b_measurement >= 108 && b_measurement <= 113) {
                        this.faceSize = 'Small'
                        // document.getElementsByClassName(this.output_selector_size)[0].innerHTML = 'Small';
                    } else if (b_measurement >= 114 && b_measurement <= 127) {
                        this.faceSize = 'Medium'
                        // document.getElementsByClassName(this.output_selector_size)[0].innerHTML = 'Medium';
                    } else {
                        this.faceSize = 'Large'
                        // document.getElementsByClassName(this.output_selector_size)[0].innerHTML = 'Large';
                    }
                }
                // vto rotation
                this.vtoRotationX = this.angleFromXAxis(landmarks[this.leftTemple], landmarks[this.rightTemple], this.xDampingFactor);
                this.vtoRotationZ = this.angleFromZAxis(landmarks[this.leftTemple], landmarks[this.rightTemple], this.zDampingFactor);
                this.vtoRotationY = this.angleFromYAxis(landmarks[this.leftTemple], landmarks[this.rightTemple], this.yDampingFactor);
                if (document.getElementsByClassName(this.output_selector_rotation)[0]) {
                    document.getElementsByClassName(this.output_selector_rotation)[0].innerHTML = `${this.vtoRotationX.toFixed(1)} / ${this.vtoRotationZ.toFixed(1)} <small class="text-muted">rad</small>`;
                }
                //vto x/y (starts at left top)
                this.vtoX = landmarks[this.vtoLeftTopLandmark].x * this.canvasElement.width;
                this.vtoY = landmarks[this.vtoLeftTopLandmark].y * this.canvasElement.height;
                this.vtoZ = 1 / (Math.abs(landmarks[this.vtoLeftTopLandmark].z) * this.irisConstant_avg);
                // console.log(`${this.vtoZ} ${landmarks[this.vtoLeftTopLandmark].z} ${this.irisConstant_avg}`);
                this.vtoNormalizedX = (this.vtoX / this.canvasElement.width) * 2 - 1;
                this.vtoNormalizedY = -((this.vtoY / this.canvasElement.height) * 2 - 1);

                // Adjust for aspect ratio
                this.vtoAspectRatio = this.canvasElement.width / this.canvasElement.height;
                // this.vtoNormalizedX = this.vtoNormalizedX * this.vtoAspectRatio;

                const normalizedLeftTemple = {
                    x: (((landmarks[this.leftTemple].x * this.canvasElement.width) / this.canvasElement.width) * 2 - 1) * this.vtoAspectRatio,
                    y: -((landmarks[this.leftTemple].y * this.canvasElement.height) / this.canvasElement.height) * 2 - 1,
                    z: landmarks[this.leftTemple].z
                };
                const normalizedRightTemple = {
                    x: (((landmarks[this.rightTemple].x * this.canvasElement.width) / this.canvasElement.width) * 2 - 1) * this.vtoAspectRatio,
                    y: -((landmarks[this.rightTemple].y * this.canvasElement.height) / this.canvasElement.height) * 2 - 1,
                    z: landmarks[this.rightTemple].z
                };
                const normalizedMidTemple = {
                    x: (((templeMidPoint.x * this.canvasElement.width) / this.canvasElement.width) * 2 - 1) * this.vtoAspectRatio,
                    y: -((templeMidPoint.y * this.canvasElement.height) / this.canvasElement.height) * 2 - 1,
                    z: templeMidPoint.z
                };
                // last param (d2) should be false....
                this.vtoWidth = this.calculateDistance(normalizedLeftTemple, normalizedMidTemple, false) + this.calculateDistance(normalizedRightTemple, normalizedMidTemple, false);
                this.vtoWidth = this.vtoWidth * this.sizeScaleFactor;

                // if (this.isOriented) {
                this.detectedPD_L = this.addDataPointSize(this.rollingAverage, 'pd_l', pd_left, 500);
                this.detectedPD_R = this.addDataPointSize(this.rollingAverage, 'pd_r', pd_right, 500);
                this.detectedPD = this.addDataPointSize(this.rollingAverage, 'pd', (pd_left + pd_right) / 2, 500);
                this.detectedWidth = this.addDataPointSize(this.rollingAverage, 'width', detectedWidth_L + detectedWidth_R, 500);
                // }
                if (results.multiFaceLandmarks) {
                    for (const landmarks of results.multiFaceLandmarks) {
                        const headPose = this.calculateHeadPose(landmarks);
                        this.headPose = headPose;
                        // Render AR frame on the face
                    }
                }
                if (this.getFaceShape === true) {
                    this.recommendEyeglasses(this.determineFaceShape(landmarks));
                }
            }
        }

        if (this.showMessage) {
            this.canvasCtx.font = this.currentIndex < 3 ? '48px Arial' : '96px Arial';
            this.canvasCtx.fillStyle = 'white';
            this.canvasCtx.textAlign = 'center';
            this.canvasCtx.fillText(this.messages[this.currentIndex], this.canvasElement.width / 2, (this.canvasElement.height / 2));
        }

        this.canvasCtx.restore();
    }


    compareZDeviation = (cheek_z_l, cheek_z_r, threshold) => {
        // Calculate the absolute difference between the z-values
        const deviation = Math.abs(cheek_z_l - cheek_z_r);

        // Compare the deviation with the threshold
        if (deviation > threshold) {
            this.isOriented = false;
            if (cheek_z_l > cheek_z_r) {
                return { left: 'red', right: 'blue' };
            } else {
                return { left: 'blue', right: 'red' };
            }
        } else {
            this.isOriented = true;
            return { left: 'blue', right: 'blue' };
        }
    }

    angleFromXAxis = (point1, point2, dampingFactor = 1) => {
        // Calculate the differences in x and y coordinates
        const deltaX = point2.x - point1.x;
        const deltaY = (point2.y - point1.y) * dampingFactor;

        // Use atan2 to calculate the angle in radians
        const angleRadians = Math.atan2(deltaY, deltaX);

        // Ensure the angle is positive (between 0 and 2*pi)
        return (angleRadians + 2 * Math.PI) % (2 * Math.PI);
    }

    angleFromZAxis = (point1, point2, dampingFactor = 1) => {
        // Calculate the differences in x and z coordinates
        const deltaX = point2.x - point1.x;
        const deltaZ = (point2.z - point1.z) * dampingFactor;

        // Use atan2 to calculate the angle in radians
        const angleRadians = Math.atan2(deltaZ, deltaX);

        // Ensure the angle is positive (between 0 and 2*pi)
        return (angleRadians + 2 * Math.PI) % (2 * Math.PI);
    }
    angleFromYAxis = (point1, point2, dampingFactor = 1) => {
        // Calculate the differences in y and x coordinates
        const deltaY = (point2.z - point1.z) * dampingFactor;
        const deltaX = point2.y - point1.y;

        // Use atan2 to calculate the angle relative to the Y-axis
        const angleRadians = Math.atan2(deltaX, Math.abs(deltaY)); // Swap deltaX and deltaY for Y-axis calculation

        // Ensure the angle is positive (between 0 and 2*pi)
        return (angleRadians + 2 * Math.PI) % (2 * Math.PI);
    }

    start = () => {
        this.camera.start();
        this.isCameraOn = true;
    }

    stop = () => {
        this.faceSize = '';
        this.faceShape = '';
        this.camera.stop();
        this.scene.remove(this.glassesMesh);
        this.isCameraOn = false;
    }

    toggleCamera = () => {
        if (this.isCameraOn) {
            this.stop();
        } else {
            this.start();
        }
    }

    vtoStart = (imageUrl) => {
        var img = new Image();
        // Set the image source to start loading
        img.src = imageUrl;
        // Add an event listener to calculate the aspect ratio after the image has loaded
        img.onload = () => {
            // Calculate the aspect ratio
            this.imageAspectRation = img.width / img.height;
            this.glassesWidth = 1.0;
            this.glassesHeight = img.height / img.width;

            this.disposeGeometry();
            // var eyeglassesImg = new Image();
            // eyeglassesImg.src = imageUrl;
            // this.tryOnImage = eyeglassesImg;
            const textureLoader = new THREE.TextureLoader();
            // this.glassesTexture = textureLoader.load(imageUrl);
            // this.glassesTexture.encoding = THREE.sRGBEncoding;
            this.glassesTexture = textureLoader.load(imageUrl, (texture) => {
                texture.encoding = THREE.sRGBEncoding;
                // Any additional operations on the texture after it's loaded
            });

            // Create material with the texture
            this.glassesMaterial = new THREE.MeshBasicMaterial({
                map: this.glassesTexture,
                transparent: true, // important for PNG transparency
                side: THREE.DoubleSide
            });

            // Create a plane geometry for the glasses
            this.glassesGeometry = new THREE.PlaneGeometry(this.glassesWidth, this.glassesHeight); // Adjust size as needed
            this.glassesMesh = new THREE.Mesh(this.glassesGeometry, this.glassesMaterial);
            this.scene.add(this.glassesMesh);

            this.isTryOn = true;
            if (this.isTryOn) {
                console.log(`VTO ON: ${imageUrl} ${img.width} x ${img.height}`);
            }
        };
    }

    vtoStop = () => {
        this.isTryOn = false;
        this.disposeGeometry();
    }

    disposeGeometry = () => {
        if (this.glassesTexture) {
            this.glassesTexture.dispose();
            this.glassesTexture = null;
        }
        if (this.glassesMaterial) {
            this.glassesMaterial.dispose();
            this.glassesMaterial = null;
        }
        if (this.glassesGeometry) {
            this.glassesGeometry.dispose();
            this.glassesGeometry = null;
        }
        if (this.glassesMesh) {
            this.scene.remove(this.glassesMesh);
            this.glassesMesh = null;
        }
    }

    recommendEyeglasses = (e) => {
        // const elements = document.getElementsByClassName(this.output_selector_shape);
        const elements = document.getElementsByClassName(this.output_selector_frame);
        if (elements.length > 0) { // Check if the element exists
            switch (e) {
                case "Square":
                    elements[0].innerHTML = "Round<br />Oval";
                    break;
                case "Oblong":
                    elements[0].innerHTML = "Square";
                    break;
                case "Round":
                    elements[0].innerHTML = "Rectangle<br />Square";
                    break;
                case "Oval":
                    elements[0].innerHTML = "Cat Eye<br />Rectangle";
                    break;
                case "Heart":
                    elements[0].innerHTML = "Cat Eye<br />Oval";
                    break;
                default:
                    elements[0].innerHTML = "--";
            }
        }
    };

    // Function to display the current message on the canvas
    displayMessage = () => {
        currentIndex++;

        if (currentIndex < messages.length) {
            setTimeout(displayMessage, 1000); // Display the next message after 1 second
        } else {
            showMessage = false;
            $("#ipd-measurement").html(`${Math.round(rollingAvgPD)}`);
        }
    }

    determineFaceShape = (landmarks) => {
        const faceLength = this.euclideanDistance(landmarks[10], landmarks[152]); // Forehead to chin
        const faceWidth = this.euclideanDistance(landmarks[234], landmarks[454]); // Cheek-to-cheek
        const jawlineAngle = this.calculateAngle(
            landmarks[234], // Left cheek
            landmarks[152], // Chin
            landmarks[454]  // Right cheek
        ).toFixed(2);
        const cheekboneWidth = this.euclideanDistance(landmarks[93], landmarks[323]); // High cheekbones
        const foreheadWidth = this.euclideanDistance(landmarks[71], landmarks[301]); // Forehead width

        // Ratios

        const ratio = faceWidth / faceLength;
        const widthToLengthRatio = ratio.toFixed(2);
        const elements = document.getElementsByClassName(this.output_selector_shape);

        if (widthToLengthRatio >= 0.63 && widthToLengthRatio <= 0.65 && jawlineAngle >= 119 && jawlineAngle <= 121.99) {
            this.faceShape = "Square"
            // if (elements[0]) {
            //     elements[0].innerHTML = "Square";
            // }
            return "Square";
        } else if (widthToLengthRatio <= 0.61 && jawlineAngle >= 123 && jawlineAngle <= 128.99) {
            this.faceShape = "Oblong"
            // if (elements[0]) {
            //     elements[0].innerHTML = "Oblong"
            // }
            return "Oblong";
        } else if (widthToLengthRatio >= 0.61 && widthToLengthRatio <= 0.63 && jawlineAngle >= 121 && jawlineAngle <= 124.99) {
            this.faceShape = "Oval"
            // if (elements[0]) {
            //     elements[0].innerHTML = "Oval"
            // }
            return "Oval";
        } else if (widthToLengthRatio >= 0.68 && jawlineAngle <= 120.99) {
            this.faceShape = "Round"
            // if (elements[0]) {
            //     elements[0].innerHTML = "Round"
            // }
            return "Round";
        } else if (widthToLengthRatio >= 0.63 && widthToLengthRatio <= 0.66 && jawlineAngle >= 121 && jawlineAngle <= 127.99) {
            this.faceShape = "Heart"
            // if (elements[0]) {
            //     elements[0].innerHTML = "Heart"
            // }
            return "Heart";
        } else {
            this.faceShape = "Unclassified"
            // if (elements[0]) {
            //     elements[0].innerHTML = "Unclassified"
            // }
            return "Unclassified";
        }
    };

    euclideanDistance = (point1, point2) => {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    };

    calculateAngle = (a, b, c) => {
        const ab = {
            x: b.x - a.x,
            y: b.y - a.y,
        };
        const bc = {
            x: c.x - b.x,
            y: c.y - b.y,
        };
        const dotProduct = ab.x * bc.x + ab.y * bc.y;
        const magnitudeAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
        const magnitudeBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
        const angleRad = Math.acos(dotProduct / (magnitudeAB * magnitudeBC));
        return angleRad * (180 / Math.PI); // Convert radians to degrees
    };

    // Calculate the Euclidean distance between the two landmarks
    calculateDistance = (landmark1, landmark2, d2 = true) => {
        const dx = landmark1.x - landmark2.x;
        const dy = landmark1.y - landmark2.y;
        if (d2) {
            return Math.sqrt(dx * dx + dy * dy);
        } else {
            const dz = landmark1.z - landmark2.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
    }

    findMidPoint = (pointA, pointB) => {
        // Calculate the coordinates of the midpoint
        const midX = (pointA.x + pointB.x) / 2;
        const midY = (pointA.y + pointB.y) / 2;
        const midZ = (pointA.z + pointB.z) / 2;

        // Return the midpoint as an object
        return { x: midX, y: midY, z: midZ };
    }

    // Function to compare arrays for equality
    arraysEqual = (arr1, arr2) => {
        return JSON.stringify(arr1) == JSON.stringify(arr2);
    }

    addDataPointSize = (rollingAverage, property, newDataPoint, maxDataPoints = 250) => {
        // check if rollingAverage contains property
        if (rollingAverage.hasOwnProperty(property)) {
            // Add the new data point to the beginning of the array
            rollingAverage[property].unshift(newDataPoint);
        } else {
            // no new property, then add it and add first point
            rollingAverage[property] = [newDataPoint];
        }

        // If the array exceeds the maximum number of data points, remove the oldest data point (FIFO)
        if (rollingAverage[property].length > maxDataPoints) {
            rollingAverage[property].pop();
        }

        // Calculate the rolling average
        return rollingAverage[property].reduce((sum, value) => sum + value, 0) / rollingAverage[property].length;
    }

    destroy = () => {
        // Stop the camera
        if (this.isCameraOn) {
            this.stop();
        }

        // Remove the renderer from the DOM
        if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }

        // Dispose of Three.js objects
        this.disposeGeometry();

        // Dispose of the renderer explicitly
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }

        // Dispose of the camera
        if (this.threeJSCamera) {
            this.threeJSCamera = null;
        }

        // Nullify the scene
        if (this.scene) {
            this.scene = null;
        }

        // If using mediapipe or similar libraries, ensure to stop their processes as well
        if (this.holistic) {
            this.holistic.close();
            this.holistic = null;
        }

        if (this.faceMesh) {
            this.faceMesh.close();
            this.faceMesh = null;
        }

        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
    }

    calculateHeadPose = (landmarks) => {
        // Define key points
        const nose = landmarks[1]; // Nose tip
        const leftEye = landmarks[33]; // Left eye corner
        const rightEye = landmarks[263]; // Right eye corner
        const chin = landmarks[152]; // Chin point

        // Calculate yaw (horizontal rotation around Y-axis)
        const yaw = Math.atan2(
            rightEye.x - leftEye.x,
            rightEye.z - leftEye.z
        );

        // Calculate pitch (vertical rotation around X-axis)
        const pitch = Math.atan2(
            nose.y - chin.y, // Adjust to align nose above chin
            nose.z - chin.z
        );

        // Calculate roll (tilt around Z-axis)
        const roll = Math.atan2(
            leftEye.x - rightEye.x,
            leftEye.y - rightEye.y
        );

        // Return head pose angles in radians
        return { yaw, pitch, roll };
    };

    stopFaceDetection = () => {
        this.getFaceShape = false
    };

    startFaceDetection = () => {
        this.getFaceShape = true
    };

    getFOV = () => {
        function calculateFOV(width) {
            if (width >= 1564) return 40; // Upper bound
            if (width <= 288) return 87; // Lower bound

            if (width > 288 && width <= 388) {
                let m = (85.95 - 87) / (388 - 288);
                let c = 87 - m * 288;
                return m * width + c;
            }

            if (width > 388 && width <= 488) {
                let m = (84.64 - 85.95) / (488 - 388);
                let c = 85.95 - m * 388;
                return m * width + c;
            }

            if (width > 488 && width <= 588) {
                let m = (86 - 84.64) / (588 - 488);
                let c = 84.64 - m * 488;
                return m * width + c;
            }

            if (width > 588 && width <= 688) {
                let m = (84 - 86) / (688 - 588);
                let c = 86 - m * 588;
                return m * width + c;
            }

            if (width > 688 && width <= 788) {
                let m = (78 - 84) / (788 - 688);
                let c = 84 - m * 688;
                return m * width + c;
            }

            if (width > 788 && width <= 888) {
                let m = (68 - 78) / (888 - 788);
                let c = 78 - m * 788;
                return m * width + c;
            }

            if (width > 888 && width <= 988) {
                let m = (80 - 68) / (988 - 888);
                let c = 68 - m * 888;
                return m * width + c;
            }

            if (width > 988 && width <= 1031) {
                let m = (60 - 80) / (1031 - 988);
                let c = 80 - m * 988;
                return m * width + c;
            }

            if (width > 1031 && width <= 1164) {
                let m = (53 - 60) / (1164 - 1031);
                let c = 60 - m * 1031;
                return m * width + c;
            }

            if (width > 1164 && width <= 1231) {
                let m = (52 - 53) / (1231 - 1164);
                let c = 53 - m * 1164;
                return m * width + c;
            }

            if (width > 1231 && width <= 1297) {
                let m = (50 - 52) / (1297 - 1231);
                let c = 52 - m * 1231;
                return m * width + c;
            }

            if (width > 1297 && width <= 1364) {
                let m = (47 - 50) / (1364 - 1297);
                let c = 50 - m * 1297;
                return m * width + c;
            }

            if (width > 1364 && width <= 1431) {
                let m = (44 - 47) / (1431 - 1364);
                let c = 47 - m * 1364;
                return m * width + c;
            }

            if (width > 1431 && width <= 1497) {
                let m = (42 - 44) / (1497 - 1431);
                let c = 44 - m * 1431;
                return m * width + c;
            }

            if (width > 1497 && width <= 1564) {
                let m = (40 - 42) / (1564 - 1497);
                let c = 42 - m * 1497;
                return m * width + c;
            }
        }


        function calculateScalingFactor(width) {
            const actualFOV = calculateFOV(width);
            const baseFOV = calculateFOV(width);
            return baseFOV / actualFOV;
        }

        const width = this.canvasElement.clientWidth;
        const scalingFactor = calculateScalingFactor(width) / (this.isModal ? 1 : 1);
        const FOV = calculateFOV(width) * scalingFactor;
        return FOV;
    };
}

import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export function use3DAvatar(canvas3DRef, videoRef) {
  const isModelLoaded = ref(false)
  const modelLoadError = ref(null)
  const isAvatarVisible = ref(true)

  let scene, camera, renderer, avatar, mixer
  let morphTargetMeshes = []
  let headBone = null
  let neckBone = null
  let hasLoggedBlendShapes = false
  
  const MODEL_URL = 'https://models.readyplayer.me/698c2441378169941785f4a6.glb?morphTargets=ARKit&textureAtlas=1024'

  // MediaPipe to ARKit blend shape name mapping
  // MediaPipe uses slightly different names, this maps them to ARKit standard
  const blendShapeMapping = {
    'browDownLeft': 'browDown_L',
    'browDownRight': 'browDown_R',
    'browInnerUp': 'browInnerUp',
    'browOuterUpLeft': 'browOuterUp_L',
    'browOuterUpRight': 'browOuterUp_R',
    'cheekPuff': 'cheekPuff',
    'cheekSquintLeft': 'cheekSquint_L',
    'cheekSquintRight': 'cheekSquint_R',
    'eyeBlinkLeft': 'eyeBlink_L',
    'eyeBlinkRight': 'eyeBlink_R',
    'eyeLookDownLeft': 'eyeLookDown_L',
    'eyeLookDownRight': 'eyeLookDown_R',
    'eyeLookInLeft': 'eyeLookIn_L',
    'eyeLookInRight': 'eyeLookIn_R',
    'eyeLookOutLeft': 'eyeLookOut_L',
    'eyeLookOutRight': 'eyeLookOut_R',
    'eyeLookUpLeft': 'eyeLookUp_L',
    'eyeLookUpRight': 'eyeLookUp_R',
    'eyeSquintLeft': 'eyeSquint_L',
    'eyeSquintRight': 'eyeSquint_R',
    'eyeWideLeft': 'eyeWide_L',
    'eyeWideRight': 'eyeWide_R',
    'jawForward': 'jawForward',
    'jawLeft': 'jawLeft',
    'jawOpen': 'jawOpen',
    'jawRight': 'jawRight',
    'mouthClose': 'mouthClose',
    'mouthDimpleLeft': 'mouthDimple_L',
    'mouthDimpleRight': 'mouthDimple_R',
    'mouthFrownLeft': 'mouthFrown_L',
    'mouthFrownRight': 'mouthFrown_R',
    'mouthFunnel': 'mouthFunnel',
    'mouthLeft': 'mouthLeft',
    'mouthLowerDownLeft': 'mouthLowerDown_L',
    'mouthLowerDownRight': 'mouthLowerDown_R',
    'mouthPressLeft': 'mouthPress_L',
    'mouthPressRight': 'mouthPress_R',
    'mouthPucker': 'mouthPucker',
    'mouthRight': 'mouthRight',
    'mouthRollLower': 'mouthRollLower',
    'mouthRollUpper': 'mouthRollUpper',
    'mouthShrugLower': 'mouthShrugLower',
    'mouthShrugUpper': 'mouthShrugUpper',
    'mouthSmileLeft': 'mouthSmile_L',
    'mouthSmileRight': 'mouthSmile_R',
    'mouthStretchLeft': 'mouthStretch_L',
    'mouthStretchRight': 'mouthStretch_R',
    'mouthUpperUpLeft': 'mouthUpperUp_L',
    'mouthUpperUpRight': 'mouthUpperUp_R',
    'noseSneerLeft': 'noseSneer_L',
    'noseSneerRight': 'noseSneer_R',
  }

  const initThreeJS = () => {
    const canvas = canvas3DRef.value
    if (!canvas) return

    // Scene setup
    scene = new THREE.Scene()

    // Camera setup - positioned for front-facing selfie view
    camera = new THREE.PerspectiveCamera(
      35,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 2.5)
    camera.lookAt(0, 0, 0)

    // Renderer setup with transparency
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    })
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.outputColorSpace = THREE.SRGBColorSpace

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight1.position.set(1, 1, 1)
    scene.add(directionalLight1)

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4)
    directionalLight2.position.set(-1, 0.5, -1)
    scene.add(directionalLight2)

    // Load the GLB model
    loadModel()

    // Start render loop
    animate()
  }

  const loadModel = () => {
    const loader = new GLTFLoader()

    loader.load(
      MODEL_URL,
      (gltf) => {
        avatar = gltf.scene

        // Scale and position the model appropriately - show only head/face
        avatar.scale.set(2.5, 2.5, 2.5)
        avatar.position.set(0, -3.9, 0)

        // Find all meshes with morph targets
        avatar.traverse((child) => {
          if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
            morphTargetMeshes.push(child)
            console.log('Found mesh with morph targets:', child.name, 
                       'Targets:', Object.keys(child.morphTargetDictionary))
          }
          
          // Find head and neck bones for rotation
          if (child.isBone) {
            const boneName = child.name.toLowerCase()
            if (boneName.includes('head') && !boneName.includes('headtop')) {
              headBone = child
              console.log('Found head bone:', child.name)
            }
            if (boneName.includes('neck')) {
              neckBone = child
              console.log('Found neck bone:', child.name)
            }
          }
        })

        scene.add(avatar)
        isModelLoaded.value = true
        console.log('3D Avatar loaded successfully')
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100
        console.log(`Loading model: ${percent.toFixed(1)}%`)
      },
      (error) => {
        console.error('Error loading 3D model:', error)
        modelLoadError.value = 'Failed to load 3D avatar model'
        isModelLoaded.value = false
      }
    )
  }

  const animate = () => {
    if (!renderer || !scene || !camera) return

    requestAnimationFrame(animate)

    if (isAvatarVisible.value) {
      renderer.render(scene, camera)
    } else {
      renderer.clear()
    }
  }

  const calculateHeadPose = (landmarks) => {
    if (!landmarks || landmarks.length < 478) return null

    // Key facial landmarks for pose estimation
    const noseTip = landmarks[1]          // Nose tip
    const noseBridge = landmarks[6]       // Nose bridge (more stable)
    const foreheadCenter = landmarks[10]  // Forehead center
    const chin = landmarks[152]           // Chin
    const leftCheek = landmarks[234]      // Left cheek
    const rightCheek = landmarks[454]     // Right cheek
    const leftEye = landmarks[468]        // Left eye center
    const rightEye = landmarks[473]       // Right eye center

    // Use nose bridge for stable center (less affected by rotation)
    const centerX = noseBridge.x
    const centerY = noseBridge.y
    const centerZ = noseBridge.z

    // Calculate face dimensions for scaling
    const faceWidth = Math.abs(rightCheek.x - leftCheek.x)
    const faceHeight = Math.abs(chin.y - foreheadCenter.y)

    // Estimate rotation from landmark positions
    // Yaw (left-right head turn) - based on nose offset from eye center
    const eyeCenterX = (leftEye.x + rightEye.x) / 2
    const noseToCenterX = noseTip.x - eyeCenterX
    const yaw = -(noseToCenterX / faceWidth) * Math.PI * 0.8

    // Pitch (up-down head tilt)
    const faceCenterY = (foreheadCenter.y + chin.y) / 2
    const noseToCenterY = noseTip.y - faceCenterY
    const pitch = (noseToCenterY / faceHeight) * Math.PI * 0.4

    // Roll (head tilt left-right) - Negate to match mirror
    const eyeSlope = (rightEye.y - leftEye.y) / (rightEye.x - leftEye.x)
    const roll = -Math.atan(eyeSlope)

    // Stable position based on nose bridge (not affected by rotation)
    const position = {
      x: -(centerX - 0.5) * 2.0,  // Screen X position
      y: -(centerY - 0.5) * 2.0,  // Screen Y position (inverted)
      z: centerZ * 0.3             // Z depth
    }

    return { position, rotation: { pitch, yaw, roll }, faceWidth, faceHeight }
  }

  const updateAvatar = (landmarks, blendShapes) => {
    if (!avatar || !isModelLoaded.value || !isAvatarVisible.value) return

    // Update head pose and scale based on landmarks
    if (landmarks && landmarks.length >= 478) {
      const headPose = calculateHeadPose(landmarks)
      if (headPose) {
        // Dynamic scaling based on face size to match real face
        const baseScale = 2.5
        const scaleMultiplier = headPose.faceWidth * 8
        const targetScale = baseScale * scaleMultiplier
        avatar.scale.set(targetScale, targetScale, targetScale)

        // Y offset scales with avatar size to keep head properly positioned
        const yOffset = -targetScale * 1.6

        // Position synced to face location (rotation-independent)
        avatar.position.x = headPose.position.x
        avatar.position.y = headPose.position.y + yOffset
        avatar.position.z = headPose.position.z - 1.5

        // Apply rotation to head bone only (not entire body)
        if (headBone) {
          // Rotate head bone for natural head movement
          headBone.rotation.x = headPose.rotation.pitch * 0.7
          headBone.rotation.y = headPose.rotation.yaw * 0.7
          headBone.rotation.z = headPose.rotation.roll * 0.5
        }
        
        // Also rotate neck slightly for more natural look
        if (neckBone) {
          neckBone.rotation.x = headPose.rotation.pitch * 0.3
          neckBone.rotation.y = headPose.rotation.yaw * 0.3
          neckBone.rotation.z = headPose.rotation.roll * 0.2
        }
        
        // Keep body rotation neutral
        avatar.rotation.x = 0
        avatar.rotation.y = 0
        avatar.rotation.z = 0
      }
    }

    // Update facial expressions via blend shapes
    if (blendShapes && morphTargetMeshes.length > 0) {
      // Debug: Log blend shapes and morph targets once
      if (!hasLoggedBlendShapes) {
        hasLoggedBlendShapes = true
        console.log('MediaPipe blend shapes:', blendShapes.map(s => s.categoryName))
        morphTargetMeshes.forEach(mesh => {
          console.log('Model morph targets for', mesh.name + ':', Object.keys(mesh.morphTargetDictionary))
        })
      }
      
      // Create maps of blend shape values with multiple naming formats
      const blendShapeValues = {}
      
      blendShapes.forEach((shape) => {
        const name = shape.categoryName
        const score = shape.score
        
        // Store with original MediaPipe name
        blendShapeValues[name] = score
        
        // Also store with ARKit-style naming (with underscore)
        const arkitName = blendShapeMapping[name]
        if (arkitName) {
          blendShapeValues[arkitName] = score
        }
        
        // Store lowercase version
        blendShapeValues[name.toLowerCase()] = score
        
        // Store without Left/Right suffix variations
        // e.g., eyeBlinkLeft -> eyeBlink_L, eyeBlinkL
        if (name.endsWith('Left')) {
          const base = name.slice(0, -4)
          blendShapeValues[base + '_L'] = score
          blendShapeValues[base + 'L'] = score
        }
        if (name.endsWith('Right')) {
          const base = name.slice(0, -5)
          blendShapeValues[base + '_R'] = score
          blendShapeValues[base + 'R'] = score
        }
      })

      // Apply blend shapes to all morph target meshes
      morphTargetMeshes.forEach((mesh) => {
        Object.keys(mesh.morphTargetDictionary).forEach((targetName) => {
          const targetIndex = mesh.morphTargetDictionary[targetName]
          
          // Try multiple name matching strategies
          let value = 0
          
          // Direct match
          if (blendShapeValues[targetName] !== undefined) {
            value = blendShapeValues[targetName]
          }
          // Lowercase match
          else if (blendShapeValues[targetName.toLowerCase()] !== undefined) {
            value = blendShapeValues[targetName.toLowerCase()]
          }
          // Without underscore
          else {
            const noUnderscore = targetName.replace(/_/g, '')
            if (blendShapeValues[noUnderscore] !== undefined) {
              value = blendShapeValues[noUnderscore]
            } else if (blendShapeValues[noUnderscore.toLowerCase()] !== undefined) {
              value = blendShapeValues[noUnderscore.toLowerCase()]
            }
          }

          // Smooth the transition with faster response
          const currentValue = mesh.morphTargetInfluences[targetIndex]
          const smoothingFactor = 0.6
          mesh.morphTargetInfluences[targetIndex] = 
            currentValue + (value - currentValue) * smoothingFactor
        })
      })
    }
  }

  const handleResize = () => {
    const canvas = canvas3DRef.value
    if (!canvas || !camera || !renderer) return

    const video = videoRef.value
    if (video) {
      const { videoWidth, videoHeight } = video
      if (videoWidth && videoHeight) {
        canvas.width = videoWidth
        canvas.height = videoHeight
        camera.aspect = videoWidth / videoHeight
        camera.updateProjectionMatrix()
        renderer.setSize(videoWidth, videoHeight)
      }
    }
  }

  const toggleVisibility = () => {
    isAvatarVisible.value = !isAvatarVisible.value
  }

  const cleanup = () => {
    if (renderer) {
      renderer.dispose()
      renderer = null
    }

    if (scene) {
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose()
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
      scene.clear()
      scene = null
    }

    morphTargetMeshes = []
    headBone = null
    neckBone = null
    hasLoggedBlendShapes = false
    avatar = null
    camera = null
  }

  onMounted(() => {
    if (canvas3DRef.value) {
      initThreeJS()
    }
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    isModelLoaded,
    modelLoadError,
    isAvatarVisible,
    updateAvatar,
    handleResize,
    toggleVisibility,
  }
}

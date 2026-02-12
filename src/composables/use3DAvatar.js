import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export function use3DAvatar(canvas3DRef, videoRef) {
  // State
  const isModelLoaded = ref(false)
  const isAvatarVisible = ref(false)

  // Three.js objects
  let scene, camera, renderer, avatar
  let morphTargetMeshes = []
  let headBone = null

  // Ready Player Me model URL with ARKit blend shapes enabled
  const MODEL_URL = 'https://models.readyplayer.me/698c2441378169941785f4a6.glb?morphTargets=ARKit&textureAtlas=1024'

  // ========== SETUP ==========
  
  const init = () => {
    const canvas = canvas3DRef.value
    if (!canvas) return

    // Create scene
    scene = new THREE.Scene()

    // Create camera
    camera = new THREE.PerspectiveCamera(35, canvas.clientWidth / canvas.clientHeight, 0.1, 1000)
    camera.position.z = 2.5

    // Create renderer (transparent background)
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(0x000000, 0)

    // Add lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const light = new THREE.DirectionalLight(0xffffff, 0.8)
    light.position.set(1, 1, 1)
    scene.add(light)

    // Load 3D model
    new GLTFLoader().load(MODEL_URL, (gltf) => {
      avatar = gltf.scene
      avatar.scale.setScalar(2.5)

      // Find meshes with blend shapes and head bone
      avatar.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary) {
          morphTargetMeshes.push(child)
        }
        if (child.isBone && child.name.toLowerCase().includes('head') && !child.name.toLowerCase().includes('top')) {
            headBone = child
        }
      })

      avatar.visible = isAvatarVisible.value
      scene.add(avatar)
      isModelLoaded.value = true
    })

    // Start render loop
    const render = () => {
      requestAnimationFrame(render)
      if (isAvatarVisible.value && renderer) {
        renderer.render(scene, camera)
      } else if (renderer) {
        renderer.clear(true, true, true)
      }
    }
    render()
  }

  // ========== UPDATE AVATAR ==========

    const updateAvatar = (landmarks, blendShapes) => {
    if (!avatar || !isModelLoaded.value || !isAvatarVisible.value) return

    // Get key landmarks
    const nose = landmarks[6]         // Nose bridge (stable point)
    const chin = landmarks[152]
    const forehead = landmarks[10]
    const leftCheek = landmarks[234]
    const rightCheek = landmarks[454]
    const leftEye = landmarks[468]
    const rightEye = landmarks[473]
    const noseTip = landmarks[1]

    // Calculate face size and position
    const faceWidth = Math.abs(rightCheek.x - leftCheek.x)
    const faceHeight = Math.abs(chin.y - forehead.y)

    // Scale avatar to match face size
    const scale = faceWidth * 20
    avatar.scale.setScalar(scale)

    // Position avatar to overlay face
    avatar.position.x = -(nose.x - 0.5) * 2
    avatar.position.y = -(nose.y - 0.5) * 2 - scale * 1.6
    avatar.position.z = -1.5

    // Calculate head rotation
    const eyeCenterX = (leftEye.x + rightEye.x) / 2
    const faceCenterY = (forehead.y + chin.y) / 2

    // yaw -> left/right rotation
    // pitch -> head up/down rotation
    // roll -> head tilt left right
      
    const yaw = -((noseTip.x - eyeCenterX) / faceWidth) * Math.PI * 0.8
    const pitch = ((noseTip.y - faceCenterY) / faceHeight) * Math.PI * 0.4
    const roll = -Math.atan((rightEye.y - leftEye.y) / (rightEye.x - leftEye.x))

    // Apply rotation to head bone only
    if (headBone) {
      headBone.rotation.set(pitch * 0.7, yaw * 0.7, roll * 0.5)
    }
    // Apply facial expressions (blend shapes)
    if (blendShapes && morphTargetMeshes.length > 0) {
      // Build lookup of blend shape values 
      const values = {}
      blendShapes.forEach(({ categoryName, score }) => {
        values[categoryName] = score
        // Also store with _L/_R suffix for left/right
        if (categoryName.endsWith('Left')) {
          values[categoryName.slice(0, -4) + '_L'] = score
        }
        if (categoryName.endsWith('Right')) {
          values[categoryName.slice(0, -5) + '_R'] = score
        }
      })
        

      // Apply to each mesh's morph targets
      morphTargetMeshes.forEach((mesh) => {
        const dict = mesh.morphTargetDictionary
        const influences = mesh.morphTargetInfluences
        if (!dict || !influences) return

        Object.keys(dict).forEach((name) => {
          const idx = dict[name]
          // Try to find matching blend shape value
          const value = values[name] || values[name.replace(/_/g, '')] || 0
          // Smooth transition
          influences[idx] += (value - influences[idx]) * 0.6
        })
      })
    }
  }

  // ========== UTILITIES ==========

  const handleResize = () => {
    const video = videoRef.value
    if (!video || !camera || !renderer) return
    
    const { videoWidth, videoHeight } = video
    if (videoWidth && videoHeight) {
      camera.aspect = videoWidth / videoHeight
      camera.updateProjectionMatrix()
      renderer.setSize(videoWidth, videoHeight)
    }
  }

  const toggleVisibility = () => {
    isAvatarVisible.value = !isAvatarVisible.value
    if (avatar) avatar.visible = isAvatarVisible.value
    if (!isAvatarVisible.value && renderer) renderer.clear(true, true, true)
  }

  const setAvatarVisible = (value) => {
    isAvatarVisible.value = Boolean(value)
    if (avatar) avatar.visible = isAvatarVisible.value
    if (!isAvatarVisible.value && renderer) renderer.clear(true, true, true)
  }

  // ========== LIFECYCLE ==========

  onMounted(() => {
    if (canvas3DRef.value) init()
  })

  onUnmounted(() => {
    if (renderer) renderer.dispose()
    if (scene) scene.clear()
  })

  return {
    isModelLoaded,
    isAvatarVisible,
    updateAvatar,
    handleResize,
    toggleVisibility,
    setAvatarVisible,
  }
}

import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import model3davatar from '/model.glb'
import { useArmBone } from './useArmBone'

export function use3DAvatar(canvas3DRef, videoRef) {
  // State
  const isModelLoaded = ref(false)
  const isAvatarVisible = ref(false)

  // Three.js objects
  let scene, camera, renderer, avatar
  let morphTargetMeshes = []
  let headBone = null

  // Arm bone composable
  const { findArmBones, applyAPose, reset: resetArmBones } = useArmBone()

  const MODEL_URL = model3davatar

  const init = () => {
    const canvas = canvas3DRef.value
    if (!canvas) return

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(35, canvas.clientWidth / canvas.clientHeight, 0.1, 1000)
    camera.position.z = 2.5
    renderer = new THREE.WebGLRenderer({ canvas })

    scene.add(new THREE.AmbientLight(0xffffff, 1.4))
    const light = new THREE.DirectionalLight(0xffffff, 1.6)
    light.position.set(1, 1, 1)
    scene.add(light)

    new GLTFLoader().load(MODEL_URL, (gltf) => {
      avatar = gltf.scene
      avatar.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary) morphTargetMeshes.push(child)
        if (child.isBone && child.name.toLowerCase().includes('head') && !child.name.toLowerCase().includes('top')) {
          headBone = child
        }
      })

      findArmBones(avatar)
      applyAPose()

      avatar.visible = isAvatarVisible.value
      scene.add(avatar)
      isModelLoaded.value = true

    })
  }

  const updateAvatar = (landmarks, blendShapes) => {
    if (!landmarks?.length || !avatar || !isModelLoaded.value || !isAvatarVisible.value) return

    const nose = landmarks[6]
    const chin = landmarks[152]
    const forehead = landmarks[10]
    const leftCheek = landmarks[234]
    const rightCheek = landmarks[454]
    const leftEye = landmarks[468]
    const rightEye = landmarks[473]
    const noseTip = landmarks[1]

    const faceWidth = Math.abs(rightCheek.x - leftCheek.x)
    const faceHeight = Math.abs(chin.y - forehead.y)

    const scale = faceWidth * 20
    avatar.scale.setScalar(scale)

    avatar.position.x = -(nose.x - 0.5) * 2
    avatar.position.y = -(nose.y - 0.5) * 2 - scale * 1.71
    avatar.position.z = -1.5

    const eyeCenterX = (leftEye.x + rightEye.x) / 2
    const faceCenterY = (forehead.y + chin.y) / 2

    const yaw = -((noseTip.x - eyeCenterX) / faceWidth) * Math.PI * 0.8
    const pitch2D = ((noseTip.y - faceCenterY) / faceHeight) * Math.PI * 0.7
    const pitchDepth = Math.atan2(chin.z - forehead.z, chin.y - forehead.y)
    const pitch = pitch2D * 0.6 + pitchDepth * 1.0
    const roll = Math.atan((rightEye.y - leftEye.y) / (rightEye.x - leftEye.x))

    if (headBone) headBone.rotation.set(pitch * 0.7, yaw * 0.7, roll * 0.5)

    if (blendShapes && morphTargetMeshes.length > 0) {
      const values = {}
      blendShapes.forEach(({ categoryName, score }) => {
        let mappedName = categoryName
        if (categoryName.endsWith('Left')) mappedName = categoryName.slice(0, -4) + 'Right'
        else if (categoryName.endsWith('Right')) mappedName = categoryName.slice(0, -5) + 'Left'
        values[mappedName] = score
      })

      morphTargetMeshes.forEach((mesh) => {
        if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return
        const dict = mesh.morphTargetDictionary
        const influences = mesh.morphTargetInfluences
        for (const shapeName in dict) {
          const shapeIndex = dict[shapeName]
          const targetValue = values[shapeName] || 0
          const currentValue = influences[shapeIndex]
          influences[shapeIndex] = currentValue + (targetValue - currentValue) * 0.6
        }
      })
    }
    renderer?.render(scene, camera)
  }

  const handleResize = () => {
    const video = videoRef.value
    if (!video || !camera || !renderer) return
    const { videoWidth, videoHeight } = video
    if (videoWidth && videoHeight) {
      camera.aspect = videoWidth / videoHeight
      camera.updateProjectionMatrix()
      renderer.setSize(videoWidth, videoHeight, false)
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

  onMounted(() => {
    if (canvas3DRef.value) init()
  })

  onUnmounted(() => {
    if (renderer) renderer.dispose()
    if (scene) scene.clear()
    resetArmBones()
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

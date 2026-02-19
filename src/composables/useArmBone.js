import { ref } from 'vue'

export function useArmBone() {
  // State
  const leftArmBone = ref(null)
  const rightArmBone = ref(null)

  // Find arm bones in avatar hierarchy
    const findArmBones = (avatar) => {
        avatar.traverse((child) => {
      if (child.isBone) {
        const name = child.name.toLowerCase()
        // Try to find upper arm or shoulder bones
        if (
          (name.includes('leftarm') ||
            name.includes('leftupperarm') ||
            name.includes('left_arm') ||
            name.includes('leftshoulder') ||
            name.includes('left_shoulder') ||
            name === 'leftarm') &&
          !name.includes('forearm') &&
          !name.includes('lower')
        ) {
          leftArmBone.value = child
        }
        if (
          (name.includes('rightarm') ||
            name.includes('rightupperarm') ||
            name.includes('right_arm') ||
            name.includes('rightshoulder') ||
            name.includes('right_shoulder') ||
            name === 'rightarm') &&
          !name.includes('forearm') &&
          !name.includes('lower')
        ) {
          rightArmBone.value = child
        }
      }
    })
  }

  // Apply A-pose: rotate arms on X-axis
  const applyAPose = () => {
    if (leftArmBone.value) {
      leftArmBone.value.rotation.x = Math.PI / 2.5
    }
    if (rightArmBone.value) {
      rightArmBone.value.rotation.x = Math.PI / 2.5
    }
  }

  // Reset arm bones
  const reset = () => {
    leftArmBone.value = null
    rightArmBone.value = null
  }

  return {
    leftArmBone,
    rightArmBone,
    findArmBones,
    applyAPose,
    reset,
  }
}

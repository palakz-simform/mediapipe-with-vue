<template>
  <div class="camera-box">
    <div class="camera-header">
      <h3>Camera Control</h3>
      <button 
        @click="$emit('toggleCamera')" 
        class="camera-toggle-btn"
        :class="{ active: isCameraOn }"
      >
        <span class="camera-icon">{{ isCameraOn ? '🟢' : '⚫' }}</span>
        <span>{{ isCameraOn ? 'Stop Camera' : 'Start Camera' }}</span>
      </button>
    </div>
    <div class="status-tags">
      <div class="status-tag" :class="{ active: isCameraOn }">
        <span class="tag-dot"></span>
        Camera
      </div>
      <div class="status-tag" :class="{ active: faceDetected }">
        <span class="tag-dot"></span>
        Face Detected
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isCameraOn: Boolean,
  faceDetected: Boolean
});
</script>

<style scoped>
.camera-box {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  padding: 20px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  animation: slideInLeft 0.6s ease-out;
}

.camera-box:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.camera-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.camera-header h3 {
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
}

.camera-toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 25px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(8px);
  position: relative;
  overflow: hidden;
}

.camera-toggle-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s ease;
}

.camera-toggle-btn:hover::before {
  left: 100%;
}

.camera-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.camera-toggle-btn.active {
  background: rgba(76, 175, 80, 0.3);
  border-color: #4CAF50;
  box-shadow: 0 0 15px rgba(76, 175, 80, 0.3);
}

.camera-icon {
  font-size: 1.2rem;
  animation: pulse 2s infinite;
}

.status-tags {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.status-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(108, 117, 125, 0.3);
  color: #dee2e6;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.4s ease;
  border: 1px solid rgba(108, 117, 125, 0.4);
  position: relative;
  overflow: hidden;
}

.status-tag::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(40, 167, 69, 0.2), transparent);
  transition: left 0.6s ease;
}

.status-tag.active::before {
  left: 100%;
}

.status-tag.active {
  background: rgba(40, 167, 69, 0.3);
  color: #d4edda;
  border-color: rgba(40, 167, 69, 0.6);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.2);
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6c757d;
  transition: all 0.4s ease;
  position: relative;
}

.tag-dot::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
  border-radius: 50%;
  background: inherit;
  transition: all 0.4s ease;
}

.status-tag.active .tag-dot {
  background: #28a745;
  box-shadow: 0 0 12px rgba(40, 167, 69, 0.8);
  animation: pulseGreen 2s infinite;
}

.status-tag.active .tag-dot::after {
  width: 16px;
  height: 16px;
  opacity: 0.3;
}

@keyframes pulseGreen {
  0%, 100% {
    box-shadow: 0 0 12px rgba(40, 167, 69, 0.8);
  }
  50% {
    box-shadow: 0 0 20px rgba(40, 167, 69, 1);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@media (max-width: 768px) {
  .camera-header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }
  
  .camera-toggle-btn {
    justify-content: center;
  }
  
  .status-tags {
    justify-content: center;
  }
}
</style>

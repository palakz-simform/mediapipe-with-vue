<template>
  <div v-if="show" class="measurements-overlay" @click="$emit('close')">
    <div class="measurements-modal" @click.stop>
      <div class="measurements-header">
        <h3>Face Measurements</h3>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>
      <div class="measurements-content">
        <div class="measurement-group">
          <div class="measurement-row">
            <span class="measurement-label">PD (Total):</span>
            <span class="measurement-value">{{ (detectedPD || 0).toFixed(1) }} mm</span>
          </div>
             <div class="measurement-row">
            <span class="measurement-label">Face Shape:</span>
            <span class="measurement-value">{{ faceShape || 'Analyzing...' }}</span>
          </div>
          <div class="measurement-row">
            <span class="measurement-label">Face Size:</span>
            <span class="measurement-value">{{ faceSize || 'Calculating...' }}</span>
          </div>
          <div class="measurement-row">
            <span class="measurement-label">Face Width:</span>
            <span class="measurement-value">{{ (detectedWidth || 0).toFixed(1) }} mm</span>
          </div>
        </div>
        <div class="measurement-note">
          <p><strong>Note:</strong> Measurements are estimates based on facial landmarks.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: Boolean,
  detectedPD: Number,
  detectedPD_L: Number,
  detectedPD_R: Number,
  faceShape: String,
  faceSize: String,
  detectedWidth: Number
});
</script>

<style scoped>
.measurements-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}
.measurements-modal {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9));
  border-radius: 20px;
  padding: 0;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.measurements-header {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.measurements-header h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
}
.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5rem;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}
.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}
.measurements-content {
  padding: 25px;
  color: #333;
}
.measurement-group {
  margin-bottom: 25px;
}
.measurement-group h4 {
  color: #667eea;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 15px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #667eea;
}
.measurement-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  margin-bottom: 8px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 10px;
  transition: all 0.3s ease;
}
.measurement-row:hover {
  background: rgba(102, 126, 234, 0.15);
  transform: translateX(5px);
}
.measurement-label {
  font-weight: 500;
  color: #555;
}
.measurement-value {
  font-weight: 600;
  color: #667eea;
  background: rgba(102, 126, 234, 0.2);
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 0.9rem;
}
.measurement-note {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 193, 7, 0.05));
  border-left: 4px solid #ffc107;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
}
.measurement-note p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
  line-height: 1.5;
}
</style>

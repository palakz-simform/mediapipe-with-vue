<template>
  <div class="filters-box">
    <h3 class="filters-header">Face Filters</h3>
    <div class="filters-grid">
      <button
        :class="['filter-btn', { active: filters.facemesh }]"
        @click="$emit('toggleFilter', 'facemesh')"
      >
        <div class="filter-icon">🕸️</div>
        <span class="filter-name">Mesh</span>
      </button>
      <button
        :class="['filter-btn', { active: filters.lipstick }]"
        @click="$emit('toggleFilter', 'lipstick')"
      >
        <div class="filter-icon">💄</div>
        <span class="filter-name">Lipstick</span>
      </button>
      <button
        :class="['filter-btn', { active: filters.eyeliner }]"
        @click="$emit('toggleFilter', 'eyeliner')"
      >
        <div class="filter-icon">👁️</div>
        <span class="filter-name">Eyeliner</span>
      </button>
      <button
        :class="['filter-btn', { active: filters.specs }]"
        @click="$emit('toggleFilter', 'specs')"
      >
        <div class="filter-icon">🤓</div>
        <span class="filter-name">Glasses</span>
      </button>
      <button
        :class="['filter-btn', { active: filters.faceMeasurement }]"
        @click="$emit('toggleFilter', 'faceMeasurement')"
      >
        <div class="filter-icon">📏</div>
        <span class="filter-name">Measurements</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  filters: Object
});
</script>

<style scoped>
.filters-box {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  padding: 20px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  animation: slideInLeft 0.8s ease-out;
}

.filters-box:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.filters-header {
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 20px 0;
  text-align: center;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
  position: relative;
}

.filters-header::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 50px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  border-radius: 1px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 12px;
}

.filter-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 15px;
  padding: 14px 8px;
  color: white;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  text-align: center;
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  transform-origin: center;
}

.filter-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.6s ease;
}

.filter-btn:hover::before {
  left: 100%;
}

.filter-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
}

.filter-btn.active {
  background: rgba(76, 175, 80, 0.3);
  border-color: #4CAF50;
  box-shadow: 0 8px 20px rgba(76, 175, 80, 0.4);
  transform: scale(1.05);
}

.filter-btn.active::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(76, 175, 80, 0.2), transparent);
  border-radius: 15px;
  animation: activeGlow 2s infinite;
}

.filter-icon {
  font-size: 1.8rem;
  margin-bottom: 10px;
  display: block;
  transition: all 0.3s ease;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.filter-btn:hover .filter-icon {
  transform: scale(1.1) rotate(5deg);
}

.filter-btn.active .filter-icon {
  animation: bounce 0.6s ease;
  transform: scale(1.15);
}

.filter-name {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  opacity: 0.95;
  transition: all 0.3s ease;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
}

.filter-btn:hover .filter-name {
  opacity: 1;
  transform: translateY(-1px);
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

@keyframes activeGlow {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.6;
  }
}

@keyframes bounce {
  0%, 100% {
    transform: scale(1.15) translateY(0);
  }
  50% {
    transform: scale(1.25) translateY(-5px);
  }
}

@media (max-width: 768px) {
  .filters-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .filter-btn {
    padding: 15px 10px;
  }
  
  .filter-icon {
    font-size: 1.5rem;
    margin-bottom: 8px;
  }
  
  .filter-name {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .filters-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .filter-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 15px;
    text-align: left;
  }
  
  .filter-icon {
    margin-bottom: 0;
    font-size: 1.5rem;
  }
  
  .filter-name {
    font-size: 0.9rem;
  }
}
</style>

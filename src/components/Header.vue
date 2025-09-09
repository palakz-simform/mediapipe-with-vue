<template>
  <div class="header">
    <div class="header-content">
      <div class="logo-section">
        <div class="logo">🎭</div>
        <div class="title-section">
          <h1 class="app-title">Face Filters Studio</h1>
          <p class="app-subtitle">AI-powered real-time face filters and measurements</p>
        </div>
      </div>
      <div class="version-badge">v1.0</div>
    </div>
  </div>
</template>

<style scoped>
.header {
  margin-bottom: 30px;
  color: white;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 15px;
}

.logo {
  font-size: 2.5rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  padding: 10px;
  backdrop-filter: blur(10px);
  animation: pulse 3s infinite;
}

.title-section {
  text-align: left;
}

.app-title {
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0 0 5px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  background: linear-gradient(45deg, #ffffff, #f0f0f0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-subtitle {
  font-size: 1rem;
  margin: 0;
  opacity: 0.9;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);
}

.version-badge {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  backdrop-filter: blur(10px);
  color: white;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .logo-section {
    flex-direction: column;
    gap: 10px;
  }
  
  .title-section {
    text-align: center;
  }
  
  .app-title {
    font-size: 1.8rem;
  }
  
  .app-subtitle {
    font-size: 0.9rem;
  }
  
  .logo {
    font-size: 2rem;
  }
}
</style>

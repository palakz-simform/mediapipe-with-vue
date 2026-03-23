import { ref, computed } from 'vue'
import { useHandTracking } from './useHandTracking'

const GAME_STATE = {
  START: 'start',
  RUNNING: 'running',
  GAME_OVER: 'gameOver',
}

const CANVAS_WIDTH = 900
const CANVAS_HEIGHT = 420
const GROUND_Y = CANVAS_HEIGHT - 60

export function useGame(canvasRef, webcamRef) {
  // ── reactive state exposed to the template ────────────────────────────────
  const gameState = ref(GAME_STATE.START)
  const score = ref(0)
  const handLabel = ref('initializing...')

  const overlayVisible = computed(() => gameState.value !== GAME_STATE.RUNNING)

  const overlayMessage = computed(() => {
    if (gameState.value === GAME_STATE.START) return 'Allow webcam and press Start.'
    if (gameState.value === GAME_STATE.GAME_OVER)
      return `Game Over • Score: ${Math.floor(score.value)}`
    return ''
  })

  const actionBtnText = computed(() =>
    gameState.value === GAME_STATE.START ? 'Start' : 'Restart',
  )

  // ── hand tracking ─────────────────────────────────────────────────────────
  const { init: initHands, detect, getFingerMotion } = useHandTracking(webcamRef)

  // ── mutable game world (not reactive – only canvas needs them) ────────────
  let lastTime = 0
  let scrollX = 0
  let spawnTimer = 0
  let nextSpawnIn = 1.2
  let obstacles = []
  let rafId = null

  const gravity = 1900
  const jumpVelocity = -710
  const obstacleSpeed = 360
  const minSpawnTime = 0.9
  const maxSpawnTime = 1.8

  const player = {
    x: 95,
    y: 0,
    width: 42,
    height: 42,
    vy: 0,
    isGrounded: true,
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  function randomRange(min, max) {
    return Math.random() * (max - min) + min
  }

  function resetWorld() {
    score.value = 0
    scrollX = 0
    spawnTimer = 0
    nextSpawnIn = randomRange(minSpawnTime, maxSpawnTime)
    obstacles = []
    player.vy = 0
    player.y = GROUND_Y - player.height
    player.isGrounded = true
  }

  function jump() {
    player.vy = jumpVelocity
    player.isGrounded = false
  }

  function spawnObstacle() {
    const height = randomRange(35, 85)
    const width = randomRange(26, 42)
    obstacles.push({ x: CANVAS_WIDTH + 20, y: GROUND_Y - height, width, height })
  }

  function checkCollision(p, o) {
    return (
      p.x < o.x + o.width &&
      p.x + p.width > o.x &&
      p.y < o.y + o.height &&
      p.y + p.height > o.y
    )
  }

  // ── per-frame update ──────────────────────────────────────────────────────
  function processHandInput() {
    detect()
    const motion = getFingerMotion()

    if (!motion.ready) {
      handLabel.value = 'initializing...'
      return
    }
    if (!motion.hasHand) {
      handLabel.value = 'no hand'
      return
    }

    handLabel.value = 'detected'
    const deltaY = motion.prevY - motion.currentY
    if (deltaY > 0.02 && player.isGrounded) jump()
  }

  function update(dt) {
    if (gameState.value !== GAME_STATE.RUNNING) return

    processHandInput()

    scrollX += 220 * dt
    score.value += 10 * dt

    player.vy += gravity * dt
    player.y += player.vy * dt

    const groundTop = GROUND_Y - player.height
    if (player.y >= groundTop) {
      player.y = groundTop
      player.vy = 0
      player.isGrounded = true
    } else {
      player.isGrounded = false
    }

    spawnTimer += dt
    if (spawnTimer >= nextSpawnIn) {
      spawnObstacle()
      spawnTimer = 0
      nextSpawnIn = randomRange(minSpawnTime, maxSpawnTime)
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const ob = obstacles[i]
      ob.x -= obstacleSpeed * dt

      if (checkCollision(player, ob)) {
        gameState.value = GAME_STATE.GAME_OVER
        return
      }

      if (ob.x + ob.width < -10) obstacles.splice(i, 1)
    }
  }

  // ── rendering ─────────────────────────────────────────────────────────────
  function renderGround(ctx) {
    const stripeWidth = 40
    const offset = -(scrollX % stripeWidth)

    ctx.fillStyle = '#334155'
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y)

    ctx.fillStyle = '#475569'
    for (let x = offset; x < CANVAS_WIDTH; x += stripeWidth) {
      ctx.fillRect(x, GROUND_Y + 20, stripeWidth / 2, 8)
    }
  }

  function render() {
    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    renderGround(ctx)

    // player
    ctx.fillStyle = '#38bdf8'
    ctx.fillRect(player.x, player.y, player.width, player.height)

    // obstacles
    ctx.fillStyle = '#f87171'
    for (const ob of obstacles) ctx.fillRect(ob.x, ob.y, ob.width, ob.height)

    if (gameState.value === GAME_STATE.START) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.9)'
      ctx.font = '20px Arial'
      ctx.fillText('Start the game to run', CANVAS_WIDTH / 2 - 95, 70)
    }

    if (gameState.value === GAME_STATE.GAME_OVER) {
      ctx.fillStyle = 'rgba(248, 113, 113, 0.95)'
      ctx.font = '28px Arial'
      ctx.fillText('Game Over', CANVAS_WIDTH / 2 - 72, 72)
    }
  }

  // ── game loop ─────────────────────────────────────────────────────────────
  function loop(timestamp) {
    if (!lastTime) lastTime = timestamp
    const dt = Math.min((timestamp - lastTime) / 1000, 0.033)
    lastTime = timestamp

    update(dt)
    render()

    rafId = requestAnimationFrame(loop)
  }

  // ── public API ────────────────────────────────────────────────────────────
  function startRun() {
    resetWorld()
    gameState.value = GAME_STATE.RUNNING
  }

  function onActionClick() {
    if (
      gameState.value === GAME_STATE.START ||
      gameState.value === GAME_STATE.GAME_OVER
    ) {
      startRun()
    }
  }

  async function setup() {
    resetWorld()
    gameState.value = GAME_STATE.START
    try {
      await initHands()
      handLabel.value = 'ready'
    } catch (err) {
      console.error(err)
      handLabel.value = 'camera blocked'
    }
    rafId = requestAnimationFrame(loop)
  }

  function teardown() {
    if (rafId) cancelAnimationFrame(rafId)
  }

  return {
    gameState,
    score,
    handLabel,
    overlayVisible,
    overlayMessage,
    actionBtnText,
    GAME_STATE,
    setup,
    teardown,
    onActionClick,
  }
}

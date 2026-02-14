import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

const GRAVITY = 0.3
const JUMP_HEIGHT = -6
const PIPE_SPEED = 2.5
const PIPE_SPAWN_RATE = 1800 // ms
const PIPE_WIDTH = 60
const BIRD_SIZE = 60
const GAP_SIZE = 240

interface PipeData {
  id: number
  x: number
  topHeight: number
  passed: boolean
}

function App() {
  const [gameDimensions, setGameDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })
  const [birdPos, setBirdPos] = useState({ x: 50, y: 250 })
  const [birdVelocity, setBirdVelocity] = useState(0)
  const [pipes, setPipes] = useState<PipeData[]>([])
  const [score, setScore] = useState(0)
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAME_OVER'>('START')
  const [showValentine, setShowValentine] = useState(false)

  const gameLoopRef = useRef<number | null>(null)
  const lastPipeSpawnRef = useRef<number>(0)

  useEffect(() => {
    const handleResize = () => {
      setGameDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const startGame = () => {
    setBirdPos({ x: 50, y: gameDimensions.height / 2 })
    setBirdVelocity(0)
    setPipes([])
    setScore(0)
    setGameState('PLAYING')
    setShowValentine(false)
    lastPipeSpawnRef.current = performance.now()
  }

  const jump = useCallback(() => {
    if (gameState === 'PLAYING') {
      setBirdVelocity(JUMP_HEIGHT)
    } else if (gameState === 'START' || gameState === 'GAME_OVER') {
      startGame()
    }
  }, [gameState])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        jump()
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [jump])

  const update = useCallback((time: number) => {
    if (gameState !== 'PLAYING') return

    setBirdPos(prev => {
      const newY = prev.y + birdVelocity

      // Collision with floor or ceiling
      if (newY < 0 || newY > gameDimensions.height - BIRD_SIZE) {
        setGameState('GAME_OVER')
        return prev
      }
      return { ...prev, y: newY }
    })

    setBirdVelocity(v => v + GRAVITY)

    // Spawn pipes
    if (time - lastPipeSpawnRef.current > PIPE_SPAWN_RATE) {
      const minPipeHeight = 50
      const maxPipeHeight = gameDimensions.height - GAP_SIZE - minPipeHeight
      const topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight

      setPipes(prev => [
        ...prev,
        { id: Date.now(), x: gameDimensions.width, topHeight, passed: false }
      ])
      lastPipeSpawnRef.current = time
    }

    // Update pipes
    setPipes(prev => {
      const updated = prev
        .map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED }))
        .filter(pipe => pipe.x + PIPE_WIDTH > 0)

      // Score and Collision
      updated.forEach(pipe => {
        // Collision detection
        const birdRect = { left: 50, right: 50 + BIRD_SIZE, top: birdPos.y, bottom: birdPos.y + BIRD_SIZE }
        const pipeRectTop = { left: pipe.x, right: pipe.x + PIPE_WIDTH, top: 0, bottom: pipe.topHeight }
        const pipeRectBottom = { left: pipe.x, right: pipe.x + PIPE_WIDTH, top: pipe.topHeight + GAP_SIZE, bottom: gameDimensions.height }

        if (
          (birdRect.right > pipeRectTop.left && birdRect.left < pipeRectTop.right && birdRect.top < pipeRectTop.bottom) ||
          (birdRect.right > pipeRectBottom.left && birdRect.left < pipeRectBottom.right && birdRect.bottom > pipeRectBottom.top)
        ) {
          setGameState('GAME_OVER')
        }

        // Increment score
        if (!pipe.passed && pipe.x < 50) {
          pipe.passed = true
          setScore(s => {
            const newScore = s + 1
            if (newScore === 5) {
              setShowValentine(true)
            }
            return newScore
          })
        }
      })

      return updated
    })

    gameLoopRef.current = requestAnimationFrame(update)
  }, [gameState, birdVelocity, birdPos.y, gameDimensions])

  useEffect(() => {
    if (gameState === 'PLAYING') {
      gameLoopRef.current = requestAnimationFrame(update)
    } else {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
    }
  }, [gameState, update])

  return (
    <div className="game-container" onClick={jump}>
      <div className="score">{score}</div>

      <img
        src="/Subject.png"
        className="bird"
        style={{
          top: birdPos.y,
          left: birdPos.x,
          transform: `rotate(${Math.min(performance.now() * 0.1, birdVelocity * 3)}deg)`,
          width: BIRD_SIZE,
          height: BIRD_SIZE,
          objectFit: 'contain'
        }}
        alt="Bird"
      />

      {pipes.map(pipe => (
        <div key={pipe.id}>
          {/* Top Pipe */}
          <div
            className="pipe"
            style={{
              left: pipe.x,
              top: 0,
              height: pipe.topHeight,
              borderBottomLeftRadius: '8px',
              borderBottomRightRadius: '8px'
            }}
          />
          {/* Bottom Pipe */}
          <div
            className="pipe"
            style={{
              left: pipe.x,
              top: pipe.topHeight + GAP_SIZE,
              height: gameDimensions.height - pipe.topHeight - GAP_SIZE,
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px'
            }}
          />
        </div>
      ))}

      {gameState === 'START' && (
        <div className="start-screen">
          <h1>Flappy Pombo</h1>
          <div className="instructions">Clica o pulsa Espacio para saltar</div>
        </div>
      )}

      {gameState === 'GAME_OVER' && (
        <div className="game-over">
          <h2>¡Game Over!</h2>
          <p>Puntaje: {score}</p>
          <button onClick={(e) => { e.stopPropagation(); startGame(); }}>Reintentar</button>
        </div>
      )}

      {showValentine && (
        <div className="valentine-overlay" onClick={(e) => { e.stopPropagation(); setShowValentine(false); }}>
          <div className="valentine-content">
            <div className="hearts">❤️❤️❤️</div>
            <h2>Will you be my Valentine?</h2>
            <div className="hearts">❤️❤️❤️</div>
            <button onClick={() => setShowValentine(false)}>Continuar jugando</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

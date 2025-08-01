import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCw, ArrowDown, ArrowLeft, ArrowRight, RefreshCw, Volume2, VolumeX, Settings, Trophy } from 'lucide-react';

// Types of Tetris pieces with better color contrast
const TETROMINOS = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: 'bg-cyan-500'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: 'bg-yellow-500'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 'bg-purple-500'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: 'bg-green-500'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: 'bg-red-500'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 'bg-blue-500'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 'bg-orange-500'
  }
};

// Tetris statistics
type TetrisStats = {
  [key in keyof typeof TETROMINOS]: number;
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const LEVEL_SPEED_INCREASE = 0.9; // Speed increases by 10% each level
const BASE_DROP_TIME = 1000;

interface Piece {
  shape: number[][];
  color: string;
  x: number;
  y: number;
  type: keyof typeof TETROMINOS;
}

interface GameState {
  board: (string | null)[][];
  currentPiece: Piece | null;
  nextPiece: Piece | null;
  score: number;
  level: number;
  lines: number;
  isPlaying: boolean;
  isPaused: boolean;
  gameOver: boolean;
  stats: TetrisStats;
  highScore: number;
}

// Sound effects
const playSound = (type: 'move' | 'rotate' | 'clear' | 'gameover' | 'levelup') => {
  if (typeof window !== 'undefined') {
    const sounds = {
      move: new Audio('/sounds/move.mp3'),
      rotate: new Audio('/sounds/rotate.mp3'),
      clear: new Audio('/sounds/clear.mp3'),
      gameover: new Audio('/sounds/gameover.mp3'),
      levelup: new Audio('/sounds/levelup.mp3')
    };
    sounds[type].volume = 0.3;
    sounds[type].play().catch(e => console.log('Audio play failed:', e));
  }
};

const createEmptyBoard = (): (string | null)[][] => {
  return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null));
};

const getRandomPiece = (): Piece => {
  const types = Object.keys(TETROMINOS) as (keyof typeof TETROMINOS)[];
  const type = types[Math.floor(Math.random() * types.length)];
  const tetromino = TETROMINOS[type];
  
  return {
    shape: tetromino.shape,
    color: tetromino.color,
    x: Math.floor(BOARD_WIDTH / 2) - Math.floor(tetromino.shape[0].length / 2),
    y: 0,
    type
  };
};

const rotatePiece = (piece: Piece): Piece => {
  const rotated = piece.shape[0].map((_, index) =>
    piece.shape.map(row => row[index]).reverse()
  );
  return { ...piece, shape: rotated };
};

const isValidPosition = (piece: Piece, board: (string | null)[][]): boolean => {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x] === 1) {
        const newX = piece.x + x;
        const newY = piece.y + y;
        
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
          return false;
        }
        
        if (newY >= 0 && board[newY][newX] !== null) {
          return false;
        }
      }
    }
  }
  return true;
};

const placePiece = (piece: Piece, board: (string | null)[][]): (string | null)[][] => {
  const newBoard = board.map(row => [...row]);
  
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x] === 1) {
        const boardY = piece.y + y;
        const boardX = piece.x + x;
        if (boardY >= 0) {
          newBoard[boardY][boardX] = piece.color;
        }
      }
    }
  }
  
  return newBoard;
};

const clearLines = (board: (string | null)[][]): { newBoard: (string | null)[][], linesCleared: number } => {
  let linesCleared = 0;
  const newBoard = board.filter(row => {
    const isFull = row.every(cell => cell !== null);
    if (isFull) linesCleared++;
    return !isFull;
  });
  
  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(null));
  }
  
  return { newBoard, linesCleared };
};

const TetrisGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    board: createEmptyBoard(),
    currentPiece: null,
    nextPiece: null,
    score: 0,
    level: 1,
    lines: 0,
    isPlaying: false,
    isPaused: false,
    gameOver: false,
    stats: {
      I: 0,
      O: 0,
      T: 0,
      S: 0,
      Z: 0,
      J: 0,
      L: 0
    },
    highScore: typeof window !== 'undefined' ? parseInt(localStorage.getItem('tetrisHighScore') || '0') : 0
  });

  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [ghostPieceEnabled, setGhostPieceEnabled] = useState(true);
  const [gridSize, setGridSize] = useState<'small' | 'medium' | 'large'>('medium');

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const dropTimeRef = useRef<number>(BASE_DROP_TIME);
  const lastMoveTimeRef = useRef<number>(0);
  const moveRepeatDelay = 100; // Delay for repeated key presses

  const startGame = useCallback(() => {
    const currentPiece = getRandomPiece();
    const nextPiece = getRandomPiece();
    
    setGameState(prev => ({
      board: createEmptyBoard(),
      currentPiece,
      nextPiece,
      score: 0,
      level: 1,
      lines: 0,
      isPlaying: true,
      isPaused: false,
      gameOver: false,
      stats: {
        I: 0,
        O: 0,
        T: 0,
        S: 0,
        Z: 0,
        J: 0,
        L: 0
      },
      highScore: prev.highScore
    }));
  }, []);

  const pauseGame = useCallback(() => {
    setGameState(prev => {
      if (!prev.isPlaying) return prev;
      return { ...prev, isPaused: !prev.isPaused };
    });
  }, []);

  const resetGame = useCallback(() => {
    setGameState(prev => ({
      board: createEmptyBoard(),
      currentPiece: null,
      nextPiece: null,
      score: 0,
      level: 1,
      lines: 0,
      isPlaying: false,
      isPaused: false,
      gameOver: false,
      stats: {
        I: 0,
        O: 0,
        T: 0,
        S: 0,
        Z: 0,
        J: 0,
        L: 0
      },
      highScore: prev.highScore
    }));
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
  }, []);

  const movePiece = useCallback((direction: 'left' | 'right' | 'down' | 'drop') => {
    const now = Date.now();
    if (now - lastMoveTimeRef.current < moveRepeatDelay) return;
    lastMoveTimeRef.current = now;

    setGameState(prev => {
      if (!prev.currentPiece || prev.isPaused || prev.gameOver) return prev;
      
      if (direction === 'drop') {
        // Hard drop - move piece all the way down
        let newPiece = { ...prev.currentPiece };
        while (isValidPosition({ ...newPiece, y: newPiece.y + 1 }, prev.board)) {
          newPiece.y += 1;
        }
        
        // Place the piece
        const newBoard = placePiece(newPiece, prev.board);
        const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
        
        // Calculate score - bonus for hard drop
        const dropHeight = newPiece.y - prev.currentPiece.y;
        const newScore = prev.score + 
          (linesCleared * 100 * prev.level) + 
          (dropHeight * 2) + // Bonus for hard drop
          10; // Small bonus for placing a piece
        
        const newLines = prev.lines + linesCleared;
        const newLevel = Math.floor(newLines / 10) + 1;
        
        // Update stats
        const newStats = { ...prev.stats };
        newStats[prev.currentPiece.type] += 1;
        
        const nextCurrentPiece = prev.nextPiece;
        const nextNextPiece = getRandomPiece();
        
        // Check for game over
        if (!isValidPosition(nextCurrentPiece!, clearedBoard)) {
          const newHighScore = Math.max(prev.score, prev.highScore);
          if (typeof window !== 'undefined') {
            localStorage.setItem('tetrisHighScore', newHighScore.toString());
            if (!isMuted) playSound('gameover');
          }
          
          return {
            ...prev,
            board: clearedBoard,
            gameOver: true,
            isPlaying: false,
            score: newScore,
            highScore: newHighScore,
            stats: newStats
          };
        }
        
        if (linesCleared > 0 && !isMuted) playSound('clear');
        if (newLevel > prev.level && !isMuted) playSound('levelup');
        
        return {
          ...prev,
          board: clearedBoard,
          currentPiece: nextCurrentPiece,
          nextPiece: nextNextPiece,
          score: newScore,
          level: newLevel,
          lines: newLines,
          stats: newStats
        };
      }
      
      // Regular movement
      const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
      const dy = direction === 'down' ? 1 : 0;
      
      const newPiece = {
        ...prev.currentPiece,
        x: prev.currentPiece.x + dx,
        y: prev.currentPiece.y + dy
      };

      if (isValidPosition(newPiece, prev.board)) {
        if (!isMuted && (dx !== 0 || dy !== 0)) playSound('move');
        return { ...prev, currentPiece: newPiece };
      } else if (direction === 'down') {
        // Piece can't move down anymore - place it
        const newBoard = placePiece(prev.currentPiece, prev.board);
        const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
        
        const newScore = prev.score + (linesCleared * 100 * prev.level) + 10;
        const newLines = prev.lines + linesCleared;
        const newLevel = Math.floor(newLines / 10) + 1;
        
        // Update stats
        const newStats = { ...prev.stats };
        newStats[prev.currentPiece.type] += 1;
        
        const nextCurrentPiece = prev.nextPiece;
        const nextNextPiece = getRandomPiece();
        
        // Check for game over
        if (!isValidPosition(nextCurrentPiece!, clearedBoard)) {
          const newHighScore = Math.max(prev.score, prev.highScore);
          if (typeof window !== 'undefined') {
            localStorage.setItem('tetrisHighScore', newHighScore.toString());
            if (!isMuted) playSound('gameover');
          }
          
          return {
            ...prev,
            board: clearedBoard,
            gameOver: true,
            isPlaying: false,
            score: newScore,
            highScore: newHighScore,
            stats: newStats
          };
        }
        
        if (linesCleared > 0 && !isMuted) playSound('clear');
        if (newLevel > prev.level && !isMuted) playSound('levelup');
        
        return {
          ...prev,
          board: clearedBoard,
          currentPiece: nextCurrentPiece,
          nextPiece: nextNextPiece,
          score: newScore,
          level: newLevel,
          lines: newLines,
          stats: newStats
        };
      }
      
      return prev;
    });
  }, [isMuted]);

  const rotatePieceHandler = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.isPaused || prev.gameOver) return prev;
      
      const rotatedPiece = rotatePiece(prev.currentPiece);
      
      // Try wall kicks if rotation doesn't fit
      const kicks = [
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: -2, y: 0 },
        { x: 2, y: 0 }
      ];
      
      for (const kick of kicks) {
        const kickedPiece = {
          ...rotatedPiece,
          x: rotatedPiece.x + kick.x,
          y: rotatedPiece.y + kick.y
        };
        
        if (isValidPosition(kickedPiece, prev.board)) {
          if (!isMuted) playSound('rotate');
          return { ...prev, currentPiece: kickedPiece };
        }
      }
      
      return prev;
    });
  }, [isMuted]);

  const dropPiece = useCallback(() => {
    movePiece('down');
  }, [movePiece]);

  const hardDrop = useCallback(() => {
    movePiece('drop');
  }, [movePiece]);

  // Calculate ghost piece position
  const getGhostPiece = useCallback((piece: Piece | null, board: (string | null)[][]) => {
    if (!piece || !ghostPieceEnabled) return null;
    
    let ghostY = piece.y;
    while (isValidPosition({ ...piece, y: ghostY + 1 }, board)) {
      ghostY++;
    }
    
    return { ...piece, y: ghostY };
  }, [ghostPieceEnabled]);

  // Game loop
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused && !gameState.gameOver) {
      dropTimeRef.current = Math.max(100, BASE_DROP_TIME * Math.pow(LEVEL_SPEED_INCREASE, gameState.level - 1));
      gameLoopRef.current = setInterval(dropPiece, dropTimeRef.current);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.isPaused, gameState.gameOver, gameState.level, dropPiece]);

  // Keyboard controls with better handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameState.isPlaying || gameState.gameOver) return;
      
      // Prevent default for game controls to avoid page scrolling
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space', 'KeyP'].includes(e.code)) {
        e.preventDefault();
      }

      const now = Date.now();
      
      switch (e.code) {
        case 'ArrowLeft':
          if (now - lastMoveTimeRef.current >= moveRepeatDelay) {
            movePiece('left');
          }
          break;
        case 'ArrowRight':
          if (now - lastMoveTimeRef.current >= moveRepeatDelay) {
            movePiece('right');
          }
          break;
        case 'ArrowDown':
          movePiece('down');
          break;
        case 'ArrowUp':
        case 'Space':
          rotatePieceHandler();
          break;
        case 'KeyD':
          hardDrop();
          break;
        case 'KeyP':
          pauseGame();
          break;
        case 'KeyM':
          setIsMuted(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState.isPlaying, gameState.gameOver, movePiece, rotatePieceHandler, pauseGame, hardDrop]);

  // Render the board with current piece and ghost piece
  const renderBoard = () => {
    const boardWithPiece = gameState.board.map(row => [...row]);
    const ghostPiece = getGhostPiece(gameState.currentPiece, gameState.board);
    
    // First draw the ghost piece if enabled
    if (ghostPiece) {
      for (let y = 0; y < ghostPiece.shape.length; y++) {
        for (let x = 0; x < ghostPiece.shape[y].length; x++) {
          if (ghostPiece.shape[y][x] === 1) {
            const boardY = ghostPiece.y + y;
            const boardX = ghostPiece.x + x;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              boardWithPiece[boardY][boardX] = 'bg-gray-500 opacity-30';
            }
          }
        }
      }
    }
    
    // Then draw the current piece on top
    if (gameState.currentPiece) {
      for (let y = 0; y < gameState.currentPiece.shape.length; y++) {
        for (let x = 0; x < gameState.currentPiece.shape[y].length; x++) {
          if (gameState.currentPiece.shape[y][x] === 1) {
            const boardY = gameState.currentPiece.y + y;
            const boardX = gameState.currentPiece.x + x;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              boardWithPiece[boardY][boardX] = gameState.currentPiece.color;
            }
          }
        }
      }
    }
    
    return boardWithPiece;
  };

  const board = renderBoard();
  const cellSize = gridSize === 'small' ? 'w-4 h-4' : gridSize === 'medium' ? 'w-6 h-6' : 'w-8 h-8';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4 flex items-center justify-center">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left panel - Controls and info */}
        <div className="space-y-6">
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Controles</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsMuted(prev => !prev)}
                  className="text-white/70 hover:text-white transition-colors"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <button
                  onClick={() => setShowSettings(prev => !prev)}
                  className="text-white/70 hover:text-white transition-colors"
                  aria-label="Settings"
                >
                  <Settings size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {!gameState.isPlaying ? (
                <button
                  onClick={startGame}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                  <Play size={20} />
                  Iniciar Jogo
                </button>
              ) : (
                <button
                  onClick={pauseGame}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                  <Pause size={20} />
                  {gameState.isPaused ? 'Continuar' : 'Pausar'}
                </button>
              )}
              
              <button
                onClick={resetGame}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors active:scale-95"
              >
                <RefreshCw size={20} />
                Reiniciar
              </button>
            </div>

            {showSettings && (
              <div className="mt-6 pt-4 border-t border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">Configurações</h3>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center justify-between text-white/80">
                      <span>Peça fantasma</span>
                      <input
                        type="checkbox"
                        checked={ghostPieceEnabled}
                        onChange={() => setGhostPieceEnabled(prev => !prev)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-white/80 mb-2">Tamanho da grade</label>
                    <div className="flex gap-2">
                      {(['small', 'medium', 'large'] as const).map(size => (
                        <button
                          key={size}
                          onClick={() => setGridSize(size)}
                          className={`px-3 py-1 rounded-md text-sm ${
                            gridSize === size 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-gray-700 text-white/80 hover:bg-gray-600'
                          }`}
                        >
                          {size === 'small' ? 'Pequeno' : size === 'medium' ? 'Médio' : 'Grande'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Como Jogar</h3>
            <div className="text-sm text-white/80 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <ArrowLeft size={16} />
                  <ArrowRight size={16} />
                </div>
                <span>Mover peça</span>
              </div>
              <div className="flex items-center gap-3">
                <ArrowDown size={16} />
                <span>Acelerar queda</span>
              </div>
              <div className="flex items-center gap-3">
                <RotateCw size={16} />
                <span>Rotacionar (↑ ou Espaço)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-white/20 px-2 py-1 rounded">D</span>
                <span>Queda rápida</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-white/20 px-2 py-1 rounded">P</span>
                <span>Pausar</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs bg-white/20 px-2 py-1 rounded">M</span>
                <span>Silenciar</span>
              </div>
            </div>
          </div>

          {/* Mobile controls */}
          <div className="lg:hidden bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">Controles Mobile</h3>
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              <div></div>
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  rotatePieceHandler();
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg flex items-center justify-center transition-colors active:scale-95"
              >
                <RotateCw size={24} />
              </button>
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  hardDrop();
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-lg flex items-center justify-center transition-colors active:scale-95"
              >
                <ArrowDown size={24} />
              </button>
              
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  movePiece('left');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex items-center justify-center transition-colors active:scale-95"
              >
                <ArrowLeft size={24} />
              </button>
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  movePiece('down');
                }}
                className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg flex items-center justify-center transition-colors active:scale-95"
              >
                <ArrowDown size={24} />
              </button>
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  movePiece('right');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex items-center justify-center transition-colors active:scale-95"
              >
                <ArrowRight size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Game board */}
        <div className="flex justify-center">
          <div className="relative bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl shadow-lg">
            <div 
              className={`grid gap-px bg-gray-700 p-2 rounded-lg ${
                gridSize === 'small' ? 'border-2' : gridSize === 'medium' ? 'border-4' : 'border-4'
              } border-gray-600`}
              style={{
                gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
                gridTemplateRows: `repeat(${BOARD_HEIGHT}, 1fr)`
              }}
            >
              {board.map((row, y) =>
                row.map((cell, x) => (
                  <div
                    key={`${y}-${x}`}
                    className={`${cellSize} border border-gray-700 ${
                      cell ? cell : 'bg-gray-900'
                    } transition-colors duration-75`}
                  />
                ))
              )}
            </div>
            
            {gameState.gameOver && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-xl">
                <div className="bg-gray-800/90 backdrop-blur-sm p-6 rounded-xl text-center max-w-xs">
                  <h2 className="text-2xl font-bold text-white mb-2">Game Over!</h2>
                  <p className="text-white/80 mb-4">Pontuação: {gameState.score.toLocaleString()}</p>
                  {gameState.score >= gameState.highScore && (
                    <div className="flex items-center justify-center gap-2 text-yellow-400 mb-4">
                      <Trophy size={20} />
                      <span>Novo recorde!</span>
                    </div>
                  )}
                  <button
                    onClick={startGame}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors active:scale-95"
                  >
                    Jogar Novamente
                  </button>
                </div>
              </div>
            )}
            
            {gameState.isPaused && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-xl">
                <div className="bg-gray-800/90 backdrop-blur-sm p-6 rounded-xl text-center">
                  <h2 className="text-2xl font-bold text-white">Pausado</h2>
                  <p className="text-white/80 mt-2">Pressione P para continuar</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel - Stats and next piece */}
        <div className="space-y-6">
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-4">Estatísticas</h2>
            <div className="space-y-4 text-white">
              <div className="flex justify-between">
                <span>Pontuação:</span>
                <span className="font-bold">{gameState.score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Recorde:</span>
                <span className="font-bold">{gameState.highScore.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Nível:</span>
                <span className="font-bold">{gameState.level}</span>
              </div>
              <div className="flex justify-between">
                <span>Linhas:</span>
                <span className="font-bold">{gameState.lines}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Próxima Peça</h3>
            <div className="bg-gray-900/50 rounded-lg p-4 flex justify-center">
              {gameState.nextPiece && (
                <div 
                  className="grid gap-px"
                  style={{
                    gridTemplateColumns: `repeat(${gameState.nextPiece.shape[0].length}, 1fr)`
                  }}
                >
                  {gameState.nextPiece.shape.map((row, y) =>
                    row.map((cell, x) => (
                      <div
                        key={`next-${y}-${x}`}
                        className={`${cellSize} ${
                          cell ? gameState.nextPiece!.color : 'bg-transparent'
                        }`}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Estatísticas de Peças</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(Object.keys(TETROMINOS) as (keyof typeof TETROMINOS)[]).map(type => (
                <div key={type} className="flex items-center gap-2">
                  <div className={`w-4 h-4 ${TETROMINOS[type].color}`} />
                  <span className="text-white/80">{type}:</span>
                  <span className="font-bold text-white">{gameState.stats[type]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TetrisGame;
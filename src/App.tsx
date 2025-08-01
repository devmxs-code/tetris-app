import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCw, ArrowDown, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';

// Tipos de peças do Tetris
const TETROMINOS = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: 'bg-cyan-400'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: 'bg-yellow-400'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 'bg-purple-400'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: 'bg-green-400'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: 'bg-red-400'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 'bg-blue-400'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 'bg-orange-400'
  }
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

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
}

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
    gameOver: false
  });

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const dropTimeRef = useRef<number>(1000);

  const startGame = useCallback(() => {
    const currentPiece = getRandomPiece();
    const nextPiece = getRandomPiece();
    
    setGameState({
      board: createEmptyBoard(),
      currentPiece,
      nextPiece,
      score: 0,
      level: 1,
      lines: 0,
      isPlaying: true,
      isPaused: false,
      gameOver: false
    });
  }, []);

  const pauseGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  const resetGame = useCallback(() => {
    setGameState({
      board: createEmptyBoard(),
      currentPiece: null,
      nextPiece: null,
      score: 0,
      level: 1,
      lines: 0,
      isPlaying: false,
      isPaused: false,
      gameOver: false
    });
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
  }, []);

  const movePiece = useCallback((direction: 'left' | 'right' | 'down') => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.isPaused || prev.gameOver) return prev;
      
      const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
      const dy = direction === 'down' ? 1 : 0;
      
      const newPiece = {
        ...prev.currentPiece,
        x: prev.currentPiece.x + dx,
        y: prev.currentPiece.y + dy
      };

      if (isValidPosition(newPiece, prev.board)) {
        return { ...prev, currentPiece: newPiece };
      } else if (direction === 'down') {
        // Peça não pode descer mais, fixar no tabuleiro
        const newBoard = placePiece(prev.currentPiece, prev.board);
        const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
        
        const newScore = prev.score + (linesCleared * 100 * prev.level) + 10;
        const newLines = prev.lines + linesCleared;
        const newLevel = Math.floor(newLines / 10) + 1;
        
        const nextCurrentPiece = prev.nextPiece;
        const nextNextPiece = getRandomPiece();
        
        // Verificar game over
        if (!isValidPosition(nextCurrentPiece!, clearedBoard)) {
          return {
            ...prev,
            board: clearedBoard,
            gameOver: true,
            isPlaying: false,
            score: newScore
          };
        }
        
        return {
          ...prev,
          board: clearedBoard,
          currentPiece: nextCurrentPiece,
          nextPiece: nextNextPiece,
          score: newScore,
          level: newLevel,
          lines: newLines
        };
      }
      
      return prev;
    });
  }, []);

  const rotatePieceHandler = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.isPaused || prev.gameOver) return prev;
      
      const rotatedPiece = rotatePiece(prev.currentPiece);
      
      if (isValidPosition(rotatedPiece, prev.board)) {
        return { ...prev, currentPiece: rotatedPiece };
      }
      
      return prev;
    });
  }, []);

  const dropPiece = useCallback(() => {
    movePiece('down');
  }, [movePiece]);

  // Game loop
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused && !gameState.gameOver) {
      dropTimeRef.current = Math.max(100, 1000 - (gameState.level - 1) * 100);
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

  // Controles do teclado
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      e.preventDefault();
      
      switch (e.code) {
        case 'ArrowLeft':
          movePiece('left');
          break;
        case 'ArrowRight':
          movePiece('right');
          break;
        case 'ArrowDown':
          movePiece('down');
          break;
        case 'ArrowUp':
        case 'Space':
          rotatePieceHandler();
          break;
        case 'KeyP':
          if (gameState.isPlaying) pauseGame();
          break;
      }
    };

    if (gameState.isPlaying) {
      window.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameState.isPlaying, movePiece, rotatePieceHandler, pauseGame]);

  // Renderizar o tabuleiro com a peça atual
  const renderBoard = () => {
    const boardWithPiece = gameState.board.map(row => [...row]);
    
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-blue-900 p-4 flex items-center justify-center">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Painel de controles */}
        <div className="space-y-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Controles</h2>
            <div className="space-y-4">
              {!gameState.isPlaying ? (
                <button
                  onClick={startGame}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Play size={20} />
                  Iniciar Jogo
                </button>
              ) : (
                <button
                  onClick={pauseGame}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Pause size={20} />
                  {gameState.isPaused ? 'Continuar' : 'Pausar'}
                </button>
              )}
              
              <button
                onClick={resetGame}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw size={20} />
                Reiniciar
              </button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4">Como Jogar</h3>
            <div className="text-sm text-white/80 space-y-2">
              <div className="flex items-center gap-2">
                <ArrowLeft size={16} />
                <ArrowRight size={16} />
                <span>Mover peça</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowDown size={16} />
                <span>Acelerar queda</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCw size={16} />
                <span>Rotacionar (↑ ou Espaço)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-white/20 px-1 rounded">P</span>
                <span>Pausar</span>
              </div>
            </div>
          </div>

          {/* Controles mobile */}
          <div className="lg:hidden bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-4 text-center">Controles Mobile</h3>
            <div className="grid grid-cols-3 gap-2 max-w-48 mx-auto">
              <div></div>
              <button
                onTouchStart={() => rotatePieceHandler()}
                className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-lg flex items-center justify-center transition-colors active:scale-95"
              >
                <RotateCw size={20} />
              </button>
              <div></div>
              
              <button
                onTouchStart={() => movePiece('left')}
                className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg flex items-center justify-center transition-colors active:scale-95"
              >
                <ArrowLeft size={20} />
              </button>
              <button
                onTouchStart={() => movePiece('down')}
                className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-lg flex items-center justify-center transition-colors active:scale-95"
              >
                <ArrowDown size={20} />
              </button>
              <button
                onTouchStart={() => movePiece('right')}
                className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg flex items-center justify-center transition-colors active:scale-95"
              >
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabuleiro do jogo */}
        <div className="flex justify-center">
          <div className="bg-black/50 backdrop-blur-sm p-4 rounded-lg">
            <div 
              className="grid gap-px bg-gray-600 p-2 rounded"
              style={{
                gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
                gridTemplateRows: `repeat(${BOARD_HEIGHT}, 1fr)`
              }}
            >
              {board.map((row, y) =>
                row.map((cell, x) => (
                  <div
                    key={`${y}-${x}`}
                    className={`w-6 h-6 border border-gray-700 ${
                      cell ? cell : 'bg-gray-900'
                    }`}
                  />
                ))
              )}
            </div>
            
            {gameState.gameOver && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
                <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">Game Over!</h2>
                  <p className="text-white/80 mb-4">Pontuação Final: {gameState.score}</p>
                  <button
                    onClick={startGame}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
                  >
                    Jogar Novamente
                  </button>
                </div>
              </div>
            )}
            
            {gameState.isPaused && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
                <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg text-center">
                  <h2 className="text-2xl font-bold text-white">Pausado</h2>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Painel de estatísticas */}
        <div className="space-y-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Estatísticas</h2>
            <div className="space-y-4 text-white">
              <div className="flex justify-between">
                <span>Pontuação:</span>
                <span className="font-bold">{gameState.score.toLocaleString()}</span>
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

          {gameState.nextPiece && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Próxima Peça</h3>
              <div className="bg-black/30 rounded-lg p-4 flex justify-center">
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
                        className={`w-6 h-6 ${
                          cell ? gameState.nextPiece!.color : 'bg-transparent'
                        }`}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TetrisGame;
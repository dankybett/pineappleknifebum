const { useState, useEffect, useRef } = React;

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const CREATURE_SIZE = 40;
const PLAYER_SIZE = 50;
const MOVE_SPEED = 1;
const PLAYER_SPEED = 3;
const INTERACTION_DISTANCE = 60;

// Game rules: Pineapple beats Knife, Knife beats Bum, Bum beats Pineapple
const MOVES = {
  PINEAPPLE: '🍍',
  KNIFE: '🔪', 
  BUM: '🍑'
};

const MOVE_NAMES = {
  PINEAPPLE: 'Pineapple',
  KNIFE: 'Knife',
  BUM: 'Bum'
};

const getWinner = (playerMove, creatureMove) => {
  if (playerMove === creatureMove) return 'tie';
  if (
    (playerMove === 'PINEAPPLE' && creatureMove === 'KNIFE') ||
    (playerMove === 'KNIFE' && creatureMove === 'BUM') ||
    (playerMove === 'BUM' && creatureMove === 'PINEAPPLE')
  ) {
    return 'player';
  }
  return 'creature';
};

const getDistance = (obj1, obj2) => {
  const dx = obj1.x - obj2.x;
  const dy = obj1.y - obj2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const generateCreature = (id) => ({
  id,
  emoji: ['🐱', '🐶', '🐸', '🦊', '🐰', '🐼', '🦔'][Math.floor(Math.random() * 7)],
  x: Math.random() * (GAME_WIDTH - CREATURE_SIZE),
  y: Math.random() * (GAME_HEIGHT - CREATURE_SIZE),
  dx: (Math.random() - 0.5) * MOVE_SPEED * 2,
  dy: (Math.random() - 0.5) * MOVE_SPEED * 2,
  wins: 0,
  inParty: false
});

function PineappleKnifeBumGame() {
  const [creatures, setCreatures] = useState([]);
  const [party, setParty] = useState([]);
  const [selectedCreature, setSelectedCreature] = useState(null);
  const [gameState, setGameState] = useState('exploring'); // exploring, battling, countdown, revealing, result
  const [playerMove, setPlayerMove] = useState(null);
  const [creatureMove, setCreatureMove] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [battleResult, setBattleResult] = useState(null);
  const [creatureWins, setCreatureWins] = useState({});
  const [player, setPlayer] = useState({
    x: GAME_WIDTH / 2 - PLAYER_SIZE / 2,
    y: GAME_HEIGHT / 2 - PLAYER_SIZE / 2,
    emoji: '🧑‍🌾'
  });
  const [keys, setKeys] = useState({});
  const [nearbyCreature, setNearbyCreature] = useState(null);
  const animationRef = useRef();

  // Initialize creatures
  useEffect(() => {
    const initialCreatures = Array.from({ length: 8 }, (_, i) => generateCreature(i));
    setCreatures(initialCreatures);
  }, []);

  // Keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: true }));
      
      // Handle interaction with space or enter
      if ((e.key === ' ' || e.key === 'Enter') && nearbyCreature && gameState === 'exploring') {
        e.preventDefault();
        setSelectedCreature(nearbyCreature);
        setGameState('battling');
        setPlayerMove(null);
        setBattleResult(null);
      }
    };

    const handleKeyUp = (e) => {
      setKeys(prev => ({ ...prev, [e.key.toLowerCase()]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [nearbyCreature, gameState]);

  // Animation loop for player and creature movement
  useEffect(() => {
    const animate = () => {
      if (gameState === 'exploring') {
        // Update player position
        setPlayer(prev => {
          let newX = prev.x;
          let newY = prev.y;

          if (keys['w'] || keys['arrowup']) newY -= PLAYER_SPEED;
          if (keys['s'] || keys['arrowdown']) newY += PLAYER_SPEED;
          if (keys['a'] || keys['arrowleft']) newX -= PLAYER_SPEED;
          if (keys['d'] || keys['arrowright']) newX += PLAYER_SPEED;

          // Keep player within bounds
          newX = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, newX));
          newY = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, newY));

          return { ...prev, x: newX, y: newY };
        });

        // Update creatures
        setCreatures(prev => {
          const updatedCreatures = prev.map(creature => {
            if (creature.inParty) {
              // Make party creatures follow the player
              const targetX = player.x - 80 - (creature.id * 30);
              const targetY = player.y;
              const dx = targetX - creature.x;
              const dy = targetY - creature.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance > 5) {
                const moveX = (dx / distance) * PLAYER_SPEED * 0.8;
                const moveY = (dy / distance) * PLAYER_SPEED * 0.8;
                return { 
                  ...creature, 
                  x: creature.x + moveX, 
                  y: creature.y + moveY 
                };
              }
              return creature;
            } else {
              // Normal creature movement
              let newX = creature.x + creature.dx;
              let newY = creature.y + creature.dy;
              let newDx = creature.dx;
              let newDy = creature.dy;

              // Bounce off walls
              if (newX <= 0 || newX >= GAME_WIDTH - CREATURE_SIZE) {
                newDx = -newDx;
                newX = Math.max(0, Math.min(GAME_WIDTH - CREATURE_SIZE, newX));
              }
              if (newY <= 0 || newY >= GAME_HEIGHT - CREATURE_SIZE) {
                newDy = -newDy;
                newY = Math.max(0, Math.min(GAME_HEIGHT - CREATURE_SIZE, newY));
              }

              return { ...creature, x: newX, y: newY, dx: newDx, dy: newDy };
            }
          });

          // Check for nearby creatures for interaction
          const nearby = updatedCreatures.find(creature => 
            !creature.inParty && getDistance(player, creature) < INTERACTION_DISTANCE
          );
          setNearbyCreature(nearby || null);

          return updatedCreatures;
        });
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, keys, player]);


  const handlePlayerMove = (move) => {
    setPlayerMove(move);
    const moves = Object.keys(MOVES);
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    setCreatureMove(randomMove);
    
    setGameState('countdown');
    setCountdown(3);
  };

  // Countdown effect
  useEffect(() => {
    if (gameState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'countdown' && countdown === 0) {
      setGameState('revealing');
      
      // Show result after a brief delay
      setTimeout(() => {
        const result = getWinner(playerMove, creatureMove);
        setBattleResult(result);
        
        if (result === 'player') {
          const newWins = (creatureWins[selectedCreature.id] || 0) + 1;
          setCreatureWins(prev => ({ ...prev, [selectedCreature.id]: newWins }));
          
          if (newWins >= 3) {
            // Creature joins party
            setCreatures(prev => prev.map(c => 
              c.id === selectedCreature.id ? { ...c, inParty: true } : c
            ));
            setParty(prev => [...prev, selectedCreature]);
            setTimeout(() => {
              setGameState('exploring');
              setSelectedCreature(null);
            }, 2000);
          } else {
            setTimeout(() => {
              setGameState('exploring');
              setSelectedCreature(null);
            }, 2000);
          }
        } else {
          setTimeout(() => {
            setGameState('exploring');
            setSelectedCreature(null);
          }, 2000);
        }
      }, 1000);
    }
  }, [gameState, countdown, playerMove, creatureMove, selectedCreature, creatureWins]);

  const resetGame = () => {
    setCreatures(Array.from({ length: 8 }, (_, i) => generateCreature(i)));
    setParty([]);
    setCreatureWins({});
    setGameState('exploring');
    setSelectedCreature(null);
    setPlayer({
      x: GAME_WIDTH / 2 - PLAYER_SIZE / 2,
      y: GAME_HEIGHT / 2 - PLAYER_SIZE / 2,
      emoji: '🧑‍🌾'
    });
    setNearbyCreature(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-green-100 min-h-screen">
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold text-green-800 mb-2">Pineapple Knife Bum Adventure</h1>
        <div className="text-lg text-green-700">
          Party Size: {party.length} | 
          Rules: 🍍 beats 🔪, 🔪 beats 🍑, 🍑 beats 🍍
        </div>
      </div>

      {/* Game Area */}
      <div 
        className="relative bg-green-200 border-4 border-green-600 mx-auto"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
      >
        {/* Player Character */}
        <div
          className="absolute text-4xl z-10"
          style={{
            left: player.x,
            top: player.y,
            width: PLAYER_SIZE,
            height: PLAYER_SIZE,
          }}
        >
          {player.emoji}
        </div>

        {/* Interaction Indicator */}
        {nearbyCreature && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: nearbyCreature.x + CREATURE_SIZE / 2 - 15,
              top: nearbyCreature.y - 30,
              width: 30,
              height: 20,
            }}
          >
            <div className="bg-white border-2 border-blue-500 rounded px-1 text-xs text-center animate-bounce">
              SPACE
            </div>
          </div>
        )}

        {creatures.map(creature => (
          <div
            key={creature.id}
            className={`absolute text-3xl transition-transform ${
              creature.inParty ? 'opacity-70' : ''
            } ${selectedCreature?.id === creature.id ? 'animate-pulse' : ''} ${
              nearbyCreature?.id === creature.id ? 'scale-110 animate-pulse' : ''
            }`}
            style={{
              left: creature.x,
              top: creature.y,
              width: CREATURE_SIZE,
              height: CREATURE_SIZE,
            }}
          >
            {creature.emoji}
            {creatureWins[creature.id] > 0 && (
              <div className="absolute -top-2 -right-2 bg-yellow-400 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {creatureWins[creature.id]}
              </div>
            )}
          </div>
        ))}

        {/* Party creatures display */}
        {party.length > 0 && (
          <div className="absolute top-2 left-2 bg-white bg-opacity-80 p-2 rounded">
            <div className="text-sm font-bold text-green-800">Your Party:</div>
            <div className="flex gap-1">
              {party.map(creature => (
                <span key={creature.id} className="text-2xl">{creature.emoji}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Battle Interface */}
      {gameState === 'battling' && (
        <div className="mt-4 bg-white p-6 rounded-lg border-2 border-green-600">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-green-800">
              Challenge {selectedCreature?.emoji}!
            </h2>
            <p className="text-green-700">Choose your move:</p>
          </div>
          <div className="flex justify-center gap-4">
            {Object.entries(MOVES).map(([key, emoji]) => (
              <button
                key={key}
                onClick={() => handlePlayerMove(key)}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg text-2xl transition-colors"
              >
                {emoji} {MOVE_NAMES[key]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Countdown */}
      {gameState === 'countdown' && (
        <div className="mt-4 bg-white p-6 rounded-lg border-2 border-green-600">
          <div className="text-center">
            <div className="text-6xl font-bold text-green-800 animate-pulse">
              {countdown > 0 ? countdown : 'GO!'}
            </div>
          </div>
        </div>
      )}

      {/* Battle Result */}
      {(gameState === 'revealing' || battleResult) && (
        <div className="mt-4 bg-white p-6 rounded-lg border-2 border-green-600">
          <div className="text-center">
            <div className="flex justify-center gap-8 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-800">You</div>
                <div className="text-4xl">{MOVES[playerMove]}</div>
                <div className="text-sm">{MOVE_NAMES[playerMove]}</div>
              </div>
              <div className="text-4xl self-center">VS</div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-800">{selectedCreature?.emoji}</div>
                <div className="text-4xl">{MOVES[creatureMove]}</div>
                <div className="text-sm">{MOVE_NAMES[creatureMove]}</div>
              </div>
            </div>
            
            {battleResult && (
              <div className="text-2xl font-bold">
                {battleResult === 'player' && (
                  <div className="text-green-600">
                    You Win! 
                    {(creatureWins[selectedCreature?.id] || 0) + 1 >= 3 ? (
                      <div className="text-lg text-purple-600 mt-2">
                        🎉 {selectedCreature?.emoji} joins your party! 🎉
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 mt-1">
                        ({(creatureWins[selectedCreature?.id] || 0) + 1}/3 wins to recruit)
                      </div>
                    )}
                  </div>
                )}
                {battleResult === 'creature' && (
                  <div className="text-red-600">You Lose!</div>
                )}
                {battleResult === 'tie' && (
                  <div className="text-yellow-600">It's a Tie!</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reset Button */}
      <div className="mt-4 text-center">
        <button
          onClick={resetGame}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
        >
          Reset Game
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-4 bg-white p-4 rounded-lg border border-green-600">
        <h3 className="font-bold text-green-800 mb-2">How to Play:</h3>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• Move your farmer (🧑‍🌾) with WASD or arrow keys</li>
          <li>• Get close to creatures and press SPACE to challenge them</li>
          <li>• Win 3 battles against a creature to recruit it to your party</li>
          <li>• Recruited creatures will follow you around</li>
          <li>• 🍍 Pineapple beats 🔪 Knife (cuts it up)</li>
          <li>• 🔪 Knife beats 🍑 Bum (ouch!)</li>
          <li>• 🍑 Bum beats 🍍 Pineapple (sits on it)</li>
        </ul>
      </div>
    </div>
  );
}

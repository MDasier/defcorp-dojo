import MenuScene from './scenes/MenuScene.js';
import PauseScene from './scenes/PauseScene.js';
import OptionsScene from './scenes/OptionScene.js';
import GameScene from './scenes/GameScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import EEScene from './scenes/EEScene.js';
import MusicScene from './scenes/MusicScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [MenuScene, OptionsScene, GameScene, PauseScene, GameOverScene, EEScene, MusicScene]
};

new Phaser.Game(config);

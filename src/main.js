import Phaser from 'phaser';
import { BootScene }  from './scenes/BootScene.js';
import { StartScene } from './scenes/StartScene.js';
import { GameScene }  from './scenes/GameScene.js';
import { ShopScene }  from './scenes/ShopScene.js';
import { GAME_WIDTH, GAME_HEIGHT } from './config/GameConfig.js';

const config = {
  type: Phaser.AUTO,
  width:  GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1a2e',
  audio: {
    // HTML5 Audio 사용 - WAV 포맷 호환성 향상
    disableWebAudio: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, StartScene, GameScene, ShopScene],
};

window.__game = new Phaser.Game(config);

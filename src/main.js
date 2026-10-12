import Phaser from 'phaser';
import './style.css';
import './reward-minimal.css';
import './content.css';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { RewardScene } from './scenes/RewardScene.js';
import { EndScene } from './scenes/EndScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: 1280, height: 800,
  backgroundColor: '#151b23',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { debug: false } },
  render: { antialias: true },
  scene: [BootScene, MenuScene, GameScene, RewardScene, EndScene],
});
// Read-only access is useful for local browser diagnostics.
window.sanyaGame = game;

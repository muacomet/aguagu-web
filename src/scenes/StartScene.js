import Phaser from 'phaser';
import { SoundManager } from '../managers/SoundManager.js';
import { Save } from '../managers/SaveManager.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig.js';

export class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
  }

  create() {
    SoundManager.init(this);

    // BGM
    if (!this.sound.get('bgm_start') || !this.sound.get('bgm_start').isPlaying) {
      this.sound.stopAll();
      this.sound.play('bgm_start', { loop: true, volume: 0.5 });
    }

    // 배경 (full-fill)
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // 타이틀 (479x251 → 460x242)
    this.add.image(GAME_WIDTH / 2, 200, 'title')
      .setDisplaySize(460, 242);

    // 하이스코어
    const best = Save.getBestScore();
    this.add.text(GAME_WIDTH / 2, 355, `Best Score: ${best.toLocaleString()}`, {
      fontSize: '26px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    // 버튼들 (200x100 → 220x80)
    this._makeBtn(GAME_WIDTH / 2, 450, 'btn_start', 220, 80, () => {
      SoundManager.btnClick();
      this.sound.stopAll();
      this.scene.start('GameScene');
    });

    this._makeBtn(GAME_WIDTH / 2, 560, 'btn_shop', 220, 80, () => {
      SoundManager.btnClick();
      this.scene.start('ShopScene');
    });

    // ESC 종료 다이얼로그
    this._quitDialog = this._makeQuitDialog();

    this.input.keyboard.on('keydown-ESC', () => {
      this._quitDialog.setVisible(true);
    });
  }

  _makeBtn(x, y, key, w, h, cb) {
    return this.add.image(x, y, key)
      .setDisplaySize(w, h)
      .setInteractive({ cursor: 'pointer' })
      .on('pointerover',  function() { this.setAlpha(0.85); })
      .on('pointerout',   function() { this.setAlpha(1.0); })
      .on('pointerdown',  cb);
  }

  _makeQuitDialog() {
    const container = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setVisible(false);

    const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5)
      .setInteractive(); // 뒤 클릭 막기
    const dlg = this.add.image(0, 0, 'dlg_restart').setScale(0.9);
    const label = this.add.text(0, -40, '게임을 종료하시겠습니까?', {
      fontSize: '22px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    const btnYes = this.add.image(-80, 60, 'btn_yes')
      .setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => { window.close(); });

    const btnNo = this.add.image(80, 60, 'btn_no')
      .setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => { container.setVisible(false); });

    container.add([overlay, dlg, label, btnYes, btnNo]);
    return container;
  }
}

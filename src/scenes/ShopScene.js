import Phaser from 'phaser';
import { SoundManager } from '../managers/SoundManager.js';
import { Save } from '../managers/SaveManager.js';
import {
  GAME_WIDTH, GAME_HEIGHT,
  LEVEL_EXP_REQ, LEVEL_SEQUENCE,
} from '../config/GameConfig.js';

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
  }

  create() {
    SoundManager.init(this);
    this.sound.stopAll();
    this.sound.play('bgm_shop', { loop: true, volume: 0.4 });

    this._loadData();

    // 배경 (shop_bg: 1000x800 → fill)
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'shop_bg')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.image(GAME_WIDTH / 2, 80, 'shop_title').setDisplaySize(400, 100);

    // 루비 표시
    this.rubyText = this.add.text(GAME_WIDTH - 30, 30, '', {
      fontSize: '22px', color: '#ffcc00',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0);

    // 레벨 표시
    this.lvText = this.add.text(GAME_WIDTH / 2, 160, '', {
      fontSize: '30px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    // EXP 표시 (4줄)
    this.expTexts = [];
    const expLabels = ['작은 물고기', '보통 물고기', '큰 물고기', '희귀 물고기'];
    for (let i = 0; i < 4; i++) {
      const y = 230 + i * 60;
      this.add.text(GAME_WIDTH / 2 - 200, y, expLabels[i], {
        fontSize: '20px', color: '#cccccc',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0, 0.5);

      const t = this.add.text(GAME_WIDTH / 2 + 100, y, '', {
        fontSize: '20px', color: '#ffffff',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0, 0.5);
      this.expTexts.push(t);
    }

    // 레벨업 버튼
    this.upgradeBtn = this.add.image(GAME_WIDTH / 2, 520, 'btn_upgrade')
      .setInteractive({ cursor: 'pointer' })
      .on('pointerdown', this._levelUp, this);

    // 리셋 버튼
    this.add.text(GAME_WIDTH / 2 + 220, 520, '초기화', {
      fontSize: '18px', color: '#ff6666',
      stroke: '#000000', strokeThickness: 2,
      backgroundColor: '#00000088',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5)
      .setInteractive({ cursor: 'pointer' })
      .on('pointerdown', this._resetData, this);

    // 돌아가기 버튼
    this.add.image(GAME_WIDTH / 2, 610, 'btn_main')
      .setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => {
        SoundManager.btnClick();
        this.scene.start('StartScene');
      });

    this._refreshUI();
  }

  _loadData() {
    this.sharkLevel = Save.getSharkLevel();
    this.exp = [null]; // index 1~4
    for (let i = 1; i <= 4; i++) this.exp.push(Save.getExp(i));
    this.rubyAmount = Save.getRubyAmount();
  }

  _refreshUI() {
    const lv = this.sharkLevel;
    const lvIdx = LEVEL_SEQUENCE.indexOf(lv);
    const displayLv = lvIdx >= 0 ? lvIdx + 1 : 1;
    this.lvText.setText(`LV ${displayLv}`);
    this.rubyText.setText(`루비: ${this.rubyAmount}`);

    const req = LEVEL_EXP_REQ[lv] || [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const cur = this.exp[i + 1];
      const max = req[i];
      this.expTexts[i].setText(max > 0 ? `${cur} / ${max}` : 'MAX');
    }

    // 레벨업 버튼 활성화 여부
    const canLvUp = this._canLevelUp();
    this.upgradeBtn.setAlpha(canLvUp ? 1.0 : 0.4);
    this.upgradeBtn.setInteractive(canLvUp);
  }

  _canLevelUp() {
    const lv = this.sharkLevel;
    if (lv === 10) return false;
    const req = LEVEL_EXP_REQ[lv];
    if (!req) return false;
    return req.every((r, i) => r === 0 || this.exp[i + 1] >= r);
  }

  _levelUp() {
    if (!this._canLevelUp()) return;
    SoundManager.btnClick();

    const lv = this.sharkLevel;
    const idx = LEVEL_SEQUENCE.indexOf(lv);
    const nextLv = LEVEL_SEQUENCE[idx + 1];
    if (nextLv === undefined) return;

    Save.setSharkLevel(nextLv);
    for (let i = 1; i <= 4; i++) Save.setExp(i, 0);

    this._loadData();
    this._refreshUI();
  }

  _resetData() {
    Save.resetAll();
    this._loadData();
    this._refreshUI();
  }
}

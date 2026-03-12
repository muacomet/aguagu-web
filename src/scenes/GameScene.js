import Phaser from 'phaser';
import { SoundManager } from '../managers/SoundManager.js';
import { Save } from '../managers/SaveManager.js';
import {
  GAME_WIDTH, GAME_HEIGHT,
  MAX_HP, HP_DRAIN_INTERVAL,
  DIFFICULTY, SCORE, HP_CHANGE,
  LEVEL_EXP_REQ,
} from '../config/GameConfig.js';

// 레이아웃 상수 (1280x720 기준)
const SHARK_X    = 560;
const SHARK_Y    = 360;
const BOX_X      = 75;
const BOX_Y      = 360;
const SPAWN_X    = 1320;
const SPAWN_Y    = 360;
const DOOR_Y     = 360;
const LEFT_DOOR_X  = 210;
const RIGHT_DOOR_X = 380;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    // class field 초기화
    this._prevDiffIdx = 0;
    this._sharkFaceTimer = null;
    this._toastTimer = null;
    this._spawnTimer = null;
  }

  create() {
    SoundManager.init(this);
    this.sound.stopAll();
    this.sound.play('bgm_game', { loop: true, volume: 0.4 });

    // 상태 초기화
    this.score        = 0;
    this.hp           = MAX_HP;
    this.isGameOver   = false;
    this.fishEatCount = 0;
    this.thisGameRuby = 0;
    this._prevDiffIdx = 0;

    // 저장 데이터 로드
    this.bestScore  = Save.getBestScore();
    this.sharkLevel = Save.getSharkLevel();
    this.exp = [0, Save.getExp(1), Save.getExp(2), Save.getExp(3), Save.getExp(4)];

    // ── 배경 ──────────────────────────────────────────────
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // 배경 물고기 그림자
    this.fishShadow = this.add.image(GAME_WIDTH + 200, GAME_HEIGHT - 60, 'bg_fish')
      .setDisplaySize(300, 180).setAlpha(0.25);

    // ── 박스 (좌측 끝) ──────────────────────────────────
    // 화면에 보이는 박스 이미지
    this.add.image(BOX_X, BOX_Y, 'box1').setDisplaySize(120, 200).setDepth(2);

    // 물리 트리거 (보이지 않는 충돌 영역)
    this.box1 = this.physics.add.staticImage(BOX_X, BOX_Y, 'box1')
      .setDisplaySize(60, 180).setAlpha(0).setDepth(0);
    this.box1.body.setSize(60, 180);

    // ── 도어 ──────────────────────────────────────────────
    // 도어는 90도 회전 (165x32 → 세로 배치)
    this.leftDoor = this.physics.add.staticImage(LEFT_DOOR_X, DOOR_Y, 'door')
      .setDisplaySize(22, 200).setAngle(0).setDepth(3)
      .setActive(true).setVisible(true);
    this.leftDoor.body.setSize(22, 200);

    this.rightDoor = this.physics.add.staticImage(RIGHT_DOOR_X, DOOR_Y, 'door')
      .setDisplaySize(22, 200).setAngle(0).setDepth(3)
      .setActive(true).setVisible(true);
    this.rightDoor.body.setSize(22, 200);

    this.leftDoorOpen  = false;
    this.rightDoorOpen = false;

    // ── 상어 ──────────────────────────────────────────────
    // 748x972 → displaySize 160x208
    this.shark = this.physics.add.image(SHARK_X, SHARK_Y, 'shark')
      .setDisplaySize(160, 208).setImmovable(true).setDepth(4);
    this.shark.body.setSize(100, 80).setOffset(30, 64);

    // ── 오브젝트 그룹 ──────────────────────────────────
    this.objects = this.physics.add.group();

    // ── UI ────────────────────────────────────────────────
    this._createUI();

    // ── 충돌 설정 ─────────────────────────────────────────
    this._setupColliders();

    // ── 스폰 시작 ─────────────────────────────────────────
    this._startSpawn();

    // ── HP 자동 감소 타이머 ───────────────────────────────
    this._hpTimer = this.time.addEvent({
      delay: HP_DRAIN_INTERVAL,
      callback: this._drainHP,
      callbackScope: this,
      loop: true,
    });

    // ── 키보드 입력 ───────────────────────────────────────
    this.input.keyboard.on('keydown-LEFT',  this._toggleLeftDoor,  this);
    this.input.keyboard.on('keydown-RIGHT', this._toggleRightDoor, this);
  }

  // ──────────────────────────────────────────────────────── UI

  _createUI() {
    // HP 바 (800x100 → displaySize 560x70, 위치 상단 중앙)
    this.hpBar = this.add.image(GAME_WIDTH / 2, 38, `bar${MAX_HP}`)
      .setDisplaySize(560, 70).setDepth(10);

    // 점수
    this.scoreText = this.add.text(GAME_WIDTH - 20, 18, 'Score: 0', {
      fontSize: '26px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
      fontFamily: 'Arial Black, Arial',
    }).setOrigin(1, 0).setDepth(10);

    // 일시정지 버튼
    this.isPaused = false;
    this.pauseBtn = this.add.image(36, 36, 'btn_pause')
      .setDisplaySize(56, 56).setInteractive({ cursor: 'pointer' })
      .setDepth(10)
      .on('pointerdown', this._togglePause, this);

    // ── 일시정지 오버레이 ──
    this.pauseContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setDepth(15).setVisible(false);
    const pOverlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65);
    const pLabel   = this.add.text(0, -120, 'PAUSE', {
      fontSize: '52px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 6,
      fontFamily: 'Arial Black, Arial',
    }).setOrigin(0.5);

    const btnPMain = this._makePhaserBtn(0, -20, 'btn_main', 180, 60, () => {
      SoundManager.btnClick();
      this.physics.resume(); this.time.paused = false;
      this.scene.start('StartScene');
    });
    const btnPRe = this._makePhaserBtn(0, 60, 'btn_re', 180, 60, () => {
      SoundManager.btnClick();
      this._showRestartConfirm();
    });
    this.pauseContainer.add([pOverlay, pLabel, btnPMain, btnPRe]);

    // ── 재시작 확인 다이얼로그 ──
    this.restartConfirm = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setDepth(25).setVisible(false);
    const rcDlg  = this.add.image(0, 0, 'dlg_restart').setDisplaySize(500, 240);
    const rcText = this.add.text(0, -50, '재시작 하시겠습니까?', {
      fontSize: '26px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);
    const rcYes  = this._makePhaserBtn(-90, 50, 'btn_yes', 130, 55, () => this.scene.start('GameScene'));
    const rcNo   = this._makePhaserBtn( 90, 50, 'btn_no',  130, 55, () => {
      this.restartConfirm.setVisible(false);
      this.pauseContainer.setVisible(true);
    });
    this.restartConfirm.add([rcDlg, rcText, rcYes, rcNo]);

    // ── 게임오버 UI ──
    // gameover_dialog.png: 1000x800 → displaySize 500x400
    // 다이얼로그 상단 ~35%: "GAME OVER" 헤더, 하단 ~65%: 점수/버튼 영역
    this.gameoverContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setDepth(20).setVisible(false);
    const goOverlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);
    const goDlg     = this.add.image(0, 0, 'dlg_gameover').setDisplaySize(500, 400);

    // 헤더 35% = 140px → 콘텐츠 시작 y = -200 + 140 = -60
    this.deadScoreText = this.add.text(0, -30, '', {
      fontSize: '34px', color: '#ffff00',
      stroke: '#000000', strokeThickness: 5,
      fontFamily: 'Arial Black, Arial',
    }).setOrigin(0.5);
    this.bestScoreText = this.add.text(0, 30, '', {
      fontSize: '22px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    const btnRestart = this._makePhaserBtn(-150, 130, 'btn_re',   150, 56, () => {
      SoundManager.btnClick(); this.scene.start('GameScene');
    });
    const btnMain    = this._makePhaserBtn(0,    130, 'btn_main', 150, 56, () => {
      SoundManager.btnClick(); this.scene.start('StartScene');
    });
    const btnShop    = this._makePhaserBtn(150,  130, 'btn_shop', 150, 56, () => {
      SoundManager.btnClick(); this.scene.start('ShopScene');
    });
    this.gameoverContainer.add([goOverlay, goDlg, this.deadScoreText, this.bestScoreText, btnRestart, btnMain, btnShop]);

    // ── 토스트 ──
    this.toastImage = this.add.image(GAME_WIDTH / 2, 100, 'toast_speed')
      .setDisplaySize(560, 70).setDepth(30).setVisible(false);

    // ── 도어 토글 버튼 (터치/클릭용) ──
    const doorBtnStyle = {
      fontSize: '16px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3,
      backgroundColor: '#00000099',
      padding: { x: 10, y: 6 },
    };
    this.add.text(LEFT_DOOR_X, GAME_HEIGHT - 30, '← 도어', doorBtnStyle)
      .setOrigin(0.5).setDepth(10).setInteractive({ cursor: 'pointer' })
      .on('pointerdown', this._toggleLeftDoor, this);
    this.add.text(RIGHT_DOOR_X + 80, GAME_HEIGHT - 30, '→ 도어', doorBtnStyle)
      .setOrigin(0.5).setDepth(10).setInteractive({ cursor: 'pointer' })
      .on('pointerdown', this._toggleRightDoor, this);
  }

  _makePhaserBtn(x, y, key, w, h, cb) {
    return this.add.image(x, y, key)
      .setDisplaySize(w, h)
      .setInteractive({ cursor: 'pointer' })
      .on('pointerover',  function() { this.setAlpha(0.85); })
      .on('pointerout',   function() { this.setAlpha(1); })
      .on('pointerdown',  cb);
  }

  _showRestartConfirm() {
    this.pauseContainer.setVisible(false);
    this.restartConfirm.setVisible(true);
  }

  // ──────────────────────────────────────────────────────── 충돌

  _setupColliders() {
    this.physics.add.overlap(this.shark, this.objects, this._onSharkHit, null, this);
    this.physics.add.overlap(this.box1,  this.objects, this._onBox1Hit,  null, this);
    this.physics.add.collider(this.leftDoor,  this.objects);
    this.physics.add.collider(this.rightDoor, this.objects);
  }

  _onSharkHit(shark, obj) {
    if (!obj.active) return;
    const tag = obj.getData('tag');

    if (tag === 'FISH') {
      this.score += SCORE.SHARK_EAT_FISH;
      this._addExp(obj.getData('fishType'));
      this.fishEatCount++;
      if (this.fishEatCount >= 2 && this.hp < MAX_HP) {
        this.hp = Math.min(MAX_HP, this.hp + 1);
        this.fishEatCount = 0;
      }
      obj.destroy();
      this._sharkFace('eat');
      SoundManager.fishEat();
    } else if (tag === 'RUBY') {
      this.score = Math.max(0, this.score + SCORE.SHARK_EAT_RUBY);
      this.hp    = Math.max(0, this.hp + HP_CHANGE.SHARK_EAT_RUBY);
      obj.destroy();
      this._sharkFace('hit');
      SoundManager.wrongEat();
    } else if (tag === 'TRASH') {
      this.score = Math.max(0, this.score + SCORE.SHARK_EAT_TRASH);
      this.hp    = Math.max(0, this.hp + HP_CHANGE.SHARK_EAT_TRASH);
      obj.destroy();
      this._sharkFace('hit');
      SoundManager.wrongEat();
    }
    this._updateScoreText();
  }

  _onBox1Hit(box, obj) {
    if (!obj.active) return;
    const tag = obj.getData('tag');

    if (tag === 'FISH') {
      this.score = Math.max(0, this.score + SCORE.BOX_MISS_FISH);
      this.hp    = Math.max(0, this.hp + HP_CHANGE.BOX_MISS_FISH);
      obj.destroy();
      SoundManager.wrong();
    } else if (tag === 'RUBY') {
      this.score += SCORE.BOX_CATCH_RUBY;
      this.thisGameRuby++;
      obj.destroy();
      SoundManager.ruby();
    } else if (tag === 'TRASH') {
      // 쓰레기는 박스 통과 시 가벼운 페널티
      this.score = Math.max(0, this.score - 50);
      this.hp    = Math.max(0, this.hp - 1);
      obj.destroy();
      SoundManager.wrong();
    }
    this._updateScoreText();
  }

  // ──────────────────────────────────────────────────────── 스폰

  _startSpawn() {
    const diff = this._getDifficulty();
    this._doSpawn(diff);
  }

  _getDifficulty() {
    let diff = DIFFICULTY[0];
    for (const d of DIFFICULTY) {
      if (this.score >= d.score) diff = d;
    }
    return diff;
  }

  _doSpawn(diff) {
    if (this.isGameOver) return;

    const key = Phaser.Utils.Array.GetRandom(diff.pool);
    const obj = this.objects.create(SPAWN_X, SPAWN_Y, key);
    obj.body.allowGravity = false;
    obj.body.velocity.x   = -350;

    // 오브젝트 크기 지정
    if (key.startsWith('fish')) {
      obj.setDisplaySize(130, 68);
      obj.setData('tag', 'FISH');
      obj.setData('fishType', parseInt(key.replace('fish', '')));
      obj.body.setSize(100, 50).setOffset(15, 9);
    } else if (key === 'ruby') {
      obj.setDisplaySize(70, 70);
      obj.setData('tag', 'RUBY');
      obj.body.setSize(60, 60).setOffset(5, 5);
    } else {
      obj.setDisplaySize(130, 65);
      obj.setData('tag', 'TRASH');
      obj.body.setSize(100, 50).setOffset(15, 8);
    }

    // 다음 스폰
    const newDiff = this._getDifficulty();
    this._spawnTimer = this.time.delayedCall(newDiff.interval, () => this._doSpawn(newDiff));
    this._checkToast(newDiff);
  }

  _checkToast(diff) {
    const idx = DIFFICULTY.indexOf(diff);
    if (idx > this._prevDiffIdx) {
      this._prevDiffIdx = idx;
      // toast 이미지가 로드되어 있을 때만 표시
      if (this.textures.exists('toast_fish') && diff.pool.includes('fish03') &&
          !DIFFICULTY[idx - 1]?.pool.includes('fish03')) {
        this._showToast('toast_fish');
      } else if (this.textures.exists('toast_trash') && diff.pool.includes('trash02') &&
                 !DIFFICULTY[idx - 1]?.pool.includes('trash02')) {
        this._showToast('toast_trash');
      } else if (this.textures.exists('toast_speed')) {
        this._showToast('toast_speed');
      }
    }
  }

  _showToast(key) {
    this.toastImage.setTexture(key).setVisible(true);
    SoundManager.toast();
    if (this._toastTimer) this._toastTimer.remove();
    this._toastTimer = this.time.delayedCall(2000, () => {
      this.toastImage.setVisible(false);
    });
  }

  // ──────────────────────────────────────────────────────── 도어

  _toggleLeftDoor() {
    if (this.isGameOver || this.isPaused) return;
    this.leftDoorOpen = !this.leftDoorOpen;
    this.leftDoor.setActive(!this.leftDoorOpen).setVisible(!this.leftDoorOpen);
    if (!this.leftDoorOpen) this.leftDoor.body.enable = false;
    else this.leftDoor.body.enable = true;
    SoundManager.door();
  }

  _toggleRightDoor() {
    if (this.isGameOver || this.isPaused) return;
    this.rightDoorOpen = !this.rightDoorOpen;
    this.rightDoor.setActive(!this.rightDoorOpen).setVisible(!this.rightDoorOpen);
    if (!this.rightDoorOpen) this.rightDoor.body.enable = false;
    else this.rightDoor.body.enable = true;
    SoundManager.door();
  }

  // ──────────────────────────────────────────────────────── HP

  _drainHP() {
    if (this.isGameOver) return;
    this.hp = Math.max(0, this.hp - 1);
  }

  // ──────────────────────────────────────────────────────── 상어 표정

  _sharkFace(state) {
    const key = state === 'eat' ? 'shark_eat' : state === 'hit' ? 'shark_hit' : 'shark';
    this.shark.setTexture(key);
    if (this._sharkFaceTimer) this._sharkFaceTimer.remove();
    this._sharkFaceTimer = this.time.delayedCall(300, () => {
      this.shark.setTexture('shark');
    });
  }

  _updateScoreText() {
    this.scoreText.setText(`Score: ${this.score.toLocaleString()}`);
  }

  // ──────────────────────────────────────────────────────── 게임오버

  _triggerGameOver() {
    this.isGameOver = true;
    if (this._spawnTimer) this._spawnTimer.remove();
    this.sound.stopAll();
    SoundManager.gameOver();

    // 저장
    Save.setRubyAmount(Save.getRubyAmount() + this.thisGameRuby);
    for (let i = 1; i <= 4; i++) Save.setExp(i, this.exp[i]);
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      Save.setBestScore(this.bestScore);
    }

    this.gameoverContainer.setVisible(true);
    this.deadScoreText.setText(`Score: ${this.score.toLocaleString()}`);
    this.bestScoreText.setText(`Best: ${this.bestScore.toLocaleString()}`);
  }

  // ──────────────────────────────────────────────────────── EXP

  _addExp(fishType) {
    if (!fishType || fishType > 4) return;
    const req = LEVEL_EXP_REQ[this.sharkLevel];
    if (!req) return;
    const maxExp = req[fishType - 1];
    if (maxExp <= 0) return;
    this.exp[fishType] = Math.min(this.exp[fishType] + 1, maxExp);
  }

  // ──────────────────────────────────────────────────────── 일시정지

  _togglePause() {
    if (this.isGameOver) return;
    SoundManager.btnClick();
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.physics.pause();
      this.time.paused = true;
      this.pauseBtn.setTexture('btn_go');
      this.pauseContainer.setVisible(true);
    } else {
      this.physics.resume();
      this.time.paused = false;
      this.pauseBtn.setTexture('btn_pause');
      this.pauseContainer.setVisible(false);
      this.restartConfirm.setVisible(false);
    }
  }

  // ──────────────────────────────────────────────────────── update

  update(time, delta) {
    if (this.isGameOver) return;

    // HP 바 갱신 (게임오버 체크 전에 먼저 표시)
    this.hpBar.setTexture(`bar${Math.max(0, Math.min(12, this.hp))}`);

    if (this.hp <= 0) {
      this._triggerGameOver();
      return;
    }

    // 화면 밖 오브젝트 제거
    this.objects.getChildren().forEach(obj => {
      if (obj.x < -100) obj.destroy();
    });

    // 배경 그림자 애니메이션
    if (this.fishShadow.x > -200) {
      this.fishShadow.x -= delta * 0.15;
      this.fishShadow.y -= delta * 0.04;
    } else {
      this.fishShadow.x = GAME_WIDTH + 200;
      this.fishShadow.y = GAME_HEIGHT - 60;
    }
  }
}

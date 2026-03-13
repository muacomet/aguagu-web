import Phaser from 'phaser';
import { SoundManager } from '../managers/SoundManager.js';
import { Save } from '../managers/SaveManager.js';
import {
  GAME_WIDTH, GAME_HEIGHT,
  MAX_HP, HP_DRAIN_INTERVAL,
  DIFFICULTY, SCORE, HP_CHANGE,
  LEVEL_EXP_REQ,
} from '../config/GameConfig.js';

// ── 레이아웃 상수 (1280x720 기준) ─────────────────────────────────
const SHARK_X       = 250;
const SHARK_Y       = 360;
const BOX_X         = 75;     // 상어를 통과한 물체 감지 (최좌측)
const BOX_Y         = 490;
const SPAWN_X       = 1320;
const SPAWN_Y       = 490;
const DOOR_Y        = 490;
const LEFT_DOOR_X   = 630;
const RIGHT_DOOR_X  = 860;

// 레인/도어 시각 상수
const RAIL_H        = 58;     // 레인 표시 높이 (px)
const DOOR_W        = 148;    // door.png 표시 너비 (px)
const RAIL_START    = 350;    // 레인 시작 x (상어 오른쪽)
const RAIL_END      = 1380;   // 레인 끝 x (화면 오른쪽 밖)

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this._prevDiffIdx   = 0;
    this._sharkFaceTimer = null;
    this._toastTimer    = null;
    this._spawnTimer    = null;
    this._comboTimer    = null;
  }

  create() {
    SoundManager.init(this);
    this.sound.stopAll();
    this.sound.play('bgm_game', { loop: true, volume: 0.4 });

    // ── 상태 초기화 ───────────────────────────────────────────────
    this.score        = 0;
    this.hp           = MAX_HP;
    this.isGameOver   = false;
    this.fishEatCount = 0;
    this.thisGameRuby = 0;
    this.combo        = 0;
    this._prevDiffIdx = 0;

    // 저장 데이터 로드
    this.bestScore  = Save.getBestScore();
    this.sharkLevel = Save.getSharkLevel();
    this.exp = [0, Save.getExp(1), Save.getExp(2), Save.getExp(3), Save.getExp(4)];

    // ── 배경 ──────────────────────────────────────────────────────
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(0);

    // 배경 물고기 그림자
    this.fishShadow = this.add.image(GAME_WIDTH + 200, 300, 'bg_fish')
      .setDisplaySize(320, 190).setAlpha(0.22).setDepth(1);

    // ── 레인 (Table 이미지 + 도어 갭) ────────────────────────────
    this._createRail();

    // ── 박스 비주얼 (도어 아래, 원본처럼 하단에 배치) ─────────────
    // 원본 영상 기준: 왼쪽 박스는 도어1 중앙, 오른쪽 박스는 도어2 중앙
    this.add.image(LEFT_DOOR_X,  660, 'box1').setDisplaySize(148, 140).setDepth(2);
    this.add.image(RIGHT_DOOR_X, 660, 'box2').setDisplaySize(155, 135).setDepth(2);

    // 박스 물리 트리거 (상어를 통과한 물체 감지, 좌측 끝)
    // BOX_Y=490(레일 중앙)이었으나 아이템이 y=427(레일 위)로 이동하여
    // 히트박스를 두 Y 범위를 모두 커버하도록 확장 (y=390~510)
    this.box1 = this.physics.add.staticImage(BOX_X, 450, 'box1')
      .setDisplaySize(60, 120).setAlpha(0).setDepth(0);
    this.box1.body.setSize(60, 120);

    // ── 상어 ──────────────────────────────────────────────────────
    this.shark = this.physics.add.image(SHARK_X, SHARK_Y, 'shark')
      .setDisplaySize(500, 650).setImmovable(true).setDepth(4);
    // Phaser 3 arcade physics 공식:
    //   body.top = spriteY - displayH * originY + offsetY_local * scaleY
    //   body.height = sizeH_local * scaleY
    // 상어: scaleY=0.6687, spriteTop=360-325=35
    // 아이템: railTop=461, fish y=427 → 시각 범위 y=393~461
    // 목표 body: y=390~470 → offsetY=(390-35)/0.6687≈531, sizeH=80/0.6687≈120
    this.shark.body.setSize(240, 120).setOffset(260, 531);

    // ── 오브젝트 그룹 ──────────────────────────────────────────────
    this.objects = this.physics.add.group();

    // ── UI ─────────────────────────────────────────────────────────
    this._createUI();

    // ── 충돌 설정 (도어는 갭 감지 방식으로 변경) ─────────────────
    this.physics.add.overlap(this.shark, this.objects, this._onSharkHit, null, this);
    this.physics.add.overlap(this.box1,  this.objects, this._onBox1Hit,  null, this);

    // ── 스폰 시작 ─────────────────────────────────────────────────
    this._startSpawn();

    // ── HP 자동 감소 타이머 ──────────────────────────────────────
    this._hpTimer = this.time.addEvent({
      delay: HP_DRAIN_INTERVAL,
      callback: this._drainHP,
      callbackScope: this,
      loop: true,
    });

    // ── 키보드 입력 ──────────────────────────────────────────────
    this.input.keyboard.on('keydown-LEFT',  this._toggleLeftDoor,  this);
    this.input.keyboard.on('keydown-RIGHT', this._toggleRightDoor, this);
  }

  // ──────────────────────────────────────────────────────── 레인 생성

  _createRail() {
    const dHW = DOOR_W / 2;
    const d1L = LEFT_DOOR_X  - dHW;   // 도어1 왼쪽 끝 x
    const d1R = LEFT_DOOR_X  + dHW;   // 도어1 오른쪽 끝 x
    const d2L = RIGHT_DOOR_X - dHW;   // 도어2 왼쪽 끝 x
    const d2R = RIGHT_DOOR_X + dHW;   // 도어2 오른쪽 끝 x

    // 레인 섹션 1 (상어 오른쪽 ~ 도어1 왼쪽)
    const s1w = d1L - RAIL_START;
    this.add.image(RAIL_START + s1w / 2, SPAWN_Y, 'table01')
      .setDisplaySize(s1w, RAIL_H).setDepth(2);

    // 레인 섹션 2 (도어1 오른쪽 ~ 도어2 왼쪽)
    const s2w = d2L - d1R;
    this.add.image(d1R + s2w / 2, SPAWN_Y, 'table01')
      .setDisplaySize(s2w, RAIL_H).setDepth(2);

    // 레인 섹션 3 (도어2 오른쪽 ~ 우측 끝)
    const s3w = RAIL_END - d2R;
    this.add.image(d2R + s3w / 2, SPAWN_Y, 'table02')
      .setDisplaySize(s3w, RAIL_H).setDepth(2);

    // 도어 이미지 (닫혀있을 때 갭을 채우는 가로 세그먼트)
    this.leftDoorImg = this.add.image(LEFT_DOOR_X,  SPAWN_Y, 'door')
      .setDisplaySize(DOOR_W, RAIL_H).setDepth(3);

    this.rightDoorImg = this.add.image(RIGHT_DOOR_X, SPAWN_Y, 'door')
      .setDisplaySize(DOOR_W, RAIL_H).setDepth(3);

    this.leftDoorOpen  = false;
    this.rightDoorOpen = false;
  }

  // ──────────────────────────────────────────────────────────── UI

  _createUI() {
    // HP 바 (중앙 왼쪽 – 원본 영상 기준)
    this.hpBar = this.add.image(640, 162, `bar${MAX_HP}`)
      .setDisplaySize(480, 60).setDepth(10);

    // 점수
    this.scoreText = this.add.text(GAME_WIDTH / 2, 14, 'Score : 0', {
      fontSize: '62px',
      color: '#111111',
      stroke: '#ffffff',
      strokeThickness: 3,
      fontFamily: 'Arial Black, Arial',
    }).setOrigin(0.5, 0).setDepth(10);

    // 일시정지 버튼 (우측 상단)
    this.isPaused = false;
    this.pauseBtn = this.add.image(GAME_WIDTH - 44, 44, 'btn_pause')
      .setDisplaySize(72, 72).setInteractive({ cursor: 'pointer' })
      .setDepth(10)
      .on('pointerdown', this._togglePause, this);

    // 콤보 텍스트
    this.comboText = this.add.text(55, 240, '', {
      fontSize: '38px',
      color: '#ff2200',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'italic bold',
      fontFamily: 'Arial Black, Arial',
    }).setDepth(10).setVisible(false);

    // 도어 조작 버튼 (btn01=빨강, btn02=초록)
    this.add.image(LEFT_DOOR_X, GAME_HEIGHT - 38, 'btn01')
      .setDisplaySize(120, 54).setInteractive({ cursor: 'pointer' })
      .setDepth(10)
      .on('pointerdown', this._toggleLeftDoor, this);

    this.add.image(RIGHT_DOOR_X, GAME_HEIGHT - 38, 'btn02')
      .setDisplaySize(120, 54).setInteractive({ cursor: 'pointer' })
      .setDepth(10)
      .on('pointerdown', this._toggleRightDoor, this);

    // ── 일시정지 오버레이 ─────────────────────────────────────────
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

    // ── 재시작 확인 다이얼로그 ────────────────────────────────────
    this.restartConfirm = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setDepth(25).setVisible(false);
    const rcDlg  = this.add.image(0, 0, 'dlg_restart').setDisplaySize(500, 240);
    const rcText = this.add.text(0, -50, '재시작 하시겠습니까?', {
      fontSize: '26px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);
    const rcYes = this._makePhaserBtn(-90, 50, 'btn_yes', 130, 55, () => this.scene.start('GameScene'));
    const rcNo  = this._makePhaserBtn( 90, 50, 'btn_no',  130, 55, () => {
      this.restartConfirm.setVisible(false);
      this.pauseContainer.setVisible(true);
    });
    this.restartConfirm.add([rcDlg, rcText, rcYes, rcNo]);

    // ── 게임오버 UI ───────────────────────────────────────────────
    this.gameoverContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setDepth(20).setVisible(false);
    const goOverlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);
    const goDlg     = this.add.image(0, 0, 'dlg_gameover').setDisplaySize(500, 400);

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

    // ── 토스트 ────────────────────────────────────────────────────
    this.toastImage = this.add.image(GAME_WIDTH / 2, 130, 'toast_speed')
      .setDisplaySize(560, 70).setDepth(30).setVisible(false);
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

  // ──────────────────────────────────────────────────────────── 도어

  _toggleLeftDoor() {
    if (this.isGameOver || this.isPaused) return;
    this.leftDoorOpen = !this.leftDoorOpen;
    // 도어 이미지: 닫혀있을 때 보임(갭을 채움), 열렸을 때 숨김(갭 노출)
    this.leftDoorImg.setVisible(!this.leftDoorOpen);
    SoundManager.door();
  }

  _toggleRightDoor() {
    if (this.isGameOver || this.isPaused) return;
    this.rightDoorOpen = !this.rightDoorOpen;
    this.rightDoorImg.setVisible(!this.rightDoorOpen);
    SoundManager.door();
  }

  // ──────────────────────────────────────────────────────────── 충돌

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
      this._incrementCombo();
    } else if (tag === 'RUBY') {
      this.score = Math.max(0, this.score + SCORE.SHARK_EAT_RUBY);
      this.hp    = Math.max(0, this.hp + HP_CHANGE.SHARK_EAT_RUBY);
      obj.destroy();
      this._sharkFace('hit');
      SoundManager.wrongEat();
      this._resetCombo();
    } else if (tag === 'TRASH') {
      this.score = Math.max(0, this.score + SCORE.SHARK_EAT_TRASH);
      this.hp    = Math.max(0, this.hp + HP_CHANGE.SHARK_EAT_TRASH);
      obj.destroy();
      this._sharkFace('hit');
      SoundManager.wrongEat();
      this._resetCombo();
    }
    this._updateScoreText();
  }

  _onBox1Hit(box, obj) {
    // 두 도어를 모두 통과해 좌측 끝까지 도달한 아이템 → 모두 패널티
    if (!obj.active) return;
    const tag = obj.getData('tag');
    obj.destroy();

    if (tag === 'FISH') {
      // 상어를 지나쳐 버린 물고기
      this.score = Math.max(0, this.score + SCORE.BOX_MISS_FISH); // -100
      this.hp    = Math.max(0, this.hp + HP_CHANGE.BOX_MISS_FISH); // -1
    } else {
      // RUBY / TRASH 가 좌측 끝까지 → 패널티
      this.score = Math.max(0, this.score - 70);
      this.hp    = Math.max(0, this.hp - 1);
    }
    SoundManager.wrong();
    this._resetCombo();
    this._updateScoreText();
  }

  // 도어 갭으로 낙하한 오브젝트 처리
  // door: 'left' = 보석 바구니 도어, 'right' = 쓰레기통 도어
  _onDoorCatch(obj, door) {
    if (!obj.active) return;
    const tag = obj.getData('tag');
    obj.destroy();

    if (door === 'left') {
      // ── 왼쪽 도어: 보석(루비) 전용 ──────────────────────
      if (tag === 'RUBY') {
        this.score += SCORE.BOX_CATCH_RUBY;       // +70
        this.thisGameRuby++;
        SoundManager.ruby();
      } else if (tag === 'FISH') {
        this.score = Math.max(0, this.score + SCORE.BOX_MISS_FISH); // -100
        this.hp    = Math.max(0, this.hp + HP_CHANGE.BOX_MISS_FISH); // -1
        SoundManager.wrong();
        this._resetCombo();
      } else if (tag === 'TRASH') {
        this.score = Math.max(0, this.score - 70); // 쓰레기가 보석 바구니에 → 패널티
        this.hp    = Math.max(0, this.hp - 1);
        SoundManager.wrong();
        this._resetCombo();
      }
    } else {
      // ── 오른쪽 도어: 쓰레기 전용 ────────────────────────
      if (tag === 'TRASH') {
        this.score += SCORE.BOX2_CATCH_TRASH;     // +70
        SoundManager.ruby();
      } else if (tag === 'FISH') {
        this.score = Math.max(0, this.score + SCORE.BOX_MISS_FISH); // -100
        this.hp    = Math.max(0, this.hp + HP_CHANGE.BOX_MISS_FISH); // -1
        SoundManager.wrong();
        this._resetCombo();
      } else if (tag === 'RUBY') {
        this.score = Math.max(0, this.score - 70); // 보석이 쓰레기통에 → 패널티
        this.hp    = Math.max(0, this.hp - 1);
        SoundManager.wrong();
        this._resetCombo();
      }
    }
    this._updateScoreText();
  }

  // ──────────────────────────────────────────────────────────── 스폰

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
    obj.setDepth(3);  // rail=2 위에, shark=4/UI=10 아래

    const railTop = SPAWN_Y - RAIL_H / 2;  // 레일 상단 Y = 461
    // 공식: bodyTop = spriteTop + offsetY_local * scaleY
    //       setOffset(x, 0) → bodyTop = spriteY - displayH/2 (= 시각적 상단)
    if (key.startsWith('fish')) {
      obj.setDisplaySize(130, 68);
      obj.setY(railTop - 34);  // y=427, spriteTop=393
      obj.setData('tag', 'FISH');
      obj.setData('fishType', parseInt(key.replace('fish', '')));
      // scaleY=0.5 (textureH=136), setSize(100,136) → bodyH=68, body=393~461
      obj.body.setSize(100, 136).setOffset(15, 0);
    } else if (key === 'ruby') {
      obj.setDisplaySize(70, 70);
      obj.setY(railTop - 35);  // y=426, spriteTop≈391
      obj.setData('tag', 'RUBY');
      // setOffset(0,0) → bodyTop=spriteTop≈391, 여유있게 setSize
      obj.body.setSize(60, 200).setOffset(5, 0);
    } else {
      obj.setDisplaySize(130, 65);
      obj.setY(railTop - 33);  // y=428, spriteTop≈395
      obj.setData('tag', 'TRASH');
      // setOffset(0,0) → bodyTop=spriteTop≈395, 여유있게 setSize
      obj.body.setSize(100, 200).setOffset(15, 0);
    }

    const newDiff = this._getDifficulty();
    this._spawnTimer = this.time.delayedCall(newDiff.interval, () => this._doSpawn(newDiff));
    this._checkToast(newDiff);
  }

  _checkToast(diff) {
    const idx = DIFFICULTY.indexOf(diff);
    if (idx > this._prevDiffIdx) {
      this._prevDiffIdx = idx;
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

  // ──────────────────────────────────────────────────────────── HP

  _drainHP() {
    if (this.isGameOver) return;
    this.hp = Math.max(0, this.hp - 1);
  }

  // ──────────────────────────────────────────────────────────── 콤보

  _incrementCombo() {
    this.combo++;
    this._showComboText();
  }

  _resetCombo() {
    if (this.combo > 0) {
      this.combo = 0;
      this.comboText.setVisible(false);
      if (this._comboTimer) { this._comboTimer.remove(); this._comboTimer = null; }
    }
  }

  _showComboText() {
    this.comboText.setText(`${this.combo} COMBO !`).setVisible(true);
    if (this._comboTimer) this._comboTimer.remove();
    this._comboTimer = this.time.delayedCall(2500, () => {
      this.comboText.setVisible(false);
    });
  }

  // ──────────────────────────────────────────────────────────── 상어 표정

  _sharkFace(state) {
    const key = state === 'eat' ? 'shark_eat' : state === 'hit' ? 'shark_hit' : 'shark';
    this.shark.setTexture(key);
    if (this._sharkFaceTimer) this._sharkFaceTimer.remove();
    this._sharkFaceTimer = this.time.delayedCall(300, () => {
      this.shark.setTexture('shark');
    });
  }

  _updateScoreText() {
    this.scoreText.setText(`Score : ${this.score.toLocaleString()}`);
  }

  // ──────────────────────────────────────────────────────────── 게임오버

  _triggerGameOver() {
    this.isGameOver = true;
    if (this._spawnTimer) this._spawnTimer.remove();
    this.sound.stopAll();
    SoundManager.gameOver();

    Save.setRubyAmount(Save.getRubyAmount() + this.thisGameRuby);
    for (let i = 1; i <= 4; i++) Save.setExp(i, this.exp[i]);
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      Save.setBestScore(this.bestScore);
    }

    this.gameoverContainer.setVisible(true);
    this.deadScoreText.setText(`Score : ${this.score.toLocaleString()}`);
    this.bestScoreText.setText(`Best : ${this.bestScore.toLocaleString()}`);
  }

  // ──────────────────────────────────────────────────────────── EXP

  _addExp(fishType) {
    if (!fishType || fishType > 4) return;
    const req = LEVEL_EXP_REQ[this.sharkLevel];
    if (!req) return;
    const maxExp = req[fishType - 1];
    if (maxExp <= 0) return;
    this.exp[fishType] = Math.min(this.exp[fishType] + 1, maxExp);
  }

  // ──────────────────────────────────────────────────────────── 일시정지

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

  // ──────────────────────────────────────────────────────────── update

  update(time, delta) {
    if (this.isGameOver) return;

    // HP 바 갱신
    this.hpBar.setTexture(`bar${Math.max(0, Math.min(12, this.hp))}`);

    if (this.hp <= 0) {
      this._triggerGameOver();
      return;
    }

    // 도어 갭 감지 (열린 도어 위치를 통과하는 오브젝트 처리)
    const dHW = DOOR_W / 2;
    this.objects.getChildren().forEach(obj => {
      if (!obj.active) return;
      if (this.leftDoorOpen &&
          obj.x >= LEFT_DOOR_X  - dHW && obj.x <= LEFT_DOOR_X  + dHW) {
        this._onDoorCatch(obj, 'left');
      } else if (this.rightDoorOpen &&
                 obj.x >= RIGHT_DOOR_X - dHW && obj.x <= RIGHT_DOOR_X + dHW) {
        this._onDoorCatch(obj, 'right');
      }
    });

    // 화면 밖 오브젝트 제거
    this.objects.getChildren().forEach(obj => {
      if (obj.x < -100) obj.destroy();
    });

    // 배경 그림자 애니메이션
    if (this.fishShadow.x > -200) {
      this.fishShadow.x -= delta * 0.15;
      this.fishShadow.y -= delta * 0.03;
    } else {
      this.fishShadow.x = GAME_WIDTH + 200;
      this.fishShadow.y = 300;
    }
  }
}

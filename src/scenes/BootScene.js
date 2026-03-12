import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // 로딩 바 배경
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const barBg = this.add.rectangle(w / 2, h / 2 + 60, 400, 20, 0x333333);
    const bar   = this.add.rectangle(w / 2 - 200, h / 2 + 60, 0, 20, 0x00aaff).setOrigin(0, 0.5);
    const label = this.add.text(w / 2, h / 2 + 90, 'Loading...', {
      fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);

    this.load.on('progress', (v) => {
      bar.width = 400 * v;
      label.setText(`Loading... ${Math.floor(v * 100)}%`);
    });

    // 오디오 디코딩 실패해도 로딩 계속 진행
    this.load.on('loaderror', (file) => {
      console.warn('Asset load failed (skipped):', file.key);
    });

    // 이미지
    this.load.image('bg',           'assets/images/bg/background.png');
    this.load.image('bg_fish',      'assets/images/bg/background_Fish.png');
    this.load.image('bg_nofish',    'assets/images/bg/background_noFish.png');

    this.load.image('shark',        'assets/images/shark.png');
    this.load.image('shark_eat',    'assets/images/shark_eat.png');
    this.load.image('shark_hit',    'assets/images/shark_hitted.png');

    this.load.image('fish01',       'assets/images/fish1.png');
    this.load.image('fish02',       'assets/images/fish1.png');
    this.load.image('fish03',       'assets/images/fish1.png');
    this.load.image('ruby',         'assets/images/ruby.png');
    this.load.image('trash01',      'assets/images/trash1.png');
    this.load.image('trash02',      'assets/images/trash2.png');
    this.load.image('trash03',      'assets/images/trash3.png');

    this.load.image('box1',         'assets/images/box1.png');
    this.load.image('box2',         'assets/images/box2.png');
    this.load.image('door',         'assets/images/door.png');
    this.load.image('table01',      'assets/images/Table01.png');
    this.load.image('table02',      'assets/images/Table02.png');
    this.load.image('table_cover',  'assets/images/table_cover.png');

    // HP 바
    for (let i = 0; i <= 12; i++) {
      this.load.image(`bar${i}`, `assets/images/bar/bar${i}.png`);
    }

    // UI
    this.load.image('title',        'assets/images/ui/AguAgu_title.png');
    this.load.image('icon',         'assets/images/ui/AguAgu_icon.png');
    this.load.image('pauseScreen',  'assets/images/ui/pauseScreen.png');
    this.load.image('shop_bg',      'assets/images/ui/shop_bg.png');
    this.load.image('shop_title',   'assets/images/ui/shop_title.png');

    this.load.image('btn_start',    'assets/images/ui/Button/StartBtn.png');
    this.load.image('btn_main',     'assets/images/ui/Button/MainBtn.png');
    this.load.image('btn_re',       'assets/images/ui/Button/ReBtn.png');
    this.load.image('btn_shop',     'assets/images/ui/Button/shopBtn.png');
    this.load.image('btn_pause',    'assets/images/ui/Button/pauseBtn.png');
    this.load.image('btn_go',       'assets/images/ui/Button/goBtn.png');
    this.load.image('btn_yes',      'assets/images/ui/Button/yesBtn.png');
    this.load.image('btn_no',       'assets/images/ui/Button/noBtn.png');
    this.load.image('btn_upgrade',  'assets/images/ui/Button/upgrade_btn.png');
    this.load.image('btn01',        'assets/images/ui/Button/btn01.png');
    this.load.image('btn02',        'assets/images/ui/Button/btn02.png');

    this.load.image('dlg_gameover', 'assets/images/ui/Dialog/gameover_dialog.png');
    this.load.image('dlg_gameend',  'assets/images/ui/Dialog/gameEndDialog.png');
    this.load.image('dlg_restart',  'assets/images/ui/Dialog/restartDialog.png');

    this.load.image('toast_fish',   'assets/images/ui/ToastMessage/newFish_toast.png');
    this.load.image('toast_trash',  'assets/images/ui/ToastMessage/newTrash_toast.png');
    this.load.image('toast_speed',  'assets/images/ui/ToastMessage/speedUp_toast.png');

    // 사운드
    this.load.audio('door_sound',       'assets/sounds/door_sound.wav');
    this.load.audio('ruby_sound',       'assets/sounds/ruby_sound.wav');
    this.load.audio('wrong_sound',      'assets/sounds/wrong_sound1.wav');
    this.load.audio('wrongEat_sound',   'assets/sounds/wrongEat_sound.wav');
    this.load.audio('fishEat_sound',    'assets/sounds/fishEat_sound.mp3');
    this.load.audio('trash_sound',      'assets/sounds/trash_sound.wav');
    this.load.audio('toast_sound',      'assets/sounds/toast_sound.wav');
    this.load.audio('gameover_sound',   'assets/sounds/gameover_sound.wav');
    this.load.audio('btn_sound',        'assets/sounds/btn_sound.wav');
    this.load.audio('bgm_start',        'assets/sounds/startBg_sound.mp3');
    this.load.audio('bgm_game',         'assets/sounds/background_sound.mp3');
    this.load.audio('bgm_shop',         'assets/sounds/shop_sound.mp3');
  }

  create() {
    this.scene.start('StartScene');
  }
}

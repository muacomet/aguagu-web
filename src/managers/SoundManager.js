// Phaser Scene을 받아 사용하는 사운드 매니저 (싱글턴 패턴)
let _scene = null;

export const SoundManager = {
  init(scene) {
    _scene = scene;
  },

  play(key, config = {}) {
    if (!_scene) return;
    try {
      _scene.sound.play(key, config);
    } catch (e) { /* 사운드 로드 실패 무시 */ }
  },

  door:       () => SoundManager.play('door_sound'),
  ruby:       () => SoundManager.play('ruby_sound'),
  wrong:      () => SoundManager.play('wrong_sound'),
  wrongEat:   () => SoundManager.play('wrongEat_sound'),
  fishEat:    () => SoundManager.play('fishEat_sound'),
  trash:      () => SoundManager.play('trash_sound'),
  toast:      () => SoundManager.play('toast_sound'),
  gameOver:   () => SoundManager.play('gameover_sound'),
  btnClick:   () => SoundManager.play('btn_sound'),
};

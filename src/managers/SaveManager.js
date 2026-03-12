// PlayerPrefs → localStorage 래퍼
const KEYS = {
  BEST_SCORE: 'BestScore',
  SHARK_LEVEL: 'SharkLevel',
  SHARK_EXP1: 'SharkExp1',
  SHARK_EXP2: 'SharkExp2',
  SHARK_EXP3: 'SharkExp3',
  SHARK_EXP4: 'SharkExp4',
  RUBY_AMOUNT: 'RubyAmount',
};

function getInt(key, defaultVal = 0) {
  const v = localStorage.getItem(key);
  return v !== null ? parseInt(v, 10) : defaultVal;
}

function setInt(key, value) {
  localStorage.setItem(key, String(value));
}

export const Save = {
  KEYS,
  getInt,
  setInt,

  getBestScore:   () => getInt(KEYS.BEST_SCORE),
  setBestScore:   (v) => setInt(KEYS.BEST_SCORE, v),

  getSharkLevel:  () => getInt(KEYS.SHARK_LEVEL),
  setSharkLevel:  (v) => setInt(KEYS.SHARK_LEVEL, v),

  getExp: (n) => getInt(KEYS[`SHARK_EXP${n}`]),
  setExp: (n, v) => setInt(KEYS[`SHARK_EXP${n}`], v),

  getRubyAmount:  () => getInt(KEYS.RUBY_AMOUNT),
  setRubyAmount:  (v) => setInt(KEYS.RUBY_AMOUNT, v),

  resetAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  },
};

// === إعداد namespace ===
window.QuizApp = window.QuizApp || {};

// === نظام الأحداث ===
QuizApp.Events = {
  _listeners: {},
  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
  },
  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
  },
  emit(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach(callback => callback(data));
  },
  once(event, callback) {
    const onceWrapper = (data) => {
      callback(data);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }
};

// === حالات اللعبة ===
QuizApp.States = {
  HOME: 'HOME',
  PLAYER_SETUP: 'PLAYER_SETUP',
  INTRO: 'INTRO',
  QUESTION_LOADING: 'QUESTION_LOADING',
  QUESTION_ACTIVE: 'QUESTION_ACTIVE',
  ANSWER_SELECTED: 'ANSWER_SELECTED',
  ANSWER_LOCKED: 'ANSWER_LOCKED',
  REVEALING_RESULT: 'REVEALING_RESULT',
  CORRECT_ANSWER: 'CORRECT_ANSWER',
  WRONG_ANSWER: 'WRONG_ANSWER',
  LIFELINE_ACTIVE: 'LIFELINE_ACTIVE',
  AUDIENCE_COUNTDOWN: 'AUDIENCE_COUNTDOWN',
  AUDIENCE_RESULT: 'AUDIENCE_RESULT',
  PHONE_COUNTDOWN: 'PHONE_COUNTDOWN',
  WALK_AWAY_CONFIRMATION: 'WALK_AWAY_CONFIRMATION',
  GAME_OVER: 'GAME_OVER',
  GRAND_PRIZE_WIN: 'GRAND_PRIZE_WIN'
};

// === إدارة التخزين المحلي ===
QuizApp.Storage = {
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving to storage', e);
    }
  },
  load(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error loading from storage', e);
      return null;
    }
  },
  remove(key) {
    localStorage.removeItem(key);
  },
  clear() {
    localStorage.clear();
  },
  
  saveGameState(state) {
    this.save('quizApp_gameState', state);
  },
  loadGameState() {
    return this.load('quizApp_gameState');
  },
  clearGameState() {
    this.remove('quizApp_gameState');
  },
  
  saveQuestions(questions) {
    this.save('quizApp_questions', questions);
  },
  loadQuestions() {
    return this.load('quizApp_questions');
  },
  
  saveSettings(settings) {
    this.save('quizApp_settings', settings);
  },
  loadSettings() {
    return this.load('quizApp_settings');
  }
};

// === أدوات مساعدة ===
QuizApp.Utils = {
  formatNumber(num) {
    if (num == null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },
  shuffleArray(arr) {
    const array = [...arr];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  },
  delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  },
  generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  },
  debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  },
  clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  },
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
};

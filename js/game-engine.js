window.QuizApp = window.QuizApp || {};

QuizApp.GameEngine = {
  // === الحالة ===
  state: null,
  currentQuestionIndex: 0,
  currentQuestion: null,
  selectedAnswer: null,
  lockedAnswer: null,
  score: 0,
  guaranteedScore: 0,
  playerName: '',
  playerTeam: '',
  playerAvatar: null,
  usedLifelines: { fiftyFifty1: false, fiftyFifty2: false, phoneAFriend: false, askAudience: false },
  eliminatedAnswers: [],
  usedQuestionIds: [],
  questions: [],
  settings: null,
  isTransitioning: false,

  // جدول الانتقالات المسموحة
  _validTransitions: {
    HOME: ['PLAYER_SETUP'],
    PLAYER_SETUP: ['INTRO', 'HOME'],
    INTRO: ['QUESTION_LOADING'],
    QUESTION_LOADING: ['QUESTION_ACTIVE'],
    QUESTION_ACTIVE: ['ANSWER_SELECTED', 'LIFELINE_ACTIVE', 'WALK_AWAY_CONFIRMATION', 'PHONE_COUNTDOWN', 'AUDIENCE_COUNTDOWN'],
    ANSWER_SELECTED: ['QUESTION_ACTIVE', 'ANSWER_LOCKED', 'LIFELINE_ACTIVE', 'WALK_AWAY_CONFIRMATION', 'PHONE_COUNTDOWN', 'AUDIENCE_COUNTDOWN'],
    ANSWER_LOCKED: ['REVEALING_RESULT'],
    REVEALING_RESULT: ['CORRECT_ANSWER', 'WRONG_ANSWER'],
    CORRECT_ANSWER: ['QUESTION_LOADING', 'GRAND_PRIZE_WIN'],
    WRONG_ANSWER: ['GAME_OVER'],
    LIFELINE_ACTIVE: ['QUESTION_ACTIVE', 'ANSWER_SELECTED'],
    AUDIENCE_COUNTDOWN: ['AUDIENCE_RESULT'],
    AUDIENCE_RESULT: ['QUESTION_ACTIVE', 'ANSWER_SELECTED'],
    PHONE_COUNTDOWN: ['QUESTION_ACTIVE', 'ANSWER_SELECTED'],
    WALK_AWAY_CONFIRMATION: ['QUESTION_ACTIVE', 'ANSWER_SELECTED', 'GAME_OVER'],
    GAME_OVER: ['HOME', 'PLAYER_SETUP'],
    GRAND_PRIZE_WIN: ['HOME', 'PLAYER_SETUP']
  },

  // === التهيئة ===
  async init() {
    await this.loadSettings();
    await this.loadQuestions();
    const savedState = QuizApp.Storage.loadGameState();
    if (savedState) {
      this.loadState(savedState);
    } else {
      this.setState(QuizApp.States.HOME);
    }
  },

  async loadQuestions() {
    let q = QuizApp.Storage.loadQuestions();
    if (!q) {
      try {
        const res = await fetch('data/questions.json');
        if (res.ok) {
          q = await res.json();
          QuizApp.Storage.saveQuestions(q);
        }
      } catch (e) {
        console.error('Error loading questions:', e);
      }
    }
    this.questions = q || [];
  },

  async loadSettings() {
    let s = QuizApp.Storage.loadSettings();
    if (!s) {
      try {
        const res = await fetch('data/settings.json');
        if (res.ok) {
          s = await res.json();
          QuizApp.Storage.saveSettings(s);
        }
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
    // Default settings if load fails
    this.settings = s || {
      questionCount: 15,
      prizes: [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000],
      safetyNets: [5, 10], // e.g. after question 5 (1000) and 10 (32000)
      difficultyLabels: { 1: 'سهل جدًا', 5: 'سهل', 10: 'متوسط', 15: 'صعب' }
    };
  },

  // === التحكم في الحالة ===
  setState(newState) {
    if (this.state === newState) return;
    
    // Allow initial state set or if transition is valid
    if (this.state && (!this._validTransitions[this.state] || !this._validTransitions[this.state].includes(newState))) {
      console.error(`Invalid transition from ${this.state} to ${newState}`);
      return;
    }

    const oldState = this.state;
    this.state = newState;
    QuizApp.Events.emit('stateChanged', { oldState, newState });
    this.saveState();
  },

  // === بدء لعبة جديدة ===
  startNewGame(playerName, playerTeam, playerAvatar) {
    this.resetGame();
    this.playerName = playerName || 'لاعب';
    this.playerTeam = playerTeam || '';
    this.playerAvatar = playerAvatar || null;
    this.setState(QuizApp.States.INTRO);
  },

  // === اختيار سؤال ===
  selectQuestionForLevel(level) {
    let targetDifficulty = level;

    // الأسئلة المتاحة لهذا المستوى (غير المستخدمة في هذه الجولة)
    let available = this.questions.filter(q =>
      q.enabled !== false &&
      q.difficulty === targetDifficulty &&
      !this.usedQuestionIds.includes(q.id)
    );

    // تفضيل الأسئلة التي لم تُستخدم مع المتسابقين السابقين (تدوير عبر الجولات)
    const recent = this._getRecentlyUsedIds();
    const fresh = available.filter(q => !recent.includes(q.id));
    if (fresh.length > 0) {
      available = fresh;
    }

    // في حال عدم وجود سؤال مطابق تمامًا، اختر الأقرب صعوبةً
    if (available.length === 0) {
      available = this.questions.filter(q =>
        q.enabled !== false &&
        !this.usedQuestionIds.includes(q.id)
      );
      available.sort((a, b) => Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty));
    }

    if (available.length > 0) {
      // اختر عشوائيًا من أفضل المطابقات صعوبةً
      const bestMatchDiff = available[0].difficulty;
      const bestMatches = available.filter(q => q.difficulty === bestMatchDiff);
      const selected = bestMatches[QuizApp.Utils.randomInt(0, bestMatches.length - 1)];
      this.usedQuestionIds.push(selected.id);
      this._rememberQuestionId(selected.id);
      // خلط ترتيب الإجابات لكل عرض حتى لا يصبح موقع الإجابة الصحيحة متوقعًا
      return this._shuffleQuestionAnswers(selected);
    }
    return null; // لا توجد أسئلة متبقية
  },

  // === خلط الإجابات ===
  // ينشئ نسخة من السؤال بإجابات مُعاد ترتيبها عشوائيًا مع تحديث الإجابة الصحيحة،
  // فيختفي أي نمط مثل "الإجابة الأطول أو الموقع الثابت هو الصحيح".
  _shuffleQuestionAnswers(question) {
    const letters = ['A', 'B', 'C', 'D'];
    // احتفظ فقط بالإجابات الموجودة فعليًا
    const entries = letters
      .filter(l => question.answers && question.answers[l] !== undefined && question.answers[l] !== '')
      .map(l => ({ letter: l, text: question.answers[l], isCorrect: l === question.correctAnswer }));

    if (entries.length < 2) return question; // لا حاجة للخلط

    const shuffled = QuizApp.Utils.shuffleArray(entries);
    const newAnswers = {};
    let newCorrect = question.correctAnswer;
    shuffled.forEach((entry, i) => {
      const newLetter = letters[i];
      newAnswers[newLetter] = entry.text;
      if (entry.isCorrect) newCorrect = newLetter;
    });

    return Object.assign({}, question, {
      answers: newAnswers,
      correctAnswer: newCorrect
    });
  },

  // === تدوير الأسئلة عبر الجولات المتعاقبة ===
  _RECENT_KEY: 'quizApp_recentQuestions',
  _RECENT_MAX: 60, // عدد الأسئلة التي نتجنب تكرارها قبل إعادة التدوير

  _getRecentlyUsedIds() {
    return QuizApp.Storage.load(this._RECENT_KEY) || [];
  },

  _rememberQuestionId(id) {
    let recent = this._getRecentlyUsedIds();
    recent = recent.filter(x => x !== id);
    recent.push(id);
    if (recent.length > this._RECENT_MAX) {
      recent = recent.slice(recent.length - this._RECENT_MAX);
    }
    QuizApp.Storage.save(this._RECENT_KEY, recent);
  },

  loadNextQuestion() {
    this.setState(QuizApp.States.QUESTION_LOADING);
    const question = this.selectQuestionForLevel(this.currentQuestionIndex + 1);
    if (question) {
      this.currentQuestion = question;
      // Small delay for UI
      setTimeout(() => {
        this.setState(QuizApp.States.QUESTION_ACTIVE);
        QuizApp.Events.emit('questionLoaded', this.currentQuestion);
      }, 1000);
    } else {
      console.error('No question found for level', this.currentQuestionIndex + 1);
    }
  },

  // === اختيار إجابة ===
  selectAnswer(letter) {
    if (this.isTransitioning) return;
    if (this.state !== QuizApp.States.QUESTION_ACTIVE && this.state !== QuizApp.States.ANSWER_SELECTED) return;
    if (this.eliminatedAnswers.includes(letter)) return;

    this.selectedAnswer = letter;
    this.setState(QuizApp.States.ANSWER_SELECTED);
    QuizApp.Events.emit('answerSelected', letter);
  },

  deselectAnswer() {
    if (this.isTransitioning || this.state !== QuizApp.States.ANSWER_SELECTED) return;
    this.selectedAnswer = null;
    this.setState(QuizApp.States.QUESTION_ACTIVE);
  },

  // === تثبيت الإجابة ===
  lockAnswer() {
    if (this.isTransitioning || this.state !== QuizApp.States.ANSWER_SELECTED || !this.selectedAnswer) return;
    this.isTransitioning = true;
    this.lockedAnswer = this.selectedAnswer;
    this.setState(QuizApp.States.ANSWER_LOCKED);
    QuizApp.Events.emit('answerLocked', this.lockedAnswer);
    // UIManager handles the reveal timing
    this.isTransitioning = false;
  },

  // === كشف النتيجة ===
  revealAnswer() {
    if (this.state !== QuizApp.States.REVEALING_RESULT) return;

    const correct = this.lockedAnswer === this.currentQuestion.correctAnswer;
    if (correct) {
      this.score = this.settings.prizes[this.currentQuestionIndex];
      if (this.settings.safetyNets.includes(this.currentQuestionIndex + 1)) {
        this.guaranteedScore = this.score;
      }
      this.setState(QuizApp.States.CORRECT_ANSWER);
    } else {
      this.setState(QuizApp.States.WRONG_ANSWER);
    }
    QuizApp.Events.emit('answerRevealed', { correct, correctLetter: this.currentQuestion.correctAnswer });
  },

  nextQuestion() {
    if (this.state !== QuizApp.States.CORRECT_ANSWER) return;
    this.currentQuestionIndex++;
    this.selectedAnswer = null;
    this.lockedAnswer = null;
    this.eliminatedAnswers = [];
    this.loadNextQuestion();
  },

  // === المساعدات ===
  useFiftyFifty(type) {
    if (this.usedLifelines[type]) return null;
    if (this.state !== QuizApp.States.QUESTION_ACTIVE && this.state !== QuizApp.States.ANSWER_SELECTED) return null;

    this.setState(QuizApp.States.LIFELINE_ACTIVE);
    const correct = this.currentQuestion.correctAnswer;
    const all = ['A', 'B', 'C', 'D'];
    const wrongAnswers = all.filter(a => a !== correct && !this.eliminatedAnswers.includes(a));
    
    const eliminate = QuizApp.Utils.shuffleArray(wrongAnswers).slice(0, 2);
    this.eliminatedAnswers.push(...eliminate);
    this.usedLifelines[type] = true;
    
    if (this.selectedAnswer && eliminate.includes(this.selectedAnswer)) {
      this.selectedAnswer = null;
    }

    QuizApp.Events.emit('lifelineUsed', { type: type, eliminated: eliminate });
    this.setState(this.selectedAnswer ? QuizApp.States.ANSWER_SELECTED : QuizApp.States.QUESTION_ACTIVE);
    return eliminate;
  },

  getAudienceVotes() {
    const diff = this.currentQuestion.difficulty;
    let correctRange;
    if (diff <= 3) correctRange = [60, 85];
    else if (diff <= 5) correctRange = [50, 70];
    else if (diff <= 8) correctRange = [35, 55];
    else if (diff <= 10) correctRange = [25, 45];
    else if (diff <= 12) correctRange = [20, 35];
    else if (diff <= 14) correctRange = [15, 30];
    else correctRange = [10, 25];

    let correctPerc = QuizApp.Utils.randomInt(correctRange[0], correctRange[1]);
    const remaining = 100 - correctPerc;
    
    const correctAns = this.currentQuestion.correctAnswer;
    const all = ['A', 'B', 'C', 'D'];
    let possibleWrong = all.filter(a => a !== correctAns && !this.eliminatedAnswers.includes(a));
    
    let votes = {};
    votes[correctAns] = correctPerc;
    
    if (possibleWrong.length === 1) {
      votes[possibleWrong[0]] = remaining;
    } else if (possibleWrong.length > 1) {
      let left = remaining;
      for (let i = 0; i < possibleWrong.length - 1; i++) {
        const max = Math.floor(left * 0.7);
        const share = QuizApp.Utils.randomInt(0, max);
        votes[possibleWrong[i]] = share;
        left -= share;
      }
      votes[possibleWrong[possibleWrong.length - 1]] = left;
    }

    this.eliminatedAnswers.forEach(ans => votes[ans] = 0);
    return votes;
  },

  // === الانسحاب ===
  walkAway() {
    if (this.state === QuizApp.States.ANSWER_LOCKED || this.state === QuizApp.States.REVEALING_RESULT) return;
    this.setState(QuizApp.States.GAME_OVER);
    QuizApp.Events.emit('walkAway', { score: this.score });
  },

  // === حفظ واستعادة الحالة ===
  saveState() {
    const s = {
      state: this.state,
      currentQuestionIndex: this.currentQuestionIndex,
      currentQuestion: this.currentQuestion,
      selectedAnswer: this.selectedAnswer,
      lockedAnswer: this.lockedAnswer,
      score: this.score,
      guaranteedScore: this.guaranteedScore,
      playerName: this.playerName,
      playerTeam: this.playerTeam,
      playerAvatar: this.playerAvatar,
      usedLifelines: this.usedLifelines,
      eliminatedAnswers: this.eliminatedAnswers,
      usedQuestionIds: this.usedQuestionIds
    };
    QuizApp.Storage.saveGameState(s);
  },

  loadState(saved) {
    Object.assign(this, saved);
    QuizApp.Events.emit('stateLoaded', this.state);
  },

  resetGame() {
    this.state = null;
    this.currentQuestionIndex = 0;
    this.currentQuestion = null;
    this.selectedAnswer = null;
    this.lockedAnswer = null;
    this.score = 0;
    this.guaranteedScore = 0;
    this.playerName = '';
    this.playerTeam = '';
    this.playerAvatar = null;
    this.usedLifelines = { fiftyFifty1: false, fiftyFifty2: false, phoneAFriend: false, askAudience: false };
    this.eliminatedAnswers = [];
    // لا نحدث usedQuestionIds لتجنب تكرار الأسئلة في الألعاب المتعاقبة لنفس الجلسة إذا أردنا ذلك،
    // لكن حسب المتطلبات إذا بدأت "لعبة جديدة" قد تريد تصفيرها. سنصفرها هنا:
    this.usedQuestionIds = [];
    this.isTransitioning = false;
    QuizApp.Storage.clearGameState();
  },

  // === مساعد: الحصول على معلومات ===
  getCurrentPrize() { return this.settings.prizes[this.currentQuestionIndex]; },
  getGuaranteedPrize() { return this.guaranteedScore; },
  getDifficultyLabel() { 
    return this.settings.difficultyLabels[this.currentQuestionIndex + 1] || 'غير محدد'; 
  },
  isLifelineUsed(type) { return this.usedLifelines[type]; },
  canUseLifeline() {
    return (this.state === QuizApp.States.QUESTION_ACTIVE || this.state === QuizApp.States.ANSWER_SELECTED) && !this.isTransitioning;
  },
  getWalkAwayAmount() { return this.score; },
  getGameOverAmount() { return this.guaranteedScore; }
};

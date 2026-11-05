QuizApp.PresenterMode = {
  isActive: false,
  visibleAnswers: [],  // الإجابات المعروضة حالياً
  
  init() {
    this.bindEvents();
    
    // ربط اختصار F8 لإظهار/إخفاء لوحة المقدم
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F8') {
        e.preventDefault();
        this.toggle();
      }
    });
  },
  
  bindEvents() {
    document.getElementById('btn-toggle-presenter')?.addEventListener('click', () => this.toggle());
    
    document.getElementById('pres-show-question')?.addEventListener('click', () => this.showQuestionOnly());
    
    document.getElementById('pres-show-answer-a')?.addEventListener('click', () => this.revealAnswer('A'));
    document.getElementById('pres-show-answer-b')?.addEventListener('click', () => this.revealAnswer('B'));
    document.getElementById('pres-show-answer-c')?.addEventListener('click', () => this.revealAnswer('C'));
    document.getElementById('pres-show-answer-d')?.addEventListener('click', () => this.revealAnswer('D'));
    
    document.getElementById('pres-lock-answer')?.addEventListener('click', () => this.lockSelectedAnswer());
    document.getElementById('pres-reveal-answer')?.addEventListener('click', () => this.revealCorrectAnswer());
    document.getElementById('pres-next-question')?.addEventListener('click', () => this.nextQuestion());
    
    document.getElementById('pres-5050')?.addEventListener('click', () => this.activate5050());
    document.getElementById('pres-phone')?.addEventListener('click', () => this.activatePhone());
    document.getElementById('pres-audience')?.addEventListener('click', () => this.activateAudience());
    
    document.getElementById('pres-play-suspense')?.addEventListener('click', () => this.playSuspense());
    document.getElementById('pres-stop-music')?.addEventListener('click', () => this.stopMusic());
    
    document.getElementById('pres-skip-question')?.addEventListener('click', () => this.skipQuestion());
    document.getElementById('pres-restart-question')?.addEventListener('click', () => this.restartQuestion());
    document.getElementById('pres-end-game')?.addEventListener('click', () => this.endGame());
  },
  
  toggle() {
    const panel = document.getElementById('presenter-panel');
    if (panel) {
      panel.classList.toggle('hidden');
      this.isActive = !panel.classList.contains('hidden');
    }
  },
  
  activate() {
    this.isActive = true;
    document.getElementById('presenter-panel')?.classList.remove('hidden');
  },
  
  deactivate() {
    this.isActive = false;
    document.getElementById('presenter-panel')?.classList.add('hidden');
  },
  
  updateInfo() {
    const ge = QuizApp.GameEngine;
    if (!ge.currentQuestion) return;
    
    const labels = {A:'أ', B:'ب', C:'ج', D:'د'};
    
    const correctAnswerElem = document.getElementById('pres-correct-answer');
    if (correctAnswerElem) {
      correctAnswerElem.textContent = labels[ge.currentQuestion.correctAnswer] + ': ' + ge.currentQuestion.answers[ge.currentQuestion.correctAnswer];
    }
    
    const currentLevelElem = document.getElementById('pres-current-level');
    if (currentLevelElem) {
      currentLevelElem.textContent = (ge.currentQuestionIndex + 1);
    }
    
    const currentPrizeElem = document.getElementById('pres-current-prize');
    if (currentPrizeElem) {
      currentPrizeElem.textContent = QuizApp.Utils.formatNumber(ge.getCurrentPrize()) + ' ' + ge.settings.currency;
    }
    
    const guaranteedPrizeElem = document.getElementById('pres-guaranteed-prize');
    if (guaranteedPrizeElem) {
      guaranteedPrizeElem.textContent = QuizApp.Utils.formatNumber(ge.getGuaranteedPrize()) + ' ' + ge.settings.currency;
    }
  },
  
  // في وضع المقدم: إظهار السؤال فقط بدون الإجابات
  showQuestionOnly() {
    const ge = QuizApp.GameEngine;
    if (!ge.currentQuestion) return;
    this.visibleAnswers = [];
    ['A','B','C','D'].forEach(l => {
      document.getElementById('answer-' + l)?.classList.add('hidden');
    });
    
    const questionText = document.getElementById('question-text');
    if (questionText) questionText.textContent = ge.currentQuestion.question;
    
    document.getElementById('question-box')?.classList.remove('hidden');
    if (QuizApp.SoundManager) QuizApp.SoundManager.play('questionAppear');
  },
  
  // إظهار إجابة واحدة في كل مرة
  revealAnswer(letter) {
    const btn = document.getElementById('answer-' + letter);
    if (btn) {
      btn.classList.remove('hidden');
      btn.classList.add('animate-reveal');
      if (!this.visibleAnswers.includes(letter)) {
        this.visibleAnswers.push(letter);
      }
    }
  },
  
  lockSelectedAnswer() {
    const ge = QuizApp.GameEngine;
    if (ge.selectedAnswer) {
      QuizApp.UIManager.handleLockAnswer();
    }
  },
  
  revealCorrectAnswer() {
    const ge = QuizApp.GameEngine;
    if (ge.state === QuizApp.States.ANSWER_LOCKED || ge.state === QuizApp.States.REVEALING_RESULT) {
      if (ge.revealAnswer) ge.revealAnswer();
    }
  },
  
  nextQuestion() {
    QuizApp.UIManager.handleNextQuestion();
  },
  
  activate5050() {
    QuizApp.UIManager.handleLifelineClick('fiftyFifty');
  },
  
  activatePhone() {
    QuizApp.UIManager.handleLifelineClick('phoneAFriend');
  },
  
  activateAudience() {
    QuizApp.UIManager.handleLifelineClick('askAudience');
  },
  
  playSuspense() {
    if (!QuizApp.SoundManager) return;
    const ge = QuizApp.GameEngine;
    const level = ge.currentQuestionIndex + 1;
    if (level <= 5) QuizApp.SoundManager.play('suspenseEasy', { loop: true });
    else if (level <= 10) QuizApp.SoundManager.play('suspenseMedium', { loop: true });
    else if (level <= 14) QuizApp.SoundManager.play('suspenseHard', { loop: true });
    else QuizApp.SoundManager.play('suspenseMillion', { loop: true });
  },
  
  stopMusic() {
    if (QuizApp.SoundManager) QuizApp.SoundManager.stopAll();
  },
  
  skipQuestion() {
    if (!confirm('هل أنت متأكد من تجاوز هذا السؤال؟')) return;
    if (QuizApp.GameEngine.loadNextQuestion) QuizApp.GameEngine.loadNextQuestion();
  },
  
  restartQuestion() {
    const ge = QuizApp.GameEngine;
    ge.selectedAnswer = null;
    ge.lockedAnswer = null;
    if (ge.setState) ge.setState(QuizApp.States.QUESTION_ACTIVE);
    if (QuizApp.UIManager.showQuestion) QuizApp.UIManager.showQuestion(ge.currentQuestion);
  },
  
  endGame() {
    if (!confirm('هل أنت متأكد من إنهاء الجولة؟')) return;
    if (QuizApp.GameEngine.walkAway) QuizApp.GameEngine.walkAway();
    if (QuizApp.UIManager.showGameOverScreen) QuizApp.UIManager.showGameOverScreen('walkaway');
  }
};

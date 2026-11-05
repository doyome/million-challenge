QuizApp.UIManager = {
  // === العناصر المخزنة مؤقتاً ===
  elements: {},
  bgCanvasContexts: {},
  bgAnimationFrames: {},
  phoneTimerInterval: null,
  audienceTimerInterval: null,
  
  // === التهيئة ===
  init() {
    this.cacheElements();
    this.bindEvents();
    this.initBackgrounds();
    this.listenToGameEvents();
  },
  
  cacheElements() {
    const ids = [
      'home-screen', 'player-setup-screen', 'intro-screen', 'game-screen', 'gameover-screen', 'grandprize-screen',
      'btn-start', 'btn-admin', 'btn-settings', 'btn-mute', 'btn-fullscreen', 'btn-reduce-motion',
      'player-name', 'team-name', 'player-avatar', 'btn-enter-game',
      'intro-player-name', 'intro-team-name', 'btn-begin-game',
      'game-player-name', 'ladder-levels',
      'question-number', 'question-difficulty', 'question-prize', 'question-text', 'question-box', 'question-image', 'question-image-container',
      'answer-A', 'answer-B', 'answer-C', 'answer-D',
      'answer-text-A', 'answer-text-B', 'answer-text-C', 'answer-text-D',
      'lock-answer-area', 'btn-lock-answer',
      'next-question-area', 'btn-next-question',
      'explanation-area', 'explanation-text',
      'lifeline-5050-1', 'lifeline-5050-2', 'lifeline-phone', 'lifeline-audience',
      'phone-overlay', 'phone-question-text', 'phone-answers-preview', 'phone-timer-text', 'btn-start-phone-timer', 'btn-end-phone',
      'audience-overlay', 'audience-voting', 'audience-results', 'audience-timer-text', 'btn-back-from-audience',
      'btn-walk-away', 'walkaway-overlay', 'walkaway-amount', 'btn-confirm-walkaway', 'btn-cancel-walkaway',
      'gameover-content',
      'gp-player-name', 'gp-amount', 'gp-currency',
      'btn-game-mute', 'admin-login-overlay', 'btn-admin-login-cancel',
      'btn-upload-avatar', 'btn-open-camera', 'camera-overlay', 'camera-video', 'camera-snapshot', 'camera-canvas',
      'btn-take-photo', 'btn-switch-camera', 'btn-use-photo', 'btn-retake-photo', 'btn-close-camera',
      'camera-actions-live', 'camera-actions-review'
    ];
    
    ids.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });
    
    // cache aliases for easier access
    this.elements.answerA = this.elements['answer-A'];
    this.elements.answerB = this.elements['answer-B'];
    this.elements.answerC = this.elements['answer-C'];
    this.elements.answerD = this.elements['answer-D'];
    this.elements.answerTextA = this.elements['answer-text-A'];
    this.elements.answerTextB = this.elements['answer-text-B'];
    this.elements.answerTextC = this.elements['answer-text-C'];
    this.elements.answerTextD = this.elements['answer-text-D'];
  },
  
  bindEvents() {
    this.elements['btn-start']?.addEventListener('click', () => this.showPlayerSetup());
    
    // Setup Screen
    this.elements['btn-upload-avatar']?.addEventListener('click', () => {
        this.elements['player-avatar']?.click();
    });
    this.elements['player-avatar']?.addEventListener('change', (e) => this.handleAvatarUpload(e));
    this.elements['btn-open-camera']?.addEventListener('click', () => this.openCamera());
    this.elements['btn-close-camera']?.addEventListener('click', () => this.closeCamera());
    this.elements['btn-take-photo']?.addEventListener('click', () => this.takePhoto());
    this.elements['btn-retake-photo']?.addEventListener('click', () => this.retakePhoto());
    this.elements['btn-use-photo']?.addEventListener('click', () => this.usePhoto());
    this.elements['btn-switch-camera']?.addEventListener('click', () => this.switchCamera());
    
    this.elements['player-name']?.addEventListener('input', (e) => {
      if (this.elements['btn-enter-game']) {
        this.elements['btn-enter-game'].disabled = !e.target.value.trim();
      }
    });
    this.elements['btn-enter-game']?.addEventListener('click', () => this.handleEnterGame());
    
    // Intro
    this.elements['btn-begin-game']?.addEventListener('click', () => this.handleBeginGame());
    
    // Game Answers
    ['A', 'B', 'C', 'D'].forEach(letter => {
      this.elements['answer-' + letter]?.addEventListener('click', () => this.handleAnswerClick(letter));
    });
    
    this.elements['btn-lock-answer']?.addEventListener('click', () => this.handleLockAnswer());
    this.elements['btn-next-question']?.addEventListener('click', () => this.handleNextQuestion());
    
    // Lifelines
    this.elements['lifeline-5050-1']?.addEventListener('click', () => this.handleLifelineClick('fiftyFifty1'));
    this.elements['lifeline-5050-2']?.addEventListener('click', () => this.handleLifelineClick('fiftyFifty2'));
    this.elements['lifeline-phone']?.addEventListener('click', () => this.handleLifelineClick('phoneAFriend'));
    this.elements['lifeline-audience']?.addEventListener('click', () => this.handleLifelineClick('askAudience'));
    
    // Phone Modal
    this.elements['btn-start-phone-timer']?.addEventListener('click', () => this.startPhoneTimer());
    this.elements['btn-end-phone']?.addEventListener('click', () => this.endPhoneCall());
    
    // Audience Modal
    this.elements['btn-back-from-audience']?.addEventListener('click', () => this.closeAudiencePanel());
    
    // Walkaway
    this.elements['btn-walk-away']?.addEventListener('click', () => this.handleWalkAway());
    this.elements['btn-confirm-walkaway']?.addEventListener('click', () => this.handleConfirmWalkaway());
    this.elements['btn-cancel-walkaway']?.addEventListener('click', () => this.handleCancelWalkaway());
    
    // Controls
    this.elements['btn-mute']?.addEventListener('click', () => this.toggleMute());
    this.elements['btn-game-mute']?.addEventListener('click', () => this.toggleMute());
    this.elements['btn-fullscreen']?.addEventListener('click', () => this.toggleFullscreen());
    this.elements['btn-reduce-motion']?.addEventListener('click', () => this.toggleReducedMotion());
    
    // Admin
    this.elements['btn-admin']?.addEventListener('click', () => this.showAdminLogin());
    this.elements['btn-admin-login-cancel']?.addEventListener('click', () => {
      if (this.elements['admin-login-overlay']) this.elements['admin-login-overlay'].classList.add('hidden');
    });
  },
  
  listenToGameEvents() {
    QuizApp.Events.on('stateChanged', (data) => this.handleStateChange(data));
    QuizApp.Events.on('questionLoaded', (data) => this.showQuestion(data));
  },
  
  // === إدارة الشاشات ===
  showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));
    
    const target = this.elements[screenId];
    if (target) {
      target.classList.add('active');
    }
  },
  
  // === الخلفيات المتحركة ===
  initBackgrounds() {
    const canvases = [
      { id: 'bg-canvas', theme: 'home' },
      { id: 'bg-canvas-setup', theme: 'setup' },
      { id: 'bg-canvas-intro', theme: 'intro' },
      { id: 'bg-canvas-game', theme: 'game' },
      { id: 'bg-canvas-gameover', theme: 'gameover' },
      { id: 'bg-canvas-grandprize', theme: 'grandprize' }
    ];
    
    canvases.forEach(item => {
      const canvas = document.getElementById(item.id);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      this.bgCanvasContexts[item.id] = ctx;
      
      const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', resize);
      resize();
      
      const animate = () => {
        if (!document.body.classList.contains('reduced-motion')) {
          this.drawBackground(canvas, ctx, item.theme);
        }
        this.bgAnimationFrames[item.id] = requestAnimationFrame(animate);
      };
      animate();
    });
  },
  
  // لوحات ألوان لكل مشهد لإضفاء طابع بصري احترافي
  _bgThemes: {
    home:       { top: '#16235f', glow: 'rgba(46,139,255,0.20)', ray: '46,139,255',  particle: '255,212,92' },
    setup:      { top: '#12184a', glow: 'rgba(46,139,255,0.16)', ray: '46,139,255',  particle: '223,230,255' },
    intro:      { top: '#241259', glow: 'rgba(255,212,92,0.18)',  ray: '255,212,92',  particle: '255,212,92' },
    game:       { top: '#0e1748', glow: 'rgba(46,139,255,0.14)', ray: '46,139,255',  particle: '46,139,255' },
    gameover:   { top: '#3a1030', glow: 'rgba(255,59,92,0.16)',   ray: '255,59,92',   particle: '255,120,140' },
    grandprize: { top: '#3a2e0a', glow: 'rgba(255,212,92,0.28)',  ray: '255,212,92',  particle: '255,212,92' }
  },

  _bgParticles: {},

  drawBackground(canvas, ctx, theme) {
    const w = canvas.width, h = canvas.height;
    const time = Date.now() * 0.001;
    const cfg = this._bgThemes[theme] || this._bgThemes.game;

    // تدرّج عمودي فخم كخلفية
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, cfg.top);
    grad.addColorStop(1, '#050a24');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // توهج علوي مركزي (بقعة إضاءة المسرح)
    const cx = w / 2;
    const glow = ctx.createRadialGradient(cx, h * 0.15, 0, cx, h * 0.15, Math.max(w, h) * 0.7);
    glow.addColorStop(0, cfg.glow);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // أشعة ضوئية دوّارة خفيفة تنبثق من الأعلى
    ctx.save();
    ctx.translate(cx, h * 0.1);
    ctx.globalCompositeOperation = 'lighter';
    const rays = 10;
    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * Math.PI * 2 + time * 0.06;
      ctx.save();
      ctx.rotate(angle);
      const rg = ctx.createLinearGradient(0, 0, 0, Math.max(w, h));
      rg.addColorStop(0, `rgba(${cfg.ray}, 0.05)`);
      rg.addColorStop(1, 'transparent');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-40, Math.max(w, h));
      ctx.lineTo(40, Math.max(w, h));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // جسيمات عائمة لامعة
    const key = canvas.id;
    if (!this._bgParticles[key] || this._bgParticles[key].w !== w) {
      const arr = [];
      const count = Math.min(70, Math.floor(w * h / 26000));
      for (let i = 0; i < count; i++) {
        arr.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.8 + 0.5,
          sp: Math.random() * 0.25 + 0.05,
          ph: Math.random() * Math.PI * 2
        });
      }
      this._bgParticles[key] = { w, list: arr };
    }

    ctx.globalCompositeOperation = 'lighter';
    this._bgParticles[key].list.forEach(p => {
      p.y -= p.sp;
      if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
      const twinkle = 0.35 + 0.35 * Math.sin(time * 2 + p.ph);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cfg.particle}, ${twinkle})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  },
  
  // === الشاشة الرئيسية ===
  showHomeScreen() {
    this.showScreen('home-screen');
    QuizApp.SoundManager.play('bgHome', { loop: true });
  },
  
  // === شاشة إدخال المتسابق ===
  showPlayerSetup() {
    this.showScreen('player-setup-screen');
  },
  
  // === الكاميرا والصورة ===
  currentStream: null,
  facingMode: 'user',
  isFrontCamera: true,
  videoDevices: [],
  currentDeviceIndex: 0,
  playerImageData: null,

  handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.playerImageData = ev.target.result;
        this.updateAvatarPreview();
      };
      reader.readAsDataURL(file);
    }
  },

  async openCamera() {
    this.elements['camera-overlay']?.classList.remove('hidden');
    this.elements['camera-video']?.classList.remove('hidden');
    this.elements['camera-snapshot']?.classList.add('hidden');
    this.elements['camera-actions-live']?.classList.remove('hidden');
    this.elements['camera-actions-review']?.classList.add('hidden');

    // ابدأ بالكاميرا الأمامية افتراضيًا
    await this._startStream({ video: { facingMode: this.facingMode }, audio: false });
  },

  // تشغيل تدفق الكاميرا بقيود محددة مع تحديث قائمة الكاميرات المتاحة
  async _startStream(constraints) {
    try {
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => track.stop());
      }
      this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);

      const video = this.elements['camera-video'];
      if (video) {
        video.srcObject = this.currentStream;
        video.setAttribute('playsinline', '');
      }

      // حدد إن كانت الكاميرا الحالية أمامية لضبط انعكاس الصورة
      const track = this.currentStream.getVideoTracks()[0];
      const settings = track && track.getSettings ? track.getSettings() : {};
      this.isFrontCamera = settings.facingMode
        ? settings.facingMode === 'user'
        : (this.facingMode === 'user');
      video?.classList.toggle('mirrored', this.isFrontCamera);

      // تعداد الكاميرات المتاحة (يتوفر بعد منح الإذن)
      await this._enumerateCameras(track);
    } catch (err) {
      console.error('Error accessing camera:', err);
      this.showToast('تعذر الوصول إلى الكاميرا. يرجى رفع صورة من الجهاز.', 'error');
      this.closeCamera();
    }
  },

  async _enumerateCameras(activeTrack) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.videoDevices = devices.filter(d => d.kind === 'videoinput');

      // زامن الفهرس الحالي مع الكاميرا العاملة
      if (activeTrack && activeTrack.getSettings) {
        const activeId = activeTrack.getSettings().deviceId;
        const idx = this.videoDevices.findIndex(d => d.deviceId === activeId);
        if (idx >= 0) this.currentDeviceIndex = idx;
      }

      // أخفِ زر التبديل إن وُجدت كاميرا واحدة فقط
      const btn = this.elements['btn-switch-camera'];
      if (btn) btn.style.display = this.videoDevices.length > 1 ? '' : 'none';
    } catch (e) {
      console.warn('enumerateDevices failed', e);
    }
  },

  closeCamera() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    this.elements['camera-overlay']?.classList.add('hidden');
  },

  async switchCamera() {
    // الطريقة الأكثر موثوقية: التنقل بين أجهزة الكاميرا الفعلية بالمعرّف
    if (this.videoDevices && this.videoDevices.length > 1) {
      this.currentDeviceIndex = (this.currentDeviceIndex + 1) % this.videoDevices.length;
      const dev = this.videoDevices[this.currentDeviceIndex];
      await this._startStream({ video: { deviceId: { exact: dev.deviceId } }, audio: false });
      return;
    }

    // خطة بديلة: تبديل الاتجاه (أمامية/خلفية) بشكل صريح
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    try {
      await this._startStream({ video: { facingMode: { exact: this.facingMode } }, audio: false });
    } catch (e) {
      // بعض الأجهزة لا تدعم exact، جرّب الوضع المرن
      await this._startStream({ video: { facingMode: this.facingMode }, audio: false });
    }
  },

  takePhoto() {
    const video = this.elements['camera-video'];
    const canvas = this.elements['camera-canvas'];
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    // اعكس الصورة أفقيًا فقط في حالة الكاميرا الأمامية
    if (this.isFrontCamera) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    const snapshot = this.elements['camera-snapshot'];
    if (snapshot) {
      snapshot.src = dataUrl;
      snapshot.classList.remove('hidden');
      video.classList.add('hidden');
    }
    
    this.elements['camera-actions-live']?.classList.add('hidden');
    this.elements['camera-actions-review']?.classList.remove('hidden');
  },

  retakePhoto() {
    this.elements['camera-video']?.classList.remove('hidden');
    this.elements['camera-snapshot']?.classList.add('hidden');
    this.elements['camera-actions-live']?.classList.remove('hidden');
    this.elements['camera-actions-review']?.classList.add('hidden');
  },

  usePhoto() {
    const snapshot = this.elements['camera-snapshot'];
    if (snapshot && snapshot.src) {
      this.playerImageData = snapshot.src;
      this.updateAvatarPreview();
    }
    this.closeCamera();
  },

  updateAvatarPreview() {
    if (!this.playerImageData) return;
    const img = this.elements['avatar-img'];
    const placeholder = document.querySelector('.avatar-placeholder');
    if (img) {
      img.src = this.playerImageData;
      img.classList.remove('hidden');
    }
    if (placeholder) {
      placeholder.classList.add('hidden');
    }
    // Update game engine state
    QuizApp.GameEngine.playerAvatar = this.playerImageData;
    // Update small avatars
    const smallAvatars = document.querySelectorAll('.player-avatar-small');
    smallAvatars.forEach(container => {
      container.innerHTML = `<img src="${this.playerImageData}" style="width:100%; height:100%; object-fit:cover;">`;
    });
  },

  handleEnterGame() {
    const nameInput = this.elements['player-name'];
    const teamInput = this.elements['team-name'];
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) return;
    const team = teamInput ? teamInput.value.trim() : '';

    QuizApp.GameEngine.startNewGame(name, team, this.playerImageData || null);
  },
  
  // === شاشة الترحيب ===
  showIntroScreen() {
    this.showScreen('intro-screen');
    if (this.elements['intro-player-name']) {
      this.elements['intro-player-name'].textContent = QuizApp.GameEngine.playerName;
    }
    if (this.elements['intro-team-name'] && QuizApp.GameEngine.playerTeam) {
      this.elements['intro-team-name'].textContent = 'فريق: ' + QuizApp.GameEngine.playerTeam;
      this.elements['intro-team-name'].classList.remove('hidden');
    }
    QuizApp.SoundManager.play('playerEntry');
  },
  
  handleBeginGame() {
    QuizApp.GameEngine.loadNextQuestion();
  },
  
  // === شاشة اللعب ===
  showGameScreen() {
    this.showScreen('game-screen');
    this.updatePlayerInfo();
    this.buildPrizeLadder();
    this.updateLifelineButtons();
  },
  
  // === سلم الجوائز ===
  buildPrizeLadder() {
    const container = this.elements['ladder-levels'];
    if (!container) return;
    container.innerHTML = '';
    const prizes = QuizApp.GameEngine.settings.prizes;
    const safetyNets = QuizApp.GameEngine.settings.safetyNets;
    
    for (let i = prizes.length - 1; i >= 0; i--) {
      const level = i + 1;
      const div = document.createElement('div');
      div.className = 'ladder-level';
      div.id = 'ladder-level-' + level;
      div.dataset.level = level;
      if (safetyNets.includes(level)) div.classList.add('safety-net');
      div.innerHTML = `
        <div class="ladder-indicator">▶</div>
        <span class="level-number">${level}</span>
        <span class="level-prize">${QuizApp.Utils.formatNumber(prizes[i])} ${QuizApp.GameEngine.settings.currency}</span>
      `;
      container.appendChild(div);
    }
  },
  
  updatePrizeLadder() {
    const currentLevel = QuizApp.GameEngine.currentQuestionIndex + 1;
    document.querySelectorAll('.ladder-level').forEach(el => {
      const level = parseInt(el.dataset.level);
      el.classList.remove('current', 'passed', 'upcoming');
      if (level === currentLevel) el.classList.add('current');
      else if (level < currentLevel) el.classList.add('passed');
      else el.classList.add('upcoming');
    });
  },
  
  // === عرض السؤال ===
  async showQuestion(question) {
    const ge = QuizApp.GameEngine;
    
    if (this.elements['question-number']) this.elements['question-number'].textContent = `السؤال ${ge.currentQuestionIndex + 1}`;
    if (this.elements['question-difficulty']) this.elements['question-difficulty'].textContent = ge.getDifficultyLabel();
    if (this.elements['question-prize']) this.elements['question-prize'].textContent = `${QuizApp.Utils.formatNumber(ge.getCurrentPrize())} ${ge.settings.currency}`;
    
    if (this.elements['question-text']) {
      this.elements['question-text'].textContent = question.question;
      this.elements['question-box']?.classList.add('animate-fade-in');
    }
    
    if (question.image && this.elements['question-image']) {
      this.elements['question-image'].src = question.image;
      this.elements['question-image-container']?.classList.remove('hidden');
    } else if (this.elements['question-image-container']) {
      this.elements['question-image-container'].classList.add('hidden');
    }
    
    const answers = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < answers.length; i++) {
      const letter = answers[i];
      const btn = this.elements['answer' + letter];
      const text = this.elements['answerText' + letter];
      
      if (text) text.textContent = question.answers[letter];
      if (btn) {
        btn.classList.remove('hidden', 'selected', 'locked', 'correct', 'wrong', 'eliminated', 'collapsed');
        btn.disabled = false;
        
        if (ge.eliminatedAnswers.includes(letter)) {
          btn.classList.add('eliminated');
          btn.disabled = true;
        }
        
        btn.style.animationDelay = (i * 0.15) + 's';
        btn.classList.add('animate-reveal');
      }
    }
    
    this.updatePrizeLadder();
    
    if (this.elements['lock-answer-area']) this.elements['lock-answer-area'].classList.add('hidden');
    if (this.elements['next-question-area']) this.elements['next-question-area'].classList.add('hidden');
    if (this.elements['explanation-area']) this.elements['explanation-area'].classList.add('hidden');
    
    QuizApp.SoundManager.stopAll();
    QuizApp.SoundManager.play('questionAppear');
    
    const level = ge.currentQuestionIndex + 1;
    await QuizApp.Utils.delay(1500);
    
    if (level <= 5) QuizApp.SoundManager.play('suspenseEasy', { loop: true });
    else if (level <= 10) QuizApp.SoundManager.play('suspenseMedium', { loop: true });
    else if (level <= 14) QuizApp.SoundManager.play('suspenseHard', { loop: true });
    else QuizApp.SoundManager.play('suspenseMillion', { loop: true });
  },
  
  // === اختيار إجابة ===
  handleAnswerClick(letter) {
    const ge = QuizApp.GameEngine;
    if (ge.isTransitioning) return;
    if (ge.eliminatedAnswers.includes(letter)) return;
    
    document.querySelectorAll('.answer-btn').forEach(btn => btn.classList.remove('selected'));
    
    const btn = this.elements['answer' + letter];
    if (btn) btn.classList.add('selected');
    
    ge.selectAnswer(letter);
    QuizApp.SoundManager.play('selectAnswer');
    
    if (ge.settings.confirmLock && this.elements['lock-answer-area']) {
      this.elements['lock-answer-area'].classList.remove('hidden');
    } else {
      this.handleLockAnswer();
    }
  },
  
  // === تثبيت الإجابة ===
  async handleLockAnswer() {
    const ge = QuizApp.GameEngine;
    if (ge.isTransitioning) return;
    if (!ge.selectedAnswer) return;
    
    ge.lockAnswer();
    QuizApp.SoundManager.play('lockAnswer');
    
    if (this.elements['lock-answer-area']) this.elements['lock-answer-area'].classList.add('hidden');
    
    const btn = this.elements['answer' + ge.lockedAnswer];
    if (btn) {
      btn.classList.remove('selected');
      btn.classList.add('locked');
    }
    
    QuizApp.SoundManager.stop('suspenseEasy');
    QuizApp.SoundManager.stop('suspenseMedium');
    QuizApp.SoundManager.stop('suspenseHard');
    QuizApp.SoundManager.stop('suspenseMillion');
    QuizApp.SoundManager.play('suspenseReveal');
    
    ge.setState(QuizApp.States.REVEALING_RESULT);
    await QuizApp.Utils.delay(ge.settings.revealDelay * 1000);
    ge.revealAnswer();
  },
  
  // === عرض النتيجة ===
  showCorrectAnswer() {
    const ge = QuizApp.GameEngine;
    const correctLetter = ge.currentQuestion.correctAnswer;
    const btn = this.elements['answer' + correctLetter];
    
    QuizApp.SoundManager.stop('suspenseReveal');
    QuizApp.SoundManager.play('correct');
    
    if (btn) {
      btn.classList.remove('locked');
      btn.classList.add('correct');
    }
    
    this.updatePrizeLadder();
    
    const currentLevel = ge.currentQuestionIndex + 1;
    const levelEl = document.getElementById('ladder-level-' + currentLevel);
    if (levelEl) levelEl.classList.add('achieved');
    
    if (ge.settings.safetyNets.includes(currentLevel)) {
      QuizApp.SoundManager.play('safetyNet');
    }
    
    if (ge.currentQuestion.explanation && this.elements['explanation-text']) {
      this.elements['explanation-text'].textContent = ge.currentQuestion.explanation;
      if (this.elements['explanation-area']) this.elements['explanation-area'].classList.remove('hidden');
    }
    
    if (currentLevel >= ge.settings.questionCount) {
      setTimeout(() => ge.setState(QuizApp.States.GRAND_PRIZE_WIN), 3000);
    } else {
      if (ge.settings.autoAdvance) {
        setTimeout(() => this.handleNextQuestion(), 3000);
      } else if (this.elements['next-question-area']) {
        this.elements['next-question-area'].classList.remove('hidden');
      }
    }
  },
  
  showWrongAnswer() {
    const ge = QuizApp.GameEngine;
    const wrongLetter = ge.lockedAnswer;
    const correctLetter = ge.currentQuestion.correctAnswer;
    
    QuizApp.SoundManager.stop('suspenseReveal');
    QuizApp.SoundManager.play('wrong');
    
    const wrongBtn = this.elements['answer' + wrongLetter];
    if (wrongBtn) wrongBtn.classList.add('wrong');
    
    const correctBtn = this.elements['answer' + correctLetter];
    if (correctBtn) correctBtn.classList.add('correct');
    
    const expText = this.elements['explanation-text'];
    const expArea = this.elements['explanation-area'];
    if (expText && expArea) {
      expText.innerHTML = `<strong>إجابة غير صحيحة!</strong><br>${ge.currentQuestion.explanation || ''}`;
      expArea.classList.remove('hidden');
    }
    
    setTimeout(() => this.showGameOverScreen('wrong'), 4500);
  },
  
  // === السؤال التالي ===
  handleNextQuestion() {
    QuizApp.SoundManager.play('nextQuestion');
    QuizApp.GameEngine.nextQuestion();
  },
  
  // === المساعدات ===
  handleLifelineClick(type) {
    const ge = QuizApp.GameEngine;
    if (ge.isTransitioning) return;
    if (ge.isLifelineUsed(type)) return;
    if (!ge.canUseLifeline()) return;
    
    switch(type) {
      case 'fiftyFifty1':
      case 'fiftyFifty2':
        this.activateFiftyFifty(type); break;
      case 'phoneAFriend': this.activatePhoneAFriend(); break;
      case 'askAudience': this.activateAskAudience(); break;
    }
  },
  
  activateFiftyFifty(type) {
    const eliminated = QuizApp.GameEngine.useFiftyFifty(type);
    if (!eliminated) return;
    QuizApp.SoundManager.play('fiftyFifty');
    
    eliminated.forEach((letter, i) => {
      setTimeout(() => {
        const btn = this.elements['answer' + letter];
        if (btn) {
          btn.classList.add('eliminated', 'collapsed');
          btn.disabled = true;
        }
      }, i * 500);
    });
    
    this.updateLifelineButtons();
  },
  
  activatePhoneAFriend() {
    const ge = QuizApp.GameEngine;
    ge.usedLifelines.phoneAFriend = true;
    QuizApp.SoundManager.play('phoneAFriend');
    
    if (this.elements['phone-overlay']) this.elements['phone-overlay'].classList.remove('hidden');
    if (this.elements['phone-question-text']) this.elements['phone-question-text'].textContent = ge.currentQuestion.question;
    
    const answersHtml = ['A','B','C','D'].map(l => {
      if (ge.eliminatedAnswers.includes(l)) return '';
      const labels = {A:'أ', B:'ب', C:'ج', D:'د'};
      return `<span class="preview-answer">${labels[l]}: ${ge.currentQuestion.answers[l]}</span>`;
    }).join('');
    
    if (this.elements['phone-answers-preview']) this.elements['phone-answers-preview'].innerHTML = answersHtml;
    
    if (this.elements['phone-timer-text']) this.elements['phone-timer-text'].textContent = ge.settings.phoneDuration;
    this.resetTimerCircle('phone');
    
    this.updateLifelineButtons();
    ge.setState(QuizApp.States.PHONE_COUNTDOWN);
  },
  
  startPhoneTimer() {
    const ge = QuizApp.GameEngine;
    let remaining = ge.settings.phoneDuration;
    const total = remaining;
    
    if (this.elements['btn-start-phone-timer']) this.elements['btn-start-phone-timer'].disabled = true;
    
    this.phoneTimerInterval = setInterval(() => {
      remaining--;
      if (this.elements['phone-timer-text']) this.elements['phone-timer-text'].textContent = remaining;
      this.updateTimerCircle('phone', remaining, total);
      
      if (ge.settings.countdownSound) {
        QuizApp.SoundManager.playCountdownTick(remaining);
      }
      
      if (remaining <= 0) {
        clearInterval(this.phoneTimerInterval);
        QuizApp.SoundManager.play('audienceResult');
        this.endPhoneCall();
      }
    }, 1000);
  },
  
  endPhoneCall() {
    clearInterval(this.phoneTimerInterval);
    if (this.elements['phone-overlay']) this.elements['phone-overlay'].classList.add('hidden');
    if (this.elements['btn-start-phone-timer']) this.elements['btn-start-phone-timer'].disabled = false;
    
    const ge = QuizApp.GameEngine;
    if (ge.selectedAnswer) {
      ge.setState(QuizApp.States.ANSWER_SELECTED);
    } else {
      ge.setState(QuizApp.States.QUESTION_ACTIVE);
    }
  },
  
  activateAskAudience() {
    const ge = QuizApp.GameEngine;
    ge.usedLifelines.askAudience = true;
    QuizApp.SoundManager.play('audienceVoting', { loop: true });
    
    if (this.elements['audience-overlay']) this.elements['audience-overlay'].classList.remove('hidden');
    if (this.elements['audience-voting']) this.elements['audience-voting'].classList.remove('hidden');
    if (this.elements['audience-results']) this.elements['audience-results'].classList.add('hidden');
    if (this.elements['btn-back-from-audience']) this.elements['btn-back-from-audience'].classList.add('hidden');
    
    ge.setState(QuizApp.States.AUDIENCE_COUNTDOWN);
    
    let remaining = ge.settings.audienceDuration;
    const total = remaining;
    if (this.elements['audience-timer-text']) this.elements['audience-timer-text'].textContent = remaining;
    this.resetTimerCircle('audience');
    
    this.audienceTimerInterval = setInterval(() => {
      remaining--;
      if (this.elements['audience-timer-text']) this.elements['audience-timer-text'].textContent = remaining;
      this.updateTimerCircle('audience', remaining, total);
      
      if (remaining <= 5 && ge.settings.countdownSound) {
        QuizApp.SoundManager.playCountdownTick(remaining);
      }
      
      if (remaining <= 0) {
        clearInterval(this.audienceTimerInterval);
        this.showAudienceResults();
      }
    }, 1000);
    
    this.updateLifelineButtons();
  },
  
  showAudienceResults() {
    QuizApp.SoundManager.stop('audienceVoting');
    QuizApp.SoundManager.play('audienceResult');
    
    const votes = QuizApp.GameEngine.getAudienceVotes();
    
    if (this.elements['audience-voting']) this.elements['audience-voting'].classList.add('hidden');
    if (this.elements['audience-results']) this.elements['audience-results'].classList.remove('hidden');
    if (this.elements['btn-back-from-audience']) this.elements['btn-back-from-audience'].classList.remove('hidden');
    
    ['A','B','C','D'].forEach((letter, i) => {
      const bar = document.getElementById('bar-' + letter);
      const percent = document.getElementById('percent-' + letter);
      const value = votes[letter] || 0;
      setTimeout(() => {
        if (bar) bar.style.height = value + '%';
        if (percent) percent.textContent = value + '%';
      }, i * 200);
    });
    
    QuizApp.GameEngine.setState(QuizApp.States.AUDIENCE_RESULT);
  },
  
  closeAudiencePanel() {
    if (this.elements['audience-overlay']) this.elements['audience-overlay'].classList.add('hidden');
    const ge = QuizApp.GameEngine;
    if (ge.selectedAnswer) {
      ge.setState(QuizApp.States.ANSWER_SELECTED);
    } else {
      ge.setState(QuizApp.States.QUESTION_ACTIVE);
    }
  },
  
  // === مؤقت SVG ===
  resetTimerCircle(type) {
    const progress = document.getElementById(type + '-timer-progress');
    if (progress) {
      progress.style.strokeDashoffset = '0';
    }
  },
  
  updateTimerCircle(type, remaining, total) {
    const progress = document.getElementById(type + '-timer-progress');
    if (progress) {
      const circumference = 2 * Math.PI * 45;
      const offset = circumference * (1 - remaining / total);
      progress.style.strokeDasharray = circumference;
      progress.style.strokeDashoffset = offset;
    }
    const circle = document.getElementById(type + '-timer-circle');
    if (circle) {
      if (remaining <= 5) circle.classList.add('urgent');
      else circle.classList.remove('urgent');
    }
  },
  
  // === الانسحاب ===
  handleWalkAway() {
    const ge = QuizApp.GameEngine;
    if (ge.isTransitioning) return;
    if (ge.state === QuizApp.States.ANSWER_LOCKED || ge.state === QuizApp.States.REVEALING_RESULT) return;
    
    if (this.elements['walkaway-amount']) this.elements['walkaway-amount'].textContent = QuizApp.Utils.formatNumber(ge.getWalkAwayAmount()) + ' ' + ge.settings.currency;
    if (this.elements['walkaway-overlay']) this.elements['walkaway-overlay'].classList.remove('hidden');
    ge.setState(QuizApp.States.WALK_AWAY_CONFIRMATION);
  },
  
  handleConfirmWalkaway() {
    QuizApp.SoundManager.stopAll();
    QuizApp.SoundManager.play('walkAway');
    QuizApp.GameEngine.walkAway();
    if (this.elements['walkaway-overlay']) this.elements['walkaway-overlay'].classList.add('hidden');
    this.showGameOverScreen('walkaway');
  },
  
  handleCancelWalkaway() {
    if (this.elements['walkaway-overlay']) this.elements['walkaway-overlay'].classList.add('hidden');
    const ge = QuizApp.GameEngine;
    if (ge.selectedAnswer) {
      ge.setState(QuizApp.States.ANSWER_SELECTED);
    } else {
      ge.setState(QuizApp.States.QUESTION_ACTIVE);
    }
  },
  
  // === تحديث المساعدات ===
  updateLifelineButtons() {
    const ge = QuizApp.GameEngine;
    ['fiftyFifty1', 'fiftyFifty2', 'phoneAFriend', 'askAudience'].forEach(type => {
      const map = { fiftyFifty1: '5050-1', fiftyFifty2: '5050-2', phoneAFriend: 'phone', askAudience: 'audience' };
      const btn = this.elements['lifeline-' + map[type]];
      if (btn) {
        const mark = btn.querySelector('.lifeline-used-mark');
        if (ge.isLifelineUsed(type)) {
          btn.classList.add('used');
          btn.disabled = true;
          if (mark) mark.classList.remove('hidden');
        } else {
          btn.classList.remove('used');
          btn.disabled = false;
          if (mark) mark.classList.add('hidden');
        }
      }
    });
  },
  
  // === شاشات النهاية ===
  showGameOverScreen(type) {
    const ge = QuizApp.GameEngine;
    const container = this.elements['gameover-content'];
    if (!container) return;
    
    QuizApp.SoundManager.stopAll();
    
    let avatarHtml = '';
    if (ge.playerAvatar) {
      avatarHtml = `<img src="${ge.playerAvatar}" alt="صورة المتسابق" class="gameover-avatar">`;
    }

    if (type === 'wrong') {
      QuizApp.SoundManager.play('gameOver');
      const amount = QuizApp.Utils.formatNumber(ge.getGameOverAmount());
      container.innerHTML = `
        <div class="gameover-icon">😔</div>
        ${avatarHtml}
        <h2 class="gameover-title">انتهت الجولة</h2>
        <div class="gameover-details">
          <p class="gameover-player">${ge.playerName}</p>
          <p>السؤال: ${ge.currentQuestionIndex + 1}</p>
          <p>إجابتك: ${ge.currentQuestion.answers[ge.lockedAnswer]}</p>
          <p>الإجابة الصحيحة: ${ge.currentQuestion.answers[ge.currentQuestion.correctAnswer]}</p>
          <p class="gameover-amount">المبلغ النهائي: ${amount} ${ge.settings.currency}</p>
        </div>
        <div class="gameover-buttons">
          <button class="btn btn-primary btn-lg" onclick="QuizApp.UIManager.startNewRound()">جولة جديدة</button>
          <button class="btn btn-secondary" onclick="QuizApp.UIManager.goHome()">الصفحة الرئيسية</button>
        </div>`;
    } else if (type === 'walkaway') {
      QuizApp.SoundManager.play('walkAway');
      const amount = QuizApp.Utils.formatNumber(ge.getWalkAwayAmount());
      container.innerHTML = `
        <div class="gameover-icon">🎉</div>
        ${avatarHtml}
        <h2 class="gameover-title">تهانينا!</h2>
        <div class="gameover-details">
          <p class="gameover-player">${ge.playerName}</p>
          <p>قررت الانسحاب بذكاء</p>
          <p>المستوى: ${ge.currentQuestionIndex + 1}</p>
          <p class="gameover-amount">فزت بـ ${amount} ${ge.settings.currency}</p>
        </div>
        <div class="gameover-buttons">
          <button class="btn btn-primary btn-lg" onclick="QuizApp.UIManager.startNewRound()">جولة جديدة</button>
          <button class="btn btn-secondary" onclick="QuizApp.UIManager.goHome()">الصفحة الرئيسية</button>
        </div>`;
    }
    
    this.showScreen('gameover-screen');
  },
  
  showGrandPrizeScreen() {
    const ge = QuizApp.GameEngine;
    QuizApp.SoundManager.stopAll();
    QuizApp.SoundManager.play('grandPrize');
    
    if (this.elements['gp-player-name']) this.elements['gp-player-name'].textContent = ge.playerName;
    if (this.elements['gp-amount']) this.elements['gp-amount'].textContent = QuizApp.Utils.formatNumber(ge.settings.prizes[ge.settings.prizes.length - 1]);
    if (this.elements['gp-currency']) this.elements['gp-currency'].textContent = ge.settings.currency;
    
    this.showScreen('grandprize-screen');
    this.startConfetti();
  },
  
  // === قصاصات الاحتفال ===
  startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96e6a1', '#f8a5c2'];
    
    for (let i = 0; i < 200; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 8 + 4,
        speedY: Math.random() * 3 + 2,
        speedX: (Math.random() - 0.5) * 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1
      });
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size/3);
        ctx.restore();
      });
      requestAnimationFrame(animate);
    };
    animate();
  },
  
  // === ملء الشاشة ===
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(()=>{});
    } else {
      document.exitFullscreen().catch(()=>{});
    }
  },
  
  toggleMute() {
    QuizApp.SoundManager.toggleMute();
    
    const muted = QuizApp.SoundManager.isMuted;
    
    const updateIcons = (btnId) => {
      const btn = this.elements[btnId];
      if (btn) {
        const onIcon = btn.querySelector('.icon-sound-on');
        const offIcon = btn.querySelector('.icon-sound-off');
        if (onIcon && offIcon) {
          if (muted) {
            onIcon.classList.add('hidden');
            offIcon.classList.remove('hidden');
          } else {
            onIcon.classList.remove('hidden');
            offIcon.classList.add('hidden');
          }
        }
      }
    };
    
    updateIcons('btn-mute');
    updateIcons('btn-game-mute');
  },
  
  toggleReducedMotion() {
    document.body.classList.toggle('reduced-motion');
  },
  
  // === أدوات ===
  startNewRound() {
    this.showScreen('player-setup-screen');
    QuizApp.GameEngine.resetGame();
  },
  
  goHome() {
    QuizApp.GameEngine.resetGame();
    QuizApp.GameEngine.setState(QuizApp.States.HOME);
    this.showHomeScreen();
  },
  
  // === التعامل مع تغيير الحالة ===
  handleStateChange(data) {
    const { newState, oldState } = data;
    
    // Handle resuming directly into game states
    const gameStates = [
        QuizApp.States.QUESTION_LOADING, QuizApp.States.QUESTION_ACTIVE, 
        QuizApp.States.ANSWER_SELECTED, QuizApp.States.ANSWER_LOCKED, 
        QuizApp.States.REVEALING_RESULT, QuizApp.States.CORRECT_ANSWER,
        QuizApp.States.LIFELINE_ACTIVE, QuizApp.States.PHONE_COUNTDOWN,
        QuizApp.States.AUDIENCE_COUNTDOWN, QuizApp.States.AUDIENCE_RESULT,
        QuizApp.States.WALK_AWAY_CONFIRMATION
    ];
    
    if (gameStates.includes(newState) && oldState === 'HOME') {
        this.showGameScreen();
        if (QuizApp.GameEngine.currentQuestion) {
            this.showQuestion(QuizApp.GameEngine.currentQuestion);
            
            // Restore answer selection if any
            if (QuizApp.GameEngine.selectedAnswer) {
                const btn = this.elements['answer' + QuizApp.GameEngine.selectedAnswer];
                if (btn) btn.classList.add('selected');
            }
            if (QuizApp.GameEngine.lockedAnswer) {
                const btn = this.elements['answer' + QuizApp.GameEngine.lockedAnswer];
                if (btn) btn.classList.add('locked');
            }
        }
    }
    
    switch(newState) {
      case QuizApp.States.HOME: this.showHomeScreen(); break;
      case QuizApp.States.PLAYER_SETUP: this.showPlayerSetup(); break;
      case QuizApp.States.INTRO: this.showIntroScreen(); break;
      case QuizApp.States.QUESTION_LOADING: 
        if (oldState !== 'HOME') this.showGameScreen(); 
        break;
      case QuizApp.States.CORRECT_ANSWER: this.showCorrectAnswer(); break;
      case QuizApp.States.WRONG_ANSWER: this.showWrongAnswer(); break;
      case QuizApp.States.GRAND_PRIZE_WIN: this.showGrandPrizeScreen(); break;
    }
  },
  
  // === إشعارات ===
  showToast(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('toast-fade-out'); setTimeout(() => toast.remove(), 500); }, 3000);
  },
  
  updatePlayerInfo() {
    const ge = QuizApp.GameEngine;
    if (this.elements['game-player-name']) {
      this.elements['game-player-name'].textContent = ge.playerName;
    }

    // صورة المتسابق الكبيرة فوق السؤال
    const heroAvatar = document.getElementById('player-hero-avatar');
    const heroName = document.getElementById('player-hero-name');
    const heroTeam = document.getElementById('player-hero-team');
    if (heroName) heroName.textContent = ge.playerName || '';
    if (heroTeam) heroTeam.textContent = ge.playerTeam ? ('فريق: ' + ge.playerTeam) : '';
    if (heroAvatar) {
      if (ge.playerAvatar) {
        heroAvatar.innerHTML = `<img src="${ge.playerAvatar}" alt="صورة المتسابق">`;
      } else {
        heroAvatar.innerHTML = '<span class="player-hero-placeholder">👤</span>';
      }
    }
  },
  
  // === Admin Login ===
  showAdminLogin() {
    if (this.elements['admin-login-overlay']) {
      this.elements['admin-login-overlay'].classList.remove('hidden');
    }
  }
};

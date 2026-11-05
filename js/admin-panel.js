QuizApp.AdminPanel = {
  currentTab: 'questions',
  editingQuestionId: null,
  
  init() {
    this.bindEvents();
  },
  
  bindEvents() {
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });
    
    document.getElementById('btn-admin-back')?.addEventListener('click', () => this.goBack());
    document.getElementById('btn-add-question')?.addEventListener('click', () => this.openAddQuestionModal());
    document.getElementById('btn-save-question')?.addEventListener('click', () => this.saveQuestion());
    document.getElementById('btn-cancel-question')?.addEventListener('click', () => this.closeQuestionModal());
    document.getElementById('btn-close-question-modal')?.addEventListener('click', () => this.closeQuestionModal());
    
    const searchInput = document.getElementById('question-search');
    if (searchInput) {
      searchInput.addEventListener('input', QuizApp.Utils.debounce(() => this.filterQuestions(), 300));
    }
    
    document.getElementById('filter-difficulty')?.addEventListener('change', () => this.filterQuestions());
    document.getElementById('filter-category')?.addEventListener('change', () => this.filterQuestions());
    
    document.getElementById('btn-save-settings')?.addEventListener('click', () => this.saveSettings());
    document.getElementById('btn-reset-settings')?.addEventListener('click', () => this.resetSettings());
    
    document.getElementById('btn-save-prizes')?.addEventListener('click', () => this.savePrizes());
    
    document.getElementById('btn-import-json')?.addEventListener('click', () => this.importJSON());
    document.getElementById('btn-import-csv')?.addEventListener('click', () => this.importCSV());
    document.getElementById('btn-export-questions')?.addEventListener('click', () => this.exportQuestions());
    document.getElementById('btn-export-all')?.addEventListener('click', () => this.exportAll());
    document.getElementById('btn-reset-lifelines')?.addEventListener('click', () => this.resetLifelines());
    document.getElementById('btn-reset-all')?.addEventListener('click', () => this.resetAll());
    
    document.getElementById('import-file-input')?.addEventListener('change', (e) => this.handleFileImport(e));
    
    document.getElementById('btn-admin-login')?.addEventListener('click', () => this.handleLogin());
    document.getElementById('btn-admin-login-cancel')?.addEventListener('click', () => {
      document.getElementById('admin-login-overlay').classList.add('hidden');
    });
    
    document.getElementById('setting-music-volume')?.addEventListener('input', (e) => {
      document.getElementById('music-volume-display').textContent = e.target.value + '%';
    });
    document.getElementById('setting-sfx-volume')?.addEventListener('input', (e) => {
      document.getElementById('sfx-volume-display').textContent = e.target.value + '%';
    });
  },
  
  // === تسجيل الدخول ===
  handleLogin() {
    const password = document.getElementById('admin-password').value;
    const ge = QuizApp.GameEngine;
    if (password === ge.settings.adminPassword) {
      document.getElementById('admin-login-overlay').classList.add('hidden');
      QuizApp.UIManager.showScreen('admin-screen');
      document.getElementById('admin-password').value = '';
      this.loadQuestionsTab();
    } else {
      QuizApp.UIManager.showToast('كلمة المرور غير صحيحة', 'error');
    }
  },
  
  goBack() {
    QuizApp.UIManager.showScreen('home-screen');
  },
  
  // === التبويبات ===
  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    
    if (tab === 'questions') this.loadQuestionsTab();
    if (tab === 'settings') this.loadSettingsTab();
    if (tab === 'prizes') this.loadPrizesTab();
  },
  
  // === إدارة الأسئلة ===
  loadQuestionsTab() {
    this.renderQuestionsList();
    this.updateCategories();
    this.updateStats();
  },
  
  renderQuestionsList(filter) {
    const list = document.getElementById('questions-list');
    let questions = QuizApp.GameEngine.questions || [];
    
    // تطبيق الفلاتر
    const search = document.getElementById('question-search').value.toLowerCase();
    const difficulty = document.getElementById('filter-difficulty').value;
    const category = document.getElementById('filter-category').value;
    
    if (search) questions = questions.filter(q => q.question.toLowerCase().includes(search));
    if (difficulty) questions = questions.filter(q => q.difficulty == difficulty);
    if (category) questions = questions.filter(q => q.category === category);
    
    list.innerHTML = questions.map(q => {
      const diffLabels = QuizApp.GameEngine.settings.difficultyLabels;
      return `
        <div class="question-item ${q.enabled ? '' : 'disabled'}" data-id="${q.id}">
          <div class="q-info">
            <span class="q-id">#${q.id}</span>
            <span class="q-difficulty q-diff-${q.difficulty}">مستوى ${q.difficulty} - ${diffLabels[q.difficulty] || ''}</span>
            <span class="q-category">${q.category}</span>
          </div>
          <p class="q-text">${q.question}</p>
          <div class="q-answers">
            ${['A','B','C','D'].map(l => 
              `<span class="q-answer ${l === q.correctAnswer ? 'q-correct' : ''}">${l}: ${q.answers[l]}</span>`
            ).join('')}
          </div>
          <div class="q-actions">
            <button class="btn btn-sm" onclick="QuizApp.AdminPanel.editQuestion(${q.id})">تعديل</button>
            <button class="btn btn-sm btn-danger" onclick="QuizApp.AdminPanel.deleteQuestion(${q.id})">حذف</button>
            <button class="btn btn-sm" onclick="QuizApp.AdminPanel.toggleQuestion(${q.id})">${q.enabled ? 'تعطيل' : 'تفعيل'}</button>
          </div>
        </div>`;
    }).join('');
    
    if (questions.length === 0) {
      list.innerHTML = '<p class="no-results">لا توجد أسئلة مطابقة</p>';
    }
  },
  
  updateCategories() {
    const select = document.getElementById('filter-category');
    const currentValue = select.value;
    const categories = [...new Set((QuizApp.GameEngine.questions || []).map(q => q.category))];
    select.innerHTML = '<option value="">جميع التصنيفات</option>' + 
      categories.map(c => `<option value="${c}">${c}</option>`).join('');
    select.value = currentValue;
  },
  
  updateStats() {
    const stats = document.getElementById('questions-stats');
    const questions = QuizApp.GameEngine.questions || [];
    const enabled = questions.filter(q => q.enabled).length;
    const byDifficulty = {};
    questions.forEach(q => { byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1; });
    stats.innerHTML = `إجمالي: ${questions.length} | مفعّلة: ${enabled} | معطّلة: ${questions.length - enabled}`;
  },
  
  openAddQuestionModal() {
    this.editingQuestionId = null;
    document.getElementById('question-modal-title').textContent = 'إضافة سؤال جديد';
    
    document.getElementById('edit-question-text').value = '';
    document.getElementById('edit-question-category').value = '';
    document.getElementById('edit-question-difficulty').value = '1';
    document.getElementById('edit-answer-A').value = '';
    document.getElementById('edit-answer-B').value = '';
    document.getElementById('edit-answer-C').value = '';
    document.getElementById('edit-answer-D').value = '';
    document.getElementById('edit-explanation').value = '';
    document.getElementById('edit-question-enabled').value = 'true';
    document.querySelectorAll('input[name="correct-answer"]').forEach(r => r.checked = false);
    
    document.getElementById('question-modal-overlay').classList.remove('hidden');
  },
  
  editQuestion(id) {
    const q = QuizApp.GameEngine.questions.find(q => q.id === id);
    if (!q) return;
    this.editingQuestionId = id;
    document.getElementById('question-modal-title').textContent = 'تعديل السؤال #' + id;
    
    document.getElementById('edit-question-text').value = q.question;
    document.getElementById('edit-question-category').value = q.category || '';
    document.getElementById('edit-question-difficulty').value = q.difficulty;
    document.getElementById('edit-answer-A').value = q.answers.A;
    document.getElementById('edit-answer-B').value = q.answers.B;
    document.getElementById('edit-answer-C').value = q.answers.C;
    document.getElementById('edit-answer-D').value = q.answers.D;
    document.getElementById('edit-explanation').value = q.explanation || '';
    document.getElementById('edit-question-enabled').value = String(q.enabled !== false);
    
    const correctRadio = document.getElementById('correct-' + q.correctAnswer);
    if (correctRadio) correctRadio.checked = true;
    
    document.getElementById('question-modal-overlay').classList.remove('hidden');
  },
  
  saveQuestion() {
    const questionText = document.getElementById('edit-question-text').value.trim();
    const category = document.getElementById('edit-question-category').value.trim();
    const difficulty = parseInt(document.getElementById('edit-question-difficulty').value);
    const answerA = document.getElementById('edit-answer-A').value.trim();
    const answerB = document.getElementById('edit-answer-B').value.trim();
    const answerC = document.getElementById('edit-answer-C').value.trim();
    const answerD = document.getElementById('edit-answer-D').value.trim();
    const explanation = document.getElementById('edit-explanation').value.trim();
    const enabled = document.getElementById('edit-question-enabled').value === 'true';
    
    const correctRadio = document.querySelector('input[name="correct-answer"]:checked');
    
    if (!questionText || !answerA || !answerB || !answerC || !answerD || !correctRadio) {
      QuizApp.UIManager.showToast('يرجى تعبئة جميع الحقول المطلوبة وتحديد الإجابة الصحيحة', 'error');
      return;
    }
    
    const newQuestion = {
      id: this.editingQuestionId || QuizApp.Utils.generateId(),
      question: questionText,
      category: category || 'عام',
      difficulty: difficulty,
      answers: { A: answerA, B: answerB, C: answerC, D: answerD },
      correctAnswer: correctRadio.value,
      explanation: explanation,
      enabled: enabled
    };
    
    let questions = QuizApp.GameEngine.questions;
    if (this.editingQuestionId) {
      const index = questions.findIndex(q => q.id === this.editingQuestionId);
      if (index !== -1) {
        questions[index] = newQuestion;
      }
    } else {
      questions.push(newQuestion);
    }
    
    QuizApp.GameEngine.questions = questions;
    QuizApp.Storage.saveQuestions(questions);
    
    this.loadQuestionsTab();
    this.closeQuestionModal();
    QuizApp.UIManager.showToast('تم حفظ السؤال بنجاح', 'success');
  },
  
  deleteQuestion(id) {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    QuizApp.GameEngine.questions = QuizApp.GameEngine.questions.filter(q => q.id !== id);
    QuizApp.Storage.saveQuestions(QuizApp.GameEngine.questions);
    this.loadQuestionsTab();
    QuizApp.UIManager.showToast('تم حذف السؤال', 'success');
  },
  
  toggleQuestion(id) {
    const q = QuizApp.GameEngine.questions.find(q => q.id === id);
    if (q) { q.enabled = !q.enabled; }
    QuizApp.Storage.saveQuestions(QuizApp.GameEngine.questions);
    this.renderQuestionsList();
  },
  
  closeQuestionModal() {
    document.getElementById('question-modal-overlay').classList.add('hidden');
  },
  
  filterQuestions() {
    this.renderQuestionsList();
  },
  
  // === الإعدادات ===
  loadSettingsTab() {
    const s = QuizApp.GameEngine.settings;
    document.getElementById('setting-quiz-name').value = s.quizName;
    document.getElementById('setting-currency').value = s.currency;
    document.getElementById('setting-question-count').value = s.questionCount;
    document.getElementById('setting-reveal-delay').value = s.revealDelay;
    document.getElementById('setting-auto-advance').value = String(s.autoAdvance);
    document.getElementById('setting-confirm-lock').value = String(s.confirmLock);
    document.getElementById('setting-presenter-mode').value = String(s.presenterMode);
    document.getElementById('setting-phone-duration').value = s.phoneDuration;
    document.getElementById('setting-audience-duration').value = s.audienceDuration;
    document.getElementById('setting-music-volume').value = s.musicVolume;
    document.getElementById('setting-sfx-volume').value = s.sfxVolume;
    document.getElementById('setting-countdown-sound').value = String(s.countdownSound);
    document.getElementById('setting-fullscreen-start').value = String(s.fullscreenOnStart);
    document.getElementById('setting-reduced-motion').value = String(s.reducedMotion);
    document.getElementById('music-volume-display').textContent = s.musicVolume + '%';
    document.getElementById('sfx-volume-display').textContent = s.sfxVolume + '%';
  },
  
  saveSettings() {
    const s = QuizApp.GameEngine.settings;
    s.quizName = document.getElementById('setting-quiz-name').value;
    s.currency = document.getElementById('setting-currency').value;
    s.questionCount = parseInt(document.getElementById('setting-question-count').value);
    s.revealDelay = parseInt(document.getElementById('setting-reveal-delay').value);
    s.autoAdvance = document.getElementById('setting-auto-advance').value === 'true';
    s.confirmLock = document.getElementById('setting-confirm-lock').value === 'true';
    s.presenterMode = document.getElementById('setting-presenter-mode').value === 'true';
    s.phoneDuration = parseInt(document.getElementById('setting-phone-duration').value);
    s.audienceDuration = parseInt(document.getElementById('setting-audience-duration').value);
    s.musicVolume = parseInt(document.getElementById('setting-music-volume').value);
    s.sfxVolume = parseInt(document.getElementById('setting-sfx-volume').value);
    s.countdownSound = document.getElementById('setting-countdown-sound').value === 'true';
    s.fullscreenOnStart = document.getElementById('setting-fullscreen-start').value === 'true';
    s.reducedMotion = document.getElementById('setting-reduced-motion').value === 'true';
    QuizApp.Storage.saveSettings(s);
    QuizApp.UIManager.showToast('تم حفظ الإعدادات', 'success');
  },
  
  resetSettings() {
    if (!confirm('هل أنت متأكد من استعادة الإعدادات الافتراضية؟')) return;
    QuizApp.Storage.remove('quiz_settings');
    QuizApp.GameEngine.loadSettings().then(() => {
      this.loadSettingsTab();
      QuizApp.UIManager.showToast('تم استعادة الإعدادات الافتراضية', 'success');
    });
  },
  
  // === سلم الجوائز ===
  loadPrizesTab() {
    const form = document.getElementById('prizes-form');
    const prizes = QuizApp.GameEngine.settings.prizes;
    const safetyNets = QuizApp.GameEngine.settings.safetyNets;
    const labels = QuizApp.GameEngine.settings.difficultyLabels;
    
    form.innerHTML = prizes.map((prize, i) => {
      const level = i + 1;
      const isSafety = safetyNets.includes(level);
      return `
        <div class="prize-row ${isSafety ? 'prize-safety' : ''}">
          <span class="prize-level">المستوى ${level}</span>
          <span class="prize-diff">${labels[level] || ''}</span>
          <input type="number" class="form-input prize-input" data-level="${level}" value="${prize}">
          <label class="safety-label">
            <input type="checkbox" class="safety-check" data-level="${level}" ${isSafety ? 'checked' : ''}> نقطة أمان
          </label>
        </div>`;
    }).join('');
  },
  
  savePrizes() {
    const inputs = document.querySelectorAll('.prize-input');
    const checks = document.querySelectorAll('.safety-check');
    const prizes = [];
    const safetyNets = [];
    
    inputs.forEach(input => {
      prizes.push(parseInt(input.value) || 0);
    });
    checks.forEach(check => {
      if (check.checked) safetyNets.push(parseInt(check.dataset.level));
    });
    
    QuizApp.GameEngine.settings.prizes = prizes;
    QuizApp.GameEngine.settings.safetyNets = safetyNets;
    QuizApp.Storage.saveSettings(QuizApp.GameEngine.settings);
    QuizApp.UIManager.showToast('تم حفظ سلم الجوائز', 'success');
  },
  
  // === الاستيراد والتصدير ===
  importJSON() {
    const input = document.getElementById('import-file-input');
    input.accept = '.json';
    input.dataset.type = 'json';
    input.click();
  },
  
  importCSV() {
    const input = document.getElementById('import-file-input');
    input.accept = '.csv';
    input.dataset.type = 'csv';
    input.click();
  },
  
  handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    const type = event.target.dataset.type;
    reader.onload = (e) => {
      try {
        let questions;
        if (type === 'json') {
          questions = JSON.parse(e.target.result);
          if (!Array.isArray(questions)) throw new Error('الملف يجب أن يحتوي على مصفوفة أسئلة');
        } else if (type === 'csv') {
          questions = this.parseCSV(e.target.result);
        }
        // تعيين IDs جديدة إذا لزم
        const maxId = Math.max(0, ...QuizApp.GameEngine.questions.map(q => q.id || 0));
        questions.forEach((q, i) => { if (!q.id) q.id = maxId + i + 1; if (q.enabled === undefined) q.enabled = true; });
        
        QuizApp.GameEngine.questions = [...QuizApp.GameEngine.questions, ...questions];
        QuizApp.Storage.saveQuestions(QuizApp.GameEngine.questions);
        this.loadQuestionsTab();
        QuizApp.UIManager.showToast(`تم استيراد ${questions.length} سؤال`, 'success');
      } catch (err) {
        QuizApp.UIManager.showToast('خطأ في الملف: ' + err.message, 'error');
      }
    };
    reader.readAsText(file, 'UTF-8');
    event.target.value = '';
  },
  
  parseCSV(text) {
    // CSV format: question,answerA,answerB,answerC,answerD,correctAnswer,difficulty,category,explanation
    const lines = text.split('\n').filter(l => l.trim());
    const questions = [];
    // تجاوز العنوان
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length >= 6) {
        questions.push({
          question: cols[0],
          answers: { A: cols[1], B: cols[2], C: cols[3], D: cols[4] },
          correctAnswer: cols[5].toUpperCase(),
          difficulty: parseInt(cols[6]) || 1,
          category: cols[7] || 'عام',
          explanation: cols[8] || '',
          enabled: true
        });
      }
    }
    return questions;
  },
  
  exportQuestions() {
    const data = JSON.stringify(QuizApp.GameEngine.questions, null, 2);
    this.downloadFile(data, 'questions.json', 'application/json');
  },
  
  exportAll() {
    const data = {
      questions: QuizApp.GameEngine.questions,
      settings: QuizApp.GameEngine.settings
    };
    this.downloadFile(JSON.stringify(data, null, 2), 'quiz-backup.json', 'application/json');
  },
  
  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  },
  
  resetLifelines() {
    QuizApp.GameEngine.usedLifelines = { fiftyFifty: false, phoneAFriend: false, askAudience: false };
    QuizApp.Storage.saveGameState(QuizApp.GameEngine);
    QuizApp.UIManager.showToast('تم إعادة ضبط المساعدات', 'success');
  },
  
  resetAll() {
    if (!confirm('سيتم حذف جميع البيانات المحفوظة. هل أنت متأكد؟')) return;
    QuizApp.Storage.clear();
    location.reload();
  }
};

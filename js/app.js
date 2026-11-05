/**
 * app.js - نقطة الدخول الرئيسية لتطبيق تحدي المليون
 * يربط جميع الوحدات ويهيئ التطبيق
 */

(function() {
    'use strict';

    // === التهيئة الرئيسية ===
    QuizApp.App = {
        isInitialized: false,

        async init() {
            if (this.isInitialized) return;

            try {
                // Force reset old local storage data to fix cache issues
                if (!localStorage.getItem('v5_cache_cleared')) {
                    localStorage.clear();
                    localStorage.setItem('v5_cache_cleared', 'true');
                }

                this.updateLoadingText('جارٍ تحميل الإعدادات...');
                this.updateLoadingBar(10);

                // تحميل الإعدادات
                await QuizApp.GameEngine.loadSettings();
                this.updateLoadingBar(25);

                this.updateLoadingText('جارٍ تحميل الأسئلة...');
                await QuizApp.GameEngine.loadQuestions();
                this.updateLoadingBar(50);

                this.updateLoadingText('جارٍ تهيئة نظام الصوت...');
                // SoundManager يتهيأ عند أول تفاعل مع المستخدم
                this.updateLoadingBar(65);

                this.updateLoadingText('جارٍ تهيئة الواجهة...');
                QuizApp.UIManager.init();
                this.updateLoadingBar(80);

                this.updateLoadingText('جارٍ تهيئة لوحة التحكم...');
                QuizApp.AdminPanel.init();
                QuizApp.PresenterMode.init();
                this.updateLoadingBar(90);

                // إعداد اختصارات لوحة المفاتيح
                this.setupKeyboardShortcuts();
                this.updateLoadingBar(95);

                // التحقق من حالة محفوظة
                this.checkSavedState();
                this.updateLoadingBar(100);

                this.updateLoadingText('جاهز!');

                // إخفاء شاشة التحميل بعد قليل
                await QuizApp.Utils.delay(500);
                this.hideLoadingScreen();

                this.isInitialized = true;

                // تسجيل Service Worker
                this.registerServiceWorker();

            } catch (error) {
                console.error('خطأ في تهيئة التطبيق:', error);
                this.updateLoadingText('حدث خطأ في التحميل. حاول تحديث الصفحة.');
            }
        },

        updateLoadingText(text) {
            const el = document.getElementById('loading-text');
            if (el) el.textContent = text;
        },

        updateLoadingBar(percent) {
            const el = document.getElementById('loading-bar');
            if (el) el.style.width = percent + '%';
        },

        hideLoadingScreen() {
            const loading = document.getElementById('loading-screen');
            const home = document.getElementById('home-screen');
            if (loading) {
                loading.style.opacity = '0';
                loading.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    loading.classList.remove('active');
                    loading.style.display = 'none';
                    if (home) {
                        home.classList.add('active');
                    }
                    // تهيئة الخلفية المتحركة
                    QuizApp.UIManager.initBackgrounds();
                    // ضبط حالة اللعبة
                    QuizApp.GameEngine.setState(QuizApp.States.HOME);
                }, 500);
            }
        },

        checkSavedState() {
            const savedState = QuizApp.Storage.loadGameState();
            if (savedState && savedState.state && savedState.state !== 'HOME' && savedState.state !== 'GAME_OVER' && savedState.state !== 'GRAND_PRIZE_WIN') {
                this._hasSavedState = true;
                this._savedState = savedState;
                
                const btnContainer = document.querySelector('.home-buttons');
                if (btnContainer && !document.getElementById('btn-resume-game')) {
                    const btn = document.createElement('button');
                    btn.id = 'btn-resume-game';
                    btn.className = 'btn btn-secondary btn-lg';
                    btn.innerHTML = '<span class="btn-icon">💾</span> استكمال الجولة السابقة';
                    btn.onclick = () => this.resumeSavedGame();
                    btnContainer.insertBefore(btn, btnContainer.firstChild);
                }
            }
        },

        resumeSavedGame() {
            if (this._savedState) {
                try {
                    QuizApp.GameEngine.loadState(this._savedState);
                    QuizApp.UIManager.handleStateChange({newState: this._savedState.state, oldState: 'HOME'});
                    QuizApp.UIManager.showToast('تم استعادة الجولة السابقة', 'success');
                    
                    const btn = document.getElementById('btn-resume-game');
                    if (btn) btn.remove();
                } catch (e) {
                    console.error('خطأ في استعادة الحالة:', e);
                    QuizApp.UIManager.showToast('تعذر استعادة الجولة السابقة', 'error');
                }
                this._hasSavedState = false;
                this._savedState = null;
            }
        },

        // === اختصارات لوحة المفاتيح ===
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // لا تنفذ الاختصارات إذا كان التركيز على حقل إدخال
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                    return;
                }

                const ge = QuizApp.GameEngine;
                const shortcuts = ge.settings ? ge.settings.shortcuts : null;
                if (!shortcuts) return;

                const key = e.key;

                // اختصارات عامة
                if (key === shortcuts.mute || key === 'm' || key === 'M') {
                    e.preventDefault();
                    QuizApp.UIManager.toggleMute();
                    return;
                }

                if (key === 'F11') {
                    e.preventDefault();
                    QuizApp.UIManager.toggleFullscreen();
                    return;
                }

                if (key === 'Escape') {
                    e.preventDefault();
                    this.handleEscape();
                    return;
                }

                // اختصار وضع المقدم
                if (key === 'F8') {
                    e.preventDefault();
                    if (ge.settings.presenterMode) {
                        QuizApp.PresenterMode.toggle();
                    }
                    return;
                }

                // اختصارات شاشة اللعب فقط
                if (ge.state === QuizApp.States.QUESTION_ACTIVE || ge.state === QuizApp.States.ANSWER_SELECTED) {
                    
                    // اختيار الإجابات
                    if (key === '1' || key === shortcuts.answerA) {
                        e.preventDefault();
                        QuizApp.UIManager.handleAnswerClick('A');
                    } else if (key === '2' || key === shortcuts.answerB) {
                        e.preventDefault();
                        QuizApp.UIManager.handleAnswerClick('B');
                    } else if (key === '3' || key === shortcuts.answerC) {
                        e.preventDefault();
                        QuizApp.UIManager.handleAnswerClick('C');
                    } else if (key === '4' || key === shortcuts.answerD) {
                        e.preventDefault();
                        QuizApp.UIManager.handleAnswerClick('D');
                    }

                    // تثبيت الإجابة
                    if (key === 'Enter' && ge.state === QuizApp.States.ANSWER_SELECTED) {
                        e.preventDefault();
                        QuizApp.UIManager.handleLockAnswer();
                    }

                    // المساعدات
                    if (key === 'f' || key === 'F') {
                        e.preventDefault();
                        QuizApp.UIManager.handleLifelineClick('fiftyFifty');
                    } else if (key === 'p' || key === 'P') {
                        e.preventDefault();
                        QuizApp.UIManager.handleLifelineClick('phoneAFriend');
                    } else if (key === 'a' || key === 'A') {
                        e.preventDefault();
                        QuizApp.UIManager.handleLifelineClick('askAudience');
                    }
                }

                // السؤال التالي
                if (key === 'n' || key === 'N') {
                    if (ge.state === QuizApp.States.CORRECT_ANSWER) {
                        e.preventDefault();
                        QuizApp.UIManager.handleNextQuestion();
                    }
                }

                // مسافة لبدء/إيقاف المؤقت
                if (key === ' ') {
                    if (ge.state === QuizApp.States.PHONE_COUNTDOWN) {
                        e.preventDefault();
                        const btn = document.getElementById('btn-start-phone-timer');
                        if (btn && !btn.disabled) {
                            QuizApp.UIManager.startPhoneTimer();
                        }
                    }
                }
            });
        },

        handleEscape() {
            // إغلاق النوافذ المنبثقة
            const overlays = [
                'phone-overlay', 'audience-overlay', 'walkaway-overlay',
                'question-modal-overlay', 'admin-login-overlay'
            ];
            
            overlays.forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.classList.contains('hidden')) {
                    // لا تغلق نوافذ الاتصال والجمهور إذا كان المؤقت يعمل
                    if (id === 'phone-overlay') {
                        QuizApp.UIManager.endPhoneCall();
                    } else if (id === 'audience-overlay') {
                        // لا تغلق أثناء العد التنازلي
                        const ge = QuizApp.GameEngine;
                        if (ge.state === QuizApp.States.AUDIENCE_RESULT) {
                            QuizApp.UIManager.closeAudiencePanel();
                        }
                    } else if (id === 'walkaway-overlay') {
                        QuizApp.UIManager.handleCancelWalkaway();
                    } else {
                        el.classList.add('hidden');
                    }
                }
            });
        },

        // === Service Worker ===
        async registerServiceWorker() {
            if ('serviceWorker' in navigator) {
                try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (let registration of registrations) {
                        await registration.unregister();
                    }
                    
                    // Force cache clear
                    const cacheKeys = await caches.keys();
                    for (let key of cacheKeys) {
                        await caches.delete(key);
                    }
                    console.log('Service Workers unregistered and cache cleared.');
                } catch (error) {
                    console.log('Error unregistering Service Worker:', error);
                }
            }
        }
    };

    // === بدء التطبيق عند تحميل الصفحة ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => QuizApp.App.init());
    } else {
        QuizApp.App.init();
    }

    // === حفظ الحالة عند إغلاق الصفحة ===
    window.addEventListener('beforeunload', () => {
        if (QuizApp.GameEngine && QuizApp.GameEngine.state &&
            QuizApp.GameEngine.state !== QuizApp.States.HOME &&
            QuizApp.GameEngine.state !== QuizApp.States.GAME_OVER) {
            QuizApp.GameEngine.saveState();
        }
    });

    // === معالجة تغيير حجم النافذة ===
    window.addEventListener('resize', QuizApp.Utils.debounce(() => {
        if (QuizApp.UIManager && QuizApp.UIManager.handleResize) {
            QuizApp.UIManager.handleResize();
        }
    }, 250));

})();

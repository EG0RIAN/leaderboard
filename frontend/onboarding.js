// Onboarding Stories with Haptic Feedback

class OnboardingStories {
    constructor() {
        this.currentStory = 0;
        this.totalStories = 5;
        this.autoAdvanceTimer = null;
        this.autoAdvanceDelay = 5000; // 5 seconds per story
        this.isActive = false;
        
        this.overlay = document.getElementById('onboarding');
        this.slides = document.querySelectorAll('.story-slide');
        this.progressSegments = document.querySelectorAll('.progress-segment');
        this.skipBtn = document.getElementById('skip-onboarding');
        this.startBtn = document.getElementById('start-app');
        this.prevZone = document.querySelector('.story-nav-prev');
        this.nextZone = document.querySelector('.story-nav-next');
        
        this.init();
    }
    
    init() {
        // Check if user has already seen onboarding
        if (this.hasSeenOnboarding()) {
            this.hide();
            return;
        }
        
        this.isActive = true;
        this.setupEventListeners();
        this.showStory(0);
        this.startAutoAdvance();
        
        // Haptic feedback on start
        this.haptic('impact', 'medium');
    }
    
    hasSeenOnboarding() {
        return localStorage.getItem('onboarding_completed') === 'true';
    }
    
    markOnboardingComplete() {
        localStorage.setItem('onboarding_completed', 'true');
    }
    
    setupEventListeners() {
        // Skip button
        this.skipBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.haptic('impact', 'light');
            this.complete();
        });
        
        // Start button
        this.startBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.haptic('impact', 'heavy');
            this.complete();
        });
        
        // Navigation zones
        this.prevZone.addEventListener('click', () => {
            this.prev();
        });
        
        this.nextZone.addEventListener('click', () => {
            this.next();
        });
        
        // Touch/swipe support
        let touchStartX = 0;
        let touchEndX = 0;
        
        this.overlay.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        this.overlay.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX);
        }, { passive: true });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            
            if (e.key === 'ArrowRight' || e.key === ' ') {
                this.next();
            } else if (e.key === 'ArrowLeft') {
                this.prev();
            } else if (e.key === 'Escape') {
                this.complete();
            }
        });
    }
    
    handleSwipe(startX, endX) {
        const swipeThreshold = 50;
        const diff = startX - endX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left -> next
                this.next();
            } else {
                // Swipe right -> prev
                this.prev();
            }
        }
    }
    
    showStory(index) {
        if (index < 0 || index >= this.totalStories) return;
        
        this.currentStory = index;
        
        // Update slides
        this.slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        
        // Update progress
        this.progressSegments.forEach((segment, i) => {
            segment.classList.remove('active', 'completed');
            if (i < index) {
                segment.classList.add('completed');
            } else if (i === index) {
                segment.classList.add('active');
            }
        });
        
        // Show/hide start button on last slide
        if (index === this.totalStories - 1) {
            this.startBtn.classList.add('visible');
            this.skipBtn.style.opacity = '0';
        } else {
            this.startBtn.classList.remove('visible');
            this.skipBtn.style.opacity = '1';
        }
        
        // Restart auto advance timer
        this.startAutoAdvance();
    }
    
    next() {
        this.stopAutoAdvance();
        
        if (this.currentStory < this.totalStories - 1) {
            this.haptic('impact', 'light');
            this.showStory(this.currentStory + 1);
        } else {
            // On last story, complete
            this.haptic('impact', 'medium');
            this.complete();
        }
    }
    
    prev() {
        this.stopAutoAdvance();
        
        if (this.currentStory > 0) {
            this.haptic('impact', 'light');
            this.showStory(this.currentStory - 1);
        } else {
            // Already on first story, just restart progress
            this.haptic('selection_change');
            this.showStory(0);
        }
    }
    
    startAutoAdvance() {
        this.stopAutoAdvance();
        
        this.autoAdvanceTimer = setTimeout(() => {
            if (this.currentStory < this.totalStories - 1) {
                this.next();
            }
        }, this.autoAdvanceDelay);
    }
    
    stopAutoAdvance() {
        if (this.autoAdvanceTimer) {
            clearTimeout(this.autoAdvanceTimer);
            this.autoAdvanceTimer = null;
        }
    }
    
    complete() {
        this.stopAutoAdvance();
        this.markOnboardingComplete();
        this.hide();
        
        // Trigger success haptic
        this.haptic('notification', 'success');
    }
    
    hide() {
        this.isActive = false;
        this.overlay.classList.add('hidden');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this.overlay.parentNode) {
                this.overlay.style.display = 'none';
            }
        }, 300);
    }
    
    // Haptic feedback using Telegram WebApp API
    haptic(type, style) {
        try {
            const tg = window.Telegram?.WebApp;
            if (!tg || !tg.HapticFeedback) return;
            
            switch (type) {
                case 'impact':
                    // style: 'light', 'medium', 'heavy', 'rigid', 'soft'
                    tg.HapticFeedback.impactOccurred(style || 'medium');
                    break;
                case 'notification':
                    // style: 'error', 'success', 'warning'
                    tg.HapticFeedback.notificationOccurred(style || 'success');
                    break;
                case 'selection_change':
                    tg.HapticFeedback.selectionChanged();
                    break;
            }
        } catch (e) {
            // Haptic not available, silently ignore
            console.log('Haptic feedback not available');
        }
    }
    
    // Static method to reset onboarding (for testing)
    static reset() {
        localStorage.removeItem('onboarding_completed');
        location.reload();
    }
}

// Initialize onboarding when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for Telegram WebApp to initialize
    setTimeout(() => {
        window.onboardingStories = new OnboardingStories();
    }, 100);
});

// Debug: expose reset function
window.resetOnboarding = OnboardingStories.reset;


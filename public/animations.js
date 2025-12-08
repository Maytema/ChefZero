class Animations {
    constructor() {
        this.init();
    }

    init() {
        this.setupHeaderAnimation();
        this.setupRecipeCardAnimations();
        this.setupButtonAnimations();
        this.setupAccordionAnimations();
        this.setupChipAnimations();
    }

    setupHeaderAnimation() {
        const header = document.querySelector('.header');
        let lastScroll = 0;
        
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll > lastScroll && currentScroll > 100) {
                header.style.transform = 'translateY(-100%)';
            } else {
                header.style.transform = 'translateY(0)';
            }
            
            lastScroll = currentScroll;
        });
    }

    setupRecipeCardAnimations() {
        document.addEventListener('mouseover', (e) => {
            const card = e.target.closest('.recipe-card');
            if (card) {
                card.style.transform = 'translateY(-8px) scale(1.02)';
                card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
            }
        });
        
        document.addEventListener('mouseout', (e) => {
            const card = e.target.closest('.recipe-card');
            if (card) {
                card.style.transform = 'translateY(0) scale(1)';
                card.style.boxShadow = '';
            }
        });
    }

    setupButtonAnimations() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && !button.classList.contains('toast-close')) {
                this.createRipple(e, button);
            }
        });
    }

    createRipple(event, element) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.7);
            transform: scale(0);
            animation: ripple 0.6s linear;
            width: ${size}px;
            height: ${size}px;
            top: ${y}px;
            left: ${x}px;
            pointer-events: none;
        `;

        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    }

    setupAccordionAnimations() {
        document.addEventListener('click', (e) => {
            const header = e.target.closest('.category-header');
            if (!header) return;
            
            const category = header.parentElement;
            const content = category.querySelector('.category-content');
            const arrow = category.querySelector('.category-arrow i');
            
            if (!content) return;
            
            if (category.classList.contains('active')) {
                content.style.maxHeight = null;
                arrow.style.transform = 'rotate(0deg)';
                category.classList.remove('active');
            } else {
                content.style.maxHeight = content.scrollHeight + 'px';
                arrow.style.transform = 'rotate(180deg)';
                category.classList.add('active');
            }
        });
    }

    setupChipAnimations() {
        document.addEventListener('DOMNodeInserted', (e) => {
            if (e.target.classList && e.target.classList.contains('chip')) {
                this.animateChipAdd(e.target);
            }
        });
    }

    animateChipAdd(chip) {
        chip.style.animation = 'slideIn 0.3s ease';
        
        setTimeout(() => {
            chip.style.transform = 'scale(1.1)';
            setTimeout(() => {
                chip.style.transform = 'scale(1)';
            }, 150);
        }, 300);
    }

    animateModalIn(modal) {
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.animation = 'modalIn 0.3s ease';
        }
    }
}

// Добавляем стили анимаций
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes fall {
        to {
            transform: translateY(100vh) rotate(${Math.random() * 360}deg);
            opacity: 0;
        }
    }
    
    .header {
        transition: transform 0.3s ease;
    }
    
    .recipe-card {
        transition: all 0.3s ease;
    }
    
    .chip {
        transition: transform 0.2s ease;
    }
`;

document.head.appendChild(style);

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    new Animations();
});

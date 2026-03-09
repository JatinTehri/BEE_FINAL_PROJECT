// ==========================================
//          DOM ELEMENTS
// ==========================================
const togglePasswordBtns = document.querySelectorAll('.toggle-password');
const signupPasswordInput = document.getElementById('signupPassword');
const strengthFill = document.getElementById('strengthFill');
const strengthText = document.getElementById('strengthText');

// ==========================================
//          PASSWORD TOGGLE
// ==========================================
togglePasswordBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        const isPassword = target.type === 'password';
        target.type = isPassword ? 'text' : 'password';
        btn.classList.toggle('fa-eye');
        btn.classList.toggle('fa-eye-slash');
    });
});

// ==========================================
//      PASSWORD STRENGTH METER
// ==========================================
if (signupPasswordInput) {
    signupPasswordInput.addEventListener('input', () => {
        const password = signupPasswordInput.value;
        const strength = calculateStrength(password);
        updateStrengthMeter(strength);
    });
}

function calculateStrength(password) {
    let score = 0;
    if (password.length === 0) return 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return score;
}

function updateStrengthMeter(score) {
    const levels = [
        { width: '0%', color: 'transparent', text: '' },
        { width: '20%', color: '#ff4757', text: 'Weak' },
        { width: '40%', color: '#ffa502', text: 'Fair' },
        { width: '60%', color: '#ffdd57', text: 'Good' },
        { width: '80%', color: '#7bed9f', text: 'Strong' },
        { width: '100%', color: '#2ed573', text: 'Excellent' }
    ];

    const level = levels[score];
    if (strengthFill && strengthText) {
        strengthFill.style.width = level.width;
        strengthFill.style.background = level.color;
        strengthText.textContent = level.text;
        strengthText.style.color = level.color;
    }
}
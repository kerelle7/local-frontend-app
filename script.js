const btn = document.getElementById('clickBtn');
const output = document.getElementById('output');
let count = 0;

btn.addEventListener('click', () => {
    count++;
    output.textContent = `Button clicked ${count} time(s)!`;
});

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggle.setAttribute('aria-checked', String(theme === 'dark'));
    themeToggle.querySelector('.toggle-knob').textContent = theme === 'dark' ? '🌙' : '☀️';
}

function savedTheme() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
}

// Tracked in memory too, so a manual choice sticks even when storage is unavailable
let userChoseTheme = Boolean(savedTheme());

applyTheme(document.documentElement.dataset.theme);

themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    userChoseTheme = true;
    try { localStorage.setItem('theme', next); } catch (e) {}
});

// Follow OS changes until the user picks a theme explicitly
darkQuery.addEventListener('change', (e) => {
    if (!userChoseTheme) applyTheme(e.matches ? 'dark' : 'light');
});
// Test Comment

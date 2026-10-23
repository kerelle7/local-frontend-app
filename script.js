const btn = document.getElementById('clickBtn');
const output = document.getElementById('output');
let count = 0;

btn.addEventListener('click', () => {
    count++;
    output.textContent = `Button clicked ${count} time(s)!`;
});
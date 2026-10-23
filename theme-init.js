// Apply the saved (or OS) theme before first paint to avoid a flash.
// Loaded in <head> without defer/async so it runs before the page renders.
(function () {
    let theme = null;
    try { theme = localStorage.getItem('theme'); } catch (e) {}
    if (theme !== 'light' && theme !== 'dark') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.dataset.theme = theme;
})();

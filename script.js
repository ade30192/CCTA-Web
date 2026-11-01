// Menú móvil
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', e => {
    const parent = a.closest('.has-sub');
    // en móvil, tocar "Acerca" despliega el submenú sin navegar
    if (parent && a.classList.contains('sub-toggle') && getComputedStyle(toggle).display !== 'none') {
      e.preventDefault();
      parent.classList.toggle('open');
      return;
    }
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
}

// Carrusel del inicio
const slides = [...document.querySelectorAll('.slide')];
const dots = [...document.querySelectorAll('.dot')];
let current = 0, timer;
function show(i) {
  current = (i + slides.length) % slides.length;
  slides.forEach((s, k) => s.classList.toggle('active', k === current));
  dots.forEach((d, k) => d.classList.toggle('active', k === current));
}
function restart() {
  clearInterval(timer);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => show(current + 1), 6500);
}
document.querySelector('.prev')?.addEventListener('click', () => { show(current - 1); restart(); });
document.querySelector('.next')?.addEventListener('click', () => { show(current + 1); restart(); });
dots.forEach((d, k) => d.addEventListener('click', () => { show(k); restart(); }));
if (slides.length) restart();

// Año del pie de página
const y = document.querySelector('#year');
if (y) y.textContent = new Date().getFullYear();

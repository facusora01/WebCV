// Font toggle button logic

document.addEventListener('DOMContentLoaded', function () {
  var select = document.getElementById('font-select');
  if (!select) return;
  var body = document.body;
  var fonts = {
    'default': "'Minecraft', monospace",
    'courier': "'Courier New', monospace"
  };
  // Cargar preferencia guardada
  var saved = localStorage.getItem('fontSelect');
  if (saved && fonts[saved]) {
    select.value = saved;
    body.style.fontFamily = fonts[saved];
  } else {
    body.style.fontFamily = fonts['default'];
  }

  if (select.value !== 'default') {
    body.style.fontSize = '1.1rem';
    select.style.display = '';
  }

  select.addEventListener('change', function () {
    var val = select.value;
    if (fonts[val]) {
      body.style.fontFamily = fonts[val];
      localStorage.setItem('fontSelect', val);
    }
  });
});

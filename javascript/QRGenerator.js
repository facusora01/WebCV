/* ===== QR Generator ===== */

document.addEventListener('DOMContentLoaded', function () {
  // Elementos principales
  var form = document.getElementById('qr-form');
  var input = document.getElementById('qr-text');
  var result = document.getElementById('qr-result');
  var canvas = document.getElementById('qr-canvas');
  var copyBtn = document.getElementById('copy-button');
  var downloadBtn = document.getElementById('download-button');

  // Popup para feedback
  function showPopup(message) {
    var popup = document.createElement('div');
    popup.textContent = message;
    popup.className = 'qr-popup';
    document.body.appendChild(popup);
    setTimeout(function () {
      popup.style.opacity = '0';
      setTimeout(function () { popup.remove(); }, 500);
    }, 1200);
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      var url = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(text);
      var img = new window.Image();
      img.crossOrigin = 'Anonymous';
      img.onload = function () {
        canvas.width = 200;
        canvas.height = 200;
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 200, 200);
        ctx.drawImage(img, 0, 0, 200, 200);
        result.style.display = 'block';
      };
      img.onerror = function () {
        alert('Error al generar el QR.');
      };
      img.src = url;
    });
  }

  // Copiar QR al portapapeles como imagen
  if (copyBtn) {
    copyBtn.addEventListener('click', function (e) {
      e.preventDefault();
      canvas.toBlob(function(blob) {
        if (navigator.clipboard && window.ClipboardItem) {
          var item = new ClipboardItem({ 'image/png': blob });
          navigator.clipboard.write([item]).then(function () {
            showPopup('QR copied!');
          });
        } else {
          alert('Tu navegador no soporta copiar imágenes al portapapeles.');
        }
      }, 'image/png');
    });
  }

  // Descargar QR como imagen
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var link = document.createElement('a');
      link.download = 'qr-code.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }
});


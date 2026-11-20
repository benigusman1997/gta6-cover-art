/* Vice City Poster Studio — editor.
   Owns the poster state, photo loading, panel selection and dragging,
   every toolbar control, and the PNG export. The preview canvas renders
   with the same renderPoster call the export uses. */

(function (global) {
  'use strict';

  var R = global.ViceCityRender;

  var SAMPLE_PHOTOS = [
    { name: 'Boulevard', src: 'samples/boulevard.jpg' },
    { name: 'Pier', src: 'samples/pier.jpg' },
  ];

  function defaultPanels(count) {
    var panels = [];
    for (var i = 0; i < count; i++) {
      panels.push({ photoIndex: i % 2, zoom: 1, panX: 0, panY: 0, grade: 'sunset' });
    }
    return panels;
  }

  function PosterEditor(canvas) {
    this.canvas = canvas;
    this.state = {
      template: 'grid',
      sizeKey: '1920x1080',
      caption: 'VICE CITY',
      subCaption: 'WELCOME BACK TO PARADISE',
      captionColour: '#ffffff',
      captionScale: 1,
      gradientFill: true,
      halftone: true,
      photos: [],
      panels: defaultPanels(4),
      selectedPanel: 0,
      showSelection: true,
    };
    this.ready = this.loadSamples();
  }

  PosterEditor.prototype.loadSamples = function () {
    var self = this;
    var loads = SAMPLE_PHOTOS.map(function (sample) {
      return new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () { resolve({ name: sample.name, img: img }); };
        img.onerror = function () { resolve(null); };
        img.src = sample.src;
      });
    });
    return Promise.all(loads).then(function (results) {
      self.state.photos = results.filter(Boolean);
      if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
        return document.fonts.load('italic 400 80px Anton').catch(function () {}).then(function () {
          return self.state.photos;
        });
      }
      return self.state.photos;
    });
  };

  PosterEditor.prototype.setSize = function (sizeKey) {
    var size = R.EXPORT_SIZES[sizeKey];
    if (!size) return;
    this.state.sizeKey = sizeKey;
    this.canvas.width = size.w;
    this.canvas.height = size.h;
    this.render();
  };

  PosterEditor.prototype.setTemplate = function (name) {
    var tpl = R.TEMPLATES[name];
    if (!tpl) return;
    this.state.template = name;
    var old = this.state.panels;
    this.state.panels = defaultPanels(tpl.panels);
    for (var i = 0; i < Math.min(old.length, tpl.panels); i++) {
      this.state.panels[i] = old[i];
    }
    if (this.state.selectedPanel >= tpl.panels) this.state.selectedPanel = 0;
    this.render();
  };

  PosterEditor.prototype.selectPanel = function (index) {
    if (index < 0 || index >= this.state.panels.length) return;
    this.state.selectedPanel = index;
    this.render();
    if (this.onSelectionChange) this.onSelectionChange(index);
  };

  PosterEditor.prototype.selectedPanel = function () {
    return this.state.panels[this.state.selectedPanel];
  };

  PosterEditor.prototype.setPanelPhoto = function (photoIndex) {
    var panel = this.selectedPanel();
    if (!panel || !this.state.photos[photoIndex]) return;
    panel.photoIndex = photoIndex;
    this.render();
  };

  PosterEditor.prototype.fillAllWithPhoto = function (photoIndex) {
    if (!this.state.photos[photoIndex]) return;
    this.state.panels.forEach(function (panel) { panel.photoIndex = photoIndex; });
    this.render();
  };

  PosterEditor.prototype.addPhotoFile = function (file) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          self.state.photos.push({ name: file.name.replace(/\.[^.]+$/, '') || 'Photo', img: img });
          resolve(self.state.photos.length - 1);
        };
        img.onerror = function () { reject(new Error('Could not read that image.')); };
        img.src = String(reader.result);
      };
      reader.onerror = function () { reject(new Error('Could not read that file.')); };
      reader.readAsDataURL(file);
    });
  };

  PosterEditor.prototype.render = function () {
    R.renderPoster(this.canvas, this.state);
  };

  /* Export the exact preview artwork as a PNG file at the chosen size. */
  PosterEditor.prototype.exportPNG = function (sizeKey) {
    var self = this;
    var size = R.EXPORT_SIZES[sizeKey || this.state.sizeKey];
    var offscreen = document.createElement('canvas');
    offscreen.width = size.w;
    offscreen.height = size.h;
    var exportState = Object.assign({}, this.state, { showSelection: false, sizeKey: sizeKey || this.state.sizeKey });
    R.renderPoster(offscreen, exportState);
    return new Promise(function (resolve) {
      offscreen.toBlob(function (blob) {
        resolve({ blob: blob, width: size.w, height: size.h, name: 'vice-city-poster-' + size.w + 'x' + size.h + '.png' });
      }, 'image/png');
    });
  };

  PosterEditor.prototype.downloadExport = function (sizeKey) {
    var self = this;
    return this.exportPNG(sizeKey).then(function (result) {
      var url = URL.createObjectURL(result.blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = result.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return result;
    });
  };

  /* Hit-test a point on the canvas (CSS pixels) against the panel rects. */
  PosterEditor.prototype.panelAtPoint = function (clientX, clientY) {
    var rect = this.canvas.getBoundingClientRect();
    var x = (clientX - rect.left) * (this.canvas.width / rect.width);
    var y = (clientY - rect.top) * (this.canvas.height / rect.height);
    var rects = R.panelRectsPx(this.canvas.width, this.canvas.height, this.state.template, this.state.sizeKey);
    for (var i = rects.length - 1; i >= 0; i--) {
      var r = rects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
    }
    return -1;
  };

  /* ---- Wiring: connect every control in index.html to the editor. ---- */
  function wireEditor(editor) {
    var $ = function (id) { return document.getElementById(id); };
    var canvas = editor.canvas;

    function refreshInspector() {
      var panel = editor.selectedPanel();
      var count = editor.state.panels.length;
      $('panelName').textContent = 'Panel ' + (editor.state.selectedPanel + 1) + ' of ' + count;
      $('zoomSlider').value = String(panel.zoom);
      $('zoomOut').textContent = panel.zoom.toFixed(2) + '×';
      var select = $('panelPhotoSelect');
      select.innerHTML = '';
      editor.state.photos.forEach(function (photo, i) {
        var opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = photo.name;
        if (i === panel.photoIndex) opt.selected = true;
        select.appendChild(opt);
      });
      document.querySelectorAll('#gradeList .grade-btn').forEach(function (btn) {
        btn.classList.toggle('is-active', btn.dataset.grade === panel.grade);
      });
    }

    function refreshPhotoStrip() {
      var strip = $('photoStrip');
      strip.innerHTML = '';
      editor.state.photos.forEach(function (photo, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'photo-thumb';
        btn.title = photo.name;
        var thumb = document.createElement('img');
        thumb.src = photo.img.src;
        thumb.alt = photo.name;
        btn.appendChild(thumb);
        btn.addEventListener('click', function () {
          editor.setPanelPhoto(i);
          document.querySelectorAll('.photo-thumb').forEach(function (el, j) {
            el.classList.toggle('is-active', j === i);
          });
          refreshInspector();
        });
        strip.appendChild(btn);
      });
    }

    editor.onSelectionChange = refreshInspector;

    /* Template + size pickers. */
    document.querySelectorAll('#templateList .template-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#templateList .template-btn').forEach(function (el) {
          var active = el === btn;
          el.classList.toggle('is-active', active);
          el.setAttribute('aria-pressed', String(active));
        });
        editor.setTemplate(btn.dataset.template);
        refreshInspector();
      });
    });
    document.querySelectorAll('#sizeList .size-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#sizeList .size-btn').forEach(function (el) {
          el.classList.toggle('is-active', el === btn);
        });
        editor.setSize(btn.dataset.size);
      });
    });

    /* Caption controls. */
    $('captionInput').addEventListener('input', function (e) {
      editor.state.caption = e.target.value;
      editor.render();
    });
    $('subCaptionInput').addEventListener('input', function (e) {
      editor.state.subCaption = e.target.value;
      editor.render();
    });
    $('capSizeSlider').addEventListener('input', function (e) {
      editor.state.captionScale = Number(e.target.value) / 100;
      $('capSizeOut').textContent = e.target.value + '%';
      editor.render();
    });
    document.querySelectorAll('#captionSwatches .swatch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#captionSwatches .swatch').forEach(function (el) {
          el.classList.toggle('is-active', el === btn);
        });
        editor.state.captionColour = btn.dataset.colour;
        editor.render();
      });
    });
    $('gradientFillCheck').addEventListener('change', function (e) {
      editor.state.gradientFill = e.target.checked;
      editor.render();
    });
    $('halftoneCheck').addEventListener('change', function (e) {
      editor.state.halftone = e.target.checked;
      editor.render();
    });

    /* Selected-panel controls. */
    $('panelPhotoSelect').addEventListener('change', function (e) {
      editor.setPanelPhoto(Number(e.target.value));
      refreshPhotoStrip();
    });
    $('zoomSlider').addEventListener('input', function (e) {
      editor.selectedPanel().zoom = Number(e.target.value);
      $('zoomOut').textContent = Number(e.target.value).toFixed(2) + '×';
      editor.render();
    });
    document.querySelectorAll('.pad-grid button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parts = btn.dataset.pan.split(',').map(Number);
        var panel = editor.selectedPanel();
        if (parts[0] === 0 && parts[1] === 0) {
          panel.panX = 0; panel.panY = 0;
        } else {
          panel.panX = Math.max(-1, Math.min(1, panel.panX + parts[0] * 0.15));
          panel.panY = Math.max(-1, Math.min(1, panel.panY + parts[1] * 0.15));
        }
        editor.render();
      });
    });
    document.querySelectorAll('#gradeList .grade-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        editor.selectedPanel().grade = btn.dataset.grade;
        editor.render();
        refreshInspector();
      });
    });
    $('fillAllBtn').addEventListener('click', function () {
      editor.fillAllWithPhoto(editor.selectedPanel().photoIndex);
      refreshInspector();
    });

    /* Uploads. */
    $('photoInput').addEventListener('change', function (e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      var chain = Promise.resolve();
      files.forEach(function (file) {
        chain = chain.then(function () { return editor.addPhotoFile(file); });
      });
      chain.then(function () { refreshPhotoStrip(); refreshInspector(); editor.render(); })
        .catch(function (err) { alert(err.message); });
      e.target.value = '';
    });

    /* Click to select a panel; drag to pan its photo. */
    var drag = null;
    canvas.addEventListener('pointerdown', function (e) {
      var index = editor.panelAtPoint(e.clientX, e.clientY);
      if (index < 0) return;
      editor.selectPanel(index);
      refreshInspector();
      var panel = editor.selectedPanel();
      drag = { x: e.clientX, y: e.clientY, panX: panel.panX, panY: panel.panY };
      canvas.classList.add('dragging');
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var rect = canvas.getBoundingClientRect();
      var panel = editor.selectedPanel();
      panel.panX = Math.max(-1, Math.min(1, drag.panX + (e.clientX - drag.x) / rect.width * 1.6));
      panel.panY = Math.max(-1, Math.min(1, drag.panY + (e.clientY - drag.y) / rect.height * 1.6));
      editor.render();
    });
    function endDrag() {
      drag = null;
      canvas.classList.remove('dragging');
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    /* Export. */
    $('exportBtn').addEventListener('click', function () {
      editor.downloadExport().catch(function () { alert('Export failed — please try again.'); });
    });

    refreshPhotoStrip();
    refreshInspector();
  }

  global.ViceCityEditor = {
    PosterEditor: PosterEditor,
    wireEditor: wireEditor,
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* Vice City Poster Studio — bootstrap.
   Creates the editor, wires the controls, and paints the first preview
   once the sample photos and the Anton display font are ready.
   Exposes a small window.__studio handle so automated checks can drive
   the app (set a template or size, export a PNG) without a mouse. */

(function (global) {
  'use strict';

  function boot() {
    var canvas = document.getElementById('posterCanvas');
    var editor = new global.ViceCityEditor.PosterEditor(canvas);
    global.ViceCityEditor.wireEditor(editor);
    editor.ready.then(function () {
      editor.setSize(editor.state.sizeKey);
      editor.render();
    });

    global.__studio = {
      editor: editor,
      setTemplate: function (name) { editor.setTemplate(name); return editor.state.template; },
      setSize: function (sizeKey) { editor.setSize(sizeKey); return editor.state.sizeKey; },
      setCaption: function (text) {
        editor.state.caption = text;
        document.getElementById('captionInput').value = text;
        editor.render();
        return editor.state.caption;
      },
      exportDataURL: function (sizeKey) {
        var size = global.ViceCityRender.EXPORT_SIZES[sizeKey || editor.state.sizeKey];
        var offscreen = document.createElement('canvas');
        offscreen.width = size.w;
        offscreen.height = size.h;
        var exportState = Object.assign({}, editor.state, { showSelection: false, sizeKey: sizeKey || editor.state.sizeKey });
        global.ViceCityRender.renderPoster(offscreen, exportState);
        return offscreen.toDataURL('image/png');
      },
      ready: function () { return editor.ready; },
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);

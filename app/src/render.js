/* Vice City Poster Studio — poster renderer.
   One function, renderPoster, draws the exact artwork the app exports:
   sunset sky, procedural skyline and palms, multi-panel photo collage,
   bold outlined caption, halftone dots, film grain and vignette.
   Everything here is original vector art drawn with canvas paths. */

(function (global) {
  'use strict';

  /* Deterministic pseudo-random stream so every render of the same poster
     is byte-identical (the skyline, palms and grain never flicker). */
  function seededRandom(seed) {
    let s = seed >>> 0;
    return function next() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* Panel templates. Each rect is a fraction of the photo area. */
  var TEMPLATES = {
    grid: {
      label: '2 x 2 Grid',
      panels: 4,
      rects: [
        { x: 0.00, y: 0.00, w: 0.50, h: 0.50 },
        { x: 0.50, y: 0.00, w: 0.50, h: 0.50 },
        { x: 0.00, y: 0.50, w: 0.50, h: 0.50 },
        { x: 0.50, y: 0.50, w: 0.50, h: 0.50 },
      ],
    },
    strips: {
      label: '3 Strips',
      panels: 3,
      rects: [
        { x: 0.00, y: 0.00, w: 0.3334, h: 1.00 },
        { x: 0.3334, y: 0.00, w: 0.3333, h: 1.00 },
        { x: 0.6667, y: 0.00, w: 0.3333, h: 1.00 },
      ],
    },
    hero: {
      label: 'Hero + 2',
      panels: 3,
      rects: [
        { x: 0.00, y: 0.00, w: 0.62, h: 1.00 },
        { x: 0.62, y: 0.00, w: 0.38, h: 0.50 },
        { x: 0.62, y: 0.50, w: 0.38, h: 0.50 },
      ],
    },
  };

  /* Colour grades applied to a panel photo through the canvas filter. */
  var GRADES = {
    sunset: 'sepia(0.45) saturate(1.9) hue-rotate(-12deg) contrast(1.08) brightness(1.02)',
    natural: 'saturate(1.05) contrast(1.03)',
    neon: 'saturate(2.4) hue-rotate(18deg) contrast(1.25) brightness(1.06)',
    noir: 'grayscale(1) contrast(1.45) brightness(0.94)',
  };

  var EXPORT_SIZES = {
    '1080x1080': { w: 1080, h: 1080 },
    '1080x1350': { w: 1080, h: 1350 },
    '1920x1080': { w: 1920, h: 1080 },
  };

  var GUTTER = 14;   /* thick white gutter between panels, in export pixels at 1080 wide */
  var KEYLINE = 3;   /* thin black keyline hugging each photo */

  function sunsetSky(ctx, w, h, band) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.00, '#2b0a4e');
    g.addColorStop(0.34, '#7a1e6e');
    g.addColorStop(0.58, '#e33e7f');
    g.addColorStop(0.78, '#ff7a18');
    g.addColorStop(1.00, '#ffc93c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    /* Low sun glowing in the caption band, behind the lettering. */
    var sunX = w * 0.78, sunY = band.y + band.h * 0.45, sunR = band.h * 0.48;
    var halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.6);
    halo.addColorStop(0, 'rgba(255, 214, 120, 0.85)');
    halo.addColorStop(0.4, 'rgba(255, 122, 24, 0.35)');
    halo.addColorStop(1, 'rgba(255, 122, 24, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Procedural downtown skyline: dark towers with a few lit windows. */
  function drawSkyline(ctx, w, baseY, h, seed) {
    var rnd = seededRandom(seed);
    var x = -w * 0.02;
    ctx.fillStyle = '#1a0b2e';
    while (x < w * 1.02) {
      var bw = w * (0.04 + rnd() * 0.06);
      var bh = h * (0.30 + rnd() * 0.45);
      ctx.fillRect(x, baseY - bh, bw, bh);
      if (rnd() > 0.6) { /* rooftop antenna */
        ctx.fillRect(x + bw * 0.45, baseY - bh - h * 0.05, bw * 0.08, h * 0.05);
      }
      /* Lit windows, warm gold against the dark tower. */
      ctx.fillStyle = 'rgba(255, 201, 60, 0.75)';
      var rows = Math.floor(bh / (h * 0.035));
      var cols = Math.floor(bw / (w * 0.02));
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (rnd() > 0.82) {
            ctx.fillRect(x + w * 0.008 + c * w * 0.02, baseY - bh + h * 0.014 + r * h * 0.035, w * 0.008, h * 0.016);
          }
        }
      }
      ctx.fillStyle = '#1a0b2e';
      x += bw + w * 0.02;
    }
  }

  /* One palm silhouette: curved trunk plus drooping fronds. */
  function drawPalm(ctx, x, baseY, size, lean, seed) {
    var rnd = seededRandom(seed);
    ctx.save();
    ctx.translate(x, baseY);
    ctx.rotate(lean);
    ctx.strokeStyle = '#160826';
    ctx.fillStyle = '#160826';
    ctx.lineWidth = size * 0.045;
    ctx.lineCap = 'round';
    /* Trunk, gently bowed. */
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.06, -size * 0.5, size * 0.02, -size * 0.95);
    ctx.stroke();
    /* Fronds fanning from the crown: few, thick, drooping arcs. */
    ctx.translate(size * 0.02, -size * 0.95);
    for (var i = 0; i < 6; i++) {
      var a = -Math.PI * (0.06 + i * 0.16) + (rnd() - 0.5) * 0.08;
      var len = size * (0.45 + rnd() * 0.15);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(a) * len * 0.55, Math.sin(a) * len * 0.55 - size * 0.05,
        Math.cos(a) * len, Math.sin(a) * len + size * 0.24);
      ctx.lineWidth = size * 0.05;
      ctx.stroke();
    }
    /* Coconuts. */
    ctx.beginPath();
    ctx.arc(-size * 0.03, size * 0.03, size * 0.035, 0, Math.PI * 2);
    ctx.arc(size * 0.04, size * 0.05, size * 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* Cover-fit draw of one photo inside a panel rect, with pan and zoom. */
  function drawPanelPhoto(ctx, img, rect, panel) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var scale = Math.max(rect.w / iw, rect.h / ih) * (panel.zoom || 1);
    var dw = iw * scale, dh = ih * scale;
    var dx = rect.x + (rect.w - dw) / 2 + (panel.panX || 0) * rect.w * 0.4;
    var dy = rect.y + (rect.h - dh) / 2 + (panel.panY || 0) * rect.h * 0.4;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.filter = GRADES[panel.grade] || GRADES.sunset;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
    /* Warm sunset wash over the photo so panels sit in the same world. */
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    var wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    wash.addColorStop(0, 'rgba(255, 93, 162, 0.10)');
    wash.addColorStop(1, 'rgba(255, 178, 44, 0.12)');
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }

  /* Huge condensed italic caption: hard offset shadow, black outline, fill. */
  function drawCaption(ctx, w, h, band, state) {
    var size = band.h * 0.52 * (state.captionScale || 1);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic 400 ' + Math.round(size) + 'px Anton, "Arial Narrow", sans-serif';
    var cx = w / 2;
    var cy = band.y + band.h * 0.42;
    var text = (state.caption || 'VICE CITY').toUpperCase();
    /* Hard offset shadow, GTA poster style. */
    ctx.fillStyle = '#14061f';
    ctx.fillText(text, cx + size * 0.045, cy + size * 0.06);
    /* Fill: white, or a sunset gradient when asked. */
    if (state.gradientFill) {
      var g = ctx.createLinearGradient(cx, cy - size * 0.5, cx, cy + size * 0.5);
      g.addColorStop(0, '#fff7d6');
      g.addColorStop(0.45, '#ffd166');
      g.addColorStop(1, '#ff5da2');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = state.captionColour || '#ffffff';
    }
    ctx.lineWidth = Math.max(2, size * 0.045);
    ctx.strokeStyle = '#14061f';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, cx, cy);
    ctx.fillText(text, cx, cy);
    /* Sub-caption in spaced small caps. */
    var sub = (state.subCaption || '').toUpperCase();
    if (sub) {
      var subSize = Math.max(10, band.h * 0.115);
      ctx.font = '400 ' + Math.round(subSize) + 'px "Arial Narrow", Arial, sans-serif';
      var subText = sub.split('').join('\u2009');
      var subY = band.y + band.h * 0.84;
      ctx.lineWidth = Math.max(2, subSize * 0.18);
      ctx.strokeStyle = '#14061f';
      ctx.lineJoin = 'round';
      ctx.strokeText(subText, cx, subY);
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(subText, cx, subY);
    }
    ctx.restore();
  }

  function drawHalftone(ctx, w, h, area) {
    var step = Math.max(9, Math.round(w / 160));
    var r = step * 0.16;
    ctx.save();
    ctx.fillStyle = 'rgba(20, 6, 31, 0.16)';
    for (var y = area.y + step / 2; y < area.y + area.h; y += step) {
      for (var x = area.x + step / 2; x < area.x + area.w; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawGrain(ctx, w, h, seed) {
    var rnd = seededRandom(seed);
    var count = Math.floor((w * h) / 2600);
    ctx.save();
    for (var i = 0; i < count; i++) {
      var v = rnd();
      ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(rnd() * w, rnd() * h, 1.6, 1.6);
    }
    ctx.restore();
  }

  function drawVignette(ctx, w, h) {
    var g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(10, 4, 20, 0)');
    g.addColorStop(1, 'rgba(10, 4, 20, 0.38)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  /* The one render path: preview and export call exactly this. */
  function renderPoster(canvas, state) {
    var w = canvas.width, h = canvas.height;
    var ctx = canvas.getContext('2d');
    var scale = w / 1080; /* gutter and keyline scale with export width */
    var gutter = Math.max(6, Math.round(GUTTER * scale));
    var keyline = Math.max(2, Math.round(KEYLINE * scale));
    var outer = Math.max(10, Math.round(26 * scale));

    var bandH = Math.round(h * (state.sizeKey === '1080x1350' ? 0.20 : 0.21));
    var band = { x: 0, y: h - bandH, w: w, h: bandH };
    var photoArea = { x: outer, y: outer, w: w - outer * 2, h: h - bandH - outer };

    sunsetSky(ctx, w, h, band);

    /* Panels: white gutter slab, then each photo with a black keyline. */
    var tpl = TEMPLATES[state.template] || TEMPLATES.grid;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(photoArea.x - gutter / 2, photoArea.y - gutter / 2,
      photoArea.w + gutter, photoArea.h + gutter);
    tpl.rects.forEach(function (frac, i) {
      var panel = state.panels[i] || { photoIndex: 0, zoom: 1, panX: 0, panY: 0, grade: 'sunset' };
      var rect = {
        x: photoArea.x + frac.x * photoArea.w + (frac.x > 0 ? gutter / 2 : 0),
        y: photoArea.y + frac.y * photoArea.h + (frac.y > 0 ? gutter / 2 : 0),
        w: frac.w * photoArea.w - (frac.x > 0 ? gutter / 2 : 0) - (frac.x + frac.w < 1 ? gutter / 2 : 0),
        h: frac.h * photoArea.h - (frac.y > 0 ? gutter / 2 : 0) - (frac.y + frac.h < 1 ? gutter / 2 : 0),
      };
      var img = state.photos[panel.photoIndex] && state.photos[panel.photoIndex].img;
      if (img && img.complete && img.naturalWidth) {
        drawPanelPhoto(ctx, img, rect, panel);
      } else {
        /* Empty panel: sunset placeholder so the poster never looks broken. */
        var pg = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
        pg.addColorStop(0, '#7a1e6e');
        pg.addColorStop(1, '#ff7a18');
        ctx.fillStyle = pg;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      }
      ctx.strokeStyle = '#14061f';
      ctx.lineWidth = keyline;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      /* Selected panel gets a gold outline in the live preview only. */
      if (state.selectedPanel === i && state.showSelection) {
        ctx.save();
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = Math.max(3, Math.round(5 * scale));
        ctx.setLineDash([Math.round(18 * scale), Math.round(10 * scale)]);
        ctx.strokeRect(rect.x - keyline, rect.y - keyline, rect.w + keyline * 2, rect.h + keyline * 2);
        ctx.restore();
      }
    });

    /* Skyline and palms are painted over the sky but under the caption,
       rising from the bottom edge so they frame the lettering. */
    drawSkyline(ctx, w, h * 0.99, bandH, 20261120);
    drawPalm(ctx, w * 0.045, h * 0.99, bandH * 0.9, -0.10, 11);
    drawPalm(ctx, w * 0.955, h * 0.99, bandH * 0.9, 0.12, 23);

    drawCaption(ctx, w, h, band, state);
    if (state.halftone) {
      drawHalftone(ctx, w, h, { x: 0, y: band.y, w: w, h: bandH });
      drawGrain(ctx, w, h, 777);
    }
    drawVignette(ctx, w, h);
    return canvas;
  }

  /* Panel rects in canvas pixels, for hit-testing clicks and drags. */
  function panelRectsPx(canvasWidth, canvasHeight, template, sizeKey) {
    var outer = Math.max(10, Math.round(26 * (canvasWidth / 1080)));
    var bandH = Math.round(canvasHeight * (sizeKey === '1080x1350' ? 0.20 : 0.21));
    var photoArea = { x: outer, y: outer, w: canvasWidth - outer * 2, h: canvasHeight - bandH - outer };
    var tpl = TEMPLATES[template] || TEMPLATES.grid;
    return tpl.rects.map(function (frac) {
      return {
        x: photoArea.x + frac.x * photoArea.w,
        y: photoArea.y + frac.y * photoArea.h,
        w: frac.w * photoArea.w,
        h: frac.h * photoArea.h,
      };
    });
  }

  global.ViceCityRender = {
    TEMPLATES: TEMPLATES,
    GRADES: GRADES,
    EXPORT_SIZES: EXPORT_SIZES,
    renderPoster: renderPoster,
    panelRectsPx: panelRectsPx,
  };
})(typeof window !== 'undefined' ? window : globalThis);

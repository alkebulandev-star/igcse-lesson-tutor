/* ════════════════════════════════════════════════════════════════════
   LESSON TEACHER — MASCOT (Paperclip + Graduation Cap)
   ────────────────────────────────────────────────────────────────────
   A custom SVG mascot that replaces the generic 👩‍🏫 emoji used as
   the AI tutor avatar across welcome, chat, lesson loader, kids zone
   and the floating Ask-Tutor pill.

   Six expression states: idle · thinking · explaining ·
   encouraging · surprised · typing.

   Public API:
     LTMascot.render(el, opts?)        — replace el's contents with mascot
     LTMascot.create(opts?) → Element  — return a new mascot element
     LTMascot.setState(el, state)      — change a mounted mascot's state
     LTMascot.replaceEmoji()           — auto-swap every 👩‍🏫 emoji on
                                          the page for a sized mascot
   Opts: { state:'idle'|'thinking'|'explaining'|'encouraging'|'surprised'|'typing',
           size: px (default 64), withNotepad: bool, animated: bool }
   ════════════════════════════════════════════════════════════════════ */
(function(){
  if (window.LTMascot) return;
  'use strict';

  // ─── One-time CSS injection ───────────────────────────────────────
  function injectStyles(){
    if (document.getElementById('lt-mascot-css')) return;
    var css = ''
      // Container ----------------------------------------------------
      + '.lt-mascot{display:inline-block;line-height:0;vertical-align:middle;position:relative}'
      + '.lt-mascot svg{display:block;width:100%;height:100%;overflow:visible}'
      // Idle floating animation
      + '.lt-mascot.animated .lt-m-body{animation:lt-m-bob 4.2s ease-in-out infinite}'
      + '@keyframes lt-m-bob{0%,100%{transform:translateY(0) rotate(-1.2deg)}50%{transform:translateY(-4px) rotate(1.2deg)}}'
      // Tassel sway
      + '.lt-mascot.animated .lt-m-tassel{transform-origin:155px 25px;animation:lt-m-tassel 3.3s ease-in-out infinite}'
      + '@keyframes lt-m-tassel{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(6deg)}}'
      // Blink
      + '.lt-mascot.animated .lt-m-eyelid{animation:lt-m-blink 4.8s ease-in-out infinite}'
      + '@keyframes lt-m-blink{0%,94%,100%{transform:scaleY(0);opacity:0}96%,98%{transform:scaleY(1);opacity:1}}'
      // Hover bounce
      + '.lt-mascot:hover .lt-m-body{transform:translateY(-3px) rotate(2deg) scale(1.05)}'
      // State: thinking — light bulb pulse
      + '.lt-mascot[data-state="thinking"] .lt-m-bulb{display:block;animation:lt-m-bulb 1.4s ease-in-out infinite}'
      + '@keyframes lt-m-bulb{0%,100%{opacity:.4;transform:translateY(0) scale(.92)}50%{opacity:1;transform:translateY(-2px) scale(1.08)}}'
      // State: surprised — pop scale
      + '.lt-mascot[data-state="surprised"] .lt-m-body{animation:lt-m-pop 1.6s ease-in-out infinite}'
      + '@keyframes lt-m-pop{0%,100%{transform:scale(1)}30%{transform:scale(1.08)}60%{transform:scale(.96)}}'
      // State: encouraging — happy squint  (the SVG flips the eye shape)
      + '.lt-mascot[data-state="encouraging"] .lt-m-pupil{opacity:.92}'
      + '.lt-mascot[data-state="encouraging"] .lt-m-confetti{display:block;animation:lt-m-confetti 1.3s ease-out infinite}'
      + '@keyframes lt-m-confetti{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(-26px) rotate(180deg);opacity:0}}'
      // State: typing — typing dots
      + '.lt-mascot[data-state="typing"] .lt-m-dots{display:block;animation:lt-m-dots 1s ease-in-out infinite}'
      + '@keyframes lt-m-dots{0%,100%{opacity:.3}40%,60%{opacity:1}}'
      + '.lt-mascot[data-state="typing"] .lt-m-dot1{animation-delay:0s}'
      + '.lt-mascot[data-state="typing"] .lt-m-dot2{animation-delay:.15s}'
      + '.lt-mascot[data-state="typing"] .lt-m-dot3{animation-delay:.3s}'
      // Default-hidden state-specific elements
      + '.lt-mascot .lt-m-bulb,.lt-mascot .lt-m-dots,.lt-mascot .lt-m-confetti,.lt-mascot .lt-m-omouth{display:none}'
      // State overrides for mouth shape
      + '.lt-mascot[data-state="surprised"] .lt-m-smile{display:none}'
      + '.lt-mascot[data-state="surprised"] .lt-m-omouth{display:block}'
      // State overrides for eyebrows
      + '.lt-mascot[data-state="thinking"] .lt-m-brow-l{transform:translateY(-2px) rotate(-8deg)}'
      + '.lt-mascot[data-state="thinking"] .lt-m-brow-r{transform:translateY(2px) rotate(8deg)}'
      // State overrides for pupils — look up-right when thinking
      + '.lt-mascot[data-state="thinking"] .lt-m-pupil-l{transform:translate(2px,-3px)}'
      + '.lt-mascot[data-state="thinking"] .lt-m-pupil-r{transform:translate(3px,-3px)}'
      // Encouraging — squint eyes (replace circles with arcs)
      + '.lt-mascot[data-state="encouraging"] .lt-m-eye{display:none}'
      + '.lt-mascot[data-state="encouraging"] .lt-m-pupil{display:none}'
      + '.lt-mascot[data-state="encouraging"] .lt-m-eye-squint{display:block}'
      + '.lt-mascot .lt-m-eye-squint{display:none}'
      // Smile gets wider when encouraging
      + '.lt-mascot[data-state="encouraging"] .lt-m-smile{stroke-width:3;d:path("M86 110 Q110 124 134 110")}'
      // Smooth state transitions
      + '.lt-mascot .lt-m-pupil,.lt-mascot .lt-m-brow-l,.lt-mascot .lt-m-brow-r{transition:transform .35s cubic-bezier(.4,0,.2,1)}'
      // Notepad
      + '.lt-mascot .lt-m-pad{transform-origin:110px 165px}'
      ;
    var s = document.createElement('style');
    s.id = 'lt-mascot-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ─── SVG markup (single source of truth) ──────────────────────────
  function svg(opts){
    var withPad = opts && opts.withNotepad;
    var pad = withPad
      ? '<g class="lt-m-pad">'
        + '<rect x="38" y="135" width="144" height="80" rx="3" fill="#fde68a" stroke="#f3d96a" stroke-width="1"/>'
        + '<line x1="48" y1="135" x2="48" y2="215" stroke="#ef4444" stroke-width="0.7" opacity=".55"/>'
        + '<line x1="56" y1="155" x2="178" y2="155" stroke="#94c5e8" stroke-width="0.5" opacity=".55"/>'
        + '<line x1="56" y1="170" x2="178" y2="170" stroke="#94c5e8" stroke-width="0.5" opacity=".55"/>'
        + '<line x1="56" y1="185" x2="178" y2="185" stroke="#94c5e8" stroke-width="0.5" opacity=".55"/>'
        + '<line x1="56" y1="200" x2="178" y2="200" stroke="#94c5e8" stroke-width="0.5" opacity=".55"/>'
        + '</g>'
      : '';
    // Body group is where the bob/scale animations apply
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 230" aria-hidden="true">'
      // Soft drop shadow under whole mascot
      + '<ellipse cx="110" cy="220" rx="60" ry="6" fill="rgba(20,32,40,.18)"/>'
      + pad
      // Body group ----
      + '<g class="lt-m-body" style="transform-origin:110px 130px">'
      // Paperclip silhouette — outer U bend + inner short stroke
      + '<defs>'
        + '<linearGradient id="lt-m-silver" x1="0%" y1="0%" x2="100%" y2="100%">'
          + '<stop offset="0%" stop-color="#e5e7eb"/>'
          + '<stop offset="50%" stop-color="#cbd1d8"/>'
          + '<stop offset="100%" stop-color="#9ba3ad"/>'
        + '</linearGradient>'
      + '</defs>'
      // Outer wire (rounded square U)
      + '<path d="M65 145 L65 65 Q65 38 92 38 L128 38 Q155 38 155 65 L155 145" '
            + 'fill="none" stroke="url(#lt-m-silver)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>'
      // Inner short stroke
      + '<path d="M88 145 L88 78 Q88 70 96 70 L116 70" '
            + 'fill="none" stroke="url(#lt-m-silver)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>'
      // Subtle metallic highlight
      + '<path d="M68 65 Q72 50 92 46" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".65"/>'

      // Graduation cap (mortarboard) ----
      + '<g>'
        + '<polygon points="40,30 180,30 110,8 -7" fill="#0b141a"/>'
        + '<polygon points="40,30 180,30 110,8" fill="#1a2530"/>'
        + '<rect x="78" y="28" width="64" height="6" rx="1" fill="#0b141a"/>'
        // Button on top
        + '<circle cx="110" cy="14" r="3.2" fill="#264e36"/>'
        // Tassel
        + '<g class="lt-m-tassel">'
          + '<path d="M155 30 Q161 42 162 60" stroke="#fbbf24" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
          + '<circle cx="162" cy="62" r="5.5" fill="#fbbf24"/>'
          + '<line x1="162" y1="58" x2="162" y2="68" stroke="#f59e0b" stroke-width="1.5"/>'
        + '</g>'
      + '</g>'

      // Eyebrows (subtle, under cap brim)
      + '<g>'
        + '<path class="lt-m-brow-l" d="M75 56 Q82 52 92 55" stroke="#1a2530" stroke-width="2.5" fill="none" stroke-linecap="round" style="transform-origin:84px 56px"/>'
        + '<path class="lt-m-brow-r" d="M128 55 Q138 52 145 56" stroke="#1a2530" stroke-width="2.5" fill="none" stroke-linecap="round" style="transform-origin:136px 56px"/>'
      + '</g>'

      // Eyes (whites + pupils + highlights)
      + '<g>'
        + '<ellipse class="lt-m-eye" cx="85" cy="76" rx="13.5" ry="15" fill="#fff" stroke="#1a2530" stroke-width="1.2"/>'
        + '<ellipse class="lt-m-eye" cx="135" cy="76" rx="13.5" ry="15" fill="#fff" stroke="#1a2530" stroke-width="1.2"/>'
        // Pupils
        + '<g class="lt-m-pupil-l" style="transform-origin:85px 78px"><ellipse class="lt-m-pupil" cx="85" cy="78" rx="6.5" ry="8" fill="#0b141a"/><circle cx="87" cy="74" r="2.4" fill="#fff"/></g>'
        + '<g class="lt-m-pupil-r" style="transform-origin:135px 78px"><ellipse class="lt-m-pupil" cx="135" cy="78" rx="6.5" ry="8" fill="#0b141a"/><circle cx="137" cy="74" r="2.4" fill="#fff"/></g>'
        // Eyelids (used for blink animation)
        + '<rect class="lt-m-eyelid" x="71" y="60" width="28" height="32" fill="#cbd1d8" style="transform-origin:85px 76px;transform:scaleY(0)"/>'
        + '<rect class="lt-m-eyelid" x="121" y="60" width="28" height="32" fill="#cbd1d8" style="transform-origin:135px 76px;transform:scaleY(0)"/>'
        // Squint arcs (encouraging state)
        + '<path class="lt-m-eye-squint" d="M73 82 Q85 70 97 82" stroke="#1a2530" stroke-width="3" fill="none" stroke-linecap="round"/>'
        + '<path class="lt-m-eye-squint" d="M123 82 Q135 70 147 82" stroke="#1a2530" stroke-width="3" fill="none" stroke-linecap="round"/>'
      + '</g>'

      // Mouth (smile default; "O" surprised; wider when encouraging via CSS)
      + '<path class="lt-m-smile" d="M92 108 Q110 120 128 108" stroke="#1a2530" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
      + '<ellipse class="lt-m-omouth" cx="110" cy="113" rx="6" ry="8" fill="#1a2530"/>'
      // Pink cheek dots
      + '<circle cx="72" cy="98" r="4" fill="#f9a8d4" opacity=".55"/>'
      + '<circle cx="148" cy="98" r="4" fill="#f9a8d4" opacity=".55"/>'

      // Thinking — bulb above head ----
      + '<g class="lt-m-bulb">'
        + '<circle cx="170" cy="14" r="9" fill="#fbbf24"/>'
        + '<rect x="166" y="22" width="8" height="4" rx="1" fill="#a98843"/>'
        + '<path d="M168 4 L170 10" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/>'
        + '<path d="M175 6 L172 11" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/>'
        + '<path d="M180 13 L174 14" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/>'
      + '</g>'

      // Typing — three dots near mouth
      + '<g class="lt-m-dots">'
        + '<circle class="lt-m-dot1" cx="96" cy="120" r="2.5" fill="#1a2530"/>'
        + '<circle class="lt-m-dot2" cx="110" cy="120" r="2.5" fill="#1a2530"/>'
        + '<circle class="lt-m-dot3" cx="124" cy="120" r="2.5" fill="#1a2530"/>'
      + '</g>'

      // Encouraging — confetti pieces
      + '<g class="lt-m-confetti">'
        + '<rect x="42" y="32" width="3" height="8" rx="1" fill="#264e36" transform="rotate(20 43 36)"/>'
        + '<rect x="170" y="34" width="3" height="8" rx="1" fill="#8a3324" transform="rotate(-25 171 38)"/>'
        + '<rect x="60" y="20" width="3" height="6" rx="1" fill="#2a4d6e" transform="rotate(40 61 23)"/>'
        + '<rect x="155" y="22" width="3" height="6" rx="1" fill="#fbbf24" transform="rotate(-40 156 25)"/>'
      + '</g>'

      + '</g>'  // /body
      + '</svg>';
  }

  // ─── Public API ───────────────────────────────────────────────────
  function create(opts){
    opts = opts || {};
    injectStyles();
    var size = opts.size || 64;
    var state = opts.state || 'idle';
    var animated = opts.animated !== false;
    var wrap = document.createElement('span');
    wrap.className = 'lt-mascot' + (animated ? ' animated' : '');
    wrap.setAttribute('data-state', state);
    wrap.setAttribute('role', 'img');
    wrap.setAttribute('aria-label', 'Lesson Teacher mascot');
    wrap.style.width = size + 'px';
    wrap.style.height = size + 'px';
    wrap.innerHTML = svg({withNotepad: !!opts.withNotepad});
    return wrap;
  }

  function render(el, opts){
    if (!el) return null;
    var m = create(opts);
    el.innerHTML = '';
    el.appendChild(m);
    return m;
  }

  function setState(el, state){
    if (!el) return;
    // Accept either the mascot wrapper or its container — find the .lt-mascot inside
    var m = el.classList && el.classList.contains('lt-mascot') ? el : el.querySelector && el.querySelector('.lt-mascot');
    if (m) m.setAttribute('data-state', state);
  }

  // Replace stand-alone 👩‍🏫 text nodes with a sized mascot. Idempotent.
  function replaceEmoji(root){
    injectStyles();
    root = root || document.body;
    var EMOJI = '👩‍🏫';
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function(n){
        if (!n.nodeValue || n.nodeValue.indexOf(EMOJI) < 0) return NodeFilter.FILTER_REJECT;
        // skip script/style/already-replaced
        var p = n.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('.lt-mascot,script,style,textarea,input')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(node){
      var parts = node.nodeValue.split(EMOJI);
      var frag = document.createDocumentFragment();
      parts.forEach(function(text, i){
        if (text) frag.appendChild(document.createTextNode(text));
        if (i < parts.length - 1){
          // Pick a reasonable size based on nearby font-size of the parent
          var fs = 0;
          try { fs = parseFloat(getComputedStyle(node.parentNode).fontSize) || 16; } catch(e){ fs = 16; }
          var size = Math.max(20, Math.round(fs * 1.6));
          var m = create({ size: size, state: 'idle' });
          m.style.verticalAlign = '-.35em';
          m.style.marginRight = '4px';
          frag.appendChild(m);
        }
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  // ─── Auto-bootstrap ────────────────────────────────────────────────
  // Run on DOM-ready and then again after each route change so dynamic
  // welcome / kids / chat injections also get mascotified.
  function boot(){
    injectStyles();
    replaceEmoji(document.body);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Re-run on hash / page changes
  window.addEventListener('lt-page-change', function(){ try { replaceEmoji(document.body); } catch(e){} });

  // Light watcher: every 1.5s scan visible text for any newly-injected emoji.
  // Cheap enough — only walks text nodes containing the literal emoji.
  setInterval(function(){
    try { replaceEmoji(document.body); } catch(e){}
  }, 1500);

  // ─── Hook AI events ────────────────────────────────────────────────
  // When an Anthropic / OpenAI request is in-flight, switch ALL mascots
  // on the page to 'thinking'. When it resolves, switch to 'explaining'
  // briefly, then back to 'idle'.
  function setAllMascots(state){
    document.querySelectorAll('.lt-mascot').forEach(function(m){ m.setAttribute('data-state', state); });
  }
  var inFlight = 0;
  var origFetch = window.fetch;
  if (typeof origFetch === 'function'){
    window.fetch = function(url, opts){
      var u = (typeof url === 'string') ? url : (url && url.url) || '';
      var isAI = (u.indexOf('/api/anthropic') === 0 || u.indexOf('/api/openai') === 0);
      if (isAI){
        inFlight++;
        if (inFlight === 1) setAllMascots('thinking');
      }
      var p = origFetch.apply(this, arguments);
      if (isAI){
        p.then(function(){
          inFlight = Math.max(0, inFlight - 1);
          if (inFlight === 0){
            setAllMascots('explaining');
            setTimeout(function(){ if (inFlight === 0) setAllMascots('idle'); }, 1400);
          }
        }, function(){
          inFlight = Math.max(0, inFlight - 1);
          if (inFlight === 0){
            setAllMascots('surprised');
            setTimeout(function(){ if (inFlight === 0) setAllMascots('idle'); }, 1400);
          }
        });
      }
      return p;
    };
  }

  // Public expose
  window.LTMascot = { create: create, render: render, setState: setState, replaceEmoji: replaceEmoji };
})();

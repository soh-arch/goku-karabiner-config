// Bra panel: floating Claude Code panel for the Bra layer of AbcAct.edn.
// Usage: osascript -l JavaScript bra.js <function-id>
ObjC.import('Cocoa');
ObjC.import('ApplicationServices');
ObjC.import('CoreGraphics');
ObjC.import('signal');
ObjC.import('unistd');

// ---- Settings ----

var CLAUDE = '/opt/homebrew/bin/claude';
var SLOT_DIR = 'bra-panel';
var COPY_ALL = {keyCode: 8, mods: 0x120000}; // ⌘⇧C
var TRANSIENT = 'org.nspasteboard.TransientType';

// ---- Prompts ----
// {input} is what was typed in the panel; the attachment is appended after the prompt.

var SYSTEM = {
  common: 'やりとり一回限りのものなので、次の質問に繋げるようなメッセージは不要です。前置きや締めの言葉は書かないでください。',
  pasteable: '結果のテキストだけを返してください。そのまま貼り付けて使えるように、説明や注釈は付けないでください。',
  markdown: '見出し、箇条書き、太字、表などの Markdown を積極的に使って、読みやすく構成してください。',
  sameFormat: 'Markdown を使うかプレーンテキストにするかは、元の文章の書式に合わせてください。指示で書式が指定された場合はそちらに従ってください。',
  keepLanguage: '元の文章の言語は変えないでください。翻訳はしないでください。指示で言語が指定された場合はそちらに従ってください。',
  direction: '翻訳の方向は、元の文章が日本語なら英語、それ以外の言語なら日本語です。指示で別の言語が指定された場合はそちらに従ってください。'
};

var FUNCTIONS = {
  'attach-answer': {title: 'Answer', prompt: '添付の内容に応じて、次のように応答してください。\n\n- 短文や語句の場合: Web検索を用いて解説する\n- 長文のテキストや、それを含むファイルの場合: 要約する。要約の分量は{limit}にする。最も重要な点から順に書き、分量に収まらない細部は省く', limit: {ratio: 1 / 5, max: 400}},
  'attach-translate': {title: 'Translate', prompt: '添付の内容を翻訳してください。'},
  'attach-format': {title: 'Format', prompt: '添付の内容の書式を整えてください。内容は変えないでください。添付が画像の場合は、画像に含まれるテキストを書き起こしてください。'},
  'attach-rewrite': {title: 'Rewrite', prompt: '添付の文章を推敲してください。意味は変えずに、より自然で読みやすくしてください。'},
  'direct-answer': {title: 'Answer', placeholder: 'Search the web', prompt: '次の質問についてWeb検索して答えてください。\n\n質問: {input}'},
  'direct-translate': {title: 'Translate', placeholder: 'Text to translate', prompt: '次の文章を翻訳してください。\n\n{input}'},
  'direct-format': {title: 'Format', placeholder: 'Text to format', prompt: '次の文章の書式を整えてください。内容は変えないでください。\n\n{input}'},
  'direct-rewrite': {title: 'Rewrite', placeholder: 'Text to fix', prompt: '次の文章の誤字脱字、文法、不自然な表現を直してください。\n\n{input}'},
  'both-answer': {title: 'Answer', placeholder: 'Ask about the attachment', prompt: '添付の内容について、次の質問に答えてください。\n\n質問: {input}'},
  'both-translate': {title: 'Translate', placeholder: 'How to translate', prompt: '次の指示に従って、添付の内容を翻訳してください。\n\n指示: {input}'},
  'both-format': {title: 'Format', placeholder: 'Shape to format into', prompt: '添付の内容を、次の指定どおりの形に整えてください。\n\n指定: {input}'},
  'both-rewrite': {title: 'Rewrite', placeholder: 'How to rewrite', prompt: '次の指示に従って、添付の文章を書き直してください。\n\n指示: {input}'}
};

var ATTACHMENT = {
  text: '添付:\n<attachment>\n{text}\n</attachment>',
  image: '添付は画像です。Read ツールで次のファイルを読み込んでください: {path}'
};

// ---- Pure helpers ----

function parseId(id) {
  var m = /^(attach|direct|both)-(answer|translate|format|rewrite)$/.exec(id || '');
  return m && FUNCTIONS[id] ? {id: id, mode: m[1], purpose: m[2], def: FUNCTIONS[id]} : null;
}

function fill(t, vars) {
  return t.replace(/\{(\w+)\}/g, function (all, k) { return k in vars ? vars[k] : all; });
}

function limitText(limit, att) {
  if (!limit) return '';
  if (att && att.kind === 'text') return Math.min(Math.floor(att.text.length * limit.ratio), limit.max) + '文字以内';
  return '原文の文字数の' + Math.round(limit.ratio * 100) + '%以下、かつ' + limit.max + '文字以内';
}

function buildPrompt(fn, input, att) {
  var p = fill(fn.def.prompt, {input: input || '', limit: limitText(fn.def.limit, att)});
  if (att && att.kind === 'image') p += '\n\n' + fill(ATTACHMENT.image, {path: att.path});
  else if (att) p += '\n\n' + fill(ATTACHMENT.text, {text: att.text});
  return p;
}

function buildSystem(fn) {
  var s = [SYSTEM.common];
  if (fn.purpose === 'answer') s.push(SYSTEM.markdown);
  else s.push(SYSTEM.pasteable, SYSTEM.sameFormat);
  if (fn.purpose === 'translate') s.push(SYSTEM.direction);
  if (fn.purpose === 'format' || fn.purpose === 'rewrite') s.push(SYSTEM.keepLanguage);
  return s.join('\n');
}

function usesWeb(fn) {
  return fn.id === 'direct-answer' || fn.id === 'attach-answer';
}

function toolArgs(fn, att) {
  var tools = [];
  if (usesWeb(fn)) tools.push('WebSearch', 'WebFetch');
  if (att && att.kind === 'image') tools.push('Read');
  if (!tools.length) return ['--tools', ''];
  var args = ['--tools', tools.join(','), '--allowedTools', tools.join(',')];
  return att && att.kind === 'image' ? args.concat(['--add-dir', att.dir]) : args;
}

function claudeArgs(fn, input, att) {
  return ['-p', buildPrompt(fn, input, att), '--append-system-prompt', buildSystem(fn), '--model', 'sonnet', '--effort', 'low', '--safe-mode', '--strict-mcp-config']
    .concat(toolArgs(fn, att))
    .concat(['--output-format', 'stream-json', '--verbose', '--include-partial-messages']);
}

function summary(att) {
  if (!att) return '';
  var src = att.source === 'selection' ? 'Selection' : 'Clipboard';
  if (att.kind === 'image') return src + ' image';
  var lines = att.text.split(/\r\n|\r|\n/).length;
  return src + ' · ' + (lines > 1 ? lines + ' lines, ' : '') + att.text.length + ' chars';
}

// ---- Slot ----

function claimSlot(base, pid) {
  var fm = $.NSFileManager.defaultManager;
  fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(base, true, $(), $());
  for (var n = 0; ; n++) {
    var dir = base + '/' + n;
    if (fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(dir, false, $(), $())) {
      $(String(pid)).writeToFileAtomicallyEncodingError(dir + '/pid', true, 4, $());
      return {n: n, dir: dir};
    }
    var p = $.NSString.stringWithContentsOfFileEncodingError(dir + '/pid', 4, $());
    p = p.isNil() ? NaN : parseInt(p.js, 10);
    if (p > 0 && $.kill(p, 0) !== 0 && fm.removeItemAtPathError(dir, $())) n--;
  }
}

// ---- Pasteboard ----

function savePasteboard(pb) {
  var saved = [], items = pb.pasteboardItems;
  if (items.isNil()) return saved;
  for (var i = 0; i < Number(items.count); i++) {
    var it = items.objectAtIndex(i), types = it.types, entries = [];
    for (var j = 0; j < Number(types.count); j++) {
      var t = types.objectAtIndex(j), d = it.dataForType(t);
      if (!d.isNil()) entries.push({type: t.js, data: d});
    }
    saved.push(entries);
  }
  return saved;
}

function restorePasteboard(pb, saved) {
  pb.clearContents;
  if (!saved.length) return;
  var objs = saved.map(function (entries) {
    var it = $.NSPasteboardItem.alloc.init;
    entries.forEach(function (e) { it.setDataForType(e.data, e.type); });
    it.setDataForType($.NSData.data, TRANSIENT);
    return it;
  });
  pb.writeObjects($(objs));
}

function savedData(saved, type) {
  for (var i = 0; i < saved.length; i++)
    for (var j = 0; j < saved[i].length; j++)
      if (saved[i][j].type === type) return saved[i][j].data;
  return null;
}

function savedText(saved) {
  var d = savedData(saved, 'public.utf8-plain-text');
  if (!d) return '';
  var s = $.NSString.alloc.initWithDataEncoding(d, 4);
  return s.isNil() ? '' : s.js;
}

function savedPNG(saved) {
  var png = savedData(saved, 'public.png');
  if (png) return png;
  var tiff = savedData(saved, 'public.tiff');
  if (!tiff) return null;
  var rep = $.NSBitmapImageRep.imageRepWithData(tiff);
  if (rep.isNil()) return null;
  png = rep.representationUsingTypeProperties(4, $({}));
  return png.isNil() ? null : png;
}

// ---- Attachment capture ----

function axSelectedText() {
  var front = $.NSWorkspace.sharedWorkspace.frontmostApplication;
  if (front.isNil()) return '';
  var app = $.AXUIElementCreateApplication(front.processIdentifier), r = Ref();
  if ($.AXUIElementCopyAttributeValue(app, $('AXFocusedUIElement'), r) !== 0) return '';
  var el = ObjC.castRefToObject(r[0]), r2 = Ref();
  if ($.AXUIElementCopyAttributeValue(el, $('AXSelectedText'), r2) !== 0) return '';
  var v = ObjC.castRefToObject(r2[0]);
  return v && !v.isNil() && v.isKindOfClass($.NSString) ? v.js : '';
}

function pressCopy() {
  [true, false].forEach(function (down) {
    var e = $.CGEventCreateKeyboardEvent($(), 8, down);
    $.CGEventSetFlags(e, $.kCGEventFlagMaskCommand);
    $.CGEventPost($.kCGHIDEventTap, e);
  });
}

function capture(dir) {
  var sel = '';
  try { sel = axSelectedText(); } catch (err) {}
  if (sel.trim()) return {kind: 'text', source: 'selection', text: sel};
  var pb = $.NSPasteboard.generalPasteboard;
  var saved = savePasteboard(pb), count = Number(pb.changeCount);
  pressCopy();
  for (var i = 0; i < 15 && Number(pb.changeCount) === count; i++) $.NSThread.sleepForTimeInterval(0.02);
  if (Number(pb.changeCount) !== count) {
    var s = pb.stringForType($.NSPasteboardTypeString);
    restorePasteboard(pb, saved);
    if (!s.isNil() && s.js.trim()) return {kind: 'text', source: 'selection', text: s.js};
  }
  var text = savedText(saved);
  if (text.trim()) return {kind: 'text', source: 'clipboard', text: text};
  var png = savedPNG(saved);
  if (png && png.writeToFileAtomically(dir + '/clipboard.png', true)) return {kind: 'image', source: 'clipboard', path: dir + '/clipboard.png', dir: dir};
  return null;
}

// ---- Rendering ----

var CSS = '<meta charset="utf-8"><style>body{font:15px -apple-system}h1{font-size:20px}h2{font-size:18px}h3,h4,h5,h6{font-size:16px}p,ul,ol{margin:0 0 10px}pre,code{font:13px Menlo}</style>';
var SP = '<p style="font-size:4px">&nbsp;</p>';
function box(style) {
  return ['<table style="width:100%;border-collapse:collapse"><tr><td style="' + style + '">', '</td></tr></table>'];
}
var CODE = box('border:0;background:rgba(128,128,128,.15);padding:8px');
var QUOTE = box('border:0;border-left:3px solid #888;padding:0 0 0 10px;font-size:15px');
var HR = '<table style="width:100%;border-collapse:collapse"><tr><td style="border:0;border-top:1px solid #888;font-size:1px">&nbsp;</td></tr></table>';
var CELL = 'border:1px solid #888;padding:2px 8px';
function tags(c, parent) {
  switch (c.kind) {
    case 0: return parent === 4 ? ['', ''] : ['<p>', '</p>'];
    case 1: var h = 'h' + Math.min(Math.max(c.level, 1), 6); return ['<' + h + '>', '</' + h + '>'];
    case 2: return ['<ol>', '</ol>', true];
    case 3: return ['<ul>', '</ul>', true];
    case 4: return ['<li>', '</li>'];
    case 5: return [CODE[0] + '<pre style="margin:0">', '</pre>' + CODE[1], true];
    case 6: return [QUOTE[0], QUOTE[1], true];
    case 7: return [HR, '', true];
    case 8: return ['<table style="border-collapse:collapse">', '</table>', true];
    case 9: case 10: return ['<tr>', '</tr>'];
    case 11: var t = parent === 9 ? 'th' : 'td'; return ['<' + t + ' style="' + CELL + '">', '</' + t + '>'];
    default: return ['<div>', '</div>'];
  }
}
function esc(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function toHTML(src) {
  var o = $.NSAttributedStringMarkdownParsingOptions.alloc.init;
  o.interpretedSyntax = 0;
  var s = $.NSAttributedString.alloc.initWithMarkdownStringOptionsBaseURLError(src, o, null, null);
  var text = s.string.js, html = '', stack = [];
  function close() {
    var c = stack.pop();
    html += c.close;
    if (c.sp && !stack.length) html += SP;
  }
  s.enumerateAttributesInRangeOptionsUsingBlock($.NSMakeRange(0, s.length), 0, function (d, r) {
    var loc = Number(r.location), len = Number(r.length);
    var chain = [], p = d.objectForKey('NSPresentationIntent');
    while (p && !p.isNil()) {
      chain.unshift({id: Number(p.identity), kind: Number(p.intentKind), level: Number(p.headerLevel)});
      p = p.parentIntent;
    }
    var k = 0;
    while (k < stack.length && k < chain.length && stack[k].id === chain[k].id) k++;
    while (stack.length > k) close();
    for (var j = k; j < chain.length; j++) {
      var tg = tags(chain[j], j > 0 ? chain[j - 1].kind : -1);
      html += tg[0];
      stack.push({id: chain[j].id, close: tg[1], sp: !!tg[2]});
    }
    var inner = chain.length ? chain[chain.length - 1].kind : -1;
    if (inner === 7) return;
    var inPre = chain.some(function (x) { return x.kind === 5; });
    var t = esc(text.substr(loc, len));
    t = inPre ? t.replace(/\n$/, '') : t.replace(/\n/g, '<br>');
    var inl = d.objectForKey('NSInlinePresentationIntent'), v = inl.isNil() ? 0 : Number(inl.js);
    if (v & 4) t = '<code>' + t + '</code>';
    if (v & 1) t = '<em>' + t + '</em>';
    if (v & 2) t = '<strong>' + t + '</strong>';
    if (v & 32) t = '<del>' + t + '</del>';
    var link = d.objectForKey('NSLink');
    if (!link.isNil()) t = '<a href="' + esc(link.absoluteString.js) + '">' + t + '</a>';
    html += t;
  });
  while (stack.length) close();
  return html;
}
function render(src) {
  var out = $.NSMutableAttributedString.alloc.init;
  out.appendAttributedString($.NSAttributedString.alloc.initWithHTMLDocumentAttributes($(CSS + toHTML(src)).dataUsingEncoding(4), null));
  out.addAttributeValueRange('NSColor', $.NSColor.labelColor, $.NSMakeRange(0, out.length));
  return out;
}

// ---- Panel ----

function run(argv) {
  var fn = parseId(argv[0]);
  if (!fn) return 'Unknown function: ' + argv[0] + '\nKnown: ' + Object.keys(FUNCTIONS).join(', ');
  var fm = $.NSFileManager.defaultManager;
  var slot = claimSlot($.NSTemporaryDirectory().js.replace(/\/$/, '') + '/' + SLOT_DIR, $.getpid());
  var out = slot.dir + '/out.jsonl', ep = slot.dir + '/err.txt';
  var att = null, noAttachment = false;
  if (fn.mode !== 'direct') {
    try { att = capture(slot.dir); } catch (err) {}
    noAttachment = !att;
  }
  var hasField = fn.mode !== 'attach';

  var app = $.NSApplication.sharedApplication;
  app.setActivationPolicy(1);
  var W = 640, H = 420;
  var w = $.NSPanel.alloc.initWithContentRectStyleMaskBackingDefer($.NSMakeRect(0, 0, W, H), 1 | 2 | 4 | 8 | 16 | 32768, 2, false);
  w.titlebarAppearsTransparent = true;
  w.titleVisibility = 1;
  w.title = fn.def.title;
  w.movableByWindowBackground = true;
  w.opaque = false;
  w.backgroundColor = $.NSColor.clearColor;
  w.level = 3;
  w.floatingPanel = true;
  w.hidesOnDeactivate = false;
  w.releasedWhenClosed = false;
  var fx = $.NSVisualEffectView.alloc.initWithFrame($.NSMakeRect(0, 0, W, H));
  fx.material = 6;
  fx.blendingMode = 0;
  fx.state = 1;
  fx.autoresizingMask = 18;
  w.contentView = fx;
  var field = null;
  if (hasField) {
    field = $.NSTextField.alloc.initWithFrame($.NSMakeRect(20, H - 66, W - 40, 30));
    field.bezeled = false;
    field.drawsBackground = false;
    field.focusRingType = 1;
    field.font = $.NSFont.systemFontOfSize(20);
    field.placeholderString = fn.def.placeholder || fn.def.title;
    field.autoresizingMask = 10;
    fx.addSubview(field);
  }
  var infoY = hasField ? H - 90 : H - 50;
  var info = $.NSTextField.labelWithString(summary(att));
  info.setFrame($.NSMakeRect(22, infoY, W - 44, 18));
  info.font = $.NSFont.systemFontOfSize(12);
  info.textColor = $.NSColor.secondaryLabelColor;
  info.autoresizingMask = 10;
  fx.addSubview(info);
  var svH = infoY - 6;
  var sv = $.NSScrollView.alloc.initWithFrame($.NSMakeRect(0, 0, W, svH));
  sv.drawsBackground = false;
  sv.hasVerticalScroller = true;
  sv.autohidesScrollers = true;
  sv.autoresizingMask = 18;
  var tv = $.NSTextView.alloc.initWithFrame($.NSMakeRect(0, 0, W, svH));
  tv.layoutManager;
  tv.editable = false;
  tv.drawsBackground = false;
  tv.textContainerInset = $.NSMakeSize(20, 8);
  tv.textContainer.lineFragmentPadding = 2;
  tv.autoresizingMask = 2;
  sv.documentView = tv;
  fx.addSubview(sv);
  w.center;
  var n = slot.n % 10;
  w.setFrameOrigin($.NSMakePoint(w.frame.origin.x + 24 * n, w.frame.origin.y - 24 * n));
  w.makeKeyAndOrderFront($());
  app.activateIgnoringOtherApps(true);
  w.makeFirstResponder(hasField ? field : tv);
  render(' ');

  var task = null, shown = '', failed = false, result = '', infoUntil = 0;
  function start(input) {
    task = $.NSTask.alloc.init;
    task.executableURL = $.NSURL.fileURLWithPath(CLAUDE);
    task.currentDirectoryURL = $.NSURL.fileURLWithPath($.NSHomeDirectory());
    task.arguments = $(claudeArgs(fn, input, att));
    if (!usesWeb(fn)) {
      var env = $.NSProcessInfo.processInfo.environment.mutableCopy;
      env.setObjectForKey('1', 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC');
      task.environment = env;
    }
    task.standardInput = $.NSFileHandle.fileHandleWithNullDevice;
    fm.createFileAtPathContentsAttributes(out, $(), $());
    task.standardOutput = $.NSFileHandle.fileHandleForWritingAtPath(out);
    fm.createFileAtPathContentsAttributes(ep, $(), $());
    task.standardError = $.NSFileHandle.fileHandleForWritingAtPath(ep);
    failed = !task.launchAndReturnError($());
  }
  function flash(msg) {
    info.stringValue = msg;
    infoUntil = Date.now() + 1500;
  }
  function copyAll() {
    if (!result) return flash('Nothing to copy yet');
    var ts = tv.textStorage;
    var rtf = ts.RTFFromRangeDocumentAttributes($.NSMakeRange(0, ts.length), $({}));
    var pb = $.NSPasteboard.generalPasteboard;
    pb.clearContents;
    pb.setStringForType($(result), $.NSPasteboardTypeString);
    if (!rtf.isNil()) pb.setDataForType(rtf, $.NSPasteboardTypeRTF);
    flash('Copied the whole result');
  }

  if (noAttachment) {
    if (field) field.editable = false;
    w.makeFirstResponder(tv);
    tv.textStorage.setAttributedString(render('Nothing to attach: no selected text, and no text or image on the clipboard.'));
  } else if (!hasField) {
    start('');
  }

  while (w.isVisible || w.isMiniaturized) {
    var e = app.nextEventMatchingMaskUntilDateInModeDequeue(0xffffffff, $.NSDate.dateWithTimeIntervalSinceNow(0.1), $.NSDefaultRunLoopMode, true);
    if (infoUntil && Date.now() > infoUntil) {
      info.stringValue = summary(att);
      infoUntil = 0;
    }
    if (e && !e.isNil()) {
      if (Number(e.type) === 1 && !e.window.isNil() && Number(e.window.windowNumber) === Number(w.windowNumber)) {
        var hit = [0, 1, 2].map(function (i) { return w.standardWindowButton(i); }).filter(function (b) {
          return !b.isNil() && !b.hidden && $.NSPointInRect(e.locationInWindow, b.convertRectToView(b.bounds, $()));
        })[0];
        if (hit) {
          hit.performClick($());
          continue;
        }
      }
      var isKey = Number(e.type) === 10, mods = Number(e.modifierFlags) & 0x1e0000;
      if (isKey && Number(e.keyCode) === COPY_ALL.keyCode && mods === COPY_ALL.mods) {
        copyAll();
        continue;
      }
      if (isKey && mods === 0x100000) {
        var act = {v: 'paste:', c: 'copy:', x: 'cut:', a: 'selectAll:'}[e.charactersIgnoringModifiers.js];
        if (act && app.sendActionToFrom(act, $(), $())) continue;
      }
      var k = isKey ? Number(e.keyCode) : -1;
      if ((k === 36 || k === 76 || k === 53) && !(field && w.fieldEditorForObject(true, field).hasMarkedText)) {
        if (k === 53) {
          w.close;
          continue;
        }
        var q = field ? field.stringValue.js.trim() : '';
        if (field && !task && !noAttachment && q) {
          start(q);
          w.title = q;
          field.editable = false;
          w.makeFirstResponder(tv);
        }
        if (field) continue;
      }
      app.sendEvent(e);
    }
    if (!task) continue;
    var exited = failed || !task.running;
    var s = $.NSString.stringWithContentsOfFileEncodingError(out, 4, $());
    if (s.isNil()) continue;
    var text = '', searches = [], answered = {}, done = false, failure = '';
    s.js.split('\n').forEach(function (l) {
      try {
        var j = JSON.parse(l);
        if (j.type === 'stream_event' && j.event.type === 'content_block_start' && j.event.content_block.type === 'text' && text) text += '\n\n';
        if (j.type === 'stream_event' && j.event.type === 'content_block_delta' && j.event.delta.type === 'text_delta') text += j.event.delta.text;
        if (j.type === 'assistant') j.message.content.forEach(function (c) {
          if (c.type === 'tool_use' && c.name === 'WebSearch') searches.push({id: c.id, query: c.input.query});
        });
        if (j.type === 'user' && Array.isArray(j.message.content)) j.message.content.forEach(function (c) {
          if (c.type === 'tool_result') answered[c.tool_use_id] = true;
        });
        if (j.type === 'result') {
          done = true;
          if (j.is_error) failure = String(j.result || j.subtype || 'error');
        }
      } catch (err) {}
    });
    result = text;
    var pending = searches.filter(function (x) { return !answered[x.id]; });
    var lines = (text ? pending : searches).map(function (x) { return 'WebSearch: ' + x.query; });
    var status = text || (done ? 'Finished without a response' : 'No response yet');
    if (failure || (exited && !done)) {
      var er = failure;
      if (!er) {
        er = $.NSString.stringWithContentsOfFileEncodingError(ep, 4, $());
        er = er.isNil() ? '' : er.js.trim();
      }
      status = (text ? text + '\n\n' : '') + '**Error while running Claude Code**' + (er ? '\n\n```\n' + er + '\n```' : '');
    }
    var view = [status].concat(lines).join('\n\n');
    if (view !== shown) {
      tv.textStorage.setAttributedString(render(view));
      shown = view;
    }
  }
  if (task && task.running) task.terminate;
  fm.removeItemAtPathError(slot.dir, $());
}

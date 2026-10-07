// 职责：界面与渲染。用 g 绘制棋盘、棋子、光标、胜利连线；
// 创建 absolute 覆盖层（顶部状态条、悔棋/重开按钮），全部挂 ctx.stage。

var UI = {};

var _els = []; // 本模块创建的 DOM 元素，destroy 时移除
var _stage = null;
var _canvas = null;
var _game = null;
var _bar = null;
var _btnUndo = null;
var _btnReset = null;

// 初始化覆盖层 UI
// 签名: UI.init(stage, canvas, game) -> void
UI.init = function (stage, canvas, game) {
  _stage = stage;
  _canvas = canvas;
  _game = game;

  // 顶部状态条：position:absolute 挂进 stage（stage 即定位上下文）
  var bar = document.createElement('div');
  bar.style.position = 'absolute';
  bar.style.left = '0px';
  bar.style.top = '0px';
  bar.style.width = '100%';
  bar.style.textAlign = 'center';
  bar.style.color = '#e8dcc0';
  bar.style.fontSize = '16px';
  bar.style.lineHeight = '24px';
  bar.style.fontFamily = 'sans-serif';
  bar.style.textShadow = '0 1px 2px rgba(0,0,0,0.6)';
  bar.style.pointerEvents = 'none';
  stage.appendChild(bar);
  _els.push(bar);
  _bar = bar;

  // 悔棋按钮
  var bu = document.createElement('button');
  bu.textContent = '悔棋';
  bu.style.position = 'absolute';
  bu.style.left = '8px';
  bu.style.top = '30px';
  bu.style.padding = '6px 12px';
  bu.style.fontSize = '14px';
  bu.style.background = 'rgba(60,50,40,0.85)';
  bu.style.color = '#f0e6cc';
  bu.style.border = '1px solid #8a7a5a';
  bu.style.borderRadius = '4px';
  bu.style.cursor = 'pointer';
  bu.onclick = function (e) {
    e.stopPropagation();
    if (typeof Rules !== 'undefined' && Rules.undo) Rules.undo(_game);
  };
  stage.appendChild(bu);
  _els.push(bu);
  _btnUndo = bu;

  // 重新开始按钮
  var br = document.createElement('button');
  br.textContent = '重新开始';
  br.style.position = 'absolute';
  br.style.right = '8px';
  br.style.top = '30px';
  br.style.padding = '6px 12px';
  br.style.fontSize = '14px';
  br.style.background = 'rgba(60,50,40,0.85)';
  br.style.color = '#f0e6cc';
  br.style.border = '1px solid #8a7a5a';
  br.style.borderRadius = '4px';
  br.style.cursor = 'pointer';
  br.onclick = function (e) {
    e.stopPropagation();
    if (typeof Rules !== 'undefined' && Rules.reset) Rules.reset(_game);
  };
  stage.appendChild(br);
  _els.push(br);
  _btnReset = br;
};

// 内部：星位点坐标（15 路）
var _stars = [[3, 3], [3, 11], [11, 3], [11, 11], [7, 7]];

// 每帧渲染到 2D 上下文 g
// 签名: UI.render(g, game, w, h) -> void
UI.render = function (g, game, w, h) {
  var n = (game && game.size) || 15;
  var margin = Math.min(w, h) * 0.05;
  var cell = (Math.min(w, h) - margin * 2) / (n - 1);
  var ox = (w - cell * (n - 1)) / 2;
  var oy = (h - cell * (n - 1)) / 2;
  game._ox = ox; game._oy = oy; game._cell = cell; // 供引擎坐标换算复用

  // 背景（暗木色）
  g.fillStyle = '#2a2018';
  g.fillRect(0, 0, w, h);
  var grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, 'rgba(120,85,50,0.35)');
  grad.addColorStop(1, 'rgba(60,40,25,0.5)');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  // 网格
  g.strokeStyle = 'rgba(220,200,160,0.45)';
  g.lineWidth = 1;
  g.beginPath();
  for (var i = 0; i < n; i++) {
    g.moveTo(ox, oy + i * cell);
    g.lineTo(ox + (n - 1) * cell, oy + i * cell);
    g.moveTo(ox + i * cell, oy);
    g.lineTo(ox + i * cell, oy + (n - 1) * cell);
  }
  g.stroke();

  // 边框加粗
  g.strokeStyle = 'rgba(232,220,192,0.8)';
  g.lineWidth = 2;
  g.strokeRect(ox, oy, (n - 1) * cell, (n - 1) * cell);

  // 星位点
  g.fillStyle = 'rgba(232,220,192,0.7)';
  for (var s = 0; s < _stars.length; s++) {
    var sx = ox + _stars[s][0] * cell, sy = oy + _stars[s][1] * cell;
    g.beginPath();
    g.arc(sx, sy, cell * 0.09, 0, Math.PI * 2);
    g.fill();
  }

  var board = game.board || [];
  var winLine = game.winLine || null;
  var lastMove = game.lastMove || null;

  // 棋子（board 为一维数组，索引 = y * n + x）
  var r = cell * 0.42;
  for (var y = 0; y < n; y++) {
    for (var x = 0; x < n; x++) {
      var v = board[y * n + x] || 0;
      if (!v) continue;
      var px = ox + x * cell, py = oy + y * cell;
      var grd = g.createRadialGradient(px - r * 0.3, py - r * 0.3, r * 0.2, px, py, r);
      if (v === 1) { grd.addColorStop(0, '#666'); grd.addColorStop(1, '#111'); }
      else { grd.addColorStop(0, '#fff'); grd.addColorStop(1, '#bbb'); }
      g.fillStyle = grd;
      g.beginPath();
      g.arc(px, py, r, 0, Math.PI * 2);
      g.fill();

      // 最后落子标记（小红点）
      if (lastMove && lastMove.x === x && lastMove.y === y) {
        g.fillStyle = '#e04030';
        g.beginPath();
        g.arc(px, py, r * 0.28, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  // 键盘光标框
  var cur = game.cursor;
  if (cur && !game.over) {
    var cx = ox + cur.x * cell, cy = oy + cur.y * cell;
    g.strokeStyle = '#ffd75e';
    g.lineWidth = 2;
    var c0 = cell * 0.18, c1 = cell * 0.4;
    g.beginPath();
    g.moveTo(cx - c1, cy - c0); g.lineTo(cx - c0, cy - c0); g.lineTo(cx - c0, cy - c1);
    g.moveTo(cx + c0, cy - c1); g.lineTo(cx + c0, cy - c0); g.lineTo(cx + c1, cy - c0);
    g.moveTo(cx - c1, cy + c0); g.lineTo(cx - c0, cy + c0); g.lineTo(cx - c0, cy + c1);
    g.moveTo(cx + c0, cy + c1); g.lineTo(cx + c0, cy + c0); g.lineTo(cx + c1, cy + c0);
    g.stroke();
  }

  // 胜利连线高亮
  if (game.over && winLine && winLine.length) {
    g.strokeStyle = 'rgba(255,80,60,0.9)';
    g.lineWidth = 3;
    g.beginPath();
    var a = winLine[0], b = winLine[winLine.length - 1];
    g.moveTo(ox + a.x * cell, oy + a.y * cell);
    g.lineTo(ox + b.x * cell, oy + b.y * cell);
    g.stroke();
  }

  // 状态条文本
  if (_bar) {
    if (game.over) {
      var who = game.winner === 1 ? '黑棋' : (game.winner === 2 ? '白棋' : '');
      _bar.textContent = who ? who + '获胜！点击“重新开始”再来一局' : '对局结束';
    } else {
      var turn = game.turn === 1 ? '黑棋回合' : '白棋回合';
      _bar.textContent = game.hint ? (turn + ' · ' + game.hint) : turn;
    }
  }

  void _canvas; void _stage;
};

// destroy：移除全部本模块创建的 DOM 元素
// 签名: UI.destroy() -> void
UI.destroy = function () {
  for (var i = 0; i < _els.length; i++) {
    var el = _els[i];
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  _els = [];
  _bar = null; _btnUndo = null; _btnReset = null;
  _stage = null; _canvas = null; _game = null;
};

// 职责：游戏状态与主循环逻辑。管理棋盘数据、回合切换、
// 坐标换算、胜负判定流程、键盘光标移动；不做渲染。

var Engine = {};

// 创建游戏状态对象
// 签名: Engine.create() -> game
Engine.create = function () {
  return {
    size: 15,            // 15x15 棋盘
    board: [],           // 一维数组 0空/1黑/2白
    turn: 1,             // 当前执子方 1黑 2白
    over: false,         // 对局是否结束
    winner: 0,
    winLine: [],         // 获胜五连坐标 [{x,y}...]
    history: [],         // 悔棋栈，记录落子索引
    cursor: { x: 7, y: 7 }, // 键盘光标位置
    hint: '',            // 首帧引导文案
    // 布局参数，layout 中计算
    ox: 0, oy: 0, cell: 0, pad: 20,
    // 动画状态：落子涟漪（最近一次落子的格点与经过时间）
    ripple: null         // {x, y, t}
  };
};

// 尺寸变化/初始化时重排棋盘几何
// 签名: Engine.layout(game, w, h) -> void
Engine.layout = function (game, w, h) {
  game.pad = 24;
  var s = Math.min(w, h) - game.pad * 2;
  game.cell = s / (game.size - 1);
  game.ox = (w - s) / 2;
  game.oy = (h - s) / 2;
};

// 屏幕坐标 -> 棋盘格；带容差，靠近交点才命中
// 签名: Engine.pickCell(game, px, py) -> {x,y} | null
Engine.pickCell = function (game, px, py) {
  if (game.cell <= 0) return null;
  var x = Math.round((px - game.ox) / game.cell);
  var y = Math.round((py - game.oy) / game.cell);
  if (x < 0 || y < 0 || x >= game.size || y >= game.size) return null;
  // 容差判定：与交点距离超过 cell*0.45 视为未命中，避免误触空白区
  var dx = px - (game.ox + x * game.cell);
  var dy = py - (game.oy + y * game.cell);
  if (Math.sqrt(dx * dx + dy * dy) > game.cell * 0.45) return null;
  return { x: x, y: y };
};

// 内部落子封装：调用规则层并更新动画状态
Engine._place = function (game, x, y) {
  if (game.over) return;
  var ok = Rules.place(game, x, y);
  if (ok !== false) {
    game.ripple = { x: x, y: y, t: 0 };
  }
};

// 触屏点击处理：落子 / 结束后点击棋盘区域重开
// 签名: Engine.onTap(game, px, py) -> void
Engine.onTap = function (game, px, py) {
  if (game.over) {
    // 对局结束后点击棋盘任意处即可再来一局
    Rules.reset(game);
    return;
  }
  var c = Engine.pickCell(game, px, py);
  if (!c) return;
  // 点击已有棋子处仅移动光标，不落子
  var idx = c.y * game.size + c.x;
  if (game.board[idx] !== 0) {
    game.cursor.x = c.x;
    game.cursor.y = c.y;
    return;
  }
  Engine._place(game, c.x, c.y);
};

// 键盘快捷：方向键移动光标，回车/空格落子，U 悔棋，R 重开
// 签名: Engine.onKey(game, key) -> void
Engine.onKey = function (game, key) {
  var n = game.size;
  if (key === 'ArrowUp' || key === 'w' || key === 'W') {
    game.cursor.y = Math.max(0, game.cursor.y - 1);
  } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
    game.cursor.y = Math.min(n - 1, game.cursor.y + 1);
  } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
    game.cursor.x = Math.max(0, game.cursor.x - 1);
  } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
    game.cursor.x = Math.min(n - 1, game.cursor.x + 1);
  } else if (key === 'Enter' || key === ' ') {
    Engine._place(game, game.cursor.x, game.cursor.y);
  } else if (key === 'u' || key === 'U') {
    Rules.undo(game);
  } else if (key === 'r' || key === 'R') {
    Rules.reset(game);
  }
};

// 每帧更新：落子涟漪计时、胜利连线淡入计时
// 签名: Engine.update(game, dtMs) -> void
Engine.update = function (game, dtMs) {
  if (game.ripple) {
    game.ripple.t += dtMs;
    if (game.ripple.t > 400) game.ripple = null;
  }
  if (game.winLine && game.winLine.length > 0) {
    game.winT = (game.winT || 0) + dtMs;
    if (game.winT > 600) game.winT = 600;
  } else {
    game.winT = 0;
  }
};

// 设置引导文案
// 签名: Engine.setHint(game, text) -> void
Engine.setHint = function (game, text) {
  game.hint = text;
};

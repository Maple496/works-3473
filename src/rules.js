// 职责：五子棋规则纯逻辑。落子、五连检测、悔棋、重置；
// 无渲染、无 DOM，便于独立测试。

var Rules = {};

// 在 (x,y) 落子（含回合切换与胜负判定）
// 签名: Rules.place(game, x, y) -> boolean 是否成功
Rules.place = function (game, x, y) {
  if (game.over) return false;
  if (x < 0 || y < 0 || x >= game.size || y >= game.size) return false;
  var idx = y * game.size + x;
  if (game.board[idx] !== 0) return false;
  game.board[idx] = game.turn;
  game.history.push(idx);
  var line = Rules.checkWin(game, x, y, game.turn);
  if (line) {
    game.over = true;
    game.winner = game.turn;
    game.winLine = line;
    game.hint = game.turn === 1 ? '黑棋获胜！' : '白棋获胜！';
  } else {
    game.turn = game.turn === 1 ? 2 : 1;
    game.hint = game.turn === 1 ? '轮到黑棋' : '轮到白棋';
  }
  return true;
};

// 检查以 (x,y) 为端点的四方五连，返回连线坐标数组或 null
// 签名: Rules.checkWin(game, x, y, who) -> [{x,y}...] | null
Rules.checkWin = function (game, x, y, who) {
  var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (var d = 0; d < dirs.length; d++) {
    var dx = dirs[d][0], dy = dirs[d][1];
    var cells = [{ x: x, y: y }];
    var nx, ny;
    nx = x + dx; ny = y + dy;
    while (nx >= 0 && ny >= 0 && nx < game.size && ny < game.size &&
           game.board[ny * game.size + nx] === who) {
      cells.push({ x: nx, y: ny });
      nx += dx; ny += dy;
    }
    nx = x - dx; ny = y - dy;
    while (nx >= 0 && ny >= 0 && nx < game.size && ny < game.size &&
           game.board[ny * game.size + nx] === who) {
      cells.unshift({ x: nx, y: ny });
      nx -= dx; ny -= dy;
    }
    if (cells.length >= 5) return cells;
  }
  return null;
};

// 悔棋：撤销最近一步并恢复回合
// 签名: Rules.undo(game) -> boolean
Rules.undo = function (game) {
  if (game.history.length === 0) return false;
  var idx = game.history.pop();
  var who = game.board[idx];
  game.board[idx] = 0;
  game.over = false;
  game.winner = 0;
  game.winLine = [];
  game.turn = who;
  game.hint = game.turn === 1 ? '轮到黑棋' : '轮到白棋';
  return true;
};

// 重置整局
// 签名: Rules.reset(game) -> void
Rules.reset = function (game) {
  for (var i = 0; i < game.board.length; i++) game.board[i] = 0;
  game.history = [];
  game.turn = 1;
  game.over = false;
  game.winner = 0;
  game.winLine = [];
  game.hint = '轮到黑棋';
};

// 初始化棋盘数组（create 后调用一次）
// 签名: Rules.initBoard(game) -> void
Rules.initBoard = function (game) {
  game.board = [];
  game.history = [];
  for (var i = 0; i < game.size * game.size; i++) game.board.push(0);
  game.turn = 1;
  game.over = false;
  game.winner = 0;
  game.winLine = [];
  game.hint = '轮到黑棋';
};

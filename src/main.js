// 职责：入口文件。创建 canvas 与 2D 上下文 g，注册尺寸跟随，
// 装配 ui 与 engine 模块，承载主循环 RAF；destroy 时停帧、解绑监听。

var rafId = 0;          // RAF 句柄，Work.register 闭包可见，供 destroy 清理
var boundResize = null; // ctx.onBounds 句柄
var downHandler = null; // pointerdown 监听引用，destroy 时解绑

Work.register({
  mount: function (ctx) {
    // --- 创建画布 ---
    var canvas = document.createElement('canvas');
    var g = canvas.getContext('2d');
    canvas.style.position = 'absolute';
    canvas.style.left = '0px';
    canvas.style.top = '0px';
    ctx.stage.appendChild(canvas);

    // --- 画布尺寸合同：初值用 ctx.bounds.w/h，onBounds 跟随变化 ---
    var W = ctx.bounds.w || 320;
    var H = ctx.bounds.h || 480;
    canvas.width = W;
    canvas.height = H;

    // --- 装配引擎与 UI ---
    var game = Engine.create();
    UI.init(ctx.stage, canvas, game);
    Engine.layout(game, W, H);

    boundResize = ctx.onBounds(function (b) {
      canvas.width = b.w;
      canvas.height = b.h;
      Engine.layout(game, b.w, b.h);
    });

    // --- 交互合同：触屏 pointerdown 落子；键盘为快捷方式 ---
    downHandler = function (ev) {
      var rect = canvas.getBoundingClientRect();
      var px = ev.clientX - rect.left;
      var py = ev.clientY - rect.top;
      Engine.onTap(game, px, py);
      ev.preventDefault();
    };
    canvas.addEventListener('pointerdown', downHandler);

    var keyHandler = function (ev) {
      Engine.onKey(game, ev.key);
    };
    window.addEventListener('keydown', keyHandler);

    // --- 首帧引导：mount 后直接可玩并显示提示 ---
    Engine.setHint(game, '点击棋盘落子 · 黑棋先行');

    // --- 主循环 ---
    var loop = function () {
      Engine.update(game, 16);
      UI.render(g, game, canvas.width, canvas.height);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    // 供 destroy 解绑：存到 this._xxx
    this._keyHandler = keyHandler;
    this._canvas = canvas;
    this._game = game;
  },

  destroy: function () {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    if (this._canvas && downHandler) {
      this._canvas.removeEventListener('pointerdown', downHandler);
      downHandler = null;
    }
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (boundResize && this._game) {
      boundResize = null;
    }
    if (this._canvas && this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }
    this._canvas = null;
    this._game = null;
    UI.destroy();
  }
});

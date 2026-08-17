/**
 * カスタムコンテナを置換するフィルター
 *
 * 使い方:
 * ::: note [種別] [タイトル]
 * content
 * :::
 *
 * 例:
 * ::: note info
 * これは注釈です。
 * :::
 *
 * ::: note warn キャッシュの有効期限について
 * タイトルを付けると、タイトル行と本文が分かれて本文が全幅になる (#2490)。
 * :::
 */
const { replaceOutsideFences } = require('./lib/fence');

hexo.extend.filter.register('before_post_render', function (data) {
  // ^([ \t]*): 行頭のインデントをキャプチャし、同じインデントの終了タグ（\1:::）と対にする。
  // 水平空白に限るのが要点で、\s にすると改行まで飲み、直前の空行から
  // マッチが始まって \1 に「\n」が入る。すると閉じ側に「空行＋:::」を要求してしまい、
  // 直後の ::: を素通りして後続ブロックの :::（表の後の空行付き等）まで
  // 1つの note に飲み込む。この取り違えで23記事の描画が壊れていた
  // 種別のあとに任意のタイトルを受け取る (#2490)。以前は種別を (\w+) で拾って
  // いたため、日本語のタイトルを書くと正規表現ごとマッチせず、note にならずに
  // ::: が本文に出ていた（書いた側は気づけない）
  const regex = /^([ \t]*):::[ \t]+note(?:[ \t]+(\S+))?(?:[ \t]+([^\n]*))?\n([\s\S]+?)\n\1:::$/gm;

  // コードフェンスの中の ::: は記法の見本なので置換しない (#2549)
  data.content = replaceOutsideFences(
    data.content,
    regex,
    (match, indent, firstWord, rest, content) => {
      let className = 'info'; // デフォルトのクラス名
      const allowedClasses = ['tip', 'info', 'warn', 'alert'];
      // 1語目が種別ならそれを採り、残りをタイトルとする。種別でなければ
      // 行の残り全部がタイトル（種別は既定の info）。
      // 「tip」という語をタイトルにしたいときだけ取り違えるが、
      // その場合は種別を明示して `::: note info tip` と書けばよい
      let title = '';
      if (firstWord && allowedClasses.includes(firstWord)) {
        className = firstWord;
        title = (rest || '').trim();
      } else if (firstWord) {
        title = [firstWord, rest || ''].join(' ').trim();
      }

      // キャプチャしたコンテナ内のコンテンツから、共通のインデントを削除
      // これにより、Markdownレンダラが意図せずコードブロックとして解釈するのを防ぐ
      const unindentedContent = content
        .split('\n')
        .map((line) => {
          if (line.startsWith(indent)) {
            return line.substring(indent.length);
          }
          return line;
        })
        .join('\n');

      // クラス名に note- を付ける。tip/info/warn/alert のような一般語をそのまま使うと
      // 他のCSSと衝突する。実際 alert は bootstrap の .alert に当たっていた (#2486)。
      // アイコンの fa-check-circle も Font Awesome 由来の名前で、実体（警告なら
      // 感嘆符、tip なら電球）と合っていなかったため役割名にする
      //
      // タイトルがあるときだけ構造を変える。無ければ従来どおりの2列。
      // 既存の note は225件あり、そのすべての見た目を動かさないため (#2490)
      //
      // コードブロックとして認識されてしまわないよう、インデントされないよう愚直に文字列結合
      let open;
      if (title) {
        // タイトルも Markdown として描く。`code` やリンクを本文と同じ書き方で
        // 使えるようにするため。1行なので描画結果の <p> を外して中身だけ使う
        const renderedTitle = hexo.render
          .renderSync({ text: title, engine: 'markdown' })
          .trim()
          .replace(/^<p>/, '')
          .replace(/<\/p>$/, '');
        open =
          `<div class="note-container note-${className} note-has-title">` +
          `<div class="note-title"><span class="note-icon"></span>${renderedTitle}</div>` +
          `<div class="note-body">`;
      } else {
        open =
          `<div class="note-container note-${className}">` + `<span class="note-icon"></span><div>`;
      }

      // 本文はここで描かず、Markdown のまま囲みの中に置く。開きタグと本文の間、
      // 本文と閉じタグの間に空行を入れるのが要点で、CommonMark の HTML ブロックは
      // 空行で終わる。本文は本体と同じ経路で描かれる。
      //
      // 以前はここで renderSync していた。この時点の本文はコードフェンスが
      // すでに backtick_code に HTML へ置き換えられた後で、その HTML を
      // もう一度 Markdown として解釈していた。コードの中の `Identity[T any](T) T` が
      // リンク記法として `Identity<a href="T">T any</a> T` になる、Go の raw string を
      // 含むコードでハイライト用の HTML 自体が再エスケープされる、素の URL が
      // 勝手にリンクになる、コードブロックが note の中でだけ <p> に包まれる、
      // といった壊れ方をしていた (#2547)
      return `${open}\n\n${unindentedContent.trim()}\n\n</div></div>`;
    },
  );

  return data;
});

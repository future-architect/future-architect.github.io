---
title: "【JIS配列Mac】Chrome, Alfred 卒業!? Arc, Zen Browser, Raycast, Karabiner-Elements で開発環境を再構築"
date: 2025/02/25 00:00:00
postid: a
tag:
  - Mac
  - 環境構築
  - キーバインド
category:
  - DevOps
thumbnail: /images/2025/20250225a/thumbnail.png
author: 棚井龍之介
lede: "JIS 配列 Mac ユーザーの皆さん、今の環境に満足していますか？  Webブラウザやランチャーアプリには何を使っていますか？今日は思い切って、長年連れ添った Chrome と Alfred から、Arc, Zen Browser や Raycast に切り替えた環境構築をご紹介します。"
---

JIS 配列 Mac ユーザーの皆さん、今の環境に満足していますか？
Webブラウザやランチャーアプリには何を使っていますか？

今日は思い切って、長年連れ添った Chrome と Alfred から、Arc, Zen Browser や Raycast に切り替えた環境構築をご紹介します。
まるで愛車を最新スポーツカーに乗り換えるような、劇的な変化を体験してください。

## はじめに

こんにちは。棚井（tanai）です。
普段の業務ではバックエンド領域を担当しております。

これまで「[諸般の事情](https://future-architect.github.io/articles/20230216a/)」により、Windows 環境でコーディングや通常業務を遂行していました。念願叶って、ついに、2年ぶりに、まったくの偶然により、**Mac 環境に戻りました**。

業務外ではバリバリの JIS配列Macユーザとして生態系を築いており、↑のブログにも記載したように「Windows の操作性を JIS配列Mac に近づける」くらいには「JIS配列Mac」に拘りがあります。特に「Emacs キーバインド（[Mac のキーボードショートカット](https://support.apple.com/ja-jp/102650)）」を無意識レベルで習得している（日本人にとって日本語の文法を説明するのが難しいのと似た感覚で、自分が打ち込んだキーボードショートカットを意識レベルでは認知できていない）ため、他のキー配置では「英数かなの切り替え」でさえストレスを感じてしまうレベルです。
<br>

これまでの Windows 環境（メモリ16GB、ストレージ256GB）から、新たな Mac 環境（メモリ64GB、ストレージ1TB）への環境移行を進める中で、

「なんか、いつもの Mac と操作感と違う」
->「そういえば、こんな設定を入れていた」

「そうそう、このアプリが便利だよね」
->「さらに便利なアプリが見つかった」

という発見がありましたので、「3日後の自分は他人」の箴言に従って「JIS配列Mac の環境構築内容」をブログ化しました。

## TL;DR

- マウス・トラックパットを設定する
- ターミナルを設定する
- ランチャー +α を設定する
- Web ブラウザを設定する
- キーマッピングを設定する

| #   | 設定対象               | Before                            | After                                                                       |
| --- | ---------------------- | --------------------------------- | --------------------------------------------------------------------------- |
| 1   | マウス・トラックパット | -                                 | ・最速にする                                                                |
| 2   | ターミナル             | -                                 | ・iTerm2<br>・.zshrc                                                        |
| 3   | ランチャー+α           | ・Aflred<br>・Clibor<br>・Shiftlt | ・Raycast                                                                   |
| 4   | Webブラウザ            | ・Google Chrome                   | ・Arc<br>・Zen Browser<br>・Google Chrome                                   |
| 5   | キーマッピング         | -                                 | ・Karabiner-Elements（Advanced Keymap for JIS Keyboard: Project “UTILITY”） |

## マウス・トラックパッド

Macの環境構築に着手して、まず初めに思ったのが「あれ、カーソルを動かすのに、こんなに指をスクロールしていたっけ？」という違和感です。まずはこの感覚から調整していきます。

システム設定 > アクセシビリティ > ポインタコントロール > マウスとトラックパッド に

- トラックパッドオプション
- マウスオプション

のボタン2つがありますので、いずれも「スクロールの速さ」を「最速」に変更しました。

<img src="/images/2025/20250225a/ポインタコントロール設定.png" alt="ポインタコントロール設定" width="1200" height="1073" loading="lazy">

<img src="/images/2025/20250225a/スクロール最速.png" alt="スクロール最速" width="1200" height="1073" loading="lazy">

また、システム設定 > トラックパッド > ポイントとクリック には

- 軌跡の速さ
- クリック

のバーが2つあります。
「軌跡の速さ」は「最速」に、クリックは「弱い」に変更しました。

<img src="/images/2025/20250225a/軌跡の速さを最速、クリックを弱いに変更.png" alt="軌跡の速さを最速、クリックを弱いに変更" width="1200" height="1073" loading="lazy">

クリックを「弱い」に設定したのは「[Mac のトリプリクリック](https://support.apple.com/ja-jp/guide/mac-help/mchlp1378/mac)」の検知感度を上げるためです。

Mac のテキスト選択には、ダブルクリックで「単語の選択」が、トリプリクリックで「段落の選択」が可能です。ある文章の全体をコピーしたい時に、Chrome 拡張機能の「[Copy on Select](https://chromewebstore.google.com/detail/copy-on-select/kdfngfkkopeoejecmfejlcpblohnbael)」などの選択範囲をクリップボードに貼り付ける機能を有効化してから、トラックパッドを3連打してテキスト行全体を選択すれば、クリップボードへの文章の取り込みが一瞬で完了します。トラックバッドでスクロールしながら、気になった場所はトリプルクリックでクリップボードに貼り付け、（後に紹介する）Raycast でクリップボードの履歴管理を行うまでがワンセットです。

## ターミナル

続いて、プログラマーにとって重要な「コマンド環境」を用意していきます。

Macにはデフォルトで「[ターミナル](https://support.apple.com/ja-jp/guide/terminal/welcome/mac)」が搭載されています。

「コマンドが実行できる環境」という意味ではターミナルで十分ではあります。ただし、エンジニアの開発支援や「作業モチベーション」を考えると、よりハイスペックなターミナルが欲しくなってきます。

今回は「[iTerm2](https://iterm2.com/)」と「[Hyper](https://hyper.is/)」の2つを比較の上で、前者の「iTerm2」をメインターミナルとして設定しました。

### iTerm2

<img src="/images/2025/20250225a/iTerm2ロゴ.jpeg" alt="iTerm2ロゴ" width="1200" height="468" loading="lazy">

サイトからインストール後、Profiles の内容を自分好みに調整していきます。

デフォルトの profile は残しておきたいので、新しい profie を `custom` という名前で作成して、以下の設定値に更新しました。

| 一覧     | 項目                     | 設定値                   |
| -------- | ------------------------ | ------------------------ |
| Colors   | Color Presets...         | Smoooooth                |
| Text     | Font                     | 15                       |
| Window   | Settings for New Windows | Columns: 120<br>Rows: 30 |
| Terminal | Scrollback Buffer        | Unlimited scrollback     |

#### Colors

<img src="/images/2025/20250225a/1.png" alt="" width="1200" height="817" loading="lazy">

#### Text

<img src="/images/2025/20250225a/2.png" alt="" width="1200" height="675" loading="lazy">

#### Window

<img src="/images/2025/20250225a/3.png" alt="" width="1200" height="811" loading="lazy">

#### Terminal

<img src="/images/2025/20250225a/4.png" alt="" width="1200" height="831" loading="lazy">

私が iTerm2 に加えた「見栄えの設定値」は以上です。

### .zshrc

ターミナル操作の簡略化と、表示情報をリッチ化するために `.zshrc` ファイルへ追記していきます。

設定内容は概ね、[macOS の zsh ではこれだけはやっておこう](https://zenn.dev/sprout2000/articles/bd1fac2f3f83bc) の内容を踏襲しました。今後、作業を進めながら必要に応じて、徐々に追記してく予定です。

コーディング内で頻繁に利用することが分かっているコマンドは、これまでに使い慣れた `alias` を追加しています。以下に一部だけ添付しました。`alias` もコマンドショートカット同様に、使いこなすと生産性アップに直結して非常に便利です。唯一の難点としては、`$ history` でコマンド実行履歴を共有する場合のコミュニケーションが難しくなることくらいです。ちなみに、以下のサンプルで `git switch` が　`gc` になっている理由は、もともと `git checkout` でブランチを切り替えていた頃の名残です。

```sh
# alias for command line
alias ll='ls -la'

# alias for git
alias ga='git add'
#alias gc='git checkout'
alias gc='git switch'
alias gm='git commit -m'
alias gl='git log'
alias gf='git fetch'
alias gp='git pull'
alias gb='git branch'
alias gd='git diff'
alias gs='git status'
alias gph='git push origin HEAD'

# alias for docker
alias d='docker'
alias dc='docker compose'
```

私の iTerm2 では、ここまでの設定を加えた時点で、以下のような見栄えになりました。スタート地点の白黒ターミナルと比較すると、リッチ感が増して作業モチベにもいい感じです。

<img src="/images/2025/20250225a/リッチな感じのiTerm2のコンソール.png" alt="リッチな感じのiTerm2のコンソール" width="1200" height="774" loading="lazy">

## ランチャー, クリップボード履歴, 画面シフト操作

ランチャーアプリには「[Raycast](https://www.raycast.com/)」を利用します。

<img src="/images/2025/20250225a/raycast.png" alt="raycast" loading="lazy">

Raycast には「ランチャー」としての機能だけでなく、クリップボード履歴機能や、各種操作に Hotkey 付与する機能が搭載されています。そして、これらを無料で利用できます。（ただし、「AI機能」は2週間の Free Trial 後に有償利用となります。また、ハイスペ PC なら気にするまでもありませんが、メモリ消費量が比較的多いように感じます。）

今回の環境構築時に Raycast の存在を知ったのが大きな収穫の1つ目です。これまでは、各機能ごとにアプリケーションを使い分けていました。

| 機能               | アプリ名                                       |
| ------------------ | ---------------------------------------------- |
| ランチャー         | [Alfred](https://www.alfredapp.com/)           |
| クリップボード履歴 | [Clibor](https://chigusa-web.com/clibor/)      |
| 画面シフト操作     | [Shiftlt](https://github.com/fikovnik/ShiftIt) |

Alfred には「[Clipboard History](https://www.alfredapp.com/help/features/clipboard/)」というクリップボードの履歴管理機能がありますが、「[Powerpack](https://www.alfredapp.com/help/powerpack/)」を購入しないと使えない有償機能です。ランチャーとしては文句なしだとしても、この機能だけのために、他機能も含まれたパッケージを購入することには気が乗りませんでした。また、Shiftlt は「[新しいメンテナーを募集中](https://github.com/fikovnik/ShiftIt/issues/296)」のため、普段使うPCへインストールするには少々不安があります。Shiftlt の移行先として Hammerspoon が候補になりますが、定義ファイルを編集せずとも UI 操作のみでキーマッピングできると嬉しいなと思っていました。

Raycast はこれらのモヤモヤを一挙に解決してくれるため、まさにニーズを満たすツールです。

### Raycast

Raycast Setting には以下の設定を加えました。ランチャーの起動はキーは、長年の習慣で `command(⌘) + space` に決まりです。

| 操作        | Hotkey               |
| ----------- | -------------------- |
| Raycast起動 | `command(⌘) + space` |

<img src="/images/2025/20250225a/Raycast起動.png" alt="Raycast起動" width="1200" height="801" loading="lazy">

<br>

「クリップボード履歴」と「画面シフト操作」に加えて、アプリケーション起動の Hotkey も設定しました。

#### アプリケーションの起動

| Applications       | Hotkey          |
| ------------------ | --------------- |
| Arc                | `option(⌥) + a` |
| Finder             | `option(⌥) + f` |
| Google Chrome      | `option(⌥) + c` |
| Slack              | `option(⌥) + s` |
| Visual Studio Code | `option(⌥) + v` |
| Zen Browser        | `option(⌥) + z` |
| iTerm2             | `option(⌥) + i` |
| アクティビティモニタ             | `option(⌥) + m` |

#### クリップボード履歴

| Clipboard History        | Hotkey           |
| ------------------------ | ---------------- |
| クリップボード履歴の表示 | `command(⌘) + .` |

#### 画面シフト操作

| Window Management      | Hotkey           |
| ---------------------- | ---------------- |
| Left Half（左に分割）  | `command(⌘) + ←` |
| Maximize（最大化）     | `command(⌘) + ↑` |
| Right Half（右に分割） | `command(⌘) + →` |

<img src="/images/2025/20250225a/ショートカットキー一覧.png" alt="ショートカットキー一覧" width="1200" height="823" loading="lazy">

1つのアプリで統合管理できると、アプリ間での Hotkey のコンフリクトが避けられるので非常に便利です。

## Webブラウザ

環境準備にあたり、もちろん真っ先に Safari から Google Chrome をインストールして、Chrome をデフォルトのブラウザに設定しました。

しかしながら、**Webブラウザは「Google Chrome 一択」というのは誤解**だと気づいたのが、Mac環境構築で得た収穫の2つ目です。もちろん、Safari や Firefox はこれまでも（たまに）利用していました。ただし、利用用途が非常に限られていたため、Web ブラウザ界隈のナレッジを拡張するきっかけがありませんでした。それほど、Google Chrome の万能性が高いということでもあります。例えば、検証環境と本番環境で AWS アカウントを使い分けており、その2つの環境に「1つの PC 環境にあるブラウザから同時にログインしたい」となった場合、私は Google Chrome の「通常のブラウザ」と「シークレットブラウザ」の両方を起動して、それぞれからログインする方法としていました。業務用途としては、正直これで十分です。

その一方で、PC のハードウェアを交換しても

- Google アカウントが同じであれば、基本的に Chrome のブックマークは引き継がれ続けて、とてつもない数になっている
- Chrome で無限に増え続ける「タブ」を管理する上手い方法を知りたい

というちょっとした「なんか、いい方法ないかな」の思いで「[YouTube で web browser を検索](https://www.youtube.com/results?search_query=web+browser)」したところ [Arc](https://arc.net/) というスタイリッシュな Web ブラウザの存在を知って、試しにインストールしてみました。

### Arc

[Arc](https://arc.net/) は [The Browser Company](https://thebrowser.company/) が開発する Chromium ベースの Web ブラウザーです。

<img src="/images/2025/20250225a/arc.png" alt="arc" loading="lazy">

Google Chrome であれば「タブ」と「ブックマーク」は水平に広がっていきますが、Arc は垂直にそれらの要素を配置していきます。また、利用頻度の高いアプリをアイコンのように配置したり、Space を切り替えることで「タブやブックマークのグルーピング」と「作業環境の切り替え」をワンセットで行えます。エンジニア目線で「確かに、こんな機能が欲しかった！」がてんこ盛りになっており、私は **Arc をデフォルトのブラウザに設定** しました。Arc ブラウザの詳細機能は本ブログでは扱わないため、以下の記事をご参照ください。具体的なイメージがつかない場合には「とりあえずインストールして、軽く触れてみる」だけでも、Chrome とは違った操作感が得られると思います。

- [世界で話題のブラウザ「Arc」が便利すぎたので魅力を解説する](https://qiita.com/ruitomo/items/cc444c6e4393568ee5b2)
- [【ブラウザ】Arcについて力説＆使い方](https://qiita.com/leo_canada/items/7db010933f2af8437285)

その一方で、Arc ブラウザは、本ブログの執筆時点（2025年2月）にて「機能開発は終了」して、メンテナンスフェーズに入っている状況です。本件について、開発元 CEO の Josh Miller は以下のように投稿しています。

> we're not abandoning arc!! just don't think it needs more features. just stability, performance, security.
https://x.com/joshm/status/1849889202164334786

継続的にパフォーマンス問題の改善やパッチ当てを続けてくれるのであれば問題ありませんが、念のための備えとして、別のブラウザも必要だなと思いました。だからと言って、一度でも「Arc の操作感」を知ってしまうと、Google Chrome には戻り難いものがあります。YouTube で検索したところ、Arc ブラウザの開発元は「Dia」という全く別の AI をベースとして新しいブラウザの開発を進めていること、及び、Arc の移行先として「[Zen Browser](https://zen-browser.app/)」が候補として上がっていることが分かりました。

- [What have we been up to? (CEO Update)](https://www.youtube.com/watch?v=E9yZ0JusME4)
- [An early peek at Dia, our second product | A recruiting video](https://www.youtube.com/watch?v=C25g53PC5QQ)
  - [The Browser Company、新ブラウザー「Dia」のプレビュー動画を公開](https://japan.zdnet.com/article/35226860/)
- [My favorite browser is (kind of) dead](https://www.youtube.com/watch?v=1PxhTfmEyQ8)
- [I'm Finally Moving On (I have a new browser)](https://www.youtube.com/watch?v=dPUzOQdUFSg)
- [Arc Browser is DEAD… This One is BETTER!](https://www.youtube.com/watch?v=st4JZi-3OVo)

「Arc の操作感」が得られるならば、ということで、Zen Browser をインストールしてみました。

### Zen Browser

「[Zen Browser](https://zen-browser.app/)」は、オープンソースで開発されている Fixforx ベースの Web ブラウザです。

<img src="/images/2025/20250225a/zen.png" alt="zen" loading="lazy">

Zen Browser は設定を「日本語」に変更することが可能です。

Zen Browser（左）とArc（右）を並べてみると、見栄えはほとんど同じです。

<img src="/images/2025/20250225a/ZenとArcの画面比較.png" alt="ZenとArcの画面比較" width="1200" height="748" loading="lazy">

ただし、ショートカットの差分として、例えば「サイドバーを閉じる」コマンドには以下のような違いがあります。

- Zen Browser
  - `option(⌥) + command(⌘) + c`
- Arc
  - `command(⌘) + s`

<img src="/images/2025/20250225a/5.png" alt="" width="1200" height="747" loading="lazy">

「[How to make Zen browser feel like Arc](https://flavienbonvin.com/articles/how-to-make-zen-browser-feel-like-arc/)」という記事も書かれているように「いかに、Zen Browser を Arc っぽくするか」は、Arc に魅了された世界中のエンジニアにとって共通の課題に見えます。私が感じた差分は「ブックマーク」の扱いです。Arc はサイドバーに「フォルダ」という概念でブックマークを配置しますが、Zen Browser は「ツールバー」にブックマークを表示するスタイルです。ツールバーの配置場所は調整可能という点は Zen Browser の強いポイントなので、願わくば、サイドバーにいい感じに配置できれば嬉しいなという思いです。

Zen Browser の各種機能を動かしていると、Essentials（サイドバー上側のアイコン箇所）が消えてしまう等の不具合がみられるため、将来的には各種機能が改善されることを期待しつつ、ひとまずは「**メインは Arc。サブで Zen Browser**。非常時に Google Chrome」の使い方と決めました。

## キーマッピング

JIS配列Macはデフォルトで「Emacs キーバインド（[Mac のキーボードショートカット](https://support.apple.com/ja-jp/102650)）」が使えるため、あらためてキー配置を変える必要性はありませんでした。しかしながら、**JIS配列のMacを最大限に活用する** ために「[Karabiner-Elements](https://karabiner-elements.pqrs.org/)」をインストールして「[Advanced Keymap for JIS Keyboard: Project “UTILITY”](https://ke-complex-modifications.pqrs.org/#advanced_keymap_utility)」の設定を行いました。

本章の設定内容は「[Karabiner-Elements Advent Calendar 2023](https://qiita.com/advent-calendar/2023/karabiner-elements)」で紹介された方法を踏襲しました。このアドベントカレンダー内では、以下の引用通りに「JIS配列Macは反則的」という点が紹介されています。

> JIS 配列は､『英数・かな』キーを独自の修飾キーとして設定することにより、他の配列など比ぶべくもないほどに『合理的』なキー配置となるから
> もはやあなたは､（Mac の内蔵キーボードにおいては）他の追随を許さない最高の配列､「JIS 配列」を手にすることになります。

> デフォルト状態での「見た目のよさ」や「合理性」など、総合的なメリットで選ぶなら US 配列が「圧倒的に」オススメだが、自分好みにカスタマイズする前提で、機能性を重視するのであれば、それらのメリットが消し飛ぶ勢いで JIS 配列が「反則級に」便利である。
> ｢圧倒的」の二つ名を持つ US 配列と､「反則級」の二つ名を持つ JIS 配列。あなたはどちらを選びますか？

これらの文章に触発されて、これまで私も「JIS配列Mac」にこだわり続けたからこそ、このキーマップは是非とも使いこなしたいと思いました。

「[Karabiner-Elements Advent Calendar 2023](https://qiita.com/advent-calendar/2023/karabiner-elements)」のキーマップ内容は、「JIS配列Mac」にしかない「英数」と「かな」ボタンに、新しい修飾キーとしての役割を与えることで、キーボードにレイヤーの概念を加えるというものです。

<img src="/images/2025/20250225a/キーボードのレイヤー.png" alt="キーボードのレイヤー" width="1200" height="1526" loading="lazy">

上記の「英数（Fn1）レイヤー」の例だと、

- 「英数」ボタンのみ
  - -> 英数入力に切り替え
- 「英数」+ 他のボタン
  - -> キーマップに対応した入力

となるため、ホームポジションで行える操作が大幅に増加します。
デフォルトで使える「Emacs キーバインド」と「キーボードのレイヤー化」を合わせることで、ショートカットコマンドの実行速度をさらに向上させられます。

コマンド数が多いため、まずは「英数」の修飾キー化のみを有効化しました。コマンドを体得次第、徐々に Enabled の幅を広げていく予定です。

<img src="/images/2025/20250225a/コマンド.png" alt="コマンド" width="1200" height="859" loading="lazy">

以上で、今回の「JIS配列Macの環境構築」はクローズです。

## おわりに

本ブログでは、JIS配列Macの環境構築を取り上げました。

環境構築を進める中で、作業前には存在すら知らなかった以下のツール達が、今後の主力武器になりました。せっかく見つけた「Arc」の機能開発が終了してしまったことは残念ですが、CEO のポストを踏まえると「Web ブラウザとしてすでに完成しているので、これ以上の機能追加は必要ない」という意図にも捉えられます。移行先として有力な「Zen Browser」の今後の発展（特に、サイドバーでのフォルダ管理機能）m楽しみです。

- [Raycast](https://www.raycast.com/)
- [Arc](https://arc.net/)
- [Zen Browser](https://zen-browser.app/)
- [Karabiner-Elements](https://karabiner-elements.pqrs.org/) の [Advanced Keymap for JIS Keyboard: Project “UTILITY”](https://ke-complex-modifications.pqrs.org/#advanced_keymap_utility)

2年前に、Mac -> Windows への環境移行時に「[Mac 慣れした私に Windows が支給されたので、まず設定したこと](/articles/20230216a/)」を執筆して、その「終わりに」には以下の記述がありました。

> 「使い慣れた環境から、あえてズレてみる」というのも、技術キャッチアップには刺激になるのかもしれません。

普段使いの「当たり前のツール」を見直すことで、より便利なツールの発見に繋がりました。

> みなさま、良い Mac ユーザライフを！

「Mac ユーザライフ」を再開します。


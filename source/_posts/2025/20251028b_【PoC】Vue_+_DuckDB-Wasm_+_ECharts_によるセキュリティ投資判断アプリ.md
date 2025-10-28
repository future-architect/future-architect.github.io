---
title: "【PoC】Vue + DuckDB-Wasm + ECharts によるセキュリティ投資判断アプリ"
date: 2025/10/28 00:00:01
postid: b
tag:
  - Vue.js
  - 可視化
  - WebAssembly
category:
  - Frontend
thumbnail: /images/2025/20251028b/thumbnail.png
author: 松本朝香
lede: "経営者がセキュリティ投資判断をしやすくする簡易ダッシュボードを構築しました！使用するデータ量が多くなってもブラウザで固まらず、今後の拡張性も加味した構成にしたかったため..."
---
# はじめに

こんにちは、CSIG（Cyber Security Innovation Group）所属 の松本です♪

現在専門ドメインはセキュリティです。もともとデータのセマンティックに関心がありますが、加えて最近では脅威モデリングや脅威インテリジェンスに注目しています。

今回は、経営者がセキュリティ投資判断をしやすくする簡易ダッシュボードを構築しました！使用するデータ量が多くなってもブラウザで固まらず、今後の拡張性も加味した構成にしたかったため [WASM (WebAssembly)](https://developer.mozilla.org/ja/docs/WebAssembly) を組み込んでいます。開発プロセスで遭遇するセキュリティ豆知識も掲載しているので、記事を通して一緒に学んでいければと思います。

# 背景

本テーマを執筆した背景としては、セキュリティ投資意識を具体的な行動へつなげる支援ができたら、という思いからです。

セキュリティは売り上げに直接的に結びつかないため「守りの投資」と言われており、平時はコストとみなされがちです。しかし、有事になるとこれまで投資を着実に進めてきた企業とそうでない企業で結果は **二極化** します。

直近でも、国内大手企業においてインシデントが多発しており、特にランサムウェア被害が拡大しています。もはやサイバー攻撃を完全に防ぐことはできません。自社リソースを鑑みて **"どこ"** に **"どの程度"** セキュリティ投資を行うと最もROIが高くなるのかを真剣に見極め、現時点ベースでの対策を実行に移していくことが被害を最小限にする対策です。

::: note warn
積立NISAのように、セキュリティも **"投資先を見極める選球眼"** と **"コツコツ投資実行"** が重要

:::

# 本記事を読むメリット

- Single Page Applicationでデータ分析～可視化の可能性を知ることができる
- Vite環境でDuckDB-WASMを扱う際のポイントを知ることができる
- VueとEChartsの連携方法と描画機能とUIの関係について知ることができる
- 現時点ベースでのセキュリティ投資判断の重要性を認識することができる

# 本ツールがもたらす効果

- **工数削減と迅速化**
これまで担当者が数時間～数日かけて定期的に行っていたセキュリティ対応の精査及び優先順位付け（情報の調査、分析、対策立案まで）のプロセスを短縮します。
- **対策の精度向上**
「とりあえず全部のログを取る」といった闇雲な対策から、自社に合わせた費用対効果（ROI）の高い対策へシフトできます。
- **組織内のコミュニケーション円滑化**
エンジニア、マネージャー、経営層が同じデータを見て会話できるため、セキュリティに関する意思決定がスムーズになります。

※気になる方が多ければ何かしらの形でツール公開も視野に入るため、記事へのリアクションを いいね♥ や SNS などでいただければ幸いです。今回はあくまでフロントエンド開発の記事となります。

# アウトプット

最終的に経営者ビューと技術者ビュー二画面切り替え仕様にし、ホバーやドラッグ&ドロップができるInteractiveなアプリとなりました :)

<iframe width="560" height="315" src="https://www.youtube.com/embed/jUJgXRPqGQQ?si=9A9N8BlqrtPkfNiS" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

**【経営者ビュー】**
投資対効果を検討するため、その対策を行ったときの想定損失低減率を縦軸、１つの対策で自社の資産をどの程度（範囲/規模）守ることができるのかのカバレッジを横軸に4象限で区分けし、現状に即したセキュリティ投資対象を選別することを想定しています。バブルチャートは投資割合を表しており、左下の基準(1)となる円より大きければ過剰投資、小さければ投資不足を意味します。つまり、右上の "IDEAL AREA" に基準円と同じ大きさの円があれば、**最適な投資対象** に **最適な投資額** を投じていることになります。具体的な数値は、カーソルオン時のポップアップに記載しています。

<img src="/images/2025/20251028b/image.png" alt="image.png" width="1200" height="551" loading="lazy">

**【技術者ビュー】**
経営者に根拠をもって説明するため、技術的脅威（attack technique）と防御策と対象資産を網羅的に紐づけ、防御策の有効性を可視化することを想定しています。クリックすると、各ノードは該当するMITREのリンクへアクセスしてくれます。

<img src="/images/2025/20251028b/21eb3673-f334-4431-9977-1871ffb96a81.png" alt="" width="1200" height="587" loading="lazy">

# 要件と仕様

個人の即席アプリ開発ということで、技術選定を行いました。

### 要件

- 素早い開発環境構築
- 高速処理
- インタラクティブなUI
- 拡張性

### 仕様

- [Vite](https://vite.dev/guide/) + vue：高速な開発環境とUI構築
- [DuckDB-WASM](https://duckdb.org/docs/stable/clients/wasm/overview)：ブラウザ内蔵の超高性能データベースエンジン
- [Echarts](https://echarts.apache.org/examples/en/index.html)：インタラクティブ性の高い豊富なグラフ描画ライブラリ

### 関連用語

- **SPA（Single Page Application）**
処理の多くをサーバーと通信せずにブラウザ内（クライアントサイド）で完結させ、ページ遷移なしの高速なUIレスポンㇲを実現するアプリケーション全般を指します。
- **DuckDB**
もともとは、データ分析（大量のデータを読み込んで集計や計算をすること）に特化した、高速なデータベースです。「データ分析版SQLite」のような存在です。[操作デモ](https://shell.duckdb.org/) をweb上で行うことができるので是非使用感をお試しください。
- **WASM (WebAssembly)**
C++やRustのような高速な言語で書かれたプログラムを、Webブラウザ内でほぼネイティブの速度で実行可能にするための技術です。
- **DuckDB-WASM**
DuckDB本体をWASMに変換することで、この強力なデータベースをブラウザの中で完結させる（=サーバレス）ことを実現しました。DuckDB-WASMは外部サーバーと通信するのではなく、SPAが動いているブラウザの中で直接、強力なデータ処理能力を提供します。したがって、サーバーとの通信は最初のデータ取得1回だけに減り、その後の複雑なフィルタリングや集計はすべてブラウザ内で完結し、結果としてUIは常に高速なまま動作することになります。

# 開発環境準備


Windowsでの Duckdb-WASM開発はすでに [先駆者](https://qiita.com/ttdc_msuzuki/items/5602a13c14259de8e3b8) がいらっしゃったため、今回は Rocky Linux を利用することとしました。

```sh
$ curl -o- [https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh](https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh) | bash
~~~ (中略) ~~~

$ node -v
v22.19.0
$ npm -v
11.6.0
```

参照先：[https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating)

開発環境は、下記で進めます。

- プロジェクト名：security-invest
- フレームワーク：Vue
- 言語：TypeScript

今回使用したライブラリ群は以下の通りです。

```sh
$ npm list
security-invest@0.0.0 /home/user01/security-invest
├── @duckdb/duckdb-wasm@1.29.0
├── @types/node@24.9.1
├── @vitejs/plugin-vue@6.0.1
├── @vue/tsconfig@0.8.1
├── echarts@5.6.0
├── path@0.12.7
├── typescript@5.6.3
├── vite-plugin-static-copy@3.1.4
├── vite@5.1.2
├── vue-echarts@6.7.3
├── vue-tsc@3.1.2
└── vue@3.5.11
```

※DuckDB APIは 1.29.0と1.30.0でAPIの仕様変更があり、事前によく確認してから利用することをお勧めします。

::: note info
**ソフトウェアサプライチェーン問題**
npmは汚染されやすいという話を聞いたことがありますか？

```sh
npm audit
```

上記コマンドは、プロジェクトが依存しているパッケージ（package.json にリストされているもの）に既知の脆弱性がないかを自動チェックし、脆弱性が見つかった場合はその詳細（深刻度、影響を受けるパッケージ、修正方法）をレポートしてくれます。

<img src="/images/2025/20251028b/npm-report.png" alt="npm-report.png" width="971" height="224" loading="lazy">

```sh
npm audit fix
npm audit fix --force
```

上は互換性を維持したまま（セマンティックバージョニングの範囲内で）修正可能な脆弱性の多くを自動でアップデートしてくれます。下はメジャーバージョンが上がるような、互換性が壊れる可能性のあるアップデートも強制的に実行します。基本は上のみで問題ないと思います。

:::

開発ディレクトリへ移動して...

```sh
npm run dev
```

<img src="/images/2025/20251028b/image_2.png" alt="image.png" width="1182" height="217" loading="lazy">

この時点で、表示されたURLにブラウザでアクセスすると、Vueの初期画面が表示されます。立ち上がりが早いですね！

## ディレクトリ構成

```sh
duckdb-graph-spa/
├── index.html
├── vite.config.ts
├── package.json
├── public/                <-- WASMとCSVの配置場所 (Viteの標準)
│   ├── inputdata_01.csv
│   ├── inputdata_02.csv
│   └── ...（材料はここへ）
│   └── duckdb-wasm/       <-- DuckDBのWASM/Worker関連ファイル
│       ├── duckdb-mvp.wasm
│       ├── duckdb-mvp.worker.js
│       └── ... (その他必要なファイル)
└── src/
    ├── components/
    │   ├── RiskCharts.vue
    │   ├── MitreGraph.vue
    │   └── ToggleSwitch.vue
    ├── composables/
    │   └── useDashboardData.ts  <-- DBヘルパー呼び出し
    ├── services/
    │   └── duckdbService.ts     <-- DB初期化、接続、クエリ実行のヘルパー
    └── sql/                     <-- SQLクエリファイルの置き場所
        ├── getRiskData.sql
        ├── getMitreData.sql
        └── getPriorityscore.sql
```

## 実装

実装にあたってポイントをご紹介します。

### Viteビルドオプションの活用

Viteは、モダンなWeb開発で使われる非常に高速な開発ツール（ビルドツール）です。下記設定ファイルを使って、Viteの動作をプロジェクトに合わせてカスタマイズします。オプションがさまざまあるので [こちら](https://ja.vite.dev/config/shared-options.html) を参考に使いこなしてみましょう。

#### クロスオリジン分離

処理を高速化させたい場合に、DuckDB-WASM のマルチスレッド機能を利用するため COEP/COOP ヘッダーを設定することでデフォルトではセキュリティ面（Spectre脆弱性）から無効化されている SharedArrayBuffer を有効化することができます。が、「自ドメイン以外のリソースを読み込む際に、相手側が読み込み許可と宣言してくれていないと、ブラウザがブロックする」という制限がかかります。そのため、許可宣言を記載をすべてのリソースに行わないといけないのでかなり大変です。ここに高速処理とセキュリティのトレードオフを垣間見ました...。最初知らずに設定し続けていたため、画面に何も表示されず沼にはまりました(´;ω;｀) (3Dグラフィックスの計算などはWASM-Thread高速処理設定が必要だったりするのですかね...今回はそこまでの量を扱ってないので利用せず)
詳細解説は [こちら](https://blog.agektmr.com/2021/11/cross-origin-isolation.html)

```ts vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    include: [
      'echarts',
      'vue',
      'duckdb-wasm',
    ],
  },
  server: {
    headers: {
      // Activate to use SharedArrayBuffer function
      'Cross-Origin-Opener-Policy': 'same-origin',     // COOP
      'Cross-Origin-Embedder-Policy': 'require-corp',  // COEP
    },
  },
})
```

**optimizeDeps** では、Viteが自動検出しにくい可能性のある echarts, vue, duckdb-wasm の3つを、強制的に最適化（事前バンドル）の対象に含めて開発環境の安定化を図っています。

### DBインスタンスのシングルトンパターン管理

下記のような専用ファイルを作成し、そのファイル内でDBインスタンスを1回だけ生成し、exportすることでコンポーネントの再描画時にDuckDB初期化処理の実行をスキップさせます。Vue コンポーネント側は、常にこの export されたインスタンスを import して使います。

```ts duckdbService.ts
import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import duckdb_worker from '@duckdb/duckdb-wasm/dist/duckdb-mvp.worker.js?url';

// 1. DBインスタンスをここで生成
const dbInstance = new duckdb.AsyncDuckDB();
let isInitialized = false;

// 2. 初期化処理を関数として切り出す
export async function initializeDB() {
  if (isInitialized) return dbInstance;

  await dbInstance.instantiate(duckdb_wasm, worker);
  isInitialized = true;
  return dbInstance;
}

// 3. インスタンスそのものやクエリ関数をexportする
export const db = dbInstance;
```

### Interactive UI

こちらは、ホバー時のポップアップ表示の挙動を指示している箇所です。「データ要素にマウスを合わせたらツールチップを出す。その際、もしデータに詳細な description があればIDと説明文をリッチに表示し、なければ name だけをシンプルに表示する」を実現しています。

```html ホバー時ポップアップ
tooltip: {
      trigger: "item",
      formatter: (p: any) =>
        p.data.description
          ? `<b>${p.data.id}</b><br/>${p.data.description}`
          : p.data.name,
    },
```

こちらは、**ノード（点）** と **リンク（線）** で構成されるデータの関係性を分かりやすく表現している箇所です。

```html 力学指向ネットワーク図
~~~（中略）~~~
          color: "#333",
          fontSize: 11,
        },
        // --- 力学シミュレーション設定 ---
        force: {
          repulsion: 180,
          edgeLength: [80, 140],
        },
        // --- データ配列設定 ---
        data: sortedNodes.map((n) => ({
          ...n,
          itemStyle: { color: n.color },
          // --- リンク数（重要度）に応じてノードを巨大化 ---
          symbolSize: 25 + nodeDegree(n.id) * 3,
        })),
        links: mitreGraph.value.links,
        lineStyle: {
          color: "rgba(150,150,150,0.4)",
          width: 1.5,
        },
        // --- ホバー時のハイライト設定 ---
        emphasis: {
          focus: "adjacency",
          lineStyle: { color: "#888", width: 3 },
        },
      },
    ],
```

### Parquet形式

DuckDB-WASMは **Parquet形式** の読み込みに最適化されています。したがって、大量のデータをS3等に保管し、そこから必要な分だけ読み出すという処理を得意とします。データ量が膨大になった際、こちらの機能を利用することが想定されます。[CloudShell上にDuckDBをinstallしてデータDLなしで分析可能な体制を作る](https://dev.classmethod.jp/articles/analyze-s3-parquet-with-duckdb/) ことが可能（無料!!）なのでAthenaの代替として有効な手段かもしれません。

## インプットデータ

### 管理台帳系

情報資産管理台帳で一般的に取得可能と想定されるデータを用意しました。それに加え、定量化するにあたって必要な情報を疑似的に保持させました。

### MITRE系

今回利用する MITRE ATT&ACK と MITRE D3FEND は STIX準拠のNoSQLでした。DuckDBを利用するためクエリ検索しやすい形に変換する必要があります。

<img src="/images/2025/20251028b/image_3.png" alt="image.png" width="1200" height="455" loading="lazy">

公式サイト内をよく探すと、STIXではない形式での取得が可能なAPIが提供されていました。興味のある方は見つけてみてくださいね :)

※今回利用しているデータは一般公開情報を元にしたサンプルデータとなります。

### 参考資料

https://duckdb.org/docs/stable/clients/wasm/instantiation
https://duckdb.org/docs/stable/clients/wasm/data_ingestion
https://duckdb.org/docs/stable/clients/wasm/query
https://www.flatuicolorpicker.com/all-flat-ui-colors/
https://www.ipa.go.jp/security/guide/sme/ug65p90000019cbk-att/000055518.xlsx
https://www.ipa.go.jp/security/sme/f55m8k000000587z-att/outline_guidance_risk.pdf
https://attack.mitre.org/resources/attack-data-and-tools/
https://d3fend.mitre.org/api-docs/

# まとめ

今回は、実用性のあるアプリを題材に、Vue + DuckDB-wasm + ECharts を実装する上でのポイントやセキュリティ関連の知識を解説してみました。

この記事をきっかけに、

- サーバーレスでも分析アプリをつくってみたい！という方
- セキュリティを意識した開発プロセスを実践できる技術者
- セキュリティ投資の重要性を理解し投資判断できる経営者

が増えるといいなと思います :)

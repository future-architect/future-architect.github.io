---
title: "AI Agent用フレームワーク「Dapr Agents」について調べてみた"
date: 2025/06/25 00:00:00
postid: a
tag:
  - AIエージェント
  - Claude
  - OpenAPI
category:
  - DataScience
thumbnail: /images/2025/20250625a/thumbnail.png
author: 原木翔
lede: "Dapr Agentsの検討記事です。Dapr Agents の技術的背景や意義を「Agentic AI」や「ワークフロー」の側面から探ります。"
---

<img src="/images/2025/20250625a/ラジオ風カーソルその2.png" alt="ラジオ風カーソルその2.png" width="1200" height="800" loading="lazy">

> Today, we are excited to announce Dapr Agents, a framework built on top of Dapr that combines stateful workflow coordination with advanced Agentic AI features.
> 本日、Dapr を基盤として構築された新たなフレームワーク「Dapr Agents」のリリースを発表いたします。Dapr Agents は、ステートフルなワークフロー調整機能と先進的な Agentic AI 機能を統合したソリューションです。
> https://www.cncf.io/blog/2025/03/12/announcing-dapr-ai-agents/

[CNCF 連載](/articles/20250616a/) 6 日目は[Dapr Agents](https://github.com/dapr/dapr-agents)の検討記事です。

Dapr Agents の技術的背景や意義を「Agentic AI」や「ワークフロー」の側面から探ります。

::: note info
実際に触ってみたまでが長いですが、読み物としてお付き合いください。
:::

## Dapr について

Dapr Agents そのものの説明の前に、そのベースとなった Dapr が開発された技術背景について説明します。

古の時代 ── つまり 2013 年に [**Docker**](https://www.docker.com/) が登場した頃、開発者の間では「業務ロジックに集中できる未来」が来ると期待されていました。

当時、**DevOps**ムーブメント（2009 年頃〜）が進展し始めており、「開発と運用の分離」ではなく、両者の協調が重要視されるようになっていました。

この中で Docker は、開発・テスト・本番の環境差異を解消し、アプリケーションを同一の形式でどこでも動かせるという点で注目を集め、DevOps を加速させる技術として歓迎されました。

「インフラはコンテナに任せて、開発者は業務ロジックに集中できる」といった期待が高まったのはこの時期です。

しかし実際には、2014 年に登場した **Kubernetes** の普及や、**マイクロサービスアーキテクチャ**の流行により、アプリケーション構成は大規模・分散化していきました。

その結果、開発者は再び次のような課題に直面します。

- サービス間通信（同期・非同期）
- ステートの分散管理
- 認証・認可(mTLS など)
- 可観測性（メトリクス・トレース）
- リトライやサーキットブレーカーなどの耐障害設計

つまり、Docker で期待された「運用の抽象化」や「融合」は、Kubernetes 時代に再び専門性を求められるものとして複雑化してしまったのです。

その状況を受け、.NET フレームワークとして開発されていた Microsoft の[Orleans プロジェクト](https://learn.microsoft.com/en-us/dotnet/orleans/overview)の「分散処理の抽象化」というコンセプトをより汎用的にした実装として**Dapr**が登場しました。

Dapr は、サービス呼び出しやステート管理、Pub/Sub などの機能をサイドカーで提供するランタイムであり、Kubernetes の複雑さを意識せずアプリケーションロジックに集中できる開発体験を再び実現することを目指し、今でも開発が進められています。

その Dapr のスピンオフとして登場したのが**Dapr Agents**です。

## Agentic AI について

Dapr が**アプリケーションロジックに集中できる開発体験**を提供するように、Dapr Agents は**Agentic AI に集中できる開発体験**を実現するためのフレームワークです。

近年注目される「Agentic AI（エージェント型 AI）」は、目的を与えるだけで複雑なタスクを自律的にこなす AI を指します。たとえば CLI で「claude hogehoge」と呼びかけるだけでいい感じに[^1] コードの生成から PR 作成まで行ってくれる Anthropic の「Claude Code」がその好例です。

IT エンジニア界隈だけでなく、エンタープライズでもこうした Agentic AI の導入が進みつつありますが、先行事例から、一つのエージェントに全てを行わせるよりも、エージェントを分業させて協調動作させる「マルチエージェントシステム」がより高い性能を発揮することが知られてきました。

たとえば、最近、Anthropic は検索機能の裏側にてマルチエージェントシステムを採用していることを公表しました。[^6]スペックが高いリードエージェントが戦略を立て、複数のスペックが低いサブエージェントが検索や情報収集を分担し、単一のエージェントを使用するよりも 90%以上の性能向上を達成した(=調査対象のデータをより正確に収集できるようになった)と報告されています。

一方で、こうしたシステムの実装は非常に煩雑です。[^2]主な構成要素を書き出しても色々な技術的な課題があることに気づくと思います。

- 状態管理（コンテキスト/履歴/中間結果の保管）
- 外部ツールとの接続（MCP サーバー、Web API、ファイル I/O 等）
- 非同期イベント処理
- スケーラビリティや障害耐性の担保

ここで再び Dapr の出番です。Dapr が解決しようとしていた課題とよく似ていますよね。Dapr Agents の根底は、これらの実装負荷を Dapr の仕組みで肩代わりし、エージェントの中身―プロンプト設計や思考方針―に専念できる環境を提供しようという指針があります。

## Agentic AI 時代のワークフロー

Dapr Agents は、Agentic AI の基盤を支える強力なツールですが、その中でもワークフロー機能において強みを持っています。「Agentic AI」においてワークフロー機能はなぜ重要なのでしょうか。

Dapr Agents の開発元である Datagrid は、Anthropic のレポートに触れながら、次のように述べました。[^3]

**「Agentic（エージェント的）」という概念は二元的なものではなく、連続的なスペクトル上に存在する。**

これはエンタープライズ業界における「Agentic AI」の導入指針として重要な示唆を与えています。

**二元的**というのは、Agentic AI が自律的であるがゆえに従来のルールエンジンのような予測可能性とは相反する性質を持っていることを指した言葉です。Agentic AI を完全に野放しにすべきではなく、ワークフローのようなガイドラインに沿って動作させることで、エンタープライズ業界の要件においても耐えうるシステムになることを示したものです。

たとえば、生成 LLM のレスポンスは通常の会話モードでは奔放的ですがこちらから型式を指定して返すようにするモードがあります。エンタープライズ業界のワークフローでは後者が重要なのは言うまでもないでしょう。Dapr Agents では後述する `@task` デコレーターなどで直感的に書くことができます。

::: note info
Anthropic はワークフローの実装にあたり「最初はできるだけシンプルに、必要な場面でだけ複雑さ（＝自律性）を追加せよ」とも推奨しています[^4]。Agentic AI 時代のワークフローの開発スタイルと言えるでしょう。
:::

## 8 つのワークフローパターン

Datagrid は[Building Effective Dapr Agents](https://www.diagrid.io/blog/building-effective-dapr-agents)では、定型的なルールエンジンから自律的な Agentic AI の間で 8 種類の Agentic AI なワークフローを提案しています。

1. Augmented LLM: ツールやメモリ機能を備えた強化版 LLM
2. Stateful LLM: 「Augmented LLM」に永続ストアやリトライを追加し、プロセス落ちても会話が続くようにした LLM
3. Prompt Chaining: 複数の LLM 呼び出しをシーケンシャルに連結したワークフロー
4. Routing: 入力を分類し、特化型エージェントにそれぞれ振り分けられるようにしたワークフロー
5. Parallelization: 独立タスクを並列実行し、結果を集約できるようにしたワークフロー
6. Orchestrator-Workers: オーケストレーター(リーダー)が動的にサブタスクを生成し、ワーカーにそれぞれ仕事を割り振って再度結果を収集できるようにしたワークフロー
7. Evaluator-Optimizer: 生成 LLM と評価 LLM のループで品質を高められるようにしたワークフロー。たとえば評価 LLM を何をしてもダメ出しするようにプロンプトを設定すれば GAN(敵対的生成ネットワーク)になるはず。
8. Autonomous Agent: ReAct フレームワーク[^5]を実装したワークフロー

細かい内容はブログを読んでいただくとして、今回はそのうち最も Agentic AI っぽい「6. Orchestrator-Workers」を深掘っていきたいと思います。

## 「Orchestrator-Workers」パターンについて

CNCF の代表的なプロダクトである Kubernetes について学んだ方なら「コンテナオーケストレーション」という用語になじみ深いと思います。非常に多くのコンテナを意図通りに動かすための自動化技術の総称ですが、Dapr Agents にも同様のパターン「Orchestrator-Workers」があります。

「Orchestrator-Workers」の「Orchestrator」はオーケストラと同じ語源で、指揮者にあたるエージェントが他の演奏者に指示を出しながらシステム全体で一体となって動くことからそのように名前が付きました。

今回は Dapr Agents を使って「テストケースの自動生成ワークフロー」を組んでみました。

GitHub などで PR を作成したことをトリガーにユニットテストやリグレッションテストのような定型テストを実行してパスすることを確認している開発チームは多いと思います。しかし、それはあくまで予期されたテスト内容しか実行できません。カオスエンジニアリング、あるいはセレンディピティを期待するような試験は、以前は人力でないとできない領域だったと思います。そこで、生成 AI と Dapr Agents フレームワークの力を借りてテストケース生成を自動化できないか検証してみたのが以下のワークフローになります。

<img src="/images/2025/20250625a/テストケースの自動生成ワークフロー.png" alt="テストケースの自動生成ワークフロー" width="1200" height="374" loading="lazy">

ワークフローの流れについて説明します。

図の左側にある「OpenAPI Spec ファイル」「パッチファイル」が入力データになります。これらを後続のエージェントに渡す必要があります。

文字列に直してプロンプトに埋め込むという力技もできますが、せっかくなので `@tool` デコレーターを使用しましょう。

Dapr Agents では `@tool` デコレーターを指定することでエージェントが参照する情報を指定することができます。LLM に OpenAPI を採用した場合、内部では Functional Calling を呼んでいます。

下記は OpenAPI の仕様書を取得する処理です。

```python
@tool(args_model=GetApiSpecSchema)
def get_api_spec(file_path: str = "api_spec.yaml") -> Dict[str, Any]:
    """
    API仕様ファイル（OpenAPI YAML/JSON）を読み込んで返す。
    Args:
        file_path: API仕様ファイルのパス（デフォルト: api_spec.yaml）
    Returns:
        API仕様のディクショナリ形式
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            if file_path.endswith(".yaml") or file_path.endswith(".yml"):
                return yaml.safe_load(f)
            elif file_path.endswith(".json"):
                return json.load(f)
            else:
                raise ValueError(f"Unsupported file format: {file_path}")
    except Exception as e:
        logging.error(f"Failed to load API spec from {file_path}: {e}")
        return {}
```

「采配エージェント」は、「OpenAPI Spec ファイル」「パッチファイル」の内容を基に後続の「テスト生成エージェント」への仕事の割り振りを決めます。つまり、どの「テスト生成エージェント」を動かすか決める重要な仕事になります。

```python
# パッチアナライザーエージェント（構造化出力とツールをサポート）
patch_analyzer_agent = StructuredToolCallAgent(
    response_format=AgentSelection,
    role="API Patch Analysis Expert",
    tools=[get_api_spec, get_diff_patch],
    verbose=True
)

@task(
    agent=patch_analyzer_agent,
    description=f"""
パッチアナライザーエージェント: OpenAPI仕様の差分パッチを詳細にCoTで分析し、どのテストエージェントを使用すべきか決定してください。

# 分析手順
1. diff_patchをapi_specに適用した後、どのエンドポイント・スキーマ・セキュリティ要件等がどのように変更されたかをstep-by-stepで一覧にしてください。
2. それぞれの変更点ごとに「どのテスト観点（正常系/異常系/認証/CRUD/エラー系など）」が影響を受けるかを具体的にリストアップしてください。
3. 利用可能なエージェント(下記リスト)の説明を参照し、各観点に最も適切なエージェントを理由付きで選定してください。
4. 各エージェントの選択理由は、「どの差分がどのテスト観点に影響し、なぜそのエージェントが必要か」を必ず明示してください。
5. 理由は英語で書いてください。

# 利用可能なエージェント
{_AGENT_LIST_DESC}

# ツール
- get_api_spec: OpenAPIの仕様書を全ファイル取得します
- get_diff_patch: OpenAPIのパッチファイルを取得します

# 重要な注意事項
- agent_name フィールドには、上記のリストにある正確なエージェント名（例: latency_gremlin_agent, header_hacker_agent など）を使用してください
- 他の名前（StaticAnalysisAgent、UnitTestAgent など）は使用しないでください
- 必ず上記リストから選択してください
""")
def analyze_patch_and_select_agents(api_name: str) -> AgentSelection:
    pass  # LLM に委任
```

冒頭で宣言している `StructuredToolCallAgent` クラスはざっくり言えば LLM の wrapper クラスになります。[^7]

下記は一番ベーシックな `Agent` クラスのプロパティ一覧ですが、今回使用した `tools` プロパティ以外にも色々なことができるみたいですね。

```python
# ClaudeCodeに独自にまとめてもらいました
agent = Agent(
    # 必須パラメータ
    role: str,                              # エージェントの役割

    # 基本設定
    name: Optional[str] = None,             # エージェント名（デフォルト: role）
    goal: Optional[str] = "Help humans",    # エージェントの目標
    instructions: Optional[List[str]] = None,  # エージェントへの指示リスト
    tools: Optional[List[AgentTool]] = [],  # 使用可能なツールのリスト

    # パターン選択
    pattern: str = "toolcalling",           # エージェントパターン(ReAct形式なども指定可能)

    # LLMとメモリ
    llm: Optional[LLMClientBase] = None,    # LLMクライアント
    memory: Optional[MemoryBase] = None,    # メモリ実装

    # プロンプト設定
    system_prompt: Optional[str] = None,    # カスタムシステムプロンプト
    prompt_template: Optional[PromptTemplateBase] = None,  # プロンプトテンプレート
    template_format: Literal["f-string", "jinja2"] = "jinja2",  # テンプレート形式

    # 動作制御
    max_iterations: int = 10,               # 最大イテレーション数
    verbose: bool = False,                  # 詳細ログ出力

    # メタデータ
    metadata: Dict = {},                    # 追加メタデータ

    # パターン固有パラメータ
    **kwargs                                # パターン固有の追加パラメータ
)
```

そして Dapr Agents は `@task` アノテーションによりプロンプトを指定できるようになっています。`description` にプレースホルダーを設定することで、メソッドの引数が自動で置換されるのは嬉しい仕組みです。また戻り値もメソッドの戻り値で宣言した型が勝手に強制されるようになっています(Agent クラスが未設定の場合)。

さて、「采配エージェント」に呼ばれて動く「テスト生成エージェント」はいわば個性豊かな参謀たちになります。

たとえば、「テスト生成エージェント: 正論しか言わない聖騎士」の実装を覗いてみましょう。

```python
@task(
    agent=test_generator_agent,
    description="""
🛡 **Sunny Path Paladin**: {api_name} の王道正常系テストを生成します。

API説明: {api_description}

テスト観点
  • 有効な入力と期待出力
  • CRUD 正常動作
  • 認証フロー正常シナリオ
  • ビジネスロジックの必須ハッピーケース

# ツール
- get_api_spec: OpenAPIの仕様書を全ファイル取得します
- get_diff_patch: OpenAPIのパッチファイルを取得します
""")
def sunny_path_paladin_tests(api_name: str,
                             api_description: str) -> TestPlan:
    pass  # LLM に委任
```

プロンプトより、API サーバーの正常系に関わるテストケースを専任で考えてくれることが分かります。

他にも様々な観点でテストケースを考えてくれる「テスト生成エージェント」がおり、裏で動いている生成 LLM は同じ OpenAPI なのですが、プロンプトでそのタスクに集中することで精度を上げることができます。

この辺は業務用サービスであれば、Anthropic が検索機能で取った High&Low 戦略のように、「采配エージェント」はコストが高い Agent を、各テスト生成エージェントはコストが安い Agent を使い分けられそうです。

「QA エージェント」は、「テスト生成エージェント」から出力された結果を取りまとめて、実行計画に落とす役割をします。

「QA エージェント」が呼び出される前後の処理を見てみましょう。

```python
# テスト生成エージェントの処理の待ち合わせ
test_plans = yield wf.when_all(agent_tasks)
# QAエージェントの実行
final_scenario = yield ctx.call_activity(agent_a_consolidate_tests,
	input={
	    "api_name": api_name,
	    "api_description": api_description,
	    "test_plans": test_plans,
	    "api_spec": api_spec,
	    "used_agents": used_agents_final,
	    "agent_selection_reasons": {pair.agent_name: pair.reason for pair in agent_pairs}
	})
```

注目すべきはテスト生成エージェントの処理を待ち合わせる `wf.when_all()` や AI エージェントを呼び出している `yield ctx.call_activity()`です。実はこれらのメソッドは Dapr Agents ではなく Dapr SDK に用意されているものです。AI Agent はその性質上、非同期処理、待ち合わせ処理を多用することになりますが、独自実装だと考慮事項が多く煩雑なそれを、Dapr のリソースを使ってうまく制御していることが理解できたかと思います。

このワークフローを実行すると最終的に下記のような E2E テストに必要な API のパラメーターを得ることができます。

```json
{
  "api_name": "Simple Inventory API",
  "api_description": "A simple service for managing inventory items, supporting create, list, update, and delete operations.",
  "test_summary": "A comprehensive test plan integrating happy path scenarios with robust payload handling.",
  "tests": [
    {
      "name": "Health Check Ping",
      "description": "Verify the health of the service API by getting a pong response.",
      "method": "GET",
      "endpoint": "/ping",
      "headers": {},
      "body": {},
      "expected_status": 200,
      "expected_response": {}
    },
    {
      "name": "List All Items",
      "description": "Retrieve the full list of items available in the inventory.",
      "method": "GET",
      "endpoint": "/items",
      "headers": {},
      "body": {},
      "expected_status": 200,
      "expected_response": {}
    },
     # 中略
  ],
  "execution_order": [
    "Health Check Ping",
    "List All Items",
	# 中略
  ],
  "metadata": {
    "used_agents": [
      "sunny_path_paladin_agent",
      "payload_juggler_agent"
    ],
    "agent_selection_reasons": {
      "payload_juggler_agent": "The addition of the 'readOnly' attribute for the 'id' property requires testing for invalid client inputs, such as attempts to set server-assigned properties, which this agent is designed to handle by manipulating payload structures."
    },
    "generated_at": "2025-06-24T22:36:37.873801",
    "workflow_type": "api_test_workflow"
  }
}
```

## 感想

Dapr Agents を通して、AI Agentic な時代のワークフローについて未来が少しでも感じ取れたのではないでしょうか。

Dapr Agents はデコレーターと Dapr の SDK を使用することで直感的に書けるのが非常に興味深いプロダクトでした。README.md を見る限り、これからも色々な機能が追加されるようなので、しばらくはエキサイティングな時間が続くと思います。

Dapr Agents 以外にもマルチエージェントを見越したフレームワークは数多く出ています。弊社の引き合いの多さで言えば Amazon Bedrock ですが、去年プレビューで[マルチエージェントコラボレーション機能](https://aws.amazon.com/jp/blogs/news/introducing-multi-agent-collaboration-capability-for-amazon-bedrock/)をリリースしています。これらの機能を使用する際にも生かせるノウハウになるでしょう。

以上、Dapr Agents の紹介記事でした。

::: note info
今回 Claude Code を使い倒してワークフローを実装しました。CLAUDE.md(いわゆる指示書)に `dapr run` (ワークフローを実行するコマンド)を書いてその結果を踏まえてバグってたら直してという ReAct 的な内容を書いていたら、勝手にコード修正&実行&リトライのループ作業を始めたので個人的には驚きで白目向きました。やっていること、もう人間と一緒じゃん。

`Agent` クラスや `@task` デコレーターの使い方はクイックスタート以上のことをしようとすると、実装内容を直接読み解く必要があったのですが、Claude Code はそんな時も刺さりました。具体的には使い方とオプションを全部 markdown に出力するようにお願いし、その結果を「Claude Code が」実装でも使いまわせるようにしたら、正確にコーディングしてくれるようになりました。開発ドキュメントが不足している過渡期だからこそ必要とされるノウハウではありますが、確実に LLM にインデックスされていないフレームワークを使用するケースでも十分役に立つことがわかりました。

「Claude Code」はいいぞ。
:::

[^1]: 「いい感じに」は言葉の綾であることに注意が必要です。「Claude Code」ユーザーの共通認識として、その言葉から想定されるより、ものすごく丁寧に細かくプロンプトで入力しないと思い通りに動かないよね、概要設計や方針は事前に細かく明文化しないとだめだねっていうことが経験値的にわかってきました。
[^2]: あえて本文には書きませんでしたがマルチエージェントシステムにおける一番の問題はコストです。上記の Anthropic の事例紹介でも、単一エージェントと比較してトークン(コストにあたるもの)を 15 倍消費するので、バリューを発揮する検索システムでしか採用できなかったという身もふたもない話が書かれていました。
[^3]: [Building Effective Dapr Agents](https://www.diagrid.io/blog/building-effective-dapr-agents)
[^4]: [Consistently, the most successful implementations use simple, composable patterns rather than complex frameworks.](https://www.anthropic.com/engineering/building-effective-agents)
[^5]: [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
[^6]: [How we built our multi-agent research system](https://www.anthropic.com/engineering/built-multi-agent-research-system)
[^7]: Dapr Agents でシンプルに LLM を呼びたい場合は、 `@task` デコレーターで事足ります。戻り値の型も自動で設定されるようです。しかし、tools を使用できないので独自の `Agent` クラスを実装しました。ただし標準の AgentBase クラスでは OpenAI からのレスポンスを構造体で強制することができないので、独自に `StructuredToolCallAgent` を拡張実装しています。この辺、開発が進んで解決されると嬉しいですね。

## 参考: 最終的に作ったワークフロー

```python
#!/usr/bin/env python3
"""
オーケストレータ–ワーカー パターンのデモ:
1. 中央オーケストレータが動的にサブタスクを決定する
2. ワーカー LLM に動的タスクを委任する
3. 結果を統合して単一の最終結果を生成する

この処理では、
API Spec（OpenAPI YAML/JSON）及びパッチファイルを直接 input として渡すことで、
APIの実行テストケースを出力することができます。
"""

from pydantic import Field
from typing import List, Dict, Any, Optional, Union
from dapr_agents.types import UserMessage, AssistantMessage, ChatCompletion, AgentError
from dapr_agents.agent.patterns.toolcall.base import ToolCallAgent
import logging
import json
import asyncio
import dapr.ext.workflow as wf
from datetime import datetime

from typing import List, Dict, Any, Callable, Type
from enum import Enum

from dapr_agents.workflow import WorkflowApp, workflow, task
from dapr.ext.workflow import DaprWorkflowContext
from pydantic import BaseModel, Field, ConfigDict
from dotenv import load_dotenv
import yaml
from dapr_agents import tool, Agent

load_dotenv()

# ----------------------------------------
# テストプラン用モデル
# ----------------------------------------


class StrictDict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class TestCase(BaseModel):
    """単一テストケースを表す。"""
    name: str = Field(..., description="テストケース名")
    description: str = Field(..., description="このテストケースで検証する内容")
    method: str = Field(..., description="HTTP メソッド (GET, POST, など)")
    endpoint: str = Field(..., description="テスト対象 API エンドポイント")
    headers: StrictDict = Field(
        default_factory=StrictDict, description="送信する HTTP ヘッダ")
    body:    StrictDict = Field(
        default_factory=StrictDict, description="リクエストボディ (POST/PUT)")
    expected_status: int = Field(..., description="期待 HTTP ステータスコード")
    expected_response: StrictDict = Field(
        default_factory=StrictDict, description="期待レスポンス構造／内容")


class TestPlan(BaseModel):
    """テストケース集合（プラン）"""
    title: str
    description: str
    test_cases: List[TestCase]


class APITestScenarioBase(BaseModel):
    """統合した API テストシナリオ（メタデータなし）"""
    api_name: str
    api_description: str
    test_summary: str
    tests: List[TestCase]           # ←単一リストで統一
    execution_order: List[str]


class APITestScenario(APITestScenarioBase):
    """最終的な API テストシナリオ（メタデータ付き）"""
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="メタデータ（使用エージェント情報など）")

# ----------------------------------------
# エージェント選択用モデル
# ----------------------------------------


class AgentReasonPair(BaseModel):
    """エージェントとその選択理由のペア"""
    agent_name: str = Field(..., description="エージェント名")
    reason: str = Field(..., description="このエージェントを選択した理由")


class AgentSelection(BaseModel):
    """選択されたエージェントとその理由"""
    agent_pairs: List[AgentReasonPair] = Field(
        ..., description="選択されたエージェントとその理由のリスト")

# ----------------------------------------
# エージェント定義
# ----------------------------------------


class TestAgent(Enum):
    """利用可能なテストエージェントの定義"""
    SUNNY_PATH_PALADIN = "sunny_path_paladin_agent"
    LATENCY_GREMLIN = "latency_gremlin_agent"
    HEADER_HACKER = "header_hacker_agent"
    PAYLOAD_JUGGLER = "payload_juggler_agent"
    RATE_LIMIT_REBEL = "rate_limit_rebel_agent"
    AUTH_AMNESIAC = "auth_amnesiac_agent"
    CHAOS_CARTOGRAPHER = "chaos_cartographer_agent"
    VERSION_TIME_TRAVELER = "version_time_traveler_agent"
    CIRCUIT_BREAKER_BULLY = "circuit_breaker_bully_agent"
    DATA_LEECH = "data_leech_agent"
    CHAOS_CONDUCTOR = "chaos_conductor_agent"


# エージェントレジストリ（後で関数定義後に設定）
AGENT_REGISTRY: Dict[TestAgent, Callable] = {}

# ----------------------------------------
# ツール定義
# ----------------------------------------


class GetApiSpecSchema(BaseModel):
    """API仕様ファイル取得用のスキーマ"""
    file_path: str = Field(description="読み込むAPI仕様ファイルのパス",
                           default="api_spec.yaml")


@tool(args_model=GetApiSpecSchema)
def get_api_spec(file_path: str = "api_spec.yaml") -> Dict[str, Any]:
    """
    API仕様ファイル（OpenAPI YAML/JSON）を読み込んで返す。

    Args:
        file_path: API仕様ファイルのパス（デフォルト: api_spec.yaml）

    Returns:
        API仕様のディクショナリ形式
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            if file_path.endswith(".yaml") or file_path.endswith(".yml"):
                return yaml.safe_load(f)
            elif file_path.endswith(".json"):
                return json.load(f)
            else:
                raise ValueError(f"Unsupported file format: {file_path}")
    except Exception as e:
        logging.error(f"Failed to load API spec from {file_path}: {e}")
        return {}


class GetDiffPatchSchema(BaseModel):
    """差分パッチファイル取得用のスキーマ"""
    file_path: str = Field(description="読み込む差分パッチファイルのパス",
                           default="api_spec.patch")


@tool(args_model=GetDiffPatchSchema)
def get_diff_patch(file_path: str = "api_spec.patch") -> str:
    """
    差分パッチファイルを読み込んで返す。

    Args:
        file_path: 差分パッチファイルのパス（デフォルト: api_spec.patch）

    Returns:
        差分パッチの内容（文字列）
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        logging.error(f"Failed to load diff patch from {file_path}: {e}")
        return ""

# ----------------------------------------
# ヘルパー関数
# ----------------------------------------


def get_agent_list_description() -> str:
    """エージェントリストの説明を生成"""
    descriptions = {
        TestAgent.LATENCY_GREMLIN: "レイテンシ注入／タイムアウト境界",
        TestAgent.HEADER_HACKER: "ヘッダー改ざん・CORS／CSRF 系",
        TestAgent.PAYLOAD_JUGGLER: "ボディ構造破壊・巨大／欠落／型不一致",
        TestAgent.RATE_LIMIT_REBEL: "高負荷・スロットリング突破",
        TestAgent.AUTH_AMNESIAC: "認証・認可エラー／トークン誤用",
        TestAgent.CHAOS_CARTOGRAPHER: "パス・クエリ探索／ページネーション境界",
        TestAgent.VERSION_TIME_TRAVELER: "前方・後方互換／バージョン切替",
        TestAgent.CIRCUIT_BREAKER_BULLY: "依存サービス停止・フォールバック検証",
        TestAgent.DATA_LEECH: "情報漏えい／PII チェック",
    }

    agent_list = []
    for agent in TestAgent:
        if agent != TestAgent.SUNNY_PATH_PALADIN and agent != TestAgent.CHAOS_CONDUCTOR:
            desc = descriptions.get(agent, "")
            agent_list.append(f"- {agent.value:<30} # {desc}")

    return "\n".join(agent_list)


# ----------------------------------------
# カスタムエージェントクラスの定義
# ----------------------------------------


logger = logging.getLogger(__name__)


class StructuredToolCallAgent(ToolCallAgent):
    """
    ツール呼び出しと構造化出力の両方をサポートするエージェント。
    """

    response_format: Optional[Any] = Field(
        default=None, description="構造化出力のためのPydanticモデル")

    async def process_iterations(self, messages: List[Dict[str, Any]]) -> Any:
        """
        構造化出力に対応したプロセス反復処理。
        ツールと構造化出力の両方をサポート。
        """
        for iteration in range(self.max_iterations):
            logger.info(
                f"Iteration {iteration + 1}/{self.max_iterations} started.")

            messages += self.tool_history

            try:
                # ツールがある場合は、まずツール呼び出しを処理
                if self.tools and iteration < self.max_iterations - 1:
                    # ツール呼び出しのためのパラメータ
                    tool_params = {
                        "messages": messages,
                        "tools": self.tools,
                        "tool_choice": self.tool_choice,
                    }

                    response = self.llm.generate(**tool_params)

                    if isinstance(response, ChatCompletion):
                        response_message = response.get_message()
                        self.text_formatter.print_message(response_message)

                        if response.get_reason() == "tool_calls":
                            self.tool_history.append(response_message)
                            await self.process_response(response.get_tool_calls())
                            continue  # 次のイテレーションでツールの結果を処理

                # 最後のイテレーションまたはツールがない場合、構造化出力を生成
                if self.response_format:
                    # 構造化出力のためのパラメータ（ツールなし）
                    structured_params = {
                        "messages": messages + self.tool_history,
                        "response_format": self.response_format,
                        "structured_mode": "json"
                    }

                    response = self.llm.generate(**structured_params)

                    # 構造化出力の場合は直接返す
                    if not isinstance(response, ChatCompletion):
                        return response
                    else:
                        # ChatCompletionの場合はコンテンツを返す
                        content = response.get_content()
                        self.memory.add_message(AssistantMessage(content))
                        self.tool_history.clear()
                        return content
                else:
                    # 構造化出力なしの通常処理
                    params = {
                        "messages": messages,
                        "tools": self.tools if self.tools else None,
                        "tool_choice": self.tool_choice if self.tools else None,
                    }
                    params = {k: v for k, v in params.items() if v is not None}

                    response = self.llm.generate(**params)
                    response_message = response.get_message()
                    self.text_formatter.print_message(response_message)

                    if response.get_reason() == "tool_calls":
                        self.tool_history.append(response_message)
                        await self.process_response(response.get_tool_calls())
                    else:
                        content = response.get_content()
                        self.memory.add_message(AssistantMessage(content))
                        self.tool_history.clear()
                        return content

            except Exception as e:
                logger.error(f"Error during chat generation: {e}")
                raise AgentError(f"Failed during chat generation: {e}") from e

        # 最大イテレーションに達した場合、構造化出力を試みる
        if self.response_format:
            try:
                structured_params = {
                    "messages": messages + self.tool_history,
                    "response_format": self.response_format,
                    "structured_mode": "json"
                }
                response = self.llm.generate(**structured_params)
                if not isinstance(response, ChatCompletion):
                    return response
                else:
                    return response.get_content()
            except Exception as e:
                logger.error(f"Failed to generate structured output: {e}")
                raise

        logger.info("Max iterations reached. Agent has stopped.")

# ----------------------------------------
# エージェントの定義
# ----------------------------------------


# 統一されたテスト生成エージェント（構造化出力をサポート）
test_generator_agent = StructuredToolCallAgent(
    response_format=TestPlan,
    role="Test Case Generator",
    verbose=True
)

# パッチアナライザーエージェント（構造化出力とツールをサポート）
patch_analyzer_agent = StructuredToolCallAgent(
    response_format=AgentSelection,
    role="API Patch Analysis Expert",
    tools=[get_api_spec, get_diff_patch],
    verbose=True
)

# 統合エージェント（構造化出力をサポート）
consolidate_agent = StructuredToolCallAgent(
    response_format=APITestScenarioBase,
    role="Test Scenario Consolidator",
    verbose=True
)

# ----------------------------------------
# パッチアナライザータスクの定義
# ----------------------------------------

# エージェントリストの説明を事前に生成
_AGENT_LIST_DESC = get_agent_list_description()

# 新しいパッチアナライザータスク（@task風）


@task(
    agent=patch_analyzer_agent,
    description=f"""
パッチアナライザーエージェント: OpenAPI仕様の差分パッチを詳細にCoTで分析し、どのテストエージェントを使用すべきか決定してください。

# 分析手順
1. diff_patchをapi_specに適用した後、どのエンドポイント・スキーマ・セキュリティ要件等がどのように変更されたかをstep-by-stepで一覧にしてください。
2. それぞれの変更点ごとに「どのテスト観点（正常系/異常系/認証/CRUD/エラー系など）」が影響を受けるかを具体的にリストアップしてください。
3. 利用可能なエージェント(下記リスト)の説明を参照し、各観点に最も適切なエージェントを理由付きで選定してください。
4. 各エージェントの選択理由は、「どの差分がどのテスト観点に影響し、なぜそのエージェントが必要か」を必ず明示してください。
5. 理由は英語で書いてください。

# 利用可能なエージェント
{_AGENT_LIST_DESC}

# ツール
- get_api_spec: OpenAPIの仕様書を全ファイル取得します
- get_diff_patch: OpenAPIのパッチファイルを取得します

# 重要な注意事項
- agent_name フィールドには、上記のリストにある正確なエージェント名（例: latency_gremlin_agent, header_hacker_agent など）を使用してください
- 他の名前（StaticAnalysisAgent、UnitTestAgent など）は使用しないでください
- 必ず上記リストから選択してください
""")
def analyze_patch_and_select_agents(api_name: str) -> AgentSelection:
    pass  # LLM に委任

# ----------------------------------------
# ワークフロー定義
# ----------------------------------------


@workflow(name="api_test_workflow")
def api_test_workflow(ctx: DaprWorkflowContext, input_params: dict):
    api_name = input_params.get("api_name")
    api_description = input_params.get("api_description")

    logging.info(f"\n=== WORKFLOW START: {api_name.upper()} のテスト生成 ===")

    # --- Step 1: Diffパッチを分析してエージェントを選択（新しい@taskスタイル） ---

    # 新しいタスクを使用してエージェントを実行
    agent_selection_result = yield ctx.call_activity(
        analyze_patch_and_select_agents,
        input={
            "api_name": api_name
        }
    )

    # エラーハンドリング（AgentSelectionオブジェクトが返ってこない場合）
    if not isinstance(agent_selection_result, AgentSelection):
        try:
            # 辞書の場合は変換を試みる
            agent_selection_result = AgentSelection(**agent_selection_result)
        except Exception as e:
            logging.error(f"Error converting agent selection result: {e}")
            # エラー時のフォールバック
            agent_selection_result = AgentSelection(agent_pairs=[
                AgentReasonPair(agent_name=TestAgent.HEADER_HACKER.value,
                                reason="Error fallback selection"),
            ])

    # agent_selection_resultはAgentSelectionオブジェクト
    agent_pairs = agent_selection_result.agent_pairs
    selected_agents = [pair.agent_name for pair in agent_pairs]

    logging.info(f"選択されたエージェント: {selected_agents}")
    for pair in agent_pairs:
        logging.info(f"  - {pair.agent_name}: {pair.reason}")

    # --- Step 2: 選択されたエージェントに基づいて動的にタスクを生成 ---
    agent_tasks = []
    used_agents_final = []  # 実際に使用したエージェントを追跡

    # 基本エージェント（正常系は常に実行）
    agent_tasks.append(
        ctx.call_activity(sunny_path_paladin_tests,
                          input={"api_name": api_name, "api_description": api_description})
    )
    used_agents_final.append(TestAgent.SUNNY_PATH_PALADIN.value)

    # エージェント名をEnumにマッピング
    agent_name_map = {agent.value: agent for agent in TestAgent}

    # 選択されたエージェントに基づいて動的に追加のエージェントを実行
    for agent_name in selected_agents:
        if agent_name in agent_name_map:
            agent_enum = agent_name_map[agent_name]
            if agent_enum in AGENT_REGISTRY and agent_enum != TestAgent.SUNNY_PATH_PALADIN:
                agent_func = AGENT_REGISTRY[agent_enum]
                agent_tasks.append(
                    ctx.call_activity(agent_func,
                                      input={"api_name": api_name, "api_description": api_description})
                )
                used_agents_final.append(agent_name)

    logging.info("テスト生成エージェントを待機中...")
    test_plans = yield wf.when_all(agent_tasks)   # List[TestPlan]
    logging.info("すべてのテストプラン生成完了")

    # --- Step 3: 統合タスク: List[TestPlan] を統合シナリオ化 (メタデータなし) ---
    final_scenario = yield ctx.call_activity(agent_a_consolidate_tests,
                                             input={
                                                 "api_name": api_name,
                                                 "api_description": api_description,
                                                 "test_plans": test_plans,
                                                 "used_agents": used_agents_final,  # 実際に使用したエージェントのリスト
                                                 # 選択理由
                                                 "agent_selection_reasons": {pair.agent_name: pair.reason for pair in agent_pairs}
                                             })

    # --- Step 3.5: ワークフローでメタデータを追加 ---
    # agent_a_consolidate_testsの結果（APITestScenarioBase）を辞書形式に変換
    if hasattr(final_scenario, "dict"):
        scenario_dict = final_scenario.dict()
    else:
        scenario_dict = final_scenario

    # メタデータ情報を作成
    metadata_info = {
        "used_agents": used_agents_final,
        "agent_selection_reasons": {pair.agent_name: pair.reason for pair in agent_pairs},
        "generated_at": datetime.now().isoformat(),
        "workflow_type": "api_test_workflow"
    }

    # metadataフィールドに情報を追加
    scenario_dict["metadata"] = metadata_info

    # APITestScenarioモデル（メタデータ付き）に再変換
    final_scenario_with_metadata = APITestScenario(**scenario_dict)

    # --- Step 4: 結果をファイルに保存 ---
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_filename = f"test_scenario_{api_name.replace(' ', '_')}_{timestamp}.json"

    # 整形して保存
    try:
        with open(output_filename, "w", encoding="utf-8") as f:
            if hasattr(final_scenario_with_metadata, "model_dump"):
                scenario_dict = final_scenario_with_metadata.model_dump()
            elif hasattr(final_scenario_with_metadata, "dict"):
                scenario_dict = final_scenario_with_metadata.dict()
            else:
                scenario_dict = final_scenario_with_metadata

            json.dump(scenario_dict, f, ensure_ascii=False, indent=2)
        logging.info(f"テストシナリオを保存しました: {output_filename}")
    except Exception as e:
        logging.error(f"ファイル保存エラー: {e}")

    logging.info("=== WORKFLOW 完了 ===")
    return final_scenario_with_metadata

# ----------------------------------------
# タスク定義
# ----------------------------------------

# 1. Sunny Path Paladin — normal flow validator


@task(
    agent=test_generator_agent,
    description="""
🛡 **Sunny Path Paladin**: {api_name} の王道正常系テストを生成します。

API説明: {api_description}

テスト観点
  • 有効な入力と期待出力
  • CRUD 正常動作
  • 認証フロー正常シナリオ
  • ビジネスロジックの必須ハッピーケース

# ツール
- get_api_spec: OpenAPIの仕様書を全ファイル取得します
- get_diff_patch: OpenAPIのパッチファイルを取得します
""")
def sunny_path_paladin_tests(api_name: str,
                             api_description: str) -> TestPlan:
    pass  # LLM に委任


# 2. Latency Gremlin — delay injector
@task(
    agent=test_generator_agent,
    description="""
🦥 **Latency Gremlin**: {api_name} のレスポンス遅延耐性を調べます。
API説明: {api_description}

テスト観点
  • ランダム遅延 (10 ms–10 s) 注入
  • 階段状に遅延を増幅させる（パーセンタイル別）
  • クライアント側 / サーバ側タイムアウト境界の特定
  • Keep‑Alive／コネクションプールの影響

# ツール
- get_api_spec: OpenAPIの仕様書を全ファイル取得します
- get_diff_patch: OpenAPIのパッチファイルを取得します
""")
def latency_gremlin_tests(api_name: str,
                          api_description: str) -> TestPlan:
    pass


# 3. Header Hacker — header mutation specialist
@task(
    agent=test_generator_agent,
    description="""
🛠 **Header Hacker**: {api_name} へあらゆるヘッダー改ざんを行います。

API説明: {api_description}

テスト観点
  • Content‑Type / Accept をランダム化・矛盾させる
  • Authorization 欄を欠落／破損／サイズ膨張させる
  • 重複ヘッダー・大文字小文字揺らぎ・CRLF インジェクション
  • 不正 CORS ヘッダーでブラウザ経由 CSRF を再現

# ツール
- get_api_spec: OpenAPIの仕様書を全ファイル取得します
- get_diff_patch: OpenAPIのパッチファイルを取得します
""")
def header_hacker_tests(api_name: str,
                        api_description: str) -> TestPlan:
    pass


# 4. Payload Juggler — body chaos artist
@task(
    agent=test_generator_agent,
    description="""
🎪 **Payload Juggler**: {api_name} のボディ構造を撹乱します。
API説明: {api_description}

テスト観点
  • 必須フィールド欠落・追加フィールド混入
  • 極端なサイズ（0 B／10 MB 以上）の JSON・XML
  • 型不一致（数値↔文字列、配列↔オブジェクト）
  • Base64／gzip／multipart など異種エンコード

# ツール
- get_api_spec: OpenAPIの仕様書を全ファイル取得します
- get_diff_patch: OpenAPIのパッチファイルを取得します
""")
def payload_juggler_tests(api_name: str,
                          api_description: str) -> TestPlan:
    pass


# 5. Rate‑Limit Rebel — throttling breaker
@task(
    agent=test_generator_agent,
    description="""
🚀 **Rate‑Limit Rebel**: {api_name} のスロットリング境界を突破します。
API説明: {api_description}

テスト観点
  • RPS バースト (10→1000) と持続高負荷
  • ユーザ別／IP 別／トークン別に同時攻撃
  • HTTP 429 と Retry‑After の整合性
  • グローバル制限と per‑method 制限の相互作用

# ツール
- get_api_spec: OpenAPIの仕様書を全ファイル取得します
- get_diff_patch: OpenAPIのパッチファイルを取得します
""")
def rate_limit_rebel_tests(api_name: str,
                           api_description: str) -> TestPlan:
    pass


# 6. Auth Amnesiac — authentication forgetter
@task(
    agent=test_generator_agent,
    description="""
🔑 **Auth Amnesiac**: {api_name} の認証・認可を忘れっぽくテストします。
API説明: {api_description}

テスト観点
  • 有効期限切れ／偽造／スコープ不足のトークン
  • refresh token 連打によるセッション固定
  • 認証方式切替 (JWT ↔ Basic ↔ mTLS) の誤用
  • 多段プロキシ時の X‑Forwarded-* 改ざん

# ツール
- get_api_spec: OpenAPIの仕様書を全ファイル取得します
- get_diff_patch: OpenAPIのパッチファイルを取得します
""")
def auth_amnesiac_tests(api_name: str,
                        api_description: str) -> TestPlan:
    pass


# 7. Chaos Cartographer — path & query explorer
@task(
    agent=test_generator_agent,
    description="""
🗺 **Chaos Cartographer**: {api_name} のパス・クエリ空間を探索します。
API説明: {api_description}

テスト観点
  • スキーマ外エンドポイントを合成し 404/405 を収集
  • ページネーション (limit, offset, cursor) 境界値および空ページ
  • 組合せ爆発 (path param × query × header) で振る舞い差分を計測
  • 空リスト・最終ページ・高速スクロール時の一貫性

# ツール
- get_api_spec: OpenAPIの仕様書を全ファイル取得します
- get_diff_patch: OpenAPIのパッチファイルを取得します
""")
def chaos_cartographer_tests(api_name: str,
                             api_description: str) -> TestPlan:
    pass


# 8. Version Time‑Traveler — compatibility examiner
@task(
    agent=test_generator_agent,
    description="""
⏲ **Version Time‑Traveler**: {api_name} の前方・後方互換を検証します。
API説明: {api_description}

テスト観点
  • Accept‑Version / X‑API‑Version を旧版・未来版に切替
  • Deprecation Header や Sunset Policy の遵守
  • スキーマ移行中フィールドの default/nullable 挙動
  • β/preview タグ付きエンドポイントの安定性

# ツール
- get_api_spec: OpenAPIの仕様書を全ファイル取得します
- get_diff_patch: OpenAPIのパッチファイルを取得します
""")
def version_time_traveler_tests(api_name: str,
                                api_description: str) -> TestPlan:
    pass


# 9. Circuit‑Breaker Bully — dependency saboteur
@task(
    agent=test_generator_agent,
    description="""
⚡ **Circuit‑Breaker Bully**: {api_name} が依存する外部サービスを疑似停止させます。
API説明: {api_description}

テスト観点
  • DB／メッセージブローカ／3rd‑party API のダウンを模倣
  • 半開→再閉ループ時のフォールバック挙動
  • スロースタート・ヒステリシス(感度調整)設定値の検証
  • フェイルファスト vs 再試行バックオフを比較

# ツール
- get_api_spec: OpenAPIの仕様書を全ファイル取得します
- get_diff_patch: OpenAPIのパッチファイルを取得します
""")
def circuit_breaker_bully_tests(api_name: str,
                                api_description: str) -> TestPlan:
    pass


# 10. Data Leech — information leak hunter
@task(
    agent=test_generator_agent,
    description="""
🩸 **Data Leech**: {api_name} からの情報漏えいを吸い上げます。
API説明: {api_description}

テスト観点
  • 詳細エラー／スタックトレースに PII が混入しないか
  • クエリ文字列／ログ／メトリクスの不適切なマスキング
  • GraphQL↔REST/Batch API 周りでの over‑fetch / under‑fetch
  • JSON スキーマ違反での fallback 値に秘密情報が漏れないか

# ツール
- get_api_spec: OpenAPIの仕様書を全ファイル取得します
- get_diff_patch: OpenAPIのパッチファイルを取得します
""")
def data_leech_tests(api_name: str,
                     api_description: str) -> TestPlan:
    pass


# 11. Chaos Conductor — orchestrator of trouble
@task(
    agent=test_generator_agent,
    description="""
🎻 **Chaos Conductor**: 上記エージェントをオーケストレーションし複合障害を生成します。
API説明: {api_description}

テスト観点
  • 遅延＋ヘッダ改ざん＋高負荷など同時多発障害
  • 時系列シナリオ (障害→回復→再障害) を生成
  • SLO 逸脱率をメトリクス化し JSON レポートへ整形

# ツール
- get_api_spec: OpenAPIの仕様書を全ファイル取得します
- get_diff_patch: OpenAPIのパッチファイルを取得します
""")
def chaos_conductor_plan(api_name: str,
                         api_description: str) -> TestPlan:
    pass


@task(
    agent=consolidate_agent,
    description="""
リードエージェント: 複数のテストプランを統合し、実行順序を含む包括的な
API テストシナリオを作成してください ({api_name})。
API説明: {api_description}

手順:
1. 重複テストを排除
2. 認証 → CRUD → エラー の順で並べ替え
3. 重要エンドポイントが抜けていないか確認

# 統合するテストプラン
{test_plans}

# 注意事項
- used_agents: {used_agents} (メタデータ用、統合処理では使用しない)
- agent_selection_reasons: {agent_selection_reasons} (メタデータ用、統合処理では使用しない)
""")
def agent_a_consolidate_tests(api_name: str, api_description: str,
                              test_plans: List[TestPlan],
                              used_agents: List[str] = None,
                              agent_selection_reasons: Dict[str, str] = None) -> APITestScenarioBase:
    # テストケースを全て統合・重複除去・整列など
    # 注意: used_agents と agent_selection_reasons は統合処理では使用せず、
    # ワークフロー側でメタデータ追加時に使用される
    # LLMに委任した結果を返す
    pass  # LLM に委任


# ----------------------------------------
# エージェントレジストリの設定
# ----------------------------------------
AGENT_REGISTRY.update({
    TestAgent.SUNNY_PATH_PALADIN: sunny_path_paladin_tests,
    TestAgent.LATENCY_GREMLIN: latency_gremlin_tests,
    TestAgent.HEADER_HACKER: header_hacker_tests,
    TestAgent.PAYLOAD_JUGGLER: payload_juggler_tests,
    TestAgent.RATE_LIMIT_REBEL: rate_limit_rebel_tests,
    TestAgent.AUTH_AMNESIAC: auth_amnesiac_tests,
    TestAgent.CHAOS_CARTOGRAPHER: chaos_cartographer_tests,
    TestAgent.VERSION_TIME_TRAVELER: version_time_traveler_tests,
    TestAgent.CIRCUIT_BREAKER_BULLY: circuit_breaker_bully_tests,
    TestAgent.DATA_LEECH: data_leech_tests,
    TestAgent.CHAOS_CONDUCTOR: chaos_conductor_plan,
})

# ----------------------------------------
# エントリポイント
# ----------------------------------------


async def main():
    load_dotenv()
    logging.basicConfig(level=logging.INFO)

    wfapp = WorkflowApp(timeout=600)

    # OpenAPI 読み込み（ツールも使えるが、ここでは直接読み込む）
    with open("api_spec.yaml", encoding="utf-8") as fp:
        api_spec = yaml.safe_load(fp)

    api_name = api_spec["info"]["title"]
    api_desc = api_spec["info"].get("description", "")

    print("\n=== API TEST WORKFLOW デモ ===")
    print(f"対象 API: {api_name}")
    print("ステップ:")
    print(" 1. Diffパッチ分析 (Agent クラス使用)")
    print(" 2. 動的エージェント選択")
    print(" 3. 選択されたエージェントによる追加テスト生成")
    print(" 4. 統合 & 実行順序決定")

    result = await wfapp.run_and_monitor_workflow_async(
        api_test_workflow,
        input={
            "api_name": api_name,
            "api_description": api_desc
        }
    )

    if result:
        print("\n=== 最終テストシナリオ ===")

        # 結果の整形
        if hasattr(result, "dict"):
            scenario_dict = result.dict()
        else:
            scenario_dict = result

        # コンソール表示
        formatted_json = json.dumps(
            scenario_dict, ensure_ascii=False, indent=2)
        print(formatted_json)

    # Daprプロセスを明示的に終了
    print("\n=== ワークフロー完了 ===")
    import sys
    sys.exit(0)

if __name__ == "__main__":
    asyncio.run(main())
```

---
title: "GitLabのレビューにPR-Agentを組み込んでみた"
date: 2025/04/17 00:00:00
postid: a
tag:
  - GitLab
  - 生成AI
  - GitLab
  - コードレビュー
category:
  - DevOps
thumbnail: /images/2025/20250417a/thumbnail.png
author: 髙橋遼
lede: "フューチャーでは、Gitホスティング環境として、SaaSとしてのGitHubだけでなく、社内開発基盤運用チームが構築・運用している、オンプレミス版のGitLabも利用可能となっています。"
---
# はじめに

こんにちは。フューチャーの社内セキュリティ部門、SATの髙橋です。

フューチャーでは、Gitホスティング環境として、SaaSとしてのGitHubだけでなく、社内開発基盤運用チームが構築・運用している、オンプレミス版のGitLabも利用可能となっています。

私が所属するSATでは、後者のGitLabを用いて開発しています。

近頃の社内では、「[Gemini、社内利用スタート！](/articles/20250311a/)」といった記事に代表されるように、AI業務利活用の動きが本格化しています。

SATでも、主にセキュリティの観点から、次々に出てくるAIサービスについて継続的に検証を進めています。そうした日々の中、開発も並行して行っていると、**GitLabでも、GitHub Copilotのように、AIによるコードレビューの自動化を実現したい！** というモチベーションが湧くようになりました。

いろいろと探していたところ、[PR-Agent](https://github.com/qodo-ai/pr-agent)というOSSに出会いました。

この記事では、GitLabに組み込んでみた実例を元に、PR-Agentでできることを紹介したいと思います。

::: note info
GitLabの公式AIソリューションとしては、[GitLab Duo](https://about.gitlab.com/ja-jp/gitlab-duo/)が既にエンタープライズ向けに提供されています。

[参考:GitLab Duoエンタープライズを提供開始](https://about.gitlab.com/ja-jp/blog/2024/09/03/gitlab-duo-enterprise-is-now-available/)

**本記事執筆時点（2025年4月）** においては、前述の社内環境内ではまだ利用できません。
:::

# PR-Agentとは

PR-Agentは、大規模言語モデル(LLM)を活用してPull Requestに関連する様々なタスクを自動化・強化するために設計されたオープンソース**ツール**です。

Qodo(旧CodiumAI)によって開発が進められており、Apache 2.0ライセンスの下で公開されています。OSSの信頼性を判断する指標の1つであるGitHubでのスター数は`7.6k`（本記事執筆時点）と、一定の評価を得ていると言えるでしょう。

なお、PR-Agentをベースにより機能が豊富な[Qodo Merge](https://qodo-merge-docs.qodo.ai/overview/pr_agent_pro/)というマネージドサービスもありますが、本記事での紹介は割愛します。

最大の特徴は、**Pull Requestを基にしたレビュー関連機能の提供に特化している**点にあります。LLMへの対応状況は、[こちら](https://github.com/qodo-ai/pr-agent/blob/main/pr_agent/algo/__init__.py)で確認できますが、Geminiを始め、代表的なLLMは利用可能となっています。最近公開されたモデルも随時リストアップされていることから、新型モデルへの対応が迅速に行われていることが伺えます。

## PR-Agentとのやり取り

PR-Agentとのやり取りは、Pythonで実装されたCLIツール(後述)、またはPull Request上のコメントから以下のようなスラッシュコマンドを経由して行います。

::: note info
**以下の情報は、本記事執筆時点（2025年4月）のものです。**
:::

- Describe
  - slash_command: `/describe`
  - cli: `python -m pr_agent.cli --pr_url=<pr_url> describe`
    - AIがPRの内容を解析し、概要欄などを自動生成・更新します
- Review
  - slash_command: `/review`
  - cli: `python -m pr_agent.cli --pr_url=<pr_url> review`
    - PR内の修正について、AIによるレビューを実施し、フィードバックしてくれます
- Improve
  - slash_command: `/improve`
  - cli: `python -m pr_agent.cli --pr_url=<pr_url> improve`
    - PR内の実装について、改善案の提案を受けることができます
      - 設定によっては、Push毎の自動起動も可能です
- Ask
  - slash_command: `/ask`
  - cli: `python -m pr_agent.cli --pr_url=<pr_url> ask "your question"`
    - PRの内容について、質問を投げることができます
    - コード差分へのコメント経由で、該当行についてコンテキストを絞って質問することも可能です
- UpdateChangelog
  - slash_command: `/update_changelog`
  - cli: `python -m pr_agent.cli --pr_url=<pr_url> update_changelog`
    - PRの内容に基づいて、`CHANGELOG.md`を生成または更新します
- Help Docs
  - slash_command: `/help_docs "Your Question on docs"`
  - cli: `python -m pr_agent.cli --pr_url=<pr_url> help_docs`
    - リポジトリ内のドキュメント（デフォルトは`/docs`フォルダ、カスタマイズ可能）の内容について質問すると、AIが回答を生成します
- Help
  - slash_command: `/help`
  - cli: `N/A`
    - PR-Agentで利用可能な機能についての一覧を取得できます

# PR-Agent導入

PR-Agentの導入について紹介します。

基本的には[公式のドキュメント](https://qodo-merge-docs.qodo.ai/installation/)を見ながら進めればすぐに使い始められます。

GitLabへの導入の場合、大きく分けて次の２パターンでの構築が可能となっています。

- GitLab CI Pipelineへの導入
- GitLab webhook serverの構築

今回の検証では、GitLab webhook serverを構築し、Webhookを経由してPR-Agentを動作させる方法を選択しました。

こちらの手法を選ぶメリットは以下の通りです。

- 1つのWebhook Serverを、複数プロジェクトから呼び出すことが可能
- プロジェクトごとのCI Pipeline定義への修正しなくても済む
  - PR-Agentの挙動は、後述する設定ファイルによってリポジトリごとにカスタマイズ可能です

## GitLab Webhook Serverの構築

1. まずは、GitLab上で、操作対象のグループ、プロジェクトに対して「`Reporter`」ロールをもったユーザーを用意してください
2. 1.で用意したユーザーにおいて、`api`操作権限を与えた`Personal Access Token`を生成します
3. 任意のPython環境で、共有鍵を生成します (後の手順で使うため、メモしておいてください)

    ```sh
    SHARED_SECRET=$(python -c "import secrets; print(secrets.token_hex(10))")
    ```

4. [PR-Agentのリポジトリ](https://github.com/qodo-ai/pr-agent.git)をクローンします

    ```sh
    git clone https://github.com/qodo-ai/pr-agent.git
    ```

5. クローンしたリポジトリのルート直下に、以下のような`.env`ファイルを用意します

    ```toml
    # Config for gitlab
    CONFIG.GIT_PROVIDER=gitlab
    GITLAB.PERSONAL_ACCESS_TOKEN=<2.で生成したPAT>
    GITLAB.SHARED_SECRET=<3.で生成した共有鍵>

    # セルフホスト版GitLabを利用している場合、そのURLを記載します。
    # 初期値は "[https://gitlab.com](https://gitlab.com)" のため、SaaS版 (GitLab.com) を利用する場合は不要です。
    GITLAB.URL=<your_gitlab_url>

    # LLM API Key
    # モデル選択については、公式ドキュメント ( [https://qodo-merge-docs.qodo.ai/usage-guide/changing_a_model/](https://qodo-merge-docs.qodo.ai/usage-guide/changing_a_model/) ) を参照してください。
    # 以下はGeminiを利用する場合の例です。
    GOOGLE_AI_STUDIO.GEMINI_API_KEY=<your_token_here>
    ```

6. 以下のコマンドで、PR-AgentのWebhook用コンテナをビルドします

    ```sh
    docker build . -t gitlab_pr_agent --target gitlab_webhook -f docker/Dockerfile
    ```

7. ビルドしたコンテナは、任意のホスティング先で、GitLabからアクセス可能な状態にしておきます

これで GitLab Webhook Server側のセットアップは完了です。

次に、GitLab側のプロジェクトでWebhook設定します。

以下のイベントが発生した際にWebhookをトリガーし、先ほど公開したWebhookサーバーが受け取れるように設定します。

- push
- comment
- merge request events

## `.pr-agent.toml`(Configuration File)について

OSS版のPR-Agentの各種挙動は、対象リポジトリのデフォルトブランチのルートに`.pr-agent.toml`という設定ファイルをアップロードすることで制御が可能です。

マネージドサービスの`Qodo Merge`では、Gitリポジトリ内のWikiページを利用したり、組織全体で設定を一元管理が可能なようです。詳しくは公式ドキュメントを参照してください。
[Configuration File - Qodo Merge (and open-source PR-Agent)](https://qodo-merge-docs.qodo.ai/usage-guide/configuration_options/)

実際に利用中の設定例を紹介します。

```toml
# --*-- pr_agent configuration --*--
# see also: https://github.com/qodo-ai/pr-agent/blob/main/pr_agent/settings/configuration.toml
[config]
git_provider = "gitlab"

#ref: See Available Model list https://github.com/qodo-ai/pr-agent/blob/main/pr_agent/algo/__init__.py
model="gemini/gemini-2.0-flash"
fallback_models=["gemini/gemini-1.5-flash"]

[pr_reviewer] # /review #
extra_instructions = "Please use Japanese."

[pr_description] # /describe #
generate_ai_title=true
extra_instructions = "Please use Japanese."

[pr_code_suggestions] # /improve #
extra_instructions = "Please use Japanese."

[pr_add_docs] # /add_docs #
extra_instructions = "Please use Japanese."

[pr_update_changelog] # /update_changelog #
extra_instructions = "Please use Japanese."
```

以下、抜粋して説明します。

- `git_provider`は、`gitlab`を使うことを明示しています
- `model`,`fallback_model`で利用するLLMを指定しています
   プライマリとセカンダリといった感じで使うモデルを記載します
  - 基本は`"gemini/gemini-2.0-flash"`を用いる
  - フォールバック先として`""gemini/gemini-1.5-flash"`を呼び出す
- `generative_ai_title`
  - 有効にしていると、プルリクエストのタイトルを、AIによって自動生成してくれます
- `extra_instructions`
  - LLMに対して、追加のプロンプトを入れることができます
    ここでは、各種操作について日本語で回答をしてほしいという意味を込めたプロンプトを入れています

# 実際の動作イメージ

PR-Agentとのやり取りのイメージの実例をご紹介します。

今回は、以下のようなPythonの実装が含まれたブランチをPull Requestしたというストーリーを仮定します。

一見、何の変哲もない、パラメータの値を結合してprintするだけのものに見えますが、**文字列の結合の部分に、改善できる隙をわざと残しています。**

そこをPR-Agentが、レビューできるかを検証してみます。

```py main.py
def greeting(word):
    #指摘してほしいポイント: 文字列結合には f-string や .format() の方が推奨されること
    print("Hello," + word)
if __name__ == "__main__":
    greeting("World")
```

早速Pull Requestを出した直後が以下のイメージです。

<img src="/images/2025/20250417a/image.png" alt="" width="864" height="541" loading="lazy">

<img src="/images/2025/20250417a/image_2.png" alt="png" width="809" height="756" loading="lazy">

早速PR-Agentによるレビューがされていることがわかりますね。

これは、`.pr-agent.toml` 内の `pr_commands` で定義されたアクションが、新しいプルリクエストが開かれたことをトリガーとして自動実行されたためです。

[GitLabに対してのpr_commandsのデフォルトの挙動](https://github.com/qodo-ai/pr-agent/blob/bc3ef4763dd77c180094dd38b90fa0352f6e62b0/pr_agent/settings/configuration.toml#L273C1-L276C2)は、Pull Requestの説明(`/describe`)と、レビューサマリ(`/review`)、コード改善案(`/improve`)の3つが処理されていることがわかります。

**改善案では、見事、残しておいた隙を指摘してくれていますね！**

```ini configration.toml
pr_commands = [
    "/describe --pr_description.final_update_message=false",
    "/review",
    "/improve",
]
```

続いて、コメントから`/ask`で、今回のコードの概要を聞いてみました。

<img src="/images/2025/20250417a/image_3.png" alt="" width="340" height="57" loading="lazy">

回答がこちら。

<img src="/images/2025/20250417a/image_4.png" alt="" width="676" height="440" loading="lazy">

コード規模が大きくなってくるとまた結果が変わってくるとは思いますが、小さいコンテキストでは完璧ですね。

最後に、`/update_changelog`を実行した時のイメージを紹介します。

<img src="/images/2025/20250417a/image_5.png" alt="" width="627" height="230" loading="lazy">

オプション次第ではpushまで行ってくれるようなので、履歴管理が捗りそうです。

# さいごに

導入してみての所感は、Pull Request駆動のレビューに特化したOSSとして見れば、必要十分な機能が提供されているなという印象です。

より多機能なAIサービスは世の中にたくさんあると思いますが、実業務での導入には依然としてセキュリティ要件や費用面など課題がつきまといます。

その点、多様なLLMモデルに対応しつつ、オンプレミス環境にも比較的容易に構築できるPR-Agentは、有償サービスのような利便性とセキュリティ要件の両立を目指す場合に、有力な選択肢の1つになるでしょう。

今後は、プロジェクト固有のコーディングルールなどをPR-Agentに反映させ、より実務に即したレビューが出力されるよう、さらに活用を模索していきたいと思います。

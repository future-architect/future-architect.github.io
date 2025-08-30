---
title: "GitHub Actionsで利用できるGeminiを利用したPRレビュースクリプトを作ってみた。"
date: 2025/07/25 00:00:00
postid: a
tag:
  - Gemini
  - GitHub
  - Python
  - コードレビュー
category:
  - DevOps
thumbnail: /images/2025/20250725a/thumbnail.png
author:  片岡久人
lede: "GitHub Actionsを利用して、CI/CDパイプライン上で実行可能なPRのAIレビュー用スクリプトを紹介します。"
---

[AI Tips連載](/articles/20250707a/)の10日目の記事です。

# はじめに

製造エネルギー事業部の片岡です。

AIに関連する連載ということで、今回はプルリクエスト（PR）のAIレビュースクリプトについてご紹介します。

コードレビューはソフトウェア開発において品質を担保する上で不可欠なプロセスですが、手動でのレビューは時間と労力がかかります。近年、LLM（大規模言語モデル）の普及に伴い、AIを活用したコードレビューが注目されています。
本記事では、GitHub Actionsを利用して、CI/CDパイプライン上で実行可能なPRのAIレビュー用スクリプトを紹介します。

GitHub CopilotにもAIレビュー機能は実装されていますが、現状ではCI/CDパイプラインへの直接的な組み込みが難しく、コーディングガイドラインのカスタム機能も有料プラン（Enterprise）でしか利用できません。

チーム開発でAIレビューを本格的に活用するには、これらの点が課題となります。

- [Using GitHub Copilot code review - GitHub Docs](https://docs.github.com/ja/copilot/how-tos/agents/copilot-code-review/using-copilot-code-review)

このような課題を解決するため、GitHub ActionsでGeminiを動かし、CI/CDパイプライン上で実行可能なPRのAIレビュー用スクリプトをご紹介します。

# 前提

本記事では下記の記事を参考に、Github Actions＆VertexAIの構成を踏襲し、下記の記事では具体的に紹介されていなかった、**Github Actionsで実行する「Geminiにレビューを依頼し、レビュー結果をGithubのPRに反映する」スクリプトの部分について紹介します。**

- [GoogleのLLM「Gemini」でコードレビューをするGitHub Actionsを自力で構築してみた - NTT docomo Business Engineers' Blog](https://engineers.ntt.com/entry/202503-gemini-cicd-code-review/entry)

::: note info
Github ActionsのWorkflow定義やプロンプトの実装に関しては↑の記事を参照してください。
:::

# PRへのAIレビュースクリプト

早速ですが、Gemini APIとGitHub APIを連携させてPRに対してレビューをする実装の例を以下に示します。

```py
import json
import os
import sys

from github import Github, PullRequest
from google import genai

# --- プロンプトファイルのパス ---
# プロンプトファイルが格納されているディレクトリ
PROMPT_DIR = "<your_directory_name>" # ★あなたのディレクトリ名を記載してください。
REVIEW_PROMPT_FILE = os.path.join(PROMPT_DIR, "<your_prompt_file_name>") # ★あなたのプロンプトのファイル名を記載してください。



def load_prompt_from_file(filepath: str) -> str:
    """指定されたファイルパスからプロンプトを読み込む。"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        raise FileNotFoundError(f"プロンプトファイルが見つかりません: {filepath}")
    except Exception as e:
        raise IOError(f"プロンプトファイルの読み込み中にエラーが発生しました: {filepath} - {e}")

def get_pull_request(github_client: Github) -> PullRequest.PullRequest:
    """GitHub Actionsのコンテキストからプルリクエスト情報を取得する"""
    event_path = os.getenv('GITHUB_EVENT_PATH')
    if not event_path:
        raise ValueError("GITHUB_EVENT_PATH環境変数が設定されていません。")

    try:
        with open(event_path, 'r') as f:
            event = json.load(f)

        pull_request_number = event['pull_request']['number']
        repo_name = event['repository']['full_name']

        repo = github_client.get_repo(repo_name)
        return repo.get_pull(pull_request_number)

    except Exception as e:
        print(f"GitHub Actionsイベント情報の取得に失敗しました: {e}")
        raise

    # memo: ローカル実行用。get_pullのIDを変更して利用する。
    # repo = github_client.get_repo("<your-repository-name>")
    # # プルリクエストオブジェクトを取得
    # return repo.get_pull(1737)

def def run_summary_mode(pr: PullRequest.PullRequest, gemini_client: genai.Client,
    # 本記事では割愛

def run_review_mode(pr: PullRequest.PullRequest, gemini_client: genai.Client, prompt_template: str) -> None:
    """
    各ファイルのコード差分をGeminiでレビューし、コメントする。
    """
    for file in pr.get_files():
        if file.patch:
            print(f"  > ファイル {file.filename} をレビュー中...")
            try:
                # Geminiでレビューコメントを生成
                review_prompt = prompt_template.format(file_diff_placeholder=file.patch)
                response = gemini_client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=review_prompt,
                    config={"response_mime_type": "application/json"}
                )
                comments = json.loads(response.text)

                # GitHubにコメントを投稿
                if not comments:
                    print(f"ファイル {file.filename} に指摘事項はありませんでした。")
                    continue

                for comment_data in comments:
                    start_line = comment_data.get("start_line")
                    severity = comment_data.get("severity")
                    comment_text = comment_data.get("comment")
                    if start_line and comment_text:
                        pr.create_review_comment(
                            body=f"[{severity}] {comment_text}",
                            commit=pr.get_commits().reversed[0],
                            path=file.filename,
                            line=start_line
                        )
                        print(f"ファイル {file.filename} の行 {start_line} にコメントしました。")
                    else:
                        print(f"警告: Geminiからのレビューコメント形式が不正です: {comment_data}")

            except Exception as e:
                print(f"  > エラー: ファイル {file.filename} のレビュー中に問題が発生しました: {e}")
        else:
            print(f"  > ファイル {file.filename} に変更がないためスキップします。")
    print("コードレビューが完了しました。")


def main() -> None:
    """スクリプトのメイン実行ロジック。"""

    # 1. コマンドライン引数の解析
    if len(sys.argv) < 2 or sys.argv[1] not in ["review", "summary"]:
        print("Usage: python gemini_pr_tools.py [review|summary]", file=sys.stderr)
        sys.exit(1)

    mode = sys.argv[1]

    # 2. 環境変数の取得と検証
    github_token = os.getenv('GITHUB_TOKEN')
    project_id = os.getenv('PROJECT_ID')

    if not all([github_token, project_id]):
        print("必要な環境変数が設定されていません: GITHUB_TOKEN, PROJECT_ID", file=sys.stderr)
        sys.exit(1)

    try:
        # 3. クライアントの初期化
        github_client = Github(github_token)
        gemini_client = genai.Client(
            vertexai=True,
            project=project_id,
            location="global"
        )

        # 4. プロンプトの読み込み
        if mode == "review":
            prompt_template = load_prompt_from_file(REVIEW_PROMPT_FILE)
            print("レビューモードで実行します。")
        else: mode == "summary"
            prompt_template = load_prompt_from_file(SUMMARY_PROMPT_FILE)
            print("概要モードで実行します。")

        # 5. プルリクエスト情報の取得
        pr = get_pull_request(github_client)
        print(f"プルリクエスト #{pr.number} の操作を開始します。")

        # 6. モードに応じて処理を実行
        if mode == "review":
            run_review_mode(pr, gemini_client, prompt_template)
        elif mode == "summary":
            run_summary_mode(pr, gemini_client, prompt_template)

    except Exception as e:
        print(f"致命的なエラーが発生しました: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
```

上記のPythonスクリプトによるAIレビューの実装の主要なポイントは以下の通りです。

1. Geminiによるコード差分レビュー
   - `pr.get_files()`でプルリクエストに含まれる各ファイルを取得し、file.patch を使用して、そのファイルの変更点（差分情報）を取得します。
   - `file.patch` はGitの差分形式で、+ で追加された行、- で削除された行を示す情報です。これをAIへの入力として利用することで、変更された箇所に絞ったレビューが可能になります。
   - 取得したコード差分をプロンプトテンプレートに埋め込み、Gemini APIに送信します。`config={"response_mime_type": "application/json"}` を指定することで、レビューコメントをJSON形式で受け取り、後の処理を容易にしています。
2. GitHubへのレビューコメント投稿
   - Geminiが生成したレビューコメント（JSON形式）を解析し、start_line (指摘箇所の開始行)、severity (重要度)、comment (具体的なコメント内容) などの情報を取り出します。
   - これらの情報を用いて、pr.create_review_comment() メソッドを通じて、GitHubのプルリクエストの該当行にAIによるレビューコメントを自動的に投稿します。

::: note warn

- GITHUB_TOKENは、workflow定義にて、`GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}`を環境変数に追加してください。
- gemini apiを利用するにあたっては、workflow定義にて、サービスアカウント認証が必要になります。

:::

# スクリプトの実行結果

このスクリプトに関するPRを作成し、スクリプトを実行したところ、
下記のようにPRのコード差分に対してレビューコメントが記載されることが確認できました。

<img src="/images/2025/20250725a/image.png" alt="image.png" width="833" height="424" loading="lazy">

# おわりに

GitHub ActionsとGemini APIを連携させることで、プルリクエストを自動でAIレビューするスクリプトについて紹介しました。

今後は、Geminiに渡すプロンプトをさらに改善、AIレビューを実施するタイミングを適正化などを実施すると、よりAIレビューが品質の強化に寄与できるものとなると思います。

# 参考（利用ライブラリ）

- [pygithub](https://pypi.org/project/PyGithub/)
- [google-genai](https://pypi.org/project/google-genai/)

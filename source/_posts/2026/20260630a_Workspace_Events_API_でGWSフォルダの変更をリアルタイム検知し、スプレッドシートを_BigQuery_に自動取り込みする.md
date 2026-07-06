---
title: "Workspace Events API でGWSフォルダの変更をリアルタイム検知し、スプレッドシートを BigQuery に自動取り込みする"
date: 2026/06/30 00:00:00
postid: a
tag:
  - GoogleCloud
  - GoogleWorkspace
  - PubSub
  - BigQuery
category:
  - DataEngineering
thumbnail: /images/2026/20260630a/thumbnail.jpg
author: 柴田健太
lede: "Google Drive の共有フォルダにあるスプレッドシートが更新されたら、自動的にテーブルとしてBigQueryに取り込みたい。このような仕組みを作りたいと思うことは誰にでもあると思います。従来は Google Drive API の `changes.watch` を使った Webhook ベースの方法が一般的でしたが..."
---

<img src="/images/2026/20260630a/top.jpg" alt="" width="720" height="393">

こんにちは。フューチャーアーキテクト 製造・エネルギーサービス事業部の柴田です😌 見真の心で本質を探求しています!

2026年初めての試みとして、**データエンジニアリング**をテーマにしたブログ連載を開催します🎉

この記事は1本目です。

| 日付 | 執筆者 | タイトル / テーマ |
|:--|:--|:--|
| 6/30（火）| 柴田健太さん | Workspace Events API で GWS フォルダの変更をリアルタイム検知し、スプレッドシートを BigQuery に自動取り込みする（この記事です） |
| 7/1（水）| 真野隼記さん | ガイドライン公開しました |
| 7/2（木）| 鈴木風真さん | [S3 TablesのIceberg形式で、timestamptz型の登録に苦戦した話](http://localhost:4000/articles/20260702a/) |
| 7/3（金）| 棚井龍之介さん | [主要AIモデルのデータ保持期間とZDRを、一次情報で確認する](/articles/20260703a/) |
| 7/6（月）| 片岡久人さん | TBD |

## はじめに

「Google Drive の共有フォルダにあるスプレッドシートが更新されたら、自動的にテーブルとしてBigQueryに取り込みたい」。このような仕組みを作りたいと思うことは誰にでもあると思います。

従来は Google Drive API の `changes.watch` を使った Webhook ベースの方法が一般的でしたが、Webhookサーバーの運用が必要で、やりたいことのシンプルさに対してとても手間がかかっていました。

2025年7月に Google が **Google Workspace Events API** をアップデートし、Drive フォルダの変更を直接 Cloud Pub/Sub に通知できるようになりました（2026年6月時点でDeveloper Public Preview）。これにより、リアルタイムなデータパイプライン構築が格段に容易になりました。

本記事では、以下の最小構成でスプレッドシートの自動取り込みパイプラインを構築する手順を解説します。

### アーキテクチャ

```sh
Google Drive フォルダ
    │  ファイル変更（作成・編集・削除）
    ▼
Workspace Events API（プレビュー）
    │  CloudEvent 形式でイベント発行
    ▼
Cloud Pub/Sub Topic
    │  メッセージ受信でトリガー
    ▼
Cloud Functions（Python 3.12）
    │  ① イベント解析
    │  ② Sheets API でスプレッドシート読み取り
    │  ③ BigQuery に書き込み
    ▼
BigQuery
    ├── table（1スプシに対して1テーブル作成）
    └── ...
```

### 各コンポーネントの役割

| # | コンポーネント | サービス | 役割 | 補足 |
|---|--------------|----------|------|------|
| 1 | 変更検知 | Workspace Events API | Drive フォルダ内のファイル変更（作成・編集・削除）を検知し、イベントを発行する | Developer Public Preview<br>**サブスクリプションの有効期限は最大7日間** |
| 2 | イベント中継 | Cloud Pub/Sub | イベントメッセージを受信・保持し、後続の処理にリアルタイムで配信する | at-least-once 配信。メッセージの順序保証なし |
| 3 | データ処理 | Cloud Functions | Pub/Sub のメッセージをトリガーに起動し、スプレッドシートの読み取り・BigQuery への書き込みを行う | 今回はスプレッドシート以外のファイルは自動スキップ |
| 4 | データ読み取り | Google Sheets API | Cloud Functions から呼び出され、スプレッドシートのデータを取得する | ヘッダー行（1行目）をカラム名として使用 |
| 5 | データ蓄積 | BigQuery | 1スプシに対して1テーブルでデータを格納する | ファイル名やヘッダー行そのままテーブル名とカラム名として扱う |

### この構成の特徴

| 項目 | 説明 |
|------|------|
| サーバーレス | Cloud Functions + Pub/Sub で運用不要 |
| リアルタイム | ファイル変更から数秒〜数十秒で BigQuery に反映 |
| 最小コスト | 従量課金のみ、アイドル時はゼロコスト |
| Webhook 不要 | Workspace Events API が直接 Pub/Sub に通知 |

## 前提条件

- Google Cloud プロジェクトを利用
- Google Workspace アカウント（ビジネス以上）
- Python 3.12+

## 手順1: Google Cloud インフラ構築

この手順はGoogle CloudのCloud Shellで実行します

### 1-1. 環境変数の設定

```bash
export GCP_PROJECT_ID="your-project-id"
export DRIVE_FOLDER_ID="your-drive-folder-id"
```

> **フォルダ ID の確認方法**
> Google Drive でフォルダを開き、URL の末尾にある文字列がフォルダ ID です。
> `https://drive.google.com/drive/folders/XXXXXXXXXX` ← この `XXXXXXXXXX` 部分

### 1-2. API の有効化

今回は以下のAPIを有効化しています。

【Google Driveの変更通知のために必要】

- Cloud Pub/Sub API (pubsub.googleapis.com)
- Google Workspace Events API(workspaceevents.googleapis.com)

【スプシテーブル化処理のために必要】

- Google Drive API (drive.googleapis.com)
- Google Sheets API (sheets.googleapis.com)
- Cloud Functions API (cloudfunctions.googleapis.com)
- Cloud Build API (cloudbuild.googleapis.com)
- BigQuery API (bigquery.googleapis.com)

### 1-3. Pub/Sub Topic の作成

```bash
# Topic 作成
gcloud pubsub topics create drive-events-topic \
  --project="${GCP_PROJECT_ID}"

# Workspace Events API のサービスアカウントに Publisher 権限を付与
gcloud pubsub topics add-iam-policy-binding drive-events-topic \
  --member="serviceAccount:workspace-subs-prod-gcp-sa@gcp-sa-workspace-events.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher" \
  --project="${GCP_PROJECT_ID}"
```

::: note info
補足
`workspace-subs-prod-gcp-sa@gcp-sa-workspace-events.iam.gserviceaccount.com` は Google が管理する固定のサービスアカウントです。この権限がないとイベントが Pub/Sub に届きません。
:::

### 1-4. BigQuery データセットの作成

今回はスプシをテーブル化してBigQueryに取り込みますので、テーブルのデータセットだけあらかじめ作成します。

```bash
# データセット作成
bq mk --dataset \
  --location=asia-northeast1 \
  --description="自動スプシ取り込み先のデータセット" \
  ${GCP_PROJECT_ID}:gws_drive_events
```

## 手順2: Cloud Function の実装

### 2-1. ディレクトリ構成

```sh
cloud_function/
├── main.py           # メインコード
└── requirements.txt  # 依存パッケージ
```

### 2-2. ソースコード

<details><summary>requirements.txt</summary>

```sh
functions-framework==3.*
google-cloud-bigquery==3.*
google-api-python-client==2.*
google-auth==2.*
```

</details>

<details><summary>main.py</summary>

``` python
import base64
import json
import os
import re
import traceback

import functions_framework
from cloudevents.http import CloudEvent
from google.cloud import bigquery
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

PROJECT_ID = os.environ.get("PROJECT_ID", "your-project-id")
DATASET_ID = os.environ.get("DATASET_ID", "gws_drive_events")
TABLE_SPREADSHEET_DATA = os.environ.get("TABLE_SPREADSHEET_DATA", "spreadsheet_data")
SPREADSHEET_MIME_TYPE = "application/vnd.google-apps.spreadsheet"

SCOPES = ["https://www.googleapis.com/auth/drive.readonly", "https://www.googleapis.com/auth/spreadsheets.readonly"]


def extract_file_id(cloud_event: CloudEvent, event_data: dict) -> str:
    """Workspace Events / Pub/Sub の複数フォーマットから file_id を抽出する。"""
    candidates = [
        cloud_event.get("subject", ""),
        event_data.get("subject", ""),
        event_data.get("resource", {}).get("name", ""),
        event_data.get("data", {}).get("name", ""),
        event_data.get("data", {}).get("file", {}).get("name", ""),
    ]

    attributes = cloud_event.data.get("message", {}).get("attributes", {})
    if isinstance(attributes, dict):
        candidates.append(attributes.get("ce-subject", ""))

    for value in candidates:
        if not value:
            continue
        match = re.search(r"files/([A-Za-z0-9_-]+)", value)
        if match:
            return match.group(1)
    return ""


def read_spreadsheet(sheets_service, file_id: str) -> list[dict]:
    spreadsheet = sheets_service.spreadsheets().get(spreadsheetId=file_id).execute()
    sheets_data = []
    for sheet in spreadsheet.get("sheets", []):
        sheet_title = sheet["properties"]["title"]
        result = sheets_service.spreadsheets().values().get(spreadsheetId=file_id, range=sheet_title).execute()
        values = result.get("values", [])
        if not values:
            continue
        headers = values[0]
        rows = values[1:]
        sheets_data.append({"sheet_name": sheet_title, "headers": headers, "rows": rows})
        # 取り込み対象は1シート目のみ
        break
    return sheets_data


def is_english_filename(file_name: str) -> bool:
    return bool(re.fullmatch(r"[A-Za-z0-9 _.-]+", file_name or ""))


def sanitize_table_id(file_name: str) -> str:
    base_name = re.sub(r"\.[^.]+$", "", file_name.strip())
    table_id = re.sub(r"[^A-Za-z0-9_]", "_", base_name)
    table_id = re.sub(r"_+", "_", table_id).strip("_").lower()
    if not table_id:
        table_id = "sheet_data"
    if not re.match(r"^[A-Za-z_]", table_id):
        table_id = f"t_{table_id}"
    return table_id[:128]


def normalize_headers(headers: list[str]) -> list[str]:
    normalized = []
    used = {}
    for index, header in enumerate(headers, start=1):
        raw = (header or "").strip() if isinstance(header, str) else str(header)
        # 非英語ヘッダーの場合のみ col_n を使用
        if (not raw) or re.search(r"[^\x00-\x7F]", raw):
            column = f"col_{index}"
        else:
            column = re.sub(r"[^A-Za-z0-9_]", "_", raw)
            column = re.sub(r"_+", "_", column).strip("_")
            if not column:
                column = f"col_{index}"
            elif not re.match(r"^[A-Za-z_]", column):
                column = f"c_{column}"

        if column in used:
            used[column] += 1
            column = f"{column}_{used[column]}"
        else:
            used[column] = 1

        normalized.append(column[:128])
    return normalized


def ensure_table_exists(bq_client, table_ref: str, schema: list[bigquery.SchemaField]) -> None:
    try:
        table = bq_client.get_table(table_ref)
        existing = {field.name for field in table.schema}
        new_fields = [field for field in schema if field.name not in existing]
        if new_fields:
            table.schema = list(table.schema) + new_fields
            bq_client.update_table(table, ["schema"])
    except Exception:
        table = bigquery.Table(table_ref, schema=schema)
        bq_client.create_table(table)


def write_spreadsheet_data_by_file_table(
    bq_client, file_id: str, file_name: str, sheets_data: list[dict]
) -> tuple[str, int]:
    table_id = sanitize_table_id(file_name)
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.{table_id}"
    if not sheets_data:
        return table_ref, 0

    first_sheet = sheets_data[0]
    normalized_headers = normalize_headers(first_sheet["headers"])
    schema = [bigquery.SchemaField(column, "STRING") for column in normalized_headers]

    ensure_table_exists(bq_client, table_ref, schema)
    bq_client.query(f"TRUNCATE TABLE `{table_ref}`").result()

    rows = []
    for row_values in first_sheet["rows"]:
        row = {}
        for j, column_name in enumerate(normalized_headers):
            row[column_name] = row_values[j] if j < len(row_values) else None
        rows.append(row)

    if rows:
        errors = bq_client.insert_rows_json(table_ref, rows)
        if errors:
            raise RuntimeError(f"BigQuery Error: {errors}")
    return table_ref, len(rows)


@functions_framework.cloud_event
def handle_drive_event(cloud_event: CloudEvent) -> None:
    print("=== Cloud Function 実行開始 ===")
    print(
        f"event_id={cloud_event.get('id', '')} type={cloud_event.get('type', '')} subject={cloud_event.get('subject', '')}"
    )

    event_data = {}
    message_data = ""
    try:
        encoded_data = cloud_event.data.get("message", {}).get("data", "")
        if encoded_data:
            message_data = base64.b64decode(encoded_data).decode("utf-8")
            event_data = json.loads(message_data)
            print(f"message_data decoded: {message_data[:200]}")
        else:
            print("message.data が空です。")

        file_id = extract_file_id(cloud_event, event_data)
        if not file_id:
            attrs = cloud_event.data.get("message", {}).get("attributes", {})
            print(f"message.attributes={attrs}")
            print(f"event_data_keys={list(event_data.keys())}")
            print("file_id を抽出できませんでした。処理を終了します。")
            return
        print(f"file_id={file_id}")
    except Exception as e:
        print(f"Event Parse Error: {e}")
        print(traceback.format_exc())
        return

    try:
        credentials = Credentials.from_authorized_user_file("token.json", SCOPES)
        drive_service = build("drive", "v3", credentials=credentials)
        sheets_service = build("sheets", "v4", credentials=credentials)
        bq_client = bigquery.Client(project=PROJECT_ID)
    except Exception as e:
        print(f"Auth Error: {e}")
        print(traceback.format_exc())
        return

    try:
        file_meta = drive_service.files().get(fileId=file_id, fields="id,name,mimeType").execute()
        mime_type = file_meta.get("mimeType")
        print(f"file_meta id={file_meta.get('id')} name={file_meta.get('name')} mimeType={mime_type}")
    except Exception as e:
        print(f"Drive API Error: {e}")
        print(traceback.format_exc())
        return

    if mime_type != SPREADSHEET_MIME_TYPE:
        print(f"対象外 MIME Type のため終了: {mime_type}")
        return

    if not is_english_filename(file_meta["name"]):
        print(f"英数字ベースのファイル名ではないため終了: {file_meta['name']}")
        return

    try:
        sheets_data = read_spreadsheet(sheets_service, file_id)
        table_ref, row_count = write_spreadsheet_data_by_file_table(bq_client, file_id, file_meta["name"], sheets_data)
        print(f"✅ 同期完了 table={table_ref} rows={row_count}")
    except Exception as e:
        print(f"Write Error: {e}")
        print(traceback.format_exc())
```
</details>

### 2-3. Cloud Function のデプロイ

Cloud Functionをデプロイするコマンドです。作成したPub/Subトピックがトリガーになるように設定しています。こちらもCloud Shell上で実行してください。

```bash
gcloud functions deploy gws-drive-to-bigquery \
  --gen2 \
  --runtime=python312 \
  --region=asia-northeast1 \
  --source=cloud_function/ \
  --entry-point=handle_drive_event \
  --trigger-topic=drive-events-topic \
  --memory=256Mi \
  --timeout=120s \
  --max-instances=10 \
  --set-env-vars="PROJECT_ID=${GCP_PROJECT_ID},DATASET_ID=gws_drive_events" \
  --project="${GCP_PROJECT_ID}"
```

## 手順3: Workspace Events API サブスクリプション作成

ここが今回の肝です。**Workspace Events API** を使って、Drive フォルダの変更イベントを Pub/Sub に通知するサブスクリプションを作成します。

::: note warn
注意
今回はソースコードを掲載していますが、認証方法などは一例で、環境によっては利用できない場合もあります。
自分の環境によって適切なものを選択してください。
:::

### 3-1. OAuth 2.0 クライアント ID の準備

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) を開く
2. 「認証情報を作成」→「OAuth クライアント ID」
3. アプリケーションの種類: 「デスクトップ アプリ」
4. JSON をダウンロードして `credentials.json` として保存

### 3-2. サブスクリプション作成スクリプト

このスクリプトはローカル環境で実行してください。

<details><summary>requirements.txt</summary>

```python
import json
import os
import sys
from urllib.parse import urlparse

from google.auth.transport.requests import AuthorizedSession, Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from requests import RequestException

SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/spreadsheets.readonly",  # CFでのスプレッドシート読み取り用に追加
]


def authenticate(credentials_file="credentials.json"):
    """OAuth 2.0 認証"""
    creds = None
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
            creds = flow.run_local_server(port=0)
        with open("token.json", "w") as f:
            f.write(creds.to_json())
    return creds


def get_required_env(name):
    """必須環境変数を取得（未設定なら分かりやすい例外を返す）"""
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"環境変数 {name} が未設定です。" " 実行前に設定してください。")
    return value


def _get_proxy_summary():
    """環境変数のプロキシ設定を安全に要約（認証情報は表示しない）"""
    proxy_url = (
        os.getenv("HTTPS_PROXY") or os.getenv("https_proxy") or os.getenv("HTTP_PROXY") or os.getenv("http_proxy")
    )
    if not proxy_url:
        return None

    parsed = urlparse(proxy_url)
    if parsed.hostname and parsed.port:
        return f"{parsed.scheme}://{parsed.hostname}:{parsed.port}"
    if parsed.hostname:
        return f"{parsed.scheme}://{parsed.hostname}"
    return "(形式不正の可能性あり)"


def create_subscription(project_id, folder_id):
    """Workspace Events API でサブスクリプションを作成"""
    creds = authenticate()
    session = AuthorizedSession(creds)

    body = {
        "targetResource": f"//drive.googleapis.com/files/{folder_id}",
        "eventTypes": [
            "google.workspace.drive.file.v3.created",
            "google.workspace.drive.file.v3.contentChanged",
            "google.workspace.drive.file.v3.trashed",
        ],
        "notificationEndpoint": {
            "pubsubTopic": f"projects/{project_id}/topics/drive-events-topic",
        },
        "driveOptions": {
            "includeDescendants": True,
        },
        "payloadOptions": {
            "includeResource": False,
        },
        "ttl": "604800s",
    }

    try:
        response = session.post(
            "https://workspaceevents.googleapis.com/v1/subscriptions",
            json=body,
            timeout=30,
        )
        if response.status_code >= 400:
            raise RuntimeError(
                f"Workspace Events API の呼び出しに失敗しました (HTTP {response.status_code})。"
                f" 詳細: {response.text}"
            )

        result = response.json()
    except OSError as e:
        proxy_summary = _get_proxy_summary()
        has_proxy = bool(proxy_summary)
        proxy_hint = (
            f"プロキシ環境変数は検出されています ({proxy_summary})。"
            if has_proxy
            else "HTTP_PROXY / HTTPS_PROXY が未設定の可能性があります。"
        )
        raise RuntimeError(
            "ネットワーク接続に失敗しました。"
            " 社内ネットワークではプロキシ経由が必要な場合があります。"
            f" {proxy_hint}"
            f" 元エラー: {e}"
        ) from e
    except RequestException as e:
        proxy_summary = _get_proxy_summary()
        has_proxy = bool(proxy_summary)
        proxy_hint = (
            f"プロキシ環境変数は検出されています ({proxy_summary})。"
            if has_proxy
            else "HTTP_PROXY / HTTPS_PROXY が未設定の可能性があります。"
        )
        raise RuntimeError(
            "HTTPS リクエストに失敗しました。"
            " 社内ネットワークではプロキシ経由が必要な場合があります。"
            f" {proxy_hint}"
            f" 元エラー: {e}"
        ) from e
    print(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    try:
        project_id = get_required_env("GCP_PROJECT_ID")
        folder_id = get_required_env("DRIVE_FOLDER_ID")
        create_subscription(project_id, folder_id)
    except RuntimeError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

```

</details>

```bash
# 実行
pip install google-api-python-client google-auth-oauthlib
python create_workspace_subscription.py
```

::: note warn
サブスクリプションの有効期限
Workspace Events API のサブスクリプションは **最大7日間** で期限切れになります。本番運用では Cloud Scheduler で 定期的に更新スクリプトを実行してください。
:::

## 手順4: 動作確認

### 4-1. テスト用スプレッドシートの作成

監視対象フォルダに、以下のようなテスト用スプレッドシートを作成します:

| 名前 | 年齢 | 部署 |
|------|------|------|
| 田中太郎 | 30 | 開発 |
| 鈴木花子 | 25 | 営業 |

### 4-2. BigQuery でデータ確認

スプレッドシートを保存してから数秒〜数十秒後に、BigQuery でデータを確認できます

```sql
-- データセットのテーブルを確認
SELECT table_name
FROM `<project_id>.gws_drive_events.INFORMATION_SCHEMA.TABLES`;
```

::: note warn
データが入らない場合
まずはCloud Functionのログを確認して処理が実行されているかを確認してください。もし処理が実行されていない場合はPub/Subのサブスクリプションでメッセージが配信されているかを確認してください。
:::

## 注意事項・制限事項

### Workspace Events API（Developer Preview）の制限

| 項目 | 制限 |
|------|------|
| サブスクリプション有効期限 | 最大 7 日間（要定期更新） |
| 1ユーザーあたりのサブスクリプション数 | 上限あり（要確認） |
| イベント配信保証 | at-least-once（重複ありだが今回は実装で対処） |
| プレビュー状態 | 本番利用は自己責任 |


### Cloud Function のサービスアカウント権限

Cloud Function のサービスアカウントに以下の権限が必要です:

```bash
# BigQuery Data Editor
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:${GCP_PROJECT_ID}@appspot.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"
```

## コスト見積もり

月間 1,000 回のスプレッドシート更新を想定した場合:

| サービス | 概算月額コスト |
|----------|---------------|
| Cloud Functions | \$0〜\$1（無料枠内） |
| Pub/Sub | \$0〜\$0.1（無料枠内） |
| BigQuery（ストレージ） | \$0〜\$0.5 |
| BigQuery（クエリ） | 使用量による |
| **合計** | **ほぼ無料〜$2 程度** |

## まとめ

Google Workspace Events API（プレビュー）を使うことで、従来の Webhook ベースの方式と比較して、大幅にシンプルなアーキテクチャでリアルタイムデータパイプラインを構築できます。

### ポイント

- Workspace Events API が Drive → Pub/Sub の橋渡しをしてくれる
- Cloud Function でサーバーレスに処理
- サブスクリプションの 7日間有効期限に注意（要定期更新）


### 参考リンク

- [Google Workspace Events API ドキュメント](https://developers.google.com/workspace/events)
- [Workspace Events API - Drive イベント](https://developers.google.com/workspace/events/guides/events-drive)
- [Cloud Pub/Sub ドキュメント](https://cloud.google.com/pubsub/docs)
- [Cloud Functions ドキュメント](https://cloud.google.com/functions/docs)
- [Google ドライブ Events API のデベロッパー向け公開プレビュー版が利用可能に](https://workspaceupdates-ja.googleblog.com/2025/07/google-events-api.html)

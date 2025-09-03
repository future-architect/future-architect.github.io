---
title: GitHub ActionsのCI/CDパイプラインに静的コード解析Sonar Qubeを組み込んでみた
date: 2025/06/19 00:00:00
postid: a
tag:
  - CI/CD
  - SonarQube
  - GitHubActions
category:
  - DevOps
thumbnail: /images/2025/20250619a/thumbnail.png
author: 松本朝香
lede: １か月前、情報安全確保支援士を受験してきまして、問題の選択肢にあった SonarQube という初耳ワードがどんなOSSなのか気になりました。タイミングよくこの『CI/CD
  pipeline』企画を目にしたので、これは私に書けと言っている！と思い、このブログ記事の題材にすることに決め、ミニマム版を実装構築してみました。

---

[CI/CD連載](/articles/20250603a/) 4本目の記事です。

# はじめに

１か月前、情報安全確保支援士を受験してきまして、問題の選択肢にあった "SonarQube" という初耳ワードがどんなOSSなのか気になりました。タイミングよくこの『CI/CD pipeline』企画を目にしたので、これは私に書けと言っている！と思い、このブログ記事の題材にすることに決め、ミニマム版を実装構築してみました(/・ω・)/

ちなみに今回（令和7年春）の問題には、弊社セキュリティプロダクトの Future Vuls の得意分野である脆弱性管理の大問がそっくり出ていて、「これを機に [Future Vuls](https://vuls.biz/) の導入を検討してみては？」と回答に書いても丸もらえるのか試したかったです（さすがに試していない。

# SonarQubeとは？

SonarQubeとは、SonarSourceが開発したオープンソースプラットフォームで、29のプログラミング言語（2025年5月現在）において、コードの静的解析による自動レビューと継続的なコード品質検査を行い、バグやコードスメルを観測することができます。具体的には、重複コード、コーディング規約、単体テスト、コードカバレッジ、コードの複雑さ、コメント、バグ、セキュリティ推奨事項に関するレポートを提供してくれるソフトウェアです。

- OSS originalはこちら → https://github.com/SonarSource/sonarqube

※無料で使う場合、制限として解析できるのは公開リポジトリのみに限られます。プライベートリポジトリは解析できません。

# SonarQube Cloud

- [SonarQube Cloud Online Code Review as a Service Tool  | Sonar](https://www.sonarsource.com/products/sonarcloud/)

今回は、SonarQubeのクラウド版である **SonarQube Cloud** を使用します。GitHubアカウントがあれば、GitHub ActionsのCI/CDパイプラインにSonarQube（またはそのクラウド版であるSonarCloud）を導入する準備は整っています。どちらを利用したいかによって手順が少し異なりますが、一般的にSonarCloudの方がGitHubとの連携が簡単で、サーバー管理の手間もないため、特に初めての方や公開リポジトリでの利用におすすめです。

公式サイトの Docs が充実しているため、こちらを一次情報として読みこんでいきます。

- [Getting started with GitHub | SonarQube Cloud Documentation](https://docs.sonarsource.com/sonarqube-cloud/getting-started/github/\)

# 基本構想

基本的に、解析対象コードとテストコードは以下の理由から **同一言語** で書いた方がよいです。

- カバレッジ取得が容易で、静的解析と一元管理できる
- エコシステムが統一されていて、ツール連携しやすい
- 上記に付随して解析精度が向上する

今回はPythonで進めていきます。

## 最低限必要なファイル群

必須のファイル

1. 解析対象Pythonソースコード（`.py`）
2. CI/CDワークフローファイル

上記がないと始まりません。（２）はSonarCloudスキャンを実行するための自動化スクリプトです。使用するCI/CDサービスによってファイル名や場所、形式が異なります。

- GitHub Actionsの場合の例： `.github/workflows/XXX.yml`

このファイルには、リポジトリのチェックアウト、Python環境のセットアップ、依存関係のインストール（オプション）、テストとカバレッジレポートの生成（推奨）、そしてSonarCloudスキャナの実行といったステップを記述します。

### 強く推奨されるファイル（解析の品質と有用性を大幅に向上させるため）

- テストコードファイル (`test_*.py` など)
ユニットテストやインテグレーションテストのコードのこと。コードの品質を保証し、カバレッジを測定できる。 （例） `tests/test_main.py` `tests/test_utils.py`
- カバレッジレポートファイル (CI/CDパイプラインで生成)
テストがコードのどの程度をカバーしているかを示すレポート。SonarCloudはこの情報を表示する。通常、CI/CDのテスト実行ステップで生成され、SonarCloudスキャナに渡される。ex. `coverage.xml` (`pytest-cov` や `coverage.py` で生成)
※このファイルはリポジトリに直接コミットするものではなく、CI/CDプロセス中に生成され、 `.gitignore` に追加されるのが一般的です。しかし、CI/CDワークフローで「生成してSonarCloudに渡す」という設定が不可欠。
- `.gitignore` ファイル
Gitが追跡すべきでないファイルやディレクトリ（例: `__pycache__` `.venv` `*.pyc` `coverage.xml` など）を指定する。これにより、不要なファイルがSonarCloudによって解析されるのを防ぎ、解析のノイズを減らす。

### オプションだが有用なファイル

- 依存関係定義ファイル
プロジェクトが依存しているライブラリとそのバージョンをリスト化したファイル。(例) `requirements.txt` `pyproject.toml` (PoetryやPDMを使用している場合)
SonarCloudがプロジェクトの構成をより深く理解するのに役立ち、将来的には依存関係の脆弱性チェック機能（もしあれば）との連携にも繋がる可能性がある。
- `sonar-project.properties` ファイル (オプション)
リポジトリのルートディレクトリにこのファイルを置くことで、SonarCloudのプロジェクト設定（プロジェクトキー、ソースディレクトリ、エンコーディング、除外設定など）をCI/CDワークフローファイルとは別に管理可能。設定項目が多い場合や、複数のCI/CD環境で同じ設定を使いたい場合に便利である。これがなくても、CI/CDワークフローファイル内のSonarScannerの引数で設定を指定することは可能であるが、ファイルとして記載しておくのが無難である。（※今回も配置済み）

## 全体ファイル構成

今回は下記のように作成しました。ミニマム構成でシンプルですね！

```sh
PJ_ROUTE/
├── .github/
│   └── workflow/
│       ├── ci_pipeline.yml      # CI (テスト、カバレッジ、SonarCloud解析) ワークフロー
│       └── cd_pipeline.yml      # CD ワークフロー
│
├── pixel_art_app.py             # あなたの提供したメインのPythonスクリプト
|―― screenshot.py                # 今回テスト実行にあたり作成したダミーファイル
│
├── tests/                       # テストコードを格納するディレクトリ
│   ├── __init__.py              # testsディレクトリをパッケージとして認識させる
│   └── test_pixel_art_app.py    # pixel_art_app.py のテストコード
│
├── requirements.txt             # 必要なPythonパッケージリスト
├── sonar-project.properties     # SonarCloud 解析用の設定ファイル
├── .gitignore                   # Gitで追跡しないファイルやディレクトリを指定
├── pytest.ini                   # (オプション) pytest の設定ファイル
└── README.md                    # プロジェクトの説明ファイル
```

# 使用するソフトウェアアカウントの登録

## Github account のサインイン

新規開設方法については割愛します。

## SonarCloud account のサインイン

### １．SonarCloudのアカウント作成とプロジェクト設定

SonarCloud のウェブサイトにアクセスし、[Log in] or [Sign up] > [GitHub] を選択してGitHubアカウントで連携・登録を行う。

<img src="/images/2025/20250619a/sonarqube_03.png" alt="sonarqube_03.png" width="1200" height="366" loading="lazy">
<div style="display: flex; align-items: flex-start;">
  <img src="/images/2025/20250619a/sonarqube_04.png" alt="sonarqube_04.png" width="603" height="843" loading="lazy">
  <img src="/images/2025/20250619a/sonarqube_05.png" alt="sonarqube_05.png" width="529" height="939" loading="lazy">
</div>

### ２．解析対象リポジトリの選択

SonarCloudのダッシュボードで [Analyze new project] (または[+]メニュー > [Analyze new project]) をクリックし、GitHub Organizationを選択後、解析したいリポジトリを選択して [Set Up] をクリック。通常は「With GitHub Actions」が推奨されるので、それを選択する。

<img src="/images/2025/20250619a/sonarqube_15.png" alt="sonarqube_15.png" width="1200" height="315" loading="lazy">

この段階で、SonarCloud側にプロジェクトが作成されるため、以下の情報をメモしておきます。（※いつでも確認できるので見逃しても問題ない）

| キー | 説明 |
|:---:|:-------:|
| Organization Key | SonarCloudの組織名（通常はGitHubの組織名やユーザー名）|
| Project Key | SonarCloudがリポジトリに対して自動生成したキー（通常は GitHubユーザー名\_リポジトリ名 のような形式） |

### ３．SonarCloudトークンの生成とGitHub Secretsへの登録

SonarCloudの画面右上の自分のアイコン > [My Account] > [Security] に移動。[Generate Tokens] セクションで、トークン名（例: GITHUB_ACTIONS_TOKEN）を入力し、[Generate] をクリックする。生成されたトークンが表示されるので、必ずコピーして安全な場所に一時保管してください。
※この画面を閉じると二度と表示されません!!

<img src="/images/2025/20250619a/sonarqube_10.png" alt="sonarqube_10.png" width="1200" height="562" loading="lazy">

### ４．TOKENの登録

GitHubリポジトリに移動。[Settings] > [Secrets and variables] > [Actions] を選択する。[New repository secret] ボタンをクリックし、Name に 今回使用した名称 "SONAR_TOKEN" を入力する。Secret または Value に、先ほどSonarCloudで生成・コピーしたトークンを貼り付け、[Add secret] ボタンをクリックする。

<img src="/images/2025/20250619a/sonarqube_11.png" alt="sonarqube_11.png" width="1200" height="614" loading="lazy">

# 構築手順

それでは、具体的に設定ファイルの作成および設定に移ります！

## GitHub Actions CI pipeline & SonarCloud による解析
先にこちらを構築します。

### １．github/workflows ディレクトリの作成

CI/CDを設定したいGitHubリポジトリのルート（一番上の階層）に、 `.github` という名前のディレクトリを作成します。さらにその中に `workflows` という名前のディレクトリを作成します。最終的なパスは `.github/workflows/` となります。GitHub Actionsはこのディレクトリ内のYAMLファイルを自動的に認識します。

### ２．ワークフローファイルの作成

yamlの書き方など参考にすべく、初心者は GitHub Actions のテンプレートを使用するのが分かりやすいです。下記、 [Actions] > [Simple workflow] > [Configure] から作成できます。

<img src="/images/2025/20250619a/github-cicd_02.png" alt="github-cicd_02.png" width="1200" height="585" loading="lazy">

静的解析をするためのワークフローファイルを別で分けて、**CI用, Sonarcloud用, CD用** と3つ作成しても問題ありませんが、解析もテストと共に検査した方がよいという考えのもと、CIと同一ファイルにSonarcloudのワークフローファイルを記載することが一般的なようです。

```yaml
name: CI - Python Build, Test, SonarCloud Analysis

on:
  push:
    branches:
      - main
      - 'feature/**'
      # Other branch patterns you want to run CI for
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  build_test_analyze:
    name: Build, Test, Analyze
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          # SonarCloud needs full history for accurate analysis, however, specified shallow clone this time.

      # --------------------------------------------------------------------
      # Python Environment Setup
      # --------------------------------------------------------------------
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
          # preferable the same version with sonar.python.version parameter in sonar-project.properties file.

      - name: Install Python dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-cov

      # (Install Python dependencies ステップの後、Run tests ステップの前に追加)
      #- name: Show workspace structure and PYTHONPATH
      #  run: |
      #    echo "Current working directory: $(pwd)"
      #    echo "-------------------------------------"
      #    echo "Listing files in workspace (${{ github.workspace }}):"
      #    ls -R ${{ github.workspace }}
      #    echo "-------------------------------------"
      #    echo "PYTHONPATH environment variable is: $PYTHONPATH"
      #    echo "-------------------------------------"
      ###

      - name: Run tests and generate coverage report
        run: pytest --cov=. --cov-report=xml:coverage.xml
        env:
          PYTHONPATH: ${{ github.workspace }}
          # added PJ_ROUTE path to PYTHONPATH

      # --------------------------------------------------------------------
      # SonarCloud Analysis
      # --------------------------------------------------------------------
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Required for Pull Request decoration
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          # SonarCloud token set in GitHub Secrets

      # --------------------------------------------------------------------
      # Upload Artifacts (Optional, for inspection)
      # --------------------------------------------------------------------
      - name: Upload XML coverage report (for SonarCloud and inspection)
        uses: actions/upload-artifact@v4
        with:
          name: coverage-xml
          path: coverage.xml

      - name: Upload HTML coverage report (for local inspection)
        uses: actions/upload-artifact@v4
        with:
          name: coverage-html
          path: htmlcov/
```

::: note info
**Shallow Clone とは？**

"Gitリポジトリをクローン（複製）する際に、リポジトリの完全な履歴を取得する" という意味です。通常、CI/CD環境ではビルド時間を短縮するために、Gitリポジトリの最新のコミットから数個分だけを取得する「シャロークローン」が行われることがあります。例えば、「最新の1コミットだけ取得する」といった設定です。これにより、ダウンロードするデータ量が減り、クローンにかかる時間が短縮されます。GitHub Actionsの actions/checkout アクションでは、デフォルトでシャロークローン（fetch-depth: 1、つまり最新の1コミットのみ）が行われます。これを無効化（fetch-depth: 0）することで、SonarCloud (や SonarQube) は、ソースコードを静的解析する際に、コードの変更履歴を深く分析することができ、より多くの有益な情報を提供します。
:::

::: note info
**ワークフローファイルのカスタマイズ**

トリガー (on:): どのブランチへの push や pull_request で実行したいか、または特定のタグが作成されたときなど、実行条件を細かく設定できます。
:::

### ３．sonar-project.properties ファイルの作成

SonarCloud (または SonarQube) が対象プロジェクトをどのようにスキャン（解析）すべきかを指示するための設定ファイルです。SonarScanner（コードをスキャンして SonarCloud に結果を送るツール）が実行される際に、このファイルを読み込み、プロジェクトの基本的な情報や解析のパラメータを取得します。

```sh
# --- SonarCloud 必須設定 ---　※SonarCloud側で確認可能
sonar.projectKey=ask-lycoris_.github-workflows-
sonar.organization=ask-lycoris

# --- 基本設定 ---
sonar.projectName=Pixel Art Project
# ソースコードのディレクトリ (カレントディレクトリを指す)
sonar.sources=.
sonar.host.url=https://sonarcloud.io

# --- 言語設定 (自動検出されることが多いが、明示も可能) ---
# sonar.language=js # 例: JavaScript
# sonar.java.source=11 # 例: Javaのソースバージョン

# --- エンコーディング ---
sonar.sourceEncoding=UTF-8

# --- Python固有設定 ---
# sonar.language=py # 言語を明示的に指定することも可能 (通常は自動検出)
# CIで使用するPythonバージョンと合わせる。複数指定も可能。
sonar.python.version=3.8,3.9,3.10,3.11
sonar.tests=tests

# --- テストカバレッジレポートのパス (CIで生成したレポートを指定) ---
# Pythonの場合、一般的に coverage.py (または pytest-cov) で生成されたXMLレポートを指定します。
sonar.python.coverage.reportPaths=coverage.xml

# --- 除外設定 (必要に応じて) ---
 sonar.exclusions=venv/**, .venv/**, __pycache__/**, tests/**
# テスト自体はカバレッジ対象から除外する
 sonar.coverage.exclusions=tests/**

# --- Javascriptの場合：テストカバレッジレポートのパス (CIで生成したレポートを指定) ---
# sonar.javascript.lcov.reportPaths=coverage/lcov.info # JavaScript/TypeScriptの場合
# sonar.java.coveragePlugin=jacoco
# sonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml # Java/JaCoCoの場合

# --- その他のプロジェクト固有設定 ---
# sonar.verbose=true # 詳細ログ (デバッグ用)
```

::: note warn
**記載する上での注意点**

完成したワークフローがパースの影響で誤認識され回らなかった時がありました。

<img src="/images/2025/20250619a/image.png" alt="image.png" width="1156" height="242" loading="lazy">

特に `sonar.tests=tests # ...` のようにプロパティ値の直後に # でコメントを続けている場合、# がパスの一部として解釈されたり、あるいはその前のスペースと合わせて問題を引き起こすことがあるようです。最も安全なのは、プロパティ定義の行には値のみを記述し、コメントは独立した行に記述することです。
:::

### ４．解析対象レポジトリの準備

今回は、外部通信のないスタンドアロンのソースコード（Python）を解析対象とします。SonarCloud は、テストカバレッジの結果やビルド情報を利用してより詳細な解析を行います。

- ビルドスクリプト： プロジェクトをビルドするためのスクリプト ( `package.json` の `scripts` `Makefile` `pom.xml` など) がリポジトリに含まれていることを確認します。
- テストスクリプト： ユニットテストやインテグレーションテストを実行し、カバレッジレポートを生成するスクリプトを準備します。言語毎にカバレッジレポートを作成するためのライブラリが存在するため、それが出力されるように設定します。

### ５．ブランチ保護ルールの設定 (推奨)

コードの品質を確保し、main ブランチにマージする前に CI チェックがパスするように設定します。[GitHub リポジトリ] > [Settings] > [Branches] に移動し、[Require status checks to pass before merging]を有効化し、main ブランチに対するブランチ保護ルールを追加します。今回は下記のようにしました。

<img src="/images/2025/20250619a/sonarqube_17.png" alt="sonarqube_17.png" width="736" height="876" loading="lazy">

CI パイプラインから 該当ジョブ を選択し、Require pull request reviews before merging (マージ前にプルリクエストレビューを必須にする) も有効にします。

### ６．ワークフローファイルのコミット＆プッシュと結果確認

作成・編集したワークフローファイル (.github/workflows/ci.yml など) をリポジトリにコミットし、GitHubにプッシュします。

ワークフローファイルがリポジトリにプッシュされると、GitHubはそれを自動的に検出し、on: で指定したトリガー条件（例: main ブランチへのプッシュ）が発生した際にワークフローを実行します。リポジトリのメインページにある [Actions] タブをクリックすると、実行されたワークフローのリストと、それぞれの成功/失敗ステータス、実行ログなどを確認できます。通るまで何度もトラブルシューティングを行います。

<img src="/images/2025/20250619a/image_2.png" alt="image.png" width="1200" height="420" loading="lazy">

<img src="/images/2025/20250619a/6d498801-fde6-4da1-a043-e8d10eb1215d.png" alt="" width="931" height="667" loading="lazy">

↓↓↓

<img src="/images/2025/20250619a/github-cicd_03.png" alt="github-cicd_03.png" width="1134" height="258" loading="lazy">

### ７．SonarQube Cloud ルールセットの設定について

上記工程までで、Github ActionsとSonarQube Cloudの連携は完了ですが、SonarQube側でコード解析を全く行っていない状態（=SASTとしての機能を果たしていない）のため、別途ルールセットの設定が必要です。

## QualityProfile と QualityGate の違い

- **Quality Profile：ルールブックそのもの**
静的コード解析を行う際に、「どのような観点でコードを検査し、どんな問題を検出対象とするか」という具体的なルールセットを定義（=ルールブック）します。プロジェクトや組織のコーディング標準、品質基準に基づいて、コードの潜在的な問題点を網羅的に洗い出すための「検査項目リスト」を作成する際に使用する機能です。通常、プログラミング言語ごとに設定します。
- **Quality Gate：ルールブック結果の品質管理**
クオリティプロファイルに基づいて行われたコード解析の結果が、「プロジェクトとしてリリース（またはマージ）して良い品質基準を満たしているか」を判定するための条件セットです。プロジェクトが定める品質基準をクリアしているかどうかを自動的に判断し、基準を満たさない場合、ビルドを成功/失敗させてコードが本番環境にデプロイされたり、メインブランチにマージされたりするのを防ぐ際に使用する機能です。通常、プロジェクトごと、または組織全体で共通のゲートを設定できます。

## Quality Profileの設定

ルールセット の設定は、主にWeb UIから行います。SonarQube Cloudのプラットフォーム上で直接 Quality Profile を作成・編集し、プロジェクトに適用します。新しいルールを有効化したり、既存のルールの重要度を変更したりできます。下図のように、右上部から [Account page] > [ADMIN] > [Quality Profiles] へ移動します。

<img src="/images/2025/20250619a/image_3.png" alt="image.png" width="1200" height="206" loading="lazy">

<img src="/images/2025/20250619a/image_4.png" alt="image.png" width="1200" height="524" loading="lazy">

※下図のようにプロジェクト毎 Quality Profiles ページも存在するので、そちらではないため注意してください。無料枠内ではプロジェクト毎の設定はできません。

<img src="/images/2025/20250619a/sonarqube_24_ruleset.png" alt="sonarqube_24_ruleset.png" width="1027" height="423" loading="lazy">

### １．Quality Profile の選択または作成

各プログラミング言語ごとに定義されているQuality Profileの一覧が表示されており、デフォルトで「Sonar way」という推奨ルールセットが用意および設定されています。

「Sonar way」のような組み込みプロファイルは直接編集できません。編集するためには、コピーを作成する必要があります。（無料枠ではこれはできなさそう...）

#### 新しいプロファイルを作成する

Quality Profilesページの右上にある「Create」ボタンをクリックし、下記を入力していきます。Parentに指定すると、指定したQualityGateの内容を引き継いでProfileを作成してくれます。

<img src="/images/2025/20250619a/image_5.png" alt="image.png" width="1200" height="465" loading="lazy">

#### 設定したプロファイルをactivateする

今回は、セキュリティ面での解析をしてみたいので➀で設定したルールの中で security に関わる項目を有効化してみました！→ 設定自体はできそうですが、無料枠内だとデプロイまで行きつかないので結局ここでの設定は反映できなかったです。

<img src="/images/2025/20250619a/image_6.png" alt="image.png" width="1200" height="507" loading="lazy">

#### Quality Profileをプロジェクトに割り当てる

Quality Profileをカスタマイズしたら、それを解析対象のプロジェクトに割り当てる必要があります。

- **[方法1] Quality Profileのページから**
カスタマイズしたQuality Profileの詳細ページで、右上にある「Actions」（または歯車アイコンなど）メニューから「Set as Default」（その言語のデフォルトにする場合）または「Change Projects」のようなオプションを選択します。
「Change Projects」を選択した場合、このプロファイルを適用したいプロジェクトを検索して選択し、割り当てます。
- **[方法2] プロジェクトの設定ページから**
SonarCloudで対象のプロジェクトページに移動します。
「Administration」 > 「Quality Profiles」を選択します。
プロジェクトで使用されている各言語に対して、どのQuality Profileを使用するかのドロップダウンリストが表示されます。Pythonの項目で、先ほど作成またはカスタマイズしたQuality Profileを選択します。（無料枠では選択できず）

<img src="/images/2025/20250619a/image_7.png" alt="image.png" width="1003" height="946" loading="lazy">

### ２．Quality Gate の設定

無料枠内では default: Sonarway 以外のプロジェクトに対する **適用はできない** ようですが、**QualityGateの作成自体はできる** ようなので興味のある方は是非手を動かしてみるとよいかもしれません。

<img src="/images/2025/20250619a/image_8.png" alt="image.png" width="1200" height="711" loading="lazy">

<img src="/images/2025/20250619a/image_9.png" alt="image.png" width="791" height="477" loading="lazy">

## GitHub Actions CD パイプライン構築手順

CI（ビルドとテスト）が成功したら、自動的にアプリケーションをサーバーやクラウドサービスにデプロイするCDパイプラインも構築できます。CIジョブの後続としてデプロイ用のCDジョブを追加します。

### １．デプロイに際し必要な認証情報の設定

デプロイ先（ex. GitHub Pages, AWS S3/EC2/ECS, Azure App Service, Google Cloud Run, Heroku）に応じた GitHub Actions (例: `actions/deploy-pages` `aws-actions/configure-aws-credentials` `azure/webapps-deploy`) や、デプロイ用のコマンド (`scp` `rsync` `docker push` など) をワークフローに追加します。

デプロイに必要なAPIキーやパスワードなどの認証情報は、セキュリティ上の理由からワークフローファイルに直接書き込まず、リポジトリの [Settings] > [Secrets and variables] > [Actions] で Secrets として安全に登録し、ワークフロー内から `${{ secrets.YOUR_SECRET_NAME }}` のように参照します。（一般的なやり方）

### ２．ワークフローファイルの作成

```yaml
name: CD - Deploy Application

on:
  push:
    branches:
      - main
    # Trigger deployment on push to main branch
    # Alternatively, you might trigger on tag creation:
    # tags:
    #   - 'v*.*.*'

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    # Ensure CI has passed before deploying.
    environment: production
    # Optional: Define a GitHub environment for protection rules and secrets

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      # --------------------------------------------------------------------
      # Setup Your Deployment Environment & Deploy
      # Replace this section with steps specific to your deployment target
      # (e.g., AWS, Azure, Google Cloud, Heroku, Docker Hub, etc.)
      # --------------------------------------------------------------------
      # Example: Deploying a static site to AWS S3
      # - name: Configure AWS credentials
      #   uses: aws-actions/configure-aws-credentials@v4
      #   with:
      #     aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
      #     aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      #     aws-region: us-east-1
      #
      # - name: Build Project (if not done in CI or if artifacts are not passed)
      #   run: npm run build # Example build command
      #
      # - name: Deploy to S3
      #   run: aws s3 sync ./dist s3://your-s3-bucket-name --delete # Example S3 sync command
      # --------------------------------------------------------------------

      - name: Placeholder for Actual Deployment
        run: echo "Deploying application..." # Replace with your actual deployment commands
```

### ３．ワークフローのコミット＆プッシュと結果確認

作成・編集したワークフローファイル (cd_pipeline.yml) をリポジトリにコミット＆プッシュします。GitHubリポジトリの [Actions] タブを開き、ワークフローが実行されていることを確認し、ワークフローがエラーなく完了したことを確認してください。

<img src="/images/2025/20250619a/image_10.png" alt="image.png" width="1200" height="422" loading="lazy">

次に、SonarCloudのプロジェクトページにアクセスしてください。コードの品質、バグ、脆弱性などの解析結果が表示されていれば連携完了です！！Pull Requestを作成した場合、しばらくすると以下のように **SonarCloudの解析結果** がPull Requestのチェック欄やコメントとして表示されるようになります。

↓↓↓

今回は、無料枠内でできることを行ったため、SonarQube Cloudの静的解析を適用するまでには至らず結果としては "0" 表記となりましたが、連携して回してカバレッジ取得までは実装することができました👏

<img src="/images/2025/20250619a/image_11.png" alt="image.png" width="1200" height="610" loading="lazy">

<img src="/images/2025/20250619a/image_12.png" alt="image.png" width="1200" height="394" loading="lazy">

# Sonar Qubeの各評価項目

SonarCloudでは、主に以下のような項目でコードの品質を評価します。分析結果の解読に役立ててください。

- **Quality Gate (品質ゲート)**
意味: プロジェクトが定めた品質基準をクリアしているかどうかを示す。「Passed」（合格）なら基準を満たしており、「Failed」（不合格）なら問題あり。
- **Bugs (バグ)**
意味: プログラムが正しく動かない可能性のある箇所、つまり「虫（バグ）」が存在する箇所の割合。
- **Vulnerabilities (脆弱性 - ぜいじゃくせい)**
意味: セキュリティ上の弱点。悪意のある人（ハッカーなど）に攻撃される可能性がある箇所
- **Security Hotspots (セキュリティホットスポット)**
意味: セキュリティ上、特に注意深く確認する必要がある箇所。必ずしも脆弱性とは限らないが、専門家によるチェックが推奨される部分の割合？
- **Code Smells (コードの臭い / 技術的負債)**
意味: 直接的なバグではないけれど、読みにくかったり、将来的に問題を引き起こしやすかったりする「良くない書き方」のコードの割合？。「技術的負債」とも呼ばれ、放置すると修正にかかる時間（xx日、xx時間などで表示）が増大する。
- **Coverage (カバレッジ)**
意味: プログラムのテストが、コード全体のどれくらいの範囲をカバーできているかを示す割合（パーセンテージ）
- **Duplications (重複)**
意味: 同じようなコードが複数箇所にコピー＆ペーストされている割合（パーセンテージ）や行数

# おわりに

コンサルとして日々業務にあたっていると様々な事情により、テスト自動化やpipelineの構築などまだまだ自動化できていない企業が多いのかなと思います。しかし、ソフトウェアのセキュリティ対策は後付けでは対応しきれない部分も多く、DevSecOpsが昨今開発の主流となりつつあります。是非これを機に "CI/CD pipelineの構築" と "SonarQubeの組み込み" をマスターし、社内でも一目置かれる人材になってみてはいかがでしょうか！？

# 参考資料

- [「入門】GitHub Actionsとは？概要やメリット、使用例まとめ - カゴヤのサーバー研究室](https://www.kagoya.jp/howto/it-glossary/develop/githubactions/)
- [【入門】GitHubの使い方｜設定や基本操作など - カゴヤのサーバー研究室](https://www.kagoya.jp/howto/it-glossary/develop/howtousegithub/)
- [getting-started | SonarQube Cloud Documentation](https://docs.sonarsource.com/sonarqube-cloud/getting-started/github/)

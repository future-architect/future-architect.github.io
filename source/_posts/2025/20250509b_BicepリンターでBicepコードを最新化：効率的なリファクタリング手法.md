---
title: "Azure BicepリンターでBicepコードを最新化：効率的なリファクタリング手法"
date: 2025/05/09 00:00:01
postid: b
tag:
  - Azure
  - IaC
  - Linter
  - FutureOne
category:
  - Infrastructure
thumbnail: /images/2025/20250509b/thumbnail.png
author: 三浦克之
lede: "Azure Bicepは、Microsoft Azureのリソースを効率的に管理するために開発された宣言型の言語です。Azure上のインフラストラクチャをコードとして定義し、デプロイすることを可能にします。Azure Bicepは便利で強力なツールですが..."
---
::: note warn
グループ会社であるFutureOneの Qiita Organizationで公開された [記事](https://qiita.com/Miura597/items/b83e3371ec97b8dea74c) をクロスポストで公開しています。
:::

# はじめに

Azure Bicepは、Microsoft Azureのリソースを効率的に管理するために開発された宣言型の言語です。Azure上のインフラストラクチャをコードとして定義し、デプロイが可能です。

Azure Bicepは便利で強力なツールですが、Azureの急速な進化に追従する必要があるため、どのようにコードを最新化していくかが悩みどころです。Azureは頻繁に新しいサービスやAPIバージョンをリリースするため、Bicepコードを最新の状態に保つためには、これらの変更に迅速に対応する必要があります。

本記事では、Microsoft社のツールを使ったBicepコードの効率的な最新化する方法を紹介します。

# Bicep リンター

Bicepコードの最新化に役立つのが、[Bicepリンター](https://learn.microsoft.com/ja-jp/azure/azure-resource-manager/bicep/linter)です。

>Bicep リンターは、Bicep ファイルに構文エラーとベスト プラクティス違反がないかチェックします。 リンターを使用すると、開発時のガイダンスが提供され、コーディング標準を適用できます。 ファイルのチェックに使用するベスト プラクティスをカスタマイズできます。

こちらのツールを使うことで、コードの最新化が効率的に実施できます。

# 環境情報

今回は、`C:\Bicep` に配置した `main.bicep`* と呼び出されるモジュール群を対象にコードの最新化を行います。

<img src="/images/2025/20250509b/image.png" alt="image.png" width="981" height="413" loading="lazy">

## 事前準備

最新のAPIバージョンが表示されない場合もあるため、以下のアップデートを事前に行っておきます。

```sh Bicepのアップデート
az bicep upgrade
```

# リンターの実行

以下コマンドでリンターを実行できます。

```sh
az bicep lint
```

今回は実施環境に合わせて以下のコマンドを実行します。

```sh
az bicep lint -f .\main.bicep
```

- `-f` によるbicepファイルの指定は必須です。
- `main.bicep` が参照しているモジュールファイルも対象にしてくれます。

以下のようにチェック結果が表示されます。

<img src="/images/2025/20250509b/image_2.png" alt="" width="1200" height="306" loading="lazy">

デフォルトでは様々なチェック項目に従って結果が表示されます。

チャック内容をカスタマイズしたい場合は、`bicepconfig.json` を利用します。

- 参考: [Bicep 構成のリンター設定 - Azure Resource Manager | Microsoft Learn](https://learn.microsoft.com/ja-jp/azure/azure-resource-manager/bicep/bicep-config-linter)

今回はAPIバージョンのみに限定したいので、`bicepconfig.json` を以下のようにします。

```json bicepconfig.json
{
  "analyzers": {
    "core": {
      "enabled": true,
      "rules": {
        "adminusername-should-not-be-literal": {
          "level": "off"
        },
        "artifacts-parameters": {
          "level": "off"
        },
        "decompiler-cleanup": {
          "level": "off"
        },
        "explicit-values-for-loc-params": {
          "level": "off"
        },
        "max-asserts": {
          "level": "off"
        },
        "max-outputs": {
          "level": "off"
        },
        "max-params": {
          "level": "off"
        },
        "max-resources": {
          "level": "off"
        },
        "max-variables": {
          "level": "off"
        },
        "nested-deployment-template-scoping": {
          "level": "off"
        },
        "no-conflicting-metadata" : {
          "level": "off"
        },
        "no-deployments-resources" : {
          "level": "off"
        },
        "no-hardcoded-env-urls": {
          "level": "off"
        },
        "no-hardcoded-location": {
          "level": "off"
        },
        "no-loc-expr-outside-params": {
          "level": "off"
        },
        "no-unnecessary-dependson": {
          "level": "off"
        },
        "no-unused-existing-resources": {
          "level": "off"
        },
        "no-unused-params": {
          "level": "off"
        },
        "no-unused-vars": {
          "level": "off"
        },
        "outputs-should-not-contain-secrets": {
          "level": "off"
        },
        "prefer-interpolation": {
          "level": "off"
        },
        "prefer-unquoted-property-names": {
          "level": "off"
        },
        "protect-commandtoexecute-secrets": {
          "level": "off"
        },
        "secure-parameter-default": {
          "level": "off"
        },
        "secure-params-in-nested-deploy": {
          "level": "off"
        },
        "secure-secrets-in-params": {
          "level": "off"
        },
        "simplify-interpolation": {
          "level": "off"
        },
        "simplify-json-null": {
          "level": "off"
        },
        "use-parent-property": {
          "level": "off"
        },
        "use-recent-api-versions": {
          "level": "warning",
          "maxAllowedAgeInDays": 365
        },
        "use-recent-module-versions": {
          "level": "off"
        },
        "use-resource-id-functions": {
          "level": "off"
        },
        "use-resource-symbol-reference": {
          "level": "off"
        },
        "use-safe-access": {
          "level": "off"
        },
        "use-secure-value-for-secure-inputs": {
          "level": "off"
        },
        "use-stable-resource-identifiers": {
          "level": "off"
        },
        "use-stable-vm-image": {
          "level": "off"
        },
        "what-if-short-circuiting": {
          "level": "off"
        }
      }
    }
  }
}
```

作成したファイルを配置します。

<img src="/images/2025/20250509b/image_3.png" alt="" width="1200" height="421" loading="lazy">

その上で、コマンドを再実行すると表示がフィルタリングされています。

<img src="/images/2025/20250509b/image_4.png" alt="" width="1200" height="158" loading="lazy">

# リファクタリング方法

警告が出たリソースのコードを確認します。

VSCode用のBicep拡張機能をインストールしている場合はそのリソースで使えるバージョン一覧がインテリセンスとして表示されます。

最新のAPIバージョンが表示された場合は、最新バージョンへの適用を検討します。

<img src="/images/2025/20250509b/image_5.png" alt="" width="1200" height="277" loading="lazy">

# さいごに

以上が最新APIバージョンへの効率的な対応方法のご紹介でした。

APIバージョンが変わることで仕様の変更などが加わる可能性があるため、デプロイテストの実施はお忘れなく。

リンターツールは、コード上でセキュリティ的に問題のある個所を表示するなど、コードの最新化以外にBicepコードのリファクタリングに使えるので便利です。用途に合わせて活用をお勧めします。

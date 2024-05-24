---
title: "Gatekeeper Validating Admission WebhookでPVCリソースの削除を防止する"
date: 2023/03/09 00:00:00
postid: a
tag:
  - Kubernetes
  - OpenPolicyAgent
  - ArgoCD
  - EKS
  - Rego
category:
  - Infrastructure
thumbnail: /images/20230309a/thumbnail.png
author: 岩崎賢太
lede: "みなさん、ArgoCDは使っていますか？業務でEKSクラスタにArgoCDをデプロイして、Kubernetesリソースを管理しています。ArgoCDはGitOpsに則ったCDツールで、WebUIが優れていてKubernetesリソースの作成や更新がとても簡単で便利ですね。"
---
## はじめに
フューチャーインスペース株式会社の岩崎です。

みなさん、[ArgoCD](https://argo-cd.readthedocs.io/en/stable/)は使っていますか？
業務で[EKS](https://aws.amazon.com/jp/eks/)（Elastic Kubernetes Service）クラスタにArgoCDをデプロイして、Kubernetesリソースを管理しています。

ArgoCDはGitOpsに則ったCDツールで、WebUIが優れていてKubernetesリソースの作成や更新がとても簡単で便利ですね。

しかし、ArgoCDから[kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)アプリケーションの削除時に、[StatefulSet](https://kubernetes.io/ja/docs/concepts/workloads/controllers/statefulset/)で作成されたGrafanaのPVC(Persistent Volume Claim 永続化ボリューム要求)も想定外に削除されてしまうことに気づきました。
※ StatefulSetはステートフルなアプリケーションを管理するオブジェクトで、本来はStatefulSetで関連付けられたPVCは削除されません。

GrafanaのPVCには、ダッシュボードやアラートなどの設定が入っているため、PVCが削除される度にGrafanaを設定しなおす必要がありました。

そこで、同環境でデプロイしている[Gatekeeper](https://open-policy-agent.github.io/gatekeeper/website/docs/)から、PVCの削除を防げないかを模索していたところ、「Validating Admission Webhook」でArgoCDによるPVCの削除リクエストを拒否することができたので、設定から検証までを書いていきます。

## 環境/構成
- OS: Amazon Linux2
- EKS: 1.23
- ArgoCD: v2.4.15
- Gatekeeper: v3.10.0

## Validating Admission Webhook

Validating Admission Webhookの前に、KubernetesのAdmission Controlを理解する必要があります。
調べるにあたって、以下の記事がとてもわかりやすかったので、載せておきます。
・https://blog.mosuke.tech/entry/2022/05/15/admission-webhook-1/

Validating Admission Webhookはリクエストがポリシーを満たしているか否かを監視し、ポリシーに反したリクエストが飛んで来た場合は、そのリクエストを拒否するように動作します。
そして、Validating Admission Webhookのポリシーの作成には、以下の3つが必要になります。
- Gatekeeper
- Constraint-Template
- Constraint

### Gatekeeper
Gatekeeperは汎用的なポリシーエンジン[Open Policy Agent（OPA）](https://www.openpolicyagent.org/docs/latest/)をベースに作成されており、KubernetesのAdmission Controlの仕組みを活用し、Kubernetes APIへのリクエストに対して、Mutation（追加・更新・削除）、Validation(検証)などのポリシーをカスタマイズできます。

### Constraint-Template
Constraint-TemplateはConstraintに必要なパラメータを用意します。Rego言語で記述したポリシーの定義を埋め込んだ、Constraint CRDを定義するテンプレートです。

### Constraint
Constraintは条件に合致したリクエストを拒否します。Constraint-Templateで定義した内容に従って、監視対象のリソースの種類とアノテーションやラベルなどといったリクエストの拒否条件を記述します。

## PVCの削除を防止するポリシーを作成
本題のPVCの削除を防止するポリシーを作成します。
今回はPVCリソースを削除しないポリシーをnamespace毎に管理する必要があったため、「特定のnamespaceにおけるPVCリソースを削除しないポリシー」を作成していきます。

### Gatekeeperデプロイ
[公式ドキュメント](https://open-policy-agent.github.io/gatekeeper/website/docs/install)通りに[gatekeeper.yaml](https://github.com/open-policy-agent/gatekeeper/blob/master/deploy/gatekeeper.yaml )をArgoCDでデプロイします。
なお、デフォルトのGatekeeperのValidating Admission Webhookでは、CREATE, UDPATE（作成、更新）を監視する設定になっているため、次のように、ValidatingWebhookConfigurationリソースの`webhooks.rules.operations`にDELETE（削除）を追加することで、削除リクエストも監視対象に設定する必要があります。
参考: https://open-policy-agent.github.io/gatekeeper/website/docs/customize-admission/#how-to-enable-validation-of-delete-operations

```yaml gatekeeper.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:

 （中略）

  rules:
  - apiGroups:
    - '*'
    apiVersions:
    - '*'
    operations:
    - CREATE
    - UPDATE
    - DELETE  # DELETEを追加
```

### Constraint-Templateデプロイ
以下の通り、`k8sdeletepvc`CRDとポリシーを作成します。

```yaml constraint-template.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  # 任意の名前
  name: k8sdeletepvc
spec:
  crd:
    spec:
      names:
        # metadata.nameの値
        kind: k8sdeletepvc
      validation:
        # Schema for the `parameters` field
        openAPIV3Schema:
          type: object
          properties:
            operation:
              type: string
            namespace:
              type: string

  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        # metadata.nameの値
        package k8sdeletepvc

        violation[
          {
            "msg": msg,
            "details": {
              "operation_chk": match_operation,
              "namespace_chk": match_namespace
            }
          }
        ]
        {

          provided_operation := input.review.operation
          constraint_operation := input.parameters.operation
          match_operation := constraint_operation
          match_operation == provided_operation

          provided_namespace := input.review.namespace
          constraint_namespace := input.parameters.namespace
          match_namespace := constraint_namespace
          match_namespace == provided_namespace

          msg := sprintf(": %v request detected in %v namespace. Cancel the request for PVC to prevent deletion", [provided_operation, provided_namespace])
        }
```

Constraint-Templateの`spec.crd.spec.validation.openAPIV3Schema`以降には、ConstraintのParametersフィールドに関するスキーマを定義しています。また、`spec.targets`以降にnamespaceと操作情報に関するポリシーの定義を記述しています。

`input.review`はデプロイしているKubernetesリソースから値を取得し、`input.parameters`は後に説明するConstraint.yamlのparametersフィールドの値を参照します。
上記のテンプレートでは、`input.review.operation`でArgoCDの`CREATE`や`DELETE`などの操作情報を取得、`input.review.namespace`で対象リソースのnamespaceを取得します。
これらをAND条件で判別することにより、「特定のnamespaceにおけるリソースを削除しないポリシー」を実現しています。

Rego言語を用いてポリシーを記述するにあたり、`input.review`（Kubernetesリソース）から取得できる情報は[公式ドキュメント](https://open-policy-agent.github.io/gatekeeper/website/docs/howto/#input-review)にまとめられています。

また、Regoで記述したポリシーをテストできるサイトもあり、想定通りのポリシーになっているかの確認に便利だったので、載せておきます。

https://play.openpolicyagent.org/

### Constraintデプロイ

constraint-template.yamlで定義したConstraint CRD : `k8sdeletepvc`でポリシーの内容を明示的に宣言します。

以下のマニフェストをデプロイすることで、「monitoringのnamespaceにおけるPVCリソースの削除を防止するポリシー」が作成されます。

```yaml constraint.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: k8sdeletepvc
metadata:
  # 任意の名前
  name: pvc-constraint
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["PersistentVolumeClaim"] # 監視するリソース
  parameters:
    # リクエストを拒否する条件
    operation: DELETE
    namespace: monitoring
```

## 作成したポリシーの検証

作成したポリシーがmonitoringのnamespaceにおけるPVCリソースの削除を防止するかを確認します。

今回は、削除されたGrafanaのPVC`storage-kube-prometheus-stack-grafana-0`を対象にアプリケーションを削除してもPVCが残っているかの検証とDELETE以外のリクエストは問題なく承認されるかの検証を行います。

### ArgoCDによる削除

`storage-kube-prometheus-stack-grafana-0`はkube-prometheus-stackのサブチャートで定義されているので、kube-prometheus-stackのアプリケーションを削除します。

削除前のArgoCDの画面は以下の通りです。

<img src="/images/20230309a/image.png" alt="image.png" width="1200" height="386" loading="lazy">

ArgoCDの画面からアプリケーションをForegroundで削除した結果が以下になります。

<img src="/images/20230309a/image_2.png" alt="image.png" width="1200" height="389" loading="lazy">

エラーが起こり、APP CONDITIONSにて以下のエラーログが表示されます。

    admission webhook "validation.gatekeeper.sh" denied the request: [pvc-constraint] : DELETE request detected in monitoring namespace. Cancel the request for PVC to prevent deletion

pvc-constraint（Constraint名）より、リクエストが拒否されたエラーログが表示され、Comstraint-Templateで記述した通りのエラー文があることから、作成したポリシーによってPVCリソースの削除リクエストが拒否されたことがわかります。

また、リクエストが拒否されると、ArgoCDが削除処理状態（一部リソースがSyncを受け付けない）になるため、アプリケーションをNon-cascading削除することで、ArgoCDの削除処理状態を外します。
これで、PVCを削除することなく、アプリケーションを削除できることを確認しました。

ちなみにですが、kubectlコマンドでも削除リクエストが拒否されることが確認できます。

```sh
kubectl delete pvc -n monitoring storage-kube-prometheus-stack-grafana-0
> Error from server (Forbidden): admission webhook "validation.gatekeeper.sh" denied the request: [pvc-operation-constraint] : DELETE request detected in monitoring namespace. Cancel the request for PVC to prevent deletion
```

### ArgoCDによるPVCの作成

先ほどの検証で、削除リクエストが想定通り拒否されることが確認できました。
では、削除以外のリクエストは承認されるかをPVCリソースのデプロイ（作成リクエスト）で検証を行います。

まず、`storage-kube-prometheus-stack-grafana-0`を削除した状態が以下の通りです。

<img src="/images/20230309a/image_3.png" alt="image.png" width="1200" height="421" loading="lazy">

kube-prometheus-stackにSyncをかけてPVCをデプロイします。

<img src="/images/20230309a/image_4.png" alt="image.png" width="1200" height="384" loading="lazy">

無事にPVCが作成されたため、作成リクエストが無事に承認されたことが確認できました。

これは、[Constraint-Template](#constraint-templateデプロイ)で説明した通り、`namespace`と`operation`をAND条件で判別しているため、operationがCREATE（作成）の場合は、リクエストが承認されてPVCがデプロイされます。

そのため、PVCがデプロイしている状態で、operationがDELETE（削除）の場合は、リクエストが拒否されるため、[ArgoCDによる削除](#argocdによる削除)と同様のエラーが表示されます。
以上より、削除以外のリクエストは承認されることが確認できました。

## 一工夫加える（削除管理）

以上より、「各namespaceのPVCリソースの削除リクエストを拒否するポリシー」ができました。

しかし、この状態では1点だけ問題が発生してしまいます。それは、ポリシーを削除しない限り、Constraintの条件を満たしているリソースの削除ができないことです。

時と場合によっては、リソースを削除することはあると思います。リソースを削除する度にポリシーを外す運用では、外したポリシーを再度適用するのを忘れるリスクがあります。そのため、PVCリソースを削除するためのフラグをラベルで管理します。

### Constraint-Template（削除用ラベル）

[Constraint-Template](#constraint-templateデプロイ)で作成したマニフェストを以下のように編集します。

```yaml constraint.yaml
      --------
        中略
      --------

        openAPIV3Schema:
          type: object
          properties:
            # labelsを追加
            labels:
              type: array
              items:
                type: string

  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sdeletepvc

        violation[
          {
            "msg": msg,
            "details": {
              "operation_chk": match_operation,
              "namespace_chk": match_namespace,
              "label_chk": delete_labels # 追加
            }
          }
        ]
        {

          --------
            中略
          --------

          provided_label := {label | input.review.object.metadata.labels[label]}
          constraint_label := {label | label := input.parameters.labels[_]}
          delete_labels := constraint_label - provided_label
          count(delete_labels) > 0

          msg := sprintf(": %v request detected in %v namespace. Cancel the request for PVC to prevent deletion", [provided_operation, provided_namespace])
        }
```

ラベルは複数個管理することができるため、Parametersフィールドの定義もラベルを複数個管理できるようにarray型で定義しています。

また、削除用のラベルが複数個でも対応するように、配列の減算を用います。上記では、Constraintで定義したラベルをすべて含んでいたら、`delete_labels`の要素が0になり、含んでいなければ、要素が1以上になります。今回は、Constraintで定義したラベルをすべて含む場合に削除リクエストを承認するので、`count(delete_labels) > 0`で比較を行っています。

### Constraint（削除用ラベル）

parametersフィールドにlabelsを追加するだけです。

```yaml conostraint.yaml
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["PersistentVolumeClaim"]
  parameters:
    # Note that "labels" is now contained in an array item, rather than an object key under "parameters"
    operation: DELETE
    namespace: monitoring
    labels: ["delete-pvc"] # 削除用ラベルを追加
```

上記では、ラベルを1つ設定していますが、2つ以上設定することもできます。

以上で、PVCリソースに`delete-pvc`というラベルを含んでいれば、削除リクエストが承認されます。
これにより、想定外なPVCの削除がなくなり、ポリシーを外すことなくいつでもPVCリソースが削除可能な環境になりました。

## まとめ

GatekeeperのValidating Admission Webhookを用いてPVCリソースの削除リクエストを拒否することができました。バックアップを取得していれば、リソースの復元は可能ですが、リソースを予期せぬ削除から守ることも重要だと思います。

また、ポリシーを記述するRegoですが、Kubernetesリソースのデータ取得とルールの記述方法を押さえれば、自由にポリシーを作れるのではと感じました。

最後に、この検証を始めたときはKubernetesのAPIリクエストのことを全く理解しておらず、Rego言語も初めて知りました。何も知らない状態から調べていったので、少々時間がかかりましたが、Kubernetesへの理解が深まり、ポリシーを自分の手で作成できるようになったので、とても良い勉強になりました。


## 参考記事

- OPA/Gatekeeper
    - https://www.openpolicyagent.org/docs/latest/
    - https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
    - https://github.com/open-policy-agent/gatekeeper
- Admission Webhook
    - https://blog.mosuke.tech/entry/2022/05/15/admission-webhook-1/
    - https://tech.jxpress.net/entry/2019/12/01/kubernetes-admission-webhook-getting-started
- Constraint-Template、Constraint
    - https://qiita.com/yokawasa/items/fe1ce8311db84fd1394b
    - https://github.com/open-policy-agent/gatekeeper-library/tree/master/library/general
- Rego
    - https://zenn.dev/mizutani/articles/5b1cd56b4b3f4f
    - https://adventar.org/calendars/6601
    - https://play.openpolicyagent.org/

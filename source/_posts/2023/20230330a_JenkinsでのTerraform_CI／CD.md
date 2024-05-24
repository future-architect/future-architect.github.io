---
title: "JenkinsでのTerraform CI/CD"
date: 2023/03/30 00:00:00
postid: a
tag:
  - GCP
  - Jenkins
  - Terraform
  - CI/CD
category:
  - DevOps
thumbnail: /images/20230330a/thumbnail.png
author: 渡邉光
lede: "プロジェクトでJenikisを利用する機会があり、初めてJenkinsfileでTerraformのCI/CD環境を構築する機会があったので記事に残そうと思います。クラウドを使っているとAWSではCodeBuild、Google CloudではCloudBuildのサービスをCI/CD環境として利用するのでyamlでのCI/CDスクリプトには慣れていましたが..."
---
# 初めに
こんにちは！筋肉エンジニアのTIG渡邉です。最近ヘルニアになってしまい筋トレが思うようにできずくすぶっています。

[Terraform連載](/articles/20230327a/) の4リソース目の記事になります！

さて、今回はプロジェクトでJenikisを利用する機会があり、初めてJenkinsfileでTerraformのCI/CD環境を構築する機会があったので記事に残そうと思います。クラウドを使っているとAWSではCodeBuild、Google CloudではCloudBuildのサービスをCI/CD環境として利用するのでyamlでのCI/CDスクリプトには慣れていましたが、今回はJenkinsでCI/CDを構築する要件でしたのでJenkinsfileでCI/CDスクリプトには苦戦しました。

以下、今回利用したクラウドやTerraform、Jenkinsのバージョンを記載しておきます。
- クラウド：Google Cloud
- Terraform : 1.4.0
- Jenkins : 2.375.3

# 構成

今回のアーキテクチャ図は以下の通りです。

<img src="/images/20230330a/architecture.drawio.png" alt="architecture.drawio.png" width="1200" height="492" loading="lazy">

まず、JenkinsサーバやJenkinsサーバに付随するリソース（Cloud Load Balancing/Cloud Armorなど）はローカルPCからTerraformを実行して作成していきます。Jenkinsサーバを構築後、諸々Jenkinsの設定を終えたのちはJenkins Consoleからボタンポチポチでterraform planからterraform applyを実行してほかのGoogle Cloudのリソースたちを構築することができるようになります。

# Jenkinsサーバを構築するTerraformコード
ローカルPCからJenkinsサーバを構築するためのTerraformコードを記載します。
前提としてGoogle CloudのプロジェクトやVPC、Subnetなどのネットワークリソースはすでに構築されているものとします。

## ディレクトリ構成
本ディレクトリ構成は以下の通りです。

```sh
├── backend.tf
├── build
│   ├── Jenkinsfile.deploy
│   └── Jenkinsfile.test
├── compute_engine.tf
├── compute_firewall.tf
├── compute_network.tf
├── locals.tf
├── project_iam_member.tf
├── provider.tf
├── security_policy.tf
├── service_account.tf
├── startup-scripts
│   └── jenkins.sh
└── versions.tf
```

locals.tfの中身はGoogle Cloudのプロジェクト名や、自宅外部IPが含まれるので省略させていただきます。また、GCEのStartup Scriptを利用してGCEの構築時にJenkinsのインストールやGKEを操作するためのkubectlなどの諸々の設定も行っています（今回はGKEについては記載しませんがkubectlのインストールだけは一緒に行っています。）。

<details><summary>backend.tf</summary>

```sh backend.tf
terraform {
 backend "gcs" {
   bucket  = "xxxxxxxxxxxxx"
   prefix  = "terraform/state"
 }
}
```

</details>

<details><summary>comute_engine.tf</summary>

```sh comute_engine.tf
resource "google_compute_instance" "jenkins" {
  name         = local.jenkins.name
  machine_type = local.jenkins.machine_type
  zone         = local.jenkins.zone

  tags = local.jenkins.tags

  metadata = {
    "enable-oslogin" = "TRUE"
  }

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
    }
  }

  network_interface {
    subnetwork = data.google_compute_subnetwork.pri.self_link
    access_config {

    }
  }
  service_account {
    email  = google_service_account.jenkins.email
    scopes = ["cloud-platform"]
  }
  metadata_startup_script = file("./startup-scripts/jenkins.sh")
}

resource "google_compute_instance_group" "jenkins" {
  name        = local.jenkins.name
  description = local.jenkins.instance_group_description

  instances = [
    google_compute_instance.jenkins.id
  ]

  named_port {
    name = local.jenkins.name
    port = local.jenkins.instance_group_port
  }

  zone = local.jenkins.zone
}

resource "google_compute_http_health_check" "jenkins" {
  name         = local.jenkins.name
  request_path = "/login"
  port         = 8080
}

resource "google_compute_backend_service" "jenkins" {
  name                  = local.jenkins.name
  protocol              = "HTTP"
  port_name             = local.jenkins.name
  load_balancing_scheme = "EXTERNAL"
  timeout_sec           = 10
  health_checks         = [google_compute_http_health_check.jenkins.id]
  security_policy       = google_compute_security_policy.jenkins.id
  backend {
    group           = google_compute_instance_group.jenkins.id
    balancing_mode  = "UTILIZATION"
    max_utilization = 1.0
    capacity_scaler = 1.0
  }
}

resource "google_compute_url_map" "jenkins" {
  name            = local.jenkins.name
  default_service = google_compute_backend_service.jenkins.id
}

resource "google_compute_target_https_proxy" "jenkins" {
  name             = local.jenkins.name
  url_map          = google_compute_url_map.jenkins.id
  ssl_certificates = [google_compute_managed_ssl_certificate.jenkins.id]
}

data "google_compute_global_address" "jenkins" {
  name = local.jenkins.name
}

resource "google_compute_global_forwarding_rule" "jenkins" {
  name                  = local.jenkins.name
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL"
  port_range            = "443"
  target                = google_compute_target_https_proxy.jenkins.id
  ip_address            = data.google_compute_global_address.jenkins.address
}

resource "google_compute_managed_ssl_certificate" "jenkins" {
  name = local.jenkins.name

  managed {
    domains = ["${data.google_compute_global_address.jenkins.address}.nip.io"]
  }
}
```

</details>

<details><summary>comute_firewall.tf</summary>

```sh comute_firewall.tf
resource "google_compute_firewall" "jenkins_iap" {
  name    = "allow-iap-jenkins-instance-ssh"
  network = data.google_compute_network.vpc.self_link

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
  direction     = "INGRESS"
  priority      = 1000
  target_tags   = ["jenkins"]
  source_ranges = ["35.235.240.0/20"]
}

resource "google_compute_firewall" "jenkins_health" {
  name    = "allow-jenkins-health-check"
  network = data.google_compute_network.vpc.self_link

  allow {
    protocol = "tcp"
  }
  direction     = "INGRESS"
  priority      = 1000
  target_tags   = ["jenkins"]
  source_ranges = ["35.191.0.0/16", "130.211.0.0/22"]
}
```

</details>

<details><summary>comute_network.tf</summary>

```sh comute_network.tf
data "google_compute_network" "vpc" {
  name = local.vpc_name
}

data "google_compute_subnetwork" "pub" {
  name   = local.subnet.pub.name
  region = local.region_name
}

data "google_compute_subnetwork" "pri" {
  name   = local.subnet.pri.name
  region = local.region_name
}
```

</details>

<details><summary>project_iam_member.tf</summary>

```sh project_iam_member.tf
resource "google_project_iam_member" "jenkins" {
  project = local.project.project_id
  for_each = toset([
    "roles/owner",
  ])
  role   = each.value
  member = "serviceAccount:${google_service_account.jenkins.email}"
}
```

</details>

<details><summary>security_policy.tf</summary>

```sh security_policy.tf
resource "google_compute_security_policy" "jenkins" {
  name = local.jenkins.name

  rule {
    action   = "allow"
    priority = "10"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = [local.security_policy.home_ip]
      }
    }
    description = "allow home ip address"
  }

  rule {
    action   = "deny(403)"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "deny all ip address except home ip"
  }
}
```

</details>

<details><summary>service_account.tf</summary>

```sh
resource "google_service_account" "jenkins" {
  account_id   = "tky-jenkins-sa"
  display_name = "tky-jenkins-sa"
}
```

</details>

<details><summary>versions.tf</summary>

```sh versions.tf
terraform {
  required_version = "~> 1.4.0"
  required_providers {
    google = {
      version = "~> 4.47.0"
    }
  }
}
```

</details>

<details><summary>provider.tf</summary>

```sh provider.tf
provider "google" {
  project = local.project.name
  region  = local.region_name
}

provider "google-beta" {
  project = local.project.name
  region  = local.region_name
}
```

</details>

</details>

<details><summary>startup-scripts/jenkins.sh</summary>

```sh startup-scripts/jenkins.sh
#/bin/bash
apt update -y
apt install -y git apt-transport-https ca-certificates software-properties-common gnupg
apt install -y openjdk-17-jdk openjdk-17-jre

# Install Kubectl
curl -LO "https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x ./kubectl
mv ./kubectl /usr/local/bin/kubectl
kubectl version

# Install google-cloud-sdk-gke-gcloud-auth-plugin
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
apt-get update
apt-get install google-cloud-cli
apt-get install google-cloud-sdk-gke-gcloud-auth-plugin
export USE_GKE_GCLOUD_AUTH_PLUGIN=True

# Install Jenkins
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io.key | tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/ | tee /etc/apt/sources.list.d/jenkins.list > /dev/null
apt update -y
apt install -y jenkins
sed -i -e 's/JENKINS_ENABLE_ACCESS_LOG="no"/JENKINS_ENABLE_ACCESS_LOG="yes"/g' /etc/default/jenkins
systemctl restart jenkins
systemctl enable jenkins
```

</details>


# Jenkins初期設定

Jenkinsサーバが構築出来たら、ローカルPCからCloud Load Balancingに設定されたURLからJenkins Consoleにアクセスします。

初回アクセス時にAdministrator passwordを求められるのでJenkinsサーバにSSHで入り、以下のコマンドを実行してAdministrator passwardを確認して画面に入力します。

```sh
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

<img src="/images/20230330a/jenkins_setting_1.png" alt="" width="991" height="911" loading="lazy">

次にJenkins Pluginの設定を求められるので、Jenkinsが推奨している「Install suggested plugins」を選択します。

<img src="/images/20230330a/jenkins_setting_2.png" alt="" width="995" height="910" loading="lazy">


Jenkinsが推奨しているPluginをインストールされるまで待ちます。
<img src="/images/20230330a/jenkins_setting_3.png" alt="" width="993" height="915" loading="lazy">

次に、Jenkins初期Admin Userの設定を求められるので

- ユーザ名
- パスワード
- パスワードの確認
- フルネーム
- メールアドレス

を入力して「Save and Continue」をクリックします。
<img src="/images/20230330a/jenkins_setting_4.png" alt="" width="987" height="911" loading="lazy">

Jenkins ルートURLの確認が求められるので、変更がなければ「Save and Finish」をクリックします。
<img src="/images/20230330a/jenkins_setting_5.png" alt="" width="994" height="909" loading="lazy">

これでJenkinsの初期設定が完了したので、「Start using Jenkins」をクリックします。

<img src="/images/20230330a/jenkins_setting_6.png" alt="" width="992" height="912" loading="lazy">

その後、Jenkins Consoleの画面にアクセスできるようになります。

<img src="/images/20230330a/jenkins_setting_7.png" alt="" width="1200" height="890" loading="lazy">

# Terraform/AnsiColor プラグインのインストール

「Jenkinsの管理」をクリックし、「プライグインの管理」をクリックします。
<img src="/images/20230330a/global_tool_configuration_1.png" alt="" width="1200" height="895" loading="lazy">

JenkinsからTerraformを実行するためにTerraformをインストールします。

「Availavle plugins」をクリックし、検索欄から「terraform」を入力、Installにチェックし、「Download now and install after restart」をクリックします。

Jenkins実行ログに色を付けたいので、AnsiColorをインストールします。

「Availavle plugins」をクリックし、検索欄から「AnsiColor」を入力、Installにチェックし、「Download now and install after restart」をクリックします。

<img src="/images/20230330a/global_tool_configuration_2.png" alt="" width="1200" height="890" loading="lazy">

<img src="/images/20230330a/global_tool_configuration_8.png" alt="" width="1200" height="893" loading="lazy">

その後、「Installed plugins」をクリックし、「ジョブが実行中でなければ再起動」をクリックし、Jenkinsサーバを再起動します。


<img src="/images/20230330a/global_tool_configuration_4.png" alt="" width="1200" height="892" loading="lazy">

再起動すると、再度ログインが求められるのでログイン情報を入力し、ログインします。

<img src="/images/20230330a/global_tool_configuration_5.png" alt="" width="1200" height="896" loading="lazy">

# Global Tool Configurationの設定

「Jenkinsの管理」をクリックし、「Global Tool Configuration」をクリックします。

<img src="/images/20230330a/image.png" alt="" width="1200" height="899" loading="lazy">


Terraformプラグインをインストールしている状態だと、Global Tool ConfigurationにTerraformが表示されるので、設定します。

- Name : Terraform-1.4.0　（Jenkinsfileで使用するためこの名前にします）
- install from bintray.com：バージョン（Terraform 1.4.0 linux (amd64)）

を設定し、「Save」をクリックします。

<img src="/images/20230330a/image_2.png" alt="" width="1200" height="899" loading="lazy">


# Terraform Plan/Applyジョブの作成

## Terraformジョブ管理フォルダの作成

ここまでの設定で、Jenkins上でTerraformを実行する環境が整ったので、Terraform実行ジョブ管理フォルダの作成を行っていきます。

「新規ジョブ作成」をクリックします。

<img src="/images/20230330a/jenkins_job_setting_1.png" alt="" width="1200" height="893" loading="lazy">

まず、Terraformジョブをまとめるフォルダを作成します。
ジョブ名「terraform」と入力し、「フォルダ」を選択し、「OK」を入力します。
<img src="/images/20230330a/jenkins_job_setting_8.png" alt="" width="1200" height="893" loading="lazy">

ConfigurationでGeneralから

- 表示名：terraform
- 説明：terraform planジョブとterraform applyジョブを管理します

と入力し「保存」をクリックします。
<img src="/images/20230330a/jenkins_job_setting_9.png" alt="" width="1200" height="895" loading="lazy">

## Terraform planジョブの作成
terraformフォルダが作成されたので、terraform planジョブの作成を行っていきます。
「新規アイテムの作成」をクリックします。
<img src="/images/20230330a/jenkins_job_setting_10.png" alt="" width="1200" height="894" loading="lazy">

ジョブ名「terraform-plan」と入力し、「Multibranch Pipeline」を選択し、「OK」と入力します。
<img src="/images/20230330a/jenkins_job_setting_2.png" alt="" width="1200" height="894" loading="lazy">

ConfigurationでGeneralから
- 表示名：terraform-plan
- 説明：terraform planを実行するジョブです。

<img src="/images/20230330a/jenkins_job_setting_3.png" alt="jenkins_job_setting_3.png" width="923" height="410" loading="lazy">

Branch SorucesでGitHubとの連携の設定を行っていきます。
Credentialsから「追加」をクリックし、GitHub認証情報の設定を行います。

<img src="/images/20230330a/jenkins_job_setting_4.png" alt="jenkins_job_setting_4.png" width="849" height="608" loading="lazy">

Folder Credentials Providerで

- Domain：グローバルドメイン
- 種類：ユーザ名とパスワード
- ユーザ名：GitHubのユーザ名
- パスワード：GitHubのPersonal Access Token

を入力します。

<img src="/images/20230330a/jenkins_job_setting_5.png" alt="" width="948" height="712" loading="lazy">

上記設定後、Credentialsに設定したCredentialが表示されるので選択します。
Repository Scan - Deprecated Visualization　から

- Owner：Githubユーザ名
- Repository：対象リポジトリ

を選択します。

Behavioursは

- Strategy：All branches

を選択します。

<img src="/images/20230330a/jenkins_job_setting_6.png" alt="" width="888" height="845" loading="lazy">

Build Configurationから
- Mode：by Jenkinsfile
- script Path：Jenkinsfileが存在するパス
を入力して「保存」をクリックします。

<img src="/images/20230330a/jenkins_job_setting_7.png" alt="" width="908" height="291" loading="lazy">

設定後、terraform-planジョブが作成されます。
<img src="/images/20230330a/jenkins_job_setting_12.png" alt="" width="1200" height="903" loading="lazy">
実際のJenkinsfileはこちらです。

```sh
pipeline {
    agent any
    // 環境変数を定義
    environment {
        TERRAFORM_PATH = tool(name: 'terraform-1.4.0', type: 'org.jenkinsci.plugins.terraform.TerraformInstallation')
        PATH = "${TERRAFORM_PATH}:$PATH"
        TERRAFORM_HOME = "gcp/jenkins"
    }

    // ansiエスケープシーケンスでログに色をつける
    options {
        ansiColor('xterm')
    }

    stages {
        stage('Initialize') {
            steps {
                // terraformコードがあるディレクトリで処理
                dir(TERRAFORM_HOME) {
                    script {
                        // terraformのバージョン確認
                        sh "terraform -v"
                        // 前回のジョブ実行時のファイルを削除
                        if (fileExists(".terraform/terraform.tfstate")) {
                            sh "rm -rf .terraform/terraform.tfstate"
                        }
                        if (fileExists(".terraform.lock.hcl")) {
                            sh "rm -rf .terraform.lock.hcl"
                        }
                        if (fileExists("status")) {
                            sh "rm status"
                        }
                        // terraform initの実行
                        sh "terraform init"
                    }
                }
            }
        }

        stage('plan') {
            steps {
                // terraformコードがあるディレクトリで処理
                dir(TERRAFORM_HOME) {
                    script {
                        // terraform planの実行
                        sh "set +e; terraform plan -out=plan.out -detailed-exitcode; echo \$? > status"
                        def exitcode = readFile('status').trim()
                        echo "Terraform Plan Exit Code: ${exitcode}"
                        // 成功時
                        if (exitcode == "0") {
                            currentBuild.result = 'SUCCESS'
                        }
                        // 失敗時
                        if (exitcode == "1") {
                            currentBuild.result = 'FAILURE'
                        }
                    }
                }
            }
        }
    }
}
```

## Terraform Applyジョブの作成
terraform-planジョブが作成できたので、同様の設定でterraform-applyジョブを作成していきます。

<img src="/images/20230330a/jenkins_job_setting_13.png" alt="" width="1200" height="895" loading="lazy">


実際のJenkinsfileはこちらです。

```sh Jenkinsfile
// 変数を定義
def apply = "0"
def planExitCode
def applyExitCode

pipeline {
    agent any
    // 環境変数を定義
    environment {
        TERRAFORM_PATH = tool(name: 'terraform-1.4.0', type: 'org.jenkinsci.plugins.terraform.TerraformInstallation')
        PATH = "${TERRAFORM_PATH}:$PATH"
        TERRAFORM_HOME = "gcp/jenkins"
    }

    // ansiエスケープシーケンスでログに色をつける
    options {
        ansiColor('xterm')
    }

    stages {
        stage('Initialize') {
            steps {
                // terraformコードがあるディレクトリで処理
                dir(TERRAFORM_HOME) {
                    script {
                        // terraformのバージョン確認
                        sh "terraform -v"
                        // 前回のジョブ実行時のファイルを削除
                        if (fileExists(".terraform/terraform.tfstate")) {
                            sh "rm -rf .terraform/terraform.tfstate"
                        }
                        if (fileExists(".terraform.lock.hcl")) {
                            sh "rm -rf .terraform.lock.hcl"
                        }
                        if (fileExists("status")) {
                            sh "rm status"
                        }
                        // terraform initの実行
                        sh "terraform init"
                    }
                }
            }
        }

        stage('plan') {
            steps {
                // terraformコードがあるディレクトリで処理
                dir(TERRAFORM_HOME) {
                    script {
                        // terraform planの実行
                        sh "set +e; terraform plan -out=plan.out -detailed-exitcode; echo \$? > status"
                        planExitCode = readFile('status').trim()
                        println "Terraform Plan Exit Code: ${planExitCode}"
                        // plan成功時かつ差分がない場合
                        if (planExitCode == "0") {
                            currentBuild.result = 'SUCCESS'
                            apply = "0"
                        }
                        // plan失敗時
                        if (planExitCode == "1") {
                            currentBuild.result = 'FAILURE'
                            apply = "0"
                        }
                        // plan成功時かつ差分がある場合
                        if (planExitCode == "2") {
                            stash name: "plan", includes: "plan.out"
                            try {
                                // 承認フェーズ
                                if (apply != "1") {
                                    input message: 'Apply Plan?', ok: 'Apply'
                                }
                                apply = "1"
                            } catch (err) {
                                currentBuild.result = 'UNSTABLE'
                            }
                        }
                    }
                }
            }
        }

        stage('Apply') {
            // apply変数が1の場合、apply実行
            when {
                expression { apply == "1" }
            }
            steps {
                // terraformコードがあるディレクトリで処理
                dir(TERRAFORM_HOME) {
                    script {
                        unstash 'plan'
                        // 前回のジョブ実行時のファイルを削除
                        if (fileExists("status.apply")) {
                            sh "rm status.apply"
                        }
                        // terraform applyの実行
                        ansiColor('xterm') {
                            sh "set +e; terraform apply plan.out; echo \$? > status.apply"
                        }
                        applyExitCode = readFile('status.apply').trim()
                        println "applyExit Code: " + applyExitCode
                        // apply成功時
                        if (applyExitCode == "0") {
                            currentBuild.result = 'SUCCESS'
                        } // apply失敗時
                        else {
                            currentBuild.result = 'FAILURE'
                        }
                        println "currentBuild.result :" + currentBuild.result
                    }
                }
            }
        }
    }
}
```

terraform plan実行時に、-detailed-exitcodeオプションをつけることでexit codeで処理の分岐を実現しています。
- exit code 0 : No changesでplanが成功
- exit code 1 : planがError
- exit code 2 : 差分ありでplanが成功

# Terraform Plan/Applyジョブの実行
Terraform Plan/Applyジョブが作成できたので、ジョブを実際に実行していきます。
gcsバケットを作成するtfファイルを準備して、commit、リポジトリにpushします。

```sh
resource "google_storage_bucket" "bucket" {
  name          = "test-bucket0101"
  location      = "ASIA"
  force_destroy = true

  public_access_prevention = "enforced"
}
```

## Terraform Planジョブの実行
作成したTerraform Planジョブを実行してみましょう。
「ビルド実行」をクリックします。

<img src="/images/20230330a/image_3.png" alt="" width="1200" height="901" loading="lazy">


ジョブが実行されています。
<img src="/images/20230330a/image_4.png" alt="" width="1200" height="893" loading="lazy">


ジョブが正常終了したので、ログを確認するとplan結果が表示されています。
事前準備でgcsバケットを作成するtfファイルを準備したので、plan結果に「1 to add」と表示されました。
<img src="/images/20230330a/plan.png" alt="" width="1200" height="904" loading="lazy">




## Terraform Applyジョブの実行
次に、作成したTerraform Applyジョブを実行してみましょう。

「ビルド実行」をクリックします。

<img src="/images/20230330a/image_5.png" alt="" width="1200" height="907" loading="lazy">

ジョブが実行されています。

<img src="/images/20230330a/image_6.png" alt="" width="1200" height="904" loading="lazy">

planフェーズでジョブが一時停止し、Apply Plan？と表示されます。

<img src="/images/20230330a/image_7.png" alt="" width="772" height="236" loading="lazy">

ここでジョブのログを確認しに行き、Applyする前の内容を確認し、問題ないければ「Apply」をクリックしてTerraform Applyを実行します。もし、ここで問題があれば「Abort」をクリックすればジョブはTerraform Applyを実行することなく停止します。

<img src="/images/20230330a/image_8.png" alt="" width="1200" height="858" loading="lazy">

「Apply」をクリックしてジョブが正常終了しました。
<img src="/images/20230330a/image_9.png" alt="" width="782" height="222" loading="lazy">

ここでジョブのログを確認しに行くと「Apply complete! Resources: 1 added, 0 changed, 0 destroyed.」と表示され、正常終了したことが確認できました。
<img src="/images/20230330a/image_10.png" alt="" width="1200" height="899" loading="lazy">

Google Cloudのコンソール画面を確認すると、Terraform Applyを実行したときに作成されたGCSバケットが確認できました。
<img src="/images/20230330a/image_11.png" alt="png" width="1200" height="846" loading="lazy">

# 最後に

JenkinsでのTerraform CI/CDの記事を書きました。Jenkinsの設定や、Jenkinsfileを書くことも初めてだったので、Jenkins自体やJenkinsfileの文法などいろいろ勉強になりました。

各Cloud Providerのマネージドサービス（AWS CodeBuild / Google Cloud Build）にJenkinsのビルド実行環境を委譲することが主流になっていますが、まだまだJenkinsを利用することもあると思いますので参考になれば幸いです。

次は岸下さんの[Terraformでの機密情報の取り扱い on Google Cloud](/articles/20230331a/)記事です。

お楽しみを！！

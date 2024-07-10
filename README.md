# service stack

* ホスティング : Github Pages
* 静的サイトジェネレータ：Hexo
* 分析：Google Analytics

## ユーザプロフィールを追加する方法

* _profile.yml に追加

## setup
### SNSカウントを表示させるために、Facebook開発者用のトークンが必要

1. Facebook開発者キーが必要
    * https://developers.facebook.com/apps/576262853337658/settings/basic/
2. アクセストークンを取得
    * https://graph.facebook.com/oauth/access_token?client_id=xxx&client_secret=xxx&grant_type=client_credentials
    * 次のようなJSONが取得できるので、このaccess tokenの値を取得
{
"access_token": "xxx|xxx",
"token_type": "bearer"
}
3. アクセストークンが正常か確認
https://graph.facebook.com?id=https%3A%2F%2Ffuture-architect.github.io%2Farticles%2F20210313%2F&fields=engagement&access_token=xxx|xxx
4. 環境変数に設定
    * export FB_TOKEN=xxx|xxx

### Google Analytics

人気の記事を表示させるためGOOGLE_APPLICATION_CREDENTIALSが必要

> set GOOGLE_APPLICATION_CREDENTIALS キーパス

## View local server

```sh
$ cd ../
$ git clone --depth 1 https://github.com/future-architect/future-architect.github.io
$ cd future-architect.github.io
$ npm install

$ node_modules\.bin\hexo server
 --> http://localhost:4000 にページが表示されたら完了
```

## Deploy

`main` ブランチにマージトリガーでGitHub Actionsによりデプロイされる。

### SNSカウントの更新

GitHub Actions経由で実行されるため、通常開発者によるSNSカウントの更新は不要。

```sh
# インストール
go install github.com/ma91n/snssharecount/cmd/snssharecount@latest
go install github.com/ma91n/snssharecount/cmd/ga@latest
go install github.com/ma91n/snssharecount/cmd/pv@latest
```

実行

```sh
# 実行
set http_proxy=<proxy url>
set https_proxy=<proxy url>

snssharecount > temp.json
mv temp.json sns_count_cache.json

ga > ga_cache.json
pv > ga4_pv.json
```

## 画像圧縮

pngquantをインストールする

```sh
# ディレクトリ横断
pngquant */*.png --skip-if-larger --ext .png --force

# 特定ディレクトリ配下
pngquant *.png --skip-if-larger --ext .png --force
```

jpegoptimをインストールする
https://github.com/XhmikosR/jpegoptim-windows/releases/

```sh
# jpegoptimに再帰的オプションがなかったためbatファイルでラップした
# 月次で実行する
jpegoptimall.bat
```

## textlint

Installation

```sh
> npm install textlint --global
> npm install textlint-rule-preset-ja-technical-writing --global
> npm install textlint-rule-spellcheck-tech-word --global
```

Lint

```sh
> textlint source/_posts
```

Lint with lint-staged(staged files only)

```sh
git add source/_posts
npx lint-staged
```
---
title: "Vue製のUIをStorybook+Vitest Browser Modeでテストする"
date: 2025/10/17 00:00:00
postid: a
tag:
  - Vue.js
  - Vite
  - テスト
category:
  - Frontend
thumbnail: /images/2025/20251017a/thumbnail.png
author: 小杉山護
lede: "昨今では生成AIを用いたコーディング、Vibe Codingが盛んに行われていますね。人間の代わりに生成AIがコードを書いてくれるというのは非常に魅力的ですが、その過程で生み出されるコードの品質はまだまだ発展途上の段階にあります。"
---
<img src="/images/2025/20251017a/testing-you-can-trust.png" alt="" width="800" height="640" loading="lazy">

[Vue.js連載](/articles/20251016a/)の2本目です。

## はじめに

こんにちは。TIGでフロントエンドをガリガリやっている小杉山です。

昨今では生成AIを用いたコーディング、**Vibe Coding**が盛んに行われていますね。人間の代わりに生成AIがコードを書いてくれるというのは非常に魅力的ですが、その過程で生み出されるコードの品質はまだまだ発展途上の段階にあります。

そのため、必要最低限の品質を担保するガードレールとしての役割を果たす**テストコード**、そしてその**自動化**の重要性が非常に高まってきています。

今回はVue.js連載ということもあり、Vue.jsで記述されたUIコンポーネントや画面のテスト基盤を構築する選択肢の一つとして、**StorybookとVitest Browser Modeを組み合わせたテスト手法**を簡単に紹介します。

## 最近のStorybook

[Storybook](https://storybook.js.org/)はフロントエンド開発の生産性を高める素晴らしいツールです。以前はUIコンポーネントを一覧表示する「コンポーネントカタログ」としての利用が主流でした。

しかし、近年のStorybookはテスト関連の機能を大幅に強化しています。その中心的な機能の一つが、今回紹介する**Vitest**との連携です。この連携により、フロントエンド開発において信頼性の高いテストを効率よく進めていくことが可能になりました。

この「信頼性の高いテスト」を実現するための重要な要素の一つが、後述するVitest Browser Modeです。

## Vitest Browser Mode

従来[Jest](https://jestjs.io/)や[Vitest](https://vitest.dev/)を使用してフロントエンドのテストをする際、DOMに関しては[jsdom](https://github.com/jsdom/jsdom)や[happy-dom](https://github.com/capricorn86/happy-dom)を使用することで擬似的なブラウザ環境を再現していました。

しかしあくまで「擬似的な」ブラウザ環境なので、[`window`](https://developer.mozilla.org/ja/docs/Web/API/Window)オブジェクトや[`ResizeObserver`](https://developer.mozilla.org/ja/docs/Web/API/ResizeObserver)などのブラウザAPIはモックした上でテストしなければなりませんでした。

そんな時、Vitestに[Browser Mode (**Vitest Browser Mode**)](https://vitest.dev/guide/browser/)という機能が実装されました。

この機能によりテストコードの実行環境が擬似ブラウザ環境から（ユーザが使用する）ChromeやFirefoxといった実際のブラウザそのものに置き換わるので、より信頼性の高いテストが実施できます。

::: note
Vitestから[Playwright](https://playwright.dev/)や[WebdriverIO](https://webdriver.io/)といったE2Eテストツールを呼び出すことでブラウザを起動しています。
:::

::: note warn
Vitest Browser Modeは活用事例が増えつつあるものの、公式的にはまだ実験的な機能です。採用の検討は慎重に行なってください。またVitest Browser Modeはブラウザを起動するので、jsdomやhappy-domを使用している場合に比べてテスト実行時間が伸びてしまうことに注意が必要です。
:::

## 検証コード

テスト対象のUI、Storyファイル、そしてテストコードをざっくりと見ていきます。

### リポジトリ

検証コードはこちらのGitHubリポジトリにあります。

https://github.com/koralle/mock-webapp-with-vue-for-writing-article

### Vueコンポーネント

今回はテスト対象の画面として、以下の依存関係で構成される非常に簡易的なログイン画面を用意しました。
メールアドレスとパスワードを入力して「ログイン」ボタンを押下すると、ログインフォームの下部に「ログインに成功しました。」というメッセージを表示します。

|  | 名称 | バージョン |
| :-- | :-- | :-- |
| スタイリング | [Tailwind CSS](https://tailwindcss.com/) | v4.x |
| フォームバリデーション | [VeeValidate](https://vee-validate.logaretm.com/v4/) | v4.x |
| スキーマ | [Zod](https://zod.dev/) | v4.x |

```html LoginPage.vue
<script setup lang="ts">
import * as z from 'zod';
import Button from '../components/Button.vue';
import Input from '../components/Input.vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { ref, useId } from 'vue';

const hasCompletedSubmit = ref(false);

const loginSchema = z.object({
  email: z.email('有効なメールアドレスを入力してください。'),
  password: z
    .string('パスワードは必須です。')
    .max(128, 'パスワードは128文字以内で入力してください。')
    .regex(/^[a-zA-Z0-9]+$/, 'パスワードは半角英数字で入力してください。')
});

const { defineField, errors, handleSubmit } = useForm({
  validationSchema: toTypedSchema(loginSchema)
});

const [email, emailAttrs] = defineField('email');
const [password, passwordAttrs] = defineField('password');

const onSubmit = handleSubmit(() => {
  hasCompletedSubmit.value = true;
});

const emailId = useId();
const passwordId = useId();
</script>

<template>
  <form
    class="grid gap-10"
    @submit="onSubmit"
  >
    <fieldset class="grid gap-6">
      <label
        :for="emailId"
        class="grid gap-1"
      >
        <span>メールアドレス</span>
        <Input
          :id="emailId"
          name="email"
          required
          :invalid="Boolean(errors.email)"
          autocomplete="email"
          v-model="email"
          v-bind="emailAttrs"
        />
        <p class="text-red-500">{{ errors.email }}</p>
      </label>

      <label
        :for="passwordId"
        class="grid gap-1"
      >
        <span>パスワード</span>
        <Input
          :id="passwordId"
          name="password"
          required
          type="password"
          :invalid="Boolean(errors.password)"
          autocomplete="current-password"
          v-model="password"
          v-bind="passwordAttrs"
        />
        <p class="text-red-500">{{ errors.password }}</p>
      </label>
    </fieldset>

    <Button label="ログイン" />
  </form>

  <p
    v-if="hasCompletedSubmit"
    class="font-bold"
  >
    ログインに成功しました。
  </p>
</template>
```

<img src="/images/2025/20251017a/login-screen.png" class="img-frame-line" alt="login-screen.png" width="800" height="800" loading="lazy">

### Storyファイル

先述のログイン画面をStorybook上で管理するためのStoryファイルはこちらです。

::: note
簡単のため、一部のStoryは省略しています。
:::

```ts LoginPage.stories.ts
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect, within, userEvent } from 'storybook/test';

import LoginPage from '../pages/LoginPage.vue';

const meta = {
  title: '画面 / ログイン画面',
  component: LoginPage
} satisfies Meta<typeof LoginPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InitialState = {
  name: '初期表示'
} satisfies Story;

export const LoginCompleted = {
  name: 'ログイン成功',
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('メールアドレスを入力する', async () => {
      const emailInput = await canvas.findByRole('textbox', { name: 'メールアドレス' });
      await userEvent.type(emailInput, 'frontend@example.com', { delay: 100 });
    });

    await step('パスワードを入力する', async () => {
      const passwordInput = await canvas.findByLabelText('パスワード');
      await userEvent.type(passwordInput, 'password', { delay: 100 });
    });

    await step('「ログイン」ボタンをクリックする', async () => {
      const submitButton = await canvas.findByRole('button', { name: 'ログイン' });
      await userEvent.click(submitButton);
    });
  }
} satisfies Story;
```

「ログイン成功（`LoginCompleted`）」というStoryは文字通り「正常にログインが完了できる」というユーザシナリオを想定しており、そのユーザシナリオに沿った画面操作を[Play Function](https://storybook.js.org/docs/writing-stories/play-function)で記述しています。

Storybookを起動すると以下の画像のようになります。

「ログイン成功（`LoginCompleted`）」のStoryを開くと以下の画面操作が自動で実行され、ログイン後の画面状態を確認できます。

1. メールアドレスの入力
1. パスワードの入力
1. 「ログイン」ボタンの押下

<img src="/images/2025/20251017a/output-login-story.png" alt="output-login-story.png" width="1200" height="626" loading="lazy">

## Storybook + Vitest Browser ModeでVueのテストを書いてみよう

先述の「ユーザが正常にログインが完了できるシナリオ」を、StorybookとVitest Browser Modeを使ってテストしてみます。

テストコードは以下の手順となるように書きます。

1. Storyファイルに定義したPlay FunctionをVitestのテストコード上で再利用し、ブラウザ上でユーザ操作を実行する
2. 手順1の結果として得られるDOMの状態を検証する

Storyオブジェクトの`run()`メソッドを実行することで、Play Functionに記述した画面操作がブラウザ上で自動的に実行されます。これが手順1です。

手順2では、Vitest Browser ModeのAPIを用いて画面操作後のDOM状態を検証します。

これを実現するVitestのテストコードがこちらです。

```ts LoginPage.browser.test.ts
import { composeStories } from '@storybook/vue3-vite';
import { page } from '@vitest/browser/context';

import * as LoginPageStories from '../stories/LoginPage.stories';

const composedStories = composeStories(LoginPageStories);

describe('LoginPage', () => {
  describe('`ログイン成功`Storyに対するテスト', () => {
    const { LoginCompleted } = composedStories;

    test('ログインに成功すること', async () => {
      // ログイン操作の実行
      await LoginCompleted.run();

      // ログイン操作の実行結果を検証する
      const completedMessage = page.getByText('ログインに成功しました。');
      await expect.element(completedMessage).toBeVisible();
    });
  });
});
```

あとはターミナル上で`npx vitest`を実行することでテストを実行できます。

## まとめ

今回紹介したテスト手法の採用には以下のようなメリットがあります。

* jsdomやhappy-domを利用した擬似ブラウザ環境の代わりに実際のブラウザでテストを実行するため、より本番に近い環境でコンポーネントの動作を検証できる
* StorybookのPlay Functionで定義したユーザシナリオをそのままテストコードとして再利用できるため、テスト実装の効率が大幅に向上する

ただし、前述の通りVitest Browser Modeはまだ実験的な機能です。

導入の際はその点を考慮し、動作確認をしながら慎重に進めてください。

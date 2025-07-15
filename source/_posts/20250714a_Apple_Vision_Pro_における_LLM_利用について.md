---
title: "Apple Vision Pro における LLM 利用について"
date: 2025/07/14 00:00:00
postid: a
tag:
  - VisionPro
  - LLM
category:
  - VR
thumbnail: /images/20250714a/thumbnail.png
author: 山本力世
lede: "Apple Vision ProでLLMを利用する方法について整理していきます"
---
[AI Tips連載](/articles/20250707a/)の3本目の記事となります。

Apple Vision ProでLLMを利用する方法について整理します（ユーザ向けのAI機能であるApple Intelligence自身が提供する各機能については本記事では対象にしません）。

注）LLMは[Large Language Model](https://ja.wikipedia.org/wiki/%E5%A4%A7%E8%A6%8F%E6%A8%A1%E8%A8%80%E8%AA%9E%E3%83%A2%E3%83%87%E3%83%AB)の略称ですが、この記事では、[SML(Small Language Model)](https://ja.wikipedia.org/wiki/%E5%B0%8F%E8%A6%8F%E6%A8%A1%E8%A8%80%E8%AA%9E%E3%83%A2%E3%83%87%E3%83%AB)、[VML(Vision Language Model)](https://www.nvidia.com/ja-jp/glossary/vision-language-models/)、[基盤モデル(Foundation Model)](https://ja.wikipedia.org/wiki/%E5%9F%BA%E7%9B%A4%E3%83%A2%E3%83%87%E3%83%AB)などが指し示す概念についても包括して便宜的に「LLM」という単語を用いて説明しています。

# LLMの配置パターン

[Vision Pro](https://ja.wikipedia.org/wiki/Apple_Vision_Pro)で[LLM](https://ja.wikipedia.org/wiki/%E5%A4%A7%E8%A6%8F%E6%A8%A1%E8%A8%80%E8%AA%9E%E3%83%A2%E3%83%87%E3%83%AB)を利用する際のLLMをどこに置くかという観点から説明していきたいと思います。

# 1. クラウド上のLLMを利用する方法

<img src="/images/20250714a/cloudllm.png" alt="cloudllm.png" width="960" height="380" loading="lazy">

Vision Pro を Wi-Fiなどを経由してインターネットに接続し、クラウド上で提供されているLLMサービスへアクセスする方法です。
[OpenAI](https://openai.com/)、[Anthropic](https://www.anthropic.com/)、[Google](https://www.google.com/)などが提供しているLLMのAPIなどを利用する場合がこれに該当します。

利点としては、Vision Pro自身にモデルデータを格納する必要がなく、また、Vision Pro自身のコンピューティング能力に依存しないので性能のスケーラビリティがあり、かつ、利用する際のコード量も最小限で済むところです。欠点としては、インターネットへの接続が必要なことと、Vision Proからの情報がクラウド内へ流れてしまう点です。

# 2. ローカルネットワーク上のMac（やPC）のLLMを利用する方法

<img src="/images/20250714a/macllm.png" alt="macllm.png" width="960" height="424" loading="lazy">

Vision ProをWi-Fiなどを経由してローカルネットワークに接続し、Mac上で提供されているLLMサービスへアクセスする方法です。

利点としては、1と同じ点と、1で欠点としてあげていた点が生じないところになります。欠点としては、Mac上にLLMの環境をあらかじめ用意しておく必要がある点となります。こちらは[LM Studio](https://lmstudio.ai/)を使用するとお手軽に導入することが可能です。

Vision Proの場合、メモリ容量についてはバリエーションはなく16GBのみとなり、こちらが動作させることができるLLMのサイズに制限が大きくかかってくる点となります。なお、Mac上でLLMを動作させる場合は512GB搭載のMac Studioも選択肢として存在しますのでVision Proの場合と比べるとかなり利用するLLMの選択肢を広げることができます。

ちなみに、グラフィック描画については、Vision Pro上での描画をMac側へ移譲するような仕組みがありますが、そのLLM版みたいな感じなのがこちらの方法かと思います。

# 3. Vision Pro上のLLMを利用する方法

<img src="/images/20250714a/visionprollm.png" alt="visionprollm.png" width="960" height="398" loading="lazy">

Vision Pro上にLLMのモデルデータを組み込んで動作させる方法です。

利点としては、Vision Proの外に一切の情報が流れないところです。欠点としては、Vision Proの中にLLMのモデルデータを格納しないといけないので、その分、初めに大きめのサイズのデータをダウンロードする必要がある点と、その分、Vision Proのストレージを逼迫させてしまう点などになります。

なお、次期OSである[visionOS](https://ja.wikipedia.org/wiki/VisionOS) 26からは[Foundation Models framework](https://developer.apple.com/documentation/foundationmodels)という[Apple Intelligence](https://ja.wikipedia.org/wiki/Apple_Intelligence)の中核をなす、OSに組み込まれたオンデバイス基盤モデルを利用するための仕組みが用意されるのでこの欠点については緩和されるかもしれません。Vision Proには、[MacBook](https://ja.wikipedia.org/wiki/MacBook)/[Air](https://ja.wikipedia.org/wiki/MacBook_Air)/[Pro](https://ja.wikipedia.org/wiki/MacBook_Pro)や[iPad](https://ja.wikipedia.org/wiki/IPad)/[Pro](https://ja.wikipedia.org/wiki/IPad_Pro)などでも採用されている[Apple M2チップ](https://ja.wikipedia.org/wiki/Apple_M2)が搭載されています。

# Apple Silicon上でLLMを利用する

Vision ProやMac上でLLMを動かす場合は、[Apple Silicon](https://ja.wikipedia.org/wiki/Apple%E3%82%B7%E3%83%AA%E3%82%B3%E3%83%B3)内にある、CPU、GPU、[Neural Engine](https://en.wikipedia.org/wiki/Neural_Engine)の3つのいずれかでLLMを動かすることになります。

この時、Neural Engine上で動作させるためには、Appleが提供する[Core ML](https://developer.apple.com/documentation/coreml)を利用する必要があります。ただし、visionOS 2では企業向けにしか提供されていないため限定的な動作のみとなりますが、visionOS 26では一般向けでも利用できるようになるとのことです。

なお、Neural Engine以外の、CPU、GPU上で動作させる場合には、AppleがOSSで提供している[MLX](https://ml-explore.github.io/mlx/)を利用するのがApple Siliconの[UMA](https://ja.wikipedia.org/wiki/%E3%83%A6%E3%83%8B%E3%83%95%E3%82%A1%E3%82%A4%E3%83%89%E3%83%A1%E3%83%A2%E3%83%AA%E3%82%A2%E3%83%BC%E3%82%AD%E3%83%86%E3%82%AF%E3%83%81%E3%83%A3)に最適化されているのでオススメです。

Vision Proについては計算負荷が大きい場合にある程度動作リミッターがかかってしまいますが、企業向けには解除する方法も提供されています。

ちなみに、Vision Proに搭載されているM2チップの場合、CPUは高性能コアと高効率コアがそれぞれ4つ、GPUは10個、Neural Engineは16個のそれぞれマルチコアで構成されています。

<img src="/images/20250714a/applem2.png" alt="applem2.png" width="960" height="720" loading="lazy">

[Apple M2チップ](https://ja.wikipedia.org/wiki/Apple_M2)内の構成（チップ内の機能を抜粋して図示）

# LLM利用のサンプルコード

MLXを利用してLLMを動作させるためのサンプルソースコードは下記で公開されてますので、こちらを元に様々なLLMの動作を試してみると良いかと思います。主要なLLMを少し試したいだけならば、次の節で紹介しているアプリをAppStoreからインストールし、試してみると良いかと思います。

https://github.com/ml-explore/mlx-swift-examples/tree/main/Applications/LLMEval

また、本サンプルの実行については、下記のサイトで手順を追って丁寧に説明されていますので参考にしてみてください。

[iPad で、LLM を動作させる手順詳細（Deep Seek R1, Qwen , MLX）、オンデバイスAIに向けて](https://zenn.dev/open_developers/articles/7d00ccbbdda521)
<img src="/images/20250714a/IMG_0266.png" alt="IMG_0266.png" width="1200" height="675" loading="lazy">

# AppStoreで公開されているLLM関連アプリ

次に実際にAppStoreに公開されているVision Proで利用できる（他のAppleデバイスにも対応してます）アプリをいくつかあげておきます。

注）これらのアプリは私や当社が何らか動作や利用について何ら保障するものではありません

- [AI Pro - AIチャットボット助手](https://apps.apple.com/jp/app/ai-pro-ai%E3%83%81%E3%83%A3%E3%83%83%E3%83%88%E3%83%9C%E3%83%83%E3%83%88%E5%8A%A9%E6%89%8B/id6477226962)
  - 「1.クラウド上のLLMを利用する方法」の例
<img src="/images/20250714a/IMG_0265.png" alt="IMG_0265.png" width="1200" height="675" loading="lazy">

- [On-Device AI: Offline & Secure](https://apps.apple.com/jp/app/on-device-ai-offline-secure/id6497060890)
  - 「2. ローカルネットワーク上のMac（やPC）のLLMを利用する方法」「3. Vision Pro上のLLMを利用する方法」の例
<img src="/images/20250714a/IMG_0264.png" alt="IMG_0264.png" width="1200" height="675" loading="lazy">

- [fullmoon: local intelligence](https://apps.apple.com/jp/app/fullmoon-local-intelligence/id6727014156)
  - 「3. Vision Pro上のLLMを利用する方法」の例
<img src="/images/20250714a/IMG_0262.png" alt="IMG_0262.png" width="1200" height="675" loading="lazy">

# まとめ

今回は、Apple Vision ProにてLLMを利用したアプリの作成や実行についてまとめてみました。

より詳細な情報については、次の参考リンクでリストアップしていますので、そちらを参照してみてください。

# 参考リンク

- ML & AI
  - [WWDC25: Discover machine learning & AI frameworks on Apple platforms](https://developer.apple.com/videos/play/wwdc2025/360/)
- MLX
  - [WWDC25: Get started with MLX for Apple silicon](https://developer.apple.com/videos/play/wwdc2025/315/)
  - [WWDC25: Explore large language models on Apple silicon with MLX](https://developer.apple.com/videos/play/wwdc2025/298/)
- Foundation Models
- [WWDC25: Meet the Foundation Models framework](https://developer.apple.com/videos/play/wwdc2025/286/)
  - [WWDC25: Deep dive into the Foundation Models framework](https://developer.apple.com/videos/play/wwdc2025/301/)
  - [WWDC25: Explore prompt design & safety for on-device foundation models](https://developer.apple.com/videos/play/wwdc2025/248/)
  - [WWDC25: Code-along: Bring on-device AI to your app using the Foundation Models framework](https://developer.apple.com/videos/play/wwdc2025/259/)
- visionOS
  - [WWDC24: Introducing enterprise APIs for visionOS](https://developer.apple.com/videos/play/wwdc2024/10139/)
  - [WWDC25: Explore enhancements to your spatial business app](https://developer.apple.com/videos/play/wwdc2025/223/)
  - [WWDC25: What’s new in Metal rendering for immersive apps](https://developer.apple.com/videos/play/wwdc2025/294/)

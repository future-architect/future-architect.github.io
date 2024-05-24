---
title: "Future Tech Night #9「オンコール通知も全自動で! AWS + Datadog + PagerDuty で作る運用監視基盤」"
date: 2021/06/08 00:00:00
postid: a
tag:
  - AWS
  - TechNight
  - 保守運用
category:
  - Infrastructure
thumbnail: /images/20210608a/thumbnail.png
author: 木村拓海
lede: "「オンコール通知も全自動で! AWS + Datadog + PagerDuty で作る運用監視基盤」 というテーマでお話しました。監視 に関連するOSSやSaaSが乱立する昨今、Futureではとある案件で DatadogとPagerDutyをフル活用した運用監視基盤を一から構築しました。運用監視基盤に求められた要件とその設計、システムからDatadog/PagerDutyへの具体的な連携アーキテクチャ、運用してみての嬉しみ/辛み等を惜しみなくお話しました。"
---

# はじめに

こんにちは、TIGの木村です。先日2021/4/21(水)に [Future Tech Night #9 ～運用で後悔しないためのAWS設計術～](https://future.connpass.com/event/209778/) を開催しました。

私は **「オンコール通知も全自動で! AWS + Datadog + PagerDuty で作る運用監視基盤」** というテーマでお話しました。

同イベントにて発表された村瀬さんの [レポートはこちら](/articles/20210527a/) になります。

# 概要
監視 に関連するOSSやSaaSが乱立する昨今、Futureではとある案件で DatadogとPagerDutyをフル活用した運用監視基盤を一から構築しました。運用監視基盤に求められた要件とその設計、システム(AWS)からDatadog/PagerDutyへの具体的な連携アーキテクチャ、運用してみての嬉しみ/辛み等を惜しみなくお話しました。

その中から発表内容を一部抜粋して紹介いたします。

## 監視基盤要件と設計
<img src="/images/20210608a/image.png" alt="運用監視基盤要件" width="1200" height="402" loading="lazy">

<img src="/images/20210608a/image_2.png" alt="Why Datadog" width="1200" height="565" loading="lazy">

<img src="/images/20210608a/image_3.png" alt="Why PagerDurty" width="1200" height="586" loading="lazy">


## システム構成
<img src="/images/20210608a/image_4.png" alt="Metrics -> Datadog" width="1200" height="639" loading="lazy">

<img src="/images/20210608a/image_5.png" alt="Log -> Datadog" width="1200" height="477" loading="lazy">

<img src="/images/20210608a/image_6.png" alt="Datadog -> 通知先サービス" width="1200" height="491" loading="lazy">

## ここが素敵/辛い Datadog/PagerDuty
<img src="/images/20210608a/image_7.png" alt="Datadog" width="1200" height="492" loading="lazy">

<img src="/images/20210608a/image_8.png" alt="PagerDuty" width="120" height="285" loading="lazy">

# まとめ

ご参加いただいた方々、ありがとうございました。

本編ではもう少しDatadog, PagerDutyでできること/できないことを厚めに紹介できればよかったかな、と反省はありますが、少しでもお役に立てたなら幸いです。

FutureではFuture Tech Nightの他にも様々なイベントを開催しております。今後も皆様のご参加をお待ちしております。


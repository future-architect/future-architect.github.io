'use strict';

var moment = require("moment");

// Work In Progress
hexo.extend.helper.register('weekly_digest_mail_body', function() {

  const fromDate = moment().add(-7, 'd').format();

  const weeklyPosts = this.site.posts.reverse().filter(post => post.date.isAfter(fromDate)).slice(0, 30);
  const weeklyPostHTML = weeklyPosts.map(post => `<li style="margin:18px auto"><a href="/${post.path}" style="font-weight:bold;color:#0045ff;font-size:calc(0.93em + 0.2vw)" rel="noreferrer" target="_blank">${post.title}</a><p>${post.date.format("MM/DD")} by ${post.author}さん</p></li>`).join("\n")

  const currentYear =  new Date().getYear() + 1900;
  const currentMonth =  new Date().getMonth() + 1;
  const weeknumber = moment().week() - moment().startOf('months').week();

  return `
  <table style="width:100%;max-width:700px;margin:auto;font-size:18px">
  <tbody>
      <tr>
          <td style="padding:4%">
              <h1 style="text-align:center">Future Tech Blog Weekly Digest</h1>
              <p style="text-align:center"><a href="https://future-architect.github.io/">フューチャー技術ブログ</a>の${currentYear}年${currentMonth}月${weeknumber}週目の投稿サマリです🚀</p>
              <p style="text-align:center"> 経営とITをデザインする、フューチャーが運営しており、業務で利用している幅広い技術について紹介しています。 </p>

              <h2 style="text-align:center"> 最近投稿された記事 <img goomoji="2764" data-goomoji="2764"
                  style="margin:0 0.2ex;vertical-align:middle;max-height:24px" alt="❤"
                  src="https://mail.google.com/mail/e/2764" data-image-whitelisted="" class="CToWUd">️</h2>
              <ul>
                  ${weeklyPostHTML}
              </ul>
              <hr>

              <h2 style="text-align:center">お知らせ<img goomoji="2764" data-goomoji="2764"
                      style="margin:0 0.2ex;vertical-align:middle;max-height:24px" alt="❤"
                      src="https://mail.google.com/mail/e/2764" data-image-whitelisted="" class="CToWUd">️</h2>
              <p style="text-align:center">
                  アクセス数から算出した人気の記事ランキングをトップページに表示しています👑 珠玉の記事が揃っていますので見逃さないようにしましょう！<br><br>
                  技術ブログの告知をしているTwitterアカウントのフォロワー数が1100を突破しました🎉<br>
                  </p>

              <hr>
              <h2 style="text-align:center">記事についてのご意見<img goomoji="2764" data-goomoji="2764"
                  style="margin:0 0.2ex;vertical-align:middle;max-height:24px" alt="❤"
                  src="https://mail.google.com/mail/e/2764" data-image-whitelisted="" class="CToWUd">️</h2>
              <p style="text-align:center">
                  技術ブログへの記事に対する修正依頼は記事タイトルの✐マークから提案ができるようになりました。ぜひ活用ください<br>
          </td>
      </tr>
      <tr><td>
          <div style="text-align:center;padding-bottom:8px">
              <a href="https://twitter.com/future_techblog" rel="noreferrer" target="_blank"><img src="https://ci3.googleusercontent.com/proxy/RS8ZK3owPxpfrQnhd0MonzhumEyP0tdc0AWGs4gPBjTOWe2JZcGvOs-qBZrEAHgjadhN9EzqZUcGZYUDDV83bVtm=s0-d-e1-ft#https://techplay.jp/images/mail/icon_sns_tw.png" style="width:24px" class="CToWUd"></a>

              <a href="https://future-architect.github.io/atom.xml" style="margin-left:10px" rel="noreferrer" target="_blank"><img src="https://ci6.googleusercontent.com/proxy/WCh8YzsQsix2JAta2wA35SC-Tr505tCeN6cYBp91CgLxzLK00WYeOy2eKdiPLjc6HTX57TivzPIvTB_Zb13YxdMWhQ=s0-d-e1-ft#https://techplay.jp/images/mail/icon_sns_rss.png" style="width:24px" class="CToWUd"></a>
          </div>
      </td></tr>
      <tr>
          <td style="text-align:center; padding:3% 12% 2% 4%;font-size:0.8em;line-height:22px;color:#7d7d7d">
              © ${currentYear} フューチャー技術ブログ
        </td>
      </tr>
  </tbody>
  </table>`;
});

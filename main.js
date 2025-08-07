// --- データ・状態 ---
    const data = [
      { episode:"83", title:"#83 ゲスト：水野朔", guest:"水野朔", date:"2025-07-30", link:"https://www.youtube.com/watch?v=LcPFWQ5JdoU", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","本日のテーマ","結束バンドと私"], duration:"1:08:26" },
      { episode:"82", title:"#82 ゲスト：長谷川育美", guest:"長谷川育美", date:"2025-07-16", link:"https://www.youtube.com/watch?v=IdEStksoFaM", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:12:20" },
      { episode:"81", title:"#81 ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2025-07-02", link:"https://www.youtube.com/watch?v=FA7BqhR_AkQ", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:08:01" },
      { episode:"80", title:"#80", guest:"青山吉能", date:"2025-06-18", link:"https://www.youtube.com/watch?v=saAS_RHRhDI", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:04:09" },
      { episode:"79", title:"#79　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2025-06-04", link:"https://www.youtube.com/watch?v=QHmGJKLGJs4", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:05:00" },
      { episode:"78", title:"#78 ゲスト：長谷川育美", guest:"長谷川育美", date:"2025-05-21", link:"https://www.youtube.com/watch?v=sZ0ElkxOwkY", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:07:36" },
      { episode:"77", title:"#77 ゲスト：水野朔", guest:"水野朔", date:"2025-05-07", link:"https://www.youtube.com/watch?v=uJy5FqDPumk", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","本日のテーマ","結束バンドと私"], duration:"1:06:41" },
      { episode:"76", title:"#76　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2025-04-23", link:"https://www.youtube.com/watch?v=8tnv8TFsyTs", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:01:51" },
      { episode:"75", title:"#75", guest:"青山吉能", date:"2025-04-09", link:"https://www.youtube.com/watch?v=yA90NiAGuF8", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:05:33" },
      { episode:"74", title:"#74 ゲスト：水野朔", guest:"水野朔", date:"2025-03-26", link:"https://www.youtube.com/watch?v=hHfpdyDFN6U", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:05:11" },
      { episode:"73", title:"#73 ゲスト：鈴代紗弓、水野朔、長谷川育美", guest:["鈴代紗弓","水野朔","長谷川育美"], date:"2025-03-12", link:"https://www.youtube.com/watch?v=IaN7fW-RJPo", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ","水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ"], duration:"1:06:27" },
      { episode:"72", title:"#72", guest:"青山吉能", date:"2025-02-26", link:"https://www.youtube.com/watch?v=oLdNIIz3qWw", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:06:41" },
      { episode:"緊急", title:"特別編", guest:["斎藤圭一郎","山本ゆうすけ","けろりら"], date:"2025-02-15", link:"https://www.youtube.com/watch?v=P0ifdqZm8wo", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの","斎藤圭一郎","さいとうけいいちろう","けいいちろう","やまもとゆうすけ","山本ゆうすけ","けろりら","2期"], duration:"59:01" },
      { episode:"71", title:"#71　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2025-02-12", link:"https://www.youtube.com/watch?v=16fCDsC2Aks", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:05:44" },
      { episode:"70", title:"#70 ゲスト：長谷川育美", guest:"長谷川育美", date:"2025-01-29", link:"https://www.youtube.com/watch?v=_x5aMdhpeW8", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:05:59" },
      { episode:"69", title:"#69", guest:"青山吉能", date:"2025-01-15", link:"https://www.youtube.com/watch?v=_U9gzTHBSNo", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"56:40" },
      { episode:"68", title:"#68 ゲスト：鈴代紗弓、水野朔、長谷川育美", guest:["鈴代紗弓","水野朔","長谷川育美"], date:"2024-12-25", link:"https://www.youtube.com/watch?v=xcJYrnd1lmM", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ","水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","生配信・公録"], duration:"1:26:00" },
      { episode:"67", title:"#67", guest:"青山吉能", date:"2024-12-18", link:"https://www.youtube.com/watch?v=Z1Jp0XgIjhY", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"55:53" },
      { episode:"66", title:"#66　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2024-12-04", link:"https://www.youtube.com/watch?v=VOa30rMc_A8", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:00:21" },
      { episode:"65", title:"#65 ゲスト：水野朔", guest:"水野朔", date:"2024-11-20", link:"https://www.youtube.com/watch?v=vEZPauFTld0", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:07:25" },
      { episode:"64", title:"#64 ゲスト：長谷川育美", guest:"長谷川育美", date:"2024-11-06", link:"https://www.youtube.com/watch?v=SlqA0WLMIJY", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:09:03" },
      { episode:"63", title:"#63　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2024-10-23", link:"https://www.youtube.com/watch?v=qGlRPIDpQpQ", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:07:35" },
      { episode:"62", title:"#62", guest:"青山吉能", date:"2024-10-09", link:"https://www.youtube.com/watch?v=Auf-ShZED9A", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"50:22" },
      { episode:"61", title:"#61 ゲスト：長谷川育美", guest:"長谷川育美", date:"2024-09-25", link:"https://www.youtube.com/watch?v=w0v3hA1u_lw", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:06:09" },
      { episode:"60", title:"#60 ゲスト：水野朔", guest:"水野朔", date:"2024-09-11", link:"https://www.youtube.com/watch?v=fTtmFkt7dh8", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:04:50" },
      { episode:"59", title:"#59", guest:"青山吉能", date:"2024-08-28", link:"https://www.youtube.com/watch?v=uUlbEGKij0k", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"56:52" },
      { episode:"58", title:"#58 ゲスト：長谷川育美", guest:"長谷川育美", date:"2024-08-14", link:"https://www.youtube.com/watch?v=aJS3Gn27ecQ", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:12:11" },
      { episode:"57", title:"#57 ゲスト：鈴代紗弓、水野朔、長谷川育美", guest:["鈴代紗弓","水野朔","長谷川育美"], date:"2024-07-31", link:"https://www.youtube.com/watch?v=zNSZqWpbCjg", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ","水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ",], duration:"1:06:01" },
      { episode:"56", title:"#56", guest:"青山吉能", date:"2024-07-17", link:"https://www.youtube.com/watch?v=jWQZeh5QBEA", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:00:41" },
      { episode:"55", title:"#55 ゲスト：長谷川育美", guest:"長谷川育美", date:"2024-07-03", link:"https://www.youtube.com/watch?v=UH2tnm8-zFg", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik","NHKVenue101","ベニューワンオーワン"], duration:"1:07:06" },
      { episode:"54", title:"#54　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2024-06-19", link:"https://www.youtube.com/watch?v=D6h2j9TK95U", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:12:28" },
      { episode:"53", title:"#53", guest:"青山吉能", date:"2024-06-05", link:"https://www.youtube.com/watch?v=7yENoBuBn6k", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:10:52" },
      { episode:"52", title:"#52 ゲスト：水野朔", guest:"水野朔", date:"2024-05-22", link:"https://www.youtube.com/watch?v=35i46aXGr_U", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:09:04" },
      { episode:"51", title:"#51 ゲスト：長谷川育美", guest:"長谷川育美", date:"2024-05-08", link:"https://www.youtube.com/watch?v=bJNWOULhxFA", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:05:12" },
      { episode:"50", title:"#50　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2024-04-24", link:"https://www.youtube.com/watch?v=e2ZTylMTA9A", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:07:02" },
      { episode:"49", title:"#49", guest:"青山吉能", date:"2024-04-10", link:"https://www.youtube.com/watch?v=JxVrbUUC8uk", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"54:29" },
      { episode:"48", title:"#48 ゲスト：水野朔", guest:"水野朔", date:"2024-03-27", link:"https://www.youtube.com/watch?v=F_ydWMhlg9s", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:07:42" },
      { episode:"47", title:"#47　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2024-03-13", link:"https://www.youtube.com/watch?v=nSO14XAm2GI", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:07:14" },
      { episode:"46", title:"#46 ゲスト：長谷川育美", guest:"長谷川育美", date:"2024-02-28", link:"https://www.youtube.com/watch?v=ZHabLKrF-Aw", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:18:16" },
      { episode:"45", title:"#45", guest:"青山吉能", date:"2024-02-14", link:"https://www.youtube.com/watch?v=0nHtK3Zokmg", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:08:09" },
      { episode:"44", title:"#44　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2024-01-31", link:"https://www.youtube.com/watch?v=EoW2sRMJeYs", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:14:46" },
      { episode:"43", title:"#43 ゲスト：長谷川育美", guest:"長谷川育美", date:"2024-01-17", link:"https://www.youtube.com/watch?v=eBa39x7Y-wU", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik","NHKWORLDJAPANMusicFestival"], duration:"1:03:39" },
      { episode:"42", title:"#42 ゲスト：水野朔", guest:"水野朔", date:"2024-01-03", link:"https://www.youtube.com/watch?v=QOt1T9L3pwU", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"49:36" },
      { episode:"41", title:"#41 ゲスト：鈴代紗弓、水野朔、長谷川育美", guest:["鈴代紗弓","水野朔","長谷川育美"], date:"2023-12-20", link:"https://www.youtube.com/watch?v=QYL0t78oGTY", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ","水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","おしゃべりピンク","ハッピーイエロー","ヒーリングブルー","パワフルレッド"], duration:"1:14:01" },
      { episode:"40", title:"#40", guest:"青山吉能", date:"2023-12-06", link:"https://www.youtube.com/watch?v=FHYxRO_3_VE", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:13:19" },
      { episode:"39", title:"#39 ゲスト：長谷川育美", guest:"長谷川育美", date:"2023-11-22", link:"https://www.youtube.com/watch?v=Ej1RFoHLtdg", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik","NHKWORLDJAPANMusicFestival"], duration:"1:09:32" },
      { episode:"38", title:"#38 ゲスト：小岩井ことり", guest:"小岩井ことり", date:"2023-11-08", link:"https://www.youtube.com/watch?v=mmHhbqnSoWs", keywords:["小岩井ことり","こっこちゃん","ことりん","ことピー","ことにゃん","ことたま","こいわいことり"], duration:"1:07:44" },
      { episode:"37", title:"#37 ゲスト：水野朔", guest:"水野朔", date:"2023-10-25", link:"https://www.youtube.com/watch?v=uB_S_JdKmkM", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:07:44" },
      { episode:"36", title:"#36 ゲスト：和多田美咲", guest:"和多田美咲", date:"2023-10-11", link:"https://www.youtube.com/watch?v=gkgQkrTc0qU", keywords:["和多田美咲","わっちゃん","わただみさき"], duration:"1:20:26" },
      { episode:"35", title:"#35　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2023-09-27", link:"https://www.youtube.com/watch?v=NQx1S6RyK38", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:06:56" },
      { episode:"34", title:"#34 ゲスト：千本木彩花", guest:"千本木彩花", date:"2023-09-13", link:"https://www.youtube.com/watch?v=ghFq5nTxOwQ", keywords:["千本木彩花","ぼんちゃん","ぽんちゃん","さやか","せんぼんぎさやか","NHKWORLDJAPANMusicFestival"], duration:"1:09:34" },
      { episode:"33", title:"#33 ゲスト：長谷川育美", guest:"長谷川育美", date:"2023-08-30", link:"https://www.youtube.com/watch?v=OL8SskfX6eA", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik",], duration:"1:13:19" },
      { episode:"32", title:"#32 ゲスト：内田真礼", guest:"内田真礼", date:"2023-08-16", link:"https://www.youtube.com/watch?v=0TiPEETSxUo", keywords:["内田真礼","まややん","まれいたそ","うちだまあや"], duration:"1:07:19" },
      { episode:"31", title:"#31", guest:"青山吉能", date:"2023-08-02", link:"https://www.youtube.com/watch?v=Fv_9fQ3PFRY", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:12:37" },
      { episode:"30", title:"#30 ゲスト：水野朔", guest:"水野朔", date:"2023-07-19", link:"https://www.youtube.com/watch?v=JmSomKpSL-M", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:10:41" },
      { episode:"29", title:"#29　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2023-07-05", link:"https://www.youtube.com/watch?v=Xg1ozrPAwDI", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:04:08" },
      { episode:"28", title:"#28", guest:"青山吉能", date:"2023-06-21", link:"https://www.youtube.com/watch?v=_SUn0OWQo2k", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:11:00" },
      { episode:"27", title:"#27 ゲスト：水野朔", guest:"水野朔", date:"2023-06-07", link:"https://www.youtube.com/watch?v=HqKaV7V4L7A", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:02:45" },
      { episode:"26", title:"#26 ゲスト：長谷川育美", guest:"長谷川育美", date:"2023-05-24", link:"https://www.youtube.com/watch?v=OL8SskfX6eA", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik","結束バンドLIVE恒星","恒星","こうせい",], duration:"1:07:08" },
      { episode:"25", title:"#25　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2023-05-10", link:"https://www.youtube.com/watch?v=WsfRhqaLO_k", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:10:38" },
      { episode:"24", title:"#24", guest:"青山吉能", date:"2023-04-26", link:"https://www.youtube.com/watch?v=efXr9X648so", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの","ぼっち・ざ・ろっく！です。","ぼざろです"], duration:"54:09" },
      { episode:"23", title:"#23", guest:"青山吉能", date:"2023-04-12", link:"https://www.youtube.com/watch?v=_8-sk4OwB78", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの","エロ女上司","えろおんなじょうし"], duration:"1:11:46" },
      { episode:"22", title:"#22 ゲスト：鈴代紗弓、水野朔、長谷川育美", guest:["鈴代紗弓","水野朔","長谷川育美"], date:"2023-03-29", link:"https://www.youtube.com/watch?v=mwJeACqV2Oc", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ","水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","生配信・公録","ラッキーボタン","藤田亜紀子","ふじたあきこ","ｵﾓｼﾛｲｯ!","ダジャレ","匂わせ"], duration:"1:27:48" },
      { episode:"21", title:"#21", guest:"青山吉能", date:"2023-03-15", link:"https://www.youtube.com/watch?v=kUbnGEpkT6E", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの","エロ女上司","えろおんなじょうし"], duration:"56:46" },
      { episode:"20", title:"#20 ゲスト：長谷川育美", guest:"長谷川育美", date:"2023-03-01", link:"https://www.youtube.com/watch?v=VN95H7KjuL0", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik","優しさで言ってない","やさしさでいってない",], duration:"1:02:01" },
      { episode:"19", title:"#19 ゲスト：水野朔", guest:"水野朔", date:"2023-02-15", link:"https://www.youtube.com/watch?v=cAx6-HQejSI", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:03:29" },
      { episode:"18", title:"#18　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2023-02-01", link:"https://www.youtube.com/watch?v=VN5u1Jc3H5I", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:13:42" },
      { episode:"17", title:"#17 ゲスト：鈴代紗弓、水野朔、長谷川育美", guest:["鈴代紗弓","水野朔","長谷川育美"], date:"2023-01-18", link:"https://www.youtube.com/watch?v=YTAG14wJsc0", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ","水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ"], duration:"1:08:18" },
      { episode:"16", title:"#16", guest:"青山吉能", date:"2023-01-04", link:"https://www.youtube.com/watch?v=bCNwtnv-3Qk", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:14:41" },
      { episode:"15", title:"#15 ゲスト：水野朔", guest:"水野朔", date:"2022-12-28", link:"https://www.youtube.com/watch?v=Xz8iTj-5Ndw", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:07:26" },
      { episode:"14", title:"#14　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2022-12-21", link:"https://www.youtube.com/watch?v=SonCPSaBlKA", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:12:51" },
      { episode:"13", title:"#13 ゲスト：長谷川育美", guest:"長谷川育美", date:"2022-12-14", link:"https://www.youtube.com/watch?v=8zIajtpgosA", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:09:06" },
      { episode:"12", title:"#12 ゲスト：水野朔", guest:"水野朔", date:"2022-12-07", link:"https://www.youtube.com/watch?v=yqHK0r7qhvk", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:09:41" },
      { episode:"11", title:"#11 ゲスト：長谷川育美", guest:"長谷川育美", date:"2022-11-30", link:"https://www.youtube.com/watch?v=gzKy7Y10h4g", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:08:40" },
      { episode:"10", title:"#10　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2022-11-23", link:"https://www.youtube.com/watch?v=-bgKWbqNyN0", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:02:39" },
      { episode:"09", title:"#09", guest:"青山吉能", date:"2022-11-16", link:"https://www.youtube.com/watch?v=OKHnZk0o9lM", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:05:40" },
      { episode:"08", title:"#08 ゲスト：長谷川育美", guest:"長谷川育美", date:"2022-11-09", link:"https://www.youtube.com/watch?v=0Vz-WHfPrI4", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:04:24" },
      { episode:"07", title:"#07 ゲスト：水野朔", guest:"水野朔", date:"2022-11-02", link:"https://www.youtube.com/watch?v=JQ_xgtun1kQ", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:05:36" },
      { episode:"06", title:"#06　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2022-10-26", link:"https://www.youtube.com/watch?v=f18K3nc2wAw", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:06:11" },
      { episode:"05", title:"#05 ゲスト：長谷川育美", guest:"長谷川育美", date:"2022-10-19", link:"https://www.youtube.com/watch?v=4hcPzIW8MfE", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"58:15" },
      { episode:"04", title:"#04 ゲスト：水野朔", guest:"水野朔", date:"2022-10-12", link:"https://www.youtube.com/watch?v=ieCOGEOXxr8", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:06:40" },
      { episode:"03", title:"#03　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2022-10-05", link:"https://www.youtube.com/watch?v=4c_DVoq-9oU", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:07:18" },
      { episode:"02", title:"#02 ゲスト：水野朔、長谷川育美", guest:["水野朔","長谷川育美"], date:"2022-09-21", link:"https://www.youtube.com/watch?v=kct8627dspo", keywords:["3mm","ｵﾓｼﾛｲｯ!","水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","生配信・公録"], duration:"1:07:41" },
      { episode:"01", title:"#01", guest:"青山吉能", date:"2022-09-07", link:"https://www.youtube.com/watch?v=__P57MTTjyw", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"55:53" },

    ];
    let selectedGuests = [];
    let selectedCorners = [];
    let selectedOthers = [];
    let selectedYears = [];
    let currentPage = 1;
    const pageSize = 20;
    let lastResults = [];
    const guestColorMap = {
      "青山吉能": "#fa01fa", "鈴代紗弓": "#fdfe0f", "水野朔": "#15f4f3", "長谷川育美": "#f93e07",
      "内田真礼": "#f09110", "千本木彩花": "#bbc3b8", "和多田美咲": "#a8eef4", "小岩井ことり": "#494386"
    };
    function getThumbnail(url) {
      const m = url.match(/[?&]v=([^&]+)/);
      return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : "";
    }
    function getHashNumber(title) {
      const match = title.match(/#(\d+)/);
      return match ? `#${match[1]}` : title;
    }
    function toHiragana(str) {
      return str.replace(/[ァ-ン]/g, s => String.fromCharCode(s.charCodeAt(0) - 0x60));
    }
    function normalize(s){
      return toHiragana(s.normalize("NFKC").toLowerCase().replace(/\s+/g,""));
    }
    function getEpisodeNumber(episode) {
      if (/^\d+$/.test(episode)) return parseInt(episode, 10);
      if (episode === "緊急" || episode === "特別編") return -1;
      return -2;
    }
    function updateActiveFilters() {
      const $area = $("#filtersBar");
      $area.empty();
      let tags = [];
      selectedGuests.forEach(g => {
if (g === "結束バンド") {
    tags.push(`<button class="filter-tag" tabindex="0" aria-label="出演者フィルタ解除 ${g}" data-type="guest" data-value="${g}" style="background:linear-gradient(90deg, #fa01fa 0% 25%, #fdfe0f 25% 50%, #15f4f3 50% 75%, #f93e07 75% 100%);color:#222;border:none;"><i class="fa fa-user"></i> ${g} <i class="fa fa-xmark"></i></button>`);
  } else {
    tags.push(`<button class="filter-tag" tabindex="0" aria-label="出演者フィルタ解除 ${g}" data-type="guest" data-value="${g}" style="${guestColorMap[g] ? 'background:' + guestColorMap[g] + ';color:#222;' : ''}"><i class="fa fa-user"></i> ${g} <i class="fa fa-xmark"></i></button>`);
  }
      });
      selectedCorners.forEach(c => {
        tags.push(`<button class="filter-tag" tabindex="0" aria-label="コーナーフィルタ解除 ${c}" data-type="corner" data-value="${c}"><i class="fa fa-cubes"></i> ${c} <i class="fa fa-xmark"></i></button>`);
      });
      selectedOthers.forEach(o => {
        tags.push(`<button class="filter-tag" tabindex="0" aria-label="その他フィルタ解除 ${o}" data-type="other" data-value="${o}"><i class="fa fa-star"></i> ${o} <i class="fa fa-xmark"></i></button>`);
      });
      selectedYears.forEach(y => {
        tags.push(`<button class="filter-tag" tabindex="0" aria-label="年フィルタ解除 ${y}" data-type="year" data-value="${y}"><i class="fa fa-calendar"></i> ${y} <i class="fa fa-xmark"></i></button>`);
      });
      if ($("#searchBox").val().trim()) {
        tags.unshift(`<button class="filter-tag" tabindex="0" aria-label="キーワード解除" data-type="keyword" data-value=""><i class="fa fa-search"></i> "${$("#searchBox").val().trim()}" <i class="fa fa-xmark"></i></button>`);
      }
      $area.html(tags.join(""));
    }
    function renderPagination(totalCount) {
      const $area = $("#paginationArea");
      $area.empty();
      const totalPage = Math.ceil(totalCount / pageSize);
      if (totalPage <= 1) return;
      let html = "";
      for(let i=1;i<=totalPage;i++) {
        html += `<button class="page-btn${i===currentPage?' active':''}" data-page="${i}" tabindex="0" aria-label="ページ${i}">${i}</button>`;
      }
      $area.html(html);
    }
    function search(opts = {}) {
      let raw = $("#searchBox").val().trim();
      const sort = $("#sortSelect").val();
      let res = [...data];
      if (raw.length > 0) {
        const kw = normalize(raw);
        const kwWords = kw.split(/[\s、,]+/).filter(Boolean);
        res = res.filter(it => {
          const combined = [it.title, it.guest, it.keywords.join(" ")].join(" ");
          const text = normalize(combined);
          return kwWords.every(w => text.includes(w));
        });
      }
      if (selectedGuests.length) {
  res = res.filter(it => {
    let guestArr = [];
    if (Array.isArray(it.guest)) guestArr = it.guest;
    else if (typeof it.guest === "string") guestArr = [it.guest];
    else guestArr = [];
    // 「結束バンド」選択時（すでに導入済み）
    if (selectedGuests.includes("結束バンド")) {
      const kessokuMembers = ["鈴代紗弓", "水野朔", "長谷川育美"];
      return kessokuMembers.every(member => guestArr.includes(member));
    }
    // ★ここから追加！「その他」選択時
    if (selectedGuests.includes("その他")) {
      const mainGuests = [
        "青山吉能", "鈴代紗弓", "水野朔", "長谷川育美",
        "内田真礼", "千本木彩花", "和多田美咲", "小岩井ことり"
      ];
      // mainGuests に含まれない名前が一人でもいればヒット
      return guestArr.some(name => !mainGuests.includes(name));
    }
    // それ以外は従来通り
    return selectedGuests.some(sel => guestArr.includes(sel));
  });
}

      if (selectedOthers.length) res = res.filter(it => {
        const combined = [it.title, it.guest, it.keywords.join(" ")].join(" ");
        const textNorm = normalize(combined);
        return selectedOthers.every(o => textNorm.includes(normalize(o)));
      });
      if (selectedCorners.length) res = res.filter(it => {
        const combinedNorm = normalize(it.title + " " + it.keywords.join(" "));
        return selectedCorners.some(c => combinedNorm.includes(normalize(c)));
      });
      if (selectedYears.length) {
        res = res.filter(it => {
          let year = "";
          if (it.date) {
            year = String(it.date).slice(0,4);
          }
          return selectedYears.includes(String(year));
        });
      }
      // 並び替え
      if (sort === "newest") {
        res.sort((a, b) => {
          const dateDiff = new Date(b.date) - new Date(a.date);
          if (dateDiff !== 0) return dateDiff;
          return getEpisodeNumber(b.episode) - getEpisodeNumber(a.episode);
        });
      } else if (sort === "oldest") {
        res.sort((a, b) => {
          const dateDiff = new Date(a.date) - new Date(b.date);
          if (dateDiff !== 0) return dateDiff;
          return getEpisodeNumber(a.episode) - getEpisodeNumber(b.episode);
        });
      } else if (sort === "longest" || sort === "shortest") {
        const toSec = s => {
          if (!s) return 0;
          const parts = s.split(":").map(Number);
          if (parts.length === 3) { return parts[0] * 3600 + parts[1] * 60 + parts[2]; }
          else if (parts.length === 2) { return parts[0] * 60 + parts[1]; }
          return Number(s) || 0;
        };
        res.sort((a, b) => {
          const da = toSec(a.duration);
          const db = toSec(b.duration);
          if (sort === "longest") return db - da;
          else return da - db;
        });
      }
      lastResults = res;
      $("#fixedResultsCount").text(`表示数：${res.length}件`);
      currentPage = opts.gotoPage || 1;
      renderResults(res, currentPage);
      renderPagination(res.length);
      updateActiveFilters();
    }

    
    function renderResults(arr, page=1) {
      const ul = $("#results");
      ul.empty();
      if (!arr.length) {
        ul.html(`<li class="episode-item no-results">
          <div>ﾉ°(6ᯅ9)「な、何も表示されない...」</div>
        </li>`);
        return;
      }
      const startIdx = (page-1)*pageSize, endIdx = page*pageSize;
      arr.slice(startIdx, endIdx).forEach(it => {
        const thumb = getThumbnail(it.link);
        const hashOnly = getHashNumber(it.title);
        let guestText = "";
        if (Array.isArray(it.guest)) guestText = "ゲスト：" + it.guest.join("、");
        else if (it.guest === "青山吉能") guestText = "パーソナリティ：青山吉能";
        else if (it.guest && it.guest !== "その他") guestText = `ゲスト：${it.guest}`;
        ul.append(`<li class="episode-item" role="link" tabindex="0">
          <a href="${it.link}" target="_blank" rel="noopener" style="display:flex;gap:13px;text-decoration:none;color:inherit;align-items:center;min-width:0;">
            <img src="${thumb}" class="thumbnail" alt="サムネイル：${hashOnly}">
            <div style="min-width:0;">
              <div class="d-flex align-items-start justify-content-between" style="min-width:0;">
                <h5 class="mb-1">${hashOnly}<br>${guestText}</h5>
              </div>
              <p class="episode-meta">公開日時：${it.date}<br>動画時間：${it.duration || "?"}</p>
            </div>
          </a>
        </li>`);
      });
    }
    function resetFilters() {
      selectedGuests = [];
      selectedCorners = [];
      selectedOthers = [];
      selectedYears = [];
      updateGuestButtonStyles();
      updateCornerStyles();
      updateOtherStyles();
      updateYearStyles();
      search();
    }
    function resetSearch() {
      $("#searchBox").val("");
      $("#sortSelect").val("newest");
      resetFilters();
    }
    function updateGuestButtonStyles() {
      $(".guest-button").each(function() {
        const guest = $(this).data("guest");
        if (selectedGuests.includes(guest)) {
          $(this).addClass('active').attr("aria-pressed","true");
          $(this).css({background:"#ece8ff", color:"#242943", borderColor:"#6c60e8"});
        } else {
          $(this).removeClass('active').attr("aria-pressed","false");
          $(this).css({background:"", color:"", borderColor:""});
        }
      });
    }
    function updateCornerStyles() {
      $(".btn-corner[data-corner]").each(function() {
        const corner = $(this).data("corner");
        if (selectedCorners.includes(corner)) $(this).addClass("active").attr("aria-pressed","true");
        else $(this).removeClass("active").attr("aria-pressed","false");
      });
    }
    function updateOtherStyles() {
      $("#otherButtonGroup .btn-corner").each(function() {
        const o=$(this).data("other");
        if (selectedOthers.includes(o)) $(this).addClass("active").attr("aria-pressed","true");
        else $(this).removeClass("active").attr("aria-pressed","false");
      });
    }
    function updateYearStyles() {
      $(".btn-year").each(function() {
        const year = String($(this).data("year"));
        if (selectedYears.includes(year)) $(this).addClass("active").attr("aria-pressed","true");
        else $(this).removeClass("active").attr("aria-pressed","false");
      });
    }
    function updateDrawerTop() {
      const sbar = $(".sticky-search-area")[0];
      const drawer = $("#filterDrawer")[0];
      if (drawer && sbar) {
        const rect = sbar.getBoundingClientRect();
        const headerHeight = rect.height;
        drawer.style.position = "fixed";
        drawer.style.left = "50%";
        drawer.style.transform = "translateX(-50%)";
        drawer.style.right = "";
        drawer.style.top = (rect.top + headerHeight + 8) + "px";
        const winHeight = window.innerHeight;
        const drawerHeight = drawer.offsetHeight || 340;
        if ((rect.top + headerHeight + 8 + drawerHeight) > (winHeight - 12)) {
          drawer.style.maxHeight = (winHeight - (rect.top + headerHeight + 20)) + "px";
        } else {
          drawer.style.maxHeight = "";
        }
      }
    }
    let filterDrawerOpen = false;
    function toggleFilterDrawer(force) {
      if (force !== undefined) filterDrawerOpen = force;
      else filterDrawerOpen = !filterDrawerOpen;
      if (filterDrawerOpen) {
        // --- 常に中央位置に ---
        updateDrawerTop();
        $("#filterDrawer")
          .css({
            left: "50%",
            transform: "translateX(-50%)",
            right: "",
            display: "block"
          })
          .fadeIn(100);
        $("#drawerBackdrop").addClass("show");
        $("#filterToggleBtn").attr("aria-expanded", true).attr("aria-pressed", true);
      } else {
        $("#filterDrawer").fadeOut(90);
        $("#drawerBackdrop").removeClass("show");
        $("#filterToggleBtn").attr("aria-expanded", false).attr("aria-pressed", false);
      }
    }
    $(function() {
      search();
      $(".guest-button").on("click keypress", function(e) {
        if(e.type==="click"||(e.type==="keypress"&&(e.key==="Enter"||e.key===" "))) {
          const name = $(this).data("guest");
          const idx = selectedGuests.indexOf(name);
          if (idx >= 0) selectedGuests.splice(idx, 1);
          else selectedGuests.push(name);
          updateGuestButtonStyles();
          search();
        }
      });
      $("#cornerButtonGroup").on("click keypress", ".btn-corner", function(e) {
        if(e.type==="click"||(e.type==="keypress"&&(e.key==="Enter"||e.key===" "))) {
          const name = $(this).data("corner");
          if(!name) return;
          const idx = selectedCorners.indexOf(name);
          if (idx >= 0) selectedCorners.splice(idx,1);
          else selectedCorners.push(name);
          updateCornerStyles();
          search();
        }
      });
      $("#otherButtonGroup").on("click keypress", ".btn-corner", function(e) {
        if(e.type==="click"||(e.type==="keypress"&&(e.key==="Enter"||e.key===" "))) {
          const name = $(this).data("other");
          if(!name) return;
          const idx = selectedOthers.indexOf(name);
          if (idx >= 0) selectedOthers.splice(idx,1);
          else selectedOthers.push(name);
          updateOtherStyles();
          search();
        }
      });
      // 年フィルタも他と完全統一（String比較）
      $("#yearButtonGroup").on("click keypress", ".btn-year", function(e) {
        if(e.type==="click"||(e.type==="keypress"&&(e.key==="Enter"||e.key===" "))) {
          const year = String($(this).data("year"));
          const idx = selectedYears.indexOf(year);
          if (idx >= 0) selectedYears.splice(idx, 1);
          else selectedYears.push(year);
          updateYearStyles();
          search();
        }
      });
      $("#filterToggleBtn").on("click keypress", function(e){
        if(e.type==="click"||(e.type==="keypress"&&(e.key==="Enter"||e.key===" "))) {
          toggleFilterDrawer();
        }
      });
      $("#drawerBackdrop").on("click", ()=>toggleFilterDrawer(false));
      $(window).on("resize", updateDrawerTop);
      $("#paginationArea").on("click keypress", ".page-btn", function(e) {
        if(e.type==="click"||(e.type==="keypress"&&(e.key==="Enter"||e.key===" "))) {
          currentPage = parseInt($(this).data("page"));
          renderResults(lastResults, currentPage);
          renderPagination(lastResults.length);
          $("html,body").animate({scrollTop: $(".main-content").offset().top-24}, 180);
        }
      });
      $("#filtersBar").on("click keypress", ".filter-tag", function(e) {
        if(e.type==="click"||(e.type==="keypress"&&(e.key==="Enter"||e.key===" "))) {
          const type = $(this).data("type");
          let val = $(this).data("value");
          if (type === "guest") selectedGuests = selectedGuests.filter(g=>g!==val);
          else if (type === "corner") selectedCorners = selectedCorners.filter(c=>c!==val);
          else if (type === "other") selectedOthers = selectedOthers.filter(o=>o!==val);
          else if (type === "year") {
            // 年フィルターはStringで厳密比較
            selectedYears = selectedYears.filter(y=>String(y)!==String(val));
            updateYearStyles();
          }
          else if (type === "keyword") $("#searchBox").val("");
          updateGuestButtonStyles();
          updateCornerStyles();
          updateOtherStyles();
          search();
        }
      });
      $(".reset-btn").on("click keypress", function(e) {
        if(e.type==="click"||(e.type==="keypress"&&(e.key==="Enter"||e.key===" "))) {
          resetSearch();
        }
      });
      $(document).on("click", function(e){
        if(filterDrawerOpen && !$(e.target).closest("#filterDrawer,#filterToggleBtn").length){
          toggleFilterDrawer(false);
        }
      });
      window.addEventListener("scroll", updateDrawerTop);
      window.addEventListener("resize", updateDrawerTop);
      // 初期化
      updateGuestButtonStyles();
      updateCornerStyles();
      updateOtherStyles();
      updateYearStyles();
    });

    // トップへ戻るボタンの表示制御
window.addEventListener("scroll", function(){
  const btn = document.getElementById("toTopBtn");
  if(window.scrollY > 120){
    btn.style.display = "block";
    btn.style.opacity = 1;
  } else {
    btn.style.opacity = 0;
    setTimeout(() => { if(window.scrollY < 120) btn.style.display = "none"; }, 200);
  }
});

document.getElementById("toTopBtn").onclick = function(){
  window.scrollTo({ top: 0, behavior: 'smooth' });
};


// ダークモード切り替え
document.getElementById("darkModeBtn").onclick = function(){
  document.body.classList.toggle("dark-mode");
  // お好みでローカルストレージに記録も可能
  if(document.body.classList.contains("dark-mode")){
    localStorage.setItem("dark-mode", "on");
    this.textContent = "☀";
  } else {
    localStorage.setItem("dark-mode", "off");
    this.textContent = "🌙";
  }
};
// ページ読込時に前回の設定を反映
window.addEventListener("DOMContentLoaded", function(){
  if(localStorage.getItem("dark-mode")==="on"){
    document.body.classList.add("dark-mode");
    document.getElementById("darkModeBtn").textContent = "☀";
  }
});

// Safari対策を含めたローディング解除コード
window.addEventListener('load', function() {
  // ロゴフェードイン
  $("#loading-logo").addClass("fadein");
  // 少し待ってローディング画面をフェードアウト
  setTimeout(function() {
    $("#loading-screen").addClass("fadeout");
    setTimeout(function() {
      $("#loading-screen").remove();
    }, 1000);
  }, 950);
});


// 「このサイトについて」表示・非表示
$('#aboutSiteLink').on('click', function(e) {
  e.preventDefault();
  $('#aboutModal').fadeIn(150, function() {
    $(this).css('display', 'flex');
  });
});
$('#aboutCloseBtn, #aboutModal').on('click', function(e) {
  if (e.target.id === "aboutModal" || e.target.id === "aboutCloseBtn") {
    $('#aboutModal').fadeOut(130);
  }
});
$('#aboutModalContent').on('click', function(e) {
  e.stopPropagation();
});

// 右クリック・長押し禁止（PC・スマホ）
document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
document.addEventListener('touchstart', function(e) {
  if (e.touches.length > 1) e.preventDefault();
}, {passive:false});

// PCの右クリック時にモーダルを表示
document.addEventListener('contextmenu', function(e) {
  if(window.innerWidth > 700) { // PCと判断（必要なら調整）
    e.preventDefault();
    document.getElementById('rcModal').style.display = 'flex';
  } else {
    e.preventDefault(); // スマホは普通に禁止のみ
  }
});

// モーダルの閉じる処理
document.getElementById('rcClose').onclick =
document.getElementById('rcOk').onclick = function() {
  document.getElementById('rcModal').style.display = 'none';
};
// モーダルクリック時、ウィンドウ外クリックで閉じる（お好みで）
document.getElementById('rcModal').addEventListener('click', function(e){
  if(e.target === this) this.style.display='none';
});


// 検索ボタンやページ移動の関数内で currentPage をグローバル管理すること
window.currentPage = 1; // グローバル変数を用意（既にあれば不要）

window.addEventListener('DOMContentLoaded', function() {
  // 初期化
  if (typeof search === 'function') {
    window.currentPage = 1;
    search(1); // 1ページ目を明示的に呼ぶ
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.getElementById('mainContent')?.scrollIntoView({behavior: 'auto'});
    }, 300);
  }
});



window.addEventListener('DOMContentLoaded', function() {
  if (typeof currentPage !== "undefined") currentPage = 1;
  if (typeof search === "function") search(1);
  setTimeout(function() {
    window.scrollTo(0, 0);
    document.getElementById('mainContent')?.scrollIntoView({ behavior: 'auto' });
  }, 400);
});



// フィルター表示時
$('#filterToggleBtn').on('click', function() {
  const isOpen = $('#filterDrawer').is(':visible');
  if (!isOpen) {
    $('#drawerBackdrop').addClass('show');
    $('#filterDrawer').show();
    $('body').css('overflow', 'hidden');
  } else {
    $('#drawerBackdrop').removeClass('show');
    $('#filterDrawer').hide();
    $('body').css('overflow', '');
  }
});
$('#drawerBackdrop').on('click', function() {
  $(this).removeClass('show');
  $('#filterDrawer').hide();
  $('body').css('overflow', '');
});

// このサイトについてモーダル
$('#aboutSiteLink').on('click', function(e) {
  e.preventDefault();
  $('#aboutModal').show();
  $('body').css('overflow', 'hidden');
});
$('#aboutCloseBtn').on('click', function() {
  $('#aboutModal').hide();
  $('body').css('overflow', '');
});

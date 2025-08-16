// --- データ・状態 ---
    const data = [
      { episode:"84", title:"#84　", guest:"青山吉能", date:"2025-08-13", link:"https://www.youtube.com/watch?v=4l77d67EiPc", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"57:46" },
      { episode:"83", title:"#83　ゲスト：水野朔", guest:"水野朔", date:"2025-07-30", link:"https://www.youtube.com/watch?v=LcPFWQ5JdoU", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","本日のテーマ","結束バンドと私"], duration:"1:08:26" },
      { episode:"82", title:"#82　ゲスト：長谷川育美", guest:"長谷川育美", date:"2025-07-16", link:"https://www.youtube.com/watch?v=IdEStksoFaM", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:12:20" },
      { episode:"81", title:"#81　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2025-07-02", link:"https://www.youtube.com/watch?v=FA7BqhR_AkQ", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:08:01" },
      { episode:"80", title:"#80　", guest:"青山吉能", date:"2025-06-18", link:"https://www.youtube.com/watch?v=saAS_RHRhDI", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:04:09" },
      { episode:"79", title:"#79　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2025-06-04", link:"https://www.youtube.com/watch?v=QHmGJKLGJs4", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:05:00" },
      { episode:"78", title:"#78　ゲスト：長谷川育美", guest:"長谷川育美", date:"2025-05-21", link:"https://www.youtube.com/watch?v=sZ0ElkxOwkY", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:07:36" },
      { episode:"77", title:"#77　ゲスト：水野朔", guest:"水野朔", date:"2025-05-07", link:"https://www.youtube.com/watch?v=uJy5FqDPumk", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","本日のテーマ","結束バンドと私"], duration:"1:06:41" },
      { episode:"76", title:"#76　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2025-04-23", link:"https://www.youtube.com/watch?v=8tnv8TFsyTs", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:01:51" },
      { episode:"75", title:"#75　", guest:"青山吉能", date:"2025-04-09", link:"https://www.youtube.com/watch?v=yA90NiAGuF8", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:05:33" },
      { episode:"74", title:"#74　ゲスト：水野朔", guest:"水野朔", date:"2025-03-26", link:"https://www.youtube.com/watch?v=hHfpdyDFN6U", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:05:11" },
      { episode:"73", title:"#73　ゲスト：鈴代紗弓、水野朔、長谷川育美", guest:["鈴代紗弓","水野朔","長谷川育美"], date:"2025-03-12", link:"https://www.youtube.com/watch?v=IaN7fW-RJPo", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ","水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ"], duration:"1:06:27" },
      { episode:"72", title:"#72　", guest:"青山吉能", date:"2025-02-26", link:"https://www.youtube.com/watch?v=oLdNIIz3qWw", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:06:41" },
      { episode:"緊急", title:"特別編　", guest:["斎藤圭一郎","山本ゆうすけ","けろりら"], date:"2025-02-15", link:"https://www.youtube.com/watch?v=P0ifdqZm8wo", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの","斎藤圭一郎","さいとうけいいちろう","やまもとゆうすけ","山本ゆうすけ","けろりら","2期"], duration:"59:01" },
      { episode:"71", title:"#71　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2025-02-12", link:"https://www.youtube.com/watch?v=16fCDsC2Aks", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:05:44" },
      { episode:"70", title:"#70　ゲスト：長谷川育美", guest:"長谷川育美", date:"2025-01-29", link:"https://www.youtube.com/watch?v=_x5aMdhpeW8", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:05:59" },
      { episode:"69", title:"#69　", guest:"青山吉能", date:"2025-01-15", link:"https://www.youtube.com/watch?v=_U9gzTHBSNo", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"56:40" },
      { episode:"68", title:"#68　ゲスト：鈴代紗弓、水野朔、長谷川育美", guest:["鈴代紗弓","水野朔","長谷川育美"], date:"2024-12-25", link:"https://www.youtube.com/watch?v=xcJYrnd1lmM", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ","水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","生配信・公録"], duration:"1:26:00" },
      { episode:"67", title:"#67　", guest:"青山吉能", date:"2024-12-18", link:"https://www.youtube.com/watch?v=Z1Jp0XgIjhY", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"55:53" },
      { episode:"66", title:"#66　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2024-12-04", link:"https://www.youtube.com/watch?v=VOa30rMc_A8", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:00:21" },
      { episode:"65", title:"#65　ゲスト：水野朔", guest:"水野朔", date:"2024-11-20", link:"https://www.youtube.com/watch?v=vEZPauFTld0", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:07:25" },
      { episode:"64", title:"#64　ゲスト：長谷川育美", guest:"長谷川育美", date:"2024-11-06", link:"https://www.youtube.com/watch?v=SlqA0WLMIJY", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:09:03" },
      { episode:"63", title:"#63　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2024-10-23", link:"https://www.youtube.com/watch?v=qGlRPIDpQpQ", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:07:35" },
      { episode:"62", title:"#62　", guest:"青山吉能", date:"2024-10-09", link:"https://www.youtube.com/watch?v=Auf-ShZED9A", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"50:22" },
      { episode:"61", title:"#61　ゲスト：長谷川育美", guest:"長谷川育美", date:"2024-09-25", link:"https://www.youtube.com/watch?v=w0v3hA1u_lw", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:06:09" },
      { episode:"60", title:"#60　ゲスト：水野朔", guest:"水野朔", date:"2024-09-11", link:"https://www.youtube.com/watch?v=fTtmFkt7dh8", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:04:50" },
      { episode:"59", title:"#59　", guest:"青山吉能", date:"2024-08-28", link:"https://www.youtube.com/watch?v=uUlbEGKij0k", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"56:52" },
      { episode:"58", title:"#58　ゲスト：長谷川育美", guest:"長谷川育美", date:"2024-08-14", link:"https://www.youtube.com/watch?v=aJS3Gn27ecQ", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:12:11" },
      { episode:"57", title:"#57　ゲスト：鈴代紗弓、水野朔、長谷川育美", guest:["鈴代紗弓","水野朔","長谷川育美"], date:"2024-07-31", link:"https://www.youtube.com/watch?v=zNSZqWpbCjg", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ","水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ",], duration:"1:06:01" },
      { episode:"56", title:"#56　", guest:"青山吉能", date:"2024-07-17", link:"https://www.youtube.com/watch?v=jWQZeh5QBEA", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:00:41" },
      { episode:"55", title:"#55　ゲスト：長谷川育美", guest:"長谷川育美", date:"2024-07-03", link:"https://www.youtube.com/watch?v=UH2tnm8-zFg", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik","NHKVenue101","べにゅー101"], duration:"1:07:06" },
      { episode:"54", title:"#54　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2024-06-19", link:"https://www.youtube.com/watch?v=D6h2j9TK95U", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:12:28" },
      { episode:"53", title:"#53　", guest:"青山吉能", date:"2024-06-05", link:"https://www.youtube.com/watch?v=7yENoBuBn6k", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:10:52" },
      { episode:"52", title:"#52　ゲスト：水野朔", guest:"水野朔", date:"2024-05-22", link:"https://www.youtube.com/watch?v=35i46aXGr_U", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:09:04" },
      { episode:"51", title:"#51　ゲスト：長谷川育美", guest:"長谷川育美", date:"2024-05-08", link:"https://www.youtube.com/watch?v=bJNWOULhxFA", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:05:12" },
      { episode:"50", title:"#50　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2024-04-24", link:"https://www.youtube.com/watch?v=e2ZTylMTA9A", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:07:02" },
      { episode:"49", title:"#49　", guest:"青山吉能", date:"2024-04-10", link:"https://www.youtube.com/watch?v=JxVrbUUC8uk", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"54:29" },
      { episode:"48", title:"#48　ゲスト：水野朔", guest:"水野朔", date:"2024-03-27", link:"https://www.youtube.com/watch?v=F_ydWMhlg9s", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:07:42" },
      { episode:"47", title:"#47　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2024-03-13", link:"https://www.youtube.com/watch?v=nSO14XAm2GI", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ","薮崎D","やぶさき"], duration:"1:07:14" },
      { episode:"46", title:"#46　ゲスト：長谷川育美", guest:"長谷川育美", date:"2024-02-28", link:"https://www.youtube.com/watch?v=ZHabLKrF-Aw", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:18:16" },
      { episode:"45", title:"#45　", guest:"青山吉能", date:"2024-02-14", link:"https://www.youtube.com/watch?v=0nHtK3Zokmg", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:08:09" },
      { episode:"44", title:"#44　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2024-01-31", link:"https://www.youtube.com/watch?v=EoW2sRMJeYs", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:14:46" },
      { episode:"43", title:"#43　ゲスト：長谷川育美", guest:"長谷川育美", date:"2024-01-17", link:"https://www.youtube.com/watch?v=eBa39x7Y-wU", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik","NHKWORLDJAPANMusicFestival"], duration:"1:03:39" },
      { episode:"42", title:"#42　ゲスト：水野朔", guest:"水野朔", date:"2024-01-03", link:"https://www.youtube.com/watch?v=QOt1T9L3pwU", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"49:36" },
      { episode:"41", title:"#41　ゲスト：鈴代紗弓、水野朔、長谷川育美", guest:["鈴代紗弓","水野朔","長谷川育美"], date:"2023-12-20", link:"https://www.youtube.com/watch?v=QYL0t78oGTY", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ","水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","おしゃべりピンク","ハッピーイエロー","ヒーリングブルー","パワフルレッド"], duration:"1:14:01" },
      { episode:"40", title:"#40　", guest:"青山吉能", date:"2023-12-06", link:"https://www.youtube.com/watch?v=FHYxRO_3_VE", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:13:19" },
      { episode:"39", title:"#39　ゲスト：長谷川育美", guest:"長谷川育美", date:"2023-11-22", link:"https://www.youtube.com/watch?v=Ej1RFoHLtdg", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik","NHKWORLDJAPANMusicFestival"], duration:"1:09:32" },
      { episode:"38", title:"#38　ゲスト：小岩井ことり", guest:"小岩井ことり", date:"2023-11-08", link:"https://www.youtube.com/watch?v=mmHhbqnSoWs", keywords:["小岩井ことり","こっこちゃん","ことりん","ことピー","ことにゃん","ことたま","こいわいことり"], duration:"1:07:44" },
      { episode:"37", title:"#37　ゲスト：水野朔", guest:"水野朔", date:"2023-10-25", link:"https://www.youtube.com/watch?v=uB_S_JdKmkM", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:07:44" },
      { episode:"36", title:"#36　ゲスト：和多田美咲", guest:"和多田美咲", date:"2023-10-11", link:"https://www.youtube.com/watch?v=gkgQkrTc0qU", keywords:["和多田美咲","わっちゃん","わただみさき"], duration:"1:20:26" },
      { episode:"35", title:"#35　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2023-09-27", link:"https://www.youtube.com/watch?v=NQx1S6RyK38", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:06:56" },
      { episode:"34", title:"#34　ゲスト：千本木彩花", guest:"千本木彩花", date:"2023-09-13", link:"https://www.youtube.com/watch?v=ghFq5nTxOwQ", keywords:["千本木彩花","ぼんちゃん","ぽんちゃん","さやか","せんぼんぎさやか","NHKWORLDJAPANMusicFestival"], duration:"1:09:34" },
      { episode:"33", title:"#33　ゲスト：長谷川育美", guest:"長谷川育美", date:"2023-08-30", link:"https://www.youtube.com/watch?v=OL8SskfX6eA", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik",], duration:"1:13:19" },
      { episode:"32", title:"#32　ゲスト：内田真礼", guest:"内田真礼", date:"2023-08-16", link:"https://www.youtube.com/watch?v=0TiPEETSxUo", keywords:["内田真礼","まややん","まれいたそ","うちだまあや"], duration:"1:07:19" },
      { episode:"31", title:"#31　", guest:"青山吉能", date:"2023-08-02", link:"https://www.youtube.com/watch?v=Fv_9fQ3PFRY", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:12:37" },
      { episode:"30", title:"#30　ゲスト：水野朔", guest:"水野朔", date:"2023-07-19", link:"https://www.youtube.com/watch?v=JmSomKpSL-M", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:10:41" },
      { episode:"29", title:"#29　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2023-07-05", link:"https://www.youtube.com/watch?v=Xg1ozrPAwDI", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:04:08" },
      { episode:"28", title:"#28　", guest:"青山吉能", date:"2023-06-21", link:"https://www.youtube.com/watch?v=_SUn0OWQo2k", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:11:00" },
      { episode:"27", title:"#27　ゲスト：水野朔", guest:"水野朔", date:"2023-06-07", link:"https://www.youtube.com/watch?v=HqKaV7V4L7A", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:02:45" },
      { episode:"26", title:"#26　ゲスト：長谷川育美", guest:"長谷川育美", date:"2023-05-24", link:"https://www.youtube.com/watch?v=L8mHUOlAw64", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik","恒星","こうせい",], duration:"1:07:08" },
      { episode:"25", title:"#25　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2023-05-10", link:"https://www.youtube.com/watch?v=WsfRhqaLO_k", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:10:38" },
      { episode:"24", title:"#24　", guest:"青山吉能", date:"2023-04-26", link:"https://www.youtube.com/watch?v=efXr9X648so", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの","ぼっち・ざ・ろっく！です。","ぼざろです"], duration:"54:09" },
      { episode:"23", title:"#23　", guest:"青山吉能", date:"2023-04-12", link:"https://www.youtube.com/watch?v=_8-sk4OwB78", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの","エロ女上司","えろおんなじょうし"], duration:"1:11:46" },
      { episode:"22", title:"#22　ゲスト：鈴代紗弓、水野朔、長谷川育美", guest:["鈴代紗弓","水野朔","長谷川育美"], date:"2023-03-29", link:"https://www.youtube.com/watch?v=mwJeACqV2Oc", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ","水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","生配信・公録","ラッキーボタン@45:15","藤田亜紀子@45:15","ふじたあきこ@45:15","ｵﾓｼﾛｲｯ!","ダジャレ","匂わせ","におわせ"], duration:"1:27:48" },
      { episode:"21", title:"#21　", guest:"青山吉能", date:"2023-03-15", link:"https://www.youtube.com/watch?v=kUbnGEpkT6E", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの","エロ女上司","えろおんなじょうし"], duration:"56:46" },
      { episode:"20", title:"#20　ゲスト：長谷川育美", guest:"長谷川育美", date:"2023-03-01", link:"https://www.youtube.com/watch?v=VN95H7KjuL0", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik","優しさで言ってない","やさしさでいってない",], duration:"1:02:01" },
      { episode:"19", title:"#19　ゲスト：水野朔", guest:"水野朔", date:"2023-02-15", link:"https://www.youtube.com/watch?v=cAx6-HQejSI", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:03:29" },
      { episode:"18", title:"#18　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2023-02-01", link:"https://www.youtube.com/watch?v=VN5u1Jc3H5I", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:13:42" },
      { episode:"17", title:"#17　ゲスト：鈴代紗弓、水野朔、長谷川育美", guest:["鈴代紗弓","水野朔","長谷川育美"], date:"2023-01-18", link:"https://www.youtube.com/watch?v=YTAG14wJsc0", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ","水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ"], duration:"1:08:18" },
      { episode:"16", title:"#16　", guest:"青山吉能", date:"2023-01-04", link:"https://www.youtube.com/watch?v=bCNwtnv-3Qk", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:14:41" },
      { episode:"15", title:"#15　ゲスト：水野朔", guest:"水野朔", date:"2022-12-28", link:"https://www.youtube.com/watch?v=Xz8iTj-5Ndw", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:07:26" },
      { episode:"14", title:"#14　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2022-12-21", link:"https://www.youtube.com/watch?v=SonCPSaBlKA", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:12:51" },
      { episode:"13", title:"#13　ゲスト：長谷川育美", guest:"長谷川育美", date:"2022-12-14", link:"https://www.youtube.com/watch?v=8zIajtpgosA", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:09:06" },
      { episode:"12", title:"#12　ゲスト：水野朔", guest:"水野朔", date:"2022-12-07", link:"https://www.youtube.com/watch?v=yqHK0r7qhvk", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:09:41" },
      { episode:"11", title:"#11　ゲスト：長谷川育美", guest:"長谷川育美", date:"2022-11-30", link:"https://www.youtube.com/watch?v=gzKy7Y10h4g", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:08:40" },
      { episode:"10", title:"#10　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2022-11-23", link:"https://www.youtube.com/watch?v=-bgKWbqNyN0", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:02:39" },
      { episode:"09", title:"#09　", guest:"青山吉能", date:"2022-11-16", link:"https://www.youtube.com/watch?v=OKHnZk0o9lM", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"], duration:"1:05:40" },
      { episode:"08", title:"#08　ゲスト：長谷川育美", guest:"長谷川育美", date:"2022-11-09", link:"https://www.youtube.com/watch?v=0Vz-WHfPrI4", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik"], duration:"1:04:24" },
      { episode:"07", title:"#07　ゲスト：水野朔", guest:"水野朔", date:"2022-11-02", link:"https://www.youtube.com/watch?v=JQ_xgtun1kQ", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","スパムバーガー","フレッシュネスバーガー",], duration:"1:05:36" },
      { episode:"06", title:"#06　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2022-10-26", link:"https://www.youtube.com/watch?v=f18K3nc2wAw", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:06:11" },
      { episode:"05", title:"#05　ゲスト：長谷川育美", guest:"長谷川育美", date:"2022-10-19", link:"https://www.youtube.com/watch?v=4hcPzIW8MfE", keywords:["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","よぴいく","ypik","ぼっち・ざ・おーでぃしょん！@45:17"], duration:"58:15" },
      { episode:"04", title:"#04　ゲスト：水野朔", guest:"水野朔", date:"2022-10-12", link:"https://www.youtube.com/watch?v=ieCOGEOXxr8", keywords:["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく",], duration:"1:06:40" },
      { episode:"03", title:"#03　ゲスト：鈴代紗弓", guest:"鈴代紗弓", date:"2022-10-05", link:"https://www.youtube.com/watch?v=4c_DVoq-9oU", keywords:["鈴代紗弓","さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"], duration:"1:07:18" },
      { episode:"02", title:"#02　ゲスト：水野朔、長谷川育美", guest:["水野朔","長谷川育美"], date:"2022-09-21", link:"https://www.youtube.com/watch?v=kct8627dspo", keywords:["3mm","ｵﾓｼﾛｲｯ!","水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","生配信・公録","藤田亜紀子@4:26","ふじたあきこ@4:26"], duration:"1:07:41" },
      { episode:"02", title:"京まふ大作戦2022　", guest:["水野朔","長谷川育美"], date:"2022-09-18", link:"https://www.youtube.com/watch?v=EDay9btUsKw", keywords:["3mm","ｵﾓｼﾛｲｯ!","水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく","長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ","生配信・公録","京まふ","きょうまふ"], duration:"54:45" },
      { episode:"01", title:"#01　", guest:"青山吉能", date:"2022-09-07", link:"https://www.youtube.com/watch?v=__P57MTTjyw", keywords:["青山吉能","よぴ","よしの","よっぴー","あおやまよしの","ぼっち共感@27:49","ウソ陽キャ辞典@43:23","ラッキーボタン@50:44"], duration:"55:53" },

    ];
    let selectedGuests = [];
    let selectedCorners = [];
    let selectedOthers = [];
    let selectedYears = [];
    let currentPage = 1;
    const pageSize = 20;
    let lastResults = [];

// === Favorites ===
const FAV_KEY = 'str_favs_v1';
let favorites = loadFavs();
let showFavoritesOnly = false;

function getVideoId(link) {
  const m = (link || '').match(/(?:v=|be\/)([\w-]{11})/);
  return m ? m[1] : link;
}
function loadFavs() {
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveFavs() { localStorage.setItem(FAV_KEY, JSON.stringify([...favorites])); }
function isFavorite(id) { return favorites.has(id); }
function toggleFavorite(id) { favorites.has(id) ? favorites.delete(id) : favorites.add(id); saveFavs(); }


    const guestColorMap = {
      "青山吉能": "#fa01fa", "鈴代紗弓": "#fdfe0f", "水野朔": "#15f4f3", "長谷川育美": "#f93e07",
      "内田真礼": "#f09110", "千本木彩花": "#bbc3b8", "和多田美咲": "#a8eef4", "小岩井ことり": "#494386"
    };

    // タイトル整形（全角スペースで改行）
    function formatTitle(title) {
    return title.replace(/\u3000/g, '<br>');
    }


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

    // ===== URL <-> State sync =====
let isRestoringURL = false;

function readMulti(params, key) {
  const all = params.getAll(key);
  if (all.length === 1 && all[0].includes(',')) {
    return all[0].split(',').map(decodeURIComponent).filter(Boolean);
  }
  return all.map(decodeURIComponent).filter(Boolean);
}

function buildURLFromState({ method = 'push' } = {}) {
  if (isRestoringURL) return;
  const params = new URLSearchParams();

  const q = $("#searchBox").val().trim();
  if (q) params.set('q', q);

  // 配列はキーの複数回出現で表現（g=..&g=..）
  selectedGuests.forEach(v => params.append('g', v));
  selectedCorners.forEach(v => params.append('c', v));
  selectedOthers.forEach(v => params.append('o', v));
  selectedYears.forEach(y => params.append('y', String(y)));

  const sort = $("#sortSelect").val();
  if (sort) params.set('sort', sort);

  if (showFavoritesOnly) params.set('fav', '1');
  if (currentPage > 1) params.set('p', String(currentPage));

  const qs = params.toString();
  const url = qs ? `?${qs}` : location.pathname;

  const state = {
    q, selectedGuests, selectedCorners, selectedOthers, selectedYears,
    sort, fav: showFavoritesOnly, p: currentPage
  };
  try {
    history[method === 'replace' ? 'replaceState' : 'pushState'](state, '', url);
  } catch {}
}

function applyStateFromURL({ replace = false } = {}) {
  const params = new URLSearchParams(location.search);
  if (![...params.keys()].length) return false;

  isRestoringURL = true;

  const q = params.get('q') || '';
  $('#searchBox').val(q);

  selectedGuests = readMulti(params, 'g');
  selectedCorners = readMulti(params, 'c');
  selectedOthers  = readMulti(params, 'o');
  selectedYears   = readMulti(params, 'y').map(String);

  const sort = params.get('sort') || 'newest';
  $('#sortSelect').val(sort);

  showFavoritesOnly = params.get('fav') === '1';
  $('#favOnlyToggleBtn')
    .toggleClass('active', showFavoritesOnly)
    .attr('aria-pressed', showFavoritesOnly);
  document.body.classList.toggle('fav-only', showFavoritesOnly);

  updateGuestButtonStyles();
  updateCornerStyles();
  updateOtherStyles();
  updateYearStyles();

  const p = parseInt(params.get('p') || '1', 10);
  currentPage = Number.isFinite(p) && p > 0 ? p : 1;

  search({ gotoPage: currentPage });

  isRestoringURL = false;
  if (replace) buildURLFromState({ method: 'replace' });
  return true;
}

// 戻る/進む対策
window.addEventListener('popstate', () => {
  applyStateFromURL({ replace: false });
});


    // --- keyword に付けた @mm:ss / @hh:mm:ss を読む ---
function parseKeywordTime(kw) {
  if (typeof kw !== "string") return null;
  const m = kw.match(/^(.*)@(\d{1,2}:\d{2}(?::\d{2})?)$/);
  if (!m) return null;
  const base = m[1].trim();
  const label = m[2];
  const parts = label.split(":").map(n => parseInt(n,10));
  const seconds = parts.length === 3
    ? parts[0]*3600 + parts[1]*60 + parts[2]
    : parts[0]*60 + parts[1];
  return { base, label, seconds };
}

// --- YouTube の URL に t=sec を付ける（既存 t は付け替え） ---
function withTimeParam(url, seconds) {
  if (!seconds) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete("t");
    u.searchParams.set("t", String(seconds));    // 例: &t=83
    return u.toString();
  } catch {
    const cleaned = url.replace(/([?&])t=\d+s?(?=&|$)/, "$1").replace(/[?&]$/, "");
    return cleaned + (cleaned.includes("?") ? "&" : "?") + "t=" + seconds;
  }
}

// --- 検索語と keyword@time を“部分一致”で探して 1件返す ---
// 例: keywords に「ラッキーボタン@45:15」登録、検索語が「らっきー」でもヒット
function findHitTime(item, rawQuery) {
  if (!rawQuery) return null;
  const qn = normalize(rawQuery);             // ひらがな・小文字・空白除去
  if (!qn) return null;

  for (const kw of (item.keywords || [])) {
    const p = parseKeywordTime(kw);
    if (!p) continue;
    const baseN = normalize(p.base);

    // ★ 部分一致（双方向）：検索語 ⊂ キーワード名 も キーワード名 ⊂ 検索語 もOK
    if (baseN.includes(qn) || qn.includes(baseN)) {
      return p;  // 最初に見つかったものを返す（複数あれば一番上）
    }
  }
  return null;
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
    const guestArr =
      Array.isArray(it.guest) ? it.guest :
      (typeof it.guest === "string" ? [it.guest] : []);

    const hasKessoku = selectedGuests.includes("結束バンド");
    const hasOthers  = selectedGuests.includes("その他");
    const indivGuests = selectedGuests.filter(g => g !== "結束バンド" && g !== "その他");

    let match = false;

    // 個別ゲストは OR
    if (indivGuests.length) {
      match = indivGuests.some(sel => guestArr.includes(sel));
    }

    // 結束バンド（全員回）は OR で加算
    if (hasKessoku) {
      const kessokuMembers = ["鈴代紗弓", "水野朔", "長谷川育美"];
      const isKessoku = kessokuMembers.every(m => guestArr.includes(m));
      match = match || isKessoku;
    }

    // 「その他」も OR で加算
    if (hasOthers) {
      const mainGuests = [
        "青山吉能","鈴代紗弓","水野朔","長谷川育美",
        "内田真礼","千本木彩花","和多田美咲","小岩井ことり"
      ];
      const isOther = guestArr.some(name => !mainGuests.includes(name));
      match = match || isOther;
    }

    return match;
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
      
      // お気に入りだけ表示（トグル時）
if (showFavoritesOnly) {
  res = res.filter(it => isFavorite(getVideoId(it.link)));
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
      if (!isRestoringURL) { buildURLFromState({ method: 'push' }); }

    
      renderResults(res, currentPage);
      fitGuestLines(); // ゲスト行の幅調整
      window.addEventListener('resize', () => setTimeout(fitGuestLines, 30));
      window.addEventListener('orientationchange', () => setTimeout(fitGuestLines, 120));
      renderPagination(res.length);

      updateActiveFilters();
    }


    // === ゲスト行のオートフィット（PCのみ実行） ===
function fitGuestLines() {
  document.querySelectorAll('.guest-one-line').forEach(el => {
    // まず基準サイズに戻す（16px想定。変えたいなら調整OK）
    el.style.fontSize = '';
    const maxPx = parseFloat(getComputedStyle(el).fontSize) || 16;
    let size = maxPx;
    const isMobile = window.innerWidth <= 900;
    const minPx = isMobile ? 9 : 11; // 900px以下は少し小さめまで許容
    // はみ出している間は小さくしていく
    while (el.scrollWidth > el.clientWidth && size > minPx) {
      size -= 0.5;
      el.style.fontSize = size + 'px';
    }
  });
}
function renderResults(arr, page = 1) {
  const ul = $("#results");
  ul.empty();

  if (!Array.isArray(arr) || arr.length === 0) {
    $("#results").html(
      `<li class="no-results">${
        showFavoritesOnly
          ? "お気に入りはありません。<br>★を押して登録してください。"
          : "ﾉ°(6ᯅ9) "
      }</li>`
    );
    return;
  }

  const startIdx = (page - 1) * pageSize, endIdx = page * pageSize;
  const qRaw = $("#searchBox").val().trim(); // 検索語
  // コーナーフィルタが1つだけ選ばれている時は、そのコーナー名も時刻探索に使う
  const cornerTarget =
    Array.isArray(selectedCorners) && selectedCorners.length === 1
      ? selectedCorners[0]
      : null;

  arr.slice(startIdx, endIdx).forEach(it => {
    const thumb = getThumbnail(it.link);
    const hashOnly = getHashNumber(it.title);

    // 1) 検索語で keyword@mm:ss を探す → 2) ダメならコーナー名で探す
    let hit = findHitTime(it, qRaw);
    if (!hit && cornerTarget) hit = findHitTime(it, cornerTarget);

    // ヒットしていたら &t=sec を付与したURLに差し替え
    const finalLink = hit ? withTimeParam(it.link, hit.seconds) : it.link;

    let guestText = "";
    if (Array.isArray(it.guest)) guestText = "ゲスト：" + it.guest.join("、");
    else if (it.guest === "青山吉能") guestText = "パーソナリティ：青山吉能";
    else if (it.guest && it.guest !== "その他") guestText = `ゲスト：${it.guest}`;

    ul.append(`
      <li class="episode-item" role="link" tabindex="0">
        <a href="${finalLink}" target="_blank" rel="noopener"
           style="display:flex;gap:13px;text-decoration:none;color:inherit;align-items:center;min-width:0;">
          <div class="thumb-col">
            <img src="${thumb}" class="thumbnail" alt="サムネイル：${hashOnly}">
            ${hit ? `
              <div class="ts-buttons">
                <button class="ts-btn" data-url="${it.link}" data-ts="${hit.seconds}"
                        aria-label="${hit.label} から再生">${hit.label}</button>
              </div>` : ``}
          </div>
          <div style="min-width:0;">
            <div class="d-flex align-items-start justify-content-between" style="min-width:0;">
              <h5 class="mb-1">
                ${hashOnly}${/\u3000/.test(it.title) ? "<br>" : ""}
                <span class="guest-one-line" aria-label="${guestText}">${guestText}</span>
              </h5>
            </div>
            <p class="episode-meta">公開日時：${it.date}<br>動画時間：${it.duration || "?"}</p>
          </div>
        </a>
      </li>
    `);
  });

  // サムネ下の時刻ボタン（委任）
  ul.off('click', '.ts-btn').on('click', '.ts-btn', function (e) {
    e.preventDefault(); e.stopPropagation();
    const sec = Number(this.dataset.ts) || 0;
    const base = this.dataset.url || '';
    window.open(withTimeParam(base, sec), '_blank', 'noopener');
  });

  // ★ボタン付与（既存）
  
// キーボード操作でエピソードを開く（Enter/Space）
$(document).off('keydown.__episodeopen').on('keydown.__episodeopen', '#results .episode-item', function(e){
  const key = e.key;
  if (key === 'Enter' || key === ' ') {
    const a = $(this).find('a').get(0);
    if (a) { a.click(); e.preventDefault(); }
  }
});
$('#results .episode-item').each(function () {
    if ($(this).find('.fav-btn').length) return;
    const link = $(this).find('a').attr('href') || '';
    const id = getVideoId(link);
    const active = isFavorite(id);
    $(this).append(
      `<button class="fav-btn ${active ? 'active' : ''}" data-id="${id}" aria-label="お気に入り" title="お気に入り">
         <i class="${active ? 'fa-solid' : 'fa-regular'} fa-star"></i>
       </button>`
    );
  });

  // 親<li>の .is-fav を現在の状態に同期（CSS: body.fav-only に対応）
  $('#results .episode-item').each(function(){
    const link2 = $(this).find('a').attr('href') || '';
    const id2 = getVideoId(link2);
    const active2 = isFavorite(id2);
    $(this).toggleClass('is-fav', !!active2);
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
  // 入力と並び替えを初期化
  $("#searchBox").val("");
  $("#sortSelect").val("newest");

  // 「お気に入りだけ表示」中なら、★を全解除してトグルもOFF
  if (typeof showFavoritesOnly !== "undefined" && showFavoritesOnly) {
    clearAllFavorites();
    showFavoritesOnly = false;
    document.body.classList.remove('fav-only');
    $("#favOnlyToggleBtn").removeClass("active").attr("aria-pressed","false");
  }

  // 表示中の星の見た目も即時反映（安全のため）
  $("#results .fav-btn.active").removeClass("active")
    .find("i").removeClass("fa-solid").addClass("fa-regular");

  // 既存のフィルタ初期化（この中で search() が呼ばれて初期表示に戻る想定）
  resetFilters();

  // ページ先頭へスクロール
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
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
      if (!applyStateFromURL({ replace: true })) {
    search();
  }
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
      // ページネーション（URLも更新したいので search({ gotoPage }) を使う）
$("#paginationArea").on("click keypress", ".page-btn", function (e) {
  if (e.type === "click" || (e.type === "keypress" && (e.key === "Enter" || e.key === " "))) {
    const n = parseInt($(this).data("page"), 10) || 1;
    currentPage = n;
    // ← 直接 renderResults せず、URL更新を内包する search に任せる
    search({ gotoPage: n });
    $("html,body").animate({ scrollTop: $(".main-content").offset().top - 24 }, 180);
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


      // ★ボタン（委任）
$('#results').on('click', '.fav-btn', function(e){
  e.preventDefault(); e.stopPropagation();
  const id = $(this).data('id');
  toggleFavorite(id);
  $(this).toggleClass('active')
         .find('i').toggleClass('fa-regular fa-solid');
  // 親<li>の .is-fav も更新（CSSに反映）
  const $li = $(this).closest('.episode-item');
  const favNow = isFavorite(id);
  $li.toggleClass('is-fav', !!favNow);
  if (showFavoritesOnly) search({ gotoPage: currentPage || 1 });
});

// 「お気に入りだけ」トグル（index.htmlで #favOnlyToggleBtn を用意）
$('#favOnlyToggleBtn').on('click', function(){
  showFavoritesOnly = !showFavoritesOnly;
  $(this).attr('aria-pressed', showFavoritesOnly)
         .toggleClass('active', showFavoritesOnly);

  document.body.classList.toggle('fav-only', showFavoritesOnly); // ★これ
  search({ gotoPage: 1 });
});

// ランダム（現在の検索結果から。なければ全データ）
$('#randomBtn').on('click', function(){
  const pool = (Array.isArray(lastResults) && lastResults.length) ? lastResults : data;
  if (!pool.length) return;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  window.open(pick.link, '_blank', 'noopener');
});

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
    localStorage.setItem("theme", "on");
    this.textContent = "☀";
  } else {
    localStorage.setItem("theme", "off");
    this.textContent = "🌙";
  }
};


// ページ読込時に前回の設定を反映
window.addEventListener("DOMContentLoaded", function(){
  if(localStorage.getItem("theme")==="on"){
    document.body.classList.add("dark-mode");
    document.getElementById("darkModeBtn").textContent = "☀";
  }
});



// 本番の dark-mode クラスが付いたらプレロード用を解除
document.documentElement.classList.remove('dark-preload');
document.documentElement.style.backgroundColor = ""; // 直書き背景も戻す

// 本番のダーククラスを適用した直後
var early = document.getElementById("early-dark-style");
if (early) early.remove();



// Safari対策を含めたローディング解除コード
window.addEventListener('load', function() {
  // 少し待ってローディング画面をフェードアウト
  setTimeout(function() {
    $("#loading-screen").addClass("fadeout");
    setTimeout(function() {
      $("#loading-screen").remove();
    }, 1000);
  }, 950);
});


// 「このサイトについて」表示・非表示（fade + scroll lock に統一）
$('#aboutSiteLink').off('click.__about').on('click.__about', function(e){
  e.preventDefault();
  $('#aboutModal').stop(true, true).fadeIn(150, function(){
    $(this).css('display','flex');
    if (typeof updateScrollLock === 'function') updateScrollLock();
  });
});

$('#aboutCloseBtn, #aboutModal').off('click.__about').on('click.__about', function(e){
  if (e.target.id === 'aboutModal' || e.target.id === 'aboutCloseBtn') {
    $('#aboutModal').stop(true, true).fadeOut(130, function(){
      if (typeof updateScrollLock === 'function') updateScrollLock();
    });
  }
});

$('#aboutModalContent').off('click.__about').on('click.__about', function(e){
  e.stopPropagation(); // 中身クリックでは閉じない
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
const rcOk = document.getElementById('rcOk');
const rcClose = document.getElementById('rcClose'); // ない前提。あれば動く

const closeRc = () => { document.getElementById('rcModal').style.display = 'none'; };

if (rcOk) rcOk.onclick = closeRc;
if (rcClose) rcClose.onclick = closeRc;

// モーダルクリック時、ウィンドウ外クリックで閉じる（お好みで）
document.getElementById('rcModal').addEventListener('click', function(e){
  if(e.target === this) this.style.display='none';
});


// 検索ボタンやページ移動の関数内で currentPage をグローバル管理すること
window.currentPage = 1; // グローバル変数を用意（既にあれば不要）



window.addEventListener('DOMContentLoaded', function() {
  if (typeof currentPage !== "undefined") currentPage = 1;
  if (typeof search === "function") search(1);
  setTimeout(function() {
    window.scrollTo(0, 0);
    document.getElementById('mainContent')?.scrollIntoView({ behavior: 'auto' });
  }, 400);
});


// ===== Scroll lock helpers =====
let __scrollY = 0;
function lockScroll() {
  if (document.body.classList.contains('scroll-lock')) return;
  __scrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.top = `-${__scrollY}px`;
  document.body.classList.add('scroll-lock');
}
function unlockScroll() {
  if (!document.body.classList.contains('scroll-lock')) return;
  document.body.classList.remove('scroll-lock');
  document.body.style.top = '';
  // 元いた位置に戻す
  window.scrollTo(0, __scrollY);
}
function updateScrollLock(){ if (typeof window.updateScrollLock === 'function') return window.updateScrollLock(); }


// フィルターを開くとき
$('#filterToggleBtn').on('click', function () {
  const currentlyOpen = $('#filterDrawer').is(':visible');
  if (currentlyOpen) {
    $('#filterDrawer').hide();
    $('#drawerBackdrop').removeClass('show');
  } else {
    $('#filterDrawer').show();
    $('#drawerBackdrop').addClass('show');
  }
  updateScrollLock(); // ← これを最後に
});

// 背景クリックで閉じるとき
$('#drawerBackdrop').on('click', function () {
  $('#filterDrawer').hide();
  $('#drawerBackdrop').removeClass('show');
  updateScrollLock(); // ← これ
});


// 開く
$('#aboutSiteLink').on('click', function (e) {
  e.preventDefault();
  $('#aboutModal').css('display','flex').hide().fadeIn(130); // 統一：fadeInで表示
  updateScrollLock(); // ← これ
});

// 閉じる（×ボタン）
$('#aboutCloseBtn').on('click', function () {
  $('#aboutModal').stop(true,true).fadeOut(130, function(){ $(this).hide(); });
  updateScrollLock(); // ← これ
});

// モーダル外クリックで閉じる
$('#aboutModal').on('click', function (e) {
  if (e.target === this) {
    $('#aboutModal').stop(true,true).fadeOut(130, function(){ $(this).hide(); });
    updateScrollLock(); // ← これ
  }
});


// ===== 固定ヘッダーぶんの余白を動的に確保 =====
(function () {
  const root = document.documentElement;

  function updateHeaderOffset() {
    // sticky-search-area の実高さ（検索欄＋表示数バー＋フィルタタグ等を全部含む）
    const sticky = document.querySelector('.sticky-search-area');
    if (!sticky) return;
    const h = sticky.offsetHeight;
    // 影や角丸がかぶらないように少し余裕(+10px)
    root.style.setProperty('--header-offset', (h + 10) + 'px');
  }

  // 初回と画面変化で更新
  window.addEventListener('DOMContentLoaded', updateHeaderOffset);
  window.addEventListener('load', updateHeaderOffset);
  window.addEventListener('resize', () => setTimeout(updateHeaderOffset, 50));
  window.addEventListener('orientationchange', () => setTimeout(updateHeaderOffset, 120));

  // ヘッダー内の内容変化（フィルタタグ増減など）も拾う
  const sticky = document.querySelector('.sticky-search-area');
  if (sticky && 'MutationObserver' in window) {
    const mo = new MutationObserver(() => setTimeout(updateHeaderOffset, 0));
    mo.observe(sticky, { childList: true, subtree: true, attributes: true });
  }

  // 他の処理からも呼べるよう公開（任意）
  window.__updateHeaderOffset = updateHeaderOffset;
})();

window.__updateHeaderOffset && window.__updateHeaderOffset();




// ===== unified scroll-lock & drawer handlers (consolidated patch) =====
(function () {
  if (window.__drawerPatched) return; // idempotent
  window.__drawerPatched = true;

  let __scrollY = 0;
  function lockScroll() {
    if (document.body.classList.contains('scroll-lock')) return;
    __scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.top = `-${__scrollY}px`;
    document.body.classList.add('scroll-lock');
  }
  function unlockScroll() {
    if (!document.body.classList.contains('scroll-lock')) return;
    document.body.classList.remove('scroll-lock');
    document.body.style.top = '';
    window.scrollTo(0, __scrollY);
  }
  window.updateScrollLock = function updateScrollLock() {
    const isFilterOpen = $('#filterDrawer').is(':visible');
    const isAboutOpen  = $('#aboutModal').is(':visible');
    (isFilterOpen || isAboutOpen) ? lockScroll() : unlockScroll();
  };

  function updateDrawerTop() {
    const sbar = document.querySelector('.sticky-search-area');
    const drawer = document.getElementById('filterDrawer');
    if (sbar && drawer) {
      const rect = sbar.getBoundingClientRect();
      drawer.style.position = 'fixed';
      drawer.style.left = '50%';
      drawer.style.transform = 'translateX(-50%)';
      drawer.style.right = '';
      drawer.style.top = (rect.top + rect.height + 8) + 'px';
    }
  }

  function openDrawer() {
    updateDrawerTop();
    $('#filterDrawer').show();
    $('#drawerBackdrop').addClass('show');
    $('#filterToggleBtn').attr({ 'aria-expanded': true, 'aria-pressed': true });
    updateScrollLock();
  }
  function closeDrawer() {
    $('#filterDrawer').hide();
    $('#drawerBackdrop').removeClass('show');
    $('#filterToggleBtn').attr({ 'aria-expanded': false, 'aria-pressed': false });
    updateScrollLock();
  }
  window.__openDrawer = openDrawer;
  window.__closeDrawer = closeDrawer;

  // Remove duplicate/legacy handlers, then bind once.
  $('#filterToggleBtn').off('click keypress').on('click keypress', function (e) {
    if (e.type === 'click' || (e.type === 'keypress' && (e.key === 'Enter' || e.key === ' '))) {
      $('#filterDrawer').is(':visible') ? closeDrawer() : openDrawer();
    }
  });
  $('#drawerBackdrop').off('click').on('click', closeDrawer);
  $(document).off('click.__drawer').on('click.__drawer', function(e){
    if ($('#filterDrawer').is(':visible') && !$(e.target).closest('#filterDrawer,#filterToggleBtn').length) {
      closeDrawer();
    }
  });


// Ensure reset really resets everything (favorites included) and tidy UI
window.resetSearch = (function (orig) {
  return function () {
    // リセット処理中は URL の更新を止める（search() が走っても pushState しない）
    const prev = isRestoringURL;
    isRestoringURL = true;

    if (typeof orig === "function") {
      // 既存の resetSearch（入力クリア/★解除 など）を実行
      orig();
    } else {
      // フォールバック：最小限の完全リセット
      if ($("#searchBox").length) $("#searchBox").val("");
      if ($("#sortSelect").length) $("#sortSelect").val("newest");

      // お気に入りだけ表示中なら、★を全解除してトグルもOFF
      if (window.showFavoritesOnly) {
        if (typeof clearAllFavorites === "function") clearAllFavorites();
        window.showFavoritesOnly = false;
        $("#favOnlyToggleBtn").removeClass("active").attr("aria-pressed", "false");
        $("#results .fav-btn.active").removeClass("active").find("i").removeClass("fa-solid").addClass("fa-regular");
      }

      if (typeof resetFilters === "function") resetFilters();
      else if (typeof search === "function") search();
    }

    // ここまでで search() は走っているが URL は未更新
    currentPage = 1;
    isRestoringURL = prev;          // URL更新ガードを解除（通常は false に戻る）

    // 最後に URL を「/」へ置換（履歴を増やさない）
    buildURLFromState({ method: 'replace' });

    // UI後処理
    if (typeof closeDrawer === "function") closeDrawer();
    if (typeof updateScrollLock === "function") updateScrollLock();
  };
})(window.resetSearch);




  // Dev helper: warn on duplicate YouTube IDs in data
  try {
    const ids = (Array.isArray(data)?data:[]).map(it => (it.link||"").match(/watch\\?v=([\\w-]{11})/)?.[1]).filter(Boolean);
    const seen = {};
    ids.forEach(id => { seen[id]=(seen[id]||0)+1; });
    Object.keys(seen).forEach(id => { if (seen[id] > 1) console.warn('[SearchTheRadio] Duplicate video id:', id, 'x'+seen[id]); });
  } catch(e){}
  updateScrollLock();
})();


// ===== スマホ時は並び替えラベルを短くする =====
(function(){
  const MAP = {
    newest : {full:'公開日時が新しい順', short:'公開日時が新しい順'},
    oldest : {full:'公開日時が古い順',   short:'公開日時が古い順'},
    longest: {full:'動画時間が長い順',   short:'動画時間が長い順'},
    shortest:{full:'動画時間が短い順',   short:'動画時間が短い順'}
  };
  function applySortLabels(){
    const sel = document.getElementById('sortSelect');
    if(!sel) return;
    const isSmall = window.matchMedia('(max-width:600px)').matches;
    Object.entries(MAP).forEach(([val,labels])=>{
      const opt = sel.querySelector(`option[value="${val}"]`);
      if(opt) opt.textContent = isSmall ? labels.short : labels.full;
    });
  }
  // 初期化とリサイズで反映
  document.addEventListener('DOMContentLoaded', applySortLabels);
  // ボタンラベルの先頭スペースを除去し、data-label を補完して揃える
document.addEventListener('DOMContentLoaded', () => {

// Ensure aria-pressed state sync for toggle buttons
['#filterToggleBtn','#favOnlyToggleBtn'].forEach(sel => {
  document.querySelectorAll(sel).forEach(btn => {
    btn.addEventListener('click', () => {
      const pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!pressed));
    });
  });
});


// Remove active class immediately after click to prevent persistent highlight
['#filterToggleBtn','#favOnlyToggleBtn','#randomBtn','.reset-btn'].forEach(sel => {
  document.querySelectorAll(sel).forEach(btn => {
    btn.addEventListener('mouseup', () => btn.classList.remove('active'));
    btn.addEventListener('blur', () => btn.classList.remove('active'));
  });
});

  ['favOnlyToggleBtn', 'randomBtn'].forEach(id => {
    const el = document.getElementById(id);
    const sp = el && el.querySelector('span');
    if (sp) sp.textContent = sp.textContent.trim();  // ←先頭スペース除去
  });

  const filterBtn = document.getElementById('filterToggleBtn');
  if (filterBtn && !filterBtn.dataset.label) {
    filterBtn.dataset.label = 'フィルタ'; // ::after の表示文言
  }
});

  window.addEventListener('resize', applySortLabels);
  window.addEventListener('orientationchange', applySortLabels);
})();


// 全お気に入りを解除して保存
function clearAllFavorites(){
  if (typeof favorites !== "undefined" && favorites instanceof Set) {
    favorites = new Set();    // もしくは favorites.clear();
    if (typeof saveFavs === "function") saveFavs();
    else if (typeof FAV_KEY !== "undefined") localStorage.setItem(FAV_KEY, "[]");
  } else if (typeof FAV_KEY !== "undefined") {
    localStorage.setItem(FAV_KEY, "[]");
  }
}


// ===== Autocomplete（リアルタイム＋読み対応、#番号展開なし） =====
(function () {
  const $input = document.getElementById('searchBox');
  const $box   = document.getElementById('autocomplete');
  if (!$input || !$box) return;

  // 1) ひらがな＆表記ゆれ吸収（全角半角/カタカナ→ひらがな/小文字化/空白除去）
  const toWide = (s)=> (s||'').normalize('NFKC');
  const toHiragana = (s)=> toWide(s).replace(/[ァ-ン]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  const normalize = (s)=> toHiragana(s).toLowerCase().replace(/\s+/g,'');
  const hasKanji = (s)=> /[\p{sc=Han}]/u.test(s||'');


  // ★ここに追加（hasKanji の直後）
  // ASCII/全角 @ に続く mm:ss または hh:mm:ss を末尾から除去（表示用）
  const stripTimeSuffix = (s) =>
    (s || '').replace(/[＠@]\s*\d{1,2}:\d{2}(?::\d{2})?\s*$/,'');

  // 2) 「漢字→読み」をここに登録
  //    例：'青山吉能': ['あおやまよしの']
  const CUSTOM_READINGS = {
  "青山吉能": ["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"],
  "鈴代紗弓": ["さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"],
  "水野朔": ["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく"],
  "長谷川育美": ["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ"],
  "内田真礼": ["内田真礼","まややん","まれいたそ","うちだまあや"],
  "千本木彩花": ["千本木彩花","ぼんちゃん","ぽんちゃん","さやか","せんぼんぎさやか"],
  "和多田美咲": ["和多田美咲","わっちゃん","わただみさき"],
  "小岩井ことり": ["小岩井ことり","こっこちゃん","ことりん","ことピー","ことにゃん","ことたま","こいわいことり"],
  "斎藤圭一郎": ["さいとうけいいちろう"],
  "山本ゆうすけ": ["やまもとゆうすけ"],
  "けろりら":　[],
  };

  // 3) 候補エントリを構築（重複排除＆読みも紐づけ）
  //    entriesByLabel: label => { label, type, norms:Set<string> }
  const entriesByLabel = new Map();

  const ensureEntry = (label, type) => {
    if (!label) return null;
    let e = entriesByLabel.get(label);
    if (!e) {
      e = { label, type: type || 'キーワード', norms: new Set() };
      entriesByLabel.set(label, e);
    } else {
      // 「出演者」を優先（並びの微ブースト用）
      if (e.type !== '出演者' && type === '出演者') e.type = '出演者';
    }
    // 自身の表記をキーに追加
    e.norms.add(normalize(label));
    // 追加：時間なし版もキーにしておく
e.norms.add(normalize(stripTimeSuffix(label)));
    // 手動の読みもキーに追加
    const rs = CUSTOM_READINGS[label];
    if (rs) rs.forEach(r => e.norms.add(normalize(r)));
    return e;
  };

  // data から keywords / ゲスト名を集約（同一ラベルは統合）
  const keywordsSeen = new Set();
  for (const ep of data) {
    // keywords
    (ep.keywords || []).forEach(kw => {
      if (!kw) return;
      // 同一ラベルの重複挿入はスキップ（件数が多いので）
      if (keywordsSeen.has(kw)) return;
      keywordsSeen.add(kw);
      ensureEntry(kw, 'キーワード');
    });

    // guest（配列/単体どちらでも）
    const guests = Array.isArray(ep.guest) ? ep.guest : [ep.guest];
    guests.filter(Boolean).forEach(g => ensureEntry(g, '出演者'));
  }

  const entries = Array.from(entriesByLabel.values());

  // 4) 描画系
  let cursor = -1;
  let viewItems = [];
  let composing = false;

  const clear = () => {
    $box.innerHTML = '';
    $box.hidden = true;
    cursor = -1;
    viewItems = [];
  };

  const render = (items) => {
    viewItems = items;
    $box.innerHTML = '';
    $box.hidden = items.length === 0;

    const qRaw = $input.value.trim();

    items.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'autocomplete-item';
      el.setAttribute('role', 'option');
      el.setAttribute('aria-selected', idx === cursor ? 'true' : 'false');

      // 簡易ハイライト（英数の大小のみ、和文は表示優先）
      const i = item.label.toLowerCase().indexOf(qRaw.toLowerCase());
      const html = (i >= 0)
        ? `${item.label.slice(0,i)}<span class="match">${item.label.slice(i, i+qRaw.length)}</span>${item.label.slice(i+qRaw.length)}`
        : item.label;

      el.innerHTML = `<span class="type">${item.type}</span><span class="label">${html}</span>`;
      el.addEventListener('mousedown', (e) => { e.preventDefault(); pick(idx); });
      $box.appendChild(el);
    });
  };

  const pick = (index) => {
    const item = viewItems[index];
    if (!item) return;
    $input.value = item.fill ?? item.label;
    clear();
    if (typeof search === 'function') search(); // 既存の検索を実行
  };

  // 5) 入力に応じてリアルタイムで候補を出す（ひらがな/漢字どちらでもOK）
  const scoreEntry = (entry, normQ, raw) => {
    // エントリの任意の norm が prefix/部分一致するか
    let prefix = false, part = false;
    for (const k of entry.norms) {
      if (!k) continue;
      if (k.startsWith(normQ)) { prefix = true; break; }
      if (!part && k.includes(normQ)) part = true;
    }
    if (!prefix && !part) return null;

    // スコアリング：prefix優先、ひらがな入力時は漢字ラベルを少し優遇、出演者を微優遇
    const preferKanji = !hasKanji(raw) && hasKanji(entry.label) ? 2 : 0;
    const typeBoost  = entry.type === '出演者' ? 1 : 0;
    const score = (prefix ? 4 : 0) + (part ? 1 : 0) + preferKanji + typeBoost;
    return score;
  };

  const onInput = () => {
    const raw = $input.value;
    const normQ = normalize(raw);
    if (!normQ) { clear(); return; }

    const scored = [];
    for (const e of entries) {
      const s = scoreEntry(e, normQ, raw);
      if (s != null) scored.push({ e, s });
      if (scored.length > 200) break; // 安全上限
    }
    scored.sort((a,b)=> b.s - a.s);

    // itemsRaw の map 内
const itemsRaw = scored.slice(0, 20).map(({ e }) => {



let label = e.label;
  const nlabel = normalize(stripTimeSuffix(label));
if (!hasKanji(label) && READING_TO_LABEL[nlabel]) {
label = READING_TO_LABEL[nlabel]; // 表示ラベル自体は漢字に寄せる（従来処理）
}

  // 表示は時間を隠す（= 候補の見た目）
  const display = stripTimeSuffix(label);

  return { label: display, fill: display, type: e.type };
}).filter(Boolean); // ← null を除去

// 同じ表示ラベル（例：'鈴代紗弓'）が複数できたら1件に統合
const seen = new Set();
const items = [];
for (const it of itemsRaw) {
  if (seen.has(it.label)) continue;
  seen.add(it.label);
  items.push(it);
}
render(items.slice(0, 12));
  };

  // キーボード操作
  const onKeyDown = (e) => {
    if ($box.hidden) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      cursor = (cursor + 1) % viewItems.length;
      render(viewItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cursor = (cursor - 1 + viewItems.length) % viewItems.length;
      render(viewItems);
    } else if (e.key === 'Enter') {
      if (cursor >= 0) { e.preventDefault(); pick(cursor); }
      // カーソルがない場合は、index.html 側の onkeydown(Enter→search()) が動く
    } else if (e.key === 'Escape') {
      clear();
    }
  };

  // IME中は確定まで待つ（ひらがな入力でもリアルタイムに出るよう compositionend で再評価）
  $input.addEventListener('compositionstart', ()=> composing = true);
  $input.addEventListener('compositionend', ()=> { composing = false; onInput(); });

  // 入力イベント（漢字/ひらがな両対応）
  const debounce = (fn, ms=40) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };
  $input.addEventListener('input', debounce(onInput, 30));
  $input.addEventListener('keydown', onKeyDown);

  // 外側クリックで閉じる
  document.addEventListener('click', (e) => {
    if (e.target === $input || $box.contains(e.target)) return;
    clear();
  });
})();


const CUSTOM_READINGS = {
  "青山吉能": ["青山吉能","よぴ","よしの","よっぴー","あおやまよしの"],
  "鈴代紗弓": ["さゆみん","おさゆ","みんみん","さゆちゃん","おすず","すずちゃん","鈴代ちゃん","すずしろさゆみ"],
  "水野朔": ["水野朔","さくぴ","さくさくちゃん","ﾐｽﾞﾉｻｸﾃﾞｼｭ","みずのさく"],
  "長谷川育美": ["長谷川育美","いくみ","はせみ","はせちゃん","いくちゃん","はっせー","はせがわいくみ"],
  "内田真礼": ["内田真礼","まややん","まれいたそ","うちだまあや"],
  "千本木彩花": ["千本木彩花","ぼんちゃん","ぽんちゃん","さやか","せんぼんぎさやか"],
  "和多田美咲": ["和多田美咲","わっちゃん","わただみさき"],
  "小岩井ことり": ["小岩井ことり","こっこちゃん","ことりん","ことピー","ことにゃん","ことたま","こいわいことり"],
  "藤田亜紀子": ["ふじたあきこ"],
  "斎藤圭一郎": ["さいとうけいいちろう"],
  "山本ゆうすけ": ["やまもとゆうすけ"],
  "エロ女上司": ["えろおんなじょうし"],
  "京まふ": ["きょうまふ"],
  "Venue101": ["べにゅー101"],
  "恒星": ["こうせい"],
  "匂わせ": ["におわせ"],
  "薮崎D": ["やぶさき"],
  "ぼっち・ざ・ろっく！です。": ["ぼざろです"],
};


// 読み（かな）→ 正規ラベル（漢字） の逆引き
const READING_TO_LABEL = {};
for (const kanji in CUSTOM_READINGS) {
  (CUSTOM_READINGS[kanji] || []).forEach(r => {
    READING_TO_LABEL[normalize(r)] = kanji;
  });
}

// ===== ラジオの歴史：データ → タイムライン描画 =====
(function(){
  const $toggle = document.getElementById('historyToggle');
  const $body   = document.getElementById('historyBody');
  const $list   = document.getElementById('historyTimeline');
  if(!$toggle || !$body || !$list) return;

  // ここに歴史データを足していく（時系列順／日付降順でもOK）
  // date: YYYY-MM-DD, month-only可（YYYY-MM）, year-only可（YYYY）
  const HISTORY = [
    { date: '2022-08-19', label: '番組配信決定', desc: '旧Twitterにて公式ラジオスタートの告知。', url: 'https://x.com/BTR_anime/status/1560280368384581632' },
    { date: '2022-09-07', label: '第1回配信開始', desc: '『ぼっち・ざ・らじお！』第1回がYoutubeと音泉にて配信開始。', url: 'https://x.com/BTR_anime/status/1567439907542499328' },
    { date: '2022-09-18', label: '番組公開収録 in 京まふ2022', desc: 'みやこめっせステージにて第2回の公開収録。', url: 'https://x.com/BTR_anime/status/1571365877211336707' },
    { date: '2022-12-01', label: 'フレッシュネスバーガー下北沢店コラボ開催', desc: 'ラジオでのアツいスパムバーガー話がきっかけになり、コラボが決定。<br>第1弾はスパムバーガー/スパムアボカドバーガーの販売延長と、店内にて番組宣伝ポスターの掲示が実施された。', url: 'https://x.com/Yopipi555/status/1597898760633610240' },
    { date: '2022-12-11', label: 'フレッシュネスバーガー下北沢店　青山吉能スパムバーガーお渡し会開催', desc: 'ぼっち応援キャンペーン第2弾として青山吉能がフレッシュネスバーガー下北沢店の1日店長に。先着100名様限定のレアイベント。', url: 'https://x.com/BTR_anime/status/1601789726217756672' },

    
    { date: '2023-03-19', label: '番組イベント開催', desc: '初の番組イベント。第1部：公開録音、第2部：後夜祭の2部制。<br>会場では「番組特製ボイスキーホルダー」が発売。<br>第2部の後夜祭で生まれた「青椒肉絲好きの博多弁エロ女上司(cv.長谷川育美)」が大きな反響を呼んだ。', url: 'https://x.com/onsenradio/status/1637405895683604480' },
    { date: '2023-03-29', label: '第8回『アニラジアワード』史上初の3冠受賞', desc: 'ぼっち・ざ・らじお！が『最優秀ラジオ大賞』『最優秀女性ラジオ賞』『大笑いラジオ賞』を受賞。', url: 'https://x.com/BTR_anime/status/1641067456625274881' },
    { date: '2023-04-26', label: '番組リニューアル', desc: '新コーナー「ぼっち予想テスト」「イキり懺悔室」や<br>「ぼっち・ざ・おーでぃしょん！」では新テーマ「青春」を募集。', url: 'https://x.com/BTR_anime/status/1651151378570682369' },
    { date: '2023-06-24', label: 'ぼっち・ざ・らじお！音泉祭りスペシャル', desc: '音泉祭り2023に青山吉能、鈴代紗弓が出演。', url: 'https://x.com/BTR_anime/status/1672559141800521729' },
    { date: '2023-08-01', label: '第1回Youtube100万再生突破', desc: '', url: 'https://x.com/BTR_anime/status/1686303096375513088' },
    { date: '2023-12-20', label: '第41回クリスマススペシャル', desc: '初の映像特別回。おしゃべりピンク爆誕。', url: 'https://x.com/onsenradio/status/1737399690579382638' },


    { date: '2024-04-24', label: '番組配信50回突破', desc: '', url: 'https://x.com/BTR_anime/status/1783088715356893504' },
    { date: '2024-12-25', label: '第68回クリスマススペシャル', desc: '初の映像生配信回。カラオケコーナーあり。', url: 'https://x.com/BTR_anime/status/1871935819327639585' },

    { date: '2025-01-15', label: '第69(ロック)回特別コーナー「ろっく！えぴそーど！」', desc: '破天荒＆カッコいいエピソードを青山吉能が「ロック」かどうか判定。', url: 'https://x.com/BTR_anime/status/1879455907379294412' },
    { date: '2025-02-15', label: '【緊急】ぼっち・ざ・らじお！【特別編】', desc: 'アニメ2期制作決定とともに公開された特別編。ゲストに斎藤圭一郎、山本ゆうすけ、けろりらを迎えた。(敬称略)', url: 'https://x.com/BTR_anime/status/1890732797804839239' },
    { date: '2025-04-09', label: '番組リニューアル', desc: '新コーナー「本日のテーマ」「結束バンドと私」が登場。<br>おまけコーナーも「ぼっち・ざ・らじお！アフタートーク」へリニューアル。', url: 'https://x.com/BTR_anime/status/1909896315141529882' },
    { date: '2025-09-07', label: 'ぼっち・ざ・らじお！番組3周年', desc: '', url: '' },



    // （この下にどんどん追加してOK）
  ];


  // --- モーダル参照＆スクロールロック ---
  const $modal = document.getElementById('historyModal');
  const $close = document.getElementById('historyCloseBtn');
  let _scrollY = 0;

  function openHistoryModal(){
  const overlay = document.getElementById('historyModal');
  if(!overlay) return;

  // （初回ビルドが別にあるなら不要。なければここで実行）
  if (!$list?.dataset?.built && typeof buildTimeline === 'function') {
    buildTimeline(HISTORY);
    if (typeof setupYearObserver === 'function') setupYearObserver();
    if ($list) $list.dataset.built = '1';
  }

  overlay.hidden = false;                 // 表示フラグON
  overlay.classList.remove('closing');
requestAnimationFrame(() => overlay.classList.add('show'));


const sc = overlay.querySelector('.history-modal');
if (sc) sc.scrollTop = 0;


lockScroll(); // ← これで現在の scrollY を保持して固定
  // a11y（任意）
  try{ $toggle?.setAttribute('aria-expanded','true'); }catch(_){}
}

function closeHistoryModal(){
  const overlay = document.getElementById('historyModal');
  if(!overlay || overlay.hidden) return;

  // フェードアウト開始
  overlay.classList.add('closing');
  overlay.classList.remove('show');

  // アニメーション終了後に完全に非表示
  const done = () => {
    overlay.hidden = true;
overlay.classList.remove('closing');
overlay.removeEventListener('animationend', done);
unlockScroll(); // ← 固定を解除して元の位置に復帰
    try{ $toggle?.setAttribute('aria-expanded','false'); }catch(_){}
  };
  overlay.addEventListener('animationend', done);
  setTimeout(done, 260); // Safari等のフォールバック
}

$('#historyCloseBtn').off('click').on('click', closeHistoryModal);
$('#historyModal').off('click').on('click', function(e){
  if(e.target === this) closeHistoryModal(); // 背景クリックで閉じる
});
$(document).off('keydown.__history').on('keydown.__history', function(e){
  if(e.key === 'Escape'){
    const overlay = document.getElementById('historyModal');
    if(overlay && !overlay.hidden) closeHistoryModal();
  }
});
// 開く側（トグルボタン）
$('#historyToggle').off('click').on('click', function(e){
  e.preventDefault(); e.stopPropagation();
  openHistoryModal();
});


  function lockBodyScroll(){
    _scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.classList.add('modal-open');
    document.body.style.top = `-${_scrollY}px`;
  }
  function unlockBodyScroll(){
    document.body.classList.remove('modal-open');
    const top = document.body.style.top;
    document.body.style.top = '';
    window.scrollTo(0, top ? -parseInt(top,10) : 0);
  }
// --- タイムライン構築 ---

  function buildTimeline(data){
    $list.innerHTML = '';
    // 日付の種類（YYYY / YYYY-MM / YYYY-MM-DD）に対応してソート
    const sorted = [...data].sort((a,b)=> (toDateKey(a.date) < toDateKey(b.date) ? -1 : 1));

    let currentYear = null;
    sorted.forEach(it=>{
      const y = (it.date || '').slice(0,4);
      if (y && y !== currentYear){
        currentYear = y;
        const yEl = document.createElement('div');
        yEl.className = 'history-year';
        yEl.textContent = `${y}年`;
        $list.appendChild(yEl);
      }

      const el = document.createElement('div');
      el.className = 'history-item';
      const dateText = fmtDate(it.date);
      el.innerHTML = `
        ${dateText ? `<div class="date">${dateText}</div>` : ''}
        <div class="label">${it.url ? `<a href="${it.url}" target="_blank" rel="noopener">${it.label}</a>` : it.label}</div>
        ${it.desc ? `<div class="desc">${it.desc}</div>` : ''}
      `;
      $list.appendChild(el);
    });
  }

  function toDateKey(s){
    if(!s) return '0000-00-00';
    const parts = s.split('-'); // YYYY / YYYY-MM / YYYY-MM-DD
    const y = parts[0] || '0000';
    const m = parts[1] || '00';
    const d = parts[2] || '00';
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  function fmtDate(s){
    if(!s) return '';
    const parts = s.split('-');
    if (parts.length === 3) return `${parseInt(parts[1])}月${parseInt(parts[2])}日`;
    if (parts.length === 2) return `${parseInt(parts[1])}月`;
    return ''; // 年だけのときは年見出しに出るので個別表示しない
  }

  // --- 年表示（モーダル内のみ） ---
  let yearObserver;
  function setupYearObserver(){
    const targets = [...$list.querySelectorAll('.history-year')];
    if (!targets.length) return;

    const rootEl = document.querySelector('.history-modal') || null;  // ★モーダルを監視基準に
    const io = new IntersectionObserver((entries)=>{
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) {
        const y = visible[0].target.textContent.replace('年','');
        setSubYear(y);
      }
    }, { root: rootEl, rootMargin: '-20% 0px -70% 0px', threshold: [0,1] });

    targets.forEach(t => io.observe(t));
    yearObserver = io;
    updateHeaderYear(); // 初回反映
  }

  function updateHeaderYear(){
    const rootEl = document.querySelector('.history-modal');
    if(!rootEl) return;
    const rootTop = rootEl.getBoundingClientRect().top;
    const headerOffset = 56; // 固定ヘッダー分のオフセット（CSSと合わせる）
    let nearest = null, best = Infinity;

    [...$list.querySelectorAll('.history-year')].forEach(y=>{
      const rTop = y.getBoundingClientRect().top - rootTop - headerOffset;
      const score = Math.abs(rTop);
      if (score < best){ best = score; nearest = y; }
    });

    if (nearest){
      setSubYear(nearest.textContent.replace('年',''));
    }
  }

  // ボタン側の `.sub` は廃止。モーダル左上の年バッジのみ更新
  function setSubYear(y){
    const sticky = document.getElementById('historyStickyYear');
    if (sticky) sticky.textContent = `${y}`;
  }

  // 追加API（必要なら使用）
  window.addHistory = function(entry){
    HISTORY.push(entry);
    if ($list.dataset.built) { buildTimeline(HISTORY); setupYearObserver(); }
  };
})()


// === SNSシェアリンクを設定 ===
;(function(){
  const x   = document.getElementById('shareX');
  const ln  = document.getElementById('shareLINE');
  const fb  = document.getElementById('shareFB');
  if(!x || !ln || !fb) return;

  // サイトのトップを共有（必要なら location.href に変更可）
  const shareUrl = 'https://searchtheradio.com/';
  const text = 'さーち・ざ・らじお！ — ぼっち・ざ・らじお！専門検索エンジン #さーち・ざ・らじお';

  const u = encodeURIComponent(shareUrl);
  const t = encodeURIComponent(text);

  x.href  = `https://x.com/intent/tweet?url=${u}&text=${t}`;
  ln.href = `https://social-plugins.line.me/lineit/share?url=${u}`;
  fb.href = `https://www.facebook.com/sharer/sharer.php?u=${u}`;
})();


// === 4ボタンの自動フィット：全ボタンを「最小サイズ」に統一して1行死守 ===
(function autoFitControlButtonsGroup(){
  const elFilter = document.getElementById('filterToggleBtn');
  const elFav    = document.getElementById('favOnlyToggleBtn');
  const elRand   = document.getElementById('randomBtn');
  const elReset  = document.querySelector('.reset-btn');
  if (!elFilter || !elFav || !elRand || !elReset) return;

  const targets = [elFilter, elFav, elRand, elReset];

  function neededFontSize(el, startPx=16, minPx=12){
    // いったん最大に戻す
    el.style.setProperty('--ctl-fs', startPx + 'px');
    // 擬似要素(::before/::after)込みの実幅で判定
    for (let fs = startPx; fs >= minPx; fs--){
      el.style.setProperty('--ctl-fs', fs + 'px');
      if (el.scrollWidth <= el.clientWidth + 2) return fs;
    }
    return minPx; // どうしても入らなければ最小
  }

  function fitAll(){
    if (!window.matchMedia('(max-width: 768px)').matches){
      targets.forEach(el => el.style.removeProperty('--ctl-fs'));
      return;
    }
    // それぞれに必要なフォントサイズを測り、最小値で全員を統一
    const sizes = targets.map(el => neededFontSize(el, 16, 12));
    const groupFs = Math.min.apply(null, sizes);
    targets.forEach(el => el.style.setProperty('--ctl-fs', groupFs + 'px'));

    // 念のため再チェック（万一溢れたら1px下げる）
    let safe = true;
    for (const el of targets){
      if (el.scrollWidth > el.clientWidth + 2){ safe = false; break; }
    }
    if (!safe){
      const s = Math.max(12, groupFs - 1);
      targets.forEach(el => el.style.setProperty('--ctl-fs', s + 'px'));
    }
  }

  window.addEventListener('load', fitAll, { passive:true });
  window.addEventListener('resize', fitAll, { passive:true });
  window.addEventListener('orientationchange', fitAll, { passive:true });
  setTimeout(fitAll, 120); // フォント読み込み後のズレ対策
})();

/* ===== Controls (Unified) — ラベル整形＋自動フィット（SPのみ） ===== */
(function(){
  const elFilter = document.getElementById('filterToggleBtn');
  const elFav    = document.getElementById('favOnlyToggleBtn');
  const elRand   = document.getElementById('randomBtn');
  const elReset  = document.querySelector('.reset-btn');
  if (!elFilter || !elFav || !elRand || !elReset) return;

  // ラベル整形
  document.addEventListener('DOMContentLoaded', () => {

// Ensure aria-pressed state sync for toggle buttons
['#filterToggleBtn','#favOnlyToggleBtn'].forEach(sel => {
  document.querySelectorAll(sel).forEach(btn => {
    btn.addEventListener('click', () => {
      const pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!pressed));
    });
  });
});


// Remove active class immediately after click to prevent persistent highlight
['#filterToggleBtn','#favOnlyToggleBtn','#randomBtn','.reset-btn'].forEach(sel => {
  document.querySelectorAll(sel).forEach(btn => {
    btn.addEventListener('mouseup', () => btn.classList.remove('active'));
    btn.addEventListener('blur', () => btn.classList.remove('active'));
  });
});

    [elFav, elRand].forEach(el => {
      const sp = el.querySelector('span'); if (sp) sp.textContent = sp.textContent.trim();
    });
    if (!elFilter.dataset.label) elFilter.dataset.label = 'フィルタ';
  });

  const targets = [elFilter, elFav, elRand, elReset];

  function neededFontSize(el, startPx=16, minPx=12){
    el.style.setProperty('--ctl-fs', startPx + 'px');
    for (let fs = startPx; fs >= minPx; fs--){
      el.style.setProperty('--ctl-fs', fs + 'px');
      if (el.scrollWidth <= el.clientWidth + 2) return fs;
    }
    return minPx;
  }
  function fitAll(){
    if (!window.matchMedia('(max-width: 768px)').matches){
      targets.forEach(el => el.style.removeProperty('--ctl-fs'));
      return;
    }
    const sizes = targets.map(el => neededFontSize(el, 16, 12));
    const groupFs = Math.min.apply(null, sizes);
    targets.forEach(el => el.style.setProperty('--ctl-fs', groupFs + 'px'));
    if (targets.some(el => el.scrollWidth > el.clientWidth + 2)){
      const s = Math.max(12, groupFs - 1);
      targets.forEach(el => el.style.setProperty('--ctl-fs', s + 'px'));
    }
  }
  window.addEventListener('load', fitAll, { passive:true });
  window.addEventListener('resize', fitAll, { passive:true });
  window.addEventListener('orientationchange', fitAll, { passive:true });
  setTimeout(fitAll, 120);
})();


// --- Prevent sticky focus after click: blur on pointer interaction ---
['filterToggleBtn','favOnlyToggleBtn','randomBtn','resetBtn','historyToggle'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('pointerup', (e) => {
    // Keep keyboard accessibility: only blur for actual pointer interactions
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      // Defer to allow click handlers to run
      setTimeout(() => el.blur(), 0);
    }
  });
});


// ===== iOSスタンドアロン時の微調整 =====
document.addEventListener('DOMContentLoaded', () => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  // 固定ヘッダーの実サイズから --header-offset を再計算（フォント差・環境差吸収）
  const sticky = document.querySelector('.sticky-search-area');
  if (sticky) {
    const h = sticky.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--header-offset', Math.ceil(h + 12) + 'px');
  }

  // Drawer開閉に合わせて背景スクロールを止める
  const drawer = document.getElementById('filterDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const toggleBtn = document.getElementById('filterToggleBtn');

  function openDrawer() {
    drawer.style.display = 'block';
    backdrop.classList.add('show');
    document.body.classList.add('modal-open');
    toggleBtn?.setAttribute('aria-expanded', 'true');
    toggleBtn?.setAttribute('aria-pressed', 'true');
  }
  function closeDrawer() {
    drawer.style.display = 'none';
    backdrop.classList.remove('show');
    document.body.classList.remove('modal-open');
    toggleBtn?.setAttribute('aria-expanded', 'false');
    toggleBtn?.setAttribute('aria-pressed', 'false');
  }

  // 既存のトグル処理にフック（重複防止のため存在確認）
  if (toggleBtn && drawer && backdrop) {
    // 既存のイベントに影響しないように一応補助リスナーだけ
    backdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  // スタンドアロン時のスクロール端挙動の角を丸める
  if (isStandalone) {
    // iOSで入力フォーカス時の固定ボタン突き抜け対策：スクロール時に一瞬隠す
    let lastY = window.scrollY;
    let hideTimer = null;
    const floating = [document.getElementById('toTopBtn'), document.getElementById('darkModeBtn')].filter(Boolean);
    window.addEventListener('scroll', () => {
      const diff = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      if (diff > 8) {
        floating.forEach(el => el.style.opacity = '0');
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => floating.forEach(el => el.style.opacity = ''), 120);
      }
    }, { passive: true });
  }
});


// --- YouTubeサムネ：多段フォールバック ---
function extractVideoId(url) {
  // 例: https://www.youtube.com/watch?v=XXXXXXXX
  const m = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
  return m ? m[1] : null;
}
function buildThumbCandidates(videoId) {
  // 存在しないことがある順に並べる（成功したらそこで打ち止め）
  return [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/default.jpg`,
  ];
}
function createThumbImg(youtubeUrl, altText = 'thumbnail') {
  const id = extractVideoId(youtubeUrl);
  const img = document.createElement('img');
  img.className = 'thumbnail';
  img.alt = altText;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer'; // 稀な403対策

  const list = id ? buildThumbCandidates(id) : [];
  let idx = 0;
  const tryNext = () => {
    if (idx < list.length) {
      img.src = list[idx++];
    } else {
      img.src = 'logo.png'; // 最終プレースホルダー（任意）
      img.classList.add('thumb-fallback');
    }
  };
  img.addEventListener('error', tryNext);
  tryNext(); // kick
  return img;
}

// 例：カード生成のところ
const thumb = createThumbImg(item.link, `#${item.episode} サムネイル`);
thumbnailContainer.appendChild(thumb);


self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname.endsWith('ytimg.com')) {
    // YouTubeサムネはSWでいじらず素通し
    return event.respondWith(fetch(event.request));
  }

  // 既存の network-first ロジック …
  event.respondWith((async () => {
    try {
      const fresh = await fetch(event.request, { cache: 'no-store' });
      if (event.request.method === 'GET' && fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, fresh.clone());
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      throw err;
    }
  })());
});

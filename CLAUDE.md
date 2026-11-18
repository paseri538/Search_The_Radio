# さーち・ざ・らじお！（Search_The_Radio）

Claude Pro プランの利用制限に配慮して、読む量を最小にすること。

## 大きいファイルは丸ごと読まない
`style.css`（約270KB）・`main.js`（約190KB）・`admin/admin.js`（約170KB）・`admin/serve.py`（約90KB）は、
まず `grep -n` で場所を探し、必要な行の範囲だけ読む（Read の offset/limit や `sed -n 'A,Bp'`）。

## 読まなくてよいもの
- `admin/backup/`（編集ツールが作る過去の版）・`thumbnails/`（画像）
- `admin/serve.log` は `tail` で最後の数十行だけ
- `episodes.json` などのデータは、必要な回だけ `grep` で探す

## 仕組みのメモ
- 編集ツール: `admin/start.command` で起動（http://localhost:8790/admin/ ）。`serve.py` は書き換えると自動で入れ替わるので、再起動は不要
- 外から見るプレビュー（Cloudflare のトンネル）とその仕組みは `admin/serve.py` 冒頭の説明にまとまっている

## 編集ツールを直すときは4つのサイトとも直す
編集ツール（admin/）を修正するときは、さーち・ざ・らじお！（このフォルダ）・ぼっち・ざ・ひすとりー！（~/Downloads/Bocchi_The_History）・ypik（~/Downloads/ypik）・長谷川育美非公式サイト(検)（~/Downloads/Hasegawa_Ikumi_Radio）の4つとも同じように直す。
- 長谷川育美非公式サイト(検)の編集ツールは、このフォルダの admin/ をもとに作り替えたもの（AuDee の配信なので YouTube の機能は無い。時刻は表記だけ）。admin.js などの改良は同じ意図で移す
- ぼっちと ypik の `admin/phone.py` は同じ中身（片方を直したらもう片方へコピー）。さーち・ざ・らじお！は `admin/serve.py` の中に同じ役目のコードがある
- 作りが少し違う（さーち・ざ・らじお！はプレビューを読み直す／描き直す、ぼっち・ypik は postMessage で中身を渡す）ので、同じ意図で移す

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

s:
	node_modules/.bin/hexo s

fmt:
	node_modules/.bin/markdownlint-cli2 --fix "**/*.md"
	node_modules/.bin/prettier --write "scripts/**/*.js" "*.mjs"

# グロブはクォートして textlint に展開させる。裸で書くと bash が展開し、
# globstar 無しの ** は1階層しか辿らない。以前は source/_posts/*.md の行が
# 先にあり、記事は年ディレクトリの下にあって1件も一致しないため
# SearchFilesNoTargetFileError で止まり、本命の行に到達していなかった (#2712)
fix:
	node_modules/.bin/textlint --fix "source/_posts/**/*.md"

g:
	node_modules/.bin/hexo g

css:
	node css.mjs

# 文字サイズが段（_variables.styl の text-*）から外れていないかを検査する (#2971)。
# 寄せ終えた直後に別の PR が 1.4em を直接書いて戻した実績がある
lint-css:
	node css.mjs
	node css_lint.mjs
	node font_size_lint.mjs

mermaid:
	node mermaid_svg.mjs

clean:
	node_modules/.bin/hexo clean

lint:
	npx lint-staged

update:
	snssharecount > temp.json
	mv temp.json sns_count_cache.json
	echo "refresh sns_count_cache.json"
	ga > ga_cache.json
	pv > ga4_pv.json
	echo "refresh ga_cache.json"

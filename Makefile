SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

s:
	node_modules/.bin/hexo s

lint:
	npx lint-staged

update:
	snssharecount > temp.json
	mv temp.json sns_count_cache.json
	echo "refresh sns_count_cache.json"
	ga > ga_cache.json
	pv > ga4_pv.json
	echo "refresh ga_cache.json"

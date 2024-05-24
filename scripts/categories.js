'use strict';

const pagination = require('hexo-pagination');

hexo.extend.generator.register("categories", function(locals) {
   return  pagination('categories', locals.posts.slice(0, 1), {
        layout: ['categories', 'archive', 'index'],
    });
});

hexo.extend.helper.register('count_categories', function() {
  return this.site.categories.map(category => category.name).flat().unique().length;
});

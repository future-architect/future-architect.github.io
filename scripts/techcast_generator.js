'use strict';

const pagination = require('hexo-pagination');

// Author Root Page
hexo.extend.generator.register("techcasts", function(locals) {
   return  pagination('techcasts', locals.posts.slice(0, 1), {
        layout: ['techcasts', 'archive', 'index'],
    });
});

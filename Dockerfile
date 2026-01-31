FROM jekyll/jekyll

WORKDIR /src

# Install gems and serve at runtime (volume will be mounted)
CMD bundle install && bundle exec jekyll serve --host 0.0.0.0 --incremental --livereload

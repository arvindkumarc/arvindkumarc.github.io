FROM jekyll/jekyll

WORKDIR /src

RUN gem install bundler -v 2.2.28

ENTRYPOINT bundle update && bundle exec jekyll serve \
  --host 0.0.0.0 --config _config.yml

# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "jekyll-theme-nangka"
  spec.version       = "0.1.1"
  spec.authors       = ["Rahmat Subekti"]
  spec.email         = ["rmsubekti@hotmail.com"]

  spec.summary       = "Simple jekyll theme nangka"
  spec.homepage      = "https://github.com/rmsubekti/nangka"
  spec.license       = "MIT"

  spec.files         = `git ls-files -z`.split("\x0").select { |f| f.match(%r{^(assets|_(data|includes|layouts|sass)/|(LICENSE|README|CHANGELOG)((\.(txt|md|markdown)|$)))}i) }

  spec.add_runtime_dependency "jekyll", "~> 3.7"
  spec.add_runtime_dependency "jekyll-seo-tag", "~> 2.1"
  spec.add_runtime_dependency "jekyll-paginate", "~> 1.1"
  spec.add_runtime_dependency "jekyll-sitemap", "~> 1.2"
  spec.add_runtime_dependency "jekyll-gist", "~> 1.5"
  spec.add_runtime_dependency "jekyll-feed", "~> 0.11"
  spec.add_runtime_dependency "jemoji", "~> 0.10"
  spec.add_runtime_dependency "jekyll-avatar", "~> 0.6"
  spec.add_runtime_dependency "jekyll-redirect-from", "~> 0.14"
  spec.add_runtime_dependency 'jekyll-github-metadata', '~> 2.12', '>= 2.12.1'
  
  spec.add_development_dependency "bundler", "~> 2.0.2"
  spec.add_development_dependency "rake", "~> 12.0"
end

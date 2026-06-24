require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |spec|
  spec.name         = "retro-watermark"
  spec.version      = package["version"]
  spec.summary      = package["description"]
  spec.homepage     = "https://www.npmjs.com/package/retro-watermark"
  spec.license      = package["license"]
  spec.author       = "retro-watermark contributors"
  spec.platforms    = { :ios => "11.0" }
  spec.source       = { :http => "https://registry.npmjs.org/retro-watermark/-/retro-watermark-#{spec.version}.tgz" }
  spec.source_files = "ios/RNImageInspector.m"
  spec.dependency "React-Core"
end

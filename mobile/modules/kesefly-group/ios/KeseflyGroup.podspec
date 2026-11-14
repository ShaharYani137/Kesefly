Pod::Spec.new do |s|
  s.name           = 'KeseflyGroup'
  s.version        = '1.0.0'
  s.summary        = 'Finds the App Group a sideloaded Kesefly build was signed with.'
  s.description    = 'Local Expo module: resolves the real App Group (ALTAppGroups, provisioning profile, or the original name) so the widget can read app data.'
  s.author         = ''
  s.homepage       = 'https://github.com/ShaharYani137/Kesefly'
  s.license        = 'MIT'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.{h,m,mm,swift}'
end

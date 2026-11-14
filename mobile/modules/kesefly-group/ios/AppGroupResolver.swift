import Foundation

/// Finds the App Group this build was actually signed with.
///
/// The app asks for `group.com.kesefly.app`, but sideloading tools re-sign it with a free team
/// and rename the group (AltStore / SideStore append the team ID and list the new name in
/// Info.plist `ALTAppGroups`). A paid account keeps the original name. A free Apple ID through
/// Sideloadly grants no App Group at all; then this returns nil and the app and the widget
/// cannot share data.
///
/// Order: Info.plist `ALTAppGroups`, then the groups in the bundle's embedded provisioning
/// profile, then the original name. Only a group whose shared container exists is returned.
/// The same file is copied into the widget target (targets/widget/AppGroupResolver.swift).
enum AppGroupResolver {
  static let requested = "group.com.kesefly.app"

  static func resolve(bundle: Bundle = .main) -> String? {
    var candidates: [String] = []
    if let alt = bundle.object(forInfoDictionaryKey: "ALTAppGroups") as? [String] {
      candidates += prefer(alt)
    }
    candidates += prefer(provisionedGroups(bundle: bundle))
    candidates.append(requested)
    for group in candidates where FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) != nil {
      return group
    }
    return nil
  }

  /// Groups that keep the original name (e.g. `group.com.kesefly.app.ABCDE12345`) first.
  private static func prefer(_ groups: [String]) -> [String] {
    groups.filter { $0.hasPrefix(requested) } + groups.filter { !$0.hasPrefix(requested) }
  }

  /// `com.apple.security.application-groups` from `embedded.mobileprovision`. The profile is a
  /// signed CMS blob with an XML plist inside; the plist part is read as text.
  private static func provisionedGroups(bundle: Bundle) -> [String] {
    let url = bundle.bundleURL.appendingPathComponent("embedded.mobileprovision")
    guard let data = try? Data(contentsOf: url),
          let start = data.range(of: Data("<?xml".utf8)),
          let end = data.range(of: Data("</plist>".utf8), in: start.lowerBound..<data.endIndex),
          let plist = try? PropertyListSerialization.propertyList(from: data.subdata(in: start.lowerBound..<end.upperBound), format: nil) as? [String: Any],
          let ent = plist["Entitlements"] as? [String: Any],
          let groups = ent["com.apple.security.application-groups"] as? [String] else { return [] }
    return groups
  }
}

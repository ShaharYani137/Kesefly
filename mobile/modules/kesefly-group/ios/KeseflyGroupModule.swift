import ExpoModulesCore

/// JS access to the App Group the app was signed with (see AppGroupResolver.swift).
public class KeseflyGroupModule: Module {
  public func definition() -> ModuleDefinition {
    Name("KeseflyGroup")

    /// The App Group to write widget data into, or null when this install has none.
    Function("appGroup") { () -> String? in
      AppGroupResolver.resolve()
    }
  }
}

// Web stand-in for @bacons/apple-targets (see README.md): there is no iOS widget on the web.
export class ExtensionStorage {
  constructor() {}
  set() {}
  get() {
    return null;
  }
  remove() {}
  static reloadWidget() {}
}

const { withAppDelegate, AndroidConfig, IOSConfig } = require("@expo/config-plugins");

function addTransparentWindowBackground(appDelegate) {
  // Insert code to make window background clear and set status bar translucent on iOS
  // We'll try to find didFinishLaunchingWithOptions and inject before 'return YES;'
  const marker = "return YES;";
  if (appDelegate.indexOf(marker) === -1) {
    return appDelegate;
  }

  const injection = `
  // --- injected by withTransparentStatusBar plugin: make window background transparent ---
  @try {
    if (self.window) {
      self.window.backgroundColor = [UIColor clearColor];
    } else if ([[[UIApplication sharedApplication] delegate] window]) {
      [[[UIApplication sharedApplication] delegate] window].backgroundColor = [UIColor clearColor];
    }
    // Ensure status bar appears translucent
    if (@available(iOS 13.0, *)) {
      // nothing specific here; window background clear is main change
    }
  } @catch (NSException *exception) {
    // ignore
  }
  // --- end plugin injection ---
`;

  return appDelegate.replace(marker, injection + "\n  " + marker);
}

module.exports = function withTransparentStatusBar(config) {
  return withAppDelegate(config, (config) => {
    if (!config.modResults || !config.modResults.contents) {
      return config;
    }
    try {
      config.modResults.contents = addTransparentWindowBackground(
        config.modResults.contents
      );
    } catch (e) {
      // ignore
    }
    return config;
  });
};

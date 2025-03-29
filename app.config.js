module.exports = {
  name: "ChatbotGenie",
  slug: "ChatbotGenie",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  scheme: "msauth.com.taylorfarms.ChatbotGenie",
  owner: "Taylor Fresh Foods, Inc",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.taylorfarms.ChatbotGenie",
    requireFullScreen: true,
    infoPlist: {
      UISupportedInterfaceOrientations: [
        "UIInterfaceOrientationPortrait",
        "UIInterfaceOrientationLandscapeLeft",
        "UIInterfaceOrientationLandscapeRight"
      ],
      "UISupportedInterfaceOrientations~ipad": [
        "UIInterfaceOrientationPortrait",
        "UIInterfaceOrientationLandscapeLeft",
        "UIInterfaceOrientationLandscapeRight"
      ],
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.taylorfarms.ChatbotGenie"
  },
  extra: {
    eas: {
      projectId: "fa78857b-9c66-4627-b8c9-d03542144ca0"
    },
    MAX_MESSAGE_LENGTH: process.env.MAX_MESSAGE_LENGTH || 1000,
    SHOW_COUNT_THRESHOLD: process.env.SHOW_COUNT_THRESHOLD || 900
  }
}; 
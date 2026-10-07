/**
 * Config plugin: declare the dataSync foreground-service type on
 * react-native-background-actions' service.
 *
 * On Android 14+ (targetSdk 34+) a foreground service started with a type must
 * also declare that type in the manifest, or startForeground throws
 * MissingForegroundServiceTypeException. RNBA's own manifest declares the
 * service WITHOUT a type, so we merge `android:foregroundServiceType="dataSync"`
 * onto it here. This runs on every `expo prebuild`, so it survives clean
 * regenerations (unlike a hand-edit of android/).
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const SERVICE_NAME = 'com.asterinet.react.bgactions.RNBackgroundActionsTask';

module.exports = function withForegroundServiceType(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (!application) return cfg;

    application.service = application.service || [];
    const existing = application.service.find(
      (s) => s.$ && s.$['android:name'] === SERVICE_NAME,
    );

    if (existing) {
      existing.$['android:foregroundServiceType'] = 'dataSync';
    } else {
      application.service.push({
        $: {
          'android:name': SERVICE_NAME,
          'android:foregroundServiceType': 'dataSync',
          'tools:node': 'merge',
        },
      });
    }

    return cfg;
  });
};

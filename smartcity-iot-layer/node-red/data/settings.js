module.exports = {
    flowFile: 'flows.json',
    credentialSecret: false,
    flowFilePretty: true,
    uiPort: process.env.PORT || 1880,
    diagnostics: { enabled: true, ui: true },
    runtimeState: { enabled: false, ui: false },
    logging: {
        console: {
            level: "info",
            metrics: false,
            audit: false
        }
    },
    exportGlobalContextKeys: false,
    functionExternalModules: true,
    globalFunctionTimeout: 0,
    functionTimeout: 0,
    debugMaxLength: 1000,
    mqttReconnectTime: 15000,
    serialReconnectTime: 15000,
    functionGlobalContext: {}
};
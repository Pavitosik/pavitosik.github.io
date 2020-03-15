var cached_settings = null;

function initSettings() {
    if (!cached_settings) {
        var storage = localStorage.getItem("settings");
        if (storage) {
            try {
                cached_settings = JSON.parse(storage);
                if (!cached_settings)
                    cached_settings = {};
            } catch (error) {
                cached_settings = {};
            }
        }
        else
            // If settings dont exist or cached_settings is invalid, use empty cached_settings object
            cached_settings = {};
    }
}

exports.get = function (setting) {
    // Init in case cached_settings isn't valid currently
    initSettings();
    // No need to parse settings again, all settings values are already known. Get from cache.
    return cached_settings[setting];
}

exports.set = function (setting, value) {
    // Init in case cached_settings isn't valid currently
    initSettings();
    // Set value
    cached_settings[setting] = value;
    // Also save instantly
    localStorage.setItem("settings", JSON.stringify(cached_settings));
}
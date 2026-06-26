var Config = (function() {
    var STORAGE_KEY = 'imagebed_config_v2';
    var INDEX_KEY = 'imagebed_index_v2';
    var HISTORY_KEY = 'imagebed_history_v2';
    var VERSION = '2.0.0';
    
    var defaultConfig = {
        github: {
            token: '',
            username: '',
            repo: '',
            branch: 'main',
            customDomain: ''
        },
        upload: {
            directory: 'common',
            enableCompress: true,
            compressQuality: 80,
            maxWidth: 1920,
            enableWatermark: false,
            watermarkText: '@dancehole',
            watermarkPosition: 'bottom-right',
            watermarkOpacity: 30,
            watermarkFontSize: 24,
            watermarkColor: '#ffffff',
            autoRename: false
        },
        display: {
            defaultView: 'grid',
            linkFormat: 'url'
        }
    };
    
    var config = {};
    var indexData = null;
    var historyData = [];
    
    function init() {
        console.log('[Config] 初始化，版本:', VERSION);
        loadConfig();
        loadIndex();
        loadHistory();
        console.log('[Config] 当前配置:', JSON.stringify(config));
    }
    
    function loadConfig() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                config = JSON.parse(saved);
                config = deepMerge(defaultConfig, config);
            } else {
                config = JSON.parse(JSON.stringify(defaultConfig));
            }
        } catch (e) {
            console.error('Load config error:', e);
            config = JSON.parse(JSON.stringify(defaultConfig));
        }
    }
    
    function saveConfig() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
            return true;
        } catch (e) {
            console.error('Save config error:', e);
            return false;
        }
    }
    
    function get(key) {
        var keys = key.split('.');
        var result = config;
        for (var i = 0; i < keys.length; i++) {
            if (result && result.hasOwnProperty(keys[i])) {
                result = result[keys[i]];
            } else {
                return undefined;
            }
        }
        return result;
    }
    
    function set(key, value) {
        var keys = key.split('.');
        var obj = config;
        for (var i = 0; i < keys.length - 1; i++) {
            if (!obj.hasOwnProperty(keys[i])) {
                obj[keys[i]] = {};
            }
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
        saveConfig();
    }
    
    function getAll() {
        return JSON.parse(JSON.stringify(config));
    }
    
    function reset() {
        config = JSON.parse(JSON.stringify(defaultConfig));
        saveConfig();
        localStorage.removeItem(INDEX_KEY);
        localStorage.removeItem(HISTORY_KEY);
        indexData = null;
        historyData = [];
    }
    
    function deepMerge(target, source) {
        var result = {};
        for (var key in target) {
            if (target.hasOwnProperty(key)) {
                if (typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) {
                    result[key] = JSON.parse(JSON.stringify(target[key]));
                } else {
                    result[key] = target[key];
                }
            }
        }
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    result[key] = deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        return result;
    }
    
    function loadIndex() {
        try {
            var saved = localStorage.getItem(INDEX_KEY);
            if (saved) {
                indexData = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Load index error:', e);
            indexData = null;
        }
    }
    
    function saveIndex(data) {
        indexData = data;
        try {
            localStorage.setItem(INDEX_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Save index error:', e);
            return false;
        }
    }
    
    function getIndex() {
        return indexData;
    }
    
    function loadHistory() {
        try {
            var saved = localStorage.getItem(HISTORY_KEY);
            if (saved) {
                historyData = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Load history error:', e);
            historyData = [];
        }
    }
    
    function saveHistory() {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(historyData));
            return true;
        } catch (e) {
            console.error('Save history error:', e);
            return false;
        }
    }
    
    function getHistory() {
        return historyData;
    }
    
    function addHistory(item) {
        historyData.unshift(item);
        if (historyData.length > 200) {
            historyData = historyData.slice(0, 200);
        }
        saveHistory();
    }
    
    function clearHistory() {
        historyData = [];
        saveHistory();
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        var k = 1024;
        var sizes = ['B', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function formatDate(timestamp) {
        var date = new Date(timestamp);
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        var hours = String(date.getHours()).padStart(2, '0');
        var minutes = String(date.getMinutes()).padStart(2, '0');
        return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes;
    }
    
    function generateFileName(originalName) {
        var ext = originalName.substring(originalName.lastIndexOf('.'));
        var timestamp = Date.now();
        var random = Math.random().toString(36).substring(2, 8);
        return timestamp + '-' + random + ext;
    }
    
    function getImageUrl(path, name) {
        var fullPath = path + '/' + name;
        var customDomain = config.github.customDomain;
        var username = config.github.username;
        var repo = config.github.repo;
        var branch = config.github.branch;
        
        if (customDomain) {
            return customDomain.replace(/\/$/, '') + '/' + fullPath;
        }
        
        if (username && repo) {
            return 'https://cdn.jsdelivr.net/gh/' + username + '/' + repo + '@' + branch + '/' + fullPath;
        }
        
        return '';
    }
    
    function formatLink(url, name) {
        var format = config.display.linkFormat;
        switch (format) {
            case 'markdown':
                return '![' + name + '](' + url + ')';
            case 'html':
                return '<img src="' + url + '" alt="' + name + '">';
            case 'bbcode':
                return '[img]' + url + '[/img]';
            default:
                return url;
        }
    }
    
    return {
        init: init,
        get: get,
        set: set,
        getAll: getAll,
        save: saveConfig,
        reset: reset,
        getIndex: getIndex,
        saveIndex: saveIndex,
        getHistory: getHistory,
        addHistory: addHistory,
        clearHistory: clearHistory,
        formatFileSize: formatFileSize,
        formatDate: formatDate,
        generateFileName: generateFileName,
        getImageUrl: getImageUrl,
        formatLink: formatLink
    };
})();

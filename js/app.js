var App = (function() {
    var currentView = 'gallery';
    var currentImage = null;
    var loadingCount = 0;
    
    function init() {
        Config.init();
        Gallery.init();
        Upload.init();
        
        $('#searchInput').val('');
        
        loadSettingsToForm();
        bindEvents();
        Gallery.loadImages();
        loadHistory();
        updateIndexStatus();
    }
    
    function bindEvents() {
        $('.nav-item').on('click', function() {
            var view = $(this).data('view');
            switchView(view);
        });
        
        $('#syncBtn').on('click', function() {
            syncFromGithub();
        });
        
        $('#saveSettingsBtn').on('click', function() {
            saveSettings();
        });
        
        $('#testConnectionBtn').on('click', function() {
            testConnection();
        });
        
        $('#buildIndexBtn').on('click', function() {
            buildLocalIndex();
        });
        
        $('#exportIndexBtn').on('click', function() {
            exportIndex();
        });
        
        $('#importIndexBtn').on('click', function() {
            $('#importFileInput').click();
        });
        
        $('#importFileInput').on('change', function(e) {
            importIndex(e.target.files[0]);
            $(this).val('');
        });
        
        $('#resetAllBtn').on('click', function() {
            if (confirm('确定要重置所有数据吗？此操作不可撤销！')) {
                resetAll();
            }
        });
        
        $('#defaultView').on('change', function() {
            Config.set('display.defaultView', $(this).val());
        });
        
        $('#linkFormat').on('change', function() {
            Config.set('display.linkFormat', $(this).val());
        });
        
        $('[data-close]').on('click', function() {
            var modal = $(this).data('close');
            closeModal(modal);
        });
        
        $('#copyLinkBtn').on('click', function() {
            if (currentImage) {
                var url = Config.getImageUrl(currentImage.path, currentImage.name);
                var link = Config.formatLink(url, currentImage.name);
                copyToClipboard(link);
            }
        });
        
        $('#renameBtn').on('click', function() {
            if (currentImage) {
                $('#renameInput').val(currentImage.name);
                openModal('rename');
            }
        });
        
        $('#confirmRenameBtn').on('click', function() {
            renameImage();
        });
        
        $('#deleteBtn').on('click', function() {
            if (currentImage && confirm('确定要删除这张图片吗？')) {
                deleteCurrentImage();
            }
        });
        
        $('#downloadBtn').on('click', function() {
            if (currentImage) {
                var url = Config.getImageUrl(currentImage.path, currentImage.name);
                window.open(url, '_blank');
            }
        });
        
        $('#clearHistoryBtn').on('click', function() {
            if (confirm('确定要清空上传历史吗？')) {
                Config.clearHistory();
                loadHistory();
                toast('历史记录已清空', 'success');
            }
        });
        
        $(document).on('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal('modal');
                closeModal('rename');
            }
        });
    }
    
    function switchView(view) {
        currentView = view;
        $('.nav-item').removeClass('active');
        $('.nav-item[data-view="' + view + '"]').addClass('active');
        
        $('.view').removeClass('active');
        $('#view' + view.charAt(0).toUpperCase() + view.slice(1)).addClass('active');
        
        if (view === 'gallery') {
            Gallery.refresh();
        } else if (view === 'history') {
            loadHistory();
        }
    }
    
    function loadSettingsToForm() {
        $('#githubToken').val(Config.get('github.token') || '');
        $('#githubUsername').val(Config.get('github.username') || '');
        $('#githubRepo').val(Config.get('github.repo') || '');
        $('#githubBranch').val(Config.get('github.branch') || 'main');
        $('#customDomain').val(Config.get('github.customDomain') || '');
        
        $('#defaultView').val(Config.get('display.defaultView') || 'grid');
        $('#linkFormat').val(Config.get('display.linkFormat') || 'url');
        
        $('#uploadDir').val(Config.get('upload.directory') || 'common');
        $('#enableCompress').prop('checked', Config.get('upload.enableCompress') !== false);
        $('#compressQuality').val(Config.get('upload.compressQuality') || 80);
        $('#maxWidth').val(Config.get('upload.maxWidth') || 1920);
        $('#qualityValue').text((Config.get('upload.compressQuality') || 80) + '%');
        
        $('#enableWatermark').prop('checked', Config.get('upload.enableWatermark') || false);
        $('#watermarkText').val(Config.get('upload.watermarkText') || '@dancehole');
        $('#watermarkPosition').val(Config.get('upload.watermarkPosition') || 'bottom-right');
        $('#watermarkOpacity').val(Config.get('upload.watermarkOpacity') || 30);
        $('#watermarkFontSize').val(Config.get('upload.watermarkFontSize') || 24);
        $('#watermarkColor').val(Config.get('upload.watermarkColor') || '#ffffff');
        $('#opacityValue').text((Config.get('upload.watermarkOpacity') || 30) + '%');
        $('#autoRename').prop('checked', Config.get('upload.autoRename') || false);
        
        if (Config.get('upload.enableWatermark')) {
            $('#watermarkSettings').show();
        }
    }
    
    function saveSettings() {
        Config.set('github.token', $('#githubToken').val().trim());
        Config.set('github.username', $('#githubUsername').val().trim());
        Config.set('github.repo', $('#githubRepo').val().trim());
        Config.set('github.branch', $('#githubBranch').val().trim() || 'main');
        Config.set('github.customDomain', $('#customDomain').val().trim());
        
        Config.set('upload.directory', $('#uploadDir').val());
        Config.set('upload.enableCompress', $('#enableCompress').is(':checked'));
        Config.set('upload.compressQuality', parseInt($('#compressQuality').val()));
        Config.set('upload.maxWidth', parseInt($('#maxWidth').val()));
        Config.set('upload.enableWatermark', $('#enableWatermark').is(':checked'));
        Config.set('upload.watermarkText', $('#watermarkText').val());
        Config.set('upload.watermarkPosition', $('#watermarkPosition').val());
        Config.set('upload.watermarkOpacity', parseInt($('#watermarkOpacity').val()));
        Config.set('upload.watermarkFontSize', parseInt($('#watermarkFontSize').val()));
        Config.set('upload.watermarkColor', $('#watermarkColor').val());
        Config.set('upload.autoRename', $('#autoRename').is(':checked'));
        
        toast('设置已保存', 'success');
    }
    
    function testConnection() {
        var $result = $('#testResult');
        $result.removeClass('success error').text('测试中...');
        
        var token = $('#githubToken').val().trim();
        var username = $('#githubUsername').val().trim();
        var repo = $('#githubRepo').val().trim();
        
        if (!token || !username || !repo) {
            $result.addClass('error').text('请填写完整信息');
            return;
        }
        
        Config.set('github.token', token);
        Config.set('github.username', username);
        Config.set('github.repo', repo);
        Config.set('github.branch', $('#githubBranch').val().trim() || 'main');
        
        GithubAPI.testConnection().done(function(data) {
            $result.addClass('success').text('连接成功 ✓');
            toast('连接成功', 'success');
        }).fail(function(err) {
            var msg = err.responseJSON && err.responseJSON.message || err.statusText || '连接失败';
            $result.addClass('error').text('连接失败: ' + msg);
        });
    }
    
    function syncFromGithub() {
        if (!Config.get('github.token') || !Config.get('github.username') || !Config.get('github.repo')) {
            toast('请先配置GitHub信息', 'error');
            switchView('settings');
            return;
        }
        
        showLoading('正在同步...');
        
        GithubAPI.getAllImages().done(function(images) {
            var indexData = {
                images: images,
                lastUpdate: Date.now(),
                source: 'github'
            };
            Config.saveIndex(indexData);
            Gallery.loadImages();
            updateIndexStatus();
            hideLoading();
            toast('同步完成，共 ' + images.length + ' 张图片', 'success');
        }).fail(function(err) {
            hideLoading();
            var msg = err.responseJSON && err.responseJSON.message || err.statusText || '同步失败';
            toast('同步失败: ' + msg, 'error');
        });
    }
    
    function buildLocalIndex() {
        if (!Config.get('github.token') || !Config.get('github.username') || !Config.get('github.repo')) {
            toast('请先配置GitHub信息', 'error');
            return;
        }
        
        showLoading('正在构建索引...');
        
        GithubAPI.getAllImages().done(function(images) {
            var indexData = {
                images: images,
                lastUpdate: Date.now(),
                source: 'github'
            };
            Config.saveIndex(indexData);
            Gallery.loadImages();
            updateIndexStatus();
            hideLoading();
            toast('索引构建完成，共 ' + images.length + ' 张图片', 'success');
        }).fail(function(err) {
            hideLoading();
            var msg = err.responseJSON && err.responseJSON.message || err.statusText || '构建失败';
            toast('构建失败: ' + msg, 'error');
        });
    }
    
    function updateIndexStatus() {
        var indexData = Config.getIndex();
        var $status = $('#indexStatus');
        
        if (indexData && indexData.images) {
            var count = indexData.images.length;
            var date = indexData.lastUpdate ? Config.formatDate(indexData.lastUpdate) : '未知';
            $status.html('已生成，共 <strong>' + count + '</strong> 张图片<br>最后更新: ' + date);
        } else {
            $status.text('未生成');
        }
    }
    
    function exportIndex() {
        var indexData = Config.getIndex();
        if (!indexData) {
            toast('没有可导出的索引数据', 'warning');
            return;
        }
        
        var blob = new Blob([JSON.stringify(indexData, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'imagebed-index.json';
        a.click();
        URL.revokeObjectURL(url);
        toast('导出成功', 'success');
    }
    
    function importIndex(file) {
        if (!file) return;
        
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = JSON.parse(e.target.result);
                if (data.images && Array.isArray(data.images)) {
                    Config.saveIndex(data);
                    Gallery.loadImages();
                    updateIndexStatus();
                    toast('导入成功，共 ' + data.images.length + ' 张图片', 'success');
                } else {
                    toast('无效的索引文件格式', 'error');
                }
            } catch (err) {
                toast('导入失败: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    }
    
    function resetAll() {
        Config.reset();
        loadSettingsToForm();
        Gallery.loadImages();
        loadHistory();
        updateIndexStatus();
        toast('所有数据已重置', 'success');
    }
    
    function showImageModal(img) {
        currentImage = img;
        var url = Config.getImageUrl(img.path, img.name);
        
        $('#previewImage').attr('src', url);
        $('#infoName').text(img.name);
        $('#infoPath').text(img.path);
        $('#infoSize').text(Config.formatFileSize(img.size || 0));
        $('#infoUrl').val(Config.formatLink(url, img.name));
        
        openModal('modal');
    }
    
    function openModal(name) {
        $('#' + (name === 'modal' ? 'image' : name) + 'Modal').addClass('active');
    }
    
    function closeModal(name) {
        $('#' + (name === 'modal' ? 'image' : name) + 'Modal').removeClass('active');
    }
    
    function renameImage() {
        var newName = $('#renameInput').val().trim();
        if (!newName || !currentImage) return;
        
        var oldExt = currentImage.name.substring(currentImage.name.lastIndexOf('.'));
        var newExt = newName.substring(newName.lastIndexOf('.'));
        if (newExt === newName) {
            newName = newName + oldExt;
        }
        
        var oldPath = currentImage.fullPath;
        var newPath = currentImage.path + '/' + newName;
        
        showLoading('重命名中...');
        closeModal('rename');
        
        GithubAPI.renameFile(oldPath, newPath).done(function() {
            var indexData = Config.getIndex();
            if (indexData && indexData.images) {
                var img = indexData.images.find(function(i) {
                    return i.fullPath === oldPath;
                });
                if (img) {
                    img.name = newName;
                    img.fullPath = newPath;
                }
                Config.saveIndex(indexData);
            }
            
            Gallery.loadImages();
            hideLoading();
            closeModal('modal');
            toast('重命名成功', 'success');
        }).fail(function(err) {
            hideLoading();
            var msg = err.responseJSON && err.responseJSON.message || err.statusText || '重命名失败';
            toast('重命名失败: ' + msg, 'error');
        });
    }
    
    function deleteCurrentImage() {
        if (!currentImage) return;
        
        showLoading('删除中...');
        closeModal('modal');
        
        GithubAPI.deleteFile(currentImage.fullPath).done(function() {
            var indexData = Config.getIndex();
            if (indexData && indexData.images) {
                indexData.images = indexData.images.filter(function(img) {
                    return img.fullPath !== currentImage.fullPath;
                });
                Config.saveIndex(indexData);
            }
            
            Gallery.loadImages();
            hideLoading();
            toast('删除成功', 'success');
        }).fail(function(err) {
            hideLoading();
            var msg = err.responseJSON && err.responseJSON.message || err.statusText || '删除失败';
            toast('删除失败: ' + msg, 'error');
        });
    }
    
    function loadHistory() {
        var history = Config.getHistory();
        var $list = $('#historyList');
        
        if (history.length === 0) {
            $list.html('<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">暂无上传记录</div></div>');
            return;
        }
        
        var html = '';
        history.forEach(function(item) {
            html += '<div class="history-item">';
            var thumbUrl = Config.getImageUrl(item.path, item.name);
            html += '<img class="history-thumb" src="' + thumbUrl + '" alt="" loading="lazy">';
            html += '<div class="history-info">';
            html += '<div class="history-name" title="' + item.name + '">' + item.name + '</div>';
            html += '<div class="history-meta">';
            html += '<span>' + item.path + '</span>';
            html += '<span> · </span>';
            html += '<span>' + Config.formatFileSize(item.size || 0) + '</span>';
            html += '<span> · </span>';
            html += '<span>' + Config.formatDate(item.uploadTime || Date.now()) + '</span>';
            html += '</div>';
            html += '</div>';
            html += '<div class="history-actions">';
            html += '<button class="btn btn-small btn-secondary copy-history-btn" data-url="' + item.url + '" data-name="' + item.name + '">复制链接</button>';
            html += '</div>';
            html += '</div>';
        });
        
        $list.html(html);
        
        $list.off('click', '.copy-history-btn').on('click', '.copy-history-btn', function() {
            var url = $(this).data('url');
            var name = $(this).data('name');
            var link = Config.formatLink(url, name);
            copyToClipboard(link);
        });
    }
    
    function copyToClipboard(text) {
        var tempInput = document.createElement('textarea');
        tempInput.value = text;
        tempInput.style.position = 'fixed';
        tempInput.style.opacity = '0';
        document.body.appendChild(tempInput);
        tempInput.select();
        
        try {
            document.execCommand('copy');
            toast('已复制到剪贴板', 'success');
        } catch (err) {
            toast('复制失败', 'error');
        }
        
        document.body.removeChild(tempInput);
    }
    
    function toast(message, type) {
        var $toast = $('#toast');
        $toast.removeClass('success error warning');
        if (type) {
            $toast.addClass(type);
        }
        $toast.text(message).addClass('show');
        
        setTimeout(function() {
            $toast.removeClass('show');
        }, 2500);
    }
    
    function showLoading(text) {
        loadingCount++;
        if (loadingCount === 1) {
            var $loading = $('<div class="loading-overlay" id="globalLoading"><div class="loading-spinner"></div><div class="loading-text">' + (text || '加载中...') + '</div></div>');
            $('body').append($loading);
        } else {
            $('#globalLoading .loading-text').text(text || '加载中...');
        }
    }
    
    function hideLoading() {
        loadingCount--;
        if (loadingCount <= 0) {
            loadingCount = 0;
            $('#globalLoading').remove();
        }
    }
    
    return {
        init: init,
        switchView: switchView,
        showImageModal: showImageModal,
        copyToClipboard: copyToClipboard,
        toast: toast,
        showLoading: showLoading,
        hideLoading: hideLoading
    };
})();

$(document).ready(function() {
    App.init();
});

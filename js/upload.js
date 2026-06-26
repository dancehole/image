var Upload = (function() {
    var uploadQueue = [];
    var uploading = false;
    
    function init() {
        bindEvents();
    }
    
    function bindEvents() {
        $('#uploadArea').on('click', function() {
            $('#fileInput').click();
        });
        
        $('#fileInput').on('change', function(e) {
            handleFiles(e.target.files);
            $(this).val('');
        });
        
        $('#uploadArea').on('dragover', function(e) {
            e.preventDefault();
            $(this).addClass('dragover');
        });
        
        $('#uploadArea').on('dragleave', function(e) {
            e.preventDefault();
            $(this).removeClass('dragover');
        });
        
        $('#uploadArea').on('drop', function(e) {
            e.preventDefault();
            $(this).removeClass('dragover');
            handleFiles(e.originalEvent.dataTransfer.files);
        });
        
        $('#enableWatermark').on('change', function() {
            if ($(this).is(':checked')) {
                $('#watermarkSettings').show();
            } else {
                $('#watermarkSettings').hide();
            }
        });
        
        $('#compressQuality').on('input', function() {
            $('#qualityValue').text($(this).val() + '%');
        });
        
        $('#watermarkOpacity').on('input', function() {
            $('#opacityValue').text($(this).val() + '%');
        });
        
        $('#startUploadBtn').on('click', function() {
            startUpload();
        });
        
        $('#clearQueueBtn').on('click', function() {
            if (uploading) {
                App.toast('正在上传中，无法清空', 'warning');
                return;
            }
            uploadQueue = [];
            renderQueue();
            $('#uploadQueue').hide();
        });
        
        $('#queueList').on('click', '.queue-remove', function() {
            if (uploading) {
                App.toast('正在上传中，无法移除', 'warning');
                return;
            }
            var index = $(this).closest('.queue-item').data('index');
            uploadQueue.splice(index, 1);
            renderQueue();
            if (uploadQueue.length === 0) {
                $('#uploadQueue').hide();
            }
        });
        
        $('#uploadBtnTop').on('click', function() {
            App.switchView('upload');
        });
    }
    
    function handleFiles(files) {
        var newItems = [];
        
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (!GithubAPI.isImageFile(file.name)) {
                App.toast(file.name + ' 不是图片文件', 'warning');
                continue;
            }
            
            newItems.push({
                file: file,
                name: file.name,
                size: file.size,
                status: 'pending',
                progress: 0,
                thumbUrl: null
            });
        }
        
        if (newItems.length === 0) {
            return;
        }
        
        newItems.forEach(function(item) {
            ImageUtils.generateThumbnail(item.file, 100).done(function(thumb) {
                item.thumbUrl = thumb;
                renderQueue();
            });
        });
        
        uploadQueue = uploadQueue.concat(newItems);
        renderQueue();
        $('#uploadQueue').show();
    }
    
    function renderQueue() {
        var html = '';
        uploadQueue.forEach(function(item, index) {
            var statusText = '';
            switch (item.status) {
                case 'pending':
                    statusText = '等待上传';
                    break;
                case 'processing':
                    statusText = '处理中...';
                    break;
                case 'uploading':
                    statusText = '上传中... ' + item.progress + '%';
                    break;
                case 'success':
                    statusText = '上传成功';
                    break;
                case 'error':
                    statusText = '上传失败: ' + (item.errorMsg || '');
                    break;
            }
            
            html += '<div class="queue-item ' + item.status + '" data-index="' + index + '">';
            html += '<img class="queue-thumb" src="' + (item.thumbUrl || 'data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"%3E%3Crect fill=\"%23eee\" width=\"100\" height=\"100\"/%3E%3C/svg%3E') + '" alt="">';
            html += '<div class="queue-info">';
            html += '<div class="queue-name" title="' + item.name + '">' + item.name + '</div>';
            html += '<div class="queue-status">' + statusText + '</div>';
            html += '<div class="queue-progress"><div class="queue-progress-bar" style="width:' + item.progress + '%"></div></div>';
            html += '</div>';
            html += '<button class="queue-remove" title="移除">✕</button>';
            html += '</div>';
        });
        
        $('#queueList').html(html);
    }
    
    function getUploadOptions() {
        return {
            directory: $('#uploadDir').val(),
            enableCompress: $('#enableCompress').is(':checked'),
            compressQuality: parseInt($('#compressQuality').val()),
            maxWidth: parseInt($('#maxWidth').val()),
            enableWatermark: $('#enableWatermark').is(':checked'),
            watermarkText: $('#watermarkText').val(),
            watermarkPosition: $('#watermarkPosition').val(),
            watermarkOpacity: parseInt($('#watermarkOpacity').val()),
            watermarkFontSize: parseInt($('#watermarkFontSize').val()),
            watermarkColor: $('#watermarkColor').val(),
            autoRename: $('#autoRename').is(':checked')
        };
    }
    
    function startUpload() {
        if (uploading) {
            return;
        }
        
        if (uploadQueue.length === 0) {
            App.toast('请先添加图片', 'warning');
            return;
        }
        
        if (!Config.get('github.token') || !Config.get('github.username') || !Config.get('github.repo')) {
            App.toast('请先配置GitHub信息', 'error');
            App.switchView('settings');
            return;
        }
        
        var pendingItems = uploadQueue.filter(function(item) {
            return item.status === 'pending' || item.status === 'error';
        });
        
        if (pendingItems.length === 0) {
            App.toast('没有待上传的图片', 'warning');
            return;
        }
        
        uploading = true;
        $('#startUploadBtn').prop('disabled', true).text('上传中...');
        
        uploadNext(0);
    }
    
    function uploadNext(index) {
        var pendingItems = uploadQueue.filter(function(item) {
            return item.status === 'pending' || item.status === 'error';
        });
        
        if (index >= pendingItems.length) {
            uploading = false;
            $('#startUploadBtn').prop('disabled', false).text('开始上传');
            
            var successCount = uploadQueue.filter(function(item) {
                return item.status === 'success';
            }).length;
            
            var failCount = uploadQueue.filter(function(item) {
                return item.status === 'error';
            }).length;
            
            if (successCount > 0) {
                App.toast('上传完成：成功 ' + successCount + ' 张，失败 ' + failCount + ' 张', successCount > 0 ? 'success' : 'error');
                Gallery.loadImages();
            }
            return;
        }
        
        var item = pendingItems[index];
        uploadSingle(item).always(function() {
            uploadNext(index + 1);
        });
    }
    
    function uploadSingle(item) {
        var deferred = $.Deferred();
        var options = getUploadOptions();
        
        item.status = 'processing';
        item.progress = 10;
        renderQueue();
        
        var fileName = item.name;
        if (options.autoRename) {
            fileName = Config.generateFileName(item.name);
        }
        
        var uploadPath = options.directory + '/' + fileName;
        
        ImageUtils.processImage(item.file, options).done(function(processedBlob) {
            item.status = 'uploading';
            item.progress = 50;
            renderQueue();
            
            ImageUtils.blobToBase64(processedBlob).done(function(base64Content) {
                GithubAPI.uploadFile(uploadPath, base64Content, 'Upload ' + fileName).done(function(result) {
                    item.status = 'success';
                    item.progress = 100;
                    item.resultUrl = Config.getImageUrl(options.directory, fileName);
                    renderQueue();
                    
                    var historyItem = {
                        name: fileName,
                        path: options.directory,
                        fullPath: uploadPath,
                        size: processedBlob.size,
                        url: item.resultUrl,
                        uploadTime: Date.now()
                    };
                    Config.addHistory(historyItem);
                    
                    addToIndex(historyItem);
                    
                    deferred.resolve();
                }).fail(function(err) {
                    item.status = 'error';
                    item.errorMsg = err.responseJSON && err.responseJSON.message || err.statusText;
                    renderQueue();
                    deferred.reject();
                });
            }).fail(function() {
                item.status = 'error';
                item.errorMsg = '文件转换失败';
                renderQueue();
                deferred.reject();
            });
        }).fail(function(err) {
            item.status = 'error';
            item.errorMsg = err || '图片处理失败';
            renderQueue();
            deferred.reject();
        });
        
        return deferred.promise();
    }
    
    function addToIndex(item) {
        var indexData = Config.getIndex() || { images: [], lastUpdate: 0 };
        if (!indexData.images) {
            indexData.images = [];
        }
        
        var existingIndex = indexData.images.findIndex(function(img) {
            return img.fullPath === item.fullPath;
        });
        
        if (existingIndex !== -1) {
            indexData.images[existingIndex] = item;
        } else {
            indexData.images.push(item);
        }
        
        indexData.lastUpdate = Date.now();
        Config.saveIndex(indexData);
    }
    
    return {
        init: init,
        handleFiles: handleFiles
    };
})();

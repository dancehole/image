var GithubAPI = (function() {
    var BASE_URL = 'https://api.github.com';
    
    function getHeaders() {
        var token = Config.get('github.token');
        var headers = {
            'Accept': 'application/vnd.github.v3+json'
        };
        if (token) {
            headers['Authorization'] = 'token ' + token;
            console.log('[GithubAPI] Token 已设置，长度:', token.length);
        } else {
            console.log('[GithubAPI] Token 未设置');
        }
        console.log('[GithubAPI] Headers:', headers);
        return headers;
    }
    
    function getRepoPath() {
        var username = Config.get('github.username');
        var repo = Config.get('github.repo');
        return 'repos/' + username + '/' + repo;
    }
    
    function testConnection() {
        return $.ajax({
            url: BASE_URL + '/' + getRepoPath(),
            method: 'GET',
            headers: getHeaders()
        });
    }
    
    function getContents(path) {
        path = path || '';
        var branch = Config.get('github.branch');
        return $.ajax({
            url: BASE_URL + '/' + getRepoPath() + '/contents/' + path,
            method: 'GET',
            headers: getHeaders(),
            data: { ref: branch }
        });
    }
    
    function getAllImages() {
        var images = [];
        var dirs = ['common', 'notebooks', 'danceholeLabs'];
        var debugLog = [];
        var mainDeferred = $.Deferred();
        
        console.log('[ImageBed] Token:', Config.get('github.token') ? '已设置 (' + Config.get('github.token').length + ' chars)' : '未设置');
        console.log('[ImageBed] Username:', Config.get('github.username'));
        console.log('[ImageBed] Repo:', Config.get('github.repo'));
        console.log('[ImageBed] Branch:', Config.get('github.branch'));
        
        function processDir(dir) {
            var deferred = $.Deferred();
            
            console.log('[ImageBed] 正在获取目录:', dir);
            debugLog.push('获取目录: ' + dir);
            
            getContents(dir).done(function(data) {
                console.log('[ImageBed] 目录响应:', dir, data);
                
                if (!Array.isArray(data)) {
                    console.log('[ImageBed] 目录为空或无效:', dir);
                    debugLog.push('目录为空: ' + dir);
                    deferred.resolve();
                    return;
                }
                
                console.log('[ImageBed] 目录内容数量:', dir, data.length);
                debugLog.push('目录 ' + dir + ' 包含 ' + data.length + ' 个项目');
                
                var subPromises = [];
                
                data.forEach(function(item) {
                    if (item.type === 'file' && isImageFile(item.name)) {
                        var filePath = item.path || (dir + '/' + item.name);
                        var imgPath = dir;
                        
                        if (filePath.indexOf('/') !== -1) {
                            var parts = filePath.split('/');
                            imgPath = parts.slice(0, -1).join('/');
                        }
                        
                        images.push({
                            name: item.name,
                            path: imgPath,
                            fullPath: filePath,
                            size: item.size || 0,
                            sha: item.sha,
                            url: item.download_url,
                            htmlUrl: item.html_url
                        });
                        
                        console.log('[ImageBed] 添加图片:', item.name);
                    } else if (item.type === 'dir') {
                        console.log('[ImageBed] 发现子目录:', item.path);
                        subPromises.push(processDir(item.path));
                    } else {
                        console.log('[ImageBed] 跳过文件（非图片）:', item.name, item.type);
                    }
                });
                
                if (subPromises.length > 0) {
                    $.when.apply($, subPromises).always(function() {
                        deferred.resolve();
                    });
                } else {
                    deferred.resolve();
                }
            }).fail(function(err) {
                console.log('[ImageBed] 目录访问失败:', dir, err);
                debugLog.push('访问失败: ' + dir);
                deferred.resolve();
            });
            
            return deferred.promise();
        }
        
        var allPromises = dirs.map(function(dir) {
            return processDir(dir);
        });
        
        $.when.apply($, allPromises).always(function() {
            console.log('[ImageBed] 同步完成，共找到', images.length, '张图片');
            console.log('[ImageBed] 详细日志:', debugLog.join('\n'));
            console.log('[ImageBed] 图片列表:', images);
            mainDeferred.resolve(images);
        });
        
        return mainDeferred.promise();
    }
    
    function isImageFile(name) {
        var ext = name.substring(name.lastIndexOf('.')).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico'].indexOf(ext) !== -1;
    }
    
    function uploadFile(path, content, message) {
        var branch = Config.get('github.branch');
        message = message || 'Upload image via imagebed';
        
        return getFileSha(path).then(function(sha) {
            var data = {
                message: message,
                content: content,
                branch: branch
            };
            if (sha) {
                data.sha = sha;
            }
            
            return $.ajax({
                url: BASE_URL + '/' + getRepoPath() + '/contents/' + path,
                method: 'PUT',
                headers: getHeaders(),
                contentType: 'application/json',
                data: JSON.stringify(data)
            });
        });
    }
    
    function getFileSha(path) {
        var branch = Config.get('github.branch');
        var deferred = $.Deferred();
        
        $.ajax({
            url: BASE_URL + '/' + getRepoPath() + '/contents/' + path,
            method: 'GET',
            headers: getHeaders(),
            data: { ref: branch }
        }).done(function(data) {
            deferred.resolve(data.sha);
        }).fail(function() {
            deferred.resolve(null);
        });
        
        return deferred.promise();
    }
    
    function deleteFile(path, message) {
        var branch = Config.get('github.branch');
        message = message || 'Delete image via imagebed';
        
        return getFileSha(path).then(function(sha) {
            if (!sha) {
                return $.Deferred().reject('File not found').promise();
            }
            
            return $.ajax({
                url: BASE_URL + '/' + getRepoPath() + '/contents/' + path,
                method: 'DELETE',
                headers: getHeaders(),
                contentType: 'application/json',
                data: JSON.stringify({
                    message: message,
                    sha: sha,
                    branch: branch
                })
            });
        });
    }
    
    function renameFile(oldPath, newPath, message) {
        var branch = Config.get('github.branch');
        message = message || 'Rename image via imagebed';
        
        return getFileSha(oldPath).then(function(sha) {
            if (!sha) {
                return $.Deferred().reject('File not found').promise();
            }
            
            return $.ajax({
                url: BASE_URL + '/' + getRepoPath() + '/git/blobs/' + sha,
                method: 'GET',
                headers: getHeaders()
            }).then(function(blobData) {
                return uploadFile(newPath, blobData.content, message).then(function() {
                    return deleteFile(oldPath, message);
                });
            });
        });
    }
    
    function getRepoSize() {
        return $.ajax({
            url: BASE_URL + '/' + getRepoPath(),
            method: 'GET',
            headers: getHeaders()
        }).then(function(data) {
            return data.size * 1024;
        });
    }
    
    return {
        testConnection: testConnection,
        getContents: getContents,
        getAllImages: getAllImages,
        uploadFile: uploadFile,
        deleteFile: deleteFile,
        renameFile: renameFile,
        getRepoSize: getRepoSize,
        isImageFile: isImageFile
    };
})();

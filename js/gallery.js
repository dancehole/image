var Gallery = (function() {
    var currentImages = [];
    var filteredImages = [];
    var currentCategory = 'all';
    var currentSort = 'name-asc';
    var currentView = 'grid';
    var searchKeyword = '';
    var batchMode = false;
    var selectedImages = [];
    var categories = [];
    
    function init() {
        loadCategories();
        
        $('#searchInput').val('');
        
        bindEvents();
    }
    
    function loadCategories() {
        categories = [
            { name: '全部', value: 'all' },
            { name: 'common', value: 'common' },
            { name: 'notebooks', value: 'notebooks' },
            { name: 'danceholeLabs', value: 'danceholeLabs' }
        ];
        renderCategories();
    }
    
    function renderCategories() {
        var html = '';
        categories.forEach(function(cat) {
            html += '<div class="category-item ' + (currentCategory === cat.value ? 'active' : '') + '" data-category="' + cat.value + '">' + cat.name + '</div>';
        });
        $('#categoryBar').html(html);
    }
    
    function loadImages() {
        var indexData = Config.getIndex();
        console.log('[Gallery] loadImages - indexData:', indexData);
        
        if (indexData && indexData.images) {
            currentImages = indexData.images;
            console.log('[Gallery] loadImages - 加载到', currentImages.length, '张图片');
            if (currentImages.length > 0) {
                console.log('[Gallery] 第一张图片:', currentImages[0]);
            }
            applyFilters();
            renderImages();
            updateStorageInfo();
        } else {
            console.log('[Gallery] loadImages - 没有索引数据');
            $('#galleryGrid').html('<div class="empty-state"><div class="empty-icon">📷</div><div class="empty-text">暂无图片</div><div class="empty-desc">请先配置GitHub并同步图片列表</div></div>');
            $('#imageCount').text('0 张图片');
        }
    }
    
    function applyFilters() {
        console.log('[Gallery] applyFilters - currentImages:', currentImages.length);
        console.log('[Gallery] applyFilters - currentCategory:', currentCategory);
        console.log('[Gallery] applyFilters - searchKeyword:', searchKeyword);
        
        filteredImages = currentImages.slice();
        
        if (currentCategory && currentCategory !== 'all') {
            console.log('[Gallery] 正在过滤分类:', currentCategory);
            var beforeCount = filteredImages.length;
            filteredImages = filteredImages.filter(function(img) {
                var match = img.path === currentCategory || img.path.indexOf(currentCategory + '/') === 0;
                console.log('[Gallery] 图片:', img.name, 'path:', img.path, '匹配:', match);
                return match;
            });
            console.log('[Gallery] 过滤后:', filteredImages.length, '(之前:', beforeCount, ')');
        }
        
        if (searchKeyword && searchKeyword.trim()) {
            var keyword = searchKeyword.trim().toLowerCase();
            filteredImages = filteredImages.filter(function(img) {
                return img.name.toLowerCase().indexOf(keyword) !== -1;
            });
        }
        
        sortImages();
    }
    
    function sortImages() {
        var parts = currentSort.split('-');
        var field = parts[0];
        var order = parts[1];
        
        filteredImages.sort(function(a, b) {
            var valA, valB;
            
            switch (field) {
                case 'name':
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                    break;
                case 'date':
                    valA = a.uploadTime || 0;
                    valB = b.uploadTime || 0;
                    break;
                case 'size':
                    valA = a.size || 0;
                    valB = b.size || 0;
                    break;
                default:
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
            }
            
            if (order === 'asc') {
                return valA > valB ? 1 : -1;
            } else {
                return valA < valB ? 1 : -1;
            }
        });
    }
    
    function renderImages() {
        var $grid = $('#galleryGrid');
        
        if (filteredImages.length === 0) {
            $grid.html('<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">没有找到图片</div><div class="empty-desc">试试其他搜索关键词或分类</div></div>');
            $('#imageCount').text('0 张图片');
            return;
        }
        
        var html = '';
        filteredImages.forEach(function(img, index) {
            var thumbUrl = getImageDisplayUrl(img);
            var isSelected = selectedImages.indexOf(img.fullPath) !== -1;
            
            if (currentView === 'grid') {
                html += '<div class="image-card ' + (isSelected ? 'selected' : '') + '" data-index="' + index + '" data-path="' + img.fullPath + '">';
                html += '<div class="checkbox">✓</div>';
                html += '<div class="image-actions">';
                html += '<button class="action-btn copy-btn" title="复制链接">📋</button>';
                html += '<button class="action-btn delete-btn" title="删除">🗑️</button>';
                html += '</div>';
                html += '<img class="image-thumb" src="' + thumbUrl + '" alt="' + img.name + '" loading="lazy">';
                html += '<div class="image-info">';
                html += '<div class="image-name" title="' + img.name + '">' + img.name + '</div>';
                html += '<div class="image-meta">';
                html += '<span>' + Config.formatFileSize(img.size || 0) + '</span>';
                html += '</div>';
                html += '</div>';
                html += '</div>';
            } else {
                html += '<div class="image-card ' + (isSelected ? 'selected' : '') + '" data-index="' + index + '" data-path="' + img.fullPath + '">';
                html += '<div class="checkbox">✓</div>';
                html += '<img class="image-thumb" src="' + thumbUrl + '" alt="' + img.name + '" loading="lazy">';
                html += '<div class="image-info">';
                html += '<div class="image-name" title="' + img.name + '">' + img.name + '</div>';
                html += '<div class="image-meta">';
                html += '<span>' + img.path + '</span>';
                html += '<span>' + Config.formatFileSize(img.size || 0) + '</span>';
                if (img.uploadTime) {
                    html += '<span>' + Config.formatDate(img.uploadTime) + '</span>';
                }
                html += '</div>';
                html += '</div>';
                html += '<div class="image-actions">';
                html += '<button class="action-btn copy-btn" title="复制链接">📋</button>';
                html += '<button class="action-btn delete-btn" title="删除">🗑️</button>';
                html += '</div>';
                html += '</div>';
            }
        });
        
        $grid.html(html);
        $('#imageCount').text(filteredImages.length + ' 张图片');
        
        if (batchMode) {
            $grid.addClass('batch-mode');
        } else {
            $grid.removeClass('batch-mode');
        }
    }
    
    function getImageDisplayUrl(img) {
        var url = Config.getImageUrl(img.path, img.name);
        if (!url && img.url) {
            url = img.url;
        }
        return url;
    }
    
    function updateStorageInfo() {
        var totalSize = 0;
        currentImages.forEach(function(img) {
            totalSize += img.size || 0;
        });
        
        var limit = 1024 * 1024 * 1024;
        var percent = Math.min((totalSize / limit) * 100, 100);
        
        $('#storageUsedBar').css('width', percent + '%');
        $('#storageText').text(Config.formatFileSize(totalSize) + ' / 1 GB');
    }
    
    function setCategory(category) {
        currentCategory = category;
        renderCategories();
        applyFilters();
        renderImages();
        updateBreadcrumb();
    }
    
    function updateBreadcrumb() {
        var html = '';
        if (currentCategory === 'all') {
            html += '<span class="breadcrumb-item active">全部图片</span>';
        } else {
            html += '<span class="breadcrumb-item" data-category="all">全部图片</span>';
            html += '<span> / </span>';
            html += '<span class="breadcrumb-item active">' + currentCategory + '</span>';
        }
        $('#breadcrumb').html(html);
    }
    
    function setSort(sort) {
        currentSort = sort;
        sortImages();
        renderImages();
    }
    
    function setView(view) {
        currentView = view;
        var $grid = $('#galleryGrid');
        
        if (view === 'grid') {
            $grid.removeClass('list-view');
        } else {
            $grid.addClass('list-view');
        }
        
        $('.view-btn').removeClass('active');
        $('.view-btn[data-view-type="' + view + '"]').addClass('active');
        
        renderImages();
    }
    
    function setSearch(keyword) {
        searchKeyword = keyword;
        applyFilters();
        renderImages();
    }
    
    function toggleBatchMode() {
        batchMode = !batchMode;
        selectedImages = [];
        
        if (batchMode) {
            $('#batchModeBtn').text('✕ 取消批量');
            $('#batchDeleteBtn').show();
            $('#selectAllBtn').show();
        } else {
            $('#batchModeBtn').text('✓ 批量操作');
            $('#batchDeleteBtn').hide();
            $('#selectAllBtn').hide();
        }
        
        renderImages();
    }
    
    function toggleSelect(fullPath) {
        var index = selectedImages.indexOf(fullPath);
        if (index === -1) {
            selectedImages.push(fullPath);
        } else {
            selectedImages.splice(index, 1);
        }
        renderImages();
    }
    
    function selectAll() {
        if (selectedImages.length === filteredImages.length) {
            selectedImages = [];
        } else {
            selectedImages = filteredImages.map(function(img) {
                return img.fullPath;
            });
        }
        renderImages();
    }
    
    function getImageByPath(fullPath) {
        return currentImages.find(function(img) {
            return img.fullPath === fullPath;
        });
    }
    
    function bindEvents() {
        $('#categoryBar').on('click', '.category-item', function() {
            var category = $(this).data('category');
            setCategory(category);
        });
        
        $('#sortSelect').on('change', function() {
            setSort($(this).val());
        });
        
        $('.view-btn').on('click', function() {
            var viewType = $(this).data('view-type');
            setView(viewType);
        });
        
        $('#searchInput').on('input', function() {
            setSearch($(this).val());
        });
        
        $('#batchModeBtn').on('click', function() {
            toggleBatchMode();
        });
        
        $('#selectAllBtn').on('click', function() {
            selectAll();
        });
        
        $('#batchDeleteBtn').on('click', function() {
            if (selectedImages.length === 0) {
                App.toast('请先选择图片', 'warning');
                return;
            }
            if (confirm('确定要删除选中的 ' + selectedImages.length + ' 张图片吗？')) {
                batchDelete();
            }
        });
        
        $('#galleryGrid').on('click', '.image-card', function(e) {
            if ($(e.target).closest('.action-btn, .checkbox').length) {
                return;
            }
            
            var fullPath = $(this).data('path');
            
            if (batchMode) {
                toggleSelect(fullPath);
            } else {
                var img = getImageByPath(fullPath);
                if (img) {
                    App.showImageModal(img);
                }
            }
        });
        
        $('#galleryGrid').on('click', '.checkbox', function(e) {
            e.stopPropagation();
            var fullPath = $(this).closest('.image-card').data('path');
            toggleSelect(fullPath);
        });
        
        $('#galleryGrid').on('click', '.copy-btn', function(e) {
            e.stopPropagation();
            var fullPath = $(this).closest('.image-card').data('path');
            var img = getImageByPath(fullPath);
            if (img) {
                var url = Config.getImageUrl(img.path, img.name);
                var link = Config.formatLink(url, img.name);
                App.copyToClipboard(link);
            }
        });
        
        $('#galleryGrid').on('click', '.delete-btn', function(e) {
            e.stopPropagation();
            var fullPath = $(this).closest('.image-card').data('path');
            if (confirm('确定要删除这张图片吗？')) {
                deleteImage(fullPath);
            }
        });
        
        $('#breadcrumb').on('click', '.breadcrumb-item', function() {
            var category = $(this).data('category');
            if (category) {
                setCategory(category);
            }
        });
    }
    
    function deleteImage(fullPath) {
        App.showLoading('删除中...');
        
        GithubAPI.deleteFile(fullPath).done(function() {
            currentImages = currentImages.filter(function(img) {
                return img.fullPath !== fullPath;
            });
            
            var indexData = Config.getIndex() || {};
            indexData.images = currentImages;
            indexData.lastUpdate = Date.now();
            Config.saveIndex(indexData);
            
            applyFilters();
            renderImages();
            updateStorageInfo();
            App.hideLoading();
            App.toast('删除成功', 'success');
        }).fail(function(err) {
            App.hideLoading();
            App.toast('删除失败: ' + (err.responseJSON && err.responseJSON.message || err.statusText), 'error');
        });
    }
    
    function batchDelete() {
        App.showLoading('批量删除中...');
        
        var deletePromises = [];
        selectedImages.forEach(function(path) {
            deletePromises.push(GithubAPI.deleteFile(path));
        });
        
        $.when.apply($, deletePromises).always(function() {
            currentImages = currentImages.filter(function(img) {
                return selectedImages.indexOf(img.fullPath) === -1;
            });
            
            var indexData = Config.getIndex() || {};
            indexData.images = currentImages;
            indexData.lastUpdate = Date.now();
            Config.saveIndex(indexData);
            
            selectedImages = [];
            batchMode = false;
            $('#batchModeBtn').text('✓ 批量操作');
            $('#batchDeleteBtn').hide();
            $('#selectAllBtn').hide();
            
            applyFilters();
            renderImages();
            updateStorageInfo();
            App.hideLoading();
            App.toast('批量删除完成', 'success');
        });
    }
    
    function refresh() {
        loadImages();
    }
    
    return {
        init: init,
        loadImages: loadImages,
        refresh: refresh,
        setCategory: setCategory,
        setSort: setSort,
        setView: setView,
        setSearch: setSearch,
        getImageByPath: getImageByPath,
        updateStorageInfo: updateStorageInfo
    };
})();

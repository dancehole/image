var ImageUtils = (function() {
    
    function compressImage(file, options) {
        var deferred = $.Deferred();
        options = options || {};
        var quality = (options.quality || 80) / 100;
        var maxWidth = options.maxWidth || 1920;
        
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                
                var width = img.width;
                var height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(function(blob) {
                    deferred.resolve(blob);
                }, file.type, quality);
            };
            img.onerror = function() {
                deferred.reject('Image load failed');
            };
            img.src = e.target.result;
        };
        reader.onerror = function() {
            deferred.reject('File read failed');
        };
        reader.readAsDataURL(file);
        
        return deferred.promise();
    }
    
    function addWatermark(file, options) {
        var deferred = $.Deferred();
        options = options || {};
        var text = options.text || '';
        var position = options.position || 'bottom-right';
        var opacity = (options.opacity || 30) / 100;
        var fontSize = options.fontSize || 24;
        var color = options.color || '#ffffff';
        
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                
                canvas.width = img.width;
                canvas.height = img.height;
                
                ctx.drawImage(img, 0, 0);
                
                ctx.globalAlpha = opacity;
                ctx.font = fontSize + 'px Arial, sans-serif';
                ctx.fillStyle = color;
                ctx.textBaseline = 'bottom';
                
                var padding = 20;
                var x, y;
                
                switch (position) {
                    case 'top-left':
                        x = padding;
                        y = padding + fontSize;
                        ctx.textBaseline = 'top';
                        break;
                    case 'top-right':
                        x = canvas.width - padding;
                        y = padding;
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'top';
                        break;
                    case 'bottom-left':
                        x = padding;
                        y = canvas.height - padding;
                        break;
                    case 'center':
                        x = canvas.width / 2;
                        y = canvas.height / 2;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        break;
                    case 'bottom-right':
                    default:
                        x = canvas.width - padding;
                        y = canvas.height - padding;
                        ctx.textAlign = 'right';
                        break;
                }
                
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.lineWidth = 2;
                ctx.strokeText(text, x, y);
                ctx.fillText(text, x, y);
                
                canvas.toBlob(function(blob) {
                    deferred.resolve(blob);
                }, file.type, 0.95);
            };
            img.onerror = function() {
                deferred.reject('Image load failed');
            };
            img.src = e.target.result;
        };
        reader.onerror = function() {
            deferred.reject('File read failed');
        };
        reader.readAsDataURL(file);
        
        return deferred.promise();
    }
    
    function processImage(file, options) {
        var deferred = $.Deferred();
        options = options || {};
        
        var currentFile = file;
        var promise = $.Deferred().resolve(currentFile).promise();
        
        if (options.enableCompress) {
            promise = promise.then(function() {
                return compressImage(currentFile, {
                    quality: options.compressQuality,
                    maxWidth: options.maxWidth
                });
            });
        }
        
        if (options.enableWatermark && options.watermarkText) {
            promise = promise.then(function(processedFile) {
                currentFile = processedFile instanceof Blob ? processedFile : currentFile;
                return addWatermark(currentFile, {
                    text: options.watermarkText,
                    position: options.watermarkPosition,
                    opacity: options.watermarkOpacity,
                    fontSize: options.watermarkFontSize,
                    color: options.watermarkColor
                });
            });
        }
        
        promise.then(function(result) {
            deferred.resolve(result);
        }).fail(function(err) {
            deferred.reject(err);
        });
        
        return deferred.promise();
    }
    
    function blobToBase64(blob) {
        var deferred = $.Deferred();
        var reader = new FileReader();
        reader.onloadend = function() {
            var base64 = reader.result;
            base64 = base64.substring(base64.indexOf(',') + 1);
            deferred.resolve(base64);
        };
        reader.onerror = function() {
            deferred.reject('Convert failed');
        };
        reader.readAsDataURL(blob);
        return deferred.promise();
    }
    
    function generateThumbnail(file, size) {
        size = size || 200;
        var deferred = $.Deferred();
        
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                
                var width, height;
                if (img.width > img.height) {
                    width = size;
                    height = (img.height * size) / img.width;
                } else {
                    height = size;
                    width = (img.width * size) / img.height;
                }
                
                canvas.width = size;
                canvas.height = size;
                
                var offsetX = (size - width) / 2;
                var offsetY = (size - height) / 2;
                
                ctx.drawImage(img, offsetX, offsetY, width, height);
                
                deferred.resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = function() {
                deferred.reject('Image load failed');
            };
            img.src = e.target.result;
        };
        reader.onerror = function() {
            deferred.reject('File read failed');
        };
        reader.readAsDataURL(file);
        
        return deferred.promise();
    }
    
    return {
        compressImage: compressImage,
        addWatermark: addWatermark,
        processImage: processImage,
        blobToBase64: blobToBase64,
        generateThumbnail: generateThumbnail
    };
})();

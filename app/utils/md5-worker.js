'use strict';
//adapted from example on https://github.com/satazor/SparkMD5#hash-a-file-incrementally
importScripts('spark-md5.js');

var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice,
    chunkSize = 2097152;
function fileLoader(file, key) {
    var currentChunk = 0,
        spark = new self.SparkMD5.ArrayBuffer(),
        chunks = Math.ceil(file.size / chunkSize),
        abortHash = false,
        frOnLoad = function(e) {
            console.log("read chunk nr", currentChunk + 1, "of", chunks);
            spark.append(e.target.result); //add chunk to hash
            self.postMessage({key: key, progress: 100.0 * currentChunk/chunks});
            currentChunk++;
            if (abortHash) {
                self.postMessage({error: 'md5 job ' + key + ' aborted', key: key});
            } else if (currentChunk < chunks) {
                loadNext();
            }
            else {
                console.log("finished loading");
                var hash = spark.end();
                console.info("computed hash", hash); // compute hash
                self.postMessage({key: key, hash:hash});
                delete loaders[key];
            }
        },
        frOnError = function(e) {
            self.postMessage({error: e, key: key});
        },
        fileReader = new FileReader;
    fileReader.onload = frOnLoad;
    fileReader.onerror = frOnError;
    function loadNext() {
        var start = currentChunk * chunkSize,
            end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
        fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
    }

    function abort() {
        abortHash = true;
    }
    return {
        loadNext: loadNext,
        abort: abort
    };
}

var loaders = {};

self.onmessage = function(e) {
    if (e.data.abort) {
        console.log(e.data.key);
        console.log(loaders[e.data.key]);
        loaders[e.data.key].abort();
    } else {
        if (loaders[e.data.key]) {
            throw new Error('key', e.data.key, 'has already been used');
        } else {
            var isBinary = e.data.file instanceof Uint8Array;
            if (!isBinary) {
                loaders[e.data.key] = fileLoader(e.data.file, e.data.key);
                loaders[e.data.key].loadNext();
            } else {
                var hash = self.SparkMD5.ArrayBuffer.hash(e.data.file.buffer);
                self.postMessage({key: e.data.key, hash: hash})
            }
        }
    }
}

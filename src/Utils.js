export function xhr(url, data, cb, method = 'GET', ecb = null, withCredentials = false) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = withCredentials;
    xhr.send(data);
    if (cb) {
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
                cb(xhr.response);
            } else if (ecb) {
                ecb(xhr.response);
            }
        };
    }
    return xhr;
}

export function xhrPromise(url, data, method = 'GET', withCredentials = false) {
    return new Promise((resolve, reject) => xhr(url, data, resolve, method, reject, withCredentials))
}


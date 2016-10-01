export function xhr(url, data, cb, method = 'GET', ecb = null, withCredentials = false) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = withCredentials;
    xhr.send(data);
    if (cb) {
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) {
                cb(xhr.response);
            } else if (ecb) {
                console.log("Error: " + xhr.status);
                ecb(xhr.response);
            }
        };
    }
    return xhr;
}
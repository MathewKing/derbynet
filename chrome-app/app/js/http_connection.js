function HttpConnection(baseurl) {
    this.baseurl = baseurl;
}

HttpConnection.prototype = {
    send: function(action, url, params, cb) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(xhr.responseText,"text/xml");
                cb(xmlDoc, null);
            }
        };
        xhr.open(action, this.baseurl + url, true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xhr.send(params);
    },

    get: function(url, cb) {
        return this.send("GET", url, null, cb);
    },

    post: function(url, params, cb) {
        return this.send("POST", url, params, cb);
    }
}
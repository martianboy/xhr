"use strict";

var _ = require('underscore');

function convertData(obj) {
	return Object.keys(obj).map(function(key) {
		var data = obj[key];
		if (typeof data === 'object')
			data = JSON.stringify(data);
		return key + "=" + encodeURIComponent(data);
	}).join("&");
}

function xhr(options) {

	function xhrPromise(resolve, reject) {

		function onLoad() {
			function convertResponse(response) {
				if (!('dataType' in options))
					options.dataType = req.getResponseHeader('Content-Type');
				switch (options.dataType) {
					case 'text':
					case 'text/plain':
						return response;
						break;
					case 'application/json':
					case 'json':
					default:
						return JSON.parse(response);
				}
			}
			// This is called even on 404 etc
			// so check the status
			if (req.status >= 200 && req.status < 300) {
				// Resolve the promise with the response text
				resolve(convertResponse(req.response));
			} else {
				// Otherwise reject with the status text
				// which will hopefully be a meaningful error
				reject({xhr: req, textStatus: req.statusText});
			}
		}

		// Handle network errors
		function onError() {
			reject({xhr: req, textStatus: req.statusText});
		};

		// Do the usual XHR stuff
		var req = new XMLHttpRequest();
		var method = ('type' in options) ? options.type.toUpperCase() : 'GET';

		req.open(method, options.url);

		var data = options.data;

		if ('contentType' in options && method !== 'GET') {
			switch(options.contentType) {
				case 'application/x-www-form-urlencoded':
					if (typeof(data) === 'object')
						data = convertData(data);
					break;
				case 'appliation/json':
					data = JSON.stringify(data);
			}

			req.setRequestHeader("Content-type", options.contentType);
		}

		if ('dataType' in options)
			req.responseType = options.dataType;

		if ('xhrFields' in options)
			_.extend(req, options.xhrFields);

		if (options.data instanceof FormData) {
			// req.upload.addEventListener('load', onLoad);
			// req.upload.addEventListener('error', onError);
			// req.upload.addEventListener('timeout', onError);

			if (options.xhrFields && options.xhrFields.upload && options.xhrFields.upload.onprogress) {
				req.upload.addEventListener('progress', options.xhrFields.upload.onprogress, false);
			}
		}

		req.addEventListener('load', onLoad);
		req.addEventListener('error', onError);
		req.addEventListener('timeout', onError);

		// Make the request
		if (options.beforesend)
			options.beforesend(req);
		req.send(data);
	}

	// Return a new promise.
	return new Promise(xhrPromise);
}

xhr.getJSON = function(url) {
	return xhr({
		url: url
	});
};

xhr.uploadFile = function(url, file, method, progressCallback) {
	var formData = new FormData();
	formData.append('file', file);

	return xhr({
		url: url,
		data: formData,
		type: method,
		xhrFields: {
			upload: {
				onprogress: progressCallback
			}
		}
	});
};

module.exports = xhr;


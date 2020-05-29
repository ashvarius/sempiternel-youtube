const url = require('url');
const http = require('http');
const https = require('https');

const httpLibs = {
	'http:': http,
	'https:': https
}
const redirectCode = [302, 303, 307];

const stream = (_url, callback) => {
	const parsed = url.parse(_url);
	const httpLib = httpLibs[parsed.protocol];
	if (!httpLib)
		throw 'Invalid URL';
	return new Promise(resolve => {
		const doDownload = () => {
			httpLib.get(parsed, res => {
				if (redirectCode.includes(res.statusCode)) {
					Object.assign(parsed, url.parse(res.headers.location));
					process.nextTick(doDownload);
					return;
				}
				if (callback) {
					let body = '';
					res.on('error', callback);
					res.on('data', chunk => body += chunk);
					res.on('end', () => callback(undefined, body));
				}
				resolve(res);
			});
		}
		process.nextTick(doDownload);
	});
};

stream.promise = (url) => {
	return new Promise((resolve, reject) => {
		stream(url, (err, body) => {
			if (err)
				reject(err);
			resolve(body);
		});
	});
};

module.exports = stream;
const data = {};
const persistent_data = {};

class Cache {
	constructor(limit = 50) {
		this.limit = limit;
	}
	keys() {
		return Object.keys(data);
	}
	values() {
		return Object.values(data);
	}
	get length() {
		return this.keys().length;
	}
	set(key, value, persistent = false) {
		if (persistent) {
			persistent_data[key] = value;
			return;
		}
		if (persistent_data[key])
			delete persistent_data[key];
		if (this.length == this.limit)
			delete data[this.keys()[0]];
		data[key] = value;
	}
	get(key) {
		if (persistent_data[key])
			return persistent_data[key];
		return data[key];
	}
	clear() {
		for (const key of this.keys())
			delete data[key];
	}
}

module.exports = Cache;
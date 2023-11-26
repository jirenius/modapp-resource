import eventBus from 'modapp-eventbus';
import { array } from 'modapp-utils';
import { getProps, patchDiff } from './utils';

function compare(a, b) {
	return a.key.localeCompare(b.key);
}

/**
 * ModelToCollection turns a model into a collection.
 */
class ModelToCollection {

	/**
	 * Creates a ModelToCollection instance.
	 * @param {object|Model} model Model
	 * @param {object} [opt] Optional parameters.
	 * @param {function} [opt.compare] Compare function with receives two objects { key, value }. Defaults to: (a, b) => a.key.localeCompare(b.key)
	 * @param {function} [opt.filter] Filter function filtering which key/values to show: function(key, value) -> boolean
	 * @param {string} [opt.namespace] Event bus namespace. Defaults to 'modelToCollection'.
	 * @param {module:modapp~EventBus} [opt.eventBus] Event bus.
	 */
	constructor(model, opt) {
		opt = opt || {};
		this._compare = opt.compare || compare;
		this._namespace = opt.namespace || 'modelToCollection';
		this._eventBus = opt.eventBus || eventBus;
		this._filter = opt.filter || null;

		// Bind callbacks
		this._onChange = this._onChange.bind(this);

		// Init list
		this._list = [];
		this._props = {};
		if (this._filter) {
			this._filtered = {};
		}
		this.setModel(model, false);
	}

	get length() {
		return this._list.length;
	}

	/**
	 * Get wrapped model.
	 * @returns {object|Model} Model
	 */
	getModel() {
		return this._model;
	}

	/**
	 * Attach an event handler function for one or more session events.
	 * @param {?string} events One or more space-separated events. Null means any event.
	 * @param {Event~eventCallback} handler A function to execute when the event is emitted.
	 */
	on(events, handler) {
		this._eventBus.on(this, events, handler, this._namespace);
	}

	/**
	 * Remove an event handler.
	 * @param {?string} events One or more space-separated events. Null means any event.
	 * @param {Event~eventCallback} [handler] An option handler function. The handler will only be remove if it is the same handler.
	 */
	off(events, handler) {
		this._eventBus.off(this, events, handler, this._namespace);
	}

	/**
	 * Retrieves the order index of an item.
	 * @param {*} item Collection item.
	 * @returns {number} Order index of the item. -1 if the item id doesn't exist.
	 */
	indexOf(item) {
		for (let i = 0; i < this._list.length; i++) {
			if (this._list[i].value === item) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * Returns the item at a given index.
	 * @param {number} idx Index position
	 * @returns {*} Item or undefined if idx is out of bounds.
	 */
	atIndex(idx) {
		return idx < 0 || idx >= this._list.length ? undefined : this._list[idx];
	}

	/**
	 * Returns the collection as an array.
	 * @returns {Array} Array of items.
	 */
	toArray() {
		return this._list.map(o => o.value);
	}

	/**
	 * Sets the wrapped model.
	 * @param {?object} model Model or object to set.
	 * @param {boolean} noEvents Flag telling if no collection events should be triggered during set.
	 * @returns {this}
	 */
	setModel(model, noEvents) {
		model = model || null;
		if (model === this._model) return this;

		for (let k in this._props) {
			this._unlistenItem(this._props[k]);
		}

		this._listen(false);
		this._model = model;
		this._listen(true);

		let oldList = this._list;
		this._list = [];
		this._props = {};
		if (this._filter) {
			this._filtered = {};
		}

		if (this._model) {
			// Iterate over props object if available, otherwise the model itself.
			let p = getProps(this._model);

			for (let k in p) {
				let v = p[k];
				let o = { key: k, value: v };
				if (!this._filter || this._filter(k, v)) {
					this._list.push(o);
				} else {
					this._filtered[k] = o;
				}
				this._listenItem(o);
			}

			this._list.sort(this._compare);
		}

		if (!noEvents) {
			this._sendSyncEvents(oldList, this._list);
		}

		return this;
	}

	_sendSyncEvents(oldList, newList) {
		patchDiff(oldList, newList,
			(o, n, idx) => this._eventBus.emit(this, this._namespace + '.add', {
				item: o.value,
				idx,
			}),
			(o, m, idx) => this._eventBus.emit(this, this._namespace + '.remove', {
				item: o.value,
				idx,
			})
		);
	}

	/**
	 * Refresh scans through all items to ensure filtering and sorting is
	 * correct.
	 * @param {string} [key] Optional key of a single item to refresh.
	 */
	refresh(key) {
		if (!this._model) return;

		// Start by sorting list, in case the compare is altered.
		let oldList = this._list.slice();
		this._list.sort(this._compare);

		if (key) {
			let o = this._props[key];
			if (o) {
				this._onItemChange(o);
			}
		} else {
			for (let k in this._props) {
				this._onItemChange(this._props[k]);
			}
		}

		this._sendSyncEvents(oldList, this._list);
	}

	_listen(on) {
		let cb = on ? 'on' : 'off';
		if (this._model && this._model[cb]) {
			this._model[cb]('change', this._onChange);
		}
	}

	_listenItem(o) {
		this._props[o.key] = o;
		let m = o.value;
		if (typeof m === 'object' && m !== null && typeof m.on == 'function') {
			o.cb = (m, change) => {
				if (this._props[o.key] != o) {
					return;
				}
				let oldList = this._list.slice();
				this._list.sort(this._compare);
				this._onItemChange(o);

				this._sendSyncEvents(oldList, this._list);
			};
			m.on('change', o.cb);
		}
	}

	_unlistenItem(o) {
		if (o.cb) {
			o.value.off('change', o.cb);
			o.cb = null;
		}
	}

	_onChange(change, m) {
		if (m !== this._model) return;

		let oldList = this._list.slice();
		this._list.sort(this._compare);

		let p = getProps(m);

		for (let k in change) {
			let nv = p[k];
			let o = this._props[k];
			let ov = o ? o.value : undefined;

			if (ov === nv) continue;

			// Old value undefined means a value was added
			if (typeof ov == 'undefined') {
				this._addItem(k, nv);
			} else if (typeof nv == 'undefined') {
				this._removeItem(k);
			} else {
				this._removeItem(k);
				this._addItem(k, nv);
			}
		}

		this._sendSyncEvents(oldList, this._list);
	}


	_onItemChange(o) {
		let k = o.key;
		let v = o.value;
		let show = !this._filter || this._filter(k, v);
		// Check if it is filtered
		let f = this._filtered && this._filtered[k];
		if (f) {
			if (show) {
				delete this._filtered[k];
				this._list.splice(this._insertIdx(o), 0, o);
			}
		} else {
			if (!show) {
				let idx = this._indexOfItem(o.key, v);
				if (idx < 0) {
					console.error("Item not in list: ", k, v);
					return;
				}
				this._list.splice(idx, 1);
				this._filtered[k] = o;
			}
		}
	}

	_addItem(k, item) {
		let o = { key: k, value: item };
		this._listenItem(o);
		if (!this._filter || this._filter(k, item)) {
			this._list.splice(this._insertIdx(o), 0, o);
		} else {
			this._filtered[k] = o;
		}
	}

	_removeItem(k) {
		let o = this._props[k];
		if (!o) {
			console.error("Item key not found: ", k);
			return;
		}
		delete this._props[k];
		this._unlistenItem(o);

		// Handle hidden item
		if (this._filtered && this._filtered[k]) {
			delete this._filtered[k];
			return;
		}
		// Handle visible item
		let idx = this._indexOfItem(k, o.value);
		if (idx < 0) {
			console.error("Item not in list: ", k, o.value);
			return;
		}
		this._list.splice(idx, 1);
	}

	_insertIdx(o) {
		let idx = array.binarySearch(this._list, o, this._compare);
		return idx < 0 ? ~idx : idx; // Use the bitwise complement to get insert index.
	}

	_indexOfItem(k, item) {
		let idx = array.binarySearch(this._list, { key: k, value: item }, this._compare);
		// Verify we found it
		if (idx >= 0 && this._list[idx].key === k) {
			return idx;
		}

		// Binary search failed. Let's scan it instead.
		return this._indexOfKey(k);
	}

	_indexOfKey(k) {
		for (let i = this._list.length - 1; i >= 0; i--) {
			if (this._list[i].key === k) return i;
		}
		return -1;
	}

	dispose() {
		this.setModel(null, true);
	}

	[Symbol.iterator]() {
		let i = 0;
		let a = this._list;
		let l = a.length;

		return {
			next: function() {
				return i >= l ? { done: true } : { value: a[i++].value, done: false };
			}
		};
	}
}

export default ModelToCollection;

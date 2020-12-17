import eventBus from 'modapp-eventbus';
import { array } from 'modapp-utils';

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
		this._listen(false);
		for (let i = this._list.length - 1; i >= 0; i--) {
			let o = this._list[i];
			this._unlistenItem(o);
			if (!noEvents) {
				this._eventBus.emit(this, this._namespace + '.remove', {
					item: this._list[i].value,
					idx: i
				});
			}
		}
		this._model = model || null;
		this._listen(true);

		this._list = [];
		// Quick exit if we have no mdoel
		if (!this._model) {
			return this;
		}

		// Iterate over props object if available, otherwise the model itself.
		let p = this._model.props;
		p = typeof p == 'object' && p !== null ? p : this._model;

		for (let k in p) {
			if (p.hasOwnProperty(k)) {
				let v = p[k];
				let o = { key: k, value: v };
				if (!this._filter || this._filter(k, v)) {
					this._list.push(o);
				} else {
					this._filtered[k] = o;
				}
				this._listenItem(o);
			}
		}

		this._list.sort(this._compare);
		if (!noEvents) {
			for (let i = 0; i < this._list.length; i++) {
				this._eventBus.emit(this, this._namespace + '.add', {
					item: this._list[i].value,
					idx: i
				});
			}
		}

		return this;
	}

	_listen(on) {
		let cb = on ? 'on' : 'off';
		if (this._model && this._model[cb]) {
			this._model[cb]('change', this._onChange);
		}
	}

	_listenItem(o) {
		let m = o.value;
		if (typeof m === 'object' && m !== null && typeof m.on == 'function') {
			o.cb = this._onItemChange.bind(this, o);
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

		let p = m.props;
		p = typeof p == 'object' && p !== null ? p : m;

		for (let k in change) {
			let ov = change[k];
			let nv = p[k];

			if (ov === nv) continue;

			// Old value undefined means a value was added
			if (typeof ov == 'undefined') {
				this._addItem(k, nv);
			} else if (typeof nv == 'undefined') {
				this._removeItem(k, ov);
			} else {
				this._updateItem(k, ov, nv);
			}
		}
	}


	_onItemChange(o) {
		let show = !this._filter || this._filter(o.key, o.value);
		// Check if it is filtered
		let fo = this._filtered && this._filtered[o.key];
		if (fo) {
			// Quick exit if it should be kept hidden
			if (!show) return;
			delete this._filtered[o.key];
		} else {
			let idx = this._indexOfItem(o.key, o.value);
			// Check if the change didn't affect the sorting
			if (
				show &&
				(idx === 0 || this._compare(this._list[idx - 1], o) < 0) &&
				(idx === (this._list.length - 1) || this._compare(o, this._list[idx + 1], o) < 0)
			) {
				return;
			}
			// Remove item from old position
			this._removeAtIdx(idx);
		}

		if (show) {
			// Add item to new position
			this._addAtIdx(o, this._insertIdx(o));
		} else {
			this._filtered[o.key] = o;
 		}
	}

	_addItem(k, item) {
		let o = { key: k, value: item };
		this._listenItem(o);
		if (!this._filter || this._filter(k, item)) {
			this._addAtIdx(o, this._insertIdx(o));
		} else {
			this._filtered[k] = o;
		}
	}

	_removeItem(k, item) {
		// Handle hidden item
		let o = this._filtered && this._filtered[k];
		if (o) {
			this._unlistenItem(o);
			delete this._filtered[k];
			return;
		}
		// Handle visible item
		let idx = this._indexOfItem(k, item);
		if (idx < 0) {
			console.error("Item not in list: ", k, item);
			return;
		}
		o = this._list[idx];
		this._unlistenItem(o);
		this._removeAtIdx(idx);
	}

	_updateItem(k, oitem, item) {
		let o = this._filtered && this._filtered[k];
		if (o) {
			this._unlistenItem(o);
			delete this._filtered[k];
		} else {
			// Remove item from old position
			let oidx = this._indexOfItem(k, oitem);
			if (oidx < 0) {
				console.error("Item key not in list: ", k);
				return;
			}
			this._unlistenItem(this._list[oidx]);
			this._removeAtIdx(oidx);
		}

		// Add item in new position
		o = { key: k, value: item };
		this._listenItem(o);
		if (!this._filter || this._filter(k, item)) {
			this._addAtIdx(o, this._insertIdx(o));
		} else {
			this._filtered[k] = o;
		}
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

	_removeAtIdx(idx) {
		let o = this._list[idx];
		this._list.splice(idx, 1);
		this._eventBus.emit(this, this._namespace + '.remove', { item: o.value, idx });
	}

	_addAtIdx(o, idx) {
		this._list.splice(idx, 0, o);
		this._eventBus.emit(this, this._namespace + '.add', { item: o.value, idx });
	}

	dispose() {
		if (!this._model) {
			return;
		}
		for (let o of this._list) {
			this._unlistenItem(o);
		}
		if (this._filtered) {
			for (let k in this._filtered) {
				this._unlistenItem(this._filtered[k]);
			}
			this._filtered = null;
		}
		this._list = [];
		this._listen(false);
		this._model = null;
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

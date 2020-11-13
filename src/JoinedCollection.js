import eventBus from 'modapp-eventbus';

/**
 * Creates a single collection out of an array or collection of arrays or
 * collections, joining them one after the other.
 */
class JoinedCollection {

	/**
	 * Creates a new JoinedCollection instance
	 * @param {Collection.<Collection>} collections Collection of collections.
	 * @param {object} [opt] Optional parameters.
	 * @param {string} [opt.namespace] Event bus namespace. Defaults to 'joinedCollection'.
	 * @param {module:modapp~EventBus} [opt.eventBus] Event bus.
	 */
	constructor(collections, opt) {
		opt = opt || {};
		this._collections = collections;
		this._namespace = opt.namespace || 'joinedCollection';
		this._eventBus = opt.eventBus || eventBus;

		// Bind callbacks
		this._onMainAdd = this._onMainAdd.bind(this);
		this._onMainRemove = this._onMainRemove.bind(this);

		this._subs = [];

		if (this._collection) {
			this._setListeners(true);
			for (let c of this._collections) {
				this._subs.push(this._addSubListeners(c));
			}
		}
	}

	/**
	 * Length of the joined collection.
	 */
	get length() {
		let l = 0;
		for (let sub of this._subs) {
			l += (sub.col && sub.col.length) || 0;
		}
		return l;
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
	 * Sets the collection of collections or arrays.
	 * @param {?Collection.<Collection>} collections Collection or array of collections or arrays.
	 * @returns {this}
	 */
	setCollections(collections) {
		collections = collections || null;
		if (collections == this._collections) return;

		// Send remove events for all items in previous collection.
		if (this._collections) {
			this._setListeners(false);
			for (let c of this._collections) {
				this._onMainRemove({ item: c, idx: 0 });
			}
		}

		this._collections = collections;

		// Send add events for all items in the new collection
		if (this._collections) {
			let i = 0;
			for (let c of this._collections) {
				this._onMainAdd({ item: c, idx: i });
				i++;
			}
			this._setListeners(true);
		}
		return this;
	}

	/**
	 * Returns the item at a given index, or undefined if the index is out of bounds.
	 * @param {number} idx Zero-based index.
	 * @returns {*} Item located at the given index.
	 */
	atIndex(idx) {
		if (this._collections && idx >= 0) {
			let i = 0;
			for (let sub of this._subs) {
				let l = (sub.col && sub.col.length) || 0;
				i += l;
				if (i > idx) {
					i -= l;
					for (let item of sub.col) {
						if (i == idx) {
							return item;
						}
						i++;
					}
					break;
				}
			}
		}
		return undefined;
	}

	_setListeners(on) {
		let cb = on ? 'on' : 'off';
		if (this._collections || typeof this._collections[cb] == 'function') {
			return;
		}
		this._collections[cb]('add', this._onMainAdd);
		this._collections[cb]('remove', this._onMainRemove);
	}

	_addSubListeners(c) {
		if (!c || typeof c.on == 'function') {
			return { col: c };
		}
		let sub = {};
		sub.add = this._onSubAdd.bind(this, sub);
		sub.remove = this._onSubRemove.bind(this, sub);
		c.on('add', sub.add);
		c.on('remove', sub.remove);
		return sub;
	}

	_removeSubListeners(sub) {
		let c = sub.col;
		if (c && typeof c.off == 'function') {
			c.off('add', sub.add);
			c.off('remove', sub.remove);
		}
	}

	_onMainAdd(ev) {
		let idx = ev.idx;
		let c = ev.item;

		// Create a new sub and add it to our list.
		let sub = this._addSubListeners(c, true);
		this._subs.splice(idx, 0, sub);

		// Then we loop over it, emitting a lot of add events.
		if (c && c.length) {
			let i = this._getIdxStart(idx);
			for (let item of c) {
				this._eventBus.emit(this, this._namespace + '.add', {
					item,
					idx: i
				});
				i++;
			}
		}
	}

	_onMainRemove(ev) {
		let idx = ev.idx;

		// Get the sub, remove it from our list, and stop listening to it.
		let sub = this._subs[idx];
		this._sub.splice(idx, 1);
		this._removeSubListeners(sub);
		let c = sub.col;

		// Then we loop over it, emitting a lot of remove events.
		if (c && c.length) {
			let i = this._getIdxStart(idx);
			for (let item of c) {
				this._eventBus.emit(this, this._namespace + '.remove', {
					item,
					idx: i
				});
			}
		}
	}

	_onSubAdd(sub, ev) {
		let i = this._getSubStart(sub);
		this._eventBus.emit(this, this._namespace + '.add', {
			item: ev.item,
			idx: i + ev.idx
		});
	}

	_onSubRemove(sub, ev) {
		let i = this._getSubStart(sub);
		this._eventBus.emit(this, this._namespace + '.remove', {
			item: ev.item,
			idx: i + ev.idx
		});
	}

	_getIdxStart(idx) {
		let i = 0;
		for (let j = 0; j < idx; j++) {
			let s = this._subs[j];
			i += (s.col && s.col.length) || 0;
		}
		return i;
	}

	_getSubStart(sub) {
		let i = 0;
		for (let s of this._subs) {
			if (s === sub) {
				return i;
			}
			i += (s.col && s.col.length) || 0;
		}
		throw new Error("Collection not found: ", sub.col);
	}


	dispose() {
		if (this._subs) {
			for (let sub of this._subs) {
				this._removeSubListeners(sub);
			}
			this._subs = [];
		}
		this._setListeners(false);
		this._collections = null;
	}

	[Symbol.iterator]() {
		let done = { done: true };
		if (!this._collections) {
			return {
				next: function() {
					return done;
				}
			};
		}

		let arr = this._subs;
		let i = 0;
		let len = this._subs.length;
		let it = null;
		let r = null;

		return {
			next: function () {
				while (true) {
					// Get next iterator
					while (!it) {
						if (i >= len) return done;
						it = arr[i].col[Symbol.iterator]();
						i++;
					}

					r = it.next();
					if (!r.done) {
						return r;
					}
					// Iterator depleted
					it = null;
				}
			}
		};
	}
}

export default JoinedCollection;

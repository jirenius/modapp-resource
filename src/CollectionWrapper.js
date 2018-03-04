import eventBus from 'modapp/eventBus';
import * as array from 'modapp-utils/array';
import * as obj from 'modapp-utils/obj';

/**
 * A wrapper for a {@link module:modapp~Collection},
 * exposing the underlaying data but can provide a different sort order,
 * mapping of models, or filtering of models.
 * It will transparently propagate emitted add and remove events.
 * @implements {module:modapp~Collection}
 */
class CollectionWrapper {

	/**
	 * Creates an CollectionWrapper instance.
	 * @param {object} collection Collection object to wrap.
	 * @param {object} [opt] Optional parameters.
	 * @param {function} [opt.map] Model map callback. If not provided, model objects will be stored as is.
	 * @param {function} [opt.filter] Model filter callback. Parameter is a model of the underlying collection.
	 * @param {function} [opt.compare] Sort compare function.
	 * @param {string} [opt.namespace] Event bus namespace. Defaults to 'collectionWrapper'.
	 * @param {module:modapp~EventBus} [opt.eventBus] Event bus.
	 */
	constructor(collection, opt = {}) {
		this._collection = collection;

		obj.update(this, opt, {
			filter: { type: '?function', property: '_filter' },
			map: { type: '?function', property: '_map' },
			compare: { type: '?function', property: '_compare' },
			namespace: { type: 'string', default: 'collectionWrapper', property: '_namespace' },
			eventBus: { type: 'object', default: eventBus, property: '_eventBus' }
		});

		if (this._map && (this._filter || this._compare)) {
			this._weakMap = new WeakMap();
		}

		// Bind callbacks
		this._onAdd = this._onAdd.bind(this);
		this._onRemove = this._onRemove.bind(this);
		if (this._filter) {
			this._onChange = this._onChange.bind(this);
		}

		this._initList();
		this._setEventListeners(true);
	}

	_initList() {
		this._list = [];

		let getModel = this._map
			? item => this._map(item, this._collection)
			: item => item;
		let setWeakMap = this._weakMap
			? (item, m) => this._weakMap.set(item, m)
			: () => {};
		let add = this._filter
			? (item, m) => {
				if (item.on) {
					item.on('change', this._onChange);
				}
				this._list.push(this._wrapModel(m, item));
			}
			: (item, m) => this._list.push(this._wrapModel(m, item));

		for (let item of this._collection) {
			let m = getModel(item);
			setWeakMap(item, m);
			add(item, m);
		}

		if (this._compare) {
			this._list.sort((a, b) => this._compare(a.m, b.m));
		}
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

	atIndex(idx) {
		let cont = this._list[idx];
		return cont ? cont.m : undefined;
	}

	indexOf(model) {
		let idx = -1;
		if (this._filter) {
			for (let cont of this._list) {
				if (cont.f) {
					idx++;
					if (cont.m === model) {
						return idx;
					}
				} else {
					if (cont.m === model) {
						return -1;
					}
				}
			}
			return -1;
		} else {
			for (let cont of this._list) {
				idx++;
				if (cont.m === model) {
					return idx;
				}
			}
		}
	}

	get length() {
		return this._filter
			? this._list.filter(cont => cont.f).length
			: this._list.length;
	}

	filter(filter) {
		return this._filter
			? this._list.filter(cont => cont.f && filter(cont.m))
			: this._list.filter(cont => filter(cont.m));
	}

	map(filter) {
		return this._filter
			? this._list.filter(cont => cont.f).map(cont => filter(cont.m))
			: this._list.map(cont => filter(cont.m));
	}

	toJSON() {
		return this._filter
			? this._list.filter(cont => cont.f).map(cont => cont.m.toJSON ? cont.m.toJSON() : cont.m)
			: this._list.map(cont => cont.m.toJSON ? cont.m.toJSON() : cont.m);
	}

	_wrapModel(m, item) {
		return this._filter
			? { m: m, f: this._filter(item) }
			: { m: m };
	}

	_setEventListeners(on) {
		if (!this._collection.on) {
			return;
		}

		if (on) {
			this._collection.on('add', this._onAdd);
			this._collection.on('remove', this._onRemove);
		} else {
			this._collection.off('add', this._onAdd);
			this._collection.off('remove', this._onRemove);
		}
	}

	_binarySearch(m) {
		return array.binarySearch(this._list, { m }, (a, b) => this._compare(a.m, b.m));
	}

	_onChange(changed, item) {
		let m = this._weakMap
			? this._weakMap.get(item)
			: item;

		let idx, cont, emitIdx = 0;
		if (this._compare) {
			idx = this._binarySearch(m);
			cont = this._list[idx];
		} else {
			let len = this._list.length;
			for (idx = 0; idx < len; idx++) {
				let c = this._list[idx];
				if (c.m === m) {
					cont = this._list[idx];
					break;
				}
				if (c.f) {
					emitIdx++;
				}
			}
			if (!cont) {
				return;
			}
		}

		let f = this._filter(item);
		if (f === cont.f) {
			return;
		}


		if (f) {
			cont.f = true;
			if (this._compare) {
				emitIdx = this.indexOf(m);
			}
			this._eventBus.emit(this, this._namespace + '.add', {
				item: cont.m,
				idx: emitIdx
			});
		} else {
			if (this._compare) {
				emitIdx = this.indexOf(m);
			}
			cont.f = false;
			this._eventBus.emit(this, this._namespace + '.remove', {
				item: cont.m,
				idx: emitIdx
			});
		}
	}

	_onAdd(e) {
		if (!this._collection) {
			return;
		}

		let m, idx;

		if (this._map && this._compare) {
			m = this._map(e.item, this._collection);
			idx = this._binarySearch(m);
		} else {
			m = this._map
				? this._map(e.item, this._collection)
				: e.item;
			idx = this._compare
				? this._binarySearch(m)
				: e.idx;
		}

		if (this._weakMap) {
			this._weakMap.set(e.item, m);
		}

		if (idx < 0) {
			// If idx < 0, the value contains the bitwise compliment of where the
			// model would fit.
			idx = ~idx;
		}

		let cont = this._wrapModel(m, e.item);
		this._list.splice(idx, 0, cont);

		if (this._filter) {
			if (e.item.on) {
				e.item.on('change', this._onChange);
			}

			if (!cont.f) {
				return;
			}
			idx = this.indexOf(m);
		}

		this._eventBus.emit(this, this._namespace + '.add', {
			item: m,
			idx: idx
		});
	}

	_onRemove(e) {
		if (!this._collection) {
			return;
		}

		let cont, m, idx;

		if (this._map && this._compare) {
			m = this._weakMap.get(e.item);
			if (!m) {
				throw "Removed item not in WeakMap";
			}
			idx = this._binarySearch(m);
			cont = this._list[idx];
		} else if (this._map) {
			idx = e.idx;
			cont = this._list[idx];
		} else {
			idx = this._compare
				? this._binarySearch(e.item)
				: e.idx;
			cont = this._list[idx];
		}

		if (this._weakMap) {
			this._weakMap.delete(e.item);
		}

		let emitIdx = idx;

		if (this._filter) {
			if (e.item.on) {
				e.item.off('change', this._onChange);
			}

			if (!cont.f) {
				this._list.splice(idx, 1);
				return;
			}

			emitIdx = this.indexOf(cont.m);
		}

		this._list.splice(idx, 1);

		this._eventBus.emit(this, this._namespace + '.remove', {
			item: cont.m,
			idx: emitIdx
		});
	}

	dispose() {
		if (!this._collection) {
			return;
		}

		this._setEventListeners(false);
		delete this._collection;
		delete this._weakMap;
	}


	[Symbol.iterator]() {
		let i = 0;
		let arr = this._list;
		let len = this._list.length;
		let done = { done: true };

		if (this._filter) {
			return {
				next: function() {
					while (i < len) {
						a = arr[i];
						i++;
						if (a.f) {
							return {
								value: a.m,
								done: false
							};
						}
					}

					return done;
				}
			};
		}

		return {
			next: function () {
				return i < len
					? { value: arr[i++].m, done: false }
					: done;
			}
		};
	}
}

export default CollectionWrapper;

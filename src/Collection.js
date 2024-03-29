import SortedMap from './SortedMap';
import eventBus from 'modapp-eventbus';
import { obj } from 'modapp-utils';

/**
 * Collection is a generic data collection.
 * @implements {module:modapp~Collection}
 */
class Collection {

	/**
	 * Creates a Collection instance
	 * @param {object} [opt] Optional settings.
	 * @param {Array.<object>} [opt.data] Collection data array.
	 * @param {function} [opt.compare] Compare function for sort order. Defaults to insert order.
	 * @param {function} [opt.modelFactory] Model factory function. Defaults to using added objects as is.
	 * @param {function} [opt.idAttribute] Id attribute callback function. Defaults to returning the object.id property.
	 * @param {string} [opt.namespace] Event bus namespace. Defaults to 'collection'.
	 * @param {module:modapp~EventBus} [opt.eventBus] Event bus.
	 */
	constructor(opt) {
		opt = obj.copy(opt, {
			compare: { type: '?function' },
			modelFactory: { type: '?function' },
			idAttribute: { type: '?function', default: m => m.id },
			data: { type: '?object' },
			namespace: { type: 'string', default: 'collection' },
			eventBus: { type: 'object', default: eventBus }
		});

		this._modelFactory = opt.modelFactory;
		this._idAttribute = opt.idAttribute;
		this._namespace = opt.namespace;
		this._eventBus = opt.eventBus;

		this._map = opt.idAttribute ? new SortedMap(opt.compare) : [];

		// Populate map with initial data
		if (opt.data) {
			for (let item of opt.data) {
				this._addItem(item, false);
			}
		}
	}

	/**
	 * Attach an event handler function for one or more instance events.
	 * Available events are 'add', 'remove', and 'move'.
	 * @param {?string} events One or more space-separated events. Null means any event.
	 * @param {EventBus~eventCallback} [handler] A function to execute when the event is emitted.
	 * @returns {this}
	 */
	on(events, handler) {
		this._eventBus.on(this, events, handler, this._namespace);
		return this;
	}

	 /**
	 * Remove an instance event handler.
	 * Available events are 'add', 'remove', and 'move'.
	 * @param {?string} events One or more space-separated events. Null means any event.
	 * @param {EventBus~eventCallback} [handler] An option handler function. The handler will only be remove if it is the same handler.
	 * @returns {this}
	 */
	off(events, handler) {
		this._eventBus.off(this, events, handler, this._namespace);
		return this;
	}

	/**
	 * Add an item to the collection.
	 * @param {*} item Item to add
	 * @param {idx} [idx] Index value of where to insert the item. Ignored if the collection has a compare function.
	 * @returns {number} Index value of where the item was inserted in the list
	 */
	add(item, idx) {
		return this._addItem(item, true, idx);
	}

	/**
	 * Remove an item from the collection.
	 * @param {string} id Id of the item.
	 * @returns {number} Order index of the item before removal. -1 if the item id doesn't exist
	 */
	remove(id) {
		if (!this._idAttribute) {
			throw new Error("No id attribute set.");
		}
		let item = this.get(id);
		if (!item) return -1;

		let idx = this._map.remove(id);

		// Emit event if an item was removed
		if (idx >= 0) {
			this._eventBus.emit(this, this._namespace + '.remove', { item: item, idx: idx });
		}

		return idx;
	}

	/**
	 * Remove an item at a given index.
	 * @param {*} idx Index value of the item to remove.
	 * @returns {*} Removed item.
	 */
	removeAtIndex(idx) {
		if (idx < 0 || idx >= this._map.length) {
			throw new Error("Index out of bounds.");
		}

		let item = this._map[idx];
		if (this._idAttribute) {
			this._map.remove(this._idAttribute(item));
		} else {
			this._map.splice(idx, 1);
		}

		this._eventBus.emit(this, this._namespace + '.remove', { item: item, idx: idx });

		return item;
	}

	/**
	 * Get an item from the collection by id
	 * @param {string} id Id of the item
	 * @returns {*} Stored item. Undefined if key doesn't exist
	 */
	get(id) {
		if (!this._idAttribute) {
			throw new Error("No id attribute set.");
		}
		return this._map.get(id);
	}

	/**
	 * Move an item within the collection.
	 * Invalid if the collection has a compare function.
	 * @param {string} id Id of the item
	 * @param {*} idx Index to move the item to
	 * returns {number} Order index of the item before moving. -1 if the item id doesn't exist.
	 */
	move(id, idx) {
		if (this.compare) throw "Cannot use move in list with compare";

		throw "Not implemented";
	}

	/**
	 * Retrieves the order index of an item.
	 * @param {string|object} item Item or id of the item
	 * @returns {number} Order index of the item. -1 if the item id doesn't exist.
	 */
	indexOf(item) {
		if (typeof item === 'string') {
			item = this._map.get(item);
			if (!item) {
				return -1;
			}
		}
		return this._map.indexOf(item);
	}

	atIndex(idx) {
		return this._map[idx];
	}

	get length() {
		return this._map.length;
	}

	toArray() {
		return this._map.slice();
	}

	_addItem(item, emit, idx) {
		if (this._modelFactory) {
			item = this._modelFactory(item);
		}

		if (this._idAttribute) {
			idx = this._map.add(this._idAttribute(item), item, idx);
		} else {
			if (typeof idx != 'number') {
				idx = this._map.length;
			} else if (idx < 0 || idx > this._map.length) {
				throw new Error("Index out of bounds.");
			}
			this._map.splice(idx, 0, item);
		}
		if (emit) {
			this._eventBus.emit(this, this._namespace + '.add', { item: item, idx: idx });
		}
		return idx;
	}

	[Symbol.iterator]() {
		let i = 0,
			a = this._map,
			l = a.length;

		return {
			next: function() {
				return { value: a[i++], done: i > l };
			}
		};
	}
}

export default Collection;

export function sortOrderCompare(a, b) {
	return a.sortOrder - b.sortOrder;
};

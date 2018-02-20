import SortedMap from './SortedMap';
import * as obj from 'modapp-utils/obj';

/**
 * Collection wraps a SortedMap and implements the {@link interface/CollectionInterface}
 * @module class/Collection
 */
class Collection {

	/**
	 * @constructor
	 * @param {module:modapp~EventBus} eventBus EventBus object used for passing events
	 * @param {string} namespace Event namespace to use.
	 * @param {object} [opt] Optional settings
	 * @param {Array.<object>} [opt.data] Collection data array
	 * @param {function} [opt.compare] Compare function for sort order. Defaults to insert order.
	 * @param {function} [opt.modelFactory] Model factory function. Defaults to using added objects as is.
	 * @param {function} [opt.idAttribute] Id attribute callback function. Defaults to returning the object.id property.
	 * @alias module:class/Collection
	 */
	constructor(eventBus, namespace, opt) {
		opt = obj.copy(opt, {
			compare: { type: '?function' },
			modelFactory: { type: '?function' },
			idAttribute: { type: 'function', default: m => m.id },
			data: { type: '?object' }
		});

		this._eventBus = eventBus;
		this._namespace = namespace;
		this._modelFactory = opt.modelFactory;
		this._idAttribute = opt.idAttribute;

		this._map = new SortedMap(opt.compare);

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
		let item = this.get(id);
		if (!item) return -1;

		let idx = this._map.remove(id);

		// Emit event if an item was removed
		if (idx >= 0) {
			this._eventBus.emit(this, this._namespace + '.remove', {item: item, idx: idx});
		}

		return idx;
	}

	/**
	 * Get an item from the collection by id
	 * @param {string} id Id of the item
	 * @returns {*} Stored item. Undefined if key doesn't exist
	 */
	get(id) {
		return this._map.get(id);
	}

	/**
	 * Move an item within the collection.
	 * Invalid if the collection has a compare function.
	 * @param {string} id Id of the item
	 * @param {*} idx Index to move the item to
	 * @returns {number} Order index of the item before moving. -1 if the item id doesn't exist.
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

	_addItem(item, emit, idx) {
		if (this._modelFactory) {
			item = this._modelFactory(item);
		}

		idx = this._map.add(this._idAttribute(item), item, idx);
		if (emit) {
			this._eventBus.emit(this, this._namespace + '.add', {item: item, idx: idx});
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
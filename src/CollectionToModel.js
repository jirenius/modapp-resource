import eventBus from 'modapp-eventbus';
import { obj } from 'modapp-utils';

/**
 * Model key callback
 * @callback CollectionToModel~modelKeyCallback
 * @param {*} item Collection item
 * @returns {string} Model key for the item. Must be unique for all items in the collection, and should be based on immutable values.
 */

/**
 * A wrapper for a {@link module:modapp~Collection} that exposes an object that implements the {@link module:modapp~Model}
 * interface. It will transparently propagate emitted add and remove events and turn them to change events.
 * @implements {module:modapp~Model}
 */
class CollectionToModel {

	/**
	 * Creates an CollectionToModel instance.
	 * @param {object} collection Collection object to wrap.
	 * @param {CollectionToModel~modelKeyCallback} keyCallback Model key callback function.
	 * @param {object} [opt] Optional parameters.
	 * @param {function} [opt.map] Model value map callback. If not provided, model values will be the same as collection items: func(item) -> value
	 * @param {string} [opt.namespace] Event bus namespace. Defaults to 'collectionToModel'.
	 * @param {module:modapp~EventBus} [opt.eventBus] Event bus.
	 */
	constructor(collection, keyCallback, opt = {}) {
		this._collection = collection;
		this._keyCallback = keyCallback;

		obj.update(this, opt, {
			map: { type: 'function', default: v => v, property: '_map' },
			namespace: { type: 'string', default: 'collectionToModel', property: '_namespace' },
			eventBus: { type: 'object', default: eventBus, property: '_eventBus' }
		});

		// Bind callbacks
		this._onAdd = this._onAddRemove.bind(this, true);
		this._onRemove = this._onAddRemove.bind(this, false);

		// Init props
		this._props = {};
		for (let v of this._collection) {
			let k = this._keyCallback(v);
			if (!this._props.hasOwnProperty(k)) {
				let mv = this._map(v);
				this._props[k] = mv;
				if (this._promote(k)) {
					this[k] = mv;
				}
			}
		}

		this._setEventListeners(true);
	}

	/**
	 * Model properties.
	 * @returns {object} Anonymous object with all model properties.
	 */
	get props() {
		return this._props;
	}

	/**
	 * Get wrapped collection
	 * @returns {object} Collection
	 */
	getCollection() {
		return this._collection;
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

	_onAddRemove(isAdd, e) {
		if (!this._collection) {
			return;
		}

		let v = e.item;
		let k = this._keyCallback(v);
		let ov = this._props[k];
		let mv = this._map(v);

		if (isAdd) {
			this._props[k] = mv;
			if (this._promote(k)) {
				this[k] = mv;
			}
		} else {
			delete this._props[k];
			if (this._promote(k)) {
				delete this[k];
			}
		}

		let changed = {};
		changed[k] = ov;
		this._eventBus.emit(this, this._namespace + '.change', changed);
	}

	_promote(key) {
		return (this.hasOwnProperty(key) || typeof this[key] == 'undefined') && key[0] !== '_';
	}

	toJSON() {
		let o = Object.assign({}, this._props);
		for (let k in o) {
			var v = o[k];
			if (typeof v === 'object' && v !== null && v.toJSON) {
				o[k] = v.toJSON();
			}
		}
		return o;
	}

	dispose() {
		if (!this._collection) {
			return;
		}

		this._setEventListeners(false);
		delete this._props;
		delete this._collection;
	}

}

export default CollectionToModel;

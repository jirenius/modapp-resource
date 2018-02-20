import * as obj from 'modapp-utils/obj';

/**
 * Model implements the {@link interface/Model} interface.
 */
class Model {

	/**
	 * Creates a Model instance
	 * @param {module:modapp~EventBus} eventBus Event bus.
	 * @param {string} namespace Event bus namespace.
	 * @param {object} [opt] Optional parameters
	 * @param {object} [opt.definition] Object definition. If not provided, any value will be allowed.
	 * @param {object} [opt.data] Initial data.
	 */
	constructor(eventBus, namespace, opt = {}) {
		this._eventBus = eventBus;
		this._namespace = namespace;
		this._definition = opt.definition || null;

		if (opt.data) {
			this._update(opt.data, false);
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

	/**
	 * Sets model properties
	 * If any property where changed, this will trigger a change event.
	 * @param {object} props Properties to set
	 * @returns {Promise} Promise to the setting of the properties.
	 */
	set(props) {
		return Promise.resolve(this._update(props, true));
	}

	/**
	 * Returns the model definition, or null if none is set.
	 * @returns {?object} Object definition
	 */
	getDefinition() {
		return this._definition;
	}

	/**
	 * Updates the properties.
	 * @private
	 */
	_update(props, emit) {
		if (!props) {
			return null;
		}

		let changed = null;
		if (this._definition) {
			changed = obj.update(this, props, this._definition);
		} else {
			for (let key in props) {
				if (key &&
					props.hasOwnProperty(key) &&
					key.substr(0,1) !== '_' &&
					(this.hasOwnProperty(key) || !this[key])
				) {
					if (props[key] !== this[key]) {
						changed = changed || {};
						changed[key] = this[key];
						if (props[key] === undefined) {
							delete this[key];
						} else {
							this[key] = props[key];
						}
					}
				}
			}
		}

		if (changed && emit) {
			this._eventBus.emit(this, this._namespace + '.change', changed);
		}

		return changed;
	}

	toJSON() {
		if (this._definition) {
			return obj.copy(this, this._definition);
		}

		let props = {};
		for (let key in this) {
			if (key &&
				this.hasOwnProperty(key) &&
				key.substr(0,1) !== '_'
			) {
				props[key] = this[key];
			}
		}
		return props;
	}
}

export default Model;
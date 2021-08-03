import eventBus from 'modapp-eventbus';
import { obj } from 'modapp-utils';

/**
 * Model is a generic data model.
 * @implements {module:modapp~Model}
 */
class Model {

	/**
	 * Creates a Model instance
	 * @param {object} [opt] Optional parameters.
	 * @param {object} [opt.definition] Object definition. If not provided, any value will be allowed.
	 * @param {object} [opt.data] Initial data.
	 * @param {string} [opt.namespace] Event bus namespace. Defaults to 'model'.
	 * @param {module:modapp~EventBus} [opt.eventBus] Event bus.
	 */
	constructor(opt = {}) {
		this._definition = opt.definition || null;
		this._namespace = opt.namespace || 'model';
		this._eventBus = opt.eventBus || eventBus;

		this._props = {};
		if (opt.data) {
			this._update(opt.data, false);
		}
	}

	/**
	 * Model properties.
	 * @returns {object} Anonymous object with all model properties.
	 */
	get props() {
		return this._props;
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
	 * Resets all model properties to the given props. If any property where
	 * changed or is missing, this will trigger a change event.
	 * @param {object} props Properties to reset the model to.
	 * @returns {Promise} Promise to the setting of the properties.
	 */
	reset(props) {
		return Promise.resolve(this._update(props, true, true));
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
	 * @param {object} props Properties to update.
	 * @param {boolean} emit Flag if changes though be emitted on the eventBus.
	 * @param {boolean} reset Flag that sets if missing values should be deleted.
	 * @returns {?object} Key/value object with the change properties and old values, or null if there were no changes.
	 * @private
	 */
	_update(props, emit, reset) {
		if (!props) {
			return null;
		}

		let changed = null;
		let v, promote;
		let p = this._props;

		if (reset) {
			props = Object.assign({}, props);
			for (var k in p) {
				if (!props.hasOwnProperty(k)) {
					props[k] = undefined;
				}
			}
		}

		if (this._definition) {
			changed = obj.update(p, props, this._definition);
			for (let key in changed) {
				if ((this.hasOwnProperty(key) || !this[key]) && key[0] !== '_') {
					v = p[key];
					if (v === undefined) {
						delete this[key];
					} else {
						this[key] = v;
					}
				}
			}
		} else {
			for (let key in props) {
				v = props[key];
				promote = (this.hasOwnProperty(key) || !this[key]) && key[0] !== '_';
				if (p[key] !== v) {
					changed = changed || {};
					changed[key] = p[key];
					if (v === undefined) {
						delete p[key];
						if (promote) delete this[key];
					} else {
						p[key] = v;
						if (promote) this[key] = v;
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
			return obj.copy(this._props, this._definition);
		}

		let props = {};
		let p = this.props;
		let v;
		for (let key in p) {
			v = p[k];
			props[key] = v && typeof v == 'object' && typeof v.toJSON == 'function' ? v.toJSON() : v;
		}
		return props;
	}
}

export default Model;

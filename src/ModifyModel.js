import { eventBus } from 'modapp';
import { obj } from 'modapp-utils';

/**
 * ModifyModel wraps another object or a {@link module:modapp~Model},
 * and sets its own properties to the match.
 * Any property modification that will cause a difference between the models will set the additional
 * property "isModified" to be true.
 * It also listens to changed in the underlying model. If a non-modified property is changed,
 * the ModifyModel will update its own property.
 * Because ModifyModel listens to the underlying model, it needs to be disposed when not used anymore.
 * @implements {module:modapp~Model}
 */
class ModifyModel {

	/**
	 * Creates a ModifyModel instance
	 * @param {object|Model} model Model object to wrap.
	 * @param {object} [opt] Optional parameters.
	 * @param {object} [opt.definition] Object definition. If not provided, any value will be allowed.
	 * @param {string} [opt.namespace] Event bus namespace. Defaults to 'modifyModel'.
	 * @param {module:modapp~EventBus} [opt.eventBus] Event bus.
	 */
	constructor(model, opt = {}) {
		this._model = model;
		this._modification = {};

		this._eventBus = opt.eventBus || eventBus;
		this._namespace = opt.namespace || 'modifyModel';
		this._definition = opt.definition || null;
		this._modProp = opt.isModifiedProperty || 'isModified';

		let changed = this._update(model);
		this._setIsModified(changed);

		// Bind callbacks
		this._onModelChange = this._onModelChange.bind(this);

		this._setEventListener(true);
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
		let changed = props ? this._update(props) : null;
		changed = this._setIsModified(changed);

		if (changed) {
			this._eventBus.emit(this, this._namespace + '.change', changed);
		}

		return Promise.resolve(changed);
	}

	/**
	 * Get the modifications in ModifyModel in comparison to the underlying model object.
	 * @returns {?object} Key/value object with modified properties and their new value. Null if there are no modifications.
	 */
	getModifications() {
		return Object.keys(this._modification).length
			? Object.assign({}, this._modification)
			: null;
	}

	getModel() {
		return this._model;
	}

	_setIsModified(changed) {
		if (changed) {
			let v;
			for (let k in changed) {
				v = this._model[k];
				if (this[k] === v || typeof v === 'undefined') {
					delete this._modification[k];
				} else {
					this._modification[k] = this[k];
				}
			}
		}

		// Do we have any modifications
		let newIsModified = Object.keys(this._modification).length > 0;
		if (newIsModified !== this[this._modProp]) {
			changed = changed || {};
			changed[this._modProp] = !newIsModified;
			this[this._modProp] = newIsModified;
		}

		return changed;
	}

	_setEventListener(on) {
		if (!this._model || !this._model.on) {
			return;
		}

		if (on) {
			this._model.on('change', this._onModelChange);
		} else {
			this._model.off('change', this._onModelChange);
		}
	}

	_onModelChange(changed) {
		let props, old;
		for (let k in changed) {
			old = changed[k];
			if (this[k] === old) {
				props = props || {};
				props[k] = this._model[k];
			} else {
				if (this[k] === this._model[k]) {
					delete this._modification[k];
				}
			}
		}

		this.set(props);
	}

	/**
	 * Updates the properties.
	 * @param {object} props Properties to update.
	 * @returns {?object} Key/value object with the change properties and old values, or null if there were no changes.
	 * @private
	 */
	_update(props) {
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
					key.substr(0, 1) !== '_' &&
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
				key.substr(0, 1) !== '_'
			) {
				props[key] = this[key];
			}
		}
		return props;
	}

	dispose() {
		this._setEventListener(false);
		this._model = null;
	}
}

export default ModifyModel;

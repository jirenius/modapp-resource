import eventBus from 'modapp-eventbus';
import { obj } from 'modapp-utils';

function hasProps(m) {
	return m && m.props && typeof m.props == 'object' ? m.props : null;
}

function getProps(m) {
	if (!m) {
		return null;
	}
	let props = hasProps(m);
	if (props) {
		return props;
	}
	let o = {};
	for (let k in m) {
		if (k && m.hasOwnProperty(k) && k[0] !== '_') {
			o[k] = m[k];
		}
	}
	return o;
}

/**
 * ModifyModel wraps another object or a {@link module:modapp~Model}, and sets
 * its own properties to the match.
 *
 * Any property modification that will cause a difference between the models
 * will set the additional property "isModified" to be true.
 *
 * It also listens to changed in the underlying model. If a non-modified
 * property is changed, the ModifyModel will update its own property.
 *
 * Because ModifyModel listens to the underlying model, it needs to be disposed
 * when not used anymore.
 * @implements {module:modapp~Model}
 */
class ModifyModel {

	/**
	 * Creates a ModifyModel instance
	 * @param {object|Model} model Model object to wrap.
	 * @param {object} [opt] Optional parameters.
	 * @param {object} [opt.definition] Object definition. If not provided, any value will be allowed.
	 * @param {string} [opt.namespace] Event bus namespace. Defaults to 'modifyModel'.
	 * @param {object} [opt.isModifiedProperty] Property used to flag if model is modified. Defaults to 'isModified'.
	 * @param {object} [opt.props] Properties to set initially.
	 * @param {function} [opt.onChange] Callback called whenever the underlying model has changed. function(this, change)
	 * @param {module:modapp~EventBus} [opt.eventBus] Event bus.
	 * @param {boolean} [opt.modifiedOnNew] [opt.modifiedOnNew] Flag telling if model is considered modified on new properties not existing on the wrapped model. Defaults to false.
	 */
	constructor(model, opt = {}) {
		this._model = model;
		this._modification = {};

		this._eventBus = opt.eventBus || eventBus;
		this._namespace = opt.namespace || 'modifyModel';
		this._definition = opt.definition || null;
		this._modProp = opt.hasOwnProperty('isModifiedProperty') ? opt.isModifiedProperty : 'isModified';
		this._modifiedOnNew = !!opt.modifiedOnNew;
		this._onChange = opt.onChange || null;
		this._props = {};

		this._setIsModified(this._update(getProps(model)));
		if (opt.props) {
			this._setIsModified(this._update(opt.props));
		}

		this._onCount = 0;
		this._timeout = null;

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

	get props() {
		return this._props;
	}

	/**
	 * Resets a single or all model properties to the underlying model, clearing
	 * any modifications. If any property where changed or is missing, this will
	 * trigger a change event.
	 * @param {string} [prop] Optional property to reset. Defaults to resetting all properties.
	 * @returns {Promise} Promise to the setting of the properties.
	 */
	reset(prop) {
		let o = {};
		let m = hasProps(this._model) || this._model;
		if (prop) {
			if (this._modification.hasOwnProperty(prop)) {
				o[prop] = m[prop];
			}
		} else {
			for (let k in this._modification) {
				o[k] = m[k];
			}
		}
		return this.set(o);
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
			let m = hasProps(this._model) || this._model;
			for (let k in changed) {
				v = m[k];
				if (this._props[k] === v || (!this._modifiedOnNew && typeof v == 'undefined')) {
					delete this._modification[k];
				} else {
					this._modification[k] = this._props[k];
				}
			}
		}

		// Do we have any modifications
		if (this._modProp) {
			let newIsModified = Object.keys(this._modification).length > 0;
			if (newIsModified !== this._props[this._modProp]) {
				changed = changed || {};
				changed[this._modProp] = !newIsModified;
				this._props[this._modProp] = newIsModified;
				this[this._modProp] = newIsModified;
			}
		}

		return changed;
	}

	_setEventListener(on) {
		if (this._model && this._model.on) {
			this._model[on ? 'on' : 'off']('change', this._onModelChange);
		}
	}

	_onModelChange(changed) {
		if (!this._model) return;

		let m = hasProps(this._model) || this._model;
		let props;
		for (let k in changed) {
			// If the value isn't modified
			if (!this._modification.hasOwnProperty(k)) {
				props = props || {};
				props[k] = m[k];
			} else {
				if (this._props[k] === m[k]) {
					delete this._modification[k];
				}
			}
		}

		this.set(props);
		if (this._onChange) {
			this._onChange(this, changed);
		}
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
		let v, promote;
		let p = this._props;

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
			v = p[key];
			props[key] = v && typeof v == 'object' && typeof v.toJSON == 'function' ? v.toJSON() : v;
		}
		return props;
	}

	dispose() {
		this._setEventListener(false);
		this._model = null;
	}
}

export default ModifyModel;

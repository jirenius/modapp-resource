import eventBus from 'modapp-eventbus';
import Model from './Model';
import { getProps } from './utils';

/**
 * A wrapper for a {@link module:modapp~Model}, exposing the underlaying data
 * but can provide mapping of items, or filtering of items. It will
 * transparently propagate emitted change events.
 * @implements {module:modapp~Model}
 */
class ModelWrapper extends Model {

	/**
	 * Creates an ModelWrapper instance.
	 * @param {object?} model Model object to wrap.
	 * @param {object} [opt] Optional parameters.
	 * @param {function} [opt.map] Model map callback. If not provided, item objects will be stored as is.
	 * @param {function} [opt.keyMap] Key map callback. If not provided, original key will be used.
	 * @param {function} [opt.filter] Model filter callback. Parameter is a item of the underlying model.
	 * @param {function} [opt.dispose] Dispose callback called when a mapped item removed.
	 * @param {string} [opt.namespace] Event bus namespace. Defaults to 'modelWrapper'.
	 * @param {module:modapp~EventBus} [opt.eventBus] Event bus.
	 */
	constructor(model, opt = {}) {
		super(Object.assign({ namespace: 'modelWrapper', eventBus: eventBus }));

		this._map = opt.map || null;
		this._keyMap = opt.keyMap || null;
		this._filter = opt.filter || null;
		this._dispose = opt.dispose || null;

		// Bind callbacks
		this._onChange = this._onChange.bind(this);

		if (this._filter || this._map || this._keyMap) {
			this._items = {};
		}

		this.setModel(model, true);
	}

	/**
	 * Model properties.
	 * @returns {object} Anonymous object with all model properties.
	 */
	get props() {
		return this._props;
	}

	/**
	 * Sets model properties on the underlying model.
	 * @param {object} props Properties to set
	 * @returns {Promise} Promise to the setting of the properties.
	 */
	set(props) {
		if (!this._model || typeof this._model.set != 'function') {
			throw new Error("No set method on underlying model.");
		}

		return this._model.set(props);
	}

	/**
	 * Get wrapped model.
	 * @returns {object|Model} Model
	 */
	getModel() {
		return this._model;
	}

	/**
	 * Sets the wrapped model.
	 * @param {?object} model Model or object to set.
	 * @param {boolean} noEvents Flag telling if no model change event should be triggered during set.
	 * @returns {Promise} Promise to the setting of the model.
	 */
	setModel(model, noEvents) {
		model = model || null;
		if (model === this._model) return Promise.resolve({});

		let om = this._model;
		this._removeItems();
		this._listen(false);
		this._model = model || null;
		this._listen(true);

		let p = getProps(this._model);

		let o = {};
		if (p) {
			for (let k in p) {
				if (p.hasOwnProperty(k) && k.substr(0, 1) != '_') {
					let v = p[k];
					this._prep(o, k, v);
				}
			}
		}

		return Promise.resolve(super._update(o, !noEvents, !!om));
	}

	_listen(on) {
		let cb = on ? 'on' : 'off';
		if (this._model && this._model[cb]) {
			this._model[cb]('change', this._onChange);
		}
	}

	_prep(o, k, v) {
		let isDefined = typeof v !== 'undefined';
		let mk = this._keyMap
			? isDefined && this._keyMap(k, v)
			: k;
		if (typeof mk != 'string') {
			mk = null;
		}
		if (isDefined && mk && (!this._filter || this._filter(k, v))) {
			if (this._map) {
				v = this._map(k, v);
			}
			o[mk] = v;
		} else {
			// Ensure we don't overwrite a new value
			if (mk !== null && !o.hasOwnProperty(mk)) {
				o[mk] = undefined;
			}
		}

		let c = this._upsertItem(k, v, mk);
		if (c) {
			// Check if value existed, but with a different mapped key
			if (c.mkey !== mk) {
				if (!o.hasOwnProperty(c.mkey)) {
					o[c.mkey] = undefined;
				}
				c.mkey = mk;
			}
		}
		return o;
	}

	_upsertItem(k, v, mk) {
		if (!this._items) return;

		// Check if item already exists.
		let c = this._items[k];
		if (c) {
			if (c.value === v) {
				return c;
			}
			// Unlisten to old value
			this._removeItem(c);
		}

		if (typeof v == 'undefined') {
			return c;
		}

		c = { key: k, value: v, mkey: mk };
		// Listen to model values
		if (typeof v === 'object' && v !== null && typeof v.on == 'function') {
			c.cb = () => {
				// Ensure the model still has this property
				let p = getProps(this._model);
				let k = c.key;
				if (p && p.hasOwnProperty(k)) {
					this._onItemChange(c);
				}
			};
			v.on('change', c.cb);
		}
		this._items[k] = c;
		return c;
	}

	_removeItem(k) {
		// Unlisten to old value
		let c = this._items[k];
		if (c) {
			if (c.cb) {
				c.value.off('change', c.cb);
			}
			if (this._dispose) {
				this._dispose(k, c.value);
			}
			delete this._items[k];
		}
	}

	_onChange(change, m) {
		if (m !== this._model) return;

		let p = getProps(m);
		let o = {};
		for (let k in change) {
			let v = p[k];
			this._prep(o, k, v);
		}

		super.set(o);
	}

	_onItemChange(c) {
		let p = getProps(this._model);
		// Ensure the item is still the same
		if (!p || p[c.key] !== c.value) return;

		super.set(this._prep({}, c.key, c.value));
	}

	_removeItems() {
		if (this._items) {
			for (let k in this._items) {
				this._removeItem(k);
			}
		}
	}

	dispose() {
		this._removeItems();
		this._listen(false);
		this._model = null;
	}
}

export default ModelWrapper;

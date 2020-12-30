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
	 * @param {function} [opt.filter] Model filter callback. Parameter is a item of the underlying model.
	 * @param {string} [opt.namespace] Event bus namespace. Defaults to 'modelWrapper'.
	 * @param {module:modapp~EventBus} [opt.eventBus] Event bus.
	 */
	constructor(model, opt = {}) {
		super(Object.assign({ namespace: 'modelWrapper', eventBus: eventBus }));

		this._map = opt.map || null;
		this._filter = opt.filter || null;

		// Bind callbacks
		this._onChange = this._onChange.bind(this);
		if (this._filter) {
			this._filtered = {};
		}

		if (this._filter || this._map) {
			this._cbs = {};
		}

		this.setModel(model, true);
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
		this._unlistenItems();
		this._listen(false);
		this._model = model || null;
		this._listen(true);

		let p = getProps(this._model);

		let o = {};
		if (p) {
			for (let k in p) {
				if (p.hasOwnProperty(k) && k.substr(0, 1) != '_') {
					let v = p[k];
					this._listenItem(k, v);
					if (!this._filter || this._filter(k, v)) {
						if (this._map) {
							v = this._map(k, v);
						}
						o[k] = v;
					}
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

	_listenItem(k, v) {
		if (!this._cbs) return;

		// Unlisten to old value
		this._unlistenItem(k);
		if (typeof v === 'object' && v !== null && typeof v.on == 'function') {
			let o = { key: k, value: v };
			o.cb = () => {
				// Ensure the model still has this property
				let p = getProps(this._model);
				let k = o.key;
				if (p && p.hasOwnProperty(k)) {
					this._onItemChange(k, o.value);
				}
			};
			v.on('change', o.cb);
			this._cbs[k] = o;
		}
	}

	_unlistenItem(k) {
		// Unlisten to old value
		let o = this._cbs[k];
		if (o) {
			o.value.off('change', o.cb);
		}
		delete this._cbs[k];
	}

	_onChange(change, m) {
		if (m !== this._model) return;

		let p = getProps(m);
		let o = {};
		for (let k in change) {
			this._prep(o, p, k);
		}

		super.set(o);
	}

	_onItemChange(k, v) {
		let p = getProps(this._model);
		if (!p || p[k] !== v) return;

		let o = this._prep({}, p, k);
		super.set(o);
	}

	_prep(o, p, k) {
		let v = p[k];
		this._listenItem(k, v);
		if (typeof v !== 'undefined' && (!this._filter || this._filter(k, v))) {
			if (this._map) {
				v = this._map(k, v);
			}
			o[k] = v;
		} else {
			o[k] = undefined;
		}
		return o;
	}

	_unlistenItems() {
		if (!this._cbs) return;
		for (let k in this._cbs) {
			this._unlistenItem(k);
		}
	}

	dispose() {
		this._unlistenItems();
		this._listen(false);
		this._model = null;
	}
}

export default ModelWrapper;

import * as array from 'modapp-utils/array';

/**
 * A map is an ordered list for key-value items. The map also allows for value lookup
 * by key name through the get() method.
 * @constructor
 * @alias module:class/SortedMap
 * @param {function} [compare] Sort compare function. Defaults to sort by order they are added.
 */
export default function(compare) {
	/** @lends module:class/SortedMap.prototype */
	var list = [];

	var map = {};

	/**
	 * Adds a value to the map
	 * @param {string} key Key of value to add
	 * @param {*} value Value to add
	 * @param {number} [idx] Index of position to insert value. Default is at the end. Ignored if a §ompare function is used
	 * @returns {number} Index of insert position
	 */
	list.add = function(key, value, idx) {
		if (map[key]) throw "Map key [" + key + "] already exists";

		map[key] = value;

		if (compare) {
			idx = array.binaryInsert(list, value, compare, true);
		} else {
			if (typeof idx != 'number' || idx >= list.length) {
				idx = list.length;
				list.push(value);
			} else if (idx <= 0) {
				idx = 0;
				list.unshift(value);
			} else {
				list.splice(idx, 0, value);
			}
		}

		return idx;
	};

	/**
	 * Removes a value item from the map
	 * @param {string} key Key of value to remove
	 * @returns {number} Index of value position before removal. -1 if key doesn't exist
	 */
	list.remove = function(key) {
		var idx, value = map[key];
		if (value === undefined) {
			return -1;
		}

		delete map[key];
		idx = compare
			? array.binarySearch(list, value, compare)
			: list.indexOf(value);

		if (idx >= 0) {
			list.splice(idx, 1);
		}

		return idx;
	};

	/**
	 * Gets a value from the map by key
	 * @param {string} key Key of value to get
	 * @returns {*} Stored value. Undefined if key doesn't exist
	 */
	list.get = function(key) {
		return map[key];
	};

	/**
	 * Retrieves the order index of a value in the map
	 * @param {string} key Key of value to get index for
	 * @returns {number} Index of value position. -1 if key doesn't exist
	 */
	list.indexOfKey = function(key) {
		var value = map[key];
		if (!value) {
			return -1;
		}
		return compare
			? array.binarySearch(list, value, compare)
			: list.indexOf(value);
	};

	return list;
};

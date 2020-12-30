/**
 * Get the props object of a model, or the model itself it if doesn't exist.
 * @param {*} m Model.
 * @returns {object} Model or props object.
 */
export function getProps(m) {
	let p = m && m.props;
	return typeof p == 'object' && p !== null ? p : m;
}

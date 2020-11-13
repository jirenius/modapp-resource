import Model from './Model';
import ModelCollection from './Collection';
import CollectionToModel from './CollectionToModel';

describe("CollectionToModel", () => {
	let items;
	let collection;
	let wrapper;

	jest.useFakeTimers();

	beforeEach(() => {
		items = {
			10: { id: 10, fruit: 'banana' },
			20: { id: 20, fruit: 'pineapple' },
			30:	{ id: 30, fruit: 'orange' },
			40:	{ id: 40, fruit: 'apple' }
		};
		collection = new ModelCollection({
			modelFactory: item => new Model({ data: item }),
			data: [
				items[10],
				items[20],
				items[30],
				items[40]
			]
		});

		// recordedEvents = [];
	});

	afterEach(() => {
		if (wrapper) {
			wrapper.dispose();
			wrapper = null;
		}
	});

	describe("props", () => {
		it("returns items as model properties", () => {
			wrapper = new CollectionToModel(collection, item => item.id);
			expect(wrapper.props).toMatchObject({
				10: { id: 10, fruit: 'banana' },
				20: { id: 20, fruit: 'pineapple' },
				30:	{ id: 30, fruit: 'orange' },
				40:	{ id: 40, fruit: 'apple' }
			});
		});
	});

	describe("toJSON", () => {
		it("returns json object", () => {
			wrapper = new CollectionToModel(collection, item => item.id);
			expect(wrapper.toJSON()).toEqual({
				10: { id: 10, fruit: 'banana' },
				20: { id: 20, fruit: 'pineapple' },
				30:	{ id: 30, fruit: 'orange' },
				40:	{ id: 40, fruit: 'apple' }
			});
		});
	});

	describe("on", () => {
		it("triggers change event on add", () => {
			wrapper = new CollectionToModel(collection, item => item.id);
			let onChange = jest.fn();
			let passionfruit = { id: 50, fruit: 'kiwi' };
			wrapper.on('change', onChange);
			collection.add(passionfruit);
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({
				10: { id: 10, fruit: 'banana' },
				20: { id: 20, fruit: 'pineapple' },
				30:	{ id: 30, fruit: 'orange' },
				40:	{ id: 40, fruit: 'apple' },
				50:	{ id: 50, fruit: 'kiwi' }
			});
			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange.mock.calls[0][0]).toMatchObject({ 50: undefined });

			wrapper.off('change', onChange);
		});

		it("triggers change event on remove", () => {
			wrapper = new CollectionToModel(collection, item => item.id);
			let onChange = jest.fn();
			wrapper.on('change', onChange);
			collection.remove(20);
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({
				10: { id: 10, fruit: 'banana' },
				30:	{ id: 30, fruit: 'orange' },
				40:	{ id: 40, fruit: 'apple' }
			});
			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange.mock.calls[0][0]).toMatchObject({ 20: { id: 20, fruit: 'pineapple' }});

			wrapper.off('change', onChange);
		});
	});
});

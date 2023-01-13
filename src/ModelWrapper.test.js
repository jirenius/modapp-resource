import Model from './Model';
import ModelWrapper from './ModelWrapper';
import eventBus from 'modapp-eventbus';

describe("ModelWrapper", () => {
	let items;
	let models;
	let model;
	let nestedModel;
	let wrapper;
	let recordedEvents;
	let recorderAttached;
	let eventRecorder = (event) => jest.fn(e => recordedEvents.push(Object.assign(e, { event })));

	jest.useFakeTimers();

	function attachRecorder() {
		if (!recorderAttached && wrapper) {
			recorderAttached = { change: eventRecorder('change') };
			wrapper.on('change', recorderAttached.change);
		}
	}

	function detachRecorder() {
		if (recorderAttached) {
			wrapper.off('change', recorderAttached.change);
			recorderAttached = null;
		}
	}

	beforeEach(() => {
		// Clear eventbus listeners
		eventBus._evs = {};

		items = {
			10: { id: 10, fruit: 'banana', hidden: true },
			20: { id: 20, fruit: 'pineapple' },
			30:	{ id: 30, fruit: 'orange', hidden: true },
			40:	{ id: 40, fruit: 'apple' },
			50:	{ id: 50, fruit: 'kiwi' }
		};
		models = {
			10: new Model({ data: items[10] }),
			20: new Model({ data: items[20] }),
			30: new Model({ data: items[30] }),
			40: new Model({ data: items[40] }),
			50: new Model({ data: items[50] }),
		};
		model = new Model({ data: {
			40: items[40],
			30: items[30],
			20: items[20],
			10: items[10],
		}});
		nestedModel = new Model({ data: {
			10: models[10],
			20: models[20],
			30: models[30],
			40: models[40],
		}});

		recordedEvents = [];
	});

	afterEach(() => {
		detachRecorder();
		if (wrapper) {
			wrapper.dispose();
			wrapper = null;
		}
		// Validate we dont have any undisposed listeners
		expect(eventBus._evs).toEqual({});
	});

	describe("props", () => {
		it("returns items as model properties", () => {
			wrapper = new ModelWrapper(model);
			expect(wrapper.props).toMatchObject({
				10: { id: 10, fruit: 'banana' },
				20: { id: 20, fruit: 'pineapple' },
				30:	{ id: 30, fruit: 'orange' },
				40:	{ id: 40, fruit: 'apple' }
			});
		});

		it("returns filtered items as model properties", () => {
			wrapper = new ModelWrapper(model, { filter: (k, v) => !v.hidden });
			expect(wrapper.props).toMatchObject({
				20: { id: 20, fruit: 'pineapple' },
				40:	{ id: 40, fruit: 'apple' }
			});
		});

		it("returns mapped items as model properties", () => {
			wrapper = new ModelWrapper(model, { map: (k, v) => v.fruit });
			expect(wrapper.props).toMatchObject({
				10: 'banana',
				20: 'pineapple',
				30:	'orange',
				40:	'apple'
			});
		});

		it("returns mapped and filtered items as model properties", () => {
			wrapper = new ModelWrapper(model, { filter: (k, v) => !v.hidden, map: (k, v) => v.fruit });
			expect(wrapper.props).toMatchObject({
				20: 'pineapple',
				40:	'apple'
			});
		});
	});

	describe("toJSON", () => {
		it("returns json object", () => {
			wrapper = new ModelWrapper(model);
			expect(wrapper.toJSON()).toEqual({
				10: { id: 10, fruit: 'banana', hidden: true },
				20: { id: 20, fruit: 'pineapple' },
				30:	{ id: 30, fruit: 'orange', hidden: true },
				40:	{ id: 40, fruit: 'apple' }
			});
		});

		it("returns filtered json object", () => {
			wrapper = new ModelWrapper(model, { filter: (k, v) => !v.hidden });
			expect(wrapper.toJSON()).toEqual({
				20: { id: 20, fruit: 'pineapple' },
				40:	{ id: 40, fruit: 'apple' }
			});
		});

		it("returns mapped json object", () => {
			wrapper = new ModelWrapper(model, { map: (k, v) => v.fruit });
			expect(wrapper.toJSON()).toEqual({
				10: 'banana',
				20: 'pineapple',
				30:	'orange',
				40:	'apple'
			});
		});

		it("returns filtered and mapped json object", () => {
			wrapper = new ModelWrapper(model, { filter: (k, v) => !v.hidden, map: (k, v) => v.fruit });
			expect(wrapper.toJSON()).toEqual({
				20: 'pineapple',
				40:	'apple'
			});
		});
	});

	describe("setModel", () => {
		it("emits change event and returns items as model properties when model is set", () => {
			wrapper = new ModelWrapper(null);
			attachRecorder();

			wrapper.setModel(model);
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({
				10: { id: 10, fruit: 'banana' },
				20: { id: 20, fruit: 'pineapple' },
				30:	{ id: 30, fruit: 'orange' },
				40:	{ id: 40, fruit: 'apple' }
			});

			expect(recordedEvents.length).toBe(1);
			expect(recordedEvents[0]).toEqual({
				event: 'change'
			});
			expect(recordedEvents[0].hasOwnProperty('10')).toBe(true);
			expect(recordedEvents[0].hasOwnProperty('20')).toBe(true);
			expect(recordedEvents[0].hasOwnProperty('30')).toBe(true);
			expect(recordedEvents[0].hasOwnProperty('40')).toBe(true);
		});

		it("emits change event and returns items as model properties when model is set with filter", () => {
			wrapper = new ModelWrapper(null, { filter: (k, v) => !v.hidden });
			attachRecorder();

			wrapper.setModel(model);
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({
				20: { id: 20, fruit: 'pineapple' },
				40:	{ id: 40, fruit: 'apple' }
			});

			expect(recordedEvents.length).toBe(1);
			expect(recordedEvents[0]).toEqual({
				event: 'change'
			});
			expect(recordedEvents[0].hasOwnProperty('10')).toBe(false);
			expect(recordedEvents[0].hasOwnProperty('20')).toBe(true);
			expect(recordedEvents[0].hasOwnProperty('30')).toBe(false);
			expect(recordedEvents[0].hasOwnProperty('40')).toBe(true);
		});

		it("emits change event and returns items as model properties when model is set with map", () => {
			wrapper = new ModelWrapper(null, { map: (k, v) => v.fruit });
			attachRecorder();

			wrapper.setModel(model);
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({
				10: 'banana',
				20: 'pineapple',
				30:	'orange',
				40:	'apple'
			});

			expect(recordedEvents.length).toBe(1);
			expect(recordedEvents[0]).toEqual({
				event: 'change'
			});
			expect(recordedEvents[0].hasOwnProperty('10')).toBe(true);
			expect(recordedEvents[0].hasOwnProperty('20')).toBe(true);
			expect(recordedEvents[0].hasOwnProperty('30')).toBe(true);
			expect(recordedEvents[0].hasOwnProperty('40')).toBe(true);
		});

		it("emits change event and returns items as model properties when model is unset", () => {
			wrapper = new ModelWrapper(model);
			attachRecorder();

			wrapper.setModel(null);
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({});

			expect(recordedEvents.length).toBe(1);
			expect(recordedEvents[0]).toEqual({
				event: 'change',
				10: { id: 10, fruit: 'banana', hidden: true },
				20: { id: 20, fruit: 'pineapple' },
				30:	{ id: 30, fruit: 'orange', hidden: true },
				40:	{ id: 40, fruit: 'apple' }
			});
		});

		it("emits change event and returns items as model properties when model is unset with filter", () => {
			wrapper = new ModelWrapper(model, { filter: (k, v) => !v.hidden });
			attachRecorder();

			wrapper.setModel(null);
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({});

			expect(recordedEvents.length).toBe(1);
			expect(recordedEvents[0]).toEqual({
				event: 'change',
				20: { id: 20, fruit: 'pineapple' },
				40:	{ id: 40, fruit: 'apple' }
			});
		});

		it("emits change event and returns items as model properties when model is unset with map", () => {
			wrapper = new ModelWrapper(model, { map: (k, v) => v.fruit });
			attachRecorder();

			wrapper.setModel(null);
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({});

			expect(recordedEvents.length).toBe(1);
			expect(recordedEvents[0]).toEqual({
				event: 'change',
				10: 'banana',
				20: 'pineapple',
				30:	'orange',
				40:	'apple'
			});
		});

		it("emits no event and when model is set with same keys and values", () => {
			wrapper = new ModelWrapper(model);
			attachRecorder();

			wrapper.setModel(model.props);
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({
				10: { id: 10, fruit: 'banana' },
				20: { id: 20, fruit: 'pineapple' },
				30:	{ id: 30, fruit: 'orange' },
				40:	{ id: 40, fruit: 'apple' }
			});

			expect(recordedEvents.length).toBe(0);
		});

		it("emits no event and when unset model is changed", () => {
			wrapper = new ModelWrapper(model);
			attachRecorder();

			wrapper.setModel(model.props);

			model.set({
				10: undefined,
				30: { id: 30, fruit: 'pear' },
				50: { id: 50, fruit: 'kiwi' }
			});
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({
				10: { id: 10, fruit: 'banana' },
				20: { id: 20, fruit: 'pineapple' },
				30:	{ id: 30, fruit: 'orange' },
				40:	{ id: 40, fruit: 'apple' }
			});

			expect(recordedEvents.length).toBe(0);
		});
	});

	describe("set", () => {
		it("emits change event and returns items as model properties when underlying model is set", () => {
			wrapper = new ModelWrapper(model);
			attachRecorder();

			wrapper.set({
				10: undefined,
				30: { id: 30, fruit: 'pear' },
				50: { id: 50, fruit: 'kiwi' }
			});
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({
				20: { id: 20, fruit: 'pineapple' },
				30:	{ id: 30, fruit: 'pear' },
				40:	{ id: 40, fruit: 'apple' },
				50:	{ id: 50, fruit: 'kiwi' }
			});

			expect(recordedEvents.length).toBe(1);
			expect(recordedEvents[0]).toEqual({
				event: 'change',
				10: items[10],
				30: items[30]
			});
			expect(recordedEvents[0].hasOwnProperty('50')).toBe(true);
		});

		it("emits change event and returns items as model properties when underlying model is set when filtered", () => {
			wrapper = new ModelWrapper(model, { filter: (k, v) => !v.hidden });
			attachRecorder();

			wrapper.set({
				10: undefined,
				30: { id: 30, fruit: 'pear' },
				50: { id: 50, fruit: 'kiwi' }
			});
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({
				20: { id: 20, fruit: 'pineapple' },
				30:	{ id: 30, fruit: 'pear' },
				40:	{ id: 40, fruit: 'apple' },
				50:	{ id: 50, fruit: 'kiwi' }
			});

			expect(recordedEvents.length).toBe(1);
			expect(recordedEvents[0]).toEqual({
				event: 'change'
			});
			expect(recordedEvents[0].hasOwnProperty('10')).toBe(false);
			expect(recordedEvents[0].hasOwnProperty('30')).toBe(true);
			expect(recordedEvents[0].hasOwnProperty('50')).toBe(true);
		});

		it("emits change event and returns items as model properties when underlying model is set when mapped", () => {
			wrapper = new ModelWrapper(model, { map: (k, v) => v.fruit });
			attachRecorder();

			wrapper.set({
				10: undefined,
				30: { id: 30, fruit: 'pear' },
				50: { id: 50, fruit: 'kiwi' }
			});
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({
				20: 'pineapple',
				30:	'pear',
				40:	'apple',
				50:	'kiwi'
			});

			expect(recordedEvents.length).toBe(1);
			expect(recordedEvents[0]).toEqual({
				event: 'change',
				10: items[10].fruit,
				30: items[30].fruit
			});
			expect(recordedEvents[0].hasOwnProperty('50')).toBe(true);
		});
	});

	describe("set nested model", () => {
		it("emits no change event", () => {
			wrapper = new ModelWrapper(nestedModel);
			attachRecorder();

			models[10].set({ fruit: 'pear' });
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({
				10: { id: 10, fruit: 'pear' },
				20: { id: 20, fruit: 'pineapple' },
				30:	{ id: 30, fruit: 'orange' },
				40:	{ id: 40, fruit: 'apple' }
			});

			expect(recordedEvents.length).toBe(0);
		});

		it("emits change event on filter change adds item", () => {
			wrapper = new ModelWrapper(nestedModel, { filter: (k, v) => !v.hidden });
			attachRecorder();

			models[10].set({ hidden: false });
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({
				10: { id: 10, fruit: 'banana' },
				20: { id: 20, fruit: 'pineapple' },
				40:	{ id: 40, fruit: 'apple' }
			});

			expect(recordedEvents.length).toBe(1);
			expect(recordedEvents[0]).toEqual({
				event: 'change'
			});
			expect(recordedEvents[0].hasOwnProperty('10')).toBe(true);
		});

		it("emits change event on filter change removes item", () => {
			wrapper = new ModelWrapper(nestedModel, { filter: (k, v) => !v.hidden });
			attachRecorder();

			models[20].set({ hidden: true });
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({
				40:	{ id: 40, fruit: 'apple' }
			});

			expect(recordedEvents.length).toBe(1);
			expect(recordedEvents[0]).toMatchObject({
				event: 'change',
				20: { id: 20, fruit: 'pineapple', hidden: true },
			});
		});

		it("emits change event on model change when mapped", () => {
			wrapper = new ModelWrapper(nestedModel, { map: (k, v) => v.fruit });
			attachRecorder();

			models[10].set({ fruit: 'pear' });
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({
				10: 'pear',
				20: 'pineapple',
				30: 'orange',
				40:	'apple'
			});

			expect(recordedEvents.length).toBe(1);
			expect(recordedEvents[0]).toMatchObject({
				event: 'change',
				10: 'banana',
			});
		});
	});

	describe("set model with nested models", () => {

		it("emits no change event when using filter and removing hidden model", () => {
			wrapper = new ModelWrapper(nestedModel, { filter: (k, v) => !v.hidden });
			attachRecorder();

			wrapper.set({ 10: undefined });
			jest.runAllTimers();

			expect(wrapper.props).toMatchObject({
				20:	{ id: 20, fruit: 'pineapple' },
				40:	{ id: 40, fruit: 'apple' }
			});

			expect(recordedEvents.length).toBe(0);
		});

		// it("emits no change event when using map and replacing model with non-model", () => {
		// 	wrapper = new ModelWrapper(nestedModel, { map: (k, v) => v.fruit });
		// 	attachRecorder();

		// 	wrapper.set({ 10: { fruit: 'banana' }});
		// 	jest.runAllTimers();

		// 	expect(wrapper.props).toMatchObject({
		// 		10: 'banana',
		// 		20: 'pineapple',
		// 		30: 'orange',
		// 		40:	'apple'
		// 	});

		// 	expect(recordedEvents.length).toBe(0);
		// });
	});
});

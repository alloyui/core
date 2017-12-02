import Component from 'metal-component';
import MyComponent from './fixtures/MyComponent';
import MyJSXComponent from './fixtures/MyJSXComponent';
import ParentComponent from './fixtures/ParentComponent';
import {assert} from 'chai';
import jsdomGlobal from 'jsdom-global';

describe('Isomorphic Rendering', () => {
	it('should render soy component to string', () => {
		assert.ok(!global.document);

		const htmlString = Component.renderToString(MyComponent, {
			message: 'Hello, Soy!',
		});

		assert.equal(htmlString, '<div>Hello, Soy!</div>');
	});

	it('should render jsx component to string', () => {
		assert.ok(!global.document);

		const htmlString = Component.renderToString(MyJSXComponent, {
			message: 'Hello, JSX!',
		});

		assert.equal(htmlString, '<div>Hello, JSX!</div>');
	});

	it('should render soy component with subcomponents to string', () => {
		assert.ok(!global.document);
		const htmlString = Component.renderToString(ParentComponent, {
			cmd: 'login',
			error: {
				"status": 400,
				"message": "Bad Request",
				"errors": [
					{
						"reason": "invalidParameter",
						"context": {
							"param": "email",
							"value": ""
						}
					},
					{
						"reason": "requiredParameter",
						"context": {
							"param": "email",
							"value": ""
						}
					},
					{
						"reason": "requiredParameter",
						"context": {
							"param": "password",
							"value": ""
						}
					}
				]
			}
		});
		assert.equal(htmlString, '<div><span>The provided email is not valid.</span><span>The email is required.</span></div>');
	});

	describe('JSDom', () => {
		let cleanup;

		before(() => {
			cleanup = jsdomGlobal();
		});

		after(() => {
			cleanup();
		});

		it('should render soy component to string', () => {
			assert.ok(document);

			const htmlString = Component.renderToString(MyComponent, {
				message: 'Hello, Soy!'
			});

			assert.equal(htmlString, '<div>Hello, Soy!</div>');
		});

		it('should render soy component to DOM', () => {
			assert.ok(document);

			const comp = new MyComponent({
				message: 'Hello, Soy!'
			});

			assert.equal(comp.element.innerHTML, '<div>Hello, Soy!</div>');
		});

		it('should render jsx component to string', () => {
			assert.ok(document);

			const htmlString = Component.renderToString(MyJSXComponent, {
				message: 'Hello, JSX!'
			});

			assert.equal(htmlString, '<div>Hello, JSX!</div>');
		});

		it('should render JSX component to DOM', () => {
			assert.ok(document);

			const comp = new MyJSXComponent({
				message: 'Hello, Soy!'
			});

			assert.equal(comp.element.innerHTML, '<div>Hello, Soy!</div>');
		});
	});
});

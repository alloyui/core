'use strict';

var lfr = require('./fixture/sandbox.js');

module.exports = {
  setUp: function(done) {
    this.emitter = new lfr.EventEmitter();

    done();
  },

  tearDown: function(done) {
    this.emitter.removeAllListeners();
    done();
  },

  testOnce: function(test) {
    var listener = createStub();

    this.emitter.once('event', listener);
    test.strictEqual(0, listener.called);

    this.emitter.emit('event');
    test.strictEqual(1, listener.called);

    this.emitter.emit('event');
    test.strictEqual(1, listener.called);

    test.done();
  },

  testMany: function(test) {
    var listener = createStub();

    this.emitter.many('event', 2, listener);
    test.strictEqual(0, listener.called);

    this.emitter.emit('event');
    test.strictEqual(1, listener.called);

    this.emitter.emit('event');
    test.strictEqual(2, listener.called);

    this.emitter.emit('event');
    test.strictEqual(2, listener.called);

    test.done();
  },

  testOnAny: function(test) {
    var listener = createStub();

    this.emitter.onAny(listener);
    test.strictEqual(0, listener.called);

    this.emitter.emit('event1');
    test.strictEqual(1, listener.called);

    this.emitter.emit('event2');
    test.strictEqual(2, listener.called);

    test.done();
  },

  testOff: function(test) {
    var listener = createStub();

    this.emitter.on('event', listener);
    test.strictEqual(0, listener.called);

    this.emitter.emit('event');
    test.strictEqual(1, listener.called);

    this.emitter.emit('event');
    test.strictEqual(2, listener.called);

    this.emitter.off('event', listener);
    this.emitter.emit('event');
    test.strictEqual(2, listener.called);

    test.done();
  },

  testOffOnce: function(test) {
    var listener = createStub();

    this.emitter.once('event', listener);
    this.emitter.off('event', listener);
    this.emitter.emit('event');

    test.strictEqual(0, listener.called);

    test.done();
  },

  testOffMany: function(test) {
    var listener = createStub();

    this.emitter.many('event', 2, listener);
    this.emitter.off('event', listener);
    this.emitter.emit('event');

    test.strictEqual(0, listener.called);

    test.done();
  },

  testOffAny: function(test) {
    var listener = createStub();

    this.emitter.onAny(listener);
    test.strictEqual(0, listener.called);

    this.emitter.emit('event1');
    test.strictEqual(1, listener.called);

    this.emitter.emit('event2');
    test.strictEqual(2, listener.called);

    this.emitter.offAny(listener);
    this.emitter.emit('event1');
    this.emitter.emit('event2');
    test.strictEqual(2, listener.called);

    test.done();
  },

  testRemoveAllListeners: function(test) {
    var listener1 = createStub();
    var listener2 = createStub();
    var listenerAll = createStub();

    this.emitter.on('event1', listener1);
    this.emitter.on('event2', listener2);
    this.emitter.onAny(listenerAll);

    this.emitter.removeAllListeners();
    this.emitter.emit('event1');
    this.emitter.emit('event2');

    test.strictEqual(0, listener1.called);
    test.strictEqual(0, listener2.called);
    test.strictEqual(0, listenerAll.called);

    test.done();
  },

  testRemoveAllListenersOfType: function(test) {
    var listener1 = createStub();
    var listener2 = createStub();
    var listenerAll = createStub();

    this.emitter.on('event1', listener1);
    this.emitter.on('event2', listener2);
    this.emitter.onAny(listenerAll);

    this.emitter.removeAllListeners('event1');
    this.emitter.emit('event1');
    test.strictEqual(0, listener1.called);
    test.strictEqual(1, listenerAll.called);

    this.emitter.emit('event2');
    test.strictEqual(1, listener2.called);
    test.strictEqual(2, listenerAll.called);

    test.done();
  },

  testListenersAny: function(test) {
    var listener1 = createStub();
    var listener2 = createStub();
    var listenerAll1 = createStub();
    var listenerAll2 = createStub();

    this.emitter.on('event1', listener1);
    this.emitter.on('event2', listener2);
    this.emitter.onAny(listenerAll1);
    this.emitter.onAny(listenerAll2);

    var anyListeners = this.emitter.listenersAny();
    test.ok(anyListeners);
    test.strictEqual(2, anyListeners.length);
    test.strictEqual(anyListeners[0], listenerAll1);
    test.strictEqual(anyListeners[1], listenerAll2);

    test.done();
  },

  testMaxListeners: function(test) {
    var originalErrorFn = console.error;
    console.error = createStub();

    this.emitter.setMaxListeners(2);
    this.emitter.on('event', createStub());
    this.emitter.on('event', createStub());
    this.emitter.on('event1', createStub());
    test.strictEqual(0, console.error.called, 'Should not warn before max');

    this.emitter.on('event', createStub());
    test.strictEqual(1, console.error.called, 'Max listeners reached for event');

    this.emitter.on('event', createStub());
    test.strictEqual(1, console.error.called, 'Should not warn twice for same type');

    this.emitter.on('event1', createStub());
    this.emitter.on('event1', createStub());
    test.strictEqual(2, console.error.called, 'Max listeners reached for event1');

    console.error = originalErrorFn;

    test.done();
  }
};

function createStub() {
  var stub = function() {
    stub.called++;
  };
  stub.called = 0;

  return stub;
}

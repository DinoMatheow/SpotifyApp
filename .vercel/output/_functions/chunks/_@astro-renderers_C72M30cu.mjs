import 'zone.js/node';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import React__default, { createElement } from 'react';
import ReactDOM from 'react-dom/server';

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */

/**
 * Current injector value used by `inject`.
 * - `undefined`: it is an error to call `inject`
 * - `null`: `inject` can be called but there is no injector (limp-mode).
 * - Injector instance: Use the injector for resolution.
 */
let _currentInjector = undefined;
function getCurrentInjector() {
  return _currentInjector;
}
function setCurrentInjector(injector) {
  const former = _currentInjector;
  _currentInjector = injector;
  return former;
}

/**
 * Value returned if the key-value pair couldn't be found in the context
 * hierarchy.
 */
const NOT_FOUND$1 = /*#__PURE__*/Symbol('NotFound');
/**
 * Type guard for checking if an unknown value is a NotFound.
 */
function isNotFound(e) {
  return e === NOT_FOUND$1 || e?.name === 'ɵNotFound';
}

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */
function defaultEquals(a, b) {
  return Object.is(a, b);
}
let activeConsumer = null;
let inNotificationPhase = false;
let epoch = 1;
const SIGNAL = /* @__PURE__ */ Symbol("SIGNAL");
function setActiveConsumer(consumer) {
  const prev = activeConsumer;
  activeConsumer = consumer;
  return prev;
}
function getActiveConsumer() {
  return activeConsumer;
}
const REACTIVE_NODE = {
  version: 0,
  lastCleanEpoch: 0,
  dirty: false,
  producers: void 0,
  producersTail: void 0,
  consumers: void 0,
  consumersTail: void 0,
  recomputing: false,
  consumerAllowSignalWrites: false,
  consumerIsAlwaysLive: false,
  kind: "unknown",
  producerMustRecompute: () => false,
  producerRecomputeValue: () => {
  },
  consumerMarkedDirty: () => {
  },
  consumerOnSignalRead: () => {
  }
};
function producerAccessed(node) {
  if (inNotificationPhase) {
    throw new Error("");
  }
  if (activeConsumer === null) {
    return;
  }
  activeConsumer.consumerOnSignalRead(node);
  const prevProducerLink = activeConsumer.producersTail;
  if (prevProducerLink !== void 0 && prevProducerLink.producer === node) {
    return;
  }
  let nextProducerLink = void 0;
  const isRecomputing = activeConsumer.recomputing;
  if (isRecomputing) {
    nextProducerLink = prevProducerLink !== void 0 ? prevProducerLink.nextProducer : activeConsumer.producers;
    if (nextProducerLink !== void 0 && nextProducerLink.producer === node) {
      activeConsumer.producersTail = nextProducerLink;
      nextProducerLink.lastReadVersion = node.version;
      return;
    }
  }
  const prevConsumerLink = node.consumersTail;
  if (prevConsumerLink !== void 0 && prevConsumerLink.consumer === activeConsumer && // However, we have to make sure that the link we've discovered isn't from a node that is incrementally rebuilding its producer list
  (!isRecomputing || isValidLink(prevConsumerLink, activeConsumer))) {
    return;
  }
  const isLive = consumerIsLive(activeConsumer);
  const newLink = {
    producer: node,
    consumer: activeConsumer,
    // instead of eagerly destroying the previous link, we delay until we've finished recomputing
    // the producers list, so that we can destroy all of the old links at once.
    nextProducer: nextProducerLink,
    prevConsumer: prevConsumerLink,
    lastReadVersion: node.version,
    nextConsumer: void 0
  };
  activeConsumer.producersTail = newLink;
  if (prevProducerLink !== void 0) {
    prevProducerLink.nextProducer = newLink;
  } else {
    activeConsumer.producers = newLink;
  }
  if (isLive) {
    producerAddLiveConsumer(node, newLink);
  }
}
function producerIncrementEpoch() {
  epoch++;
}
function producerUpdateValueVersion(node) {
  if (consumerIsLive(node) && !node.dirty) {
    return;
  }
  if (!node.dirty && node.lastCleanEpoch === epoch) {
    return;
  }
  if (!node.producerMustRecompute(node) && !consumerPollProducersForChange(node)) {
    producerMarkClean(node);
    return;
  }
  node.producerRecomputeValue(node);
  producerMarkClean(node);
}
function producerNotifyConsumers(node) {
  if (node.consumers === void 0) {
    return;
  }
  const prev = inNotificationPhase;
  inNotificationPhase = true;
  try {
    for (let link = node.consumers; link !== void 0; link = link.nextConsumer) {
      const consumer = link.consumer;
      if (!consumer.dirty) {
        consumerMarkDirty(consumer);
      }
    }
  } finally {
    inNotificationPhase = prev;
  }
}
function producerUpdatesAllowed() {
  return activeConsumer?.consumerAllowSignalWrites !== false;
}
function consumerMarkDirty(node) {
  node.dirty = true;
  producerNotifyConsumers(node);
  node.consumerMarkedDirty?.(node);
}
function producerMarkClean(node) {
  node.dirty = false;
  node.lastCleanEpoch = epoch;
}
function consumerBeforeComputation(node) {
  if (node) {
    node.producersTail = void 0;
    node.recomputing = true;
  }
  return setActiveConsumer(node);
}
function consumerAfterComputation(node, prevConsumer) {
  setActiveConsumer(prevConsumer);
  if (!node) {
    return;
  }
  node.recomputing = false;
  const producersTail = node.producersTail;
  let toRemove = producersTail !== void 0 ? producersTail.nextProducer : node.producers;
  if (toRemove !== void 0) {
    if (consumerIsLive(node)) {
      do {
        toRemove = producerRemoveLiveConsumerLink(toRemove);
      } while (toRemove !== void 0);
    }
    if (producersTail !== void 0) {
      producersTail.nextProducer = void 0;
    } else {
      node.producers = void 0;
    }
  }
}
function consumerPollProducersForChange(node) {
  for (let link = node.producers; link !== void 0; link = link.nextProducer) {
    const producer = link.producer;
    const seenVersion = link.lastReadVersion;
    if (seenVersion !== producer.version) {
      return true;
    }
    producerUpdateValueVersion(producer);
    if (seenVersion !== producer.version) {
      return true;
    }
  }
  return false;
}
function consumerDestroy(node) {
  if (consumerIsLive(node)) {
    let link = node.producers;
    while (link !== void 0) {
      link = producerRemoveLiveConsumerLink(link);
    }
  }
  node.producers = void 0;
  node.producersTail = void 0;
  node.consumers = void 0;
  node.consumersTail = void 0;
}
function producerAddLiveConsumer(node, link) {
  const consumersTail = node.consumersTail;
  const wasLive = consumerIsLive(node);
  if (consumersTail !== void 0) {
    link.nextConsumer = consumersTail.nextConsumer;
    consumersTail.nextConsumer = link;
  } else {
    link.nextConsumer = void 0;
    node.consumers = link;
  }
  link.prevConsumer = consumersTail;
  node.consumersTail = link;
  if (!wasLive) {
    for (let link2 = node.producers; link2 !== void 0; link2 = link2.nextProducer) {
      producerAddLiveConsumer(link2.producer, link2);
    }
  }
}
function producerRemoveLiveConsumerLink(link) {
  const producer = link.producer;
  const nextProducer = link.nextProducer;
  const nextConsumer = link.nextConsumer;
  const prevConsumer = link.prevConsumer;
  link.nextConsumer = void 0;
  link.prevConsumer = void 0;
  if (nextConsumer !== void 0) {
    nextConsumer.prevConsumer = prevConsumer;
  } else {
    producer.consumersTail = prevConsumer;
  }
  if (prevConsumer !== void 0) {
    prevConsumer.nextConsumer = nextConsumer;
  } else {
    producer.consumers = nextConsumer;
    if (!consumerIsLive(producer)) {
      let producerLink = producer.producers;
      while (producerLink !== void 0) {
        producerLink = producerRemoveLiveConsumerLink(producerLink);
      }
    }
  }
  return nextProducer;
}
function consumerIsLive(node) {
  return node.consumerIsAlwaysLive || node.consumers !== void 0;
}
function isValidLink(checkLink, consumer) {
  const producersTail = consumer.producersTail;
  if (producersTail !== void 0) {
    let link = consumer.producers;
    do {
      if (link === checkLink) {
        return true;
      }
      if (link === producersTail) {
        break;
      }
      link = link.nextProducer;
    } while (link !== void 0);
  }
  return false;
}
function createComputed(computation, equal) {
  const node = Object.create(COMPUTED_NODE);
  node.computation = computation;
  if (equal !== void 0) {
    node.equal = equal;
  }
  const computed = () => {
    producerUpdateValueVersion(node);
    producerAccessed(node);
    if (node.value === ERRORED) {
      throw node.error;
    }
    return node.value;
  };
  computed[SIGNAL] = node;
  return computed;
}
const UNSET = /* @__PURE__ */ Symbol("UNSET");
const COMPUTING = /* @__PURE__ */ Symbol("COMPUTING");
const ERRORED = /* @__PURE__ */ Symbol("ERRORED");
const COMPUTED_NODE = /* @__PURE__ */ (() => {
  return {
    ...REACTIVE_NODE,
    value: UNSET,
    dirty: true,
    error: null,
    equal: defaultEquals,
    kind: "computed",
    producerMustRecompute(node) {
      return node.value === UNSET || node.value === COMPUTING;
    },
    producerRecomputeValue(node) {
      if (node.value === COMPUTING) {
        throw new Error("");
      }
      const oldValue = node.value;
      node.value = COMPUTING;
      const prevConsumer = consumerBeforeComputation(node);
      let newValue;
      let wasEqual = false;
      try {
        newValue = node.computation();
        setActiveConsumer(null);
        wasEqual = oldValue !== UNSET && oldValue !== ERRORED && newValue !== ERRORED && node.equal(oldValue, newValue);
      } catch (err) {
        newValue = ERRORED;
        node.error = err;
      } finally {
        consumerAfterComputation(node, prevConsumer);
      }
      if (wasEqual) {
        node.value = oldValue;
        return;
      }
      node.value = newValue;
      node.version++;
    }
  };
})();
function defaultThrowError() {
  throw new Error();
}
let throwInvalidWriteToSignalErrorFn = defaultThrowError;
function throwInvalidWriteToSignalError(node) {
  throwInvalidWriteToSignalErrorFn(node);
}
function setThrowInvalidWriteToSignalError(fn) {
  throwInvalidWriteToSignalErrorFn = fn;
}
function createSignal(initialValue, equal) {
  const node = Object.create(SIGNAL_NODE);
  node.value = initialValue;
  if (equal !== void 0) {
    node.equal = equal;
  }
  const getter = () => signalGetFn(node);
  getter[SIGNAL] = node;
  const set = (newValue) => signalSetFn(node, newValue);
  const update = (updateFn) => signalUpdateFn(node, updateFn);
  return [getter, set, update];
}
function signalGetFn(node) {
  producerAccessed(node);
  return node.value;
}
function signalSetFn(node, newValue) {
  if (!producerUpdatesAllowed()) {
    throwInvalidWriteToSignalError(node);
  }
  if (!node.equal(node.value, newValue)) {
    node.value = newValue;
    signalValueChanged(node);
  }
}
function signalUpdateFn(node, updater) {
  if (!producerUpdatesAllowed()) {
    throwInvalidWriteToSignalError(node);
  }
  signalSetFn(node, updater(node.value));
}
const SIGNAL_NODE = /* @__PURE__ */ (() => {
  return {
    ...REACTIVE_NODE,
    equal: defaultEquals,
    value: void 0,
    kind: "signal"
  };
})();
function signalValueChanged(node) {
  node.version++;
  producerIncrementEpoch();
  producerNotifyConsumers(node);
}

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */
const XSS_SECURITY_URL = "https://angular.dev/best-practices/security#preventing-cross-site-scripting-xss";
class RuntimeError extends Error {
  code;
  constructor(code, message) {
    super(formatRuntimeError(code, message));
    this.code = code;
  }
}
function formatRuntimeErrorCode(code) {
  return `NG0${Math.abs(code)}`;
}
function formatRuntimeError(code, message) {
  const fullCode = formatRuntimeErrorCode(code);
  let errorMessage = `${fullCode}${message ? ": " + message : ""}`;
  return errorMessage;
}
function getClosureSafeProperty(objWithPropertyToExtract) {
  for (let key in objWithPropertyToExtract) {
    if (objWithPropertyToExtract[key] === getClosureSafeProperty) {
      return key;
    }
  }
  throw Error("");
}
function stringify(token) {
  if (typeof token === "string") {
    return token;
  }
  if (Array.isArray(token)) {
    return `[${token.map(stringify).join(", ")}]`;
  }
  if (token == null) {
    return "" + token;
  }
  const name = token.overriddenName || token.name;
  if (name) {
    return `${name}`;
  }
  const result = token.toString();
  if (result == null) {
    return "" + result;
  }
  const newLineIndex = result.indexOf("\n");
  return newLineIndex >= 0 ? result.slice(0, newLineIndex) : result;
}
function concatStringsWithSpace(before, after) {
  if (!before) return after || "";
  if (!after) return before;
  return `${before} ${after}`;
}
const __forward_ref__ = /* @__PURE__ */ getClosureSafeProperty({
  __forward_ref__: getClosureSafeProperty
});
function forwardRef(forwardRefFn) {
  forwardRefFn.__forward_ref__ = forwardRef;
  forwardRefFn.toString = function() {
    return stringify(this());
  };
  return forwardRefFn;
}
function resolveForwardRef(type) {
  return isForwardRef(type) ? type() : type;
}
function isForwardRef(fn) {
  return typeof fn === "function" && fn.hasOwnProperty(__forward_ref__) && fn.__forward_ref__ === forwardRef;
}
function throwError(msg, actual, expected, comparison) {
  throw new Error(`ASSERTION ERROR: ${msg}` + ("" ));
}
function ɵɵdefineInjectable(opts) {
  return {
    token: opts.token,
    providedIn: opts.providedIn || null,
    factory: opts.factory,
    value: void 0
  };
}
function getInjectableDef(type) {
  return getOwnDefinition(type, NG_PROV_DEF);
}
function getOwnDefinition(type, field) {
  return type.hasOwnProperty(field) && type[field] || null;
}
function getInheritedInjectableDef(type) {
  const def = type?.[NG_PROV_DEF] ?? null;
  if (def) {
    return def;
  } else {
    return null;
  }
}
function getInjectorDef(type) {
  return type && type.hasOwnProperty(NG_INJ_DEF) ? type[NG_INJ_DEF] : null;
}
const NG_PROV_DEF = /* @__PURE__ */ getClosureSafeProperty({
  ɵprov: getClosureSafeProperty
});
const NG_INJ_DEF = /* @__PURE__ */ getClosureSafeProperty({
  ɵinj: getClosureSafeProperty
});
class InjectionToken {
  _desc;
  /** @internal */
  ngMetadataName = "InjectionToken";
  ɵprov;
  /**
   * @param _desc   Description for the token,
   *                used only for debugging purposes,
   *                it should but does not need to be unique
   * @param options Options for the token's usage, as described above
   */
  constructor(_desc, options) {
    this._desc = _desc;
    this.ɵprov = void 0;
    if (typeof options == "number") {
      this.__NG_ELEMENT_ID__ = options;
    } else if (options !== void 0) {
      this.ɵprov = ɵɵdefineInjectable({
        token: this,
        providedIn: options.providedIn || "root",
        factory: options.factory
      });
    }
  }
  /**
   * @internal
   */
  get multi() {
    return this;
  }
  toString() {
    return `InjectionToken ${this._desc}`;
  }
}
let _injectorProfilerContext;
function getInjectorProfilerContext() {
  throwError("getInjectorProfilerContext should never be called in production mode");
  return _injectorProfilerContext;
}
function setInjectorProfilerContext(context) {
  throwError("setInjectorProfilerContext should never be called in production mode");
  const previous = _injectorProfilerContext;
  _injectorProfilerContext = context;
  return previous;
}
const injectorProfilerCallbacks = [];
function injectorProfiler(event) {
  throwError("Injector profiler should never be called in production mode");
  for (let i = 0; i < injectorProfilerCallbacks.length; i++) {
    const injectorProfilerCallback = injectorProfilerCallbacks[i];
    injectorProfilerCallback(event);
  }
}
function emitProviderConfiguredEvent(eventProvider, isViewProvider = false) {
  throwError("Injector profiler should never be called in production mode");
  let token;
  if (typeof eventProvider === "function") {
    token = eventProvider;
  } else if (eventProvider instanceof InjectionToken) {
    token = eventProvider;
  } else {
    token = resolveForwardRef(eventProvider.provide);
  }
  let provider = eventProvider;
  if (eventProvider instanceof InjectionToken) {
    provider = eventProvider.ɵprov || eventProvider;
  }
  injectorProfiler({
    type: 2,
    context: getInjectorProfilerContext(),
    providerRecord: {
      token,
      provider,
      isViewProvider
    }
  });
}
function emitInjectorToCreateInstanceEvent(token) {
  throwError("Injector profiler should never be called in production mode");
  injectorProfiler({
    type: 4,
    context: getInjectorProfilerContext(),
    token
  });
}
function emitInstanceCreatedByInjectorEvent(instance) {
  throwError("Injector profiler should never be called in production mode");
  injectorProfiler({
    type: 1,
    context: getInjectorProfilerContext(),
    instance: {
      value: instance
    }
  });
}
function runInInjectorProfilerContext(injector, token, callback) {
  throwError("runInInjectorProfilerContext should never be called in production mode");
  const prevInjectContext = setInjectorProfilerContext({
    injector,
    token
  });
  try {
    callback();
  } finally {
    setInjectorProfilerContext(prevInjectContext);
  }
}
function isEnvironmentProviders(value) {
  return value && !!value.ɵproviders;
}
const NG_COMP_DEF = /* @__PURE__ */ getClosureSafeProperty({
  ɵcmp: getClosureSafeProperty
});
const NG_DIR_DEF = /* @__PURE__ */ getClosureSafeProperty({
  ɵdir: getClosureSafeProperty
});
const NG_PIPE_DEF = /* @__PURE__ */ getClosureSafeProperty({
  ɵpipe: getClosureSafeProperty
});
const NG_MOD_DEF = /* @__PURE__ */ getClosureSafeProperty({
  ɵmod: getClosureSafeProperty
});
const NG_FACTORY_DEF = /* @__PURE__ */ getClosureSafeProperty({
  ɵfac: getClosureSafeProperty
});
const NG_ELEMENT_ID = /* @__PURE__ */ getClosureSafeProperty({
  __NG_ELEMENT_ID__: getClosureSafeProperty
});
const NG_ENV_ID = /* @__PURE__ */ getClosureSafeProperty({
  __NG_ENV_ID__: getClosureSafeProperty
});
function renderStringify(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}
function stringifyForError(value) {
  if (typeof value === "function") return value.name || value.toString();
  if (typeof value === "object" && value != null && typeof value.type === "function") {
    return value.type.name || value.type.toString();
  }
  return renderStringify(value);
}
const NG_RUNTIME_ERROR_CODE = /* @__PURE__ */ getClosureSafeProperty({
  "ngErrorCode": getClosureSafeProperty
});
const NG_RUNTIME_ERROR_MESSAGE = /* @__PURE__ */ getClosureSafeProperty({
  "ngErrorMessage": getClosureSafeProperty
});
function cyclicDependencyError(token, path) {
  const message = "";
  return createRuntimeError(message, -200);
}
function throwProviderNotFoundError(token, injectorName) {
  const errorMessage = false;
  throw new RuntimeError(-201, errorMessage);
}
function createRuntimeError(message, code, path) {
  const error = new RuntimeError(code, message);
  error[NG_RUNTIME_ERROR_CODE] = code;
  error[NG_RUNTIME_ERROR_MESSAGE] = message;
  return error;
}
function getRuntimeErrorCode(error) {
  return error[NG_RUNTIME_ERROR_CODE];
}
let _injectImplementation;
function getInjectImplementation() {
  return _injectImplementation;
}
function setInjectImplementation(impl) {
  const previous = _injectImplementation;
  _injectImplementation = impl;
  return previous;
}
function injectRootLimpMode(token, notFoundValue, flags) {
  const injectableDef = getInjectableDef(token);
  if (injectableDef && injectableDef.providedIn == "root") {
    return injectableDef.value === void 0 ? injectableDef.value = injectableDef.factory() : injectableDef.value;
  }
  if (flags & 8) return null;
  if (notFoundValue !== void 0) return notFoundValue;
  throwProviderNotFoundError();
}
const _THROW_IF_NOT_FOUND = {};
const THROW_IF_NOT_FOUND = _THROW_IF_NOT_FOUND;
const DI_DECORATOR_FLAG = "__NG_DI_FLAG__";
class RetrievingInjector {
  injector;
  constructor(injector) {
    this.injector = injector;
  }
  retrieve(token, options) {
    const flags = convertToBitFlags(options) || 0;
    try {
      return this.injector.get(
        token,
        // When a dependency is requested with an optional flag, DI returns null as the default value.
        flags & 8 ? null : THROW_IF_NOT_FOUND,
        flags
      );
    } catch (e) {
      if (isNotFound(e)) {
        return e;
      }
      throw e;
    }
  }
}
function injectInjectorOnly(token, flags = 0) {
  const currentInjector = getCurrentInjector();
  if (currentInjector === void 0) {
    throw new RuntimeError(-203, false);
  } else if (currentInjector === null) {
    return injectRootLimpMode(token, void 0, flags);
  } else {
    const options = convertToInjectOptions(flags);
    const value = currentInjector.retrieve(token, options);
    if (isNotFound(value)) {
      if (options.optional) {
        return null;
      }
      throw value;
    }
    return value;
  }
}
function ɵɵinject(token, flags = 0) {
  return (getInjectImplementation() || injectInjectorOnly)(resolveForwardRef(token), flags);
}
function inject(token, options) {
  return ɵɵinject(token, convertToBitFlags(options));
}
function convertToBitFlags(flags) {
  if (typeof flags === "undefined" || typeof flags === "number") {
    return flags;
  }
  return 0 | // comment to force a line break in the formatter
  (flags.optional && 8) | (flags.host && 1) | (flags.self && 2) | (flags.skipSelf && 4);
}
function convertToInjectOptions(flags) {
  return {
    optional: !!(flags & 8),
    host: !!(flags & 1),
    self: !!(flags & 2),
    skipSelf: !!(flags & 4)
  };
}
function injectArgs(types) {
  const args = [];
  for (let i = 0; i < types.length; i++) {
    const arg = resolveForwardRef(types[i]);
    if (Array.isArray(arg)) {
      if (arg.length === 0) {
        throw new RuntimeError(900, false);
      }
      let type = void 0;
      let flags = 0;
      for (let j = 0; j < arg.length; j++) {
        const meta = arg[j];
        const flag = getInjectFlag(meta);
        if (typeof flag === "number") {
          if (flag === -1) {
            type = meta.token;
          } else {
            flags |= flag;
          }
        } else {
          type = meta;
        }
      }
      args.push(ɵɵinject(type, flags));
    } else {
      args.push(ɵɵinject(arg));
    }
  }
  return args;
}
function attachInjectFlag(decorator, flag) {
  decorator[DI_DECORATOR_FLAG] = flag;
  decorator.prototype[DI_DECORATOR_FLAG] = flag;
  return decorator;
}
function getInjectFlag(token) {
  return token[DI_DECORATOR_FLAG];
}
function getFactoryDef(type, throwNotFound) {
  const hasFactoryDef = type.hasOwnProperty(NG_FACTORY_DEF);
  return hasFactoryDef ? type[NG_FACTORY_DEF] : null;
}
function deepForEach(input, fn) {
  input.forEach((value) => Array.isArray(value) ? deepForEach(value, fn) : fn(value));
}
function addToArray(arr, index, value) {
  if (index >= arr.length) {
    arr.push(value);
  } else {
    arr.splice(index, 0, value);
  }
}
function removeFromArray(arr, index) {
  if (index >= arr.length - 1) {
    return arr.pop();
  } else {
    return arr.splice(index, 1)[0];
  }
}
const EMPTY_OBJ = {};
const EMPTY_ARRAY = [];
const ENVIRONMENT_INITIALIZER = /* @__PURE__ */ new InjectionToken("");
const INJECTOR$1 = /* @__PURE__ */ new InjectionToken(
  "",
  // Disable tslint because this is const enum which gets inlined not top level prop access.
  // tslint:disable-next-line: no-toplevel-property-access
  -1
  /* InjectorMarkers.Injector */
);
const INJECTOR_DEF_TYPES = /* @__PURE__ */ new InjectionToken("");
class NullInjector {
  get(token, notFoundValue = THROW_IF_NOT_FOUND) {
    if (notFoundValue === THROW_IF_NOT_FOUND) {
      const message = "";
      const error = createRuntimeError(
        message,
        -201
        /* RuntimeErrorCode.PROVIDER_NOT_FOUND */
      );
      error.name = "ɵNotFound";
      throw error;
    }
    return notFoundValue;
  }
}
function getNgModuleDef(type) {
  return type[NG_MOD_DEF] || null;
}
function getComponentDef(type) {
  return type[NG_COMP_DEF] || null;
}
function getDirectiveDef(type) {
  return type[NG_DIR_DEF] || null;
}
function getPipeDef(type) {
  return type[NG_PIPE_DEF] || null;
}
function makeEnvironmentProviders(providers) {
  return {
    ɵproviders: providers
  };
}
function importProvidersFrom(...sources) {
  return {
    ɵproviders: internalImportProvidersFrom(true, sources),
    ɵfromNgModule: true
  };
}
function internalImportProvidersFrom(checkForStandaloneCmp, ...sources) {
  const providersOut = [];
  const dedup = /* @__PURE__ */ new Set();
  let injectorTypesWithProviders;
  const collectProviders = (provider) => {
    providersOut.push(provider);
  };
  deepForEach(sources, (source) => {
    const internalSource = source;
    if (walkProviderTree(internalSource, collectProviders, [], dedup)) {
      injectorTypesWithProviders ||= [];
      injectorTypesWithProviders.push(internalSource);
    }
  });
  if (injectorTypesWithProviders !== void 0) {
    processInjectorTypesWithProviders(injectorTypesWithProviders, collectProviders);
  }
  return providersOut;
}
function processInjectorTypesWithProviders(typesWithProviders, visitor) {
  for (let i = 0; i < typesWithProviders.length; i++) {
    const {
      ngModule,
      providers
    } = typesWithProviders[i];
    deepForEachProvider(providers, (provider) => {
      visitor(provider, ngModule);
    });
  }
}
function walkProviderTree(container, visitor, parents, dedup) {
  container = resolveForwardRef(container);
  if (!container) return false;
  let defType = null;
  let injDef = getInjectorDef(container);
  const cmpDef = !injDef && getComponentDef(container);
  if (!injDef && !cmpDef) {
    const ngModule = container.ngModule;
    injDef = getInjectorDef(ngModule);
    if (injDef) {
      defType = ngModule;
    } else {
      return false;
    }
  } else if (cmpDef && !cmpDef.standalone) {
    return false;
  } else {
    defType = container;
  }
  const isDuplicate = dedup.has(defType);
  if (cmpDef) {
    if (isDuplicate) {
      return false;
    }
    dedup.add(defType);
    if (cmpDef.dependencies) {
      const deps = typeof cmpDef.dependencies === "function" ? cmpDef.dependencies() : cmpDef.dependencies;
      for (const dep of deps) {
        walkProviderTree(dep, visitor, parents, dedup);
      }
    }
  } else if (injDef) {
    if (injDef.imports != null && !isDuplicate) {
      dedup.add(defType);
      let importTypesWithProviders;
      try {
        deepForEach(injDef.imports, (imported) => {
          if (walkProviderTree(imported, visitor, parents, dedup)) {
            importTypesWithProviders ||= [];
            importTypesWithProviders.push(imported);
          }
        });
      } finally {
      }
      if (importTypesWithProviders !== void 0) {
        processInjectorTypesWithProviders(importTypesWithProviders, visitor);
      }
    }
    if (!isDuplicate) {
      const factory = getFactoryDef(defType) || (() => new defType());
      visitor({
        provide: defType,
        useFactory: factory,
        deps: EMPTY_ARRAY
      }, defType);
      visitor({
        provide: INJECTOR_DEF_TYPES,
        useValue: defType,
        multi: true
      }, defType);
      visitor({
        provide: ENVIRONMENT_INITIALIZER,
        useValue: () => ɵɵinject(defType),
        multi: true
      }, defType);
    }
    const defProviders = injDef.providers;
    if (defProviders != null && !isDuplicate) {
      const injectorType = container;
      deepForEachProvider(defProviders, (provider) => {
        visitor(provider, injectorType);
      });
    }
  } else {
    return false;
  }
  return defType !== container && container.providers !== void 0;
}
function deepForEachProvider(providers, fn) {
  for (let provider of providers) {
    if (isEnvironmentProviders(provider)) {
      provider = provider.ɵproviders;
    }
    if (Array.isArray(provider)) {
      deepForEachProvider(provider, fn);
    } else {
      fn(provider);
    }
  }
}
const USE_VALUE = /* @__PURE__ */ getClosureSafeProperty({
  provide: String,
  useValue: getClosureSafeProperty
});
function isValueProvider(value) {
  return value !== null && typeof value == "object" && USE_VALUE in value;
}
function isExistingProvider(value) {
  return !!(value && value.useExisting);
}
function isFactoryProvider(value) {
  return !!(value && value.useFactory);
}
function isTypeProvider(value) {
  return typeof value === "function";
}
const INJECTOR_SCOPE = /* @__PURE__ */ new InjectionToken("");
const NOT_YET = {};
const CIRCULAR = {};
let NULL_INJECTOR = void 0;
function getNullInjector() {
  if (NULL_INJECTOR === void 0) {
    NULL_INJECTOR = new NullInjector();
  }
  return NULL_INJECTOR;
}
class EnvironmentInjector {
}
class R3Injector extends EnvironmentInjector {
  parent;
  source;
  scopes;
  /**
   * Map of tokens to records which contain the instances of those tokens.
   * - `null` value implies that we don't have the record. Used by tree-shakable injectors
   * to prevent further searches.
   */
  records = /* @__PURE__ */ new Map();
  /**
   * Set of values instantiated by this injector which contain `ngOnDestroy` lifecycle hooks.
   */
  _ngOnDestroyHooks = /* @__PURE__ */ new Set();
  _onDestroyHooks = [];
  /**
   * Flag indicating that this injector was previously destroyed.
   */
  get destroyed() {
    return this._destroyed;
  }
  _destroyed = false;
  injectorDefTypes;
  constructor(providers, parent, source, scopes) {
    super();
    this.parent = parent;
    this.source = source;
    this.scopes = scopes;
    forEachSingleProvider(providers, (provider) => this.processProvider(provider));
    this.records.set(INJECTOR$1, makeRecord(void 0, this));
    if (scopes.has("environment")) {
      this.records.set(EnvironmentInjector, makeRecord(void 0, this));
    }
    const record = this.records.get(INJECTOR_SCOPE);
    if (record != null && typeof record.value === "string") {
      this.scopes.add(record.value);
    }
    this.injectorDefTypes = new Set(this.get(INJECTOR_DEF_TYPES, EMPTY_ARRAY, {
      self: true
    }));
  }
  retrieve(token, options) {
    const flags = convertToBitFlags(options) || 0;
    try {
      return this.get(
        token,
        // When a dependency is requested with an optional flag, DI returns null as the default value.
        THROW_IF_NOT_FOUND,
        flags
      );
    } catch (e) {
      if (isNotFound(e)) {
        return e;
      }
      throw e;
    }
  }
  /**
   * Destroy the injector and release references to every instance or provider associated with it.
   *
   * Also calls the `OnDestroy` lifecycle hooks of every instance that was created for which a
   * hook was found.
   */
  destroy() {
    assertNotDestroyed(this);
    this._destroyed = true;
    const prevConsumer = setActiveConsumer(null);
    try {
      for (const service of this._ngOnDestroyHooks) {
        service.ngOnDestroy();
      }
      const onDestroyHooks = this._onDestroyHooks;
      this._onDestroyHooks = [];
      for (const hook of onDestroyHooks) {
        hook();
      }
    } finally {
      this.records.clear();
      this._ngOnDestroyHooks.clear();
      this.injectorDefTypes.clear();
      setActiveConsumer(prevConsumer);
    }
  }
  onDestroy(callback) {
    assertNotDestroyed(this);
    this._onDestroyHooks.push(callback);
    return () => this.removeOnDestroy(callback);
  }
  runInContext(fn) {
    assertNotDestroyed(this);
    const previousInjector = setCurrentInjector(this);
    const previousInjectImplementation = setInjectImplementation(void 0);
    try {
      return fn();
    } finally {
      setCurrentInjector(previousInjector);
      setInjectImplementation(previousInjectImplementation);
    }
  }
  get(token, notFoundValue = THROW_IF_NOT_FOUND, options) {
    assertNotDestroyed(this);
    if (token.hasOwnProperty(NG_ENV_ID)) {
      return token[NG_ENV_ID](this);
    }
    const flags = convertToBitFlags(options);
    const previousInjector = setCurrentInjector(this);
    const previousInjectImplementation = setInjectImplementation(void 0);
    try {
      if (!(flags & 4)) {
        let record = this.records.get(token);
        if (record === void 0) {
          const def = couldBeInjectableType(token) && getInjectableDef(token);
          if (def && this.injectableDefInScope(def)) {
            if (false) ;
            record = makeRecord(injectableDefOrInjectorDefFactory(token), NOT_YET);
          } else {
            record = null;
          }
          this.records.set(token, record);
        }
        if (record != null) {
          return this.hydrate(token, record, flags);
        }
      }
      const nextInjector = !(flags & 2) ? this.parent : getNullInjector();
      notFoundValue = flags & 8 && notFoundValue === THROW_IF_NOT_FOUND ? null : notFoundValue;
      return nextInjector.get(token, notFoundValue);
    } catch (error) {
      const errorCode = getRuntimeErrorCode(error);
      if (errorCode === -200 || errorCode === -201) {
        {
          throw new RuntimeError(errorCode, null);
        }
      } else {
        throw error;
      }
    } finally {
      setInjectImplementation(previousInjectImplementation);
      setCurrentInjector(previousInjector);
    }
  }
  /** @internal */
  resolveInjectorInitializers() {
    const prevConsumer = setActiveConsumer(null);
    const previousInjector = setCurrentInjector(this);
    const previousInjectImplementation = setInjectImplementation(void 0);
    try {
      const initializers = this.get(ENVIRONMENT_INITIALIZER, EMPTY_ARRAY, {
        self: true
      });
      if (false) ;
      for (const initializer of initializers) {
        initializer();
      }
    } finally {
      setCurrentInjector(previousInjector);
      setInjectImplementation(previousInjectImplementation);
      setActiveConsumer(prevConsumer);
    }
  }
  toString() {
    const tokens = [];
    const records = this.records;
    for (const token of records.keys()) {
      tokens.push(stringify(token));
    }
    return `R3Injector[${tokens.join(", ")}]`;
  }
  /**
   * Process a `SingleProvider` and add it.
   */
  processProvider(provider) {
    provider = resolveForwardRef(provider);
    let token = isTypeProvider(provider) ? provider : resolveForwardRef(provider && provider.provide);
    const record = providerToRecord(provider);
    if (!isTypeProvider(provider) && provider.multi === true) {
      let multiRecord = this.records.get(token);
      if (multiRecord) ; else {
        multiRecord = makeRecord(void 0, NOT_YET, true);
        multiRecord.factory = () => injectArgs(multiRecord.multi);
        this.records.set(token, multiRecord);
      }
      token = provider;
      multiRecord.multi.push(provider);
    }
    this.records.set(token, record);
  }
  hydrate(token, record, flags) {
    const prevConsumer = setActiveConsumer(null);
    try {
      if (record.value === CIRCULAR) {
        throw cyclicDependencyError(stringify(token));
      } else if (record.value === NOT_YET) {
        record.value = CIRCULAR;
        if (false) ; else {
          record.value = record.factory(void 0, flags);
        }
      }
      if (typeof record.value === "object" && record.value && hasOnDestroy(record.value)) {
        this._ngOnDestroyHooks.add(record.value);
      }
      return record.value;
    } finally {
      setActiveConsumer(prevConsumer);
    }
  }
  injectableDefInScope(def) {
    if (!def.providedIn) {
      return false;
    }
    const providedIn = resolveForwardRef(def.providedIn);
    if (typeof providedIn === "string") {
      return providedIn === "any" || this.scopes.has(providedIn);
    } else {
      return this.injectorDefTypes.has(providedIn);
    }
  }
  removeOnDestroy(callback) {
    const destroyCBIdx = this._onDestroyHooks.indexOf(callback);
    if (destroyCBIdx !== -1) {
      this._onDestroyHooks.splice(destroyCBIdx, 1);
    }
  }
}
function injectableDefOrInjectorDefFactory(token) {
  const injectableDef = getInjectableDef(token);
  const factory = injectableDef !== null ? injectableDef.factory : getFactoryDef(token);
  if (factory !== null) {
    return factory;
  }
  if (token instanceof InjectionToken) {
    throw new RuntimeError(204, false);
  }
  if (token instanceof Function) {
    return getUndecoratedInjectableFactory(token);
  }
  throw new RuntimeError(204, false);
}
function getUndecoratedInjectableFactory(token) {
  const paramLength = token.length;
  if (paramLength > 0) {
    throw new RuntimeError(204, false);
  }
  const inheritedInjectableDef = getInheritedInjectableDef(token);
  if (inheritedInjectableDef !== null) {
    return () => inheritedInjectableDef.factory(token);
  } else {
    return () => new token();
  }
}
function providerToRecord(provider) {
  if (isValueProvider(provider)) {
    return makeRecord(void 0, provider.useValue);
  } else {
    const factory = providerToFactory(provider);
    return makeRecord(factory, NOT_YET);
  }
}
function providerToFactory(provider, ngModuleType, providers) {
  let factory = void 0;
  if (isTypeProvider(provider)) {
    const unwrappedProvider = resolveForwardRef(provider);
    return getFactoryDef(unwrappedProvider) || injectableDefOrInjectorDefFactory(unwrappedProvider);
  } else {
    if (isValueProvider(provider)) {
      factory = () => resolveForwardRef(provider.useValue);
    } else if (isFactoryProvider(provider)) {
      factory = () => provider.useFactory(...injectArgs(provider.deps || []));
    } else if (isExistingProvider(provider)) {
      factory = (_, flags) => ɵɵinject(resolveForwardRef(provider.useExisting), flags !== void 0 && flags & 8 ? 8 : void 0);
    } else {
      const classRef = resolveForwardRef(provider && (provider.useClass || provider.provide));
      if (hasDeps(provider)) {
        factory = () => new classRef(...injectArgs(provider.deps));
      } else {
        return getFactoryDef(classRef) || injectableDefOrInjectorDefFactory(classRef);
      }
    }
  }
  return factory;
}
function assertNotDestroyed(injector) {
  if (injector.destroyed) {
    throw new RuntimeError(205, false);
  }
}
function makeRecord(factory, value, multi = false) {
  return {
    factory,
    value,
    multi: multi ? [] : void 0
  };
}
function hasDeps(value) {
  return !!value.deps;
}
function hasOnDestroy(value) {
  return value !== null && typeof value === "object" && typeof value.ngOnDestroy === "function";
}
function couldBeInjectableType(value) {
  return typeof value === "function" || typeof value === "object" && value.ngMetadataName === "InjectionToken";
}
function forEachSingleProvider(providers, fn) {
  for (const provider of providers) {
    if (Array.isArray(provider)) {
      forEachSingleProvider(provider, fn);
    } else if (provider && isEnvironmentProviders(provider)) {
      forEachSingleProvider(provider.ɵproviders, fn);
    } else {
      fn(provider);
    }
  }
}
function runInInjectionContext(injector, fn) {
  let internalInjector;
  if (injector instanceof R3Injector) {
    assertNotDestroyed(injector);
    internalInjector = injector;
  } else {
    internalInjector = new RetrievingInjector(injector);
  }
  const prevInjector = setCurrentInjector(internalInjector);
  const previousInjectImplementation = setInjectImplementation(void 0);
  try {
    return fn();
  } finally {
    setCurrentInjector(prevInjector);
    setInjectImplementation(previousInjectImplementation);
  }
}
function isInInjectionContext() {
  return getInjectImplementation() !== void 0 || getCurrentInjector() != null;
}
const HOST = 0;
const TVIEW = 1;
const FLAGS = 2;
const PARENT = 3;
const NEXT = 4;
const T_HOST = 5;
const HYDRATION = 6;
const CLEANUP = 7;
const CONTEXT = 8;
const INJECTOR = 9;
const ENVIRONMENT = 10;
const RENDERER = 11;
const CHILD_HEAD = 12;
const CHILD_TAIL = 13;
const DECLARATION_VIEW = 14;
const DECLARATION_COMPONENT_VIEW = 15;
const DECLARATION_LCONTAINER = 16;
const PREORDER_HOOK_FLAGS = 17;
const QUERIES = 18;
const ID = 19;
const EMBEDDED_VIEW_INJECTOR = 20;
const ON_DESTROY_HOOKS = 21;
const EFFECTS_TO_SCHEDULE = 22;
const EFFECTS = 23;
const REACTIVE_TEMPLATE_CONSUMER = 24;
const AFTER_RENDER_SEQUENCES_TO_ADD = 25;
const HEADER_OFFSET = 26;
const TYPE = 1;
const DEHYDRATED_VIEWS = 6;
const NATIVE = 7;
const VIEW_REFS = 8;
const MOVED_VIEWS = 9;
const CONTAINER_HEADER_OFFSET = 10;
function isLView(value) {
  return Array.isArray(value) && typeof value[TYPE] === "object";
}
function isLContainer(value) {
  return Array.isArray(value) && value[TYPE] === true;
}
function isContentQueryHost(tNode) {
  return (tNode.flags & 4) !== 0;
}
function isComponentHost(tNode) {
  return tNode.componentOffset > -1;
}
function isDirectiveHost(tNode) {
  return (tNode.flags & 1) === 1;
}
function isComponentDef(def) {
  return !!def.template;
}
function isRootView(target) {
  return (target[FLAGS] & 512) !== 0;
}
function isProjectionTNode(tNode) {
  return (tNode.type & 16) === 16;
}
function hasI18n(lView) {
  return (lView[FLAGS] & 32) === 32;
}
function isDestroyed(lView) {
  return (lView[FLAGS] & 256) === 256;
}
const SVG_NAMESPACE = "svg";
const MATH_ML_NAMESPACE = "math";
function unwrapRNode(value) {
  while (Array.isArray(value)) {
    value = value[HOST];
  }
  return value;
}
function unwrapLView(value) {
  while (Array.isArray(value)) {
    if (typeof value[TYPE] === "object") return value;
    value = value[HOST];
  }
  return null;
}
function getNativeByIndex(index, lView) {
  return unwrapRNode(lView[index]);
}
function getNativeByTNode(tNode, lView) {
  const node = unwrapRNode(lView[tNode.index]);
  return node;
}
function getTNode(tView, index) {
  const tNode = tView.data[index];
  return tNode;
}
function getComponentLViewByIndex(nodeIndex, hostView) {
  const slotValue = hostView[nodeIndex];
  const lView = isLView(slotValue) ? slotValue : slotValue[HOST];
  return lView;
}
function viewAttachedToChangeDetector(view) {
  return (view[FLAGS] & 128) === 128;
}
function getConstant(consts, index) {
  if (index === null || index === void 0) return null;
  return consts[index];
}
function resetPreOrderHookFlags(lView) {
  lView[PREORDER_HOOK_FLAGS] = 0;
}
function markViewForRefresh(lView) {
  if (lView[FLAGS] & 1024) {
    return;
  }
  lView[FLAGS] |= 1024;
  if (viewAttachedToChangeDetector(lView)) {
    markAncestorsForTraversal(lView);
  }
}
function walkUpViews(nestingLevel, currentView) {
  while (nestingLevel > 0) {
    currentView = currentView[DECLARATION_VIEW];
    nestingLevel--;
  }
  return currentView;
}
function requiresRefreshOrTraversal(lView) {
  return !!(lView[FLAGS] & (1024 | 8192) || lView[REACTIVE_TEMPLATE_CONSUMER]?.dirty);
}
function updateAncestorTraversalFlagsOnAttach(lView) {
  lView[ENVIRONMENT].changeDetectionScheduler?.notify(
    8
    /* NotificationSource.ViewAttached */
  );
  if (lView[FLAGS] & 64) {
    lView[FLAGS] |= 1024;
  }
  if (requiresRefreshOrTraversal(lView)) {
    markAncestorsForTraversal(lView);
  }
}
function markAncestorsForTraversal(lView) {
  lView[ENVIRONMENT].changeDetectionScheduler?.notify(
    0
    /* NotificationSource.MarkAncestorsForTraversal */
  );
  let parent = getLViewParent(lView);
  while (parent !== null) {
    if (parent[FLAGS] & 8192) {
      break;
    }
    parent[FLAGS] |= 8192;
    if (!viewAttachedToChangeDetector(parent)) {
      break;
    }
    parent = getLViewParent(parent);
  }
}
function storeLViewOnDestroy(lView, onDestroyCallback) {
  if (isDestroyed(lView)) {
    throw new RuntimeError(911, false);
  }
  if (lView[ON_DESTROY_HOOKS] === null) {
    lView[ON_DESTROY_HOOKS] = [];
  }
  lView[ON_DESTROY_HOOKS].push(onDestroyCallback);
}
function removeLViewOnDestroy(lView, onDestroyCallback) {
  if (lView[ON_DESTROY_HOOKS] === null) return;
  const destroyCBIdx = lView[ON_DESTROY_HOOKS].indexOf(onDestroyCallback);
  if (destroyCBIdx !== -1) {
    lView[ON_DESTROY_HOOKS].splice(destroyCBIdx, 1);
  }
}
function getLViewParent(lView) {
  const parent = lView[PARENT];
  return isLContainer(parent) ? parent[PARENT] : parent;
}
function getOrCreateLViewCleanup(view) {
  return view[CLEANUP] ??= [];
}
function getOrCreateTViewCleanup(tView) {
  return tView.cleanup ??= [];
}
const instructionState = {
  lFrame: /* @__PURE__ */ createLFrame(null),
  bindingsEnabled: true,
  skipHydrationRootTNode: null
};
let _isRefreshingViews = false;
function getElementDepthCount() {
  return instructionState.lFrame.elementDepthCount;
}
function increaseElementDepthCount() {
  instructionState.lFrame.elementDepthCount++;
}
function decreaseElementDepthCount() {
  instructionState.lFrame.elementDepthCount--;
}
function getBindingsEnabled() {
  return instructionState.bindingsEnabled;
}
function isInSkipHydrationBlock$1() {
  return instructionState.skipHydrationRootTNode !== null;
}
function isSkipHydrationRootTNode(tNode) {
  return instructionState.skipHydrationRootTNode === tNode;
}
function leaveSkipHydrationBlock() {
  instructionState.skipHydrationRootTNode = null;
}
function getLView() {
  return instructionState.lFrame.lView;
}
function getTView() {
  return instructionState.lFrame.tView;
}
function ɵɵrestoreView(viewToRestore) {
  instructionState.lFrame.contextLView = viewToRestore;
  return viewToRestore[CONTEXT];
}
function ɵɵresetView(value) {
  instructionState.lFrame.contextLView = null;
  return value;
}
function getCurrentTNode() {
  let currentTNode = getCurrentTNodePlaceholderOk();
  while (currentTNode !== null && currentTNode.type === 64) {
    currentTNode = currentTNode.parent;
  }
  return currentTNode;
}
function getCurrentTNodePlaceholderOk() {
  return instructionState.lFrame.currentTNode;
}
function getCurrentParentTNode() {
  const lFrame = instructionState.lFrame;
  const currentTNode = lFrame.currentTNode;
  return lFrame.isParent ? currentTNode : currentTNode.parent;
}
function setCurrentTNode(tNode, isParent) {
  const lFrame = instructionState.lFrame;
  lFrame.currentTNode = tNode;
  lFrame.isParent = isParent;
}
function isCurrentTNodeParent() {
  return instructionState.lFrame.isParent;
}
function setCurrentTNodeAsNotParent() {
  instructionState.lFrame.isParent = false;
}
function isRefreshingViews() {
  return _isRefreshingViews;
}
function setIsRefreshingViews(mode) {
  const prev = _isRefreshingViews;
  _isRefreshingViews = mode;
  return prev;
}
function setBindingIndex(value) {
  return instructionState.lFrame.bindingIndex = value;
}
function nextBindingIndex() {
  return instructionState.lFrame.bindingIndex++;
}
function isInI18nBlock() {
  return instructionState.lFrame.inI18n;
}
function setBindingRootForHostBindings(bindingRootIndex, currentDirectiveIndex) {
  const lFrame = instructionState.lFrame;
  lFrame.bindingIndex = lFrame.bindingRootIndex = bindingRootIndex;
  setCurrentDirectiveIndex(currentDirectiveIndex);
}
function getCurrentDirectiveIndex() {
  return instructionState.lFrame.currentDirectiveIndex;
}
function setCurrentDirectiveIndex(currentDirectiveIndex) {
  instructionState.lFrame.currentDirectiveIndex = currentDirectiveIndex;
}
function setCurrentQueryIndex(value) {
  instructionState.lFrame.currentQueryIndex = value;
}
function getDeclarationTNode(lView) {
  const tView = lView[TVIEW];
  if (tView.type === 2) {
    return tView.declTNode;
  }
  if (tView.type === 1) {
    return lView[T_HOST];
  }
  return null;
}
function enterDI(lView, tNode, flags) {
  if (flags & 4) {
    let parentTNode = tNode;
    let parentLView = lView;
    while (true) {
      parentTNode = parentTNode.parent;
      if (parentTNode === null && !(flags & 1)) {
        parentTNode = getDeclarationTNode(parentLView);
        if (parentTNode === null) break;
        parentLView = parentLView[DECLARATION_VIEW];
        if (parentTNode.type & (2 | 8)) {
          break;
        }
      } else {
        break;
      }
    }
    if (parentTNode === null) {
      return false;
    } else {
      tNode = parentTNode;
      lView = parentLView;
    }
  }
  const lFrame = instructionState.lFrame = allocLFrame();
  lFrame.currentTNode = tNode;
  lFrame.lView = lView;
  return true;
}
function enterView(newView) {
  const newLFrame = allocLFrame();
  const tView = newView[TVIEW];
  instructionState.lFrame = newLFrame;
  newLFrame.currentTNode = tView.firstChild;
  newLFrame.lView = newView;
  newLFrame.tView = tView;
  newLFrame.contextLView = newView;
  newLFrame.bindingIndex = tView.bindingStartIndex;
  newLFrame.inI18n = false;
}
function allocLFrame() {
  const currentLFrame = instructionState.lFrame;
  const childLFrame = currentLFrame === null ? null : currentLFrame.child;
  const newLFrame = childLFrame === null ? createLFrame(currentLFrame) : childLFrame;
  return newLFrame;
}
function createLFrame(parent) {
  const lFrame = {
    currentTNode: null,
    isParent: true,
    lView: null,
    tView: null,
    selectedIndex: -1,
    contextLView: null,
    elementDepthCount: 0,
    currentNamespace: null,
    currentDirectiveIndex: -1,
    bindingRootIndex: -1,
    bindingIndex: -1,
    currentQueryIndex: 0,
    parent,
    child: null,
    inI18n: false
  };
  parent !== null && (parent.child = lFrame);
  return lFrame;
}
function leaveViewLight() {
  const oldLFrame = instructionState.lFrame;
  instructionState.lFrame = oldLFrame.parent;
  oldLFrame.currentTNode = null;
  oldLFrame.lView = null;
  return oldLFrame;
}
const leaveDI = leaveViewLight;
function leaveView() {
  const oldLFrame = leaveViewLight();
  oldLFrame.isParent = true;
  oldLFrame.tView = null;
  oldLFrame.selectedIndex = -1;
  oldLFrame.contextLView = null;
  oldLFrame.elementDepthCount = 0;
  oldLFrame.currentDirectiveIndex = -1;
  oldLFrame.currentNamespace = null;
  oldLFrame.bindingRootIndex = -1;
  oldLFrame.bindingIndex = -1;
  oldLFrame.currentQueryIndex = 0;
}
function nextContextImpl(level) {
  const contextLView = instructionState.lFrame.contextLView = walkUpViews(level, instructionState.lFrame.contextLView);
  return contextLView[CONTEXT];
}
function getSelectedIndex() {
  return instructionState.lFrame.selectedIndex;
}
function setSelectedIndex(index) {
  instructionState.lFrame.selectedIndex = index;
}
function getSelectedTNode() {
  const lFrame = instructionState.lFrame;
  return getTNode(lFrame.tView, lFrame.selectedIndex);
}
function ɵɵnamespaceSVG() {
  instructionState.lFrame.currentNamespace = SVG_NAMESPACE;
}
function getNamespace() {
  return instructionState.lFrame.currentNamespace;
}
let _wasLastNodeCreated = true;
function wasLastNodeCreated() {
  return _wasLastNodeCreated;
}
function lastNodeWasCreated(flag) {
  _wasLastNodeCreated = flag;
}
let registry = {
  elements: void 0
};
function getAnimationElementRemovalRegistry() {
  return registry;
}
function createInjector(defType, parent = null, additionalProviders = null, name) {
  const injector = createInjectorWithoutInjectorInstances(defType, parent, additionalProviders, name);
  injector.resolveInjectorInitializers();
  return injector;
}
function createInjectorWithoutInjectorInstances(defType, parent = null, additionalProviders = null, name, scopes = /* @__PURE__ */ new Set()) {
  const providers = [additionalProviders || EMPTY_ARRAY, importProvidersFrom(defType)];
  name = name || (typeof defType === "object" ? void 0 : stringify(defType));
  return new R3Injector(providers, parent || getNullInjector(), name || null, scopes);
}
class Injector {
  static THROW_IF_NOT_FOUND = THROW_IF_NOT_FOUND;
  static NULL = /* @__PURE__ */ new NullInjector();
  static create(options, parent) {
    if (Array.isArray(options)) {
      return createInjector({
        name: ""
      }, parent, options, "");
    } else {
      const name = options.name ?? "";
      return createInjector({
        name
      }, options.parent, options.providers, name);
    }
  }
  /** @nocollapse */
  static ɵprov = (
    /** @pureOrBreakMyCode */
    /* @__PURE__ */ ɵɵdefineInjectable({
      token: Injector,
      providedIn: "any",
      factory: () => ɵɵinject(INJECTOR$1)
    })
  );
  /**
   * @internal
   * @nocollapse
   */
  static __NG_ELEMENT_ID__ = -1;
}
const DOCUMENT$1 = /* @__PURE__ */ new InjectionToken("");
let DestroyRef = /* @__PURE__ */ (() => {
  class DestroyRef2 {
    /**
     * @internal
     * @nocollapse
     */
    static __NG_ELEMENT_ID__ = injectDestroyRef;
    /**
     * @internal
     * @nocollapse
     */
    static __NG_ENV_ID__ = (injector) => injector;
  }
  return DestroyRef2;
})();
class NodeInjectorDestroyRef extends DestroyRef {
  _lView;
  constructor(_lView) {
    super();
    this._lView = _lView;
  }
  get destroyed() {
    return isDestroyed(this._lView);
  }
  onDestroy(callback) {
    const lView = this._lView;
    storeLViewOnDestroy(lView, callback);
    return () => removeLViewOnDestroy(lView, callback);
  }
}
function injectDestroyRef() {
  return new NodeInjectorDestroyRef(getLView());
}
class ErrorHandler {
  /**
   * @internal
   */
  _console = console;
  handleError(error) {
    this._console.error("ERROR", error);
  }
}
const INTERNAL_APPLICATION_ERROR_HANDLER = /* @__PURE__ */ new InjectionToken("", {
  providedIn: "root",
  factory: () => {
    const injector = inject(EnvironmentInjector);
    let userErrorHandler;
    return (e) => {
      if (injector.destroyed && !userErrorHandler) {
        setTimeout(() => {
          throw e;
        });
      } else {
        userErrorHandler ??= injector.get(ErrorHandler);
        userErrorHandler.handleError(e);
      }
    };
  }
});
const errorHandlerEnvironmentInitializer = {
  provide: ENVIRONMENT_INITIALIZER,
  useValue: () => void inject(ErrorHandler),
  multi: true
};
function signal(initialValue, options) {
  const [get, set, update] = createSignal(initialValue, options?.equal);
  const signalFn = get;
  signalFn[SIGNAL];
  signalFn.set = set;
  signalFn.update = update;
  signalFn.asReadonly = signalAsReadonlyFn.bind(signalFn);
  return signalFn;
}
function signalAsReadonlyFn() {
  const node = this[SIGNAL];
  if (node.readonlyFn === void 0) {
    const readonlyFn = () => this();
    readonlyFn[SIGNAL] = node;
    node.readonlyFn = readonlyFn;
  }
  return node.readonlyFn;
}
class ChangeDetectionScheduler {
}
const ZONELESS_ENABLED = /* @__PURE__ */ new InjectionToken("", {
  providedIn: "root",
  factory: () => false
});
const ZONELESS_SCHEDULER_DISABLED = /* @__PURE__ */ new InjectionToken("");
const SCHEDULE_IN_ROOT_ZONE = /* @__PURE__ */ new InjectionToken("");
let ViewContext = /* @__PURE__ */ (() => {
  class ViewContext2 {
    view;
    node;
    constructor(view, node) {
      this.view = view;
      this.node = node;
    }
    /**
     * @internal
     * @nocollapse
     */
    static __NG_ELEMENT_ID__ = injectViewContext;
  }
  return ViewContext2;
})();
function injectViewContext() {
  return new ViewContext(getLView(), getCurrentTNode());
}
let PendingTasksInternal = /* @__PURE__ */ (() => {
  class PendingTasksInternal2 {
    taskId = 0;
    pendingTasks = /* @__PURE__ */ new Set();
    destroyed = false;
    pendingTask = new BehaviorSubject(false);
    get hasPendingTasks() {
      return this.destroyed ? false : this.pendingTask.value;
    }
    /**
     * In case the service is about to be destroyed, return a self-completing observable.
     * Otherwise, return the observable that emits the current state of pending tasks.
     */
    get hasPendingTasksObservable() {
      if (this.destroyed) {
        return new Observable((subscriber) => {
          subscriber.next(false);
          subscriber.complete();
        });
      }
      return this.pendingTask;
    }
    add() {
      if (!this.hasPendingTasks && !this.destroyed) {
        this.pendingTask.next(true);
      }
      const taskId = this.taskId++;
      this.pendingTasks.add(taskId);
      return taskId;
    }
    has(taskId) {
      return this.pendingTasks.has(taskId);
    }
    remove(taskId) {
      this.pendingTasks.delete(taskId);
      if (this.pendingTasks.size === 0 && this.hasPendingTasks) {
        this.pendingTask.next(false);
      }
    }
    ngOnDestroy() {
      this.pendingTasks.clear();
      if (this.hasPendingTasks) {
        this.pendingTask.next(false);
      }
      this.destroyed = true;
      this.pendingTask.unsubscribe();
    }
    /** @nocollapse */
    static ɵprov = (
      /** @pureOrBreakMyCode */
      /* @__PURE__ */ ɵɵdefineInjectable({
        token: PendingTasksInternal2,
        providedIn: "root",
        factory: () => new PendingTasksInternal2()
      })
    );
  }
  return PendingTasksInternal2;
})();
function noop(...args) {
}
let EffectScheduler = /* @__PURE__ */ (() => {
  class EffectScheduler2 {
    /** @nocollapse */
    static ɵprov = (
      /** @pureOrBreakMyCode */
      /* @__PURE__ */ ɵɵdefineInjectable({
        token: EffectScheduler2,
        providedIn: "root",
        factory: () => new ZoneAwareEffectScheduler()
      })
    );
  }
  return EffectScheduler2;
})();
class ZoneAwareEffectScheduler {
  dirtyEffectCount = 0;
  queues = /* @__PURE__ */ new Map();
  add(handle) {
    this.enqueue(handle);
    this.schedule(handle);
  }
  schedule(handle) {
    if (!handle.dirty) {
      return;
    }
    this.dirtyEffectCount++;
  }
  remove(handle) {
    const zone = handle.zone;
    const queue = this.queues.get(zone);
    if (!queue.has(handle)) {
      return;
    }
    queue.delete(handle);
    if (handle.dirty) {
      this.dirtyEffectCount--;
    }
  }
  enqueue(handle) {
    const zone = handle.zone;
    if (!this.queues.has(zone)) {
      this.queues.set(zone, /* @__PURE__ */ new Set());
    }
    const queue = this.queues.get(zone);
    if (queue.has(handle)) {
      return;
    }
    queue.add(handle);
  }
  /**
   * Run all scheduled effects.
   *
   * Execution order of effects within the same zone is guaranteed to be FIFO, but there is no
   * ordering guarantee between effects scheduled in different zones.
   */
  flush() {
    while (this.dirtyEffectCount > 0) {
      let ranOneEffect = false;
      for (const [zone, queue] of this.queues) {
        if (zone === null) {
          ranOneEffect ||= this.flushQueue(queue);
        } else {
          ranOneEffect ||= zone.run(() => this.flushQueue(queue));
        }
      }
      if (!ranOneEffect) {
        this.dirtyEffectCount = 0;
      }
    }
  }
  flushQueue(queue) {
    let ranOneEffect = false;
    for (const handle of queue) {
      if (!handle.dirty) {
        continue;
      }
      this.dirtyEffectCount--;
      ranOneEffect = true;
      handle.run();
    }
    return ranOneEffect;
  }
}

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */

const Attribute = {
  /**
   * The jsaction attribute defines a mapping of a DOM event to a
   * generic event (aka jsaction), to which the actual event handlers
   * that implement the behavior of the application are bound. The
   * value is a semicolon separated list of colon separated pairs of
   * an optional DOM event name and a jsaction name. If the optional
   * DOM event name is omitted, 'click' is assumed. The jsaction names
   * are dot separated pairs of a namespace and a simple jsaction
   * name.
   *
   * See grammar in README.md for expected syntax in the attribute value.
   */
  JSACTION: 'jsaction'
};

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */
function noSideEffects(fn) {
  return {
    toString: fn
  }.toString();
}
const PARAMETERS = "__parameters__";
function makeMetadataCtor(props) {
  return function ctor(...args) {
    if (props) {
      const values = props(...args);
      for (const propName in values) {
        this[propName] = values[propName];
      }
    }
  };
}
function makeParamDecorator(name, props, parentClass) {
  return noSideEffects(() => {
    const metaCtor = makeMetadataCtor(props);
    function ParamDecoratorFactory(...args) {
      if (this instanceof ParamDecoratorFactory) {
        metaCtor.apply(this, args);
        return this;
      }
      const annotationInstance = new ParamDecoratorFactory(...args);
      ParamDecorator.annotation = annotationInstance;
      return ParamDecorator;
      function ParamDecorator(cls, unusedKey, index) {
        const parameters = cls.hasOwnProperty(PARAMETERS) ? cls[PARAMETERS] : Object.defineProperty(cls, PARAMETERS, {
          value: []
        })[PARAMETERS];
        while (parameters.length <= index) {
          parameters.push(null);
        }
        (parameters[index] = parameters[index] || []).push(annotationInstance);
        return cls;
      }
    }
    ParamDecoratorFactory.prototype.ngMetadataName = name;
    ParamDecoratorFactory.annotationCls = ParamDecoratorFactory;
    return ParamDecoratorFactory;
  });
}
const Optional = (
  // Disable tslint because `InternalInjectFlags` is a const enum which gets inlined.
  // tslint:disable-next-line: no-toplevel-property-access
  /* @__PURE__ */ attachInjectFlag(
    /* @__PURE__ */ makeParamDecorator("Optional"),
    8
    /* InternalInjectFlags.Optional */
  )
);
class SimpleChange {
  previousValue;
  currentValue;
  firstChange;
  constructor(previousValue, currentValue, firstChange) {
    this.previousValue = previousValue;
    this.currentValue = currentValue;
    this.firstChange = firstChange;
  }
  /**
   * Check whether the new value is the first value assigned.
   */
  isFirstChange() {
    return this.firstChange;
  }
}
function applyValueToInputField(instance, inputSignalNode, privateName, value) {
  if (inputSignalNode !== null) {
    inputSignalNode.applyValueToInputSignal(inputSignalNode, value);
  } else {
    instance[privateName] = value;
  }
}
function NgOnChangesFeatureImpl(definition) {
  if (definition.type.prototype.ngOnChanges) {
    definition.setInput = ngOnChangesSetInput;
  }
  return rememberChangeHistoryAndInvokeOnChangesHook;
}
function rememberChangeHistoryAndInvokeOnChangesHook() {
  const simpleChangesStore = getSimpleChangesStore(this);
  const current = simpleChangesStore?.current;
  if (current) {
    const previous = simpleChangesStore.previous;
    if (previous === EMPTY_OBJ) {
      simpleChangesStore.previous = current;
    } else {
      for (let key in current) {
        previous[key] = current[key];
      }
    }
    simpleChangesStore.current = null;
    this.ngOnChanges(current);
  }
}
function ngOnChangesSetInput(instance, inputSignalNode, value, publicName, privateName) {
  const declaredName = this.declaredInputs[publicName];
  const simpleChangesStore = getSimpleChangesStore(instance) || setSimpleChangesStore(instance, {
    previous: EMPTY_OBJ,
    current: null
  });
  const current = simpleChangesStore.current || (simpleChangesStore.current = {});
  const previous = simpleChangesStore.previous;
  const previousChange = previous[declaredName];
  current[declaredName] = new SimpleChange(previousChange && previousChange.currentValue, value, previous === EMPTY_OBJ);
  applyValueToInputField(instance, inputSignalNode, privateName, value);
}
const SIMPLE_CHANGES_STORE = "__ngSimpleChanges__";
function getSimpleChangesStore(instance) {
  return instance[SIMPLE_CHANGES_STORE] || null;
}
function setSimpleChangesStore(instance, store2) {
  return instance[SIMPLE_CHANGES_STORE] = store2;
}
const profilerCallbacks = [];
const profiler = function(event, instance = null, eventFn) {
  for (let i = 0; i < profilerCallbacks.length; i++) {
    const profilerCallback = profilerCallbacks[i];
    profilerCallback(event, instance, eventFn);
  }
};
function registerPreOrderHooks(directiveIndex, directiveDef, tView) {
  const {
    ngOnChanges,
    ngOnInit,
    ngDoCheck
  } = directiveDef.type.prototype;
  if (ngOnChanges) {
    const wrappedOnChanges = NgOnChangesFeatureImpl(directiveDef);
    (tView.preOrderHooks ??= []).push(directiveIndex, wrappedOnChanges);
    (tView.preOrderCheckHooks ??= []).push(directiveIndex, wrappedOnChanges);
  }
  if (ngOnInit) {
    (tView.preOrderHooks ??= []).push(0 - directiveIndex, ngOnInit);
  }
  if (ngDoCheck) {
    (tView.preOrderHooks ??= []).push(directiveIndex, ngDoCheck);
    (tView.preOrderCheckHooks ??= []).push(directiveIndex, ngDoCheck);
  }
}
function registerPostOrderHooks(tView, tNode) {
  for (let i = tNode.directiveStart, end = tNode.directiveEnd; i < end; i++) {
    const directiveDef = tView.data[i];
    const lifecycleHooks = directiveDef.type.prototype;
    const {
      ngAfterContentInit,
      ngAfterContentChecked,
      ngAfterViewInit,
      ngAfterViewChecked,
      ngOnDestroy
    } = lifecycleHooks;
    if (ngAfterContentInit) {
      (tView.contentHooks ??= []).push(-i, ngAfterContentInit);
    }
    if (ngAfterContentChecked) {
      (tView.contentHooks ??= []).push(i, ngAfterContentChecked);
      (tView.contentCheckHooks ??= []).push(i, ngAfterContentChecked);
    }
    if (ngAfterViewInit) {
      (tView.viewHooks ??= []).push(-i, ngAfterViewInit);
    }
    if (ngAfterViewChecked) {
      (tView.viewHooks ??= []).push(i, ngAfterViewChecked);
      (tView.viewCheckHooks ??= []).push(i, ngAfterViewChecked);
    }
    if (ngOnDestroy != null) {
      (tView.destroyHooks ??= []).push(i, ngOnDestroy);
    }
  }
}
function executeCheckHooks(lView, hooks, nodeIndex) {
  callHooks(lView, hooks, 3, nodeIndex);
}
function executeInitAndCheckHooks(lView, hooks, initPhase, nodeIndex) {
  if ((lView[FLAGS] & 3) === initPhase) {
    callHooks(lView, hooks, initPhase, nodeIndex);
  }
}
function incrementInitPhaseFlags(lView, initPhase) {
  let flags = lView[FLAGS];
  if ((flags & 3) === initPhase) {
    flags &= 16383;
    flags += 1;
    lView[FLAGS] = flags;
  }
}
function callHooks(currentView, arr, initPhase, currentNodeIndex) {
  const startIndex = currentNodeIndex !== void 0 ? currentView[PREORDER_HOOK_FLAGS] & 65535 : 0;
  const nodeIndexLimit = currentNodeIndex != null ? currentNodeIndex : -1;
  const max = arr.length - 1;
  let lastNodeIndexFound = 0;
  for (let i = startIndex; i < max; i++) {
    const hook = arr[i + 1];
    if (typeof hook === "number") {
      lastNodeIndexFound = arr[i];
      if (currentNodeIndex != null && lastNodeIndexFound >= currentNodeIndex) {
        break;
      }
    } else {
      const isInitHook = arr[i] < 0;
      if (isInitHook) {
        currentView[PREORDER_HOOK_FLAGS] += 65536;
      }
      if (lastNodeIndexFound < nodeIndexLimit || nodeIndexLimit == -1) {
        callHook(currentView, initPhase, arr, i);
        currentView[PREORDER_HOOK_FLAGS] = (currentView[PREORDER_HOOK_FLAGS] & 4294901760) + i + 2;
      }
      i++;
    }
  }
}
function callHookInternal(directive, hook) {
  profiler(4, directive, hook);
  const prevConsumer = setActiveConsumer(null);
  try {
    hook.call(directive);
  } finally {
    setActiveConsumer(prevConsumer);
    profiler(5, directive, hook);
  }
}
function callHook(currentView, initPhase, arr, i) {
  const isInitHook = arr[i] < 0;
  const hook = arr[i + 1];
  const directiveIndex = isInitHook ? -arr[i] : arr[i];
  const directive = currentView[directiveIndex];
  if (isInitHook) {
    const indexWithintInitPhase = currentView[FLAGS] >> 14;
    if (indexWithintInitPhase < currentView[PREORDER_HOOK_FLAGS] >> 16 && (currentView[FLAGS] & 3) === initPhase) {
      currentView[FLAGS] += 16384;
      callHookInternal(directive, hook);
    }
  } else {
    callHookInternal(directive, hook);
  }
}
const NO_PARENT_INJECTOR = -1;
class NodeInjectorFactory {
  factory;
  name;
  /**
   * The inject implementation to be activated when using the factory.
   */
  injectImpl;
  /**
   * Marker set to true during factory invocation to see if we get into recursive loop.
   * Recursive loop causes an error to be displayed.
   */
  resolving = false;
  /**
   * Marks that the token can see other Tokens declared in `viewProviders` on the same node.
   */
  canSeeViewProviders;
  /**
   * An array of factories to use in case of `multi` provider.
   */
  multi;
  /**
   * Number of `multi`-providers which belong to the component.
   *
   * This is needed because when multiple components and directives declare the `multi` provider
   * they have to be concatenated in the correct order.
   *
   * Example:
   *
   * If we have a component and directive active an a single element as declared here
   * ```ts
   * component:
   *   providers: [ {provide: String, useValue: 'component', multi: true} ],
   *   viewProviders: [ {provide: String, useValue: 'componentView', multi: true} ],
   *
   * directive:
   *   providers: [ {provide: String, useValue: 'directive', multi: true} ],
   * ```
   *
   * Then the expected results are:
   *
   * ```ts
   * providers: ['component', 'directive']
   * viewProviders: ['component', 'componentView', 'directive']
   * ```
   *
   * The way to think about it is that the `viewProviders` have been inserted after the component
   * but before the directives, which is why we need to know how many `multi`s have been declared by
   * the component.
   */
  componentProviders;
  /**
   * Current index of the Factory in the `data`. Needed for `viewProviders` and `providers` merging.
   * See `providerFactory`.
   */
  index;
  /**
   * Because the same `multi` provider can be declared in `providers` and `viewProviders` it is
   * possible for `viewProviders` to shadow the `providers`. For this reason we store the
   * `provideFactory` of the `providers` so that `providers` can be extended with `viewProviders`.
   *
   * Example:
   *
   * Given:
   * ```ts
   * providers: [ {provide: String, useValue: 'all', multi: true} ],
   * viewProviders: [ {provide: String, useValue: 'viewOnly', multi: true} ],
   * ```
   *
   * We have to return `['all']` in case of content injection, but `['all', 'viewOnly']` in case
   * of view injection. We further have to make sure that the shared instances (in our case
   * `all`) are the exact same instance in both the content as well as the view injection. (We
   * have to make sure that we don't double instantiate.) For this reason the `viewProviders`
   * `Factory` has a pointer to the shadowed `providers` factory so that it can instantiate the
   * `providers` (`['all']`) and then extend it with `viewProviders` (`['all'] + ['viewOnly'] =
   * ['all', 'viewOnly']`).
   */
  providerFactory;
  constructor(factory, isViewProvider, injectImplementation, name) {
    this.factory = factory;
    this.name = name;
    this.canSeeViewProviders = isViewProvider;
    this.injectImpl = injectImplementation;
  }
}
function isTNodeShape(value) {
  return value != null && typeof value === "object" && (value.insertBeforeIndex === null || typeof value.insertBeforeIndex === "number" || Array.isArray(value.insertBeforeIndex));
}
function isLetDeclaration(tNode) {
  return !!(tNode.type & 128);
}
function hasClassInput(tNode) {
  return (tNode.flags & 8) !== 0;
}
function hasStyleInput(tNode) {
  return (tNode.flags & 16) !== 0;
}
function setUpAttributes(renderer, native, attrs) {
  let i = 0;
  while (i < attrs.length) {
    const value = attrs[i];
    if (typeof value === "number") {
      if (value !== 0) {
        break;
      }
      i++;
      const namespaceURI = attrs[i++];
      const attrName = attrs[i++];
      const attrVal = attrs[i++];
      renderer.setAttribute(native, attrName, attrVal, namespaceURI);
    } else {
      const attrName = value;
      const attrVal = attrs[++i];
      if (isAnimationProp(attrName)) {
        renderer.setProperty(native, attrName, attrVal);
      } else {
        renderer.setAttribute(native, attrName, attrVal);
      }
      i++;
    }
  }
  return i;
}
function isNameOnlyAttributeMarker(marker) {
  return marker === 3 || marker === 4 || marker === 6;
}
function isAnimationProp(name) {
  return name.charCodeAt(0) === 64;
}
function mergeHostAttrs(dst, src) {
  if (src === null || src.length === 0) ;
  else if (dst === null || dst.length === 0) {
    dst = src.slice();
  } else {
    let srcMarker = -1;
    for (let i = 0; i < src.length; i++) {
      const item = src[i];
      if (typeof item === "number") {
        srcMarker = item;
      } else {
        if (srcMarker === 0) ;
        else if (srcMarker === -1 || srcMarker === 2) {
          mergeHostAttribute(dst, srcMarker, item, null, src[++i]);
        } else {
          mergeHostAttribute(dst, srcMarker, item, null, null);
        }
      }
    }
  }
  return dst;
}
function mergeHostAttribute(dst, marker, key1, key2, value) {
  let i = 0;
  let markerInsertPosition = dst.length;
  if (marker === -1) {
    markerInsertPosition = -1;
  } else {
    while (i < dst.length) {
      const dstValue = dst[i++];
      if (typeof dstValue === "number") {
        if (dstValue === marker) {
          markerInsertPosition = -1;
          break;
        } else if (dstValue > marker) {
          markerInsertPosition = i - 1;
          break;
        }
      }
    }
  }
  while (i < dst.length) {
    const item = dst[i];
    if (typeof item === "number") {
      break;
    } else if (item === key1) {
      {
        if (value !== null) {
          dst[i + 1] = value;
        }
        return;
      }
    }
    i++;
    if (value !== null) i++;
  }
  if (markerInsertPosition !== -1) {
    dst.splice(markerInsertPosition, 0, marker);
    i = markerInsertPosition + 1;
  }
  dst.splice(i++, 0, key1);
  if (value !== null) {
    dst.splice(i++, 0, value);
  }
}
function hasParentInjector(parentLocation) {
  return parentLocation !== NO_PARENT_INJECTOR;
}
function getParentInjectorIndex(parentLocation) {
  return parentLocation & 32767;
}
function getParentInjectorViewOffset(parentLocation) {
  return parentLocation >> 16;
}
function getParentInjectorView(location, startView) {
  let viewOffset = getParentInjectorViewOffset(location);
  let parentView = startView;
  while (viewOffset > 0) {
    parentView = parentView[DECLARATION_VIEW];
    viewOffset--;
  }
  return parentView;
}
let includeViewProviders = true;
function setIncludeViewProviders(v) {
  const oldValue = includeViewProviders;
  includeViewProviders = v;
  return oldValue;
}
const BLOOM_SIZE = 256;
const BLOOM_MASK = BLOOM_SIZE - 1;
const BLOOM_BUCKET_BITS = 5;
let nextNgElementId = 0;
const NOT_FOUND = {};
function bloomAdd(injectorIndex, tView, type) {
  let id;
  if (typeof type === "string") {
    id = type.charCodeAt(0) || 0;
  } else if (type.hasOwnProperty(NG_ELEMENT_ID)) {
    id = type[NG_ELEMENT_ID];
  }
  if (id == null) {
    id = type[NG_ELEMENT_ID] = nextNgElementId++;
  }
  const bloomHash = id & BLOOM_MASK;
  const mask = 1 << bloomHash;
  tView.data[injectorIndex + (bloomHash >> BLOOM_BUCKET_BITS)] |= mask;
}
function getOrCreateNodeInjectorForNode(tNode, lView) {
  const existingInjectorIndex = getInjectorIndex(tNode, lView);
  if (existingInjectorIndex !== -1) {
    return existingInjectorIndex;
  }
  const tView = lView[TVIEW];
  if (tView.firstCreatePass) {
    tNode.injectorIndex = lView.length;
    insertBloom(tView.data, tNode);
    insertBloom(lView, null);
    insertBloom(tView.blueprint, null);
  }
  const parentLoc = getParentInjectorLocation(tNode, lView);
  const injectorIndex = tNode.injectorIndex;
  if (hasParentInjector(parentLoc)) {
    const parentIndex = getParentInjectorIndex(parentLoc);
    const parentLView = getParentInjectorView(parentLoc, lView);
    const parentData = parentLView[TVIEW].data;
    for (let i = 0; i < 8; i++) {
      lView[injectorIndex + i] = parentLView[parentIndex + i] | parentData[parentIndex + i];
    }
  }
  lView[
    injectorIndex + 8
    /* NodeInjectorOffset.PARENT */
  ] = parentLoc;
  return injectorIndex;
}
function insertBloom(arr, footer) {
  arr.push(0, 0, 0, 0, 0, 0, 0, 0, footer);
}
function getInjectorIndex(tNode, lView) {
  if (tNode.injectorIndex === -1 || // If the injector index is the same as its parent's injector index, then the index has been
  // copied down from the parent node. No injector has been created yet on this node.
  tNode.parent && tNode.parent.injectorIndex === tNode.injectorIndex || // After the first template pass, the injector index might exist but the parent values
  // might not have been calculated yet for this instance
  lView[
    tNode.injectorIndex + 8
    /* NodeInjectorOffset.PARENT */
  ] === null) {
    return -1;
  } else {
    return tNode.injectorIndex;
  }
}
function getParentInjectorLocation(tNode, lView) {
  if (tNode.parent && tNode.parent.injectorIndex !== -1) {
    return tNode.parent.injectorIndex;
  }
  let declarationViewOffset = 0;
  let parentTNode = null;
  let lViewCursor = lView;
  while (lViewCursor !== null) {
    parentTNode = getTNodeFromLView(lViewCursor);
    if (parentTNode === null) {
      return NO_PARENT_INJECTOR;
    }
    declarationViewOffset++;
    lViewCursor = lViewCursor[DECLARATION_VIEW];
    if (parentTNode.injectorIndex !== -1) {
      return parentTNode.injectorIndex | declarationViewOffset << 16;
    }
  }
  return NO_PARENT_INJECTOR;
}
function diPublicInInjector(injectorIndex, tView, token) {
  bloomAdd(injectorIndex, tView, token);
}
function notFoundValueOrThrow(notFoundValue, token, flags) {
  if (flags & 8 || notFoundValue !== void 0) {
    return notFoundValue;
  } else {
    throwProviderNotFoundError();
  }
}
function lookupTokenUsingModuleInjector(lView, token, flags, notFoundValue) {
  if (flags & 8 && notFoundValue === void 0) {
    notFoundValue = null;
  }
  if ((flags & (2 | 1)) === 0) {
    const moduleInjector = lView[INJECTOR];
    const previousInjectImplementation = setInjectImplementation(void 0);
    try {
      if (moduleInjector) {
        return moduleInjector.get(
          token,
          notFoundValue,
          flags & 8
          /* InternalInjectFlags.Optional */
        );
      } else {
        return injectRootLimpMode(
          token,
          notFoundValue,
          flags & 8
          /* InternalInjectFlags.Optional */
        );
      }
    } finally {
      setInjectImplementation(previousInjectImplementation);
    }
  }
  return notFoundValueOrThrow(notFoundValue, token, flags);
}
function getOrCreateInjectable(tNode, lView, token, flags = 0, notFoundValue) {
  if (tNode !== null) {
    if (lView[FLAGS] & 2048 && // The token must be present on the current node injector when the `Self`
    // flag is set, so the lookup on embedded view injector(s) can be skipped.
    !(flags & 2)) {
      const embeddedInjectorValue = lookupTokenUsingEmbeddedInjector(tNode, lView, token, flags, NOT_FOUND);
      if (embeddedInjectorValue !== NOT_FOUND) {
        return embeddedInjectorValue;
      }
    }
    const value = lookupTokenUsingNodeInjector(tNode, lView, token, flags, NOT_FOUND);
    if (value !== NOT_FOUND) {
      return value;
    }
  }
  return lookupTokenUsingModuleInjector(lView, token, flags, notFoundValue);
}
function lookupTokenUsingNodeInjector(tNode, lView, token, flags, notFoundValue) {
  const bloomHash = bloomHashBitOrFactory(token);
  if (typeof bloomHash === "function") {
    if (!enterDI(lView, tNode, flags)) {
      return flags & 1 ? notFoundValueOrThrow(notFoundValue, token, flags) : lookupTokenUsingModuleInjector(lView, token, flags, notFoundValue);
    }
    try {
      let value;
      if (false) ; else {
        value = bloomHash(flags);
      }
      if (value == null && !(flags & 8)) {
        throwProviderNotFoundError(token);
      } else {
        return value;
      }
    } finally {
      leaveDI();
    }
  } else if (typeof bloomHash === "number") {
    let previousTView = null;
    let injectorIndex = getInjectorIndex(tNode, lView);
    let parentLocation = NO_PARENT_INJECTOR;
    let hostTElementNode = flags & 1 ? lView[DECLARATION_COMPONENT_VIEW][T_HOST] : null;
    if (injectorIndex === -1 || flags & 4) {
      parentLocation = injectorIndex === -1 ? getParentInjectorLocation(tNode, lView) : lView[
        injectorIndex + 8
        /* NodeInjectorOffset.PARENT */
      ];
      if (parentLocation === NO_PARENT_INJECTOR || !shouldSearchParent(flags, false)) {
        injectorIndex = -1;
      } else {
        previousTView = lView[TVIEW];
        injectorIndex = getParentInjectorIndex(parentLocation);
        lView = getParentInjectorView(parentLocation, lView);
      }
    }
    while (injectorIndex !== -1) {
      const tView = lView[TVIEW];
      if (bloomHasToken(bloomHash, injectorIndex, tView.data)) {
        const instance = searchTokensOnInjector(injectorIndex, lView, token, previousTView, flags, hostTElementNode);
        if (instance !== NOT_FOUND) {
          return instance;
        }
      }
      parentLocation = lView[
        injectorIndex + 8
        /* NodeInjectorOffset.PARENT */
      ];
      if (parentLocation !== NO_PARENT_INJECTOR && shouldSearchParent(flags, lView[TVIEW].data[
        injectorIndex + 8
        /* NodeInjectorOffset.TNODE */
      ] === hostTElementNode) && bloomHasToken(bloomHash, injectorIndex, lView)) {
        previousTView = tView;
        injectorIndex = getParentInjectorIndex(parentLocation);
        lView = getParentInjectorView(parentLocation, lView);
      } else {
        injectorIndex = -1;
      }
    }
  }
  return notFoundValue;
}
function searchTokensOnInjector(injectorIndex, lView, token, previousTView, flags, hostTElementNode) {
  const currentTView = lView[TVIEW];
  const tNode = currentTView.data[
    injectorIndex + 8
    /* NodeInjectorOffset.TNODE */
  ];
  const canAccessViewProviders = previousTView == null ? (
    // 1) This is the first invocation `previousTView == null` which means that we are at the
    // `TNode` of where injector is starting to look. In such a case the only time we are allowed
    // to look into the ViewProviders is if:
    // - we are on a component
    // - AND the injector set `includeViewProviders` to true (implying that the token can see
    // ViewProviders because it is the Component or a Service which itself was declared in
    // ViewProviders)
    isComponentHost(tNode) && includeViewProviders
  ) : (
    // 2) `previousTView != null` which means that we are now walking across the parent nodes.
    // In such a case we are only allowed to look into the ViewProviders if:
    // - We just crossed from child View to Parent View `previousTView != currentTView`
    // - AND the parent TNode is an Element.
    // This means that we just came from the Component's View and therefore are allowed to see
    // into the ViewProviders.
    previousTView != currentTView && (tNode.type & 3) !== 0
  );
  const isHostSpecialCase = flags & 1 && hostTElementNode === tNode;
  const injectableIdx = locateDirectiveOrProvider(tNode, currentTView, token, canAccessViewProviders, isHostSpecialCase);
  if (injectableIdx !== null) {
    return getNodeInjectable(lView, currentTView, injectableIdx, tNode, flags);
  } else {
    return NOT_FOUND;
  }
}
function locateDirectiveOrProvider(tNode, tView, token, canAccessViewProviders, isHostSpecialCase) {
  const nodeProviderIndexes = tNode.providerIndexes;
  const tInjectables = tView.data;
  const injectablesStart = nodeProviderIndexes & 1048575;
  const directivesStart = tNode.directiveStart;
  const directiveEnd = tNode.directiveEnd;
  const cptViewProvidersCount = nodeProviderIndexes >> 20;
  const startingIndex = canAccessViewProviders ? injectablesStart : injectablesStart + cptViewProvidersCount;
  const endIndex = isHostSpecialCase ? injectablesStart + cptViewProvidersCount : directiveEnd;
  for (let i = startingIndex; i < endIndex; i++) {
    const providerTokenOrDef = tInjectables[i];
    if (i < directivesStart && token === providerTokenOrDef || i >= directivesStart && providerTokenOrDef.type === token) {
      return i;
    }
  }
  if (isHostSpecialCase) {
    const dirDef = tInjectables[directivesStart];
    if (dirDef && isComponentDef(dirDef) && dirDef.type === token) {
      return directivesStart;
    }
  }
  return null;
}
function getNodeInjectable(lView, tView, index, tNode, flags) {
  let value = lView[index];
  const tData = tView.data;
  if (value instanceof NodeInjectorFactory) {
    const factory = value;
    if (factory.resolving) {
      stringifyForError(tData[index]);
      {
        throw cyclicDependencyError();
      }
    }
    const previousIncludeViewProviders = setIncludeViewProviders(factory.canSeeViewProviders);
    factory.resolving = true;
    tData[index].type || tData[index];
    const previousInjectImplementation = factory.injectImpl ? setInjectImplementation(factory.injectImpl) : null;
    enterDI(
      lView,
      tNode,
      0
      /* InternalInjectFlags.Default */
    );
    try {
      value = lView[index] = factory.factory(void 0, flags, tData, lView, tNode);
      if (tView.firstCreatePass && index >= tNode.directiveStart) {
        registerPreOrderHooks(index, tData[index], tView);
      }
    } finally {
      previousInjectImplementation !== null && setInjectImplementation(previousInjectImplementation);
      setIncludeViewProviders(previousIncludeViewProviders);
      factory.resolving = false;
      leaveDI();
    }
  }
  return value;
}
function bloomHashBitOrFactory(token) {
  if (typeof token === "string") {
    return token.charCodeAt(0) || 0;
  }
  const tokenId = (
    // First check with `hasOwnProperty` so we don't get an inherited ID.
    token.hasOwnProperty(NG_ELEMENT_ID) ? token[NG_ELEMENT_ID] : void 0
  );
  if (typeof tokenId === "number") {
    if (tokenId >= 0) {
      return tokenId & BLOOM_MASK;
    } else {
      return createNodeInjector;
    }
  } else {
    return tokenId;
  }
}
function bloomHasToken(bloomHash, injectorIndex, injectorView) {
  const mask = 1 << bloomHash;
  const value = injectorView[injectorIndex + (bloomHash >> BLOOM_BUCKET_BITS)];
  return !!(value & mask);
}
function shouldSearchParent(flags, isFirstHostTNode) {
  return !(flags & 2) && !(flags & 1 && isFirstHostTNode);
}
class NodeInjector {
  _tNode;
  _lView;
  constructor(_tNode, _lView) {
    this._tNode = _tNode;
    this._lView = _lView;
  }
  get(token, notFoundValue, flags) {
    return getOrCreateInjectable(this._tNode, this._lView, token, convertToBitFlags(flags), notFoundValue);
  }
}
function createNodeInjector() {
  return new NodeInjector(getCurrentTNode(), getLView());
}
function lookupTokenUsingEmbeddedInjector(tNode, lView, token, flags, notFoundValue) {
  let currentTNode = tNode;
  let currentLView = lView;
  while (currentTNode !== null && currentLView !== null && currentLView[FLAGS] & 2048 && !isRootView(currentLView)) {
    const nodeInjectorValue = lookupTokenUsingNodeInjector(currentTNode, currentLView, token, flags | 2, NOT_FOUND);
    if (nodeInjectorValue !== NOT_FOUND) {
      return nodeInjectorValue;
    }
    let parentTNode = currentTNode.parent;
    if (!parentTNode) {
      const embeddedViewInjector = currentLView[EMBEDDED_VIEW_INJECTOR];
      if (embeddedViewInjector) {
        const embeddedViewInjectorValue = embeddedViewInjector.get(token, NOT_FOUND, flags);
        if (embeddedViewInjectorValue !== NOT_FOUND) {
          return embeddedViewInjectorValue;
        }
      }
      parentTNode = getTNodeFromLView(currentLView);
      currentLView = currentLView[DECLARATION_VIEW];
    }
    currentTNode = parentTNode;
  }
  return notFoundValue;
}
function getTNodeFromLView(lView) {
  const tView = lView[TVIEW];
  const tViewType = tView.type;
  if (tViewType === 2) {
    return tView.declTNode;
  } else if (tViewType === 1) {
    return lView[T_HOST];
  }
  return null;
}
function injectElementRef() {
  return createElementRef(getCurrentTNode(), getLView());
}
function createElementRef(tNode, lView) {
  return new ElementRef(getNativeByTNode(tNode, lView));
}
let ElementRef = /* @__PURE__ */ (() => {
  class ElementRef2 {
    /**
     * <div class="docs-alert docs-alert-important">
     *   <header>Use with caution</header>
     *   <p>
     *    Use this API as the last resort when direct access to DOM is needed. Use templating and
     *    data-binding provided by Angular instead. If used, it is recommended in combination with
     *    {@link /best-practices/security#direct-use-of-the-dom-apis-and-explicit-sanitization-calls DomSanitizer}
     *    for maxiumum security;
     *   </p>
     * </div>
     */
    nativeElement;
    constructor(nativeElement) {
      this.nativeElement = nativeElement;
    }
    /**
     * @internal
     * @nocollapse
     */
    static __NG_ELEMENT_ID__ = injectElementRef;
  }
  return ElementRef2;
})();
const SKIP_HYDRATION_ATTR_NAME = "ngSkipHydration";
const SKIP_HYDRATION_ATTR_NAME_LOWER_CASE = "ngskiphydration";
function hasSkipHydrationAttrOnTNode(tNode) {
  const attrs = tNode.mergedAttrs;
  if (attrs === null) return false;
  for (let i = 0; i < attrs.length; i += 2) {
    const value = attrs[i];
    if (typeof value === "number") return false;
    if (typeof value === "string" && value.toLowerCase() === SKIP_HYDRATION_ATTR_NAME_LOWER_CASE) {
      return true;
    }
  }
  return false;
}
function hasInSkipHydrationBlockFlag(tNode) {
  return (tNode.flags & 128) === 128;
}
function isInSkipHydrationBlock(tNode) {
  if (hasInSkipHydrationBlockFlag(tNode)) {
    return true;
  }
  let currentTNode = tNode.parent;
  while (currentTNode) {
    if (hasInSkipHydrationBlockFlag(tNode) || hasSkipHydrationAttrOnTNode(currentTNode)) {
      return true;
    }
    currentTNode = currentTNode.parent;
  }
  return false;
}
function isI18nInSkipHydrationBlock(parentTNode) {
  return hasInSkipHydrationBlockFlag(parentTNode) || hasSkipHydrationAttrOnTNode(parentTNode) || isInSkipHydrationBlock(parentTNode);
}
var ChangeDetectionStrategy = /* @__PURE__ */ (function(ChangeDetectionStrategy2) {
  ChangeDetectionStrategy2[ChangeDetectionStrategy2["OnPush"] = 0] = "OnPush";
  ChangeDetectionStrategy2[ChangeDetectionStrategy2["Default"] = 1] = "Default";
  return ChangeDetectionStrategy2;
})(ChangeDetectionStrategy || {});
const TRACKED_LVIEWS = /* @__PURE__ */ new Map();
let uniqueIdCounter = 0;
function getUniqueLViewId() {
  return uniqueIdCounter++;
}
function registerLView(lView) {
  TRACKED_LVIEWS.set(lView[ID], lView);
}
function unregisterLView(lView) {
  TRACKED_LVIEWS.delete(lView[ID]);
}
const MONKEY_PATCH_KEY_NAME = "__ngContext__";
function attachPatchData(target, data) {
  if (isLView(data)) {
    target[MONKEY_PATCH_KEY_NAME] = data[ID];
    registerLView(data);
  } else {
    target[MONKEY_PATCH_KEY_NAME] = data;
  }
}
function getFirstLContainer(lView) {
  return getNearestLContainer(lView[CHILD_HEAD]);
}
function getNextLContainer(container) {
  return getNearestLContainer(container[NEXT]);
}
function getNearestLContainer(viewOrContainer) {
  while (viewOrContainer !== null && !isLContainer(viewOrContainer)) {
    viewOrContainer = viewOrContainer[NEXT];
  }
  return viewOrContainer;
}
let DOCUMENT = void 0;
function setDocument(document2) {
  DOCUMENT = document2;
}
function getDocument() {
  if (DOCUMENT !== void 0) {
    return DOCUMENT;
  } else if (typeof document !== "undefined") {
    return document;
  }
  throw new RuntimeError(210, false);
}
const APP_ID = /* @__PURE__ */ new InjectionToken("", {
  providedIn: "root",
  factory: () => DEFAULT_APP_ID
});
const DEFAULT_APP_ID = "ng";
const PLATFORM_INITIALIZER = /* @__PURE__ */ new InjectionToken("");
const PLATFORM_ID = /* @__PURE__ */ new InjectionToken("", {
  providedIn: "platform",
  factory: () => "unknown"
  // set a default platform name, when none set explicitly
});
const CSP_NONCE = /* @__PURE__ */ new InjectionToken("", {
  providedIn: "root",
  factory: () => {
    return getDocument().body?.querySelector("[ngCspNonce]")?.getAttribute("ngCspNonce") || null;
  }
});
const IMAGE_CONFIG_DEFAULTS = {
  breakpoints: [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  placeholderResolution: 30,
  disableImageSizeWarning: false,
  disableImageLazyLoadWarning: false
};
const IMAGE_CONFIG = /* @__PURE__ */ new InjectionToken("", {
  providedIn: "root",
  factory: () => IMAGE_CONFIG_DEFAULTS
});
function makeStateKey(key) {
  return key;
}
function initTransferState() {
  const transferState = new TransferState();
  return transferState;
}
let TransferState = /* @__PURE__ */ (() => {
  class TransferState2 {
    /** @nocollapse */
    static ɵprov = (
      /** @pureOrBreakMyCode */
      /* @__PURE__ */ ɵɵdefineInjectable({
        token: TransferState2,
        providedIn: "root",
        factory: initTransferState
      })
    );
    /** @internal */
    store = {};
    onSerializeCallbacks = {};
    /**
     * Get the value corresponding to a key. Return `defaultValue` if key is not found.
     */
    get(key, defaultValue) {
      return this.store[key] !== void 0 ? this.store[key] : defaultValue;
    }
    /**
     * Set the value corresponding to a key.
     */
    set(key, value) {
      this.store[key] = value;
    }
    /**
     * Remove a key from the store.
     */
    remove(key) {
      delete this.store[key];
    }
    /**
     * Test whether a key exists in the store.
     */
    hasKey(key) {
      return this.store.hasOwnProperty(key);
    }
    /**
     * Indicates whether the state is empty.
     */
    get isEmpty() {
      return Object.keys(this.store).length === 0;
    }
    /**
     * Register a callback to provide the value for a key when `toJson` is called.
     */
    onSerialize(key, callback) {
      this.onSerializeCallbacks[key] = callback;
    }
    /**
     * Serialize the current state of the store to JSON.
     */
    toJson() {
      for (const key in this.onSerializeCallbacks) {
        if (this.onSerializeCallbacks.hasOwnProperty(key)) {
          try {
            this.store[key] = this.onSerializeCallbacks[key]();
          } catch (e) {
            console.warn("Exception in onSerialize callback: ", e);
          }
        }
      }
      return JSON.stringify(this.store).replace(/</g, "\\u003C");
    }
  }
  return TransferState2;
})();
const REFERENCE_NODE_HOST = "h";
const REFERENCE_NODE_BODY = "b";
const NODE_NAVIGATION_STEP_FIRST_CHILD = "f";
const NODE_NAVIGATION_STEP_NEXT_SIBLING = "n";
const ELEMENT_CONTAINERS = "e";
const TEMPLATES = "t";
const CONTAINERS = "c";
const MULTIPLIER = "x";
const NUM_ROOT_NODES = "r";
const TEMPLATE_ID = "i";
const NODES = "n";
const DISCONNECTED_NODES = "d";
const I18N_DATA = "l";
const DEFER_BLOCK_ID = "di";
const DEFER_BLOCK_STATE$1 = "s";
const DEFER_PARENT_BLOCK_ID = "p";
const DEFER_HYDRATE_TRIGGERS = "t";
const IS_HYDRATION_DOM_REUSE_ENABLED = /* @__PURE__ */ new InjectionToken("");
const PRESERVE_HOST_CONTENT_DEFAULT = false;
const PRESERVE_HOST_CONTENT = /* @__PURE__ */ new InjectionToken("", {
  providedIn: "root",
  factory: () => PRESERVE_HOST_CONTENT_DEFAULT
});
const IS_I18N_HYDRATION_ENABLED = /* @__PURE__ */ new InjectionToken("");
const IS_EVENT_REPLAY_ENABLED = /* @__PURE__ */ new InjectionToken("");
const EVENT_REPLAY_ENABLED_DEFAULT = false;
const IS_INCREMENTAL_HYDRATION_ENABLED = /* @__PURE__ */ new InjectionToken("");
const interactionEventNames = ["click", "keydown"];
const hoverEventNames = ["mouseenter", "mouseover", "focusin"];
const DEFER_BLOCK_SSR_ID_ATTRIBUTE = "ngb";
function setJSActionAttributes(nativeElement, eventTypes, parentDeferBlockId = null) {
  if (eventTypes.length === 0 || nativeElement.nodeType !== Node.ELEMENT_NODE) {
    return;
  }
  const existingAttr = nativeElement.getAttribute(Attribute.JSACTION);
  const parts = eventTypes.reduce((prev, curr) => {
    return (existingAttr?.indexOf(curr) ?? -1) === -1 ? prev + curr + ":;" : prev;
  }, "");
  nativeElement.setAttribute(Attribute.JSACTION, `${existingAttr ?? ""}${parts}`);
  const blockName = parentDeferBlockId ?? "";
  if (blockName !== "" && parts.length > 0) {
    nativeElement.setAttribute(DEFER_BLOCK_SSR_ID_ATTRIBUTE, blockName);
  }
}
function isDetachedByI18n(tNode) {
  return (tNode.flags & 32) === 32;
}
const TRANSFER_STATE_TOKEN_ID = "__nghData__";
const NGH_DATA_KEY = /* @__PURE__ */ makeStateKey(TRANSFER_STATE_TOKEN_ID);
const TRANSFER_STATE_DEFER_BLOCKS_INFO = "__nghDeferData__";
const NGH_DEFER_BLOCKS_KEY = /* @__PURE__ */ makeStateKey(TRANSFER_STATE_DEFER_BLOCKS_INFO);
const NGH_ATTR_NAME = "ngh";
const SSR_CONTENT_INTEGRITY_MARKER = "nghm";
let _retrieveHydrationInfoImpl = () => null;
function retrieveHydrationInfo(rNode, injector, isRootView2 = false) {
  return _retrieveHydrationInfoImpl();
}
function getLNodeForHydration(viewRef) {
  let lView = viewRef._lView;
  const tView = lView[TVIEW];
  if (tView.type === 2) {
    return null;
  }
  if (isRootView(lView)) {
    lView = lView[HEADER_OFFSET];
  }
  return lView;
}
function isIncrementalHydrationEnabled(injector) {
  return injector.get(IS_INCREMENTAL_HYDRATION_ENABLED, false, {
    optional: true
  });
}
function processTextNodeBeforeSerialization(context, node) {
  const el = node;
  const corruptedTextNodes = context.corruptedTextNodes;
  if (el.textContent === "") {
    corruptedTextNodes.set(
      el,
      "ngetn"
      /* TextNodeMarker.EmptyNode */
    );
  } else if (el.nextSibling?.nodeType === Node.TEXT_NODE) {
    corruptedTextNodes.set(
      el,
      "ngtns"
      /* TextNodeMarker.Separator */
    );
  }
}
function convertHydrateTriggersToJsAction(triggers) {
  let actionList = [];
  if (triggers !== null) {
    if (triggers.has(
      4
      /* DeferBlockTrigger.Hover */
    )) {
      actionList.push(...hoverEventNames);
    }
    if (triggers.has(
      3
      /* DeferBlockTrigger.Interaction */
    )) {
      actionList.push(...interactionEventNames);
    }
  }
  return actionList;
}
function refreshContentQueries(tView, lView) {
  const contentQueries = tView.contentQueries;
  if (contentQueries !== null) {
    const prevConsumer = setActiveConsumer(null);
    try {
      for (let i = 0; i < contentQueries.length; i += 2) {
        const queryStartIdx = contentQueries[i];
        const directiveDefIdx = contentQueries[i + 1];
        if (directiveDefIdx !== -1) {
          const directiveDef = tView.data[directiveDefIdx];
          setCurrentQueryIndex(queryStartIdx);
          directiveDef.contentQueries(2, lView[directiveDefIdx], directiveDefIdx);
        }
      }
    } finally {
      setActiveConsumer(prevConsumer);
    }
  }
}
function executeViewQueryFn(flags, viewQueryFn, component) {
  setCurrentQueryIndex(0);
  const prevConsumer = setActiveConsumer(null);
  try {
    viewQueryFn(flags, component);
  } finally {
    setActiveConsumer(prevConsumer);
  }
}
function executeContentQueries(tView, tNode, lView) {
  if (isContentQueryHost(tNode)) {
    const prevConsumer = setActiveConsumer(null);
    try {
      const start = tNode.directiveStart;
      const end = tNode.directiveEnd;
      for (let directiveIndex = start; directiveIndex < end; directiveIndex++) {
        const def = tView.data[directiveIndex];
        if (def.contentQueries) {
          const directiveInstance = lView[directiveIndex];
          def.contentQueries(1, directiveInstance, directiveIndex);
        }
      }
    } finally {
      setActiveConsumer(prevConsumer);
    }
  }
}
var ViewEncapsulation = /* @__PURE__ */ (function(ViewEncapsulation2) {
  ViewEncapsulation2[ViewEncapsulation2["Emulated"] = 0] = "Emulated";
  ViewEncapsulation2[ViewEncapsulation2["None"] = 2] = "None";
  ViewEncapsulation2[ViewEncapsulation2["ShadowDom"] = 3] = "ShadowDom";
  return ViewEncapsulation2;
})(ViewEncapsulation || {});
class SafeValueImpl {
  changingThisBreaksApplicationSecurity;
  constructor(changingThisBreaksApplicationSecurity) {
    this.changingThisBreaksApplicationSecurity = changingThisBreaksApplicationSecurity;
  }
  toString() {
    return `SafeValue must use [property]=binding: ${this.changingThisBreaksApplicationSecurity} (see ${XSS_SECURITY_URL})`;
  }
}
function unwrapSafeValue(value) {
  return value instanceof SafeValueImpl ? value.changingThisBreaksApplicationSecurity : value;
}
function allowSanitizationBypassAndThrow(value, type) {
  const actualType = getSanitizationBypassType(value);
  if (actualType != null && actualType !== type) {
    if (actualType === "ResourceURL" && type === "URL") return true;
    throw new Error(`Required a safe ${type}, got a ${actualType} (see ${XSS_SECURITY_URL})`);
  }
  return actualType === type;
}
function getSanitizationBypassType(value) {
  return value instanceof SafeValueImpl && value.getTypeName() || null;
}
const SAFE_URL_PATTERN = /^(?!javascript:)(?:[a-z0-9+.-]+:|[^&:\/?#]*(?:[\/?#]|$))/i;
function _sanitizeUrl(url) {
  url = String(url);
  if (url.match(SAFE_URL_PATTERN)) return url;
  return "unsafe:" + url;
}
var SecurityContext = /* @__PURE__ */ (function(SecurityContext2) {
  SecurityContext2[SecurityContext2["NONE"] = 0] = "NONE";
  SecurityContext2[SecurityContext2["HTML"] = 1] = "HTML";
  SecurityContext2[SecurityContext2["STYLE"] = 2] = "STYLE";
  SecurityContext2[SecurityContext2["SCRIPT"] = 3] = "SCRIPT";
  SecurityContext2[SecurityContext2["URL"] = 4] = "URL";
  SecurityContext2[SecurityContext2["RESOURCE_URL"] = 5] = "RESOURCE_URL";
  return SecurityContext2;
})(SecurityContext || {});
function ɵɵsanitizeUrl(unsafeUrl) {
  const sanitizer = getSanitizer();
  if (sanitizer) {
    return sanitizer.sanitize(SecurityContext.URL, unsafeUrl) || "";
  }
  if (allowSanitizationBypassAndThrow(
    unsafeUrl,
    "URL"
    /* BypassType.Url */
  )) {
    return unwrapSafeValue(unsafeUrl);
  }
  return _sanitizeUrl(renderStringify(unsafeUrl));
}
function getSanitizer() {
  const lView = getLView();
  return lView && lView[ENVIRONMENT].sanitizer;
}
function maybeUnwrapFn(value) {
  if (value instanceof Function) {
    return value();
  } else {
    return value;
  }
}
function assertStandaloneComponentType(type) {
  assertComponentDef(type);
  const componentDef = getComponentDef(type);
  if (!componentDef.standalone) {
    throw new RuntimeError(907, `The ${stringifyForError(type)} component is not marked as standalone, but Angular expects to have a standalone component here. Please make sure the ${stringifyForError(type)} component has the \`standalone: true\` flag in the decorator.`);
  }
}
function assertComponentDef(type) {
  if (!getComponentDef(type)) {
    throw new RuntimeError(906, `The ${stringifyForError(type)} is not an Angular component, make sure it has the \`@Component\` decorator.`);
  }
}
function classIndexOf(className, classToSearch, startingIndex) {
  let end = className.length;
  while (true) {
    const foundIndex = className.indexOf(classToSearch, startingIndex);
    if (foundIndex === -1) return foundIndex;
    if (foundIndex === 0 || className.charCodeAt(foundIndex - 1) <= 32) {
      const length = classToSearch.length;
      if (foundIndex + length === end || className.charCodeAt(foundIndex + length) <= 32) {
        return foundIndex;
      }
    }
    startingIndex = foundIndex + 1;
  }
}
const NG_TEMPLATE_SELECTOR = "ng-template";
function isCssClassMatching(tNode, attrs, cssClassToMatch, isProjectionMode) {
  let i = 0;
  if (isProjectionMode) {
    for (; i < attrs.length && typeof attrs[i] === "string"; i += 2) {
      if (attrs[i] === "class" && classIndexOf(attrs[i + 1].toLowerCase(), cssClassToMatch, 0) !== -1) {
        return true;
      }
    }
  } else if (isInlineTemplate(tNode)) {
    return false;
  }
  i = attrs.indexOf(1, i);
  if (i > -1) {
    let item;
    while (++i < attrs.length && typeof (item = attrs[i]) === "string") {
      if (item.toLowerCase() === cssClassToMatch) {
        return true;
      }
    }
  }
  return false;
}
function isInlineTemplate(tNode) {
  return tNode.type === 4 && tNode.value !== NG_TEMPLATE_SELECTOR;
}
function hasTagAndTypeMatch(tNode, currentSelector, isProjectionMode) {
  const tagNameToCompare = tNode.type === 4 && !isProjectionMode ? NG_TEMPLATE_SELECTOR : tNode.value;
  return currentSelector === tagNameToCompare;
}
function isNodeMatchingSelector(tNode, selector, isProjectionMode) {
  let mode = 4;
  const nodeAttrs = tNode.attrs;
  const nameOnlyMarkerIdx = nodeAttrs !== null ? getNameOnlyMarkerIndex(nodeAttrs) : 0;
  let skipToNextSelector = false;
  for (let i = 0; i < selector.length; i++) {
    const current = selector[i];
    if (typeof current === "number") {
      if (!skipToNextSelector && !isPositive(mode) && !isPositive(current)) {
        return false;
      }
      if (skipToNextSelector && isPositive(current)) continue;
      skipToNextSelector = false;
      mode = current | mode & 1;
      continue;
    }
    if (skipToNextSelector) continue;
    if (mode & 4) {
      mode = 2 | mode & 1;
      if (current !== "" && !hasTagAndTypeMatch(tNode, current, isProjectionMode) || current === "" && selector.length === 1) {
        if (isPositive(mode)) return false;
        skipToNextSelector = true;
      }
    } else if (mode & 8) {
      if (nodeAttrs === null || !isCssClassMatching(tNode, nodeAttrs, current, isProjectionMode)) {
        if (isPositive(mode)) return false;
        skipToNextSelector = true;
      }
    } else {
      const selectorAttrValue = selector[++i];
      const attrIndexInNode = findAttrIndexInNode(current, nodeAttrs, isInlineTemplate(tNode), isProjectionMode);
      if (attrIndexInNode === -1) {
        if (isPositive(mode)) return false;
        skipToNextSelector = true;
        continue;
      }
      if (selectorAttrValue !== "") {
        let nodeAttrValue;
        if (attrIndexInNode > nameOnlyMarkerIdx) {
          nodeAttrValue = "";
        } else {
          nodeAttrValue = nodeAttrs[attrIndexInNode + 1].toLowerCase();
        }
        if (mode & 2 && selectorAttrValue !== nodeAttrValue) {
          if (isPositive(mode)) return false;
          skipToNextSelector = true;
        }
      }
    }
  }
  return isPositive(mode) || skipToNextSelector;
}
function isPositive(mode) {
  return (mode & 1) === 0;
}
function findAttrIndexInNode(name, attrs, isInlineTemplate2, isProjectionMode) {
  if (attrs === null) return -1;
  let i = 0;
  if (isProjectionMode || !isInlineTemplate2) {
    let bindingsMode = false;
    while (i < attrs.length) {
      const maybeAttrName = attrs[i];
      if (maybeAttrName === name) {
        return i;
      } else if (maybeAttrName === 3 || maybeAttrName === 6) {
        bindingsMode = true;
      } else if (maybeAttrName === 1 || maybeAttrName === 2) {
        let value = attrs[++i];
        while (typeof value === "string") {
          value = attrs[++i];
        }
        continue;
      } else if (maybeAttrName === 4) {
        break;
      } else if (maybeAttrName === 0) {
        i += 4;
        continue;
      }
      i += bindingsMode ? 1 : 2;
    }
    return -1;
  } else {
    return matchTemplateAttribute(attrs, name);
  }
}
function isNodeMatchingSelectorList(tNode, selector, isProjectionMode = false) {
  for (let i = 0; i < selector.length; i++) {
    if (isNodeMatchingSelector(tNode, selector[i], isProjectionMode)) {
      return true;
    }
  }
  return false;
}
function getNameOnlyMarkerIndex(nodeAttrs) {
  for (let i = 0; i < nodeAttrs.length; i++) {
    const nodeAttr = nodeAttrs[i];
    if (isNameOnlyAttributeMarker(nodeAttr)) {
      return i;
    }
  }
  return nodeAttrs.length;
}
function matchTemplateAttribute(attrs, name) {
  let i = attrs.indexOf(
    4
    /* AttributeMarker.Template */
  );
  if (i > -1) {
    i++;
    while (i < attrs.length) {
      const attr = attrs[i];
      if (typeof attr === "number") return -1;
      if (attr === name) return i;
      i++;
    }
  }
  return -1;
}
function maybeWrapInNotSelector(isNegativeMode, chunk) {
  return isNegativeMode ? ":not(" + chunk.trim() + ")" : chunk;
}
function stringifyCSSSelector(selector) {
  let result = selector[0];
  let i = 1;
  let mode = 2;
  let currentChunk = "";
  let isNegativeMode = false;
  while (i < selector.length) {
    let valueOrMarker = selector[i];
    if (typeof valueOrMarker === "string") {
      if (mode & 2) {
        const attrValue = selector[++i];
        currentChunk += "[" + valueOrMarker + (attrValue.length > 0 ? '="' + attrValue + '"' : "") + "]";
      } else if (mode & 8) {
        currentChunk += "." + valueOrMarker;
      } else if (mode & 4) {
        currentChunk += " " + valueOrMarker;
      }
    } else {
      if (currentChunk !== "" && !isPositive(valueOrMarker)) {
        result += maybeWrapInNotSelector(isNegativeMode, currentChunk);
        currentChunk = "";
      }
      mode = valueOrMarker;
      isNegativeMode = isNegativeMode || !isPositive(mode);
    }
    i++;
  }
  if (currentChunk !== "") {
    result += maybeWrapInNotSelector(isNegativeMode, currentChunk);
  }
  return result;
}
function stringifyCSSSelectorList(selectorList) {
  return selectorList.map(stringifyCSSSelector).join(",");
}
function extractAttrsAndClassesFromSelector(selector) {
  const attrs = [];
  const classes = [];
  let i = 1;
  let mode = 2;
  while (i < selector.length) {
    let valueOrMarker = selector[i];
    if (typeof valueOrMarker === "string") {
      if (mode === 2) {
        if (valueOrMarker !== "") {
          attrs.push(valueOrMarker, selector[++i]);
        }
      } else if (mode === 8) {
        classes.push(valueOrMarker);
      }
    } else {
      if (!isPositive(mode)) break;
      mode = valueOrMarker;
    }
    i++;
  }
  if (classes.length) {
    attrs.push(1, ...classes);
  }
  return attrs;
}
const NO_CHANGE = {};
function createTextNode(renderer, value) {
  return renderer.createText(value);
}
function updateTextNode(renderer, rNode, value) {
  renderer.setValue(rNode, value);
}
function createElementNode(renderer, name, namespace) {
  return renderer.createElement(name, namespace);
}
function nativeInsertBefore(renderer, parent, child, beforeNode, isMove) {
  renderer.insertBefore(parent, child, beforeNode, isMove);
}
function nativeAppendChild(renderer, parent, child) {
  renderer.appendChild(parent, child);
}
function nativeAppendOrInsertBefore(renderer, parent, child, beforeNode, isMove) {
  if (beforeNode !== null) {
    nativeInsertBefore(renderer, parent, child, beforeNode, isMove);
  } else {
    nativeAppendChild(renderer, parent, child);
  }
}
function nativeRemoveNode(renderer, rNode, isHostElement) {
  renderer.removeChild(null, rNode, isHostElement);
}
function writeDirectStyle(renderer, element, newValue) {
  renderer.setAttribute(element, "style", newValue);
}
function writeDirectClass(renderer, element, newValue) {
  if (newValue === "") {
    renderer.removeAttribute(element, "class");
  } else {
    renderer.setAttribute(element, "class", newValue);
  }
}
function setupStaticAttributes(renderer, element, tNode) {
  const {
    mergedAttrs,
    classes,
    styles
  } = tNode;
  if (mergedAttrs !== null) {
    setUpAttributes(renderer, element, mergedAttrs);
  }
  if (classes !== null) {
    writeDirectClass(renderer, element, classes);
  }
  if (styles !== null) {
    writeDirectStyle(renderer, element, styles);
  }
}
function createTView(type, declTNode, templateFn, decls, vars, directives, pipes, viewQuery, schemas, constsOrFactory, ssrId) {
  const bindingStartIndex = HEADER_OFFSET + decls;
  const initialViewLength = bindingStartIndex + vars;
  const blueprint = createViewBlueprint(bindingStartIndex, initialViewLength);
  const consts = typeof constsOrFactory === "function" ? constsOrFactory() : constsOrFactory;
  const tView = blueprint[TVIEW] = {
    type,
    blueprint,
    template: templateFn,
    queries: null,
    viewQuery,
    declTNode,
    data: blueprint.slice().fill(null, bindingStartIndex),
    bindingStartIndex,
    expandoStartIndex: initialViewLength,
    hostBindingOpCodes: null,
    firstCreatePass: true,
    firstUpdatePass: true,
    staticViewQueries: false,
    staticContentQueries: false,
    preOrderHooks: null,
    preOrderCheckHooks: null,
    contentHooks: null,
    contentCheckHooks: null,
    viewHooks: null,
    viewCheckHooks: null,
    destroyHooks: null,
    cleanup: null,
    contentQueries: null,
    components: null,
    directiveRegistry: typeof directives === "function" ? directives() : directives,
    pipeRegistry: typeof pipes === "function" ? pipes() : pipes,
    firstChild: null,
    schemas,
    consts,
    incompleteFirstPass: false,
    ssrId
  };
  return tView;
}
function createViewBlueprint(bindingStartIndex, initialViewLength) {
  const blueprint = [];
  for (let i = 0; i < initialViewLength; i++) {
    blueprint.push(i < bindingStartIndex ? null : NO_CHANGE);
  }
  return blueprint;
}
function getOrCreateComponentTView(def) {
  const tView = def.tView;
  if (tView === null || tView.incompleteFirstPass) {
    const declTNode = null;
    return def.tView = createTView(1, declTNode, def.template, def.decls, def.vars, def.directiveDefs, def.pipeDefs, def.viewQuery, def.schemas, def.consts, def.id);
  }
  return tView;
}
function createLView(parentLView, tView, context, flags, host, tHostNode, environment, renderer, injector, embeddedViewInjector, hydrationInfo) {
  const lView = tView.blueprint.slice();
  lView[HOST] = host;
  lView[FLAGS] = flags | 4 | 128 | 8 | 64 | 1024;
  if (embeddedViewInjector !== null || parentLView && parentLView[FLAGS] & 2048) {
    lView[FLAGS] |= 2048;
  }
  resetPreOrderHookFlags(lView);
  lView[PARENT] = lView[DECLARATION_VIEW] = parentLView;
  lView[CONTEXT] = context;
  lView[ENVIRONMENT] = environment || parentLView && parentLView[ENVIRONMENT];
  lView[RENDERER] = renderer || parentLView && parentLView[RENDERER];
  lView[INJECTOR] = injector || parentLView && parentLView[INJECTOR] || null;
  lView[T_HOST] = tHostNode;
  lView[ID] = getUniqueLViewId();
  lView[HYDRATION] = hydrationInfo;
  lView[EMBEDDED_VIEW_INJECTOR] = embeddedViewInjector;
  lView[DECLARATION_COMPONENT_VIEW] = tView.type == 2 ? parentLView[DECLARATION_COMPONENT_VIEW] : lView;
  return lView;
}
function createComponentLView(lView, hostTNode, def) {
  const native = getNativeByTNode(hostTNode, lView);
  const tView = getOrCreateComponentTView(def);
  const rendererFactory = lView[ENVIRONMENT].rendererFactory;
  const componentView = addToEndOfViewTree(lView, createLView(lView, tView, null, getInitialLViewFlagsFromDef(def), native, hostTNode, null, rendererFactory.createRenderer(native, def), null, null, null));
  return lView[hostTNode.index] = componentView;
}
function getInitialLViewFlagsFromDef(def) {
  let flags = 16;
  if (def.signals) {
    flags = 4096;
  } else if (def.onPush) {
    flags = 64;
  }
  return flags;
}
function allocExpando(tView, lView, numSlotsToAlloc, initialValue) {
  if (numSlotsToAlloc === 0) return -1;
  const allocIdx = lView.length;
  for (let i = 0; i < numSlotsToAlloc; i++) {
    lView.push(initialValue);
    tView.blueprint.push(initialValue);
    tView.data.push(null);
  }
  return allocIdx;
}
function addToEndOfViewTree(lView, lViewOrLContainer) {
  if (lView[CHILD_HEAD]) {
    lView[CHILD_TAIL][NEXT] = lViewOrLContainer;
  } else {
    lView[CHILD_HEAD] = lViewOrLContainer;
  }
  lView[CHILD_TAIL] = lViewOrLContainer;
  return lViewOrLContainer;
}
function ɵɵadvance(delta = 1) {
  selectIndexInternal(getTView(), getLView(), getSelectedIndex() + delta);
}
function selectIndexInternal(tView, lView, index, checkNoChangesMode) {
  {
    const hooksInitPhaseCompleted = (lView[FLAGS] & 3) === 3;
    if (hooksInitPhaseCompleted) {
      const preOrderCheckHooks = tView.preOrderCheckHooks;
      if (preOrderCheckHooks !== null) {
        executeCheckHooks(lView, preOrderCheckHooks, index);
      }
    } else {
      const preOrderHooks = tView.preOrderHooks;
      if (preOrderHooks !== null) {
        executeInitAndCheckHooks(lView, preOrderHooks, 0, index);
      }
    }
  }
  setSelectedIndex(index);
}
var InputFlags = /* @__PURE__ */ (function(InputFlags2) {
  InputFlags2[InputFlags2["None"] = 0] = "None";
  InputFlags2[InputFlags2["SignalBased"] = 1] = "SignalBased";
  InputFlags2[InputFlags2["HasDecoratorInputTransform"] = 2] = "HasDecoratorInputTransform";
  return InputFlags2;
})(InputFlags || {});
function writeToDirectiveInput(def, instance, publicName, value) {
  const prevConsumer = setActiveConsumer(null);
  try {
    if (false) ;
    const [privateName, flags, transform] = def.inputs[publicName];
    let inputSignalNode = null;
    if ((flags & InputFlags.SignalBased) !== 0) {
      const field = instance[privateName];
      inputSignalNode = field[SIGNAL];
    }
    if (inputSignalNode !== null && inputSignalNode.transformFn !== void 0) {
      value = inputSignalNode.transformFn(value);
    } else if (transform !== null) {
      value = transform.call(instance, value);
    }
    if (def.setInput !== null) {
      def.setInput(instance, inputSignalNode, value, publicName, privateName);
    } else {
      applyValueToInputField(instance, inputSignalNode, privateName, value);
    }
  } finally {
    setActiveConsumer(prevConsumer);
  }
}
var RendererStyleFlags2 = /* @__PURE__ */ (function(RendererStyleFlags22) {
  RendererStyleFlags22[RendererStyleFlags22["Important"] = 1] = "Important";
  RendererStyleFlags22[RendererStyleFlags22["DashCase"] = 2] = "DashCase";
  return RendererStyleFlags22;
})(RendererStyleFlags2 || {});
let _icuContainerIterate;
function icuContainerIterate(tIcuContainerNode, lView) {
  return _icuContainerIterate(tIcuContainerNode, lView);
}
function applyToElementOrContainer(action, renderer, parent, lNodeToHandle, beforeNode) {
  if (lNodeToHandle != null) {
    let lContainer;
    let isComponent2 = false;
    if (isLContainer(lNodeToHandle)) {
      lContainer = lNodeToHandle;
    } else if (isLView(lNodeToHandle)) {
      isComponent2 = true;
      lNodeToHandle = lNodeToHandle[HOST];
    }
    const rNode = unwrapRNode(lNodeToHandle);
    if (action === 0 && parent !== null) {
      if (beforeNode == null) {
        nativeAppendChild(renderer, parent, rNode);
      } else {
        nativeInsertBefore(renderer, parent, rNode, beforeNode || null, true);
      }
    } else if (action === 1 && parent !== null) {
      nativeInsertBefore(renderer, parent, rNode, beforeNode || null, true);
    } else if (action === 2) {
      nativeRemoveNode(renderer, rNode, isComponent2);
    } else if (action === 3) {
      renderer.destroyNode(rNode);
    }
    if (lContainer != null) {
      applyContainer(renderer, action, lContainer, parent, beforeNode);
    }
  }
}
function removeViewFromDOM(tView, lView) {
  detachViewFromDOM(tView, lView);
  lView[HOST] = null;
  lView[T_HOST] = null;
}
function addViewToDOM(tView, parentTNode, renderer, lView, parentNativeNode, beforeNode) {
  lView[HOST] = parentNativeNode;
  lView[T_HOST] = parentTNode;
  applyView(tView, lView, renderer, 1, parentNativeNode, beforeNode);
}
function detachViewFromDOM(tView, lView) {
  lView[ENVIRONMENT].changeDetectionScheduler?.notify(
    9
    /* NotificationSource.ViewDetachedFromDOM */
  );
  applyView(tView, lView, lView[RENDERER], 2, null, null);
}
function destroyViewTree(rootView) {
  let lViewOrLContainer = rootView[CHILD_HEAD];
  if (!lViewOrLContainer) {
    return cleanUpView(rootView[TVIEW], rootView);
  }
  while (lViewOrLContainer) {
    let next = null;
    if (isLView(lViewOrLContainer)) {
      next = lViewOrLContainer[CHILD_HEAD];
    } else {
      const firstView = lViewOrLContainer[CONTAINER_HEADER_OFFSET];
      if (firstView) next = firstView;
    }
    if (!next) {
      while (lViewOrLContainer && !lViewOrLContainer[NEXT] && lViewOrLContainer !== rootView) {
        if (isLView(lViewOrLContainer)) {
          cleanUpView(lViewOrLContainer[TVIEW], lViewOrLContainer);
        }
        lViewOrLContainer = lViewOrLContainer[PARENT];
      }
      if (lViewOrLContainer === null) lViewOrLContainer = rootView;
      if (isLView(lViewOrLContainer)) {
        cleanUpView(lViewOrLContainer[TVIEW], lViewOrLContainer);
      }
      next = lViewOrLContainer && lViewOrLContainer[NEXT];
    }
    lViewOrLContainer = next;
  }
}
function detachMovedView(declarationContainer, lView) {
  const movedViews = declarationContainer[MOVED_VIEWS];
  const declarationViewIndex = movedViews.indexOf(lView);
  movedViews.splice(declarationViewIndex, 1);
}
function destroyLView(tView, lView) {
  if (isDestroyed(lView)) {
    return;
  }
  const renderer = lView[RENDERER];
  if (renderer.destroyNode) {
    applyView(tView, lView, renderer, 3, null, null);
  }
  destroyViewTree(lView);
}
function cleanUpView(tView, lView) {
  if (isDestroyed(lView)) {
    return;
  }
  const prevConsumer = setActiveConsumer(null);
  try {
    lView[FLAGS] &= ~128;
    lView[FLAGS] |= 256;
    lView[REACTIVE_TEMPLATE_CONSUMER] && consumerDestroy(lView[REACTIVE_TEMPLATE_CONSUMER]);
    executeOnDestroys(tView, lView);
    processCleanups(tView, lView);
    if (lView[TVIEW].type === 1) {
      lView[RENDERER].destroy();
    }
    const declarationContainer = lView[DECLARATION_LCONTAINER];
    if (declarationContainer !== null && isLContainer(lView[PARENT])) {
      if (declarationContainer !== lView[PARENT]) {
        detachMovedView(declarationContainer, lView);
      }
      const lQueries = lView[QUERIES];
      if (lQueries !== null) {
        lQueries.detachView(tView);
      }
    }
    unregisterLView(lView);
  } finally {
    setActiveConsumer(prevConsumer);
  }
}
function processCleanups(tView, lView) {
  const tCleanup = tView.cleanup;
  const lCleanup = lView[CLEANUP];
  if (tCleanup !== null) {
    for (let i = 0; i < tCleanup.length - 1; i += 2) {
      if (typeof tCleanup[i] === "string") {
        const targetIdx = tCleanup[i + 3];
        if (targetIdx >= 0) {
          lCleanup[targetIdx]();
        } else {
          lCleanup[-targetIdx].unsubscribe();
        }
        i += 2;
      } else {
        const context = lCleanup[tCleanup[i + 1]];
        tCleanup[i].call(context);
      }
    }
  }
  if (lCleanup !== null) {
    lView[CLEANUP] = null;
  }
  const destroyHooks = lView[ON_DESTROY_HOOKS];
  if (destroyHooks !== null) {
    lView[ON_DESTROY_HOOKS] = null;
    for (let i = 0; i < destroyHooks.length; i++) {
      const destroyHooksFn = destroyHooks[i];
      destroyHooksFn();
    }
  }
  const effects = lView[EFFECTS];
  if (effects !== null) {
    lView[EFFECTS] = null;
    for (const effect of effects) {
      effect.destroy();
    }
  }
}
function executeOnDestroys(tView, lView) {
  let destroyHooks;
  if (tView != null && (destroyHooks = tView.destroyHooks) != null) {
    for (let i = 0; i < destroyHooks.length; i += 2) {
      const context = lView[destroyHooks[i]];
      if (!(context instanceof NodeInjectorFactory)) {
        const toCall = destroyHooks[i + 1];
        if (Array.isArray(toCall)) {
          for (let j = 0; j < toCall.length; j += 2) {
            const callContext = context[toCall[j]];
            const hook = toCall[j + 1];
            profiler(4, callContext, hook);
            try {
              hook.call(callContext);
            } finally {
              profiler(5, callContext, hook);
            }
          }
        } else {
          profiler(4, context, toCall);
          try {
            toCall.call(context);
          } finally {
            profiler(5, context, toCall);
          }
        }
      }
    }
  }
}
function getParentRElement(tView, tNode, lView) {
  return getClosestRElement(tView, tNode.parent, lView);
}
function getClosestRElement(tView, tNode, lView) {
  let parentTNode = tNode;
  while (parentTNode !== null && parentTNode.type & (8 | 32 | 128)) {
    tNode = parentTNode;
    parentTNode = tNode.parent;
  }
  if (parentTNode === null) {
    return lView[HOST];
  } else {
    if (isComponentHost(parentTNode)) {
      const {
        encapsulation
      } = tView.data[parentTNode.directiveStart + parentTNode.componentOffset];
      if (encapsulation === ViewEncapsulation.None || encapsulation === ViewEncapsulation.Emulated) {
        return null;
      }
    }
    return getNativeByTNode(parentTNode, lView);
  }
}
function getInsertInFrontOfRNode(parentTNode, currentTNode, lView) {
  return _getInsertInFrontOfRNodeWithI18n(parentTNode, currentTNode, lView);
}
function getInsertInFrontOfRNodeWithNoI18n(parentTNode, currentTNode, lView) {
  if (parentTNode.type & (8 | 32)) {
    return getNativeByTNode(parentTNode, lView);
  }
  return null;
}
let _getInsertInFrontOfRNodeWithI18n = getInsertInFrontOfRNodeWithNoI18n;
function appendChild(tView, lView, childRNode, childTNode) {
  const parentRNode = getParentRElement(tView, childTNode, lView);
  const renderer = lView[RENDERER];
  const parentTNode = childTNode.parent || lView[T_HOST];
  const anchorNode = getInsertInFrontOfRNode(parentTNode, childTNode, lView);
  if (parentRNode != null) {
    if (Array.isArray(childRNode)) {
      for (let i = 0; i < childRNode.length; i++) {
        nativeAppendOrInsertBefore(renderer, parentRNode, childRNode[i], anchorNode, false);
      }
    } else {
      nativeAppendOrInsertBefore(renderer, parentRNode, childRNode, anchorNode, false);
    }
  }
}
function getFirstNativeNode(lView, tNode) {
  if (tNode !== null) {
    const tNodeType = tNode.type;
    if (tNodeType & 3) {
      return getNativeByTNode(tNode, lView);
    } else if (tNodeType & 4) {
      return getBeforeNodeForView(-1, lView[tNode.index]);
    } else if (tNodeType & 8) {
      const elIcuContainerChild = tNode.child;
      if (elIcuContainerChild !== null) {
        return getFirstNativeNode(lView, elIcuContainerChild);
      } else {
        const rNodeOrLContainer = lView[tNode.index];
        if (isLContainer(rNodeOrLContainer)) {
          return getBeforeNodeForView(-1, rNodeOrLContainer);
        } else {
          return unwrapRNode(rNodeOrLContainer);
        }
      }
    } else if (tNodeType & 128) {
      return getFirstNativeNode(lView, tNode.next);
    } else if (tNodeType & 32) {
      let nextRNode = icuContainerIterate(tNode, lView);
      let rNode = nextRNode();
      return rNode || unwrapRNode(lView[tNode.index]);
    } else {
      const projectionNodes = getProjectionNodes(lView, tNode);
      if (projectionNodes !== null) {
        if (Array.isArray(projectionNodes)) {
          return projectionNodes[0];
        }
        const parentView = getLViewParent(lView[DECLARATION_COMPONENT_VIEW]);
        return getFirstNativeNode(parentView, projectionNodes);
      } else {
        return getFirstNativeNode(lView, tNode.next);
      }
    }
  }
  return null;
}
function getProjectionNodes(lView, tNode) {
  if (tNode !== null) {
    const componentView = lView[DECLARATION_COMPONENT_VIEW];
    const componentHost = componentView[T_HOST];
    const slotIdx = tNode.projection;
    return componentHost.projection[slotIdx];
  }
  return null;
}
function getBeforeNodeForView(viewIndexInContainer, lContainer) {
  const nextViewIndex = CONTAINER_HEADER_OFFSET + viewIndexInContainer + 1;
  if (nextViewIndex < lContainer.length) {
    const lView = lContainer[nextViewIndex];
    const firstTNodeOfView = lView[TVIEW].firstChild;
    if (firstTNodeOfView !== null) {
      return getFirstNativeNode(lView, firstTNodeOfView);
    }
  }
  return lContainer[NATIVE];
}
function applyNodes(renderer, action, tNode, lView, parentRElement, beforeNode, isProjection) {
  while (tNode != null) {
    if (tNode.type === 128) {
      tNode = tNode.next;
      continue;
    }
    const rawSlotValue = lView[tNode.index];
    const tNodeType = tNode.type;
    if (isProjection) {
      if (action === 0) {
        rawSlotValue && attachPatchData(unwrapRNode(rawSlotValue), lView);
        tNode.flags |= 2;
      }
    }
    if (!isDetachedByI18n(tNode)) {
      if (tNodeType & 8) {
        applyNodes(renderer, action, tNode.child, lView, parentRElement, beforeNode, false);
        applyToElementOrContainer(action, renderer, parentRElement, rawSlotValue, beforeNode);
      } else if (tNodeType & 32) {
        const nextRNode = icuContainerIterate(tNode, lView);
        let rNode;
        while (rNode = nextRNode()) {
          applyToElementOrContainer(action, renderer, parentRElement, rNode, beforeNode);
        }
        applyToElementOrContainer(action, renderer, parentRElement, rawSlotValue, beforeNode);
      } else if (tNodeType & 16) {
        applyProjectionRecursive(renderer, action, lView, tNode, parentRElement, beforeNode);
      } else {
        applyToElementOrContainer(action, renderer, parentRElement, rawSlotValue, beforeNode);
      }
    }
    tNode = isProjection ? tNode.projectionNext : tNode.next;
  }
}
function applyView(tView, lView, renderer, action, parentRElement, beforeNode) {
  applyNodes(renderer, action, tView.firstChild, lView, parentRElement, beforeNode, false);
}
function applyProjectionRecursive(renderer, action, lView, tProjectionNode, parentRElement, beforeNode) {
  const componentLView = lView[DECLARATION_COMPONENT_VIEW];
  const componentNode = componentLView[T_HOST];
  const nodeToProjectOrRNodes = componentNode.projection[tProjectionNode.projection];
  if (Array.isArray(nodeToProjectOrRNodes)) {
    for (let i = 0; i < nodeToProjectOrRNodes.length; i++) {
      const rNode = nodeToProjectOrRNodes[i];
      applyToElementOrContainer(action, renderer, parentRElement, rNode, beforeNode);
    }
  } else {
    let nodeToProject = nodeToProjectOrRNodes;
    const projectedComponentLView = componentLView[PARENT];
    if (hasInSkipHydrationBlockFlag(tProjectionNode)) {
      nodeToProject.flags |= 128;
    }
    applyNodes(renderer, action, nodeToProject, projectedComponentLView, parentRElement, beforeNode, true);
  }
}
function applyContainer(renderer, action, lContainer, parentRElement, beforeNode) {
  const anchor = lContainer[NATIVE];
  const native = unwrapRNode(lContainer);
  if (anchor !== native) {
    applyToElementOrContainer(action, renderer, parentRElement, anchor, beforeNode);
  }
  for (let i = CONTAINER_HEADER_OFFSET; i < lContainer.length; i++) {
    const lView = lContainer[i];
    applyView(lView[TVIEW], lView, renderer, action, parentRElement, anchor);
  }
}
function executeTemplate(tView, lView, templateFn, rf, context) {
  const prevSelectedIndex = getSelectedIndex();
  const isUpdatePhase = rf & 2;
  try {
    setSelectedIndex(-1);
    if (isUpdatePhase && lView.length > HEADER_OFFSET) {
      selectIndexInternal(tView, lView, HEADER_OFFSET, false);
    }
    const preHookType = isUpdatePhase ? 2 : 0;
    profiler(preHookType, context, templateFn);
    templateFn(rf, context);
  } finally {
    setSelectedIndex(prevSelectedIndex);
    const postHookType = isUpdatePhase ? 3 : 1;
    profiler(postHookType, context, templateFn);
  }
}
function createDirectivesInstances(tView, lView, tNode) {
  instantiateAllDirectives(tView, lView, tNode);
  if ((tNode.flags & 64) === 64) {
    invokeDirectivesHostBindings(tView, lView, tNode);
  }
}
function saveResolvedLocalsInData(viewData, tNode, localRefExtractor = getNativeByTNode) {
  const localNames = tNode.localNames;
  if (localNames !== null) {
    let localIndex = tNode.index + 1;
    for (let i = 0; i < localNames.length; i += 2) {
      const index = localNames[i + 1];
      const value = index === -1 ? localRefExtractor(tNode, viewData) : viewData[index];
      viewData[localIndex++] = value;
    }
  }
}
function locateHostElement(renderer, elementOrSelector, encapsulation, injector) {
  const preserveHostContent = injector.get(PRESERVE_HOST_CONTENT, PRESERVE_HOST_CONTENT_DEFAULT);
  const preserveContent = preserveHostContent || encapsulation === ViewEncapsulation.ShadowDom;
  const rootElement = renderer.selectRootElement(elementOrSelector, preserveContent);
  return rootElement;
}
function mapPropName(name) {
  if (name === "class") return "className";
  if (name === "for") return "htmlFor";
  if (name === "formaction") return "formAction";
  if (name === "innerHtml") return "innerHTML";
  if (name === "readonly") return "readOnly";
  if (name === "tabindex") return "tabIndex";
  return name;
}
function setPropertyAndInputs(tNode, lView, propName, value, renderer, sanitizer) {
  const tView = lView[TVIEW];
  const hasSetInput = setAllInputsForProperty(tNode, tView, lView, propName, value);
  if (hasSetInput) {
    isComponentHost(tNode) && markDirtyIfOnPush(lView, tNode.index);
    return;
  }
  if (tNode.type & 3) {
    propName = mapPropName(propName);
  }
  setDomProperty(tNode, lView, propName, value, renderer, sanitizer);
}
function setDomProperty(tNode, lView, propName, value, renderer, sanitizer) {
  if (tNode.type & 3) {
    const element = getNativeByTNode(tNode, lView);
    value = sanitizer != null ? sanitizer(value, tNode.value || "", propName) : value;
    renderer.setProperty(element, propName, value);
  } else if (tNode.type & 12) ;
}
function markDirtyIfOnPush(lView, viewIndex) {
  const childComponentLView = getComponentLViewByIndex(viewIndex, lView);
  if (!(childComponentLView[FLAGS] & 16)) {
    childComponentLView[FLAGS] |= 64;
  }
}
function instantiateAllDirectives(tView, lView, tNode) {
  const start = tNode.directiveStart;
  const end = tNode.directiveEnd;
  if (isComponentHost(tNode)) {
    createComponentLView(lView, tNode, tView.data[start + tNode.componentOffset]);
  }
  if (!tView.firstCreatePass) {
    getOrCreateNodeInjectorForNode(tNode, lView);
  }
  const initialInputs = tNode.initialInputs;
  for (let i = start; i < end; i++) {
    const def = tView.data[i];
    const directive = getNodeInjectable(lView, tView, i, tNode);
    attachPatchData(directive, lView);
    if (initialInputs !== null) {
      setInputsFromAttrs(lView, i - start, directive, def, tNode, initialInputs);
    }
    if (isComponentDef(def)) {
      const componentView = getComponentLViewByIndex(tNode.index, lView);
      componentView[CONTEXT] = getNodeInjectable(lView, tView, i, tNode);
    }
  }
}
function invokeDirectivesHostBindings(tView, lView, tNode) {
  const start = tNode.directiveStart;
  const end = tNode.directiveEnd;
  const elementIndex = tNode.index;
  const currentDirectiveIndex = getCurrentDirectiveIndex();
  try {
    setSelectedIndex(elementIndex);
    for (let dirIndex = start; dirIndex < end; dirIndex++) {
      const def = tView.data[dirIndex];
      const directive = lView[dirIndex];
      setCurrentDirectiveIndex(dirIndex);
      if (def.hostBindings !== null || def.hostVars !== 0 || def.hostAttrs !== null) {
        invokeHostBindingsInCreationMode(def, directive);
      }
    }
  } finally {
    setSelectedIndex(-1);
    setCurrentDirectiveIndex(currentDirectiveIndex);
  }
}
function invokeHostBindingsInCreationMode(def, directive) {
  if (def.hostBindings !== null) {
    def.hostBindings(1, directive);
  }
}
function findDirectiveDefMatches(tView, tNode) {
  const registry = tView.directiveRegistry;
  let matches = null;
  if (registry) {
    for (let i = 0; i < registry.length; i++) {
      const def = registry[i];
      if (isNodeMatchingSelectorList(
        tNode,
        def.selectors,
        /* isProjectionMode */
        false
      )) {
        matches ??= [];
        if (isComponentDef(def)) {
          matches.unshift(def);
        } else {
          matches.push(def);
        }
      }
    }
  }
  return matches;
}
function setInputsFromAttrs(lView, directiveIndex, instance, def, tNode, initialInputData) {
  const initialInputs = initialInputData[directiveIndex];
  if (initialInputs !== null) {
    for (let i = 0; i < initialInputs.length; i += 2) {
      const lookupName = initialInputs[i];
      const value = initialInputs[i + 1];
      writeToDirectiveInput(def, instance, lookupName, value);
    }
  }
}
function elementLikeStartShared(tNode, lView, index, name, locateOrCreateNativeNode) {
  const adjustedIndex = HEADER_OFFSET + index;
  const tView = lView[TVIEW];
  const native = locateOrCreateNativeNode(tView, lView, tNode, name, index);
  lView[adjustedIndex] = native;
  setCurrentTNode(tNode, true);
  const isElement = tNode.type === 2;
  if (isElement) {
    setupStaticAttributes(lView[RENDERER], native, tNode);
    if (getElementDepthCount() === 0 || isDirectiveHost(tNode)) {
      attachPatchData(native, lView);
    }
    increaseElementDepthCount();
  } else {
    attachPatchData(native, lView);
  }
  if (wasLastNodeCreated() && (!isElement || !isDetachedByI18n(tNode))) {
    appendChild(tView, lView, native, tNode);
  }
  return tNode;
}
function elementLikeEndShared(tNode) {
  let currentTNode = tNode;
  if (isCurrentTNodeParent()) {
    setCurrentTNodeAsNotParent();
  } else {
    currentTNode = currentTNode.parent;
    setCurrentTNode(currentTNode, false);
  }
  return currentTNode;
}
function handleUncaughtError(lView, error) {
  const injector = lView[INJECTOR];
  if (!injector) {
    return;
  }
  let errorHandler;
  try {
    errorHandler = injector.get(INTERNAL_APPLICATION_ERROR_HANDLER, null);
  } catch {
    errorHandler = null;
  }
  errorHandler?.(error);
}
function setAllInputsForProperty(tNode, tView, lView, publicName, value) {
  const inputs = tNode.inputs?.[publicName];
  const hostDirectiveInputs = tNode.hostDirectiveInputs?.[publicName];
  let hasMatch = false;
  if (hostDirectiveInputs) {
    for (let i = 0; i < hostDirectiveInputs.length; i += 2) {
      const index = hostDirectiveInputs[i];
      const publicName2 = hostDirectiveInputs[i + 1];
      const def = tView.data[index];
      writeToDirectiveInput(def, lView[index], publicName2, value);
      hasMatch = true;
    }
  }
  if (inputs) {
    for (const index of inputs) {
      const instance = lView[index];
      const def = tView.data[index];
      writeToDirectiveInput(def, instance, publicName, value);
      hasMatch = true;
    }
  }
  return hasMatch;
}
function renderComponent(hostLView, componentHostIdx) {
  const componentView = getComponentLViewByIndex(componentHostIdx, hostLView);
  const componentTView = componentView[TVIEW];
  syncViewWithBlueprint(componentTView, componentView);
  const hostRNode = componentView[HOST];
  if (hostRNode !== null && componentView[HYDRATION] === null) {
    componentView[HYDRATION] = retrieveHydrationInfo(hostRNode, componentView[INJECTOR]);
  }
  profiler(
    18
    /* ProfilerEvent.ComponentStart */
  );
  renderView(componentTView, componentView, componentView[CONTEXT]);
  profiler(19, componentView[CONTEXT]);
}
function syncViewWithBlueprint(tView, lView) {
  for (let i = lView.length; i < tView.blueprint.length; i++) {
    lView.push(tView.blueprint[i]);
  }
}
function renderView(tView, lView, context) {
  enterView(lView);
  try {
    const viewQuery = tView.viewQuery;
    if (viewQuery !== null) {
      executeViewQueryFn(1, viewQuery, context);
    }
    const templateFn = tView.template;
    if (templateFn !== null) {
      executeTemplate(tView, lView, templateFn, 1, context);
    }
    if (tView.firstCreatePass) {
      tView.firstCreatePass = false;
    }
    lView[QUERIES]?.finishViewCreation(tView);
    if (tView.staticContentQueries) {
      refreshContentQueries(tView, lView);
    }
    if (tView.staticViewQueries) {
      executeViewQueryFn(2, tView.viewQuery, context);
    }
    const components = tView.components;
    if (components !== null) {
      renderChildComponents(lView, components);
    }
  } catch (error) {
    if (tView.firstCreatePass) {
      tView.incompleteFirstPass = true;
      tView.firstCreatePass = false;
    }
    throw error;
  } finally {
    lView[FLAGS] &= -5;
    leaveView();
  }
}
function renderChildComponents(hostLView, components) {
  for (let i = 0; i < components.length; i++) {
    renderComponent(hostLView, components[i]);
  }
}
function createAndRenderEmbeddedLView(declarationLView, templateTNode, context, options) {
  const prevConsumer = setActiveConsumer(null);
  try {
    const embeddedTView = templateTNode.tView;
    const isSignalView = declarationLView[FLAGS] & 4096;
    const viewFlags = isSignalView ? 4096 : 16;
    const embeddedLView = createLView(declarationLView, embeddedTView, context, viewFlags, null, templateTNode, null, null, options?.injector ?? null, options?.embeddedViewInjector ?? null, options?.dehydratedView ?? null);
    const declarationLContainer = declarationLView[templateTNode.index];
    embeddedLView[DECLARATION_LCONTAINER] = declarationLContainer;
    const declarationViewLQueries = declarationLView[QUERIES];
    if (declarationViewLQueries !== null) {
      embeddedLView[QUERIES] = declarationViewLQueries.createEmbeddedView(embeddedTView);
    }
    renderView(embeddedTView, embeddedLView, context);
    return embeddedLView;
  } finally {
    setActiveConsumer(prevConsumer);
  }
}
function shouldAddViewToDom(tNode, dehydratedView) {
  return !dehydratedView || dehydratedView.firstChild === null || hasInSkipHydrationBlockFlag(tNode);
}
function collectNativeNodes(tView, lView, tNode, result, isProjection = false) {
  while (tNode !== null) {
    if (tNode.type === 128) {
      tNode = isProjection ? tNode.projectionNext : tNode.next;
      continue;
    }
    const lNode = lView[tNode.index];
    if (lNode !== null) {
      result.push(unwrapRNode(lNode));
    }
    if (isLContainer(lNode)) {
      collectNativeNodesInLContainer(lNode, result);
    }
    const tNodeType = tNode.type;
    if (tNodeType & 8) {
      collectNativeNodes(tView, lView, tNode.child, result);
    } else if (tNodeType & 32) {
      const nextRNode = icuContainerIterate(tNode, lView);
      let rNode;
      while (rNode = nextRNode()) {
        result.push(rNode);
      }
    } else if (tNodeType & 16) {
      const nodesInSlot = getProjectionNodes(lView, tNode);
      if (Array.isArray(nodesInSlot)) {
        result.push(...nodesInSlot);
      } else {
        const parentView = getLViewParent(lView[DECLARATION_COMPONENT_VIEW]);
        collectNativeNodes(parentView[TVIEW], parentView, nodesInSlot, result, true);
      }
    }
    tNode = isProjection ? tNode.projectionNext : tNode.next;
  }
  return result;
}
function collectNativeNodesInLContainer(lContainer, result) {
  for (let i = CONTAINER_HEADER_OFFSET; i < lContainer.length; i++) {
    const lViewInAContainer = lContainer[i];
    const lViewFirstChildTNode = lViewInAContainer[TVIEW].firstChild;
    if (lViewFirstChildTNode !== null) {
      collectNativeNodes(lViewInAContainer[TVIEW], lViewInAContainer, lViewFirstChildTNode, result);
    }
  }
  if (lContainer[NATIVE] !== lContainer[HOST]) {
    result.push(lContainer[NATIVE]);
  }
}
function addAfterRenderSequencesForView(lView) {
  if (lView[AFTER_RENDER_SEQUENCES_TO_ADD] !== null) {
    for (const sequence of lView[AFTER_RENDER_SEQUENCES_TO_ADD]) {
      sequence.impl.addSequence(sequence);
    }
    lView[AFTER_RENDER_SEQUENCES_TO_ADD].length = 0;
  }
}
let freeConsumers = [];
function getOrBorrowReactiveLViewConsumer(lView) {
  return lView[REACTIVE_TEMPLATE_CONSUMER] ?? borrowReactiveLViewConsumer(lView);
}
function borrowReactiveLViewConsumer(lView) {
  const consumer = freeConsumers.pop() ?? Object.create(REACTIVE_LVIEW_CONSUMER_NODE);
  consumer.lView = lView;
  return consumer;
}
function maybeReturnReactiveLViewConsumer(consumer) {
  if (consumer.lView[REACTIVE_TEMPLATE_CONSUMER] === consumer) {
    return;
  }
  consumer.lView = null;
  freeConsumers.push(consumer);
}
const REACTIVE_LVIEW_CONSUMER_NODE = {
  ...REACTIVE_NODE,
  consumerIsAlwaysLive: true,
  kind: "template",
  consumerMarkedDirty: (node) => {
    markAncestorsForTraversal(node.lView);
  },
  consumerOnSignalRead() {
    this.lView[REACTIVE_TEMPLATE_CONSUMER] = this;
  }
};
function getOrCreateTemporaryConsumer(lView) {
  const consumer = lView[REACTIVE_TEMPLATE_CONSUMER] ?? Object.create(TEMPORARY_CONSUMER_NODE);
  consumer.lView = lView;
  return consumer;
}
const TEMPORARY_CONSUMER_NODE = {
  ...REACTIVE_NODE,
  consumerIsAlwaysLive: true,
  kind: "template",
  consumerMarkedDirty: (node) => {
    let parent = getLViewParent(node.lView);
    while (parent && !viewShouldHaveReactiveConsumer(parent[TVIEW])) {
      parent = getLViewParent(parent);
    }
    if (!parent) {
      return;
    }
    markViewForRefresh(parent);
  },
  consumerOnSignalRead() {
    this.lView[REACTIVE_TEMPLATE_CONSUMER] = this;
  }
};
function viewShouldHaveReactiveConsumer(tView) {
  return tView.type !== 2;
}
function runEffectsInView(view) {
  if (view[EFFECTS] === null) {
    return;
  }
  let tryFlushEffects = true;
  while (tryFlushEffects) {
    let foundDirtyEffect = false;
    for (const effect of view[EFFECTS]) {
      if (!effect.dirty) {
        continue;
      }
      foundDirtyEffect = true;
      if (effect.zone === null || Zone.current === effect.zone) {
        effect.run();
      } else {
        effect.zone.run(() => effect.run());
      }
    }
    tryFlushEffects = foundDirtyEffect && !!(view[FLAGS] & 8192);
  }
}
const MAXIMUM_REFRESH_RERUNS$1 = 100;
function detectChangesInternal(lView, mode = 0) {
  const environment = lView[ENVIRONMENT];
  const rendererFactory = environment.rendererFactory;
  {
    rendererFactory.begin?.();
  }
  try {
    detectChangesInViewWhileDirty(lView, mode);
  } finally {
    {
      rendererFactory.end?.();
    }
  }
}
function detectChangesInViewWhileDirty(lView, mode) {
  const lastIsRefreshingViewsValue = isRefreshingViews();
  try {
    setIsRefreshingViews(true);
    detectChangesInView(lView, mode);
    if (false) ;
    let retries = 0;
    while (requiresRefreshOrTraversal(lView)) {
      if (retries === MAXIMUM_REFRESH_RERUNS$1) {
        throw new RuntimeError(103, false);
      }
      retries++;
      detectChangesInView(
        lView,
        1
        /* ChangeDetectionMode.Targeted */
      );
    }
  } finally {
    setIsRefreshingViews(lastIsRefreshingViewsValue);
  }
}
function refreshView(tView, lView, templateFn, context) {
  if (isDestroyed(lView)) return;
  const flags = lView[FLAGS];
  const isInCheckNoChangesPass = false;
  const isInExhaustiveCheckNoChangesPass = false;
  enterView(lView);
  let returnConsumerToPool = true;
  let prevConsumer = null;
  let currentConsumer = null;
  {
    if (viewShouldHaveReactiveConsumer(tView)) {
      currentConsumer = getOrBorrowReactiveLViewConsumer(lView);
      prevConsumer = consumerBeforeComputation(currentConsumer);
    } else if (getActiveConsumer() === null) {
      returnConsumerToPool = false;
      currentConsumer = getOrCreateTemporaryConsumer(lView);
      prevConsumer = consumerBeforeComputation(currentConsumer);
    } else if (lView[REACTIVE_TEMPLATE_CONSUMER]) {
      consumerDestroy(lView[REACTIVE_TEMPLATE_CONSUMER]);
      lView[REACTIVE_TEMPLATE_CONSUMER] = null;
    }
  }
  try {
    resetPreOrderHookFlags(lView);
    setBindingIndex(tView.bindingStartIndex);
    if (templateFn !== null) {
      executeTemplate(tView, lView, templateFn, 2, context);
    }
    const hooksInitPhaseCompleted = (flags & 3) === 3;
    if (!isInCheckNoChangesPass) {
      if (hooksInitPhaseCompleted) {
        const preOrderCheckHooks = tView.preOrderCheckHooks;
        if (preOrderCheckHooks !== null) {
          executeCheckHooks(lView, preOrderCheckHooks, null);
        }
      } else {
        const preOrderHooks = tView.preOrderHooks;
        if (preOrderHooks !== null) {
          executeInitAndCheckHooks(lView, preOrderHooks, 0, null);
        }
        incrementInitPhaseFlags(
          lView,
          0
          /* InitPhaseState.OnInitHooksToBeRun */
        );
      }
    }
    if (!isInExhaustiveCheckNoChangesPass) {
      markTransplantedViewsForRefresh(lView);
    }
    runEffectsInView(lView);
    detectChangesInEmbeddedViews(
      lView,
      0
      /* ChangeDetectionMode.Global */
    );
    if (tView.contentQueries !== null) {
      refreshContentQueries(tView, lView);
    }
    if (!isInCheckNoChangesPass) {
      if (hooksInitPhaseCompleted) {
        const contentCheckHooks = tView.contentCheckHooks;
        if (contentCheckHooks !== null) {
          executeCheckHooks(lView, contentCheckHooks);
        }
      } else {
        const contentHooks = tView.contentHooks;
        if (contentHooks !== null) {
          executeInitAndCheckHooks(
            lView,
            contentHooks,
            1
            /* InitPhaseState.AfterContentInitHooksToBeRun */
          );
        }
        incrementInitPhaseFlags(
          lView,
          1
          /* InitPhaseState.AfterContentInitHooksToBeRun */
        );
      }
    }
    processHostBindingOpCodes(tView, lView);
    const components = tView.components;
    if (components !== null) {
      detectChangesInChildComponents(
        lView,
        components,
        0
        /* ChangeDetectionMode.Global */
      );
    }
    const viewQuery = tView.viewQuery;
    if (viewQuery !== null) {
      executeViewQueryFn(2, viewQuery, context);
    }
    if (!isInCheckNoChangesPass) {
      if (hooksInitPhaseCompleted) {
        const viewCheckHooks = tView.viewCheckHooks;
        if (viewCheckHooks !== null) {
          executeCheckHooks(lView, viewCheckHooks);
        }
      } else {
        const viewHooks = tView.viewHooks;
        if (viewHooks !== null) {
          executeInitAndCheckHooks(
            lView,
            viewHooks,
            2
            /* InitPhaseState.AfterViewInitHooksToBeRun */
          );
        }
        incrementInitPhaseFlags(
          lView,
          2
          /* InitPhaseState.AfterViewInitHooksToBeRun */
        );
      }
    }
    if (tView.firstUpdatePass === true) {
      tView.firstUpdatePass = false;
    }
    if (lView[EFFECTS_TO_SCHEDULE]) {
      for (const notifyEffect of lView[EFFECTS_TO_SCHEDULE]) {
        notifyEffect();
      }
      lView[EFFECTS_TO_SCHEDULE] = null;
    }
    if (!isInCheckNoChangesPass) {
      addAfterRenderSequencesForView(lView);
      lView[FLAGS] &= ~(64 | 8);
    }
  } catch (e) {
    {
      markAncestorsForTraversal(lView);
    }
    throw e;
  } finally {
    if (currentConsumer !== null) {
      consumerAfterComputation(currentConsumer, prevConsumer);
      if (returnConsumerToPool) {
        maybeReturnReactiveLViewConsumer(currentConsumer);
      }
    }
    leaveView();
  }
}
function detectChangesInEmbeddedViews(lView, mode) {
  for (let lContainer = getFirstLContainer(lView); lContainer !== null; lContainer = getNextLContainer(lContainer)) {
    for (let i = CONTAINER_HEADER_OFFSET; i < lContainer.length; i++) {
      const embeddedLView = lContainer[i];
      detectChangesInViewIfAttached(embeddedLView, mode);
    }
  }
}
function markTransplantedViewsForRefresh(lView) {
  for (let lContainer = getFirstLContainer(lView); lContainer !== null; lContainer = getNextLContainer(lContainer)) {
    if (!(lContainer[FLAGS] & 2)) continue;
    const movedViews = lContainer[MOVED_VIEWS];
    for (let i = 0; i < movedViews.length; i++) {
      const movedLView = movedViews[i];
      markViewForRefresh(movedLView);
    }
  }
}
function detectChangesInComponent(hostLView, componentHostIdx, mode) {
  profiler(
    18
    /* ProfilerEvent.ComponentStart */
  );
  const componentView = getComponentLViewByIndex(componentHostIdx, hostLView);
  detectChangesInViewIfAttached(componentView, mode);
  profiler(19, componentView[CONTEXT]);
}
function detectChangesInViewIfAttached(lView, mode) {
  if (!viewAttachedToChangeDetector(lView)) {
    return;
  }
  detectChangesInView(lView, mode);
}
function detectChangesInView(lView, mode) {
  const isInCheckNoChangesPass = false;
  const tView = lView[TVIEW];
  const flags = lView[FLAGS];
  const consumer = lView[REACTIVE_TEMPLATE_CONSUMER];
  let shouldRefreshView = !!(mode === 0 && flags & 16);
  shouldRefreshView ||= !!(flags & 64 && mode === 0 && !isInCheckNoChangesPass);
  shouldRefreshView ||= !!(flags & 1024);
  shouldRefreshView ||= !!(consumer?.dirty && consumerPollProducersForChange(consumer));
  shouldRefreshView ||= false;
  if (consumer) {
    consumer.dirty = false;
  }
  lView[FLAGS] &= -9217;
  if (shouldRefreshView) {
    refreshView(tView, lView, tView.template, lView[CONTEXT]);
  } else if (flags & 8192) {
    const prevConsumer = setActiveConsumer(null);
    try {
      if (!isInCheckNoChangesPass) {
        runEffectsInView(lView);
      }
      detectChangesInEmbeddedViews(
        lView,
        1
        /* ChangeDetectionMode.Targeted */
      );
      const components = tView.components;
      if (components !== null) {
        detectChangesInChildComponents(
          lView,
          components,
          1
          /* ChangeDetectionMode.Targeted */
        );
      }
      if (!isInCheckNoChangesPass) {
        addAfterRenderSequencesForView(lView);
      }
    } finally {
      setActiveConsumer(prevConsumer);
    }
  }
}
function detectChangesInChildComponents(hostLView, components, mode) {
  for (let i = 0; i < components.length; i++) {
    detectChangesInComponent(hostLView, components[i], mode);
  }
}
function processHostBindingOpCodes(tView, lView) {
  const hostBindingOpCodes = tView.hostBindingOpCodes;
  if (hostBindingOpCodes === null) return;
  try {
    for (let i = 0; i < hostBindingOpCodes.length; i++) {
      const opCode = hostBindingOpCodes[i];
      if (opCode < 0) {
        setSelectedIndex(~opCode);
      } else {
        const directiveIdx = opCode;
        const bindingRootIndx = hostBindingOpCodes[++i];
        const hostBindingFn = hostBindingOpCodes[++i];
        setBindingRootForHostBindings(bindingRootIndx, directiveIdx);
        const context = lView[directiveIdx];
        profiler(24, context);
        hostBindingFn(2, context);
        profiler(25, context);
      }
    }
  } finally {
    setSelectedIndex(-1);
  }
}
function markViewDirty(lView, source) {
  const dirtyBitsToUse = isRefreshingViews() ? (
    // When we are actively refreshing views, we only use the `Dirty` bit to mark a view
    64
  ) : (
    // When we are not actively refreshing a view tree, it is absolutely
    // valid to update state and mark views dirty. We use the `RefreshView` flag in this
    // case to allow synchronously rerunning change detection. This applies today to
    // afterRender hooks as well as animation listeners which execute after detecting
    // changes in a view when the render factory flushes.
    1024 | 64
  );
  lView[ENVIRONMENT].changeDetectionScheduler?.notify(source);
  while (lView) {
    lView[FLAGS] |= dirtyBitsToUse;
    const parent = getLViewParent(lView);
    if (isRootView(lView) && !parent) {
      return lView;
    }
    lView = parent;
  }
  return null;
}
function createLContainer(hostNative, currentView, native, tNode) {
  const lContainer = [
    hostNative,
    // host native
    true,
    // Boolean `true` in this position signifies that this is an `LContainer`
    0,
    // flags
    currentView,
    // parent
    null,
    // next
    tNode,
    // t_host
    null,
    // dehydrated views
    native,
    // native,
    null,
    // view refs
    null
    // moved views
  ];
  return lContainer;
}
function getLViewFromLContainer(lContainer, index) {
  const adjustedIndex = CONTAINER_HEADER_OFFSET + index;
  if (adjustedIndex < lContainer.length) {
    const lView = lContainer[adjustedIndex];
    return lView;
  }
  return void 0;
}
function addLViewToLContainer(lContainer, lView, index, addToDOM = true) {
  const tView = lView[TVIEW];
  insertView(tView, lView, lContainer, index);
  if (addToDOM) {
    const beforeNode = getBeforeNodeForView(index, lContainer);
    const renderer = lView[RENDERER];
    const parentRNode = renderer.parentNode(lContainer[NATIVE]);
    if (parentRNode !== null) {
      addViewToDOM(tView, lContainer[T_HOST], renderer, lView, parentRNode, beforeNode);
    }
  }
  const hydrationInfo = lView[HYDRATION];
  if (hydrationInfo !== null && hydrationInfo.firstChild !== null) {
    hydrationInfo.firstChild = null;
  }
}
function removeLViewFromLContainer(lContainer, index) {
  const lView = detachView(lContainer, index);
  if (lView !== void 0) {
    destroyLView(lView[TVIEW], lView);
  }
  return lView;
}
function detachView(lContainer, removeIndex) {
  if (lContainer.length <= CONTAINER_HEADER_OFFSET) return;
  const indexInContainer = CONTAINER_HEADER_OFFSET + removeIndex;
  const viewToDetach = lContainer[indexInContainer];
  if (viewToDetach) {
    const declarationLContainer = viewToDetach[DECLARATION_LCONTAINER];
    if (declarationLContainer !== null && declarationLContainer !== lContainer) {
      detachMovedView(declarationLContainer, viewToDetach);
    }
    if (removeIndex > 0) {
      lContainer[indexInContainer - 1][NEXT] = viewToDetach[NEXT];
    }
    const removedLView = removeFromArray(lContainer, CONTAINER_HEADER_OFFSET + removeIndex);
    removeViewFromDOM(viewToDetach[TVIEW], viewToDetach);
    const lQueries = removedLView[QUERIES];
    if (lQueries !== null) {
      lQueries.detachView(removedLView[TVIEW]);
    }
    viewToDetach[PARENT] = null;
    viewToDetach[NEXT] = null;
    viewToDetach[FLAGS] &= -129;
  }
  return viewToDetach;
}
function insertView(tView, lView, lContainer, index) {
  const indexInContainer = CONTAINER_HEADER_OFFSET + index;
  const containerLength = lContainer.length;
  if (index > 0) {
    lContainer[indexInContainer - 1][NEXT] = lView;
  }
  if (index < containerLength - CONTAINER_HEADER_OFFSET) {
    lView[NEXT] = lContainer[indexInContainer];
    addToArray(lContainer, CONTAINER_HEADER_OFFSET + index, lView);
  } else {
    lContainer.push(lView);
    lView[NEXT] = null;
  }
  lView[PARENT] = lContainer;
  const declarationLContainer = lView[DECLARATION_LCONTAINER];
  if (declarationLContainer !== null && lContainer !== declarationLContainer) {
    trackMovedView(declarationLContainer, lView);
  }
  const lQueries = lView[QUERIES];
  if (lQueries !== null) {
    lQueries.insertView(tView);
  }
  updateAncestorTraversalFlagsOnAttach(lView);
  lView[FLAGS] |= 128;
}
function trackMovedView(declarationContainer, lView) {
  const movedViews = declarationContainer[MOVED_VIEWS];
  const parent = lView[PARENT];
  if (isLView(parent)) {
    declarationContainer[FLAGS] |= 2;
  } else {
    const insertedComponentLView = parent[PARENT][DECLARATION_COMPONENT_VIEW];
    const declaredComponentLView = lView[DECLARATION_COMPONENT_VIEW];
    if (declaredComponentLView !== insertedComponentLView) {
      declarationContainer[FLAGS] |= 2;
    }
  }
  if (movedViews === null) {
    declarationContainer[MOVED_VIEWS] = [lView];
  } else {
    movedViews.push(lView);
  }
}
class ViewRef {
  _lView;
  _cdRefInjectingView;
  _appRef = null;
  _attachedToViewContainer = false;
  exhaustive;
  get rootNodes() {
    const lView = this._lView;
    const tView = lView[TVIEW];
    return collectNativeNodes(tView, lView, tView.firstChild, []);
  }
  constructor(_lView, _cdRefInjectingView) {
    this._lView = _lView;
    this._cdRefInjectingView = _cdRefInjectingView;
  }
  get context() {
    return this._lView[CONTEXT];
  }
  /**
   * @deprecated Replacing the full context object is not supported. Modify the context
   *   directly, or consider using a `Proxy` if you need to replace the full object.
   * // TODO(devversion): Remove this.
   */
  set context(value) {
    this._lView[CONTEXT] = value;
  }
  get destroyed() {
    return isDestroyed(this._lView);
  }
  destroy() {
    if (this._appRef) {
      this._appRef.detachView(this);
    } else if (this._attachedToViewContainer) {
      const parent = this._lView[PARENT];
      if (isLContainer(parent)) {
        const viewRefs = parent[VIEW_REFS];
        const index = viewRefs ? viewRefs.indexOf(this) : -1;
        if (index > -1) {
          detachView(parent, index);
          removeFromArray(viewRefs, index);
        }
      }
      this._attachedToViewContainer = false;
    }
    destroyLView(this._lView[TVIEW], this._lView);
  }
  onDestroy(callback) {
    storeLViewOnDestroy(this._lView, callback);
  }
  /**
   * Marks a view and all of its ancestors dirty.
   *
   * This can be used to ensure an {@link ChangeDetectionStrategy#OnPush} component is
   * checked when it needs to be re-rendered but the two normal triggers haven't marked it
   * dirty (i.e. inputs haven't changed and events haven't fired in the view).
   *
   * <!-- TODO: Add a link to a chapter on OnPush components -->
   *
   * @usageNotes
   * ### Example
   *
   * ```ts
   * @Component({
   *   selector: 'app-root',
   *   template: `Number of ticks: {{numberOfTicks}}`
   *   changeDetection: ChangeDetectionStrategy.OnPush,
   * })
   * class AppComponent {
   *   numberOfTicks = 0;
   *
   *   constructor(private ref: ChangeDetectorRef) {
   *     setInterval(() => {
   *       this.numberOfTicks++;
   *       // the following is required, otherwise the view will not be updated
   *       this.ref.markForCheck();
   *     }, 1000);
   *   }
   * }
   * ```
   */
  markForCheck() {
    markViewDirty(
      this._cdRefInjectingView || this._lView,
      4
      /* NotificationSource.MarkForCheck */
    );
  }
  /**
   * Detaches the view from the change detection tree.
   *
   * Detached views will not be checked during change detection runs until they are
   * re-attached, even if they are dirty. `detach` can be used in combination with
   * {@link ChangeDetectorRef#detectChanges} to implement local change
   * detection checks.
   *
   * <!-- TODO: Add a link to a chapter on detach/reattach/local digest -->
   * <!-- TODO: Add a live demo once ref.detectChanges is merged into master -->
   *
   * @usageNotes
   * ### Example
   *
   * The following example defines a component with a large list of readonly data.
   * Imagine the data changes constantly, many times per second. For performance reasons,
   * we want to check and update the list every five seconds. We can do that by detaching
   * the component's change detector and doing a local check every five seconds.
   *
   * ```ts
   * class DataProvider {
   *   // in a real application the returned data will be different every time
   *   get data() {
   *     return [1,2,3,4,5];
   *   }
   * }
   *
   * @Component({
   *   selector: 'giant-list',
   *   template: `
   *     @for(d of dataProvider.data; track $index) {
   *        <li>Data {{d}}</li>
   *     }
   *   `,
   * })
   * class GiantList {
   *   constructor(private ref: ChangeDetectorRef, private dataProvider: DataProvider) {
   *     ref.detach();
   *     setInterval(() => {
   *       this.ref.detectChanges();
   *     }, 5000);
   *   }
   * }
   *
   * @Component({
   *   selector: 'app',
   *   providers: [DataProvider],
   *   template: `
   *     <giant-list><giant-list>
   *   `,
   * })
   * class App {
   * }
   * ```
   */
  detach() {
    this._lView[FLAGS] &= -129;
  }
  /**
   * Re-attaches a view to the change detection tree.
   *
   * This can be used to re-attach views that were previously detached from the tree
   * using {@link ChangeDetectorRef#detach}. Views are attached to the tree by default.
   *
   * <!-- TODO: Add a link to a chapter on detach/reattach/local digest -->
   *
   * @usageNotes
   * ### Example
   *
   * The following example creates a component displaying `live` data. The component will detach
   * its change detector from the main change detector tree when the component's live property
   * is set to false.
   *
   * ```ts
   * class DataProvider {
   *   data = 1;
   *
   *   constructor() {
   *     setInterval(() => {
   *       this.data = this.data * 2;
   *     }, 500);
   *   }
   * }
   *
   * @Component({
   *   selector: 'live-data',
   *   inputs: ['live'],
   *   template: 'Data: {{dataProvider.data}}'
   * })
   * class LiveData {
   *   constructor(private ref: ChangeDetectorRef, private dataProvider: DataProvider) {}
   *
   *   set live(value) {
   *     if (value) {
   *       this.ref.reattach();
   *     } else {
   *       this.ref.detach();
   *     }
   *   }
   * }
   *
   * @Component({
   *   selector: 'app-root',
   *   providers: [DataProvider],
   *   template: `
   *     Live Update: <input type="checkbox" [(ngModel)]="live">
   *     <live-data [live]="live"><live-data>
   *   `,
   * })
   * class AppComponent {
   *   live = true;
   * }
   * ```
   */
  reattach() {
    updateAncestorTraversalFlagsOnAttach(this._lView);
    this._lView[FLAGS] |= 128;
  }
  /**
   * Checks the view and its children.
   *
   * This can also be used in combination with {@link ChangeDetectorRef#detach} to implement
   * local change detection checks.
   *
   * <!-- TODO: Add a link to a chapter on detach/reattach/local digest -->
   * <!-- TODO: Add a live demo once ref.detectChanges is merged into master -->
   *
   * @usageNotes
   * ### Example
   *
   * The following example defines a component with a large list of readonly data.
   * Imagine, the data changes constantly, many times per second. For performance reasons,
   * we want to check and update the list every five seconds.
   *
   * We can do that by detaching the component's change detector and doing a local change detection
   * check every five seconds.
   *
   * See {@link ChangeDetectorRef#detach} for more information.
   */
  detectChanges() {
    this._lView[FLAGS] |= 1024;
    detectChangesInternal(this._lView);
  }
  /**
   * Checks the change detector and its children, and throws if any changes are detected.
   *
   * This is used in development mode to verify that running change detection doesn't
   * introduce other changes.
   */
  checkNoChanges() {
    return;
  }
  attachToViewContainerRef() {
    if (this._appRef) {
      throw new RuntimeError(902, false);
    }
    this._attachedToViewContainer = true;
  }
  detachFromAppRef() {
    this._appRef = null;
    const isRoot = isRootView(this._lView);
    const declarationContainer = this._lView[DECLARATION_LCONTAINER];
    if (declarationContainer !== null && !isRoot) {
      detachMovedView(declarationContainer, this._lView);
    }
    detachViewFromDOM(this._lView[TVIEW], this._lView);
  }
  attachToAppRef(appRef) {
    if (this._attachedToViewContainer) {
      throw new RuntimeError(902, false);
    }
    this._appRef = appRef;
    const isRoot = isRootView(this._lView);
    const declarationContainer = this._lView[DECLARATION_LCONTAINER];
    if (declarationContainer !== null && !isRoot) {
      trackMovedView(declarationContainer, this._lView);
    }
    updateAncestorTraversalFlagsOnAttach(this._lView);
  }
}
const AT_THIS_LOCATION = "<-- AT THIS LOCATION";
function getFriendlyStringFromTNodeType(tNodeType) {
  switch (tNodeType) {
    case 4:
      return "view container";
    case 2:
      return "element";
    case 8:
      return "ng-container";
    case 32:
      return "icu";
    case 64:
      return "i18n";
    case 16:
      return "projection";
    case 1:
      return "text";
    case 128:
      return "@let";
    default:
      return "<unknown>";
  }
}
function nodeNotFoundError(lView, tNode) {
  const header = "During serialization, Angular was unable to find an element in the DOM:\n\n";
  const expected = `${describeExpectedDom(lView, tNode)}

`;
  const footer = getHydrationErrorFooter();
  throw new RuntimeError(-502, header + expected + footer);
}
function unsupportedProjectionOfDomNodes(rNode) {
  const header = "During serialization, Angular detected DOM nodes that were created outside of Angular context and provided as projectable nodes (likely via `ViewContainerRef.createComponent` or `createComponent` APIs). Hydration is not supported for such cases, consider refactoring the code to avoid this pattern or using `ngSkipHydration` on the host element of the component.\n\n";
  const actual = `${describeDomFromNode(rNode)}

`;
  const message = header + actual + getHydrationAttributeNote();
  return new RuntimeError(-503, message);
}
function stringifyTNodeAttrs(tNode) {
  const results = [];
  if (tNode.attrs) {
    for (let i = 0; i < tNode.attrs.length; ) {
      const attrName = tNode.attrs[i++];
      if (typeof attrName == "number") {
        break;
      }
      const attrValue = tNode.attrs[i++];
      results.push(`${attrName}="${shorten(attrValue)}"`);
    }
  }
  return results.join(" ");
}
const internalAttrs = /* @__PURE__ */ new Set(["ngh", "ng-version", "ng-server-context"]);
function stringifyRNodeAttrs(rNode) {
  const results = [];
  for (let i = 0; i < rNode.attributes.length; i++) {
    const attr = rNode.attributes[i];
    if (internalAttrs.has(attr.name)) continue;
    results.push(`${attr.name}="${shorten(attr.value)}"`);
  }
  return results.join(" ");
}
function describeTNode(tNode, innerContent = "…") {
  switch (tNode.type) {
    case 1:
      const content = tNode.value ? `(${tNode.value})` : "";
      return `#text${content}`;
    case 2:
      const attrs = stringifyTNodeAttrs(tNode);
      const tag = tNode.value.toLowerCase();
      return `<${tag}${attrs ? " " + attrs : ""}>${innerContent}</${tag}>`;
    case 8:
      return "<!-- ng-container -->";
    case 4:
      return "<!-- container -->";
    default:
      const typeAsString = getFriendlyStringFromTNodeType(tNode.type);
      return `#node(${typeAsString})`;
  }
}
function describeRNode(rNode, innerContent = "…") {
  const node = rNode;
  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
      const tag = node.tagName.toLowerCase();
      const attrs = stringifyRNodeAttrs(node);
      return `<${tag}${attrs ? " " + attrs : ""}>${innerContent}</${tag}>`;
    case Node.TEXT_NODE:
      const content = node.textContent ? shorten(node.textContent) : "";
      return `#text${content ? `(${content})` : ""}`;
    case Node.COMMENT_NODE:
      return `<!-- ${shorten(node.textContent ?? "")} -->`;
    default:
      return `#node(${node.nodeType})`;
  }
}
function describeExpectedDom(lView, tNode, isViewContainerAnchor) {
  const spacer = "  ";
  let content = "";
  if (tNode.prev) {
    content += spacer + "…\n";
    content += spacer + describeTNode(tNode.prev) + "\n";
  } else if (tNode.type && tNode.type & 12) {
    content += spacer + "…\n";
  }
  {
    content += spacer + describeTNode(tNode) + `  ${AT_THIS_LOCATION}
`;
  }
  content += spacer + "…\n";
  const parentRNode = tNode.type ? getParentRElement(lView[TVIEW], tNode, lView) : null;
  if (parentRNode) {
    content = describeRNode(parentRNode, "\n" + content);
  }
  return content;
}
function describeDomFromNode(node) {
  const spacer = "  ";
  let content = "";
  const currentNode = node;
  if (currentNode.previousSibling) {
    content += spacer + "…\n";
    content += spacer + describeRNode(currentNode.previousSibling) + "\n";
  }
  content += spacer + describeRNode(currentNode) + `  ${AT_THIS_LOCATION}
`;
  if (node.nextSibling) {
    content += spacer + "…\n";
  }
  if (node.parentNode) {
    content = describeRNode(currentNode.parentNode, "\n" + content);
  }
  return content;
}
function getHydrationErrorFooter(componentClassName) {
  const componentInfo = "corresponding";
  return `To fix this problem:
  * check ${componentInfo} component for hydration-related issues
  * check to see if your template has valid HTML structure
  * or skip hydration by adding the \`ngSkipHydration\` attribute to its host node in a template

`;
}
function getHydrationAttributeNote() {
  return "Note: attributes are only displayed to better represent the DOM but have no effect on hydration mismatches.\n\n";
}
function stripNewlines(input) {
  return input.replace(/\s+/gm, "");
}
function shorten(input, maxLength = 50) {
  if (!input) {
    return "";
  }
  input = stripNewlines(input);
  return input.length > maxLength ? `${input.substring(0, maxLength - 1)}…` : input;
}
function getOrCreateTNode(tView, index, type, name, attrs) {
  let tNode = tView.data[index];
  if (tNode === null) {
    tNode = createTNodeAtIndex(tView, index, type, name, attrs);
    if (isInI18nBlock()) {
      tNode.flags |= 32;
    }
  } else if (tNode.type & 64) {
    tNode.type = type;
    tNode.value = name;
    tNode.attrs = attrs;
    const parent = getCurrentParentTNode();
    tNode.injectorIndex = parent === null ? -1 : parent.injectorIndex;
  }
  setCurrentTNode(tNode, true);
  return tNode;
}
function createTNodeAtIndex(tView, index, type, name, attrs) {
  const currentTNode = getCurrentTNodePlaceholderOk();
  const isParent = isCurrentTNodeParent();
  const parent = isParent ? currentTNode : currentTNode && currentTNode.parent;
  const tNode = tView.data[index] = createTNode(tView, parent, type, index, name, attrs);
  linkTNodeInTView(tView, tNode, currentTNode, isParent);
  return tNode;
}
function linkTNodeInTView(tView, tNode, currentTNode, isParent) {
  if (tView.firstChild === null) {
    tView.firstChild = tNode;
  }
  if (currentTNode !== null) {
    if (isParent) {
      if (currentTNode.child == null && tNode.parent !== null) {
        currentTNode.child = tNode;
      }
    } else {
      if (currentTNode.next === null) {
        currentTNode.next = tNode;
        tNode.prev = currentTNode;
      }
    }
  }
}
function createTNode(tView, tParent, type, index, value, attrs) {
  let injectorIndex = tParent ? tParent.injectorIndex : -1;
  let flags = 0;
  if (isInSkipHydrationBlock$1()) {
    flags |= 128;
  }
  const tNode = {
    type,
    index,
    insertBeforeIndex: null,
    injectorIndex,
    directiveStart: -1,
    directiveEnd: -1,
    directiveStylingLast: -1,
    componentOffset: -1,
    propertyBindings: null,
    flags,
    providerIndexes: 0,
    value,
    attrs,
    mergedAttrs: null,
    localNames: null,
    initialInputs: null,
    inputs: null,
    hostDirectiveInputs: null,
    outputs: null,
    hostDirectiveOutputs: null,
    directiveToIndex: null,
    tView: null,
    next: null,
    prev: null,
    projectionNext: null,
    child: null,
    parent: tParent,
    projection: null,
    styles: null,
    stylesWithoutHost: null,
    residualStyles: void 0,
    classes: null,
    classesWithoutHost: null,
    residualClasses: void 0,
    classBindings: 0,
    styleBindings: 0
  };
  return tNode;
}
function getCurrentICUCaseIndex(tIcu, lView) {
  const currentCase = lView[tIcu.currentCaseLViewIndex];
  return currentCase === null ? currentCase : currentCase < 0 ? ~currentCase : currentCase;
}
function enterIcu(state, tIcu, lView) {
  state.index = 0;
  const currentCase = getCurrentICUCaseIndex(tIcu, lView);
  if (currentCase !== null) {
    state.removes = tIcu.remove[currentCase];
  } else {
    state.removes = EMPTY_ARRAY;
  }
}
function icuContainerIteratorNext(state) {
  if (state.index < state.removes.length) {
    const removeOpCode = state.removes[state.index++];
    if (removeOpCode > 0) {
      const rNode = state.lView[removeOpCode];
      return rNode;
    } else {
      state.stack.push(state.index, state.removes);
      const tIcuIndex = ~removeOpCode;
      const tIcu = state.lView[TVIEW].data[tIcuIndex];
      enterIcu(state, tIcu, state.lView);
      return icuContainerIteratorNext(state);
    }
  } else {
    if (state.stack.length === 0) {
      return null;
    } else {
      state.removes = state.stack.pop();
      state.index = state.stack.pop();
      return icuContainerIteratorNext(state);
    }
  }
}
function createIcuIterator(tIcu, lView) {
  const state = {
    stack: [],
    index: -1,
    lView
  };
  enterIcu(state, tIcu, lView);
  return icuContainerIteratorNext.bind(null, state);
}
function compressNodeLocation(referenceNode, path) {
  const result = [referenceNode];
  for (const segment of path) {
    const lastIdx = result.length - 1;
    if (lastIdx > 0 && result[lastIdx - 1] === segment) {
      const value = result[lastIdx] || 1;
      result[lastIdx] = value + 1;
    } else {
      result.push(segment, "");
    }
  }
  return result.join("");
}
function isDisconnectedNode(tNode, lView) {
  return !(tNode.type & (16 | 128)) && !!lView[tNode.index] && isDisconnectedRNode(unwrapRNode(lView[tNode.index]));
}
function isDisconnectedRNode(rNode) {
  return !!rNode && !rNode.isConnected;
}
function navigateBetween(start, finish) {
  if (start === finish) {
    return [];
  } else if (start.parentElement == null || finish.parentElement == null) {
    return null;
  } else if (start.parentElement === finish.parentElement) {
    return navigateBetweenSiblings(start, finish);
  } else {
    const parent = finish.parentElement;
    const parentPath = navigateBetween(start, parent);
    const childPath = navigateBetween(parent.firstChild, finish);
    if (!parentPath || !childPath) return null;
    return [
      // First navigate to `finish`'s parent
      ...parentPath,
      // Then to its first child.
      NODE_NAVIGATION_STEP_FIRST_CHILD,
      // And finally from that node to `finish` (maybe a no-op if we're already there).
      ...childPath
    ];
  }
}
function navigateBetweenSiblings(start, finish) {
  const nav = [];
  let node = null;
  for (node = start; node != null && node !== finish; node = node.nextSibling) {
    nav.push(NODE_NAVIGATION_STEP_NEXT_SIBLING);
  }
  return node == null ? null : nav;
}
function calcPathBetween(from, to, fromNodeName) {
  const path = navigateBetween(from, to);
  return path === null ? null : compressNodeLocation(fromNodeName, path);
}
function calcPathForNode(tNode, lView, excludedParentNodes) {
  let parentTNode = tNode.parent;
  let parentIndex;
  let parentRNode;
  let referenceNodeName;
  while (parentTNode !== null && (isDisconnectedNode(parentTNode, lView) || excludedParentNodes?.has(parentTNode.index))) {
    parentTNode = parentTNode.parent;
  }
  if (parentTNode === null || !(parentTNode.type & 3)) {
    parentIndex = referenceNodeName = REFERENCE_NODE_HOST;
    parentRNode = lView[DECLARATION_COMPONENT_VIEW][HOST];
  } else {
    parentIndex = parentTNode.index;
    parentRNode = unwrapRNode(lView[parentIndex]);
    referenceNodeName = renderStringify(parentIndex - HEADER_OFFSET);
  }
  let rNode = unwrapRNode(lView[tNode.index]);
  if (tNode.type & (12 | 32)) {
    const firstRNode = getFirstNativeNode(lView, tNode);
    if (firstRNode) {
      rNode = firstRNode;
    }
  }
  let path = calcPathBetween(parentRNode, rNode, referenceNodeName);
  if (path === null && parentRNode !== rNode) {
    const body = parentRNode.ownerDocument.body;
    path = calcPathBetween(body, rNode, REFERENCE_NODE_BODY);
    if (path === null) {
      throw nodeNotFoundError(lView, tNode);
    }
  }
  return path;
}
function isI18nHydrationEnabled(injector) {
  injector = injector ?? inject(Injector);
  return injector.get(IS_I18N_HYDRATION_ENABLED, false);
}
function getOrComputeI18nChildren(tView, context) {
  let i18nChildren = context.i18nChildren.get(tView);
  if (i18nChildren === void 0) {
    i18nChildren = collectI18nChildren(tView);
    context.i18nChildren.set(tView, i18nChildren);
  }
  return i18nChildren;
}
function collectI18nChildren(tView) {
  const children = /* @__PURE__ */ new Set();
  function collectI18nViews(node) {
    children.add(node.index);
    switch (node.kind) {
      case 1:
      case 2: {
        for (const childNode of node.children) {
          collectI18nViews(childNode);
        }
        break;
      }
      case 3: {
        for (const caseNodes of node.cases) {
          for (const caseNode of caseNodes) {
            collectI18nViews(caseNode);
          }
        }
        break;
      }
    }
  }
  for (let i = HEADER_OFFSET; i < tView.bindingStartIndex; i++) {
    const tI18n = tView.data[i];
    if (!tI18n || !tI18n.ast) {
      continue;
    }
    for (const node of tI18n.ast) {
      collectI18nViews(node);
    }
  }
  return children.size === 0 ? null : children;
}
function trySerializeI18nBlock(lView, index, context) {
  if (!context.isI18nHydrationEnabled) {
    return null;
  }
  const tView = lView[TVIEW];
  const tI18n = tView.data[index];
  if (!tI18n || !tI18n.ast) {
    return null;
  }
  const parentTNode = tView.data[tI18n.parentTNodeIndex];
  if (parentTNode && isI18nInSkipHydrationBlock(parentTNode)) {
    return null;
  }
  const serializedI18nBlock = {
    caseQueue: [],
    disconnectedNodes: /* @__PURE__ */ new Set(),
    disjointNodes: /* @__PURE__ */ new Set()
  };
  serializeI18nBlock(lView, serializedI18nBlock, context, tI18n.ast);
  return serializedI18nBlock.caseQueue.length === 0 && serializedI18nBlock.disconnectedNodes.size === 0 && serializedI18nBlock.disjointNodes.size === 0 ? null : serializedI18nBlock;
}
function serializeI18nBlock(lView, serializedI18nBlock, context, nodes) {
  let prevRNode = null;
  for (const node of nodes) {
    const nextRNode = serializeI18nNode(lView, serializedI18nBlock, context, node);
    if (nextRNode) {
      if (isDisjointNode(prevRNode, nextRNode)) {
        serializedI18nBlock.disjointNodes.add(node.index - HEADER_OFFSET);
      }
      prevRNode = nextRNode;
    }
  }
  return prevRNode;
}
function isDisjointNode(prevNode, nextNode) {
  return prevNode && prevNode.nextSibling !== nextNode;
}
function serializeI18nNode(lView, serializedI18nBlock, context, node) {
  const maybeRNode = unwrapRNode(lView[node.index]);
  if (!maybeRNode || isDisconnectedRNode(maybeRNode)) {
    serializedI18nBlock.disconnectedNodes.add(node.index - HEADER_OFFSET);
    return null;
  }
  const rNode = maybeRNode;
  switch (node.kind) {
    case 0: {
      processTextNodeBeforeSerialization(context, rNode);
      break;
    }
    case 1:
    case 2: {
      serializeI18nBlock(lView, serializedI18nBlock, context, node.children);
      break;
    }
    case 3: {
      const currentCase = lView[node.currentCaseLViewIndex];
      if (currentCase != null) {
        const caseIdx = currentCase < 0 ? ~currentCase : currentCase;
        serializedI18nBlock.caseQueue.push(caseIdx);
        serializeI18nBlock(lView, serializedI18nBlock, context, node.cases[caseIdx]);
      }
      break;
    }
  }
  return getFirstNativeNodeForI18nNode(lView, node);
}
function getFirstNativeNodeForI18nNode(lView, node) {
  const tView = lView[TVIEW];
  const maybeTNode = tView.data[node.index];
  if (isTNodeShape(maybeTNode)) {
    return getFirstNativeNode(lView, maybeTNode);
  } else if (node.kind === 3) {
    const icuIterator = createIcuIterator(maybeTNode, lView);
    let rNode = icuIterator();
    return rNode ?? unwrapRNode(lView[node.index]);
  } else {
    return unwrapRNode(lView[node.index]) ?? null;
  }
}
function removeDehydratedViews(lContainer) {
  const views = lContainer[DEHYDRATED_VIEWS] ?? [];
  const parentLView = lContainer[PARENT];
  const renderer = parentLView[RENDERER];
  const retainedViews = [];
  for (const view of views) {
    if (view.data[DEFER_BLOCK_ID] !== void 0) {
      retainedViews.push(view);
    } else {
      removeDehydratedView(view, renderer);
    }
  }
  lContainer[DEHYDRATED_VIEWS] = retainedViews;
}
function removeDehydratedView(dehydratedView, renderer) {
  let nodesRemoved = 0;
  let currentRNode = dehydratedView.firstChild;
  if (currentRNode) {
    const numNodes = dehydratedView.data[NUM_ROOT_NODES];
    while (nodesRemoved < numNodes) {
      const nextSibling = currentRNode.nextSibling;
      nativeRemoveNode(renderer, currentRNode, false);
      currentRNode = nextSibling;
      nodesRemoved++;
    }
  }
}
let _findMatchingDehydratedViewImpl = () => null;
let _findAndReconcileMatchingDehydratedViewsImpl = () => null;
function findMatchingDehydratedView(lContainer, template) {
  return _findMatchingDehydratedViewImpl();
}
function findAndReconcileMatchingDehydratedViews(lContainer, templateTNode, hostLView) {
  return _findAndReconcileMatchingDehydratedViewsImpl();
}
let ComponentRef$1 = class ComponentRef {
};
let ComponentFactory$1 = class ComponentFactory {
};
class _NullComponentFactoryResolver {
  resolveComponentFactory(component) {
    throw new RuntimeError(917, false);
  }
}
let ComponentFactoryResolver$1 = class ComponentFactoryResolver {
  static NULL = /* @__PURE__ */ new _NullComponentFactoryResolver();
};
class RendererFactory2 {
}
let Renderer2 = /* @__PURE__ */ (() => {
  class Renderer22 {
    /**
     * If null or undefined, the view engine won't call it.
     * This is used as a performance optimization for production mode.
     */
    destroyNode = null;
    /**
     * @internal
     * @nocollapse
     */
    static __NG_ELEMENT_ID__ = () => injectRenderer2();
  }
  return Renderer22;
})();
function injectRenderer2() {
  const lView = getLView();
  const tNode = getCurrentTNode();
  const nodeAtIndex = getComponentLViewByIndex(tNode.index, lView);
  return (isLView(nodeAtIndex) ? nodeAtIndex : lView)[RENDERER];
}
let Sanitizer = /* @__PURE__ */ (() => {
  class Sanitizer2 {
    /** @nocollapse */
    static ɵprov = (
      /** @pureOrBreakMyCode */
      /* @__PURE__ */ ɵɵdefineInjectable({
        token: Sanitizer2,
        providedIn: "root",
        factory: () => null
      })
    );
  }
  return Sanitizer2;
})();
const NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR = {};
class ChainedInjector {
  injector;
  parentInjector;
  constructor(injector, parentInjector) {
    this.injector = injector;
    this.parentInjector = parentInjector;
  }
  get(token, notFoundValue, options) {
    const value = this.injector.get(token, NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR, options);
    if (value !== NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR || notFoundValue === NOT_FOUND_CHECK_ONLY_ELEMENT_INJECTOR) {
      return value;
    }
    return this.parentInjector.get(token, notFoundValue, options);
  }
}
function computeStaticStyling(tNode, attrs, writeToHost) {
  let styles = writeToHost ? tNode.styles : null;
  let classes = writeToHost ? tNode.classes : null;
  let mode = 0;
  if (attrs !== null) {
    for (let i = 0; i < attrs.length; i++) {
      const value = attrs[i];
      if (typeof value === "number") {
        mode = value;
      } else if (mode == 1) {
        classes = concatStringsWithSpace(classes, value);
      } else if (mode == 2) {
        const style = value;
        const styleValue = attrs[++i];
        styles = concatStringsWithSpace(styles, style + ": " + styleValue + ";");
      }
    }
  }
  writeToHost ? tNode.styles = styles : tNode.stylesWithoutHost = styles;
  writeToHost ? tNode.classes = classes : tNode.classesWithoutHost = classes;
}
function ɵɵdirectiveInject(token, flags = 0) {
  const lView = getLView();
  if (lView === null) {
    return ɵɵinject(token, flags);
  }
  const tNode = getCurrentTNode();
  const value = getOrCreateInjectable(tNode, lView, resolveForwardRef(token), flags);
  return value;
}
function resolveDirectives(tView, lView, tNode, localRefs, directiveMatcher) {
  const exportsMap = localRefs === null ? null : {
    "": -1
  };
  const matchedDirectiveDefs = directiveMatcher(tView, tNode);
  if (matchedDirectiveDefs !== null) {
    let directiveDefs = matchedDirectiveDefs;
    let hostDirectiveDefs = null;
    let hostDirectiveRanges = null;
    for (const def of matchedDirectiveDefs) {
      if (def.resolveHostDirectives !== null) {
        [directiveDefs, hostDirectiveDefs, hostDirectiveRanges] = def.resolveHostDirectives(matchedDirectiveDefs);
        break;
      }
    }
    initializeDirectives(tView, lView, tNode, directiveDefs, exportsMap, hostDirectiveDefs, hostDirectiveRanges);
  }
  if (exportsMap !== null && localRefs !== null) {
    cacheMatchingLocalNames(tNode, localRefs, exportsMap);
  }
}
function cacheMatchingLocalNames(tNode, localRefs, exportsMap) {
  const localNames = tNode.localNames = [];
  for (let i = 0; i < localRefs.length; i += 2) {
    const index = exportsMap[localRefs[i + 1]];
    if (index == null) throw new RuntimeError(-301, false);
    localNames.push(localRefs[i], index);
  }
}
function markAsComponentHost(tView, hostTNode, componentOffset) {
  hostTNode.componentOffset = componentOffset;
  (tView.components ??= []).push(hostTNode.index);
}
function initializeDirectives(tView, lView, tNode, directives, exportsMap, hostDirectiveDefs, hostDirectiveRanges) {
  const directivesLength = directives.length;
  let hasSeenComponent = false;
  for (let i = 0; i < directivesLength; i++) {
    const def = directives[i];
    if (!hasSeenComponent && isComponentDef(def)) {
      hasSeenComponent = true;
      markAsComponentHost(tView, tNode, i);
    }
    diPublicInInjector(getOrCreateNodeInjectorForNode(tNode, lView), tView, def.type);
  }
  initTNodeFlags(tNode, tView.data.length, directivesLength);
  for (let i = 0; i < directivesLength; i++) {
    const def = directives[i];
    if (def.providersResolver) def.providersResolver(def);
  }
  let preOrderHooksFound = false;
  let preOrderCheckHooksFound = false;
  let directiveIdx = allocExpando(tView, lView, directivesLength, null);
  if (directivesLength > 0) {
    tNode.directiveToIndex = /* @__PURE__ */ new Map();
  }
  for (let i = 0; i < directivesLength; i++) {
    const def = directives[i];
    tNode.mergedAttrs = mergeHostAttrs(tNode.mergedAttrs, def.hostAttrs);
    configureViewWithDirective(tView, tNode, lView, directiveIdx, def);
    saveNameToExportMap(directiveIdx, def, exportsMap);
    if (hostDirectiveRanges !== null && hostDirectiveRanges.has(def)) {
      const [start, end] = hostDirectiveRanges.get(def);
      tNode.directiveToIndex.set(def.type, [directiveIdx, start + tNode.directiveStart, end + tNode.directiveStart]);
    } else if (hostDirectiveDefs === null || !hostDirectiveDefs.has(def)) {
      tNode.directiveToIndex.set(def.type, directiveIdx);
    }
    if (def.contentQueries !== null) tNode.flags |= 4;
    if (def.hostBindings !== null || def.hostAttrs !== null || def.hostVars !== 0) tNode.flags |= 64;
    const lifeCycleHooks = def.type.prototype;
    if (!preOrderHooksFound && (lifeCycleHooks.ngOnChanges || lifeCycleHooks.ngOnInit || lifeCycleHooks.ngDoCheck)) {
      (tView.preOrderHooks ??= []).push(tNode.index);
      preOrderHooksFound = true;
    }
    if (!preOrderCheckHooksFound && (lifeCycleHooks.ngOnChanges || lifeCycleHooks.ngDoCheck)) {
      (tView.preOrderCheckHooks ??= []).push(tNode.index);
      preOrderCheckHooksFound = true;
    }
    directiveIdx++;
  }
  initializeInputAndOutputAliases(tView, tNode, hostDirectiveDefs);
}
function initializeInputAndOutputAliases(tView, tNode, hostDirectiveDefs) {
  for (let index = tNode.directiveStart; index < tNode.directiveEnd; index++) {
    const directiveDef = tView.data[index];
    if (hostDirectiveDefs === null || !hostDirectiveDefs.has(directiveDef)) {
      setupSelectorMatchedInputsOrOutputs(0, tNode, directiveDef, index);
      setupSelectorMatchedInputsOrOutputs(1, tNode, directiveDef, index);
      setupInitialInputs(tNode, index, false);
    } else {
      const hostDirectiveDef = hostDirectiveDefs.get(directiveDef);
      setupHostDirectiveInputsOrOutputs(0, tNode, hostDirectiveDef, index);
      setupHostDirectiveInputsOrOutputs(1, tNode, hostDirectiveDef, index);
      setupInitialInputs(tNode, index, true);
    }
  }
}
function setupSelectorMatchedInputsOrOutputs(mode, tNode, def, directiveIndex) {
  const aliasMap = mode === 0 ? def.inputs : def.outputs;
  for (const publicName in aliasMap) {
    if (aliasMap.hasOwnProperty(publicName)) {
      let bindings;
      if (mode === 0) {
        bindings = tNode.inputs ??= {};
      } else {
        bindings = tNode.outputs ??= {};
      }
      bindings[publicName] ??= [];
      bindings[publicName].push(directiveIndex);
      setShadowStylingInputFlags(tNode, publicName);
    }
  }
}
function setupHostDirectiveInputsOrOutputs(mode, tNode, config, directiveIndex) {
  const aliasMap = mode === 0 ? config.inputs : config.outputs;
  for (const initialName in aliasMap) {
    if (aliasMap.hasOwnProperty(initialName)) {
      const publicName = aliasMap[initialName];
      let bindings;
      if (mode === 0) {
        bindings = tNode.hostDirectiveInputs ??= {};
      } else {
        bindings = tNode.hostDirectiveOutputs ??= {};
      }
      bindings[publicName] ??= [];
      bindings[publicName].push(directiveIndex, initialName);
      setShadowStylingInputFlags(tNode, publicName);
    }
  }
}
function setShadowStylingInputFlags(tNode, publicName) {
  if (publicName === "class") {
    tNode.flags |= 8;
  } else if (publicName === "style") {
    tNode.flags |= 16;
  }
}
function setupInitialInputs(tNode, directiveIndex, isHostDirective) {
  const {
    attrs,
    inputs,
    hostDirectiveInputs
  } = tNode;
  if (attrs === null || !isHostDirective && inputs === null || isHostDirective && hostDirectiveInputs === null || // Do not use unbound attributes as inputs to structural directives, since structural
  // directive inputs can only be set using microsyntax (e.g. `<div *dir="exp">`).
  isInlineTemplate(tNode)) {
    tNode.initialInputs ??= [];
    tNode.initialInputs.push(null);
    return;
  }
  let inputsToStore = null;
  let i = 0;
  while (i < attrs.length) {
    const attrName = attrs[i];
    if (attrName === 0) {
      i += 4;
      continue;
    } else if (attrName === 5) {
      i += 2;
      continue;
    } else if (typeof attrName === "number") {
      break;
    }
    if (!isHostDirective && inputs.hasOwnProperty(attrName)) {
      const inputConfig = inputs[attrName];
      for (const index of inputConfig) {
        if (index === directiveIndex) {
          inputsToStore ??= [];
          inputsToStore.push(attrName, attrs[i + 1]);
          break;
        }
      }
    } else if (isHostDirective && hostDirectiveInputs.hasOwnProperty(attrName)) {
      const config = hostDirectiveInputs[attrName];
      for (let j = 0; j < config.length; j += 2) {
        if (config[j] === directiveIndex) {
          inputsToStore ??= [];
          inputsToStore.push(config[j + 1], attrs[i + 1]);
          break;
        }
      }
    }
    i += 2;
  }
  tNode.initialInputs ??= [];
  tNode.initialInputs.push(inputsToStore);
}
function configureViewWithDirective(tView, tNode, lView, directiveIndex, def) {
  tView.data[directiveIndex] = def;
  const directiveFactory = def.factory || (def.factory = getFactoryDef(def.type));
  const nodeInjectorFactory = new NodeInjectorFactory(directiveFactory, isComponentDef(def), ɵɵdirectiveInject, null);
  tView.blueprint[directiveIndex] = nodeInjectorFactory;
  lView[directiveIndex] = nodeInjectorFactory;
  registerHostBindingOpCodes(tView, tNode, directiveIndex, allocExpando(tView, lView, def.hostVars, NO_CHANGE), def);
}
function registerHostBindingOpCodes(tView, tNode, directiveIdx, directiveVarsIdx, def) {
  const hostBindings = def.hostBindings;
  if (hostBindings) {
    let hostBindingOpCodes = tView.hostBindingOpCodes;
    if (hostBindingOpCodes === null) {
      hostBindingOpCodes = tView.hostBindingOpCodes = [];
    }
    const elementIndx = ~tNode.index;
    if (lastSelectedElementIdx(hostBindingOpCodes) != elementIndx) {
      hostBindingOpCodes.push(elementIndx);
    }
    hostBindingOpCodes.push(directiveIdx, directiveVarsIdx, hostBindings);
  }
}
function lastSelectedElementIdx(hostBindingOpCodes) {
  let i = hostBindingOpCodes.length;
  while (i > 0) {
    const value = hostBindingOpCodes[--i];
    if (typeof value === "number" && value < 0) {
      return value;
    }
  }
  return 0;
}
function saveNameToExportMap(directiveIdx, def, exportsMap) {
  if (exportsMap) {
    if (def.exportAs) {
      for (let i = 0; i < def.exportAs.length; i++) {
        exportsMap[def.exportAs[i]] = directiveIdx;
      }
    }
    if (isComponentDef(def)) exportsMap[""] = directiveIdx;
  }
}
function initTNodeFlags(tNode, index, numberOfDirectives) {
  tNode.flags |= 1;
  tNode.directiveStart = index;
  tNode.directiveEnd = index + numberOfDirectives;
  tNode.providerIndexes = index;
}
function directiveHostFirstCreatePass(index, lView, type, name, directiveMatcher, bindingsEnabled, attrsIndex, localRefsIndex) {
  const tView = lView[TVIEW];
  const tViewConsts = tView.consts;
  const attrs = getConstant(tViewConsts, attrsIndex);
  const tNode = getOrCreateTNode(tView, index, type, name, attrs);
  {
    resolveDirectives(tView, lView, tNode, getConstant(tViewConsts, localRefsIndex), directiveMatcher);
  }
  tNode.mergedAttrs = mergeHostAttrs(tNode.mergedAttrs, tNode.attrs);
  if (tNode.attrs !== null) {
    computeStaticStyling(tNode, tNode.attrs, false);
  }
  if (tNode.mergedAttrs !== null) {
    computeStaticStyling(tNode, tNode.mergedAttrs, true);
  }
  if (tView.queries !== null) {
    tView.queries.elementStart(tView, tNode);
  }
  return tNode;
}
function directiveHostEndFirstCreatePass(tView, tNode) {
  registerPostOrderHooks(tView, tNode);
  if (isContentQueryHost(tNode)) {
    tView.queries.elementEnd(tNode);
  }
}
function domOnlyFirstCreatePass(index, tView, type, name, attrsIndex, localRefsIndex) {
  const tViewConsts = tView.consts;
  const attrs = getConstant(tViewConsts, attrsIndex);
  const tNode = getOrCreateTNode(tView, index, type, name, attrs);
  tNode.mergedAttrs = mergeHostAttrs(tNode.mergedAttrs, tNode.attrs);
  if (localRefsIndex != null) {
    const refs = getConstant(tViewConsts, localRefsIndex);
    tNode.localNames = [];
    for (let i = 0; i < refs.length; i += 2) {
      tNode.localNames.push(refs[i], -1);
    }
  }
  if (tNode.attrs !== null) {
    computeStaticStyling(tNode, tNode.attrs, false);
  }
  if (tNode.mergedAttrs !== null) {
    computeStaticStyling(tNode, tNode.mergedAttrs, true);
  }
  if (tView.queries !== null) {
    tView.queries.elementStart(tView, tNode);
  }
  return tNode;
}
function bindingUpdated(lView, bindingIndex, value) {
  if (value === NO_CHANGE) {
    return false;
  }
  const oldValue = lView[bindingIndex];
  if (Object.is(oldValue, value)) {
    return false;
  } else {
    lView[bindingIndex] = value;
    return true;
  }
}
function wrapListener(tNode, lView, listenerFn) {
  return function wrapListenerIn_markDirtyAndPreventDefault(event) {
    const startView = isComponentHost(tNode) ? getComponentLViewByIndex(tNode.index, lView) : lView;
    markViewDirty(
      startView,
      5
      /* NotificationSource.Listener */
    );
    const context = lView[CONTEXT];
    let result = executeListenerWithErrorHandling(lView, context, listenerFn, event);
    let nextListenerFn = wrapListenerIn_markDirtyAndPreventDefault.__ngNextListenerFn__;
    while (nextListenerFn) {
      result = executeListenerWithErrorHandling(lView, context, nextListenerFn, event) && result;
      nextListenerFn = nextListenerFn.__ngNextListenerFn__;
    }
    return result;
  };
}
function executeListenerWithErrorHandling(lView, context, listenerFn, e) {
  const prevConsumer = setActiveConsumer(null);
  try {
    profiler(6, context, listenerFn);
    return listenerFn(e) !== false;
  } catch (error) {
    handleUncaughtError(lView, error);
    return false;
  } finally {
    profiler(7, context, listenerFn);
    setActiveConsumer(prevConsumer);
  }
}
function listenToDomEvent(tNode, tView, lView, eventTargetResolver, renderer, eventName, originalListener, wrappedListener) {
  const isTNodeDirectiveHost = isDirectiveHost(tNode);
  let hasCoalesced = false;
  let existingListener = null;
  if (!eventTargetResolver && isTNodeDirectiveHost) {
    existingListener = findExistingListener(tView, lView, eventName, tNode.index);
  }
  if (existingListener !== null) {
    const lastListenerFn = existingListener.__ngLastListenerFn__ || existingListener;
    lastListenerFn.__ngNextListenerFn__ = originalListener;
    existingListener.__ngLastListenerFn__ = originalListener;
    hasCoalesced = true;
  } else {
    const native = getNativeByTNode(tNode, lView);
    const target = eventTargetResolver ? eventTargetResolver(native) : native;
    const cleanupFn = renderer.listen(target, eventName, wrappedListener);
    const idxOrTargetGetter = eventTargetResolver ? (_lView) => eventTargetResolver(unwrapRNode(_lView[tNode.index])) : tNode.index;
    storeListenerCleanup(idxOrTargetGetter, tView, lView, eventName, wrappedListener, cleanupFn, false);
  }
  return hasCoalesced;
}
function findExistingListener(tView, lView, eventName, tNodeIndex) {
  const tCleanup = tView.cleanup;
  if (tCleanup != null) {
    for (let i = 0; i < tCleanup.length - 1; i += 2) {
      const cleanupEventName = tCleanup[i];
      if (cleanupEventName === eventName && tCleanup[i + 1] === tNodeIndex) {
        const lCleanup = lView[CLEANUP];
        const listenerIdxInLCleanup = tCleanup[i + 2];
        return lCleanup && lCleanup.length > listenerIdxInLCleanup ? lCleanup[listenerIdxInLCleanup] : null;
      }
      if (typeof cleanupEventName === "string") {
        i += 2;
      }
    }
  }
  return null;
}
function storeListenerCleanup(indexOrTargetGetter, tView, lView, eventName, listenerFn, cleanup, isOutput) {
  const tCleanup = tView.firstCreatePass ? getOrCreateTViewCleanup(tView) : null;
  const lCleanup = getOrCreateLViewCleanup(lView);
  const index = lCleanup.length;
  lCleanup.push(listenerFn, cleanup);
  tCleanup && tCleanup.push(eventName, indexOrTargetGetter, index, (index + 1) * (isOutput ? -1 : 1));
}
function listenToOutput(tNode, lView, directiveIndex, lookupName, eventName, listenerFn) {
  const instance = lView[directiveIndex];
  const tView = lView[TVIEW];
  const def = tView.data[directiveIndex];
  const propertyName = def.outputs[lookupName];
  const output = instance[propertyName];
  const subscription = output.subscribe(listenerFn);
  storeListenerCleanup(tNode.index, tView, lView, eventName, listenerFn, subscription, true);
}
/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
const BINDING = /* @__PURE__ */ Symbol("BINDING");
class ComponentFactoryResolver2 extends ComponentFactoryResolver$1 {
  ngModule;
  /**
   * @param ngModule The NgModuleRef to which all resolved factories are bound.
   */
  constructor(ngModule) {
    super();
    this.ngModule = ngModule;
  }
  resolveComponentFactory(component) {
    const componentDef = getComponentDef(component);
    return new ComponentFactory2(componentDef, this.ngModule);
  }
}
function toInputRefArray(map2) {
  return Object.keys(map2).map((name) => {
    const [propName, flags, transform] = map2[name];
    const inputData = {
      propName,
      templateName: name,
      isSignal: (flags & InputFlags.SignalBased) !== 0
    };
    if (transform) {
      inputData.transform = transform;
    }
    return inputData;
  });
}
function toOutputRefArray(map2) {
  return Object.keys(map2).map((name) => ({
    propName: map2[name],
    templateName: name
  }));
}
function createRootViewInjector(componentDef, environmentInjector, injector) {
  let realEnvironmentInjector = environmentInjector instanceof EnvironmentInjector ? environmentInjector : environmentInjector?.injector;
  if (realEnvironmentInjector && componentDef.getStandaloneInjector !== null) {
    realEnvironmentInjector = componentDef.getStandaloneInjector(realEnvironmentInjector) || realEnvironmentInjector;
  }
  const rootViewInjector = realEnvironmentInjector ? new ChainedInjector(injector, realEnvironmentInjector) : injector;
  return rootViewInjector;
}
function createRootLViewEnvironment(rootLViewInjector) {
  const rendererFactory = rootLViewInjector.get(RendererFactory2, null);
  if (rendererFactory === null) {
    throw new RuntimeError(407, false);
  }
  const sanitizer = rootLViewInjector.get(Sanitizer, null);
  const changeDetectionScheduler = rootLViewInjector.get(ChangeDetectionScheduler, null);
  let ngReflect = false;
  return {
    rendererFactory,
    sanitizer,
    changeDetectionScheduler,
    ngReflect
  };
}
function createHostElement(componentDef, renderer) {
  const tagName = inferTagNameFromDefinition(componentDef);
  const namespace = tagName === "svg" ? SVG_NAMESPACE : tagName === "math" ? MATH_ML_NAMESPACE : null;
  return createElementNode(renderer, tagName, namespace);
}
function inferTagNameFromDefinition(componentDef) {
  return (componentDef.selectors[0][0] || "div").toLowerCase();
}
class ComponentFactory2 extends ComponentFactory$1 {
  componentDef;
  ngModule;
  selector;
  componentType;
  ngContentSelectors;
  isBoundToModule;
  cachedInputs = null;
  cachedOutputs = null;
  get inputs() {
    this.cachedInputs ??= toInputRefArray(this.componentDef.inputs);
    return this.cachedInputs;
  }
  get outputs() {
    this.cachedOutputs ??= toOutputRefArray(this.componentDef.outputs);
    return this.cachedOutputs;
  }
  /**
   * @param componentDef The component definition.
   * @param ngModule The NgModuleRef to which the factory is bound.
   */
  constructor(componentDef, ngModule) {
    super();
    this.componentDef = componentDef;
    this.ngModule = ngModule;
    this.componentType = componentDef.type;
    this.selector = stringifyCSSSelectorList(componentDef.selectors);
    this.ngContentSelectors = componentDef.ngContentSelectors ?? [];
    this.isBoundToModule = !!ngModule;
  }
  create(injector, projectableNodes, rootSelectorOrNode, environmentInjector, directives, componentBindings) {
    profiler(
      22
      /* ProfilerEvent.DynamicComponentStart */
    );
    const prevConsumer = setActiveConsumer(null);
    try {
      const cmpDef = this.componentDef;
      const rootTView = createRootTView(rootSelectorOrNode, cmpDef, componentBindings, directives);
      const rootViewInjector = createRootViewInjector(cmpDef, environmentInjector || this.ngModule, injector);
      const environment = createRootLViewEnvironment(rootViewInjector);
      const hostRenderer = environment.rendererFactory.createRenderer(null, cmpDef);
      const hostElement = rootSelectorOrNode ? locateHostElement(hostRenderer, rootSelectorOrNode, cmpDef.encapsulation, rootViewInjector) : createHostElement(cmpDef, hostRenderer);
      const hasInputBindings = componentBindings?.some(isInputBinding) || directives?.some((d) => typeof d !== "function" && d.bindings.some(isInputBinding));
      const rootLView = createLView(null, rootTView, null, 512 | getInitialLViewFlagsFromDef(cmpDef), null, null, environment, hostRenderer, rootViewInjector, null, retrieveHydrationInfo(
        hostElement,
        rootViewInjector,
        true
        /* isRootView */
      ));
      rootLView[HEADER_OFFSET] = hostElement;
      enterView(rootLView);
      let componentView = null;
      try {
        const hostTNode = directiveHostFirstCreatePass(HEADER_OFFSET, rootLView, 2, "#host", () => rootTView.directiveRegistry, true, 0);
        if (hostElement) {
          setupStaticAttributes(hostRenderer, hostElement, hostTNode);
          attachPatchData(hostElement, rootLView);
        }
        createDirectivesInstances(rootTView, rootLView, hostTNode);
        executeContentQueries(rootTView, hostTNode, rootLView);
        directiveHostEndFirstCreatePass(rootTView, hostTNode);
        if (projectableNodes !== void 0) {
          projectNodes(hostTNode, this.ngContentSelectors, projectableNodes);
        }
        componentView = getComponentLViewByIndex(hostTNode.index, rootLView);
        rootLView[CONTEXT] = componentView[CONTEXT];
        renderView(rootTView, rootLView, null);
      } catch (e) {
        if (componentView !== null) {
          unregisterLView(componentView);
        }
        unregisterLView(rootLView);
        throw e;
      } finally {
        profiler(
          23
          /* ProfilerEvent.DynamicComponentEnd */
        );
        leaveView();
      }
      return new ComponentRef2(this.componentType, rootLView, !!hasInputBindings);
    } finally {
      setActiveConsumer(prevConsumer);
    }
  }
}
function createRootTView(rootSelectorOrNode, componentDef, componentBindings, directives) {
  const tAttributes = rootSelectorOrNode ? ["ng-version", "20.2.4"] : (
    // Extract attributes and classes from the first selector only to match VE behavior.
    extractAttrsAndClassesFromSelector(componentDef.selectors[0])
  );
  let creationBindings = null;
  let updateBindings = null;
  let varsToAllocate = 0;
  if (componentBindings) {
    for (const binding of componentBindings) {
      varsToAllocate += binding[BINDING].requiredVars;
      if (binding.create) {
        binding.targetIdx = 0;
        (creationBindings ??= []).push(binding);
      }
      if (binding.update) {
        binding.targetIdx = 0;
        (updateBindings ??= []).push(binding);
      }
    }
  }
  if (directives) {
    for (let i = 0; i < directives.length; i++) {
      const directive = directives[i];
      if (typeof directive !== "function") {
        for (const binding of directive.bindings) {
          varsToAllocate += binding[BINDING].requiredVars;
          const targetDirectiveIdx = i + 1;
          if (binding.create) {
            binding.targetIdx = targetDirectiveIdx;
            (creationBindings ??= []).push(binding);
          }
          if (binding.update) {
            binding.targetIdx = targetDirectiveIdx;
            (updateBindings ??= []).push(binding);
          }
        }
      }
    }
  }
  const directivesToApply = [componentDef];
  if (directives) {
    for (const directive of directives) {
      const directiveType = typeof directive === "function" ? directive : directive.type;
      const directiveDef = getDirectiveDef(directiveType);
      directivesToApply.push(directiveDef);
    }
  }
  const rootTView = createTView(0, null, getRootTViewTemplate(creationBindings, updateBindings), 1, varsToAllocate, directivesToApply, null, null, null, [tAttributes], null);
  return rootTView;
}
function getRootTViewTemplate(creationBindings, updateBindings) {
  if (!creationBindings && !updateBindings) {
    return null;
  }
  return (flags) => {
    if (flags & 1 && creationBindings) {
      for (const binding of creationBindings) {
        binding.create();
      }
    }
    if (flags & 2 && updateBindings) {
      for (const binding of updateBindings) {
        binding.update();
      }
    }
  };
}
function isInputBinding(binding) {
  const kind = binding[BINDING].kind;
  return kind === "input" || kind === "twoWay";
}
class ComponentRef2 extends ComponentRef$1 {
  _rootLView;
  _hasInputBindings;
  instance;
  hostView;
  changeDetectorRef;
  componentType;
  location;
  previousInputValues = null;
  _tNode;
  constructor(componentType, _rootLView, _hasInputBindings) {
    super();
    this._rootLView = _rootLView;
    this._hasInputBindings = _hasInputBindings;
    this._tNode = getTNode(_rootLView[TVIEW], HEADER_OFFSET);
    this.location = createElementRef(this._tNode, _rootLView);
    this.instance = getComponentLViewByIndex(this._tNode.index, _rootLView)[CONTEXT];
    this.hostView = this.changeDetectorRef = new ViewRef(
      _rootLView,
      void 0
      /* _cdRefInjectingView */
    );
    this.componentType = componentType;
  }
  setInput(name, value) {
    if (this._hasInputBindings && false) ;
    const tNode = this._tNode;
    this.previousInputValues ??= /* @__PURE__ */ new Map();
    if (this.previousInputValues.has(name) && Object.is(this.previousInputValues.get(name), value)) {
      return;
    }
    const lView = this._rootLView;
    setAllInputsForProperty(tNode, lView[TVIEW], lView, name, value);
    this.previousInputValues.set(name, value);
    const childComponentLView = getComponentLViewByIndex(tNode.index, lView);
    markViewDirty(
      childComponentLView,
      1
      /* NotificationSource.SetInput */
    );
  }
  get injector() {
    return new NodeInjector(this._tNode, this._rootLView);
  }
  destroy() {
    this.hostView.destroy();
  }
  onDestroy(callback) {
    this.hostView.onDestroy(callback);
  }
}
function projectNodes(tNode, ngContentSelectors, projectableNodes) {
  const projection = tNode.projection = [];
  for (let i = 0; i < ngContentSelectors.length; i++) {
    const nodesforSlot = projectableNodes[i];
    projection.push(nodesforSlot != null && nodesforSlot.length ? Array.from(nodesforSlot) : null);
  }
}
const markedFeatures = /* @__PURE__ */ new Set();
function performanceMarkFeature(feature) {
  if (markedFeatures.has(feature)) {
    return;
  }
  markedFeatures.add(feature);
  performance?.mark?.("mark_feature_usage", {
    detail: {
      feature
    }
  });
}
let NgModuleRef$1 = class NgModuleRef {
};
let NgModuleFactory$1 = class NgModuleFactory {
};
class NgModuleRef2 extends NgModuleRef$1 {
  ngModuleType;
  _parent;
  // tslint:disable-next-line:require-internal-with-underscore
  _bootstrapComponents = [];
  _r3Injector;
  instance;
  destroyCbs = [];
  // When bootstrapping a module we have a dependency graph that looks like this:
  // ApplicationRef -> ComponentFactoryResolver -> NgModuleRef. The problem is that if the
  // module being resolved tries to inject the ComponentFactoryResolver, it'll create a
  // circular dependency which will result in a runtime error, because the injector doesn't
  // exist yet. We work around the issue by creating the ComponentFactoryResolver ourselves
  // and providing it, rather than letting the injector resolve it.
  componentFactoryResolver = /* @__PURE__ */ new ComponentFactoryResolver2(this);
  constructor(ngModuleType, _parent, additionalProviders, runInjectorInitializers = true) {
    super();
    this.ngModuleType = ngModuleType;
    this._parent = _parent;
    const ngModuleDef = getNgModuleDef(ngModuleType);
    this._bootstrapComponents = maybeUnwrapFn(ngModuleDef.bootstrap);
    this._r3Injector = createInjectorWithoutInjectorInstances(ngModuleType, _parent, [{
      provide: NgModuleRef$1,
      useValue: this
    }, {
      provide: ComponentFactoryResolver$1,
      useValue: this.componentFactoryResolver
    }, ...additionalProviders], stringify(ngModuleType), /* @__PURE__ */ new Set(["environment"]));
    if (runInjectorInitializers) {
      this.resolveInjectorInitializers();
    }
  }
  resolveInjectorInitializers() {
    this._r3Injector.resolveInjectorInitializers();
    this.instance = this._r3Injector.get(this.ngModuleType);
  }
  get injector() {
    return this._r3Injector;
  }
  destroy() {
    const injector = this._r3Injector;
    !injector.destroyed && injector.destroy();
    this.destroyCbs.forEach((fn) => fn());
    this.destroyCbs = null;
  }
  onDestroy(callback) {
    this.destroyCbs.push(callback);
  }
}
class NgModuleFactory2 extends NgModuleFactory$1 {
  moduleType;
  constructor(moduleType) {
    super();
    this.moduleType = moduleType;
  }
  create(parentInjector) {
    return new NgModuleRef2(this.moduleType, parentInjector, []);
  }
}
function createNgModuleRefWithProviders(moduleType, parentInjector, additionalProviders) {
  return new NgModuleRef2(moduleType, parentInjector, additionalProviders, false);
}
class EnvironmentNgModuleRefAdapter extends NgModuleRef$1 {
  injector;
  componentFactoryResolver = /* @__PURE__ */ new ComponentFactoryResolver2(this);
  instance = null;
  constructor(config) {
    super();
    const injector = new R3Injector([...config.providers, {
      provide: NgModuleRef$1,
      useValue: this
    }, {
      provide: ComponentFactoryResolver$1,
      useValue: this.componentFactoryResolver
    }], config.parent || getNullInjector(), config.debugName, /* @__PURE__ */ new Set(["environment"]));
    this.injector = injector;
    if (config.runEnvironmentInitializers) {
      injector.resolveInjectorInitializers();
    }
  }
  destroy() {
    this.injector.destroy();
  }
  onDestroy(callback) {
    this.injector.onDestroy(callback);
  }
}
function createEnvironmentInjector(providers, parent, debugName = null) {
  const adapter = new EnvironmentNgModuleRefAdapter({
    providers,
    parent,
    debugName,
    runEnvironmentInitializers: true
  });
  return adapter.injector;
}
let StandaloneService = /* @__PURE__ */ (() => {
  class StandaloneService2 {
    _injector;
    cachedInjectors = /* @__PURE__ */ new Map();
    constructor(_injector) {
      this._injector = _injector;
    }
    getOrCreateStandaloneInjector(componentDef) {
      if (!componentDef.standalone) {
        return null;
      }
      if (!this.cachedInjectors.has(componentDef)) {
        const providers = internalImportProvidersFrom(false, componentDef.type);
        const standaloneInjector = providers.length > 0 ? createEnvironmentInjector([providers], this._injector, `Standalone[${componentDef.type.name}]`) : null;
        this.cachedInjectors.set(componentDef, standaloneInjector);
      }
      return this.cachedInjectors.get(componentDef);
    }
    ngOnDestroy() {
      try {
        for (const injector of this.cachedInjectors.values()) {
          if (injector !== null) {
            injector.destroy();
          }
        }
      } finally {
        this.cachedInjectors.clear();
      }
    }
    /** @nocollapse */
    static ɵprov = (
      /** @pureOrBreakMyCode */
      /* @__PURE__ */ ɵɵdefineInjectable({
        token: StandaloneService2,
        providedIn: "environment",
        factory: () => new StandaloneService2(ɵɵinject(EnvironmentInjector))
      })
    );
  }
  return StandaloneService2;
})();
function ɵɵdefineComponent(componentDefinition) {
  return noSideEffects(() => {
    const baseDef = getNgDirectiveDef(componentDefinition);
    const def = {
      ...baseDef,
      decls: componentDefinition.decls,
      vars: componentDefinition.vars,
      template: componentDefinition.template,
      consts: componentDefinition.consts || null,
      ngContentSelectors: componentDefinition.ngContentSelectors,
      onPush: componentDefinition.changeDetection === ChangeDetectionStrategy.OnPush,
      directiveDefs: null,
      // assigned in noSideEffects
      pipeDefs: null,
      // assigned in noSideEffects
      dependencies: baseDef.standalone && componentDefinition.dependencies || null,
      getStandaloneInjector: baseDef.standalone ? (parentInjector) => {
        return parentInjector.get(StandaloneService).getOrCreateStandaloneInjector(def);
      } : null,
      getExternalStyles: null,
      signals: componentDefinition.signals ?? false,
      data: componentDefinition.data || {},
      encapsulation: componentDefinition.encapsulation || ViewEncapsulation.Emulated,
      styles: componentDefinition.styles || EMPTY_ARRAY,
      _: null,
      schemas: componentDefinition.schemas || null,
      tView: null,
      id: ""
    };
    if (baseDef.standalone) {
      performanceMarkFeature("NgStandalone");
    }
    initFeatures(def);
    const dependencies = componentDefinition.dependencies;
    def.directiveDefs = extractDefListOrFactory(dependencies, extractDirectiveDef);
    def.pipeDefs = extractDefListOrFactory(dependencies, getPipeDef);
    def.id = getComponentId(def);
    return def;
  });
}
function extractDirectiveDef(type) {
  return getComponentDef(type) || getDirectiveDef(type);
}
function parseAndConvertInputsForDefinition(obj, declaredInputs) {
  if (obj == null) return EMPTY_OBJ;
  const newLookup = {};
  for (const minifiedKey in obj) {
    if (obj.hasOwnProperty(minifiedKey)) {
      const value = obj[minifiedKey];
      let publicName;
      let declaredName;
      let inputFlags;
      let transform;
      if (Array.isArray(value)) {
        inputFlags = value[0];
        publicName = value[1];
        declaredName = value[2] ?? publicName;
        transform = value[3] || null;
      } else {
        publicName = value;
        declaredName = value;
        inputFlags = InputFlags.None;
        transform = null;
      }
      newLookup[publicName] = [minifiedKey, inputFlags, transform];
      declaredInputs[publicName] = declaredName;
    }
  }
  return newLookup;
}
function parseAndConvertOutputsForDefinition(obj) {
  if (obj == null) return EMPTY_OBJ;
  const newLookup = {};
  for (const minifiedKey in obj) {
    if (obj.hasOwnProperty(minifiedKey)) {
      newLookup[obj[minifiedKey]] = minifiedKey;
    }
  }
  return newLookup;
}
function getNgDirectiveDef(directiveDefinition) {
  const declaredInputs = {};
  return {
    type: directiveDefinition.type,
    providersResolver: null,
    factory: null,
    hostBindings: directiveDefinition.hostBindings || null,
    hostVars: directiveDefinition.hostVars || 0,
    hostAttrs: directiveDefinition.hostAttrs || null,
    contentQueries: directiveDefinition.contentQueries || null,
    declaredInputs,
    inputConfig: directiveDefinition.inputs || EMPTY_OBJ,
    exportAs: directiveDefinition.exportAs || null,
    standalone: directiveDefinition.standalone ?? true,
    signals: directiveDefinition.signals === true,
    selectors: directiveDefinition.selectors || EMPTY_ARRAY,
    viewQuery: directiveDefinition.viewQuery || null,
    features: directiveDefinition.features || null,
    setInput: null,
    resolveHostDirectives: null,
    hostDirectives: null,
    inputs: parseAndConvertInputsForDefinition(directiveDefinition.inputs, declaredInputs),
    outputs: parseAndConvertOutputsForDefinition(directiveDefinition.outputs),
    debugInfo: null
  };
}
function initFeatures(definition) {
  definition.features?.forEach((fn) => fn(definition));
}
function extractDefListOrFactory(dependencies, defExtractor) {
  if (!dependencies) {
    return null;
  }
  return () => {
    const resolvedDependencies = typeof dependencies === "function" ? dependencies() : dependencies;
    const result = [];
    for (const dep of resolvedDependencies) {
      const definition = defExtractor(dep);
      if (definition !== null) {
        result.push(definition);
      }
    }
    return result;
  };
}
function getComponentId(componentDef) {
  let hash = 0;
  const componentDefConsts = typeof componentDef.consts === "function" ? "" : componentDef.consts;
  const hashSelectors = [
    componentDef.selectors,
    componentDef.ngContentSelectors,
    componentDef.hostVars,
    componentDef.hostAttrs,
    componentDefConsts,
    componentDef.vars,
    componentDef.decls,
    componentDef.encapsulation,
    componentDef.standalone,
    componentDef.signals,
    componentDef.exportAs,
    JSON.stringify(componentDef.inputs),
    JSON.stringify(componentDef.outputs),
    // We cannot use 'componentDef.type.name' as the name of the symbol will change and will not
    // match in the server and browser bundles.
    Object.getOwnPropertyNames(componentDef.type.prototype),
    !!componentDef.contentQueries,
    !!componentDef.viewQuery
  ];
  for (const char of hashSelectors.join("|")) {
    hash = Math.imul(31, hash) + char.charCodeAt(0) << 0;
  }
  hash += 2147483647 + 1;
  const compId = "c" + hash;
  return compId;
}
function templateCreate(tNode, declarationLView, declarationTView, index, templateFn, decls, vars, flags) {
  if (declarationTView.firstCreatePass) {
    tNode.mergedAttrs = mergeHostAttrs(tNode.mergedAttrs, tNode.attrs);
    const embeddedTView = tNode.tView = createTView(
      2,
      tNode,
      templateFn,
      decls,
      vars,
      declarationTView.directiveRegistry,
      declarationTView.pipeRegistry,
      null,
      declarationTView.schemas,
      declarationTView.consts,
      null
      /* ssrId */
    );
    if (declarationTView.queries !== null) {
      declarationTView.queries.template(declarationTView, tNode);
      embeddedTView.queries = declarationTView.queries.embeddedTView(tNode);
    }
  }
  if (flags) {
    tNode.flags |= flags;
  }
  setCurrentTNode(tNode, false);
  const comment = _locateOrCreateContainerAnchor(declarationTView, declarationLView);
  if (wasLastNodeCreated()) {
    appendChild(declarationTView, declarationLView, comment, tNode);
  }
  attachPatchData(comment, declarationLView);
  const lContainer = createLContainer(comment, declarationLView, comment, tNode);
  declarationLView[index + HEADER_OFFSET] = lContainer;
  addToEndOfViewTree(declarationLView, lContainer);
}
function declareNoDirectiveHostTemplate(declarationLView, declarationTView, index, templateFn, decls, vars, tagName, attrs, flags, localRefsIndex, localRefExtractor) {
  const adjustedIndex = index + HEADER_OFFSET;
  let tNode;
  if (declarationTView.firstCreatePass) {
    tNode = getOrCreateTNode(declarationTView, adjustedIndex, 4, tagName || null, attrs || null);
    if (localRefsIndex != null) {
      const refs = getConstant(declarationTView.consts, localRefsIndex);
      tNode.localNames = [];
      for (let i = 0; i < refs.length; i += 2) {
        tNode.localNames.push(refs[i], -1);
      }
    }
  } else {
    tNode = declarationTView.data[adjustedIndex];
  }
  templateCreate(tNode, declarationLView, declarationTView, index, templateFn, decls, vars, flags);
  if (localRefsIndex != null) {
    saveResolvedLocalsInData(declarationLView, tNode, localRefExtractor);
  }
  return tNode;
}
let _locateOrCreateContainerAnchor = createContainerAnchorImpl;
function createContainerAnchorImpl(tView, lView, tNode, index) {
  lastNodeWasCreated(true);
  return lView[RENDERER].createComment("");
}
const DEFER_BLOCK_STATE = 1;
var TracingAction = /* @__PURE__ */ (function(TracingAction2) {
  TracingAction2[TracingAction2["CHANGE_DETECTION"] = 0] = "CHANGE_DETECTION";
  TracingAction2[TracingAction2["AFTER_NEXT_RENDER"] = 1] = "AFTER_NEXT_RENDER";
  return TracingAction2;
})(TracingAction || {});
const TracingService = /* @__PURE__ */ new InjectionToken("");
const SCHEDULE_IN_ROOT_ZONE_DEFAULT = false;
class EventEmitter_ extends Subject {
  // tslint:disable-next-line:require-internal-with-underscore
  __isAsync;
  destroyRef = void 0;
  pendingTasks = void 0;
  constructor(isAsync = false) {
    super();
    this.__isAsync = isAsync;
    if (isInInjectionContext()) {
      this.destroyRef = inject(DestroyRef, {
        optional: true
      }) ?? void 0;
      this.pendingTasks = inject(PendingTasksInternal, {
        optional: true
      }) ?? void 0;
    }
  }
  emit(value) {
    const prevConsumer = setActiveConsumer(null);
    try {
      super.next(value);
    } finally {
      setActiveConsumer(prevConsumer);
    }
  }
  subscribe(observerOrNext, error, complete) {
    let nextFn = observerOrNext;
    let errorFn = error || (() => null);
    let completeFn = complete;
    if (observerOrNext && typeof observerOrNext === "object") {
      const observer = observerOrNext;
      nextFn = observer.next?.bind(observer);
      errorFn = observer.error?.bind(observer);
      completeFn = observer.complete?.bind(observer);
    }
    if (this.__isAsync) {
      errorFn = this.wrapInTimeout(errorFn);
      if (nextFn) {
        nextFn = this.wrapInTimeout(nextFn);
      }
      if (completeFn) {
        completeFn = this.wrapInTimeout(completeFn);
      }
    }
    const sink = super.subscribe({
      next: nextFn,
      error: errorFn,
      complete: completeFn
    });
    if (observerOrNext instanceof Subscription) {
      observerOrNext.add(sink);
    }
    return sink;
  }
  wrapInTimeout(fn) {
    return (value) => {
      const taskId = this.pendingTasks?.add();
      setTimeout(() => {
        try {
          fn(value);
        } finally {
          if (taskId !== void 0) {
            this.pendingTasks?.remove(taskId);
          }
        }
      });
    };
  }
}
const EventEmitter = EventEmitter_;
function scheduleCallbackWithRafRace(callback) {
  let timeoutId;
  let animationFrameId;
  function cleanup() {
    callback = noop;
    try {
      if (animationFrameId !== void 0 && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(animationFrameId);
      }
      if (timeoutId !== void 0) {
        clearTimeout(timeoutId);
      }
    } catch {
    }
  }
  timeoutId = setTimeout(() => {
    callback();
    cleanup();
  });
  if (typeof requestAnimationFrame === "function") {
    animationFrameId = requestAnimationFrame(() => {
      callback();
      cleanup();
    });
  }
  return () => cleanup();
}
function scheduleCallbackWithMicrotask(callback) {
  queueMicrotask(() => callback());
  return () => {
    callback = noop;
  };
}
const isAngularZoneProperty = "isAngularZone";
const angularZoneInstanceIdProperty = isAngularZoneProperty + "_ID";
let ngZoneInstanceId = 0;
class NgZone {
  hasPendingMacrotasks = false;
  hasPendingMicrotasks = false;
  /**
   * Whether there are no outstanding microtasks or macrotasks.
   */
  isStable = true;
  /**
   * Notifies when code enters Angular Zone. This gets fired first on VM Turn.
   */
  onUnstable = /* @__PURE__ */ new EventEmitter(false);
  /**
   * Notifies when there is no more microtasks enqueued in the current VM Turn.
   * This is a hint for Angular to do change detection, which may enqueue more microtasks.
   * For this reason this event can fire multiple times per VM Turn.
   */
  onMicrotaskEmpty = /* @__PURE__ */ new EventEmitter(false);
  /**
   * Notifies when the last `onMicrotaskEmpty` has run and there are no more microtasks, which
   * implies we are about to relinquish VM turn.
   * This event gets called just once.
   */
  onStable = /* @__PURE__ */ new EventEmitter(false);
  /**
   * Notifies that an error has been delivered.
   */
  onError = /* @__PURE__ */ new EventEmitter(false);
  constructor(options) {
    const {
      enableLongStackTrace = false,
      shouldCoalesceEventChangeDetection = false,
      shouldCoalesceRunChangeDetection = false,
      scheduleInRootZone = SCHEDULE_IN_ROOT_ZONE_DEFAULT
    } = options;
    if (typeof Zone == "undefined") {
      throw new RuntimeError(908, false);
    }
    Zone.assertZonePatched();
    const self = this;
    self._nesting = 0;
    self._outer = self._inner = Zone.current;
    if (Zone["TaskTrackingZoneSpec"]) {
      self._inner = self._inner.fork(new Zone["TaskTrackingZoneSpec"]());
    }
    if (enableLongStackTrace && Zone["longStackTraceZoneSpec"]) {
      self._inner = self._inner.fork(Zone["longStackTraceZoneSpec"]);
    }
    self.shouldCoalesceEventChangeDetection = !shouldCoalesceRunChangeDetection && shouldCoalesceEventChangeDetection;
    self.shouldCoalesceRunChangeDetection = shouldCoalesceRunChangeDetection;
    self.callbackScheduled = false;
    self.scheduleInRootZone = scheduleInRootZone;
    forkInnerZoneWithAngularBehavior(self);
  }
  /**
    This method checks whether the method call happens within an Angular Zone instance.
  */
  static isInAngularZone() {
    return typeof Zone !== "undefined" && Zone.current.get(isAngularZoneProperty) === true;
  }
  /**
    Assures that the method is called within the Angular Zone, otherwise throws an error.
  */
  static assertInAngularZone() {
    if (!NgZone.isInAngularZone()) {
      throw new RuntimeError(909, false);
    }
  }
  /**
    Assures that the method is called outside of the Angular Zone, otherwise throws an error.
  */
  static assertNotInAngularZone() {
    if (NgZone.isInAngularZone()) {
      throw new RuntimeError(909, false);
    }
  }
  /**
   * Executes the `fn` function synchronously within the Angular zone and returns value returned by
   * the function.
   *
   * Running functions via `run` allows you to reenter Angular zone from a task that was executed
   * outside of the Angular zone (typically started via {@link #runOutsideAngular}).
   *
   * Any future tasks or microtasks scheduled from within this function will continue executing from
   * within the Angular zone.
   *
   * If a synchronous error happens it will be rethrown and not reported via `onError`.
   */
  run(fn, applyThis, applyArgs) {
    return this._inner.run(fn, applyThis, applyArgs);
  }
  /**
   * Executes the `fn` function synchronously within the Angular zone as a task and returns value
   * returned by the function.
   *
   * Running functions via `runTask` allows you to reenter Angular zone from a task that was executed
   * outside of the Angular zone (typically started via {@link #runOutsideAngular}).
   *
   * Any future tasks or microtasks scheduled from within this function will continue executing from
   * within the Angular zone.
   *
   * If a synchronous error happens it will be rethrown and not reported via `onError`.
   */
  runTask(fn, applyThis, applyArgs, name) {
    const zone = this._inner;
    const task = zone.scheduleEventTask("NgZoneEvent: " + name, fn, EMPTY_PAYLOAD, noop, noop);
    try {
      return zone.runTask(task, applyThis, applyArgs);
    } finally {
      zone.cancelTask(task);
    }
  }
  /**
   * Same as `run`, except that synchronous errors are caught and forwarded via `onError` and not
   * rethrown.
   */
  runGuarded(fn, applyThis, applyArgs) {
    return this._inner.runGuarded(fn, applyThis, applyArgs);
  }
  /**
   * Executes the `fn` function synchronously in Angular's parent zone and returns value returned by
   * the function.
   *
   * Running functions via {@link #runOutsideAngular} allows you to escape Angular's zone and do
   * work that
   * doesn't trigger Angular change-detection or is subject to Angular's error handling.
   *
   * Any future tasks or microtasks scheduled from within this function will continue executing from
   * outside of the Angular zone.
   *
   * Use {@link #run} to reenter the Angular zone and do work that updates the application model.
   */
  runOutsideAngular(fn) {
    return this._outer.run(fn);
  }
}
const EMPTY_PAYLOAD = {};
function checkStable(zone) {
  if (zone._nesting == 0 && !zone.hasPendingMicrotasks && !zone.isStable) {
    try {
      zone._nesting++;
      zone.onMicrotaskEmpty.emit(null);
    } finally {
      zone._nesting--;
      if (!zone.hasPendingMicrotasks) {
        try {
          zone.runOutsideAngular(() => zone.onStable.emit(null));
        } finally {
          zone.isStable = true;
        }
      }
    }
  }
}
function delayChangeDetectionForEvents(zone) {
  if (zone.isCheckStableRunning || zone.callbackScheduled) {
    return;
  }
  zone.callbackScheduled = true;
  function scheduleCheckStable() {
    scheduleCallbackWithRafRace(() => {
      zone.callbackScheduled = false;
      updateMicroTaskStatus(zone);
      zone.isCheckStableRunning = true;
      checkStable(zone);
      zone.isCheckStableRunning = false;
    });
  }
  if (zone.scheduleInRootZone) {
    Zone.root.run(() => {
      scheduleCheckStable();
    });
  } else {
    zone._outer.run(() => {
      scheduleCheckStable();
    });
  }
  updateMicroTaskStatus(zone);
}
function forkInnerZoneWithAngularBehavior(zone) {
  const delayChangeDetectionForEventsDelegate = () => {
    delayChangeDetectionForEvents(zone);
  };
  const instanceId = ngZoneInstanceId++;
  zone._inner = zone._inner.fork({
    name: "angular",
    properties: {
      [isAngularZoneProperty]: true,
      [angularZoneInstanceIdProperty]: instanceId,
      [angularZoneInstanceIdProperty + instanceId]: true
    },
    onInvokeTask: (delegate, current, target, task, applyThis, applyArgs) => {
      if (shouldBeIgnoredByZone(applyArgs)) {
        return delegate.invokeTask(target, task, applyThis, applyArgs);
      }
      try {
        onEnter(zone);
        return delegate.invokeTask(target, task, applyThis, applyArgs);
      } finally {
        if (zone.shouldCoalesceEventChangeDetection && task.type === "eventTask" || zone.shouldCoalesceRunChangeDetection) {
          delayChangeDetectionForEventsDelegate();
        }
        onLeave(zone);
      }
    },
    onInvoke: (delegate, current, target, callback, applyThis, applyArgs, source) => {
      try {
        onEnter(zone);
        return delegate.invoke(target, callback, applyThis, applyArgs, source);
      } finally {
        if (zone.shouldCoalesceRunChangeDetection && // Do not delay change detection when the task is the scheduler's tick.
        // We need to synchronously trigger the stability logic so that the
        // zone-based scheduler can prevent a duplicate ApplicationRef.tick
        // by first checking if the scheduler tick is running. This does seem a bit roundabout,
        // but we _do_ still want to trigger all the correct events when we exit the zone.run
        // (`onMicrotaskEmpty` and `onStable` _should_ emit; developers can have code which
        // relies on these events happening after change detection runs).
        // Note: `zone.callbackScheduled` is already in delayChangeDetectionForEventsDelegate
        // but is added here as well to prevent reads of applyArgs when not necessary
        !zone.callbackScheduled && !isSchedulerTick(applyArgs)) {
          delayChangeDetectionForEventsDelegate();
        }
        onLeave(zone);
      }
    },
    onHasTask: (delegate, current, target, hasTaskState) => {
      delegate.hasTask(target, hasTaskState);
      if (current === target) {
        if (hasTaskState.change == "microTask") {
          zone._hasPendingMicrotasks = hasTaskState.microTask;
          updateMicroTaskStatus(zone);
          checkStable(zone);
        } else if (hasTaskState.change == "macroTask") {
          zone.hasPendingMacrotasks = hasTaskState.macroTask;
        }
      }
    },
    onHandleError: (delegate, current, target, error) => {
      delegate.handleError(target, error);
      zone.runOutsideAngular(() => zone.onError.emit(error));
      return false;
    }
  });
}
function updateMicroTaskStatus(zone) {
  if (zone._hasPendingMicrotasks || (zone.shouldCoalesceEventChangeDetection || zone.shouldCoalesceRunChangeDetection) && zone.callbackScheduled === true) {
    zone.hasPendingMicrotasks = true;
  } else {
    zone.hasPendingMicrotasks = false;
  }
}
function onEnter(zone) {
  zone._nesting++;
  if (zone.isStable) {
    zone.isStable = false;
    zone.onUnstable.emit(null);
  }
}
function onLeave(zone) {
  zone._nesting--;
  checkStable(zone);
}
class NoopNgZone {
  hasPendingMicrotasks = false;
  hasPendingMacrotasks = false;
  isStable = true;
  onUnstable = /* @__PURE__ */ new EventEmitter();
  onMicrotaskEmpty = /* @__PURE__ */ new EventEmitter();
  onStable = /* @__PURE__ */ new EventEmitter();
  onError = /* @__PURE__ */ new EventEmitter();
  run(fn, applyThis, applyArgs) {
    return fn.apply(applyThis, applyArgs);
  }
  runGuarded(fn, applyThis, applyArgs) {
    return fn.apply(applyThis, applyArgs);
  }
  runOutsideAngular(fn) {
    return fn();
  }
  runTask(fn, applyThis, applyArgs, name) {
    return fn.apply(applyThis, applyArgs);
  }
}
function shouldBeIgnoredByZone(applyArgs) {
  return hasApplyArgsData(applyArgs, "__ignore_ng_zone__");
}
function isSchedulerTick(applyArgs) {
  return hasApplyArgsData(applyArgs, "__scheduler_tick__");
}
function hasApplyArgsData(applyArgs, key) {
  if (!Array.isArray(applyArgs)) {
    return false;
  }
  if (applyArgs.length !== 1) {
    return false;
  }
  return applyArgs[0]?.data?.[key] === true;
}
function getNgZone(ngZoneToUse = "zone.js", options) {
  if (ngZoneToUse === "noop") {
    return new NoopNgZone();
  }
  if (ngZoneToUse === "zone.js") {
    return new NgZone(options);
  }
  return ngZoneToUse;
}
let AfterRenderManager = /* @__PURE__ */ (() => {
  class AfterRenderManager2 {
    impl = null;
    execute() {
      this.impl?.execute();
    }
    /** @nocollapse */
    static ɵprov = (
      /** @pureOrBreakMyCode */
      /* @__PURE__ */ ɵɵdefineInjectable({
        token: AfterRenderManager2,
        providedIn: "root",
        factory: () => new AfterRenderManager2()
      })
    );
  }
  return AfterRenderManager2;
})();
function getDeferBlockDataIndex(deferBlockIndex) {
  return deferBlockIndex + 1;
}
function getLDeferBlockDetails(lView, tNode) {
  lView[TVIEW];
  const slotIndex = getDeferBlockDataIndex(tNode.index);
  return lView[slotIndex];
}
function getTDeferBlockDetails(tView, tNode) {
  const slotIndex = getDeferBlockDataIndex(tNode.index);
  return tView.data[slotIndex];
}
function isTDeferBlockDetails(value) {
  return value !== null && typeof value === "object" && typeof value.primaryTmplIndex === "number";
}
function isDeferBlock(tView, tNode) {
  let tDetails = null;
  const slotIndex = getDeferBlockDataIndex(tNode.index);
  if (HEADER_OFFSET < slotIndex && slotIndex < tView.bindingStartIndex) {
    tDetails = getTDeferBlockDetails(tView, tNode);
  }
  return !!tDetails && isTDeferBlockDetails(tDetails);
}
const TESTABILITY = /* @__PURE__ */ new InjectionToken("");
const TESTABILITY_GETTER = /* @__PURE__ */ new InjectionToken("");
let Testability = /* @__PURE__ */ (() => {
  class Testability2 {
    _ngZone;
    registry;
    _isZoneStable = true;
    _callbacks = [];
    _taskTrackingZone = null;
    _destroyRef;
    constructor(_ngZone, registry, testabilityGetter) {
      this._ngZone = _ngZone;
      this.registry = registry;
      if (isInInjectionContext()) {
        this._destroyRef = inject(DestroyRef, {
          optional: true
        }) ?? void 0;
      }
      if (!_testabilityGetter) {
        setTestabilityGetter(testabilityGetter);
        testabilityGetter.addToWindow(registry);
      }
      this._watchAngularEvents();
      _ngZone.run(() => {
        this._taskTrackingZone = typeof Zone == "undefined" ? null : Zone.current.get("TaskTrackingZone");
      });
    }
    _watchAngularEvents() {
      const onUnstableSubscription = this._ngZone.onUnstable.subscribe({
        next: () => {
          this._isZoneStable = false;
        }
      });
      const onStableSubscription = this._ngZone.runOutsideAngular(() => this._ngZone.onStable.subscribe({
        next: () => {
          NgZone.assertNotInAngularZone();
          queueMicrotask(() => {
            this._isZoneStable = true;
            this._runCallbacksIfReady();
          });
        }
      }));
      this._destroyRef?.onDestroy(() => {
        onUnstableSubscription.unsubscribe();
        onStableSubscription.unsubscribe();
      });
    }
    /**
     * Whether an associated application is stable
     */
    isStable() {
      return this._isZoneStable && !this._ngZone.hasPendingMacrotasks;
    }
    _runCallbacksIfReady() {
      if (this.isStable()) {
        queueMicrotask(() => {
          while (this._callbacks.length !== 0) {
            let cb = this._callbacks.pop();
            clearTimeout(cb.timeoutId);
            cb.doneCb();
          }
        });
      } else {
        let pending = this.getPendingTasks();
        this._callbacks = this._callbacks.filter((cb) => {
          if (cb.updateCb && cb.updateCb(pending)) {
            clearTimeout(cb.timeoutId);
            return false;
          }
          return true;
        });
      }
    }
    getPendingTasks() {
      if (!this._taskTrackingZone) {
        return [];
      }
      return this._taskTrackingZone.macroTasks.map((t) => {
        return {
          source: t.source,
          // From TaskTrackingZone:
          // https://github.com/angular/zone.js/blob/master/lib/zone-spec/task-tracking.ts#L40
          creationLocation: t.creationLocation,
          data: t.data
        };
      });
    }
    addCallback(cb, timeout, updateCb) {
      let timeoutId = -1;
      if (timeout && timeout > 0) {
        timeoutId = setTimeout(() => {
          this._callbacks = this._callbacks.filter((cb2) => cb2.timeoutId !== timeoutId);
          cb();
        }, timeout);
      }
      this._callbacks.push({
        doneCb: cb,
        timeoutId,
        updateCb
      });
    }
    /**
     * Wait for the application to be stable with a timeout. If the timeout is reached before that
     * happens, the callback receives a list of the macro tasks that were pending, otherwise null.
     *
     * @param doneCb The callback to invoke when Angular is stable or the timeout expires
     *    whichever comes first.
     * @param timeout Optional. The maximum time to wait for Angular to become stable. If not
     *    specified, whenStable() will wait forever.
     * @param updateCb Optional. If specified, this callback will be invoked whenever the set of
     *    pending macrotasks changes. If this callback returns true doneCb will not be invoked
     *    and no further updates will be issued.
     */
    whenStable(doneCb, timeout, updateCb) {
      if (updateCb && !this._taskTrackingZone) {
        throw new Error('Task tracking zone is required when passing an update callback to whenStable(). Is "zone.js/plugins/task-tracking" loaded?');
      }
      this.addCallback(doneCb, timeout, updateCb);
      this._runCallbacksIfReady();
    }
    /**
     * Registers an application with a testability hook so that it can be tracked.
     * @param token token of application, root element
     *
     * @internal
     */
    registerApplication(token) {
      this.registry.registerApplication(token, this);
    }
    /**
     * Unregisters an application.
     * @param token token of application, root element
     *
     * @internal
     */
    unregisterApplication(token) {
      this.registry.unregisterApplication(token);
    }
    /**
     * Find providers by name
     * @param using The root element to search from
     * @param provider The name of binding variable
     * @param exactMatch Whether using exactMatch
     */
    findProviders(using, provider, exactMatch) {
      return [];
    }
    static ɵfac = function Testability_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || Testability2)(ɵɵinject(NgZone), ɵɵinject(TestabilityRegistry), ɵɵinject(TESTABILITY_GETTER));
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: Testability2,
      factory: Testability2.ɵfac
    });
  }
  return Testability2;
})();
let TestabilityRegistry = /* @__PURE__ */ (() => {
  class TestabilityRegistry2 {
    /** @internal */
    _applications = /* @__PURE__ */ new Map();
    /**
     * Registers an application with a testability hook so that it can be tracked
     * @param token token of application, root element
     * @param testability Testability hook
     */
    registerApplication(token, testability) {
      this._applications.set(token, testability);
    }
    /**
     * Unregisters an application.
     * @param token token of application, root element
     */
    unregisterApplication(token) {
      this._applications.delete(token);
    }
    /**
     * Unregisters all applications
     */
    unregisterAllApplications() {
      this._applications.clear();
    }
    /**
     * Get a testability hook associated with the application
     * @param elem root element
     */
    getTestability(elem) {
      return this._applications.get(elem) || null;
    }
    /**
     * Get all registered testabilities
     */
    getAllTestabilities() {
      return Array.from(this._applications.values());
    }
    /**
     * Get all registered applications(root elements)
     */
    getAllRootElements() {
      return Array.from(this._applications.keys());
    }
    /**
     * Find testability of a node in the Tree
     * @param elem node
     * @param findInAncestors whether finding testability in ancestors if testability was not found in
     * current node
     */
    findTestabilityInTree(elem, findInAncestors = true) {
      return _testabilityGetter?.findTestabilityInTree(this, elem, findInAncestors) ?? null;
    }
    static ɵfac = function TestabilityRegistry_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || TestabilityRegistry2)();
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: TestabilityRegistry2,
      factory: TestabilityRegistry2.ɵfac,
      providedIn: "platform"
    });
  }
  return TestabilityRegistry2;
})();
function setTestabilityGetter(getter) {
  _testabilityGetter = getter;
}
let _testabilityGetter;
function isPromise(obj) {
  return !!obj && typeof obj.then === "function";
}
function isSubscribable(obj) {
  return !!obj && typeof obj.subscribe === "function";
}
const APP_INITIALIZER = /* @__PURE__ */ new InjectionToken("");
let ApplicationInitStatus = /* @__PURE__ */ (() => {
  class ApplicationInitStatus2 {
    // Using non null assertion, these fields are defined below
    // within the `new Promise` callback (synchronously).
    resolve;
    reject;
    initialized = false;
    done = false;
    donePromise = new Promise((res, rej) => {
      this.resolve = res;
      this.reject = rej;
    });
    appInits = inject(APP_INITIALIZER, {
      optional: true
    }) ?? [];
    injector = inject(Injector);
    constructor() {
    }
    /** @internal */
    runInitializers() {
      if (this.initialized) {
        return;
      }
      const asyncInitPromises = [];
      for (const appInits of this.appInits) {
        const initResult = runInInjectionContext(this.injector, appInits);
        if (isPromise(initResult)) {
          asyncInitPromises.push(initResult);
        } else if (isSubscribable(initResult)) {
          const observableAsPromise = new Promise((resolve, reject) => {
            initResult.subscribe({
              complete: resolve,
              error: reject
            });
          });
          asyncInitPromises.push(observableAsPromise);
        }
      }
      const complete = () => {
        this.done = true;
        this.resolve();
      };
      Promise.all(asyncInitPromises).then(() => {
        complete();
      }).catch((e) => {
        this.reject(e);
      });
      if (asyncInitPromises.length === 0) {
        complete();
      }
      this.initialized = true;
    }
    static ɵfac = function ApplicationInitStatus_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || ApplicationInitStatus2)();
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: ApplicationInitStatus2,
      factory: ApplicationInitStatus2.ɵfac,
      providedIn: "root"
    });
  }
  return ApplicationInitStatus2;
})();
const APP_BOOTSTRAP_LISTENER = /* @__PURE__ */ new InjectionToken("");
function publishSignalConfiguration() {
  setThrowInvalidWriteToSignalError(() => {
    let errorMessage = "";
    throw new RuntimeError(600, errorMessage);
  });
}
function isBoundToModule(cf) {
  return cf.isBoundToModule;
}
const MAXIMUM_REFRESH_RERUNS = 10;
function optionsReducer(dst, objs) {
  if (Array.isArray(objs)) {
    return objs.reduce(optionsReducer, dst);
  }
  return {
    ...dst,
    ...objs
  };
}
let ApplicationRef = /* @__PURE__ */ (() => {
  class ApplicationRef2 {
    /** @internal */
    _runningTick = false;
    _destroyed = false;
    _destroyListeners = [];
    /** @internal */
    _views = [];
    internalErrorHandler = inject(INTERNAL_APPLICATION_ERROR_HANDLER);
    afterRenderManager = inject(AfterRenderManager);
    zonelessEnabled = inject(ZONELESS_ENABLED);
    rootEffectScheduler = inject(EffectScheduler);
    /**
     * Current dirty state of the application across a number of dimensions (views, afterRender hooks,
     * etc).
     *
     * A flag set here means that `tick()` will attempt to resolve the dirtiness when executed.
     *
     * @internal
     */
    dirtyFlags = 0;
    /**
     * Most recent snapshot from the `TracingService`, if any.
     *
     * This snapshot attempts to capture the context when `tick()` was first
     * scheduled. It then runs wrapped in this context.
     *
     * @internal
     */
    tracingSnapshot = null;
    // Needed for ComponentFixture temporarily during migration of autoDetect behavior
    // Eventually the hostView of the fixture should just attach to ApplicationRef.
    allTestViews = /* @__PURE__ */ new Set();
    autoDetectTestViews = /* @__PURE__ */ new Set();
    includeAllTestViews = false;
    /** @internal */
    afterTick = new Subject();
    /** @internal */
    get allViews() {
      return [...(this.includeAllTestViews ? this.allTestViews : this.autoDetectTestViews).keys(), ...this._views];
    }
    /**
     * Indicates whether this instance was destroyed.
     */
    get destroyed() {
      return this._destroyed;
    }
    /**
     * Get a list of component types registered to this application.
     * This list is populated even before the component is created.
     */
    componentTypes = [];
    /**
     * Get a list of components registered to this application.
     */
    components = [];
    internalPendingTask = inject(PendingTasksInternal);
    /**
     * Returns an Observable that indicates when the application is stable or unstable.
     */
    get isStable() {
      return this.internalPendingTask.hasPendingTasksObservable.pipe(map((pending) => !pending));
    }
    constructor() {
      inject(TracingService, {
        optional: true
      });
    }
    /**
     * @returns A promise that resolves when the application becomes stable
     */
    whenStable() {
      let subscription;
      return new Promise((resolve) => {
        subscription = this.isStable.subscribe({
          next: (stable) => {
            if (stable) {
              resolve();
            }
          }
        });
      }).finally(() => {
        subscription.unsubscribe();
      });
    }
    _injector = inject(EnvironmentInjector);
    _rendererFactory = null;
    /**
     * The `EnvironmentInjector` used to create this application.
     */
    get injector() {
      return this._injector;
    }
    /**
     * Bootstrap a component onto the element identified by its selector or, optionally, to a
     * specified element.
     *
     * @usageNotes
     * ### Bootstrap process
     *
     * When bootstrapping a component, Angular mounts it onto a target DOM element
     * and kicks off automatic change detection. The target DOM element can be
     * provided using the `rootSelectorOrNode` argument.
     *
     * If the target DOM element is not provided, Angular tries to find one on a page
     * using the `selector` of the component that is being bootstrapped
     * (first matched element is used).
     *
     * ### Example
     *
     * Generally, we define the component to bootstrap in the `bootstrap` array of `NgModule`,
     * but it requires us to know the component while writing the application code.
     *
     * Imagine a situation where we have to wait for an API call to decide about the component to
     * bootstrap. We can use the `ngDoBootstrap` hook of the `NgModule` and call this method to
     * dynamically bootstrap a component.
     *
     * {@example core/ts/platform/platform.ts region='componentSelector'}
     *
     * Optionally, a component can be mounted onto a DOM element that does not match the
     * selector of the bootstrapped component.
     *
     * In the following example, we are providing a CSS selector to match the target element.
     *
     * {@example core/ts/platform/platform.ts region='cssSelector'}
     *
     * While in this example, we are providing reference to a DOM node.
     *
     * {@example core/ts/platform/platform.ts region='domNode'}
     */
    bootstrap(componentOrFactory, rootSelectorOrNode) {
      return this.bootstrapImpl(componentOrFactory, rootSelectorOrNode);
    }
    bootstrapImpl(componentOrFactory, rootSelectorOrNode, injector = Injector.NULL) {
      const ngZone = this._injector.get(NgZone);
      return ngZone.run(() => {
        profiler(
          10
          /* ProfilerEvent.BootstrapComponentStart */
        );
        const isComponentFactory = componentOrFactory instanceof ComponentFactory$1;
        const initStatus = this._injector.get(ApplicationInitStatus);
        if (!initStatus.done) {
          let errorMessage = "";
          throw new RuntimeError(405, errorMessage);
        }
        let componentFactory;
        if (isComponentFactory) {
          componentFactory = componentOrFactory;
        } else {
          const resolver = this._injector.get(ComponentFactoryResolver$1);
          componentFactory = resolver.resolveComponentFactory(componentOrFactory);
        }
        this.componentTypes.push(componentFactory.componentType);
        const ngModule = isBoundToModule(componentFactory) ? void 0 : this._injector.get(NgModuleRef$1);
        const selectorOrNode = rootSelectorOrNode || componentFactory.selector;
        const compRef = componentFactory.create(injector, [], selectorOrNode, ngModule);
        const nativeElement = compRef.location.nativeElement;
        const testability = compRef.injector.get(TESTABILITY, null);
        testability?.registerApplication(nativeElement);
        compRef.onDestroy(() => {
          this.detachView(compRef.hostView);
          remove(this.components, compRef);
          testability?.unregisterApplication(nativeElement);
        });
        this._loadComponent(compRef);
        profiler(11, compRef);
        return compRef;
      });
    }
    /**
     * Invoke this method to explicitly process change detection and its side-effects.
     *
     * In development mode, `tick()` also performs a second change detection cycle to ensure that no
     * further changes are detected. If additional changes are picked up during this second cycle,
     * bindings in the app have side-effects that cannot be resolved in a single change detection
     * pass.
     * In this case, Angular throws an error, since an Angular application can only have one change
     * detection pass during which all change detection must complete.
     */
    tick() {
      if (!this.zonelessEnabled) {
        this.dirtyFlags |= 1;
      }
      this._tick();
    }
    /** @internal */
    _tick() {
      profiler(
        12
        /* ProfilerEvent.ChangeDetectionStart */
      );
      if (this.tracingSnapshot !== null) {
        this.tracingSnapshot.run(TracingAction.CHANGE_DETECTION, this.tickImpl);
      } else {
        this.tickImpl();
      }
    }
    tickImpl = () => {
      if (this._runningTick) {
        throw new RuntimeError(101, false);
      }
      const prevConsumer = setActiveConsumer(null);
      try {
        this._runningTick = true;
        this.synchronize();
        if (false) ;
      } finally {
        this._runningTick = false;
        this.tracingSnapshot?.dispose();
        this.tracingSnapshot = null;
        setActiveConsumer(prevConsumer);
        this.afterTick.next();
        profiler(
          13
          /* ProfilerEvent.ChangeDetectionEnd */
        );
      }
    };
    /**
     * Performs the core work of synchronizing the application state with the UI, resolving any
     * pending dirtiness (potentially in a loop).
     */
    synchronize() {
      if (this._rendererFactory === null && !this._injector.destroyed) {
        this._rendererFactory = this._injector.get(RendererFactory2, null, {
          optional: true
        });
      }
      let runs = 0;
      while (this.dirtyFlags !== 0 && runs++ < MAXIMUM_REFRESH_RERUNS) {
        profiler(
          14
          /* ProfilerEvent.ChangeDetectionSyncStart */
        );
        this.synchronizeOnce();
        profiler(
          15
          /* ProfilerEvent.ChangeDetectionSyncEnd */
        );
      }
    }
    /**
     * Perform a single synchronization pass.
     */
    synchronizeOnce() {
      if (this.dirtyFlags & 16) {
        this.dirtyFlags &= -17;
        this.rootEffectScheduler.flush();
      }
      let ranDetectChanges = false;
      if (this.dirtyFlags & 7) {
        const useGlobalCheck = Boolean(
          this.dirtyFlags & 1
          /* ApplicationRefDirtyFlags.ViewTreeGlobal */
        );
        this.dirtyFlags &= -8;
        this.dirtyFlags |= 8;
        for (let {
          _lView
        } of this.allViews) {
          if (!useGlobalCheck && !requiresRefreshOrTraversal(_lView)) {
            continue;
          }
          const mode = useGlobalCheck && !this.zonelessEnabled ? (
            // Global mode includes `CheckAlways` views.
            0
          ) : (
            // Only refresh views with the `RefreshView` flag or views is a changed signal
            1
          );
          detectChangesInternal(_lView, mode);
          ranDetectChanges = true;
        }
        this.dirtyFlags &= -5;
        this.syncDirtyFlagsWithViews();
        if (this.dirtyFlags & (7 | 16)) {
          return;
        }
      }
      if (!ranDetectChanges) {
        this._rendererFactory?.begin?.();
        this._rendererFactory?.end?.();
      }
      if (this.dirtyFlags & 8) {
        this.dirtyFlags &= -9;
        this.afterRenderManager.execute();
      }
      this.syncDirtyFlagsWithViews();
    }
    /**
     * Checks `allViews` for views which require refresh/traversal, and updates `dirtyFlags`
     * accordingly, with two potential behaviors:
     *
     * 1. If any of our views require updating, then this adds the `ViewTreeTraversal` dirty flag.
     *    This _should_ be a no-op, since the scheduler should've added the flag at the same time the
     *    view was marked as needing updating.
     *
     *    TODO(alxhub): figure out if this behavior is still needed for edge cases.
     *
     * 2. If none of our views require updating, then clear the view-related `dirtyFlag`s. This
     *    happens when the scheduler is notified of a view becoming dirty, but the view itself isn't
     *    reachable through traversal from our roots (e.g. it's detached from the CD tree).
     */
    syncDirtyFlagsWithViews() {
      if (this.allViews.some(({
        _lView
      }) => requiresRefreshOrTraversal(_lView))) {
        this.dirtyFlags |= 2;
        return;
      } else {
        this.dirtyFlags &= -8;
      }
    }
    /**
     * Attaches a view so that it will be dirty checked.
     * The view will be automatically detached when it is destroyed.
     * This will throw if the view is already attached to a ViewContainer.
     */
    attachView(viewRef) {
      const view = viewRef;
      this._views.push(view);
      view.attachToAppRef(this);
    }
    /**
     * Detaches a view from dirty checking again.
     */
    detachView(viewRef) {
      const view = viewRef;
      remove(this._views, view);
      view.detachFromAppRef();
    }
    _loadComponent(componentRef) {
      this.attachView(componentRef.hostView);
      try {
        this.tick();
      } catch (e) {
        this.internalErrorHandler(e);
      }
      this.components.push(componentRef);
      const listeners = this._injector.get(APP_BOOTSTRAP_LISTENER, []);
      listeners.forEach((listener) => listener(componentRef));
    }
    /** @internal */
    ngOnDestroy() {
      if (this._destroyed) return;
      try {
        this._destroyListeners.forEach((listener) => listener());
        this._views.slice().forEach((view) => view.destroy());
      } finally {
        this._destroyed = true;
        this._views = [];
        this._destroyListeners = [];
      }
    }
    /**
     * Registers a listener to be called when an instance is destroyed.
     *
     * @param callback A callback function to add as a listener.
     * @returns A function which unregisters a listener.
     */
    onDestroy(callback) {
      this._destroyListeners.push(callback);
      return () => remove(this._destroyListeners, callback);
    }
    /**
     * Destroys an Angular application represented by this `ApplicationRef`. Calling this function
     * will destroy the associated environment injectors as well as all the bootstrapped components
     * with their views.
     */
    destroy() {
      if (this._destroyed) {
        throw new RuntimeError(406, false);
      }
      const injector = this._injector;
      if (injector.destroy && !injector.destroyed) {
        injector.destroy();
      }
    }
    /**
     * Returns the number of attached views.
     */
    get viewCount() {
      return this._views.length;
    }
    static ɵfac = function ApplicationRef_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || ApplicationRef2)();
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: ApplicationRef2,
      factory: ApplicationRef2.ɵfac,
      providedIn: "root"
    });
  }
  return ApplicationRef2;
})();
function remove(list, el) {
  const index = list.indexOf(el);
  if (index > -1) {
    list.splice(index, 1);
  }
}
const ANIMATIONS_DISABLED = /* @__PURE__ */ new InjectionToken("", {
  providedIn: "root",
  factory: () => false
});
const MAX_ANIMATION_TIMEOUT = /* @__PURE__ */ new InjectionToken("", {
  providedIn: "root",
  factory: () => MAX_ANIMATION_TIMEOUT_DEFAULT
});
const MAX_ANIMATION_TIMEOUT_DEFAULT = 4e3;
class LiveCollection {
  destroy(item) {
  }
  updateValue(index, value) {
  }
  // operations below could be implemented on top of the operations defined so far, but having
  // them explicitly allow clear expression of intent and potentially more performant
  // implementations
  swap(index1, index2) {
    const startIdx = Math.min(index1, index2);
    const endIdx = Math.max(index1, index2);
    const endItem = this.detach(endIdx);
    if (endIdx - startIdx > 1) {
      const startItem = this.detach(startIdx);
      this.attach(startIdx, endItem);
      this.attach(endIdx, startItem);
    } else {
      this.attach(startIdx, endItem);
    }
  }
  move(prevIndex, newIdx) {
    this.attach(newIdx, this.detach(prevIndex));
  }
}
function valuesMatching(liveIdx, liveValue, newIdx, newValue, trackBy) {
  if (liveIdx === newIdx && Object.is(liveValue, newValue)) {
    return 1;
  } else if (Object.is(trackBy(liveIdx, liveValue), trackBy(newIdx, newValue))) {
    return -1;
  }
  return 0;
}
function reconcile(liveCollection, newCollection, trackByFn) {
  let detachedItems = void 0;
  let liveKeysInTheFuture = void 0;
  let liveStartIdx = 0;
  let liveEndIdx = liveCollection.length - 1;
  if (Array.isArray(newCollection)) {
    let newEndIdx = newCollection.length - 1;
    while (liveStartIdx <= liveEndIdx && liveStartIdx <= newEndIdx) {
      const liveStartValue = liveCollection.at(liveStartIdx);
      const newStartValue = newCollection[liveStartIdx];
      const isStartMatching = valuesMatching(liveStartIdx, liveStartValue, liveStartIdx, newStartValue, trackByFn);
      if (isStartMatching !== 0) {
        if (isStartMatching < 0) {
          liveCollection.updateValue(liveStartIdx, newStartValue);
        }
        liveStartIdx++;
        continue;
      }
      const liveEndValue = liveCollection.at(liveEndIdx);
      const newEndValue = newCollection[newEndIdx];
      const isEndMatching = valuesMatching(liveEndIdx, liveEndValue, newEndIdx, newEndValue, trackByFn);
      if (isEndMatching !== 0) {
        if (isEndMatching < 0) {
          liveCollection.updateValue(liveEndIdx, newEndValue);
        }
        liveEndIdx--;
        newEndIdx--;
        continue;
      }
      const liveStartKey = trackByFn(liveStartIdx, liveStartValue);
      const liveEndKey = trackByFn(liveEndIdx, liveEndValue);
      const newStartKey = trackByFn(liveStartIdx, newStartValue);
      if (Object.is(newStartKey, liveEndKey)) {
        const newEndKey = trackByFn(newEndIdx, newEndValue);
        if (Object.is(newEndKey, liveStartKey)) {
          liveCollection.swap(liveStartIdx, liveEndIdx);
          liveCollection.updateValue(liveEndIdx, newEndValue);
          newEndIdx--;
          liveEndIdx--;
        } else {
          liveCollection.move(liveEndIdx, liveStartIdx);
        }
        liveCollection.updateValue(liveStartIdx, newStartValue);
        liveStartIdx++;
        continue;
      }
      detachedItems ??= new UniqueValueMultiKeyMap();
      liveKeysInTheFuture ??= initLiveItemsInTheFuture(liveCollection, liveStartIdx, liveEndIdx, trackByFn);
      if (attachPreviouslyDetached(liveCollection, detachedItems, liveStartIdx, newStartKey)) {
        liveCollection.updateValue(liveStartIdx, newStartValue);
        liveStartIdx++;
        liveEndIdx++;
      } else if (!liveKeysInTheFuture.has(newStartKey)) {
        const newItem = liveCollection.create(liveStartIdx, newCollection[liveStartIdx]);
        liveCollection.attach(liveStartIdx, newItem);
        liveStartIdx++;
        liveEndIdx++;
      } else {
        detachedItems.set(liveStartKey, liveCollection.detach(liveStartIdx));
        liveEndIdx--;
      }
    }
    while (liveStartIdx <= newEndIdx) {
      createOrAttach(liveCollection, detachedItems, trackByFn, liveStartIdx, newCollection[liveStartIdx]);
      liveStartIdx++;
    }
  } else if (newCollection != null) {
    const newCollectionIterator = newCollection[Symbol.iterator]();
    let newIterationResult = newCollectionIterator.next();
    while (!newIterationResult.done && liveStartIdx <= liveEndIdx) {
      const liveValue = liveCollection.at(liveStartIdx);
      const newValue = newIterationResult.value;
      const isStartMatching = valuesMatching(liveStartIdx, liveValue, liveStartIdx, newValue, trackByFn);
      if (isStartMatching !== 0) {
        if (isStartMatching < 0) {
          liveCollection.updateValue(liveStartIdx, newValue);
        }
        liveStartIdx++;
        newIterationResult = newCollectionIterator.next();
      } else {
        detachedItems ??= new UniqueValueMultiKeyMap();
        liveKeysInTheFuture ??= initLiveItemsInTheFuture(liveCollection, liveStartIdx, liveEndIdx, trackByFn);
        const newKey = trackByFn(liveStartIdx, newValue);
        if (attachPreviouslyDetached(liveCollection, detachedItems, liveStartIdx, newKey)) {
          liveCollection.updateValue(liveStartIdx, newValue);
          liveStartIdx++;
          liveEndIdx++;
          newIterationResult = newCollectionIterator.next();
        } else if (!liveKeysInTheFuture.has(newKey)) {
          liveCollection.attach(liveStartIdx, liveCollection.create(liveStartIdx, newValue));
          liveStartIdx++;
          liveEndIdx++;
          newIterationResult = newCollectionIterator.next();
        } else {
          const liveKey = trackByFn(liveStartIdx, liveValue);
          detachedItems.set(liveKey, liveCollection.detach(liveStartIdx));
          liveEndIdx--;
        }
      }
    }
    while (!newIterationResult.done) {
      createOrAttach(liveCollection, detachedItems, trackByFn, liveCollection.length, newIterationResult.value);
      newIterationResult = newCollectionIterator.next();
    }
  }
  while (liveStartIdx <= liveEndIdx) {
    liveCollection.destroy(liveCollection.detach(liveEndIdx--));
  }
  detachedItems?.forEach((item) => {
    liveCollection.destroy(item);
  });
}
function attachPreviouslyDetached(prevCollection, detachedItems, index, key) {
  if (detachedItems !== void 0 && detachedItems.has(key)) {
    prevCollection.attach(index, detachedItems.get(key));
    detachedItems.delete(key);
    return true;
  }
  return false;
}
function createOrAttach(liveCollection, detachedItems, trackByFn, index, value) {
  if (!attachPreviouslyDetached(liveCollection, detachedItems, index, trackByFn(index, value))) {
    const newItem = liveCollection.create(index, value);
    liveCollection.attach(index, newItem);
  } else {
    liveCollection.updateValue(index, value);
  }
}
function initLiveItemsInTheFuture(liveCollection, start, end, trackByFn) {
  const keys = /* @__PURE__ */ new Set();
  for (let i = start; i <= end; i++) {
    keys.add(trackByFn(i, liveCollection.at(i)));
  }
  return keys;
}
class UniqueValueMultiKeyMap {
  // A map from a key to the first value corresponding to this key.
  kvMap = /* @__PURE__ */ new Map();
  // A map that acts as a linked list of values - each value maps to the next value in this "linked
  // list" (this only works if values are unique). Allocated lazily to avoid memory consumption when
  // there are no duplicated values.
  _vMap = void 0;
  has(key) {
    return this.kvMap.has(key);
  }
  delete(key) {
    if (!this.has(key)) return false;
    const value = this.kvMap.get(key);
    if (this._vMap !== void 0 && this._vMap.has(value)) {
      this.kvMap.set(key, this._vMap.get(value));
      this._vMap.delete(value);
    } else {
      this.kvMap.delete(key);
    }
    return true;
  }
  get(key) {
    return this.kvMap.get(key);
  }
  set(key, value) {
    if (this.kvMap.has(key)) {
      let prevValue = this.kvMap.get(key);
      if (this._vMap === void 0) {
        this._vMap = /* @__PURE__ */ new Map();
      }
      const vMap = this._vMap;
      while (vMap.has(prevValue)) {
        prevValue = vMap.get(prevValue);
      }
      vMap.set(prevValue, value);
    } else {
      this.kvMap.set(key, value);
    }
  }
  forEach(cb) {
    for (let [key, value] of this.kvMap) {
      cb(value, key);
      if (this._vMap !== void 0) {
        const vMap = this._vMap;
        while (vMap.has(value)) {
          value = vMap.get(value);
          cb(value, key);
        }
      }
    }
  }
}
function ɵɵconditionalCreate(index, templateFn, decls, vars, tagName, attrsIndex, localRefsIndex, localRefExtractor) {
  performanceMarkFeature("NgControlFlow");
  const lView = getLView();
  const tView = getTView();
  const attrs = getConstant(tView.consts, attrsIndex);
  declareNoDirectiveHostTemplate(lView, tView, index, templateFn, decls, vars, tagName, attrs, 256, localRefsIndex, localRefExtractor);
  return ɵɵconditionalBranchCreate;
}
function ɵɵconditionalBranchCreate(index, templateFn, decls, vars, tagName, attrsIndex, localRefsIndex, localRefExtractor) {
  performanceMarkFeature("NgControlFlow");
  const lView = getLView();
  const tView = getTView();
  const attrs = getConstant(tView.consts, attrsIndex);
  declareNoDirectiveHostTemplate(lView, tView, index, templateFn, decls, vars, tagName, attrs, 512, localRefsIndex, localRefExtractor);
  return ɵɵconditionalBranchCreate;
}
function ɵɵconditional(matchingTemplateIndex, contextValue) {
  performanceMarkFeature("NgControlFlow");
  const hostLView = getLView();
  const bindingIndex = nextBindingIndex();
  const prevMatchingTemplateIndex = hostLView[bindingIndex] !== NO_CHANGE ? hostLView[bindingIndex] : -1;
  const prevContainer = prevMatchingTemplateIndex !== -1 ? getLContainer(hostLView, HEADER_OFFSET + prevMatchingTemplateIndex) : void 0;
  const viewInContainerIdx = 0;
  if (bindingUpdated(hostLView, bindingIndex, matchingTemplateIndex)) {
    const prevConsumer = setActiveConsumer(null);
    try {
      if (prevContainer !== void 0) {
        removeLViewFromLContainer(prevContainer, viewInContainerIdx);
      }
      if (matchingTemplateIndex !== -1) {
        const nextLContainerIndex = HEADER_OFFSET + matchingTemplateIndex;
        const nextContainer = getLContainer(hostLView, nextLContainerIndex);
        const templateTNode = getExistingTNode(hostLView[TVIEW], nextLContainerIndex);
        const dehydratedView = findAndReconcileMatchingDehydratedViews(nextContainer, templateTNode, hostLView);
        const embeddedLView = createAndRenderEmbeddedLView(hostLView, templateTNode, contextValue, {
          dehydratedView
        });
        addLViewToLContainer(nextContainer, embeddedLView, viewInContainerIdx, shouldAddViewToDom(templateTNode, dehydratedView));
      }
    } finally {
      setActiveConsumer(prevConsumer);
    }
  } else if (prevContainer !== void 0) {
    const lView = getLViewFromLContainer(prevContainer, viewInContainerIdx);
    if (lView !== void 0) {
      lView[CONTEXT] = contextValue;
    }
  }
}
class RepeaterContext {
  lContainer;
  $implicit;
  $index;
  constructor(lContainer, $implicit, $index) {
    this.lContainer = lContainer;
    this.$implicit = $implicit;
    this.$index = $index;
  }
  get $count() {
    return this.lContainer.length - CONTAINER_HEADER_OFFSET;
  }
}
function ɵɵrepeaterTrackByIndex(index) {
  return index;
}
class RepeaterMetadata {
  hasEmptyBlock;
  trackByFn;
  liveCollection;
  constructor(hasEmptyBlock, trackByFn, liveCollection) {
    this.hasEmptyBlock = hasEmptyBlock;
    this.trackByFn = trackByFn;
    this.liveCollection = liveCollection;
  }
}
function ɵɵrepeaterCreate(index, templateFn, decls, vars, tagName, attrsIndex, trackByFn, trackByUsesComponentInstance, emptyTemplateFn, emptyDecls, emptyVars, emptyTagName, emptyAttrsIndex) {
  performanceMarkFeature("NgControlFlow");
  const lView = getLView();
  const tView = getTView();
  const hasEmptyBlock = emptyTemplateFn !== void 0;
  const hostLView = getLView();
  const boundTrackBy = trackByFn;
  const metadata = new RepeaterMetadata(hasEmptyBlock, boundTrackBy);
  hostLView[HEADER_OFFSET + index] = metadata;
  declareNoDirectiveHostTemplate(
    lView,
    tView,
    index + 1,
    templateFn,
    decls,
    vars,
    tagName,
    getConstant(tView.consts, attrsIndex),
    256
    /* TNodeFlags.isControlFlowStart */
  );
}
class LiveCollectionLContainerImpl extends LiveCollection {
  lContainer;
  hostLView;
  templateTNode;
  operationsCounter = void 0;
  /**
   Property indicating if indexes in the repeater context need to be updated following the live
   collection changes. Index updates are necessary if and only if views are inserted / removed in
   the middle of LContainer. Adds and removals at the end don't require index updates.
  */
  needsIndexUpdate = false;
  constructor(lContainer, hostLView, templateTNode) {
    super();
    this.lContainer = lContainer;
    this.hostLView = hostLView;
    this.templateTNode = templateTNode;
  }
  get length() {
    return this.lContainer.length - CONTAINER_HEADER_OFFSET;
  }
  at(index) {
    return this.getLView(index)[CONTEXT].$implicit;
  }
  attach(index, lView) {
    const dehydratedView = lView[HYDRATION];
    this.needsIndexUpdate ||= index !== this.length;
    addLViewToLContainer(this.lContainer, lView, index, shouldAddViewToDom(this.templateTNode, dehydratedView));
  }
  detach(index) {
    this.needsIndexUpdate ||= index !== this.length - 1;
    return detachExistingView(this.lContainer, index);
  }
  create(index, value) {
    const dehydratedView = findMatchingDehydratedView(this.lContainer, this.templateTNode.tView.ssrId);
    const embeddedLView = createAndRenderEmbeddedLView(this.hostLView, this.templateTNode, new RepeaterContext(this.lContainer, value, index), {
      dehydratedView
    });
    this.operationsCounter?.recordCreate();
    return embeddedLView;
  }
  destroy(lView) {
    destroyLView(lView[TVIEW], lView);
    this.operationsCounter?.recordDestroy();
  }
  updateValue(index, value) {
    this.getLView(index)[CONTEXT].$implicit = value;
  }
  reset() {
    this.needsIndexUpdate = false;
    this.operationsCounter?.reset();
  }
  updateIndexes() {
    if (this.needsIndexUpdate) {
      for (let i = 0; i < this.length; i++) {
        this.getLView(i)[CONTEXT].$index = i;
      }
    }
  }
  getLView(index) {
    return getExistingLViewFromLContainer(this.lContainer, index);
  }
}
function ɵɵrepeater(collection) {
  const prevConsumer = setActiveConsumer(null);
  const metadataSlotIdx = getSelectedIndex();
  try {
    const hostLView = getLView();
    const hostTView = hostLView[TVIEW];
    const metadata = hostLView[metadataSlotIdx];
    const containerIndex = metadataSlotIdx + 1;
    const lContainer = getLContainer(hostLView, containerIndex);
    if (metadata.liveCollection === void 0) {
      const itemTemplateTNode = getExistingTNode(hostTView, containerIndex);
      metadata.liveCollection = new LiveCollectionLContainerImpl(lContainer, hostLView, itemTemplateTNode);
    } else {
      metadata.liveCollection.reset();
    }
    const liveCollection = metadata.liveCollection;
    reconcile(liveCollection, collection, metadata.trackByFn);
    if (false) ;
    liveCollection.updateIndexes();
    if (metadata.hasEmptyBlock) {
      const bindingIndex = nextBindingIndex();
      const isCollectionEmpty = liveCollection.length === 0;
      if (bindingUpdated(hostLView, bindingIndex, isCollectionEmpty)) {
        const emptyTemplateIndex = metadataSlotIdx + 2;
        const lContainerForEmpty = getLContainer(hostLView, emptyTemplateIndex);
        if (isCollectionEmpty) {
          const emptyTemplateTNode = getExistingTNode(hostTView, emptyTemplateIndex);
          const dehydratedView = findAndReconcileMatchingDehydratedViews(lContainerForEmpty, emptyTemplateTNode, hostLView);
          const embeddedLView = createAndRenderEmbeddedLView(hostLView, emptyTemplateTNode, void 0, {
            dehydratedView
          });
          addLViewToLContainer(lContainerForEmpty, embeddedLView, 0, shouldAddViewToDom(emptyTemplateTNode, dehydratedView));
        } else {
          if (hostTView.firstUpdatePass) {
            removeDehydratedViews(lContainerForEmpty);
          }
          removeLViewFromLContainer(lContainerForEmpty, 0);
        }
      }
    }
  } finally {
    setActiveConsumer(prevConsumer);
  }
}
function getLContainer(lView, index) {
  const lContainer = lView[index];
  return lContainer;
}
function detachExistingView(lContainer, index) {
  const existingLView = detachView(lContainer, index);
  return existingLView;
}
function getExistingLViewFromLContainer(lContainer, index) {
  const existingLView = getLViewFromLContainer(lContainer, index);
  return existingLView;
}
function getExistingTNode(tView, index) {
  const tNode = getTNode(tView, index);
  return tNode;
}
function ɵɵproperty(propName, value, sanitizer) {
  const lView = getLView();
  const bindingIndex = nextBindingIndex();
  if (bindingUpdated(lView, bindingIndex, value)) {
    getTView();
    const tNode = getSelectedTNode();
    setPropertyAndInputs(tNode, lView, propName, value, lView[RENDERER], sanitizer);
  }
  return ɵɵproperty;
}
function setDirectiveInputsWhichShadowsStyling(tView, tNode, lView, value, isClassBased) {
  setAllInputsForProperty(tNode, tView, lView, isClassBased ? "class" : "style", value);
}
function ɵɵelementStart(index, name, attrsIndex, localRefsIndex) {
  const lView = getLView();
  const tView = lView[TVIEW];
  const adjustedIndex = index + HEADER_OFFSET;
  const tNode = tView.firstCreatePass ? directiveHostFirstCreatePass(adjustedIndex, lView, 2, name, findDirectiveDefMatches, getBindingsEnabled(), attrsIndex, localRefsIndex) : tView.data[adjustedIndex];
  elementLikeStartShared(tNode, lView, index, name, _locateOrCreateElementNode);
  if (isDirectiveHost(tNode)) {
    const tView2 = lView[TVIEW];
    createDirectivesInstances(tView2, lView, tNode);
    executeContentQueries(tView2, tNode, lView);
  }
  if (localRefsIndex != null) {
    saveResolvedLocalsInData(lView, tNode);
  }
  return ɵɵelementStart;
}
function ɵɵelementEnd() {
  const tView = getTView();
  const initialTNode = getCurrentTNode();
  const currentTNode = elementLikeEndShared(initialTNode);
  if (tView.firstCreatePass) {
    directiveHostEndFirstCreatePass(tView, currentTNode);
  }
  if (isSkipHydrationRootTNode(currentTNode)) {
    leaveSkipHydrationBlock();
  }
  decreaseElementDepthCount();
  if (currentTNode.classesWithoutHost != null && hasClassInput(currentTNode)) {
    setDirectiveInputsWhichShadowsStyling(tView, currentTNode, getLView(), currentTNode.classesWithoutHost, true);
  }
  if (currentTNode.stylesWithoutHost != null && hasStyleInput(currentTNode)) {
    setDirectiveInputsWhichShadowsStyling(tView, currentTNode, getLView(), currentTNode.stylesWithoutHost, false);
  }
  return ɵɵelementEnd;
}
function ɵɵelement(index, name, attrsIndex, localRefsIndex) {
  ɵɵelementStart(index, name, attrsIndex, localRefsIndex);
  ɵɵelementEnd();
  return ɵɵelement;
}
function ɵɵdomElementStart(index, name, attrsIndex, localRefsIndex) {
  const lView = getLView();
  const tView = lView[TVIEW];
  const adjustedIndex = index + HEADER_OFFSET;
  const tNode = tView.firstCreatePass ? domOnlyFirstCreatePass(adjustedIndex, tView, 2, name, attrsIndex, localRefsIndex) : tView.data[adjustedIndex];
  elementLikeStartShared(tNode, lView, index, name, _locateOrCreateElementNode);
  if (localRefsIndex != null) {
    saveResolvedLocalsInData(lView, tNode);
  }
  return ɵɵdomElementStart;
}
function ɵɵdomElementEnd() {
  const initialTNode = getCurrentTNode();
  const currentTNode = elementLikeEndShared(initialTNode);
  if (isSkipHydrationRootTNode(currentTNode)) {
    leaveSkipHydrationBlock();
  }
  decreaseElementDepthCount();
  return ɵɵdomElementEnd;
}
function ɵɵdomElement(index, name, attrsIndex, localRefsIndex) {
  ɵɵdomElementStart(index, name, attrsIndex, localRefsIndex);
  ɵɵdomElementEnd();
  return ɵɵdomElement;
}
let _locateOrCreateElementNode = (tView, lView, tNode, name, index) => {
  lastNodeWasCreated(true);
  return createElementNode(lView[RENDERER], name, getNamespace());
};
function ɵɵgetCurrentView() {
  return getLView();
}
const DEFAULT_LOCALE_ID = "en-US";
function setLocaleId(localeId) {
  if (typeof localeId === "string") {
    localeId.toLowerCase().replace(/_/g, "-");
  }
}
function ɵɵlistener(eventName, listenerFn, eventTargetResolver) {
  const lView = getLView();
  const tView = getTView();
  const tNode = getCurrentTNode();
  listenerInternal(tView, lView, lView[RENDERER], tNode, eventName, listenerFn, eventTargetResolver);
  return ɵɵlistener;
}
function listenerInternal(tView, lView, renderer, tNode, eventName, listenerFn, eventTargetResolver) {
  let processOutputs = true;
  let wrappedListener = null;
  if (tNode.type & 3 || eventTargetResolver) {
    wrappedListener ??= wrapListener(tNode, lView, listenerFn);
    const hasCoalescedDomEvent = listenToDomEvent(tNode, tView, lView, eventTargetResolver, renderer, eventName, listenerFn, wrappedListener);
    if (hasCoalescedDomEvent) {
      processOutputs = false;
    }
  }
  if (processOutputs) {
    const outputConfig = tNode.outputs?.[eventName];
    const hostDirectiveOutputConfig = tNode.hostDirectiveOutputs?.[eventName];
    if (hostDirectiveOutputConfig && hostDirectiveOutputConfig.length) {
      for (let i = 0; i < hostDirectiveOutputConfig.length; i += 2) {
        const index = hostDirectiveOutputConfig[i];
        const lookupName = hostDirectiveOutputConfig[i + 1];
        wrappedListener ??= wrapListener(tNode, lView, listenerFn);
        listenToOutput(tNode, lView, index, lookupName, eventName, wrappedListener);
      }
    }
    if (outputConfig && outputConfig.length) {
      for (const index of outputConfig) {
        wrappedListener ??= wrapListener(tNode, lView, listenerFn);
        listenToOutput(tNode, lView, index, eventName, eventName, wrappedListener);
      }
    }
  }
}
function ɵɵnextContext(level = 1) {
  return nextContextImpl(level);
}
function ɵɵtext(index, value = "") {
  const lView = getLView();
  const tView = getTView();
  const adjustedIndex = index + HEADER_OFFSET;
  const tNode = tView.firstCreatePass ? getOrCreateTNode(tView, adjustedIndex, 1, value, null) : tView.data[adjustedIndex];
  const textNative = _locateOrCreateTextNode(tView, lView, tNode, value);
  lView[adjustedIndex] = textNative;
  if (wasLastNodeCreated()) {
    appendChild(tView, lView, textNative, tNode);
  }
  setCurrentTNode(tNode, false);
}
let _locateOrCreateTextNode = (tView, lView, tNode, value, index) => {
  lastNodeWasCreated(true);
  return createTextNode(lView[RENDERER], value);
};
function interpolation1(lView, prefix, v0, suffix = "") {
  const different = bindingUpdated(lView, nextBindingIndex(), v0);
  return different ? prefix + renderStringify(v0) + suffix : NO_CHANGE;
}
function ɵɵtextInterpolate(v0) {
  ɵɵtextInterpolate1("", v0);
  return ɵɵtextInterpolate;
}
function ɵɵtextInterpolate1(prefix, v0, suffix) {
  const lView = getLView();
  const interpolated = interpolation1(lView, prefix, v0, suffix);
  if (interpolated !== NO_CHANGE) {
    textBindingInternal(lView, getSelectedIndex(), interpolated);
  }
  return ɵɵtextInterpolate1;
}
function textBindingInternal(lView, index, value) {
  const element = getNativeByIndex(index, lView);
  updateTextNode(lView[RENDERER], element, value);
}
let NgZoneChangeDetectionScheduler = /* @__PURE__ */ (() => {
  class NgZoneChangeDetectionScheduler2 {
    zone = inject(NgZone);
    changeDetectionScheduler = inject(ChangeDetectionScheduler);
    applicationRef = inject(ApplicationRef);
    applicationErrorHandler = inject(INTERNAL_APPLICATION_ERROR_HANDLER);
    _onMicrotaskEmptySubscription;
    initialize() {
      if (this._onMicrotaskEmptySubscription) {
        return;
      }
      this._onMicrotaskEmptySubscription = this.zone.onMicrotaskEmpty.subscribe({
        next: () => {
          if (this.changeDetectionScheduler.runningTick) {
            return;
          }
          this.zone.run(() => {
            try {
              this.applicationRef.dirtyFlags |= 1;
              this.applicationRef._tick();
            } catch (e) {
              this.applicationErrorHandler(e);
            }
          });
        }
      });
    }
    ngOnDestroy() {
      this._onMicrotaskEmptySubscription?.unsubscribe();
    }
    static ɵfac = function NgZoneChangeDetectionScheduler_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || NgZoneChangeDetectionScheduler2)();
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: NgZoneChangeDetectionScheduler2,
      factory: NgZoneChangeDetectionScheduler2.ɵfac,
      providedIn: "root"
    });
  }
  return NgZoneChangeDetectionScheduler2;
})();
function internalProvideZoneChangeDetection({
  ngZoneFactory,
  ignoreChangesOutsideZone,
  scheduleInRootZone
}) {
  ngZoneFactory ??= () => new NgZone({
    ...getNgZoneOptions(),
    scheduleInRootZone
  });
  return [
    {
      provide: NgZone,
      useFactory: ngZoneFactory
    },
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useFactory: () => {
        const ngZoneChangeDetectionScheduler = inject(NgZoneChangeDetectionScheduler, {
          optional: true
        });
        return () => ngZoneChangeDetectionScheduler.initialize();
      }
    },
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useFactory: () => {
        const service = inject(ZoneStablePendingTask);
        return () => {
          service.initialize();
        };
      }
    },
    // Always disable scheduler whenever explicitly disabled, even if another place called
    // `provideZoneChangeDetection` without the 'ignore' option.
    ignoreChangesOutsideZone === true ? {
      provide: ZONELESS_SCHEDULER_DISABLED,
      useValue: true
    } : [],
    {
      provide: SCHEDULE_IN_ROOT_ZONE,
      useValue: scheduleInRootZone ?? SCHEDULE_IN_ROOT_ZONE_DEFAULT
    },
    {
      provide: INTERNAL_APPLICATION_ERROR_HANDLER,
      useFactory: () => {
        const zone = inject(NgZone);
        const injector = inject(EnvironmentInjector);
        let userErrorHandler;
        return (e) => {
          zone.runOutsideAngular(() => {
            if (injector.destroyed && !userErrorHandler) {
              setTimeout(() => {
                throw e;
              });
            } else {
              userErrorHandler ??= injector.get(ErrorHandler);
              userErrorHandler.handleError(e);
            }
          });
        };
      }
    }
  ];
}
function getNgZoneOptions(options) {
  return {
    enableLongStackTrace: false,
    shouldCoalesceEventChangeDetection: options?.eventCoalescing ?? false,
    shouldCoalesceRunChangeDetection: options?.runCoalescing ?? false
  };
}
let ZoneStablePendingTask = /* @__PURE__ */ (() => {
  class ZoneStablePendingTask2 {
    subscription = new Subscription();
    initialized = false;
    zone = inject(NgZone);
    pendingTasks = inject(PendingTasksInternal);
    initialize() {
      if (this.initialized) {
        return;
      }
      this.initialized = true;
      let task = null;
      if (!this.zone.isStable && !this.zone.hasPendingMacrotasks && !this.zone.hasPendingMicrotasks) {
        task = this.pendingTasks.add();
      }
      this.zone.runOutsideAngular(() => {
        this.subscription.add(this.zone.onStable.subscribe(() => {
          NgZone.assertNotInAngularZone();
          queueMicrotask(() => {
            if (task !== null && !this.zone.hasPendingMacrotasks && !this.zone.hasPendingMicrotasks) {
              this.pendingTasks.remove(task);
              task = null;
            }
          });
        }));
      });
      this.subscription.add(this.zone.onUnstable.subscribe(() => {
        NgZone.assertInAngularZone();
        task ??= this.pendingTasks.add();
      }));
    }
    ngOnDestroy() {
      this.subscription.unsubscribe();
    }
    static ɵfac = function ZoneStablePendingTask_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || ZoneStablePendingTask2)();
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: ZoneStablePendingTask2,
      factory: ZoneStablePendingTask2.ɵfac,
      providedIn: "root"
    });
  }
  return ZoneStablePendingTask2;
})();
let ChangeDetectionSchedulerImpl = /* @__PURE__ */ (() => {
  class ChangeDetectionSchedulerImpl2 {
    applicationErrorHandler = inject(INTERNAL_APPLICATION_ERROR_HANDLER);
    appRef = inject(ApplicationRef);
    taskService = inject(PendingTasksInternal);
    ngZone = inject(NgZone);
    zonelessEnabled = inject(ZONELESS_ENABLED);
    tracing = inject(TracingService, {
      optional: true
    });
    disableScheduling = inject(ZONELESS_SCHEDULER_DISABLED, {
      optional: true
    }) ?? false;
    zoneIsDefined = typeof Zone !== "undefined" && !!Zone.root.run;
    schedulerTickApplyArgs = [{
      data: {
        "__scheduler_tick__": true
      }
    }];
    subscriptions = new Subscription();
    angularZoneId = this.zoneIsDefined ? this.ngZone._inner?.get(angularZoneInstanceIdProperty) : null;
    scheduleInRootZone = !this.zonelessEnabled && this.zoneIsDefined && (inject(SCHEDULE_IN_ROOT_ZONE, {
      optional: true
    }) ?? false);
    cancelScheduledCallback = null;
    useMicrotaskScheduler = false;
    runningTick = false;
    pendingRenderTaskId = null;
    constructor() {
      this.subscriptions.add(this.appRef.afterTick.subscribe(() => {
        if (!this.runningTick) {
          this.cleanup();
        }
      }));
      this.subscriptions.add(this.ngZone.onUnstable.subscribe(() => {
        if (!this.runningTick) {
          this.cleanup();
        }
      }));
      this.disableScheduling ||= !this.zonelessEnabled && // NoopNgZone without enabling zoneless means no scheduling whatsoever
      (this.ngZone instanceof NoopNgZone || // The same goes for the lack of Zone without enabling zoneless scheduling
      !this.zoneIsDefined);
    }
    notify(source) {
      if (!this.zonelessEnabled && source === 5) {
        return;
      }
      let force = false;
      switch (source) {
        case 0: {
          this.appRef.dirtyFlags |= 2;
          break;
        }
        case 3:
        case 2:
        case 4:
        case 5:
        case 1: {
          this.appRef.dirtyFlags |= 4;
          break;
        }
        case 6: {
          this.appRef.dirtyFlags |= 2;
          force = true;
          break;
        }
        case 12: {
          this.appRef.dirtyFlags |= 16;
          force = true;
          break;
        }
        case 13: {
          this.appRef.dirtyFlags |= 2;
          force = true;
          break;
        }
        case 11: {
          force = true;
          break;
        }
        case 9:
        case 8:
        case 7:
        case 10:
        default: {
          this.appRef.dirtyFlags |= 8;
        }
      }
      this.appRef.tracingSnapshot = this.tracing?.snapshot(this.appRef.tracingSnapshot) ?? null;
      if (!this.shouldScheduleTick(force)) {
        return;
      }
      const scheduleCallback = this.useMicrotaskScheduler ? scheduleCallbackWithMicrotask : scheduleCallbackWithRafRace;
      this.pendingRenderTaskId = this.taskService.add();
      if (this.scheduleInRootZone) {
        this.cancelScheduledCallback = Zone.root.run(() => scheduleCallback(() => this.tick()));
      } else {
        this.cancelScheduledCallback = this.ngZone.runOutsideAngular(() => scheduleCallback(() => this.tick()));
      }
    }
    shouldScheduleTick(force) {
      if (this.disableScheduling && !force || this.appRef.destroyed) {
        return false;
      }
      if (this.pendingRenderTaskId !== null || this.runningTick || this.appRef._runningTick) {
        return false;
      }
      if (!this.zonelessEnabled && this.zoneIsDefined && Zone.current.get(angularZoneInstanceIdProperty + this.angularZoneId)) {
        return false;
      }
      return true;
    }
    /**
     * Calls ApplicationRef._tick inside the `NgZone`.
     *
     * Calling `tick` directly runs change detection and cancels any change detection that had been
     * scheduled previously.
     *
     * @param shouldRefreshViews Passed directly to `ApplicationRef._tick` and skips straight to
     *     render hooks when `false`.
     */
    tick() {
      if (this.runningTick || this.appRef.destroyed) {
        return;
      }
      if (this.appRef.dirtyFlags === 0) {
        this.cleanup();
        return;
      }
      if (!this.zonelessEnabled && this.appRef.dirtyFlags & 7) {
        this.appRef.dirtyFlags |= 1;
      }
      const task = this.taskService.add();
      try {
        this.ngZone.run(() => {
          this.runningTick = true;
          this.appRef._tick();
        }, void 0, this.schedulerTickApplyArgs);
      } catch (e) {
        this.taskService.remove(task);
        this.applicationErrorHandler(e);
      } finally {
        this.cleanup();
      }
      this.useMicrotaskScheduler = true;
      scheduleCallbackWithMicrotask(() => {
        this.useMicrotaskScheduler = false;
        this.taskService.remove(task);
      });
    }
    ngOnDestroy() {
      this.subscriptions.unsubscribe();
      this.cleanup();
    }
    cleanup() {
      this.runningTick = false;
      this.cancelScheduledCallback?.();
      this.cancelScheduledCallback = null;
      if (this.pendingRenderTaskId !== null) {
        const taskId = this.pendingRenderTaskId;
        this.pendingRenderTaskId = null;
        this.taskService.remove(taskId);
      }
    }
    static ɵfac = function ChangeDetectionSchedulerImpl_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || ChangeDetectionSchedulerImpl2)();
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: ChangeDetectionSchedulerImpl2,
      factory: ChangeDetectionSchedulerImpl2.ɵfac,
      providedIn: "root"
    });
  }
  return ChangeDetectionSchedulerImpl2;
})();
function getGlobalLocale() {
  {
    return typeof $localize !== "undefined" && $localize.locale || DEFAULT_LOCALE_ID;
  }
}
const LOCALE_ID = /* @__PURE__ */ new InjectionToken("", {
  providedIn: "root",
  factory: () => inject(LOCALE_ID, {
    optional: true,
    skipSelf: true
  }) || getGlobalLocale()
});

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */
const EventType = {
  /**
   * The click event. In addEvent() refers to all click events, in the
   * jsaction attribute it refers to the unmodified click and Enter/Space
   * keypress events.  In the latter case, a jsaction click will be triggered,
   * for accessibility reasons.  See clickmod and clickonly, below.
   */
  CLICK: "click",
  /**
   * The dblclick event.
   */
  DBLCLICK: "dblclick",
  /**
   * Focus doesn't bubble, but you can use it in addEvent() and
   * jsaction anyway. EventContract does the right thing under the
   * hood.
   */
  FOCUS: "focus",
  /**
   * This event only exists in IE. For addEvent() and jsaction, use
   * focus instead; EventContract does the right thing even though
   * focus doesn't bubble.
   */
  FOCUSIN: "focusin",
  /**
   * Analog to focus.
   */
  BLUR: "blur",
  /**
   * Analog to focusin.
   */
  FOCUSOUT: "focusout",
  /**
   * Submit doesn't bubble, so it cannot be used with event
   * contract. However, the browser helpfully fires a click event on
   * the submit button of a form (even if the form is not submitted by
   * a click on the submit button). So you should handle click on the
   * submit button instead.
   */
  SUBMIT: "submit",
  /**
   * The keydown event. In addEvent() and non-click jsaction it represents the
   * regular DOM keydown event. It represents click actions in non-Gecko
   * browsers.
   */
  KEYDOWN: "keydown",
  /**
   * The keypress event. In addEvent() and non-click jsaction it represents the
   * regular DOM keypress event. It represents click actions in Gecko browsers.
   */
  KEYPRESS: "keypress",
  /**
   * The keyup event. In addEvent() and non-click jsaction it represents the
   * regular DOM keyup event. It represents click actions in non-Gecko
   * browsers.
   */
  KEYUP: "keyup",
  /**
   * The mouseover event. Can either be used directly or used implicitly to
   * capture mouseenter events. In addEvent(), it represents a regular DOM
   * mouseover event.
   */
  MOUSEOVER: "mouseover",
  /**
   * The mouseout event. Can either be used directly or used implicitly to
   * capture mouseover events. In addEvent(), it represents a regular DOM
   * mouseout event.
   */
  MOUSEOUT: "mouseout",
  /**
   * The error event. The error event doesn't bubble, but you can use it in
   * addEvent() and jsaction anyway. EventContract does the right thing under
   * the hood (except in IE8 which does not use error events).
   */
  ERROR: "error",
  /**
   * The load event. The load event doesn't bubble, but you can use it in
   * addEvent() and jsaction anyway. EventContract does the right thing
   * under the hood.
   */
  LOAD: "load",
  /**
   * The touchstart event. Bubbles, will only ever fire in browsers with
   * touch support.
   */
  TOUCHSTART: "touchstart",
  /**
   * The touchend event. Bubbles, will only ever fire in browsers with
   * touch support.
   */
  TOUCHEND: "touchend",
  /**
   * The touchmove event. Bubbles, will only ever fire in browsers with
   * touch support.
   */
  TOUCHMOVE: "touchmove",
  /**
   * The toggle event. The toggle event doesn't bubble, but you can use it in
   * addEvent() and jsaction anyway. EventContract does the right thing
   * under the hood.
   */
  TOGGLE: "toggle"};
const BUBBLE_EVENT_TYPES = [
  EventType.CLICK,
  EventType.DBLCLICK,
  EventType.FOCUSIN,
  EventType.FOCUSOUT,
  EventType.KEYDOWN,
  EventType.KEYUP,
  EventType.KEYPRESS,
  EventType.MOUSEOVER,
  EventType.MOUSEOUT,
  EventType.SUBMIT,
  EventType.TOUCHSTART,
  EventType.TOUCHEND,
  EventType.TOUCHMOVE,
  "touchcancel",
  "auxclick",
  "change",
  "compositionstart",
  "compositionupdate",
  "compositionend",
  "beforeinput",
  "input",
  "select",
  "copy",
  "cut",
  "paste",
  "mousedown",
  "mouseup",
  "wheel",
  "contextmenu",
  "dragover",
  "dragenter",
  "dragleave",
  "drop",
  "dragstart",
  "dragend",
  "pointerdown",
  "pointermove",
  "pointerup",
  "pointercancel",
  "pointerover",
  "pointerout",
  "gotpointercapture",
  "lostpointercapture",
  // Video events.
  "ended",
  "loadedmetadata",
  // Page visibility events.
  "pagehide",
  "pageshow",
  "visibilitychange",
  // Content visibility events.
  "beforematch"
];
const CAPTURE_EVENT_TYPES = [EventType.FOCUS, EventType.BLUR, EventType.ERROR, EventType.LOAD, EventType.TOGGLE];
const isCaptureEventType = (eventType) => CAPTURE_EVENT_TYPES.indexOf(eventType) >= 0;
const EARLY_EVENT_TYPES = /* @__PURE__ */ BUBBLE_EVENT_TYPES.concat(CAPTURE_EVENT_TYPES);
const isEarlyEventType = (eventType) => EARLY_EVENT_TYPES.indexOf(eventType) >= 0;

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */
const HOST_TAG_NAME = /* @__PURE__ */ new InjectionToken("");
HOST_TAG_NAME.__NG_ELEMENT_ID__ = (flags) => {
  const tNode = getCurrentTNode();
  if (tNode === null) {
    throw new RuntimeError(204, false);
  }
  if (tNode.type & 2) {
    return tNode.value;
  }
  if (flags & 8) {
    return null;
  }
  throw new RuntimeError(204, false);
};
function compileNgModuleFactory(injector, options, moduleType) {
  const moduleFactory = new NgModuleFactory2(moduleType);
  {
    return Promise.resolve(moduleFactory);
  }
}
const OVERSIZED_IMAGE_TOLERANCE = 1200;
let ImagePerformanceWarning = /* @__PURE__ */ (() => {
  class ImagePerformanceWarning2 {
    // Map of full image URLs -> original `ngSrc` values.
    window = null;
    observer = null;
    options = inject(IMAGE_CONFIG);
    lcpImageUrl;
    start() {
      {
        return;
      }
    }
    ngOnDestroy() {
      this.observer?.disconnect();
    }
    initPerformanceObserver() {
      if (typeof PerformanceObserver === "undefined") {
        return null;
      }
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length === 0) return;
        const lcpElement = entries[entries.length - 1];
        const imgSrc = lcpElement.element?.src ?? "";
        if (imgSrc.startsWith("data:") || imgSrc.startsWith("blob:")) return;
        this.lcpImageUrl = imgSrc;
      });
      observer.observe({
        type: "largest-contentful-paint",
        buffered: true
      });
      return observer;
    }
    scanImages() {
      const images = getDocument().querySelectorAll("img");
      let lcpElementFound, lcpElementLoadedCorrectly = false;
      for (let index = 0; index < images.length; index++) {
        const image = images[index];
        if (!image) {
          continue;
        }
        if (!this.options?.disableImageSizeWarning) {
          if (!image.getAttribute("ng-img") && this.isOversized(image)) {
            logOversizedImageWarning(image.src);
          }
        }
        if (!this.options?.disableImageLazyLoadWarning && this.lcpImageUrl) {
          if (image.src === this.lcpImageUrl) {
            lcpElementFound = true;
            if (image.loading !== "lazy" || image.getAttribute("ng-img")) {
              lcpElementLoadedCorrectly = true;
            }
          }
        }
      }
      if (lcpElementFound && !lcpElementLoadedCorrectly && this.lcpImageUrl && !this.options?.disableImageLazyLoadWarning) {
        logLazyLCPWarning(this.lcpImageUrl);
      }
    }
    isOversized(image) {
      if (!this.window) {
        return false;
      }
      const nonOversizedImageExtentions = [
        // SVG images are vector-based, which means they can scale
        // to any size without losing quality.
        ".svg"
      ];
      const imageSource = (image.src || "").toLowerCase();
      if (nonOversizedImageExtentions.some((extension) => imageSource.endsWith(extension))) {
        return false;
      }
      const computedStyle = this.window.getComputedStyle(image);
      let renderedWidth = parseFloat(computedStyle.getPropertyValue("width"));
      let renderedHeight = parseFloat(computedStyle.getPropertyValue("height"));
      const boxSizing = computedStyle.getPropertyValue("box-sizing");
      const objectFit = computedStyle.getPropertyValue("object-fit");
      if (objectFit === `cover`) {
        return false;
      }
      if (boxSizing === "border-box") {
        const paddingTop = computedStyle.getPropertyValue("padding-top");
        const paddingRight = computedStyle.getPropertyValue("padding-right");
        const paddingBottom = computedStyle.getPropertyValue("padding-bottom");
        const paddingLeft = computedStyle.getPropertyValue("padding-left");
        renderedWidth -= parseFloat(paddingRight) + parseFloat(paddingLeft);
        renderedHeight -= parseFloat(paddingTop) + parseFloat(paddingBottom);
      }
      const intrinsicWidth = image.naturalWidth;
      const intrinsicHeight = image.naturalHeight;
      const recommendedWidth = this.window.devicePixelRatio * renderedWidth;
      const recommendedHeight = this.window.devicePixelRatio * renderedHeight;
      const oversizedWidth = intrinsicWidth - recommendedWidth >= OVERSIZED_IMAGE_TOLERANCE;
      const oversizedHeight = intrinsicHeight - recommendedHeight >= OVERSIZED_IMAGE_TOLERANCE;
      return oversizedWidth || oversizedHeight;
    }
    static ɵfac = function ImagePerformanceWarning_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || ImagePerformanceWarning2)();
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: ImagePerformanceWarning2,
      factory: ImagePerformanceWarning2.ɵfac,
      providedIn: "root"
    });
  }
  return ImagePerformanceWarning2;
})();
function logLazyLCPWarning(src) {
  console.warn(formatRuntimeError(-913, `An image with src ${src} is the Largest Contentful Paint (LCP) element but was given a "loading" value of "lazy", which can negatively impact application loading performance. This warning can be addressed by changing the loading value of the LCP image to "eager", or by using the NgOptimizedImage directive's prioritization utilities. For more information about addressing or disabling this warning, see https://angular.dev/errors/NG0913`));
}
function logOversizedImageWarning(src) {
  console.warn(formatRuntimeError(-913, `An image with src ${src} has intrinsic file dimensions much larger than its rendered size. This can negatively impact application loading performance. For more information about addressing or disabling this warning, see https://angular.dev/errors/NG0913`));
}
const PLATFORM_DESTROY_LISTENERS = /* @__PURE__ */ new InjectionToken("");
const ENABLE_ROOT_COMPONENT_BOOTSTRAP = /* @__PURE__ */ new InjectionToken("");
function isApplicationBootstrapConfig(config) {
  return !config.moduleRef;
}
function bootstrap(config) {
  const envInjector = isApplicationBootstrapConfig(config) ? config.r3Injector : config.moduleRef.injector;
  const ngZone = envInjector.get(NgZone);
  return ngZone.run(() => {
    if (isApplicationBootstrapConfig(config)) {
      config.r3Injector.resolveInjectorInitializers();
    } else {
      config.moduleRef.resolveInjectorInitializers();
    }
    const exceptionHandler = envInjector.get(INTERNAL_APPLICATION_ERROR_HANDLER);
    let onErrorSubscription;
    ngZone.runOutsideAngular(() => {
      onErrorSubscription = ngZone.onError.subscribe({
        next: exceptionHandler
      });
    });
    if (isApplicationBootstrapConfig(config)) {
      const destroyListener = () => envInjector.destroy();
      const onPlatformDestroyListeners = config.platformInjector.get(PLATFORM_DESTROY_LISTENERS);
      onPlatformDestroyListeners.add(destroyListener);
      envInjector.onDestroy(() => {
        onErrorSubscription.unsubscribe();
        onPlatformDestroyListeners.delete(destroyListener);
      });
    } else {
      const destroyListener = () => config.moduleRef.destroy();
      const onPlatformDestroyListeners = config.platformInjector.get(PLATFORM_DESTROY_LISTENERS);
      onPlatformDestroyListeners.add(destroyListener);
      config.moduleRef.onDestroy(() => {
        remove(config.allPlatformModules, config.moduleRef);
        onErrorSubscription.unsubscribe();
        onPlatformDestroyListeners.delete(destroyListener);
      });
    }
    return _callAndReportToErrorHandler(exceptionHandler, ngZone, () => {
      const pendingTasks = envInjector.get(PendingTasksInternal);
      const taskId = pendingTasks.add();
      const initStatus = envInjector.get(ApplicationInitStatus);
      initStatus.runInitializers();
      return initStatus.donePromise.then(() => {
        const localeId = envInjector.get(LOCALE_ID, DEFAULT_LOCALE_ID);
        setLocaleId(localeId || DEFAULT_LOCALE_ID);
        const enableRootComponentBoostrap = envInjector.get(ENABLE_ROOT_COMPONENT_BOOTSTRAP, true);
        if (!enableRootComponentBoostrap) {
          if (isApplicationBootstrapConfig(config)) {
            return envInjector.get(ApplicationRef);
          }
          config.allPlatformModules.push(config.moduleRef);
          return config.moduleRef;
        }
        if (false) ;
        if (isApplicationBootstrapConfig(config)) {
          const appRef = envInjector.get(ApplicationRef);
          if (config.rootComponent !== void 0) {
            appRef.bootstrap(config.rootComponent);
          }
          return appRef;
        } else {
          moduleBootstrapImpl?.(config.moduleRef, config.allPlatformModules);
          return config.moduleRef;
        }
      }).finally(() => void pendingTasks.remove(taskId));
    });
  });
}
let moduleBootstrapImpl;
function setModuleBootstrapImpl() {
  moduleBootstrapImpl = _moduleDoBootstrap;
}
function _moduleDoBootstrap(moduleRef, allPlatformModules) {
  const appRef = moduleRef.injector.get(ApplicationRef);
  if (moduleRef._bootstrapComponents.length > 0) {
    moduleRef._bootstrapComponents.forEach((f) => appRef.bootstrap(f));
  } else if (moduleRef.instance.ngDoBootstrap) {
    moduleRef.instance.ngDoBootstrap(appRef);
  } else {
    throw new RuntimeError(-403, false);
  }
  allPlatformModules.push(moduleRef);
}
function _callAndReportToErrorHandler(errorHandler, ngZone, callback) {
  try {
    const result = callback();
    if (isPromise(result)) {
      return result.catch((e) => {
        ngZone.runOutsideAngular(() => errorHandler(e));
        throw e;
      });
    }
    return result;
  } catch (e) {
    ngZone.runOutsideAngular(() => errorHandler(e));
    throw e;
  }
}
let PlatformRef = /* @__PURE__ */ (() => {
  class PlatformRef2 {
    _injector;
    _modules = [];
    _destroyListeners = [];
    _destroyed = false;
    /** @internal */
    constructor(_injector) {
      this._injector = _injector;
    }
    /**
     * Creates an instance of an `@NgModule` for the given platform.
     *
     * @deprecated Passing NgModule factories as the `PlatformRef.bootstrapModuleFactory` function
     *     argument is deprecated. Use the `PlatformRef.bootstrapModule` API instead.
     */
    bootstrapModuleFactory(moduleFactory, options) {
      const scheduleInRootZone = options?.scheduleInRootZone;
      const ngZoneFactory = () => getNgZone(options?.ngZone, {
        ...getNgZoneOptions({
          eventCoalescing: options?.ngZoneEventCoalescing,
          runCoalescing: options?.ngZoneRunCoalescing
        }),
        scheduleInRootZone
      });
      const ignoreChangesOutsideZone = options?.ignoreChangesOutsideZone;
      const allAppProviders = [internalProvideZoneChangeDetection({
        ngZoneFactory,
        ignoreChangesOutsideZone
      }), {
        provide: ChangeDetectionScheduler,
        useExisting: ChangeDetectionSchedulerImpl
      }, errorHandlerEnvironmentInitializer];
      const moduleRef = createNgModuleRefWithProviders(moduleFactory.moduleType, this.injector, allAppProviders);
      setModuleBootstrapImpl();
      return bootstrap({
        moduleRef,
        allPlatformModules: this._modules,
        platformInjector: this.injector
      });
    }
    /**
     * Creates an instance of an `@NgModule` for a given platform.
     *
     * @usageNotes
     * ### Simple Example
     *
     * ```ts
     * @NgModule({
     *   imports: [BrowserModule]
     * })
     * class MyModule {}
     *
     * let moduleRef = platformBrowser().bootstrapModule(MyModule);
     * ```
     *
     */
    bootstrapModule(moduleType, compilerOptions = []) {
      const options = optionsReducer({}, compilerOptions);
      setModuleBootstrapImpl();
      return compileNgModuleFactory(this.injector, options, moduleType).then((moduleFactory) => this.bootstrapModuleFactory(moduleFactory, options));
    }
    /**
     * Registers a listener to be called when the platform is destroyed.
     */
    onDestroy(callback) {
      this._destroyListeners.push(callback);
    }
    /**
     * Retrieves the platform {@link Injector}, which is the parent injector for
     * every Angular application on the page and provides singleton providers.
     */
    get injector() {
      return this._injector;
    }
    /**
     * Destroys the current Angular platform and all Angular applications on the page.
     * Destroys all modules and listeners registered with the platform.
     */
    destroy() {
      if (this._destroyed) {
        throw new RuntimeError(404, false);
      }
      this._modules.slice().forEach((module) => module.destroy());
      this._destroyListeners.forEach((listener) => listener());
      const destroyListeners = this._injector.get(PLATFORM_DESTROY_LISTENERS, null);
      if (destroyListeners) {
        destroyListeners.forEach((listener) => listener());
        destroyListeners.clear();
      }
      this._destroyed = true;
    }
    /**
     * Indicates whether this instance was destroyed.
     */
    get destroyed() {
      return this._destroyed;
    }
    static ɵfac = function PlatformRef_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || PlatformRef2)(ɵɵinject(Injector));
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: PlatformRef2,
      factory: PlatformRef2.ɵfac,
      providedIn: "platform"
    });
  }
  return PlatformRef2;
})();
let _platformInjector = null;
const ALLOW_MULTIPLE_PLATFORMS = /* @__PURE__ */ new InjectionToken("");
function createPlatform(injector) {
  if (_platformInjector && !_platformInjector.get(ALLOW_MULTIPLE_PLATFORMS, false)) {
    throw new RuntimeError(400, false);
  }
  publishSignalConfiguration();
  _platformInjector = injector;
  const platform = injector.get(PlatformRef);
  runPlatformInitializers(injector);
  return platform;
}
function createPlatformFactory(parentPlatformFactory, name, providers = []) {
  const desc = `Platform: ${name}`;
  const marker = new InjectionToken(desc);
  return (extraProviders = []) => {
    let platform = getPlatform();
    if (!platform || platform.injector.get(ALLOW_MULTIPLE_PLATFORMS, false)) {
      const platformProviders = [...providers, ...extraProviders, {
        provide: marker,
        useValue: true
      }];
      if (parentPlatformFactory) {
        parentPlatformFactory(platformProviders);
      } else {
        createPlatform(createPlatformInjector(platformProviders, desc));
      }
    }
    return assertPlatform();
  };
}
function createPlatformInjector(providers = [], name) {
  return Injector.create({
    name,
    providers: [{
      provide: INJECTOR_SCOPE,
      useValue: "platform"
    }, {
      provide: PLATFORM_DESTROY_LISTENERS,
      useValue: /* @__PURE__ */ new Set([() => _platformInjector = null])
    }, ...providers]
  });
}
function assertPlatform(requiredToken) {
  const platform = getPlatform();
  if (!platform) {
    throw new RuntimeError(401, false);
  }
  return platform;
}
function getPlatform() {
  return _platformInjector?.get(PlatformRef) ?? null;
}
function createOrReusePlatformInjector(providers = []) {
  if (_platformInjector) return _platformInjector;
  const injector = createPlatformInjector(providers);
  _platformInjector = injector;
  publishSignalConfiguration();
  runPlatformInitializers(injector);
  return injector;
}
function runPlatformInitializers(injector) {
  const inits = injector.get(PLATFORM_INITIALIZER, null);
  runInInjectionContext(injector, () => {
    inits?.forEach((init) => init());
  });
}
const platformCore = /* @__PURE__ */ createPlatformFactory(null, "core", []);
function internalCreateApplication(config) {
  profiler(
    8
    /* ProfilerEvent.BootstrapApplicationStart */
  );
  try {
    const {
      rootComponent,
      appProviders,
      platformProviders
    } = config;
    if (false) ;
    const platformInjector = createOrReusePlatformInjector(platformProviders);
    const allAppProviders = [internalProvideZoneChangeDetection({}), {
      provide: ChangeDetectionScheduler,
      useExisting: ChangeDetectionSchedulerImpl
    }, errorHandlerEnvironmentInitializer, ...appProviders || []];
    const adapter = new EnvironmentNgModuleRefAdapter({
      providers: allAppProviders,
      parent: platformInjector,
      debugName: false ? "Environment Injector" : "",
      // We skip environment initializers because we need to run them inside the NgZone, which
      // happens after we get the NgZone instance from the Injector.
      runEnvironmentInitializers: false
    });
    return bootstrap({
      r3Injector: adapter.injector,
      platformInjector,
      rootComponent
    });
  } catch (e) {
    return Promise.reject(e);
  } finally {
    profiler(
      9
      /* ProfilerEvent.BootstrapApplicationEnd */
    );
  }
}
function collectDomEventsInfo(tView, lView, eventTypesToReplay) {
  const domEventsInfo = /* @__PURE__ */ new Map();
  const lCleanup = lView[CLEANUP];
  const tCleanup = tView.cleanup;
  if (!tCleanup || !lCleanup) {
    return domEventsInfo;
  }
  for (let i = 0; i < tCleanup.length; ) {
    const firstParam = tCleanup[i++];
    const secondParam = tCleanup[i++];
    if (typeof firstParam !== "string") {
      continue;
    }
    const eventType = firstParam;
    if (!isEarlyEventType(eventType)) {
      continue;
    }
    if (isCaptureEventType(eventType)) {
      eventTypesToReplay.capture.add(eventType);
    } else {
      eventTypesToReplay.regular.add(eventType);
    }
    const listenerElement = unwrapRNode(lView[secondParam]);
    i++;
    const useCaptureOrIndx = tCleanup[i++];
    const isDomEvent = typeof useCaptureOrIndx === "boolean" || useCaptureOrIndx >= 0;
    if (!isDomEvent) {
      continue;
    }
    if (!domEventsInfo.has(listenerElement)) {
      domEventsInfo.set(listenerElement, [eventType]);
    } else {
      domEventsInfo.get(listenerElement).push(eventType);
    }
  }
  return domEventsInfo;
}
class SerializedViewCollection {
  views = [];
  indexByContent = /* @__PURE__ */ new Map();
  add(serializedView) {
    const viewAsString = JSON.stringify(serializedView);
    if (!this.indexByContent.has(viewAsString)) {
      const index = this.views.length;
      this.views.push(serializedView);
      this.indexByContent.set(viewAsString, index);
      return index;
    }
    return this.indexByContent.get(viewAsString);
  }
  getAll() {
    return this.views;
  }
}
let tViewSsrId = 0;
function getSsrId(tView) {
  if (!tView.ssrId) {
    tView.ssrId = `t${tViewSsrId++}`;
  }
  return tView.ssrId;
}
function calcNumRootNodes(tView, lView, tNode) {
  const rootNodes = [];
  collectNativeNodes(tView, lView, tNode, rootNodes);
  return rootNodes.length;
}
function calcNumRootNodesInLContainer(lContainer) {
  const rootNodes = [];
  collectNativeNodesInLContainer(lContainer, rootNodes);
  return rootNodes.length;
}
function annotateComponentLViewForHydration(lView, context, injector) {
  const hostElement = lView[HOST];
  if (hostElement && !hostElement.hasAttribute(SKIP_HYDRATION_ATTR_NAME)) {
    return annotateHostElementForHydration(hostElement, lView, null, context);
  }
  return null;
}
function annotateLContainerForHydration(lContainer, context, injector) {
  const componentLView = unwrapLView(lContainer[HOST]);
  const componentLViewNghIndex = annotateComponentLViewForHydration(componentLView, context);
  if (componentLViewNghIndex === null) {
    return;
  }
  const hostElement = unwrapRNode(componentLView[HOST]);
  const rootLView = lContainer[PARENT];
  const rootLViewNghIndex = annotateHostElementForHydration(hostElement, rootLView, null, context);
  const renderer = componentLView[RENDERER];
  const finalIndex = `${componentLViewNghIndex}|${rootLViewNghIndex}`;
  renderer.setAttribute(hostElement, NGH_ATTR_NAME, finalIndex);
}
function annotateForHydration(appRef, doc) {
  const injector = appRef.injector;
  const isI18nHydrationEnabledVal = isI18nHydrationEnabled(injector);
  const isIncrementalHydrationEnabledVal = isIncrementalHydrationEnabled(injector);
  const serializedViewCollection = new SerializedViewCollection();
  const corruptedTextNodes = /* @__PURE__ */ new Map();
  const viewRefs = appRef._views;
  const shouldReplayEvents = injector.get(IS_EVENT_REPLAY_ENABLED, EVENT_REPLAY_ENABLED_DEFAULT);
  const eventTypesToReplay = {
    regular: /* @__PURE__ */ new Set(),
    capture: /* @__PURE__ */ new Set()
  };
  const deferBlocks = /* @__PURE__ */ new Map();
  appRef.injector.get(APP_ID);
  for (const viewRef of viewRefs) {
    const lNode = getLNodeForHydration(viewRef);
    if (lNode !== null) {
      const context = {
        serializedViewCollection,
        corruptedTextNodes,
        isI18nHydrationEnabled: isI18nHydrationEnabledVal,
        isIncrementalHydrationEnabled: isIncrementalHydrationEnabledVal,
        i18nChildren: /* @__PURE__ */ new Map(),
        eventTypesToReplay,
        shouldReplayEvents,
        deferBlocks
      };
      if (isLContainer(lNode)) {
        annotateLContainerForHydration(lNode, context);
      } else {
        annotateComponentLViewForHydration(lNode, context);
      }
      insertCorruptedTextNodeMarkers(corruptedTextNodes, doc);
    }
  }
  const serializedViews = serializedViewCollection.getAll();
  const transferState = injector.get(TransferState);
  transferState.set(NGH_DATA_KEY, serializedViews);
  if (deferBlocks.size > 0) {
    const blocks = {};
    for (const [id, info] of deferBlocks.entries()) {
      blocks[id] = info;
    }
    transferState.set(NGH_DEFER_BLOCKS_KEY, blocks);
  }
  return eventTypesToReplay;
}
function serializeLContainer(lContainer, tNode, lView, parentDeferBlockId, context) {
  const views = [];
  let lastViewAsString = "";
  for (let i = CONTAINER_HEADER_OFFSET; i < lContainer.length; i++) {
    let childLView = lContainer[i];
    let template;
    let numRootNodes;
    let serializedView;
    if (isRootView(childLView)) {
      childLView = childLView[HEADER_OFFSET];
      if (isLContainer(childLView)) {
        numRootNodes = calcNumRootNodesInLContainer(childLView) + 1;
        annotateLContainerForHydration(childLView, context);
        const componentLView = unwrapLView(childLView[HOST]);
        serializedView = {
          [TEMPLATE_ID]: componentLView[TVIEW].ssrId,
          [NUM_ROOT_NODES]: numRootNodes
        };
      }
    }
    if (!serializedView) {
      const childTView = childLView[TVIEW];
      if (childTView.type === 1) {
        template = childTView.ssrId;
        numRootNodes = 1;
      } else {
        template = getSsrId(childTView);
        numRootNodes = calcNumRootNodes(childTView, childLView, childTView.firstChild);
      }
      serializedView = {
        [TEMPLATE_ID]: template,
        [NUM_ROOT_NODES]: numRootNodes
      };
      let isHydrateNeverBlock = false;
      if (isDeferBlock(lView[TVIEW], tNode)) {
        const lDetails = getLDeferBlockDetails(lView, tNode);
        const tDetails = getTDeferBlockDetails(lView[TVIEW], tNode);
        if (context.isIncrementalHydrationEnabled && tDetails.hydrateTriggers !== null) {
          const deferBlockId = `d${context.deferBlocks.size}`;
          if (tDetails.hydrateTriggers.has(
            7
            /* DeferBlockTrigger.Never */
          )) {
            isHydrateNeverBlock = true;
          }
          let rootNodes = [];
          collectNativeNodesInLContainer(lContainer, rootNodes);
          const deferBlockInfo = {
            [NUM_ROOT_NODES]: rootNodes.length,
            [DEFER_BLOCK_STATE$1]: lDetails[DEFER_BLOCK_STATE]
          };
          const serializedTriggers = serializeHydrateTriggers(tDetails.hydrateTriggers);
          if (serializedTriggers.length > 0) {
            deferBlockInfo[DEFER_HYDRATE_TRIGGERS] = serializedTriggers;
          }
          if (parentDeferBlockId !== null) {
            deferBlockInfo[DEFER_PARENT_BLOCK_ID] = parentDeferBlockId;
          }
          context.deferBlocks.set(deferBlockId, deferBlockInfo);
          const node = unwrapRNode(lContainer);
          if (node !== void 0) {
            if (node.nodeType === Node.COMMENT_NODE) {
              annotateDeferBlockAnchorForHydration(node, deferBlockId);
            }
          } else {
            annotateDeferBlockAnchorForHydration(node, deferBlockId);
          }
          if (!isHydrateNeverBlock) {
            annotateDeferBlockRootNodesWithJsAction(tDetails, rootNodes, deferBlockId, context);
          }
          parentDeferBlockId = deferBlockId;
          serializedView[DEFER_BLOCK_ID] = deferBlockId;
        }
        serializedView[DEFER_BLOCK_STATE$1] = lDetails[DEFER_BLOCK_STATE];
      }
      if (!isHydrateNeverBlock) {
        Object.assign(serializedView, serializeLView(lContainer[i], parentDeferBlockId, context));
      }
    }
    const currentViewAsString = JSON.stringify(serializedView);
    if (views.length > 0 && currentViewAsString === lastViewAsString) {
      const previousView = views[views.length - 1];
      previousView[MULTIPLIER] ??= 1;
      previousView[MULTIPLIER]++;
    } else {
      lastViewAsString = currentViewAsString;
      views.push(serializedView);
    }
  }
  return views;
}
function serializeHydrateTriggers(triggerMap) {
  const serializableDeferBlockTrigger = /* @__PURE__ */ new Set([
    0,
    1,
    2,
    5
    /* DeferBlockTrigger.Timer */
  ]);
  let triggers = [];
  for (let [trigger, details] of triggerMap) {
    if (serializableDeferBlockTrigger.has(trigger)) {
      if (details === null) {
        triggers.push(trigger);
      } else {
        triggers.push({
          trigger,
          delay: details.delay
        });
      }
    }
  }
  return triggers;
}
function appendSerializedNodePath(ngh, tNode, lView, excludedParentNodes) {
  const noOffsetIndex = tNode.index - HEADER_OFFSET;
  ngh[NODES] ??= {};
  ngh[NODES][noOffsetIndex] ??= calcPathForNode(tNode, lView, excludedParentNodes);
}
function appendDisconnectedNodeIndex(ngh, tNodeOrNoOffsetIndex) {
  const noOffsetIndex = typeof tNodeOrNoOffsetIndex === "number" ? tNodeOrNoOffsetIndex : tNodeOrNoOffsetIndex.index - HEADER_OFFSET;
  ngh[DISCONNECTED_NODES] ??= [];
  if (!ngh[DISCONNECTED_NODES].includes(noOffsetIndex)) {
    ngh[DISCONNECTED_NODES].push(noOffsetIndex);
  }
}
function serializeLView(lView, parentDeferBlockId = null, context) {
  const ngh = {};
  const tView = lView[TVIEW];
  const i18nChildren = getOrComputeI18nChildren(tView, context);
  const nativeElementsToEventTypes = context.shouldReplayEvents ? collectDomEventsInfo(tView, lView, context.eventTypesToReplay) : null;
  for (let i = HEADER_OFFSET; i < tView.bindingStartIndex; i++) {
    const tNode = tView.data[i];
    const noOffsetIndex = i - HEADER_OFFSET;
    const i18nData = trySerializeI18nBlock(lView, i, context);
    if (i18nData) {
      ngh[I18N_DATA] ??= {};
      ngh[I18N_DATA][noOffsetIndex] = i18nData.caseQueue;
      for (const nodeNoOffsetIndex of i18nData.disconnectedNodes) {
        appendDisconnectedNodeIndex(ngh, nodeNoOffsetIndex);
      }
      for (const nodeNoOffsetIndex of i18nData.disjointNodes) {
        const tNode2 = tView.data[nodeNoOffsetIndex + HEADER_OFFSET];
        appendSerializedNodePath(ngh, tNode2, lView, i18nChildren);
      }
      continue;
    }
    if (!isTNodeShape(tNode)) {
      continue;
    }
    if (isDetachedByI18n(tNode)) {
      continue;
    }
    if (isLContainer(lView[i]) && tNode.tView) {
      ngh[TEMPLATES] ??= {};
      ngh[TEMPLATES][noOffsetIndex] = getSsrId(tNode.tView);
    }
    if (isDisconnectedNode(tNode, lView) && isContentProjectedNode(tNode)) {
      appendDisconnectedNodeIndex(ngh, tNode);
      continue;
    }
    if (Array.isArray(tNode.projection)) {
      for (const projectionHeadTNode of tNode.projection) {
        if (!projectionHeadTNode) continue;
        if (!Array.isArray(projectionHeadTNode)) {
          if (!isProjectionTNode(projectionHeadTNode) && !isInSkipHydrationBlock(projectionHeadTNode)) {
            if (isDisconnectedNode(projectionHeadTNode, lView)) {
              appendDisconnectedNodeIndex(ngh, projectionHeadTNode);
            } else {
              appendSerializedNodePath(ngh, projectionHeadTNode, lView, i18nChildren);
            }
          }
        } else {
          throw unsupportedProjectionOfDomNodes(unwrapRNode(lView[i]));
        }
      }
    }
    conditionallyAnnotateNodePath(ngh, tNode, lView, i18nChildren);
    if (isLContainer(lView[i])) {
      const hostNode = lView[i][HOST];
      if (Array.isArray(hostNode)) {
        const targetNode = unwrapRNode(hostNode);
        if (!targetNode.hasAttribute(SKIP_HYDRATION_ATTR_NAME)) {
          annotateHostElementForHydration(targetNode, hostNode, parentDeferBlockId, context);
        }
      }
      ngh[CONTAINERS] ??= {};
      ngh[CONTAINERS][noOffsetIndex] = serializeLContainer(lView[i], tNode, lView, parentDeferBlockId, context);
    } else if (Array.isArray(lView[i]) && !isLetDeclaration(tNode)) {
      const targetNode = unwrapRNode(lView[i][HOST]);
      if (!targetNode.hasAttribute(SKIP_HYDRATION_ATTR_NAME)) {
        annotateHostElementForHydration(targetNode, lView[i], parentDeferBlockId, context);
      }
    } else {
      if (tNode.type & 8) {
        ngh[ELEMENT_CONTAINERS] ??= {};
        ngh[ELEMENT_CONTAINERS][noOffsetIndex] = calcNumRootNodes(tView, lView, tNode.child);
      } else if (tNode.type & (16 | 128)) {
        let nextTNode = tNode.next;
        while (nextTNode !== null && nextTNode.type & (16 | 128)) {
          nextTNode = nextTNode.next;
        }
        if (nextTNode && !isInSkipHydrationBlock(nextTNode)) {
          appendSerializedNodePath(ngh, nextTNode, lView, i18nChildren);
        }
      } else if (tNode.type & 1) {
        const rNode = unwrapRNode(lView[i]);
        processTextNodeBeforeSerialization(context, rNode);
      }
    }
    if (nativeElementsToEventTypes && tNode.type & 2) {
      const nativeElement = unwrapRNode(lView[i]);
      if (nativeElementsToEventTypes.has(nativeElement)) {
        setJSActionAttributes(nativeElement, nativeElementsToEventTypes.get(nativeElement), parentDeferBlockId);
      }
    }
  }
  return ngh;
}
function conditionallyAnnotateNodePath(ngh, tNode, lView, excludedParentNodes) {
  if (isProjectionTNode(tNode)) {
    return;
  }
  if (tNode.projectionNext && tNode.projectionNext !== tNode.next && !isInSkipHydrationBlock(tNode.projectionNext)) {
    appendSerializedNodePath(ngh, tNode.projectionNext, lView, excludedParentNodes);
  }
  if (tNode.prev === null && tNode.parent !== null && isDisconnectedNode(tNode.parent, lView) && !isDisconnectedNode(tNode, lView)) {
    appendSerializedNodePath(ngh, tNode, lView, excludedParentNodes);
  }
}
function componentUsesShadowDomEncapsulation(lView) {
  const instance = lView[CONTEXT];
  return instance?.constructor ? getComponentDef(instance.constructor)?.encapsulation === ViewEncapsulation.ShadowDom : false;
}
function annotateHostElementForHydration(element, lView, parentDeferBlockId, context) {
  const renderer = lView[RENDERER];
  if (hasI18n(lView) && true || componentUsesShadowDomEncapsulation(lView)) {
    renderer.setAttribute(element, SKIP_HYDRATION_ATTR_NAME, "");
    return null;
  } else {
    const ngh = serializeLView(lView, parentDeferBlockId, context);
    const index = context.serializedViewCollection.add(ngh);
    renderer.setAttribute(element, NGH_ATTR_NAME, index.toString());
    return index;
  }
}
function annotateDeferBlockAnchorForHydration(comment, deferBlockId) {
  comment.textContent = `ngh=${deferBlockId}`;
}
function insertCorruptedTextNodeMarkers(corruptedTextNodes, doc) {
  for (const [textNode, marker] of corruptedTextNodes) {
    textNode.after(doc.createComment(marker));
  }
}
function isContentProjectedNode(tNode) {
  let currentTNode = tNode;
  while (currentTNode != null) {
    if (isComponentHost(currentTNode)) {
      return true;
    }
    currentTNode = currentTNode.parent;
  }
  return false;
}
function annotateDeferBlockRootNodesWithJsAction(tDetails, rootNodes, parentDeferBlockId, context) {
  const actionList = convertHydrateTriggersToJsAction(tDetails.hydrateTriggers);
  for (let et of actionList) {
    context.eventTypesToReplay.regular.add(et);
  }
  if (actionList.length > 0) {
    const elementNodes = rootNodes.filter((rn) => rn.nodeType === Node.ELEMENT_NODE);
    for (let rNode of elementNodes) {
      setJSActionAttributes(rNode, actionList, parentDeferBlockId);
    }
  }
}
function startMeasuring(label) {
  {
    return;
  }
}
function stopMeasuring(label) {
  {
    return;
  }
}
function reflectComponentType(component) {
  const componentDef = getComponentDef(component);
  if (!componentDef) return null;
  const factory = new ComponentFactory2(componentDef);
  return {
    get selector() {
      return factory.selector;
    },
    get type() {
      return factory.componentType;
    },
    get inputs() {
      return factory.inputs;
    },
    get outputs() {
      return factory.outputs;
    },
    get ngContentSelectors() {
      return factory.ngContentSelectors;
    },
    get isStandalone() {
      return componentDef.standalone;
    },
    get isSignal() {
      return componentDef.signals;
    }
  };
}

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */
let _DOM = null;
function getDOM() {
  return _DOM;
}
function setRootDomAdapter(adapter) {
  _DOM ??= adapter;
}
class DomAdapter {
}
let PlatformLocation = /* @__PURE__ */ (() => {
  class PlatformLocation2 {
    historyGo(relativePosition) {
      throw new Error("");
    }
    static ɵfac = function PlatformLocation_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || PlatformLocation2)();
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: PlatformLocation2,
      factory: () => (() => inject(BrowserPlatformLocation))(),
      providedIn: "platform"
    });
  }
  return PlatformLocation2;
})();
let BrowserPlatformLocation = /* @__PURE__ */ (() => {
  class BrowserPlatformLocation2 extends PlatformLocation {
    _location;
    _history;
    _doc = inject(DOCUMENT$1);
    constructor() {
      super();
      this._location = window.location;
      this._history = window.history;
    }
    getBaseHrefFromDOM() {
      return getDOM().getBaseHref(this._doc);
    }
    onPopState(fn) {
      const window2 = getDOM().getGlobalEventTarget(this._doc, "window");
      window2.addEventListener("popstate", fn, false);
      return () => window2.removeEventListener("popstate", fn);
    }
    onHashChange(fn) {
      const window2 = getDOM().getGlobalEventTarget(this._doc, "window");
      window2.addEventListener("hashchange", fn, false);
      return () => window2.removeEventListener("hashchange", fn);
    }
    get href() {
      return this._location.href;
    }
    get protocol() {
      return this._location.protocol;
    }
    get hostname() {
      return this._location.hostname;
    }
    get port() {
      return this._location.port;
    }
    get pathname() {
      return this._location.pathname;
    }
    get search() {
      return this._location.search;
    }
    get hash() {
      return this._location.hash;
    }
    set pathname(newPath) {
      this._location.pathname = newPath;
    }
    pushState(state, title, url) {
      this._history.pushState(state, title, url);
    }
    replaceState(state, title, url) {
      this._history.replaceState(state, title, url);
    }
    forward() {
      this._history.forward();
    }
    back() {
      this._history.back();
    }
    historyGo(relativePosition = 0) {
      this._history.go(relativePosition);
    }
    getState() {
      return this._history.state;
    }
    static ɵfac = function BrowserPlatformLocation_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || BrowserPlatformLocation2)();
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: BrowserPlatformLocation2,
      factory: () => (() => new BrowserPlatformLocation2())(),
      providedIn: "platform"
    });
  }
  return BrowserPlatformLocation2;
})();

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */

function parseCookieValue(cookieStr, name) {
  name = encodeURIComponent(name);
  for (const cookie of cookieStr.split(';')) {
    const eqIndex = cookie.indexOf('=');
    const [cookieName, cookieValue] = eqIndex == -1 ? [cookie, ''] : [cookie.slice(0, eqIndex), cookie.slice(eqIndex + 1)];
    if (cookieName.trim() === name) {
      return decodeURIComponent(cookieValue);
    }
  }
  return null;
}

/**
 * A wrapper around the `XMLHttpRequest` constructor.
 *
 * @publicApi
 */
class XhrFactory {}

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */
const PLATFORM_BROWSER_ID = "browser";
const PLATFORM_SERVER_ID = "server";
let ViewportScroller = /* @__PURE__ */ (() => {
  class ViewportScroller2 {
    // De-sugared tree-shakable injection
    // See #23917
    /** @nocollapse */
    static ɵprov = (
      /** @pureOrBreakMyCode */
      /* @__PURE__ */ ɵɵdefineInjectable({
        token: ViewportScroller2,
        providedIn: "root",
        factory: () => new NullViewportScroller() 
      })
    );
  }
  return ViewportScroller2;
})();
class NullViewportScroller {
  /**
   * Empty implementation
   */
  setOffset(offset) {
  }
  /**
   * Empty implementation
   */
  getScrollPosition() {
    return [0, 0];
  }
  /**
   * Empty implementation
   */
  scrollToPosition(position) {
  }
  /**
   * Empty implementation
   */
  scrollToAnchor(anchor) {
  }
  /**
   * Empty implementation
   */
  setHistoryScrollRestoration(scrollRestoration) {
  }
}

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */
const EVENT_MANAGER_PLUGINS = /* @__PURE__ */ new InjectionToken("");
let EventManager = /* @__PURE__ */ (() => {
  class EventManager2 {
    _zone;
    _plugins;
    _eventNameToPlugin = /* @__PURE__ */ new Map();
    /**
     * Initializes an instance of the event-manager service.
     */
    constructor(plugins, _zone) {
      this._zone = _zone;
      plugins.forEach((plugin) => {
        plugin.manager = this;
      });
      this._plugins = plugins.slice().reverse();
    }
    /**
     * Registers a handler for a specific element and event.
     *
     * @param element The HTML element to receive event notifications.
     * @param eventName The name of the event to listen for.
     * @param handler A function to call when the notification occurs. Receives the
     * event object as an argument.
     * @param options Options that configure how the event listener is bound.
     * @returns  A callback function that can be used to remove the handler.
     */
    addEventListener(element, eventName, handler, options) {
      const plugin = this._findPluginFor(eventName);
      return plugin.addEventListener(element, eventName, handler, options);
    }
    /**
     * Retrieves the compilation zone in which event listeners are registered.
     */
    getZone() {
      return this._zone;
    }
    /** @internal */
    _findPluginFor(eventName) {
      let plugin = this._eventNameToPlugin.get(eventName);
      if (plugin) {
        return plugin;
      }
      const plugins = this._plugins;
      plugin = plugins.find((plugin2) => plugin2.supports(eventName));
      if (!plugin) {
        throw new RuntimeError(5101, false);
      }
      this._eventNameToPlugin.set(eventName, plugin);
      return plugin;
    }
    static ɵfac = function EventManager_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || EventManager2)(ɵɵinject(EVENT_MANAGER_PLUGINS), ɵɵinject(NgZone));
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: EventManager2,
      factory: EventManager2.ɵfac
    });
  }
  return EventManager2;
})();
class EventManagerPlugin {
  _doc;
  // TODO: remove (has some usage in G3)
  constructor(_doc) {
    this._doc = _doc;
  }
  // Using non-null assertion because it's set by EventManager's constructor
  manager;
}
const APP_ID_ATTRIBUTE_NAME = "ng-app-id";
function removeElements(elements) {
  for (const element of elements) {
    element.remove();
  }
}
function createStyleElement(style, doc) {
  const styleElement = doc.createElement("style");
  styleElement.textContent = style;
  return styleElement;
}
function addServerStyles(doc, appId, inline, external) {
  const elements = doc.head?.querySelectorAll(`style[${APP_ID_ATTRIBUTE_NAME}="${appId}"],link[${APP_ID_ATTRIBUTE_NAME}="${appId}"]`);
  if (elements) {
    for (const styleElement of elements) {
      styleElement.removeAttribute(APP_ID_ATTRIBUTE_NAME);
      if (styleElement instanceof HTMLLinkElement) {
        external.set(styleElement.href.slice(styleElement.href.lastIndexOf("/") + 1), {
          usage: 0,
          elements: [styleElement]
        });
      } else if (styleElement.textContent) {
        inline.set(styleElement.textContent, {
          usage: 0,
          elements: [styleElement]
        });
      }
    }
  }
}
function createLinkElement(url, doc) {
  const linkElement = doc.createElement("link");
  linkElement.setAttribute("rel", "stylesheet");
  linkElement.setAttribute("href", url);
  return linkElement;
}
let SharedStylesHost = /* @__PURE__ */ (() => {
  class SharedStylesHost2 {
    doc;
    appId;
    nonce;
    /**
     * Provides usage information for active inline style content and associated HTML <style> elements.
     * Embedded styles typically originate from the `styles` metadata of a rendered component.
     */
    inline = /* @__PURE__ */ new Map();
    /**
     * Provides usage information for active external style URLs and the associated HTML <link> elements.
     * External styles typically originate from the `ɵɵExternalStylesFeature` of a rendered component.
     */
    external = /* @__PURE__ */ new Map();
    /**
     * Set of host DOM nodes that will have styles attached.
     */
    hosts = /* @__PURE__ */ new Set();
    constructor(doc, appId, nonce, platformId = {}) {
      this.doc = doc;
      this.appId = appId;
      this.nonce = nonce;
      addServerStyles(doc, appId, this.inline, this.external);
      this.hosts.add(doc.head);
    }
    /**
     * Adds embedded styles to the DOM via HTML `style` elements.
     * @param styles An array of style content strings.
     */
    addStyles(styles, urls) {
      for (const value of styles) {
        this.addUsage(value, this.inline, createStyleElement);
      }
      urls?.forEach((value) => this.addUsage(value, this.external, createLinkElement));
    }
    /**
     * Removes embedded styles from the DOM that were added as HTML `style` elements.
     * @param styles An array of style content strings.
     */
    removeStyles(styles, urls) {
      for (const value of styles) {
        this.removeUsage(value, this.inline);
      }
      urls?.forEach((value) => this.removeUsage(value, this.external));
    }
    addUsage(value, usages, creator) {
      const record = usages.get(value);
      if (record) {
        record.usage++;
      } else {
        usages.set(value, {
          usage: 1,
          elements: [...this.hosts].map((host) => this.addElement(host, creator(value, this.doc)))
        });
      }
    }
    removeUsage(value, usages) {
      const record = usages.get(value);
      if (record) {
        record.usage--;
        if (record.usage <= 0) {
          removeElements(record.elements);
          usages.delete(value);
        }
      }
    }
    ngOnDestroy() {
      for (const [, {
        elements
      }] of [...this.inline, ...this.external]) {
        removeElements(elements);
      }
      this.hosts.clear();
    }
    /**
     * Adds a host node to the set of style hosts and adds all existing style usage to
     * the newly added host node.
     *
     * This is currently only used for Shadow DOM encapsulation mode.
     */
    addHost(hostNode) {
      this.hosts.add(hostNode);
      for (const [style, {
        elements
      }] of this.inline) {
        elements.push(this.addElement(hostNode, createStyleElement(style, this.doc)));
      }
      for (const [url, {
        elements
      }] of this.external) {
        elements.push(this.addElement(hostNode, createLinkElement(url, this.doc)));
      }
    }
    removeHost(hostNode) {
      this.hosts.delete(hostNode);
    }
    addElement(host, element) {
      if (this.nonce) {
        element.setAttribute("nonce", this.nonce);
      }
      {
        element.setAttribute(APP_ID_ATTRIBUTE_NAME, this.appId);
      }
      return host.appendChild(element);
    }
    static ɵfac = function SharedStylesHost_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || SharedStylesHost2)(ɵɵinject(DOCUMENT$1), ɵɵinject(APP_ID), ɵɵinject(CSP_NONCE, 8), ɵɵinject(PLATFORM_ID));
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: SharedStylesHost2,
      factory: SharedStylesHost2.ɵfac
    });
  }
  return SharedStylesHost2;
})();
const NAMESPACE_URIS = {
  "svg": "http://www.w3.org/2000/svg",
  "xhtml": "http://www.w3.org/1999/xhtml",
  "xlink": "http://www.w3.org/1999/xlink",
  "xml": "http://www.w3.org/XML/1998/namespace",
  "xmlns": "http://www.w3.org/2000/xmlns/",
  "math": "http://www.w3.org/1998/Math/MathML"
};
const COMPONENT_REGEX = /%COMP%/g;
const COMPONENT_VARIABLE = "%COMP%";
const HOST_ATTR = `_nghost-${COMPONENT_VARIABLE}`;
const CONTENT_ATTR = `_ngcontent-${COMPONENT_VARIABLE}`;
const REMOVE_STYLES_ON_COMPONENT_DESTROY_DEFAULT = true;
const REMOVE_STYLES_ON_COMPONENT_DESTROY = /* @__PURE__ */ new InjectionToken("", {
  providedIn: "root",
  factory: () => REMOVE_STYLES_ON_COMPONENT_DESTROY_DEFAULT
});
function shimContentAttribute(componentShortId) {
  return CONTENT_ATTR.replace(COMPONENT_REGEX, componentShortId);
}
function shimHostAttribute(componentShortId) {
  return HOST_ATTR.replace(COMPONENT_REGEX, componentShortId);
}
function shimStylesContent(compId, styles) {
  return styles.map((s) => s.replace(COMPONENT_REGEX, compId));
}
let DomRendererFactory2 = /* @__PURE__ */ (() => {
  class DomRendererFactory22 {
    eventManager;
    sharedStylesHost;
    appId;
    removeStylesOnCompDestroy;
    doc;
    platformId;
    ngZone;
    nonce;
    animationDisabled;
    maxAnimationTimeout;
    tracingService;
    rendererByCompId = /* @__PURE__ */ new Map();
    defaultRenderer;
    platformIsServer;
    registry;
    constructor(eventManager, sharedStylesHost, appId, removeStylesOnCompDestroy, doc, platformId, ngZone, nonce = null, animationDisabled, maxAnimationTimeout, tracingService = null) {
      this.eventManager = eventManager;
      this.sharedStylesHost = sharedStylesHost;
      this.appId = appId;
      this.removeStylesOnCompDestroy = removeStylesOnCompDestroy;
      this.doc = doc;
      this.platformId = platformId;
      this.ngZone = ngZone;
      this.nonce = nonce;
      this.animationDisabled = animationDisabled;
      this.maxAnimationTimeout = maxAnimationTimeout;
      this.tracingService = tracingService;
      this.platformIsServer = true;
      this.defaultRenderer = new DefaultDomRenderer2(eventManager, doc, ngZone, this.platformIsServer, this.tracingService, this.registry = getAnimationElementRemovalRegistry(), this.maxAnimationTimeout);
    }
    createRenderer(element, type) {
      if (!element || !type) {
        return this.defaultRenderer;
      }
      if (type.encapsulation === ViewEncapsulation.ShadowDom) {
        type = {
          ...type,
          encapsulation: ViewEncapsulation.Emulated
        };
      }
      const renderer = this.getOrCreateRenderer(element, type);
      if (renderer instanceof EmulatedEncapsulationDomRenderer2) {
        renderer.applyToHost(element);
      } else if (renderer instanceof NoneEncapsulationDomRenderer) {
        renderer.applyStyles();
      }
      return renderer;
    }
    getOrCreateRenderer(element, type) {
      const rendererByCompId = this.rendererByCompId;
      let renderer = rendererByCompId.get(type.id);
      if (!renderer) {
        const doc = this.doc;
        const ngZone = this.ngZone;
        const eventManager = this.eventManager;
        const sharedStylesHost = this.sharedStylesHost;
        const removeStylesOnCompDestroy = this.removeStylesOnCompDestroy;
        const platformIsServer = this.platformIsServer;
        const tracingService = this.tracingService;
        switch (type.encapsulation) {
          case ViewEncapsulation.Emulated:
            renderer = new EmulatedEncapsulationDomRenderer2(eventManager, sharedStylesHost, type, this.appId, removeStylesOnCompDestroy, doc, ngZone, platformIsServer, tracingService, this.registry, this.animationDisabled, this.maxAnimationTimeout);
            break;
          case ViewEncapsulation.ShadowDom:
            return new ShadowDomRenderer(eventManager, sharedStylesHost, element, type, doc, ngZone, this.nonce, platformIsServer, tracingService, this.registry, this.maxAnimationTimeout);
          default:
            renderer = new NoneEncapsulationDomRenderer(eventManager, sharedStylesHost, type, removeStylesOnCompDestroy, doc, ngZone, platformIsServer, tracingService, this.registry, this.animationDisabled, this.maxAnimationTimeout);
            break;
        }
        rendererByCompId.set(type.id, renderer);
      }
      return renderer;
    }
    ngOnDestroy() {
      this.rendererByCompId.clear();
    }
    /**
     * Used during HMR to clear any cached data about a component.
     * @param componentId ID of the component that is being replaced.
     */
    componentReplaced(componentId) {
      this.rendererByCompId.delete(componentId);
    }
    static ɵfac = function DomRendererFactory2_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || DomRendererFactory22)(ɵɵinject(EventManager), ɵɵinject(SharedStylesHost), ɵɵinject(APP_ID), ɵɵinject(REMOVE_STYLES_ON_COMPONENT_DESTROY), ɵɵinject(DOCUMENT$1), ɵɵinject(PLATFORM_ID), ɵɵinject(NgZone), ɵɵinject(CSP_NONCE), ɵɵinject(ANIMATIONS_DISABLED), ɵɵinject(MAX_ANIMATION_TIMEOUT), ɵɵinject(TracingService, 8));
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: DomRendererFactory22,
      factory: DomRendererFactory22.ɵfac
    });
  }
  return DomRendererFactory22;
})();
class DefaultDomRenderer2 {
  eventManager;
  doc;
  ngZone;
  platformIsServer;
  tracingService;
  registry;
  maxAnimationTimeout;
  data = /* @__PURE__ */ Object.create(null);
  /**
   * By default this renderer throws when encountering synthetic properties
   * This can be disabled for example by the AsyncAnimationRendererFactory
   */
  throwOnSyntheticProps = true;
  constructor(eventManager, doc, ngZone, platformIsServer, tracingService, registry, maxAnimationTimeout) {
    this.eventManager = eventManager;
    this.doc = doc;
    this.ngZone = ngZone;
    this.platformIsServer = platformIsServer;
    this.tracingService = tracingService;
    this.registry = registry;
    this.maxAnimationTimeout = maxAnimationTimeout;
  }
  destroy() {
  }
  destroyNode = null;
  createElement(name, namespace) {
    if (namespace) {
      return this.doc.createElementNS(NAMESPACE_URIS[namespace] || namespace, name);
    }
    return this.doc.createElement(name);
  }
  createComment(value) {
    return this.doc.createComment(value);
  }
  createText(value) {
    return this.doc.createTextNode(value);
  }
  appendChild(parent, newChild) {
    const targetParent = isTemplateNode(parent) ? parent.content : parent;
    targetParent.appendChild(newChild);
  }
  insertBefore(parent, newChild, refChild) {
    if (parent) {
      const targetParent = isTemplateNode(parent) ? parent.content : parent;
      targetParent.insertBefore(newChild, refChild);
    }
  }
  removeChild(_parent, oldChild) {
    const {
      elements
    } = this.registry;
    if (elements) {
      elements.animate(oldChild, () => oldChild.remove(), this.maxAnimationTimeout);
      return;
    }
    oldChild.remove();
  }
  selectRootElement(selectorOrNode, preserveContent) {
    let el = typeof selectorOrNode === "string" ? this.doc.querySelector(selectorOrNode) : selectorOrNode;
    if (!el) {
      throw new RuntimeError(-5104, false);
    }
    if (!preserveContent) {
      el.textContent = "";
    }
    return el;
  }
  parentNode(node) {
    return node.parentNode;
  }
  nextSibling(node) {
    return node.nextSibling;
  }
  setAttribute(el, name, value, namespace) {
    if (namespace) {
      name = namespace + ":" + name;
      const namespaceUri = NAMESPACE_URIS[namespace];
      if (namespaceUri) {
        el.setAttributeNS(namespaceUri, name, value);
      } else {
        el.setAttribute(name, value);
      }
    } else {
      el.setAttribute(name, value);
    }
  }
  removeAttribute(el, name, namespace) {
    if (namespace) {
      const namespaceUri = NAMESPACE_URIS[namespace];
      if (namespaceUri) {
        el.removeAttributeNS(namespaceUri, name);
      } else {
        el.removeAttribute(`${namespace}:${name}`);
      }
    } else {
      el.removeAttribute(name);
    }
  }
  addClass(el, name) {
    el.classList.add(name);
  }
  removeClass(el, name) {
    el.classList.remove(name);
  }
  setStyle(el, style, value, flags) {
    if (flags & (RendererStyleFlags2.DashCase | RendererStyleFlags2.Important)) {
      el.style.setProperty(style, value, flags & RendererStyleFlags2.Important ? "important" : "");
    } else {
      el.style[style] = value;
    }
  }
  removeStyle(el, style, flags) {
    if (flags & RendererStyleFlags2.DashCase) {
      el.style.removeProperty(style);
    } else {
      el.style[style] = "";
    }
  }
  setProperty(el, name, value) {
    if (el == null) {
      return;
    }
    el[name] = value;
  }
  setValue(node, value) {
    node.nodeValue = value;
  }
  listen(target, event, callback, options) {
    if (typeof target === "string") {
      target = getDOM().getGlobalEventTarget(this.doc, target);
      if (!target) {
        throw new RuntimeError(5102, false);
      }
    }
    let wrappedCallback = this.decoratePreventDefault(callback);
    if (this.tracingService?.wrapEventListener) {
      wrappedCallback = this.tracingService.wrapEventListener(target, event, wrappedCallback);
    }
    return this.eventManager.addEventListener(target, event, wrappedCallback, options);
  }
  decoratePreventDefault(eventHandler) {
    return (event) => {
      if (event === "__ngUnwrap__") {
        return eventHandler;
      }
      const allowDefaultBehavior = this.ngZone.runGuarded(() => eventHandler(event)) ;
      if (allowDefaultBehavior === false) {
        event.preventDefault();
      }
      return void 0;
    };
  }
}
function isTemplateNode(node) {
  return node.tagName === "TEMPLATE" && node.content !== void 0;
}
class ShadowDomRenderer extends DefaultDomRenderer2 {
  sharedStylesHost;
  hostEl;
  shadowRoot;
  constructor(eventManager, sharedStylesHost, hostEl, component, doc, ngZone, nonce, platformIsServer, tracingService, registry, maxAnimationTimeout) {
    super(eventManager, doc, ngZone, platformIsServer, tracingService, registry, maxAnimationTimeout);
    this.sharedStylesHost = sharedStylesHost;
    this.hostEl = hostEl;
    this.shadowRoot = hostEl.attachShadow({
      mode: "open"
    });
    this.sharedStylesHost.addHost(this.shadowRoot);
    let styles = component.styles;
    styles = shimStylesContent(component.id, styles);
    for (const style of styles) {
      const styleEl = document.createElement("style");
      if (nonce) {
        styleEl.setAttribute("nonce", nonce);
      }
      styleEl.textContent = style;
      this.shadowRoot.appendChild(styleEl);
    }
    const styleUrls = component.getExternalStyles?.();
    if (styleUrls) {
      for (const styleUrl of styleUrls) {
        const linkEl = createLinkElement(styleUrl, doc);
        if (nonce) {
          linkEl.setAttribute("nonce", nonce);
        }
        this.shadowRoot.appendChild(linkEl);
      }
    }
  }
  nodeOrShadowRoot(node) {
    return node === this.hostEl ? this.shadowRoot : node;
  }
  appendChild(parent, newChild) {
    return super.appendChild(this.nodeOrShadowRoot(parent), newChild);
  }
  insertBefore(parent, newChild, refChild) {
    return super.insertBefore(this.nodeOrShadowRoot(parent), newChild, refChild);
  }
  removeChild(_parent, oldChild) {
    return super.removeChild(null, oldChild);
  }
  parentNode(node) {
    return this.nodeOrShadowRoot(super.parentNode(this.nodeOrShadowRoot(node)));
  }
  destroy() {
    this.sharedStylesHost.removeHost(this.shadowRoot);
  }
}
class NoneEncapsulationDomRenderer extends DefaultDomRenderer2 {
  sharedStylesHost;
  removeStylesOnCompDestroy;
  styles;
  styleUrls;
  _animationDisabled;
  constructor(eventManager, sharedStylesHost, component, removeStylesOnCompDestroy, doc, ngZone, platformIsServer, tracingService, registry, animationDisabled, maxAnimationTimeout, compId) {
    super(eventManager, doc, ngZone, platformIsServer, tracingService, registry, maxAnimationTimeout);
    this.sharedStylesHost = sharedStylesHost;
    this.removeStylesOnCompDestroy = removeStylesOnCompDestroy;
    this._animationDisabled = animationDisabled;
    let styles = component.styles;
    this.styles = compId ? shimStylesContent(compId, styles) : styles;
    this.styleUrls = component.getExternalStyles?.(compId);
  }
  applyStyles() {
    this.sharedStylesHost.addStyles(this.styles, this.styleUrls);
  }
  destroy() {
    if (!this.removeStylesOnCompDestroy) {
      return;
    }
    this.sharedStylesHost.removeStyles(this.styles, this.styleUrls);
  }
}
class EmulatedEncapsulationDomRenderer2 extends NoneEncapsulationDomRenderer {
  contentAttr;
  hostAttr;
  constructor(eventManager, sharedStylesHost, component, appId, removeStylesOnCompDestroy, doc, ngZone, platformIsServer, tracingService, registry, animationDisabled, maxAnimationTimeout) {
    const compId = appId + "-" + component.id;
    super(eventManager, sharedStylesHost, component, removeStylesOnCompDestroy, doc, ngZone, platformIsServer, tracingService, registry, animationDisabled, maxAnimationTimeout, compId);
    this.contentAttr = shimContentAttribute(compId);
    this.hostAttr = shimHostAttribute(compId);
  }
  applyToHost(element) {
    this.applyStyles();
    this.setAttribute(element, this.hostAttr, "");
  }
  createElement(parent, name) {
    const el = super.createElement(parent, name);
    super.setAttribute(el, this.contentAttr, "");
    return el;
  }
}

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */
class BrowserDomAdapter extends DomAdapter {
  supportsDOMEvents = true;
  static makeCurrent() {
    setRootDomAdapter(new BrowserDomAdapter());
  }
  onAndCancel(el, evt, listener, options) {
    el.addEventListener(evt, listener, options);
    return () => {
      el.removeEventListener(evt, listener, options);
    };
  }
  dispatchEvent(el, evt) {
    el.dispatchEvent(evt);
  }
  remove(node) {
    node.remove();
  }
  createElement(tagName, doc) {
    doc = doc || this.getDefaultDocument();
    return doc.createElement(tagName);
  }
  createHtmlDocument() {
    return document.implementation.createHTMLDocument("fakeTitle");
  }
  getDefaultDocument() {
    return document;
  }
  isElementNode(node) {
    return node.nodeType === Node.ELEMENT_NODE;
  }
  isShadowRoot(node) {
    return node instanceof DocumentFragment;
  }
  /** @deprecated No longer being used in Ivy code. To be removed in version 14. */
  getGlobalEventTarget(doc, target) {
    if (target === "window") {
      return window;
    }
    if (target === "document") {
      return doc;
    }
    if (target === "body") {
      return doc.body;
    }
    return null;
  }
  getBaseHref(doc) {
    const href = getBaseElementHref();
    return href == null ? null : relativePath(href);
  }
  resetBaseElement() {
    baseElement = null;
  }
  getUserAgent() {
    return window.navigator.userAgent;
  }
  getCookie(name) {
    return parseCookieValue(document.cookie, name);
  }
}
let baseElement = null;
function getBaseElementHref() {
  baseElement = baseElement || document.head.querySelector("base");
  return baseElement ? baseElement.getAttribute("href") : null;
}
function relativePath(url) {
  return new URL(url, document.baseURI).pathname;
}
let BrowserXhr = /* @__PURE__ */ (() => {
  class BrowserXhr2 {
    build() {
      return new XMLHttpRequest();
    }
    static ɵfac = function BrowserXhr_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || BrowserXhr2)();
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: BrowserXhr2,
      factory: BrowserXhr2.ɵfac
    });
  }
  return BrowserXhr2;
})();
let DomEventsPlugin = /* @__PURE__ */ (() => {
  class DomEventsPlugin2 extends EventManagerPlugin {
    constructor(doc) {
      super(doc);
    }
    // This plugin should come last in the list of plugins, because it accepts all
    // events.
    supports(eventName) {
      return true;
    }
    addEventListener(element, eventName, handler, options) {
      element.addEventListener(eventName, handler, options);
      return () => this.removeEventListener(element, eventName, handler, options);
    }
    removeEventListener(target, eventName, callback, options) {
      return target.removeEventListener(eventName, callback, options);
    }
    static ɵfac = function DomEventsPlugin_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || DomEventsPlugin2)(ɵɵinject(DOCUMENT$1));
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: DomEventsPlugin2,
      factory: DomEventsPlugin2.ɵfac
    });
  }
  return DomEventsPlugin2;
})();
const MODIFIER_KEYS = ["alt", "control", "meta", "shift"];
const _keyMap = {
  "\b": "Backspace",
  "	": "Tab",
  "": "Delete",
  "\x1B": "Escape",
  "Del": "Delete",
  "Esc": "Escape",
  "Left": "ArrowLeft",
  "Right": "ArrowRight",
  "Up": "ArrowUp",
  "Down": "ArrowDown",
  "Menu": "ContextMenu",
  "Scroll": "ScrollLock",
  "Win": "OS"
};
const MODIFIER_KEY_GETTERS = {
  "alt": (event) => event.altKey,
  "control": (event) => event.ctrlKey,
  "meta": (event) => event.metaKey,
  "shift": (event) => event.shiftKey
};
let KeyEventsPlugin = /* @__PURE__ */ (() => {
  class KeyEventsPlugin2 extends EventManagerPlugin {
    /**
     * Initializes an instance of the browser plug-in.
     * @param doc The document in which key events will be detected.
     */
    constructor(doc) {
      super(doc);
    }
    /**
     * Reports whether a named key event is supported.
     * @param eventName The event name to query.
     * @return True if the named key event is supported.
     */
    supports(eventName) {
      return KeyEventsPlugin2.parseEventName(eventName) != null;
    }
    /**
     * Registers a handler for a specific element and key event.
     * @param element The HTML element to receive event notifications.
     * @param eventName The name of the key event to listen for.
     * @param handler A function to call when the notification occurs. Receives the
     * event object as an argument.
     * @returns The key event that was registered.
     */
    addEventListener(element, eventName, handler, options) {
      const parsedEvent = KeyEventsPlugin2.parseEventName(eventName);
      const outsideHandler = KeyEventsPlugin2.eventCallback(parsedEvent["fullKey"], handler, this.manager.getZone());
      return this.manager.getZone().runOutsideAngular(() => {
        return getDOM().onAndCancel(element, parsedEvent["domEventName"], outsideHandler, options);
      });
    }
    /**
     * Parses the user provided full keyboard event definition and normalizes it for
     * later internal use. It ensures the string is all lowercase, converts special
     * characters to a standard spelling, and orders all the values consistently.
     *
     * @param eventName The name of the key event to listen for.
     * @returns an object with the full, normalized string, and the dom event name
     * or null in the case when the event doesn't match a keyboard event.
     */
    static parseEventName(eventName) {
      const parts = eventName.toLowerCase().split(".");
      const domEventName = parts.shift();
      if (parts.length === 0 || !(domEventName === "keydown" || domEventName === "keyup")) {
        return null;
      }
      const key = KeyEventsPlugin2._normalizeKey(parts.pop());
      let fullKey = "";
      let codeIX = parts.indexOf("code");
      if (codeIX > -1) {
        parts.splice(codeIX, 1);
        fullKey = "code.";
      }
      MODIFIER_KEYS.forEach((modifierName) => {
        const index = parts.indexOf(modifierName);
        if (index > -1) {
          parts.splice(index, 1);
          fullKey += modifierName + ".";
        }
      });
      fullKey += key;
      if (parts.length != 0 || key.length === 0) {
        return null;
      }
      const result = {};
      result["domEventName"] = domEventName;
      result["fullKey"] = fullKey;
      return result;
    }
    /**
     * Determines whether the actual keys pressed match the configured key code string.
     * The `fullKeyCode` event is normalized in the `parseEventName` method when the
     * event is attached to the DOM during the `addEventListener` call. This is unseen
     * by the end user and is normalized for internal consistency and parsing.
     *
     * @param event The keyboard event.
     * @param fullKeyCode The normalized user defined expected key event string
     * @returns boolean.
     */
    static matchEventFullKeyCode(event, fullKeyCode) {
      let keycode = _keyMap[event.key] || event.key;
      let key = "";
      if (fullKeyCode.indexOf("code.") > -1) {
        keycode = event.code;
        key = "code.";
      }
      if (keycode == null || !keycode) return false;
      keycode = keycode.toLowerCase();
      if (keycode === " ") {
        keycode = "space";
      } else if (keycode === ".") {
        keycode = "dot";
      }
      MODIFIER_KEYS.forEach((modifierName) => {
        if (modifierName !== keycode) {
          const modifierGetter = MODIFIER_KEY_GETTERS[modifierName];
          if (modifierGetter(event)) {
            key += modifierName + ".";
          }
        }
      });
      key += keycode;
      return key === fullKeyCode;
    }
    /**
     * Configures a handler callback for a key event.
     * @param fullKey The event name that combines all simultaneous keystrokes.
     * @param handler The function that responds to the key event.
     * @param zone The zone in which the event occurred.
     * @returns A callback function.
     */
    static eventCallback(fullKey, handler, zone) {
      return (event) => {
        if (KeyEventsPlugin2.matchEventFullKeyCode(event, fullKey)) {
          zone.runGuarded(() => handler(event));
        }
      };
    }
    /** @internal */
    static _normalizeKey(keyName) {
      return keyName === "esc" ? "escape" : keyName;
    }
    static ɵfac = function KeyEventsPlugin_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || KeyEventsPlugin2)(ɵɵinject(DOCUMENT$1));
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: KeyEventsPlugin2,
      factory: KeyEventsPlugin2.ɵfac
    });
  }
  return KeyEventsPlugin2;
})();
function bootstrapApplication(rootComponent, options) {
  const config = {
    rootComponent,
    ...createProvidersConfig(options)
  };
  return internalCreateApplication(config);
}
function createProvidersConfig(options) {
  return {
    appProviders: [...BROWSER_MODULE_PROVIDERS, ...options?.providers ?? []],
    platformProviders: INTERNAL_BROWSER_PLATFORM_PROVIDERS
  };
}
function initDomAdapter() {
  BrowserDomAdapter.makeCurrent();
}
function errorHandler() {
  return new ErrorHandler();
}
function _document$1() {
  setDocument(document);
  return document;
}
const INTERNAL_BROWSER_PLATFORM_PROVIDERS = [{
  provide: PLATFORM_ID,
  useValue: PLATFORM_BROWSER_ID
}, {
  provide: PLATFORM_INITIALIZER,
  useValue: initDomAdapter,
  multi: true
}, {
  provide: DOCUMENT$1,
  useFactory: _document$1
}];
const BROWSER_MODULE_PROVIDERS = [{
  provide: INJECTOR_SCOPE,
  useValue: "root"
}, {
  provide: ErrorHandler,
  useFactory: errorHandler
}, {
  provide: EVENT_MANAGER_PLUGINS,
  useClass: DomEventsPlugin,
  multi: true,
  deps: [DOCUMENT$1]
}, {
  provide: EVENT_MANAGER_PLUGINS,
  useClass: KeyEventsPlugin,
  multi: true,
  deps: [DOCUMENT$1]
}, DomRendererFactory2, SharedStylesHost, EventManager, {
  provide: RendererFactory2,
  useExisting: DomRendererFactory2
}, {
  provide: XhrFactory,
  useClass: BrowserXhr
}, []];

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */
const HTTP_ROOT_INTERCEPTOR_FNS = /* @__PURE__ */ new InjectionToken("");

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var lib = {};
var Event_1;
var hasRequiredEvent;
function requireEvent() {
  if (hasRequiredEvent) return Event_1;
  hasRequiredEvent = 1;
  Event_1 = Event;
  Event.CAPTURING_PHASE = 1;
  Event.AT_TARGET = 2;
  Event.BUBBLING_PHASE = 3;
  function Event(type, dictionary) {
    this.type = "";
    this.target = null;
    this.currentTarget = null;
    this.eventPhase = Event.AT_TARGET;
    this.bubbles = false;
    this.cancelable = false;
    this.isTrusted = false;
    this.defaultPrevented = false;
    this.timeStamp = Date.now();
    this._propagationStopped = false;
    this._immediatePropagationStopped = false;
    this._initialized = true;
    this._dispatching = false;
    if (type) this.type = type;
    if (dictionary) {
      for (var p in dictionary) {
        this[p] = dictionary[p];
      }
    }
  }
  Event.prototype = Object.create(Object.prototype, {
    constructor: {
      value: Event
    },
    stopPropagation: {
      value: function stopPropagation() {
        this._propagationStopped = true;
      }
    },
    stopImmediatePropagation: {
      value: function stopImmediatePropagation() {
        this._propagationStopped = true;
        this._immediatePropagationStopped = true;
      }
    },
    preventDefault: {
      value: function preventDefault() {
        if (this.cancelable) this.defaultPrevented = true;
      }
    },
    initEvent: {
      value: function initEvent(type, bubbles, cancelable) {
        this._initialized = true;
        if (this._dispatching) return;
        this._propagationStopped = false;
        this._immediatePropagationStopped = false;
        this.defaultPrevented = false;
        this.isTrusted = false;
        this.target = null;
        this.type = type;
        this.bubbles = bubbles;
        this.cancelable = cancelable;
      }
    }
  });
  return Event_1;
}
var UIEvent_1;
var hasRequiredUIEvent;
function requireUIEvent() {
  if (hasRequiredUIEvent) return UIEvent_1;
  hasRequiredUIEvent = 1;
  var Event = requireEvent();
  UIEvent_1 = UIEvent;
  function UIEvent() {
    Event.call(this);
    this.view = null;
    this.detail = 0;
  }
  UIEvent.prototype = Object.create(Event.prototype, {
    constructor: {
      value: UIEvent
    },
    initUIEvent: {
      value: function(type, bubbles, cancelable, view, detail) {
        this.initEvent(type, bubbles, cancelable);
        this.view = view;
        this.detail = detail;
      }
    }
  });
  return UIEvent_1;
}
var MouseEvent_1;
var hasRequiredMouseEvent;
function requireMouseEvent() {
  if (hasRequiredMouseEvent) return MouseEvent_1;
  hasRequiredMouseEvent = 1;
  var UIEvent = requireUIEvent();
  MouseEvent_1 = MouseEvent;
  function MouseEvent() {
    UIEvent.call(this);
    this.screenX = this.screenY = this.clientX = this.clientY = 0;
    this.ctrlKey = this.altKey = this.shiftKey = this.metaKey = false;
    this.button = 0;
    this.buttons = 1;
    this.relatedTarget = null;
  }
  MouseEvent.prototype = Object.create(UIEvent.prototype, {
    constructor: {
      value: MouseEvent
    },
    initMouseEvent: {
      value: function(type, bubbles, cancelable, view, detail, screenX, screenY, clientX, clientY, ctrlKey, altKey, shiftKey, metaKey, button, relatedTarget) {
        this.initEvent(type, bubbles, cancelable, view, detail);
        this.screenX = screenX;
        this.screenY = screenY;
        this.clientX = clientX;
        this.clientY = clientY;
        this.ctrlKey = ctrlKey;
        this.altKey = altKey;
        this.shiftKey = shiftKey;
        this.metaKey = metaKey;
        this.button = button;
        switch (button) {
          case 0:
            this.buttons = 1;
            break;
          case 1:
            this.buttons = 4;
            break;
          case 2:
            this.buttons = 2;
            break;
          default:
            this.buttons = 0;
            break;
        }
        this.relatedTarget = relatedTarget;
      }
    },
    getModifierState: {
      value: function(key) {
        switch (key) {
          case "Alt":
            return this.altKey;
          case "Control":
            return this.ctrlKey;
          case "Shift":
            return this.shiftKey;
          case "Meta":
            return this.metaKey;
          default:
            return false;
        }
      }
    }
  });
  return MouseEvent_1;
}
var utils = {};
var config = {};
var hasRequiredConfig;
function requireConfig() {
  if (hasRequiredConfig) return config;
  hasRequiredConfig = 1;
  config.isApiWritable = !globalThis.__domino_frozen__;
  return config;
}
var hasRequiredUtils;
function requireUtils() {
  if (hasRequiredUtils) return utils;
  hasRequiredUtils = 1;
  var isApiWritable = requireConfig().isApiWritable;
  utils.NAMESPACE = {
    HTML: "http://www.w3.org/1999/xhtml",
    XML: "http://www.w3.org/XML/1998/namespace",
    XMLNS: "http://www.w3.org/2000/xmlns/",
    MATHML: "http://www.w3.org/1998/Math/MathML",
    SVG: "http://www.w3.org/2000/svg",
    XLINK: "http://www.w3.org/1999/xlink"
  };
  utils.IndexSizeError = () => {
    throw new DOMException("The index is not in the allowed range", "IndexSizeError");
  };
  utils.HierarchyRequestError = () => {
    throw new DOMException("The node tree hierarchy is not correct", "HierarchyRequestError");
  };
  utils.WrongDocumentError = () => {
    throw new DOMException("The object is in the wrong Document", "WrongDocumentError");
  };
  utils.InvalidCharacterError = () => {
    throw new DOMException("The string contains invalid characters", "InvalidCharacterError");
  };
  utils.NoModificationAllowedError = () => {
    throw new DOMException("The object cannot be modified", "NoModificationAllowedError");
  };
  utils.NotFoundError = () => {
    throw new DOMException("The object can not be found here", "NotFoundError");
  };
  utils.NotSupportedError = () => {
    throw new DOMException("The operation is not supported", "NotSupportedError");
  };
  utils.InvalidStateError = () => {
    throw new DOMException("The object is in an invalid state", "InvalidStateError");
  };
  utils.SyntaxError = () => {
    throw new DOMException("The string did not match the expected pattern", "SyntaxError");
  };
  utils.InvalidModificationError = () => {
    throw new DOMException("The object can not be modified in this way", "InvalidModificationError");
  };
  utils.NamespaceError = () => {
    throw new DOMException("The operation is not allowed by Namespaces in XML", "NamespaceError");
  };
  utils.InvalidAccessError = () => {
    throw new DOMException("The object does not support the operation or argument", "InvalidAccessError");
  };
  utils.TypeMismatchError = () => {
    throw new DOMException("The type of the object does not match the expected type", "TypeMismatchError");
  };
  utils.SecurityError = () => {
    throw new DOMException("The operation is insecure", "SecurityError");
  };
  utils.NetworkError = () => {
    throw new DOMException("A network error occurred", "NetworkError");
  };
  utils.AbortError = () => {
    throw new DOMException("The operation was aborted", "AbortError");
  };
  utils.UrlMismatchError = () => {
    throw new DOMException("The given URL does not match another URL", "URLMismatchError");
  };
  utils.QuotaExceededError = () => {
    throw new DOMException("The quota has been exceeded", "QuotaExceededError");
  };
  utils.TimeoutError = () => {
    throw new DOMException("The operation timed out", "TimeoutError");
  };
  utils.InvalidNodeTypeError = () => {
    throw new DOMException("The node is of an invalid type", "InvalidNodeTypeError");
  };
  utils.DataCloneError = () => {
    throw new DOMException("The object can not be cloned", "DataCloneError");
  };
  utils.InUseAttributeError = () => {
    throw new DOMException("The attribute is already in use", "InUseAttributeError");
  };
  utils.nyi = function() {
    throw new Error("NotYetImplemented");
  };
  utils.shouldOverride = function() {
    throw new Error("Abstract function; should be overriding in subclass.");
  };
  utils.assert = function(expr, msg) {
    if (!expr) {
      throw new Error("Assertion failed: " + (msg || "") + "\n" + new Error().stack);
    }
  };
  utils.expose = function(src, c) {
    for (var n in src) {
      Object.defineProperty(c.prototype, n, {
        value: src[n],
        writable: isApiWritable
      });
    }
  };
  utils.merge = function(a, b) {
    for (var n in b) {
      a[n] = b[n];
    }
  };
  utils.documentOrder = function(n, m) {
    return 3 - (n.compareDocumentPosition(m) & 6);
  };
  utils.toASCIILowerCase = function(s) {
    return s.replace(/[A-Z]+/g, function(c) {
      return c.toLowerCase();
    });
  };
  utils.toASCIIUpperCase = function(s) {
    return s.replace(/[a-z]+/g, function(c) {
      return c.toUpperCase();
    });
  };
  return utils;
}
var EventTarget_1;
var hasRequiredEventTarget;
function requireEventTarget() {
  if (hasRequiredEventTarget) return EventTarget_1;
  hasRequiredEventTarget = 1;
  var Event = requireEvent();
  var MouseEvent = requireMouseEvent();
  var utils2 = requireUtils();
  EventTarget_1 = EventTarget;
  function EventTarget() {
  }
  EventTarget.prototype = {
    // XXX
    // See WebIDL §4.8 for details on object event handlers
    // and how they should behave.  We actually have to accept
    // any object to addEventListener... Can't type check it.
    // on registration.
    // XXX:
    // Capturing event listeners are sort of rare.  I think I can optimize
    // them so that dispatchEvent can skip the capturing phase (or much of
    // it).  Each time a capturing listener is added, increment a flag on
    // the target node and each of its ancestors.  Decrement when removed.
    // And update the counter when nodes are added and removed from the
    // tree as well.  Then, in dispatch event, the capturing phase can
    // abort if it sees any node with a zero count.
    addEventListener: function addEventListener(type, listener, capture) {
      if (!listener) return;
      if (capture === void 0) capture = false;
      if (!this._listeners) this._listeners = /* @__PURE__ */ Object.create(null);
      if (!this._listeners[type]) this._listeners[type] = [];
      var list = this._listeners[type];
      for (var i = 0, n = list.length; i < n; i++) {
        var l = list[i];
        if (l.listener === listener && l.capture === capture) return;
      }
      var obj = {
        listener,
        capture
      };
      if (typeof listener === "function") obj.f = listener;
      list.push(obj);
    },
    removeEventListener: function removeEventListener(type, listener, capture) {
      if (capture === void 0) capture = false;
      if (this._listeners) {
        var list = this._listeners[type];
        if (list) {
          for (var i = 0, n = list.length; i < n; i++) {
            var l = list[i];
            if (l.listener === listener && l.capture === capture) {
              if (list.length === 1) {
                this._listeners[type] = void 0;
              } else {
                list.splice(i, 1);
              }
              return;
            }
          }
        }
      }
    },
    // This is the public API for dispatching untrusted public events.
    // See _dispatchEvent for the implementation
    dispatchEvent: function dispatchEvent(event) {
      return this._dispatchEvent(event, false);
    },
    //
    // See DOMCore §4.4
    // XXX: I'll probably need another version of this method for
    // internal use, one that does not set isTrusted to false.
    // XXX: see Document._dispatchEvent: perhaps that and this could
    // call a common internal function with different settings of
    // a trusted boolean argument
    //
    // XXX:
    // The spec has changed in how to deal with handlers registered
    // on idl or content attributes rather than with addEventListener.
    // Used to say that they always ran first.  That's how webkit does it
    // Spec now says that they run in a position determined by
    // when they were first set.  FF does it that way.  See:
    // http://www.whatwg.org/specs/web-apps/current-work/multipage/webappapis.html#event-handlers
    //
    _dispatchEvent: function _dispatchEvent(event, trusted) {
      if (typeof trusted !== "boolean") trusted = false;
      function invoke(target, event2) {
        var type = event2.type, phase = event2.eventPhase;
        event2.currentTarget = target;
        if (phase !== Event.CAPTURING_PHASE && target._handlers && target._handlers[type]) {
          var handler = target._handlers[type];
          var rv;
          if (typeof handler === "function") {
            rv = handler.call(event2.currentTarget, event2);
          } else {
            var f = handler.handleEvent;
            if (typeof f !== "function") throw new TypeError("handleEvent property of event handler object isnot a function.");
            rv = f.call(handler, event2);
          }
          switch (event2.type) {
            case "mouseover":
              if (rv === true)
                event2.preventDefault();
              break;
            case "beforeunload":
            // XXX: eventually we need a special case here
            /* falls through */
            default:
              if (rv === false) event2.preventDefault();
              break;
          }
        }
        var list = target._listeners && target._listeners[type];
        if (!list) return;
        list = list.slice();
        for (var i2 = 0, n2 = list.length; i2 < n2; i2++) {
          if (event2._immediatePropagationStopped) return;
          var l = list[i2];
          if (phase === Event.CAPTURING_PHASE && !l.capture || phase === Event.BUBBLING_PHASE && l.capture) continue;
          if (l.f) {
            l.f.call(event2.currentTarget, event2);
          } else {
            var fn = l.listener.handleEvent;
            if (typeof fn !== "function") throw new TypeError("handleEvent property of event listener object is not a function.");
            fn.call(l.listener, event2);
          }
        }
      }
      if (!event._initialized || event._dispatching) utils2.InvalidStateError();
      event.isTrusted = trusted;
      event._dispatching = true;
      event.target = this;
      var ancestors = [];
      for (var n = this.parentNode; n; n = n.parentNode) ancestors.push(n);
      event.eventPhase = Event.CAPTURING_PHASE;
      for (var i = ancestors.length - 1; i >= 0; i--) {
        invoke(ancestors[i], event);
        if (event._propagationStopped) break;
      }
      if (!event._propagationStopped) {
        event.eventPhase = Event.AT_TARGET;
        invoke(this, event);
      }
      if (event.bubbles && !event._propagationStopped) {
        event.eventPhase = Event.BUBBLING_PHASE;
        for (var ii = 0, nn = ancestors.length; ii < nn; ii++) {
          invoke(ancestors[ii], event);
          if (event._propagationStopped) break;
        }
      }
      event._dispatching = false;
      event.eventPhase = Event.AT_TARGET;
      event.currentTarget = null;
      if (trusted && !event.defaultPrevented && event instanceof MouseEvent) {
        switch (event.type) {
          case "mousedown":
            this._armed = {
              x: event.clientX,
              y: event.clientY,
              t: event.timeStamp
            };
            break;
          case "mouseout":
          case "mouseover":
            this._armed = null;
            break;
          case "mouseup":
            if (this._isClick(event)) this._doClick(event);
            this._armed = null;
            break;
        }
      }
      return !event.defaultPrevented;
    },
    // Determine whether a click occurred
    // XXX We don't support double clicks for now
    _isClick: function(event) {
      return this._armed !== null && event.type === "mouseup" && event.isTrusted && event.button === 0 && event.timeStamp - this._armed.t < 1e3 && Math.abs(event.clientX - this._armed.x) < 10 && Math.abs(event.clientY - this._armed.Y) < 10;
    },
    // Clicks are handled like this:
    // http://www.whatwg.org/specs/web-apps/current-work/multipage/elements.html#interactive-content-0
    //
    // Note that this method is similar to the HTMLElement.click() method
    // The event argument must be the trusted mouseup event
    _doClick: function(event) {
      if (this._click_in_progress) return;
      this._click_in_progress = true;
      var activated = this;
      while (activated && !activated._post_click_activation_steps) activated = activated.parentNode;
      if (activated && activated._pre_click_activation_steps) {
        activated._pre_click_activation_steps();
      }
      var click = this.ownerDocument.createEvent("MouseEvent");
      click.initMouseEvent("click", true, true, this.ownerDocument.defaultView, 1, event.screenX, event.screenY, event.clientX, event.clientY, event.ctrlKey, event.altKey, event.shiftKey, event.metaKey, event.button, null);
      var result = this._dispatchEvent(click, true);
      if (activated) {
        if (result) {
          if (activated._post_click_activation_steps) activated._post_click_activation_steps(click);
        } else {
          if (activated._cancelled_activation_steps) activated._cancelled_activation_steps();
        }
      }
    },
    //
    // An event handler is like an event listener, but it registered
    // by setting an IDL or content attribute like onload or onclick.
    // There can only be one of these at a time for any event type.
    // This is an internal method for the attribute accessors and
    // content attribute handlers that need to register events handlers.
    // The type argument is the same as in addEventListener().
    // The handler argument is the same as listeners in addEventListener:
    // it can be a function or an object. Pass null to remove any existing
    // handler.  Handlers are always invoked before any listeners of
    // the same type.  They are not invoked during the capturing phase
    // of event dispatch.
    //
    _setEventHandler: function _setEventHandler(type, handler) {
      if (!this._handlers) this._handlers = /* @__PURE__ */ Object.create(null);
      this._handlers[type] = handler;
    },
    _getEventHandler: function _getEventHandler(type) {
      return this._handlers && this._handlers[type] || null;
    }
  };
  return EventTarget_1;
}
var LinkedList = {
  exports: {}
};
var hasRequiredLinkedList;
function requireLinkedList() {
  if (hasRequiredLinkedList) return LinkedList.exports;
  hasRequiredLinkedList = 1;
  var utils2 = requireUtils();
  var LinkedList$1 = LinkedList.exports = {
    // basic validity tests on a circular linked list a
    valid: function(a) {
      utils2.assert(a, "list falsy");
      utils2.assert(a._previousSibling, "previous falsy");
      utils2.assert(a._nextSibling, "next falsy");
      return true;
    },
    // insert a before b
    insertBefore: function(a, b) {
      utils2.assert(LinkedList$1.valid(a) && LinkedList$1.valid(b));
      var a_first = a, a_last = a._previousSibling;
      var b_first = b, b_last = b._previousSibling;
      a_first._previousSibling = b_last;
      a_last._nextSibling = b_first;
      b_last._nextSibling = a_first;
      b_first._previousSibling = a_last;
      utils2.assert(LinkedList$1.valid(a) && LinkedList$1.valid(b));
    },
    // replace a single node a with a list b (which could be null)
    replace: function(a, b) {
      utils2.assert(LinkedList$1.valid(a) && (b === null || LinkedList$1.valid(b)));
      if (b !== null) {
        LinkedList$1.insertBefore(b, a);
      }
      LinkedList$1.remove(a);
      utils2.assert(LinkedList$1.valid(a) && (b === null || LinkedList$1.valid(b)));
    },
    // remove single node a from its list
    remove: function(a) {
      utils2.assert(LinkedList$1.valid(a));
      var prev = a._previousSibling;
      if (prev === a) {
        return;
      }
      var next = a._nextSibling;
      prev._nextSibling = next;
      next._previousSibling = prev;
      a._previousSibling = a._nextSibling = a;
      utils2.assert(LinkedList$1.valid(a));
    }
  };
  return LinkedList.exports;
}
var NodeUtils;
var hasRequiredNodeUtils;
function requireNodeUtils() {
  if (hasRequiredNodeUtils) return NodeUtils;
  hasRequiredNodeUtils = 1;
  NodeUtils = {
    // NOTE: The `serializeOne()` function used to live on the `Node.prototype`
    // as a private method `Node#_serializeOne(child)`, however that requires
    // a megamorphic property access `this._serializeOne` just to get to the
    // method, and this is being done on lots of different `Node` subclasses,
    // which puts a lot of pressure on V8's megamorphic stub cache. So by
    // moving the helper off of the `Node.prototype` and into a separate
    // function in this helper module, we get a monomorphic property access
    // `NodeUtils.serializeOne` to get to the function and reduce pressure
    // on the megamorphic stub cache.
    // See https://github.com/fgnass/domino/pull/142 for more information.
    serializeOne,
    // Export util functions so that we can run extra test for them.
    // Note: we prefix function names with `ɵ`, similar to what we do
    // with internal functions in Angular packages.
    ɵescapeMatchingClosingTag: escapeMatchingClosingTag,
    ɵescapeClosingCommentTag: escapeClosingCommentTag,
    ɵescapeProcessingInstructionContent: escapeProcessingInstructionContent
  };
  var utils2 = requireUtils();
  var NAMESPACE = utils2.NAMESPACE;
  var hasRawContent = {
    STYLE: true,
    SCRIPT: true,
    XMP: true,
    IFRAME: true,
    NOEMBED: true,
    NOFRAMES: true,
    PLAINTEXT: true
  };
  var emptyElements = {
    area: true,
    base: true,
    basefont: true,
    bgsound: true,
    br: true,
    col: true,
    embed: true,
    frame: true,
    hr: true,
    img: true,
    input: true,
    keygen: true,
    link: true,
    meta: true,
    param: true,
    source: true,
    track: true,
    wbr: true
  };
  var extraNewLine = {
    /* Removed in https://github.com/whatwg/html/issues/944
    pre: true,
    textarea: true,
    listing: true
    */
  };
  const ESCAPE_REGEXP = /[&<>\u00A0]/g;
  const ESCAPE_ATTR_REGEXP = /[&"<>\u00A0]/g;
  function escape(s) {
    if (!ESCAPE_REGEXP.test(s)) {
      return s;
    }
    return s.replace(ESCAPE_REGEXP, (c) => {
      switch (c) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case " ":
          return "&nbsp;";
      }
    });
  }
  function escapeAttr(s) {
    if (!ESCAPE_ATTR_REGEXP.test(s)) {
      return s;
    }
    return s.replace(ESCAPE_ATTR_REGEXP, (c) => {
      switch (c) {
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case "&":
          return "&amp;";
        case '"':
          return "&quot;";
        case " ":
          return "&nbsp;";
      }
    });
  }
  function attrname(a) {
    var ns = a.namespaceURI;
    if (!ns) return a.localName;
    if (ns === NAMESPACE.XML) return "xml:" + a.localName;
    if (ns === NAMESPACE.XLINK) return "xlink:" + a.localName;
    if (ns === NAMESPACE.XMLNS) {
      if (a.localName === "xmlns") return "xmlns";
      else return "xmlns:" + a.localName;
    }
    return a.name;
  }
  function escapeMatchingClosingTag(rawText, parentTag) {
    const parentClosingTag = "</" + parentTag;
    if (!rawText.toLowerCase().includes(parentClosingTag)) {
      return rawText;
    }
    const result = [...rawText];
    const matches = rawText.matchAll(new RegExp(parentClosingTag, "ig"));
    for (const match of matches) {
      result[match.index] = "&lt;";
    }
    return result.join("");
  }
  const CLOSING_COMMENT_REGEXP = /--!?>/;
  function escapeClosingCommentTag(rawContent) {
    if (!CLOSING_COMMENT_REGEXP.test(rawContent)) {
      return rawContent;
    }
    return rawContent.replace(/(--\!?)>/g, "$1&gt;");
  }
  function escapeProcessingInstructionContent(rawContent) {
    return rawContent.includes(">") ? rawContent.replaceAll(">", "&gt;") : rawContent;
  }
  function serializeOne(kid, parent) {
    var s = "";
    switch (kid.nodeType) {
      case 1:
        var ns = kid.namespaceURI;
        var html = ns === NAMESPACE.HTML;
        var tagname = html || ns === NAMESPACE.SVG || ns === NAMESPACE.MATHML ? kid.localName : kid.tagName;
        s += "<" + tagname;
        for (var j = 0, k = kid._numattrs; j < k; j++) {
          var a = kid._attr(j);
          s += " " + attrname(a);
          if (a.value !== void 0) s += '="' + escapeAttr(a.value) + '"';
        }
        s += ">";
        if (!(html && emptyElements[tagname])) {
          var ss = kid.serialize();
          if (hasRawContent[tagname.toUpperCase()]) {
            ss = escapeMatchingClosingTag(ss, tagname);
          }
          if (html && extraNewLine[tagname] && ss.charAt(0) === "\n") s += "\n";
          s += ss;
          s += "</" + tagname + ">";
        }
        break;
      case 3:
      //TEXT_NODE
      case 4:
        var parenttag;
        if (parent.nodeType === 1 && parent.namespaceURI === NAMESPACE.HTML) parenttag = parent.tagName;
        else parenttag = "";
        if (hasRawContent[parenttag] || parenttag === "NOSCRIPT" && parent.ownerDocument._scripting_enabled) {
          s += kid.data;
        } else {
          s += escape(kid.data);
        }
        break;
      case 8:
        s += "<!--" + escapeClosingCommentTag(kid.data) + "-->";
        break;
      case 7:
        const content = escapeProcessingInstructionContent(kid.data);
        s += "<?" + kid.target + " " + content + "?>";
        break;
      case 10:
        s += "<!DOCTYPE " + kid.name;
        s += ">";
        break;
      default:
        utils2.InvalidStateError();
    }
    return s;
  }
  return NodeUtils;
}
var Node_1;
var hasRequiredNode;
function requireNode() {
  if (hasRequiredNode) return Node_1;
  hasRequiredNode = 1;
  Node_1 = Node;
  var EventTarget = requireEventTarget();
  var LinkedList2 = requireLinkedList();
  var NodeUtils2 = requireNodeUtils();
  var utils2 = requireUtils();
  function Node() {
    EventTarget.call(this);
    this.parentNode = null;
    this._nextSibling = this._previousSibling = this;
    this._index = void 0;
  }
  var ELEMENT_NODE = Node.ELEMENT_NODE = 1;
  var ATTRIBUTE_NODE = Node.ATTRIBUTE_NODE = 2;
  var TEXT_NODE = Node.TEXT_NODE = 3;
  var CDATA_SECTION_NODE = Node.CDATA_SECTION_NODE = 4;
  var ENTITY_REFERENCE_NODE = Node.ENTITY_REFERENCE_NODE = 5;
  var ENTITY_NODE = Node.ENTITY_NODE = 6;
  var PROCESSING_INSTRUCTION_NODE = Node.PROCESSING_INSTRUCTION_NODE = 7;
  var COMMENT_NODE = Node.COMMENT_NODE = 8;
  var DOCUMENT_NODE = Node.DOCUMENT_NODE = 9;
  var DOCUMENT_TYPE_NODE = Node.DOCUMENT_TYPE_NODE = 10;
  var DOCUMENT_FRAGMENT_NODE = Node.DOCUMENT_FRAGMENT_NODE = 11;
  var NOTATION_NODE = Node.NOTATION_NODE = 12;
  var DOCUMENT_POSITION_DISCONNECTED = Node.DOCUMENT_POSITION_DISCONNECTED = 1;
  var DOCUMENT_POSITION_PRECEDING = Node.DOCUMENT_POSITION_PRECEDING = 2;
  var DOCUMENT_POSITION_FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING = 4;
  var DOCUMENT_POSITION_CONTAINS = Node.DOCUMENT_POSITION_CONTAINS = 8;
  var DOCUMENT_POSITION_CONTAINED_BY = Node.DOCUMENT_POSITION_CONTAINED_BY = 16;
  var DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 32;
  Node.prototype = Object.create(EventTarget.prototype, {
    // Node that are not inserted into the tree inherit a null parent
    // XXX: the baseURI attribute is defined by dom core, but
    // a correct implementation of it requires HTML features, so
    // we'll come back to this later.
    baseURI: {
      get: utils2.nyi
    },
    parentElement: {
      get: function() {
        return this.parentNode && this.parentNode.nodeType === ELEMENT_NODE ? this.parentNode : null;
      }
    },
    hasChildNodes: {
      value: utils2.shouldOverride
    },
    firstChild: {
      get: utils2.shouldOverride
    },
    lastChild: {
      get: utils2.shouldOverride
    },
    isConnected: {
      get: function() {
        let node = this;
        while (node != null) {
          if (node.nodeType === Node.DOCUMENT_NODE) {
            return true;
          }
          node = node.parentNode;
          if (node != null && node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            node = node.host;
          }
        }
        return false;
      }
    },
    previousSibling: {
      get: function() {
        var parent = this.parentNode;
        if (!parent) return null;
        if (this === parent.firstChild) return null;
        return this._previousSibling;
      }
    },
    nextSibling: {
      get: function() {
        var parent = this.parentNode, next = this._nextSibling;
        if (!parent) return null;
        if (next === parent.firstChild) return null;
        return next;
      }
    },
    textContent: {
      // Should override for DocumentFragment/Element/Attr/Text/PI/Comment
      get: function() {
        return null;
      },
      set: function(v) {
      }
    },
    innerText: {
      // Should override for DocumentFragment/Element/Attr/Text/PI/Comment
      get: function() {
        return null;
      },
      set: function(v) {
      }
    },
    _countChildrenOfType: {
      value: function(type) {
        var sum = 0;
        for (var kid = this.firstChild; kid !== null; kid = kid.nextSibling) {
          if (kid.nodeType === type) sum++;
        }
        return sum;
      }
    },
    _ensureInsertValid: {
      value: function _ensureInsertValid(node, child, isPreinsert) {
        var parent = this, i, kid;
        if (!node.nodeType) throw new TypeError("not a node");
        switch (parent.nodeType) {
          case DOCUMENT_NODE:
          case DOCUMENT_FRAGMENT_NODE:
          case ELEMENT_NODE:
            break;
          default:
            utils2.HierarchyRequestError();
        }
        if (node.isAncestor(parent)) utils2.HierarchyRequestError();
        if (child !== null || !isPreinsert) {
          if (child.parentNode !== parent) utils2.NotFoundError();
        }
        switch (node.nodeType) {
          case DOCUMENT_FRAGMENT_NODE:
          case DOCUMENT_TYPE_NODE:
          case ELEMENT_NODE:
          case TEXT_NODE:
          case PROCESSING_INSTRUCTION_NODE:
          case COMMENT_NODE:
            break;
          default:
            utils2.HierarchyRequestError();
        }
        if (parent.nodeType === DOCUMENT_NODE) {
          switch (node.nodeType) {
            case TEXT_NODE:
              utils2.HierarchyRequestError();
              break;
            case DOCUMENT_FRAGMENT_NODE:
              if (node._countChildrenOfType(TEXT_NODE) > 0) utils2.HierarchyRequestError();
              switch (node._countChildrenOfType(ELEMENT_NODE)) {
                case 0:
                  break;
                case 1:
                  if (child !== null) {
                    if (isPreinsert && child.nodeType === DOCUMENT_TYPE_NODE) utils2.HierarchyRequestError();
                    for (kid = child.nextSibling; kid !== null; kid = kid.nextSibling) {
                      if (kid.nodeType === DOCUMENT_TYPE_NODE) utils2.HierarchyRequestError();
                    }
                  }
                  i = parent._countChildrenOfType(ELEMENT_NODE);
                  if (isPreinsert) {
                    if (i > 0) utils2.HierarchyRequestError();
                  } else {
                    if (i > 1 || i === 1 && child.nodeType !== ELEMENT_NODE) utils2.HierarchyRequestError();
                  }
                  break;
                default:
                  utils2.HierarchyRequestError();
              }
              break;
            case ELEMENT_NODE:
              if (child !== null) {
                if (isPreinsert && child.nodeType === DOCUMENT_TYPE_NODE) utils2.HierarchyRequestError();
                for (kid = child.nextSibling; kid !== null; kid = kid.nextSibling) {
                  if (kid.nodeType === DOCUMENT_TYPE_NODE) utils2.HierarchyRequestError();
                }
              }
              i = parent._countChildrenOfType(ELEMENT_NODE);
              if (isPreinsert) {
                if (i > 0) utils2.HierarchyRequestError();
              } else {
                if (i > 1 || i === 1 && child.nodeType !== ELEMENT_NODE) utils2.HierarchyRequestError();
              }
              break;
            case DOCUMENT_TYPE_NODE:
              if (child === null) {
                if (parent._countChildrenOfType(ELEMENT_NODE)) utils2.HierarchyRequestError();
              } else {
                for (kid = parent.firstChild; kid !== null; kid = kid.nextSibling) {
                  if (kid === child) break;
                  if (kid.nodeType === ELEMENT_NODE) utils2.HierarchyRequestError();
                }
              }
              i = parent._countChildrenOfType(DOCUMENT_TYPE_NODE);
              if (isPreinsert) {
                if (i > 0) utils2.HierarchyRequestError();
              } else {
                if (i > 1 || i === 1 && child.nodeType !== DOCUMENT_TYPE_NODE) utils2.HierarchyRequestError();
              }
              break;
          }
        } else {
          if (node.nodeType === DOCUMENT_TYPE_NODE) utils2.HierarchyRequestError();
        }
      }
    },
    insertBefore: {
      value: function insertBefore(node, child) {
        var parent = this;
        parent._ensureInsertValid(node, child, true);
        var refChild = child;
        if (refChild === node) {
          refChild = node.nextSibling;
        }
        parent.doc.adoptNode(node);
        node._insertOrReplace(parent, refChild, false);
        return node;
      }
    },
    appendChild: {
      value: function(child) {
        return this.insertBefore(child, null);
      }
    },
    _appendChild: {
      value: function(child) {
        child._insertOrReplace(this, null, false);
      }
    },
    removeChild: {
      value: function removeChild(child) {
        var parent = this;
        if (!child.nodeType) throw new TypeError("not a node");
        if (child.parentNode !== parent) utils2.NotFoundError();
        child.remove();
        return child;
      }
    },
    // To replace a `child` with `node` within a `parent` (this)
    replaceChild: {
      value: function replaceChild(node, child) {
        var parent = this;
        parent._ensureInsertValid(node, child, false);
        if (node.doc !== parent.doc) {
          parent.doc.adoptNode(node);
        }
        node._insertOrReplace(parent, child, true);
        return child;
      }
    },
    // See: http://ejohn.org/blog/comparing-document-position/
    contains: {
      value: function contains(node) {
        if (node === null) {
          return false;
        }
        if (this === node) {
          return true;
        }
        return (this.compareDocumentPosition(node) & DOCUMENT_POSITION_CONTAINED_BY) !== 0;
      }
    },
    compareDocumentPosition: {
      value: function compareDocumentPosition(that) {
        if (this === that) return 0;
        if (this.doc !== that.doc || this.rooted !== that.rooted) return DOCUMENT_POSITION_DISCONNECTED + DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
        var these = [], those = [];
        for (var n = this; n !== null; n = n.parentNode) these.push(n);
        for (n = that; n !== null; n = n.parentNode) those.push(n);
        these.reverse();
        those.reverse();
        if (these[0] !== those[0])
          return DOCUMENT_POSITION_DISCONNECTED + DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
        n = Math.min(these.length, those.length);
        for (var i = 1; i < n; i++) {
          if (these[i] !== those[i]) {
            if (these[i].index < those[i].index) return DOCUMENT_POSITION_FOLLOWING;
            else return DOCUMENT_POSITION_PRECEDING;
          }
        }
        if (these.length < those.length) return DOCUMENT_POSITION_FOLLOWING + DOCUMENT_POSITION_CONTAINED_BY;
        else return DOCUMENT_POSITION_PRECEDING + DOCUMENT_POSITION_CONTAINS;
      }
    },
    isSameNode: {
      value: function isSameNode(node) {
        return this === node;
      }
    },
    // This method implements the generic parts of node equality testing
    // and defers to the (non-recursive) type-specific isEqual() method
    // defined by subclasses
    isEqualNode: {
      value: function isEqualNode(node) {
        if (!node) return false;
        if (node.nodeType !== this.nodeType) return false;
        if (!this.isEqual(node)) return false;
        for (var c1 = this.firstChild, c2 = node.firstChild; c1 && c2; c1 = c1.nextSibling, c2 = c2.nextSibling) {
          if (!c1.isEqualNode(c2)) return false;
        }
        return c1 === null && c2 === null;
      }
    },
    // This method delegates shallow cloning to a clone() method
    // that each concrete subclass must implement
    cloneNode: {
      value: function(deep) {
        var clone = this.clone();
        if (deep) {
          for (var kid = this.firstChild; kid !== null; kid = kid.nextSibling) {
            clone._appendChild(kid.cloneNode(true));
          }
        }
        return clone;
      }
    },
    lookupPrefix: {
      value: function lookupPrefix(ns) {
        var e;
        if (ns === "" || ns === null || ns === void 0) return null;
        switch (this.nodeType) {
          case ELEMENT_NODE:
            return this._lookupNamespacePrefix(ns, this);
          case DOCUMENT_NODE:
            e = this.documentElement;
            return e ? e.lookupPrefix(ns) : null;
          case ENTITY_NODE:
          case NOTATION_NODE:
          case DOCUMENT_FRAGMENT_NODE:
          case DOCUMENT_TYPE_NODE:
            return null;
          case ATTRIBUTE_NODE:
            e = this.ownerElement;
            return e ? e.lookupPrefix(ns) : null;
          default:
            e = this.parentElement;
            return e ? e.lookupPrefix(ns) : null;
        }
      }
    },
    lookupNamespaceURI: {
      value: function lookupNamespaceURI(prefix) {
        if (prefix === "" || prefix === void 0) {
          prefix = null;
        }
        var e;
        switch (this.nodeType) {
          case ELEMENT_NODE:
            return utils2.shouldOverride();
          case DOCUMENT_NODE:
            e = this.documentElement;
            return e ? e.lookupNamespaceURI(prefix) : null;
          case ENTITY_NODE:
          case NOTATION_NODE:
          case DOCUMENT_TYPE_NODE:
          case DOCUMENT_FRAGMENT_NODE:
            return null;
          case ATTRIBUTE_NODE:
            e = this.ownerElement;
            return e ? e.lookupNamespaceURI(prefix) : null;
          default:
            e = this.parentElement;
            return e ? e.lookupNamespaceURI(prefix) : null;
        }
      }
    },
    isDefaultNamespace: {
      value: function isDefaultNamespace(ns) {
        if (ns === "" || ns === void 0) {
          ns = null;
        }
        var defaultNamespace = this.lookupNamespaceURI(null);
        return defaultNamespace === ns;
      }
    },
    // Utility methods for nodes.  Not part of the DOM
    // Return the index of this node in its parent.
    // Throw if no parent, or if this node is not a child of its parent
    index: {
      get: function() {
        var parent = this.parentNode;
        if (this === parent.firstChild) return 0;
        var kids = parent.childNodes;
        if (this._index === void 0 || kids[this._index] !== this) {
          for (var i = 0; i < kids.length; i++) {
            kids[i]._index = i;
          }
          utils2.assert(kids[this._index] === this);
        }
        return this._index;
      }
    },
    // Return true if this node is equal to or is an ancestor of that node
    // Note that nodes are considered to be ancestors of themselves
    isAncestor: {
      value: function(that) {
        if (this.doc !== that.doc) return false;
        if (this.rooted !== that.rooted) return false;
        for (var e = that; e; e = e.parentNode) {
          if (e === this) return true;
        }
        return false;
      }
    },
    // DOMINO Changed the behavior to conform with the specs. See:
    // https://groups.google.com/d/topic/mozilla.dev.platform/77sIYcpdDmc/discussion
    ensureSameDoc: {
      value: function(that) {
        if (that.ownerDocument === null) {
          that.ownerDocument = this.doc;
        } else if (that.ownerDocument !== this.doc) {
          utils2.WrongDocumentError();
        }
      }
    },
    removeChildren: {
      value: utils2.shouldOverride
    },
    // Insert this node as a child of parent before the specified child,
    // or insert as the last child of parent if specified child is null,
    // or replace the specified child with this node, firing mutation events as
    // necessary
    _insertOrReplace: {
      value: function _insertOrReplace(parent, before, isReplace) {
        var child = this, before_index, i;
        if (child.nodeType === DOCUMENT_FRAGMENT_NODE && child.rooted) {
          utils2.HierarchyRequestError();
        }
        if (parent._childNodes) {
          before_index = before === null ? parent._childNodes.length : before.index;
          if (child.parentNode === parent) {
            var child_index = child.index;
            if (child_index < before_index) {
              before_index--;
            }
          }
        }
        if (isReplace) {
          if (before.rooted) before.doc.mutateRemove(before);
          before.parentNode = null;
        }
        var n = before;
        if (n === null) {
          n = parent.firstChild;
        }
        var bothRooted = child.rooted && parent.rooted;
        if (child.nodeType === DOCUMENT_FRAGMENT_NODE) {
          var spliceArgs = [0, isReplace ? 1 : 0], next;
          for (var kid = child.firstChild; kid !== null; kid = next) {
            next = kid.nextSibling;
            spliceArgs.push(kid);
            kid.parentNode = parent;
          }
          var len = spliceArgs.length;
          if (isReplace) {
            LinkedList2.replace(n, len > 2 ? spliceArgs[2] : null);
          } else if (len > 2 && n !== null) {
            LinkedList2.insertBefore(spliceArgs[2], n);
          }
          if (parent._childNodes) {
            spliceArgs[0] = before === null ? parent._childNodes.length : before._index;
            parent._childNodes.splice.apply(parent._childNodes, spliceArgs);
            for (i = 2; i < len; i++) {
              spliceArgs[i]._index = spliceArgs[0] + (i - 2);
            }
          } else if (parent._firstChild === before) {
            if (len > 2) {
              parent._firstChild = spliceArgs[2];
            } else if (isReplace) {
              parent._firstChild = null;
            }
          }
          if (child._childNodes) {
            child._childNodes.length = 0;
          } else {
            child._firstChild = null;
          }
          if (parent.rooted) {
            parent.modify();
            for (i = 2; i < len; i++) {
              parent.doc.mutateInsert(spliceArgs[i]);
            }
          }
        } else {
          if (before === child) {
            return;
          }
          if (bothRooted) {
            child._remove();
          } else if (child.parentNode) {
            child.remove();
          }
          child.parentNode = parent;
          if (isReplace) {
            LinkedList2.replace(n, child);
            if (parent._childNodes) {
              child._index = before_index;
              parent._childNodes[before_index] = child;
            } else if (parent._firstChild === before) {
              parent._firstChild = child;
            }
          } else {
            if (n !== null) {
              LinkedList2.insertBefore(child, n);
            }
            if (parent._childNodes) {
              child._index = before_index;
              parent._childNodes.splice(before_index, 0, child);
            } else if (parent._firstChild === before) {
              parent._firstChild = child;
            }
          }
          if (bothRooted) {
            parent.modify();
            parent.doc.mutateMove(child);
          } else if (parent.rooted) {
            parent.modify();
            parent.doc.mutateInsert(child);
          }
        }
      }
    },
    // Return the lastModTime value for this node. (For use as a
    // cache invalidation mechanism. If the node does not already
    // have one, initialize it from the owner document's modclock
    // property. (Note that modclock does not return the actual
    // time; it is simply a counter incremented on each document
    // modification)
    lastModTime: {
      get: function() {
        if (!this._lastModTime) {
          this._lastModTime = this.doc.modclock;
        }
        return this._lastModTime;
      }
    },
    // Increment the owner document's modclock and use the new
    // value to update the lastModTime value for this node and
    // all of its ancestors. Nodes that have never had their
    // lastModTime value queried do not need to have a
    // lastModTime property set on them since there is no
    // previously queried value to ever compare the new value
    // against, so only update nodes that already have a
    // _lastModTime property.
    modify: {
      value: function() {
        if (this.doc.modclock) {
          var time = ++this.doc.modclock;
          for (var n = this; n; n = n.parentElement) {
            if (n._lastModTime) {
              n._lastModTime = time;
            }
          }
        }
      }
    },
    // This attribute is not part of the DOM but is quite helpful.
    // It returns the document with which a node is associated.  Usually
    // this is the ownerDocument. But ownerDocument is null for the
    // document object itself, so this is a handy way to get the document
    // regardless of the node type
    doc: {
      get: function() {
        return this.ownerDocument || this;
      }
    },
    // If the node has a nid (node id), then it is rooted in a document
    rooted: {
      get: function() {
        return !!this._nid;
      }
    },
    normalize: {
      value: function() {
        var next;
        for (var child = this.firstChild; child !== null; child = next) {
          next = child.nextSibling;
          if (child.normalize) {
            child.normalize();
          }
          if (child.nodeType !== Node.TEXT_NODE) {
            continue;
          }
          if (child.nodeValue === "") {
            this.removeChild(child);
            continue;
          }
          var prevChild = child.previousSibling;
          if (prevChild === null) {
            continue;
          } else if (prevChild.nodeType === Node.TEXT_NODE) {
            prevChild.appendData(child.nodeValue);
            this.removeChild(child);
          }
        }
      }
    },
    // Convert the children of a node to an HTML string.
    // This is used by the innerHTML getter
    // The serialization spec is at:
    // http://www.whatwg.org/specs/web-apps/current-work/multipage/the-end.html#serializing-html-fragments
    //
    // The serialization logic is intentionally implemented in a separate
    // `NodeUtils` helper instead of the more obvious choice of a private
    // `_serializeOne()` method on the `Node.prototype` in order to avoid
    // the megamorphic `this._serializeOne` property access, which reduces
    // performance unnecessarily. If you need specialized behavior for a
    // certain subclass, you'll need to implement that in `NodeUtils`.
    // See https://github.com/fgnass/domino/pull/142 for more information.
    serialize: {
      value: function() {
        if (this._innerHTML) {
          return this._innerHTML;
        }
        var s = "";
        for (var kid = this.firstChild; kid !== null; kid = kid.nextSibling) {
          s += NodeUtils2.serializeOne(kid, this);
        }
        return s;
      }
    },
    // Non-standard, but often useful for debugging.
    outerHTML: {
      get: function() {
        return NodeUtils2.serializeOne(this, {
          nodeType: 0
        });
      },
      set: utils2.nyi
    },
    // mirror node type properties in the prototype, so they are present
    // in instances of Node (and subclasses)
    ELEMENT_NODE: {
      value: ELEMENT_NODE
    },
    ATTRIBUTE_NODE: {
      value: ATTRIBUTE_NODE
    },
    TEXT_NODE: {
      value: TEXT_NODE
    },
    CDATA_SECTION_NODE: {
      value: CDATA_SECTION_NODE
    },
    ENTITY_REFERENCE_NODE: {
      value: ENTITY_REFERENCE_NODE
    },
    ENTITY_NODE: {
      value: ENTITY_NODE
    },
    PROCESSING_INSTRUCTION_NODE: {
      value: PROCESSING_INSTRUCTION_NODE
    },
    COMMENT_NODE: {
      value: COMMENT_NODE
    },
    DOCUMENT_NODE: {
      value: DOCUMENT_NODE
    },
    DOCUMENT_TYPE_NODE: {
      value: DOCUMENT_TYPE_NODE
    },
    DOCUMENT_FRAGMENT_NODE: {
      value: DOCUMENT_FRAGMENT_NODE
    },
    NOTATION_NODE: {
      value: NOTATION_NODE
    },
    DOCUMENT_POSITION_DISCONNECTED: {
      value: DOCUMENT_POSITION_DISCONNECTED
    },
    DOCUMENT_POSITION_PRECEDING: {
      value: DOCUMENT_POSITION_PRECEDING
    },
    DOCUMENT_POSITION_FOLLOWING: {
      value: DOCUMENT_POSITION_FOLLOWING
    },
    DOCUMENT_POSITION_CONTAINS: {
      value: DOCUMENT_POSITION_CONTAINS
    },
    DOCUMENT_POSITION_CONTAINED_BY: {
      value: DOCUMENT_POSITION_CONTAINED_BY
    },
    DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: {
      value: DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC
    }
  });
  return Node_1;
}
var NodeList_es6;
var hasRequiredNodeList_es6;
function requireNodeList_es6() {
  if (hasRequiredNodeList_es6) return NodeList_es6;
  hasRequiredNodeList_es6 = 1;
  NodeList_es6 = class NodeList extends Array {
    constructor(a) {
      super(a && a.length || 0);
      if (a) {
        for (var idx in a) {
          this[idx] = a[idx];
        }
      }
    }
    item(i) {
      return this[i] || null;
    }
  };
  return NodeList_es6;
}
var NodeList_es5;
var hasRequiredNodeList_es5;
function requireNodeList_es5() {
  if (hasRequiredNodeList_es5) return NodeList_es5;
  hasRequiredNodeList_es5 = 1;
  function item(i) {
    return this[i] || null;
  }
  function NodeList(a) {
    if (!a) a = [];
    a.item = item;
    return a;
  }
  NodeList_es5 = NodeList;
  return NodeList_es5;
}
var NodeList_1;
var hasRequiredNodeList;
function requireNodeList() {
  if (hasRequiredNodeList) return NodeList_1;
  hasRequiredNodeList = 1;
  var NodeList;
  try {
    NodeList = requireNodeList_es6();
  } catch (e) {
    NodeList = requireNodeList_es5();
  }
  NodeList_1 = NodeList;
  return NodeList_1;
}
var ContainerNode_1;
var hasRequiredContainerNode;
function requireContainerNode() {
  if (hasRequiredContainerNode) return ContainerNode_1;
  hasRequiredContainerNode = 1;
  ContainerNode_1 = ContainerNode;
  var Node = requireNode();
  var NodeList = requireNodeList();
  function ContainerNode() {
    Node.call(this);
    this._firstChild = this._childNodes = null;
  }
  ContainerNode.prototype = Object.create(Node.prototype, {
    hasChildNodes: {
      value: function() {
        if (this._childNodes) {
          return this._childNodes.length > 0;
        }
        return this._firstChild !== null;
      }
    },
    childNodes: {
      get: function() {
        this._ensureChildNodes();
        return this._childNodes;
      }
    },
    firstChild: {
      get: function() {
        if (this._childNodes) {
          return this._childNodes.length === 0 ? null : this._childNodes[0];
        }
        return this._firstChild;
      }
    },
    lastChild: {
      get: function() {
        var kids = this._childNodes, first;
        if (kids) {
          return kids.length === 0 ? null : kids[kids.length - 1];
        }
        first = this._firstChild;
        if (first === null) {
          return null;
        }
        return first._previousSibling;
      }
    },
    _ensureChildNodes: {
      value: function() {
        if (this._childNodes) {
          return;
        }
        var first = this._firstChild, kid = first, childNodes = this._childNodes = new NodeList();
        if (first) do {
          childNodes.push(kid);
          kid = kid._nextSibling;
        } while (kid !== first);
        this._firstChild = null;
      }
    },
    // Remove all of this node's children.  This is a minor
    // optimization that only calls modify() once.
    removeChildren: {
      value: function removeChildren() {
        var root = this.rooted ? this.ownerDocument : null, next = this.firstChild, kid;
        while (next !== null) {
          kid = next;
          next = kid.nextSibling;
          if (root) root.mutateRemove(kid);
          kid.parentNode = null;
        }
        if (this._childNodes) {
          this._childNodes.length = 0;
        } else {
          this._firstChild = null;
        }
        this.modify();
      }
    }
  });
  return ContainerNode_1;
}
var xmlnames = {};
var hasRequiredXmlnames;
function requireXmlnames() {
  if (hasRequiredXmlnames) return xmlnames;
  hasRequiredXmlnames = 1;
  xmlnames.isValidName = isValidName;
  xmlnames.isValidQName = isValidQName;
  var simplename = /^[_:A-Za-z][-.:\w]+$/;
  var simpleqname = /^([_A-Za-z][-.\w]+|[_A-Za-z][-.\w]+:[_A-Za-z][-.\w]+)$/;
  var ncnamestartchars = "_A-Za-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌-‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�";
  var ncnamechars = "-._A-Za-z0-9·À-ÖØ-öø-˿̀-ͽͿ-῿‌‍‿⁀⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�";
  var ncname = "[" + ncnamestartchars + "][" + ncnamechars + "]*";
  var namestartchars = ncnamestartchars + ":";
  var namechars = ncnamechars + ":";
  var name = new RegExp("^[" + namestartchars + "][" + namechars + "]*$");
  var qname = new RegExp("^(" + ncname + "|" + ncname + ":" + ncname + ")$");
  var hassurrogates = /[\uD800-\uDB7F\uDC00-\uDFFF]/;
  var surrogatechars = /[\uD800-\uDB7F\uDC00-\uDFFF]/g;
  var surrogatepairs = /[\uD800-\uDB7F][\uDC00-\uDFFF]/g;
  ncnamestartchars += "\uD800-󯰀-\uDFFF";
  ncnamechars += "\uD800-󯰀-\uDFFF";
  ncname = "[" + ncnamestartchars + "][" + ncnamechars + "]*";
  namestartchars = ncnamestartchars + ":";
  namechars = ncnamechars + ":";
  var surrogatename = new RegExp("^[" + namestartchars + "][" + namechars + "]*$");
  var surrogateqname = new RegExp("^(" + ncname + "|" + ncname + ":" + ncname + ")$");
  function isValidName(s) {
    if (simplename.test(s)) return true;
    if (name.test(s)) return true;
    if (!hassurrogates.test(s)) return false;
    if (!surrogatename.test(s)) return false;
    var chars = s.match(surrogatechars), pairs = s.match(surrogatepairs);
    return pairs !== null && 2 * pairs.length === chars.length;
  }
  function isValidQName(s) {
    if (simpleqname.test(s)) return true;
    if (qname.test(s)) return true;
    if (!hassurrogates.test(s)) return false;
    if (!surrogateqname.test(s)) return false;
    var chars = s.match(surrogatechars), pairs = s.match(surrogatepairs);
    return pairs !== null && 2 * pairs.length === chars.length;
  }
  return xmlnames;
}
var attributes = {};
var hasRequiredAttributes;
function requireAttributes() {
  if (hasRequiredAttributes) return attributes;
  hasRequiredAttributes = 1;
  var utils2 = requireUtils();
  attributes.property = function(attr) {
    if (Array.isArray(attr.type)) {
      var valid = /* @__PURE__ */ Object.create(null);
      attr.type.forEach(function(val) {
        valid[val.value || val] = val.alias || val;
      });
      var missingValueDefault = attr.missing;
      if (missingValueDefault === void 0) {
        missingValueDefault = null;
      }
      var invalidValueDefault = attr.invalid;
      if (invalidValueDefault === void 0) {
        invalidValueDefault = missingValueDefault;
      }
      return {
        get: function() {
          var v = this._getattr(attr.name);
          if (v === null) return missingValueDefault;
          v = valid[v.toLowerCase()];
          if (v !== void 0) return v;
          if (invalidValueDefault !== null) return invalidValueDefault;
          return v;
        },
        set: function(v) {
          this._setattr(attr.name, v);
        }
      };
    } else if (attr.type === Boolean) {
      return {
        get: function() {
          return this.hasAttribute(attr.name);
        },
        set: function(v) {
          if (v) {
            this._setattr(attr.name, "");
          } else {
            this.removeAttribute(attr.name);
          }
        }
      };
    } else if (attr.type === Number || attr.type === "long" || attr.type === "unsigned long" || attr.type === "limited unsigned long with fallback") {
      return numberPropDesc(attr);
    } else if (!attr.type || attr.type === String) {
      return {
        get: function() {
          return this._getattr(attr.name) || "";
        },
        set: function(v) {
          if (attr.treatNullAsEmptyString && v === null) {
            v = "";
          }
          this._setattr(attr.name, v);
        }
      };
    } else if (typeof attr.type === "function") {
      return attr.type(attr.name, attr);
    }
    throw new Error("Invalid attribute definition");
  };
  function numberPropDesc(a) {
    var def;
    if (typeof a.default === "function") {
      def = a.default;
    } else if (typeof a.default === "number") {
      def = function() {
        return a.default;
      };
    } else {
      def = function() {
        utils2.assert(false, typeof a.default);
      };
    }
    var unsigned_long = a.type === "unsigned long";
    var signed_long = a.type === "long";
    var unsigned_fallback = a.type === "limited unsigned long with fallback";
    var min = a.min, max = a.max, setmin = a.setmin;
    if (min === void 0) {
      if (unsigned_long) min = 0;
      if (signed_long) min = -2147483648;
      if (unsigned_fallback) min = 1;
    }
    if (max === void 0) {
      if (unsigned_long || signed_long || unsigned_fallback) max = 2147483647;
    }
    return {
      get: function() {
        var v = this._getattr(a.name);
        var n = a.float ? parseFloat(v) : parseInt(v, 10);
        if (v === null || !isFinite(n) || min !== void 0 && n < min || max !== void 0 && n > max) {
          return def.call(this);
        }
        if (unsigned_long || signed_long || unsigned_fallback) {
          if (!/^[ \t\n\f\r]*[-+]?[0-9]/.test(v)) {
            return def.call(this);
          }
          n = n | 0;
        }
        return n;
      },
      set: function(v) {
        if (!a.float) {
          v = Math.floor(v);
        }
        if (setmin !== void 0 && v < setmin) {
          utils2.IndexSizeError(a.name + " set to " + v);
        }
        if (unsigned_long) {
          v = v < 0 || v > 2147483647 ? def.call(this) : v | 0;
        } else if (unsigned_fallback) {
          v = v < 1 || v > 2147483647 ? def.call(this) : v | 0;
        } else if (signed_long) {
          v = v < -2147483648 || v > 2147483647 ? def.call(this) : v | 0;
        }
        this._setattr(a.name, String(v));
      }
    };
  }
  attributes.registerChangeHandler = function(c, name, handler) {
    var p = c.prototype;
    if (!Object.prototype.hasOwnProperty.call(p, "_attributeChangeHandlers")) {
      p._attributeChangeHandlers = Object.create(p._attributeChangeHandlers || null);
    }
    p._attributeChangeHandlers[name] = handler;
  };
  return attributes;
}
var FilteredElementList_1;
var hasRequiredFilteredElementList;
function requireFilteredElementList() {
  if (hasRequiredFilteredElementList) return FilteredElementList_1;
  hasRequiredFilteredElementList = 1;
  FilteredElementList_1 = FilteredElementList;
  var Node = requireNode();
  function FilteredElementList(root, filter) {
    this.root = root;
    this.filter = filter;
    this.lastModTime = root.lastModTime;
    this.done = false;
    this.cache = [];
    this.traverse();
  }
  FilteredElementList.prototype = Object.create(Object.prototype, {
    length: {
      get: function() {
        this.checkcache();
        if (!this.done) this.traverse();
        return this.cache.length;
      }
    },
    item: {
      value: function(n) {
        this.checkcache();
        if (!this.done && n >= this.cache.length) {
          this.traverse(
            /*n*/
          );
        }
        return this.cache[n];
      }
    },
    checkcache: {
      value: function() {
        if (this.lastModTime !== this.root.lastModTime) {
          for (var i = this.cache.length - 1; i >= 0; i--) {
            this[i] = void 0;
          }
          this.cache.length = 0;
          this.done = false;
          this.lastModTime = this.root.lastModTime;
        }
      }
    },
    // If n is specified, then traverse the tree until we've found the nth
    // item (or until we've found all items).  If n is not specified,
    // traverse until we've found all items.
    traverse: {
      value: function(n) {
        if (n !== void 0) n++;
        var elt;
        while ((elt = this.next()) !== null) {
          this[this.cache.length] = elt;
          this.cache.push(elt);
          if (n && this.cache.length === n) return;
        }
        this.done = true;
      }
    },
    // Return the next element under root that matches filter
    next: {
      value: function() {
        var start = this.cache.length === 0 ? this.root : this.cache[this.cache.length - 1];
        var elt;
        if (start.nodeType === Node.DOCUMENT_NODE) elt = start.documentElement;
        else elt = start.nextElement(this.root);
        while (elt) {
          if (this.filter(elt)) {
            return elt;
          }
          elt = elt.nextElement(this.root);
        }
        return null;
      }
    }
  });
  return FilteredElementList_1;
}
var DOMTokenList_1;
var hasRequiredDOMTokenList;
function requireDOMTokenList() {
  if (hasRequiredDOMTokenList) return DOMTokenList_1;
  hasRequiredDOMTokenList = 1;
  var utils2 = requireUtils();
  DOMTokenList_1 = DOMTokenList;
  function DOMTokenList(getter, setter) {
    this._getString = getter;
    this._setString = setter;
    this._length = 0;
    this._lastStringValue = "";
    this._update();
  }
  Object.defineProperties(DOMTokenList.prototype, {
    length: {
      get: function() {
        return this._length;
      }
    },
    item: {
      value: function(index2) {
        var list = getList(this);
        if (index2 < 0 || index2 >= list.length) {
          return null;
        }
        return list[index2];
      }
    },
    contains: {
      value: function(token) {
        token = String(token);
        var list = getList(this);
        return list.indexOf(token) > -1;
      }
    },
    add: {
      value: function() {
        var list = getList(this);
        for (var i = 0, len = arguments.length; i < len; i++) {
          var token = handleErrors(arguments[i]);
          if (list.indexOf(token) < 0) {
            list.push(token);
          }
        }
        this._update(list);
      }
    },
    remove: {
      value: function() {
        var list = getList(this);
        for (var i = 0, len = arguments.length; i < len; i++) {
          var token = handleErrors(arguments[i]);
          var index2 = list.indexOf(token);
          if (index2 > -1) {
            list.splice(index2, 1);
          }
        }
        this._update(list);
      }
    },
    toggle: {
      value: function toggle(token, force) {
        token = handleErrors(token);
        if (this.contains(token)) {
          if (force === void 0 || force === false) {
            this.remove(token);
            return false;
          }
          return true;
        } else {
          if (force === void 0 || force === true) {
            this.add(token);
            return true;
          }
          return false;
        }
      }
    },
    replace: {
      value: function replace(token, newToken) {
        if (String(newToken) === "") {
          utils2.SyntaxError();
        }
        token = handleErrors(token);
        newToken = handleErrors(newToken);
        var list = getList(this);
        var idx = list.indexOf(token);
        if (idx < 0) {
          return false;
        }
        var idx2 = list.indexOf(newToken);
        if (idx2 < 0) {
          list[idx] = newToken;
        } else {
          if (idx < idx2) {
            list[idx] = newToken;
            list.splice(idx2, 1);
          } else {
            list.splice(idx, 1);
          }
        }
        this._update(list);
        return true;
      }
    },
    toString: {
      value: function() {
        return this._getString();
      }
    },
    value: {
      get: function() {
        return this._getString();
      },
      set: function(v) {
        this._setString(v);
        this._update();
      }
    },
    // Called when the setter is called from outside this interface.
    _update: {
      value: function(list) {
        if (list) {
          fixIndex(this, list);
          this._setString(list.join(" ").trim());
        } else {
          fixIndex(this, getList(this));
        }
        this._lastStringValue = this._getString();
      }
    }
  });
  function fixIndex(clist, list) {
    var oldLength = clist._length;
    var i;
    clist._length = list.length;
    for (i = 0; i < list.length; i++) {
      clist[i] = list[i];
    }
    for (; i < oldLength; i++) {
      clist[i] = void 0;
    }
  }
  function handleErrors(token) {
    token = String(token);
    if (token === "") {
      utils2.SyntaxError();
    }
    if (/[ \t\r\n\f]/.test(token)) {
      utils2.InvalidCharacterError();
    }
    return token;
  }
  function toArray(clist) {
    var length = clist._length;
    var arr = Array(length);
    for (var i = 0; i < length; i++) {
      arr[i] = clist[i];
    }
    return arr;
  }
  function getList(clist) {
    var strProp = clist._getString();
    if (strProp === clist._lastStringValue) {
      return toArray(clist);
    }
    var str = strProp.replace(/(^[ \t\r\n\f]+)|([ \t\r\n\f]+$)/g, "");
    if (str === "") {
      return [];
    } else {
      var seen = /* @__PURE__ */ Object.create(null);
      return str.split(/[ \t\r\n\f]+/g).filter(function(n) {
        var key = "$" + n;
        if (seen[key]) {
          return false;
        }
        seen[key] = true;
        return true;
      });
    }
  }
  return DOMTokenList_1;
}
var select = {
  exports: {}
};
var hasRequiredSelect;
function requireSelect() {
  if (hasRequiredSelect) return select.exports;
  hasRequiredSelect = 1;
  (function(module, exports) {
    var window2 = Object.create(null, {
      location: {
        get: function() {
          throw new Error("window.location is not supported.");
        }
      }
    });
    var compareDocumentPosition = function(a, b) {
      return a.compareDocumentPosition(b);
    };
    var order = function(a, b) {
      return compareDocumentPosition(a, b) & 2 ? 1 : -1;
    };
    var next = function(el) {
      while ((el = el.nextSibling) && el.nodeType !== 1) ;
      return el;
    };
    var prev = function(el) {
      while ((el = el.previousSibling) && el.nodeType !== 1) ;
      return el;
    };
    var child = function(el) {
      if (el = el.firstChild) {
        while (el.nodeType !== 1 && (el = el.nextSibling)) ;
      }
      return el;
    };
    var lastChild = function(el) {
      if (el = el.lastChild) {
        while (el.nodeType !== 1 && (el = el.previousSibling)) ;
      }
      return el;
    };
    var parentIsElement = function(n) {
      if (!n.parentNode) {
        return false;
      }
      var nodeType = n.parentNode.nodeType;
      return nodeType === 1 || nodeType === 9;
    };
    var unquote = function(str) {
      if (!str) return str;
      var ch = str[0];
      if (ch === '"' || ch === "'") {
        if (str[str.length - 1] === ch) {
          str = str.slice(1, -1);
        } else {
          str = str.slice(1);
        }
        return str.replace(rules.str_escape, function(s) {
          var m = /^\\(?:([0-9A-Fa-f]+)|([\r\n\f]+))/.exec(s);
          if (!m) {
            return s.slice(1);
          }
          if (m[2]) {
            return "";
          }
          var cp = parseInt(m[1], 16);
          return String.fromCodePoint ? String.fromCodePoint(cp) : (
            // Not all JavaScript implementations have String.fromCodePoint yet.
            String.fromCharCode(cp)
          );
        });
      } else if (rules.ident.test(str)) {
        return decodeid(str);
      } else {
        return str;
      }
    };
    var decodeid = function(str) {
      return str.replace(rules.escape, function(s) {
        var m = /^\\([0-9A-Fa-f]+)/.exec(s);
        if (!m) {
          return s[1];
        }
        var cp = parseInt(m[1], 16);
        return String.fromCodePoint ? String.fromCodePoint(cp) : (
          // Not all JavaScript implementations have String.fromCodePoint yet.
          String.fromCharCode(cp)
        );
      });
    };
    var indexOf = (function() {
      if (Array.prototype.indexOf) {
        return Array.prototype.indexOf;
      }
      return function(obj, item) {
        var i = this.length;
        while (i--) {
          if (this[i] === item) return i;
        }
        return -1;
      };
    })();
    var makeInside = function(start, end) {
      var regex = rules.inside.source.replace(/</g, start).replace(/>/g, end);
      return new RegExp(regex);
    };
    var replace = function(regex, name, val) {
      regex = regex.source;
      regex = regex.replace(name, val.source || val);
      return new RegExp(regex);
    };
    var truncateUrl = function(url, num) {
      return url.replace(/^(?:\w+:\/\/|\/+)/, "").replace(/(?:\/+|\/*#.*?)$/, "").split("/", num).join("/");
    };
    var parseNth = function(param_, test) {
      var param = param_.replace(/\s+/g, ""), cap;
      if (param === "even") {
        param = "2n+0";
      } else if (param === "odd") {
        param = "2n+1";
      } else if (param.indexOf("n") === -1) {
        param = "0n" + param;
      }
      cap = /^([+-])?(\d+)?n([+-])?(\d+)?$/.exec(param);
      return {
        group: cap[1] === "-" ? -(cap[2] || 1) : +(cap[2] || 1),
        offset: cap[4] ? cap[3] === "-" ? -cap[4] : +cap[4] : 0
      };
    };
    var nth = function(param_, test, last) {
      var param = parseNth(param_), group = param.group, offset = param.offset, find2 = !last ? child : lastChild, advance = !last ? next : prev;
      return function(el) {
        if (!parentIsElement(el)) return;
        var rel = find2(el.parentNode), pos = 0;
        while (rel) {
          if (test(rel, el)) pos++;
          if (rel === el) {
            pos -= offset;
            return group && pos ? pos % group === 0 && pos < 0 === group < 0 : !pos;
          }
          rel = advance(rel);
        }
      };
    };
    var selectors = {
      "*": /* @__PURE__ */ (function() {
        return function() {
          return true;
        };
      })(),
      "type": function(type) {
        type = type.toLowerCase();
        return function(el) {
          return el.nodeName.toLowerCase() === type;
        };
      },
      "attr": function(key, op, val, i) {
        op = operators[op];
        return function(el) {
          var attr;
          switch (key) {
            case "for":
              attr = el.htmlFor;
              break;
            case "class":
              attr = el.className;
              if (attr === "" && el.getAttribute("class") == null) {
                attr = null;
              }
              break;
            case "href":
            case "src":
              attr = el.getAttribute(key, 2);
              break;
            case "title":
              attr = el.getAttribute("title") || null;
              break;
            // careful with attributes with special getter functions
            case "id":
            case "lang":
            case "dir":
            case "accessKey":
            case "hidden":
            case "tabIndex":
            case "style":
              if (el.getAttribute) {
                attr = el.getAttribute(key);
                break;
              }
            /* falls through */
            default:
              if (el.hasAttribute && !el.hasAttribute(key)) {
                break;
              }
              attr = el[key] != null ? el[key] : el.getAttribute && el.getAttribute(key);
              break;
          }
          if (attr == null) return;
          attr = attr + "";
          if (i) {
            attr = attr.toLowerCase();
            val = val.toLowerCase();
          }
          return op(attr, val);
        };
      },
      ":first-child": function(el) {
        return !prev(el) && parentIsElement(el);
      },
      ":last-child": function(el) {
        return !next(el) && parentIsElement(el);
      },
      ":only-child": function(el) {
        return !prev(el) && !next(el) && parentIsElement(el);
      },
      ":nth-child": function(param, last) {
        return nth(param, function() {
          return true;
        }, last);
      },
      ":nth-last-child": function(param) {
        return selectors[":nth-child"](param, true);
      },
      ":root": function(el) {
        return el.ownerDocument.documentElement === el;
      },
      ":empty": function(el) {
        return !el.firstChild;
      },
      ":not": function(sel) {
        var test = compileGroup(sel);
        return function(el) {
          return !test(el);
        };
      },
      ":first-of-type": function(el) {
        if (!parentIsElement(el)) return;
        var type = el.nodeName;
        while (el = prev(el)) {
          if (el.nodeName === type) return;
        }
        return true;
      },
      ":last-of-type": function(el) {
        if (!parentIsElement(el)) return;
        var type = el.nodeName;
        while (el = next(el)) {
          if (el.nodeName === type) return;
        }
        return true;
      },
      ":only-of-type": function(el) {
        return selectors[":first-of-type"](el) && selectors[":last-of-type"](el);
      },
      ":nth-of-type": function(param, last) {
        return nth(param, function(rel, el) {
          return rel.nodeName === el.nodeName;
        }, last);
      },
      ":nth-last-of-type": function(param) {
        return selectors[":nth-of-type"](param, true);
      },
      ":checked": function(el) {
        return !!(el.checked || el.selected);
      },
      ":indeterminate": function(el) {
        return !selectors[":checked"](el);
      },
      ":enabled": function(el) {
        return !el.disabled && el.type !== "hidden";
      },
      ":disabled": function(el) {
        return !!el.disabled;
      },
      ":target": function(el) {
        return el.id === window2.location.hash.substring(1);
      },
      ":focus": function(el) {
        return el === el.ownerDocument.activeElement;
      },
      ":is": function(sel) {
        return compileGroup(sel);
      },
      // :matches is an older name for :is; see
      // https://github.com/w3c/csswg-drafts/issues/3258
      ":matches": function(sel) {
        return selectors[":is"](sel);
      },
      ":nth-match": function(param, last) {
        var args = param.split(/\s*,\s*/), arg = args.shift(), test = compileGroup(args.join(","));
        return nth(arg, test, last);
      },
      ":nth-last-match": function(param) {
        return selectors[":nth-match"](param, true);
      },
      ":links-here": function(el) {
        return el + "" === window2.location + "";
      },
      ":lang": function(param) {
        return function(el) {
          while (el) {
            if (el.lang) return el.lang.indexOf(param) === 0;
            el = el.parentNode;
          }
        };
      },
      ":dir": function(param) {
        return function(el) {
          while (el) {
            if (el.dir) return el.dir === param;
            el = el.parentNode;
          }
        };
      },
      ":scope": function(el, con) {
        var context = con || el.ownerDocument;
        if (context.nodeType === 9) {
          return el === context.documentElement;
        }
        return el === context;
      },
      ":any-link": function(el) {
        return typeof el.href === "string";
      },
      ":local-link": function(el) {
        if (el.nodeName) {
          return el.href && el.host === window2.location.host;
        }
        var param = +el + 1;
        return function(el2) {
          if (!el2.href) return;
          var url = window2.location + "", href = el2 + "";
          return truncateUrl(url, param) === truncateUrl(href, param);
        };
      },
      ":default": function(el) {
        return !!el.defaultSelected;
      },
      ":valid": function(el) {
        return el.willValidate || el.validity && el.validity.valid;
      },
      ":invalid": function(el) {
        return !selectors[":valid"](el);
      },
      ":in-range": function(el) {
        return el.value > el.min && el.value <= el.max;
      },
      ":out-of-range": function(el) {
        return !selectors[":in-range"](el);
      },
      ":required": function(el) {
        return !!el.required;
      },
      ":optional": function(el) {
        return !el.required;
      },
      ":read-only": function(el) {
        if (el.readOnly) return true;
        var attr = el.getAttribute("contenteditable"), prop = el.contentEditable, name = el.nodeName.toLowerCase();
        name = name !== "input" && name !== "textarea";
        return (name || el.disabled) && attr == null && prop !== "true";
      },
      ":read-write": function(el) {
        return !selectors[":read-only"](el);
      },
      ":hover": function() {
        throw new Error(":hover is not supported.");
      },
      ":active": function() {
        throw new Error(":active is not supported.");
      },
      ":link": function() {
        throw new Error(":link is not supported.");
      },
      ":visited": function() {
        throw new Error(":visited is not supported.");
      },
      ":column": function() {
        throw new Error(":column is not supported.");
      },
      ":nth-column": function() {
        throw new Error(":nth-column is not supported.");
      },
      ":nth-last-column": function() {
        throw new Error(":nth-last-column is not supported.");
      },
      ":current": function() {
        throw new Error(":current is not supported.");
      },
      ":past": function() {
        throw new Error(":past is not supported.");
      },
      ":future": function() {
        throw new Error(":future is not supported.");
      },
      // Non-standard, for compatibility purposes.
      ":contains": function(param) {
        return function(el) {
          var text = el.innerText || el.textContent || el.value || "";
          return text.indexOf(param) !== -1;
        };
      },
      ":has": function(param) {
        return function(el) {
          return find(param, el).length > 0;
        };
      }
      // Potentially add more pseudo selectors for
      // compatibility with sizzle and most other
      // selector engines (?).
    };
    var operators = {
      "-": function() {
        return true;
      },
      "=": function(attr, val) {
        return attr === val;
      },
      "*=": function(attr, val) {
        return attr.indexOf(val) !== -1;
      },
      "~=": function(attr, val) {
        var i, s, f, l;
        for (s = 0; true; s = i + 1) {
          i = attr.indexOf(val, s);
          if (i === -1) return false;
          f = attr[i - 1];
          l = attr[i + val.length];
          if ((!f || f === " ") && (!l || l === " ")) return true;
        }
      },
      "|=": function(attr, val) {
        var i = attr.indexOf(val), l;
        if (i !== 0) return;
        l = attr[i + val.length];
        return l === "-" || !l;
      },
      "^=": function(attr, val) {
        return attr.indexOf(val) === 0;
      },
      "$=": function(attr, val) {
        var i = attr.lastIndexOf(val);
        return i !== -1 && i + val.length === attr.length;
      },
      // non-standard
      "!=": function(attr, val) {
        return attr !== val;
      }
    };
    var combinators = {
      " ": function(test) {
        return function(el) {
          while (el = el.parentNode) {
            if (test(el)) return el;
          }
        };
      },
      ">": function(test) {
        return function(el) {
          if (el = el.parentNode) {
            return test(el) && el;
          }
        };
      },
      "+": function(test) {
        return function(el) {
          if (el = prev(el)) {
            return test(el) && el;
          }
        };
      },
      "~": function(test) {
        return function(el) {
          while (el = prev(el)) {
            if (test(el)) return el;
          }
        };
      },
      "noop": function(test) {
        return function(el) {
          return test(el) && el;
        };
      },
      "ref": function(test, name) {
        var node;
        function ref(el) {
          var doc = el.ownerDocument, nodes = doc.getElementsByTagName("*"), i = nodes.length;
          while (i--) {
            node = nodes[i];
            if (ref.test(el)) {
              node = null;
              return true;
            }
          }
          node = null;
        }
        ref.combinator = function(el) {
          if (!node || !node.getAttribute) return;
          var attr = node.getAttribute(name) || "";
          if (attr[0] === "#") attr = attr.substring(1);
          if (attr === el.id && test(node)) {
            return node;
          }
        };
        return ref;
      }
    };
    var rules = {
      escape: /\\(?:[^0-9A-Fa-f\r\n]|[0-9A-Fa-f]{1,6}[\r\n\t ]?)/g,
      str_escape: /(escape)|\\(\n|\r\n?|\f)/g,
      nonascii: /[\u00A0-\uFFFF]/,
      cssid: /(?:(?!-?[0-9])(?:escape|nonascii|[-_a-zA-Z0-9])+)/,
      qname: /^ *(cssid|\*)/,
      simple: /^(?:([.#]cssid)|pseudo|attr)/,
      ref: /^ *\/(cssid)\/ */,
      combinator: /^(?: +([^ \w*.#\\]) +|( )+|([^ \w*.#\\]))(?! *$)/,
      attr: /^\[(cssid)(?:([^\w]?=)(inside))?\]/,
      pseudo: /^(:cssid)(?:\((inside)\))?/,
      inside: /(?:"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|<[^"'>]*>|\\["'>]|[^"'>])*/,
      ident: /^(cssid)$/
    };
    rules.cssid = replace(rules.cssid, "nonascii", rules.nonascii);
    rules.cssid = replace(rules.cssid, "escape", rules.escape);
    rules.qname = replace(rules.qname, "cssid", rules.cssid);
    rules.simple = replace(rules.simple, "cssid", rules.cssid);
    rules.ref = replace(rules.ref, "cssid", rules.cssid);
    rules.attr = replace(rules.attr, "cssid", rules.cssid);
    rules.pseudo = replace(rules.pseudo, "cssid", rules.cssid);
    rules.inside = replace(rules.inside, `[^"'>]*`, rules.inside);
    rules.attr = replace(rules.attr, "inside", makeInside("\\[", "\\]"));
    rules.pseudo = replace(rules.pseudo, "inside", makeInside("\\(", "\\)"));
    rules.simple = replace(rules.simple, "pseudo", rules.pseudo);
    rules.simple = replace(rules.simple, "attr", rules.attr);
    rules.ident = replace(rules.ident, "cssid", rules.cssid);
    rules.str_escape = replace(rules.str_escape, "escape", rules.escape);
    var compile = function(sel_) {
      var sel = sel_.replace(/^\s+|\s+$/g, ""), test, filter = [], buff = [], subject, qname, cap, op, ref;
      while (sel) {
        if (cap = rules.qname.exec(sel)) {
          sel = sel.substring(cap[0].length);
          qname = decodeid(cap[1]);
          buff.push(tok(qname, true));
        } else if (cap = rules.simple.exec(sel)) {
          sel = sel.substring(cap[0].length);
          qname = "*";
          buff.push(tok(qname, true));
          buff.push(tok(cap));
        } else {
          throw new SyntaxError("Invalid selector.");
        }
        while (cap = rules.simple.exec(sel)) {
          sel = sel.substring(cap[0].length);
          buff.push(tok(cap));
        }
        if (sel[0] === "!") {
          sel = sel.substring(1);
          subject = makeSubject();
          subject.qname = qname;
          buff.push(subject.simple);
        }
        if (cap = rules.ref.exec(sel)) {
          sel = sel.substring(cap[0].length);
          ref = combinators.ref(makeSimple(buff), decodeid(cap[1]));
          filter.push(ref.combinator);
          buff = [];
          continue;
        }
        if (cap = rules.combinator.exec(sel)) {
          sel = sel.substring(cap[0].length);
          op = cap[1] || cap[2] || cap[3];
          if (op === ",") {
            filter.push(combinators.noop(makeSimple(buff)));
            break;
          }
        } else {
          op = "noop";
        }
        if (!combinators[op]) {
          throw new SyntaxError("Bad combinator.");
        }
        filter.push(combinators[op](makeSimple(buff)));
        buff = [];
      }
      test = makeTest(filter);
      test.qname = qname;
      test.sel = sel;
      if (subject) {
        subject.lname = test.qname;
        subject.test = test;
        subject.qname = subject.qname;
        subject.sel = test.sel;
        test = subject;
      }
      if (ref) {
        ref.test = test;
        ref.qname = test.qname;
        ref.sel = test.sel;
        test = ref;
      }
      return test;
    };
    var tok = function(cap, qname) {
      if (qname) {
        return cap === "*" ? selectors["*"] : selectors.type(cap);
      }
      if (cap[1]) {
        return cap[1][0] === "." ? selectors.attr("class", "~=", decodeid(cap[1].substring(1)), false) : selectors.attr("id", "=", decodeid(cap[1].substring(1)), false);
      }
      if (cap[2]) {
        return cap[3] ? selectors[decodeid(cap[2])](unquote(cap[3])) : selectors[decodeid(cap[2])];
      }
      if (cap[4]) {
        var value = cap[6];
        var i = /["'\s]\s*I$/i.test(value);
        if (i) {
          value = value.replace(/\s*I$/i, "");
        }
        return selectors.attr(decodeid(cap[4]), cap[5] || "-", unquote(value), i);
      }
      throw new SyntaxError("Unknown Selector.");
    };
    var makeSimple = function(func) {
      var l = func.length, i;
      if (l < 2) return func[0];
      return function(el) {
        if (!el) return;
        for (i = 0; i < l; i++) {
          if (!func[i](el)) return;
        }
        return true;
      };
    };
    var makeTest = function(func) {
      if (func.length < 2) {
        return function(el) {
          return !!func[0](el);
        };
      }
      return function(el) {
        var i = func.length;
        while (i--) {
          if (!(el = func[i](el))) return;
        }
        return true;
      };
    };
    var makeSubject = function() {
      var target;
      function subject(el) {
        var node = el.ownerDocument, scope = node.getElementsByTagName(subject.lname), i = scope.length;
        while (i--) {
          if (subject.test(scope[i]) && target === el) {
            target = null;
            return true;
          }
        }
        target = null;
      }
      subject.simple = function(el) {
        target = el;
        return true;
      };
      return subject;
    };
    var compileGroup = function(sel) {
      var test = compile(sel), tests = [test];
      while (test.sel) {
        test = compile(test.sel);
        tests.push(test);
      }
      if (tests.length < 2) return test;
      return function(el) {
        var l = tests.length, i = 0;
        for (; i < l; i++) {
          if (tests[i](el)) return true;
        }
      };
    };
    var find = function(sel, node) {
      var results = [], test = compile(sel), scope = node.getElementsByTagName(test.qname), i = 0, el;
      while (el = scope[i++]) {
        if (test(el)) results.push(el);
      }
      if (test.sel) {
        while (test.sel) {
          test = compile(test.sel);
          scope = node.getElementsByTagName(test.qname);
          i = 0;
          while (el = scope[i++]) {
            if (test(el) && indexOf.call(results, el) === -1) {
              results.push(el);
            }
          }
        }
        results.sort(order);
      }
      return results;
    };
    module.exports = exports = function(sel, context) {
      var id, r;
      if (context.nodeType !== 11 && sel.indexOf(" ") === -1) {
        if (sel[0] === "#" && context.rooted && /^#[A-Z_][-A-Z0-9_]*$/i.test(sel)) {
          if (context.doc._hasMultipleElementsWithId) {
            id = sel.substring(1);
            if (!context.doc._hasMultipleElementsWithId(id)) {
              r = context.doc.getElementById(id);
              return r ? [r] : [];
            }
          }
        }
        if (sel[0] === "." && /^\.\w+$/.test(sel)) {
          return context.getElementsByClassName(sel.substring(1));
        }
        if (/^\w+$/.test(sel)) {
          return context.getElementsByTagName(sel);
        }
      }
      return find(sel, context);
    };
    exports.selectors = selectors;
    exports.operators = operators;
    exports.combinators = combinators;
    exports.matches = function(el, sel) {
      var test = {
        sel
      };
      do {
        test = compile(test.sel);
        if (test(el)) {
          return true;
        }
      } while (test.sel);
      return false;
    };
  })(select, select.exports);
  return select.exports;
}
var ChildNode_1;
var hasRequiredChildNode;
function requireChildNode() {
  if (hasRequiredChildNode) return ChildNode_1;
  hasRequiredChildNode = 1;
  var Node = requireNode();
  var LinkedList2 = requireLinkedList();
  var createDocumentFragmentFromArguments = function(document, args) {
    var docFrag = document.createDocumentFragment();
    for (var i = 0; i < args.length; i++) {
      var argItem = args[i];
      var isNode = argItem instanceof Node;
      docFrag.appendChild(isNode ? argItem : document.createTextNode(String(argItem)));
    }
    return docFrag;
  };
  var ChildNode = {
    // Inserts a set of Node or String objects in the children list of this
    // ChildNode's parent, just after this ChildNode.  String objects are
    // inserted as the equivalent Text nodes.
    after: {
      value: function after() {
        var argArr = Array.prototype.slice.call(arguments);
        var parentNode = this.parentNode, nextSibling = this.nextSibling;
        if (parentNode === null) {
          return;
        }
        while (nextSibling && argArr.some(function(v) {
          return v === nextSibling;
        })) nextSibling = nextSibling.nextSibling;
        var docFrag = createDocumentFragmentFromArguments(this.doc, argArr);
        parentNode.insertBefore(docFrag, nextSibling);
      }
    },
    // Inserts a set of Node or String objects in the children list of this
    // ChildNode's parent, just before this ChildNode.  String objects are
    // inserted as the equivalent Text nodes.
    before: {
      value: function before() {
        var argArr = Array.prototype.slice.call(arguments);
        var parentNode = this.parentNode, prevSibling = this.previousSibling;
        if (parentNode === null) {
          return;
        }
        while (prevSibling && argArr.some(function(v) {
          return v === prevSibling;
        })) prevSibling = prevSibling.previousSibling;
        var docFrag = createDocumentFragmentFromArguments(this.doc, argArr);
        var nextSibling = prevSibling ? prevSibling.nextSibling : parentNode.firstChild;
        parentNode.insertBefore(docFrag, nextSibling);
      }
    },
    // Remove this node from its parent
    remove: {
      value: function remove() {
        if (this.parentNode === null) return;
        if (this.doc) {
          this.doc._preremoveNodeIterators(this);
          if (this.rooted) {
            this.doc.mutateRemove(this);
          }
        }
        this._remove();
        this.parentNode = null;
      }
    },
    // Remove this node w/o uprooting or sending mutation events
    // (But do update the structure id for all ancestors)
    _remove: {
      value: function _remove() {
        var parent = this.parentNode;
        if (parent === null) return;
        if (parent._childNodes) {
          parent._childNodes.splice(this.index, 1);
        } else if (parent._firstChild === this) {
          if (this._nextSibling === this) {
            parent._firstChild = null;
          } else {
            parent._firstChild = this._nextSibling;
          }
        }
        LinkedList2.remove(this);
        parent.modify();
      }
    },
    // Replace this node with the nodes or strings provided as arguments.
    replaceWith: {
      value: function replaceWith() {
        var argArr = Array.prototype.slice.call(arguments);
        var parentNode = this.parentNode, nextSibling = this.nextSibling;
        if (parentNode === null) {
          return;
        }
        while (nextSibling && argArr.some(function(v) {
          return v === nextSibling;
        })) nextSibling = nextSibling.nextSibling;
        var docFrag = createDocumentFragmentFromArguments(this.doc, argArr);
        if (this.parentNode === parentNode) {
          parentNode.replaceChild(docFrag, this);
        } else {
          parentNode.insertBefore(docFrag, nextSibling);
        }
      }
    }
  };
  ChildNode_1 = ChildNode;
  return ChildNode_1;
}
var NonDocumentTypeChildNode_1;
var hasRequiredNonDocumentTypeChildNode;
function requireNonDocumentTypeChildNode() {
  if (hasRequiredNonDocumentTypeChildNode) return NonDocumentTypeChildNode_1;
  hasRequiredNonDocumentTypeChildNode = 1;
  var Node = requireNode();
  var NonDocumentTypeChildNode = {
    nextElementSibling: {
      get: function() {
        if (this.parentNode) {
          for (var kid = this.nextSibling; kid !== null; kid = kid.nextSibling) {
            if (kid.nodeType === Node.ELEMENT_NODE) return kid;
          }
        }
        return null;
      }
    },
    previousElementSibling: {
      get: function() {
        if (this.parentNode) {
          for (var kid = this.previousSibling; kid !== null; kid = kid.previousSibling) {
            if (kid.nodeType === Node.ELEMENT_NODE) return kid;
          }
        }
        return null;
      }
    }
  };
  NonDocumentTypeChildNode_1 = NonDocumentTypeChildNode;
  return NonDocumentTypeChildNode_1;
}
var NamedNodeMap_1;
var hasRequiredNamedNodeMap;
function requireNamedNodeMap() {
  if (hasRequiredNamedNodeMap) return NamedNodeMap_1;
  hasRequiredNamedNodeMap = 1;
  NamedNodeMap_1 = NamedNodeMap;
  var utils2 = requireUtils();
  function NamedNodeMap(element) {
    this.element = element;
  }
  Object.defineProperties(NamedNodeMap.prototype, {
    length: {
      get: utils2.shouldOverride
    },
    item: {
      value: utils2.shouldOverride
    },
    getNamedItem: {
      value: function getNamedItem(qualifiedName) {
        return this.element.getAttributeNode(qualifiedName);
      }
    },
    getNamedItemNS: {
      value: function getNamedItemNS(namespace, localName) {
        return this.element.getAttributeNodeNS(namespace, localName);
      }
    },
    setNamedItem: {
      value: utils2.nyi
    },
    setNamedItemNS: {
      value: utils2.nyi
    },
    removeNamedItem: {
      value: function removeNamedItem(qualifiedName) {
        var attr = this.element.getAttributeNode(qualifiedName);
        if (attr) {
          this.element.removeAttribute(qualifiedName);
          return attr;
        }
        utils2.NotFoundError();
      }
    },
    removeNamedItemNS: {
      value: function removeNamedItemNS(ns, lname) {
        var attr = this.element.getAttributeNodeNS(ns, lname);
        if (attr) {
          this.element.removeAttributeNS(ns, lname);
          return attr;
        }
        utils2.NotFoundError();
      }
    }
  });
  return NamedNodeMap_1;
}
var Element_1;
var hasRequiredElement;
function requireElement() {
  if (hasRequiredElement) return Element_1;
  hasRequiredElement = 1;
  Element_1 = Element;
  var xml = requireXmlnames();
  var utils2 = requireUtils();
  var NAMESPACE = utils2.NAMESPACE;
  var attributes2 = requireAttributes();
  var Node = requireNode();
  var NodeList = requireNodeList();
  var NodeUtils2 = requireNodeUtils();
  var FilteredElementList = requireFilteredElementList();
  var DOMTokenList = requireDOMTokenList();
  var select2 = requireSelect();
  var ContainerNode = requireContainerNode();
  var ChildNode = requireChildNode();
  var NonDocumentTypeChildNode = requireNonDocumentTypeChildNode();
  var NamedNodeMap = requireNamedNodeMap();
  var uppercaseCache = /* @__PURE__ */ Object.create(null);
  function Element(doc, localName, namespaceURI, prefix) {
    ContainerNode.call(this);
    this.nodeType = Node.ELEMENT_NODE;
    this.ownerDocument = doc;
    this.localName = localName;
    this.namespaceURI = namespaceURI;
    this.prefix = prefix;
    this._tagName = void 0;
    this._attrsByQName = /* @__PURE__ */ Object.create(null);
    this._attrsByLName = /* @__PURE__ */ Object.create(null);
    this._attrKeys = [];
  }
  function recursiveGetText(node, a) {
    if (node.nodeType === Node.TEXT_NODE) {
      a.push(node._data);
    } else {
      for (var i = 0, n = node.childNodes.length; i < n; i++) recursiveGetText(node.childNodes[i], a);
    }
  }
  Element.prototype = Object.create(ContainerNode.prototype, {
    isHTML: {
      get: function isHTML() {
        return this.namespaceURI === NAMESPACE.HTML && this.ownerDocument.isHTML;
      }
    },
    tagName: {
      get: function tagName() {
        if (this._tagName === void 0) {
          var tn;
          if (this.prefix === null) {
            tn = this.localName;
          } else {
            tn = this.prefix + ":" + this.localName;
          }
          if (this.isHTML) {
            var up = uppercaseCache[tn];
            if (!up) {
              uppercaseCache[tn] = up = utils2.toASCIIUpperCase(tn);
            }
            tn = up;
          }
          this._tagName = tn;
        }
        return this._tagName;
      }
    },
    nodeName: {
      get: function() {
        return this.tagName;
      }
    },
    nodeValue: {
      get: function() {
        return null;
      },
      set: function() {
      }
    },
    textContent: {
      get: function() {
        var strings = [];
        recursiveGetText(this, strings);
        return strings.join("");
      },
      set: function(newtext) {
        this.removeChildren();
        if (newtext !== null && newtext !== void 0 && newtext !== "") {
          this._appendChild(this.ownerDocument.createTextNode(newtext));
        }
      }
    },
    innerText: {
      get: function() {
        var strings = [];
        recursiveGetText(this, strings);
        return strings.join("").replace(/[ \t\n\f\r]+/g, " ").trim();
      },
      set: function(newtext) {
        this.removeChildren();
        if (newtext !== null && newtext !== void 0 && newtext !== "") {
          this._appendChild(this.ownerDocument.createTextNode(newtext));
        }
      }
    },
    innerHTML: {
      get: function() {
        return this.serialize();
      },
      set: utils2.nyi
    },
    outerHTML: {
      get: function() {
        return NodeUtils2.serializeOne(this, {
          nodeType: 0
        });
      },
      set: function(v) {
        var document = this.ownerDocument;
        var parent = this.parentNode;
        if (parent === null) {
          return;
        }
        if (parent.nodeType === Node.DOCUMENT_NODE) {
          utils2.NoModificationAllowedError();
        }
        if (parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
          parent = parent.ownerDocument.createElement("body");
        }
        var parser = document.implementation.mozHTMLParser(document._address, parent);
        parser.parse(v === null ? "" : String(v), true);
        this.replaceWith(parser._asDocumentFragment());
      }
    },
    _insertAdjacent: {
      value: function _insertAdjacent(position, node) {
        var first = false;
        switch (position) {
          case "beforebegin":
            first = true;
          /* falls through */
          case "afterend":
            var parent = this.parentNode;
            if (parent === null) {
              return null;
            }
            return parent.insertBefore(node, first ? this : this.nextSibling);
          case "afterbegin":
            first = true;
          /* falls through */
          case "beforeend":
            return this.insertBefore(node, first ? this.firstChild : null);
          default:
            return utils2.SyntaxError();
        }
      }
    },
    insertAdjacentElement: {
      value: function insertAdjacentElement(position, element) {
        if (element.nodeType !== Node.ELEMENT_NODE) {
          throw new TypeError("not an element");
        }
        position = utils2.toASCIILowerCase(String(position));
        return this._insertAdjacent(position, element);
      }
    },
    insertAdjacentText: {
      value: function insertAdjacentText(position, data) {
        var textNode = this.ownerDocument.createTextNode(data);
        position = utils2.toASCIILowerCase(String(position));
        this._insertAdjacent(position, textNode);
      }
    },
    insertAdjacentHTML: {
      value: function insertAdjacentHTML(position, text) {
        position = utils2.toASCIILowerCase(String(position));
        text = String(text);
        var context;
        switch (position) {
          case "beforebegin":
          case "afterend":
            context = this.parentNode;
            if (context === null || context.nodeType === Node.DOCUMENT_NODE) {
              utils2.NoModificationAllowedError();
            }
            break;
          case "afterbegin":
          case "beforeend":
            context = this;
            break;
          default:
            utils2.SyntaxError();
        }
        if (!(context instanceof Element) || context.ownerDocument.isHTML && context.localName === "html" && context.namespaceURI === NAMESPACE.HTML) {
          context = context.ownerDocument.createElementNS(NAMESPACE.HTML, "body");
        }
        var parser = this.ownerDocument.implementation.mozHTMLParser(this.ownerDocument._address, context);
        parser.parse(text, true);
        this._insertAdjacent(position, parser._asDocumentFragment());
      }
    },
    children: {
      get: function() {
        if (!this._children) {
          this._children = new ChildrenCollection(this);
        }
        return this._children;
      }
    },
    attributes: {
      get: function() {
        if (!this._attributes) {
          this._attributes = new AttributesArray(this);
        }
        return this._attributes;
      }
    },
    firstElementChild: {
      get: function() {
        for (var kid = this.firstChild; kid !== null; kid = kid.nextSibling) {
          if (kid.nodeType === Node.ELEMENT_NODE) return kid;
        }
        return null;
      }
    },
    lastElementChild: {
      get: function() {
        for (var kid = this.lastChild; kid !== null; kid = kid.previousSibling) {
          if (kid.nodeType === Node.ELEMENT_NODE) return kid;
        }
        return null;
      }
    },
    childElementCount: {
      get: function() {
        return this.children.length;
      }
    },
    // Return the next element, in source order, after this one or
    // null if there are no more.  If root element is specified,
    // then don't traverse beyond its subtree.
    //
    // This is not a DOM method, but is convenient for
    // lazy traversals of the tree.
    nextElement: {
      value: function(root) {
        if (!root) root = this.ownerDocument.documentElement;
        var next = this.firstElementChild;
        if (!next) {
          if (this === root) return null;
          next = this.nextElementSibling;
        }
        if (next) return next;
        for (var parent = this.parentElement; parent && parent !== root; parent = parent.parentElement) {
          next = parent.nextElementSibling;
          if (next) return next;
        }
        return null;
      }
    },
    // XXX:
    // Tests are currently failing for this function.
    // Awaiting resolution of:
    // http://lists.w3.org/Archives/Public/www-dom/2011JulSep/0016.html
    getElementsByTagName: {
      value: function getElementsByTagName(lname) {
        var filter;
        if (!lname) return new NodeList();
        if (lname === "*") filter = function() {
          return true;
        };
        else if (this.isHTML) filter = htmlLocalNameElementFilter(lname);
        else filter = localNameElementFilter(lname);
        return new FilteredElementList(this, filter);
      }
    },
    getElementsByTagNameNS: {
      value: function getElementsByTagNameNS(ns, lname) {
        var filter;
        if (ns === "*" && lname === "*") filter = function() {
          return true;
        };
        else if (ns === "*") filter = localNameElementFilter(lname);
        else if (lname === "*") filter = namespaceElementFilter(ns);
        else filter = namespaceLocalNameElementFilter(ns, lname);
        return new FilteredElementList(this, filter);
      }
    },
    getElementsByClassName: {
      value: function getElementsByClassName(names) {
        names = String(names).trim();
        if (names === "") {
          var result = new NodeList();
          return result;
        }
        names = names.split(/[ \t\r\n\f]+/);
        return new FilteredElementList(this, classNamesElementFilter(names));
      }
    },
    getElementsByName: {
      value: function getElementsByName(name) {
        return new FilteredElementList(this, elementNameFilter(String(name)));
      }
    },
    // Utility methods used by the public API methods above
    clone: {
      value: function clone() {
        var e;
        if (this.namespaceURI !== NAMESPACE.HTML || this.prefix || !this.ownerDocument.isHTML) {
          e = this.ownerDocument.createElementNS(this.namespaceURI, this.prefix !== null ? this.prefix + ":" + this.localName : this.localName);
        } else {
          e = this.ownerDocument.createElement(this.localName);
        }
        for (var i = 0, n = this._attrKeys.length; i < n; i++) {
          var lname = this._attrKeys[i];
          var a = this._attrsByLName[lname];
          var b = a.cloneNode();
          b._setOwnerElement(e);
          e._attrsByLName[lname] = b;
          e._addQName(b);
        }
        e._attrKeys = this._attrKeys.concat();
        return e;
      }
    },
    isEqual: {
      value: function isEqual(that) {
        if (this.localName !== that.localName || this.namespaceURI !== that.namespaceURI || this.prefix !== that.prefix || this._numattrs !== that._numattrs) return false;
        for (var i = 0, n = this._numattrs; i < n; i++) {
          var a = this._attr(i);
          if (!that.hasAttributeNS(a.namespaceURI, a.localName)) return false;
          if (that.getAttributeNS(a.namespaceURI, a.localName) !== a.value) return false;
        }
        return true;
      }
    },
    // This is the 'locate a namespace prefix' algorithm from the
    // DOM specification.  It is used by Node.lookupPrefix()
    // (Be sure to compare DOM3 and DOM4 versions of spec.)
    _lookupNamespacePrefix: {
      value: function _lookupNamespacePrefix(ns, originalElement) {
        if (this.namespaceURI && this.namespaceURI === ns && this.prefix !== null && originalElement.lookupNamespaceURI(this.prefix) === ns) {
          return this.prefix;
        }
        for (var i = 0, n = this._numattrs; i < n; i++) {
          var a = this._attr(i);
          if (a.prefix === "xmlns" && a.value === ns && originalElement.lookupNamespaceURI(a.localName) === ns) {
            return a.localName;
          }
        }
        var parent = this.parentElement;
        return parent ? parent._lookupNamespacePrefix(ns, originalElement) : null;
      }
    },
    // This is the 'locate a namespace' algorithm for Element nodes
    // from the DOM Core spec.  It is used by Node#lookupNamespaceURI()
    lookupNamespaceURI: {
      value: function lookupNamespaceURI(prefix) {
        if (prefix === "" || prefix === void 0) {
          prefix = null;
        }
        if (this.namespaceURI !== null && this.prefix === prefix) return this.namespaceURI;
        for (var i = 0, n = this._numattrs; i < n; i++) {
          var a = this._attr(i);
          if (a.namespaceURI === NAMESPACE.XMLNS) {
            if (a.prefix === "xmlns" && a.localName === prefix || prefix === null && a.prefix === null && a.localName === "xmlns") {
              return a.value || null;
            }
          }
        }
        var parent = this.parentElement;
        return parent ? parent.lookupNamespaceURI(prefix) : null;
      }
    },
    //
    // Attribute handling methods and utilities
    //
    /*
     * Attributes in the DOM are tricky:
     *
     * - there are the 8 basic get/set/has/removeAttribute{NS} methods
     *
     * - but many HTML attributes are also 'reflected' through IDL
     *   attributes which means that they can be queried and set through
     *   regular properties of the element.  There is just one attribute
     *   value, but two ways to get and set it.
     *
     * - Different HTML element types have different sets of reflected
       attributes.
     *
     * - attributes can also be queried and set through the .attributes
     *   property of an element.  This property behaves like an array of
     *   Attr objects.  The value property of each Attr is writeable, so
     *   this is a third way to read and write attributes.
     *
     * - for efficiency, we really want to store attributes in some kind
     *   of name->attr map.  But the attributes[] array is an array, not a
     *   map, which is kind of unnatural.
     *
     * - When using namespaces and prefixes, and mixing the NS methods
     *   with the non-NS methods, it is apparently actually possible for
     *   an attributes[] array to have more than one attribute with the
     *   same qualified name.  And certain methods must operate on only
     *   the first attribute with such a name.  So for these methods, an
     *   inefficient array-like data structure would be easier to
     *   implement.
     *
     * - The attributes[] array is live, not a snapshot, so changes to the
     *   attributes must be immediately visible through existing arrays.
     *
     * - When attributes are queried and set through IDL properties
     *   (instead of the get/setAttributes() method or the attributes[]
     *   array) they may be subject to type conversions, URL
     *   normalization, etc., so some extra processing is required in that
     *   case.
     *
     * - But access through IDL properties is probably the most common
     *   case, so we'd like that to be as fast as possible.
     *
     * - We can't just store attribute values in their parsed idl form,
     *   because setAttribute() has to return whatever string is passed to
     *   getAttribute even if it is not a legal, parseable value. So
     *   attribute values must be stored in unparsed string form.
     *
     * - We need to be able to send change notifications or mutation
     *   events of some sort to the renderer whenever an attribute value
     *   changes, regardless of the way in which it changes.
     *
     * - Some attributes, such as id and class affect other parts of the
     *   DOM API, like getElementById and getElementsByClassName and so
     *   for efficiency, we need to specially track changes to these
     *   special attributes.
     *
     * - Some attributes like class have different names (className) when
     *   reflected.
     *
     * - Attributes whose names begin with the string 'data-' are treated
       specially.
     *
     * - Reflected attributes that have a boolean type in IDL have special
     *   behavior: setting them to false (in IDL) is the same as removing
     *   them with removeAttribute()
     *
     * - numeric attributes (like HTMLElement.tabIndex) can have default
     *   values that must be returned by the idl getter even if the
     *   content attribute does not exist. (The default tabIndex value
     *   actually varies based on the type of the element, so that is a
     *   tricky one).
     *
     * See
     * http://www.whatwg.org/specs/web-apps/current-work/multipage/urls.html#reflect
     * for rules on how attributes are reflected.
     *
     */
    getAttribute: {
      value: function getAttribute(qname) {
        var attr = this.getAttributeNode(qname);
        return attr ? attr.value : null;
      }
    },
    getAttributeNS: {
      value: function getAttributeNS(ns, lname) {
        var attr = this.getAttributeNodeNS(ns, lname);
        return attr ? attr.value : null;
      }
    },
    getAttributeNode: {
      value: function getAttributeNode(qname) {
        qname = String(qname);
        if (/[A-Z]/.test(qname) && this.isHTML) qname = utils2.toASCIILowerCase(qname);
        var attr = this._attrsByQName[qname];
        if (!attr) return null;
        if (Array.isArray(attr))
          attr = attr[0];
        return attr;
      }
    },
    getAttributeNodeNS: {
      value: function getAttributeNodeNS(ns, lname) {
        ns = ns === void 0 || ns === null ? "" : String(ns);
        lname = String(lname);
        var attr = this._attrsByLName[ns + "|" + lname];
        return attr ? attr : null;
      }
    },
    hasAttribute: {
      value: function hasAttribute(qname) {
        qname = String(qname);
        if (/[A-Z]/.test(qname) && this.isHTML) qname = utils2.toASCIILowerCase(qname);
        return this._attrsByQName[qname] !== void 0;
      }
    },
    hasAttributeNS: {
      value: function hasAttributeNS(ns, lname) {
        ns = ns === void 0 || ns === null ? "" : String(ns);
        lname = String(lname);
        var key = ns + "|" + lname;
        return this._attrsByLName[key] !== void 0;
      }
    },
    hasAttributes: {
      value: function hasAttributes() {
        return this._numattrs > 0;
      }
    },
    toggleAttribute: {
      value: function toggleAttribute(qname, force) {
        qname = String(qname);
        if (!xml.isValidName(qname)) utils2.InvalidCharacterError();
        if (/[A-Z]/.test(qname) && this.isHTML) qname = utils2.toASCIILowerCase(qname);
        var a = this._attrsByQName[qname];
        if (a === void 0) {
          if (force === void 0 || force === true) {
            this._setAttribute(qname, "");
            return true;
          }
          return false;
        } else {
          if (force === void 0 || force === false) {
            this.removeAttribute(qname);
            return false;
          }
          return true;
        }
      }
    },
    // Set the attribute without error checking. The parser uses this.
    _setAttribute: {
      value: function _setAttribute(qname, value) {
        var attr = this._attrsByQName[qname];
        var isnew;
        if (!attr) {
          attr = this._newattr(qname);
          isnew = true;
        } else {
          if (Array.isArray(attr)) attr = attr[0];
        }
        attr.value = value;
        if (this._attributes) this._attributes[qname] = attr;
        if (isnew && this._newattrhook) this._newattrhook(qname, value);
      }
    },
    // Check for errors, and then set the attribute
    setAttribute: {
      value: function setAttribute(qname, value) {
        qname = String(qname);
        if (!xml.isValidName(qname)) utils2.InvalidCharacterError();
        if (/[A-Z]/.test(qname) && this.isHTML) qname = utils2.toASCIILowerCase(qname);
        this._setAttribute(qname, String(value));
      }
    },
    // The version with no error checking used by the parser
    _setAttributeNS: {
      value: function _setAttributeNS(ns, qname, value) {
        var pos = qname.indexOf(":"), prefix, lname;
        if (pos < 0) {
          prefix = null;
          lname = qname;
        } else {
          prefix = qname.substring(0, pos);
          lname = qname.substring(pos + 1);
        }
        if (ns === "" || ns === void 0) ns = null;
        var key = (ns === null ? "" : ns) + "|" + lname;
        var attr = this._attrsByLName[key];
        var isnew;
        if (!attr) {
          attr = new Attr(this, lname, prefix, ns);
          isnew = true;
          this._attrsByLName[key] = attr;
          if (this._attributes) {
            this._attributes[this._attrKeys.length] = attr;
          }
          this._attrKeys.push(key);
          this._addQName(attr);
        }
        attr.value = value;
        if (isnew && this._newattrhook) this._newattrhook(qname, value);
      }
    },
    // Do error checking then call _setAttributeNS
    setAttributeNS: {
      value: function setAttributeNS(ns, qname, value) {
        ns = ns === null || ns === void 0 || ns === "" ? null : String(ns);
        qname = String(qname);
        if (!xml.isValidQName(qname)) utils2.InvalidCharacterError();
        var pos = qname.indexOf(":");
        var prefix = pos < 0 ? null : qname.substring(0, pos);
        if (prefix !== null && ns === null || prefix === "xml" && ns !== NAMESPACE.XML || (qname === "xmlns" || prefix === "xmlns") && ns !== NAMESPACE.XMLNS || ns === NAMESPACE.XMLNS && !(qname === "xmlns" || prefix === "xmlns")) utils2.NamespaceError();
        this._setAttributeNS(ns, qname, String(value));
      }
    },
    setAttributeNode: {
      value: function setAttributeNode(attr) {
        if (attr.ownerElement !== null && attr.ownerElement !== this) {
          utils2.InUseAttributeError();
        }
        var result = null;
        var oldAttrs = this._attrsByQName[attr.name];
        if (oldAttrs) {
          if (!Array.isArray(oldAttrs)) {
            oldAttrs = [oldAttrs];
          }
          if (oldAttrs.some(function(a) {
            return a === attr;
          })) {
            return attr;
          } else if (attr.ownerElement !== null) {
            utils2.InUseAttributeError();
          }
          oldAttrs.forEach(function(a) {
            this.removeAttributeNode(a);
          }, this);
          result = oldAttrs[0];
        }
        this.setAttributeNodeNS(attr);
        return result;
      }
    },
    setAttributeNodeNS: {
      value: function setAttributeNodeNS(attr) {
        if (attr.ownerElement !== null) {
          utils2.InUseAttributeError();
        }
        var ns = attr.namespaceURI;
        var key = (ns === null ? "" : ns) + "|" + attr.localName;
        var oldAttr = this._attrsByLName[key];
        if (oldAttr) {
          this.removeAttributeNode(oldAttr);
        }
        attr._setOwnerElement(this);
        this._attrsByLName[key] = attr;
        if (this._attributes) {
          this._attributes[this._attrKeys.length] = attr;
        }
        this._attrKeys.push(key);
        this._addQName(attr);
        if (this._newattrhook) this._newattrhook(attr.name, attr.value);
        return oldAttr || null;
      }
    },
    removeAttribute: {
      value: function removeAttribute(qname) {
        qname = String(qname);
        if (/[A-Z]/.test(qname) && this.isHTML) qname = utils2.toASCIILowerCase(qname);
        var attr = this._attrsByQName[qname];
        if (!attr) return;
        if (Array.isArray(attr)) {
          if (attr.length > 2) {
            attr = attr.shift();
          } else {
            this._attrsByQName[qname] = attr[1];
            attr = attr[0];
          }
        } else {
          this._attrsByQName[qname] = void 0;
        }
        var ns = attr.namespaceURI;
        var key = (ns === null ? "" : ns) + "|" + attr.localName;
        this._attrsByLName[key] = void 0;
        var i = this._attrKeys.indexOf(key);
        if (this._attributes) {
          Array.prototype.splice.call(this._attributes, i, 1);
          this._attributes[qname] = void 0;
        }
        this._attrKeys.splice(i, 1);
        var onchange = attr.onchange;
        attr._setOwnerElement(null);
        if (onchange) {
          onchange.call(attr, this, attr.localName, attr.value, null);
        }
        if (this.rooted) this.ownerDocument.mutateRemoveAttr(attr);
      }
    },
    removeAttributeNS: {
      value: function removeAttributeNS(ns, lname) {
        ns = ns === void 0 || ns === null ? "" : String(ns);
        lname = String(lname);
        var key = ns + "|" + lname;
        var attr = this._attrsByLName[key];
        if (!attr) return;
        this._attrsByLName[key] = void 0;
        var i = this._attrKeys.indexOf(key);
        if (this._attributes) {
          Array.prototype.splice.call(this._attributes, i, 1);
        }
        this._attrKeys.splice(i, 1);
        this._removeQName(attr);
        var onchange = attr.onchange;
        attr._setOwnerElement(null);
        if (onchange) {
          onchange.call(attr, this, attr.localName, attr.value, null);
        }
        if (this.rooted) this.ownerDocument.mutateRemoveAttr(attr);
      }
    },
    removeAttributeNode: {
      value: function removeAttributeNode(attr) {
        var ns = attr.namespaceURI;
        var key = (ns === null ? "" : ns) + "|" + attr.localName;
        if (this._attrsByLName[key] !== attr) {
          utils2.NotFoundError();
        }
        this.removeAttributeNS(ns, attr.localName);
        return attr;
      }
    },
    getAttributeNames: {
      value: function getAttributeNames() {
        var elt = this;
        return this._attrKeys.map(function(key) {
          return elt._attrsByLName[key].name;
        });
      }
    },
    // This 'raw' version of getAttribute is used by the getter functions
    // of reflected attributes. It skips some error checking and
    // namespace steps
    _getattr: {
      value: function _getattr(qname) {
        var attr = this._attrsByQName[qname];
        return attr ? attr.value : null;
      }
    },
    // The raw version of setAttribute for reflected idl attributes.
    _setattr: {
      value: function _setattr(qname, value) {
        var attr = this._attrsByQName[qname];
        var isnew;
        if (!attr) {
          attr = this._newattr(qname);
          isnew = true;
        }
        attr.value = String(value);
        if (this._attributes) this._attributes[qname] = attr;
        if (isnew && this._newattrhook) this._newattrhook(qname, value);
      }
    },
    // Create a new Attr object, insert it, and return it.
    // Used by setAttribute() and by set()
    _newattr: {
      value: function _newattr(qname) {
        var attr = new Attr(this, qname, null, null);
        var key = "|" + qname;
        this._attrsByQName[qname] = attr;
        this._attrsByLName[key] = attr;
        if (this._attributes) {
          this._attributes[this._attrKeys.length] = attr;
        }
        this._attrKeys.push(key);
        return attr;
      }
    },
    // Add a qname->Attr mapping to the _attrsByQName object, taking into
    // account that there may be more than one attr object with the
    // same qname
    _addQName: {
      value: function(attr) {
        var qname = attr.name;
        var existing = this._attrsByQName[qname];
        if (!existing) {
          this._attrsByQName[qname] = attr;
        } else if (Array.isArray(existing)) {
          existing.push(attr);
        } else {
          this._attrsByQName[qname] = [existing, attr];
        }
        if (this._attributes) this._attributes[qname] = attr;
      }
    },
    // Remove a qname->Attr mapping to the _attrsByQName object, taking into
    // account that there may be more than one attr object with the
    // same qname
    _removeQName: {
      value: function(attr) {
        var qname = attr.name;
        var target = this._attrsByQName[qname];
        if (Array.isArray(target)) {
          var idx = target.indexOf(attr);
          utils2.assert(idx !== -1);
          if (target.length === 2) {
            this._attrsByQName[qname] = target[1 - idx];
            if (this._attributes) {
              this._attributes[qname] = this._attrsByQName[qname];
            }
          } else {
            target.splice(idx, 1);
            if (this._attributes && this._attributes[qname] === attr) {
              this._attributes[qname] = target[0];
            }
          }
        } else {
          utils2.assert(target === attr);
          this._attrsByQName[qname] = void 0;
          if (this._attributes) {
            this._attributes[qname] = void 0;
          }
        }
      }
    },
    // Return the number of attributes
    _numattrs: {
      get: function() {
        return this._attrKeys.length;
      }
    },
    // Return the nth Attr object
    _attr: {
      value: function(n) {
        return this._attrsByLName[this._attrKeys[n]];
      }
    },
    // Define getters and setters for an 'id' property that reflects
    // the content attribute 'id'.
    id: attributes2.property({
      name: "id"
    }),
    // Define getters and setters for a 'className' property that reflects
    // the content attribute 'class'.
    className: attributes2.property({
      name: "class"
    }),
    classList: {
      get: function() {
        var self = this;
        if (this._classList) {
          return this._classList;
        }
        var dtlist = new DOMTokenList(function() {
          return self.className || "";
        }, function(v) {
          self.className = v;
        });
        this._classList = dtlist;
        return dtlist;
      },
      set: function(v) {
        this.className = v;
      }
    },
    matches: {
      value: function(selector) {
        return select2.matches(this, selector);
      }
    },
    closest: {
      value: function(selector) {
        var el = this;
        do {
          if (el.matches && el.matches(selector)) {
            return el;
          }
          el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === Node.ELEMENT_NODE);
        return null;
      }
    },
    querySelector: {
      value: function(selector) {
        return select2(selector, this)[0];
      }
    },
    querySelectorAll: {
      value: function(selector) {
        var nodes = select2(selector, this);
        return nodes.item ? nodes : new NodeList(nodes);
      }
    }
  });
  Object.defineProperties(Element.prototype, ChildNode);
  Object.defineProperties(Element.prototype, NonDocumentTypeChildNode);
  attributes2.registerChangeHandler(Element, "id", function(element, lname, oldval, newval) {
    if (element.rooted) {
      if (oldval) {
        element.ownerDocument.delId(oldval, element);
      }
      if (newval) {
        element.ownerDocument.addId(newval, element);
      }
    }
  });
  attributes2.registerChangeHandler(Element, "class", function(element, lname, oldval, newval) {
    if (element._classList) {
      element._classList._update();
    }
  });
  function Attr(elt, lname, prefix, namespace, value) {
    this.localName = lname;
    this.prefix = prefix === null || prefix === "" ? null : "" + prefix;
    this.namespaceURI = namespace === null || namespace === "" ? null : "" + namespace;
    this.data = value;
    this._setOwnerElement(elt);
  }
  Attr.prototype = Object.create(Object.prototype, {
    ownerElement: {
      get: function() {
        return this._ownerElement;
      }
    },
    _setOwnerElement: {
      value: function _setOwnerElement(elt) {
        this._ownerElement = elt;
        if (this.prefix === null && this.namespaceURI === null && elt) {
          this.onchange = elt._attributeChangeHandlers[this.localName];
        } else {
          this.onchange = null;
        }
      }
    },
    name: {
      get: function() {
        return this.prefix ? this.prefix + ":" + this.localName : this.localName;
      }
    },
    specified: {
      get: function() {
        return true;
      }
    },
    value: {
      get: function() {
        return this.data;
      },
      set: function(value) {
        var oldval = this.data;
        value = value === void 0 ? "" : value + "";
        if (value === oldval) return;
        this.data = value;
        if (this.ownerElement) {
          if (this.onchange) this.onchange(this.ownerElement, this.localName, oldval, value);
          if (this.ownerElement.rooted) this.ownerElement.ownerDocument.mutateAttr(this, oldval);
        }
      }
    },
    cloneNode: {
      value: function cloneNode(deep) {
        return new Attr(null, this.localName, this.prefix, this.namespaceURI, this.data);
      }
    },
    // Legacy aliases (see gh#70 and https://dom.spec.whatwg.org/#interface-attr)
    nodeType: {
      get: function() {
        return Node.ATTRIBUTE_NODE;
      }
    },
    nodeName: {
      get: function() {
        return this.name;
      }
    },
    nodeValue: {
      get: function() {
        return this.value;
      },
      set: function(v) {
        this.value = v;
      }
    },
    textContent: {
      get: function() {
        return this.value;
      },
      set: function(v) {
        if (v === null || v === void 0) {
          v = "";
        }
        this.value = v;
      }
    },
    innerText: {
      get: function() {
        return this.value;
      },
      set: function(v) {
        if (v === null || v === void 0) {
          v = "";
        }
        this.value = v;
      }
    }
  });
  Element._Attr = Attr;
  function AttributesArray(elt) {
    NamedNodeMap.call(this, elt);
    for (var name in elt._attrsByQName) {
      this[name] = elt._attrsByQName[name];
    }
    for (var i = 0; i < elt._attrKeys.length; i++) {
      this[i] = elt._attrsByLName[elt._attrKeys[i]];
    }
  }
  AttributesArray.prototype = Object.create(NamedNodeMap.prototype, {
    length: {
      get: function() {
        return this.element._attrKeys.length;
      },
      set: function() {
      }
    },
    item: {
      value: function(n) {
        n = n >>> 0;
        if (n >= this.length) {
          return null;
        }
        return this.element._attrsByLName[this.element._attrKeys[n]];
      }
    }
  });
  if (globalThis.Symbol?.iterator) {
    AttributesArray.prototype[globalThis.Symbol.iterator] = function() {
      var i = 0, n = this.length, self = this;
      return {
        next: function() {
          if (i < n) return {
            value: self.item(i++)
          };
          return {
            done: true
          };
        }
      };
    };
  }
  function ChildrenCollection(e) {
    this.element = e;
    this.updateCache();
  }
  ChildrenCollection.prototype = Object.create(Object.prototype, {
    length: {
      get: function() {
        this.updateCache();
        return this.childrenByNumber.length;
      }
    },
    item: {
      value: function item(n) {
        this.updateCache();
        return this.childrenByNumber[n] || null;
      }
    },
    namedItem: {
      value: function namedItem(name) {
        this.updateCache();
        return this.childrenByName[name] || null;
      }
    },
    // This attribute returns the entire name->element map.
    // It is not part of the HTMLCollection API, but we need it in
    // src/HTMLCollectionProxy
    namedItems: {
      get: function() {
        this.updateCache();
        return this.childrenByName;
      }
    },
    updateCache: {
      value: function updateCache() {
        var namedElts = /^(a|applet|area|embed|form|frame|frameset|iframe|img|object)$/;
        if (this.lastModTime !== this.element.lastModTime) {
          this.lastModTime = this.element.lastModTime;
          var n = this.childrenByNumber && this.childrenByNumber.length || 0;
          for (var i = 0; i < n; i++) {
            this[i] = void 0;
          }
          this.childrenByNumber = [];
          this.childrenByName = /* @__PURE__ */ Object.create(null);
          for (var c = this.element.firstChild; c !== null; c = c.nextSibling) {
            if (c.nodeType === Node.ELEMENT_NODE) {
              this[this.childrenByNumber.length] = c;
              this.childrenByNumber.push(c);
              var id = c.getAttribute("id");
              if (id && !this.childrenByName[id]) this.childrenByName[id] = c;
              var name = c.getAttribute("name");
              if (name && this.element.namespaceURI === NAMESPACE.HTML && namedElts.test(this.element.localName) && !this.childrenByName[name]) this.childrenByName[id] = c;
            }
          }
        }
      }
    }
  });
  function localNameElementFilter(lname) {
    return function(e) {
      return e.localName === lname;
    };
  }
  function htmlLocalNameElementFilter(lname) {
    var lclname = utils2.toASCIILowerCase(lname);
    if (lclname === lname) return localNameElementFilter(lname);
    return function(e) {
      return e.isHTML ? e.localName === lclname : e.localName === lname;
    };
  }
  function namespaceElementFilter(ns) {
    return function(e) {
      return e.namespaceURI === ns;
    };
  }
  function namespaceLocalNameElementFilter(ns, lname) {
    return function(e) {
      return e.namespaceURI === ns && e.localName === lname;
    };
  }
  function classNamesElementFilter(names) {
    return function(e) {
      return names.every(function(n) {
        return e.classList.contains(n);
      });
    };
  }
  function elementNameFilter(name) {
    return function(e) {
      if (e.namespaceURI !== NAMESPACE.HTML) {
        return false;
      }
      return e.getAttribute("name") === name;
    };
  }
  return Element_1;
}
var Leaf_1;
var hasRequiredLeaf;
function requireLeaf() {
  if (hasRequiredLeaf) return Leaf_1;
  hasRequiredLeaf = 1;
  Leaf_1 = Leaf;
  var Node = requireNode();
  var NodeList = requireNodeList();
  var utils2 = requireUtils();
  var HierarchyRequestError = utils2.HierarchyRequestError;
  var NotFoundError = utils2.NotFoundError;
  function Leaf() {
    Node.call(this);
  }
  Leaf.prototype = Object.create(Node.prototype, {
    hasChildNodes: {
      value: function() {
        return false;
      }
    },
    firstChild: {
      value: null
    },
    lastChild: {
      value: null
    },
    insertBefore: {
      value: function(node, child) {
        if (!node.nodeType) throw new TypeError("not a node");
        HierarchyRequestError();
      }
    },
    replaceChild: {
      value: function(node, child) {
        if (!node.nodeType) throw new TypeError("not a node");
        HierarchyRequestError();
      }
    },
    removeChild: {
      value: function(node) {
        if (!node.nodeType) throw new TypeError("not a node");
        NotFoundError();
      }
    },
    removeChildren: {
      value: function() {
      }
    },
    childNodes: {
      get: function() {
        if (!this._childNodes) this._childNodes = new NodeList();
        return this._childNodes;
      }
    }
  });
  return Leaf_1;
}
var CharacterData_1;
var hasRequiredCharacterData;
function requireCharacterData() {
  if (hasRequiredCharacterData) return CharacterData_1;
  hasRequiredCharacterData = 1;
  CharacterData_1 = CharacterData;
  var Leaf = requireLeaf();
  var utils2 = requireUtils();
  var ChildNode = requireChildNode();
  var NonDocumentTypeChildNode = requireNonDocumentTypeChildNode();
  function CharacterData() {
    Leaf.call(this);
  }
  CharacterData.prototype = Object.create(Leaf.prototype, {
    // DOMString substringData(unsigned long offset,
    //               unsigned long count);
    // The substringData(offset, count) method must run these steps:
    //
    //     If offset is greater than the context object's
    //     length, throw an INDEX_SIZE_ERR exception and
    //     terminate these steps.
    //
    //     If offset+count is greater than the context
    //     object's length, return a DOMString whose value is
    //     the UTF-16 code units from the offsetth UTF-16 code
    //     unit to the end of data.
    //
    //     Return a DOMString whose value is the UTF-16 code
    //     units from the offsetth UTF-16 code unit to the
    //     offset+countth UTF-16 code unit in data.
    substringData: {
      value: function substringData(offset, count) {
        if (arguments.length < 2) {
          throw new TypeError("Not enough arguments");
        }
        offset = offset >>> 0;
        count = count >>> 0;
        if (offset > this.data.length || offset < 0 || count < 0) {
          utils2.IndexSizeError();
        }
        return this.data.substring(offset, offset + count);
      }
    },
    // void appendData(DOMString data);
    // The appendData(data) method must append data to the context
    // object's data.
    appendData: {
      value: function appendData(data) {
        if (arguments.length < 1) {
          throw new TypeError("Not enough arguments");
        }
        this.data += String(data);
      }
    },
    // void insertData(unsigned long offset, DOMString data);
    // The insertData(offset, data) method must run these steps:
    //
    //     If offset is greater than the context object's
    //     length, throw an INDEX_SIZE_ERR exception and
    //     terminate these steps.
    //
    //     Insert data into the context object's data after
    //     offset UTF-16 code units.
    //
    insertData: {
      value: function insertData(offset, data) {
        return this.replaceData(offset, 0, data);
      }
    },
    // void deleteData(unsigned long offset, unsigned long count);
    // The deleteData(offset, count) method must run these steps:
    //
    //     If offset is greater than the context object's
    //     length, throw an INDEX_SIZE_ERR exception and
    //     terminate these steps.
    //
    //     If offset+count is greater than the context
    //     object's length var count be length-offset.
    //
    //     Starting from offset UTF-16 code units remove count
    //     UTF-16 code units from the context object's data.
    deleteData: {
      value: function deleteData(offset, count) {
        return this.replaceData(offset, count, "");
      }
    },
    // void replaceData(unsigned long offset, unsigned long count,
    //          DOMString data);
    //
    // The replaceData(offset, count, data) method must act as
    // if the deleteData() method is invoked with offset and
    // count as arguments followed by the insertData() method
    // with offset and data as arguments and re-throw any
    // exceptions these methods might have thrown.
    replaceData: {
      value: function replaceData(offset, count, data) {
        var curtext = this.data, len = curtext.length;
        offset = offset >>> 0;
        count = count >>> 0;
        data = String(data);
        if (offset > len || offset < 0) utils2.IndexSizeError();
        if (offset + count > len) count = len - offset;
        var prefix = curtext.substring(0, offset), suffix = curtext.substring(offset + count);
        this.data = prefix + data + suffix;
      }
    },
    // Utility method that Node.isEqualNode() calls to test Text and
    // Comment nodes for equality.  It is okay to put it here, since
    // Node will have already verified that nodeType is equal
    isEqual: {
      value: function isEqual(n) {
        return this._data === n._data;
      }
    },
    length: {
      get: function() {
        return this.data.length;
      }
    }
  });
  Object.defineProperties(CharacterData.prototype, ChildNode);
  Object.defineProperties(CharacterData.prototype, NonDocumentTypeChildNode);
  return CharacterData_1;
}
var Text_1;
var hasRequiredText;
function requireText() {
  if (hasRequiredText) return Text_1;
  hasRequiredText = 1;
  Text_1 = Text;
  var utils2 = requireUtils();
  var Node = requireNode();
  var CharacterData = requireCharacterData();
  function Text(doc, data) {
    CharacterData.call(this);
    this.nodeType = Node.TEXT_NODE;
    this.ownerDocument = doc;
    this._data = data;
    this._index = void 0;
  }
  var nodeValue = {
    get: function() {
      return this._data;
    },
    set: function(v) {
      if (v === null || v === void 0) {
        v = "";
      } else {
        v = String(v);
      }
      if (v === this._data) return;
      this._data = v;
      if (this.rooted) this.ownerDocument.mutateValue(this);
      if (this.parentNode && this.parentNode._textchangehook) this.parentNode._textchangehook(this);
    }
  };
  Text.prototype = Object.create(CharacterData.prototype, {
    nodeName: {
      value: "#text"
    },
    // These three attributes are all the same.
    // The data attribute has a [TreatNullAs=EmptyString] but we'll
    // implement that at the interface level
    nodeValue,
    textContent: nodeValue,
    innerText: nodeValue,
    data: {
      get: nodeValue.get,
      set: function(v) {
        nodeValue.set.call(this, v === null ? "" : String(v));
      }
    },
    splitText: {
      value: function splitText(offset) {
        if (offset > this._data.length || offset < 0) utils2.IndexSizeError();
        var newdata = this._data.substring(offset), newnode = this.ownerDocument.createTextNode(newdata);
        this.data = this.data.substring(0, offset);
        var parent = this.parentNode;
        if (parent !== null) parent.insertBefore(newnode, this.nextSibling);
        return newnode;
      }
    },
    wholeText: {
      get: function wholeText() {
        var result = this.textContent;
        for (var next = this.nextSibling; next; next = next.nextSibling) {
          if (next.nodeType !== Node.TEXT_NODE) {
            break;
          }
          result += next.textContent;
        }
        return result;
      }
    },
    // Obsolete, removed from spec.
    replaceWholeText: {
      value: utils2.nyi
    },
    // Utility methods
    clone: {
      value: function clone() {
        return new Text(this.ownerDocument, this._data);
      }
    }
  });
  return Text_1;
}
var Comment_1;
var hasRequiredComment;
function requireComment() {
  if (hasRequiredComment) return Comment_1;
  hasRequiredComment = 1;
  Comment_1 = Comment;
  var Node = requireNode();
  var CharacterData = requireCharacterData();
  function Comment(doc, data) {
    CharacterData.call(this);
    this.nodeType = Node.COMMENT_NODE;
    this.ownerDocument = doc;
    this._data = data;
  }
  var nodeValue = {
    get: function() {
      return this._data;
    },
    set: function(v) {
      if (v === null || v === void 0) {
        v = "";
      } else {
        v = String(v);
      }
      this._data = v;
      if (this.rooted) this.ownerDocument.mutateValue(this);
    }
  };
  Comment.prototype = Object.create(CharacterData.prototype, {
    nodeName: {
      value: "#comment"
    },
    nodeValue,
    textContent: nodeValue,
    innerText: nodeValue,
    data: {
      get: nodeValue.get,
      set: function(v) {
        nodeValue.set.call(this, v === null ? "" : String(v));
      }
    },
    // Utility methods
    clone: {
      value: function clone() {
        return new Comment(this.ownerDocument, this._data);
      }
    }
  });
  return Comment_1;
}
var DocumentFragment_1;
var hasRequiredDocumentFragment;
function requireDocumentFragment() {
  if (hasRequiredDocumentFragment) return DocumentFragment_1;
  hasRequiredDocumentFragment = 1;
  DocumentFragment_1 = DocumentFragment;
  var Node = requireNode();
  var NodeList = requireNodeList();
  var ContainerNode = requireContainerNode();
  var Element = requireElement();
  var select2 = requireSelect();
  var utils2 = requireUtils();
  function DocumentFragment(doc) {
    ContainerNode.call(this);
    this.nodeType = Node.DOCUMENT_FRAGMENT_NODE;
    this.ownerDocument = doc;
  }
  DocumentFragment.prototype = Object.create(ContainerNode.prototype, {
    nodeName: {
      value: "#document-fragment"
    },
    nodeValue: {
      get: function() {
        return null;
      },
      set: function() {
      }
    },
    // Copy the text content getter/setter from Element
    textContent: Object.getOwnPropertyDescriptor(Element.prototype, "textContent"),
    // Copy the text content getter/setter from Element
    innerText: Object.getOwnPropertyDescriptor(Element.prototype, "innerText"),
    querySelector: {
      value: function(selector) {
        var nodes = this.querySelectorAll(selector);
        return nodes.length ? nodes[0] : null;
      }
    },
    querySelectorAll: {
      value: function(selector) {
        var context = Object.create(this);
        context.isHTML = true;
        context.getElementsByTagName = Element.prototype.getElementsByTagName;
        context.nextElement = Object.getOwnPropertyDescriptor(Element.prototype, "firstElementChild").get;
        var nodes = select2(selector, context);
        return nodes.item ? nodes : new NodeList(nodes);
      }
    },
    // Utility methods
    clone: {
      value: function clone() {
        return new DocumentFragment(this.ownerDocument);
      }
    },
    isEqual: {
      value: function isEqual(n) {
        return true;
      }
    },
    // Non-standard, but useful (github issue #73)
    innerHTML: {
      get: function() {
        return this.serialize();
      },
      set: utils2.nyi
    },
    outerHTML: {
      get: function() {
        return this.serialize();
      },
      set: utils2.nyi
    }
  });
  return DocumentFragment_1;
}
var ProcessingInstruction_1;
var hasRequiredProcessingInstruction;
function requireProcessingInstruction() {
  if (hasRequiredProcessingInstruction) return ProcessingInstruction_1;
  hasRequiredProcessingInstruction = 1;
  ProcessingInstruction_1 = ProcessingInstruction;
  var Node = requireNode();
  var CharacterData = requireCharacterData();
  function ProcessingInstruction(doc, target, data) {
    CharacterData.call(this);
    this.nodeType = Node.PROCESSING_INSTRUCTION_NODE;
    this.ownerDocument = doc;
    this.target = target;
    this._data = data;
  }
  var nodeValue = {
    get: function() {
      return this._data;
    },
    set: function(v) {
      if (v === null || v === void 0) {
        v = "";
      } else {
        v = String(v);
      }
      this._data = v;
      if (this.rooted) this.ownerDocument.mutateValue(this);
    }
  };
  ProcessingInstruction.prototype = Object.create(CharacterData.prototype, {
    nodeName: {
      get: function() {
        return this.target;
      }
    },
    nodeValue,
    textContent: nodeValue,
    innerText: nodeValue,
    data: {
      get: nodeValue.get,
      set: function(v) {
        nodeValue.set.call(this, v === null ? "" : String(v));
      }
    },
    // Utility methods
    clone: {
      value: function clone() {
        return new ProcessingInstruction(this.ownerDocument, this.target, this._data);
      }
    },
    isEqual: {
      value: function isEqual(n) {
        return this.target === n.target && this._data === n._data;
      }
    }
  });
  return ProcessingInstruction_1;
}
var NodeFilter_1;
var hasRequiredNodeFilter;
function requireNodeFilter() {
  if (hasRequiredNodeFilter) return NodeFilter_1;
  hasRequiredNodeFilter = 1;
  var NodeFilter = {
    // Constants for acceptNode()
    FILTER_ACCEPT: 1,
    FILTER_REJECT: 2,
    FILTER_SKIP: 3,
    // Constants for whatToShow
    SHOW_ALL: 4294967295,
    SHOW_ELEMENT: 1,
    SHOW_ATTRIBUTE: 2,
    // historical
    SHOW_TEXT: 4,
    SHOW_CDATA_SECTION: 8,
    // historical
    SHOW_ENTITY_REFERENCE: 16,
    // historical
    SHOW_ENTITY: 32,
    // historical
    SHOW_PROCESSING_INSTRUCTION: 64,
    SHOW_COMMENT: 128,
    SHOW_DOCUMENT: 256,
    SHOW_DOCUMENT_TYPE: 512,
    SHOW_DOCUMENT_FRAGMENT: 1024,
    SHOW_NOTATION: 2048
    // historical
  };
  NodeFilter_1 = NodeFilter.constructor = NodeFilter.prototype = NodeFilter;
  return NodeFilter_1;
}
var NodeTraversal = {
  exports: {}
};
var hasRequiredNodeTraversal;
function requireNodeTraversal() {
  if (hasRequiredNodeTraversal) return NodeTraversal.exports;
  hasRequiredNodeTraversal = 1;
  NodeTraversal.exports = {
    nextSkippingChildren,
    nextAncestorSibling,
    next,
    previous,
    deepLastChild
  };
  function nextSkippingChildren(node, stayWithin) {
    if (node === stayWithin) {
      return null;
    }
    if (node.nextSibling !== null) {
      return node.nextSibling;
    }
    return nextAncestorSibling(node, stayWithin);
  }
  function nextAncestorSibling(node, stayWithin) {
    for (node = node.parentNode; node !== null; node = node.parentNode) {
      if (node === stayWithin) {
        return null;
      }
      if (node.nextSibling !== null) {
        return node.nextSibling;
      }
    }
    return null;
  }
  function next(node, stayWithin) {
    var n;
    n = node.firstChild;
    if (n !== null) {
      return n;
    }
    if (node === stayWithin) {
      return null;
    }
    n = node.nextSibling;
    if (n !== null) {
      return n;
    }
    return nextAncestorSibling(node, stayWithin);
  }
  function deepLastChild(node) {
    while (node.lastChild) {
      node = node.lastChild;
    }
    return node;
  }
  function previous(node, stayWithin) {
    var p;
    p = node.previousSibling;
    if (p !== null) {
      return deepLastChild(p);
    }
    p = node.parentNode;
    if (p === stayWithin) {
      return null;
    }
    return p;
  }
  return NodeTraversal.exports;
}
var TreeWalker_1;
var hasRequiredTreeWalker;
function requireTreeWalker() {
  if (hasRequiredTreeWalker) return TreeWalker_1;
  hasRequiredTreeWalker = 1;
  TreeWalker_1 = TreeWalker;
  var Node = requireNode();
  var NodeFilter = requireNodeFilter();
  var NodeTraversal2 = requireNodeTraversal();
  var utils2 = requireUtils();
  var mapChild = {
    first: "firstChild",
    last: "lastChild",
    next: "firstChild",
    previous: "lastChild"
  };
  var mapSibling = {
    first: "nextSibling",
    last: "previousSibling",
    next: "nextSibling",
    previous: "previousSibling"
  };
  function traverseChildren(tw, type) {
    var child, node, parent, result, sibling;
    node = tw._currentNode[mapChild[type]];
    while (node !== null) {
      result = tw._internalFilter(node);
      if (result === NodeFilter.FILTER_ACCEPT) {
        tw._currentNode = node;
        return node;
      }
      if (result === NodeFilter.FILTER_SKIP) {
        child = node[mapChild[type]];
        if (child !== null) {
          node = child;
          continue;
        }
      }
      while (node !== null) {
        sibling = node[mapSibling[type]];
        if (sibling !== null) {
          node = sibling;
          break;
        }
        parent = node.parentNode;
        if (parent === null || parent === tw.root || parent === tw._currentNode) {
          return null;
        } else {
          node = parent;
        }
      }
    }
    return null;
  }
  function traverseSiblings(tw, type) {
    var node, result, sibling;
    node = tw._currentNode;
    if (node === tw.root) {
      return null;
    }
    while (true) {
      sibling = node[mapSibling[type]];
      while (sibling !== null) {
        node = sibling;
        result = tw._internalFilter(node);
        if (result === NodeFilter.FILTER_ACCEPT) {
          tw._currentNode = node;
          return node;
        }
        sibling = node[mapChild[type]];
        if (result === NodeFilter.FILTER_REJECT || sibling === null) {
          sibling = node[mapSibling[type]];
        }
      }
      node = node.parentNode;
      if (node === null || node === tw.root) {
        return null;
      }
      if (tw._internalFilter(node) === NodeFilter.FILTER_ACCEPT) {
        return null;
      }
    }
  }
  function TreeWalker(root, whatToShow, filter) {
    if (!root || !root.nodeType) {
      utils2.NotSupportedError();
    }
    this._root = root;
    this._whatToShow = Number(whatToShow) || 0;
    this._filter = filter || null;
    this._active = false;
    this._currentNode = root;
  }
  Object.defineProperties(TreeWalker.prototype, {
    root: {
      get: function() {
        return this._root;
      }
    },
    whatToShow: {
      get: function() {
        return this._whatToShow;
      }
    },
    filter: {
      get: function() {
        return this._filter;
      }
    },
    currentNode: {
      get: function currentNode() {
        return this._currentNode;
      },
      set: function setCurrentNode(v) {
        if (!(v instanceof Node)) {
          throw new TypeError("Not a Node");
        }
        this._currentNode = v;
      }
    },
    /**
     * @method
     * @param {Node} node
     * @return {Number} Constant NodeFilter.FILTER_ACCEPT,
     *  NodeFilter.FILTER_REJECT or NodeFilter.FILTER_SKIP.
     */
    _internalFilter: {
      value: function _internalFilter(node) {
        var result, filter;
        if (this._active) {
          utils2.InvalidStateError();
        }
        if (!(1 << node.nodeType - 1 & this._whatToShow)) {
          return NodeFilter.FILTER_SKIP;
        }
        filter = this._filter;
        if (filter === null) {
          result = NodeFilter.FILTER_ACCEPT;
        } else {
          this._active = true;
          try {
            if (typeof filter === "function") {
              result = filter(node);
            } else {
              result = filter.acceptNode(node);
            }
          } finally {
            this._active = false;
          }
        }
        return +result;
      }
    },
    /**
     * @spec https://dom.spec.whatwg.org/#dom-treewalker-parentnode
     * @based on WebKit's TreeWalker::parentNode
     * https://trac.webkit.org/browser/webkit/trunk/Source/WebCore/dom/TreeWalker.cpp?rev=220453#L50
     * @method
     * @return {Node|null}
     */
    parentNode: {
      value: function parentNode() {
        var node = this._currentNode;
        while (node !== this.root) {
          node = node.parentNode;
          if (node === null) {
            return null;
          }
          if (this._internalFilter(node) === NodeFilter.FILTER_ACCEPT) {
            this._currentNode = node;
            return node;
          }
        }
        return null;
      }
    },
    /**
     * @spec https://dom.spec.whatwg.org/#dom-treewalker-firstchild
     * @method
     * @return {Node|null}
     */
    firstChild: {
      value: function firstChild() {
        return traverseChildren(this, "first");
      }
    },
    /**
     * @spec https://dom.spec.whatwg.org/#dom-treewalker-lastchild
     * @method
     * @return {Node|null}
     */
    lastChild: {
      value: function lastChild() {
        return traverseChildren(this, "last");
      }
    },
    /**
     * @spec http://www.w3.org/TR/dom/#dom-treewalker-previoussibling
     * @method
     * @return {Node|null}
     */
    previousSibling: {
      value: function previousSibling() {
        return traverseSiblings(this, "previous");
      }
    },
    /**
     * @spec http://www.w3.org/TR/dom/#dom-treewalker-nextsibling
     * @method
     * @return {Node|null}
     */
    nextSibling: {
      value: function nextSibling() {
        return traverseSiblings(this, "next");
      }
    },
    /**
     * @spec https://dom.spec.whatwg.org/#dom-treewalker-previousnode
     * @based on WebKit's TreeWalker::previousNode
     * https://trac.webkit.org/browser/webkit/trunk/Source/WebCore/dom/TreeWalker.cpp?rev=220453#L181
     * @method
     * @return {Node|null}
     */
    previousNode: {
      value: function previousNode() {
        var node, result, previousSibling, lastChild;
        node = this._currentNode;
        while (node !== this._root) {
          for (previousSibling = node.previousSibling; previousSibling; previousSibling = node.previousSibling) {
            node = previousSibling;
            result = this._internalFilter(node);
            if (result === NodeFilter.FILTER_REJECT) {
              continue;
            }
            for (lastChild = node.lastChild; lastChild; lastChild = node.lastChild) {
              node = lastChild;
              result = this._internalFilter(node);
              if (result === NodeFilter.FILTER_REJECT) {
                break;
              }
            }
            if (result === NodeFilter.FILTER_ACCEPT) {
              this._currentNode = node;
              return node;
            }
          }
          if (node === this.root || node.parentNode === null) {
            return null;
          }
          node = node.parentNode;
          if (this._internalFilter(node) === NodeFilter.FILTER_ACCEPT) {
            this._currentNode = node;
            return node;
          }
        }
        return null;
      }
    },
    /**
     * @spec https://dom.spec.whatwg.org/#dom-treewalker-nextnode
     * @based on WebKit's TreeWalker::nextNode
     * https://trac.webkit.org/browser/webkit/trunk/Source/WebCore/dom/TreeWalker.cpp?rev=220453#L228
     * @method
     * @return {Node|null}
     */
    nextNode: {
      value: function nextNode() {
        var node, result, firstChild, nextSibling;
        node = this._currentNode;
        result = NodeFilter.FILTER_ACCEPT;
        CHILDREN: while (true) {
          for (firstChild = node.firstChild; firstChild; firstChild = node.firstChild) {
            node = firstChild;
            result = this._internalFilter(node);
            if (result === NodeFilter.FILTER_ACCEPT) {
              this._currentNode = node;
              return node;
            } else if (result === NodeFilter.FILTER_REJECT) {
              break;
            }
          }
          for (nextSibling = NodeTraversal2.nextSkippingChildren(node, this.root); nextSibling; nextSibling = NodeTraversal2.nextSkippingChildren(node, this.root)) {
            node = nextSibling;
            result = this._internalFilter(node);
            if (result === NodeFilter.FILTER_ACCEPT) {
              this._currentNode = node;
              return node;
            } else if (result === NodeFilter.FILTER_SKIP) {
              continue CHILDREN;
            }
          }
          return null;
        }
      }
    },
    /** For compatibility with web-platform-tests. */
    toString: {
      value: function toString() {
        return "[object TreeWalker]";
      }
    }
  });
  return TreeWalker_1;
}
var NodeIterator_1;
var hasRequiredNodeIterator;
function requireNodeIterator() {
  if (hasRequiredNodeIterator) return NodeIterator_1;
  hasRequiredNodeIterator = 1;
  NodeIterator_1 = NodeIterator;
  var NodeFilter = requireNodeFilter();
  var NodeTraversal2 = requireNodeTraversal();
  var utils2 = requireUtils();
  function move(node, stayWithin, directionIsNext) {
    if (directionIsNext) {
      return NodeTraversal2.next(node, stayWithin);
    } else {
      if (node === stayWithin) {
        return null;
      }
      return NodeTraversal2.previous(node, null);
    }
  }
  function isInclusiveAncestor(node, possibleChild) {
    for (; possibleChild; possibleChild = possibleChild.parentNode) {
      if (node === possibleChild) {
        return true;
      }
    }
    return false;
  }
  function traverse(ni, directionIsNext) {
    var node, beforeNode;
    node = ni._referenceNode;
    beforeNode = ni._pointerBeforeReferenceNode;
    while (true) {
      if (beforeNode === directionIsNext) {
        beforeNode = !beforeNode;
      } else {
        node = move(node, ni._root, directionIsNext);
        if (node === null) {
          return null;
        }
      }
      var result = ni._internalFilter(node);
      if (result === NodeFilter.FILTER_ACCEPT) {
        break;
      }
    }
    ni._referenceNode = node;
    ni._pointerBeforeReferenceNode = beforeNode;
    return node;
  }
  function NodeIterator(root, whatToShow, filter) {
    if (!root || !root.nodeType) {
      utils2.NotSupportedError();
    }
    this._root = root;
    this._referenceNode = root;
    this._pointerBeforeReferenceNode = true;
    this._whatToShow = Number(whatToShow) || 0;
    this._filter = filter || null;
    this._active = false;
    root.doc._attachNodeIterator(this);
  }
  Object.defineProperties(NodeIterator.prototype, {
    root: {
      get: function root() {
        return this._root;
      }
    },
    referenceNode: {
      get: function referenceNode() {
        return this._referenceNode;
      }
    },
    pointerBeforeReferenceNode: {
      get: function pointerBeforeReferenceNode() {
        return this._pointerBeforeReferenceNode;
      }
    },
    whatToShow: {
      get: function whatToShow() {
        return this._whatToShow;
      }
    },
    filter: {
      get: function filter() {
        return this._filter;
      }
    },
    /**
     * @method
     * @param {Node} node
     * @return {Number} Constant NodeFilter.FILTER_ACCEPT,
     *  NodeFilter.FILTER_REJECT or NodeFilter.FILTER_SKIP.
     */
    _internalFilter: {
      value: function _internalFilter(node) {
        var result, filter;
        if (this._active) {
          utils2.InvalidStateError();
        }
        if (!(1 << node.nodeType - 1 & this._whatToShow)) {
          return NodeFilter.FILTER_SKIP;
        }
        filter = this._filter;
        if (filter === null) {
          result = NodeFilter.FILTER_ACCEPT;
        } else {
          this._active = true;
          try {
            if (typeof filter === "function") {
              result = filter(node);
            } else {
              result = filter.acceptNode(node);
            }
          } finally {
            this._active = false;
          }
        }
        return +result;
      }
    },
    /**
     * @spec https://dom.spec.whatwg.org/#nodeiterator-pre-removing-steps
     * @method
     * @return void
     */
    _preremove: {
      value: function _preremove(toBeRemovedNode) {
        if (isInclusiveAncestor(toBeRemovedNode, this._root)) {
          return;
        }
        if (!isInclusiveAncestor(toBeRemovedNode, this._referenceNode)) {
          return;
        }
        if (this._pointerBeforeReferenceNode) {
          var next = toBeRemovedNode;
          while (next.lastChild) {
            next = next.lastChild;
          }
          next = NodeTraversal2.next(next, this.root);
          if (next) {
            this._referenceNode = next;
            return;
          }
          this._pointerBeforeReferenceNode = false;
        }
        if (toBeRemovedNode.previousSibling === null) {
          this._referenceNode = toBeRemovedNode.parentNode;
        } else {
          this._referenceNode = toBeRemovedNode.previousSibling;
          var lastChild;
          for (lastChild = this._referenceNode.lastChild; lastChild; lastChild = this._referenceNode.lastChild) {
            this._referenceNode = lastChild;
          }
        }
      }
    },
    /**
     * @spec http://www.w3.org/TR/dom/#dom-nodeiterator-nextnode
     * @method
     * @return {Node|null}
     */
    nextNode: {
      value: function nextNode() {
        return traverse(this, true);
      }
    },
    /**
     * @spec http://www.w3.org/TR/dom/#dom-nodeiterator-previousnode
     * @method
     * @return {Node|null}
     */
    previousNode: {
      value: function previousNode() {
        return traverse(this, false);
      }
    },
    /**
     * @spec http://www.w3.org/TR/dom/#dom-nodeiterator-detach
     * @method
     * @return void
     */
    detach: {
      value: function detach() {
      }
    },
    /** For compatibility with web-platform-tests. */
    toString: {
      value: function toString() {
        return "[object NodeIterator]";
      }
    }
  });
  return NodeIterator_1;
}
var URL_1;
var hasRequiredURL;
function requireURL() {
  if (hasRequiredURL) return URL_1;
  hasRequiredURL = 1;
  URL_1 = URL2;
  function URL2(url) {
    if (!url) return Object.create(URL2.prototype);
    this.url = url.replace(/^[ \t\n\r\f]+|[ \t\n\r\f]+$/g, "");
    var match = URL2.pattern.exec(this.url);
    if (match) {
      if (match[2]) this.scheme = match[2];
      if (match[4]) {
        var userinfo = match[4].match(URL2.userinfoPattern);
        if (userinfo) {
          this.username = userinfo[1];
          this.password = userinfo[3];
          match[4] = match[4].substring(userinfo[0].length);
        }
        if (match[4].match(URL2.portPattern)) {
          var pos = match[4].lastIndexOf(":");
          this.host = match[4].substring(0, pos);
          this.port = match[4].substring(pos + 1);
        } else {
          this.host = match[4];
        }
      }
      if (match[5]) this.path = match[5];
      if (match[6]) this.query = match[7];
      if (match[8]) this.fragment = match[9];
    }
  }
  URL2.pattern = /^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/;
  URL2.userinfoPattern = /^([^@:]*)(:([^@]*))?@/;
  URL2.portPattern = /:\d+$/;
  URL2.authorityPattern = /^[^:\/?#]+:\/\//;
  URL2.hierarchyPattern = /^[^:\/?#]+:\//;
  URL2.percentEncode = function percentEncode(s) {
    var c = s.charCodeAt(0);
    if (c < 256) return "%" + c.toString(16);
    else throw Error("can't percent-encode codepoints > 255 yet");
  };
  URL2.prototype = {
    constructor: URL2,
    // XXX: not sure if this is the precise definition of absolute
    isAbsolute: function() {
      return !!this.scheme;
    },
    isAuthorityBased: function() {
      return URL2.authorityPattern.test(this.url);
    },
    isHierarchical: function() {
      return URL2.hierarchyPattern.test(this.url);
    },
    toString: function() {
      var s = "";
      if (this.scheme !== void 0) s += this.scheme + ":";
      if (this.isAbsolute()) {
        s += "//";
        if (this.username || this.password) {
          s += this.username || "";
          if (this.password) {
            s += ":" + this.password;
          }
          s += "@";
        }
        if (this.host) {
          s += this.host;
        }
      }
      if (this.port !== void 0) s += ":" + this.port;
      if (this.path !== void 0) s += this.path;
      if (this.query !== void 0) s += "?" + this.query;
      if (this.fragment !== void 0) s += "#" + this.fragment;
      return s;
    },
    // See: http://tools.ietf.org/html/rfc3986#section-5.2
    // and https://url.spec.whatwg.org/#constructors
    resolve: function(relative) {
      var base = this;
      var r = new URL2(relative);
      var t = new URL2();
      if (r.scheme !== void 0) {
        t.scheme = r.scheme;
        t.username = r.username;
        t.password = r.password;
        t.host = r.host;
        t.port = r.port;
        t.path = remove_dot_segments(r.path);
        t.query = r.query;
      } else {
        t.scheme = base.scheme;
        if (r.host !== void 0) {
          t.username = r.username;
          t.password = r.password;
          t.host = r.host;
          t.port = r.port;
          t.path = remove_dot_segments(r.path);
          t.query = r.query;
        } else {
          t.username = base.username;
          t.password = base.password;
          t.host = base.host;
          t.port = base.port;
          if (!r.path) {
            t.path = base.path;
            if (r.query !== void 0) t.query = r.query;
            else t.query = base.query;
          } else {
            if (r.path.charAt(0) === "/") {
              t.path = remove_dot_segments(r.path);
            } else {
              t.path = merge(base.path, r.path);
              t.path = remove_dot_segments(t.path);
            }
            t.query = r.query;
          }
        }
      }
      t.fragment = r.fragment;
      return t.toString();
      function merge(basepath, refpath) {
        if (base.host !== void 0 && !base.path) return "/" + refpath;
        var lastslash = basepath.lastIndexOf("/");
        if (lastslash === -1) return refpath;
        else return basepath.substring(0, lastslash + 1) + refpath;
      }
      function remove_dot_segments(path) {
        if (!path) return path;
        var output = "";
        while (path.length > 0) {
          if (path === "." || path === "..") {
            path = "";
            break;
          }
          var twochars = path.substring(0, 2);
          var threechars = path.substring(0, 3);
          var fourchars = path.substring(0, 4);
          if (threechars === "../") {
            path = path.substring(3);
          } else if (twochars === "./") {
            path = path.substring(2);
          } else if (threechars === "/./") {
            path = "/" + path.substring(3);
          } else if (twochars === "/." && path.length === 2) {
            path = "/";
          } else if (fourchars === "/../" || threechars === "/.." && path.length === 3) {
            path = "/" + path.substring(4);
            output = output.replace(/\/?[^\/]*$/, "");
          } else {
            var segment = path.match(/(\/?([^\/]*))/)[0];
            output += segment;
            path = path.substring(segment.length);
          }
        }
        return output;
      }
    }
  };
  return URL_1;
}
var CustomEvent_1;
var hasRequiredCustomEvent;
function requireCustomEvent() {
  if (hasRequiredCustomEvent) return CustomEvent_1;
  hasRequiredCustomEvent = 1;
  CustomEvent_1 = CustomEvent;
  var Event = requireEvent();
  function CustomEvent(type, dictionary) {
    Event.call(this, type, dictionary);
  }
  CustomEvent.prototype = Object.create(Event.prototype, {
    constructor: {
      value: CustomEvent
    }
  });
  return CustomEvent_1;
}
var events;
var hasRequiredEvents;
function requireEvents() {
  if (hasRequiredEvents) return events;
  hasRequiredEvents = 1;
  events = {
    Event: requireEvent(),
    UIEvent: requireUIEvent(),
    MouseEvent: requireMouseEvent(),
    CustomEvent: requireCustomEvent()
  };
  return events;
}
var htmlelts = {};
var style_parser = {};
var hasRequiredStyle_parser;
function requireStyle_parser() {
  if (hasRequiredStyle_parser) return style_parser;
  hasRequiredStyle_parser = 1;
  Object.defineProperty(style_parser, "__esModule", {
    value: true
  });
  style_parser.hyphenate = style_parser.parse = void 0;
  function parse(value) {
    const styles = [];
    let i = 0;
    let parenDepth = 0;
    let quote = 0;
    let valueStart = 0;
    let propStart = 0;
    let currentProp = null;
    while (i < value.length) {
      const token = value.charCodeAt(i++);
      switch (token) {
        case 40:
          parenDepth++;
          break;
        case 41:
          parenDepth--;
          break;
        case 39:
          if (quote === 0) {
            quote = 39;
          } else if (quote === 39 && value.charCodeAt(i - 1) !== 92) {
            quote = 0;
          }
          break;
        case 34:
          if (quote === 0) {
            quote = 34;
          } else if (quote === 34 && value.charCodeAt(i - 1) !== 92) {
            quote = 0;
          }
          break;
        case 58:
          if (!currentProp && parenDepth === 0 && quote === 0) {
            currentProp = hyphenate(value.substring(propStart, i - 1).trim());
            valueStart = i;
          }
          break;
        case 59:
          if (currentProp && valueStart > 0 && parenDepth === 0 && quote === 0) {
            const styleVal = value.substring(valueStart, i - 1).trim();
            styles.push(currentProp, styleVal);
            propStart = i;
            valueStart = 0;
            currentProp = null;
          }
          break;
      }
    }
    if (currentProp && valueStart) {
      const styleVal = value.slice(valueStart).trim();
      styles.push(currentProp, styleVal);
    }
    return styles;
  }
  style_parser.parse = parse;
  function hyphenate(value) {
    return value.replace(/[a-z][A-Z]/g, (v) => {
      return v.charAt(0) + "-" + v.charAt(1);
    }).toLowerCase();
  }
  style_parser.hyphenate = hyphenate;
  return style_parser;
}
var CSSStyleDeclaration_1;
var hasRequiredCSSStyleDeclaration;
function requireCSSStyleDeclaration() {
  if (hasRequiredCSSStyleDeclaration) return CSSStyleDeclaration_1;
  hasRequiredCSSStyleDeclaration = 1;
  const {
    parse
  } = requireStyle_parser();
  CSSStyleDeclaration_1 = function(elt) {
    const style = new CSSStyleDeclaration(elt);
    const handler = {
      get: function(target, property) {
        return property in target ? target[property] : target.getPropertyValue(dasherizeProperty(property));
      },
      has: function(target, key) {
        return true;
      },
      set: function(target, property, value) {
        if (property in target) {
          target[property] = value;
        } else {
          target.setProperty(dasherizeProperty(property), value ?? void 0);
        }
        return true;
      }
    };
    return new Proxy(style, handler);
  };
  function dasherizeProperty(property) {
    return property.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }
  function CSSStyleDeclaration(elt) {
    this._element = elt;
  }
  const IMPORTANT_BANG = "!important";
  function parseStyles(value) {
    const result = {
      property: {},
      priority: {}
    };
    if (!value) {
      return result;
    }
    const styleValues = parse(value);
    if (styleValues.length < 2) {
      return result;
    }
    for (let i = 0; i < styleValues.length; i += 2) {
      const name = styleValues[i];
      let value2 = styleValues[i + 1];
      if (value2.endsWith(IMPORTANT_BANG)) {
        result.priority[name] = "important";
        value2 = value2.slice(0, -IMPORTANT_BANG.length).trim();
      }
      result.property[name] = value2;
    }
    return result;
  }
  var NO_CHANGE = {};
  CSSStyleDeclaration.prototype = Object.create(Object.prototype, {
    // Return the parsed form of the element's style attribute.
    // If the element's style attribute has never been parsed
    // or if it has changed since the last parse, then reparse it
    // Note that the styles don't get parsed until they're actually needed
    _parsed: {
      get: function() {
        if (!this._parsedStyles || this.cssText !== this._lastParsedText) {
          var text = this.cssText;
          this._parsedStyles = parseStyles(text);
          this._lastParsedText = text;
          delete this._names;
        }
        return this._parsedStyles;
      }
    },
    // Call this method any time the parsed representation of the
    // style changes.  It converts the style properties to a string and
    // sets cssText and the element's style attribute
    _serialize: {
      value: function() {
        var styles = this._parsed;
        var s = "";
        for (var name in styles.property) {
          if (s) s += " ";
          s += name + ": " + styles.property[name];
          if (styles.priority[name]) {
            s += " !" + styles.priority[name];
          }
          s += ";";
        }
        this.cssText = s;
        this._lastParsedText = s;
        delete this._names;
      }
    },
    cssText: {
      get: function() {
        return this._element.getAttribute("style");
      },
      set: function(value) {
        this._element.setAttribute("style", value);
      }
    },
    length: {
      get: function() {
        if (!this._names) this._names = Object.getOwnPropertyNames(this._parsed.property);
        return this._names.length;
      }
    },
    item: {
      value: function(n) {
        if (!this._names) this._names = Object.getOwnPropertyNames(this._parsed.property);
        return this._names[n];
      }
    },
    getPropertyValue: {
      value: function(property) {
        property = property.toLowerCase();
        return this._parsed.property[property] || "";
      }
    },
    getPropertyPriority: {
      value: function(property) {
        property = property.toLowerCase();
        return this._parsed.priority[property] || "";
      }
    },
    setProperty: {
      value: function(property, value, priority) {
        property = property.toLowerCase();
        if (value === null || value === void 0) {
          value = "";
        }
        if (priority === null || priority === void 0) {
          priority = "";
        }
        if (value !== NO_CHANGE) {
          value = "" + value;
        }
        value = value.trim();
        if (value === "") {
          this.removeProperty(property);
          return;
        }
        if (priority !== "" && priority !== NO_CHANGE && !/^important$/i.test(priority)) {
          return;
        }
        var styles = this._parsed;
        if (value === NO_CHANGE) {
          if (!styles.property[property]) {
            return;
          }
          if (priority !== "") {
            styles.priority[property] = "important";
          } else {
            delete styles.priority[property];
          }
        } else {
          if (value.includes(";") && !value.includes("data:")) return;
          var newprops = parseStyles(property + ":" + value);
          if (Object.getOwnPropertyNames(newprops.property).length === 0) {
            return;
          }
          if (Object.getOwnPropertyNames(newprops.priority).length !== 0) {
            return;
          }
          for (var p in newprops.property) {
            styles.property[p] = newprops.property[p];
            if (priority === NO_CHANGE) {
              continue;
            } else if (priority !== "") {
              styles.priority[p] = "important";
            } else if (styles.priority[p]) {
              delete styles.priority[p];
            }
          }
        }
        this._serialize();
      }
    },
    setPropertyValue: {
      value: function(property, value) {
        return this.setProperty(property, value, NO_CHANGE);
      }
    },
    setPropertyPriority: {
      value: function(property, priority) {
        return this.setProperty(property, NO_CHANGE, priority);
      }
    },
    removeProperty: {
      value: function(property) {
        property = property.toLowerCase();
        var styles = this._parsed;
        if (property in styles.property) {
          delete styles.property[property];
          delete styles.priority[property];
          this._serialize();
        }
      }
    }
  });
  return CSSStyleDeclaration_1;
}
var URLUtils_1;
var hasRequiredURLUtils;
function requireURLUtils() {
  if (hasRequiredURLUtils) return URLUtils_1;
  hasRequiredURLUtils = 1;
  var URL2 = requireURL();
  URLUtils_1 = URLUtils;
  function URLUtils() {
  }
  URLUtils.prototype = Object.create(Object.prototype, {
    _url: {
      get: function() {
        return new URL2(this.href);
      }
    },
    protocol: {
      get: function() {
        var url = this._url;
        if (url && url.scheme) return url.scheme + ":";
        else return ":";
      },
      set: function(v) {
        var output = this.href;
        var url = new URL2(output);
        if (url.isAbsolute()) {
          v = v.replace(/:+$/, "");
          v = v.replace(/[^-+\.a-zA-Z0-9]/g, URL2.percentEncode);
          if (v.length > 0) {
            url.scheme = v;
            output = url.toString();
          }
        }
        this.href = output;
      }
    },
    host: {
      get: function() {
        var url = this._url;
        if (url.isAbsolute() && url.isAuthorityBased()) return url.host + (url.port ? ":" + url.port : "");
        else return "";
      },
      set: function(v) {
        var output = this.href;
        var url = new URL2(output);
        if (url.isAbsolute() && url.isAuthorityBased()) {
          v = v.replace(/[^-+\._~!$&'()*,;:=a-zA-Z0-9]/g, URL2.percentEncode);
          if (v.length > 0) {
            url.host = v;
            delete url.port;
            output = url.toString();
          }
        }
        this.href = output;
      }
    },
    hostname: {
      get: function() {
        var url = this._url;
        if (url.isAbsolute() && url.isAuthorityBased()) return url.host;
        else return "";
      },
      set: function(v) {
        var output = this.href;
        var url = new URL2(output);
        if (url.isAbsolute() && url.isAuthorityBased()) {
          v = v.replace(/^\/+/, "");
          v = v.replace(/[^-+\._~!$&'()*,;:=a-zA-Z0-9]/g, URL2.percentEncode);
          if (v.length > 0) {
            url.host = v;
            output = url.toString();
          }
        }
        this.href = output;
      }
    },
    port: {
      get: function() {
        var url = this._url;
        if (url.isAbsolute() && url.isAuthorityBased() && url.port !== void 0) return url.port;
        else return "";
      },
      set: function(v) {
        var output = this.href;
        var url = new URL2(output);
        if (url.isAbsolute() && url.isAuthorityBased()) {
          v = "" + v;
          v = v.replace(/[^0-9].*$/, "");
          v = v.replace(/^0+/, "");
          if (v.length === 0) v = "0";
          if (parseInt(v, 10) <= 65535) {
            url.port = v;
            output = url.toString();
          }
        }
        this.href = output;
      }
    },
    pathname: {
      get: function() {
        var url = this._url;
        if (url.isAbsolute() && url.isHierarchical()) return url.path;
        else return "";
      },
      set: function(v) {
        var output = this.href;
        var url = new URL2(output);
        if (url.isAbsolute() && url.isHierarchical()) {
          if (v.charAt(0) !== "/") v = "/" + v;
          v = v.replace(/[^-+\._~!$&'()*,;:=@\/a-zA-Z0-9]/g, URL2.percentEncode);
          url.path = v;
          output = url.toString();
        }
        this.href = output;
      }
    },
    search: {
      get: function() {
        var url = this._url;
        if (url.isAbsolute() && url.isHierarchical() && url.query !== void 0) return "?" + url.query;
        else return "";
      },
      set: function(v) {
        var output = this.href;
        var url = new URL2(output);
        if (url.isAbsolute() && url.isHierarchical()) {
          if (v.charAt(0) === "?") v = v.substring(1);
          v = v.replace(/[^-+\._~!$&'()*,;:=@\/?a-zA-Z0-9]/g, URL2.percentEncode);
          url.query = v;
          output = url.toString();
        }
        this.href = output;
      }
    },
    hash: {
      get: function() {
        var url = this._url;
        if (url == null || url.fragment == null || url.fragment === "") {
          return "";
        } else {
          return "#" + url.fragment;
        }
      },
      set: function(v) {
        var output = this.href;
        var url = new URL2(output);
        if (v.charAt(0) === "#") v = v.substring(1);
        v = v.replace(/[^-+\._~!$&'()*,;:=@\/?a-zA-Z0-9]/g, URL2.percentEncode);
        url.fragment = v;
        output = url.toString();
        this.href = output;
      }
    },
    username: {
      get: function() {
        var url = this._url;
        return url.username || "";
      },
      set: function(v) {
        var output = this.href;
        var url = new URL2(output);
        if (url.isAbsolute()) {
          v = v.replace(/[\x00-\x1F\x7F-\uFFFF "#<>?`\/@\\:]/g, URL2.percentEncode);
          url.username = v;
          output = url.toString();
        }
        this.href = output;
      }
    },
    password: {
      get: function() {
        var url = this._url;
        return url.password || "";
      },
      set: function(v) {
        var output = this.href;
        var url = new URL2(output);
        if (url.isAbsolute()) {
          if (v === "") {
            url.password = null;
          } else {
            v = v.replace(/[\x00-\x1F\x7F-\uFFFF "#<>?`\/@\\]/g, URL2.percentEncode);
            url.password = v;
          }
          output = url.toString();
        }
        this.href = output;
      }
    },
    origin: {
      get: function() {
        var url = this._url;
        if (url == null) {
          return "";
        }
        var originForPort = function(defaultPort) {
          var origin = [url.scheme, url.host, +url.port || defaultPort];
          return origin[0] + "://" + origin[1] + (origin[2] === defaultPort ? "" : ":" + origin[2]);
        };
        switch (url.scheme) {
          case "ftp":
            return originForPort(21);
          case "gopher":
            return originForPort(70);
          case "http":
          case "ws":
            return originForPort(80);
          case "https":
          case "wss":
            return originForPort(443);
          default:
            return url.scheme + "://";
        }
      }
    }
    /*
    searchParams: {
      get: function() {
        var url = this._url;
        // XXX
      },
      set: function(v) {
        var output = this.href;
        var url = new URL(output);
        // XXX
        this.href = output;
      },
    },
    */
  });
  URLUtils._inherit = function(proto) {
    Object.getOwnPropertyNames(URLUtils.prototype).forEach(function(p) {
      if (p === "constructor" || p === "href") {
        return;
      }
      var desc = Object.getOwnPropertyDescriptor(URLUtils.prototype, p);
      Object.defineProperty(proto, p, desc);
    });
  };
  return URLUtils_1;
}
var defineElement;
var hasRequiredDefineElement;
function requireDefineElement() {
  if (hasRequiredDefineElement) return defineElement;
  hasRequiredDefineElement = 1;
  var attributes2 = requireAttributes();
  var isApiWritable = requireConfig().isApiWritable;
  defineElement = function(spec, defaultConstructor, tagList, tagNameToImpl) {
    var c = spec.ctor;
    if (c) {
      var props = spec.props || {};
      if (spec.attributes) {
        for (var n in spec.attributes) {
          var attr = spec.attributes[n];
          if (typeof attr !== "object" || Array.isArray(attr)) attr = {
            type: attr
          };
          if (!attr.name) attr.name = n.toLowerCase();
          props[n] = attributes2.property(attr);
        }
      }
      props.constructor = {
        value: c,
        writable: isApiWritable
      };
      c.prototype = Object.create((spec.superclass || defaultConstructor).prototype, props);
      if (spec.events) {
        addEventHandlers(c, spec.events);
      }
      tagList[spec.name] = c;
    } else {
      c = defaultConstructor;
    }
    (spec.tags || spec.tag && [spec.tag] || []).forEach(function(tag) {
      tagNameToImpl[tag] = c;
    });
    return c;
  };
  function EventHandlerBuilder(body, document, form, element) {
    this.body = body;
    this.document = document;
    this.form = form;
    this.element = element;
  }
  EventHandlerBuilder.prototype.build = function() {
    return () => {
    };
  };
  function EventHandlerChangeHandler(elt, name, oldval, newval) {
    var doc = elt.ownerDocument || /* @__PURE__ */ Object.create(null);
    var form = elt.form || /* @__PURE__ */ Object.create(null);
    elt[name] = new EventHandlerBuilder(newval, doc, form, elt).build();
  }
  function addEventHandlers(c, eventHandlerTypes) {
    var p = c.prototype;
    eventHandlerTypes.forEach(function(type) {
      Object.defineProperty(p, "on" + type, {
        get: function() {
          return this._getEventHandler(type);
        },
        set: function(v) {
          this._setEventHandler(type, v);
        }
      });
      attributes2.registerChangeHandler(c, "on" + type, EventHandlerChangeHandler);
    });
  }
  return defineElement;
}
var hasRequiredHtmlelts;
function requireHtmlelts() {
  if (hasRequiredHtmlelts) return htmlelts;
  hasRequiredHtmlelts = 1;
  var Node = requireNode();
  var Element = requireElement();
  var CSSStyleDeclaration = requireCSSStyleDeclaration();
  var utils2 = requireUtils();
  var URLUtils = requireURLUtils();
  var defineElement2 = requireDefineElement();
  var htmlElements = htmlelts.elements = {};
  var htmlNameToImpl = /* @__PURE__ */ Object.create(null);
  htmlelts.createElement = function(doc, localName, prefix) {
    var impl2 = htmlNameToImpl[localName] || HTMLUnknownElement;
    return new impl2(doc, localName, prefix);
  };
  function define(spec) {
    return defineElement2(spec, HTMLElement, htmlElements, htmlNameToImpl);
  }
  function URL2(attr) {
    return {
      get: function() {
        var v = this._getattr(attr);
        if (v === null) {
          return "";
        }
        var url = this.doc._resolve(v);
        return url === null ? v : url;
      },
      set: function(value) {
        this._setattr(attr, value);
      }
    };
  }
  function CORS(attr) {
    return {
      get: function() {
        var v = this._getattr(attr);
        if (v === null) {
          return null;
        }
        if (v.toLowerCase() === "use-credentials") {
          return "use-credentials";
        }
        return "anonymous";
      },
      set: function(value) {
        if (value === null || value === void 0) {
          this.removeAttribute(attr);
        } else {
          this._setattr(attr, value);
        }
      }
    };
  }
  const REFERRER = {
    type: ["", "no-referrer", "no-referrer-when-downgrade", "same-origin", "origin", "strict-origin", "origin-when-cross-origin", "strict-origin-when-cross-origin", "unsafe-url"],
    missing: ""
  };
  var focusableElements = {
    "A": true,
    "LINK": true,
    "BUTTON": true,
    "INPUT": true,
    "SELECT": true,
    "TEXTAREA": true,
    "COMMAND": true
  };
  var HTMLFormElement = function(doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
    this._form = null;
  };
  var HTMLElement = htmlelts.HTMLElement = define({
    superclass: Element,
    name: "HTMLElement",
    ctor: function HTMLElement2(doc, localName, prefix) {
      Element.call(this, doc, localName, utils2.NAMESPACE.HTML, prefix);
    },
    props: {
      dangerouslySetInnerHTML: {
        set: function(v) {
          this._innerHTML = v;
        }
      },
      innerHTML: {
        get: function() {
          return this.serialize();
        },
        set: function(v) {
          var parser = this.ownerDocument.implementation.mozHTMLParser(this.ownerDocument._address, this);
          parser.parse(v === null ? "" : String(v), true);
          var target = this instanceof htmlNameToImpl.template ? this.content : this;
          while (target.hasChildNodes()) target.removeChild(target.firstChild);
          target.appendChild(parser._asDocumentFragment());
        }
      },
      style: {
        get: function() {
          if (!this._style) this._style = new CSSStyleDeclaration(this);
          return this._style;
        },
        set: function(v) {
          if (v === null || v === void 0) {
            v = "";
          }
          this._setattr("style", String(v));
        }
      },
      // These can't really be implemented server-side in a reasonable way.
      blur: {
        value: function() {
        }
      },
      focus: {
        value: function() {
        }
      },
      forceSpellCheck: {
        value: function() {
        }
      },
      click: {
        value: function() {
          if (this._click_in_progress) return;
          this._click_in_progress = true;
          try {
            if (this._pre_click_activation_steps) this._pre_click_activation_steps();
            var event = this.ownerDocument.createEvent("MouseEvent");
            event.initMouseEvent(
              "click",
              true,
              true,
              this.ownerDocument.defaultView,
              1,
              0,
              0,
              0,
              0,
              // These 4 should be initialized with
              // the actually current keyboard state
              // somehow...
              false,
              false,
              false,
              false,
              0,
              null
            );
            var success = this.dispatchEvent(event);
            if (success) {
              if (this._post_click_activation_steps) this._post_click_activation_steps(event);
            } else {
              if (this._cancelled_activation_steps) this._cancelled_activation_steps();
            }
          } finally {
            this._click_in_progress = false;
          }
        }
      },
      submit: {
        value: utils2.nyi
      }
    },
    attributes: {
      title: String,
      lang: String,
      dir: {
        type: ["ltr", "rtl", "auto"],
        missing: ""
      },
      draggable: {
        type: ["true", "false"],
        treatNullAsEmptyString: true
      },
      spellcheck: {
        type: ["true", "false"],
        missing: ""
      },
      enterKeyHint: {
        type: ["enter", "done", "go", "next", "previous", "search", "send"],
        missing: ""
      },
      autoCapitalize: {
        type: ["off", "on", "none", "sentences", "words", "characters"],
        missing: ""
      },
      autoFocus: Boolean,
      accessKey: String,
      nonce: String,
      hidden: Boolean,
      translate: {
        type: ["no", "yes"],
        missing: ""
      },
      tabIndex: {
        type: "long",
        default: function() {
          if (this.tagName in focusableElements || this.contentEditable) return 0;
          else return -1;
        }
      }
    },
    events: [
      "abort",
      "canplay",
      "canplaythrough",
      "change",
      "click",
      "contextmenu",
      "cuechange",
      "dblclick",
      "drag",
      "dragend",
      "dragenter",
      "dragleave",
      "dragover",
      "dragstart",
      "drop",
      "durationchange",
      "emptied",
      "ended",
      "input",
      "invalid",
      "keydown",
      "keypress",
      "keyup",
      "loadeddata",
      "loadedmetadata",
      "loadstart",
      "mousedown",
      "mousemove",
      "mouseout",
      "mouseover",
      "mouseup",
      "mousewheel",
      "pause",
      "play",
      "playing",
      "progress",
      "ratechange",
      "readystatechange",
      "reset",
      "seeked",
      "seeking",
      "select",
      "show",
      "stalled",
      "submit",
      "suspend",
      "timeupdate",
      "volumechange",
      "waiting",
      // These last 5 event types will be overriden by HTMLBodyElement
      "blur",
      "error",
      "focus",
      "load",
      "scroll"
    ]
  });
  var HTMLUnknownElement = define({
    name: "HTMLUnknownElement",
    ctor: function HTMLUnknownElement2(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    }
  });
  var formAssociatedProps = {
    // See http://www.w3.org/TR/html5/association-of-controls-and-forms.html#form-owner
    form: {
      get: function() {
        return this._form;
      }
    }
  };
  define({
    tag: "a",
    name: "HTMLAnchorElement",
    ctor: function HTMLAnchorElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      _post_click_activation_steps: {
        value: function(e) {
          if (this.href) {
            this.ownerDocument.defaultView.location = this.href;
          }
        }
      }
    },
    attributes: {
      href: URL2,
      ping: String,
      download: String,
      target: String,
      rel: String,
      media: String,
      hreflang: String,
      type: String,
      referrerPolicy: REFERRER,
      // Obsolete
      coords: String,
      charset: String,
      name: String,
      rev: String,
      shape: String
    }
  });
  URLUtils._inherit(htmlNameToImpl.a.prototype);
  define({
    tag: "area",
    name: "HTMLAreaElement",
    ctor: function HTMLAreaElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      alt: String,
      target: String,
      download: String,
      rel: String,
      media: String,
      href: URL2,
      hreflang: String,
      type: String,
      shape: String,
      coords: String,
      ping: String,
      // XXX: also reflect relList
      referrerPolicy: REFERRER,
      // Obsolete
      noHref: Boolean
    }
  });
  URLUtils._inherit(htmlNameToImpl.area.prototype);
  define({
    tag: "br",
    name: "HTMLBRElement",
    ctor: function HTMLBRElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      // Obsolete
      clear: String
    }
  });
  define({
    tag: "base",
    name: "HTMLBaseElement",
    ctor: function HTMLBaseElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      "target": String
    }
  });
  define({
    tag: "body",
    name: "HTMLBodyElement",
    ctor: function HTMLBodyElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    // Certain event handler attributes on a <body> tag actually set
    // handlers for the window rather than just that element.  Define
    // getters and setters for those here.  Note that some of these override
    // properties on HTMLElement.prototype.
    // XXX: If I add support for <frameset>, these have to go there, too
    // XXX
    // When the Window object is implemented, these attribute will have
    // to work with the same-named attributes on the Window.
    events: ["afterprint", "beforeprint", "beforeunload", "blur", "error", "focus", "hashchange", "load", "message", "offline", "online", "pagehide", "pageshow", "popstate", "resize", "scroll", "storage", "unload"],
    attributes: {
      // Obsolete
      text: {
        type: String,
        treatNullAsEmptyString: true
      },
      link: {
        type: String,
        treatNullAsEmptyString: true
      },
      vLink: {
        type: String,
        treatNullAsEmptyString: true
      },
      aLink: {
        type: String,
        treatNullAsEmptyString: true
      },
      bgColor: {
        type: String,
        treatNullAsEmptyString: true
      },
      background: String
    }
  });
  define({
    tag: "button",
    name: "HTMLButtonElement",
    ctor: function HTMLButtonElement(doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: formAssociatedProps,
    attributes: {
      name: String,
      value: String,
      disabled: Boolean,
      autofocus: Boolean,
      type: {
        type: ["submit", "reset", "button", "menu"],
        missing: "submit"
      },
      formTarget: String,
      formAction: URL2,
      formNoValidate: Boolean,
      formMethod: {
        type: ["get", "post", "dialog"],
        invalid: "get",
        missing: ""
      },
      formEnctype: {
        type: ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"],
        invalid: "application/x-www-form-urlencoded",
        missing: ""
      }
    }
  });
  define({
    tag: "dl",
    name: "HTMLDListElement",
    ctor: function HTMLDListElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      // Obsolete
      compact: Boolean
    }
  });
  define({
    tag: "data",
    name: "HTMLDataElement",
    ctor: function HTMLDataElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      value: String
    }
  });
  define({
    tag: "datalist",
    name: "HTMLDataListElement",
    ctor: function HTMLDataListElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    }
  });
  define({
    tag: "details",
    name: "HTMLDetailsElement",
    ctor: function HTMLDetailsElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      "open": Boolean
    }
  });
  define({
    tag: "div",
    name: "HTMLDivElement",
    ctor: function HTMLDivElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      // Obsolete
      align: String
    }
  });
  define({
    tag: "embed",
    name: "HTMLEmbedElement",
    ctor: function HTMLEmbedElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      src: URL2,
      type: String,
      width: String,
      height: String,
      // Obsolete
      align: String,
      name: String
    }
  });
  define({
    tag: "fieldset",
    name: "HTMLFieldSetElement",
    ctor: function HTMLFieldSetElement(doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: formAssociatedProps,
    attributes: {
      disabled: Boolean,
      name: String
    }
  });
  define({
    tag: "form",
    name: "HTMLFormElement",
    ctor: function HTMLFormElement2(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      action: String,
      autocomplete: {
        type: ["on", "off"],
        missing: "on"
      },
      name: String,
      acceptCharset: {
        name: "accept-charset"
      },
      target: String,
      noValidate: Boolean,
      method: {
        type: ["get", "post", "dialog"],
        invalid: "get",
        missing: "get"
      },
      // Both enctype and encoding reflect the enctype content attribute
      enctype: {
        type: ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"],
        invalid: "application/x-www-form-urlencoded",
        missing: "application/x-www-form-urlencoded"
      },
      encoding: {
        name: "enctype",
        type: ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"],
        invalid: "application/x-www-form-urlencoded",
        missing: "application/x-www-form-urlencoded"
      }
    }
  });
  define({
    tag: "hr",
    name: "HTMLHRElement",
    ctor: function HTMLHRElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      // Obsolete
      align: String,
      color: String,
      noShade: Boolean,
      size: String,
      width: String
    }
  });
  define({
    tag: "head",
    name: "HTMLHeadElement",
    ctor: function HTMLHeadElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    }
  });
  define({
    tags: ["h1", "h2", "h3", "h4", "h5", "h6"],
    name: "HTMLHeadingElement",
    ctor: function HTMLHeadingElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      // Obsolete
      align: String
    }
  });
  define({
    tag: "html",
    name: "HTMLHtmlElement",
    ctor: function HTMLHtmlElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      xmlns: URL2,
      // Obsolete
      version: String
    }
  });
  define({
    tag: "iframe",
    name: "HTMLIFrameElement",
    ctor: function HTMLIFrameElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      src: URL2,
      srcdoc: String,
      name: String,
      width: String,
      height: String,
      // XXX: sandbox is a reflected settable token list
      seamless: Boolean,
      allow: Boolean,
      allowFullscreen: Boolean,
      allowUserMedia: Boolean,
      allowPaymentRequest: Boolean,
      referrerPolicy: REFERRER,
      loading: {
        type: ["eager", "lazy"],
        treatNullAsEmptyString: true
      },
      // Obsolete
      align: String,
      scrolling: String,
      frameBorder: String,
      longDesc: URL2,
      marginHeight: {
        type: String,
        treatNullAsEmptyString: true
      },
      marginWidth: {
        type: String,
        treatNullAsEmptyString: true
      }
    }
  });
  define({
    tag: "img",
    name: "HTMLImageElement",
    ctor: function HTMLImageElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      alt: String,
      src: URL2,
      srcset: String,
      crossOrigin: CORS,
      useMap: String,
      isMap: Boolean,
      sizes: String,
      height: {
        type: "unsigned long",
        default: 0
      },
      width: {
        type: "unsigned long",
        default: 0
      },
      referrerPolicy: REFERRER,
      loading: {
        type: ["eager", "lazy"],
        missing: ""
      },
      // Obsolete:
      name: String,
      lowsrc: URL2,
      align: String,
      hspace: {
        type: "unsigned long",
        default: 0
      },
      vspace: {
        type: "unsigned long",
        default: 0
      },
      longDesc: URL2,
      border: {
        type: String,
        treatNullAsEmptyString: true
      }
    }
  });
  define({
    tag: "input",
    name: "HTMLInputElement",
    ctor: function HTMLInputElement(doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: {
      form: formAssociatedProps.form,
      _post_click_activation_steps: {
        value: function(e) {
          if (this.type === "checkbox") {
            this.checked = !this.checked;
          } else if (this.type === "radio") {
            var group = this.form.getElementsByName(this.name);
            for (var i = group.length - 1; i >= 0; i--) {
              var el = group[i];
              el.checked = el === this;
            }
          }
        }
      }
    },
    attributes: {
      name: String,
      disabled: Boolean,
      autofocus: Boolean,
      accept: String,
      alt: String,
      max: String,
      min: String,
      pattern: String,
      placeholder: String,
      step: String,
      dirName: String,
      defaultValue: {
        name: "value"
      },
      multiple: Boolean,
      required: Boolean,
      readOnly: Boolean,
      checked: Boolean,
      value: String,
      src: URL2,
      defaultChecked: {
        name: "checked",
        type: Boolean
      },
      size: {
        type: "unsigned long",
        default: 20,
        min: 1,
        setmin: 1
      },
      width: {
        type: "unsigned long",
        min: 0,
        setmin: 0,
        default: 0
      },
      height: {
        type: "unsigned long",
        min: 0,
        setmin: 0,
        default: 0
      },
      minLength: {
        type: "unsigned long",
        min: 0,
        setmin: 0,
        default: -1
      },
      maxLength: {
        type: "unsigned long",
        min: 0,
        setmin: 0,
        default: -1
      },
      autocomplete: String,
      // It's complicated
      type: {
        type: ["text", "hidden", "search", "tel", "url", "email", "password", "datetime", "date", "month", "week", "time", "datetime-local", "number", "range", "color", "checkbox", "radio", "file", "submit", "image", "reset", "button"],
        missing: "text"
      },
      formTarget: String,
      formNoValidate: Boolean,
      formMethod: {
        type: ["get", "post"],
        invalid: "get",
        missing: ""
      },
      formEnctype: {
        type: ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"],
        invalid: "application/x-www-form-urlencoded",
        missing: ""
      },
      inputMode: {
        type: ["verbatim", "latin", "latin-name", "latin-prose", "full-width-latin", "kana", "kana-name", "katakana", "numeric", "tel", "email", "url"],
        missing: ""
      },
      // Obsolete
      align: String,
      useMap: String
    }
  });
  define({
    tag: "keygen",
    name: "HTMLKeygenElement",
    ctor: function HTMLKeygenElement(doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: formAssociatedProps,
    attributes: {
      name: String,
      disabled: Boolean,
      autofocus: Boolean,
      challenge: String,
      keytype: {
        type: ["rsa"],
        missing: ""
      }
    }
  });
  define({
    tag: "li",
    name: "HTMLLIElement",
    ctor: function HTMLLIElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      value: {
        type: "long",
        default: 0
      },
      // Obsolete
      type: String
    }
  });
  define({
    tag: "label",
    name: "HTMLLabelElement",
    ctor: function HTMLLabelElement(doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: formAssociatedProps,
    attributes: {
      htmlFor: {
        name: "for",
        type: String
      }
    }
  });
  define({
    tag: "legend",
    name: "HTMLLegendElement",
    ctor: function HTMLLegendElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      // Obsolete
      align: String
    }
  });
  define({
    tag: "link",
    name: "HTMLLinkElement",
    ctor: function HTMLLinkElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      // XXX Reflect DOMSettableTokenList sizes also DOMTokenList relList
      href: URL2,
      rel: String,
      media: String,
      hreflang: String,
      type: String,
      crossOrigin: CORS,
      nonce: String,
      integrity: String,
      referrerPolicy: REFERRER,
      imageSizes: String,
      imageSrcset: String,
      // Obsolete
      charset: String,
      rev: String,
      target: String
    }
  });
  define({
    tag: "map",
    name: "HTMLMapElement",
    ctor: function HTMLMapElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      name: String
    }
  });
  define({
    tag: "menu",
    name: "HTMLMenuElement",
    ctor: function HTMLMenuElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      // XXX: not quite right, default should be popup if parent element is
      // popup.
      type: {
        type: ["context", "popup", "toolbar"],
        missing: "toolbar"
      },
      label: String,
      // Obsolete
      compact: Boolean
    }
  });
  define({
    tag: "meta",
    name: "HTMLMetaElement",
    ctor: function HTMLMetaElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      name: String,
      content: String,
      httpEquiv: {
        name: "http-equiv",
        type: String
      },
      // Obsolete
      scheme: String
    }
  });
  define({
    tag: "meter",
    name: "HTMLMeterElement",
    ctor: function HTMLMeterElement(doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: formAssociatedProps
  });
  define({
    tags: ["ins", "del"],
    name: "HTMLModElement",
    ctor: function HTMLModElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      cite: URL2,
      dateTime: String
    }
  });
  define({
    tag: "ol",
    name: "HTMLOListElement",
    ctor: function HTMLOListElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      // Utility function (see the start attribute default value). Returns
      // the number of <li> children of this element
      _numitems: {
        get: function() {
          var items = 0;
          this.childNodes.forEach(function(n) {
            if (n.nodeType === Node.ELEMENT_NODE && n.tagName === "LI") items++;
          });
          return items;
        }
      }
    },
    attributes: {
      type: String,
      reversed: Boolean,
      start: {
        type: "long",
        default: function() {
          if (this.reversed) return this._numitems;
          else return 1;
        }
      },
      // Obsolete
      compact: Boolean
    }
  });
  define({
    tag: "object",
    name: "HTMLObjectElement",
    ctor: function HTMLObjectElement(doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: formAssociatedProps,
    attributes: {
      data: URL2,
      type: String,
      name: String,
      useMap: String,
      typeMustMatch: Boolean,
      width: String,
      height: String,
      // Obsolete
      align: String,
      archive: String,
      code: String,
      declare: Boolean,
      hspace: {
        type: "unsigned long",
        default: 0
      },
      standby: String,
      vspace: {
        type: "unsigned long",
        default: 0
      },
      codeBase: URL2,
      codeType: String,
      border: {
        type: String,
        treatNullAsEmptyString: true
      }
    }
  });
  define({
    tag: "optgroup",
    name: "HTMLOptGroupElement",
    ctor: function HTMLOptGroupElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      disabled: Boolean,
      label: String
    }
  });
  define({
    tag: "option",
    name: "HTMLOptionElement",
    ctor: function HTMLOptionElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      form: {
        get: function() {
          var p = this.parentNode;
          while (p && p.nodeType === Node.ELEMENT_NODE) {
            if (p.localName === "select") return p.form;
            p = p.parentNode;
          }
        }
      },
      value: {
        get: function() {
          return this._getattr("value") || this.text;
        },
        set: function(v) {
          this._setattr("value", v);
        }
      },
      text: {
        get: function() {
          return this.textContent.replace(/[ \t\n\f\r]+/g, " ").trim();
        },
        set: function(v) {
          this.textContent = v;
        }
      }
      // missing: index
    },
    attributes: {
      disabled: Boolean,
      defaultSelected: {
        name: "selected",
        type: Boolean
      },
      label: String
    }
  });
  define({
    tag: "output",
    name: "HTMLOutputElement",
    ctor: function HTMLOutputElement(doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: formAssociatedProps,
    attributes: {
      // XXX Reflect for/htmlFor as a settable token list
      name: String
    }
  });
  define({
    tag: "p",
    name: "HTMLParagraphElement",
    ctor: function HTMLParagraphElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      // Obsolete
      align: String
    }
  });
  define({
    tag: "param",
    name: "HTMLParamElement",
    ctor: function HTMLParamElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      name: String,
      value: String,
      // Obsolete
      type: String,
      valueType: String
    }
  });
  define({
    tags: [
      "pre",
      /*legacy elements:*/
      "listing",
      "xmp"
    ],
    name: "HTMLPreElement",
    ctor: function HTMLPreElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      // Obsolete
      width: {
        type: "long",
        default: 0
      }
    }
  });
  define({
    tag: "progress",
    name: "HTMLProgressElement",
    ctor: function HTMLProgressElement(doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: formAssociatedProps,
    attributes: {
      max: {
        type: Number,
        float: true,
        default: 1,
        min: 0
      }
    }
  });
  define({
    tags: ["q", "blockquote"],
    name: "HTMLQuoteElement",
    ctor: function HTMLQuoteElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      cite: URL2
    }
  });
  define({
    tag: "script",
    name: "HTMLScriptElement",
    ctor: function HTMLScriptElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      text: {
        get: function() {
          var s = "";
          for (var i = 0, n = this.childNodes.length; i < n; i++) {
            var child = this.childNodes[i];
            if (child.nodeType === Node.TEXT_NODE) s += child._data;
          }
          return s;
        },
        set: function(value) {
          this.removeChildren();
          if (value !== null && value !== "") {
            this.appendChild(this.ownerDocument.createTextNode(value));
          }
        }
      }
    },
    attributes: {
      src: URL2,
      type: String,
      charset: String,
      referrerPolicy: REFERRER,
      defer: Boolean,
      async: Boolean,
      nomodule: Boolean,
      crossOrigin: CORS,
      nonce: String,
      integrity: String
    }
  });
  define({
    tag: "select",
    name: "HTMLSelectElement",
    ctor: function HTMLSelectElement(doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: {
      form: formAssociatedProps.form,
      options: {
        get: function() {
          return this.getElementsByTagName("option");
        }
      }
    },
    attributes: {
      autocomplete: String,
      // It's complicated
      name: String,
      disabled: Boolean,
      autofocus: Boolean,
      multiple: Boolean,
      required: Boolean,
      size: {
        type: "unsigned long",
        default: 0
      }
    }
  });
  define({
    tag: "span",
    name: "HTMLSpanElement",
    ctor: function HTMLSpanElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    }
  });
  define({
    tag: "style",
    name: "HTMLStyleElement",
    ctor: function HTMLStyleElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      media: String,
      type: String,
      scoped: Boolean
    }
  });
  define({
    tag: "caption",
    name: "HTMLTableCaptionElement",
    ctor: function HTMLTableCaptionElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      // Obsolete
      align: String
    }
  });
  define({
    name: "HTMLTableCellElement",
    ctor: function HTMLTableCellElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      colSpan: {
        type: "unsigned long",
        default: 1
      },
      rowSpan: {
        type: "unsigned long",
        default: 1
      },
      //XXX Also reflect settable token list headers
      scope: {
        type: ["row", "col", "rowgroup", "colgroup"],
        missing: ""
      },
      abbr: String,
      // Obsolete
      align: String,
      axis: String,
      height: String,
      width: String,
      ch: {
        name: "char",
        type: String
      },
      chOff: {
        name: "charoff",
        type: String
      },
      noWrap: Boolean,
      vAlign: String,
      bgColor: {
        type: String,
        treatNullAsEmptyString: true
      }
    }
  });
  define({
    tags: ["col", "colgroup"],
    name: "HTMLTableColElement",
    ctor: function HTMLTableColElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      span: {
        type: "limited unsigned long with fallback",
        default: 1,
        min: 1
      },
      // Obsolete
      align: String,
      ch: {
        name: "char",
        type: String
      },
      chOff: {
        name: "charoff",
        type: String
      },
      vAlign: String,
      width: String
    }
  });
  define({
    tag: "table",
    name: "HTMLTableElement",
    ctor: function HTMLTableElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      rows: {
        get: function() {
          return this.getElementsByTagName("tr");
        }
      }
    },
    attributes: {
      // Obsolete
      align: String,
      border: String,
      frame: String,
      rules: String,
      summary: String,
      width: String,
      bgColor: {
        type: String,
        treatNullAsEmptyString: true
      },
      cellPadding: {
        type: String,
        treatNullAsEmptyString: true
      },
      cellSpacing: {
        type: String,
        treatNullAsEmptyString: true
      }
    }
  });
  define({
    tag: "template",
    name: "HTMLTemplateElement",
    ctor: function HTMLTemplateElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
      this._contentFragment = doc._templateDoc.createDocumentFragment();
    },
    props: {
      content: {
        get: function() {
          return this._contentFragment;
        }
      },
      serialize: {
        value: function() {
          return this.content.serialize();
        }
      }
    }
  });
  define({
    tag: "tr",
    name: "HTMLTableRowElement",
    ctor: function HTMLTableRowElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      cells: {
        get: function() {
          return this.querySelectorAll("td,th");
        }
      }
    },
    attributes: {
      // Obsolete
      align: String,
      ch: {
        name: "char",
        type: String
      },
      chOff: {
        name: "charoff",
        type: String
      },
      vAlign: String,
      bgColor: {
        type: String,
        treatNullAsEmptyString: true
      }
    }
  });
  define({
    tags: ["thead", "tfoot", "tbody"],
    name: "HTMLTableSectionElement",
    ctor: function HTMLTableSectionElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      rows: {
        get: function() {
          return this.getElementsByTagName("tr");
        }
      }
    },
    attributes: {
      // Obsolete
      align: String,
      ch: {
        name: "char",
        type: String
      },
      chOff: {
        name: "charoff",
        type: String
      },
      vAlign: String
    }
  });
  define({
    tag: "textarea",
    name: "HTMLTextAreaElement",
    ctor: function HTMLTextAreaElement(doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: {
      form: formAssociatedProps.form,
      type: {
        get: function() {
          return "textarea";
        }
      },
      defaultValue: {
        get: function() {
          return this.textContent;
        },
        set: function(v) {
          this.textContent = v;
        }
      },
      value: {
        get: function() {
          return this.defaultValue;
        },
        set: function(v) {
          this.defaultValue = v;
        }
      },
      textLength: {
        get: function() {
          return this.value.length;
        }
      }
    },
    attributes: {
      autocomplete: String,
      // It's complicated
      name: String,
      disabled: Boolean,
      autofocus: Boolean,
      placeholder: String,
      wrap: String,
      dirName: String,
      required: Boolean,
      readOnly: Boolean,
      rows: {
        type: "limited unsigned long with fallback",
        default: 2
      },
      cols: {
        type: "limited unsigned long with fallback",
        default: 20
      },
      maxLength: {
        type: "unsigned long",
        min: 0,
        setmin: 0,
        default: -1
      },
      minLength: {
        type: "unsigned long",
        min: 0,
        setmin: 0,
        default: -1
      },
      inputMode: {
        type: ["verbatim", "latin", "latin-name", "latin-prose", "full-width-latin", "kana", "kana-name", "katakana", "numeric", "tel", "email", "url"],
        missing: ""
      }
    }
  });
  define({
    tag: "time",
    name: "HTMLTimeElement",
    ctor: function HTMLTimeElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      dateTime: String,
      pubDate: Boolean
    }
  });
  define({
    tag: "title",
    name: "HTMLTitleElement",
    ctor: function HTMLTitleElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      text: {
        get: function() {
          return this.textContent;
        }
      }
    }
  });
  define({
    tag: "ul",
    name: "HTMLUListElement",
    ctor: function HTMLUListElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      type: String,
      // Obsolete
      compact: Boolean
    }
  });
  define({
    name: "HTMLMediaElement",
    ctor: function HTMLMediaElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      src: URL2,
      crossOrigin: CORS,
      preload: {
        type: ["metadata", "none", "auto", {
          value: "",
          alias: "auto"
        }],
        missing: "auto"
      },
      loop: Boolean,
      autoplay: Boolean,
      mediaGroup: String,
      controls: Boolean,
      defaultMuted: {
        name: "muted",
        type: Boolean
      }
    }
  });
  define({
    name: "HTMLAudioElement",
    tag: "audio",
    superclass: htmlElements.HTMLMediaElement,
    ctor: function HTMLAudioElement(doc, localName, prefix) {
      htmlElements.HTMLMediaElement.call(this, doc, localName, prefix);
    }
  });
  define({
    name: "HTMLVideoElement",
    tag: "video",
    superclass: htmlElements.HTMLMediaElement,
    ctor: function HTMLVideoElement(doc, localName, prefix) {
      htmlElements.HTMLMediaElement.call(this, doc, localName, prefix);
    },
    attributes: {
      poster: URL2,
      width: {
        type: "unsigned long",
        min: 0,
        default: 0
      },
      height: {
        type: "unsigned long",
        min: 0,
        default: 0
      }
    }
  });
  define({
    tag: "td",
    name: "HTMLTableDataCellElement",
    superclass: htmlElements.HTMLTableCellElement,
    ctor: function HTMLTableDataCellElement(doc, localName, prefix) {
      htmlElements.HTMLTableCellElement.call(this, doc, localName, prefix);
    }
  });
  define({
    tag: "th",
    name: "HTMLTableHeaderCellElement",
    superclass: htmlElements.HTMLTableCellElement,
    ctor: function HTMLTableHeaderCellElement(doc, localName, prefix) {
      htmlElements.HTMLTableCellElement.call(this, doc, localName, prefix);
    }
  });
  define({
    tag: "frameset",
    name: "HTMLFrameSetElement",
    ctor: function HTMLFrameSetElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    }
  });
  define({
    tag: "frame",
    name: "HTMLFrameElement",
    ctor: function HTMLFrameElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    }
  });
  define({
    tag: "canvas",
    name: "HTMLCanvasElement",
    ctor: function HTMLCanvasElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      getContext: {
        value: utils2.nyi
      },
      probablySupportsContext: {
        value: utils2.nyi
      },
      setContext: {
        value: utils2.nyi
      },
      transferControlToProxy: {
        value: utils2.nyi
      },
      toDataURL: {
        value: utils2.nyi
      },
      toBlob: {
        value: utils2.nyi
      }
    },
    attributes: {
      width: {
        type: "unsigned long",
        default: 300
      },
      height: {
        type: "unsigned long",
        default: 150
      }
    }
  });
  define({
    tag: "dialog",
    name: "HTMLDialogElement",
    ctor: function HTMLDialogElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      show: {
        value: utils2.nyi
      },
      showModal: {
        value: utils2.nyi
      },
      close: {
        value: utils2.nyi
      }
    },
    attributes: {
      open: Boolean,
      returnValue: String
    }
  });
  define({
    tag: "menuitem",
    name: "HTMLMenuItemElement",
    ctor: function HTMLMenuItemElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      // The menuitem's label
      _label: {
        get: function() {
          var val = this._getattr("label");
          if (val !== null && val !== "") {
            return val;
          }
          val = this.textContent;
          return val.replace(/[ \t\n\f\r]+/g, " ").trim();
        }
      },
      // The menuitem label IDL attribute
      label: {
        get: function() {
          var val = this._getattr("label");
          if (val !== null) {
            return val;
          }
          return this._label;
        },
        set: function(v) {
          this._setattr("label", v);
        }
      }
    },
    attributes: {
      type: {
        type: ["command", "checkbox", "radio"],
        missing: "command"
      },
      icon: URL2,
      disabled: Boolean,
      checked: Boolean,
      radiogroup: String,
      default: Boolean
    }
  });
  define({
    tag: "source",
    name: "HTMLSourceElement",
    ctor: function HTMLSourceElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      srcset: String,
      sizes: String,
      media: String,
      src: URL2,
      type: String,
      width: String,
      height: String
    }
  });
  define({
    tag: "track",
    name: "HTMLTrackElement",
    ctor: function HTMLTrackElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      src: URL2,
      srclang: String,
      label: String,
      default: Boolean,
      kind: {
        type: ["subtitles", "captions", "descriptions", "chapters", "metadata"],
        missing: "subtitles",
        invalid: "metadata"
      }
    },
    props: {
      NONE: {
        get: function() {
          return 0;
        }
      },
      LOADING: {
        get: function() {
          return 1;
        }
      },
      LOADED: {
        get: function() {
          return 2;
        }
      },
      ERROR: {
        get: function() {
          return 3;
        }
      },
      readyState: {
        get: utils2.nyi
      },
      track: {
        get: utils2.nyi
      }
    }
  });
  define({
    // obsolete
    tag: "font",
    name: "HTMLFontElement",
    ctor: function HTMLFontElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      color: {
        type: String,
        treatNullAsEmptyString: true
      },
      face: {
        type: String
      },
      size: {
        type: String
      }
    }
  });
  define({
    // obsolete
    tag: "dir",
    name: "HTMLDirectoryElement",
    ctor: function HTMLDirectoryElement(doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      compact: Boolean
    }
  });
  define({
    tags: [
      "abbr",
      "address",
      "article",
      "aside",
      "b",
      "bdi",
      "bdo",
      "cite",
      "content",
      "code",
      "dd",
      "dfn",
      "dt",
      "em",
      "figcaption",
      "figure",
      "footer",
      "header",
      "hgroup",
      "i",
      "kbd",
      "main",
      "mark",
      "nav",
      "noscript",
      "rb",
      "rp",
      "rt",
      "rtc",
      "ruby",
      "s",
      "samp",
      "section",
      "small",
      "strong",
      "sub",
      "summary",
      "sup",
      "u",
      "var",
      "wbr",
      // Legacy elements
      "acronym",
      "basefont",
      "big",
      "center",
      "nobr",
      "noembed",
      "noframes",
      "plaintext",
      "strike",
      "tt"
    ]
  });
  return htmlelts;
}
var svg = {};
var hasRequiredSvg;
function requireSvg() {
  if (hasRequiredSvg) return svg;
  hasRequiredSvg = 1;
  (function(exports) {
    var Element = requireElement();
    var defineElement2 = requireDefineElement();
    var utils2 = requireUtils();
    var CSSStyleDeclaration = requireCSSStyleDeclaration();
    var svgElements = exports.elements = {};
    var svgNameToImpl = /* @__PURE__ */ Object.create(null);
    exports.createElement = function(doc, localName, prefix) {
      var impl2 = svgNameToImpl[localName] || SVGElement;
      return new impl2(doc, localName, prefix);
    };
    function define(spec) {
      return defineElement2(spec, SVGElement, svgElements, svgNameToImpl);
    }
    var SVGElement = define({
      superclass: Element,
      name: "SVGElement",
      ctor: function SVGElement2(doc, localName, prefix) {
        Element.call(this, doc, localName, utils2.NAMESPACE.SVG, prefix);
      },
      props: {
        style: {
          get: function() {
            if (!this._style) this._style = new CSSStyleDeclaration(this);
            return this._style;
          }
        }
      }
    });
    define({
      name: "SVGSVGElement",
      ctor: function SVGSVGElement(doc, localName, prefix) {
        SVGElement.call(this, doc, localName, prefix);
      },
      tag: "svg",
      props: {
        createSVGRect: {
          value: function() {
            return exports.createElement(this.ownerDocument, "rect", null);
          }
        }
      }
    });
    define({
      tags: ["a", "altGlyph", "altGlyphDef", "altGlyphItem", "animate", "animateColor", "animateMotion", "animateTransform", "circle", "clipPath", "color-profile", "cursor", "defs", "desc", "ellipse", "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence", "filter", "font", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignObject", "g", "glyph", "glyphRef", "hkern", "image", "line", "linearGradient", "marker", "mask", "metadata", "missing-glyph", "mpath", "path", "pattern", "polygon", "polyline", "radialGradient", "rect", "script", "set", "stop", "style", "switch", "symbol", "text", "textPath", "title", "tref", "tspan", "use", "view", "vkern"]
    });
  })(svg);
  return svg;
}
var MutationConstants;
var hasRequiredMutationConstants;
function requireMutationConstants() {
  if (hasRequiredMutationConstants) return MutationConstants;
  hasRequiredMutationConstants = 1;
  MutationConstants = {
    VALUE: 1,
    // The value of a Text, Comment or PI node changed
    ATTR: 2,
    // A new attribute was added or an attribute value and/or prefix changed
    REMOVE_ATTR: 3,
    // An attribute was removed
    REMOVE: 4,
    // A node was removed
    MOVE: 5,
    // A node was moved
    INSERT: 6
    // A node (or a subtree of nodes) was inserted
  };
  return MutationConstants;
}
var Document_1;
var hasRequiredDocument;
function requireDocument() {
  if (hasRequiredDocument) return Document_1;
  hasRequiredDocument = 1;
  Document_1 = Document;
  var Node = requireNode();
  var NodeList = requireNodeList();
  var ContainerNode = requireContainerNode();
  var Element = requireElement();
  var Text = requireText();
  var Comment = requireComment();
  var Event = requireEvent();
  var DocumentFragment = requireDocumentFragment();
  var ProcessingInstruction = requireProcessingInstruction();
  var DOMImplementation = requireDOMImplementation();
  var TreeWalker = requireTreeWalker();
  var NodeIterator = requireNodeIterator();
  var NodeFilter = requireNodeFilter();
  var URL2 = requireURL();
  var select2 = requireSelect();
  var events2 = requireEvents();
  var xml = requireXmlnames();
  var html = requireHtmlelts();
  var svg2 = requireSvg();
  var utils2 = requireUtils();
  var MUTATE = requireMutationConstants();
  var NAMESPACE = utils2.NAMESPACE;
  var isApiWritable = requireConfig().isApiWritable;
  function Document(isHTML, address) {
    ContainerNode.call(this);
    this.nodeType = Node.DOCUMENT_NODE;
    this.isHTML = isHTML;
    this._address = address || "about:blank";
    this.readyState = "loading";
    this.implementation = new DOMImplementation(this);
    this.ownerDocument = null;
    this._contentType = isHTML ? "text/html" : "application/xml";
    this.doctype = null;
    this.documentElement = null;
    this._templateDocCache = null;
    this._nodeIterators = null;
    this._nid = 1;
    this._nextnid = 2;
    this._nodes = [null, this];
    this.byId = /* @__PURE__ */ Object.create(null);
    this.modclock = 0;
  }
  var supportedEvents = {
    event: "Event",
    customevent: "CustomEvent",
    uievent: "UIEvent",
    mouseevent: "MouseEvent"
  };
  var replacementEvent = {
    events: "event",
    htmlevents: "event",
    mouseevents: "mouseevent",
    mutationevents: "mutationevent",
    uievents: "uievent"
  };
  var mirrorAttr = function(f, name, defaultValue) {
    return {
      get: function() {
        var o = f.call(this);
        if (o) {
          return o[name];
        }
        return defaultValue;
      },
      set: function(value) {
        var o = f.call(this);
        if (o) {
          o[name] = value;
        }
      }
    };
  };
  function validateAndExtract(namespace, qualifiedName) {
    var prefix, localName, pos;
    if (namespace === "") {
      namespace = null;
    }
    if (!xml.isValidQName(qualifiedName)) {
      utils2.InvalidCharacterError();
    }
    prefix = null;
    localName = qualifiedName;
    pos = qualifiedName.indexOf(":");
    if (pos >= 0) {
      prefix = qualifiedName.substring(0, pos);
      localName = qualifiedName.substring(pos + 1);
    }
    if (prefix !== null && namespace === null) {
      utils2.NamespaceError();
    }
    if (prefix === "xml" && namespace !== NAMESPACE.XML) {
      utils2.NamespaceError();
    }
    if ((prefix === "xmlns" || qualifiedName === "xmlns") && namespace !== NAMESPACE.XMLNS) {
      utils2.NamespaceError();
    }
    if (namespace === NAMESPACE.XMLNS && !(prefix === "xmlns" || qualifiedName === "xmlns")) {
      utils2.NamespaceError();
    }
    return {
      namespace,
      prefix,
      localName
    };
  }
  Document.prototype = Object.create(ContainerNode.prototype, {
    // This method allows dom.js to communicate with a renderer
    // that displays the document in some way
    // XXX: I should probably move this to the window object
    _setMutationHandler: {
      value: function(handler) {
        this.mutationHandler = handler;
      }
    },
    // This method allows dom.js to receive event notifications
    // from the renderer.
    // XXX: I should probably move this to the window object
    _dispatchRendererEvent: {
      value: function(targetNid, type, details) {
        var target = this._nodes[targetNid];
        if (!target) return;
        target._dispatchEvent(new Event(type, details), true);
      }
    },
    nodeName: {
      value: "#document"
    },
    nodeValue: {
      get: function() {
        return null;
      },
      set: function() {
      }
    },
    // XXX: DOMCore may remove documentURI, so it is NYI for now
    documentURI: {
      get: function() {
        return this._address;
      },
      set: utils2.nyi
    },
    compatMode: {
      get: function() {
        return this._quirks ? "BackCompat" : "CSS1Compat";
      }
    },
    createTextNode: {
      value: function(data) {
        return new Text(this, String(data));
      }
    },
    createComment: {
      value: function(data) {
        return new Comment(this, data);
      }
    },
    createDocumentFragment: {
      value: function() {
        return new DocumentFragment(this);
      }
    },
    createProcessingInstruction: {
      value: function(target, data) {
        if (!xml.isValidName(target) || data.indexOf("?>") !== -1) utils2.InvalidCharacterError();
        return new ProcessingInstruction(this, target, data);
      }
    },
    createAttribute: {
      value: function(localName) {
        localName = String(localName);
        if (!xml.isValidName(localName)) utils2.InvalidCharacterError();
        if (this.isHTML) {
          localName = utils2.toASCIILowerCase(localName);
        }
        return new Element._Attr(null, localName, null, null, "");
      }
    },
    createAttributeNS: {
      value: function(namespace, qualifiedName) {
        namespace = namespace === null || namespace === void 0 || namespace === "" ? null : String(namespace);
        qualifiedName = String(qualifiedName);
        var ve = validateAndExtract(namespace, qualifiedName);
        return new Element._Attr(null, ve.localName, ve.prefix, ve.namespace, "");
      }
    },
    createElement: {
      value: function(localName) {
        localName = String(localName);
        if (!xml.isValidName(localName)) utils2.InvalidCharacterError();
        if (this.isHTML) {
          if (/[A-Z]/.test(localName)) localName = utils2.toASCIILowerCase(localName);
          return html.createElement(this, localName, null);
        } else if (this.contentType === "application/xhtml+xml") {
          return html.createElement(this, localName, null);
        } else {
          return new Element(this, localName, null, null);
        }
      },
      writable: isApiWritable
    },
    createElementNS: {
      value: function(namespace, qualifiedName) {
        namespace = namespace === null || namespace === void 0 || namespace === "" ? null : String(namespace);
        qualifiedName = String(qualifiedName);
        var ve = validateAndExtract(namespace, qualifiedName);
        return this._createElementNS(ve.localName, ve.namespace, ve.prefix);
      },
      writable: isApiWritable
    },
    // This is used directly by HTML parser, which allows it to create
    // elements with localNames containing ':' and non-default namespaces
    _createElementNS: {
      value: function(localName, namespace, prefix) {
        if (namespace === NAMESPACE.HTML) {
          return html.createElement(this, localName, prefix);
        } else if (namespace === NAMESPACE.SVG) {
          return svg2.createElement(this, localName, prefix);
        }
        return new Element(this, localName, namespace, prefix);
      }
    },
    createEvent: {
      value: function createEvent(interfaceName) {
        interfaceName = interfaceName.toLowerCase();
        var name = replacementEvent[interfaceName] || interfaceName;
        var constructor = events2[supportedEvents[name]];
        if (constructor) {
          var e = new constructor();
          e._initialized = false;
          return e;
        } else {
          utils2.NotSupportedError();
        }
      }
    },
    // See: http://www.w3.org/TR/dom/#dom-document-createtreewalker
    createTreeWalker: {
      value: function(root2, whatToShow, filter) {
        if (!root2) {
          throw new TypeError("root argument is required");
        }
        if (!(root2 instanceof Node)) {
          throw new TypeError("root not a node");
        }
        whatToShow = whatToShow === void 0 ? NodeFilter.SHOW_ALL : +whatToShow;
        filter = filter === void 0 ? null : filter;
        return new TreeWalker(root2, whatToShow, filter);
      }
    },
    // See: http://www.w3.org/TR/dom/#dom-document-createnodeiterator
    createNodeIterator: {
      value: function(root2, whatToShow, filter) {
        if (!root2) {
          throw new TypeError("root argument is required");
        }
        if (!(root2 instanceof Node)) {
          throw new TypeError("root not a node");
        }
        whatToShow = whatToShow === void 0 ? NodeFilter.SHOW_ALL : +whatToShow;
        filter = filter === void 0 ? null : filter;
        return new NodeIterator(root2, whatToShow, filter);
      }
    },
    _attachNodeIterator: {
      value: function(ni) {
        if (!this._nodeIterators) {
          this._nodeIterators = [];
        }
        this._nodeIterators.push(ni);
      }
    },
    _detachNodeIterator: {
      value: function(ni) {
        var idx = this._nodeIterators.indexOf(ni);
        this._nodeIterators.splice(idx, 1);
      }
    },
    _preremoveNodeIterators: {
      value: function(toBeRemoved) {
        if (this._nodeIterators) {
          this._nodeIterators.forEach(function(ni) {
            ni._preremove(toBeRemoved);
          });
        }
      }
    },
    // Maintain the documentElement and
    // doctype properties of the document.  Each of the following
    // methods chains to the Node implementation of the method
    // to do the actual inserting, removal or replacement.
    _updateDocTypeElement: {
      value: function _updateDocTypeElement() {
        this.doctype = this.documentElement = null;
        for (var kid = this.firstChild; kid !== null; kid = kid.nextSibling) {
          if (kid.nodeType === Node.DOCUMENT_TYPE_NODE) this.doctype = kid;
          else if (kid.nodeType === Node.ELEMENT_NODE) this.documentElement = kid;
        }
      }
    },
    insertBefore: {
      value: function insertBefore(child, refChild) {
        Node.prototype.insertBefore.call(this, child, refChild);
        this._updateDocTypeElement();
        return child;
      }
    },
    replaceChild: {
      value: function replaceChild(node, child) {
        Node.prototype.replaceChild.call(this, node, child);
        this._updateDocTypeElement();
        return child;
      }
    },
    removeChild: {
      value: function removeChild(child) {
        Node.prototype.removeChild.call(this, child);
        this._updateDocTypeElement();
        return child;
      }
    },
    getElementById: {
      value: function(id) {
        var n = this.byId[id];
        if (!n) return null;
        if (n instanceof MultiId) {
          return n.getFirst();
        }
        return n;
      }
    },
    _hasMultipleElementsWithId: {
      value: function(id) {
        return this.byId[id] instanceof MultiId;
      }
    },
    // Just copy this method from the Element prototype
    getElementsByName: {
      value: Element.prototype.getElementsByName
    },
    getElementsByTagName: {
      value: Element.prototype.getElementsByTagName
    },
    getElementsByTagNameNS: {
      value: Element.prototype.getElementsByTagNameNS
    },
    getElementsByClassName: {
      value: Element.prototype.getElementsByClassName
    },
    adoptNode: {
      value: function adoptNode(node) {
        if (node.nodeType === Node.DOCUMENT_NODE) utils2.NotSupportedError();
        if (node.nodeType === Node.ATTRIBUTE_NODE) {
          return node;
        }
        if (node.parentNode) node.parentNode.removeChild(node);
        if (node.ownerDocument !== this) recursivelySetOwner(node, this);
        return node;
      }
    },
    importNode: {
      value: function importNode(node, deep) {
        return this.adoptNode(node.cloneNode(deep));
      },
      writable: isApiWritable
    },
    // The following attributes and methods are from the HTML spec
    origin: {
      get: function origin() {
        return null;
      }
    },
    characterSet: {
      get: function characterSet() {
        return "UTF-8";
      }
    },
    contentType: {
      get: function contentType() {
        return this._contentType;
      }
    },
    URL: {
      get: function URL3() {
        return this._address;
      }
    },
    domain: {
      get: utils2.nyi,
      set: utils2.nyi
    },
    referrer: {
      get: utils2.nyi
    },
    cookie: {
      get: utils2.nyi,
      set: utils2.nyi
    },
    lastModified: {
      get: utils2.nyi
    },
    location: {
      get: function() {
        return this.defaultView ? this.defaultView.location : null;
      },
      set: utils2.nyi
    },
    _titleElement: {
      get: function() {
        return this.getElementsByTagName("title").item(0) || null;
      }
    },
    title: {
      get: function() {
        var elt = this._titleElement;
        var value = elt ? elt.textContent : "";
        return value.replace(/[ \t\n\r\f]+/g, " ").replace(/(^ )|( $)/g, "");
      },
      set: function(value) {
        var elt = this._titleElement;
        var head = this.head;
        if (!elt && !head) {
          return;
        }
        if (!elt) {
          elt = this.createElement("title");
          head.appendChild(elt);
        }
        elt.textContent = value;
      }
    },
    dir: mirrorAttr(function() {
      var htmlElement = this.documentElement;
      if (htmlElement && htmlElement.tagName === "HTML") {
        return htmlElement;
      }
    }, "dir", ""),
    fgColor: mirrorAttr(function() {
      return this.body;
    }, "text", ""),
    linkColor: mirrorAttr(function() {
      return this.body;
    }, "link", ""),
    vlinkColor: mirrorAttr(function() {
      return this.body;
    }, "vLink", ""),
    alinkColor: mirrorAttr(function() {
      return this.body;
    }, "aLink", ""),
    bgColor: mirrorAttr(function() {
      return this.body;
    }, "bgColor", ""),
    // Historical aliases of Document#characterSet
    charset: {
      get: function() {
        return this.characterSet;
      }
    },
    inputEncoding: {
      get: function() {
        return this.characterSet;
      }
    },
    scrollingElement: {
      get: function() {
        return this._quirks ? this.body : this.documentElement;
      }
    },
    // Return the first <body> child of the document element.
    // XXX For now, setting this attribute is not implemented.
    body: {
      get: function() {
        return namedHTMLChild(this.documentElement, "body");
      },
      set: utils2.nyi
    },
    // Return the first <head> child of the document element.
    head: {
      get: function() {
        return namedHTMLChild(this.documentElement, "head");
      }
    },
    images: {
      get: utils2.nyi
    },
    embeds: {
      get: utils2.nyi
    },
    plugins: {
      get: utils2.nyi
    },
    links: {
      get: utils2.nyi
    },
    forms: {
      get: utils2.nyi
    },
    scripts: {
      get: utils2.nyi
    },
    applets: {
      get: function() {
        return [];
      }
    },
    activeElement: {
      get: function() {
        return null;
      }
    },
    innerHTML: {
      get: function() {
        return this.serialize();
      },
      set: utils2.nyi
    },
    outerHTML: {
      get: function() {
        return this.serialize();
      },
      set: utils2.nyi
    },
    write: {
      value: function(args) {
        if (!this.isHTML) utils2.InvalidStateError();
        if (!this._parser) return;
        var s = arguments.join("");
        this._parser.parse(s);
      }
    },
    writeln: {
      value: function writeln(args) {
        this.write(Array.prototype.join.call(arguments, "") + "\n");
      }
    },
    open: {
      value: function() {
        this.documentElement = null;
      }
    },
    close: {
      value: function() {
        this.readyState = "interactive";
        this._dispatchEvent(new Event("readystatechange"), true);
        this._dispatchEvent(new Event("DOMContentLoaded"), true);
        this.readyState = "complete";
        this._dispatchEvent(new Event("readystatechange"), true);
        if (this.defaultView) {
          this.defaultView._dispatchEvent(new Event("load"), true);
        }
      }
    },
    // Utility methods
    clone: {
      value: function clone() {
        var d = new Document(this.isHTML, this._address);
        d._quirks = this._quirks;
        d._contentType = this._contentType;
        return d;
      }
    },
    // We need to adopt the nodes if we do a deep clone
    cloneNode: {
      value: function cloneNode(deep) {
        var clone = Node.prototype.cloneNode.call(this, false);
        if (deep) {
          for (var kid = this.firstChild; kid !== null; kid = kid.nextSibling) {
            clone._appendChild(clone.importNode(kid, true));
          }
        }
        clone._updateDocTypeElement();
        return clone;
      }
    },
    isEqual: {
      value: function isEqual(n) {
        return true;
      }
    },
    // Implementation-specific function.  Called when a text, comment,
    // or pi value changes.
    mutateValue: {
      value: function(node) {
        if (this.mutationHandler) {
          this.mutationHandler({
            type: MUTATE.VALUE,
            target: node,
            data: node.data
          });
        }
      }
    },
    // Invoked when an attribute's value changes. Attr holds the new
    // value.  oldval is the old value.  Attribute mutations can also
    // involve changes to the prefix (and therefore the qualified name)
    mutateAttr: {
      value: function(attr, oldval) {
        if (this.mutationHandler) {
          this.mutationHandler({
            type: MUTATE.ATTR,
            target: attr.ownerElement,
            attr
          });
        }
      }
    },
    // Used by removeAttribute and removeAttributeNS for attributes.
    mutateRemoveAttr: {
      value: function(attr) {
        if (this.mutationHandler) {
          this.mutationHandler({
            type: MUTATE.REMOVE_ATTR,
            target: attr.ownerElement,
            attr
          });
        }
      }
    },
    // Called by Node.removeChild, etc. to remove a rooted element from
    // the tree. Only needs to generate a single mutation event when a
    // node is removed, but must recursively mark all descendants as not
    // rooted.
    mutateRemove: {
      value: function(node) {
        if (this.mutationHandler) {
          this.mutationHandler({
            type: MUTATE.REMOVE,
            target: node.parentNode,
            node
          });
        }
        recursivelyUproot(node);
      }
    },
    // Called when a new element becomes rooted.  It must recursively
    // generate mutation events for each of the children, and mark them all
    // as rooted.
    mutateInsert: {
      value: function(node) {
        recursivelyRoot(node);
        if (this.mutationHandler) {
          this.mutationHandler({
            type: MUTATE.INSERT,
            target: node.parentNode,
            node
          });
        }
      }
    },
    // Called when a rooted element is moved within the document
    mutateMove: {
      value: function(node) {
        if (this.mutationHandler) {
          this.mutationHandler({
            type: MUTATE.MOVE,
            target: node
          });
        }
      }
    },
    // Add a mapping from  id to n for n.ownerDocument
    addId: {
      value: function addId(id, n) {
        var val = this.byId[id];
        if (!val) {
          this.byId[id] = n;
        } else {
          if (!(val instanceof MultiId)) {
            val = new MultiId(val);
            this.byId[id] = val;
          }
          val.add(n);
        }
      }
    },
    // Delete the mapping from id to n for n.ownerDocument
    delId: {
      value: function delId(id, n) {
        var val = this.byId[id];
        utils2.assert(val);
        if (val instanceof MultiId) {
          val.del(n);
          if (val.length === 1) {
            this.byId[id] = val.downgrade();
          }
        } else {
          this.byId[id] = void 0;
        }
      }
    },
    _resolve: {
      value: function(href) {
        return new URL2(this._documentBaseURL).resolve(href);
      }
    },
    _documentBaseURL: {
      get: function() {
        var url = this._address;
        if (url === "about:blank") url = "/";
        var base = this.querySelector("base[href]");
        if (base) {
          return new URL2(url).resolve(base.getAttribute("href"));
        }
        return url;
      }
    },
    _templateDoc: {
      get: function() {
        if (!this._templateDocCache) {
          var newDoc = new Document(this.isHTML, this._address);
          this._templateDocCache = newDoc._templateDocCache = newDoc;
        }
        return this._templateDocCache;
      }
    },
    querySelector: {
      value: function(selector) {
        return select2(selector, this)[0];
      }
    },
    querySelectorAll: {
      value: function(selector) {
        var nodes = select2(selector, this);
        return nodes.item ? nodes : new NodeList(nodes);
      }
    }
  });
  var eventHandlerTypes = ["abort", "canplay", "canplaythrough", "change", "click", "contextmenu", "cuechange", "dblclick", "drag", "dragend", "dragenter", "dragleave", "dragover", "dragstart", "drop", "durationchange", "emptied", "ended", "input", "invalid", "keydown", "keypress", "keyup", "loadeddata", "loadedmetadata", "loadstart", "mousedown", "mousemove", "mouseout", "mouseover", "mouseup", "mousewheel", "pause", "play", "playing", "progress", "ratechange", "readystatechange", "reset", "seeked", "seeking", "select", "show", "stalled", "submit", "suspend", "timeupdate", "volumechange", "waiting", "blur", "error", "focus", "load", "scroll"];
  eventHandlerTypes.forEach(function(type) {
    Object.defineProperty(Document.prototype, "on" + type, {
      get: function() {
        return this._getEventHandler(type);
      },
      set: function(v) {
        this._setEventHandler(type, v);
      }
    });
  });
  function namedHTMLChild(parent, name) {
    if (parent && parent.isHTML) {
      for (var kid = parent.firstChild; kid !== null; kid = kid.nextSibling) {
        if (kid.nodeType === Node.ELEMENT_NODE && kid.localName === name && kid.namespaceURI === NAMESPACE.HTML) {
          return kid;
        }
      }
    }
    return null;
  }
  function root(n) {
    n._nid = n.ownerDocument._nextnid++;
    n.ownerDocument._nodes[n._nid] = n;
    if (n.nodeType === Node.ELEMENT_NODE) {
      var id = n.getAttribute("id");
      if (id) n.ownerDocument.addId(id, n);
      if (n._roothook) n._roothook();
    }
  }
  function uproot(n) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      var id = n.getAttribute("id");
      if (id) n.ownerDocument.delId(id, n);
    }
    n.ownerDocument._nodes[n._nid] = void 0;
    n._nid = void 0;
  }
  function recursivelyRoot(node) {
    root(node);
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (var kid = node.firstChild; kid !== null; kid = kid.nextSibling) recursivelyRoot(kid);
    }
  }
  function recursivelyUproot(node) {
    uproot(node);
    for (var kid = node.firstChild; kid !== null; kid = kid.nextSibling) recursivelyUproot(kid);
  }
  function recursivelySetOwner(node, owner) {
    node.ownerDocument = owner;
    node._lastModTime = void 0;
    if (Object.prototype.hasOwnProperty.call(node, "_tagName")) {
      node._tagName = void 0;
    }
    for (var kid = node.firstChild; kid !== null; kid = kid.nextSibling) recursivelySetOwner(kid, owner);
  }
  function MultiId(node) {
    this.nodes = /* @__PURE__ */ Object.create(null);
    this.nodes[node._nid] = node;
    this.length = 1;
    this.firstNode = void 0;
  }
  MultiId.prototype.add = function(node) {
    if (!this.nodes[node._nid]) {
      this.nodes[node._nid] = node;
      this.length++;
      this.firstNode = void 0;
    }
  };
  MultiId.prototype.del = function(node) {
    if (this.nodes[node._nid]) {
      delete this.nodes[node._nid];
      this.length--;
      this.firstNode = void 0;
    }
  };
  MultiId.prototype.getFirst = function() {
    if (!this.firstNode) {
      var nid;
      for (nid in this.nodes) {
        if (this.firstNode === void 0 || this.firstNode.compareDocumentPosition(this.nodes[nid]) & Node.DOCUMENT_POSITION_PRECEDING) {
          this.firstNode = this.nodes[nid];
        }
      }
    }
    return this.firstNode;
  };
  MultiId.prototype.downgrade = function() {
    if (this.length === 1) {
      var nid;
      for (nid in this.nodes) {
        return this.nodes[nid];
      }
    }
    return this;
  };
  return Document_1;
}
var DocumentType_1;
var hasRequiredDocumentType;
function requireDocumentType() {
  if (hasRequiredDocumentType) return DocumentType_1;
  hasRequiredDocumentType = 1;
  DocumentType_1 = DocumentType;
  var Node = requireNode();
  var Leaf = requireLeaf();
  var ChildNode = requireChildNode();
  function DocumentType(ownerDocument, name, publicId, systemId) {
    Leaf.call(this);
    this.nodeType = Node.DOCUMENT_TYPE_NODE;
    this.ownerDocument = ownerDocument || null;
    this.name = name;
    this.publicId = publicId || "";
    this.systemId = systemId || "";
  }
  DocumentType.prototype = Object.create(Leaf.prototype, {
    nodeName: {
      get: function() {
        return this.name;
      }
    },
    nodeValue: {
      get: function() {
        return null;
      },
      set: function() {
      }
    },
    // Utility methods
    clone: {
      value: function clone() {
        return new DocumentType(this.ownerDocument, this.name, this.publicId, this.systemId);
      }
    },
    isEqual: {
      value: function isEqual(n) {
        return this.name === n.name && this.publicId === n.publicId && this.systemId === n.systemId;
      }
    }
  });
  Object.defineProperties(DocumentType.prototype, ChildNode);
  return DocumentType_1;
}
var HTMLParser_1;
var hasRequiredHTMLParser;
function requireHTMLParser() {
  if (hasRequiredHTMLParser) return HTMLParser_1;
  hasRequiredHTMLParser = 1;
  HTMLParser_1 = HTMLParser;
  var Document = requireDocument();
  var DocumentType = requireDocumentType();
  var Node = requireNode();
  var NAMESPACE = requireUtils().NAMESPACE;
  var html = requireHtmlelts();
  var impl2 = html.elements;
  var pushAll = Function.prototype.apply.bind(Array.prototype.push);
  var EOF = -1;
  var TEXT = 1;
  var TAG = 2;
  var ENDTAG = 3;
  var COMMENT = 4;
  var DOCTYPE = 5;
  var NOATTRS = [];
  var quirkyPublicIds = /^HTML$|^-\/\/W3O\/\/DTD W3 HTML Strict 3\.0\/\/EN\/\/$|^-\/W3C\/DTD HTML 4\.0 Transitional\/EN$|^\+\/\/Silmaril\/\/dtd html Pro v0r11 19970101\/\/|^-\/\/AdvaSoft Ltd\/\/DTD HTML 3\.0 asWedit \+ extensions\/\/|^-\/\/AS\/\/DTD HTML 3\.0 asWedit \+ extensions\/\/|^-\/\/IETF\/\/DTD HTML 2\.0 Level 1\/\/|^-\/\/IETF\/\/DTD HTML 2\.0 Level 2\/\/|^-\/\/IETF\/\/DTD HTML 2\.0 Strict Level 1\/\/|^-\/\/IETF\/\/DTD HTML 2\.0 Strict Level 2\/\/|^-\/\/IETF\/\/DTD HTML 2\.0 Strict\/\/|^-\/\/IETF\/\/DTD HTML 2\.0\/\/|^-\/\/IETF\/\/DTD HTML 2\.1E\/\/|^-\/\/IETF\/\/DTD HTML 3\.0\/\/|^-\/\/IETF\/\/DTD HTML 3\.2 Final\/\/|^-\/\/IETF\/\/DTD HTML 3\.2\/\/|^-\/\/IETF\/\/DTD HTML 3\/\/|^-\/\/IETF\/\/DTD HTML Level 0\/\/|^-\/\/IETF\/\/DTD HTML Level 1\/\/|^-\/\/IETF\/\/DTD HTML Level 2\/\/|^-\/\/IETF\/\/DTD HTML Level 3\/\/|^-\/\/IETF\/\/DTD HTML Strict Level 0\/\/|^-\/\/IETF\/\/DTD HTML Strict Level 1\/\/|^-\/\/IETF\/\/DTD HTML Strict Level 2\/\/|^-\/\/IETF\/\/DTD HTML Strict Level 3\/\/|^-\/\/IETF\/\/DTD HTML Strict\/\/|^-\/\/IETF\/\/DTD HTML\/\/|^-\/\/Metrius\/\/DTD Metrius Presentational\/\/|^-\/\/Microsoft\/\/DTD Internet Explorer 2\.0 HTML Strict\/\/|^-\/\/Microsoft\/\/DTD Internet Explorer 2\.0 HTML\/\/|^-\/\/Microsoft\/\/DTD Internet Explorer 2\.0 Tables\/\/|^-\/\/Microsoft\/\/DTD Internet Explorer 3\.0 HTML Strict\/\/|^-\/\/Microsoft\/\/DTD Internet Explorer 3\.0 HTML\/\/|^-\/\/Microsoft\/\/DTD Internet Explorer 3\.0 Tables\/\/|^-\/\/Netscape Comm\. Corp\.\/\/DTD HTML\/\/|^-\/\/Netscape Comm\. Corp\.\/\/DTD Strict HTML\/\/|^-\/\/O'Reilly and Associates\/\/DTD HTML 2\.0\/\/|^-\/\/O'Reilly and Associates\/\/DTD HTML Extended 1\.0\/\/|^-\/\/O'Reilly and Associates\/\/DTD HTML Extended Relaxed 1\.0\/\/|^-\/\/SoftQuad Software\/\/DTD HoTMetaL PRO 6\.0::19990601::extensions to HTML 4\.0\/\/|^-\/\/SoftQuad\/\/DTD HoTMetaL PRO 4\.0::19971010::extensions to HTML 4\.0\/\/|^-\/\/Spyglass\/\/DTD HTML 2\.0 Extended\/\/|^-\/\/SQ\/\/DTD HTML 2\.0 HoTMetaL \+ extensions\/\/|^-\/\/Sun Microsystems Corp\.\/\/DTD HotJava HTML\/\/|^-\/\/Sun Microsystems Corp\.\/\/DTD HotJava Strict HTML\/\/|^-\/\/W3C\/\/DTD HTML 3 1995-03-24\/\/|^-\/\/W3C\/\/DTD HTML 3\.2 Draft\/\/|^-\/\/W3C\/\/DTD HTML 3\.2 Final\/\/|^-\/\/W3C\/\/DTD HTML 3\.2\/\/|^-\/\/W3C\/\/DTD HTML 3\.2S Draft\/\/|^-\/\/W3C\/\/DTD HTML 4\.0 Frameset\/\/|^-\/\/W3C\/\/DTD HTML 4\.0 Transitional\/\/|^-\/\/W3C\/\/DTD HTML Experimental 19960712\/\/|^-\/\/W3C\/\/DTD HTML Experimental 970421\/\/|^-\/\/W3C\/\/DTD W3 HTML\/\/|^-\/\/W3O\/\/DTD W3 HTML 3\.0\/\/|^-\/\/WebTechs\/\/DTD Mozilla HTML 2\.0\/\/|^-\/\/WebTechs\/\/DTD Mozilla HTML\/\//i;
  var quirkySystemId = "http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd";
  var conditionallyQuirkyPublicIds = /^-\/\/W3C\/\/DTD HTML 4\.01 Frameset\/\/|^-\/\/W3C\/\/DTD HTML 4\.01 Transitional\/\//i;
  var limitedQuirkyPublicIds = /^-\/\/W3C\/\/DTD XHTML 1\.0 Frameset\/\/|^-\/\/W3C\/\/DTD XHTML 1\.0 Transitional\/\//i;
  var specialSet = /* @__PURE__ */ Object.create(null);
  specialSet[NAMESPACE.HTML] = {
    __proto__: null,
    "address": true,
    "applet": true,
    "area": true,
    "article": true,
    "aside": true,
    "base": true,
    "basefont": true,
    "bgsound": true,
    "blockquote": true,
    "body": true,
    "br": true,
    "button": true,
    "caption": true,
    "center": true,
    "col": true,
    "colgroup": true,
    "dd": true,
    "details": true,
    "dir": true,
    "div": true,
    "dl": true,
    "dt": true,
    "embed": true,
    "fieldset": true,
    "figcaption": true,
    "figure": true,
    "footer": true,
    "form": true,
    "frame": true,
    "frameset": true,
    "h1": true,
    "h2": true,
    "h3": true,
    "h4": true,
    "h5": true,
    "h6": true,
    "head": true,
    "header": true,
    "hgroup": true,
    "hr": true,
    "html": true,
    "iframe": true,
    "img": true,
    "input": true,
    "li": true,
    "link": true,
    "listing": true,
    "main": true,
    "marquee": true,
    "menu": true,
    "meta": true,
    "nav": true,
    "noembed": true,
    "noframes": true,
    "noscript": true,
    "object": true,
    "ol": true,
    "p": true,
    "param": true,
    "plaintext": true,
    "pre": true,
    "script": true,
    "section": true,
    "select": true,
    "source": true,
    "style": true,
    "summary": true,
    "table": true,
    "tbody": true,
    "td": true,
    "template": true,
    "textarea": true,
    "tfoot": true,
    "th": true,
    "thead": true,
    "title": true,
    "tr": true,
    "track": true,
    // Note that "xmp" was removed from the "special" set in the latest
    // spec, apparently by accident; see
    // https://github.com/whatwg/html/pull/1919
    "ul": true,
    "wbr": true,
    "xmp": true
  };
  specialSet[NAMESPACE.SVG] = {
    __proto__: null,
    "foreignObject": true,
    "desc": true,
    "title": true
  };
  specialSet[NAMESPACE.MATHML] = {
    __proto__: null,
    "mi": true,
    "mo": true,
    "mn": true,
    "ms": true,
    "mtext": true,
    "annotation-xml": true
  };
  var addressdivpSet = /* @__PURE__ */ Object.create(null);
  addressdivpSet[NAMESPACE.HTML] = {
    __proto__: null,
    "address": true,
    "div": true,
    "p": true
  };
  var dddtSet = /* @__PURE__ */ Object.create(null);
  dddtSet[NAMESPACE.HTML] = {
    __proto__: null,
    "dd": true,
    "dt": true
  };
  var tablesectionrowSet = /* @__PURE__ */ Object.create(null);
  tablesectionrowSet[NAMESPACE.HTML] = {
    __proto__: null,
    "table": true,
    "thead": true,
    "tbody": true,
    "tfoot": true,
    "tr": true
  };
  var impliedEndTagsSet = /* @__PURE__ */ Object.create(null);
  impliedEndTagsSet[NAMESPACE.HTML] = {
    __proto__: null,
    "dd": true,
    "dt": true,
    "li": true,
    "menuitem": true,
    "optgroup": true,
    "option": true,
    "p": true,
    "rb": true,
    "rp": true,
    "rt": true,
    "rtc": true
  };
  var thoroughImpliedEndTagsSet = /* @__PURE__ */ Object.create(null);
  thoroughImpliedEndTagsSet[NAMESPACE.HTML] = {
    __proto__: null,
    "caption": true,
    "colgroup": true,
    "dd": true,
    "dt": true,
    "li": true,
    "optgroup": true,
    "option": true,
    "p": true,
    "rb": true,
    "rp": true,
    "rt": true,
    "rtc": true,
    "tbody": true,
    "td": true,
    "tfoot": true,
    "th": true,
    "thead": true,
    "tr": true
  };
  var tableContextSet = /* @__PURE__ */ Object.create(null);
  tableContextSet[NAMESPACE.HTML] = {
    __proto__: null,
    "table": true,
    "template": true,
    "html": true
  };
  var tableBodyContextSet = /* @__PURE__ */ Object.create(null);
  tableBodyContextSet[NAMESPACE.HTML] = {
    __proto__: null,
    "tbody": true,
    "tfoot": true,
    "thead": true,
    "template": true,
    "html": true
  };
  var tableRowContextSet = /* @__PURE__ */ Object.create(null);
  tableRowContextSet[NAMESPACE.HTML] = {
    __proto__: null,
    "tr": true,
    "template": true,
    "html": true
  };
  var formassociatedSet = /* @__PURE__ */ Object.create(null);
  formassociatedSet[NAMESPACE.HTML] = {
    __proto__: null,
    "button": true,
    "fieldset": true,
    "input": true,
    "keygen": true,
    "object": true,
    "output": true,
    "select": true,
    "textarea": true,
    "img": true
  };
  var inScopeSet = /* @__PURE__ */ Object.create(null);
  inScopeSet[NAMESPACE.HTML] = {
    __proto__: null,
    "applet": true,
    "caption": true,
    "html": true,
    "table": true,
    "td": true,
    "th": true,
    "marquee": true,
    "object": true,
    "template": true
  };
  inScopeSet[NAMESPACE.MATHML] = {
    __proto__: null,
    "mi": true,
    "mo": true,
    "mn": true,
    "ms": true,
    "mtext": true,
    "annotation-xml": true
  };
  inScopeSet[NAMESPACE.SVG] = {
    __proto__: null,
    "foreignObject": true,
    "desc": true,
    "title": true
  };
  var inListItemScopeSet = Object.create(inScopeSet);
  inListItemScopeSet[NAMESPACE.HTML] = Object.create(inScopeSet[NAMESPACE.HTML]);
  inListItemScopeSet[NAMESPACE.HTML].ol = true;
  inListItemScopeSet[NAMESPACE.HTML].ul = true;
  var inButtonScopeSet = Object.create(inScopeSet);
  inButtonScopeSet[NAMESPACE.HTML] = Object.create(inScopeSet[NAMESPACE.HTML]);
  inButtonScopeSet[NAMESPACE.HTML].button = true;
  var inTableScopeSet = /* @__PURE__ */ Object.create(null);
  inTableScopeSet[NAMESPACE.HTML] = {
    __proto__: null,
    "html": true,
    "table": true,
    "template": true
  };
  var invertedSelectScopeSet = /* @__PURE__ */ Object.create(null);
  invertedSelectScopeSet[NAMESPACE.HTML] = {
    __proto__: null,
    "optgroup": true,
    "option": true
  };
  var mathmlTextIntegrationPointSet = /* @__PURE__ */ Object.create(null);
  mathmlTextIntegrationPointSet[NAMESPACE.MATHML] = {
    __proto__: null,
    mi: true,
    mo: true,
    mn: true,
    ms: true,
    mtext: true
  };
  var htmlIntegrationPointSet = /* @__PURE__ */ Object.create(null);
  htmlIntegrationPointSet[NAMESPACE.SVG] = {
    __proto__: null,
    foreignObject: true,
    desc: true,
    title: true
  };
  var foreignAttributes = {
    __proto__: null,
    "xlink:actuate": NAMESPACE.XLINK,
    "xlink:arcrole": NAMESPACE.XLINK,
    "xlink:href": NAMESPACE.XLINK,
    "xlink:role": NAMESPACE.XLINK,
    "xlink:show": NAMESPACE.XLINK,
    "xlink:title": NAMESPACE.XLINK,
    "xlink:type": NAMESPACE.XLINK,
    "xml:base": NAMESPACE.XML,
    "xml:lang": NAMESPACE.XML,
    "xml:space": NAMESPACE.XML,
    "xmlns": NAMESPACE.XMLNS,
    "xmlns:xlink": NAMESPACE.XMLNS
  };
  var svgAttrAdjustments = {
    __proto__: null,
    attributename: "attributeName",
    attributetype: "attributeType",
    basefrequency: "baseFrequency",
    baseprofile: "baseProfile",
    calcmode: "calcMode",
    clippathunits: "clipPathUnits",
    diffuseconstant: "diffuseConstant",
    edgemode: "edgeMode",
    filterunits: "filterUnits",
    glyphref: "glyphRef",
    gradienttransform: "gradientTransform",
    gradientunits: "gradientUnits",
    kernelmatrix: "kernelMatrix",
    kernelunitlength: "kernelUnitLength",
    keypoints: "keyPoints",
    keysplines: "keySplines",
    keytimes: "keyTimes",
    lengthadjust: "lengthAdjust",
    limitingconeangle: "limitingConeAngle",
    markerheight: "markerHeight",
    markerunits: "markerUnits",
    markerwidth: "markerWidth",
    maskcontentunits: "maskContentUnits",
    maskunits: "maskUnits",
    numoctaves: "numOctaves",
    pathlength: "pathLength",
    patterncontentunits: "patternContentUnits",
    patterntransform: "patternTransform",
    patternunits: "patternUnits",
    pointsatx: "pointsAtX",
    pointsaty: "pointsAtY",
    pointsatz: "pointsAtZ",
    preservealpha: "preserveAlpha",
    preserveaspectratio: "preserveAspectRatio",
    primitiveunits: "primitiveUnits",
    refx: "refX",
    refy: "refY",
    repeatcount: "repeatCount",
    repeatdur: "repeatDur",
    requiredextensions: "requiredExtensions",
    requiredfeatures: "requiredFeatures",
    specularconstant: "specularConstant",
    specularexponent: "specularExponent",
    spreadmethod: "spreadMethod",
    startoffset: "startOffset",
    stddeviation: "stdDeviation",
    stitchtiles: "stitchTiles",
    surfacescale: "surfaceScale",
    systemlanguage: "systemLanguage",
    tablevalues: "tableValues",
    targetx: "targetX",
    targety: "targetY",
    textlength: "textLength",
    viewbox: "viewBox",
    viewtarget: "viewTarget",
    xchannelselector: "xChannelSelector",
    ychannelselector: "yChannelSelector",
    zoomandpan: "zoomAndPan"
  };
  var svgTagNameAdjustments = {
    __proto__: null,
    altglyph: "altGlyph",
    altglyphdef: "altGlyphDef",
    altglyphitem: "altGlyphItem",
    animatecolor: "animateColor",
    animatemotion: "animateMotion",
    animatetransform: "animateTransform",
    clippath: "clipPath",
    feblend: "feBlend",
    fecolormatrix: "feColorMatrix",
    fecomponenttransfer: "feComponentTransfer",
    fecomposite: "feComposite",
    feconvolvematrix: "feConvolveMatrix",
    fediffuselighting: "feDiffuseLighting",
    fedisplacementmap: "feDisplacementMap",
    fedistantlight: "feDistantLight",
    feflood: "feFlood",
    fefunca: "feFuncA",
    fefuncb: "feFuncB",
    fefuncg: "feFuncG",
    fefuncr: "feFuncR",
    fegaussianblur: "feGaussianBlur",
    feimage: "feImage",
    femerge: "feMerge",
    femergenode: "feMergeNode",
    femorphology: "feMorphology",
    feoffset: "feOffset",
    fepointlight: "fePointLight",
    fespecularlighting: "feSpecularLighting",
    fespotlight: "feSpotLight",
    fetile: "feTile",
    feturbulence: "feTurbulence",
    foreignobject: "foreignObject",
    glyphref: "glyphRef",
    lineargradient: "linearGradient",
    radialgradient: "radialGradient",
    textpath: "textPath"
  };
  var numericCharRefReplacements = {
    __proto__: null,
    0: 65533,
    128: 8364,
    130: 8218,
    131: 402,
    132: 8222,
    133: 8230,
    134: 8224,
    135: 8225,
    136: 710,
    137: 8240,
    138: 352,
    139: 8249,
    140: 338,
    142: 381,
    145: 8216,
    146: 8217,
    147: 8220,
    148: 8221,
    149: 8226,
    150: 8211,
    151: 8212,
    152: 732,
    153: 8482,
    154: 353,
    155: 8250,
    156: 339,
    158: 382,
    159: 376
  };
  var namedCharRefs = {
    __proto__: null,
    "AElig": 198,
    "AElig;": 198,
    "AMP": 38,
    "AMP;": 38,
    "Aacute": 193,
    "Aacute;": 193,
    "Abreve;": 258,
    "Acirc": 194,
    "Acirc;": 194,
    "Acy;": 1040,
    "Afr;": [55349, 56580],
    "Agrave": 192,
    "Agrave;": 192,
    "Alpha;": 913,
    "Amacr;": 256,
    "And;": 10835,
    "Aogon;": 260,
    "Aopf;": [55349, 56632],
    "ApplyFunction;": 8289,
    "Aring": 197,
    "Aring;": 197,
    "Ascr;": [55349, 56476],
    "Assign;": 8788,
    "Atilde": 195,
    "Atilde;": 195,
    "Auml": 196,
    "Auml;": 196,
    "Backslash;": 8726,
    "Barv;": 10983,
    "Barwed;": 8966,
    "Bcy;": 1041,
    "Because;": 8757,
    "Bernoullis;": 8492,
    "Beta;": 914,
    "Bfr;": [55349, 56581],
    "Bopf;": [55349, 56633],
    "Breve;": 728,
    "Bscr;": 8492,
    "Bumpeq;": 8782,
    "CHcy;": 1063,
    "COPY": 169,
    "COPY;": 169,
    "Cacute;": 262,
    "Cap;": 8914,
    "CapitalDifferentialD;": 8517,
    "Cayleys;": 8493,
    "Ccaron;": 268,
    "Ccedil": 199,
    "Ccedil;": 199,
    "Ccirc;": 264,
    "Cconint;": 8752,
    "Cdot;": 266,
    "Cedilla;": 184,
    "CenterDot;": 183,
    "Cfr;": 8493,
    "Chi;": 935,
    "CircleDot;": 8857,
    "CircleMinus;": 8854,
    "CirclePlus;": 8853,
    "CircleTimes;": 8855,
    "ClockwiseContourIntegral;": 8754,
    "CloseCurlyDoubleQuote;": 8221,
    "CloseCurlyQuote;": 8217,
    "Colon;": 8759,
    "Colone;": 10868,
    "Congruent;": 8801,
    "Conint;": 8751,
    "ContourIntegral;": 8750,
    "Copf;": 8450,
    "Coproduct;": 8720,
    "CounterClockwiseContourIntegral;": 8755,
    "Cross;": 10799,
    "Cscr;": [55349, 56478],
    "Cup;": 8915,
    "CupCap;": 8781,
    "DD;": 8517,
    "DDotrahd;": 10513,
    "DJcy;": 1026,
    "DScy;": 1029,
    "DZcy;": 1039,
    "Dagger;": 8225,
    "Darr;": 8609,
    "Dashv;": 10980,
    "Dcaron;": 270,
    "Dcy;": 1044,
    "Del;": 8711,
    "Delta;": 916,
    "Dfr;": [55349, 56583],
    "DiacriticalAcute;": 180,
    "DiacriticalDot;": 729,
    "DiacriticalDoubleAcute;": 733,
    "DiacriticalGrave;": 96,
    "DiacriticalTilde;": 732,
    "Diamond;": 8900,
    "DifferentialD;": 8518,
    "Dopf;": [55349, 56635],
    "Dot;": 168,
    "DotDot;": 8412,
    "DotEqual;": 8784,
    "DoubleContourIntegral;": 8751,
    "DoubleDot;": 168,
    "DoubleDownArrow;": 8659,
    "DoubleLeftArrow;": 8656,
    "DoubleLeftRightArrow;": 8660,
    "DoubleLeftTee;": 10980,
    "DoubleLongLeftArrow;": 10232,
    "DoubleLongLeftRightArrow;": 10234,
    "DoubleLongRightArrow;": 10233,
    "DoubleRightArrow;": 8658,
    "DoubleRightTee;": 8872,
    "DoubleUpArrow;": 8657,
    "DoubleUpDownArrow;": 8661,
    "DoubleVerticalBar;": 8741,
    "DownArrow;": 8595,
    "DownArrowBar;": 10515,
    "DownArrowUpArrow;": 8693,
    "DownBreve;": 785,
    "DownLeftRightVector;": 10576,
    "DownLeftTeeVector;": 10590,
    "DownLeftVector;": 8637,
    "DownLeftVectorBar;": 10582,
    "DownRightTeeVector;": 10591,
    "DownRightVector;": 8641,
    "DownRightVectorBar;": 10583,
    "DownTee;": 8868,
    "DownTeeArrow;": 8615,
    "Downarrow;": 8659,
    "Dscr;": [55349, 56479],
    "Dstrok;": 272,
    "ENG;": 330,
    "ETH": 208,
    "ETH;": 208,
    "Eacute": 201,
    "Eacute;": 201,
    "Ecaron;": 282,
    "Ecirc": 202,
    "Ecirc;": 202,
    "Ecy;": 1069,
    "Edot;": 278,
    "Efr;": [55349, 56584],
    "Egrave": 200,
    "Egrave;": 200,
    "Element;": 8712,
    "Emacr;": 274,
    "EmptySmallSquare;": 9723,
    "EmptyVerySmallSquare;": 9643,
    "Eogon;": 280,
    "Eopf;": [55349, 56636],
    "Epsilon;": 917,
    "Equal;": 10869,
    "EqualTilde;": 8770,
    "Equilibrium;": 8652,
    "Escr;": 8496,
    "Esim;": 10867,
    "Eta;": 919,
    "Euml": 203,
    "Euml;": 203,
    "Exists;": 8707,
    "ExponentialE;": 8519,
    "Fcy;": 1060,
    "Ffr;": [55349, 56585],
    "FilledSmallSquare;": 9724,
    "FilledVerySmallSquare;": 9642,
    "Fopf;": [55349, 56637],
    "ForAll;": 8704,
    "Fouriertrf;": 8497,
    "Fscr;": 8497,
    "GJcy;": 1027,
    "GT": 62,
    "GT;": 62,
    "Gamma;": 915,
    "Gammad;": 988,
    "Gbreve;": 286,
    "Gcedil;": 290,
    "Gcirc;": 284,
    "Gcy;": 1043,
    "Gdot;": 288,
    "Gfr;": [55349, 56586],
    "Gg;": 8921,
    "Gopf;": [55349, 56638],
    "GreaterEqual;": 8805,
    "GreaterEqualLess;": 8923,
    "GreaterFullEqual;": 8807,
    "GreaterGreater;": 10914,
    "GreaterLess;": 8823,
    "GreaterSlantEqual;": 10878,
    "GreaterTilde;": 8819,
    "Gscr;": [55349, 56482],
    "Gt;": 8811,
    "HARDcy;": 1066,
    "Hacek;": 711,
    "Hat;": 94,
    "Hcirc;": 292,
    "Hfr;": 8460,
    "HilbertSpace;": 8459,
    "Hopf;": 8461,
    "HorizontalLine;": 9472,
    "Hscr;": 8459,
    "Hstrok;": 294,
    "HumpDownHump;": 8782,
    "HumpEqual;": 8783,
    "IEcy;": 1045,
    "IJlig;": 306,
    "IOcy;": 1025,
    "Iacute": 205,
    "Iacute;": 205,
    "Icirc": 206,
    "Icirc;": 206,
    "Icy;": 1048,
    "Idot;": 304,
    "Ifr;": 8465,
    "Igrave": 204,
    "Igrave;": 204,
    "Im;": 8465,
    "Imacr;": 298,
    "ImaginaryI;": 8520,
    "Implies;": 8658,
    "Int;": 8748,
    "Integral;": 8747,
    "Intersection;": 8898,
    "InvisibleComma;": 8291,
    "InvisibleTimes;": 8290,
    "Iogon;": 302,
    "Iopf;": [55349, 56640],
    "Iota;": 921,
    "Iscr;": 8464,
    "Itilde;": 296,
    "Iukcy;": 1030,
    "Iuml": 207,
    "Iuml;": 207,
    "Jcirc;": 308,
    "Jcy;": 1049,
    "Jfr;": [55349, 56589],
    "Jopf;": [55349, 56641],
    "Jscr;": [55349, 56485],
    "Jsercy;": 1032,
    "Jukcy;": 1028,
    "KHcy;": 1061,
    "KJcy;": 1036,
    "Kappa;": 922,
    "Kcedil;": 310,
    "Kcy;": 1050,
    "Kfr;": [55349, 56590],
    "Kopf;": [55349, 56642],
    "Kscr;": [55349, 56486],
    "LJcy;": 1033,
    "LT": 60,
    "LT;": 60,
    "Lacute;": 313,
    "Lambda;": 923,
    "Lang;": 10218,
    "Laplacetrf;": 8466,
    "Larr;": 8606,
    "Lcaron;": 317,
    "Lcedil;": 315,
    "Lcy;": 1051,
    "LeftAngleBracket;": 10216,
    "LeftArrow;": 8592,
    "LeftArrowBar;": 8676,
    "LeftArrowRightArrow;": 8646,
    "LeftCeiling;": 8968,
    "LeftDoubleBracket;": 10214,
    "LeftDownTeeVector;": 10593,
    "LeftDownVector;": 8643,
    "LeftDownVectorBar;": 10585,
    "LeftFloor;": 8970,
    "LeftRightArrow;": 8596,
    "LeftRightVector;": 10574,
    "LeftTee;": 8867,
    "LeftTeeArrow;": 8612,
    "LeftTeeVector;": 10586,
    "LeftTriangle;": 8882,
    "LeftTriangleBar;": 10703,
    "LeftTriangleEqual;": 8884,
    "LeftUpDownVector;": 10577,
    "LeftUpTeeVector;": 10592,
    "LeftUpVector;": 8639,
    "LeftUpVectorBar;": 10584,
    "LeftVector;": 8636,
    "LeftVectorBar;": 10578,
    "Leftarrow;": 8656,
    "Leftrightarrow;": 8660,
    "LessEqualGreater;": 8922,
    "LessFullEqual;": 8806,
    "LessGreater;": 8822,
    "LessLess;": 10913,
    "LessSlantEqual;": 10877,
    "LessTilde;": 8818,
    "Lfr;": [55349, 56591],
    "Ll;": 8920,
    "Lleftarrow;": 8666,
    "Lmidot;": 319,
    "LongLeftArrow;": 10229,
    "LongLeftRightArrow;": 10231,
    "LongRightArrow;": 10230,
    "Longleftarrow;": 10232,
    "Longleftrightarrow;": 10234,
    "Longrightarrow;": 10233,
    "Lopf;": [55349, 56643],
    "LowerLeftArrow;": 8601,
    "LowerRightArrow;": 8600,
    "Lscr;": 8466,
    "Lsh;": 8624,
    "Lstrok;": 321,
    "Lt;": 8810,
    "Map;": 10501,
    "Mcy;": 1052,
    "MediumSpace;": 8287,
    "Mellintrf;": 8499,
    "Mfr;": [55349, 56592],
    "MinusPlus;": 8723,
    "Mopf;": [55349, 56644],
    "Mscr;": 8499,
    "Mu;": 924,
    "NJcy;": 1034,
    "Nacute;": 323,
    "Ncaron;": 327,
    "Ncedil;": 325,
    "Ncy;": 1053,
    "NegativeMediumSpace;": 8203,
    "NegativeThickSpace;": 8203,
    "NegativeThinSpace;": 8203,
    "NegativeVeryThinSpace;": 8203,
    "NestedGreaterGreater;": 8811,
    "NestedLessLess;": 8810,
    "NewLine;": 10,
    "Nfr;": [55349, 56593],
    "NoBreak;": 8288,
    "NonBreakingSpace;": 160,
    "Nopf;": 8469,
    "Not;": 10988,
    "NotCongruent;": 8802,
    "NotCupCap;": 8813,
    "NotDoubleVerticalBar;": 8742,
    "NotElement;": 8713,
    "NotEqual;": 8800,
    "NotEqualTilde;": [8770, 824],
    "NotExists;": 8708,
    "NotGreater;": 8815,
    "NotGreaterEqual;": 8817,
    "NotGreaterFullEqual;": [8807, 824],
    "NotGreaterGreater;": [8811, 824],
    "NotGreaterLess;": 8825,
    "NotGreaterSlantEqual;": [10878, 824],
    "NotGreaterTilde;": 8821,
    "NotHumpDownHump;": [8782, 824],
    "NotHumpEqual;": [8783, 824],
    "NotLeftTriangle;": 8938,
    "NotLeftTriangleBar;": [10703, 824],
    "NotLeftTriangleEqual;": 8940,
    "NotLess;": 8814,
    "NotLessEqual;": 8816,
    "NotLessGreater;": 8824,
    "NotLessLess;": [8810, 824],
    "NotLessSlantEqual;": [10877, 824],
    "NotLessTilde;": 8820,
    "NotNestedGreaterGreater;": [10914, 824],
    "NotNestedLessLess;": [10913, 824],
    "NotPrecedes;": 8832,
    "NotPrecedesEqual;": [10927, 824],
    "NotPrecedesSlantEqual;": 8928,
    "NotReverseElement;": 8716,
    "NotRightTriangle;": 8939,
    "NotRightTriangleBar;": [10704, 824],
    "NotRightTriangleEqual;": 8941,
    "NotSquareSubset;": [8847, 824],
    "NotSquareSubsetEqual;": 8930,
    "NotSquareSuperset;": [8848, 824],
    "NotSquareSupersetEqual;": 8931,
    "NotSubset;": [8834, 8402],
    "NotSubsetEqual;": 8840,
    "NotSucceeds;": 8833,
    "NotSucceedsEqual;": [10928, 824],
    "NotSucceedsSlantEqual;": 8929,
    "NotSucceedsTilde;": [8831, 824],
    "NotSuperset;": [8835, 8402],
    "NotSupersetEqual;": 8841,
    "NotTilde;": 8769,
    "NotTildeEqual;": 8772,
    "NotTildeFullEqual;": 8775,
    "NotTildeTilde;": 8777,
    "NotVerticalBar;": 8740,
    "Nscr;": [55349, 56489],
    "Ntilde": 209,
    "Ntilde;": 209,
    "Nu;": 925,
    "OElig;": 338,
    "Oacute": 211,
    "Oacute;": 211,
    "Ocirc": 212,
    "Ocirc;": 212,
    "Ocy;": 1054,
    "Odblac;": 336,
    "Ofr;": [55349, 56594],
    "Ograve": 210,
    "Ograve;": 210,
    "Omacr;": 332,
    "Omega;": 937,
    "Omicron;": 927,
    "Oopf;": [55349, 56646],
    "OpenCurlyDoubleQuote;": 8220,
    "OpenCurlyQuote;": 8216,
    "Or;": 10836,
    "Oscr;": [55349, 56490],
    "Oslash": 216,
    "Oslash;": 216,
    "Otilde": 213,
    "Otilde;": 213,
    "Otimes;": 10807,
    "Ouml": 214,
    "Ouml;": 214,
    "OverBar;": 8254,
    "OverBrace;": 9182,
    "OverBracket;": 9140,
    "OverParenthesis;": 9180,
    "PartialD;": 8706,
    "Pcy;": 1055,
    "Pfr;": [55349, 56595],
    "Phi;": 934,
    "Pi;": 928,
    "PlusMinus;": 177,
    "Poincareplane;": 8460,
    "Popf;": 8473,
    "Pr;": 10939,
    "Precedes;": 8826,
    "PrecedesEqual;": 10927,
    "PrecedesSlantEqual;": 8828,
    "PrecedesTilde;": 8830,
    "Prime;": 8243,
    "Product;": 8719,
    "Proportion;": 8759,
    "Proportional;": 8733,
    "Pscr;": [55349, 56491],
    "Psi;": 936,
    "QUOT": 34,
    "QUOT;": 34,
    "Qfr;": [55349, 56596],
    "Qopf;": 8474,
    "Qscr;": [55349, 56492],
    "RBarr;": 10512,
    "REG": 174,
    "REG;": 174,
    "Racute;": 340,
    "Rang;": 10219,
    "Rarr;": 8608,
    "Rarrtl;": 10518,
    "Rcaron;": 344,
    "Rcedil;": 342,
    "Rcy;": 1056,
    "Re;": 8476,
    "ReverseElement;": 8715,
    "ReverseEquilibrium;": 8651,
    "ReverseUpEquilibrium;": 10607,
    "Rfr;": 8476,
    "Rho;": 929,
    "RightAngleBracket;": 10217,
    "RightArrow;": 8594,
    "RightArrowBar;": 8677,
    "RightArrowLeftArrow;": 8644,
    "RightCeiling;": 8969,
    "RightDoubleBracket;": 10215,
    "RightDownTeeVector;": 10589,
    "RightDownVector;": 8642,
    "RightDownVectorBar;": 10581,
    "RightFloor;": 8971,
    "RightTee;": 8866,
    "RightTeeArrow;": 8614,
    "RightTeeVector;": 10587,
    "RightTriangle;": 8883,
    "RightTriangleBar;": 10704,
    "RightTriangleEqual;": 8885,
    "RightUpDownVector;": 10575,
    "RightUpTeeVector;": 10588,
    "RightUpVector;": 8638,
    "RightUpVectorBar;": 10580,
    "RightVector;": 8640,
    "RightVectorBar;": 10579,
    "Rightarrow;": 8658,
    "Ropf;": 8477,
    "RoundImplies;": 10608,
    "Rrightarrow;": 8667,
    "Rscr;": 8475,
    "Rsh;": 8625,
    "RuleDelayed;": 10740,
    "SHCHcy;": 1065,
    "SHcy;": 1064,
    "SOFTcy;": 1068,
    "Sacute;": 346,
    "Sc;": 10940,
    "Scaron;": 352,
    "Scedil;": 350,
    "Scirc;": 348,
    "Scy;": 1057,
    "Sfr;": [55349, 56598],
    "ShortDownArrow;": 8595,
    "ShortLeftArrow;": 8592,
    "ShortRightArrow;": 8594,
    "ShortUpArrow;": 8593,
    "Sigma;": 931,
    "SmallCircle;": 8728,
    "Sopf;": [55349, 56650],
    "Sqrt;": 8730,
    "Square;": 9633,
    "SquareIntersection;": 8851,
    "SquareSubset;": 8847,
    "SquareSubsetEqual;": 8849,
    "SquareSuperset;": 8848,
    "SquareSupersetEqual;": 8850,
    "SquareUnion;": 8852,
    "Sscr;": [55349, 56494],
    "Star;": 8902,
    "Sub;": 8912,
    "Subset;": 8912,
    "SubsetEqual;": 8838,
    "Succeeds;": 8827,
    "SucceedsEqual;": 10928,
    "SucceedsSlantEqual;": 8829,
    "SucceedsTilde;": 8831,
    "SuchThat;": 8715,
    "Sum;": 8721,
    "Sup;": 8913,
    "Superset;": 8835,
    "SupersetEqual;": 8839,
    "Supset;": 8913,
    "THORN": 222,
    "THORN;": 222,
    "TRADE;": 8482,
    "TSHcy;": 1035,
    "TScy;": 1062,
    "Tab;": 9,
    "Tau;": 932,
    "Tcaron;": 356,
    "Tcedil;": 354,
    "Tcy;": 1058,
    "Tfr;": [55349, 56599],
    "Therefore;": 8756,
    "Theta;": 920,
    "ThickSpace;": [8287, 8202],
    "ThinSpace;": 8201,
    "Tilde;": 8764,
    "TildeEqual;": 8771,
    "TildeFullEqual;": 8773,
    "TildeTilde;": 8776,
    "Topf;": [55349, 56651],
    "TripleDot;": 8411,
    "Tscr;": [55349, 56495],
    "Tstrok;": 358,
    "Uacute": 218,
    "Uacute;": 218,
    "Uarr;": 8607,
    "Uarrocir;": 10569,
    "Ubrcy;": 1038,
    "Ubreve;": 364,
    "Ucirc": 219,
    "Ucirc;": 219,
    "Ucy;": 1059,
    "Udblac;": 368,
    "Ufr;": [55349, 56600],
    "Ugrave": 217,
    "Ugrave;": 217,
    "Umacr;": 362,
    "UnderBar;": 95,
    "UnderBrace;": 9183,
    "UnderBracket;": 9141,
    "UnderParenthesis;": 9181,
    "Union;": 8899,
    "UnionPlus;": 8846,
    "Uogon;": 370,
    "Uopf;": [55349, 56652],
    "UpArrow;": 8593,
    "UpArrowBar;": 10514,
    "UpArrowDownArrow;": 8645,
    "UpDownArrow;": 8597,
    "UpEquilibrium;": 10606,
    "UpTee;": 8869,
    "UpTeeArrow;": 8613,
    "Uparrow;": 8657,
    "Updownarrow;": 8661,
    "UpperLeftArrow;": 8598,
    "UpperRightArrow;": 8599,
    "Upsi;": 978,
    "Upsilon;": 933,
    "Uring;": 366,
    "Uscr;": [55349, 56496],
    "Utilde;": 360,
    "Uuml": 220,
    "Uuml;": 220,
    "VDash;": 8875,
    "Vbar;": 10987,
    "Vcy;": 1042,
    "Vdash;": 8873,
    "Vdashl;": 10982,
    "Vee;": 8897,
    "Verbar;": 8214,
    "Vert;": 8214,
    "VerticalBar;": 8739,
    "VerticalLine;": 124,
    "VerticalSeparator;": 10072,
    "VerticalTilde;": 8768,
    "VeryThinSpace;": 8202,
    "Vfr;": [55349, 56601],
    "Vopf;": [55349, 56653],
    "Vscr;": [55349, 56497],
    "Vvdash;": 8874,
    "Wcirc;": 372,
    "Wedge;": 8896,
    "Wfr;": [55349, 56602],
    "Wopf;": [55349, 56654],
    "Wscr;": [55349, 56498],
    "Xfr;": [55349, 56603],
    "Xi;": 926,
    "Xopf;": [55349, 56655],
    "Xscr;": [55349, 56499],
    "YAcy;": 1071,
    "YIcy;": 1031,
    "YUcy;": 1070,
    "Yacute": 221,
    "Yacute;": 221,
    "Ycirc;": 374,
    "Ycy;": 1067,
    "Yfr;": [55349, 56604],
    "Yopf;": [55349, 56656],
    "Yscr;": [55349, 56500],
    "Yuml;": 376,
    "ZHcy;": 1046,
    "Zacute;": 377,
    "Zcaron;": 381,
    "Zcy;": 1047,
    "Zdot;": 379,
    "ZeroWidthSpace;": 8203,
    "Zeta;": 918,
    "Zfr;": 8488,
    "Zopf;": 8484,
    "Zscr;": [55349, 56501],
    "aacute": 225,
    "aacute;": 225,
    "abreve;": 259,
    "ac;": 8766,
    "acE;": [8766, 819],
    "acd;": 8767,
    "acirc": 226,
    "acirc;": 226,
    "acute": 180,
    "acute;": 180,
    "acy;": 1072,
    "aelig": 230,
    "aelig;": 230,
    "af;": 8289,
    "afr;": [55349, 56606],
    "agrave": 224,
    "agrave;": 224,
    "alefsym;": 8501,
    "aleph;": 8501,
    "alpha;": 945,
    "amacr;": 257,
    "amalg;": 10815,
    "amp": 38,
    "amp;": 38,
    "and;": 8743,
    "andand;": 10837,
    "andd;": 10844,
    "andslope;": 10840,
    "andv;": 10842,
    "ang;": 8736,
    "ange;": 10660,
    "angle;": 8736,
    "angmsd;": 8737,
    "angmsdaa;": 10664,
    "angmsdab;": 10665,
    "angmsdac;": 10666,
    "angmsdad;": 10667,
    "angmsdae;": 10668,
    "angmsdaf;": 10669,
    "angmsdag;": 10670,
    "angmsdah;": 10671,
    "angrt;": 8735,
    "angrtvb;": 8894,
    "angrtvbd;": 10653,
    "angsph;": 8738,
    "angst;": 197,
    "angzarr;": 9084,
    "aogon;": 261,
    "aopf;": [55349, 56658],
    "ap;": 8776,
    "apE;": 10864,
    "apacir;": 10863,
    "ape;": 8778,
    "apid;": 8779,
    "apos;": 39,
    "approx;": 8776,
    "approxeq;": 8778,
    "aring": 229,
    "aring;": 229,
    "ascr;": [55349, 56502],
    "ast;": 42,
    "asymp;": 8776,
    "asympeq;": 8781,
    "atilde": 227,
    "atilde;": 227,
    "auml": 228,
    "auml;": 228,
    "awconint;": 8755,
    "awint;": 10769,
    "bNot;": 10989,
    "backcong;": 8780,
    "backepsilon;": 1014,
    "backprime;": 8245,
    "backsim;": 8765,
    "backsimeq;": 8909,
    "barvee;": 8893,
    "barwed;": 8965,
    "barwedge;": 8965,
    "bbrk;": 9141,
    "bbrktbrk;": 9142,
    "bcong;": 8780,
    "bcy;": 1073,
    "bdquo;": 8222,
    "becaus;": 8757,
    "because;": 8757,
    "bemptyv;": 10672,
    "bepsi;": 1014,
    "bernou;": 8492,
    "beta;": 946,
    "beth;": 8502,
    "between;": 8812,
    "bfr;": [55349, 56607],
    "bigcap;": 8898,
    "bigcirc;": 9711,
    "bigcup;": 8899,
    "bigodot;": 10752,
    "bigoplus;": 10753,
    "bigotimes;": 10754,
    "bigsqcup;": 10758,
    "bigstar;": 9733,
    "bigtriangledown;": 9661,
    "bigtriangleup;": 9651,
    "biguplus;": 10756,
    "bigvee;": 8897,
    "bigwedge;": 8896,
    "bkarow;": 10509,
    "blacklozenge;": 10731,
    "blacksquare;": 9642,
    "blacktriangle;": 9652,
    "blacktriangledown;": 9662,
    "blacktriangleleft;": 9666,
    "blacktriangleright;": 9656,
    "blank;": 9251,
    "blk12;": 9618,
    "blk14;": 9617,
    "blk34;": 9619,
    "block;": 9608,
    "bne;": [61, 8421],
    "bnequiv;": [8801, 8421],
    "bnot;": 8976,
    "bopf;": [55349, 56659],
    "bot;": 8869,
    "bottom;": 8869,
    "bowtie;": 8904,
    "boxDL;": 9559,
    "boxDR;": 9556,
    "boxDl;": 9558,
    "boxDr;": 9555,
    "boxH;": 9552,
    "boxHD;": 9574,
    "boxHU;": 9577,
    "boxHd;": 9572,
    "boxHu;": 9575,
    "boxUL;": 9565,
    "boxUR;": 9562,
    "boxUl;": 9564,
    "boxUr;": 9561,
    "boxV;": 9553,
    "boxVH;": 9580,
    "boxVL;": 9571,
    "boxVR;": 9568,
    "boxVh;": 9579,
    "boxVl;": 9570,
    "boxVr;": 9567,
    "boxbox;": 10697,
    "boxdL;": 9557,
    "boxdR;": 9554,
    "boxdl;": 9488,
    "boxdr;": 9484,
    "boxh;": 9472,
    "boxhD;": 9573,
    "boxhU;": 9576,
    "boxhd;": 9516,
    "boxhu;": 9524,
    "boxminus;": 8863,
    "boxplus;": 8862,
    "boxtimes;": 8864,
    "boxuL;": 9563,
    "boxuR;": 9560,
    "boxul;": 9496,
    "boxur;": 9492,
    "boxv;": 9474,
    "boxvH;": 9578,
    "boxvL;": 9569,
    "boxvR;": 9566,
    "boxvh;": 9532,
    "boxvl;": 9508,
    "boxvr;": 9500,
    "bprime;": 8245,
    "breve;": 728,
    "brvbar": 166,
    "brvbar;": 166,
    "bscr;": [55349, 56503],
    "bsemi;": 8271,
    "bsim;": 8765,
    "bsime;": 8909,
    "bsol;": 92,
    "bsolb;": 10693,
    "bsolhsub;": 10184,
    "bull;": 8226,
    "bullet;": 8226,
    "bump;": 8782,
    "bumpE;": 10926,
    "bumpe;": 8783,
    "bumpeq;": 8783,
    "cacute;": 263,
    "cap;": 8745,
    "capand;": 10820,
    "capbrcup;": 10825,
    "capcap;": 10827,
    "capcup;": 10823,
    "capdot;": 10816,
    "caps;": [8745, 65024],
    "caret;": 8257,
    "caron;": 711,
    "ccaps;": 10829,
    "ccaron;": 269,
    "ccedil": 231,
    "ccedil;": 231,
    "ccirc;": 265,
    "ccups;": 10828,
    "ccupssm;": 10832,
    "cdot;": 267,
    "cedil": 184,
    "cedil;": 184,
    "cemptyv;": 10674,
    "cent": 162,
    "cent;": 162,
    "centerdot;": 183,
    "cfr;": [55349, 56608],
    "chcy;": 1095,
    "check;": 10003,
    "checkmark;": 10003,
    "chi;": 967,
    "cir;": 9675,
    "cirE;": 10691,
    "circ;": 710,
    "circeq;": 8791,
    "circlearrowleft;": 8634,
    "circlearrowright;": 8635,
    "circledR;": 174,
    "circledS;": 9416,
    "circledast;": 8859,
    "circledcirc;": 8858,
    "circleddash;": 8861,
    "cire;": 8791,
    "cirfnint;": 10768,
    "cirmid;": 10991,
    "cirscir;": 10690,
    "clubs;": 9827,
    "clubsuit;": 9827,
    "colon;": 58,
    "colone;": 8788,
    "coloneq;": 8788,
    "comma;": 44,
    "commat;": 64,
    "comp;": 8705,
    "compfn;": 8728,
    "complement;": 8705,
    "complexes;": 8450,
    "cong;": 8773,
    "congdot;": 10861,
    "conint;": 8750,
    "copf;": [55349, 56660],
    "coprod;": 8720,
    "copy": 169,
    "copy;": 169,
    "copysr;": 8471,
    "crarr;": 8629,
    "cross;": 10007,
    "cscr;": [55349, 56504],
    "csub;": 10959,
    "csube;": 10961,
    "csup;": 10960,
    "csupe;": 10962,
    "ctdot;": 8943,
    "cudarrl;": 10552,
    "cudarrr;": 10549,
    "cuepr;": 8926,
    "cuesc;": 8927,
    "cularr;": 8630,
    "cularrp;": 10557,
    "cup;": 8746,
    "cupbrcap;": 10824,
    "cupcap;": 10822,
    "cupcup;": 10826,
    "cupdot;": 8845,
    "cupor;": 10821,
    "cups;": [8746, 65024],
    "curarr;": 8631,
    "curarrm;": 10556,
    "curlyeqprec;": 8926,
    "curlyeqsucc;": 8927,
    "curlyvee;": 8910,
    "curlywedge;": 8911,
    "curren": 164,
    "curren;": 164,
    "curvearrowleft;": 8630,
    "curvearrowright;": 8631,
    "cuvee;": 8910,
    "cuwed;": 8911,
    "cwconint;": 8754,
    "cwint;": 8753,
    "cylcty;": 9005,
    "dArr;": 8659,
    "dHar;": 10597,
    "dagger;": 8224,
    "daleth;": 8504,
    "darr;": 8595,
    "dash;": 8208,
    "dashv;": 8867,
    "dbkarow;": 10511,
    "dblac;": 733,
    "dcaron;": 271,
    "dcy;": 1076,
    "dd;": 8518,
    "ddagger;": 8225,
    "ddarr;": 8650,
    "ddotseq;": 10871,
    "deg": 176,
    "deg;": 176,
    "delta;": 948,
    "demptyv;": 10673,
    "dfisht;": 10623,
    "dfr;": [55349, 56609],
    "dharl;": 8643,
    "dharr;": 8642,
    "diam;": 8900,
    "diamond;": 8900,
    "diamondsuit;": 9830,
    "diams;": 9830,
    "die;": 168,
    "digamma;": 989,
    "disin;": 8946,
    "div;": 247,
    "divide": 247,
    "divide;": 247,
    "divideontimes;": 8903,
    "divonx;": 8903,
    "djcy;": 1106,
    "dlcorn;": 8990,
    "dlcrop;": 8973,
    "dollar;": 36,
    "dopf;": [55349, 56661],
    "dot;": 729,
    "doteq;": 8784,
    "doteqdot;": 8785,
    "dotminus;": 8760,
    "dotplus;": 8724,
    "dotsquare;": 8865,
    "doublebarwedge;": 8966,
    "downarrow;": 8595,
    "downdownarrows;": 8650,
    "downharpoonleft;": 8643,
    "downharpoonright;": 8642,
    "drbkarow;": 10512,
    "drcorn;": 8991,
    "drcrop;": 8972,
    "dscr;": [55349, 56505],
    "dscy;": 1109,
    "dsol;": 10742,
    "dstrok;": 273,
    "dtdot;": 8945,
    "dtri;": 9663,
    "dtrif;": 9662,
    "duarr;": 8693,
    "duhar;": 10607,
    "dwangle;": 10662,
    "dzcy;": 1119,
    "dzigrarr;": 10239,
    "eDDot;": 10871,
    "eDot;": 8785,
    "eacute": 233,
    "eacute;": 233,
    "easter;": 10862,
    "ecaron;": 283,
    "ecir;": 8790,
    "ecirc": 234,
    "ecirc;": 234,
    "ecolon;": 8789,
    "ecy;": 1101,
    "edot;": 279,
    "ee;": 8519,
    "efDot;": 8786,
    "efr;": [55349, 56610],
    "eg;": 10906,
    "egrave": 232,
    "egrave;": 232,
    "egs;": 10902,
    "egsdot;": 10904,
    "el;": 10905,
    "elinters;": 9191,
    "ell;": 8467,
    "els;": 10901,
    "elsdot;": 10903,
    "emacr;": 275,
    "empty;": 8709,
    "emptyset;": 8709,
    "emptyv;": 8709,
    "emsp13;": 8196,
    "emsp14;": 8197,
    "emsp;": 8195,
    "eng;": 331,
    "ensp;": 8194,
    "eogon;": 281,
    "eopf;": [55349, 56662],
    "epar;": 8917,
    "eparsl;": 10723,
    "eplus;": 10865,
    "epsi;": 949,
    "epsilon;": 949,
    "epsiv;": 1013,
    "eqcirc;": 8790,
    "eqcolon;": 8789,
    "eqsim;": 8770,
    "eqslantgtr;": 10902,
    "eqslantless;": 10901,
    "equals;": 61,
    "equest;": 8799,
    "equiv;": 8801,
    "equivDD;": 10872,
    "eqvparsl;": 10725,
    "erDot;": 8787,
    "erarr;": 10609,
    "escr;": 8495,
    "esdot;": 8784,
    "esim;": 8770,
    "eta;": 951,
    "eth": 240,
    "eth;": 240,
    "euml": 235,
    "euml;": 235,
    "euro;": 8364,
    "excl;": 33,
    "exist;": 8707,
    "expectation;": 8496,
    "exponentiale;": 8519,
    "fallingdotseq;": 8786,
    "fcy;": 1092,
    "female;": 9792,
    "ffilig;": 64259,
    "fflig;": 64256,
    "ffllig;": 64260,
    "ffr;": [55349, 56611],
    "filig;": 64257,
    "fjlig;": [102, 106],
    "flat;": 9837,
    "fllig;": 64258,
    "fltns;": 9649,
    "fnof;": 402,
    "fopf;": [55349, 56663],
    "forall;": 8704,
    "fork;": 8916,
    "forkv;": 10969,
    "fpartint;": 10765,
    "frac12": 189,
    "frac12;": 189,
    "frac13;": 8531,
    "frac14": 188,
    "frac14;": 188,
    "frac15;": 8533,
    "frac16;": 8537,
    "frac18;": 8539,
    "frac23;": 8532,
    "frac25;": 8534,
    "frac34": 190,
    "frac34;": 190,
    "frac35;": 8535,
    "frac38;": 8540,
    "frac45;": 8536,
    "frac56;": 8538,
    "frac58;": 8541,
    "frac78;": 8542,
    "frasl;": 8260,
    "frown;": 8994,
    "fscr;": [55349, 56507],
    "gE;": 8807,
    "gEl;": 10892,
    "gacute;": 501,
    "gamma;": 947,
    "gammad;": 989,
    "gap;": 10886,
    "gbreve;": 287,
    "gcirc;": 285,
    "gcy;": 1075,
    "gdot;": 289,
    "ge;": 8805,
    "gel;": 8923,
    "geq;": 8805,
    "geqq;": 8807,
    "geqslant;": 10878,
    "ges;": 10878,
    "gescc;": 10921,
    "gesdot;": 10880,
    "gesdoto;": 10882,
    "gesdotol;": 10884,
    "gesl;": [8923, 65024],
    "gesles;": 10900,
    "gfr;": [55349, 56612],
    "gg;": 8811,
    "ggg;": 8921,
    "gimel;": 8503,
    "gjcy;": 1107,
    "gl;": 8823,
    "glE;": 10898,
    "gla;": 10917,
    "glj;": 10916,
    "gnE;": 8809,
    "gnap;": 10890,
    "gnapprox;": 10890,
    "gne;": 10888,
    "gneq;": 10888,
    "gneqq;": 8809,
    "gnsim;": 8935,
    "gopf;": [55349, 56664],
    "grave;": 96,
    "gscr;": 8458,
    "gsim;": 8819,
    "gsime;": 10894,
    "gsiml;": 10896,
    "gt": 62,
    "gt;": 62,
    "gtcc;": 10919,
    "gtcir;": 10874,
    "gtdot;": 8919,
    "gtlPar;": 10645,
    "gtquest;": 10876,
    "gtrapprox;": 10886,
    "gtrarr;": 10616,
    "gtrdot;": 8919,
    "gtreqless;": 8923,
    "gtreqqless;": 10892,
    "gtrless;": 8823,
    "gtrsim;": 8819,
    "gvertneqq;": [8809, 65024],
    "gvnE;": [8809, 65024],
    "hArr;": 8660,
    "hairsp;": 8202,
    "half;": 189,
    "hamilt;": 8459,
    "hardcy;": 1098,
    "harr;": 8596,
    "harrcir;": 10568,
    "harrw;": 8621,
    "hbar;": 8463,
    "hcirc;": 293,
    "hearts;": 9829,
    "heartsuit;": 9829,
    "hellip;": 8230,
    "hercon;": 8889,
    "hfr;": [55349, 56613],
    "hksearow;": 10533,
    "hkswarow;": 10534,
    "hoarr;": 8703,
    "homtht;": 8763,
    "hookleftarrow;": 8617,
    "hookrightarrow;": 8618,
    "hopf;": [55349, 56665],
    "horbar;": 8213,
    "hscr;": [55349, 56509],
    "hslash;": 8463,
    "hstrok;": 295,
    "hybull;": 8259,
    "hyphen;": 8208,
    "iacute": 237,
    "iacute;": 237,
    "ic;": 8291,
    "icirc": 238,
    "icirc;": 238,
    "icy;": 1080,
    "iecy;": 1077,
    "iexcl": 161,
    "iexcl;": 161,
    "iff;": 8660,
    "ifr;": [55349, 56614],
    "igrave": 236,
    "igrave;": 236,
    "ii;": 8520,
    "iiiint;": 10764,
    "iiint;": 8749,
    "iinfin;": 10716,
    "iiota;": 8489,
    "ijlig;": 307,
    "imacr;": 299,
    "image;": 8465,
    "imagline;": 8464,
    "imagpart;": 8465,
    "imath;": 305,
    "imof;": 8887,
    "imped;": 437,
    "in;": 8712,
    "incare;": 8453,
    "infin;": 8734,
    "infintie;": 10717,
    "inodot;": 305,
    "int;": 8747,
    "intcal;": 8890,
    "integers;": 8484,
    "intercal;": 8890,
    "intlarhk;": 10775,
    "intprod;": 10812,
    "iocy;": 1105,
    "iogon;": 303,
    "iopf;": [55349, 56666],
    "iota;": 953,
    "iprod;": 10812,
    "iquest": 191,
    "iquest;": 191,
    "iscr;": [55349, 56510],
    "isin;": 8712,
    "isinE;": 8953,
    "isindot;": 8949,
    "isins;": 8948,
    "isinsv;": 8947,
    "isinv;": 8712,
    "it;": 8290,
    "itilde;": 297,
    "iukcy;": 1110,
    "iuml": 239,
    "iuml;": 239,
    "jcirc;": 309,
    "jcy;": 1081,
    "jfr;": [55349, 56615],
    "jmath;": 567,
    "jopf;": [55349, 56667],
    "jscr;": [55349, 56511],
    "jsercy;": 1112,
    "jukcy;": 1108,
    "kappa;": 954,
    "kappav;": 1008,
    "kcedil;": 311,
    "kcy;": 1082,
    "kfr;": [55349, 56616],
    "kgreen;": 312,
    "khcy;": 1093,
    "kjcy;": 1116,
    "kopf;": [55349, 56668],
    "kscr;": [55349, 56512],
    "lAarr;": 8666,
    "lArr;": 8656,
    "lAtail;": 10523,
    "lBarr;": 10510,
    "lE;": 8806,
    "lEg;": 10891,
    "lHar;": 10594,
    "lacute;": 314,
    "laemptyv;": 10676,
    "lagran;": 8466,
    "lambda;": 955,
    "lang;": 10216,
    "langd;": 10641,
    "langle;": 10216,
    "lap;": 10885,
    "laquo": 171,
    "laquo;": 171,
    "larr;": 8592,
    "larrb;": 8676,
    "larrbfs;": 10527,
    "larrfs;": 10525,
    "larrhk;": 8617,
    "larrlp;": 8619,
    "larrpl;": 10553,
    "larrsim;": 10611,
    "larrtl;": 8610,
    "lat;": 10923,
    "latail;": 10521,
    "late;": 10925,
    "lates;": [10925, 65024],
    "lbarr;": 10508,
    "lbbrk;": 10098,
    "lbrace;": 123,
    "lbrack;": 91,
    "lbrke;": 10635,
    "lbrksld;": 10639,
    "lbrkslu;": 10637,
    "lcaron;": 318,
    "lcedil;": 316,
    "lceil;": 8968,
    "lcub;": 123,
    "lcy;": 1083,
    "ldca;": 10550,
    "ldquo;": 8220,
    "ldquor;": 8222,
    "ldrdhar;": 10599,
    "ldrushar;": 10571,
    "ldsh;": 8626,
    "le;": 8804,
    "leftarrow;": 8592,
    "leftarrowtail;": 8610,
    "leftharpoondown;": 8637,
    "leftharpoonup;": 8636,
    "leftleftarrows;": 8647,
    "leftrightarrow;": 8596,
    "leftrightarrows;": 8646,
    "leftrightharpoons;": 8651,
    "leftrightsquigarrow;": 8621,
    "leftthreetimes;": 8907,
    "leg;": 8922,
    "leq;": 8804,
    "leqq;": 8806,
    "leqslant;": 10877,
    "les;": 10877,
    "lescc;": 10920,
    "lesdot;": 10879,
    "lesdoto;": 10881,
    "lesdotor;": 10883,
    "lesg;": [8922, 65024],
    "lesges;": 10899,
    "lessapprox;": 10885,
    "lessdot;": 8918,
    "lesseqgtr;": 8922,
    "lesseqqgtr;": 10891,
    "lessgtr;": 8822,
    "lesssim;": 8818,
    "lfisht;": 10620,
    "lfloor;": 8970,
    "lfr;": [55349, 56617],
    "lg;": 8822,
    "lgE;": 10897,
    "lhard;": 8637,
    "lharu;": 8636,
    "lharul;": 10602,
    "lhblk;": 9604,
    "ljcy;": 1113,
    "ll;": 8810,
    "llarr;": 8647,
    "llcorner;": 8990,
    "llhard;": 10603,
    "lltri;": 9722,
    "lmidot;": 320,
    "lmoust;": 9136,
    "lmoustache;": 9136,
    "lnE;": 8808,
    "lnap;": 10889,
    "lnapprox;": 10889,
    "lne;": 10887,
    "lneq;": 10887,
    "lneqq;": 8808,
    "lnsim;": 8934,
    "loang;": 10220,
    "loarr;": 8701,
    "lobrk;": 10214,
    "longleftarrow;": 10229,
    "longleftrightarrow;": 10231,
    "longmapsto;": 10236,
    "longrightarrow;": 10230,
    "looparrowleft;": 8619,
    "looparrowright;": 8620,
    "lopar;": 10629,
    "lopf;": [55349, 56669],
    "loplus;": 10797,
    "lotimes;": 10804,
    "lowast;": 8727,
    "lowbar;": 95,
    "loz;": 9674,
    "lozenge;": 9674,
    "lozf;": 10731,
    "lpar;": 40,
    "lparlt;": 10643,
    "lrarr;": 8646,
    "lrcorner;": 8991,
    "lrhar;": 8651,
    "lrhard;": 10605,
    "lrm;": 8206,
    "lrtri;": 8895,
    "lsaquo;": 8249,
    "lscr;": [55349, 56513],
    "lsh;": 8624,
    "lsim;": 8818,
    "lsime;": 10893,
    "lsimg;": 10895,
    "lsqb;": 91,
    "lsquo;": 8216,
    "lsquor;": 8218,
    "lstrok;": 322,
    "lt": 60,
    "lt;": 60,
    "ltcc;": 10918,
    "ltcir;": 10873,
    "ltdot;": 8918,
    "lthree;": 8907,
    "ltimes;": 8905,
    "ltlarr;": 10614,
    "ltquest;": 10875,
    "ltrPar;": 10646,
    "ltri;": 9667,
    "ltrie;": 8884,
    "ltrif;": 9666,
    "lurdshar;": 10570,
    "luruhar;": 10598,
    "lvertneqq;": [8808, 65024],
    "lvnE;": [8808, 65024],
    "mDDot;": 8762,
    "macr": 175,
    "macr;": 175,
    "male;": 9794,
    "malt;": 10016,
    "maltese;": 10016,
    "map;": 8614,
    "mapsto;": 8614,
    "mapstodown;": 8615,
    "mapstoleft;": 8612,
    "mapstoup;": 8613,
    "marker;": 9646,
    "mcomma;": 10793,
    "mcy;": 1084,
    "mdash;": 8212,
    "measuredangle;": 8737,
    "mfr;": [55349, 56618],
    "mho;": 8487,
    "micro": 181,
    "micro;": 181,
    "mid;": 8739,
    "midast;": 42,
    "midcir;": 10992,
    "middot": 183,
    "middot;": 183,
    "minus;": 8722,
    "minusb;": 8863,
    "minusd;": 8760,
    "minusdu;": 10794,
    "mlcp;": 10971,
    "mldr;": 8230,
    "mnplus;": 8723,
    "models;": 8871,
    "mopf;": [55349, 56670],
    "mp;": 8723,
    "mscr;": [55349, 56514],
    "mstpos;": 8766,
    "mu;": 956,
    "multimap;": 8888,
    "mumap;": 8888,
    "nGg;": [8921, 824],
    "nGt;": [8811, 8402],
    "nGtv;": [8811, 824],
    "nLeftarrow;": 8653,
    "nLeftrightarrow;": 8654,
    "nLl;": [8920, 824],
    "nLt;": [8810, 8402],
    "nLtv;": [8810, 824],
    "nRightarrow;": 8655,
    "nVDash;": 8879,
    "nVdash;": 8878,
    "nabla;": 8711,
    "nacute;": 324,
    "nang;": [8736, 8402],
    "nap;": 8777,
    "napE;": [10864, 824],
    "napid;": [8779, 824],
    "napos;": 329,
    "napprox;": 8777,
    "natur;": 9838,
    "natural;": 9838,
    "naturals;": 8469,
    "nbsp": 160,
    "nbsp;": 160,
    "nbump;": [8782, 824],
    "nbumpe;": [8783, 824],
    "ncap;": 10819,
    "ncaron;": 328,
    "ncedil;": 326,
    "ncong;": 8775,
    "ncongdot;": [10861, 824],
    "ncup;": 10818,
    "ncy;": 1085,
    "ndash;": 8211,
    "ne;": 8800,
    "neArr;": 8663,
    "nearhk;": 10532,
    "nearr;": 8599,
    "nearrow;": 8599,
    "nedot;": [8784, 824],
    "nequiv;": 8802,
    "nesear;": 10536,
    "nesim;": [8770, 824],
    "nexist;": 8708,
    "nexists;": 8708,
    "nfr;": [55349, 56619],
    "ngE;": [8807, 824],
    "nge;": 8817,
    "ngeq;": 8817,
    "ngeqq;": [8807, 824],
    "ngeqslant;": [10878, 824],
    "nges;": [10878, 824],
    "ngsim;": 8821,
    "ngt;": 8815,
    "ngtr;": 8815,
    "nhArr;": 8654,
    "nharr;": 8622,
    "nhpar;": 10994,
    "ni;": 8715,
    "nis;": 8956,
    "nisd;": 8954,
    "niv;": 8715,
    "njcy;": 1114,
    "nlArr;": 8653,
    "nlE;": [8806, 824],
    "nlarr;": 8602,
    "nldr;": 8229,
    "nle;": 8816,
    "nleftarrow;": 8602,
    "nleftrightarrow;": 8622,
    "nleq;": 8816,
    "nleqq;": [8806, 824],
    "nleqslant;": [10877, 824],
    "nles;": [10877, 824],
    "nless;": 8814,
    "nlsim;": 8820,
    "nlt;": 8814,
    "nltri;": 8938,
    "nltrie;": 8940,
    "nmid;": 8740,
    "nopf;": [55349, 56671],
    "not": 172,
    "not;": 172,
    "notin;": 8713,
    "notinE;": [8953, 824],
    "notindot;": [8949, 824],
    "notinva;": 8713,
    "notinvb;": 8951,
    "notinvc;": 8950,
    "notni;": 8716,
    "notniva;": 8716,
    "notnivb;": 8958,
    "notnivc;": 8957,
    "npar;": 8742,
    "nparallel;": 8742,
    "nparsl;": [11005, 8421],
    "npart;": [8706, 824],
    "npolint;": 10772,
    "npr;": 8832,
    "nprcue;": 8928,
    "npre;": [10927, 824],
    "nprec;": 8832,
    "npreceq;": [10927, 824],
    "nrArr;": 8655,
    "nrarr;": 8603,
    "nrarrc;": [10547, 824],
    "nrarrw;": [8605, 824],
    "nrightarrow;": 8603,
    "nrtri;": 8939,
    "nrtrie;": 8941,
    "nsc;": 8833,
    "nsccue;": 8929,
    "nsce;": [10928, 824],
    "nscr;": [55349, 56515],
    "nshortmid;": 8740,
    "nshortparallel;": 8742,
    "nsim;": 8769,
    "nsime;": 8772,
    "nsimeq;": 8772,
    "nsmid;": 8740,
    "nspar;": 8742,
    "nsqsube;": 8930,
    "nsqsupe;": 8931,
    "nsub;": 8836,
    "nsubE;": [10949, 824],
    "nsube;": 8840,
    "nsubset;": [8834, 8402],
    "nsubseteq;": 8840,
    "nsubseteqq;": [10949, 824],
    "nsucc;": 8833,
    "nsucceq;": [10928, 824],
    "nsup;": 8837,
    "nsupE;": [10950, 824],
    "nsupe;": 8841,
    "nsupset;": [8835, 8402],
    "nsupseteq;": 8841,
    "nsupseteqq;": [10950, 824],
    "ntgl;": 8825,
    "ntilde": 241,
    "ntilde;": 241,
    "ntlg;": 8824,
    "ntriangleleft;": 8938,
    "ntrianglelefteq;": 8940,
    "ntriangleright;": 8939,
    "ntrianglerighteq;": 8941,
    "nu;": 957,
    "num;": 35,
    "numero;": 8470,
    "numsp;": 8199,
    "nvDash;": 8877,
    "nvHarr;": 10500,
    "nvap;": [8781, 8402],
    "nvdash;": 8876,
    "nvge;": [8805, 8402],
    "nvgt;": [62, 8402],
    "nvinfin;": 10718,
    "nvlArr;": 10498,
    "nvle;": [8804, 8402],
    "nvlt;": [60, 8402],
    "nvltrie;": [8884, 8402],
    "nvrArr;": 10499,
    "nvrtrie;": [8885, 8402],
    "nvsim;": [8764, 8402],
    "nwArr;": 8662,
    "nwarhk;": 10531,
    "nwarr;": 8598,
    "nwarrow;": 8598,
    "nwnear;": 10535,
    "oS;": 9416,
    "oacute": 243,
    "oacute;": 243,
    "oast;": 8859,
    "ocir;": 8858,
    "ocirc": 244,
    "ocirc;": 244,
    "ocy;": 1086,
    "odash;": 8861,
    "odblac;": 337,
    "odiv;": 10808,
    "odot;": 8857,
    "odsold;": 10684,
    "oelig;": 339,
    "ofcir;": 10687,
    "ofr;": [55349, 56620],
    "ogon;": 731,
    "ograve": 242,
    "ograve;": 242,
    "ogt;": 10689,
    "ohbar;": 10677,
    "ohm;": 937,
    "oint;": 8750,
    "olarr;": 8634,
    "olcir;": 10686,
    "olcross;": 10683,
    "oline;": 8254,
    "olt;": 10688,
    "omacr;": 333,
    "omega;": 969,
    "omicron;": 959,
    "omid;": 10678,
    "ominus;": 8854,
    "oopf;": [55349, 56672],
    "opar;": 10679,
    "operp;": 10681,
    "oplus;": 8853,
    "or;": 8744,
    "orarr;": 8635,
    "ord;": 10845,
    "order;": 8500,
    "orderof;": 8500,
    "ordf": 170,
    "ordf;": 170,
    "ordm": 186,
    "ordm;": 186,
    "origof;": 8886,
    "oror;": 10838,
    "orslope;": 10839,
    "orv;": 10843,
    "oscr;": 8500,
    "oslash": 248,
    "oslash;": 248,
    "osol;": 8856,
    "otilde": 245,
    "otilde;": 245,
    "otimes;": 8855,
    "otimesas;": 10806,
    "ouml": 246,
    "ouml;": 246,
    "ovbar;": 9021,
    "par;": 8741,
    "para": 182,
    "para;": 182,
    "parallel;": 8741,
    "parsim;": 10995,
    "parsl;": 11005,
    "part;": 8706,
    "pcy;": 1087,
    "percnt;": 37,
    "period;": 46,
    "permil;": 8240,
    "perp;": 8869,
    "pertenk;": 8241,
    "pfr;": [55349, 56621],
    "phi;": 966,
    "phiv;": 981,
    "phmmat;": 8499,
    "phone;": 9742,
    "pi;": 960,
    "pitchfork;": 8916,
    "piv;": 982,
    "planck;": 8463,
    "planckh;": 8462,
    "plankv;": 8463,
    "plus;": 43,
    "plusacir;": 10787,
    "plusb;": 8862,
    "pluscir;": 10786,
    "plusdo;": 8724,
    "plusdu;": 10789,
    "pluse;": 10866,
    "plusmn": 177,
    "plusmn;": 177,
    "plussim;": 10790,
    "plustwo;": 10791,
    "pm;": 177,
    "pointint;": 10773,
    "popf;": [55349, 56673],
    "pound": 163,
    "pound;": 163,
    "pr;": 8826,
    "prE;": 10931,
    "prap;": 10935,
    "prcue;": 8828,
    "pre;": 10927,
    "prec;": 8826,
    "precapprox;": 10935,
    "preccurlyeq;": 8828,
    "preceq;": 10927,
    "precnapprox;": 10937,
    "precneqq;": 10933,
    "precnsim;": 8936,
    "precsim;": 8830,
    "prime;": 8242,
    "primes;": 8473,
    "prnE;": 10933,
    "prnap;": 10937,
    "prnsim;": 8936,
    "prod;": 8719,
    "profalar;": 9006,
    "profline;": 8978,
    "profsurf;": 8979,
    "prop;": 8733,
    "propto;": 8733,
    "prsim;": 8830,
    "prurel;": 8880,
    "pscr;": [55349, 56517],
    "psi;": 968,
    "puncsp;": 8200,
    "qfr;": [55349, 56622],
    "qint;": 10764,
    "qopf;": [55349, 56674],
    "qprime;": 8279,
    "qscr;": [55349, 56518],
    "quaternions;": 8461,
    "quatint;": 10774,
    "quest;": 63,
    "questeq;": 8799,
    "quot": 34,
    "quot;": 34,
    "rAarr;": 8667,
    "rArr;": 8658,
    "rAtail;": 10524,
    "rBarr;": 10511,
    "rHar;": 10596,
    "race;": [8765, 817],
    "racute;": 341,
    "radic;": 8730,
    "raemptyv;": 10675,
    "rang;": 10217,
    "rangd;": 10642,
    "range;": 10661,
    "rangle;": 10217,
    "raquo": 187,
    "raquo;": 187,
    "rarr;": 8594,
    "rarrap;": 10613,
    "rarrb;": 8677,
    "rarrbfs;": 10528,
    "rarrc;": 10547,
    "rarrfs;": 10526,
    "rarrhk;": 8618,
    "rarrlp;": 8620,
    "rarrpl;": 10565,
    "rarrsim;": 10612,
    "rarrtl;": 8611,
    "rarrw;": 8605,
    "ratail;": 10522,
    "ratio;": 8758,
    "rationals;": 8474,
    "rbarr;": 10509,
    "rbbrk;": 10099,
    "rbrace;": 125,
    "rbrack;": 93,
    "rbrke;": 10636,
    "rbrksld;": 10638,
    "rbrkslu;": 10640,
    "rcaron;": 345,
    "rcedil;": 343,
    "rceil;": 8969,
    "rcub;": 125,
    "rcy;": 1088,
    "rdca;": 10551,
    "rdldhar;": 10601,
    "rdquo;": 8221,
    "rdquor;": 8221,
    "rdsh;": 8627,
    "real;": 8476,
    "realine;": 8475,
    "realpart;": 8476,
    "reals;": 8477,
    "rect;": 9645,
    "reg": 174,
    "reg;": 174,
    "rfisht;": 10621,
    "rfloor;": 8971,
    "rfr;": [55349, 56623],
    "rhard;": 8641,
    "rharu;": 8640,
    "rharul;": 10604,
    "rho;": 961,
    "rhov;": 1009,
    "rightarrow;": 8594,
    "rightarrowtail;": 8611,
    "rightharpoondown;": 8641,
    "rightharpoonup;": 8640,
    "rightleftarrows;": 8644,
    "rightleftharpoons;": 8652,
    "rightrightarrows;": 8649,
    "rightsquigarrow;": 8605,
    "rightthreetimes;": 8908,
    "ring;": 730,
    "risingdotseq;": 8787,
    "rlarr;": 8644,
    "rlhar;": 8652,
    "rlm;": 8207,
    "rmoust;": 9137,
    "rmoustache;": 9137,
    "rnmid;": 10990,
    "roang;": 10221,
    "roarr;": 8702,
    "robrk;": 10215,
    "ropar;": 10630,
    "ropf;": [55349, 56675],
    "roplus;": 10798,
    "rotimes;": 10805,
    "rpar;": 41,
    "rpargt;": 10644,
    "rppolint;": 10770,
    "rrarr;": 8649,
    "rsaquo;": 8250,
    "rscr;": [55349, 56519],
    "rsh;": 8625,
    "rsqb;": 93,
    "rsquo;": 8217,
    "rsquor;": 8217,
    "rthree;": 8908,
    "rtimes;": 8906,
    "rtri;": 9657,
    "rtrie;": 8885,
    "rtrif;": 9656,
    "rtriltri;": 10702,
    "ruluhar;": 10600,
    "rx;": 8478,
    "sacute;": 347,
    "sbquo;": 8218,
    "sc;": 8827,
    "scE;": 10932,
    "scap;": 10936,
    "scaron;": 353,
    "sccue;": 8829,
    "sce;": 10928,
    "scedil;": 351,
    "scirc;": 349,
    "scnE;": 10934,
    "scnap;": 10938,
    "scnsim;": 8937,
    "scpolint;": 10771,
    "scsim;": 8831,
    "scy;": 1089,
    "sdot;": 8901,
    "sdotb;": 8865,
    "sdote;": 10854,
    "seArr;": 8664,
    "searhk;": 10533,
    "searr;": 8600,
    "searrow;": 8600,
    "sect": 167,
    "sect;": 167,
    "semi;": 59,
    "seswar;": 10537,
    "setminus;": 8726,
    "setmn;": 8726,
    "sext;": 10038,
    "sfr;": [55349, 56624],
    "sfrown;": 8994,
    "sharp;": 9839,
    "shchcy;": 1097,
    "shcy;": 1096,
    "shortmid;": 8739,
    "shortparallel;": 8741,
    "shy": 173,
    "shy;": 173,
    "sigma;": 963,
    "sigmaf;": 962,
    "sigmav;": 962,
    "sim;": 8764,
    "simdot;": 10858,
    "sime;": 8771,
    "simeq;": 8771,
    "simg;": 10910,
    "simgE;": 10912,
    "siml;": 10909,
    "simlE;": 10911,
    "simne;": 8774,
    "simplus;": 10788,
    "simrarr;": 10610,
    "slarr;": 8592,
    "smallsetminus;": 8726,
    "smashp;": 10803,
    "smeparsl;": 10724,
    "smid;": 8739,
    "smile;": 8995,
    "smt;": 10922,
    "smte;": 10924,
    "smtes;": [10924, 65024],
    "softcy;": 1100,
    "sol;": 47,
    "solb;": 10692,
    "solbar;": 9023,
    "sopf;": [55349, 56676],
    "spades;": 9824,
    "spadesuit;": 9824,
    "spar;": 8741,
    "sqcap;": 8851,
    "sqcaps;": [8851, 65024],
    "sqcup;": 8852,
    "sqcups;": [8852, 65024],
    "sqsub;": 8847,
    "sqsube;": 8849,
    "sqsubset;": 8847,
    "sqsubseteq;": 8849,
    "sqsup;": 8848,
    "sqsupe;": 8850,
    "sqsupset;": 8848,
    "sqsupseteq;": 8850,
    "squ;": 9633,
    "square;": 9633,
    "squarf;": 9642,
    "squf;": 9642,
    "srarr;": 8594,
    "sscr;": [55349, 56520],
    "ssetmn;": 8726,
    "ssmile;": 8995,
    "sstarf;": 8902,
    "star;": 9734,
    "starf;": 9733,
    "straightepsilon;": 1013,
    "straightphi;": 981,
    "strns;": 175,
    "sub;": 8834,
    "subE;": 10949,
    "subdot;": 10941,
    "sube;": 8838,
    "subedot;": 10947,
    "submult;": 10945,
    "subnE;": 10955,
    "subne;": 8842,
    "subplus;": 10943,
    "subrarr;": 10617,
    "subset;": 8834,
    "subseteq;": 8838,
    "subseteqq;": 10949,
    "subsetneq;": 8842,
    "subsetneqq;": 10955,
    "subsim;": 10951,
    "subsub;": 10965,
    "subsup;": 10963,
    "succ;": 8827,
    "succapprox;": 10936,
    "succcurlyeq;": 8829,
    "succeq;": 10928,
    "succnapprox;": 10938,
    "succneqq;": 10934,
    "succnsim;": 8937,
    "succsim;": 8831,
    "sum;": 8721,
    "sung;": 9834,
    "sup1": 185,
    "sup1;": 185,
    "sup2": 178,
    "sup2;": 178,
    "sup3": 179,
    "sup3;": 179,
    "sup;": 8835,
    "supE;": 10950,
    "supdot;": 10942,
    "supdsub;": 10968,
    "supe;": 8839,
    "supedot;": 10948,
    "suphsol;": 10185,
    "suphsub;": 10967,
    "suplarr;": 10619,
    "supmult;": 10946,
    "supnE;": 10956,
    "supne;": 8843,
    "supplus;": 10944,
    "supset;": 8835,
    "supseteq;": 8839,
    "supseteqq;": 10950,
    "supsetneq;": 8843,
    "supsetneqq;": 10956,
    "supsim;": 10952,
    "supsub;": 10964,
    "supsup;": 10966,
    "swArr;": 8665,
    "swarhk;": 10534,
    "swarr;": 8601,
    "swarrow;": 8601,
    "swnwar;": 10538,
    "szlig": 223,
    "szlig;": 223,
    "target;": 8982,
    "tau;": 964,
    "tbrk;": 9140,
    "tcaron;": 357,
    "tcedil;": 355,
    "tcy;": 1090,
    "tdot;": 8411,
    "telrec;": 8981,
    "tfr;": [55349, 56625],
    "there4;": 8756,
    "therefore;": 8756,
    "theta;": 952,
    "thetasym;": 977,
    "thetav;": 977,
    "thickapprox;": 8776,
    "thicksim;": 8764,
    "thinsp;": 8201,
    "thkap;": 8776,
    "thksim;": 8764,
    "thorn": 254,
    "thorn;": 254,
    "tilde;": 732,
    "times": 215,
    "times;": 215,
    "timesb;": 8864,
    "timesbar;": 10801,
    "timesd;": 10800,
    "tint;": 8749,
    "toea;": 10536,
    "top;": 8868,
    "topbot;": 9014,
    "topcir;": 10993,
    "topf;": [55349, 56677],
    "topfork;": 10970,
    "tosa;": 10537,
    "tprime;": 8244,
    "trade;": 8482,
    "triangle;": 9653,
    "triangledown;": 9663,
    "triangleleft;": 9667,
    "trianglelefteq;": 8884,
    "triangleq;": 8796,
    "triangleright;": 9657,
    "trianglerighteq;": 8885,
    "tridot;": 9708,
    "trie;": 8796,
    "triminus;": 10810,
    "triplus;": 10809,
    "trisb;": 10701,
    "tritime;": 10811,
    "trpezium;": 9186,
    "tscr;": [55349, 56521],
    "tscy;": 1094,
    "tshcy;": 1115,
    "tstrok;": 359,
    "twixt;": 8812,
    "twoheadleftarrow;": 8606,
    "twoheadrightarrow;": 8608,
    "uArr;": 8657,
    "uHar;": 10595,
    "uacute": 250,
    "uacute;": 250,
    "uarr;": 8593,
    "ubrcy;": 1118,
    "ubreve;": 365,
    "ucirc": 251,
    "ucirc;": 251,
    "ucy;": 1091,
    "udarr;": 8645,
    "udblac;": 369,
    "udhar;": 10606,
    "ufisht;": 10622,
    "ufr;": [55349, 56626],
    "ugrave": 249,
    "ugrave;": 249,
    "uharl;": 8639,
    "uharr;": 8638,
    "uhblk;": 9600,
    "ulcorn;": 8988,
    "ulcorner;": 8988,
    "ulcrop;": 8975,
    "ultri;": 9720,
    "umacr;": 363,
    "uml": 168,
    "uml;": 168,
    "uogon;": 371,
    "uopf;": [55349, 56678],
    "uparrow;": 8593,
    "updownarrow;": 8597,
    "upharpoonleft;": 8639,
    "upharpoonright;": 8638,
    "uplus;": 8846,
    "upsi;": 965,
    "upsih;": 978,
    "upsilon;": 965,
    "upuparrows;": 8648,
    "urcorn;": 8989,
    "urcorner;": 8989,
    "urcrop;": 8974,
    "uring;": 367,
    "urtri;": 9721,
    "uscr;": [55349, 56522],
    "utdot;": 8944,
    "utilde;": 361,
    "utri;": 9653,
    "utrif;": 9652,
    "uuarr;": 8648,
    "uuml": 252,
    "uuml;": 252,
    "uwangle;": 10663,
    "vArr;": 8661,
    "vBar;": 10984,
    "vBarv;": 10985,
    "vDash;": 8872,
    "vangrt;": 10652,
    "varepsilon;": 1013,
    "varkappa;": 1008,
    "varnothing;": 8709,
    "varphi;": 981,
    "varpi;": 982,
    "varpropto;": 8733,
    "varr;": 8597,
    "varrho;": 1009,
    "varsigma;": 962,
    "varsubsetneq;": [8842, 65024],
    "varsubsetneqq;": [10955, 65024],
    "varsupsetneq;": [8843, 65024],
    "varsupsetneqq;": [10956, 65024],
    "vartheta;": 977,
    "vartriangleleft;": 8882,
    "vartriangleright;": 8883,
    "vcy;": 1074,
    "vdash;": 8866,
    "vee;": 8744,
    "veebar;": 8891,
    "veeeq;": 8794,
    "vellip;": 8942,
    "verbar;": 124,
    "vert;": 124,
    "vfr;": [55349, 56627],
    "vltri;": 8882,
    "vnsub;": [8834, 8402],
    "vnsup;": [8835, 8402],
    "vopf;": [55349, 56679],
    "vprop;": 8733,
    "vrtri;": 8883,
    "vscr;": [55349, 56523],
    "vsubnE;": [10955, 65024],
    "vsubne;": [8842, 65024],
    "vsupnE;": [10956, 65024],
    "vsupne;": [8843, 65024],
    "vzigzag;": 10650,
    "wcirc;": 373,
    "wedbar;": 10847,
    "wedge;": 8743,
    "wedgeq;": 8793,
    "weierp;": 8472,
    "wfr;": [55349, 56628],
    "wopf;": [55349, 56680],
    "wp;": 8472,
    "wr;": 8768,
    "wreath;": 8768,
    "wscr;": [55349, 56524],
    "xcap;": 8898,
    "xcirc;": 9711,
    "xcup;": 8899,
    "xdtri;": 9661,
    "xfr;": [55349, 56629],
    "xhArr;": 10234,
    "xharr;": 10231,
    "xi;": 958,
    "xlArr;": 10232,
    "xlarr;": 10229,
    "xmap;": 10236,
    "xnis;": 8955,
    "xodot;": 10752,
    "xopf;": [55349, 56681],
    "xoplus;": 10753,
    "xotime;": 10754,
    "xrArr;": 10233,
    "xrarr;": 10230,
    "xscr;": [55349, 56525],
    "xsqcup;": 10758,
    "xuplus;": 10756,
    "xutri;": 9651,
    "xvee;": 8897,
    "xwedge;": 8896,
    "yacute": 253,
    "yacute;": 253,
    "yacy;": 1103,
    "ycirc;": 375,
    "ycy;": 1099,
    "yen": 165,
    "yen;": 165,
    "yfr;": [55349, 56630],
    "yicy;": 1111,
    "yopf;": [55349, 56682],
    "yscr;": [55349, 56526],
    "yucy;": 1102,
    "yuml": 255,
    "yuml;": 255,
    "zacute;": 378,
    "zcaron;": 382,
    "zcy;": 1079,
    "zdot;": 380,
    "zeetrf;": 8488,
    "zeta;": 950,
    "zfr;": [55349, 56631],
    "zhcy;": 1078,
    "zigrarr;": 8669,
    "zopf;": [55349, 56683],
    "zscr;": [55349, 56527],
    "zwj;": 8205,
    "zwnj;": 8204
  };
  var NAMEDCHARREF = /(A(?:Elig;?|MP;?|acute;?|breve;|c(?:irc;?|y;)|fr;|grave;?|lpha;|macr;|nd;|o(?:gon;|pf;)|pplyFunction;|ring;?|s(?:cr;|sign;)|tilde;?|uml;?)|B(?:a(?:ckslash;|r(?:v;|wed;))|cy;|e(?:cause;|rnoullis;|ta;)|fr;|opf;|reve;|scr;|umpeq;)|C(?:Hcy;|OPY;?|a(?:cute;|p(?:;|italDifferentialD;)|yleys;)|c(?:aron;|edil;?|irc;|onint;)|dot;|e(?:dilla;|nterDot;)|fr;|hi;|ircle(?:Dot;|Minus;|Plus;|Times;)|lo(?:ckwiseContourIntegral;|seCurly(?:DoubleQuote;|Quote;))|o(?:lon(?:;|e;)|n(?:gruent;|int;|tourIntegral;)|p(?:f;|roduct;)|unterClockwiseContourIntegral;)|ross;|scr;|up(?:;|Cap;))|D(?:D(?:;|otrahd;)|Jcy;|Scy;|Zcy;|a(?:gger;|rr;|shv;)|c(?:aron;|y;)|el(?:;|ta;)|fr;|i(?:a(?:critical(?:Acute;|Do(?:t;|ubleAcute;)|Grave;|Tilde;)|mond;)|fferentialD;)|o(?:pf;|t(?:;|Dot;|Equal;)|uble(?:ContourIntegral;|Do(?:t;|wnArrow;)|L(?:eft(?:Arrow;|RightArrow;|Tee;)|ong(?:Left(?:Arrow;|RightArrow;)|RightArrow;))|Right(?:Arrow;|Tee;)|Up(?:Arrow;|DownArrow;)|VerticalBar;)|wn(?:Arrow(?:;|Bar;|UpArrow;)|Breve;|Left(?:RightVector;|TeeVector;|Vector(?:;|Bar;))|Right(?:TeeVector;|Vector(?:;|Bar;))|Tee(?:;|Arrow;)|arrow;))|s(?:cr;|trok;))|E(?:NG;|TH;?|acute;?|c(?:aron;|irc;?|y;)|dot;|fr;|grave;?|lement;|m(?:acr;|pty(?:SmallSquare;|VerySmallSquare;))|o(?:gon;|pf;)|psilon;|qu(?:al(?:;|Tilde;)|ilibrium;)|s(?:cr;|im;)|ta;|uml;?|x(?:ists;|ponentialE;))|F(?:cy;|fr;|illed(?:SmallSquare;|VerySmallSquare;)|o(?:pf;|rAll;|uriertrf;)|scr;)|G(?:Jcy;|T;?|amma(?:;|d;)|breve;|c(?:edil;|irc;|y;)|dot;|fr;|g;|opf;|reater(?:Equal(?:;|Less;)|FullEqual;|Greater;|Less;|SlantEqual;|Tilde;)|scr;|t;)|H(?:ARDcy;|a(?:cek;|t;)|circ;|fr;|ilbertSpace;|o(?:pf;|rizontalLine;)|s(?:cr;|trok;)|ump(?:DownHump;|Equal;))|I(?:Ecy;|Jlig;|Ocy;|acute;?|c(?:irc;?|y;)|dot;|fr;|grave;?|m(?:;|a(?:cr;|ginaryI;)|plies;)|n(?:t(?:;|e(?:gral;|rsection;))|visible(?:Comma;|Times;))|o(?:gon;|pf;|ta;)|scr;|tilde;|u(?:kcy;|ml;?))|J(?:c(?:irc;|y;)|fr;|opf;|s(?:cr;|ercy;)|ukcy;)|K(?:Hcy;|Jcy;|appa;|c(?:edil;|y;)|fr;|opf;|scr;)|L(?:Jcy;|T;?|a(?:cute;|mbda;|ng;|placetrf;|rr;)|c(?:aron;|edil;|y;)|e(?:ft(?:A(?:ngleBracket;|rrow(?:;|Bar;|RightArrow;))|Ceiling;|Do(?:ubleBracket;|wn(?:TeeVector;|Vector(?:;|Bar;)))|Floor;|Right(?:Arrow;|Vector;)|T(?:ee(?:;|Arrow;|Vector;)|riangle(?:;|Bar;|Equal;))|Up(?:DownVector;|TeeVector;|Vector(?:;|Bar;))|Vector(?:;|Bar;)|arrow;|rightarrow;)|ss(?:EqualGreater;|FullEqual;|Greater;|Less;|SlantEqual;|Tilde;))|fr;|l(?:;|eftarrow;)|midot;|o(?:ng(?:Left(?:Arrow;|RightArrow;)|RightArrow;|left(?:arrow;|rightarrow;)|rightarrow;)|pf;|wer(?:LeftArrow;|RightArrow;))|s(?:cr;|h;|trok;)|t;)|M(?:ap;|cy;|e(?:diumSpace;|llintrf;)|fr;|inusPlus;|opf;|scr;|u;)|N(?:Jcy;|acute;|c(?:aron;|edil;|y;)|e(?:gative(?:MediumSpace;|Thi(?:ckSpace;|nSpace;)|VeryThinSpace;)|sted(?:GreaterGreater;|LessLess;)|wLine;)|fr;|o(?:Break;|nBreakingSpace;|pf;|t(?:;|C(?:ongruent;|upCap;)|DoubleVerticalBar;|E(?:lement;|qual(?:;|Tilde;)|xists;)|Greater(?:;|Equal;|FullEqual;|Greater;|Less;|SlantEqual;|Tilde;)|Hump(?:DownHump;|Equal;)|Le(?:ftTriangle(?:;|Bar;|Equal;)|ss(?:;|Equal;|Greater;|Less;|SlantEqual;|Tilde;))|Nested(?:GreaterGreater;|LessLess;)|Precedes(?:;|Equal;|SlantEqual;)|R(?:everseElement;|ightTriangle(?:;|Bar;|Equal;))|S(?:quareSu(?:bset(?:;|Equal;)|perset(?:;|Equal;))|u(?:bset(?:;|Equal;)|cceeds(?:;|Equal;|SlantEqual;|Tilde;)|perset(?:;|Equal;)))|Tilde(?:;|Equal;|FullEqual;|Tilde;)|VerticalBar;))|scr;|tilde;?|u;)|O(?:Elig;|acute;?|c(?:irc;?|y;)|dblac;|fr;|grave;?|m(?:acr;|ega;|icron;)|opf;|penCurly(?:DoubleQuote;|Quote;)|r;|s(?:cr;|lash;?)|ti(?:lde;?|mes;)|uml;?|ver(?:B(?:ar;|rac(?:e;|ket;))|Parenthesis;))|P(?:artialD;|cy;|fr;|hi;|i;|lusMinus;|o(?:incareplane;|pf;)|r(?:;|ecedes(?:;|Equal;|SlantEqual;|Tilde;)|ime;|o(?:duct;|portion(?:;|al;)))|s(?:cr;|i;))|Q(?:UOT;?|fr;|opf;|scr;)|R(?:Barr;|EG;?|a(?:cute;|ng;|rr(?:;|tl;))|c(?:aron;|edil;|y;)|e(?:;|verse(?:E(?:lement;|quilibrium;)|UpEquilibrium;))|fr;|ho;|ight(?:A(?:ngleBracket;|rrow(?:;|Bar;|LeftArrow;))|Ceiling;|Do(?:ubleBracket;|wn(?:TeeVector;|Vector(?:;|Bar;)))|Floor;|T(?:ee(?:;|Arrow;|Vector;)|riangle(?:;|Bar;|Equal;))|Up(?:DownVector;|TeeVector;|Vector(?:;|Bar;))|Vector(?:;|Bar;)|arrow;)|o(?:pf;|undImplies;)|rightarrow;|s(?:cr;|h;)|uleDelayed;)|S(?:H(?:CHcy;|cy;)|OFTcy;|acute;|c(?:;|aron;|edil;|irc;|y;)|fr;|hort(?:DownArrow;|LeftArrow;|RightArrow;|UpArrow;)|igma;|mallCircle;|opf;|q(?:rt;|uare(?:;|Intersection;|Su(?:bset(?:;|Equal;)|perset(?:;|Equal;))|Union;))|scr;|tar;|u(?:b(?:;|set(?:;|Equal;))|c(?:ceeds(?:;|Equal;|SlantEqual;|Tilde;)|hThat;)|m;|p(?:;|erset(?:;|Equal;)|set;)))|T(?:HORN;?|RADE;|S(?:Hcy;|cy;)|a(?:b;|u;)|c(?:aron;|edil;|y;)|fr;|h(?:e(?:refore;|ta;)|i(?:ckSpace;|nSpace;))|ilde(?:;|Equal;|FullEqual;|Tilde;)|opf;|ripleDot;|s(?:cr;|trok;))|U(?:a(?:cute;?|rr(?:;|ocir;))|br(?:cy;|eve;)|c(?:irc;?|y;)|dblac;|fr;|grave;?|macr;|n(?:der(?:B(?:ar;|rac(?:e;|ket;))|Parenthesis;)|ion(?:;|Plus;))|o(?:gon;|pf;)|p(?:Arrow(?:;|Bar;|DownArrow;)|DownArrow;|Equilibrium;|Tee(?:;|Arrow;)|arrow;|downarrow;|per(?:LeftArrow;|RightArrow;)|si(?:;|lon;))|ring;|scr;|tilde;|uml;?)|V(?:Dash;|bar;|cy;|dash(?:;|l;)|e(?:e;|r(?:bar;|t(?:;|ical(?:Bar;|Line;|Separator;|Tilde;))|yThinSpace;))|fr;|opf;|scr;|vdash;)|W(?:circ;|edge;|fr;|opf;|scr;)|X(?:fr;|i;|opf;|scr;)|Y(?:Acy;|Icy;|Ucy;|acute;?|c(?:irc;|y;)|fr;|opf;|scr;|uml;)|Z(?:Hcy;|acute;|c(?:aron;|y;)|dot;|e(?:roWidthSpace;|ta;)|fr;|opf;|scr;)|a(?:acute;?|breve;|c(?:;|E;|d;|irc;?|ute;?|y;)|elig;?|f(?:;|r;)|grave;?|l(?:e(?:fsym;|ph;)|pha;)|m(?:a(?:cr;|lg;)|p;?)|n(?:d(?:;|and;|d;|slope;|v;)|g(?:;|e;|le;|msd(?:;|a(?:a;|b;|c;|d;|e;|f;|g;|h;))|rt(?:;|vb(?:;|d;))|s(?:ph;|t;)|zarr;))|o(?:gon;|pf;)|p(?:;|E;|acir;|e;|id;|os;|prox(?:;|eq;))|ring;?|s(?:cr;|t;|ymp(?:;|eq;))|tilde;?|uml;?|w(?:conint;|int;))|b(?:Not;|a(?:ck(?:cong;|epsilon;|prime;|sim(?:;|eq;))|r(?:vee;|wed(?:;|ge;)))|brk(?:;|tbrk;)|c(?:ong;|y;)|dquo;|e(?:caus(?:;|e;)|mptyv;|psi;|rnou;|t(?:a;|h;|ween;))|fr;|ig(?:c(?:ap;|irc;|up;)|o(?:dot;|plus;|times;)|s(?:qcup;|tar;)|triangle(?:down;|up;)|uplus;|vee;|wedge;)|karow;|l(?:a(?:ck(?:lozenge;|square;|triangle(?:;|down;|left;|right;))|nk;)|k(?:1(?:2;|4;)|34;)|ock;)|n(?:e(?:;|quiv;)|ot;)|o(?:pf;|t(?:;|tom;)|wtie;|x(?:D(?:L;|R;|l;|r;)|H(?:;|D;|U;|d;|u;)|U(?:L;|R;|l;|r;)|V(?:;|H;|L;|R;|h;|l;|r;)|box;|d(?:L;|R;|l;|r;)|h(?:;|D;|U;|d;|u;)|minus;|plus;|times;|u(?:L;|R;|l;|r;)|v(?:;|H;|L;|R;|h;|l;|r;)))|prime;|r(?:eve;|vbar;?)|s(?:cr;|emi;|im(?:;|e;)|ol(?:;|b;|hsub;))|u(?:ll(?:;|et;)|mp(?:;|E;|e(?:;|q;))))|c(?:a(?:cute;|p(?:;|and;|brcup;|c(?:ap;|up;)|dot;|s;)|r(?:et;|on;))|c(?:a(?:ps;|ron;)|edil;?|irc;|ups(?:;|sm;))|dot;|e(?:dil;?|mptyv;|nt(?:;|erdot;|))|fr;|h(?:cy;|eck(?:;|mark;)|i;)|ir(?:;|E;|c(?:;|eq;|le(?:arrow(?:left;|right;)|d(?:R;|S;|ast;|circ;|dash;)))|e;|fnint;|mid;|scir;)|lubs(?:;|uit;)|o(?:lon(?:;|e(?:;|q;))|m(?:ma(?:;|t;)|p(?:;|fn;|le(?:ment;|xes;)))|n(?:g(?:;|dot;)|int;)|p(?:f;|rod;|y(?:;|sr;|)))|r(?:arr;|oss;)|s(?:cr;|u(?:b(?:;|e;)|p(?:;|e;)))|tdot;|u(?:darr(?:l;|r;)|e(?:pr;|sc;)|larr(?:;|p;)|p(?:;|brcap;|c(?:ap;|up;)|dot;|or;|s;)|r(?:arr(?:;|m;)|ly(?:eq(?:prec;|succ;)|vee;|wedge;)|ren;?|vearrow(?:left;|right;))|vee;|wed;)|w(?:conint;|int;)|ylcty;)|d(?:Arr;|Har;|a(?:gger;|leth;|rr;|sh(?:;|v;))|b(?:karow;|lac;)|c(?:aron;|y;)|d(?:;|a(?:gger;|rr;)|otseq;)|e(?:g;?|lta;|mptyv;)|f(?:isht;|r;)|har(?:l;|r;)|i(?:am(?:;|ond(?:;|suit;)|s;)|e;|gamma;|sin;|v(?:;|ide(?:;|ontimes;|)|onx;))|jcy;|lc(?:orn;|rop;)|o(?:llar;|pf;|t(?:;|eq(?:;|dot;)|minus;|plus;|square;)|ublebarwedge;|wn(?:arrow;|downarrows;|harpoon(?:left;|right;)))|r(?:bkarow;|c(?:orn;|rop;))|s(?:c(?:r;|y;)|ol;|trok;)|t(?:dot;|ri(?:;|f;))|u(?:arr;|har;)|wangle;|z(?:cy;|igrarr;))|e(?:D(?:Dot;|ot;)|a(?:cute;?|ster;)|c(?:aron;|ir(?:;|c;?)|olon;|y;)|dot;|e;|f(?:Dot;|r;)|g(?:;|rave;?|s(?:;|dot;))|l(?:;|inters;|l;|s(?:;|dot;))|m(?:acr;|pty(?:;|set;|v;)|sp(?:1(?:3;|4;)|;))|n(?:g;|sp;)|o(?:gon;|pf;)|p(?:ar(?:;|sl;)|lus;|si(?:;|lon;|v;))|q(?:c(?:irc;|olon;)|s(?:im;|lant(?:gtr;|less;))|u(?:als;|est;|iv(?:;|DD;))|vparsl;)|r(?:Dot;|arr;)|s(?:cr;|dot;|im;)|t(?:a;|h;?)|u(?:ml;?|ro;)|x(?:cl;|ist;|p(?:ectation;|onentiale;)))|f(?:allingdotseq;|cy;|emale;|f(?:ilig;|l(?:ig;|lig;)|r;)|ilig;|jlig;|l(?:at;|lig;|tns;)|nof;|o(?:pf;|r(?:all;|k(?:;|v;)))|partint;|r(?:a(?:c(?:1(?:2;?|3;|4;?|5;|6;|8;)|2(?:3;|5;)|3(?:4;?|5;|8;)|45;|5(?:6;|8;)|78;)|sl;)|own;)|scr;)|g(?:E(?:;|l;)|a(?:cute;|mma(?:;|d;)|p;)|breve;|c(?:irc;|y;)|dot;|e(?:;|l;|q(?:;|q;|slant;)|s(?:;|cc;|dot(?:;|o(?:;|l;))|l(?:;|es;)))|fr;|g(?:;|g;)|imel;|jcy;|l(?:;|E;|a;|j;)|n(?:E;|ap(?:;|prox;)|e(?:;|q(?:;|q;))|sim;)|opf;|rave;|s(?:cr;|im(?:;|e;|l;))|t(?:;|c(?:c;|ir;)|dot;|lPar;|quest;|r(?:a(?:pprox;|rr;)|dot;|eq(?:less;|qless;)|less;|sim;)|)|v(?:ertneqq;|nE;))|h(?:Arr;|a(?:irsp;|lf;|milt;|r(?:dcy;|r(?:;|cir;|w;)))|bar;|circ;|e(?:arts(?:;|uit;)|llip;|rcon;)|fr;|ks(?:earow;|warow;)|o(?:arr;|mtht;|ok(?:leftarrow;|rightarrow;)|pf;|rbar;)|s(?:cr;|lash;|trok;)|y(?:bull;|phen;))|i(?:acute;?|c(?:;|irc;?|y;)|e(?:cy;|xcl;?)|f(?:f;|r;)|grave;?|i(?:;|i(?:int;|nt;)|nfin;|ota;)|jlig;|m(?:a(?:cr;|g(?:e;|line;|part;)|th;)|of;|ped;)|n(?:;|care;|fin(?:;|tie;)|odot;|t(?:;|cal;|e(?:gers;|rcal;)|larhk;|prod;))|o(?:cy;|gon;|pf;|ta;)|prod;|quest;?|s(?:cr;|in(?:;|E;|dot;|s(?:;|v;)|v;))|t(?:;|ilde;)|u(?:kcy;|ml;?))|j(?:c(?:irc;|y;)|fr;|math;|opf;|s(?:cr;|ercy;)|ukcy;)|k(?:appa(?:;|v;)|c(?:edil;|y;)|fr;|green;|hcy;|jcy;|opf;|scr;)|l(?:A(?:arr;|rr;|tail;)|Barr;|E(?:;|g;)|Har;|a(?:cute;|emptyv;|gran;|mbda;|ng(?:;|d;|le;)|p;|quo;?|rr(?:;|b(?:;|fs;)|fs;|hk;|lp;|pl;|sim;|tl;)|t(?:;|ail;|e(?:;|s;)))|b(?:arr;|brk;|r(?:ac(?:e;|k;)|k(?:e;|sl(?:d;|u;))))|c(?:aron;|e(?:dil;|il;)|ub;|y;)|d(?:ca;|quo(?:;|r;)|r(?:dhar;|ushar;)|sh;)|e(?:;|ft(?:arrow(?:;|tail;)|harpoon(?:down;|up;)|leftarrows;|right(?:arrow(?:;|s;)|harpoons;|squigarrow;)|threetimes;)|g;|q(?:;|q;|slant;)|s(?:;|cc;|dot(?:;|o(?:;|r;))|g(?:;|es;)|s(?:approx;|dot;|eq(?:gtr;|qgtr;)|gtr;|sim;)))|f(?:isht;|loor;|r;)|g(?:;|E;)|h(?:ar(?:d;|u(?:;|l;))|blk;)|jcy;|l(?:;|arr;|corner;|hard;|tri;)|m(?:idot;|oust(?:;|ache;))|n(?:E;|ap(?:;|prox;)|e(?:;|q(?:;|q;))|sim;)|o(?:a(?:ng;|rr;)|brk;|ng(?:left(?:arrow;|rightarrow;)|mapsto;|rightarrow;)|oparrow(?:left;|right;)|p(?:ar;|f;|lus;)|times;|w(?:ast;|bar;)|z(?:;|enge;|f;))|par(?:;|lt;)|r(?:arr;|corner;|har(?:;|d;)|m;|tri;)|s(?:aquo;|cr;|h;|im(?:;|e;|g;)|q(?:b;|uo(?:;|r;))|trok;)|t(?:;|c(?:c;|ir;)|dot;|hree;|imes;|larr;|quest;|r(?:Par;|i(?:;|e;|f;))|)|ur(?:dshar;|uhar;)|v(?:ertneqq;|nE;))|m(?:DDot;|a(?:cr;?|l(?:e;|t(?:;|ese;))|p(?:;|sto(?:;|down;|left;|up;))|rker;)|c(?:omma;|y;)|dash;|easuredangle;|fr;|ho;|i(?:cro;?|d(?:;|ast;|cir;|dot;?)|nus(?:;|b;|d(?:;|u;)))|l(?:cp;|dr;)|nplus;|o(?:dels;|pf;)|p;|s(?:cr;|tpos;)|u(?:;|ltimap;|map;))|n(?:G(?:g;|t(?:;|v;))|L(?:eft(?:arrow;|rightarrow;)|l;|t(?:;|v;))|Rightarrow;|V(?:Dash;|dash;)|a(?:bla;|cute;|ng;|p(?:;|E;|id;|os;|prox;)|tur(?:;|al(?:;|s;)))|b(?:sp;?|ump(?:;|e;))|c(?:a(?:p;|ron;)|edil;|ong(?:;|dot;)|up;|y;)|dash;|e(?:;|Arr;|ar(?:hk;|r(?:;|ow;))|dot;|quiv;|s(?:ear;|im;)|xist(?:;|s;))|fr;|g(?:E;|e(?:;|q(?:;|q;|slant;)|s;)|sim;|t(?:;|r;))|h(?:Arr;|arr;|par;)|i(?:;|s(?:;|d;)|v;)|jcy;|l(?:Arr;|E;|arr;|dr;|e(?:;|ft(?:arrow;|rightarrow;)|q(?:;|q;|slant;)|s(?:;|s;))|sim;|t(?:;|ri(?:;|e;)))|mid;|o(?:pf;|t(?:;|in(?:;|E;|dot;|v(?:a;|b;|c;))|ni(?:;|v(?:a;|b;|c;))|))|p(?:ar(?:;|allel;|sl;|t;)|olint;|r(?:;|cue;|e(?:;|c(?:;|eq;))))|r(?:Arr;|arr(?:;|c;|w;)|ightarrow;|tri(?:;|e;))|s(?:c(?:;|cue;|e;|r;)|hort(?:mid;|parallel;)|im(?:;|e(?:;|q;))|mid;|par;|qsu(?:be;|pe;)|u(?:b(?:;|E;|e;|set(?:;|eq(?:;|q;)))|cc(?:;|eq;)|p(?:;|E;|e;|set(?:;|eq(?:;|q;)))))|t(?:gl;|ilde;?|lg;|riangle(?:left(?:;|eq;)|right(?:;|eq;)))|u(?:;|m(?:;|ero;|sp;))|v(?:Dash;|Harr;|ap;|dash;|g(?:e;|t;)|infin;|l(?:Arr;|e;|t(?:;|rie;))|r(?:Arr;|trie;)|sim;)|w(?:Arr;|ar(?:hk;|r(?:;|ow;))|near;))|o(?:S;|a(?:cute;?|st;)|c(?:ir(?:;|c;?)|y;)|d(?:ash;|blac;|iv;|ot;|sold;)|elig;|f(?:cir;|r;)|g(?:on;|rave;?|t;)|h(?:bar;|m;)|int;|l(?:arr;|c(?:ir;|ross;)|ine;|t;)|m(?:acr;|ega;|i(?:cron;|d;|nus;))|opf;|p(?:ar;|erp;|lus;)|r(?:;|arr;|d(?:;|er(?:;|of;)|f;?|m;?)|igof;|or;|slope;|v;)|s(?:cr;|lash;?|ol;)|ti(?:lde;?|mes(?:;|as;))|uml;?|vbar;)|p(?:ar(?:;|a(?:;|llel;|)|s(?:im;|l;)|t;)|cy;|er(?:cnt;|iod;|mil;|p;|tenk;)|fr;|h(?:i(?:;|v;)|mmat;|one;)|i(?:;|tchfork;|v;)|l(?:an(?:ck(?:;|h;)|kv;)|us(?:;|acir;|b;|cir;|d(?:o;|u;)|e;|mn;?|sim;|two;))|m;|o(?:intint;|pf;|und;?)|r(?:;|E;|ap;|cue;|e(?:;|c(?:;|approx;|curlyeq;|eq;|n(?:approx;|eqq;|sim;)|sim;))|ime(?:;|s;)|n(?:E;|ap;|sim;)|o(?:d;|f(?:alar;|line;|surf;)|p(?:;|to;))|sim;|urel;)|s(?:cr;|i;)|uncsp;)|q(?:fr;|int;|opf;|prime;|scr;|u(?:at(?:ernions;|int;)|est(?:;|eq;)|ot;?))|r(?:A(?:arr;|rr;|tail;)|Barr;|Har;|a(?:c(?:e;|ute;)|dic;|emptyv;|ng(?:;|d;|e;|le;)|quo;?|rr(?:;|ap;|b(?:;|fs;)|c;|fs;|hk;|lp;|pl;|sim;|tl;|w;)|t(?:ail;|io(?:;|nals;)))|b(?:arr;|brk;|r(?:ac(?:e;|k;)|k(?:e;|sl(?:d;|u;))))|c(?:aron;|e(?:dil;|il;)|ub;|y;)|d(?:ca;|ldhar;|quo(?:;|r;)|sh;)|e(?:al(?:;|ine;|part;|s;)|ct;|g;?)|f(?:isht;|loor;|r;)|h(?:ar(?:d;|u(?:;|l;))|o(?:;|v;))|i(?:ght(?:arrow(?:;|tail;)|harpoon(?:down;|up;)|left(?:arrows;|harpoons;)|rightarrows;|squigarrow;|threetimes;)|ng;|singdotseq;)|l(?:arr;|har;|m;)|moust(?:;|ache;)|nmid;|o(?:a(?:ng;|rr;)|brk;|p(?:ar;|f;|lus;)|times;)|p(?:ar(?:;|gt;)|polint;)|rarr;|s(?:aquo;|cr;|h;|q(?:b;|uo(?:;|r;)))|t(?:hree;|imes;|ri(?:;|e;|f;|ltri;))|uluhar;|x;)|s(?:acute;|bquo;|c(?:;|E;|a(?:p;|ron;)|cue;|e(?:;|dil;)|irc;|n(?:E;|ap;|sim;)|polint;|sim;|y;)|dot(?:;|b;|e;)|e(?:Arr;|ar(?:hk;|r(?:;|ow;))|ct;?|mi;|swar;|tm(?:inus;|n;)|xt;)|fr(?:;|own;)|h(?:arp;|c(?:hcy;|y;)|ort(?:mid;|parallel;)|y;?)|i(?:gma(?:;|f;|v;)|m(?:;|dot;|e(?:;|q;)|g(?:;|E;)|l(?:;|E;)|ne;|plus;|rarr;))|larr;|m(?:a(?:llsetminus;|shp;)|eparsl;|i(?:d;|le;)|t(?:;|e(?:;|s;)))|o(?:ftcy;|l(?:;|b(?:;|ar;))|pf;)|pa(?:des(?:;|uit;)|r;)|q(?:c(?:ap(?:;|s;)|up(?:;|s;))|su(?:b(?:;|e;|set(?:;|eq;))|p(?:;|e;|set(?:;|eq;)))|u(?:;|ar(?:e;|f;)|f;))|rarr;|s(?:cr;|etmn;|mile;|tarf;)|t(?:ar(?:;|f;)|r(?:aight(?:epsilon;|phi;)|ns;))|u(?:b(?:;|E;|dot;|e(?:;|dot;)|mult;|n(?:E;|e;)|plus;|rarr;|s(?:et(?:;|eq(?:;|q;)|neq(?:;|q;))|im;|u(?:b;|p;)))|cc(?:;|approx;|curlyeq;|eq;|n(?:approx;|eqq;|sim;)|sim;)|m;|ng;|p(?:1;?|2;?|3;?|;|E;|d(?:ot;|sub;)|e(?:;|dot;)|hs(?:ol;|ub;)|larr;|mult;|n(?:E;|e;)|plus;|s(?:et(?:;|eq(?:;|q;)|neq(?:;|q;))|im;|u(?:b;|p;))))|w(?:Arr;|ar(?:hk;|r(?:;|ow;))|nwar;)|zlig;?)|t(?:a(?:rget;|u;)|brk;|c(?:aron;|edil;|y;)|dot;|elrec;|fr;|h(?:e(?:re(?:4;|fore;)|ta(?:;|sym;|v;))|i(?:ck(?:approx;|sim;)|nsp;)|k(?:ap;|sim;)|orn;?)|i(?:lde;|mes(?:;|b(?:;|ar;)|d;|)|nt;)|o(?:ea;|p(?:;|bot;|cir;|f(?:;|ork;))|sa;)|prime;|r(?:ade;|i(?:angle(?:;|down;|left(?:;|eq;)|q;|right(?:;|eq;))|dot;|e;|minus;|plus;|sb;|time;)|pezium;)|s(?:c(?:r;|y;)|hcy;|trok;)|w(?:ixt;|ohead(?:leftarrow;|rightarrow;)))|u(?:Arr;|Har;|a(?:cute;?|rr;)|br(?:cy;|eve;)|c(?:irc;?|y;)|d(?:arr;|blac;|har;)|f(?:isht;|r;)|grave;?|h(?:ar(?:l;|r;)|blk;)|l(?:c(?:orn(?:;|er;)|rop;)|tri;)|m(?:acr;|l;?)|o(?:gon;|pf;)|p(?:arrow;|downarrow;|harpoon(?:left;|right;)|lus;|si(?:;|h;|lon;)|uparrows;)|r(?:c(?:orn(?:;|er;)|rop;)|ing;|tri;)|scr;|t(?:dot;|ilde;|ri(?:;|f;))|u(?:arr;|ml;?)|wangle;)|v(?:Arr;|Bar(?:;|v;)|Dash;|a(?:ngrt;|r(?:epsilon;|kappa;|nothing;|p(?:hi;|i;|ropto;)|r(?:;|ho;)|s(?:igma;|u(?:bsetneq(?:;|q;)|psetneq(?:;|q;)))|t(?:heta;|riangle(?:left;|right;))))|cy;|dash;|e(?:e(?:;|bar;|eq;)|llip;|r(?:bar;|t;))|fr;|ltri;|nsu(?:b;|p;)|opf;|prop;|rtri;|s(?:cr;|u(?:bn(?:E;|e;)|pn(?:E;|e;)))|zigzag;)|w(?:circ;|e(?:d(?:bar;|ge(?:;|q;))|ierp;)|fr;|opf;|p;|r(?:;|eath;)|scr;)|x(?:c(?:ap;|irc;|up;)|dtri;|fr;|h(?:Arr;|arr;)|i;|l(?:Arr;|arr;)|map;|nis;|o(?:dot;|p(?:f;|lus;)|time;)|r(?:Arr;|arr;)|s(?:cr;|qcup;)|u(?:plus;|tri;)|vee;|wedge;)|y(?:ac(?:ute;?|y;)|c(?:irc;|y;)|en;?|fr;|icy;|opf;|scr;|u(?:cy;|ml;?))|z(?:acute;|c(?:aron;|y;)|dot;|e(?:etrf;|ta;)|fr;|hcy;|igrarr;|opf;|scr;|w(?:j;|nj;)))|[\s\S]/g;
  var DBLQUOTEATTRVAL = /[^\r"&\u0000]+/g;
  var SINGLEQUOTEATTRVAL = /[^\r'&\u0000]+/g;
  var UNQUOTEDATTRVAL = /[^\r\t\n\f &>\u0000]+/g;
  var TAGNAME = /[^\r\t\n\f \/>A-Z\u0000]+/g;
  var ATTRNAME = /[^\r\t\n\f \/=>A-Z\u0000]+/g;
  var CDATATEXT = /[^\]\r\u0000\uffff]*/g;
  var DATATEXT = /[^&<\r\u0000\uffff]*/g;
  var RAWTEXT = /[^<\r\u0000\uffff]*/g;
  var PLAINTEXT = /[^\r\u0000\uffff]*/g;
  var SIMPLETAG = /(?:(\/)?([a-z]+)>)|[\s\S]/g;
  var SIMPLEATTR = /(?:([-a-z]+)[ \t\n\f]*=[ \t\n\f]*('[^'&\r\u0000]*'|"[^"&\r\u0000]*"|[^\t\n\r\f "&'\u0000>][^&> \t\n\r\f\u0000]*[ \t\n\f]))|[\s\S]/g;
  var NONWS = /[^\x09\x0A\x0C\x0D\x20]/;
  var ALLNONWS = /[^\x09\x0A\x0C\x0D\x20]/g;
  var NONWSNONNUL = /[^\x00\x09\x0A\x0C\x0D\x20]/;
  var LEADINGWS = /^[\x09\x0A\x0C\x0D\x20]+/;
  var NULCHARS = /\x00/g;
  function buf2str(buf) {
    var CHUNKSIZE = 16384;
    if (buf.length < CHUNKSIZE) {
      return String.fromCharCode.apply(String, buf);
    }
    var result = "";
    for (var i = 0; i < buf.length; i += CHUNKSIZE) {
      result += String.fromCharCode.apply(String, buf.slice(i, i + CHUNKSIZE));
    }
    return result;
  }
  function str2buf(s) {
    var result = [];
    for (var i = 0; i < s.length; i++) {
      result[i] = s.charCodeAt(i);
    }
    return result;
  }
  function isA(elt, set) {
    if (typeof set === "string") {
      return elt.namespaceURI === NAMESPACE.HTML && elt.localName === set;
    }
    var tagnames = set[elt.namespaceURI];
    return tagnames && tagnames[elt.localName];
  }
  function isMathmlTextIntegrationPoint(n) {
    return isA(n, mathmlTextIntegrationPointSet);
  }
  function isHTMLIntegrationPoint(n) {
    if (isA(n, htmlIntegrationPointSet)) return true;
    if (n.namespaceURI === NAMESPACE.MATHML && n.localName === "annotation-xml") {
      var encoding = n.getAttribute("encoding");
      if (encoding) encoding = encoding.toLowerCase();
      if (encoding === "text/html" || encoding === "application/xhtml+xml") return true;
    }
    return false;
  }
  function adjustSVGTagName(name) {
    if (name in svgTagNameAdjustments) return svgTagNameAdjustments[name];
    else return name;
  }
  function adjustSVGAttributes(attrs) {
    for (var i = 0, n = attrs.length; i < n; i++) {
      if (attrs[i][0] in svgAttrAdjustments) {
        attrs[i][0] = svgAttrAdjustments[attrs[i][0]];
      }
    }
  }
  function adjustMathMLAttributes(attrs) {
    for (var i = 0, n = attrs.length; i < n; i++) {
      if (attrs[i][0] === "definitionurl") {
        attrs[i][0] = "definitionURL";
        break;
      }
    }
  }
  function adjustForeignAttributes(attrs) {
    for (var i = 0, n = attrs.length; i < n; i++) {
      if (attrs[i][0] in foreignAttributes) {
        attrs[i].push(foreignAttributes[attrs[i][0]]);
      }
    }
  }
  function transferAttributes(attrs, elt) {
    for (var i = 0, n = attrs.length; i < n; i++) {
      var name = attrs[i][0], value = attrs[i][1];
      if (elt.hasAttribute(name)) continue;
      elt._setAttribute(name, value);
    }
  }
  HTMLParser.ElementStack = function ElementStack() {
    this.elements = [];
    this.top = null;
  };
  HTMLParser.ElementStack.prototype.push = function(e) {
    this.elements.push(e);
    this.top = e;
  };
  HTMLParser.ElementStack.prototype.pop = function(e) {
    this.elements.pop();
    this.top = this.elements[this.elements.length - 1];
  };
  HTMLParser.ElementStack.prototype.popTag = function(tag) {
    for (var i = this.elements.length - 1; i > 0; i--) {
      var e = this.elements[i];
      if (isA(e, tag)) break;
    }
    this.elements.length = i;
    this.top = this.elements[i - 1];
  };
  HTMLParser.ElementStack.prototype.popElementType = function(type) {
    for (var i = this.elements.length - 1; i > 0; i--) {
      if (this.elements[i] instanceof type) break;
    }
    this.elements.length = i;
    this.top = this.elements[i - 1];
  };
  HTMLParser.ElementStack.prototype.popElement = function(e) {
    for (var i = this.elements.length - 1; i > 0; i--) {
      if (this.elements[i] === e) break;
    }
    this.elements.length = i;
    this.top = this.elements[i - 1];
  };
  HTMLParser.ElementStack.prototype.removeElement = function(e) {
    if (this.top === e) this.pop();
    else {
      var idx = this.elements.lastIndexOf(e);
      if (idx !== -1) this.elements.splice(idx, 1);
    }
  };
  HTMLParser.ElementStack.prototype.clearToContext = function(set) {
    for (var i = this.elements.length - 1; i > 0; i--) {
      if (isA(this.elements[i], set)) break;
    }
    this.elements.length = i + 1;
    this.top = this.elements[i];
  };
  HTMLParser.ElementStack.prototype.contains = function(tag) {
    return this.inSpecificScope(tag, /* @__PURE__ */ Object.create(null));
  };
  HTMLParser.ElementStack.prototype.inSpecificScope = function(tag, set) {
    for (var i = this.elements.length - 1; i >= 0; i--) {
      var elt = this.elements[i];
      if (isA(elt, tag)) return true;
      if (isA(elt, set)) return false;
    }
    return false;
  };
  HTMLParser.ElementStack.prototype.elementInSpecificScope = function(target, set) {
    for (var i = this.elements.length - 1; i >= 0; i--) {
      var elt = this.elements[i];
      if (elt === target) return true;
      if (isA(elt, set)) return false;
    }
    return false;
  };
  HTMLParser.ElementStack.prototype.elementTypeInSpecificScope = function(target, set) {
    for (var i = this.elements.length - 1; i >= 0; i--) {
      var elt = this.elements[i];
      if (elt instanceof target) return true;
      if (isA(elt, set)) return false;
    }
    return false;
  };
  HTMLParser.ElementStack.prototype.inScope = function(tag) {
    return this.inSpecificScope(tag, inScopeSet);
  };
  HTMLParser.ElementStack.prototype.elementInScope = function(e) {
    return this.elementInSpecificScope(e, inScopeSet);
  };
  HTMLParser.ElementStack.prototype.elementTypeInScope = function(type) {
    return this.elementTypeInSpecificScope(type, inScopeSet);
  };
  HTMLParser.ElementStack.prototype.inButtonScope = function(tag) {
    return this.inSpecificScope(tag, inButtonScopeSet);
  };
  HTMLParser.ElementStack.prototype.inListItemScope = function(tag) {
    return this.inSpecificScope(tag, inListItemScopeSet);
  };
  HTMLParser.ElementStack.prototype.inTableScope = function(tag) {
    return this.inSpecificScope(tag, inTableScopeSet);
  };
  HTMLParser.ElementStack.prototype.inSelectScope = function(tag) {
    for (var i = this.elements.length - 1; i >= 0; i--) {
      var elt = this.elements[i];
      if (elt.namespaceURI !== NAMESPACE.HTML) return false;
      var localname = elt.localName;
      if (localname === tag) return true;
      if (localname !== "optgroup" && localname !== "option") return false;
    }
    return false;
  };
  HTMLParser.ElementStack.prototype.generateImpliedEndTags = function(butnot, thorough) {
    var endTagSet = thorough ? thoroughImpliedEndTagsSet : impliedEndTagsSet;
    for (var i = this.elements.length - 1; i >= 0; i--) {
      var e = this.elements[i];
      if (butnot && isA(e, butnot)) break;
      if (!isA(this.elements[i], endTagSet)) break;
    }
    this.elements.length = i + 1;
    this.top = this.elements[i];
  };
  HTMLParser.ActiveFormattingElements = function AFE() {
    this.list = [];
    this.attrs = [];
  };
  HTMLParser.ActiveFormattingElements.prototype.MARKER = {
    localName: "|"
  };
  HTMLParser.ActiveFormattingElements.prototype.insertMarker = function() {
    this.list.push(this.MARKER);
    this.attrs.push(this.MARKER);
  };
  HTMLParser.ActiveFormattingElements.prototype.push = function(elt, attrs) {
    var count = 0;
    for (var i = this.list.length - 1; i >= 0; i--) {
      if (this.list[i] === this.MARKER) break;
      if (equal(elt, this.list[i], this.attrs[i])) {
        count++;
        if (count === 3) {
          this.list.splice(i, 1);
          this.attrs.splice(i, 1);
          break;
        }
      }
    }
    this.list.push(elt);
    var attrcopy = [];
    for (var ii = 0; ii < attrs.length; ii++) {
      attrcopy[ii] = attrs[ii];
    }
    this.attrs.push(attrcopy);
    function equal(newelt, oldelt, oldattrs) {
      if (newelt.localName !== oldelt.localName) return false;
      if (newelt._numattrs !== oldattrs.length) return false;
      for (var i2 = 0, n = oldattrs.length; i2 < n; i2++) {
        var oldname = oldattrs[i2][0];
        var oldval = oldattrs[i2][1];
        if (!newelt.hasAttribute(oldname)) return false;
        if (newelt.getAttribute(oldname) !== oldval) return false;
      }
      return true;
    }
  };
  HTMLParser.ActiveFormattingElements.prototype.clearToMarker = function() {
    for (var i = this.list.length - 1; i >= 0; i--) {
      if (this.list[i] === this.MARKER) break;
    }
    if (i < 0) i = 0;
    this.list.length = i;
    this.attrs.length = i;
  };
  HTMLParser.ActiveFormattingElements.prototype.findElementByTag = function(tag) {
    for (var i = this.list.length - 1; i >= 0; i--) {
      var elt = this.list[i];
      if (elt === this.MARKER) break;
      if (elt.localName === tag) return elt;
    }
    return null;
  };
  HTMLParser.ActiveFormattingElements.prototype.indexOf = function(e) {
    return this.list.lastIndexOf(e);
  };
  HTMLParser.ActiveFormattingElements.prototype.remove = function(e) {
    var idx = this.list.lastIndexOf(e);
    if (idx !== -1) {
      this.list.splice(idx, 1);
      this.attrs.splice(idx, 1);
    }
  };
  HTMLParser.ActiveFormattingElements.prototype.replace = function(a, b, attrs) {
    var idx = this.list.lastIndexOf(a);
    if (idx !== -1) {
      this.list[idx] = b;
      this.attrs[idx] = attrs;
    }
  };
  HTMLParser.ActiveFormattingElements.prototype.insertAfter = function(a, b) {
    var idx = this.list.lastIndexOf(a);
    if (idx !== -1) {
      this.list.splice(idx, 0, b);
      this.attrs.splice(idx, 0, b);
    }
  };
  function HTMLParser(address, fragmentContext, options) {
    var chars = null;
    var numchars = 0;
    var nextchar = 0;
    var input_complete = false;
    var scanner_skip_newline = false;
    var reentrant_invocations = 0;
    var saved_scanner_state = [];
    var leftovers = "";
    var first_batch = true;
    var paused = 0;
    var tokenizer = data_state;
    var return_state;
    var character_reference_code;
    var tagnamebuf = "";
    var lasttagname = "";
    var tempbuf = [];
    var attrnamebuf = "";
    var attrvaluebuf = "";
    var commentbuf = [];
    var doctypenamebuf = [];
    var doctypepublicbuf = [];
    var doctypesystembuf = [];
    var attributes2 = [];
    var is_end_tag = false;
    var parser = initial_mode;
    var originalInsertionMode = null;
    var templateInsertionModes = [];
    var stack = new HTMLParser.ElementStack();
    var afe = new HTMLParser.ActiveFormattingElements();
    var fragment = fragmentContext !== void 0;
    var head_element_pointer = null;
    var form_element_pointer = null;
    var scripting_enabled = true;
    if (fragmentContext) {
      scripting_enabled = fragmentContext.ownerDocument._scripting_enabled;
    }
    if (options && options.scripting_enabled === false) scripting_enabled = false;
    var frameset_ok = true;
    var force_quirks = false;
    var pending_table_text;
    var text_integration_mode;
    var textrun = [];
    var textIncludesNUL = false;
    var ignore_linefeed = false;
    var htmlparser = {
      document: function() {
        return doc;
      },
      // Convenience function for internal use. Can only be called once,
      // as it removes the nodes from `doc` to add them to fragment.
      _asDocumentFragment: function() {
        var frag = doc.createDocumentFragment();
        var root2 = doc.firstChild;
        while (root2.hasChildNodes()) {
          frag.appendChild(root2.firstChild);
        }
        return frag;
      },
      // Internal function used from HTMLScriptElement to pause the
      // parser while a script is being loaded from the network
      pause: function() {
        paused++;
      },
      // Called when a script finishes loading
      resume: function() {
        paused--;
        this.parse("");
      },
      // Parse the HTML text s.
      // The second argument should be true if there is no more
      // text to be parsed, and should be false or omitted otherwise.
      // The second argument must not be set for recursive invocations
      // from document.write()
      parse: function(s, end, shouldPauseFunc) {
        var moreToDo;
        if (paused > 0) {
          leftovers += s;
          return true;
        }
        if (reentrant_invocations === 0) {
          if (leftovers) {
            s = leftovers + s;
            leftovers = "";
          }
          if (end) {
            s += "￿";
            input_complete = true;
          }
          chars = s;
          numchars = s.length;
          nextchar = 0;
          if (first_batch) {
            first_batch = false;
            if (chars.charCodeAt(0) === 65279) nextchar = 1;
          }
          reentrant_invocations++;
          moreToDo = scanChars(shouldPauseFunc);
          leftovers = chars.substring(nextchar, numchars);
          reentrant_invocations--;
        } else {
          reentrant_invocations++;
          saved_scanner_state.push(chars, numchars, nextchar);
          chars = s;
          numchars = s.length;
          nextchar = 0;
          scanChars();
          moreToDo = false;
          leftovers = chars.substring(nextchar, numchars);
          nextchar = saved_scanner_state.pop();
          numchars = saved_scanner_state.pop();
          chars = saved_scanner_state.pop();
          if (leftovers) {
            chars = leftovers + chars.substring(nextchar);
            numchars = chars.length;
            nextchar = 0;
            leftovers = "";
          }
          reentrant_invocations--;
        }
        return moreToDo;
      }
    };
    var doc = new Document(true, address);
    doc._parser = htmlparser;
    doc._scripting_enabled = scripting_enabled;
    if (fragmentContext) {
      if (fragmentContext.ownerDocument._quirks) doc._quirks = true;
      if (fragmentContext.ownerDocument._limitedQuirks) doc._limitedQuirks = true;
      if (fragmentContext.namespaceURI === NAMESPACE.HTML) {
        switch (fragmentContext.localName) {
          case "title":
          case "textarea":
            tokenizer = rcdata_state;
            break;
          case "style":
          case "xmp":
          case "iframe":
          case "noembed":
          case "noframes":
          case "script":
          case "plaintext":
            tokenizer = plaintext_state;
            break;
        }
      }
      var root = doc.createElement("html");
      doc._appendChild(root);
      stack.push(root);
      if (fragmentContext instanceof impl2.HTMLTemplateElement) {
        templateInsertionModes.push(in_template_mode);
      }
      resetInsertionMode();
      for (var e = fragmentContext; e !== null; e = e.parentElement) {
        if (e instanceof impl2.HTMLFormElement) {
          form_element_pointer = e;
          break;
        }
      }
    }
    function scanChars(shouldPauseFunc) {
      var codepoint, s, pattern, eof;
      while (nextchar < numchars) {
        if (paused > 0 || shouldPauseFunc && shouldPauseFunc()) {
          return true;
        }
        switch (typeof tokenizer.lookahead) {
          case "undefined":
            codepoint = chars.charCodeAt(nextchar++);
            if (scanner_skip_newline) {
              scanner_skip_newline = false;
              if (codepoint === 10) {
                nextchar++;
                continue;
              }
            }
            switch (codepoint) {
              case 13:
                if (nextchar < numchars) {
                  if (chars.charCodeAt(nextchar) === 10) nextchar++;
                } else {
                  scanner_skip_newline = true;
                }
                tokenizer(10);
                break;
              case 65535:
                if (input_complete && nextchar === numchars) {
                  tokenizer(EOF);
                  break;
                }
              /* falls through */
              default:
                tokenizer(codepoint);
                break;
            }
            break;
          case "number":
            codepoint = chars.charCodeAt(nextchar);
            var n = tokenizer.lookahead;
            var needsString = true;
            if (n < 0) {
              needsString = false;
              n = -n;
            }
            if (n < numchars - nextchar) {
              s = needsString ? chars.substring(nextchar, nextchar + n) : null;
              eof = false;
            } else {
              if (input_complete) {
                s = needsString ? chars.substring(nextchar, numchars) : null;
                eof = true;
                if (codepoint === 65535 && nextchar === numchars - 1) codepoint = EOF;
              } else {
                return true;
              }
            }
            tokenizer(codepoint, s, eof);
            break;
          case "string":
            codepoint = chars.charCodeAt(nextchar);
            pattern = tokenizer.lookahead;
            var pos = chars.indexOf(pattern, nextchar);
            if (pos !== -1) {
              s = chars.substring(nextchar, pos + pattern.length);
              eof = false;
            } else {
              if (!input_complete) return true;
              s = chars.substring(nextchar, numchars);
              if (codepoint === 65535 && nextchar === numchars - 1) codepoint = EOF;
              eof = true;
            }
            tokenizer(codepoint, s, eof);
            break;
        }
      }
      return false;
    }
    function addAttribute(name, value) {
      for (var i = 0; i < attributes2.length; i++) {
        if (attributes2[i][0] === name) return;
      }
      if (value !== void 0) {
        attributes2.push([name, value]);
      } else {
        attributes2.push([name]);
      }
    }
    function handleSimpleAttribute() {
      SIMPLEATTR.lastIndex = nextchar - 1;
      var matched = SIMPLEATTR.exec(chars);
      if (!matched) throw new Error("should never happen");
      var name = matched[1];
      if (!name) return false;
      var value = matched[2];
      var len = value.length;
      switch (value[0]) {
        case '"':
        case "'":
          value = value.substring(1, len - 1);
          nextchar += matched[0].length - 1;
          tokenizer = after_attribute_value_quoted_state;
          break;
        default:
          tokenizer = before_attribute_name_state;
          nextchar += matched[0].length - 1;
          value = value.substring(0, len - 1);
          break;
      }
      for (var i = 0; i < attributes2.length; i++) {
        if (attributes2[i][0] === name) return true;
      }
      attributes2.push([name, value]);
      return true;
    }
    function beginTagName() {
      is_end_tag = false;
      tagnamebuf = "";
      attributes2.length = 0;
    }
    function beginEndTagName() {
      is_end_tag = true;
      tagnamebuf = "";
      attributes2.length = 0;
    }
    function beginTempBuf() {
      tempbuf.length = 0;
    }
    function beginAttrName() {
      attrnamebuf = "";
    }
    function beginAttrValue() {
      attrvaluebuf = "";
    }
    function beginComment() {
      commentbuf.length = 0;
    }
    function beginDoctype() {
      doctypenamebuf.length = 0;
      doctypepublicbuf = null;
      doctypesystembuf = null;
    }
    function beginDoctypePublicId() {
      doctypepublicbuf = [];
    }
    function beginDoctypeSystemId() {
      doctypesystembuf = [];
    }
    function forcequirks() {
      force_quirks = true;
    }
    function cdataAllowed() {
      return stack.top && stack.top.namespaceURI !== "http://www.w3.org/1999/xhtml";
    }
    function appropriateEndTag(buf) {
      return lasttagname === buf;
    }
    function flushText() {
      if (textrun.length > 0) {
        var s = buf2str(textrun);
        textrun.length = 0;
        if (ignore_linefeed) {
          ignore_linefeed = false;
          if (s[0] === "\n") s = s.substring(1);
          if (s.length === 0) return;
        }
        insertToken(TEXT, s);
        textIncludesNUL = false;
      }
      ignore_linefeed = false;
    }
    function getMatchingChars(pattern) {
      pattern.lastIndex = nextchar - 1;
      var match = pattern.exec(chars);
      if (match && match.index === nextchar - 1) {
        match = match[0];
        nextchar += match.length - 1;
        if (input_complete && nextchar === numchars) {
          match = match.slice(0, -1);
          nextchar--;
        }
        return match;
      } else {
        throw new Error("should never happen");
      }
    }
    function emitCharsWhile(pattern) {
      pattern.lastIndex = nextchar - 1;
      var match = pattern.exec(chars)[0];
      if (!match) return false;
      emitCharString(match);
      nextchar += match.length - 1;
      return true;
    }
    function emitCharString(s) {
      if (textrun.length > 0) flushText();
      if (ignore_linefeed) {
        ignore_linefeed = false;
        if (s[0] === "\n") s = s.substring(1);
        if (s.length === 0) return;
      }
      insertToken(TEXT, s);
    }
    function emitTag() {
      if (is_end_tag) insertToken(ENDTAG, tagnamebuf);
      else {
        var tagname = tagnamebuf;
        tagnamebuf = "";
        lasttagname = tagname;
        insertToken(TAG, tagname, attributes2);
      }
    }
    function emitSimpleTag() {
      if (nextchar === numchars) {
        return false;
      }
      SIMPLETAG.lastIndex = nextchar;
      var matched = SIMPLETAG.exec(chars);
      if (!matched) throw new Error("should never happen");
      var tagname = matched[2];
      if (!tagname) return false;
      var endtag = matched[1];
      if (endtag) {
        nextchar += tagname.length + 2;
        insertToken(ENDTAG, tagname);
      } else {
        nextchar += tagname.length + 1;
        lasttagname = tagname;
        insertToken(TAG, tagname, NOATTRS);
      }
      return true;
    }
    function emitSelfClosingTag() {
      if (is_end_tag) insertToken(ENDTAG, tagnamebuf, null, true);
      else {
        insertToken(TAG, tagnamebuf, attributes2, true);
      }
    }
    function emitDoctype() {
      insertToken(DOCTYPE, buf2str(doctypenamebuf), doctypepublicbuf ? buf2str(doctypepublicbuf) : void 0, doctypesystembuf ? buf2str(doctypesystembuf) : void 0);
    }
    function emitEOF() {
      flushText();
      parser(EOF);
      doc.modclock = 1;
    }
    var insertToken = htmlparser.insertToken = function insertToken2(t, value, arg3, arg4) {
      flushText();
      var current = stack.top;
      if (!current || current.namespaceURI === NAMESPACE.HTML) {
        parser(t, value, arg3, arg4);
      } else {
        if (t !== TAG && t !== TEXT) {
          insertForeignToken(t, value, arg3, arg4);
        } else {
          if (isMathmlTextIntegrationPoint(current) && (t === TEXT || t === TAG && value !== "mglyph" && value !== "malignmark") || t === TAG && value === "svg" && current.namespaceURI === NAMESPACE.MATHML && current.localName === "annotation-xml" || isHTMLIntegrationPoint(current)) {
            text_integration_mode = true;
            parser(t, value, arg3, arg4);
            text_integration_mode = false;
          } else {
            insertForeignToken(t, value, arg3, arg4);
          }
        }
      }
    };
    function insertComment(data) {
      var parent = stack.top;
      if (foster_parent_mode && isA(parent, tablesectionrowSet)) {
        fosterParent(function(doc2) {
          return doc2.createComment(data);
        });
      } else {
        if (parent instanceof impl2.HTMLTemplateElement) {
          parent = parent.content;
        }
        parent._appendChild(parent.ownerDocument.createComment(data));
      }
    }
    function insertText(s) {
      var parent = stack.top;
      if (foster_parent_mode && isA(parent, tablesectionrowSet)) {
        fosterParent(function(doc2) {
          return doc2.createTextNode(s);
        });
      } else {
        if (parent instanceof impl2.HTMLTemplateElement) {
          parent = parent.content;
        }
        var lastChild = parent.lastChild;
        if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
          lastChild.appendData(s);
        } else {
          parent._appendChild(parent.ownerDocument.createTextNode(s));
        }
      }
    }
    function createHTMLElt(doc2, name, attrs) {
      var elt = html.createElement(doc2, name, null);
      if (attrs) {
        for (var i = 0, n = attrs.length; i < n; i++) {
          elt._setAttribute(attrs[i][0], attrs[i][1]);
        }
      }
      return elt;
    }
    var foster_parent_mode = false;
    function insertHTMLElement(name, attrs) {
      var elt = insertElement(function(doc2) {
        return createHTMLElt(doc2, name, attrs);
      });
      if (isA(elt, formassociatedSet)) {
        elt._form = form_element_pointer;
      }
      return elt;
    }
    function insertElement(eltFunc) {
      var elt;
      if (foster_parent_mode && isA(stack.top, tablesectionrowSet)) {
        elt = fosterParent(eltFunc);
      } else if (stack.top instanceof impl2.HTMLTemplateElement) {
        elt = eltFunc(stack.top.content.ownerDocument);
        stack.top.content._appendChild(elt);
      } else {
        elt = eltFunc(stack.top.ownerDocument);
        stack.top._appendChild(elt);
      }
      stack.push(elt);
      return elt;
    }
    function insertForeignElement(name, attrs, ns) {
      return insertElement(function(doc2) {
        var elt = doc2._createElementNS(name, ns, null);
        if (attrs) {
          for (var i = 0, n = attrs.length; i < n; i++) {
            var attr = attrs[i];
            if (attr.length === 2) elt._setAttribute(attr[0], attr[1]);
            else {
              elt._setAttributeNS(attr[2], attr[0], attr[1]);
            }
          }
        }
        return elt;
      });
    }
    function lastElementOfType(type) {
      for (var i = stack.elements.length - 1; i >= 0; i--) {
        if (stack.elements[i] instanceof type) {
          return i;
        }
      }
      return -1;
    }
    function fosterParent(eltFunc) {
      var parent, before, lastTable = -1, lastTemplate = -1, elt;
      lastTable = lastElementOfType(impl2.HTMLTableElement);
      lastTemplate = lastElementOfType(impl2.HTMLTemplateElement);
      if (lastTemplate >= 0 && (lastTable < 0 || lastTemplate > lastTable)) {
        parent = stack.elements[lastTemplate];
      } else if (lastTable >= 0) {
        parent = stack.elements[lastTable].parentNode;
        if (parent) {
          before = stack.elements[lastTable];
        } else {
          parent = stack.elements[lastTable - 1];
        }
      }
      if (!parent) parent = stack.elements[0];
      if (parent instanceof impl2.HTMLTemplateElement) {
        parent = parent.content;
      }
      elt = eltFunc(parent.ownerDocument);
      if (elt.nodeType === Node.TEXT_NODE) {
        var prev;
        if (before) prev = before.previousSibling;
        else prev = parent.lastChild;
        if (prev && prev.nodeType === Node.TEXT_NODE) {
          prev.appendData(elt.data);
          return elt;
        }
      }
      if (before) parent.insertBefore(elt, before);
      else parent._appendChild(elt);
      return elt;
    }
    function resetInsertionMode() {
      var last = false;
      for (var i = stack.elements.length - 1; i >= 0; i--) {
        var node = stack.elements[i];
        if (i === 0) {
          last = true;
          if (fragment) {
            node = fragmentContext;
          }
        }
        if (node.namespaceURI === NAMESPACE.HTML) {
          var tag = node.localName;
          switch (tag) {
            case "select":
              for (var j = i; j > 0; ) {
                var ancestor = stack.elements[--j];
                if (ancestor instanceof impl2.HTMLTemplateElement) {
                  break;
                } else if (ancestor instanceof impl2.HTMLTableElement) {
                  parser = in_select_in_table_mode;
                  return;
                }
              }
              parser = in_select_mode;
              return;
            case "tr":
              parser = in_row_mode;
              return;
            case "tbody":
            case "tfoot":
            case "thead":
              parser = in_table_body_mode;
              return;
            case "caption":
              parser = in_caption_mode;
              return;
            case "colgroup":
              parser = in_column_group_mode;
              return;
            case "table":
              parser = in_table_mode;
              return;
            case "template":
              parser = templateInsertionModes[templateInsertionModes.length - 1];
              return;
            case "body":
              parser = in_body_mode;
              return;
            case "frameset":
              parser = in_frameset_mode;
              return;
            case "html":
              if (head_element_pointer === null) {
                parser = before_head_mode;
              } else {
                parser = after_head_mode;
              }
              return;
            default:
              if (!last) {
                if (tag === "head") {
                  parser = in_head_mode;
                  return;
                }
                if (tag === "td" || tag === "th") {
                  parser = in_cell_mode;
                  return;
                }
              }
          }
        }
        if (last) {
          parser = in_body_mode;
          return;
        }
      }
    }
    function parseRawText(name, attrs) {
      insertHTMLElement(name, attrs);
      tokenizer = rawtext_state;
      originalInsertionMode = parser;
      parser = text_mode;
    }
    function parseRCDATA(name, attrs) {
      insertHTMLElement(name, attrs);
      tokenizer = rcdata_state;
      originalInsertionMode = parser;
      parser = text_mode;
    }
    function afeclone(doc2, i) {
      return {
        elt: createHTMLElt(doc2, afe.list[i].localName, afe.attrs[i]),
        attrs: afe.attrs[i]
      };
    }
    function afereconstruct() {
      if (afe.list.length === 0) return;
      var entry = afe.list[afe.list.length - 1];
      if (entry === afe.MARKER) return;
      if (stack.elements.lastIndexOf(entry) !== -1) return;
      for (var i = afe.list.length - 2; i >= 0; i--) {
        entry = afe.list[i];
        if (entry === afe.MARKER) break;
        if (stack.elements.lastIndexOf(entry) !== -1) break;
      }
      for (i = i + 1; i < afe.list.length; i++) {
        var newelt = insertElement(function(doc2) {
          return afeclone(doc2, i).elt;
        });
        afe.list[i] = newelt;
      }
    }
    var BOOKMARK = {
      localName: "BM"
    };
    function adoptionAgency(tag) {
      if (isA(stack.top, tag) && afe.indexOf(stack.top) === -1) {
        stack.pop();
        return true;
      }
      var outer = 0;
      while (outer < 8) {
        outer++;
        var fmtelt = afe.findElementByTag(tag);
        if (!fmtelt) {
          return false;
        }
        var index2 = stack.elements.lastIndexOf(fmtelt);
        if (index2 === -1) {
          afe.remove(fmtelt);
          return true;
        }
        if (!stack.elementInScope(fmtelt)) {
          return true;
        }
        var furthestblock = null, furthestblockindex;
        for (var i = index2 + 1; i < stack.elements.length; i++) {
          if (isA(stack.elements[i], specialSet)) {
            furthestblock = stack.elements[i];
            furthestblockindex = i;
            break;
          }
        }
        if (!furthestblock) {
          stack.popElement(fmtelt);
          afe.remove(fmtelt);
          return true;
        } else {
          var ancestor = stack.elements[index2 - 1];
          afe.insertAfter(fmtelt, BOOKMARK);
          var node = furthestblock;
          var lastnode = furthestblock;
          var nodeindex = furthestblockindex;
          var nodeafeindex;
          var inner = 0;
          while (true) {
            inner++;
            node = stack.elements[--nodeindex];
            if (node === fmtelt) break;
            nodeafeindex = afe.indexOf(node);
            if (inner > 3 && nodeafeindex !== -1) {
              afe.remove(node);
              nodeafeindex = -1;
            }
            if (nodeafeindex === -1) {
              stack.removeElement(node);
              continue;
            }
            var newelt = afeclone(ancestor.ownerDocument, nodeafeindex);
            afe.replace(node, newelt.elt, newelt.attrs);
            stack.elements[nodeindex] = newelt.elt;
            node = newelt.elt;
            if (lastnode === furthestblock) {
              afe.remove(BOOKMARK);
              afe.insertAfter(newelt.elt, BOOKMARK);
            }
            node._appendChild(lastnode);
            lastnode = node;
          }
          if (foster_parent_mode && isA(ancestor, tablesectionrowSet)) {
            fosterParent(function() {
              return lastnode;
            });
          } else if (ancestor instanceof impl2.HTMLTemplateElement) {
            ancestor.content._appendChild(lastnode);
          } else {
            ancestor._appendChild(lastnode);
          }
          var newelt2 = afeclone(furthestblock.ownerDocument, afe.indexOf(fmtelt));
          while (furthestblock.hasChildNodes()) {
            newelt2.elt._appendChild(furthestblock.firstChild);
          }
          furthestblock._appendChild(newelt2.elt);
          afe.remove(fmtelt);
          afe.replace(BOOKMARK, newelt2.elt, newelt2.attrs);
          stack.removeElement(fmtelt);
          var pos = stack.elements.lastIndexOf(furthestblock);
          stack.elements.splice(pos + 1, 0, newelt2.elt);
        }
      }
      return true;
    }
    function handleScriptEnd() {
      stack.pop();
      parser = originalInsertionMode;
      return;
    }
    function stopParsing() {
      delete doc._parser;
      stack.elements.length = 0;
      if (doc.defaultView) {
        doc.defaultView.dispatchEvent(new impl2.Event("load", {}));
      }
    }
    function reconsume(c, new_state) {
      tokenizer = new_state;
      nextchar--;
    }
    function data_state(c) {
      switch (c) {
        case 38:
          return_state = data_state;
          tokenizer = character_reference_state;
          break;
        case 60:
          if (emitSimpleTag())
            break;
          tokenizer = tag_open_state;
          break;
        case 0:
          textrun.push(c);
          textIncludesNUL = true;
          break;
        case -1:
          emitEOF();
          break;
        default:
          emitCharsWhile(DATATEXT) || textrun.push(c);
          break;
      }
    }
    function rcdata_state(c) {
      switch (c) {
        case 38:
          return_state = rcdata_state;
          tokenizer = character_reference_state;
          break;
        case 60:
          tokenizer = rcdata_less_than_sign_state;
          break;
        case 0:
          textrun.push(65533);
          textIncludesNUL = true;
          break;
        case -1:
          emitEOF();
          break;
        default:
          textrun.push(c);
          break;
      }
    }
    function rawtext_state(c) {
      switch (c) {
        case 60:
          tokenizer = rawtext_less_than_sign_state;
          break;
        case 0:
          textrun.push(65533);
          break;
        case -1:
          emitEOF();
          break;
        default:
          emitCharsWhile(RAWTEXT) || textrun.push(c);
          break;
      }
    }
    function script_data_state(c) {
      switch (c) {
        case 60:
          tokenizer = script_data_less_than_sign_state;
          break;
        case 0:
          textrun.push(65533);
          break;
        case -1:
          emitEOF();
          break;
        default:
          emitCharsWhile(RAWTEXT) || textrun.push(c);
          break;
      }
    }
    function plaintext_state(c) {
      switch (c) {
        case 0:
          textrun.push(65533);
          break;
        case -1:
          emitEOF();
          break;
        default:
          emitCharsWhile(PLAINTEXT) || textrun.push(c);
          break;
      }
    }
    function tag_open_state(c) {
      switch (c) {
        case 33:
          tokenizer = markup_declaration_open_state;
          break;
        case 47:
          tokenizer = end_tag_open_state;
          break;
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 97:
        // [a-z]
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
          beginTagName();
          reconsume(c, tag_name_state);
          break;
        case 63:
          reconsume(c, bogus_comment_state);
          break;
        default:
          textrun.push(60);
          reconsume(c, data_state);
          break;
      }
    }
    function end_tag_open_state(c) {
      switch (c) {
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 97:
        // [a-z]
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
          beginEndTagName();
          reconsume(c, tag_name_state);
          break;
        case 62:
          tokenizer = data_state;
          break;
        case -1:
          textrun.push(60);
          textrun.push(47);
          emitEOF();
          break;
        default:
          reconsume(c, bogus_comment_state);
          break;
      }
    }
    function tag_name_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          tokenizer = before_attribute_name_state;
          break;
        case 47:
          tokenizer = self_closing_start_tag_state;
          break;
        case 62:
          tokenizer = data_state;
          emitTag();
          break;
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
          tagnamebuf += String.fromCharCode(c + 32);
          break;
        case 0:
          tagnamebuf += String.fromCharCode(
            65533
            /* REPLACEMENT CHARACTER */
          );
          break;
        case -1:
          emitEOF();
          break;
        default:
          tagnamebuf += getMatchingChars(TAGNAME);
          break;
      }
    }
    function rcdata_less_than_sign_state(c) {
      if (c === 47) {
        beginTempBuf();
        tokenizer = rcdata_end_tag_open_state;
      } else {
        textrun.push(60);
        reconsume(c, rcdata_state);
      }
    }
    function rcdata_end_tag_open_state(c) {
      switch (c) {
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 97:
        // [a-z]
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
          beginEndTagName();
          reconsume(c, rcdata_end_tag_name_state);
          break;
        default:
          textrun.push(60);
          textrun.push(47);
          reconsume(c, rcdata_state);
          break;
      }
    }
    function rcdata_end_tag_name_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          if (appropriateEndTag(tagnamebuf)) {
            tokenizer = before_attribute_name_state;
            return;
          }
          break;
        case 47:
          if (appropriateEndTag(tagnamebuf)) {
            tokenizer = self_closing_start_tag_state;
            return;
          }
          break;
        case 62:
          if (appropriateEndTag(tagnamebuf)) {
            tokenizer = data_state;
            emitTag();
            return;
          }
          break;
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
          tagnamebuf += String.fromCharCode(c + 32);
          tempbuf.push(c);
          return;
        case 97:
        // [a-z]
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
          tagnamebuf += String.fromCharCode(c);
          tempbuf.push(c);
          return;
      }
      textrun.push(60);
      textrun.push(47);
      pushAll(textrun, tempbuf);
      reconsume(c, rcdata_state);
    }
    function rawtext_less_than_sign_state(c) {
      if (c === 47) {
        beginTempBuf();
        tokenizer = rawtext_end_tag_open_state;
      } else {
        textrun.push(60);
        reconsume(c, rawtext_state);
      }
    }
    function rawtext_end_tag_open_state(c) {
      switch (c) {
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 97:
        // [a-z]
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
          beginEndTagName();
          reconsume(c, rawtext_end_tag_name_state);
          break;
        default:
          textrun.push(60);
          textrun.push(47);
          reconsume(c, rawtext_state);
          break;
      }
    }
    function rawtext_end_tag_name_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          if (appropriateEndTag(tagnamebuf)) {
            tokenizer = before_attribute_name_state;
            return;
          }
          break;
        case 47:
          if (appropriateEndTag(tagnamebuf)) {
            tokenizer = self_closing_start_tag_state;
            return;
          }
          break;
        case 62:
          if (appropriateEndTag(tagnamebuf)) {
            tokenizer = data_state;
            emitTag();
            return;
          }
          break;
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
          tagnamebuf += String.fromCharCode(c + 32);
          tempbuf.push(c);
          return;
        case 97:
        // [a-z]
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
          tagnamebuf += String.fromCharCode(c);
          tempbuf.push(c);
          return;
      }
      textrun.push(60);
      textrun.push(47);
      pushAll(textrun, tempbuf);
      reconsume(c, rawtext_state);
    }
    function script_data_less_than_sign_state(c) {
      switch (c) {
        case 47:
          beginTempBuf();
          tokenizer = script_data_end_tag_open_state;
          break;
        case 33:
          tokenizer = script_data_escape_start_state;
          textrun.push(60);
          textrun.push(33);
          break;
        default:
          textrun.push(60);
          reconsume(c, script_data_state);
          break;
      }
    }
    function script_data_end_tag_open_state(c) {
      switch (c) {
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 97:
        // [a-z]
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
          beginEndTagName();
          reconsume(c, script_data_end_tag_name_state);
          break;
        default:
          textrun.push(60);
          textrun.push(47);
          reconsume(c, script_data_state);
          break;
      }
    }
    function script_data_end_tag_name_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          if (appropriateEndTag(tagnamebuf)) {
            tokenizer = before_attribute_name_state;
            return;
          }
          break;
        case 47:
          if (appropriateEndTag(tagnamebuf)) {
            tokenizer = self_closing_start_tag_state;
            return;
          }
          break;
        case 62:
          if (appropriateEndTag(tagnamebuf)) {
            tokenizer = data_state;
            emitTag();
            return;
          }
          break;
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
          tagnamebuf += String.fromCharCode(c + 32);
          tempbuf.push(c);
          return;
        case 97:
        // [a-z]
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
          tagnamebuf += String.fromCharCode(c);
          tempbuf.push(c);
          return;
      }
      textrun.push(60);
      textrun.push(47);
      pushAll(textrun, tempbuf);
      reconsume(c, script_data_state);
    }
    function script_data_escape_start_state(c) {
      if (c === 45) {
        tokenizer = script_data_escape_start_dash_state;
        textrun.push(45);
      } else {
        reconsume(c, script_data_state);
      }
    }
    function script_data_escape_start_dash_state(c) {
      if (c === 45) {
        tokenizer = script_data_escaped_dash_dash_state;
        textrun.push(45);
      } else {
        reconsume(c, script_data_state);
      }
    }
    function script_data_escaped_state(c) {
      switch (c) {
        case 45:
          tokenizer = script_data_escaped_dash_state;
          textrun.push(45);
          break;
        case 60:
          tokenizer = script_data_escaped_less_than_sign_state;
          break;
        case 0:
          textrun.push(65533);
          break;
        case -1:
          emitEOF();
          break;
        default:
          textrun.push(c);
          break;
      }
    }
    function script_data_escaped_dash_state(c) {
      switch (c) {
        case 45:
          tokenizer = script_data_escaped_dash_dash_state;
          textrun.push(45);
          break;
        case 60:
          tokenizer = script_data_escaped_less_than_sign_state;
          break;
        case 0:
          tokenizer = script_data_escaped_state;
          textrun.push(65533);
          break;
        case -1:
          emitEOF();
          break;
        default:
          tokenizer = script_data_escaped_state;
          textrun.push(c);
          break;
      }
    }
    function script_data_escaped_dash_dash_state(c) {
      switch (c) {
        case 45:
          textrun.push(45);
          break;
        case 60:
          tokenizer = script_data_escaped_less_than_sign_state;
          break;
        case 62:
          tokenizer = script_data_state;
          textrun.push(62);
          break;
        case 0:
          tokenizer = script_data_escaped_state;
          textrun.push(65533);
          break;
        case -1:
          emitEOF();
          break;
        default:
          tokenizer = script_data_escaped_state;
          textrun.push(c);
          break;
      }
    }
    function script_data_escaped_less_than_sign_state(c) {
      switch (c) {
        case 47:
          beginTempBuf();
          tokenizer = script_data_escaped_end_tag_open_state;
          break;
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 97:
        // [a-z]
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
          beginTempBuf();
          textrun.push(60);
          reconsume(c, script_data_double_escape_start_state);
          break;
        default:
          textrun.push(60);
          reconsume(c, script_data_escaped_state);
          break;
      }
    }
    function script_data_escaped_end_tag_open_state(c) {
      switch (c) {
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 97:
        // [a-z]
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
          beginEndTagName();
          reconsume(c, script_data_escaped_end_tag_name_state);
          break;
        default:
          textrun.push(60);
          textrun.push(47);
          reconsume(c, script_data_escaped_state);
          break;
      }
    }
    function script_data_escaped_end_tag_name_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          if (appropriateEndTag(tagnamebuf)) {
            tokenizer = before_attribute_name_state;
            return;
          }
          break;
        case 47:
          if (appropriateEndTag(tagnamebuf)) {
            tokenizer = self_closing_start_tag_state;
            return;
          }
          break;
        case 62:
          if (appropriateEndTag(tagnamebuf)) {
            tokenizer = data_state;
            emitTag();
            return;
          }
          break;
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
          tagnamebuf += String.fromCharCode(c + 32);
          tempbuf.push(c);
          return;
        case 97:
        // [a-z]
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
          tagnamebuf += String.fromCharCode(c);
          tempbuf.push(c);
          return;
      }
      textrun.push(60);
      textrun.push(47);
      pushAll(textrun, tempbuf);
      reconsume(c, script_data_escaped_state);
    }
    function script_data_double_escape_start_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
        // SPACE
        case 47:
        // SOLIDUS
        case 62:
          if (buf2str(tempbuf) === "script") {
            tokenizer = script_data_double_escaped_state;
          } else {
            tokenizer = script_data_escaped_state;
          }
          textrun.push(c);
          break;
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
          tempbuf.push(c + 32);
          textrun.push(c);
          break;
        case 97:
        // [a-z]
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
          tempbuf.push(c);
          textrun.push(c);
          break;
        default:
          reconsume(c, script_data_escaped_state);
          break;
      }
    }
    function script_data_double_escaped_state(c) {
      switch (c) {
        case 45:
          tokenizer = script_data_double_escaped_dash_state;
          textrun.push(45);
          break;
        case 60:
          tokenizer = script_data_double_escaped_less_than_sign_state;
          textrun.push(60);
          break;
        case 0:
          textrun.push(65533);
          break;
        case -1:
          emitEOF();
          break;
        default:
          textrun.push(c);
          break;
      }
    }
    function script_data_double_escaped_dash_state(c) {
      switch (c) {
        case 45:
          tokenizer = script_data_double_escaped_dash_dash_state;
          textrun.push(45);
          break;
        case 60:
          tokenizer = script_data_double_escaped_less_than_sign_state;
          textrun.push(60);
          break;
        case 0:
          tokenizer = script_data_double_escaped_state;
          textrun.push(65533);
          break;
        case -1:
          emitEOF();
          break;
        default:
          tokenizer = script_data_double_escaped_state;
          textrun.push(c);
          break;
      }
    }
    function script_data_double_escaped_dash_dash_state(c) {
      switch (c) {
        case 45:
          textrun.push(45);
          break;
        case 60:
          tokenizer = script_data_double_escaped_less_than_sign_state;
          textrun.push(60);
          break;
        case 62:
          tokenizer = script_data_state;
          textrun.push(62);
          break;
        case 0:
          tokenizer = script_data_double_escaped_state;
          textrun.push(65533);
          break;
        case -1:
          emitEOF();
          break;
        default:
          tokenizer = script_data_double_escaped_state;
          textrun.push(c);
          break;
      }
    }
    function script_data_double_escaped_less_than_sign_state(c) {
      if (c === 47) {
        beginTempBuf();
        tokenizer = script_data_double_escape_end_state;
        textrun.push(47);
      } else {
        reconsume(c, script_data_double_escaped_state);
      }
    }
    function script_data_double_escape_end_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
        // SPACE
        case 47:
        // SOLIDUS
        case 62:
          if (buf2str(tempbuf) === "script") {
            tokenizer = script_data_escaped_state;
          } else {
            tokenizer = script_data_double_escaped_state;
          }
          textrun.push(c);
          break;
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
          tempbuf.push(c + 32);
          textrun.push(c);
          break;
        case 97:
        // [a-z]
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
          tempbuf.push(c);
          textrun.push(c);
          break;
        default:
          reconsume(c, script_data_double_escaped_state);
          break;
      }
    }
    function before_attribute_name_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          break;
        // For SOLIDUS, GREATER-THAN SIGN, and EOF, spec says "reconsume in
        // the after attribute name state", but in our implementation that
        // state always has an active attribute in attrnamebuf.  Just clone
        // the rules here, without the addAttribute business.
        case 47:
          tokenizer = self_closing_start_tag_state;
          break;
        case 62:
          tokenizer = data_state;
          emitTag();
          break;
        case -1:
          emitEOF();
          break;
        case 61:
          beginAttrName();
          attrnamebuf += String.fromCharCode(c);
          tokenizer = attribute_name_state;
          break;
        default:
          if (handleSimpleAttribute()) break;
          beginAttrName();
          reconsume(c, attribute_name_state);
          break;
      }
    }
    function attribute_name_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
        // SPACE
        case 47:
        // SOLIDUS
        case 62:
        // GREATER-THAN SIGN
        case -1:
          reconsume(c, after_attribute_name_state);
          break;
        case 61:
          tokenizer = before_attribute_value_state;
          break;
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
          attrnamebuf += String.fromCharCode(c + 32);
          break;
        case 0:
          attrnamebuf += String.fromCharCode(
            65533
            /* REPLACEMENT CHARACTER */
          );
          break;
        case 34:
        // QUOTATION MARK
        case 39:
        // APOSTROPHE
        case 60:
        // LESS-THAN SIGN
        /* falls through */
        default:
          attrnamebuf += getMatchingChars(ATTRNAME);
          break;
      }
    }
    function after_attribute_name_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          break;
        case 47:
          addAttribute(attrnamebuf);
          tokenizer = self_closing_start_tag_state;
          break;
        case 61:
          tokenizer = before_attribute_value_state;
          break;
        case 62:
          tokenizer = data_state;
          addAttribute(attrnamebuf);
          emitTag();
          break;
        case -1:
          addAttribute(attrnamebuf);
          emitEOF();
          break;
        default:
          addAttribute(attrnamebuf);
          beginAttrName();
          reconsume(c, attribute_name_state);
          break;
      }
    }
    function before_attribute_value_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          break;
        case 34:
          beginAttrValue();
          tokenizer = attribute_value_double_quoted_state;
          break;
        case 39:
          beginAttrValue();
          tokenizer = attribute_value_single_quoted_state;
          break;
        case 62:
        // GREATER-THAN SIGN
        /* falls through */
        default:
          beginAttrValue();
          reconsume(c, attribute_value_unquoted_state);
          break;
      }
    }
    function attribute_value_double_quoted_state(c) {
      switch (c) {
        case 34:
          addAttribute(attrnamebuf, attrvaluebuf);
          tokenizer = after_attribute_value_quoted_state;
          break;
        case 38:
          return_state = attribute_value_double_quoted_state;
          tokenizer = character_reference_state;
          break;
        case 0:
          attrvaluebuf += String.fromCharCode(
            65533
            /* REPLACEMENT CHARACTER */
          );
          break;
        case -1:
          emitEOF();
          break;
        case 10:
          attrvaluebuf += String.fromCharCode(c);
          break;
        default:
          attrvaluebuf += getMatchingChars(DBLQUOTEATTRVAL);
          break;
      }
    }
    function attribute_value_single_quoted_state(c) {
      switch (c) {
        case 39:
          addAttribute(attrnamebuf, attrvaluebuf);
          tokenizer = after_attribute_value_quoted_state;
          break;
        case 38:
          return_state = attribute_value_single_quoted_state;
          tokenizer = character_reference_state;
          break;
        case 0:
          attrvaluebuf += String.fromCharCode(
            65533
            /* REPLACEMENT CHARACTER */
          );
          break;
        case -1:
          emitEOF();
          break;
        case 10:
          attrvaluebuf += String.fromCharCode(c);
          break;
        default:
          attrvaluebuf += getMatchingChars(SINGLEQUOTEATTRVAL);
          break;
      }
    }
    function attribute_value_unquoted_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          addAttribute(attrnamebuf, attrvaluebuf);
          tokenizer = before_attribute_name_state;
          break;
        case 38:
          return_state = attribute_value_unquoted_state;
          tokenizer = character_reference_state;
          break;
        case 62:
          addAttribute(attrnamebuf, attrvaluebuf);
          tokenizer = data_state;
          emitTag();
          break;
        case 0:
          attrvaluebuf += String.fromCharCode(
            65533
            /* REPLACEMENT CHARACTER */
          );
          break;
        case -1:
          nextchar--;
          tokenizer = data_state;
          break;
        case 34:
        // QUOTATION MARK
        case 39:
        // APOSTROPHE
        case 60:
        // LESS-THAN SIGN
        case 61:
        // EQUALS SIGN
        case 96:
        // GRAVE ACCENT
        /* falls through */
        default:
          attrvaluebuf += getMatchingChars(UNQUOTEDATTRVAL);
          break;
      }
    }
    function after_attribute_value_quoted_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          tokenizer = before_attribute_name_state;
          break;
        case 47:
          tokenizer = self_closing_start_tag_state;
          break;
        case 62:
          tokenizer = data_state;
          emitTag();
          break;
        case -1:
          emitEOF();
          break;
        default:
          reconsume(c, before_attribute_name_state);
          break;
      }
    }
    function self_closing_start_tag_state(c) {
      switch (c) {
        case 62:
          tokenizer = data_state;
          emitSelfClosingTag();
          break;
        case -1:
          emitEOF();
          break;
        default:
          reconsume(c, before_attribute_name_state);
          break;
      }
    }
    function bogus_comment_state(c, lookahead, eof) {
      var len = lookahead.length;
      if (eof) {
        nextchar += len - 1;
      } else {
        nextchar += len;
      }
      var comment = lookahead.substring(0, len - 1);
      comment = comment.replace(/\u0000/g, "�");
      comment = comment.replace(/\u000D\u000A/g, "\n");
      comment = comment.replace(/\u000D/g, "\n");
      insertToken(COMMENT, comment);
      tokenizer = data_state;
    }
    bogus_comment_state.lookahead = ">";
    function markup_declaration_open_state(c, lookahead, eof) {
      if (lookahead[0] === "-" && lookahead[1] === "-") {
        nextchar += 2;
        beginComment();
        tokenizer = comment_start_state;
        return;
      }
      if (lookahead.toUpperCase() === "DOCTYPE") {
        nextchar += 7;
        tokenizer = doctype_state;
      } else if (lookahead === "[CDATA[" && cdataAllowed()) {
        nextchar += 7;
        tokenizer = cdata_section_state;
      } else {
        tokenizer = bogus_comment_state;
      }
    }
    markup_declaration_open_state.lookahead = 7;
    function comment_start_state(c) {
      beginComment();
      switch (c) {
        case 45:
          tokenizer = comment_start_dash_state;
          break;
        case 62:
          tokenizer = data_state;
          insertToken(COMMENT, buf2str(commentbuf));
          break;
        /* see comment in comment end state */
        default:
          reconsume(c, comment_state);
          break;
      }
    }
    function comment_start_dash_state(c) {
      switch (c) {
        case 45:
          tokenizer = comment_end_state;
          break;
        case 62:
          tokenizer = data_state;
          insertToken(COMMENT, buf2str(commentbuf));
          break;
        case -1:
          insertToken(COMMENT, buf2str(commentbuf));
          emitEOF();
          break;
        /* see comment in comment end state */
        default:
          commentbuf.push(
            45
            /* HYPHEN-MINUS */
          );
          reconsume(c, comment_state);
          break;
      }
    }
    function comment_state(c) {
      switch (c) {
        case 60:
          commentbuf.push(c);
          tokenizer = comment_less_than_sign_state;
          break;
        case 45:
          tokenizer = comment_end_dash_state;
          break;
        case 0:
          commentbuf.push(
            65533
            /* REPLACEMENT CHARACTER */
          );
          break;
        case -1:
          insertToken(COMMENT, buf2str(commentbuf));
          emitEOF();
          break;
        /* see comment in comment end state */
        default:
          commentbuf.push(c);
          break;
      }
    }
    function comment_less_than_sign_state(c) {
      switch (c) {
        case 33:
          commentbuf.push(c);
          tokenizer = comment_less_than_sign_bang_state;
          break;
        case 60:
          commentbuf.push(c);
          break;
        default:
          reconsume(c, comment_state);
          break;
      }
    }
    function comment_less_than_sign_bang_state(c) {
      switch (c) {
        case 45:
          tokenizer = comment_less_than_sign_bang_dash_state;
          break;
        default:
          reconsume(c, comment_state);
          break;
      }
    }
    function comment_less_than_sign_bang_dash_state(c) {
      switch (c) {
        case 45:
          tokenizer = comment_less_than_sign_bang_dash_dash_state;
          break;
        default:
          reconsume(c, comment_end_dash_state);
          break;
      }
    }
    function comment_less_than_sign_bang_dash_dash_state(c) {
      switch (c) {
        case 62:
        // GREATER-THAN SIGN
        case -1:
          reconsume(c, comment_end_state);
          break;
        default:
          reconsume(c, comment_end_state);
          break;
      }
    }
    function comment_end_dash_state(c) {
      switch (c) {
        case 45:
          tokenizer = comment_end_state;
          break;
        case -1:
          insertToken(COMMENT, buf2str(commentbuf));
          emitEOF();
          break;
        /* see comment in comment end state */
        default:
          commentbuf.push(
            45
            /* HYPHEN-MINUS */
          );
          reconsume(c, comment_state);
          break;
      }
    }
    function comment_end_state(c) {
      switch (c) {
        case 62:
          tokenizer = data_state;
          insertToken(COMMENT, buf2str(commentbuf));
          break;
        case 33:
          tokenizer = comment_end_bang_state;
          break;
        case 45:
          commentbuf.push(45);
          break;
        case -1:
          insertToken(COMMENT, buf2str(commentbuf));
          emitEOF();
          break;
        /* For security reasons: otherwise, hostile user could put a script in a comment e.g. in a blog comment and then DOS the server so that the end tag isn't read, and then the commented script tag would be treated as live code */
        default:
          commentbuf.push(45);
          commentbuf.push(45);
          reconsume(c, comment_state);
          break;
      }
    }
    function comment_end_bang_state(c) {
      switch (c) {
        case 45:
          commentbuf.push(45);
          commentbuf.push(45);
          commentbuf.push(33);
          tokenizer = comment_end_dash_state;
          break;
        case 62:
          tokenizer = data_state;
          insertToken(COMMENT, buf2str(commentbuf));
          break;
        case -1:
          insertToken(COMMENT, buf2str(commentbuf));
          emitEOF();
          break;
        /* see comment in comment end state */
        default:
          commentbuf.push(45);
          commentbuf.push(45);
          commentbuf.push(33);
          reconsume(c, comment_state);
          break;
      }
    }
    function doctype_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          tokenizer = before_doctype_name_state;
          break;
        case -1:
          beginDoctype();
          forcequirks();
          emitDoctype();
          emitEOF();
          break;
        default:
          reconsume(c, before_doctype_name_state);
          break;
      }
    }
    function before_doctype_name_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          break;
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
          beginDoctype();
          doctypenamebuf.push(c + 32);
          tokenizer = doctype_name_state;
          break;
        case 0:
          beginDoctype();
          doctypenamebuf.push(65533);
          tokenizer = doctype_name_state;
          break;
        case 62:
          beginDoctype();
          forcequirks();
          tokenizer = data_state;
          emitDoctype();
          break;
        case -1:
          beginDoctype();
          forcequirks();
          emitDoctype();
          emitEOF();
          break;
        default:
          beginDoctype();
          doctypenamebuf.push(c);
          tokenizer = doctype_name_state;
          break;
      }
    }
    function doctype_name_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          tokenizer = after_doctype_name_state;
          break;
        case 62:
          tokenizer = data_state;
          emitDoctype();
          break;
        case 65:
        // [A-Z]
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
          doctypenamebuf.push(c + 32);
          break;
        case 0:
          doctypenamebuf.push(
            65533
            /* REPLACEMENT CHARACTER */
          );
          break;
        case -1:
          forcequirks();
          emitDoctype();
          emitEOF();
          break;
        default:
          doctypenamebuf.push(c);
          break;
      }
    }
    function after_doctype_name_state(c, lookahead, eof) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          nextchar += 1;
          break;
        case 62:
          tokenizer = data_state;
          nextchar += 1;
          emitDoctype();
          break;
        case -1:
          forcequirks();
          emitDoctype();
          emitEOF();
          break;
        default:
          lookahead = lookahead.toUpperCase();
          if (lookahead === "PUBLIC") {
            nextchar += 6;
            tokenizer = after_doctype_public_keyword_state;
          } else if (lookahead === "SYSTEM") {
            nextchar += 6;
            tokenizer = after_doctype_system_keyword_state;
          } else {
            forcequirks();
            tokenizer = bogus_doctype_state;
          }
          break;
      }
    }
    after_doctype_name_state.lookahead = 6;
    function after_doctype_public_keyword_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          tokenizer = before_doctype_public_identifier_state;
          break;
        case 34:
          beginDoctypePublicId();
          tokenizer = doctype_public_identifier_double_quoted_state;
          break;
        case 39:
          beginDoctypePublicId();
          tokenizer = doctype_public_identifier_single_quoted_state;
          break;
        case 62:
          forcequirks();
          tokenizer = data_state;
          emitDoctype();
          break;
        case -1:
          forcequirks();
          emitDoctype();
          emitEOF();
          break;
        default:
          forcequirks();
          tokenizer = bogus_doctype_state;
          break;
      }
    }
    function before_doctype_public_identifier_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          break;
        case 34:
          beginDoctypePublicId();
          tokenizer = doctype_public_identifier_double_quoted_state;
          break;
        case 39:
          beginDoctypePublicId();
          tokenizer = doctype_public_identifier_single_quoted_state;
          break;
        case 62:
          forcequirks();
          tokenizer = data_state;
          emitDoctype();
          break;
        case -1:
          forcequirks();
          emitDoctype();
          emitEOF();
          break;
        default:
          forcequirks();
          tokenizer = bogus_doctype_state;
          break;
      }
    }
    function doctype_public_identifier_double_quoted_state(c) {
      switch (c) {
        case 34:
          tokenizer = after_doctype_public_identifier_state;
          break;
        case 0:
          doctypepublicbuf.push(
            65533
            /* REPLACEMENT CHARACTER */
          );
          break;
        case 62:
          forcequirks();
          tokenizer = data_state;
          emitDoctype();
          break;
        case -1:
          forcequirks();
          emitDoctype();
          emitEOF();
          break;
        default:
          doctypepublicbuf.push(c);
          break;
      }
    }
    function doctype_public_identifier_single_quoted_state(c) {
      switch (c) {
        case 39:
          tokenizer = after_doctype_public_identifier_state;
          break;
        case 0:
          doctypepublicbuf.push(
            65533
            /* REPLACEMENT CHARACTER */
          );
          break;
        case 62:
          forcequirks();
          tokenizer = data_state;
          emitDoctype();
          break;
        case -1:
          forcequirks();
          emitDoctype();
          emitEOF();
          break;
        default:
          doctypepublicbuf.push(c);
          break;
      }
    }
    function after_doctype_public_identifier_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          tokenizer = between_doctype_public_and_system_identifiers_state;
          break;
        case 62:
          tokenizer = data_state;
          emitDoctype();
          break;
        case 34:
          beginDoctypeSystemId();
          tokenizer = doctype_system_identifier_double_quoted_state;
          break;
        case 39:
          beginDoctypeSystemId();
          tokenizer = doctype_system_identifier_single_quoted_state;
          break;
        case -1:
          forcequirks();
          emitDoctype();
          emitEOF();
          break;
        default:
          forcequirks();
          tokenizer = bogus_doctype_state;
          break;
      }
    }
    function between_doctype_public_and_system_identifiers_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          break;
        case 62:
          tokenizer = data_state;
          emitDoctype();
          break;
        case 34:
          beginDoctypeSystemId();
          tokenizer = doctype_system_identifier_double_quoted_state;
          break;
        case 39:
          beginDoctypeSystemId();
          tokenizer = doctype_system_identifier_single_quoted_state;
          break;
        case -1:
          forcequirks();
          emitDoctype();
          emitEOF();
          break;
        default:
          forcequirks();
          tokenizer = bogus_doctype_state;
          break;
      }
    }
    function after_doctype_system_keyword_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          tokenizer = before_doctype_system_identifier_state;
          break;
        case 34:
          beginDoctypeSystemId();
          tokenizer = doctype_system_identifier_double_quoted_state;
          break;
        case 39:
          beginDoctypeSystemId();
          tokenizer = doctype_system_identifier_single_quoted_state;
          break;
        case 62:
          forcequirks();
          tokenizer = data_state;
          emitDoctype();
          break;
        case -1:
          forcequirks();
          emitDoctype();
          emitEOF();
          break;
        default:
          forcequirks();
          tokenizer = bogus_doctype_state;
          break;
      }
    }
    function before_doctype_system_identifier_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          break;
        case 34:
          beginDoctypeSystemId();
          tokenizer = doctype_system_identifier_double_quoted_state;
          break;
        case 39:
          beginDoctypeSystemId();
          tokenizer = doctype_system_identifier_single_quoted_state;
          break;
        case 62:
          forcequirks();
          tokenizer = data_state;
          emitDoctype();
          break;
        case -1:
          forcequirks();
          emitDoctype();
          emitEOF();
          break;
        default:
          forcequirks();
          tokenizer = bogus_doctype_state;
          break;
      }
    }
    function doctype_system_identifier_double_quoted_state(c) {
      switch (c) {
        case 34:
          tokenizer = after_doctype_system_identifier_state;
          break;
        case 0:
          doctypesystembuf.push(
            65533
            /* REPLACEMENT CHARACTER */
          );
          break;
        case 62:
          forcequirks();
          tokenizer = data_state;
          emitDoctype();
          break;
        case -1:
          forcequirks();
          emitDoctype();
          emitEOF();
          break;
        default:
          doctypesystembuf.push(c);
          break;
      }
    }
    function doctype_system_identifier_single_quoted_state(c) {
      switch (c) {
        case 39:
          tokenizer = after_doctype_system_identifier_state;
          break;
        case 0:
          doctypesystembuf.push(
            65533
            /* REPLACEMENT CHARACTER */
          );
          break;
        case 62:
          forcequirks();
          tokenizer = data_state;
          emitDoctype();
          break;
        case -1:
          forcequirks();
          emitDoctype();
          emitEOF();
          break;
        default:
          doctypesystembuf.push(c);
          break;
      }
    }
    function after_doctype_system_identifier_state(c) {
      switch (c) {
        case 9:
        // CHARACTER TABULATION (tab)
        case 10:
        // LINE FEED (LF)
        case 12:
        // FORM FEED (FF)
        case 32:
          break;
        case 62:
          tokenizer = data_state;
          emitDoctype();
          break;
        case -1:
          forcequirks();
          emitDoctype();
          emitEOF();
          break;
        default:
          tokenizer = bogus_doctype_state;
          break;
      }
    }
    function bogus_doctype_state(c) {
      switch (c) {
        case 62:
          tokenizer = data_state;
          emitDoctype();
          break;
        case -1:
          emitDoctype();
          emitEOF();
          break;
      }
    }
    function cdata_section_state(c) {
      switch (c) {
        case 93:
          tokenizer = cdata_section_bracket_state;
          break;
        case -1:
          emitEOF();
          break;
        case 0:
          textIncludesNUL = true;
        /* fall through */
        default:
          emitCharsWhile(CDATATEXT) || textrun.push(c);
          break;
      }
    }
    function cdata_section_bracket_state(c) {
      switch (c) {
        case 93:
          tokenizer = cdata_section_end_state;
          break;
        default:
          textrun.push(93);
          reconsume(c, cdata_section_state);
          break;
      }
    }
    function cdata_section_end_state(c) {
      switch (c) {
        case 93:
          textrun.push(93);
          break;
        case 62:
          flushText();
          tokenizer = data_state;
          break;
        default:
          textrun.push(93);
          textrun.push(93);
          reconsume(c, cdata_section_state);
          break;
      }
    }
    function character_reference_state(c) {
      beginTempBuf();
      tempbuf.push(38);
      switch (c) {
        case 9:
        // TAB
        case 10:
        // LINE FEED
        case 12:
        // FORM FEED
        case 32:
        // SPACE
        case 60:
        // LESS-THAN SIGN
        case 38:
        // AMPERSAND
        case -1:
          reconsume(c, character_reference_end_state);
          break;
        case 35:
          tempbuf.push(c);
          tokenizer = numeric_character_reference_state;
          break;
        default:
          reconsume(c, named_character_reference_state);
          break;
      }
    }
    function named_character_reference_state(c) {
      NAMEDCHARREF.lastIndex = nextchar;
      var matched = NAMEDCHARREF.exec(chars);
      if (!matched) throw new Error("should never happen");
      var name = matched[1];
      if (!name) {
        tokenizer = character_reference_end_state;
        return;
      }
      nextchar += name.length;
      pushAll(tempbuf, str2buf(name));
      switch (return_state) {
        case attribute_value_double_quoted_state:
        case attribute_value_single_quoted_state:
        case attribute_value_unquoted_state:
          if (name[name.length - 1] !== ";") {
            if (/[=A-Za-z0-9]/.test(chars[nextchar])) {
              tokenizer = character_reference_end_state;
              return;
            }
          }
          break;
      }
      beginTempBuf();
      var rv = namedCharRefs[name];
      if (typeof rv === "number") {
        tempbuf.push(rv);
      } else {
        pushAll(tempbuf, rv);
      }
      tokenizer = character_reference_end_state;
    }
    named_character_reference_state.lookahead = -32;
    function numeric_character_reference_state(c) {
      character_reference_code = 0;
      switch (c) {
        case 120:
        // x
        case 88:
          tempbuf.push(c);
          tokenizer = hexadecimal_character_reference_start_state;
          break;
        default:
          reconsume(c, decimal_character_reference_start_state);
          break;
      }
    }
    function hexadecimal_character_reference_start_state(c) {
      switch (c) {
        case 48:
        case 49:
        case 50:
        case 51:
        case 52:
        case 53:
        case 54:
        case 55:
        case 56:
        case 57:
        // [0-9]
        case 65:
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        // [A-F]
        case 97:
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
          reconsume(c, hexadecimal_character_reference_state);
          break;
        default:
          reconsume(c, character_reference_end_state);
          break;
      }
    }
    function decimal_character_reference_start_state(c) {
      switch (c) {
        case 48:
        case 49:
        case 50:
        case 51:
        case 52:
        case 53:
        case 54:
        case 55:
        case 56:
        case 57:
          reconsume(c, decimal_character_reference_state);
          break;
        default:
          reconsume(c, character_reference_end_state);
          break;
      }
    }
    function hexadecimal_character_reference_state(c) {
      switch (c) {
        case 65:
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
          character_reference_code *= 16;
          character_reference_code += c - 55;
          break;
        case 97:
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
          character_reference_code *= 16;
          character_reference_code += c - 87;
          break;
        case 48:
        case 49:
        case 50:
        case 51:
        case 52:
        case 53:
        case 54:
        case 55:
        case 56:
        case 57:
          character_reference_code *= 16;
          character_reference_code += c - 48;
          break;
        case 59:
          tokenizer = numeric_character_reference_end_state;
          break;
        default:
          reconsume(c, numeric_character_reference_end_state);
          break;
      }
    }
    function decimal_character_reference_state(c) {
      switch (c) {
        case 48:
        case 49:
        case 50:
        case 51:
        case 52:
        case 53:
        case 54:
        case 55:
        case 56:
        case 57:
          character_reference_code *= 10;
          character_reference_code += c - 48;
          break;
        case 59:
          tokenizer = numeric_character_reference_end_state;
          break;
        default:
          reconsume(c, numeric_character_reference_end_state);
          break;
      }
    }
    function numeric_character_reference_end_state(c) {
      if (character_reference_code in numericCharRefReplacements) {
        character_reference_code = numericCharRefReplacements[character_reference_code];
      } else if (character_reference_code > 1114111 || character_reference_code >= 55296 && character_reference_code < 57344) {
        character_reference_code = 65533;
      }
      beginTempBuf();
      if (character_reference_code <= 65535) {
        tempbuf.push(character_reference_code);
      } else {
        character_reference_code = character_reference_code - 65536;
        tempbuf.push(55296 + (character_reference_code >> 10));
        tempbuf.push(56320 + (character_reference_code & 1023));
      }
      reconsume(c, character_reference_end_state);
    }
    function character_reference_end_state(c) {
      switch (return_state) {
        case attribute_value_double_quoted_state:
        case attribute_value_single_quoted_state:
        case attribute_value_unquoted_state:
          attrvaluebuf += buf2str(tempbuf);
          break;
        default:
          pushAll(textrun, tempbuf);
          break;
      }
      reconsume(c, return_state);
    }
    function initial_mode(t, value, arg3, arg4) {
      switch (t) {
        case 1:
          value = value.replace(LEADINGWS, "");
          if (value.length === 0) return;
          break;
        // Handle anything non-space text below
        case 4:
          doc._appendChild(doc.createComment(value));
          return;
        case 5:
          var name = value;
          var publicid = arg3;
          var systemid = arg4;
          doc.appendChild(new DocumentType(doc, name, publicid, systemid));
          if (force_quirks || name.toLowerCase() !== "html" || quirkyPublicIds.test(publicid) || systemid && systemid.toLowerCase() === quirkySystemId || systemid === void 0 && conditionallyQuirkyPublicIds.test(publicid)) doc._quirks = true;
          else if (limitedQuirkyPublicIds.test(publicid) || systemid !== void 0 && conditionallyQuirkyPublicIds.test(publicid)) doc._limitedQuirks = true;
          parser = before_html_mode;
          return;
      }
      doc._quirks = true;
      parser = before_html_mode;
      parser(t, value, arg3, arg4);
    }
    function before_html_mode(t, value, arg3, arg4) {
      var elt;
      switch (t) {
        case 1:
          value = value.replace(LEADINGWS, "");
          if (value.length === 0) return;
          break;
        // Handle anything non-space text below
        case 5:
          return;
        case 4:
          doc._appendChild(doc.createComment(value));
          return;
        case 2:
          if (value === "html") {
            elt = createHTMLElt(doc, value, arg3);
            stack.push(elt);
            doc.appendChild(elt);
            parser = before_head_mode;
            return;
          }
          break;
        case 3:
          switch (value) {
            case "html":
            case "head":
            case "body":
            case "br":
              break;
            // fall through on these
            default:
              return;
          }
      }
      elt = createHTMLElt(doc, "html", null);
      stack.push(elt);
      doc.appendChild(elt);
      parser = before_head_mode;
      parser(t, value, arg3, arg4);
    }
    function before_head_mode(t, value, arg3, arg4) {
      switch (t) {
        case 1:
          value = value.replace(LEADINGWS, "");
          if (value.length === 0) return;
          break;
        // Handle anything non-space text below
        case 5:
          return;
        case 4:
          insertComment(value);
          return;
        case 2:
          switch (value) {
            case "html":
              in_body_mode(t, value, arg3, arg4);
              return;
            case "head":
              var elt = insertHTMLElement(value, arg3);
              head_element_pointer = elt;
              parser = in_head_mode;
              return;
          }
          break;
        case 3:
          switch (value) {
            case "html":
            case "head":
            case "body":
            case "br":
              break;
            default:
              return;
          }
      }
      before_head_mode(TAG, "head", null);
      parser(t, value, arg3, arg4);
    }
    function in_head_mode(t, value, arg3, arg4) {
      switch (t) {
        case 1:
          var ws = value.match(LEADINGWS);
          if (ws) {
            insertText(ws[0]);
            value = value.substring(ws[0].length);
          }
          if (value.length === 0) return;
          break;
        // Handle non-whitespace below
        case 4:
          insertComment(value);
          return;
        case 5:
          return;
        case 2:
          switch (value) {
            case "html":
              in_body_mode(t, value, arg3, arg4);
              return;
            case "meta":
            // XXX:
            // May need to change the encoding based on this tag
            /* falls through */
            case "base":
            case "basefont":
            case "bgsound":
            case "link":
              insertHTMLElement(value, arg3);
              stack.pop();
              return;
            case "title":
              parseRCDATA(value, arg3);
              return;
            case "noscript":
              if (!scripting_enabled) {
                insertHTMLElement(value, arg3);
                parser = in_head_noscript_mode;
                return;
              }
            // Otherwise, if scripting is enabled...
            /* falls through */
            case "noframes":
            case "style":
              parseRawText(value, arg3);
              return;
            case "script":
              insertElement(function(doc2) {
                var elt = createHTMLElt(doc2, value, arg3);
                elt._parser_inserted = true;
                elt._force_async = false;
                if (fragment) elt._already_started = true;
                flushText();
                return elt;
              });
              tokenizer = script_data_state;
              originalInsertionMode = parser;
              parser = text_mode;
              return;
            case "template":
              insertHTMLElement(value, arg3);
              afe.insertMarker();
              frameset_ok = false;
              parser = in_template_mode;
              templateInsertionModes.push(parser);
              return;
            case "head":
              return;
          }
          break;
        case 3:
          switch (value) {
            case "head":
              stack.pop();
              parser = after_head_mode;
              return;
            case "body":
            case "html":
            case "br":
              break;
            // handle these at the bottom of the function
            case "template":
              if (!stack.contains("template")) {
                return;
              }
              stack.generateImpliedEndTags(null, "thorough");
              stack.popTag("template");
              afe.clearToMarker();
              templateInsertionModes.pop();
              resetInsertionMode();
              return;
            default:
              return;
          }
          break;
      }
      in_head_mode(ENDTAG, "head", null);
      parser(t, value, arg3, arg4);
    }
    function in_head_noscript_mode(t, value, arg3, arg4) {
      switch (t) {
        case 5:
          return;
        case 4:
          in_head_mode(t, value);
          return;
        case 1:
          var ws = value.match(LEADINGWS);
          if (ws) {
            in_head_mode(t, ws[0]);
            value = value.substring(ws[0].length);
          }
          if (value.length === 0) return;
          break;
        // Handle non-whitespace below
        case 2:
          switch (value) {
            case "html":
              in_body_mode(t, value, arg3, arg4);
              return;
            case "basefont":
            case "bgsound":
            case "link":
            case "meta":
            case "noframes":
            case "style":
              in_head_mode(t, value, arg3);
              return;
            case "head":
            case "noscript":
              return;
          }
          break;
        case 3:
          switch (value) {
            case "noscript":
              stack.pop();
              parser = in_head_mode;
              return;
            case "br":
              break;
            // goes to the outer default
            default:
              return;
          }
          break;
      }
      in_head_noscript_mode(ENDTAG, "noscript", null);
      parser(t, value, arg3, arg4);
    }
    function after_head_mode(t, value, arg3, arg4) {
      switch (t) {
        case 1:
          var ws = value.match(LEADINGWS);
          if (ws) {
            insertText(ws[0]);
            value = value.substring(ws[0].length);
          }
          if (value.length === 0) return;
          break;
        // Handle non-whitespace below
        case 4:
          insertComment(value);
          return;
        case 5:
          return;
        case 2:
          switch (value) {
            case "html":
              in_body_mode(t, value, arg3, arg4);
              return;
            case "body":
              insertHTMLElement(value, arg3);
              frameset_ok = false;
              parser = in_body_mode;
              return;
            case "frameset":
              insertHTMLElement(value, arg3);
              parser = in_frameset_mode;
              return;
            case "base":
            case "basefont":
            case "bgsound":
            case "link":
            case "meta":
            case "noframes":
            case "script":
            case "style":
            case "template":
            case "title":
              stack.push(head_element_pointer);
              in_head_mode(TAG, value, arg3);
              stack.removeElement(head_element_pointer);
              return;
            case "head":
              return;
          }
          break;
        case 3:
          switch (value) {
            case "template":
              return in_head_mode(t, value, arg3, arg4);
            case "body":
            case "html":
            case "br":
              break;
            default:
              return;
          }
          break;
      }
      after_head_mode(TAG, "body", null);
      frameset_ok = true;
      parser(t, value, arg3, arg4);
    }
    function in_body_mode(t, value, arg3, arg4) {
      var body, i, node, elt;
      switch (t) {
        case 1:
          if (textIncludesNUL) {
            value = value.replace(NULCHARS, "");
            if (value.length === 0) return;
          }
          if (frameset_ok && NONWS.test(value)) frameset_ok = false;
          afereconstruct();
          insertText(value);
          return;
        case 5:
          return;
        case 4:
          insertComment(value);
          return;
        case -1:
          if (templateInsertionModes.length) {
            return in_template_mode(t);
          }
          stopParsing();
          return;
        case 2:
          switch (value) {
            case "html":
              if (stack.contains("template")) {
                return;
              }
              transferAttributes(arg3, stack.elements[0]);
              return;
            case "base":
            case "basefont":
            case "bgsound":
            case "link":
            case "meta":
            case "noframes":
            case "script":
            case "style":
            case "template":
            case "title":
              in_head_mode(TAG, value, arg3);
              return;
            case "body":
              body = stack.elements[1];
              if (!body || !(body instanceof impl2.HTMLBodyElement) || stack.contains("template")) return;
              frameset_ok = false;
              transferAttributes(arg3, body);
              return;
            case "frameset":
              if (!frameset_ok) return;
              body = stack.elements[1];
              if (!body || !(body instanceof impl2.HTMLBodyElement)) return;
              if (body.parentNode) body.parentNode.removeChild(body);
              while (!(stack.top instanceof impl2.HTMLHtmlElement)) stack.pop();
              insertHTMLElement(value, arg3);
              parser = in_frameset_mode;
              return;
            case "address":
            case "article":
            case "aside":
            case "blockquote":
            case "center":
            case "details":
            case "dialog":
            case "dir":
            case "div":
            case "dl":
            case "fieldset":
            case "figcaption":
            case "figure":
            case "footer":
            case "header":
            case "hgroup":
            case "main":
            case "nav":
            case "ol":
            case "p":
            case "section":
            case "summary":
            case "ul":
              if (stack.inButtonScope("p")) in_body_mode(ENDTAG, "p");
              insertHTMLElement(value, arg3);
              return;
            case "menu":
              if (stack.inButtonScope("p")) in_body_mode(ENDTAG, "p");
              if (isA(stack.top, "menuitem")) {
                stack.pop();
              }
              insertHTMLElement(value, arg3);
              return;
            case "h1":
            case "h2":
            case "h3":
            case "h4":
            case "h5":
            case "h6":
              if (stack.inButtonScope("p")) in_body_mode(ENDTAG, "p");
              if (stack.top instanceof impl2.HTMLHeadingElement) stack.pop();
              insertHTMLElement(value, arg3);
              return;
            case "pre":
            case "listing":
              if (stack.inButtonScope("p")) in_body_mode(ENDTAG, "p");
              insertHTMLElement(value, arg3);
              ignore_linefeed = true;
              frameset_ok = false;
              return;
            case "form":
              if (form_element_pointer && !stack.contains("template")) return;
              if (stack.inButtonScope("p")) in_body_mode(ENDTAG, "p");
              elt = insertHTMLElement(value, arg3);
              if (!stack.contains("template")) form_element_pointer = elt;
              return;
            case "li":
              frameset_ok = false;
              for (i = stack.elements.length - 1; i >= 0; i--) {
                node = stack.elements[i];
                if (node instanceof impl2.HTMLLIElement) {
                  in_body_mode(ENDTAG, "li");
                  break;
                }
                if (isA(node, specialSet) && !isA(node, addressdivpSet)) break;
              }
              if (stack.inButtonScope("p")) in_body_mode(ENDTAG, "p");
              insertHTMLElement(value, arg3);
              return;
            case "dd":
            case "dt":
              frameset_ok = false;
              for (i = stack.elements.length - 1; i >= 0; i--) {
                node = stack.elements[i];
                if (isA(node, dddtSet)) {
                  in_body_mode(ENDTAG, node.localName);
                  break;
                }
                if (isA(node, specialSet) && !isA(node, addressdivpSet)) break;
              }
              if (stack.inButtonScope("p")) in_body_mode(ENDTAG, "p");
              insertHTMLElement(value, arg3);
              return;
            case "plaintext":
              if (stack.inButtonScope("p")) in_body_mode(ENDTAG, "p");
              insertHTMLElement(value, arg3);
              tokenizer = plaintext_state;
              return;
            case "button":
              if (stack.inScope("button")) {
                in_body_mode(ENDTAG, "button");
                parser(t, value, arg3, arg4);
              } else {
                afereconstruct();
                insertHTMLElement(value, arg3);
                frameset_ok = false;
              }
              return;
            case "a":
              var activeElement = afe.findElementByTag("a");
              if (activeElement) {
                in_body_mode(ENDTAG, value);
                afe.remove(activeElement);
                stack.removeElement(activeElement);
              }
            /* falls through */
            case "b":
            case "big":
            case "code":
            case "em":
            case "font":
            case "i":
            case "s":
            case "small":
            case "strike":
            case "strong":
            case "tt":
            case "u":
              afereconstruct();
              afe.push(insertHTMLElement(value, arg3), arg3);
              return;
            case "nobr":
              afereconstruct();
              if (stack.inScope(value)) {
                in_body_mode(ENDTAG, value);
                afereconstruct();
              }
              afe.push(insertHTMLElement(value, arg3), arg3);
              return;
            case "applet":
            case "marquee":
            case "object":
              afereconstruct();
              insertHTMLElement(value, arg3);
              afe.insertMarker();
              frameset_ok = false;
              return;
            case "table":
              if (!doc._quirks && stack.inButtonScope("p")) {
                in_body_mode(ENDTAG, "p");
              }
              insertHTMLElement(value, arg3);
              frameset_ok = false;
              parser = in_table_mode;
              return;
            case "area":
            case "br":
            case "embed":
            case "img":
            case "keygen":
            case "wbr":
              afereconstruct();
              insertHTMLElement(value, arg3);
              stack.pop();
              frameset_ok = false;
              return;
            case "input":
              afereconstruct();
              elt = insertHTMLElement(value, arg3);
              stack.pop();
              var type = elt.getAttribute("type");
              if (!type || type.toLowerCase() !== "hidden") frameset_ok = false;
              return;
            case "param":
            case "source":
            case "track":
              insertHTMLElement(value, arg3);
              stack.pop();
              return;
            case "hr":
              if (stack.inButtonScope("p")) in_body_mode(ENDTAG, "p");
              if (isA(stack.top, "menuitem")) {
                stack.pop();
              }
              insertHTMLElement(value, arg3);
              stack.pop();
              frameset_ok = false;
              return;
            case "image":
              in_body_mode(TAG, "img", arg3, arg4);
              return;
            case "textarea":
              insertHTMLElement(value, arg3);
              ignore_linefeed = true;
              frameset_ok = false;
              tokenizer = rcdata_state;
              originalInsertionMode = parser;
              parser = text_mode;
              return;
            case "xmp":
              if (stack.inButtonScope("p")) in_body_mode(ENDTAG, "p");
              afereconstruct();
              frameset_ok = false;
              parseRawText(value, arg3);
              return;
            case "iframe":
              frameset_ok = false;
              parseRawText(value, arg3);
              return;
            case "noembed":
              parseRawText(value, arg3);
              return;
            case "select":
              afereconstruct();
              insertHTMLElement(value, arg3);
              frameset_ok = false;
              if (parser === in_table_mode || parser === in_caption_mode || parser === in_table_body_mode || parser === in_row_mode || parser === in_cell_mode) parser = in_select_in_table_mode;
              else parser = in_select_mode;
              return;
            case "optgroup":
            case "option":
              if (stack.top instanceof impl2.HTMLOptionElement) {
                in_body_mode(ENDTAG, "option");
              }
              afereconstruct();
              insertHTMLElement(value, arg3);
              return;
            case "menuitem":
              if (isA(stack.top, "menuitem")) {
                stack.pop();
              }
              afereconstruct();
              insertHTMLElement(value, arg3);
              return;
            case "rb":
            case "rtc":
              if (stack.inScope("ruby")) {
                stack.generateImpliedEndTags();
              }
              insertHTMLElement(value, arg3);
              return;
            case "rp":
            case "rt":
              if (stack.inScope("ruby")) {
                stack.generateImpliedEndTags("rtc");
              }
              insertHTMLElement(value, arg3);
              return;
            case "math":
              afereconstruct();
              adjustMathMLAttributes(arg3);
              adjustForeignAttributes(arg3);
              insertForeignElement(value, arg3, NAMESPACE.MATHML);
              if (arg4)
                stack.pop();
              return;
            case "svg":
              afereconstruct();
              adjustSVGAttributes(arg3);
              adjustForeignAttributes(arg3);
              insertForeignElement(value, arg3, NAMESPACE.SVG);
              if (arg4)
                stack.pop();
              return;
            case "caption":
            case "col":
            case "colgroup":
            case "frame":
            case "head":
            case "tbody":
            case "td":
            case "tfoot":
            case "th":
            case "thead":
            case "tr":
              return;
          }
          afereconstruct();
          insertHTMLElement(value, arg3);
          return;
        case 3:
          switch (value) {
            case "template":
              in_head_mode(ENDTAG, value, arg3);
              return;
            case "body":
              if (!stack.inScope("body")) return;
              parser = after_body_mode;
              return;
            case "html":
              if (!stack.inScope("body")) return;
              parser = after_body_mode;
              parser(t, value, arg3);
              return;
            case "address":
            case "article":
            case "aside":
            case "blockquote":
            case "button":
            case "center":
            case "details":
            case "dialog":
            case "dir":
            case "div":
            case "dl":
            case "fieldset":
            case "figcaption":
            case "figure":
            case "footer":
            case "header":
            case "hgroup":
            case "listing":
            case "main":
            case "menu":
            case "nav":
            case "ol":
            case "pre":
            case "section":
            case "summary":
            case "ul":
              if (!stack.inScope(value)) return;
              stack.generateImpliedEndTags();
              stack.popTag(value);
              return;
            case "form":
              if (!stack.contains("template")) {
                var openform = form_element_pointer;
                form_element_pointer = null;
                if (!openform || !stack.elementInScope(openform)) return;
                stack.generateImpliedEndTags();
                stack.removeElement(openform);
              } else {
                if (!stack.inScope("form")) return;
                stack.generateImpliedEndTags();
                stack.popTag("form");
              }
              return;
            case "p":
              if (!stack.inButtonScope(value)) {
                in_body_mode(TAG, value, null);
                parser(t, value, arg3, arg4);
              } else {
                stack.generateImpliedEndTags(value);
                stack.popTag(value);
              }
              return;
            case "li":
              if (!stack.inListItemScope(value)) return;
              stack.generateImpliedEndTags(value);
              stack.popTag(value);
              return;
            case "dd":
            case "dt":
              if (!stack.inScope(value)) return;
              stack.generateImpliedEndTags(value);
              stack.popTag(value);
              return;
            case "h1":
            case "h2":
            case "h3":
            case "h4":
            case "h5":
            case "h6":
              if (!stack.elementTypeInScope(impl2.HTMLHeadingElement)) return;
              stack.generateImpliedEndTags();
              stack.popElementType(impl2.HTMLHeadingElement);
              return;
            case "sarcasm":
              break;
            case "a":
            case "b":
            case "big":
            case "code":
            case "em":
            case "font":
            case "i":
            case "nobr":
            case "s":
            case "small":
            case "strike":
            case "strong":
            case "tt":
            case "u":
              var result = adoptionAgency(value);
              if (result) return;
              break;
            // Go to the "any other end tag" case
            case "applet":
            case "marquee":
            case "object":
              if (!stack.inScope(value)) return;
              stack.generateImpliedEndTags();
              stack.popTag(value);
              afe.clearToMarker();
              return;
            case "br":
              in_body_mode(TAG, value, null);
              return;
          }
          for (i = stack.elements.length - 1; i >= 0; i--) {
            node = stack.elements[i];
            if (isA(node, value)) {
              stack.generateImpliedEndTags(value);
              stack.popElement(node);
              break;
            } else if (isA(node, specialSet)) {
              return;
            }
          }
          return;
      }
    }
    function text_mode(t, value, arg3, arg4) {
      switch (t) {
        case 1:
          insertText(value);
          return;
        case -1:
          if (stack.top instanceof impl2.HTMLScriptElement) stack.top._already_started = true;
          stack.pop();
          parser = originalInsertionMode;
          parser(t);
          return;
        case 3:
          if (value === "script") {
            handleScriptEnd();
          } else {
            stack.pop();
            parser = originalInsertionMode;
          }
          return;
        default:
          return;
      }
    }
    function in_table_mode(t, value, arg3, arg4) {
      function getTypeAttr(attrs) {
        for (var i = 0, n = attrs.length; i < n; i++) {
          if (attrs[i][0] === "type") return attrs[i][1].toLowerCase();
        }
        return null;
      }
      switch (t) {
        case 1:
          if (text_integration_mode) {
            in_body_mode(t, value, arg3, arg4);
            return;
          } else if (isA(stack.top, tablesectionrowSet)) {
            pending_table_text = [];
            originalInsertionMode = parser;
            parser = in_table_text_mode;
            parser(t, value, arg3, arg4);
            return;
          }
          break;
        case 4:
          insertComment(value);
          return;
        case 5:
          return;
        case 2:
          switch (value) {
            case "caption":
              stack.clearToContext(tableContextSet);
              afe.insertMarker();
              insertHTMLElement(value, arg3);
              parser = in_caption_mode;
              return;
            case "colgroup":
              stack.clearToContext(tableContextSet);
              insertHTMLElement(value, arg3);
              parser = in_column_group_mode;
              return;
            case "col":
              in_table_mode(TAG, "colgroup", null);
              parser(t, value, arg3, arg4);
              return;
            case "tbody":
            case "tfoot":
            case "thead":
              stack.clearToContext(tableContextSet);
              insertHTMLElement(value, arg3);
              parser = in_table_body_mode;
              return;
            case "td":
            case "th":
            case "tr":
              in_table_mode(TAG, "tbody", null);
              parser(t, value, arg3, arg4);
              return;
            case "table":
              if (!stack.inTableScope(value)) {
                return;
              }
              in_table_mode(ENDTAG, value);
              parser(t, value, arg3, arg4);
              return;
            case "style":
            case "script":
            case "template":
              in_head_mode(t, value, arg3, arg4);
              return;
            case "input":
              var type = getTypeAttr(arg3);
              if (type !== "hidden") break;
              insertHTMLElement(value, arg3);
              stack.pop();
              return;
            case "form":
              if (form_element_pointer || stack.contains("template")) return;
              form_element_pointer = insertHTMLElement(value, arg3);
              stack.popElement(form_element_pointer);
              return;
          }
          break;
        case 3:
          switch (value) {
            case "table":
              if (!stack.inTableScope(value)) return;
              stack.popTag(value);
              resetInsertionMode();
              return;
            case "body":
            case "caption":
            case "col":
            case "colgroup":
            case "html":
            case "tbody":
            case "td":
            case "tfoot":
            case "th":
            case "thead":
            case "tr":
              return;
            case "template":
              in_head_mode(t, value, arg3, arg4);
              return;
          }
          break;
        case -1:
          in_body_mode(t, value, arg3, arg4);
          return;
      }
      foster_parent_mode = true;
      in_body_mode(t, value, arg3, arg4);
      foster_parent_mode = false;
    }
    function in_table_text_mode(t, value, arg3, arg4) {
      if (t === TEXT) {
        if (textIncludesNUL) {
          value = value.replace(NULCHARS, "");
          if (value.length === 0) return;
        }
        pending_table_text.push(value);
      } else {
        var s = pending_table_text.join("");
        pending_table_text.length = 0;
        if (NONWS.test(s)) {
          foster_parent_mode = true;
          in_body_mode(TEXT, s);
          foster_parent_mode = false;
        } else {
          insertText(s);
        }
        parser = originalInsertionMode;
        parser(t, value, arg3, arg4);
      }
    }
    function in_caption_mode(t, value, arg3, arg4) {
      function end_caption() {
        if (!stack.inTableScope("caption")) return false;
        stack.generateImpliedEndTags();
        stack.popTag("caption");
        afe.clearToMarker();
        parser = in_table_mode;
        return true;
      }
      switch (t) {
        case 2:
          switch (value) {
            case "caption":
            case "col":
            case "colgroup":
            case "tbody":
            case "td":
            case "tfoot":
            case "th":
            case "thead":
            case "tr":
              if (end_caption()) parser(t, value, arg3, arg4);
              return;
          }
          break;
        case 3:
          switch (value) {
            case "caption":
              end_caption();
              return;
            case "table":
              if (end_caption()) parser(t, value, arg3, arg4);
              return;
            case "body":
            case "col":
            case "colgroup":
            case "html":
            case "tbody":
            case "td":
            case "tfoot":
            case "th":
            case "thead":
            case "tr":
              return;
          }
          break;
      }
      in_body_mode(t, value, arg3, arg4);
    }
    function in_column_group_mode(t, value, arg3, arg4) {
      switch (t) {
        case 1:
          var ws = value.match(LEADINGWS);
          if (ws) {
            insertText(ws[0]);
            value = value.substring(ws[0].length);
          }
          if (value.length === 0) return;
          break;
        // Handle non-whitespace below
        case 4:
          insertComment(value);
          return;
        case 5:
          return;
        case 2:
          switch (value) {
            case "html":
              in_body_mode(t, value, arg3, arg4);
              return;
            case "col":
              insertHTMLElement(value, arg3);
              stack.pop();
              return;
            case "template":
              in_head_mode(t, value, arg3, arg4);
              return;
          }
          break;
        case 3:
          switch (value) {
            case "colgroup":
              if (!isA(stack.top, "colgroup")) {
                return;
              }
              stack.pop();
              parser = in_table_mode;
              return;
            case "col":
              return;
            case "template":
              in_head_mode(t, value, arg3, arg4);
              return;
          }
          break;
        case -1:
          in_body_mode(t, value, arg3, arg4);
          return;
      }
      if (!isA(stack.top, "colgroup")) {
        return;
      }
      in_column_group_mode(ENDTAG, "colgroup");
      parser(t, value, arg3, arg4);
    }
    function in_table_body_mode(t, value, arg3, arg4) {
      function endsect() {
        if (!stack.inTableScope("tbody") && !stack.inTableScope("thead") && !stack.inTableScope("tfoot")) return;
        stack.clearToContext(tableBodyContextSet);
        in_table_body_mode(ENDTAG, stack.top.localName, null);
        parser(t, value, arg3, arg4);
      }
      switch (t) {
        case 2:
          switch (value) {
            case "tr":
              stack.clearToContext(tableBodyContextSet);
              insertHTMLElement(value, arg3);
              parser = in_row_mode;
              return;
            case "th":
            case "td":
              in_table_body_mode(TAG, "tr", null);
              parser(t, value, arg3, arg4);
              return;
            case "caption":
            case "col":
            case "colgroup":
            case "tbody":
            case "tfoot":
            case "thead":
              endsect();
              return;
          }
          break;
        case 3:
          switch (value) {
            case "table":
              endsect();
              return;
            case "tbody":
            case "tfoot":
            case "thead":
              if (stack.inTableScope(value)) {
                stack.clearToContext(tableBodyContextSet);
                stack.pop();
                parser = in_table_mode;
              }
              return;
            case "body":
            case "caption":
            case "col":
            case "colgroup":
            case "html":
            case "td":
            case "th":
            case "tr":
              return;
          }
          break;
      }
      in_table_mode(t, value, arg3, arg4);
    }
    function in_row_mode(t, value, arg3, arg4) {
      function endrow() {
        if (!stack.inTableScope("tr")) return false;
        stack.clearToContext(tableRowContextSet);
        stack.pop();
        parser = in_table_body_mode;
        return true;
      }
      switch (t) {
        case 2:
          switch (value) {
            case "th":
            case "td":
              stack.clearToContext(tableRowContextSet);
              insertHTMLElement(value, arg3);
              parser = in_cell_mode;
              afe.insertMarker();
              return;
            case "caption":
            case "col":
            case "colgroup":
            case "tbody":
            case "tfoot":
            case "thead":
            case "tr":
              if (endrow()) parser(t, value, arg3, arg4);
              return;
          }
          break;
        case 3:
          switch (value) {
            case "tr":
              endrow();
              return;
            case "table":
              if (endrow()) parser(t, value, arg3, arg4);
              return;
            case "tbody":
            case "tfoot":
            case "thead":
              if (stack.inTableScope(value)) {
                if (endrow()) parser(t, value, arg3, arg4);
              }
              return;
            case "body":
            case "caption":
            case "col":
            case "colgroup":
            case "html":
            case "td":
            case "th":
              return;
          }
          break;
      }
      in_table_mode(t, value, arg3, arg4);
    }
    function in_cell_mode(t, value, arg3, arg4) {
      switch (t) {
        case 2:
          switch (value) {
            case "caption":
            case "col":
            case "colgroup":
            case "tbody":
            case "td":
            case "tfoot":
            case "th":
            case "thead":
            case "tr":
              if (stack.inTableScope("td")) {
                in_cell_mode(ENDTAG, "td");
                parser(t, value, arg3, arg4);
              } else if (stack.inTableScope("th")) {
                in_cell_mode(ENDTAG, "th");
                parser(t, value, arg3, arg4);
              }
              return;
          }
          break;
        case 3:
          switch (value) {
            case "td":
            case "th":
              if (!stack.inTableScope(value)) return;
              stack.generateImpliedEndTags();
              stack.popTag(value);
              afe.clearToMarker();
              parser = in_row_mode;
              return;
            case "body":
            case "caption":
            case "col":
            case "colgroup":
            case "html":
              return;
            case "table":
            case "tbody":
            case "tfoot":
            case "thead":
            case "tr":
              if (!stack.inTableScope(value)) return;
              in_cell_mode(ENDTAG, stack.inTableScope("td") ? "td" : "th");
              parser(t, value, arg3, arg4);
              return;
          }
          break;
      }
      in_body_mode(t, value, arg3, arg4);
    }
    function in_select_mode(t, value, arg3, arg4) {
      switch (t) {
        case 1:
          if (textIncludesNUL) {
            value = value.replace(NULCHARS, "");
            if (value.length === 0) return;
          }
          insertText(value);
          return;
        case 4:
          insertComment(value);
          return;
        case 5:
          return;
        case -1:
          in_body_mode(t, value, arg3, arg4);
          return;
        case 2:
          switch (value) {
            case "html":
              in_body_mode(t, value, arg3, arg4);
              return;
            case "option":
              if (stack.top instanceof impl2.HTMLOptionElement) in_select_mode(ENDTAG, value);
              insertHTMLElement(value, arg3);
              return;
            case "optgroup":
              if (stack.top instanceof impl2.HTMLOptionElement) in_select_mode(ENDTAG, "option");
              if (stack.top instanceof impl2.HTMLOptGroupElement) in_select_mode(ENDTAG, value);
              insertHTMLElement(value, arg3);
              return;
            case "select":
              in_select_mode(ENDTAG, value);
              return;
            case "input":
            case "keygen":
            case "textarea":
              if (!stack.inSelectScope("select")) return;
              in_select_mode(ENDTAG, "select");
              parser(t, value, arg3, arg4);
              return;
            case "script":
            case "template":
              in_head_mode(t, value, arg3, arg4);
              return;
          }
          break;
        case 3:
          switch (value) {
            case "optgroup":
              if (stack.top instanceof impl2.HTMLOptionElement && stack.elements[stack.elements.length - 2] instanceof impl2.HTMLOptGroupElement) {
                in_select_mode(ENDTAG, "option");
              }
              if (stack.top instanceof impl2.HTMLOptGroupElement) stack.pop();
              return;
            case "option":
              if (stack.top instanceof impl2.HTMLOptionElement) stack.pop();
              return;
            case "select":
              if (!stack.inSelectScope(value)) return;
              stack.popTag(value);
              resetInsertionMode();
              return;
            case "template":
              in_head_mode(t, value, arg3, arg4);
              return;
          }
          break;
      }
    }
    function in_select_in_table_mode(t, value, arg3, arg4) {
      switch (value) {
        case "caption":
        case "table":
        case "tbody":
        case "tfoot":
        case "thead":
        case "tr":
        case "td":
        case "th":
          switch (t) {
            case 2:
              in_select_in_table_mode(ENDTAG, "select");
              parser(t, value, arg3, arg4);
              return;
            case 3:
              if (stack.inTableScope(value)) {
                in_select_in_table_mode(ENDTAG, "select");
                parser(t, value, arg3, arg4);
              }
              return;
          }
      }
      in_select_mode(t, value, arg3, arg4);
    }
    function in_template_mode(t, value, arg3, arg4) {
      function switchModeAndReprocess(mode) {
        parser = mode;
        templateInsertionModes[templateInsertionModes.length - 1] = parser;
        parser(t, value, arg3, arg4);
      }
      switch (t) {
        case 1:
        // TEXT
        case 4:
        // COMMENT
        case 5:
          in_body_mode(t, value, arg3, arg4);
          return;
        case -1:
          if (!stack.contains("template")) {
            stopParsing();
          } else {
            stack.popTag("template");
            afe.clearToMarker();
            templateInsertionModes.pop();
            resetInsertionMode();
            parser(t, value, arg3, arg4);
          }
          return;
        case 2:
          switch (value) {
            case "base":
            case "basefont":
            case "bgsound":
            case "link":
            case "meta":
            case "noframes":
            case "script":
            case "style":
            case "template":
            case "title":
              in_head_mode(t, value, arg3, arg4);
              return;
            case "caption":
            case "colgroup":
            case "tbody":
            case "tfoot":
            case "thead":
              switchModeAndReprocess(in_table_mode);
              return;
            case "col":
              switchModeAndReprocess(in_column_group_mode);
              return;
            case "tr":
              switchModeAndReprocess(in_table_body_mode);
              return;
            case "td":
            case "th":
              switchModeAndReprocess(in_row_mode);
              return;
          }
          switchModeAndReprocess(in_body_mode);
          return;
        case 3:
          switch (value) {
            case "template":
              in_head_mode(t, value, arg3, arg4);
              return;
            default:
              return;
          }
      }
    }
    function after_body_mode(t, value, arg3, arg4) {
      switch (t) {
        case 1:
          if (NONWS.test(value)) break;
          in_body_mode(t, value);
          return;
        case 4:
          stack.elements[0]._appendChild(doc.createComment(value));
          return;
        case 5:
          return;
        case -1:
          stopParsing();
          return;
        case 2:
          if (value === "html") {
            in_body_mode(t, value, arg3, arg4);
            return;
          }
          break;
        // for any other tags
        case 3:
          if (value === "html") {
            if (fragment) return;
            parser = after_after_body_mode;
            return;
          }
          break;
      }
      parser = in_body_mode;
      parser(t, value, arg3, arg4);
    }
    function in_frameset_mode(t, value, arg3, arg4) {
      switch (t) {
        case 1:
          value = value.replace(ALLNONWS, "");
          if (value.length > 0) insertText(value);
          return;
        case 4:
          insertComment(value);
          return;
        case 5:
          return;
        case -1:
          stopParsing();
          return;
        case 2:
          switch (value) {
            case "html":
              in_body_mode(t, value, arg3, arg4);
              return;
            case "frameset":
              insertHTMLElement(value, arg3);
              return;
            case "frame":
              insertHTMLElement(value, arg3);
              stack.pop();
              return;
            case "noframes":
              in_head_mode(t, value, arg3, arg4);
              return;
          }
          break;
        case 3:
          if (value === "frameset") {
            if (fragment && stack.top instanceof impl2.HTMLHtmlElement) return;
            stack.pop();
            if (!fragment && !(stack.top instanceof impl2.HTMLFrameSetElement)) parser = after_frameset_mode;
            return;
          }
          break;
      }
    }
    function after_frameset_mode(t, value, arg3, arg4) {
      switch (t) {
        case 1:
          value = value.replace(ALLNONWS, "");
          if (value.length > 0) insertText(value);
          return;
        case 4:
          insertComment(value);
          return;
        case 5:
          return;
        case -1:
          stopParsing();
          return;
        case 2:
          switch (value) {
            case "html":
              in_body_mode(t, value, arg3, arg4);
              return;
            case "noframes":
              in_head_mode(t, value, arg3, arg4);
              return;
          }
          break;
        case 3:
          if (value === "html") {
            parser = after_after_frameset_mode;
            return;
          }
          break;
      }
    }
    function after_after_body_mode(t, value, arg3, arg4) {
      switch (t) {
        case 1:
          if (NONWS.test(value)) break;
          in_body_mode(t, value, arg3, arg4);
          return;
        case 4:
          doc._appendChild(doc.createComment(value));
          return;
        case 5:
          in_body_mode(t, value, arg3, arg4);
          return;
        case -1:
          stopParsing();
          return;
        case 2:
          if (value === "html") {
            in_body_mode(t, value, arg3, arg4);
            return;
          }
          break;
      }
      parser = in_body_mode;
      parser(t, value, arg3, arg4);
    }
    function after_after_frameset_mode(t, value, arg3, arg4) {
      switch (t) {
        case 1:
          value = value.replace(ALLNONWS, "");
          if (value.length > 0) in_body_mode(t, value, arg3, arg4);
          return;
        case 4:
          doc._appendChild(doc.createComment(value));
          return;
        case 5:
          in_body_mode(t, value, arg3, arg4);
          return;
        case -1:
          stopParsing();
          return;
        case 2:
          switch (value) {
            case "html":
              in_body_mode(t, value, arg3, arg4);
              return;
            case "noframes":
              in_head_mode(t, value, arg3, arg4);
              return;
          }
          break;
      }
    }
    function insertForeignToken(t, value, arg3, arg4) {
      function isHTMLFont(attrs) {
        for (var i2 = 0, n = attrs.length; i2 < n; i2++) {
          switch (attrs[i2][0]) {
            case "color":
            case "face":
            case "size":
              return true;
          }
        }
        return false;
      }
      var current;
      switch (t) {
        case 1:
          if (frameset_ok && NONWSNONNUL.test(value)) frameset_ok = false;
          if (textIncludesNUL) {
            value = value.replace(NULCHARS, "�");
          }
          insertText(value);
          return;
        case 4:
          insertComment(value);
          return;
        case 5:
          return;
        case 2:
          switch (value) {
            case "font":
              if (!isHTMLFont(arg3)) break;
            /* falls through */
            case "b":
            case "big":
            case "blockquote":
            case "body":
            case "br":
            case "center":
            case "code":
            case "dd":
            case "div":
            case "dl":
            case "dt":
            case "em":
            case "embed":
            case "h1":
            case "h2":
            case "h3":
            case "h4":
            case "h5":
            case "h6":
            case "head":
            case "hr":
            case "i":
            case "img":
            case "li":
            case "listing":
            case "menu":
            case "meta":
            case "nobr":
            case "ol":
            case "p":
            case "pre":
            case "ruby":
            case "s":
            case "small":
            case "span":
            case "strong":
            case "strike":
            case "sub":
            case "sup":
            case "table":
            case "tt":
            case "u":
            case "ul":
            case "var":
              if (fragment) {
                break;
              }
              do {
                stack.pop();
                current = stack.top;
              } while (current.namespaceURI !== NAMESPACE.HTML && !isMathmlTextIntegrationPoint(current) && !isHTMLIntegrationPoint(current));
              insertToken(t, value, arg3, arg4);
              return;
          }
          current = stack.elements.length === 1 && fragment ? fragmentContext : stack.top;
          if (current.namespaceURI === NAMESPACE.MATHML) {
            adjustMathMLAttributes(arg3);
          } else if (current.namespaceURI === NAMESPACE.SVG) {
            value = adjustSVGTagName(value);
            adjustSVGAttributes(arg3);
          }
          adjustForeignAttributes(arg3);
          insertForeignElement(value, arg3, current.namespaceURI);
          if (arg4) {
            stack.pop();
          }
          return;
        case 3:
          current = stack.top;
          if (value === "script" && current.namespaceURI === NAMESPACE.SVG && current.localName === "script") {
            stack.pop();
          } else {
            var i = stack.elements.length - 1;
            var node = stack.elements[i];
            for (; ; ) {
              if (node.localName.toLowerCase() === value) {
                stack.popElement(node);
                break;
              }
              node = stack.elements[--i];
              if (node.namespaceURI !== NAMESPACE.HTML) continue;
              parser(t, value, arg3, arg4);
              break;
            }
          }
          return;
      }
    }
    htmlparser.testTokenizer = function(input, initialState, lastStartTag, charbychar) {
      var tokens = [];
      switch (initialState) {
        case "PCDATA state":
          tokenizer = data_state;
          break;
        case "RCDATA state":
          tokenizer = rcdata_state;
          break;
        case "RAWTEXT state":
          tokenizer = rawtext_state;
          break;
        case "PLAINTEXT state":
          tokenizer = plaintext_state;
          break;
      }
      if (lastStartTag) {
        lasttagname = lastStartTag;
      }
      insertToken = function(t, value, arg3, arg4) {
        flushText();
        switch (t) {
          case 1:
            if (tokens.length > 0 && tokens[tokens.length - 1][0] === "Character") {
              tokens[tokens.length - 1][1] += value;
            } else tokens.push(["Character", value]);
            break;
          case 4:
            tokens.push(["Comment", value]);
            break;
          case 5:
            tokens.push(["DOCTYPE", value, arg3 === void 0 ? null : arg3, arg4 === void 0 ? null : arg4, !force_quirks]);
            break;
          case 2:
            var attrs = /* @__PURE__ */ Object.create(null);
            for (var i2 = 0; i2 < arg3.length; i2++) {
              var a = arg3[i2];
              if (a.length === 1) {
                attrs[a[0]] = "";
              } else {
                attrs[a[0]] = a[1];
              }
            }
            var token = ["StartTag", value, attrs];
            if (arg4) token.push(true);
            tokens.push(token);
            break;
          case 3:
            tokens.push(["EndTag", value]);
            break;
        }
      };
      if (!charbychar) {
        this.parse(input, true);
      } else {
        for (var i = 0; i < input.length; i++) {
          this.parse(input[i]);
        }
        this.parse("", true);
      }
      return tokens;
    };
    return htmlparser;
  }
  return HTMLParser_1;
}
var DOMImplementation_1;
var hasRequiredDOMImplementation;
function requireDOMImplementation() {
  if (hasRequiredDOMImplementation) return DOMImplementation_1;
  hasRequiredDOMImplementation = 1;
  DOMImplementation_1 = DOMImplementation;
  var Document = requireDocument();
  var DocumentType = requireDocumentType();
  var HTMLParser = requireHTMLParser();
  var utils2 = requireUtils();
  var xml = requireXmlnames();
  function DOMImplementation(contextObject) {
    this.contextObject = contextObject;
  }
  var supportedFeatures = {
    "xml": {
      "": true,
      "1.0": true,
      "2.0": true
    },
    // DOM Core
    "core": {
      "": true,
      "2.0": true
    },
    // DOM Core
    "html": {
      "": true,
      "1.0": true,
      "2.0": true
    },
    // HTML
    "xhtml": {
      "": true,
      "1.0": true,
      "2.0": true
    }
    // HTML
  };
  DOMImplementation.prototype = {
    hasFeature: function hasFeature(feature, version) {
      var f = supportedFeatures[(feature || "").toLowerCase()];
      return f && f[version || ""] || false;
    },
    createDocumentType: function createDocumentType(qualifiedName, publicId, systemId) {
      if (!xml.isValidQName(qualifiedName)) utils2.InvalidCharacterError();
      return new DocumentType(this.contextObject, qualifiedName, publicId, systemId);
    },
    createDocument: function createDocument(namespace, qualifiedName, doctype) {
      var d = new Document(false, null);
      var e;
      if (qualifiedName) e = d.createElementNS(namespace, qualifiedName);
      else e = null;
      if (doctype) {
        d.appendChild(doctype);
      }
      if (e) d.appendChild(e);
      if (namespace === utils2.NAMESPACE.HTML) {
        d._contentType = "application/xhtml+xml";
      } else if (namespace === utils2.NAMESPACE.SVG) {
        d._contentType = "image/svg+xml";
      } else {
        d._contentType = "application/xml";
      }
      return d;
    },
    createHTMLDocument: function createHTMLDocument(titleText) {
      var d = new Document(true, null);
      d.appendChild(new DocumentType(d, "html"));
      var html = d.createElement("html");
      d.appendChild(html);
      var head = d.createElement("head");
      html.appendChild(head);
      if (titleText !== void 0) {
        var title = d.createElement("title");
        head.appendChild(title);
        title.appendChild(d.createTextNode(titleText));
      }
      html.appendChild(d.createElement("body"));
      d.modclock = 1;
      return d;
    },
    mozSetOutputMutationHandler: function(doc, handler) {
      doc.mutationHandler = handler;
    },
    mozGetInputMutationHandler: function(doc) {
      utils2.nyi();
    },
    mozHTMLParser: HTMLParser
  };
  return DOMImplementation_1;
}
var Location_1;
var hasRequiredLocation;
function requireLocation() {
  if (hasRequiredLocation) return Location_1;
  hasRequiredLocation = 1;
  var URL2 = requireURL();
  var URLUtils = requireURLUtils();
  Location_1 = Location;
  function Location(window2, href) {
    this._window = window2;
    this._href = href;
  }
  Location.prototype = Object.create(URLUtils.prototype, {
    constructor: {
      value: Location
    },
    // Special behavior when href is set
    href: {
      get: function() {
        return this._href;
      },
      set: function(v) {
        this.assign(v);
      }
    },
    assign: {
      value: function(url) {
        var current = new URL2(this._href);
        var newurl = current.resolve(url);
        this._href = newurl;
      }
    },
    replace: {
      value: function(url) {
        this.assign(url);
      }
    },
    reload: {
      value: function() {
        this.assign(this.href);
      }
    },
    toString: {
      value: function() {
        return this.href;
      }
    }
  });
  return Location_1;
}
var NavigatorID_1;
var hasRequiredNavigatorID;
function requireNavigatorID() {
  if (hasRequiredNavigatorID) return NavigatorID_1;
  hasRequiredNavigatorID = 1;
  var NavigatorID = Object.create(null, {
    appCodeName: {
      value: "Mozilla"
    },
    appName: {
      value: "Netscape"
    },
    appVersion: {
      value: "4.0"
    },
    platform: {
      value: ""
    },
    product: {
      value: "Gecko"
    },
    productSub: {
      value: "20100101"
    },
    userAgent: {
      value: ""
    },
    vendor: {
      value: ""
    },
    vendorSub: {
      value: ""
    },
    taintEnabled: {
      value: function() {
        return false;
      }
    }
  });
  NavigatorID_1 = NavigatorID;
  return NavigatorID_1;
}
var WindowTimers_1;
var hasRequiredWindowTimers;
function requireWindowTimers() {
  if (hasRequiredWindowTimers) return WindowTimers_1;
  hasRequiredWindowTimers = 1;
  var WindowTimers = {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  };
  WindowTimers_1 = WindowTimers;
  return WindowTimers_1;
}
var impl = {
  exports: {}
};
var hasRequiredImpl;
function requireImpl() {
  if (hasRequiredImpl) return impl.exports;
  hasRequiredImpl = 1;
  (function(module, exports) {
    var utils2 = requireUtils();
    exports = module.exports = {
      CSSStyleDeclaration: requireCSSStyleDeclaration(),
      CharacterData: requireCharacterData(),
      Comment: requireComment(),
      DOMImplementation: requireDOMImplementation(),
      DOMTokenList: requireDOMTokenList(),
      Document: requireDocument(),
      DocumentFragment: requireDocumentFragment(),
      DocumentType: requireDocumentType(),
      Element: requireElement(),
      HTMLParser: requireHTMLParser(),
      NamedNodeMap: requireNamedNodeMap(),
      Node: requireNode(),
      NodeList: requireNodeList(),
      NodeFilter: requireNodeFilter(),
      ProcessingInstruction: requireProcessingInstruction(),
      Text: requireText(),
      Window: requireWindow()
    };
    utils2.merge(exports, requireEvents());
    utils2.merge(exports, requireHtmlelts().elements);
    utils2.merge(exports, requireSvg().elements);
  })(impl, impl.exports);
  return impl.exports;
}
var Window_1;
var hasRequiredWindow;
function requireWindow() {
  if (hasRequiredWindow) return Window_1;
  hasRequiredWindow = 1;
  var DOMImplementation = requireDOMImplementation();
  var EventTarget = requireEventTarget();
  var Location = requireLocation();
  var utils2 = requireUtils();
  Window_1 = Window;
  function Window(document) {
    this.document = document || new DOMImplementation(null).createHTMLDocument("");
    this.document._scripting_enabled = true;
    this.document.defaultView = this;
    this.location = new Location(this, this.document._address || "about:blank");
  }
  Window.prototype = Object.create(EventTarget.prototype, {
    console: {
      value: console
    },
    history: {
      value: {
        back: utils2.nyi,
        forward: utils2.nyi,
        go: utils2.nyi
      }
    },
    navigator: {
      value: requireNavigatorID()
    },
    // Self-referential properties
    window: {
      get: function() {
        return this;
      }
    },
    self: {
      get: function() {
        return this;
      }
    },
    frames: {
      get: function() {
        return this;
      }
    },
    // Self-referential properties for a top-level window
    parent: {
      get: function() {
        return this;
      }
    },
    top: {
      get: function() {
        return this;
      }
    },
    // We don't support any other windows for now
    length: {
      value: 0
    },
    // no frames
    frameElement: {
      value: null
    },
    // not part of a frame
    opener: {
      value: null
    },
    // not opened by another window
    // The onload event handler.
    // XXX: need to support a bunch of other event types, too,
    // and have them interoperate with document.body.
    onload: {
      get: function() {
        return this._getEventHandler("load");
      },
      set: function(v) {
        this._setEventHandler("load", v);
      }
    },
    // XXX This is a completely broken implementation
    getComputedStyle: {
      value: function getComputedStyle(elt) {
        return elt.style;
      }
    }
  });
  utils2.expose(requireWindowTimers(), Window);
  utils2.expose(requireImpl(), Window);
  return Window_1;
}
var hasRequiredLib;
function requireLib() {
  if (hasRequiredLib) return lib;
  hasRequiredLib = 1;
  (function(exports) {
    var DOMImplementation = requireDOMImplementation();
    var HTMLParser = requireHTMLParser();
    requireWindow();
    var impl2 = requireImpl();
    exports.createDOMImplementation = function() {
      return new DOMImplementation(null);
    };
    exports.createDocument = function(html, force) {
      if (html || force) {
        var parser = new HTMLParser();
        parser.parse(html || "", true);
        return parser.document();
      }
      return new DOMImplementation(null).createHTMLDocument("");
    };
    exports.createIncrementalHTMLParser = function() {
      var parser = new HTMLParser();
      return {
        /** Provide an additional chunk of text to be parsed. */
        write: function(s) {
          if (s.length > 0) {
            parser.parse(s, false, function() {
              return true;
            });
          }
        },
        /**
         * Signal that we are done providing input text, optionally
         * providing one last chunk as a parameter.
         */
        end: function(s) {
          parser.parse(s || "", true, function() {
            return true;
          });
        },
        /**
         * Performs a chunk of parsing work, returning at the end of
         * the next token as soon as shouldPauseFunc() returns true.
         * Returns true iff there is more work to do.
         *
         * For example:
         * ```
         *  var incrParser = domino.createIncrementalHTMLParser();
         *  incrParser.end('...long html document...');
         *  while (true) {
         *    // Pause every 10ms
         *    var start = Date.now();
         *    var pauseIn10 = function() { return (Date.now() - start) >= 10; };
         *    if (!incrParser.process(pauseIn10)) {
         *      break;
         *    }
         *    ...yield to other tasks, do other housekeeping, etc...
         *  }
         * ```
         */
        process: function(shouldPauseFunc) {
          return parser.parse("", false, shouldPauseFunc);
        },
        /**
         * Returns the result of the incremental parse.  Valid after
         * `this.end()` has been called and `this.process()` has returned
         * false.
         */
        document: function() {
          return parser.document();
        }
      };
    };
    exports.createWindow = function(html, address) {
      var document = exports.createDocument(html);
      if (address !== void 0) {
        document._address = address;
      }
      return new impl2.Window(document);
    };
    exports.impl = impl2;
  })(lib);
  return lib;
}
var libExports = /* @__PURE__ */ requireLib();
var index = /* @__PURE__ */ getDefaultExportFromCjs(libExports);
function setDomTypes() {
  Object.assign(globalThis, index.impl);
  globalThis["KeyboardEvent"] = index.impl.Event;
}
function parseDocument(html, url = "/") {
  let window2 = index.createWindow(html, url);
  let doc = window2.document;
  return doc;
}
function serializeDocument(doc) {
  return doc.serialize();
}
let DominoAdapter = /* @__PURE__ */ (() => {
  class DominoAdapter2 extends BrowserDomAdapter {
    static makeCurrent() {
      setDomTypes();
      setRootDomAdapter(new DominoAdapter2());
    }
    supportsDOMEvents = false;
    static defaultDoc;
    createHtmlDocument() {
      return parseDocument("<html><head><title>fakeTitle</title></head><body></body></html>");
    }
    getDefaultDocument() {
      if (!DominoAdapter2.defaultDoc) {
        DominoAdapter2.defaultDoc = index.createDocument();
      }
      return DominoAdapter2.defaultDoc;
    }
    isElementNode(node) {
      return node ? node.nodeType === DominoAdapter2.defaultDoc.ELEMENT_NODE : false;
    }
    isShadowRoot(node) {
      return node.shadowRoot == node;
    }
    /** @deprecated No longer being used in Ivy code. To be removed in version 14. */
    getGlobalEventTarget(doc, target) {
      if (target === "window") {
        return doc.defaultView;
      }
      if (target === "document") {
        return doc;
      }
      if (target === "body") {
        return doc.body;
      }
      return null;
    }
    getBaseHref(doc) {
      const length = doc.head.children.length;
      for (let i = 0; i < length; i++) {
        const child = doc.head.children[i];
        if (child.tagName === "BASE") {
          return child.getAttribute("href") || "";
        }
      }
      return "";
    }
    dispatchEvent(el, evt) {
      el.dispatchEvent(evt);
      const doc = el.ownerDocument || el;
      const win = doc.defaultView;
      if (win) {
        win.dispatchEvent(evt);
      }
    }
    getUserAgent() {
      return "Fake user agent";
    }
    getCookie(name) {
      throw new Error("getCookie has not been implemented");
    }
  }
  return DominoAdapter2;
})();
const INITIAL_CONFIG = /* @__PURE__ */ new InjectionToken("Server.INITIAL_CONFIG");
const BEFORE_APP_SERIALIZED = /* @__PURE__ */ new InjectionToken("Server.RENDER_MODULE_HOOK");
const ENABLE_DOM_EMULATION = /* @__PURE__ */ new InjectionToken("ENABLE_DOM_EMULATION");
let PlatformState = /* @__PURE__ */ (() => {
  class PlatformState2 {
    _doc;
    /* @internal */
    _enableDomEmulation = enableDomEmulation(inject(Injector));
    constructor(_doc) {
      this._doc = _doc;
    }
    /**
     * Renders the current state of the platform to string.
     */
    renderToString() {
      const rendered = this._enableDomEmulation ? serializeDocument(this._doc) : (
        // In the case we run/test the platform-server in a browser environment
        this._doc.documentElement.outerHTML
      );
      return rendered;
    }
    /**
     * Returns the current DOM state.
     */
    getDocument() {
      return this._doc;
    }
    static ɵfac = function PlatformState_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || PlatformState2)(ɵɵinject(DOCUMENT$1));
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: PlatformState2,
      factory: PlatformState2.ɵfac
    });
  }
  return PlatformState2;
})();
function enableDomEmulation(injector) {
  return injector.get(ENABLE_DOM_EMULATION, true);
}
let ServerXhr = /* @__PURE__ */ (() => {
  class ServerXhr2 {
    xhrImpl;
    // The `xhr2` dependency has a side-effect of accessing and modifying a
    // global scope. Loading `xhr2` dynamically allows us to delay the loading
    // and start the process once the global scope is established by the underlying
    // server platform (via shims, etc).
    async ɵloadImpl() {
      if (!this.xhrImpl) {
        const {
          default: xhr
        } = await import('xhr2');
        this.xhrImpl = xhr;
      }
    }
    build() {
      const impl2 = this.xhrImpl;
      if (!impl2) {
        throw new Error("Unexpected state in ServerXhr: XHR implementation is not loaded.");
      }
      return new impl2.XMLHttpRequest();
    }
    static ɵfac = function ServerXhr_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || ServerXhr2)();
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: ServerXhr2,
      factory: ServerXhr2.ɵfac
    });
  }
  return ServerXhr2;
})();
function relativeUrlsTransformerInterceptorFn(request, next) {
  const platformLocation = inject(PlatformLocation);
  const {
    href,
    protocol,
    hostname,
    port
  } = platformLocation;
  if (!protocol.startsWith("http")) {
    return next(request);
  }
  let urlPrefix = `${protocol}//${hostname}`;
  if (port) {
    urlPrefix += `:${port}`;
  }
  const baseHref = platformLocation.getBaseHrefFromDOM() || href;
  const baseUrl = new URL(baseHref, urlPrefix);
  const newUrl = new URL(request.url, baseUrl).toString();
  return next(request.clone({
    url: newUrl
  }));
}
const SERVER_HTTP_PROVIDERS = [{
  provide: XhrFactory,
  useClass: ServerXhr
}, {
  provide: HTTP_ROOT_INTERCEPTOR_FNS,
  useValue: relativeUrlsTransformerInterceptorFn,
  multi: true
}];
const RESOLVE_PROTOCOL = "resolve:";
function parseUrl(urlStr) {
  const {
    hostname,
    protocol,
    port,
    pathname,
    search,
    hash
  } = new URL(urlStr, RESOLVE_PROTOCOL + "//");
  return {
    hostname,
    protocol: protocol === RESOLVE_PROTOCOL ? "" : protocol,
    port,
    pathname,
    search,
    hash
  };
}
let ServerPlatformLocation = /* @__PURE__ */ (() => {
  class ServerPlatformLocation2 {
    _doc;
    href = "/";
    hostname = "/";
    protocol = "/";
    port = "/";
    pathname = "/";
    search = "";
    hash = "";
    _hashUpdate = new Subject();
    constructor(_doc, _config) {
      this._doc = _doc;
      const config2 = _config;
      if (!config2) {
        return;
      }
      if (config2.url) {
        const url = parseUrl(config2.url);
        this.protocol = url.protocol;
        this.hostname = url.hostname;
        this.port = url.port;
        this.pathname = url.pathname;
        this.search = url.search;
        this.hash = url.hash;
        this.href = _doc.location.href;
      }
    }
    getBaseHrefFromDOM() {
      return getDOM().getBaseHref(this._doc);
    }
    onPopState(fn) {
      return () => {
      };
    }
    onHashChange(fn) {
      const subscription = this._hashUpdate.subscribe(fn);
      return () => subscription.unsubscribe();
    }
    get url() {
      return `${this.pathname}${this.search}${this.hash}`;
    }
    setHash(value, oldUrl) {
      if (this.hash === value) {
        return;
      }
      this.hash = value;
      const newUrl = this.url;
      queueMicrotask(() => this._hashUpdate.next({
        type: "hashchange",
        state: null,
        oldUrl,
        newUrl
      }));
    }
    replaceState(state, title, newUrl) {
      const oldUrl = this.url;
      const parsedUrl = parseUrl(newUrl);
      this.pathname = parsedUrl.pathname;
      this.search = parsedUrl.search;
      this.setHash(parsedUrl.hash, oldUrl);
    }
    pushState(state, title, newUrl) {
      this.replaceState(state, title, newUrl);
    }
    forward() {
      throw new Error("Not implemented");
    }
    back() {
      throw new Error("Not implemented");
    }
    // History API isn't available on server, therefore return undefined
    getState() {
      return void 0;
    }
    static ɵfac = function ServerPlatformLocation_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || ServerPlatformLocation2)(ɵɵinject(DOCUMENT$1), ɵɵinject(INITIAL_CONFIG, 8));
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: ServerPlatformLocation2,
      factory: ServerPlatformLocation2.ɵfac
    });
  }
  return ServerPlatformLocation2;
})();
let ServerEventManagerPlugin = /* @__PURE__ */ (() => {
  class ServerEventManagerPlugin2 extends EventManagerPlugin {
    doc;
    constructor(doc) {
      super(doc);
      this.doc = doc;
    }
    // Handle all events on the server.
    supports(eventName) {
      return true;
    }
    addEventListener(element, eventName, handler, options) {
      return getDOM().onAndCancel(element, eventName, handler, options);
    }
    static ɵfac = function ServerEventManagerPlugin_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || ServerEventManagerPlugin2)(ɵɵinject(DOCUMENT$1));
    };
    static ɵprov = /* @__PURE__ */ ɵɵdefineInjectable({
      token: ServerEventManagerPlugin2,
      factory: ServerEventManagerPlugin2.ɵfac
    });
  }
  return ServerEventManagerPlugin2;
})();
const TRANSFER_STATE_SERIALIZATION_PROVIDERS = [{
  provide: BEFORE_APP_SERIALIZED,
  useFactory: serializeTransferStateFactory,
  multi: true
}];
function createScript(doc, textContent, nonce) {
  const script = doc.createElement("script");
  script.textContent = textContent;
  if (nonce) {
    script.setAttribute("nonce", nonce);
  }
  return script;
}
function serializeTransferStateFactory() {
  const doc = inject(DOCUMENT$1);
  const appId = inject(APP_ID);
  const transferStore = inject(TransferState);
  inject(Injector);
  return () => {
    const content = transferStore.toJson();
    if (transferStore.isEmpty) {
      return;
    }
    const script = createScript(
      doc,
      content,
      /**
       * `nonce` is not required for 'application/json'
       * See: https://html.spec.whatwg.org/multipage/scripting.html#attr-script-type
       */
      null
    );
    script.id = appId + "-state";
    script.setAttribute("type", "application/json");
    doc.body.appendChild(script);
  };
}
const INTERNAL_SERVER_PLATFORM_PROVIDERS = [
  {
    provide: DOCUMENT$1,
    useFactory: _document,
    deps: [Injector]
  },
  {
    provide: PLATFORM_ID,
    useValue: PLATFORM_SERVER_ID
  },
  {
    provide: PLATFORM_INITIALIZER,
    useFactory: initDominoAdapter,
    multi: true,
    deps: [Injector]
  },
  {
    provide: PlatformLocation,
    useClass: ServerPlatformLocation,
    deps: [DOCUMENT$1, [Optional, INITIAL_CONFIG]]
  },
  {
    provide: PlatformState,
    deps: [DOCUMENT$1]
  },
  // Add special provider that allows multiple instances of platformServer* to be created.
  {
    provide: ALLOW_MULTIPLE_PLATFORMS,
    useValue: true
  }
];
function initDominoAdapter(injector) {
  const _enableDomEmulation = enableDomEmulation(injector);
  return () => {
    if (_enableDomEmulation) {
      DominoAdapter.makeCurrent();
    } else {
      BrowserDomAdapter.makeCurrent();
    }
  };
}
const SERVER_RENDER_PROVIDERS = [{
  provide: EVENT_MANAGER_PLUGINS,
  multi: true,
  useClass: ServerEventManagerPlugin
}];
const PLATFORM_SERVER_PROVIDERS = [
  TRANSFER_STATE_SERIALIZATION_PROVIDERS,
  SERVER_RENDER_PROVIDERS,
  SERVER_HTTP_PROVIDERS,
  {
    provide: Testability,
    useValue: null
  },
  // Keep for backwards-compatibility.
  {
    provide: TESTABILITY,
    useValue: null
  },
  {
    provide: ViewportScroller,
    useClass: NullViewportScroller
  }
];
function _document(injector) {
  const config2 = injector.get(INITIAL_CONFIG, null);
  const _enableDomEmulation = enableDomEmulation(injector);
  let document;
  if (config2 && config2.document) {
    document = typeof config2.document === "string" ? _enableDomEmulation ? parseDocument(config2.document, config2.url) : window.document : config2.document;
  } else {
    document = getDOM().createHtmlDocument();
  }
  setDocument(document);
  return document;
}
function platformServer(extraProviders) {
  const platform = createPlatformFactory(platformCore, "server", INTERNAL_SERVER_PLATFORM_PROVIDERS)(extraProviders);
  return platform;
}

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */
function provideServerRendering() {
  return makeEnvironmentProviders([...PLATFORM_SERVER_PROVIDERS]);
}
const EVENT_DISPATCH_SCRIPT_ID = "ng-event-dispatch-contract";
function createServerPlatform(options) {
  const extraProviders = options.platformProviders ?? [];
  const platform = platformServer([{
    provide: INITIAL_CONFIG,
    useValue: {
      document: options.document,
      url: options.url
    }
  }, extraProviders]);
  return platform;
}
function findEventDispatchScript(doc) {
  return doc.getElementById(EVENT_DISPATCH_SCRIPT_ID);
}
function removeEventDispatchScript(doc) {
  findEventDispatchScript(doc)?.remove();
}
function prepareForHydration(platformState, applicationRef) {
  const environmentInjector = applicationRef.injector;
  const doc = platformState.getDocument();
  if (!environmentInjector.get(IS_HYDRATION_DOM_REUSE_ENABLED, false)) {
    removeEventDispatchScript(doc);
    return;
  }
  appendSsrContentIntegrityMarker(doc);
  const eventTypesToReplay = annotateForHydration(applicationRef, doc);
  if (eventTypesToReplay.regular.size || eventTypesToReplay.capture.size) {
    insertEventRecordScript(environmentInjector.get(APP_ID), doc, eventTypesToReplay, environmentInjector.get(CSP_NONCE, null));
  } else {
    removeEventDispatchScript(doc);
  }
}
function appendSsrContentIntegrityMarker(doc) {
  const comment = doc.createComment(SSR_CONTENT_INTEGRITY_MARKER);
  doc.body.firstChild ? doc.body.insertBefore(comment, doc.body.firstChild) : doc.body.append(comment);
}
function appendServerContextInfo(applicationRef) {
  const injector = applicationRef.injector;
  let serverContext = sanitizeServerContext(injector.get(SERVER_CONTEXT, DEFAULT_SERVER_CONTEXT));
  applicationRef.components.forEach((componentRef) => {
    const renderer = componentRef.injector.get(Renderer2);
    const element = componentRef.location.nativeElement;
    if (element) {
      renderer.setAttribute(element, "ng-server-context", serverContext);
    }
  });
}
function insertEventRecordScript(appId, doc, eventTypesToReplay, nonce) {
  const {
    regular,
    capture
  } = eventTypesToReplay;
  const eventDispatchScript = findEventDispatchScript(doc);
  if (eventDispatchScript) {
    const replayScriptContents = `window.__jsaction_bootstrap(document.body,"${appId}",${JSON.stringify(Array.from(regular))},${JSON.stringify(Array.from(capture))});`;
    const replayScript = createScript(doc, replayScriptContents, nonce);
    eventDispatchScript.after(replayScript);
  }
}
async function renderInternal(platformRef, applicationRef) {
  const platformState = platformRef.injector.get(PlatformState);
  prepareForHydration(platformState, applicationRef);
  appendServerContextInfo(applicationRef);
  const environmentInjector = applicationRef.injector;
  const callbacks = environmentInjector.get(BEFORE_APP_SERIALIZED, null);
  if (callbacks) {
    const asyncCallbacks = [];
    for (const callback of callbacks) {
      try {
        const callbackResult = callback();
        if (callbackResult) {
          asyncCallbacks.push(callbackResult);
        }
      } catch (e) {
        console.warn("Ignoring BEFORE_APP_SERIALIZED Exception: ", e);
      }
    }
    if (asyncCallbacks.length) {
      for (const result of await Promise.allSettled(asyncCallbacks)) {
        if (result.status === "rejected") {
          console.warn("Ignoring BEFORE_APP_SERIALIZED Exception: ", result.reason);
        }
      }
    }
  }
  return platformState.renderToString();
}
function asyncDestroyPlatform(platformRef) {
  return new Promise((resolve) => {
    setTimeout(() => {
      platformRef.destroy();
      resolve();
    }, 0);
  });
}
const DEFAULT_SERVER_CONTEXT = "other";
const SERVER_CONTEXT = /* @__PURE__ */ new InjectionToken("SERVER_CONTEXT");
function sanitizeServerContext(serverContext) {
  const context = serverContext.replace(/[^a-zA-Z0-9\-]/g, "");
  return context.length > 0 ? context : DEFAULT_SERVER_CONTEXT;
}
async function renderApplication(bootstrap, options) {
  const bootstrapLabel = "bootstrap";
  const _renderLabel = "_render";
  const platformRef = createServerPlatform(options);
  try {
    startMeasuring(bootstrapLabel);
    const applicationRef = await bootstrap();
    stopMeasuring(bootstrapLabel);
    startMeasuring(_renderLabel);
    const measuringLabel = "whenStable";
    startMeasuring(measuringLabel);
    await applicationRef.whenStable();
    stopMeasuring(measuringLabel);
    const rendered = await renderInternal(platformRef, applicationRef);
    stopMeasuring(_renderLabel);
    return rendered;
  } finally {
    await asyncDestroyPlatform(platformRef);
  }
}

const ANALOG_ASTRO_STATIC_PROPS = new InjectionToken('@analogjs/astro-angular: Static Props w/ Mirror Provider', {
    factory() {
        return { props: {}, mirror: {} };
    },
});
function check$1(Component, _props, _children) {
    return !!reflectComponentType(Component);
}
// Run beforeAppInitialized hook to set Input on the ComponentRef
// before the platform renders to string
const STATIC_PROPS_HOOK_PROVIDER = {
    provide: BEFORE_APP_SERIALIZED,
    useFactory: (appRef, { props, mirror, }) => {
        return () => {
            const compRef = appRef.components[0];
            if (compRef && props && mirror) {
                for (const [key, value] of Object.entries(props)) {
                    if (
                    // we double-check inputs on ComponentMirror
                    // because Astro might add additional props
                    // that aren't actually Input defined on the Component
                    mirror.inputs.some(({ templateName, propName }) => templateName === key || propName === key)) {
                        compRef.setInput(key, value);
                    }
                }
                compRef.changeDetectorRef.detectChanges();
            }
        };
    },
    deps: [ApplicationRef, ANALOG_ASTRO_STATIC_PROPS],
    multi: true,
};
async function renderToStaticMarkup$1(Component, props, _children) {
    const mirror = reflectComponentType(Component);
    const appId = mirror?.selector.split(',')[0] || Component.name.toString().toLowerCase();
    const document = `<${appId}></${appId}>`;
    const bootstrap = () => bootstrapApplication(Component, {
        providers: [
            {
                provide: ANALOG_ASTRO_STATIC_PROPS,
                useValue: { props, mirror },
            },
            STATIC_PROPS_HOOK_PROVIDER,
            provideServerRendering(),
            { provide: SERVER_CONTEXT, useValue: 'analog' },
            ...(Component.renderProviders || []),
        ],
    });
    const html = await renderApplication(bootstrap, {
        document,
    });
    return { html };
}
const _renderer0 = {
    check: check$1,
    renderToStaticMarkup: renderToStaticMarkup$1,
};

const contexts = /* @__PURE__ */ new WeakMap();
const ID_PREFIX = "r";
function getContext(rendererContextResult) {
  if (contexts.has(rendererContextResult)) {
    return contexts.get(rendererContextResult);
  }
  const ctx = {
    currentIndex: 0,
    get id() {
      return ID_PREFIX + this.currentIndex.toString();
    }
  };
  contexts.set(rendererContextResult, ctx);
  return ctx;
}
function incrementId(rendererContextResult) {
  const ctx = getContext(rendererContextResult);
  const id = ctx.id;
  ctx.currentIndex++;
  return id;
}

const StaticHtml = ({
  value,
  name,
  hydrate = true
}) => {
  if (!value) return null;
  const tagName = hydrate ? "astro-slot" : "astro-static-slot";
  return createElement(tagName, {
    name,
    suppressHydrationWarning: true,
    dangerouslySetInnerHTML: { __html: value }
  });
};
StaticHtml.shouldComponentUpdate = () => false;
var static_html_default = StaticHtml;

const slotName = (str) => str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());
const reactTypeof = Symbol.for("react.element");
const reactTransitionalTypeof = Symbol.for("react.transitional.element");
async function check(Component, props, children) {
  if (typeof Component === "object") {
    return Component["$$typeof"].toString().slice("Symbol(".length).startsWith("react");
  }
  if (typeof Component !== "function") return false;
  if (Component.name === "QwikComponent") return false;
  if (typeof Component === "function" && Component["$$typeof"] === Symbol.for("react.forward_ref"))
    return false;
  if (Component.prototype != null && typeof Component.prototype.render === "function") {
    return React__default.Component.isPrototypeOf(Component) || React__default.PureComponent.isPrototypeOf(Component);
  }
  let isReactComponent = false;
  function Tester(...args) {
    try {
      const vnode = Component(...args);
      if (vnode && (vnode["$$typeof"] === reactTypeof || vnode["$$typeof"] === reactTransitionalTypeof)) {
        isReactComponent = true;
      }
    } catch {
    }
    return React__default.createElement("div");
  }
  await renderToStaticMarkup.call(this, Tester, props, children);
  return isReactComponent;
}
async function getNodeWritable() {
  let nodeStreamBuiltinModuleName = "node:stream";
  let { Writable } = await import(
    /* @vite-ignore */
    nodeStreamBuiltinModuleName
  );
  return Writable;
}
function needsHydration(metadata) {
  return metadata?.astroStaticSlot ? !!metadata.hydrate : true;
}
async function renderToStaticMarkup(Component, props, { default: children, ...slotted }, metadata) {
  let prefix;
  if (this && this.result) {
    prefix = incrementId(this.result);
  }
  const attrs = { prefix };
  delete props["class"];
  const slots = {};
  for (const [key, value] of Object.entries(slotted)) {
    const name = slotName(key);
    slots[name] = React__default.createElement(static_html_default, {
      hydrate: needsHydration(metadata),
      value,
      name
    });
  }
  const newProps = {
    ...props,
    ...slots
  };
  const newChildren = children ?? props.children;
  if (newChildren != null) {
    newProps.children = React__default.createElement(static_html_default, {
      hydrate: needsHydration(metadata),
      value: newChildren
    });
  }
  const formState = this ? await getFormState(this) : void 0;
  if (formState) {
    attrs["data-action-result"] = JSON.stringify(formState[0]);
    attrs["data-action-key"] = formState[1];
    attrs["data-action-name"] = formState[2];
  }
  const vnode = React__default.createElement(Component, newProps);
  const renderOptions = {
    identifierPrefix: prefix,
    formState
  };
  let html;
  if ("renderToReadableStream" in ReactDOM) {
    html = await renderToReadableStreamAsync(vnode, renderOptions);
  } else {
    html = await renderToPipeableStreamAsync(vnode, renderOptions);
  }
  return { html, attrs };
}
async function getFormState({
  result
}) {
  const { request, actionResult } = result;
  if (!actionResult) return void 0;
  if (!isFormRequest(request.headers.get("content-type"))) return void 0;
  const { searchParams } = new URL(request.url);
  const formData = await request.clone().formData();
  const actionKey = formData.get("$ACTION_KEY")?.toString();
  const actionName = searchParams.get("_action");
  if (!actionKey || !actionName) return void 0;
  return [actionResult, actionKey, actionName];
}
async function renderToPipeableStreamAsync(vnode, options) {
  const Writable = await getNodeWritable();
  let html = "";
  return new Promise((resolve, reject) => {
    let error = void 0;
    let stream = ReactDOM.renderToPipeableStream(vnode, {
      ...options,
      onError(err) {
        error = err;
        reject(error);
      },
      onAllReady() {
        stream.pipe(
          new Writable({
            write(chunk, _encoding, callback) {
              html += chunk.toString("utf-8");
              callback();
            },
            destroy() {
              resolve(html);
            }
          })
        );
      }
    });
  });
}
async function readResult(stream) {
  const reader = stream.getReader();
  let result = "";
  const decoder = new TextDecoder("utf-8");
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (value) {
        result += decoder.decode(value);
      } else {
        decoder.decode(new Uint8Array());
      }
      return result;
    }
    result += decoder.decode(value, { stream: true });
  }
}
async function renderToReadableStreamAsync(vnode, options) {
  return await readResult(await ReactDOM.renderToReadableStream(vnode, options));
}
const formContentTypes = ["application/x-www-form-urlencoded", "multipart/form-data"];
function isFormRequest(contentType) {
  const type = contentType?.split(";")[0].toLowerCase();
  return formContentTypes.some((t) => type === t);
}
const renderer = {
  name: "@astrojs/react",
  check,
  renderToStaticMarkup,
  supportsAstroStaticSlot: true
};
var server_default = renderer;

const renderers = [Object.assign({"name":"@analogjs/astro-angular","clientEntrypoint":"@analogjs/astro-angular/client.js","serverEntrypoint":"@analogjs/astro-angular/server.js"}, { ssr: _renderer0 }),Object.assign({"name":"@astrojs/react","clientEntrypoint":"@astrojs/react/client.js","serverEntrypoint":"@astrojs/react/server.js"}, { ssr: server_default }),];

export { ɵɵconditional as A, ɵɵrepeaterCreate as B, ChangeDetectionScheduler as C, DestroyRef as D, EffectScheduler as E, FLAGS as F, ɵɵnextContext as G, ɵɵrepeater as H, Injector as I, ɵɵrepeaterTrackByIndex as J, ɵɵgetCurrentView as K, ɵɵrestoreView as L, ɵɵresetView as M, NodeInjectorDestroyRef as N, ɵɵtextInterpolate as O, ɵɵsanitizeUrl as P, REACTIVE_NODE as R, SIGNAL as S, ViewContext as V, ɵɵdomElementStart as a, ɵɵtext as b, ɵɵdomElementEnd as c, ɵɵadvance as d, ɵɵtextInterpolate1 as e, consumerPollProducersForChange as f, consumerBeforeComputation as g, consumerAfterComputation as h, inject as i, EFFECTS as j, consumerDestroy as k, setActiveConsumer as l, markAncestorsForTraversal as m, noop as n, setIsRefreshingViews as o, createComputed as p, ɵɵnamespaceSVG as q, renderers as r, signal as s, ɵɵdomElement as t, ɵɵelementStart as u, ɵɵelement as v, ɵɵlistener as w, ɵɵelementEnd as x, ɵɵconditionalCreate as y, ɵɵproperty as z, ɵɵdefineComponent as ɵ };

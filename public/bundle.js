
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() {}

    function assign(tar, src) {
      // @ts-ignore
      for (const k in src) tar[k] = src[k];

      return tar;
    }

    function is_promise(value) {
      return value && typeof value === 'object' && typeof value.then === 'function';
    }

    function add_location(element, file, line, column, char) {
      element.__svelte_meta = {
        loc: {
          file,
          line,
          column,
          char
        }
      };
    }

    function run(fn) {
      return fn();
    }

    function blank_object() {
      return Object.create(null);
    }

    function run_all(fns) {
      fns.forEach(run);
    }

    function is_function(thing) {
      return typeof thing === 'function';
    }

    function safe_not_equal(a, b) {
      return a != a ? b == b : a !== b || a && typeof a === 'object' || typeof a === 'function';
    }

    function validate_store(store, name) {
      if (!store || typeof store.subscribe !== 'function') {
        throw new Error("'".concat(name, "' is not a store with a 'subscribe' method"));
      }
    }

    function subscribe(component, store, callback) {
      const unsub = store.subscribe(callback);
      component.$$.on_destroy.push(unsub.unsubscribe ? () => unsub.unsubscribe() : unsub);
    }

    function create_slot(definition, ctx, fn) {
      if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, fn);
        return definition[0](slot_ctx);
      }
    }

    function get_slot_context(definition, ctx, fn) {
      return definition[1] ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {}))) : ctx.$$scope.ctx;
    }

    function get_slot_changes(definition, ctx, changed, fn) {
      return definition[1] ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {}))) : ctx.$$scope.changed || {};
    }

    function exclude_internal_props(props) {
      const result = {};

      for (const k in props) if (k[0] !== '$') result[k] = props[k];

      return result;
    }

    function append(target, node) {
      target.appendChild(node);
    }

    function insert(target, node, anchor) {
      target.insertBefore(node, anchor || null);
    }

    function detach(node) {
      node.parentNode.removeChild(node);
    }

    function destroy_each(iterations, detaching) {
      for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i]) iterations[i].d(detaching);
      }
    }

    function element(name) {
      return document.createElement(name);
    }

    function text(data) {
      return document.createTextNode(data);
    }

    function space() {
      return text(' ');
    }

    function empty() {
      return text('');
    }

    function listen(node, event, handler, options) {
      node.addEventListener(event, handler, options);
      return () => node.removeEventListener(event, handler, options);
    }

    function attr(node, attribute, value) {
      if (value == null) node.removeAttribute(attribute);else node.setAttribute(attribute, value);
    }

    function set_attributes(node, attributes) {
      for (const key in attributes) {
        if (key === 'style') {
          node.style.cssText = attributes[key];
        } else if (key in node) {
          node[key] = attributes[key];
        } else {
          attr(node, key, attributes[key]);
        }
      }
    }

    function children(element) {
      return Array.from(element.childNodes);
    }

    function custom_event(type, detail) {
      const e = document.createEvent('CustomEvent');
      e.initCustomEvent(type, false, false, detail);
      return e;
    }

    let current_component;

    function set_current_component(component) {
      current_component = component;
    }

    function get_current_component() {
      if (!current_component) throw new Error("Function called outside component initialization");
      return current_component;
    }

    function onMount(fn) {
      get_current_component().$$.on_mount.push(fn);
    }

    function onDestroy(fn) {
      get_current_component().$$.on_destroy.push(fn);
    }

    function createEventDispatcher() {
      const component = current_component;
      return (type, detail) => {
        const callbacks = component.$$.callbacks[type];

        if (callbacks) {
          // TODO are there situations where events could be dispatched
          // in a server (non-DOM) environment?
          const event = custom_event(type, detail);
          callbacks.slice().forEach(fn => {
            fn.call(component, event);
          });
        }
      };
    }

    function setContext(key, context) {
      get_current_component().$$.context.set(key, context);
    }

    function getContext(key) {
      return get_current_component().$$.context.get(key);
    } // TODO figure out if we still want to support

    const dirty_components = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];

    function schedule_update() {
      if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
      }
    }

    function add_render_callback(fn) {
      render_callbacks.push(fn);
    }

    function flush() {
      const seen_callbacks = new Set();

      do {
        // first, call beforeUpdate functions
        // and update components
        while (dirty_components.length) {
          const component = dirty_components.shift();
          set_current_component(component);
          update(component.$$);
        }

        while (binding_callbacks.length) binding_callbacks.shift()(); // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...


        while (render_callbacks.length) {
          const callback = render_callbacks.pop();

          if (!seen_callbacks.has(callback)) {
            callback(); // ...so guard against infinite loops

            seen_callbacks.add(callback);
          }
        }
      } while (dirty_components.length);

      while (flush_callbacks.length) {
        flush_callbacks.pop()();
      }

      update_scheduled = false;
    }

    function update($$) {
      if ($$.fragment) {
        $$.update($$.dirty);
        run_all($$.before_render);
        $$.fragment.p($$.dirty, $$.ctx);
        $$.dirty = null;
        $$.after_render.forEach(add_render_callback);
      }
    }

    const outroing = new Set();
    let outros;

    function group_outros() {
      outros = {
        remaining: 0,
        callbacks: []
      };
    }

    function check_outros() {
      if (!outros.remaining) {
        run_all(outros.callbacks);
      }
    }

    function transition_in(block, local) {
      if (block && block.i) {
        outroing.delete(block);
        block.i(local);
      }
    }

    function transition_out(block, local, callback) {
      if (block && block.o) {
        if (outroing.has(block)) return;
        outroing.add(block);
        outros.callbacks.push(() => {
          outroing.delete(block);

          if (callback) {
            block.d(1);
            callback();
          }
        });
        block.o(local);
      }
    }

    function handle_promise(promise, info) {
      const token = info.token = {};

      function update(type, index, key, value) {
        if (info.token !== token) return;
        info.resolved = key && {
          [key]: value
        };
        const child_ctx = assign(assign({}, info.ctx), info.resolved);
        const block = type && (info.current = type)(child_ctx);

        if (info.block) {
          if (info.blocks) {
            info.blocks.forEach((block, i) => {
              if (i !== index && block) {
                group_outros();
                transition_out(block, 1, () => {
                  info.blocks[i] = null;
                });
                check_outros();
              }
            });
          } else {
            info.block.d(1);
          }

          block.c();
          transition_in(block, 1);
          block.m(info.mount(), info.anchor);
          flush();
        }

        info.block = block;
        if (info.blocks) info.blocks[index] = block;
      }

      if (is_promise(promise)) {
        promise.then(value => {
          update(info.then, 1, info.value, value);
        }, error => {
          update(info.catch, 2, info.error, error);
        }); // if we previously had a then/catch block, destroy it

        if (info.current !== info.pending) {
          update(info.pending, 0);
          return true;
        }
      } else {
        if (info.current !== info.then) {
          update(info.then, 1, info.value, promise);
          return true;
        }

        info.resolved = {
          [info.value]: promise
        };
      }
    }

    function get_spread_update(levels, updates) {
      const update = {};
      const to_null_out = {};
      const accounted_for = {
        $$scope: 1
      };
      let i = levels.length;

      while (i--) {
        const o = levels[i];
        const n = updates[i];

        if (n) {
          for (const key in o) {
            if (!(key in n)) to_null_out[key] = 1;
          }

          for (const key in n) {
            if (!accounted_for[key]) {
              update[key] = n[key];
              accounted_for[key] = 1;
            }
          }

          levels[i] = n;
        } else {
          for (const key in o) {
            accounted_for[key] = 1;
          }
        }
      }

      for (const key in to_null_out) {
        if (!(key in update)) update[key] = undefined;
      }

      return update;
    }

    function mount_component(component, target, anchor) {
      const {
        fragment,
        on_mount,
        on_destroy,
        after_render
      } = component.$$;
      fragment.m(target, anchor); // onMount happens after the initial afterUpdate. Because
      // afterUpdate callbacks happen in reverse order (inner first)
      // we schedule onMount callbacks before afterUpdate callbacks

      add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);

        if (on_destroy) {
          on_destroy.push(...new_on_destroy);
        } else {
          // Edge case - component was destroyed immediately,
          // most likely as a result of a binding initialising
          run_all(new_on_destroy);
        }

        component.$$.on_mount = [];
      });
      after_render.forEach(add_render_callback);
    }

    function destroy_component(component, detaching) {
      if (component.$$.fragment) {
        run_all(component.$$.on_destroy);
        if (detaching) component.$$.fragment.d(1); // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)

        component.$$.on_destroy = component.$$.fragment = null;
        component.$$.ctx = {};
      }
    }

    function make_dirty(component, key) {
      if (!component.$$.dirty) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty = blank_object();
      }

      component.$$.dirty[key] = true;
    }

    function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
      const parent_component = current_component;
      set_current_component(component);
      const props = options.props || {};
      const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props: prop_names,
        update: noop,
        not_equal: not_equal$$1,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_render: [],
        after_render: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty: null
      };
      let ready = false;
      $$.ctx = instance ? instance(component, props, (key, value) => {
        if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
          if ($$.bound[key]) $$.bound[key](value);
          if (ready) make_dirty(component, key);
        }
      }) : props;
      $$.update();
      ready = true;
      run_all($$.before_render);
      $$.fragment = create_fragment($$.ctx);

      if (options.target) {
        if (options.hydrate) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          $$.fragment.l(children(options.target));
        } else {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          $$.fragment.c();
        }

        if (options.intro) transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
      }

      set_current_component(parent_component);
    }

    class SvelteComponent {
      $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
      }

      $on(type, callback) {
        const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
        callbacks.push(callback);
        return () => {
          const index = callbacks.indexOf(callback);
          if (index !== -1) callbacks.splice(index, 1);
        };
      }

      $set() {// overridden by instance, if it has props
      }

    }

    class SvelteComponentDev extends SvelteComponent {
      constructor(options) {
        if (!options || !options.target && !options.$$inline) {
          throw new Error("'target' is a required option");
        }

        super();
      }

      $destroy() {
        super.$destroy();

        this.$destroy = () => {
          console.warn("Component was already destroyed"); // eslint-disable-line no-console
        };
      }

    }

    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */

    function readable(value, start) {
      return {
        subscribe: writable(value, start).subscribe
      };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */


    function writable(value, start = noop) {
      let stop;
      const subscribers = [];

      function set(new_value) {
        if (safe_not_equal(value, new_value)) {
          value = new_value;

          if (!stop) {
            return; // not ready
          }

          subscribers.forEach(s => s[1]());
          subscribers.forEach(s => s[0](value));
        }
      }

      function update(fn) {
        set(fn(value));
      }

      function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.push(subscriber);

        if (subscribers.length === 1) {
          stop = start(set) || noop;
        }

        run(value);
        return () => {
          const index = subscribers.indexOf(subscriber);

          if (index !== -1) {
            subscribers.splice(index, 1);
          }

          if (subscribers.length === 0) {
            stop();
          }
        };
      }

      return {
        set,
        update,
        subscribe
      };
    }
    /**
     * Derived value store by synchronizing one or more readable stores and
     * applying an aggregation function over its input values.
     * @param {Stores} stores input stores
     * @param {function(Stores=, function(*)=):*}fn function callback that aggregates the values
     * @param {*=}initial_value when used asynchronously
     */


    function derived(stores, fn, initial_value) {
      const single = !Array.isArray(stores);
      const stores_array = single ? [stores] : stores;
      const auto = fn.length < 2;
      const invalidators = [];
      const store = readable(initial_value, set => {
        let inited = false;
        const values = [];
        let pending = 0;
        let cleanup = noop;

        const sync = () => {
          if (pending) {
            return;
          }

          cleanup();
          const result = fn(single ? values[0] : values, set);

          if (auto) {
            set(result);
          } else {
            cleanup = is_function(result) ? result : noop;
          }
        };

        const unsubscribers = stores_array.map((store, i) => store.subscribe(value => {
          values[i] = value;
          pending &= ~(1 << i);

          if (inited) {
            sync();
          }
        }, () => {
          run_all(invalidators);
          pending |= 1 << i;
        }));
        inited = true;
        sync();
        return function stop() {
          run_all(unsubscribers);
          cleanup();
        };
      });
      return {
        subscribe(run, invalidate = noop) {
          invalidators.push(invalidate);
          const unsubscribe = store.subscribe(run, invalidate);
          return () => {
            const index = invalidators.indexOf(invalidate);

            if (index !== -1) {
              invalidators.splice(index, 1);
            }

            unsubscribe();
          };
        }

      };
    }

    const LOCATION = {};
    const ROUTER = {};

    function _defineProperty(obj, key, value) {
      if (key in obj) {
        Object.defineProperty(obj, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: true
        });
      } else {
        obj[key] = value;
      }

      return obj;
    }

    function _objectSpread(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i] != null ? arguments[i] : {};
        var ownKeys = Object.keys(source);

        if (typeof Object.getOwnPropertySymbols === 'function') {
          ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
            return Object.getOwnPropertyDescriptor(source, sym).enumerable;
          }));
        }

        ownKeys.forEach(function (key) {
          _defineProperty(target, key, source[key]);
        });
      }

      return target;
    }

    function _objectWithoutPropertiesLoose(source, excluded) {
      if (source == null) return {};
      var target = {};
      var sourceKeys = Object.keys(source);
      var key, i;

      for (i = 0; i < sourceKeys.length; i++) {
        key = sourceKeys[i];
        if (excluded.indexOf(key) >= 0) continue;
        target[key] = source[key];
      }

      return target;
    }

    function _objectWithoutProperties(source, excluded) {
      if (source == null) return {};

      var target = _objectWithoutPropertiesLoose(source, excluded);

      var key, i;

      if (Object.getOwnPropertySymbols) {
        var sourceSymbolKeys = Object.getOwnPropertySymbols(source);

        for (i = 0; i < sourceSymbolKeys.length; i++) {
          key = sourceSymbolKeys[i];
          if (excluded.indexOf(key) >= 0) continue;
          if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
          target[key] = source[key];
        }
      }

      return target;
    }

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */
    function getLocation(source) {
      return _objectSpread({}, source.location, {
        state: source.history.state,
        key: source.history.state && source.history.state.key || "initial"
      });
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);
      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({
              location,
              action: "POP"
            });
          };

          source.addEventListener("popstate", popstateListener);
          return () => {
            source.removeEventListener("popstate", popstateListener);
            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, {
          state,
          replace = false
        } = {}) {
          state = _objectSpread({}, state, {
            key: Date.now() + ""
          }); // try...catch iOS Safari limits to 100 pushState calls

          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({
            location,
            action: "PUSH"
          }));
        }

      };
    } // Stores history entries in memory for testing or other platforms like Native


    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{
        pathname: initialPathname,
        search: ""
      }];
      const states = [];
      return {
        get location() {
          return stack[index];
        },

        addEventListener(name, fn) {},

        removeEventListener(name, fn) {},

        history: {
          get entries() {
            return stack;
          },

          get index() {
            return index;
          },

          get state() {
            return states[index];
          },

          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({
              pathname,
              search
            });
            states.push(state);
          },

          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = {
              pathname,
              search
            };
            states[index] = state;
          }

        }
      };
    } // Global history uses window.history as the source if available,
    // otherwise a memory history


    const canUseDOM = Boolean(typeof window !== "undefined" && window.document && window.document.createElement);
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const {
      navigate
    } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */
    const paramRe = /^:(.+)/;
    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;
    /**
     * Check if `string` starts with `search`
     * @param {string} string
     * @param {string} search
     * @return {boolean}
     */

    function startsWith(string, search) {
      return string.substr(0, search.length) === search;
    }
    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */

    function isRootSegment(segment) {
      return segment === "";
    }
    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */


    function isDynamic(segment) {
      return paramRe.test(segment);
    }
    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */


    function isSplat(segment) {
      return segment[0] === "*";
    }
    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */


    function segmentize(uri) {
      return uri // Strip starting/ending `/`
      .replace(/(^\/+|\/+$)/g, "").split("/");
    }
    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */


    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }
    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */


    function rankRoute(route, index) {
      const score = route.default ? 0 : segmentize(route.path).reduce((score, segment) => {
        score += SEGMENT_POINTS;

        if (isRootSegment(segment)) {
          score += ROOT_POINTS;
        } else if (isDynamic(segment)) {
          score += DYNAMIC_POINTS;
        } else if (isSplat(segment)) {
          score -= SEGMENT_POINTS + SPLAT_PENALTY;
        } else {
          score += STATIC_POINTS;
        }

        return score;
      }, 0);
      return {
        route,
        score,
        index
      };
    }
    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */


    function rankRoutes(routes) {
      return routes.map(rankRoute) // If two routes have the exact same score, we go by index instead
      .sort((a, b) => a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index);
    }
    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */


    function pick(routes, uri) {
      let match;
      let default_;
      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);
            params[splatName] = uriSegments.slice(index).map(decodeURIComponent).join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }
    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */


    function match(route, uri) {
      return pick([route], uri);
    }
    /**
     * Add the query to the pathname if a query is given
     * @param {string} pathname
     * @param {string} [query]
     * @return {string}
     */


    function addQuery(pathname, query) {
      return pathname + (query ? "?".concat(query) : "");
    }
    /**
     * Resolve URIs as though every path is a directory, no files. Relative URIs
     * in the browser can feel awkward because not only can you be "in a directory",
     * you can be "at a file", too. For example:
     *
     *  browserSpecResolve('foo', '/bar/') => /bar/foo
     *  browserSpecResolve('foo', '/bar') => /foo
     *
     * But on the command line of a file system, it's not as complicated. You can't
     * `cd` from a file, only directories. This way, links have to know less about
     * their current path. To go deeper you can do this:
     *
     *  <Link to="deeper"/>
     *  // instead of
     *  <Link to=`{${props.uri}/deeper}`/>
     *
     * Just like `cd`, if you want to go deeper from the command line, you do this:
     *
     *  cd deeper
     *  # not
     *  cd $(pwd)/deeper
     *
     * By treating every path as a directory, linking to relative paths should
     * require less contextual information and (fingers crossed) be more intuitive.
     * @param {string} to
     * @param {string} base
     * @return {string}
     */


    function resolve(to, base) {
      // /foo/bar, /baz/qux => /foo/bar
      if (startsWith(to, "/")) {
        return to;
      }

      const [toPathname, toQuery] = to.split("?");
      const [basePathname] = base.split("?");
      const toSegments = segmentize(toPathname);
      const baseSegments = segmentize(basePathname); // ?a=b, /users?b=c => /users?a=b

      if (toSegments[0] === "") {
        return addQuery(basePathname, toQuery);
      } // profile, /users/789 => /users/789/profile


      if (!startsWith(toSegments[0], ".")) {
        const pathname = baseSegments.concat(toSegments).join("/");
        return addQuery((basePathname === "/" ? "" : "/") + pathname, toQuery);
      } // ./       , /users/123 => /users/123
      // ../      , /users/123 => /users
      // ../..    , /users/123 => /
      // ../../one, /a/b/c/d   => /a/b/one
      // .././one , /a/b/c/d   => /a/b/c/one


      const allSegments = baseSegments.concat(toSegments);
      const segments = [];
      allSegments.forEach(segment => {
        if (segment === "..") {
          segments.pop();
        } else if (segment !== ".") {
          segments.push(segment);
        }
      });
      return addQuery("/" + segments.join("/"), toQuery);
    }
    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */


    function combinePaths(basepath, path) {
      return "".concat(stripSlashes(path === "/" ? basepath : "".concat(stripSlashes(basepath), "/").concat(stripSlashes(path))), "/");
    }
    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */


    function shouldNavigate(event) {
      return !event.defaultPrevented && event.button === 0 && !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
    }

    /* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.5.3 */

    function create_fragment(ctx) {
      var current;
      const default_slot_1 = ctx.$$slots.default;
      const default_slot = create_slot(default_slot_1, ctx, null);
      return {
        c: function create() {
          if (default_slot) default_slot.c();
        },
        l: function claim(nodes) {
          if (default_slot) default_slot.l(nodes);
          throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
        },
        m: function mount(target, anchor) {
          if (default_slot) {
            default_slot.m(target, anchor);
          }

          current = true;
        },
        p: function update(changed, ctx) {
          if (default_slot && default_slot.p && changed.$$scope) {
            default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
          }
        },
        i: function intro(local) {
          if (current) return;
          transition_in(default_slot, local);
          current = true;
        },
        o: function outro(local) {
          transition_out(default_slot, local);
          current = false;
        },
        d: function destroy(detaching) {
          if (default_slot) default_slot.d(detaching);
        }
      };
    }

    function instance($$self, $$props, $$invalidate) {
      let $base, $location, $routes;
      let {
        basepath = "/",
        url = null
      } = $$props;
      const locationContext = getContext(LOCATION);
      const routerContext = getContext(ROUTER);
      const routes = writable([]);
      validate_store(routes, 'routes');
      subscribe($$self, routes, $$value => {
        $routes = $$value;
        $$invalidate('$routes', $routes);
      });
      const activeRoute = writable(null);
      let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.
      // If locationContext is not set, this is the topmost Router in the tree.
      // If the `url` prop is given we force the location to it.

      const location = locationContext || writable(url ? {
        pathname: url
      } : globalHistory.location);
      validate_store(location, 'location');
      subscribe($$self, location, $$value => {
        $location = $$value;
        $$invalidate('$location', $location);
      }); // If routerContext is set, the routerBase of the parent Router
      // will be the base for this Router's descendants.
      // If routerContext is not set, the path and resolved uri will both
      // have the value of the basepath prop.

      const base = routerContext ? routerContext.routerBase : writable({
        path: basepath,
        uri: basepath
      });
      validate_store(base, 'base');
      subscribe($$self, base, $$value => {
        $base = $$value;
        $$invalidate('$base', $base);
      });
      const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
        // If there is no activeRoute, the routerBase will be identical to the base.
        if (activeRoute === null) {
          return base;
        }

        const {
          path: basepath
        } = base;
        const {
          route,
          uri
        } = activeRoute; // Remove the potential /* or /*splatname from
        // the end of the child Routes relative paths.

        const path = route.default ? basepath : route.path.replace(/\*.*$/, "");
        return {
          path,
          uri
        };
      });

      function registerRoute(route) {
        const {
          path: basepath
        } = $base;
        let {
          path
        } = route; // We store the original path in the _path property so we can reuse
        // it when the basepath changes. The only thing that matters is that
        // the route reference is intact, so mutation is fine.

        route._path = path;
        route.path = combinePaths(basepath, path);

        if (typeof window === "undefined") {
          // In SSR we should set the activeRoute immediately if it is a match.
          // If there are more Routes being registered after a match is found,
          // we just skip them.
          if (hasActiveRoute) {
            return;
          }

          const matchingRoute = match(route, $location.pathname);

          if (matchingRoute) {
            activeRoute.set(matchingRoute);
            hasActiveRoute = true;
          }
        } else {
          routes.update(rs => {
            rs.push(route);
            return rs;
          });
        }
      }

      function unregisterRoute(route) {
        routes.update(rs => {
          const index = rs.indexOf(route);
          rs.splice(index, 1);
          return rs;
        });
      }

      if (!locationContext) {
        // The topmost Router in the tree is responsible for updating
        // the location store and supplying it through context.
        onMount(() => {
          const unlisten = globalHistory.listen(history => {
            location.set(history.location);
          });
          return unlisten;
        });
        setContext(LOCATION, location);
      }

      setContext(ROUTER, {
        activeRoute,
        base,
        routerBase,
        registerRoute,
        unregisterRoute
      });
      const writable_props = ['basepath', 'url'];
      Object.keys($$props).forEach(key => {
        if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn("<Router> was created with unknown prop '".concat(key, "'"));
      });
      let {
        $$slots = {},
        $$scope
      } = $$props;

      $$self.$set = $$props => {
        if ('basepath' in $$props) $$invalidate('basepath', basepath = $$props.basepath);
        if ('url' in $$props) $$invalidate('url', url = $$props.url);
        if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
      };

      $$self.$$.update = ($$dirty = {
        $base: 1,
        $routes: 1,
        $location: 1
      }) => {
        if ($$dirty.$base) {
          {
            const {
              path: basepath
            } = $base;
            routes.update(rs => {
              rs.forEach(r => r.path = combinePaths(basepath, r._path));
              return rs;
            });
          }
        }

        if ($$dirty.$routes || $$dirty.$location) {
          {
            const bestMatch = pick($routes, $location.pathname);
            activeRoute.set(bestMatch);
          }
        }
      };

      return {
        basepath,
        url,
        routes,
        location,
        base,
        $$slots,
        $$scope
      };
    }

    class Router extends SvelteComponentDev {
      constructor(options) {
        super(options);
        init(this, options, instance, create_fragment, safe_not_equal, ["basepath", "url"]);
      }

      get basepath() {
        throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
      }

      set basepath(value) {
        throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
      }

      get url() {
        throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
      }

      set url(value) {
        throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
      }

    }

    function create_if_block(ctx) {
      var current_block_type_index, if_block, if_block_anchor, current;
      var if_block_creators = [create_if_block_1, create_else_block];
      var if_blocks = [];

      function select_block_type(ctx) {
        if (ctx.component !== null) return 0;
        return 1;
      }

      current_block_type_index = select_block_type(ctx);
      if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
      return {
        c: function create() {
          if_block.c();
          if_block_anchor = empty();
        },
        m: function mount(target, anchor) {
          if_blocks[current_block_type_index].m(target, anchor);
          insert(target, if_block_anchor, anchor);
          current = true;
        },
        p: function update(changed, ctx) {
          var previous_block_index = current_block_type_index;
          current_block_type_index = select_block_type(ctx);

          if (current_block_type_index === previous_block_index) {
            if_blocks[current_block_type_index].p(changed, ctx);
          } else {
            group_outros();
            transition_out(if_blocks[previous_block_index], 1, () => {
              if_blocks[previous_block_index] = null;
            });
            check_outros();
            if_block = if_blocks[current_block_type_index];

            if (!if_block) {
              if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
              if_block.c();
            }

            transition_in(if_block, 1);
            if_block.m(if_block_anchor.parentNode, if_block_anchor);
          }
        },
        i: function intro(local) {
          if (current) return;
          transition_in(if_block);
          current = true;
        },
        o: function outro(local) {
          transition_out(if_block);
          current = false;
        },
        d: function destroy(detaching) {
          if_blocks[current_block_type_index].d(detaching);

          if (detaching) {
            detach(if_block_anchor);
          }
        }
      };
    } // (42:2) {:else}


    function create_else_block(ctx) {
      var current;
      const default_slot_1 = ctx.$$slots.default;
      const default_slot = create_slot(default_slot_1, ctx, null);
      return {
        c: function create() {
          if (default_slot) default_slot.c();
        },
        l: function claim(nodes) {
          if (default_slot) default_slot.l(nodes);
        },
        m: function mount(target, anchor) {
          if (default_slot) {
            default_slot.m(target, anchor);
          }

          current = true;
        },
        p: function update(changed, ctx) {
          if (default_slot && default_slot.p && changed.$$scope) {
            default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
          }
        },
        i: function intro(local) {
          if (current) return;
          transition_in(default_slot, local);
          current = true;
        },
        o: function outro(local) {
          transition_out(default_slot, local);
          current = false;
        },
        d: function destroy(detaching) {
          if (default_slot) default_slot.d(detaching);
        }
      };
    } // (40:2) {#if component !== null}


    function create_if_block_1(ctx) {
      var switch_instance_anchor, current;
      var switch_instance_spread_levels = [ctx.routeParams, ctx.routeProps];
      var switch_value = ctx.component;

      function switch_props(ctx) {
        let switch_instance_props = {};

        for (var i = 0; i < switch_instance_spread_levels.length; i += 1) {
          switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
        }

        return {
          props: switch_instance_props,
          $$inline: true
        };
      }

      if (switch_value) {
        var switch_instance = new switch_value(switch_props());
      }

      return {
        c: function create() {
          if (switch_instance) switch_instance.$$.fragment.c();
          switch_instance_anchor = empty();
        },
        m: function mount(target, anchor) {
          if (switch_instance) {
            mount_component(switch_instance, target, anchor);
          }

          insert(target, switch_instance_anchor, anchor);
          current = true;
        },
        p: function update(changed, ctx) {
          var switch_instance_changes = changed.routeParams || changed.routeProps ? get_spread_update(switch_instance_spread_levels, [changed.routeParams && ctx.routeParams, changed.routeProps && ctx.routeProps]) : {};

          if (switch_value !== (switch_value = ctx.component)) {
            if (switch_instance) {
              group_outros();
              const old_component = switch_instance;
              transition_out(old_component.$$.fragment, 1, () => {
                destroy_component(old_component);
              });
              check_outros();
            }

            if (switch_value) {
              switch_instance = new switch_value(switch_props());
              switch_instance.$$.fragment.c();
              transition_in(switch_instance.$$.fragment, 1);
              mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
            } else {
              switch_instance = null;
            }
          } else if (switch_value) {
            switch_instance.$set(switch_instance_changes);
          }
        },
        i: function intro(local) {
          if (current) return;
          transition_in(switch_instance.$$.fragment, local);
          current = true;
        },
        o: function outro(local) {
          if (switch_instance) transition_out(switch_instance.$$.fragment, local);
          current = false;
        },
        d: function destroy(detaching) {
          if (detaching) {
            detach(switch_instance_anchor);
          }

          if (switch_instance) destroy_component(switch_instance, detaching);
        }
      };
    }

    function create_fragment$1(ctx) {
      var if_block_anchor, current;
      var if_block = ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route && create_if_block(ctx);
      return {
        c: function create() {
          if (if_block) if_block.c();
          if_block_anchor = empty();
        },
        l: function claim(nodes) {
          throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
        },
        m: function mount(target, anchor) {
          if (if_block) if_block.m(target, anchor);
          insert(target, if_block_anchor, anchor);
          current = true;
        },
        p: function update(changed, ctx) {
          if (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) {
            if (if_block) {
              if_block.p(changed, ctx);
              transition_in(if_block, 1);
            } else {
              if_block = create_if_block(ctx);
              if_block.c();
              transition_in(if_block, 1);
              if_block.m(if_block_anchor.parentNode, if_block_anchor);
            }
          } else if (if_block) {
            group_outros();
            transition_out(if_block, 1, () => {
              if_block = null;
            });
            check_outros();
          }
        },
        i: function intro(local) {
          if (current) return;
          transition_in(if_block);
          current = true;
        },
        o: function outro(local) {
          transition_out(if_block);
          current = false;
        },
        d: function destroy(detaching) {
          if (if_block) if_block.d(detaching);

          if (detaching) {
            detach(if_block_anchor);
          }
        }
      };
    }

    function instance$1($$self, $$props, $$invalidate) {
      let $activeRoute;
      let {
        path = "",
        component = null
      } = $$props;
      const {
        registerRoute,
        unregisterRoute,
        activeRoute
      } = getContext(ROUTER);
      validate_store(activeRoute, 'activeRoute');
      subscribe($$self, activeRoute, $$value => {
        $activeRoute = $$value;
        $$invalidate('$activeRoute', $activeRoute);
      });
      const route = {
        path,
        // If no path prop is given, this Route will act as the default Route
        // that is rendered if no other Route in the Router is a match.
        default: path === ""
      };
      let routeParams = {};
      let routeProps = {};
      registerRoute(route); // There is no need to unregister Routes in SSR since it will all be
      // thrown away anyway.

      if (typeof window !== "undefined") {
        onDestroy(() => {
          unregisterRoute(route);
        });
      }

      let {
        $$slots = {},
        $$scope
      } = $$props;

      $$self.$set = $$new_props => {
        $$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
        if ('path' in $$props) $$invalidate('path', path = $$props.path);
        if ('component' in $$props) $$invalidate('component', component = $$props.component);
        if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
      };

      $$self.$$.update = ($$dirty = {
        $activeRoute: 1,
        $$props: 1
      }) => {
        if ($$dirty.$activeRoute) {
          if ($activeRoute && $activeRoute.route === route) {
            $$invalidate('routeParams', routeParams = $activeRoute.params);
          }
        }

        {
          const rest = _objectWithoutProperties($$props, ["path", "component"]);

          $$invalidate('routeProps', routeProps = rest);
        }
      };

      return {
        path,
        component,
        activeRoute,
        route,
        routeParams,
        routeProps,
        $activeRoute,
        $$props: $$props = exclude_internal_props($$props),
        $$slots,
        $$scope
      };
    }

    class Route extends SvelteComponentDev {
      constructor(options) {
        super(options);
        init(this, options, instance$1, create_fragment$1, safe_not_equal, ["path", "component"]);
      }

      get path() {
        throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
      }

      set path(value) {
        throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
      }

      get component() {
        throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
      }

      set component(value) {
        throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
      }

    }

    /* node_modules/svelte-routing/src/Link.svelte generated by Svelte v3.5.3 */
    const file = "node_modules/svelte-routing/src/Link.svelte";

    function create_fragment$2(ctx) {
      var a, current, dispose;
      const default_slot_1 = ctx.$$slots.default;
      const default_slot = create_slot(default_slot_1, ctx, null);
      var a_levels = [{
        href: ctx.href
      }, {
        "aria-current": ctx.ariaCurrent
      }, ctx.props];
      var a_data = {};

      for (var i = 0; i < a_levels.length; i += 1) {
        a_data = assign(a_data, a_levels[i]);
      }

      return {
        c: function create() {
          a = element("a");
          if (default_slot) default_slot.c();
          set_attributes(a, a_data);
          add_location(a, file, 40, 0, 1249);
          dispose = listen(a, "click", ctx.onClick);
        },
        l: function claim(nodes) {
          if (default_slot) default_slot.l(a_nodes);
          throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
        },
        m: function mount(target, anchor) {
          insert(target, a, anchor);

          if (default_slot) {
            default_slot.m(a, null);
          }

          current = true;
        },
        p: function update(changed, ctx) {
          if (default_slot && default_slot.p && changed.$$scope) {
            default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
          }

          set_attributes(a, get_spread_update(a_levels, [changed.href && {
            href: ctx.href
          }, changed.ariaCurrent && {
            "aria-current": ctx.ariaCurrent
          }, changed.props && ctx.props]));
        },
        i: function intro(local) {
          if (current) return;
          transition_in(default_slot, local);
          current = true;
        },
        o: function outro(local) {
          transition_out(default_slot, local);
          current = false;
        },
        d: function destroy(detaching) {
          if (detaching) {
            detach(a);
          }

          if (default_slot) default_slot.d(detaching);
          dispose();
        }
      };
    }

    function instance$2($$self, $$props, $$invalidate) {
      let $base, $location;
      let {
        to = "#",
        replace = false,
        state = {},
        getProps = () => ({})
      } = $$props;
      const {
        base
      } = getContext(ROUTER);
      validate_store(base, 'base');
      subscribe($$self, base, $$value => {
        $base = $$value;
        $$invalidate('$base', $base);
      });
      const location = getContext(LOCATION);
      validate_store(location, 'location');
      subscribe($$self, location, $$value => {
        $location = $$value;
        $$invalidate('$location', $location);
      });
      const dispatch = createEventDispatcher();
      let href, isPartiallyCurrent, isCurrent, props;

      function onClick(event) {
        dispatch("click", event);

        if (shouldNavigate(event)) {
          event.preventDefault(); // Don't push another entry to the history stack when the user
          // clicks on a Link to the page they are currently on.

          const shouldReplace = $location.pathname === href || replace;
          navigate(href, {
            state,
            replace: shouldReplace
          });
        }
      }

      const writable_props = ['to', 'replace', 'state', 'getProps'];
      Object.keys($$props).forEach(key => {
        if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn("<Link> was created with unknown prop '".concat(key, "'"));
      });
      let {
        $$slots = {},
        $$scope
      } = $$props;

      $$self.$set = $$props => {
        if ('to' in $$props) $$invalidate('to', to = $$props.to);
        if ('replace' in $$props) $$invalidate('replace', replace = $$props.replace);
        if ('state' in $$props) $$invalidate('state', state = $$props.state);
        if ('getProps' in $$props) $$invalidate('getProps', getProps = $$props.getProps);
        if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
      };

      let ariaCurrent;

      $$self.$$.update = ($$dirty = {
        to: 1,
        $base: 1,
        $location: 1,
        href: 1,
        isCurrent: 1,
        getProps: 1,
        isPartiallyCurrent: 1
      }) => {
        if ($$dirty.to || $$dirty.$base) {
          $$invalidate('href', href = to === "/" ? $base.uri : resolve(to, $base.uri));
        }

        if ($$dirty.$location || $$dirty.href) {
          $$invalidate('isPartiallyCurrent', isPartiallyCurrent = startsWith($location.pathname, href));
        }

        if ($$dirty.href || $$dirty.$location) {
          $$invalidate('isCurrent', isCurrent = href === $location.pathname);
        }

        if ($$dirty.isCurrent) {
          $$invalidate('ariaCurrent', ariaCurrent = isCurrent ? "page" : undefined);
        }

        if ($$dirty.getProps || $$dirty.$location || $$dirty.href || $$dirty.isPartiallyCurrent || $$dirty.isCurrent) {
          $$invalidate('props', props = getProps({
            location: $location,
            href,
            isPartiallyCurrent,
            isCurrent
          }));
        }
      };

      return {
        to,
        replace,
        state,
        getProps,
        base,
        location,
        href,
        props,
        onClick,
        ariaCurrent,
        $$slots,
        $$scope
      };
    }

    class Link extends SvelteComponentDev {
      constructor(options) {
        super(options);
        init(this, options, instance$2, create_fragment$2, safe_not_equal, ["to", "replace", "state", "getProps"]);
      }

      get to() {
        throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
      }

      set to(value) {
        throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
      }

      get replace() {
        throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
      }

      set replace(value) {
        throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
      }

      get state() {
        throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
      }

      set state(value) {
        throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
      }

      get getProps() {
        throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
      }

      set getProps(value) {
        throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
      }

    }

    /* src/app/typo/H1.svelte generated by Svelte v3.5.3 */
    const file$1 = "src/app/typo/H1.svelte";

    function create_fragment$3(ctx) {
      var div, current;
      const default_slot_1 = ctx.$$slots.default;
      const default_slot = create_slot(default_slot_1, ctx, null);
      return {
        c: function create() {
          div = element("div");
          if (default_slot) default_slot.c();
          attr(div, "class", "h1 svelte-mhwo84");
          add_location(div, file$1, 7, 0, 76);
        },
        l: function claim(nodes) {
          if (default_slot) default_slot.l(div_nodes);
          throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
        },
        m: function mount(target, anchor) {
          insert(target, div, anchor);

          if (default_slot) {
            default_slot.m(div, null);
          }

          current = true;
        },
        p: function update(changed, ctx) {
          if (default_slot && default_slot.p && changed.$$scope) {
            default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
          }
        },
        i: function intro(local) {
          if (current) return;
          transition_in(default_slot, local);
          current = true;
        },
        o: function outro(local) {
          transition_out(default_slot, local);
          current = false;
        },
        d: function destroy(detaching) {
          if (detaching) {
            detach(div);
          }

          if (default_slot) default_slot.d(detaching);
        }
      };
    }

    function instance$3($$self, $$props, $$invalidate) {
      let {
        $$slots = {},
        $$scope
      } = $$props;

      $$self.$set = $$props => {
        if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
      };

      return {
        $$slots,
        $$scope
      };
    }

    class H1 extends SvelteComponentDev {
      constructor(options) {
        super(options);
        init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
      }

    }

    /* src/app/typo/H2.svelte generated by Svelte v3.5.3 */
    const file$2 = "src/app/typo/H2.svelte";

    function create_fragment$4(ctx) {
      var div, current;
      const default_slot_1 = ctx.$$slots.default;
      const default_slot = create_slot(default_slot_1, ctx, null);
      return {
        c: function create() {
          div = element("div");
          if (default_slot) default_slot.c();
          attr(div, "class", "h2 svelte-14ezxtv");
          add_location(div, file$2, 7, 0, 75);
        },
        l: function claim(nodes) {
          if (default_slot) default_slot.l(div_nodes);
          throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
        },
        m: function mount(target, anchor) {
          insert(target, div, anchor);

          if (default_slot) {
            default_slot.m(div, null);
          }

          current = true;
        },
        p: function update(changed, ctx) {
          if (default_slot && default_slot.p && changed.$$scope) {
            default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
          }
        },
        i: function intro(local) {
          if (current) return;
          transition_in(default_slot, local);
          current = true;
        },
        o: function outro(local) {
          transition_out(default_slot, local);
          current = false;
        },
        d: function destroy(detaching) {
          if (detaching) {
            detach(div);
          }

          if (default_slot) default_slot.d(detaching);
        }
      };
    }

    function instance$4($$self, $$props, $$invalidate) {
      let {
        $$slots = {},
        $$scope
      } = $$props;

      $$self.$set = $$props => {
        if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
      };

      return {
        $$slots,
        $$scope
      };
    }

    class H2 extends SvelteComponentDev {
      constructor(options) {
        super(options);
        init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
      }

    }

    /* src/app/Create.svelte generated by Svelte v3.5.3 */
    const file$3 = "src/app/Create.svelte";

    function get_each_context(ctx, list, i) {
      const child_ctx = Object.create(ctx);
      child_ctx.imageMeta = list[i];
      child_ctx.ind = i;
      return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
      const child_ctx = Object.create(ctx);
      child_ctx.imageMeta = list[i];
      child_ctx.ind = i;
      return child_ctx;
    } // (97:2) <H1>


    function create_default_slot_1(ctx) {
      var t;
      return {
        c: function create() {
          t = text("Создание карточки");
        },
        m: function mount(target, anchor) {
          insert(target, t, anchor);
        },
        d: function destroy(detaching) {
          if (detaching) {
            detach(t);
          }
        }
      };
    } // (99:2) <H2>


    function create_default_slot(ctx) {
      var t;
      return {
        c: function create() {
          t = text("Выбери картинку");
        },
        m: function mount(target, anchor) {
          insert(target, t, anchor);
        },
        d: function destroy(detaching) {
          if (detaching) {
            detach(t);
          }
        }
      };
    } // (106:6) {#each images.filter((_, i) => i % 2 == 0) as imageMeta, ind}


    function create_each_block_1(ctx) {
      var span, img, img_src_value, span_class_value, dispose;

      function click_handler() {
        return ctx.click_handler(ctx);
      }

      return {
        c: function create() {
          span = element("span");
          img = element("img");
          attr(img, "height", 105);
          attr(img, "src", img_src_value = ctx.imageMeta.previewURL);
          attr(img, "alt", "");
          add_location(img, file$3, 109, 10, 2646);
          attr(span, "class", span_class_value = "" + (ctx.choosed.some(ctx.hasChoosed(ctx.ind)) ? 'image active' : 'image') + " svelte-1qwx1mw");
          add_location(span, file$3, 106, 8, 2494);
          dispose = listen(span, "click", click_handler);
        },
        m: function mount(target, anchor) {
          insert(target, span, anchor);
          append(span, img);
        },
        p: function update(changed, new_ctx) {
          ctx = new_ctx;

          if (changed.images && img_src_value !== (img_src_value = ctx.imageMeta.previewURL)) {
            attr(img, "src", img_src_value);
          }

          if (changed.choosed && span_class_value !== (span_class_value = "" + (ctx.choosed.some(ctx.hasChoosed(ctx.ind)) ? 'image active' : 'image') + " svelte-1qwx1mw")) {
            attr(span, "class", span_class_value);
          }
        },
        d: function destroy(detaching) {
          if (detaching) {
            detach(span);
          }

          dispose();
        }
      };
    } // (116:6) {#each images.filter((_, i) => i % 2 != 0) as imageMeta, ind}


    function create_each_block(ctx) {
      var span, img, img_src_value, span_class_value, dispose;

      function click_handler_1() {
        return ctx.click_handler_1(ctx);
      }

      return {
        c: function create() {
          span = element("span");
          img = element("img");
          attr(img, "height", 105);
          attr(img, "src", img_src_value = ctx.imageMeta.previewURL);
          attr(img, "alt", "");
          add_location(img, file$3, 119, 10, 3030);
          attr(span, "class", span_class_value = "" + (ctx.choosed.some(ctx.hasChoosed(ctx.ind)) ? 'image active' : 'image') + " svelte-1qwx1mw");
          add_location(span, file$3, 116, 8, 2878);
          dispose = listen(span, "click", click_handler_1);
        },
        m: function mount(target, anchor) {
          insert(target, span, anchor);
          append(span, img);
        },
        p: function update(changed, new_ctx) {
          ctx = new_ctx;

          if (changed.images && img_src_value !== (img_src_value = ctx.imageMeta.previewURL)) {
            attr(img, "src", img_src_value);
          }

          if (changed.choosed && span_class_value !== (span_class_value = "" + (ctx.choosed.some(ctx.hasChoosed(ctx.ind)) ? 'image active' : 'image') + " svelte-1qwx1mw")) {
            attr(span, "class", span_class_value);
          }
        },
        d: function destroy(detaching) {
          if (detaching) {
            detach(span);
          }

          dispose();
        }
      };
    } // (130:4) {:catch error}


    function create_catch_block(ctx) {
      var t;
      return {
        c: function create() {
          t = text("...ooops");
        },
        m: function mount(target, anchor) {
          insert(target, t, anchor);
        },
        p: noop,
        d: function destroy(detaching) {
          if (detaching) {
            detach(t);
          }
        }
      };
    } // (128:4) {:then audio}


    function create_then_block(ctx) {
      var audio, audio_src_value;
      return {
        c: function create() {
          audio = element("audio");
          attr(audio, "src", audio_src_value = ctx.audio.pathogg);
          audio.autoplay = true;
          add_location(audio, file$3, 128, 6, 3201);
        },
        m: function mount(target, anchor) {
          insert(target, audio, anchor);
        },
        p: noop,
        d: function destroy(detaching) {
          if (detaching) {
            detach(audio);
          }
        }
      };
    } // (126:21)        ...loading     {:then audio}


    function create_pending_block(ctx) {
      var t;
      return {
        c: function create() {
          t = text("...loading");
        },
        m: function mount(target, anchor) {
          insert(target, t, anchor);
        },
        p: noop,
        d: function destroy(detaching) {
          if (detaching) {
            detach(t);
          }
        }
      };
    }

    function create_fragment$5(ctx) {
      var div4, t0, input0, t1, t2, div0, span0, t4, input1, t5, div3, div1, t6, div2, span1, t7, t8, p, promise, t9, button, current, dispose;
      var h1 = new H1({
        props: {
          $$slots: {
            default: [create_default_slot_1]
          },
          $$scope: {
            ctx
          }
        },
        $$inline: true
      });
      var h2 = new H2({
        props: {
          $$slots: {
            default: [create_default_slot]
          },
          $$scope: {
            ctx
          }
        },
        $$inline: true
      });
      var each_value_1 = ctx.images.filter(func);
      var each_blocks_1 = [];

      for (var i = 0; i < each_value_1.length; i += 1) {
        each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
      }

      var each_value = ctx.images.filter(func_1);
      var each_blocks = [];

      for (var i = 0; i < each_value.length; i += 1) {
        each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
      }

      let info = {
        ctx,
        current: null,
        pending: create_pending_block,
        then: create_then_block,
        catch: create_catch_block,
        value: 'audio',
        error: 'error'
      };
      handle_promise(promise = ctx.getAudio, info);
      return {
        c: function create() {
          div4 = element("div");
          h1.$$.fragment.c();
          t0 = space();
          input0 = element("input");
          t1 = space();
          h2.$$.fragment.c();
          t2 = space();
          div0 = element("div");
          span0 = element("span");
          span0.textContent = "Поиск по слову:";
          t4 = space();
          input1 = element("input");
          t5 = space();
          div3 = element("div");
          div1 = element("div");

          for (var i = 0; i < each_blocks_1.length; i += 1) {
            each_blocks_1[i].c();
          }

          t6 = space();
          div2 = element("div");
          span1 = element("span");
          t7 = space();

          for (var i = 0; i < each_blocks.length; i += 1) {
            each_blocks[i].c();
          }

          t8 = space();
          p = element("p");
          info.block.c();
          t9 = space();
          button = element("button");
          button.textContent = "Создать";
          attr(input0, "class", "input svelte-1qwx1mw");
          attr(input0, "placeholder", "Введи текст или фразу");
          add_location(input0, file$3, 97, 2, 2160);
          add_location(span0, file$3, 100, 4, 2290);
          attr(input1, "class", "mini svelte-1qwx1mw");
          input1.value = ctx.value;
          add_location(input1, file$3, 101, 4, 2323);
          attr(div0, "class", "search-label svelte-1qwx1mw");
          add_location(div0, file$3, 99, 2, 2259);
          attr(div1, "class", "row svelte-1qwx1mw");
          add_location(div1, file$3, 104, 4, 2400);
          attr(span1, "class", "image upload svelte-1qwx1mw");
          add_location(span1, file$3, 114, 6, 2767);
          attr(div2, "class", "row svelte-1qwx1mw");
          add_location(div2, file$3, 113, 4, 2743);
          attr(div3, "class", "images-container svelte-1qwx1mw");
          add_location(div3, file$3, 103, 2, 2365);
          attr(p, "class", "svelte-1qwx1mw");
          add_location(p, file$3, 124, 2, 3134);
          attr(button, "class", "button svelte-1qwx1mw");
          add_location(button, file$3, 133, 2, 3296);
          add_location(div4, file$3, 95, 0, 2123);
          dispose = listen(input0, "input", ctx.input0_input_handler);
        },
        l: function claim(nodes) {
          throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
        },
        m: function mount(target, anchor) {
          insert(target, div4, anchor);
          mount_component(h1, div4, null);
          append(div4, t0);
          append(div4, input0);
          input0.value = ctx.value;
          append(div4, t1);
          mount_component(h2, div4, null);
          append(div4, t2);
          append(div4, div0);
          append(div0, span0);
          append(div0, t4);
          append(div0, input1);
          append(div4, t5);
          append(div4, div3);
          append(div3, div1);

          for (var i = 0; i < each_blocks_1.length; i += 1) {
            each_blocks_1[i].m(div1, null);
          }

          append(div3, t6);
          append(div3, div2);
          append(div2, span1);
          append(div2, t7);

          for (var i = 0; i < each_blocks.length; i += 1) {
            each_blocks[i].m(div2, null);
          }

          append(div4, t8);
          append(div4, p);
          info.block.m(p, info.anchor = null);

          info.mount = () => p;

          info.anchor = null;
          append(div4, t9);
          append(div4, button);
          current = true;
        },
        p: function update(changed, new_ctx) {
          ctx = new_ctx;
          var h1_changes = {};
          if (changed.$$scope) h1_changes.$$scope = {
            changed,
            ctx
          };
          h1.$set(h1_changes);
          if (changed.value && input0.value !== ctx.value) input0.value = ctx.value;
          var h2_changes = {};
          if (changed.$$scope) h2_changes.$$scope = {
            changed,
            ctx
          };
          h2.$set(h2_changes);

          if (!current || changed.value) {
            input1.value = ctx.value;
          }

          if (changed.choosed || changed.hasChoosed || changed.images) {
            each_value_1 = ctx.images.filter(func);

            for (var i = 0; i < each_value_1.length; i += 1) {
              const child_ctx = get_each_context_1(ctx, each_value_1, i);

              if (each_blocks_1[i]) {
                each_blocks_1[i].p(changed, child_ctx);
              } else {
                each_blocks_1[i] = create_each_block_1(child_ctx);
                each_blocks_1[i].c();
                each_blocks_1[i].m(div1, null);
              }
            }

            for (; i < each_blocks_1.length; i += 1) {
              each_blocks_1[i].d(1);
            }

            each_blocks_1.length = each_value_1.length;
          }

          if (changed.choosed || changed.hasChoosed || changed.images) {
            each_value = ctx.images.filter(func_1);

            for (var i = 0; i < each_value.length; i += 1) {
              const child_ctx = get_each_context(ctx, each_value, i);

              if (each_blocks[i]) {
                each_blocks[i].p(changed, child_ctx);
              } else {
                each_blocks[i] = create_each_block(child_ctx);
                each_blocks[i].c();
                each_blocks[i].m(div2, null);
              }
            }

            for (; i < each_blocks.length; i += 1) {
              each_blocks[i].d(1);
            }

            each_blocks.length = each_value.length;
          }

          info.ctx = ctx;

          if (promise !== (promise = ctx.getAudio) && handle_promise(promise, info)) ; else {
            info.block.p(changed, assign(assign({}, ctx), info.resolved));
          }
        },
        i: function intro(local) {
          if (current) return;
          transition_in(h1.$$.fragment, local);
          transition_in(h2.$$.fragment, local);
          current = true;
        },
        o: function outro(local) {
          transition_out(h1.$$.fragment, local);
          transition_out(h2.$$.fragment, local);
          current = false;
        },
        d: function destroy(detaching) {
          if (detaching) {
            detach(div4);
          }

          destroy_component(h1);
          destroy_component(h2);
          destroy_each(each_blocks_1, detaching);
          destroy_each(each_blocks, detaching);
          info.block.d();
          info = null;
          dispose();
        }
      };
    }

    function func(_, i) {
      return i % 2 == 0;
    }

    function func_1(_, i) {
      return i % 2 != 0;
    }

    function instance$5($$self, $$props, $$invalidate) {
      let value = "";
      let images = [];
      let getImage = fetch("https://pixabay.com/api/?key=12324767-03cc86c9530ba2401e568a998&q=".concat(value, "&lang=it&per_page=20")).then(res => res.json()).then(({
        hits
      }) => {
        $$invalidate('images', images = hits);
      });
      let getAudio = Promise.resolve({
        word: "vorrei",
        pathogg: "https://apifree.forvo.com/audio/2j2c1i21273m1f1p241g353p3e1o213c2h1l2o2n2f222a1f3n1m1h2b233j3q352k2m3n2o363l2l1p25232f2o222l2q1f2j1n1p2n243a3j3e3j2l3j3q2k3a333k_2j3o1b2q23231h2h3g233e2f3e333d312k1h3k281i3n1t1t"
      });
      let choosed = [];

      let handleClickImage = (image, ind) => {
        if (choosed.some(c => c.image === image)) {
          $$invalidate('choosed', choosed = choosed.filter(c => c.image !== image));
        } else {
          $$invalidate('choosed', choosed = [...choosed, {
            image,
            ind
          }]);
        }
      };

      let hasChoosed = ind => c => c.ind == ind;

      function input0_input_handler() {
        value = this.value;
        $$invalidate('value', value);
      }

      function click_handler({
        imageMeta,
        ind
      }) {
        return handleClickImage(imageMeta, ind);
      }

      function click_handler_1({
        imageMeta,
        ind
      }) {
        return handleClickImage(imageMeta, ind);
      }

      return {
        value,
        images,
        getAudio,
        choosed,
        handleClickImage,
        hasChoosed,
        input0_input_handler,
        click_handler,
        click_handler_1
      };
    }

    class Create extends SvelteComponentDev {
      constructor(options) {
        super(options);
        init(this, options, instance$5, create_fragment$5, safe_not_equal, []);
      }

    }

    /* src/app/Home.svelte generated by Svelte v3.5.3 */
    const file$4 = "src/app/Home.svelte"; // (10:2) <Link to="create">

    function create_default_slot_1$1(ctx) {
      var t;
      return {
        c: function create() {
          t = text("Create");
        },
        m: function mount(target, anchor) {
          insert(target, t, anchor);
        },
        d: function destroy(detaching) {
          if (detaching) {
            detach(t);
          }
        }
      };
    } // (11:2) <Link to="list">


    function create_default_slot$1(ctx) {
      var t;
      return {
        c: function create() {
          t = text("List");
        },
        m: function mount(target, anchor) {
          insert(target, t, anchor);
        },
        d: function destroy(detaching) {
          if (detaching) {
            detach(t);
          }
        }
      };
    }

    function create_fragment$6(ctx) {
      var div, t, current;
      var link0 = new Link({
        props: {
          to: "create",
          $$slots: {
            default: [create_default_slot_1$1]
          },
          $$scope: {
            ctx
          }
        },
        $$inline: true
      });
      var link1 = new Link({
        props: {
          to: "list",
          $$slots: {
            default: [create_default_slot$1]
          },
          $$scope: {
            ctx
          }
        },
        $$inline: true
      });
      return {
        c: function create() {
          div = element("div");
          link0.$$.fragment.c();
          t = space();
          link1.$$.fragment.c();
          add_location(div, file$4, 8, 0, 80);
        },
        l: function claim(nodes) {
          throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
        },
        m: function mount(target, anchor) {
          insert(target, div, anchor);
          mount_component(link0, div, null);
          append(div, t);
          mount_component(link1, div, null);
          current = true;
        },
        p: function update(changed, ctx) {
          var link0_changes = {};
          if (changed.$$scope) link0_changes.$$scope = {
            changed,
            ctx
          };
          link0.$set(link0_changes);
          var link1_changes = {};
          if (changed.$$scope) link1_changes.$$scope = {
            changed,
            ctx
          };
          link1.$set(link1_changes);
        },
        i: function intro(local) {
          if (current) return;
          transition_in(link0.$$.fragment, local);
          transition_in(link1.$$.fragment, local);
          current = true;
        },
        o: function outro(local) {
          transition_out(link0.$$.fragment, local);
          transition_out(link1.$$.fragment, local);
          current = false;
        },
        d: function destroy(detaching) {
          if (detaching) {
            detach(div);
          }

          destroy_component(link0);
          destroy_component(link1);
        }
      };
    }

    class Home extends SvelteComponentDev {
      constructor(options) {
        super(options);
        init(this, options, null, create_fragment$6, safe_not_equal, []);
      }

    }

    /* src/app/List.svelte generated by Svelte v3.5.3 */
    const file$5 = "src/app/List.svelte";

    function get_each_context$1(ctx, list, i) {
      const child_ctx = Object.create(ctx);
      child_ctx.card = list[i];
      return child_ctx;
    } // (29:2) {#each cards as card}


    function create_each_block$1(ctx) {
      var p,
          t0_value = ctx.card.word,
          t0,
          t1,
          t2_value = ctx.card.images.length,
          t2;
      return {
        c: function create() {
          p = element("p");
          t0 = text(t0_value);
          t1 = space();
          t2 = text(t2_value);
          attr(p, "class", "svelte-2epx34");
          add_location(p, file$5, 29, 4, 427);
        },
        m: function mount(target, anchor) {
          insert(target, p, anchor);
          append(p, t0);
          append(p, t1);
          append(p, t2);
        },
        p: noop,
        d: function destroy(detaching) {
          if (detaching) {
            detach(p);
          }
        }
      };
    }

    function create_fragment$7(ctx) {
      var div;
      var each_value = ctx.cards;
      var each_blocks = [];

      for (var i = 0; i < each_value.length; i += 1) {
        each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
      }

      return {
        c: function create() {
          div = element("div");

          for (var i = 0; i < each_blocks.length; i += 1) {
            each_blocks[i].c();
          }

          add_location(div, file$5, 27, 0, 393);
        },
        l: function claim(nodes) {
          throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
        },
        m: function mount(target, anchor) {
          insert(target, div, anchor);

          for (var i = 0; i < each_blocks.length; i += 1) {
            each_blocks[i].m(div, null);
          }
        },
        p: function update(changed, ctx) {
          if (changed.cards) {
            each_value = ctx.cards;

            for (var i = 0; i < each_value.length; i += 1) {
              const child_ctx = get_each_context$1(ctx, each_value, i);

              if (each_blocks[i]) {
                each_blocks[i].p(changed, child_ctx);
              } else {
                each_blocks[i] = create_each_block$1(child_ctx);
                each_blocks[i].c();
                each_blocks[i].m(div, null);
              }
            }

            for (; i < each_blocks.length; i += 1) {
              each_blocks[i].d(1);
            }

            each_blocks.length = each_value.length;
          }
        },
        i: noop,
        o: noop,
        d: function destroy(detaching) {
          if (detaching) {
            detach(div);
          }

          destroy_each(each_blocks, detaching);
        }
      };
    }

    function instance$6($$self) {
      let cards = [{
        cardId: 1,
        word: "amica",
        repeatTime: "111",
        direction: 1,
        images: ["link1", "link2"],
        audio: "link"
      }, {
        cardId: 2,
        word: "amico",
        repeatTime: "111",
        direction: 1,
        images: ["link1", "link2"],
        audio: "link"
      }];
      return {
        cards
      };
    }

    class List extends SvelteComponentDev {
      constructor(options) {
        super(options);
        init(this, options, instance$6, create_fragment$7, safe_not_equal, []);
      }

    }

    /* src/app/App.svelte generated by Svelte v3.5.3 */
    const file$6 = "src/app/App.svelte"; // (27:4) <Route path="create">

    function create_default_slot_4(ctx) {
      var current;
      var create = new Create({
        $$inline: true
      });
      return {
        c: function create_1() {
          create.$$.fragment.c();
        },
        m: function mount(target, anchor) {
          mount_component(create, target, anchor);
          current = true;
        },
        i: function intro(local) {
          if (current) return;
          transition_in(create.$$.fragment, local);
          current = true;
        },
        o: function outro(local) {
          transition_out(create.$$.fragment, local);
          current = false;
        },
        d: function destroy(detaching) {
          destroy_component(create, detaching);
        }
      };
    } // (30:4) <Route path="prase">


    function create_default_slot_3(ctx) {
      var t;
      return {
        c: function create() {
          t = text("Phrase");
        },
        m: function mount(target, anchor) {
          insert(target, t, anchor);
        },
        d: function destroy(detaching) {
          if (detaching) {
            detach(t);
          }
        }
      };
    } // (31:4) <Route path="list">


    function create_default_slot_2(ctx) {
      var current;
      var list = new List({
        $$inline: true
      });
      return {
        c: function create() {
          list.$$.fragment.c();
        },
        m: function mount(target, anchor) {
          mount_component(list, target, anchor);
          current = true;
        },
        i: function intro(local) {
          if (current) return;
          transition_in(list.$$.fragment, local);
          current = true;
        },
        o: function outro(local) {
          transition_out(list.$$.fragment, local);
          current = false;
        },
        d: function destroy(detaching) {
          destroy_component(list, detaching);
        }
      };
    } // (34:4) <Route path="/">


    function create_default_slot_1$2(ctx) {
      var current;
      var home = new Home({
        $$inline: true
      });
      return {
        c: function create() {
          home.$$.fragment.c();
        },
        m: function mount(target, anchor) {
          mount_component(home, target, anchor);
          current = true;
        },
        i: function intro(local) {
          if (current) return;
          transition_in(home.$$.fragment, local);
          current = true;
        },
        o: function outro(local) {
          transition_out(home.$$.fragment, local);
          current = false;
        },
        d: function destroy(detaching) {
          destroy_component(home, detaching);
        }
      };
    } // (26:2) <Router url="">


    function create_default_slot$2(ctx) {
      var t0, t1, t2, current;
      var route0 = new Route({
        props: {
          path: "create",
          $$slots: {
            default: [create_default_slot_4]
          },
          $$scope: {
            ctx
          }
        },
        $$inline: true
      });
      var route1 = new Route({
        props: {
          path: "prase",
          $$slots: {
            default: [create_default_slot_3]
          },
          $$scope: {
            ctx
          }
        },
        $$inline: true
      });
      var route2 = new Route({
        props: {
          path: "list",
          $$slots: {
            default: [create_default_slot_2]
          },
          $$scope: {
            ctx
          }
        },
        $$inline: true
      });
      var route3 = new Route({
        props: {
          path: "/",
          $$slots: {
            default: [create_default_slot_1$2]
          },
          $$scope: {
            ctx
          }
        },
        $$inline: true
      });
      return {
        c: function create() {
          route0.$$.fragment.c();
          t0 = space();
          route1.$$.fragment.c();
          t1 = space();
          route2.$$.fragment.c();
          t2 = space();
          route3.$$.fragment.c();
        },
        m: function mount(target, anchor) {
          mount_component(route0, target, anchor);
          insert(target, t0, anchor);
          mount_component(route1, target, anchor);
          insert(target, t1, anchor);
          mount_component(route2, target, anchor);
          insert(target, t2, anchor);
          mount_component(route3, target, anchor);
          current = true;
        },
        p: function update(changed, ctx) {
          var route0_changes = {};
          if (changed.$$scope) route0_changes.$$scope = {
            changed,
            ctx
          };
          route0.$set(route0_changes);
          var route1_changes = {};
          if (changed.$$scope) route1_changes.$$scope = {
            changed,
            ctx
          };
          route1.$set(route1_changes);
          var route2_changes = {};
          if (changed.$$scope) route2_changes.$$scope = {
            changed,
            ctx
          };
          route2.$set(route2_changes);
          var route3_changes = {};
          if (changed.$$scope) route3_changes.$$scope = {
            changed,
            ctx
          };
          route3.$set(route3_changes);
        },
        i: function intro(local) {
          if (current) return;
          transition_in(route0.$$.fragment, local);
          transition_in(route1.$$.fragment, local);
          transition_in(route2.$$.fragment, local);
          transition_in(route3.$$.fragment, local);
          current = true;
        },
        o: function outro(local) {
          transition_out(route0.$$.fragment, local);
          transition_out(route1.$$.fragment, local);
          transition_out(route2.$$.fragment, local);
          transition_out(route3.$$.fragment, local);
          current = false;
        },
        d: function destroy(detaching) {
          destroy_component(route0, detaching);

          if (detaching) {
            detach(t0);
          }

          destroy_component(route1, detaching);

          if (detaching) {
            detach(t1);
          }

          destroy_component(route2, detaching);

          if (detaching) {
            detach(t2);
          }

          destroy_component(route3, detaching);
        }
      };
    }

    function create_fragment$8(ctx) {
      var main, current;
      var router = new Router({
        props: {
          url: "",
          $$slots: {
            default: [create_default_slot$2]
          },
          $$scope: {
            ctx
          }
        },
        $$inline: true
      });
      return {
        c: function create() {
          main = element("main");
          router.$$.fragment.c();
          attr(main, "class", "svelte-1q3ge90");
          add_location(main, file$6, 24, 0, 472);
        },
        l: function claim(nodes) {
          throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
        },
        m: function mount(target, anchor) {
          insert(target, main, anchor);
          mount_component(router, main, null);
          current = true;
        },
        p: function update(changed, ctx) {
          var router_changes = {};
          if (changed.$$scope) router_changes.$$scope = {
            changed,
            ctx
          };
          router.$set(router_changes);
        },
        i: function intro(local) {
          if (current) return;
          transition_in(router.$$.fragment, local);
          current = true;
        },
        o: function outro(local) {
          transition_out(router.$$.fragment, local);
          current = false;
        },
        d: function destroy(detaching) {
          if (detaching) {
            detach(main);
          }

          destroy_component(router);
        }
      };
    }

    class App extends SvelteComponentDev {
      constructor(options) {
        super(options);
        init(this, options, null, create_fragment$8, safe_not_equal, []);
      }

    }

    // promise.polyfill();

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map

/**
 * XMLHttpRequest Length Computable Library
 * @version 1.0
 * @copyright Copyright by N-Dream AG, 2018
 * @licence GNU General Public License v3.0
 * @git:
 */
(function() {

  var DEFAULTS = {
    CONTENT_ENCODING_MULTIPLE: 1.5,
    DEFAULT_CONTENT_LENGTH: 1024 * 1024,
    DECOMPRESSED_CONTENT_LENGTH_HEADER: "x-decompressed-content-length"
  }

  if (window.Proxy) {
    var OriginalXMLHTTPRequest = XMLHttpRequest;

    var calculate_pseudo_total = function(defaults, original_event) {
      var pseudo_total = 0;
      if (!pseudo_total) {
        if (defaults["decompressed-content-length"]) {
          pseudo_total = defaults["decompressed-content-length"];
        }
      }
      try {
        if (!pseudo_total) {
          var real_length = original_event.target.getResponseHeader(
              defaults.DECOMPRESSED_CONTENT_LENGTH_HEADER);
          if (real_length != undefined) {
            pseudo_total = parseInt(real_length)
          }
        }
        if (!pseudo_total) {
          var content_length =
              original_event.target.getResponseHeader(
                  'content-length');
          if (content_length) {
            content_length = parseInt(content_length)
            var content_encoding =
                original_event.target.getResponseHeader(
                    'content-encoding');
            if (content_encoding &&
                content_encoding != "identity") {
              pseudo_total = (content_length *
                  defaults.CONTENT_ENCODING_MULTIPLE)|0;
            } else {
              pseudo_total = content_length;
            }
          }
        }
      } catch (e) {}
      if (!pseudo_total) {
        pseudo_total = defaults.DEFAULT_CONTENT_LENGTH;
      }
      return pseudo_total;
    };


    var onprogress = function(defaults, callback) {
      var pseudo_total = 0;
      return function(event) {
        if (event &&
            (event instanceof ProgressEvent || defaults.no_type_check) &&
            (event.type == "progress" ||
             event.type == "load" ||
             event.type == "loadend")) {
          if (event.lengthComputable == false) {
            var original_event = event;
            event = new Proxy(event, {
              get: function (target, name) {
                if (name == "lengthComputable") {
                  return true;
                } else if (name == "loaded") {
                  if (!pseudo_total) {
                    pseudo_total = calculate_pseudo_total(defaults,
                                                        original_event)
                  }
                  if (defaults["loadFinished"]) {
                    return pseudo_total;
                  } else {
                    return Math.min(original_event.loaded, pseudo_total-1);
                  }
                } else if (name == "total") {
                  if (!pseudo_total) {
                    pseudo_total = calculate_pseudo_total(defaults,
                                                          original_event)
                  }
                  return pseudo_total;
                } else {
                  return target[name];
                }
              }

            })
          } else {
            defaults["lengthComputable"] = true;
          }
        }
        defaults["latestProgress"] = event;
        if (callback) {
          callback(event);
        }
      };
    };

    var proxy = {
      set: function(target, name, value) {
        if (target.xmlHTTPRequestLengthComputable &&
            name.indexOf("on") == 0 &&
            target.xmlHTTPRequestLengthComputable["listeners"][
                name.substr(2)]) {
          if (target.xmlHTTPRequestLengthComputable[
                  "listeners"][name.substr(2)]["on"]) {
            delete target.xmlHTTPRequestLengthComputable[
                "listeners"][name.substr(2)]["on"];
          }
          if (value) {
            target[name] = onprogress(target.xmlHTTPRequestLengthComputable,
                                      value);
            target.xmlHTTPRequestLengthComputable[
                "listeners"][name.substr(2)]["on"] = value;
          } else {
            target[name] = value;
          }
        } else {
          target[name] = value;
        }
        return true;
      },
      get: function(target, name) {
        if (name == "addEventListener") {
          return function() {
            if (target.xmlHTTPRequestLengthComputable[
                    "listeners"][arguments[0]]) {
              var event_listener = onprogress(
                  target.xmlHTTPRequestLengthComputable, arguments[1]);
              target.xmlHTTPRequestLengthComputable.listeners[arguments[0]][
                  "listeners"].push([event_listener, arguments[1]]);
              return target[name].call(
                  target, arguments[0],
                  event_listener,
                  arguments[2], arguments[3]);

            } else {
              return target[name].apply(target, arguments);
            }
          }
        } else if (name == "removeEventListener") {
          return function() {
            if (target.xmlHTTPRequestLengthComputable.listeners[arguments[0]]) {
              var listeners = target.xmlHTTPRequestLengthComputable.listeners[
                  arguments[0]]["listeners"];
              for (var i = 0; i < listeners.length; ++i) {
                if (listeners[i][1] == arguments[1]) {
                  var listener = listeners.splice(i)[0];
                  return target[name].call(target, arguments[0],
                                           listener[0],
                                           arguments[2],
                                           arguments[3]);

                }
              }
            } else {
              return target[name].apply(target, arguments);
            }
          }
        } else if (typeof target[name] == "function") {
          return function() {
            return target[name].apply(target, arguments);
          }
        } else {
          return target[name];
        }
      }
    };

    window.XMLHttpRequest = function(arg) {
      var xmlhttprequest = new OriginalXMLHTTPRequest(arg);
      var result = new Proxy(xmlhttprequest, proxy);
      var defaults;
      var config = window.xmlHTTPRequestLengthComputable || DEFAULTS;
      if (arg && arg["xmlHTTPRequestLengthComputable"]) {
        config = arg["xmlHTTPRequestLengthComputable"]
      }
      defaults = {};
      for (var prop in DEFAULTS) {
        defaults[prop] = config[prop] || DEFAULTS[prop];
      }
      if (config["decompressed-content-length"]) {
        defaults["decompressed-content-length"] =
            config["decompressed-content-length"];
      }
      defaults["listeners"] = {
        "progress": {  listeners: [] },
        "load": { listeners: [] },
        "loadend": { listeners: [] }
      };
      xmlhttprequest.addEventListener("load", function(load_event) {
        if (defaults["lengthComputable"]) {
          return;
        }
        defaults["loadFinished"] = true;
        if (defaults["latestProgress"]) {
          if (defaults["listeners"]["progress"]["on"]) {
            defaults["listeners"]["progress"]["on"](
                defaults["latestProgress"]);
          }
          var progress_listeners =
              defaults["listeners"]["progress"]["listeners"];
          for (var i = 0; i < progress_listeners.length; ++i) {
            if (progress_listeners[i][1]) {
              progress_listeners[i][1](defaults["latestProgress"]);
            }
          }
        }
      });
      defaults["xmlhttprequest"] = xmlhttprequest;
      result.xmlHTTPRequestLengthComputable = defaults;
      return result;
    }
    for (var constant in OriginalXMLHTTPRequest) {
      window.XMLHttpRequest[constant] = OriginalXMLHTTPRequest[constant];
    }
  }
})();
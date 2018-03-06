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
    DEFAULT_CONTENT_LENGTH: 1024 * 100,
    DECOMPRESSED_CONTENT_LENGTH_HEADER: "x-decompressed-content-length"
  }

  if (window.Proxy) {
    var OriginalXMLHTTPRequest = XMLHttpRequest;

    var onprogress = function(defaults, callback) {
      var pseudo_total = 0;
      return function(event) {
        if (event.type == "progress" && event.lengthComputable == false) {
          var original_event = event;
          event = new Proxy(event, {
            get: function(target, name) {
              if (name == "lengthComputable") {
                return true;
              } else if (name == "total") {
                try {
                  if (original_event.lengthComputable) {
                    return original_event.total;
                  }
                  if (defaults["decompressed-content-length"]) {
                    return defaults["decompressed-content-length"];
                  }
                  var real_length = original_event.target.getResponseHeader(
                      defaults.DECOMPRESSED_CONTENT_LENGTH_HEADER);
                  if (real_length != undefined) {
                    return real_length;
                  }
                  if (!pseudo_total) {
                    var content_length = original_event.target.getResponseHeader(
                        'content-length');
                    if (content_length) {
                      var content_encoding =
                          original_event.target.getResponseHeader(
                              'content-encoding');
                      if (content_encoding && content_encoding != "identity") {
                        pseudo_total = content_length *
                            defaults.CONTENT_ENCODING_MULTIPLE;
                      } else {
                        pseudo_total = content_length;
                      }
                    } else {
                      pseudo_total = defaults.DEFAULT_CONTENT_LENGTH;
                    }
                  }
                } catch(e) {
                  return original_event.total;
                }
                while (original_event.loaded > pseudo_total) {
                  pseudo_total *= 2;
                }
                return pseudo_total;
              } else {
                return target[name];
              }
            }
          })
        }
        callback(event);
      };
    };

    var proxy = {
      set: function(target, name, value) {
        if (name == "onprogress") {
          target[name] = onprogress(target.xmlHTTPRequestLengthComputable,
                                    value);
        } else {
          target[name] = value;
        }
        return true;
      },
      get: function(target, name) {
        if (name == "addEventListener") {
          return function() {
            if (arguments[0] == "progress") {
              var event_listener = onprogress(
                  target.xmlHTTPRequestLengthComputable, arguments[1]);
              target.xmlHTTPRequestLengthComputable.progress_listeners.push(
                  [event_listener, arguments[1]]
              );
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
            if (arguments[0] == "progress") {
              var listeners =
                  target.xmlHTTPRequestLengthComputable.progress_listeners;
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
      var result = new Proxy(new OriginalXMLHTTPRequest(arg), proxy);
      if (arg && arg["xmlHTTPRequestLengthComputable"]) {
        var config = arg["xmlHTTPRequestLengthComputable"];
        if (config["decompressed-content-length"] !== undefined) {
          result.xmlHTTPRequestLengthComputable = {
            "decompressed-content-length":
                config["decompressed-content-length"]
          };
        } else {
          result.xmlHTTPRequestLengthComputable = {};
          for (var prop in DEFAULTS) {
            result.xmlHTTPRequestLengthComputable[prop] =
                config[prop] || DEFAULTS[prop];
          }
        }
      } else {
        result.xmlHTTPRequestLengthComputable = DEFAULTS;
      }

      result.xmlHTTPRequestLengthComputable["progress_listeners"] = [];
      return result;
    }
  }
})();
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb2, mod) => function __require() {
  try {
    return mod || (0, cb2[__getOwnPropNames(cb2)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e2) {
    throw mod = 0, e2;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/universalify/index.js
var require_universalify = __commonJS({
  "node_modules/universalify/index.js"(exports2) {
    "use strict";
    exports2.fromCallback = function(fn) {
      return Object.defineProperty(function(...args) {
        if (typeof args[args.length - 1] === "function") fn.apply(this, args);
        else {
          return new Promise((resolve5, reject) => {
            args.push((err, res) => err != null ? reject(err) : resolve5(res));
            fn.apply(this, args);
          });
        }
      }, "name", { value: fn.name });
    };
    exports2.fromPromise = function(fn) {
      return Object.defineProperty(function(...args) {
        const cb2 = args[args.length - 1];
        if (typeof cb2 !== "function") return fn.apply(this, args);
        else {
          args.pop();
          fn.apply(this, args).then((r2) => cb2(null, r2), cb2);
        }
      }, "name", { value: fn.name });
    };
  }
});

// node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS({
  "node_modules/graceful-fs/polyfills.js"(exports2, module2) {
    var constants = require("constants");
    var origCwd = process.cwd;
    var cwd2 = null;
    var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
    process.cwd = function() {
      if (!cwd2)
        cwd2 = origCwd.call(process);
      return cwd2;
    };
    try {
      process.cwd();
    } catch (er) {
    }
    if (typeof process.chdir === "function") {
      chdir = process.chdir;
      process.chdir = function(d2) {
        cwd2 = null;
        chdir.call(process, d2);
      };
      if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
    }
    var chdir;
    module2.exports = patch;
    function patch(fs3) {
      if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
        patchLchmod(fs3);
      }
      if (!fs3.lutimes) {
        patchLutimes(fs3);
      }
      fs3.chown = chownFix(fs3.chown);
      fs3.fchown = chownFix(fs3.fchown);
      fs3.lchown = chownFix(fs3.lchown);
      fs3.chmod = chmodFix(fs3.chmod);
      fs3.fchmod = chmodFix(fs3.fchmod);
      fs3.lchmod = chmodFix(fs3.lchmod);
      fs3.chownSync = chownFixSync(fs3.chownSync);
      fs3.fchownSync = chownFixSync(fs3.fchownSync);
      fs3.lchownSync = chownFixSync(fs3.lchownSync);
      fs3.chmodSync = chmodFixSync(fs3.chmodSync);
      fs3.fchmodSync = chmodFixSync(fs3.fchmodSync);
      fs3.lchmodSync = chmodFixSync(fs3.lchmodSync);
      fs3.stat = statFix(fs3.stat);
      fs3.fstat = statFix(fs3.fstat);
      fs3.lstat = statFix(fs3.lstat);
      fs3.statSync = statFixSync(fs3.statSync);
      fs3.fstatSync = statFixSync(fs3.fstatSync);
      fs3.lstatSync = statFixSync(fs3.lstatSync);
      if (fs3.chmod && !fs3.lchmod) {
        fs3.lchmod = function(path4, mode, cb2) {
          if (cb2) process.nextTick(cb2);
        };
        fs3.lchmodSync = function() {
        };
      }
      if (fs3.chown && !fs3.lchown) {
        fs3.lchown = function(path4, uid, gid, cb2) {
          if (cb2) process.nextTick(cb2);
        };
        fs3.lchownSync = function() {
        };
      }
      if (platform === "win32") {
        fs3.rename = typeof fs3.rename !== "function" ? fs3.rename : (function(fs$rename) {
          function rename(from, to, cb2) {
            var start = Date.now();
            var backoff = 0;
            fs$rename(from, to, function CB(er) {
              if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
                setTimeout(function() {
                  fs3.stat(to, function(stater, st) {
                    if (stater && stater.code === "ENOENT")
                      fs$rename(from, to, CB);
                    else
                      cb2(er);
                  });
                }, backoff);
                if (backoff < 100)
                  backoff += 10;
                return;
              }
              if (cb2) cb2(er);
            });
          }
          if (Object.setPrototypeOf) Object.setPrototypeOf(rename, fs$rename);
          return rename;
        })(fs3.rename);
      }
      fs3.read = typeof fs3.read !== "function" ? fs3.read : (function(fs$read) {
        function read2(fd2, buffer, offset, length, position, callback_) {
          var callback;
          if (callback_ && typeof callback_ === "function") {
            var eagCounter = 0;
            callback = function(er, _, __) {
              if (er && er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                return fs$read.call(fs3, fd2, buffer, offset, length, position, callback);
              }
              callback_.apply(this, arguments);
            };
          }
          return fs$read.call(fs3, fd2, buffer, offset, length, position, callback);
        }
        if (Object.setPrototypeOf) Object.setPrototypeOf(read2, fs$read);
        return read2;
      })(fs3.read);
      fs3.readSync = typeof fs3.readSync !== "function" ? fs3.readSync : /* @__PURE__ */ (function(fs$readSync) {
        return function(fd2, buffer, offset, length, position) {
          var eagCounter = 0;
          while (true) {
            try {
              return fs$readSync.call(fs3, fd2, buffer, offset, length, position);
            } catch (er) {
              if (er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                continue;
              }
              throw er;
            }
          }
        };
      })(fs3.readSync);
      function patchLchmod(fs4) {
        fs4.lchmod = function(path4, mode, callback) {
          fs4.open(
            path4,
            constants.O_WRONLY | constants.O_SYMLINK,
            mode,
            function(err, fd2) {
              if (err) {
                if (callback) callback(err);
                return;
              }
              fs4.fchmod(fd2, mode, function(err2) {
                fs4.close(fd2, function(err22) {
                  if (callback) callback(err2 || err22);
                });
              });
            }
          );
        };
        fs4.lchmodSync = function(path4, mode) {
          var fd2 = fs4.openSync(path4, constants.O_WRONLY | constants.O_SYMLINK, mode);
          var threw = true;
          var ret;
          try {
            ret = fs4.fchmodSync(fd2, mode);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs4.closeSync(fd2);
              } catch (er) {
              }
            } else {
              fs4.closeSync(fd2);
            }
          }
          return ret;
        };
      }
      function patchLutimes(fs4) {
        if (constants.hasOwnProperty("O_SYMLINK") && fs4.futimes) {
          fs4.lutimes = function(path4, at, mt, cb2) {
            fs4.open(path4, constants.O_SYMLINK, function(er, fd2) {
              if (er) {
                if (cb2) cb2(er);
                return;
              }
              fs4.futimes(fd2, at, mt, function(er2) {
                fs4.close(fd2, function(er22) {
                  if (cb2) cb2(er2 || er22);
                });
              });
            });
          };
          fs4.lutimesSync = function(path4, at, mt) {
            var fd2 = fs4.openSync(path4, constants.O_SYMLINK);
            var ret;
            var threw = true;
            try {
              ret = fs4.futimesSync(fd2, at, mt);
              threw = false;
            } finally {
              if (threw) {
                try {
                  fs4.closeSync(fd2);
                } catch (er) {
                }
              } else {
                fs4.closeSync(fd2);
              }
            }
            return ret;
          };
        } else if (fs4.futimes) {
          fs4.lutimes = function(_a2, _b2, _c2, cb2) {
            if (cb2) process.nextTick(cb2);
          };
          fs4.lutimesSync = function() {
          };
        }
      }
      function chmodFix(orig) {
        if (!orig) return orig;
        return function(target, mode, cb2) {
          return orig.call(fs3, target, mode, function(er) {
            if (chownErOk(er)) er = null;
            if (cb2) cb2.apply(this, arguments);
          });
        };
      }
      function chmodFixSync(orig) {
        if (!orig) return orig;
        return function(target, mode) {
          try {
            return orig.call(fs3, target, mode);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function chownFix(orig) {
        if (!orig) return orig;
        return function(target, uid, gid, cb2) {
          return orig.call(fs3, target, uid, gid, function(er) {
            if (chownErOk(er)) er = null;
            if (cb2) cb2.apply(this, arguments);
          });
        };
      }
      function chownFixSync(orig) {
        if (!orig) return orig;
        return function(target, uid, gid) {
          try {
            return orig.call(fs3, target, uid, gid);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function statFix(orig) {
        if (!orig) return orig;
        return function(target, options, cb2) {
          if (typeof options === "function") {
            cb2 = options;
            options = null;
          }
          function callback(er, stats) {
            if (stats) {
              if (stats.uid < 0) stats.uid += 4294967296;
              if (stats.gid < 0) stats.gid += 4294967296;
            }
            if (cb2) cb2.apply(this, arguments);
          }
          return options ? orig.call(fs3, target, options, callback) : orig.call(fs3, target, callback);
        };
      }
      function statFixSync(orig) {
        if (!orig) return orig;
        return function(target, options) {
          var stats = options ? orig.call(fs3, target, options) : orig.call(fs3, target);
          if (stats) {
            if (stats.uid < 0) stats.uid += 4294967296;
            if (stats.gid < 0) stats.gid += 4294967296;
          }
          return stats;
        };
      }
      function chownErOk(er) {
        if (!er)
          return true;
        if (er.code === "ENOSYS")
          return true;
        var nonroot = !process.getuid || process.getuid() !== 0;
        if (nonroot) {
          if (er.code === "EINVAL" || er.code === "EPERM")
            return true;
        }
        return false;
      }
    }
  }
});

// node_modules/graceful-fs/legacy-streams.js
var require_legacy_streams = __commonJS({
  "node_modules/graceful-fs/legacy-streams.js"(exports2, module2) {
    var Stream = require("stream").Stream;
    module2.exports = legacy;
    function legacy(fs3) {
      return {
        ReadStream,
        WriteStream
      };
      function ReadStream(path4, options) {
        if (!(this instanceof ReadStream)) return new ReadStream(path4, options);
        Stream.call(this);
        var self2 = this;
        this.path = path4;
        this.fd = null;
        this.readable = true;
        this.paused = false;
        this.flags = "r";
        this.mode = 438;
        this.bufferSize = 64 * 1024;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.encoding) this.setEncoding(this.encoding);
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.end === void 0) {
            this.end = Infinity;
          } else if ("number" !== typeof this.end) {
            throw TypeError("end must be a Number");
          }
          if (this.start > this.end) {
            throw new Error("start must be <= end");
          }
          this.pos = this.start;
        }
        if (this.fd !== null) {
          process.nextTick(function() {
            self2._read();
          });
          return;
        }
        fs3.open(this.path, this.flags, this.mode, function(err, fd2) {
          if (err) {
            self2.emit("error", err);
            self2.readable = false;
            return;
          }
          self2.fd = fd2;
          self2.emit("open", fd2);
          self2._read();
        });
      }
      function WriteStream(path4, options) {
        if (!(this instanceof WriteStream)) return new WriteStream(path4, options);
        Stream.call(this);
        this.path = path4;
        this.fd = null;
        this.writable = true;
        this.flags = "w";
        this.encoding = "binary";
        this.mode = 438;
        this.bytesWritten = 0;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.start < 0) {
            throw new Error("start must be >= zero");
          }
          this.pos = this.start;
        }
        this.busy = false;
        this._queue = [];
        if (this.fd === null) {
          this._open = fs3.open;
          this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
          this.flush();
        }
      }
    }
  }
});

// node_modules/graceful-fs/clone.js
var require_clone = __commonJS({
  "node_modules/graceful-fs/clone.js"(exports2, module2) {
    "use strict";
    module2.exports = clone;
    var getPrototypeOf = Object.getPrototypeOf || function(obj) {
      return obj.__proto__;
    };
    function clone(obj) {
      if (obj === null || typeof obj !== "object")
        return obj;
      if (obj instanceof Object)
        var copy = { __proto__: getPrototypeOf(obj) };
      else
        var copy = /* @__PURE__ */ Object.create(null);
      Object.getOwnPropertyNames(obj).forEach(function(key) {
        Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
      });
      return copy;
    }
  }
});

// node_modules/graceful-fs/graceful-fs.js
var require_graceful_fs = __commonJS({
  "node_modules/graceful-fs/graceful-fs.js"(exports2, module2) {
    var fs3 = require("fs");
    var polyfills = require_polyfills();
    var legacy = require_legacy_streams();
    var clone = require_clone();
    var util = require("util");
    var gracefulQueue;
    var previousSymbol;
    if (typeof Symbol === "function" && typeof Symbol.for === "function") {
      gracefulQueue = /* @__PURE__ */ Symbol.for("graceful-fs.queue");
      previousSymbol = /* @__PURE__ */ Symbol.for("graceful-fs.previous");
    } else {
      gracefulQueue = "___graceful-fs.queue";
      previousSymbol = "___graceful-fs.previous";
    }
    function noop() {
    }
    function publishQueue(context, queue2) {
      Object.defineProperty(context, gracefulQueue, {
        get: function() {
          return queue2;
        }
      });
    }
    var debug = noop;
    if (util.debuglog)
      debug = util.debuglog("gfs4");
    else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
      debug = function() {
        var m2 = util.format.apply(util, arguments);
        m2 = "GFS4: " + m2.split(/\n/).join("\nGFS4: ");
        console.error(m2);
      };
    if (!fs3[gracefulQueue]) {
      queue = global[gracefulQueue] || [];
      publishQueue(fs3, queue);
      fs3.close = (function(fs$close) {
        function close(fd2, cb2) {
          return fs$close.call(fs3, fd2, function(err) {
            if (!err) {
              resetQueue();
            }
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          });
        }
        Object.defineProperty(close, previousSymbol, {
          value: fs$close
        });
        return close;
      })(fs3.close);
      fs3.closeSync = (function(fs$closeSync) {
        function closeSync(fd2) {
          fs$closeSync.apply(fs3, arguments);
          resetQueue();
        }
        Object.defineProperty(closeSync, previousSymbol, {
          value: fs$closeSync
        });
        return closeSync;
      })(fs3.closeSync);
      if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
        process.on("exit", function() {
          debug(fs3[gracefulQueue]);
          require("assert").equal(fs3[gracefulQueue].length, 0);
        });
      }
    }
    var queue;
    if (!global[gracefulQueue]) {
      publishQueue(global, fs3[gracefulQueue]);
    }
    module2.exports = patch(clone(fs3));
    if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs3.__patched) {
      module2.exports = patch(fs3);
      fs3.__patched = true;
    }
    function patch(fs4) {
      polyfills(fs4);
      fs4.gracefulify = patch;
      fs4.createReadStream = createReadStream;
      fs4.createWriteStream = createWriteStream;
      var fs$readFile = fs4.readFile;
      fs4.readFile = readFile;
      function readFile(path4, options, cb2) {
        if (typeof options === "function")
          cb2 = options, options = null;
        return go$readFile(path4, options, cb2);
        function go$readFile(path5, options2, cb3, startTime) {
          return fs$readFile(path5, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$readFile, [path5, options2, cb3], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb3 === "function")
                cb3.apply(this, arguments);
            }
          });
        }
      }
      var fs$writeFile = fs4.writeFile;
      fs4.writeFile = writeFile2;
      function writeFile2(path4, data, options, cb2) {
        if (typeof options === "function")
          cb2 = options, options = null;
        return go$writeFile(path4, data, options, cb2);
        function go$writeFile(path5, data2, options2, cb3, startTime) {
          return fs$writeFile(path5, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$writeFile, [path5, data2, options2, cb3], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb3 === "function")
                cb3.apply(this, arguments);
            }
          });
        }
      }
      var fs$appendFile = fs4.appendFile;
      if (fs$appendFile)
        fs4.appendFile = appendFile;
      function appendFile(path4, data, options, cb2) {
        if (typeof options === "function")
          cb2 = options, options = null;
        return go$appendFile(path4, data, options, cb2);
        function go$appendFile(path5, data2, options2, cb3, startTime) {
          return fs$appendFile(path5, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$appendFile, [path5, data2, options2, cb3], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb3 === "function")
                cb3.apply(this, arguments);
            }
          });
        }
      }
      var fs$copyFile = fs4.copyFile;
      if (fs$copyFile)
        fs4.copyFile = copyFile;
      function copyFile(src, dest, flags, cb2) {
        if (typeof flags === "function") {
          cb2 = flags;
          flags = 0;
        }
        return go$copyFile(src, dest, flags, cb2);
        function go$copyFile(src2, dest2, flags2, cb3, startTime) {
          return fs$copyFile(src2, dest2, flags2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$copyFile, [src2, dest2, flags2, cb3], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb3 === "function")
                cb3.apply(this, arguments);
            }
          });
        }
      }
      var fs$readdir = fs4.readdir;
      fs4.readdir = readdir;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir(path4, options, cb2) {
        if (typeof options === "function")
          cb2 = options, options = null;
        var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path5, options2, cb3, startTime) {
          return fs$readdir(path5, fs$readdirCallback(
            path5,
            options2,
            cb3,
            startTime
          ));
        } : function go$readdir2(path5, options2, cb3, startTime) {
          return fs$readdir(path5, options2, fs$readdirCallback(
            path5,
            options2,
            cb3,
            startTime
          ));
        };
        return go$readdir(path4, options, cb2);
        function fs$readdirCallback(path5, options2, cb3, startTime) {
          return function(err, files) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([
                go$readdir,
                [path5, options2, cb3],
                err,
                startTime || Date.now(),
                Date.now()
              ]);
            else {
              if (files && files.sort)
                files.sort();
              if (typeof cb3 === "function")
                cb3.call(this, err, files);
            }
          };
        }
      }
      if (process.version.substr(0, 4) === "v0.8") {
        var legStreams = legacy(fs4);
        ReadStream = legStreams.ReadStream;
        WriteStream = legStreams.WriteStream;
      }
      var fs$ReadStream = fs4.ReadStream;
      if (fs$ReadStream) {
        ReadStream.prototype = Object.create(fs$ReadStream.prototype);
        ReadStream.prototype.open = ReadStream$open;
      }
      var fs$WriteStream = fs4.WriteStream;
      if (fs$WriteStream) {
        WriteStream.prototype = Object.create(fs$WriteStream.prototype);
        WriteStream.prototype.open = WriteStream$open;
      }
      Object.defineProperty(fs4, "ReadStream", {
        get: function() {
          return ReadStream;
        },
        set: function(val) {
          ReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(fs4, "WriteStream", {
        get: function() {
          return WriteStream;
        },
        set: function(val) {
          WriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileReadStream = ReadStream;
      Object.defineProperty(fs4, "FileReadStream", {
        get: function() {
          return FileReadStream;
        },
        set: function(val) {
          FileReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileWriteStream = WriteStream;
      Object.defineProperty(fs4, "FileWriteStream", {
        get: function() {
          return FileWriteStream;
        },
        set: function(val) {
          FileWriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      function ReadStream(path4, options) {
        if (this instanceof ReadStream)
          return fs$ReadStream.apply(this, arguments), this;
        else
          return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
      }
      function ReadStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd2) {
          if (err) {
            if (that.autoClose)
              that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd2;
            that.emit("open", fd2);
            that.read();
          }
        });
      }
      function WriteStream(path4, options) {
        if (this instanceof WriteStream)
          return fs$WriteStream.apply(this, arguments), this;
        else
          return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
      }
      function WriteStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd2) {
          if (err) {
            that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd2;
            that.emit("open", fd2);
          }
        });
      }
      function createReadStream(path4, options) {
        return new fs4.ReadStream(path4, options);
      }
      function createWriteStream(path4, options) {
        return new fs4.WriteStream(path4, options);
      }
      var fs$open = fs4.open;
      fs4.open = open;
      function open(path4, flags, mode, cb2) {
        if (typeof mode === "function")
          cb2 = mode, mode = null;
        return go$open(path4, flags, mode, cb2);
        function go$open(path5, flags2, mode2, cb3, startTime) {
          return fs$open(path5, flags2, mode2, function(err, fd2) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$open, [path5, flags2, mode2, cb3], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb3 === "function")
                cb3.apply(this, arguments);
            }
          });
        }
      }
      return fs4;
    }
    function enqueue(elem) {
      debug("ENQUEUE", elem[0].name, elem[1]);
      fs3[gracefulQueue].push(elem);
      retry();
    }
    var retryTimer;
    function resetQueue() {
      var now = Date.now();
      for (var i = 0; i < fs3[gracefulQueue].length; ++i) {
        if (fs3[gracefulQueue][i].length > 2) {
          fs3[gracefulQueue][i][3] = now;
          fs3[gracefulQueue][i][4] = now;
        }
      }
      retry();
    }
    function retry() {
      clearTimeout(retryTimer);
      retryTimer = void 0;
      if (fs3[gracefulQueue].length === 0)
        return;
      var elem = fs3[gracefulQueue].shift();
      var fn = elem[0];
      var args = elem[1];
      var err = elem[2];
      var startTime = elem[3];
      var lastTime = elem[4];
      if (startTime === void 0) {
        debug("RETRY", fn.name, args);
        fn.apply(null, args);
      } else if (Date.now() - startTime >= 6e4) {
        debug("TIMEOUT", fn.name, args);
        var cb2 = args.pop();
        if (typeof cb2 === "function")
          cb2.call(null, err);
      } else {
        var sinceAttempt = Date.now() - lastTime;
        var sinceStart = Math.max(lastTime - startTime, 1);
        var desiredDelay = Math.min(sinceStart * 1.2, 100);
        if (sinceAttempt >= desiredDelay) {
          debug("RETRY", fn.name, args);
          fn.apply(null, args.concat([startTime]));
        } else {
          fs3[gracefulQueue].push(elem);
        }
      }
      if (retryTimer === void 0) {
        retryTimer = setTimeout(retry, 0);
      }
    }
  }
});

// node_modules/fs-extra/lib/fs/index.js
var require_fs = __commonJS({
  "node_modules/fs-extra/lib/fs/index.js"(exports2) {
    "use strict";
    var u2 = require_universalify().fromCallback;
    var fs3 = require_graceful_fs();
    var api = [
      "access",
      "appendFile",
      "chmod",
      "chown",
      "close",
      "copyFile",
      "cp",
      "fchmod",
      "fchown",
      "fdatasync",
      "fstat",
      "fsync",
      "ftruncate",
      "futimes",
      "glob",
      "lchmod",
      "lchown",
      "lutimes",
      "link",
      "lstat",
      "mkdir",
      "mkdtemp",
      "open",
      "opendir",
      "readdir",
      "readFile",
      "readlink",
      "realpath",
      "rename",
      "rm",
      "rmdir",
      "stat",
      "statfs",
      "symlink",
      "truncate",
      "unlink",
      "utimes",
      "writeFile"
    ].filter((key) => {
      return typeof fs3[key] === "function";
    });
    Object.assign(exports2, fs3);
    api.forEach((method) => {
      exports2[method] = u2(fs3[method]);
    });
    exports2.exists = function(filename, callback) {
      if (typeof callback === "function") {
        return fs3.exists(filename, callback);
      }
      return new Promise((resolve5) => {
        return fs3.exists(filename, resolve5);
      });
    };
    exports2.read = function(fd2, buffer, offset, length, position, callback) {
      if (typeof callback === "function") {
        return fs3.read(fd2, buffer, offset, length, position, callback);
      }
      return new Promise((resolve5, reject) => {
        fs3.read(fd2, buffer, offset, length, position, (err, bytesRead, buffer2) => {
          if (err) return reject(err);
          resolve5({ bytesRead, buffer: buffer2 });
        });
      });
    };
    exports2.write = function(fd2, buffer, ...args) {
      if (typeof args[args.length - 1] === "function") {
        return fs3.write(fd2, buffer, ...args);
      }
      return new Promise((resolve5, reject) => {
        fs3.write(fd2, buffer, ...args, (err, bytesWritten, buffer2) => {
          if (err) return reject(err);
          resolve5({ bytesWritten, buffer: buffer2 });
        });
      });
    };
    exports2.readv = function(fd2, buffers, ...args) {
      if (typeof args[args.length - 1] === "function") {
        return fs3.readv(fd2, buffers, ...args);
      }
      return new Promise((resolve5, reject) => {
        fs3.readv(fd2, buffers, ...args, (err, bytesRead, buffers2) => {
          if (err) return reject(err);
          resolve5({ bytesRead, buffers: buffers2 });
        });
      });
    };
    exports2.writev = function(fd2, buffers, ...args) {
      if (typeof args[args.length - 1] === "function") {
        return fs3.writev(fd2, buffers, ...args);
      }
      return new Promise((resolve5, reject) => {
        fs3.writev(fd2, buffers, ...args, (err, bytesWritten, buffers2) => {
          if (err) return reject(err);
          resolve5({ bytesWritten, buffers: buffers2 });
        });
      });
    };
    if (typeof fs3.realpath.native === "function") {
      exports2.realpath.native = u2(fs3.realpath.native);
    } else {
      process.emitWarning(
        "fs.realpath.native is not a function. Is fs being monkey-patched?",
        "Warning",
        "fs-extra-WARN0003"
      );
    }
  }
});

// node_modules/fs-extra/lib/mkdirs/utils.js
var require_utils = __commonJS({
  "node_modules/fs-extra/lib/mkdirs/utils.js"(exports2, module2) {
    "use strict";
    var path4 = require("path");
    module2.exports.checkPath = function checkPath(pth) {
      if (process.platform === "win32") {
        const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path4.parse(pth).root, ""));
        if (pathHasInvalidWinCharacters) {
          const error = new Error(`Path contains invalid characters: ${pth}`);
          error.code = "EINVAL";
          throw error;
        }
      }
    };
  }
});

// node_modules/fs-extra/lib/mkdirs/make-dir.js
var require_make_dir = __commonJS({
  "node_modules/fs-extra/lib/mkdirs/make-dir.js"(exports2, module2) {
    "use strict";
    var fs3 = require_fs();
    var { checkPath } = require_utils();
    var getMode = (options) => {
      const defaults = { mode: 511 };
      if (typeof options === "number") return options;
      return { ...defaults, ...options }.mode;
    };
    module2.exports.makeDir = async (dir, options) => {
      checkPath(dir);
      return fs3.mkdir(dir, {
        mode: getMode(options),
        recursive: true
      });
    };
    module2.exports.makeDirSync = (dir, options) => {
      checkPath(dir);
      return fs3.mkdirSync(dir, {
        mode: getMode(options),
        recursive: true
      });
    };
  }
});

// node_modules/fs-extra/lib/mkdirs/index.js
var require_mkdirs = __commonJS({
  "node_modules/fs-extra/lib/mkdirs/index.js"(exports2, module2) {
    "use strict";
    var u2 = require_universalify().fromPromise;
    var { makeDir: _makeDir, makeDirSync } = require_make_dir();
    var makeDir = u2(_makeDir);
    module2.exports = {
      mkdirs: makeDir,
      mkdirsSync: makeDirSync,
      // alias
      mkdirp: makeDir,
      mkdirpSync: makeDirSync,
      ensureDir: makeDir,
      ensureDirSync: makeDirSync
    };
  }
});

// node_modules/fs-extra/lib/path-exists/index.js
var require_path_exists = __commonJS({
  "node_modules/fs-extra/lib/path-exists/index.js"(exports2, module2) {
    "use strict";
    var u2 = require_universalify().fromPromise;
    var fs3 = require_fs();
    function pathExists(path4) {
      return fs3.access(path4).then(() => true).catch(() => false);
    }
    module2.exports = {
      pathExists: u2(pathExists),
      pathExistsSync: fs3.existsSync
    };
  }
});

// node_modules/fs-extra/lib/util/utimes.js
var require_utimes = __commonJS({
  "node_modules/fs-extra/lib/util/utimes.js"(exports2, module2) {
    "use strict";
    var fs3 = require_fs();
    var u2 = require_universalify().fromPromise;
    async function utimesMillis(path4, atime, mtime) {
      const fd2 = await fs3.open(path4, "r+");
      let closeErr = null;
      try {
        await fs3.futimes(fd2, atime, mtime);
      } finally {
        try {
          await fs3.close(fd2);
        } catch (e2) {
          closeErr = e2;
        }
      }
      if (closeErr) {
        throw closeErr;
      }
    }
    function utimesMillisSync(path4, atime, mtime) {
      const fd2 = fs3.openSync(path4, "r+");
      fs3.futimesSync(fd2, atime, mtime);
      return fs3.closeSync(fd2);
    }
    module2.exports = {
      utimesMillis: u2(utimesMillis),
      utimesMillisSync
    };
  }
});

// node_modules/fs-extra/lib/util/stat.js
var require_stat = __commonJS({
  "node_modules/fs-extra/lib/util/stat.js"(exports2, module2) {
    "use strict";
    var fs3 = require_fs();
    var path4 = require("path");
    var u2 = require_universalify().fromPromise;
    function getStats(src, dest, opts) {
      const statFunc = opts.dereference ? (file) => fs3.stat(file, { bigint: true }) : (file) => fs3.lstat(file, { bigint: true });
      return Promise.all([
        statFunc(src),
        statFunc(dest).catch((err) => {
          if (err.code === "ENOENT") return null;
          throw err;
        })
      ]).then(([srcStat, destStat]) => ({ srcStat, destStat }));
    }
    function getStatsSync(src, dest, opts) {
      let destStat;
      const statFunc = opts.dereference ? (file) => fs3.statSync(file, { bigint: true }) : (file) => fs3.lstatSync(file, { bigint: true });
      const srcStat = statFunc(src);
      try {
        destStat = statFunc(dest);
      } catch (err) {
        if (err.code === "ENOENT") return { srcStat, destStat: null };
        throw err;
      }
      return { srcStat, destStat };
    }
    async function checkPaths(src, dest, funcName, opts) {
      const { srcStat, destStat } = await getStats(src, dest, opts);
      if (destStat) {
        if (areIdentical(srcStat, destStat)) {
          const srcBaseName = path4.basename(src);
          const destBaseName = path4.basename(dest);
          if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
            return { srcStat, destStat, isChangingCase: true };
          }
          throw new Error("Source and destination must not be the same.");
        }
        if (srcStat.isDirectory() && !destStat.isDirectory()) {
          throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
        }
        if (!srcStat.isDirectory() && destStat.isDirectory()) {
          throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
        }
      }
      if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return { srcStat, destStat };
    }
    function checkPathsSync(src, dest, funcName, opts) {
      const { srcStat, destStat } = getStatsSync(src, dest, opts);
      if (destStat) {
        if (areIdentical(srcStat, destStat)) {
          const srcBaseName = path4.basename(src);
          const destBaseName = path4.basename(dest);
          if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
            return { srcStat, destStat, isChangingCase: true };
          }
          throw new Error("Source and destination must not be the same.");
        }
        if (srcStat.isDirectory() && !destStat.isDirectory()) {
          throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
        }
        if (!srcStat.isDirectory() && destStat.isDirectory()) {
          throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
        }
      }
      if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return { srcStat, destStat };
    }
    async function checkParentPaths(src, srcStat, dest, funcName) {
      const srcParent = path4.resolve(path4.dirname(src));
      const destParent = path4.resolve(path4.dirname(dest));
      if (destParent === srcParent || destParent === path4.parse(destParent).root) return;
      let destStat;
      try {
        destStat = await fs3.stat(destParent, { bigint: true });
      } catch (err) {
        if (err.code === "ENOENT") return;
        throw err;
      }
      if (areIdentical(srcStat, destStat)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return checkParentPaths(src, srcStat, destParent, funcName);
    }
    function checkParentPathsSync(src, srcStat, dest, funcName) {
      const srcParent = path4.resolve(path4.dirname(src));
      const destParent = path4.resolve(path4.dirname(dest));
      if (destParent === srcParent || destParent === path4.parse(destParent).root) return;
      let destStat;
      try {
        destStat = fs3.statSync(destParent, { bigint: true });
      } catch (err) {
        if (err.code === "ENOENT") return;
        throw err;
      }
      if (areIdentical(srcStat, destStat)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return checkParentPathsSync(src, srcStat, destParent, funcName);
    }
    function areIdentical(srcStat, destStat) {
      return destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev;
    }
    function isSrcSubdir(src, dest) {
      const srcArr = path4.resolve(src).split(path4.sep).filter((i) => i);
      const destArr = path4.resolve(dest).split(path4.sep).filter((i) => i);
      return srcArr.every((cur, i) => destArr[i] === cur);
    }
    function errMsg(src, dest, funcName) {
      return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`;
    }
    module2.exports = {
      // checkPaths
      checkPaths: u2(checkPaths),
      checkPathsSync,
      // checkParent
      checkParentPaths: u2(checkParentPaths),
      checkParentPathsSync,
      // Misc
      isSrcSubdir,
      areIdentical
    };
  }
});

// node_modules/fs-extra/lib/copy/copy.js
var require_copy = __commonJS({
  "node_modules/fs-extra/lib/copy/copy.js"(exports2, module2) {
    "use strict";
    var fs3 = require_fs();
    var path4 = require("path");
    var { mkdirs } = require_mkdirs();
    var { pathExists } = require_path_exists();
    var { utimesMillis } = require_utimes();
    var stat = require_stat();
    async function copy(src, dest, opts = {}) {
      if (typeof opts === "function") {
        opts = { filter: opts };
      }
      opts.clobber = "clobber" in opts ? !!opts.clobber : true;
      opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
      if (opts.preserveTimestamps && process.arch === "ia32") {
        process.emitWarning(
          "Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269",
          "Warning",
          "fs-extra-WARN0001"
        );
      }
      const { srcStat, destStat } = await stat.checkPaths(src, dest, "copy", opts);
      await stat.checkParentPaths(src, srcStat, dest, "copy");
      const include = await runFilter(src, dest, opts);
      if (!include) return;
      const destParent = path4.dirname(dest);
      const dirExists = await pathExists(destParent);
      if (!dirExists) {
        await mkdirs(destParent);
      }
      await getStatsAndPerformCopy(destStat, src, dest, opts);
    }
    async function runFilter(src, dest, opts) {
      if (!opts.filter) return true;
      return opts.filter(src, dest);
    }
    async function getStatsAndPerformCopy(destStat, src, dest, opts) {
      const statFn = opts.dereference ? fs3.stat : fs3.lstat;
      const srcStat = await statFn(src);
      if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts);
      if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts);
      if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts);
      if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`);
      if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`);
      throw new Error(`Unknown file: ${src}`);
    }
    async function onFile(srcStat, destStat, src, dest, opts) {
      if (!destStat) return copyFile(srcStat, src, dest, opts);
      if (opts.overwrite) {
        await fs3.unlink(dest);
        return copyFile(srcStat, src, dest, opts);
      }
      if (opts.errorOnExist) {
        throw new Error(`'${dest}' already exists`);
      }
    }
    async function copyFile(srcStat, src, dest, opts) {
      await fs3.copyFile(src, dest);
      if (opts.preserveTimestamps) {
        if (fileIsNotWritable(srcStat.mode)) {
          await makeFileWritable(dest, srcStat.mode);
        }
        const updatedSrcStat = await fs3.stat(src);
        await utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
      }
      return fs3.chmod(dest, srcStat.mode);
    }
    function fileIsNotWritable(srcMode) {
      return (srcMode & 128) === 0;
    }
    function makeFileWritable(dest, srcMode) {
      return fs3.chmod(dest, srcMode | 128);
    }
    async function onDir(srcStat, destStat, src, dest, opts) {
      if (!destStat) {
        await fs3.mkdir(dest);
      }
      const promises = [];
      for await (const item of await fs3.opendir(src)) {
        const srcItem = path4.join(src, item.name);
        const destItem = path4.join(dest, item.name);
        promises.push(
          runFilter(srcItem, destItem, opts).then((include) => {
            if (include) {
              return stat.checkPaths(srcItem, destItem, "copy", opts).then(({ destStat: destStat2 }) => {
                return getStatsAndPerformCopy(destStat2, srcItem, destItem, opts);
              });
            }
          })
        );
      }
      await Promise.all(promises);
      if (!destStat) {
        await fs3.chmod(dest, srcStat.mode);
      }
    }
    async function onLink(destStat, src, dest, opts) {
      let resolvedSrc = await fs3.readlink(src);
      if (opts.dereference) {
        resolvedSrc = path4.resolve(process.cwd(), resolvedSrc);
      }
      if (!destStat) {
        return fs3.symlink(resolvedSrc, dest);
      }
      let resolvedDest = null;
      try {
        resolvedDest = await fs3.readlink(dest);
      } catch (e2) {
        if (e2.code === "EINVAL" || e2.code === "UNKNOWN") return fs3.symlink(resolvedSrc, dest);
        throw e2;
      }
      if (opts.dereference) {
        resolvedDest = path4.resolve(process.cwd(), resolvedDest);
      }
      if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
        throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
      }
      if (stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
        throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
      }
      await fs3.unlink(dest);
      return fs3.symlink(resolvedSrc, dest);
    }
    module2.exports = copy;
  }
});

// node_modules/fs-extra/lib/copy/copy-sync.js
var require_copy_sync = __commonJS({
  "node_modules/fs-extra/lib/copy/copy-sync.js"(exports2, module2) {
    "use strict";
    var fs3 = require_graceful_fs();
    var path4 = require("path");
    var mkdirsSync = require_mkdirs().mkdirsSync;
    var utimesMillisSync = require_utimes().utimesMillisSync;
    var stat = require_stat();
    function copySync(src, dest, opts) {
      if (typeof opts === "function") {
        opts = { filter: opts };
      }
      opts = opts || {};
      opts.clobber = "clobber" in opts ? !!opts.clobber : true;
      opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
      if (opts.preserveTimestamps && process.arch === "ia32") {
        process.emitWarning(
          "Using the preserveTimestamps option in 32-bit node is not recommended;\n\n	see https://github.com/jprichardson/node-fs-extra/issues/269",
          "Warning",
          "fs-extra-WARN0002"
        );
      }
      const { srcStat, destStat } = stat.checkPathsSync(src, dest, "copy", opts);
      stat.checkParentPathsSync(src, srcStat, dest, "copy");
      if (opts.filter && !opts.filter(src, dest)) return;
      const destParent = path4.dirname(dest);
      if (!fs3.existsSync(destParent)) mkdirsSync(destParent);
      return getStats(destStat, src, dest, opts);
    }
    function getStats(destStat, src, dest, opts) {
      const statSync3 = opts.dereference ? fs3.statSync : fs3.lstatSync;
      const srcStat = statSync3(src);
      if (srcStat.isDirectory()) return onDir(srcStat, destStat, src, dest, opts);
      else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice()) return onFile(srcStat, destStat, src, dest, opts);
      else if (srcStat.isSymbolicLink()) return onLink(destStat, src, dest, opts);
      else if (srcStat.isSocket()) throw new Error(`Cannot copy a socket file: ${src}`);
      else if (srcStat.isFIFO()) throw new Error(`Cannot copy a FIFO pipe: ${src}`);
      throw new Error(`Unknown file: ${src}`);
    }
    function onFile(srcStat, destStat, src, dest, opts) {
      if (!destStat) return copyFile(srcStat, src, dest, opts);
      return mayCopyFile(srcStat, src, dest, opts);
    }
    function mayCopyFile(srcStat, src, dest, opts) {
      if (opts.overwrite) {
        fs3.unlinkSync(dest);
        return copyFile(srcStat, src, dest, opts);
      } else if (opts.errorOnExist) {
        throw new Error(`'${dest}' already exists`);
      }
    }
    function copyFile(srcStat, src, dest, opts) {
      fs3.copyFileSync(src, dest);
      if (opts.preserveTimestamps) handleTimestamps(srcStat.mode, src, dest);
      return setDestMode(dest, srcStat.mode);
    }
    function handleTimestamps(srcMode, src, dest) {
      if (fileIsNotWritable(srcMode)) makeFileWritable(dest, srcMode);
      return setDestTimestamps(src, dest);
    }
    function fileIsNotWritable(srcMode) {
      return (srcMode & 128) === 0;
    }
    function makeFileWritable(dest, srcMode) {
      return setDestMode(dest, srcMode | 128);
    }
    function setDestMode(dest, srcMode) {
      return fs3.chmodSync(dest, srcMode);
    }
    function setDestTimestamps(src, dest) {
      const updatedSrcStat = fs3.statSync(src);
      return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
    }
    function onDir(srcStat, destStat, src, dest, opts) {
      if (!destStat) return mkDirAndCopy(srcStat.mode, src, dest, opts);
      return copyDir(src, dest, opts);
    }
    function mkDirAndCopy(srcMode, src, dest, opts) {
      fs3.mkdirSync(dest);
      copyDir(src, dest, opts);
      return setDestMode(dest, srcMode);
    }
    function copyDir(src, dest, opts) {
      const dir = fs3.opendirSync(src);
      try {
        let dirent;
        while ((dirent = dir.readSync()) !== null) {
          copyDirItem(dirent.name, src, dest, opts);
        }
      } finally {
        dir.closeSync();
      }
    }
    function copyDirItem(item, src, dest, opts) {
      const srcItem = path4.join(src, item);
      const destItem = path4.join(dest, item);
      if (opts.filter && !opts.filter(srcItem, destItem)) return;
      const { destStat } = stat.checkPathsSync(srcItem, destItem, "copy", opts);
      return getStats(destStat, srcItem, destItem, opts);
    }
    function onLink(destStat, src, dest, opts) {
      let resolvedSrc = fs3.readlinkSync(src);
      if (opts.dereference) {
        resolvedSrc = path4.resolve(process.cwd(), resolvedSrc);
      }
      if (!destStat) {
        return fs3.symlinkSync(resolvedSrc, dest);
      } else {
        let resolvedDest;
        try {
          resolvedDest = fs3.readlinkSync(dest);
        } catch (err) {
          if (err.code === "EINVAL" || err.code === "UNKNOWN") return fs3.symlinkSync(resolvedSrc, dest);
          throw err;
        }
        if (opts.dereference) {
          resolvedDest = path4.resolve(process.cwd(), resolvedDest);
        }
        if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
          throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
        }
        if (stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
          throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
        }
        return copyLink(resolvedSrc, dest);
      }
    }
    function copyLink(resolvedSrc, dest) {
      fs3.unlinkSync(dest);
      return fs3.symlinkSync(resolvedSrc, dest);
    }
    module2.exports = copySync;
  }
});

// node_modules/fs-extra/lib/copy/index.js
var require_copy2 = __commonJS({
  "node_modules/fs-extra/lib/copy/index.js"(exports2, module2) {
    "use strict";
    var u2 = require_universalify().fromPromise;
    module2.exports = {
      copy: u2(require_copy()),
      copySync: require_copy_sync()
    };
  }
});

// node_modules/fs-extra/lib/remove/index.js
var require_remove = __commonJS({
  "node_modules/fs-extra/lib/remove/index.js"(exports2, module2) {
    "use strict";
    var fs3 = require_graceful_fs();
    var u2 = require_universalify().fromCallback;
    function remove(path4, callback) {
      fs3.rm(path4, { recursive: true, force: true }, callback);
    }
    function removeSync(path4) {
      fs3.rmSync(path4, { recursive: true, force: true });
    }
    module2.exports = {
      remove: u2(remove),
      removeSync
    };
  }
});

// node_modules/fs-extra/lib/empty/index.js
var require_empty = __commonJS({
  "node_modules/fs-extra/lib/empty/index.js"(exports2, module2) {
    "use strict";
    var u2 = require_universalify().fromPromise;
    var fs3 = require_fs();
    var path4 = require("path");
    var mkdir = require_mkdirs();
    var remove = require_remove();
    var emptyDir = u2(async function emptyDir2(dir) {
      let items;
      try {
        items = await fs3.readdir(dir);
      } catch {
        return mkdir.mkdirs(dir);
      }
      return Promise.all(items.map((item) => remove.remove(path4.join(dir, item))));
    });
    function emptyDirSync(dir) {
      let items;
      try {
        items = fs3.readdirSync(dir);
      } catch {
        return mkdir.mkdirsSync(dir);
      }
      items.forEach((item) => {
        item = path4.join(dir, item);
        remove.removeSync(item);
      });
    }
    module2.exports = {
      emptyDirSync,
      emptydirSync: emptyDirSync,
      emptyDir,
      emptydir: emptyDir
    };
  }
});

// node_modules/fs-extra/lib/ensure/file.js
var require_file = __commonJS({
  "node_modules/fs-extra/lib/ensure/file.js"(exports2, module2) {
    "use strict";
    var u2 = require_universalify().fromPromise;
    var path4 = require("path");
    var fs3 = require_fs();
    var mkdir = require_mkdirs();
    async function createFile(file) {
      let stats;
      try {
        stats = await fs3.stat(file);
      } catch {
      }
      if (stats && stats.isFile()) return;
      const dir = path4.dirname(file);
      let dirStats = null;
      try {
        dirStats = await fs3.stat(dir);
      } catch (err) {
        if (err.code === "ENOENT") {
          await mkdir.mkdirs(dir);
          await fs3.writeFile(file, "");
          return;
        } else {
          throw err;
        }
      }
      if (dirStats.isDirectory()) {
        await fs3.writeFile(file, "");
      } else {
        await fs3.readdir(dir);
      }
    }
    function createFileSync(file) {
      let stats;
      try {
        stats = fs3.statSync(file);
      } catch {
      }
      if (stats && stats.isFile()) return;
      const dir = path4.dirname(file);
      try {
        if (!fs3.statSync(dir).isDirectory()) {
          fs3.readdirSync(dir);
        }
      } catch (err) {
        if (err && err.code === "ENOENT") mkdir.mkdirsSync(dir);
        else throw err;
      }
      fs3.writeFileSync(file, "");
    }
    module2.exports = {
      createFile: u2(createFile),
      createFileSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/link.js
var require_link = __commonJS({
  "node_modules/fs-extra/lib/ensure/link.js"(exports2, module2) {
    "use strict";
    var u2 = require_universalify().fromPromise;
    var path4 = require("path");
    var fs3 = require_fs();
    var mkdir = require_mkdirs();
    var { pathExists } = require_path_exists();
    var { areIdentical } = require_stat();
    async function createLink(srcpath, dstpath) {
      let dstStat;
      try {
        dstStat = await fs3.lstat(dstpath);
      } catch {
      }
      let srcStat;
      try {
        srcStat = await fs3.lstat(srcpath);
      } catch (err) {
        err.message = err.message.replace("lstat", "ensureLink");
        throw err;
      }
      if (dstStat && areIdentical(srcStat, dstStat)) return;
      const dir = path4.dirname(dstpath);
      const dirExists = await pathExists(dir);
      if (!dirExists) {
        await mkdir.mkdirs(dir);
      }
      await fs3.link(srcpath, dstpath);
    }
    function createLinkSync(srcpath, dstpath) {
      let dstStat;
      try {
        dstStat = fs3.lstatSync(dstpath);
      } catch {
      }
      try {
        const srcStat = fs3.lstatSync(srcpath);
        if (dstStat && areIdentical(srcStat, dstStat)) return;
      } catch (err) {
        err.message = err.message.replace("lstat", "ensureLink");
        throw err;
      }
      const dir = path4.dirname(dstpath);
      const dirExists = fs3.existsSync(dir);
      if (dirExists) return fs3.linkSync(srcpath, dstpath);
      mkdir.mkdirsSync(dir);
      return fs3.linkSync(srcpath, dstpath);
    }
    module2.exports = {
      createLink: u2(createLink),
      createLinkSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/symlink-paths.js
var require_symlink_paths = __commonJS({
  "node_modules/fs-extra/lib/ensure/symlink-paths.js"(exports2, module2) {
    "use strict";
    var path4 = require("path");
    var fs3 = require_fs();
    var { pathExists } = require_path_exists();
    var u2 = require_universalify().fromPromise;
    async function symlinkPaths(srcpath, dstpath) {
      if (path4.isAbsolute(srcpath)) {
        try {
          await fs3.lstat(srcpath);
        } catch (err) {
          err.message = err.message.replace("lstat", "ensureSymlink");
          throw err;
        }
        return {
          toCwd: srcpath,
          toDst: srcpath
        };
      }
      const dstdir = path4.dirname(dstpath);
      const relativeToDst = path4.join(dstdir, srcpath);
      const exists = await pathExists(relativeToDst);
      if (exists) {
        return {
          toCwd: relativeToDst,
          toDst: srcpath
        };
      }
      try {
        await fs3.lstat(srcpath);
      } catch (err) {
        err.message = err.message.replace("lstat", "ensureSymlink");
        throw err;
      }
      return {
        toCwd: srcpath,
        toDst: path4.relative(dstdir, srcpath)
      };
    }
    function symlinkPathsSync(srcpath, dstpath) {
      if (path4.isAbsolute(srcpath)) {
        const exists2 = fs3.existsSync(srcpath);
        if (!exists2) throw new Error("absolute srcpath does not exist");
        return {
          toCwd: srcpath,
          toDst: srcpath
        };
      }
      const dstdir = path4.dirname(dstpath);
      const relativeToDst = path4.join(dstdir, srcpath);
      const exists = fs3.existsSync(relativeToDst);
      if (exists) {
        return {
          toCwd: relativeToDst,
          toDst: srcpath
        };
      }
      const srcExists = fs3.existsSync(srcpath);
      if (!srcExists) throw new Error("relative srcpath does not exist");
      return {
        toCwd: srcpath,
        toDst: path4.relative(dstdir, srcpath)
      };
    }
    module2.exports = {
      symlinkPaths: u2(symlinkPaths),
      symlinkPathsSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/symlink-type.js
var require_symlink_type = __commonJS({
  "node_modules/fs-extra/lib/ensure/symlink-type.js"(exports2, module2) {
    "use strict";
    var fs3 = require_fs();
    var u2 = require_universalify().fromPromise;
    async function symlinkType(srcpath, type) {
      if (type) return type;
      let stats;
      try {
        stats = await fs3.lstat(srcpath);
      } catch {
        return "file";
      }
      return stats && stats.isDirectory() ? "dir" : "file";
    }
    function symlinkTypeSync(srcpath, type) {
      if (type) return type;
      let stats;
      try {
        stats = fs3.lstatSync(srcpath);
      } catch {
        return "file";
      }
      return stats && stats.isDirectory() ? "dir" : "file";
    }
    module2.exports = {
      symlinkType: u2(symlinkType),
      symlinkTypeSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/symlink.js
var require_symlink = __commonJS({
  "node_modules/fs-extra/lib/ensure/symlink.js"(exports2, module2) {
    "use strict";
    var u2 = require_universalify().fromPromise;
    var path4 = require("path");
    var fs3 = require_fs();
    var { mkdirs, mkdirsSync } = require_mkdirs();
    var { symlinkPaths, symlinkPathsSync } = require_symlink_paths();
    var { symlinkType, symlinkTypeSync } = require_symlink_type();
    var { pathExists } = require_path_exists();
    var { areIdentical } = require_stat();
    async function createSymlink(srcpath, dstpath, type) {
      let stats;
      try {
        stats = await fs3.lstat(dstpath);
      } catch {
      }
      if (stats && stats.isSymbolicLink()) {
        const [srcStat, dstStat] = await Promise.all([
          fs3.stat(srcpath),
          fs3.stat(dstpath)
        ]);
        if (areIdentical(srcStat, dstStat)) return;
      }
      const relative2 = await symlinkPaths(srcpath, dstpath);
      srcpath = relative2.toDst;
      const toType = await symlinkType(relative2.toCwd, type);
      const dir = path4.dirname(dstpath);
      if (!await pathExists(dir)) {
        await mkdirs(dir);
      }
      return fs3.symlink(srcpath, dstpath, toType);
    }
    function createSymlinkSync(srcpath, dstpath, type) {
      let stats;
      try {
        stats = fs3.lstatSync(dstpath);
      } catch {
      }
      if (stats && stats.isSymbolicLink()) {
        const srcStat = fs3.statSync(srcpath);
        const dstStat = fs3.statSync(dstpath);
        if (areIdentical(srcStat, dstStat)) return;
      }
      const relative2 = symlinkPathsSync(srcpath, dstpath);
      srcpath = relative2.toDst;
      type = symlinkTypeSync(relative2.toCwd, type);
      const dir = path4.dirname(dstpath);
      const exists = fs3.existsSync(dir);
      if (exists) return fs3.symlinkSync(srcpath, dstpath, type);
      mkdirsSync(dir);
      return fs3.symlinkSync(srcpath, dstpath, type);
    }
    module2.exports = {
      createSymlink: u2(createSymlink),
      createSymlinkSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/index.js
var require_ensure = __commonJS({
  "node_modules/fs-extra/lib/ensure/index.js"(exports2, module2) {
    "use strict";
    var { createFile, createFileSync } = require_file();
    var { createLink, createLinkSync } = require_link();
    var { createSymlink, createSymlinkSync } = require_symlink();
    module2.exports = {
      // file
      createFile,
      createFileSync,
      ensureFile: createFile,
      ensureFileSync: createFileSync,
      // link
      createLink,
      createLinkSync,
      ensureLink: createLink,
      ensureLinkSync: createLinkSync,
      // symlink
      createSymlink,
      createSymlinkSync,
      ensureSymlink: createSymlink,
      ensureSymlinkSync: createSymlinkSync
    };
  }
});

// node_modules/jsonfile/utils.js
var require_utils2 = __commonJS({
  "node_modules/jsonfile/utils.js"(exports2, module2) {
    function stringify(obj, { EOL = "\n", finalEOL = true, replacer = null, spaces } = {}) {
      const EOF = finalEOL ? EOL : "";
      const str = JSON.stringify(obj, replacer, spaces);
      return str.replace(/\n/g, EOL) + EOF;
    }
    function stripBom(content) {
      if (Buffer.isBuffer(content)) content = content.toString("utf8");
      return content.replace(/^\uFEFF/, "");
    }
    module2.exports = { stringify, stripBom };
  }
});

// node_modules/jsonfile/index.js
var require_jsonfile = __commonJS({
  "node_modules/jsonfile/index.js"(exports2, module2) {
    var _fs;
    try {
      _fs = require_graceful_fs();
    } catch (_) {
      _fs = require("fs");
    }
    var universalify = require_universalify();
    var { stringify, stripBom } = require_utils2();
    async function _readFile(file, options = {}) {
      if (typeof options === "string") {
        options = { encoding: options };
      }
      const fs3 = options.fs || _fs;
      const shouldThrow = "throws" in options ? options.throws : true;
      let data = await universalify.fromCallback(fs3.readFile)(file, options);
      data = stripBom(data);
      let obj;
      try {
        obj = JSON.parse(data, options ? options.reviver : null);
      } catch (err) {
        if (shouldThrow) {
          err.message = `${file}: ${err.message}`;
          throw err;
        } else {
          return null;
        }
      }
      return obj;
    }
    var readFile = universalify.fromPromise(_readFile);
    function readFileSync4(file, options = {}) {
      if (typeof options === "string") {
        options = { encoding: options };
      }
      const fs3 = options.fs || _fs;
      const shouldThrow = "throws" in options ? options.throws : true;
      try {
        let content = fs3.readFileSync(file, options);
        content = stripBom(content);
        return JSON.parse(content, options.reviver);
      } catch (err) {
        if (shouldThrow) {
          err.message = `${file}: ${err.message}`;
          throw err;
        } else {
          return null;
        }
      }
    }
    async function _writeFile(file, obj, options = {}) {
      const fs3 = options.fs || _fs;
      const str = stringify(obj, options);
      await universalify.fromCallback(fs3.writeFile)(file, str, options);
    }
    var writeFile2 = universalify.fromPromise(_writeFile);
    function writeFileSync(file, obj, options = {}) {
      const fs3 = options.fs || _fs;
      const str = stringify(obj, options);
      return fs3.writeFileSync(file, str, options);
    }
    var jsonfile = {
      readFile,
      readFileSync: readFileSync4,
      writeFile: writeFile2,
      writeFileSync
    };
    module2.exports = jsonfile;
  }
});

// node_modules/fs-extra/lib/json/jsonfile.js
var require_jsonfile2 = __commonJS({
  "node_modules/fs-extra/lib/json/jsonfile.js"(exports2, module2) {
    "use strict";
    var jsonFile = require_jsonfile();
    module2.exports = {
      // jsonfile exports
      readJson: jsonFile.readFile,
      readJsonSync: jsonFile.readFileSync,
      writeJson: jsonFile.writeFile,
      writeJsonSync: jsonFile.writeFileSync
    };
  }
});

// node_modules/fs-extra/lib/output-file/index.js
var require_output_file = __commonJS({
  "node_modules/fs-extra/lib/output-file/index.js"(exports2, module2) {
    "use strict";
    var u2 = require_universalify().fromPromise;
    var fs3 = require_fs();
    var path4 = require("path");
    var mkdir = require_mkdirs();
    var pathExists = require_path_exists().pathExists;
    async function outputFile(file, data, encoding = "utf-8") {
      const dir = path4.dirname(file);
      if (!await pathExists(dir)) {
        await mkdir.mkdirs(dir);
      }
      return fs3.writeFile(file, data, encoding);
    }
    function outputFileSync(file, ...args) {
      const dir = path4.dirname(file);
      if (!fs3.existsSync(dir)) {
        mkdir.mkdirsSync(dir);
      }
      fs3.writeFileSync(file, ...args);
    }
    module2.exports = {
      outputFile: u2(outputFile),
      outputFileSync
    };
  }
});

// node_modules/fs-extra/lib/json/output-json.js
var require_output_json = __commonJS({
  "node_modules/fs-extra/lib/json/output-json.js"(exports2, module2) {
    "use strict";
    var { stringify } = require_utils2();
    var { outputFile } = require_output_file();
    async function outputJson(file, data, options = {}) {
      const str = stringify(data, options);
      await outputFile(file, str, options);
    }
    module2.exports = outputJson;
  }
});

// node_modules/fs-extra/lib/json/output-json-sync.js
var require_output_json_sync = __commonJS({
  "node_modules/fs-extra/lib/json/output-json-sync.js"(exports2, module2) {
    "use strict";
    var { stringify } = require_utils2();
    var { outputFileSync } = require_output_file();
    function outputJsonSync(file, data, options) {
      const str = stringify(data, options);
      outputFileSync(file, str, options);
    }
    module2.exports = outputJsonSync;
  }
});

// node_modules/fs-extra/lib/json/index.js
var require_json = __commonJS({
  "node_modules/fs-extra/lib/json/index.js"(exports2, module2) {
    "use strict";
    var u2 = require_universalify().fromPromise;
    var jsonFile = require_jsonfile2();
    jsonFile.outputJson = u2(require_output_json());
    jsonFile.outputJsonSync = require_output_json_sync();
    jsonFile.outputJSON = jsonFile.outputJson;
    jsonFile.outputJSONSync = jsonFile.outputJsonSync;
    jsonFile.writeJSON = jsonFile.writeJson;
    jsonFile.writeJSONSync = jsonFile.writeJsonSync;
    jsonFile.readJSON = jsonFile.readJson;
    jsonFile.readJSONSync = jsonFile.readJsonSync;
    module2.exports = jsonFile;
  }
});

// node_modules/fs-extra/lib/move/move.js
var require_move = __commonJS({
  "node_modules/fs-extra/lib/move/move.js"(exports2, module2) {
    "use strict";
    var fs3 = require_fs();
    var path4 = require("path");
    var { copy } = require_copy2();
    var { remove } = require_remove();
    var { mkdirp } = require_mkdirs();
    var { pathExists } = require_path_exists();
    var stat = require_stat();
    async function move(src, dest, opts = {}) {
      const overwrite = opts.overwrite || opts.clobber || false;
      const { srcStat, isChangingCase = false } = await stat.checkPaths(src, dest, "move", opts);
      await stat.checkParentPaths(src, srcStat, dest, "move");
      const destParent = path4.dirname(dest);
      const parsedParentPath = path4.parse(destParent);
      if (parsedParentPath.root !== destParent) {
        await mkdirp(destParent);
      }
      return doRename(src, dest, overwrite, isChangingCase);
    }
    async function doRename(src, dest, overwrite, isChangingCase) {
      if (!isChangingCase) {
        if (overwrite) {
          await remove(dest);
        } else if (await pathExists(dest)) {
          throw new Error("dest already exists.");
        }
      }
      try {
        await fs3.rename(src, dest);
      } catch (err) {
        if (err.code !== "EXDEV") {
          throw err;
        }
        await moveAcrossDevice(src, dest, overwrite);
      }
    }
    async function moveAcrossDevice(src, dest, overwrite) {
      const opts = {
        overwrite,
        errorOnExist: true,
        preserveTimestamps: true
      };
      await copy(src, dest, opts);
      return remove(src);
    }
    module2.exports = move;
  }
});

// node_modules/fs-extra/lib/move/move-sync.js
var require_move_sync = __commonJS({
  "node_modules/fs-extra/lib/move/move-sync.js"(exports2, module2) {
    "use strict";
    var fs3 = require_graceful_fs();
    var path4 = require("path");
    var copySync = require_copy2().copySync;
    var removeSync = require_remove().removeSync;
    var mkdirpSync = require_mkdirs().mkdirpSync;
    var stat = require_stat();
    function moveSync(src, dest, opts) {
      opts = opts || {};
      const overwrite = opts.overwrite || opts.clobber || false;
      const { srcStat, isChangingCase = false } = stat.checkPathsSync(src, dest, "move", opts);
      stat.checkParentPathsSync(src, srcStat, dest, "move");
      if (!isParentRoot(dest)) mkdirpSync(path4.dirname(dest));
      return doRename(src, dest, overwrite, isChangingCase);
    }
    function isParentRoot(dest) {
      const parent = path4.dirname(dest);
      const parsedPath = path4.parse(parent);
      return parsedPath.root === parent;
    }
    function doRename(src, dest, overwrite, isChangingCase) {
      if (isChangingCase) return rename(src, dest, overwrite);
      if (overwrite) {
        removeSync(dest);
        return rename(src, dest, overwrite);
      }
      if (fs3.existsSync(dest)) throw new Error("dest already exists.");
      return rename(src, dest, overwrite);
    }
    function rename(src, dest, overwrite) {
      try {
        fs3.renameSync(src, dest);
      } catch (err) {
        if (err.code !== "EXDEV") throw err;
        return moveAcrossDevice(src, dest, overwrite);
      }
    }
    function moveAcrossDevice(src, dest, overwrite) {
      const opts = {
        overwrite,
        errorOnExist: true,
        preserveTimestamps: true
      };
      copySync(src, dest, opts);
      return removeSync(src);
    }
    module2.exports = moveSync;
  }
});

// node_modules/fs-extra/lib/move/index.js
var require_move2 = __commonJS({
  "node_modules/fs-extra/lib/move/index.js"(exports2, module2) {
    "use strict";
    var u2 = require_universalify().fromPromise;
    module2.exports = {
      move: u2(require_move()),
      moveSync: require_move_sync()
    };
  }
});

// node_modules/fs-extra/lib/index.js
var require_lib = __commonJS({
  "node_modules/fs-extra/lib/index.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      // Export promiseified graceful-fs:
      ...require_fs(),
      // Export extra methods:
      ...require_copy2(),
      ...require_empty(),
      ...require_ensure(),
      ...require_json(),
      ...require_mkdirs(),
      ...require_move2(),
      ...require_output_file(),
      ...require_path_exists(),
      ...require_remove()
    };
  }
});

// src/utils/get-url.js
var require_get_url = __commonJS({
  "src/utils/get-url.js"(exports2, module2) {
    "use strict";
    var https = require("https");
    var http = require("http");
    module2.exports = async function getUrl(url, autoRetry = true) {
      return await autoRetry ? _autoRetry(() => _getUrl(url), function log(_, __, backOff) {
        console.error(`Retrying ${url} in ${backOff} ${backOff === 1 ? "second" : "seconds"}.`);
      }, function gaveUp(ex, tries, _) {
        console.error(`Gave up after ${tries} ${tries === 1 ? "try" : "tries"}.`);
        throw ex;
      }) : _getUrl(url);
    };
    async function _getUrl(url) {
      return new Promise((resolve5, reject) => {
        const chunks = [];
        (/^https:/.test(url) ? https : http).get(url, (resp) => {
          if (resp.statusCode !== 200) {
            reject(`Error: HTTP status code ${resp.statusCode} for ${url}`);
            return;
          }
          resp.on("data", (d2) => chunks.push(d2)).on("end", () => resolve5(Buffer.concat(chunks))).on("error", reject);
        }).on("error", reject);
      });
    }
    async function _autoRetry(fn, log = null, gaveUp = null, MAX_TRIES = 5, MAX_BACKOFF_SECS = 16) {
      for (let tries = 1, backOff = 1; ; tries++, backOff = Math.min(2 * backOff, MAX_BACKOFF_SECS)) {
        try {
          return await fn();
        } catch (ex) {
          if (tries >= MAX_TRIES) return gaveUp && gaveUp(ex, tries, backOff);
          log && log(ex, tries, backOff);
          await new Promise((r2, _) => setTimeout(r2, 1e3 * backOff));
        }
      }
    }
  }
});

// src/utils/decode-resource.js
var require_decode_resource = __commonJS({
  "src/utils/decode-resource.js"(exports, module) {
    "use strict";
    function uuidv4() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c2) => {
        let r2 = Math.random() * 16 | 0, v2 = c2 == "x" ? r2 : r2 & 3 | 8;
        return v2.toString(16);
      });
    }
    module.exports = (function() {
      const code = function() {
        (function() {
          "use strict";
          var T, jb = this;
          function kb(c2, d2, e2) {
            c2 = c2.split(".");
            e2 = e2 || jb;
            c2[0] in e2 || "undefined" == typeof e2.execScript || e2.execScript("var " + c2[0]);
            for (var h2; c2.length && (h2 = c2.shift()); ) c2.length || void 0 === d2 ? e2[h2] && e2[h2] !== Object.prototype[h2] ? e2 = e2[h2] : e2 = e2[h2] = {} : e2[h2] = d2;
          }
          var Fb = Date.now || function() {
            return +/* @__PURE__ */ new Date();
          };
          function Mb(c2) {
            this.length = c2.length || c2;
            for (var d2 = 0; d2 < this.length; d2++) this[d2] = c2[d2] || 0;
          }
          Mb.prototype.a = 4;
          Mb.prototype.set = function(c2, d2) {
            d2 = d2 || 0;
            for (var e2 = 0; e2 < c2.length && d2 + e2 < this.length; e2++) this[d2 + e2] = c2[e2];
          };
          Mb.prototype.toString = Array.prototype.join;
          "undefined" == typeof Float32Array && (Mb.BYTES_PER_ELEMENT = 4, Mb.prototype.BYTES_PER_ELEMENT = Mb.prototype.a, Mb.prototype.set = Mb.prototype.set, Mb.prototype.toString = Mb.prototype.toString, kb("Float32Array", Mb, void 0));
          function Rb(c2) {
            this.length = c2.length || c2;
            for (var d2 = 0; d2 < this.length; d2++) this[d2] = c2[d2] || 0;
          }
          Rb.prototype.a = 8;
          Rb.prototype.set = function(c2, d2) {
            d2 = d2 || 0;
            for (var e2 = 0; e2 < c2.length && d2 + e2 < this.length; e2++) this[d2 + e2] = c2[e2];
          };
          Rb.prototype.toString = Array.prototype.join;
          if ("undefined" == typeof Float64Array) {
            try {
              Rb.BYTES_PER_ELEMENT = 8;
            } catch (c2) {
            }
            Rb.prototype.BYTES_PER_ELEMENT = Rb.prototype.a;
            Rb.prototype.set = Rb.prototype.set;
            Rb.prototype.toString = Rb.prototype.toString;
            kb("Float64Array", Rb, void 0);
          }
          ;
          function Sb() {
            this.matrixMeshFromGlobe = this.matrixGlobeFromMesh = null;
            this.meshes = [];
            this.overlaySurfaceMeshes = [];
            this.copyrightIds = this.waterMesh = null;
            this.nonEmptyOctants = 0;
            this.bvhTriPermutation = this.bvhNodes = null;
          }
          function Tb() {
            this.vertexAlphas = this.indices = this.uvOffsetAndScale = this.layerBounds = this.texture = this.vertices = null;
            this.numNonDegenerateTriangles = 0;
            this.meshId = -1;
            this.octantCounts = this.normals = null;
          }
          function Ub() {
            this.bytes = null;
            this.textureFormat = 1;
            this.viewDirection = this.height = this.width = 0;
            this.meshId = -1;
          }
          function Vb() {
            this.headNodePath = "";
            this.obbRotations = this.obbExtents = this.obbCenters = this.metersPerTexel = this.flags = this.bulkMetadataEpoch = this.epoch = this.childIndices = null;
            this.defaultImageryEpoch = 0;
            this.imageryEpochArray = null;
            this.defaultTextureFormat = 0;
            this.textureFormatArray = null;
            this.defaultAvailableViewDirections = 0;
            this.childBulkMetadata = this.nodes = this.viewDependentTextureFormatArray = this.availableViewDirectionsArray = null;
          }
          function Wb() {
            this.textures = [];
            this.transformInfo = [];
            this.projectionOrigin = null;
          }
          function pc() {
            this.vertexTransformMap = this.transformTable = null;
            this.meshId = -1;
            this.uvOffsetAndScale = null;
          }
          ;
          function qc(c2) {
            this.u = new DataView(c2.buffer);
            this.b = c2;
            this.a = 0;
            this.c = c2.length;
            this.h = [];
            this.l = this.o = 0;
          }
          T = qc.prototype;
          T.D = function() {
            if (this.a < this.c) {
              var c2 = this.sa();
              this.o = c2 & 7;
              return this.l = c2 >> 3;
            }
            return 0;
          };
          T.O = function(c2) {
            this.h.push(this.c);
            this.c = c2;
          };
          T.N = function() {
            if (!this.h.length) return false;
            this.c = this.h.pop();
            return true;
          };
          T.sa = function() {
            var c2 = 0, d2 = 1;
            do {
              var e2 = this.b[this.a++];
              c2 += (127 & e2) * d2;
              d2 *= 128;
            } while (e2 & 128);
            return c2;
          };
          T.jd = function() {
            do
              var c2 = this.b[this.a++];
            while (c2 & 128);
          };
          T.hd = function() {
            this.a = this.sa() + this.a;
          };
          T.B = function() {
            switch (this.o) {
              case 0:
                return this.jd(), true;
              case 1:
                return this.a += 8, true;
              case 2:
                return this.hd(), true;
              case 5:
                return this.a += 4, true;
            }
            return false;
          };
          T.Xc = function() {
            var c2 = this.sa();
            return c2 & 2147483648 ? (c2 & 2147483647) - 2147483648 : c2;
          };
          T.f = qc.prototype.sa;
          T.$ = function() {
            var c2 = this.u.getFloat32(this.a, true);
            this.a += 4;
            return c2;
          };
          T.ua = function() {
            var c2 = this.u.getFloat64(this.a, true);
            this.a += 8;
            return c2;
          };
          T.Ia = function() {
            return this.b[this.a++];
          };
          T.Ka = function() {
            var c2 = this.b[this.a++];
            c2 |= this.b[this.a++] << 8;
            return c2 & 32768 ? c2 | 4294901760 : c2;
          };
          T.ia = function() {
            var c2 = this.b[this.a++];
            return this.b[this.a++] << 8 | c2;
          };
          T.cd = function() {
            var c2 = this.b[this.a++];
            c2 = this.a + c2;
            for (var d2 = ""; this.a < c2; ) {
              var e2 = this.b[this.a++];
              if (128 > e2) d2 += String.fromCharCode(e2);
              else if (!(192 > e2)) {
                if (224 > e2) {
                  var h2 = this.b[this.a++];
                  d2 += String.fromCharCode((e2 & 31) << 6 | h2 & 63);
                } else if (240 > e2) {
                  h2 = this.b[this.a++];
                  var k2 = this.b[this.a++];
                  d2 += String.fromCharCode((e2 & 15) << 12 | (h2 & 63) << 6 | k2 & 63);
                }
              }
            }
            return d2;
          };
          T.data = function() {
            return this.b;
          };
          T.Oc = function() {
            this.a = this.l = this.o = 0;
            this.c = this.b.length;
            this.h = [];
          };
          T.U = function(c2) {
            this.a += c2;
          };
          function rc(c2, d2) {
            this.h = new qc(c2);
            this.Oa = d2;
            this.c = null;
            this.b = new Float64Array(3);
            this.a = new Float32Array(4);
            this.o = {};
            this.l = this.u = 0;
            this.ra = this.L = this.ba = this.M = false;
          }
          T = rc.prototype;
          T.Nc = function() {
            var c2 = this.h, d2, e2 = [], h2 = this.c = new Vb();
            this.a[0] = Infinity;
            this.a[1] = Infinity;
            this.a[2] = Infinity;
            this.a[3] = Infinity;
            for (h2.defaultTextureFormat = 6; d2 = c2.D(); ) switch (d2) {
              case 1:
                d2 = c2.f();
                c2.O(c2.a + d2);
                e2.push(this.bd());
                c2.N();
                break;
              case 2:
                d2 = c2.f();
                c2.O(c2.a + d2);
                this.Vc();
                c2.N();
                break;
              case 3:
                c2.f();
                this.b[0] = c2.ua();
                this.b[1] = c2.ua();
                this.b[2] = c2.ua();
                break;
              case 4:
                c2.f();
                this.a[0] = c2.$();
                this.a[1] = c2.$();
                this.a[2] = c2.$();
                this.a[3] = c2.$();
                break;
              case 5:
                h2.defaultImageryEpoch = c2.f();
                break;
              case 6:
                h2.defaultTextureFormat = sc(c2.f());
                break;
              case 7:
                h2.defaultAvailableViewDirections = c2.f();
                break;
              case 8:
                h2.defaultViewDependentTextureFormat = sc(c2.f());
                break;
              default:
                c2.B();
            }
            c2.Oc();
            d2 = e2.slice();
            d2.sort(tc);
            for (var k2 = 0; k2 < e2.length; k2++) this.o[d2[k2]] = k2;
            k2 = e2.length;
            h2.epoch = new Uint32Array(k2);
            h2.bulkMetadataEpoch = new Uint32Array(k2);
            h2.flags = new Uint8Array(k2);
            h2.metersPerTexel = new Float32Array(k2);
            h2.obbCenters = new Float64Array(3 * k2);
            h2.obbExtents = new Float32Array(3 * k2);
            h2.obbRotations = new Float32Array(9 * k2);
            h2.imageryEpochArray = new Uint32Array(k2);
            h2.textureFormatArray = new Uint8Array(k2);
            h2.viewDependentTextureFormatArray = new Uint8Array(k2);
            h2.availableViewDirectionsArray = new Uint8Array(k2);
            for (k2 = 0; d2 = c2.D(); ) switch (d2) {
              case 1:
                d2 = c2.f();
                c2.O(c2.a + d2);
                this.$c(e2[k2++]);
                c2.N();
                break;
              default:
                c2.B();
            }
            this.pc();
            c2 = [h2.childIndices.buffer, h2.epoch.buffer, h2.bulkMetadataEpoch.buffer, h2.flags.buffer, h2.metersPerTexel.buffer, h2.obbCenters.buffer, h2.obbExtents.buffer, h2.obbRotations.buffer];
            this.M ? c2.push(h2.imageryEpochArray.buffer) : h2.imageryEpochArray = null;
            this.ba ? c2.push(h2.textureFormatArray.buffer) : h2.textureFormatArray = null;
            this.L ? c2.push(h2.availableViewDirectionsArray.buffer) : h2.availableViewDirectionsArray = null;
            this.ra ? c2.push(h2.viewDependentTextureFormatArray.buffer) : h2.viewDependentTextureFormatArray = null;
            this.Oa(h2, c2);
          };
          function tc(c2, d2) {
            var e2 = c2.length - d2.length;
            return 0 != e2 ? e2 : c2 < d2 ? -1 : 1;
          }
          T.Vc = function() {
            for (var c2 = this.h, d2 = this.c, e2; e2 = c2.D(); ) switch (e2) {
              case 1:
                d2.headNodePath = c2.cd();
                break;
              case 2:
                this.l = c2.f();
                break;
              default:
                c2.B();
            }
          };
          T.bd = function() {
            for (var c2 = this.h, d2, e2 = ""; d2 = c2.D(); ) switch (d2) {
              case 1:
                e2 = c2.f();
                d2 = (e2 & 3) + 1;
                e2 = e2 >> 2 & (1 << 3 * d2) - 1;
                for (var h2 = "", k2 = 0; k2 < d2; k2++) h2 += e2 >> 3 * k2 & 7;
                e2 = h2;
                break;
              default:
                c2.B();
            }
            return e2;
          };
          T.$c = function(c2) {
            var d2 = this.h, e2 = this.c, h2, k2 = 0, g2 = [], m2 = [], p2 = [], v2 = 0, z2 = this.l, B2 = this.l, A2 = this.o[c2];
            e2.imageryEpochArray[A2] = e2.defaultImageryEpoch;
            e2.textureFormatArray[A2] = e2.defaultTextureFormat;
            for (e2.availableViewDirectionsArray[A2] = e2.defaultAvailableViewDirections; h2 = d2.D(); ) switch (h2) {
              case 1:
                k2 = d2.f();
                break;
              case 3:
                d2.f();
                g2[0] = d2.Ka();
                g2[1] = d2.Ka();
                g2[2] = d2.Ka();
                m2[0] = d2.Ia();
                m2[1] = d2.Ia();
                m2[2] = d2.Ia();
                p2[0] = d2.ia();
                p2[1] = d2.ia();
                p2[2] = d2.ia();
                break;
              case 4:
                v2 = d2.$();
                break;
              case 2:
                z2 = d2.f();
                break;
              case 5:
                B2 = d2.f();
                break;
              case 7:
                this.M = true;
                e2.imageryEpochArray[A2] = d2.f();
                break;
              case 8:
                this.ba = true;
                e2.textureFormatArray[A2] = sc(d2.f());
                break;
              case 9:
                this.L = true;
                e2.availableViewDirectionsArray[A2] = d2.f();
                break;
              case 10:
                this.ra = true;
                e2.viewDependentTextureFormatArray[A2] = sc(d2.f());
                break;
              default:
                d2.B();
            }
            c2 = c2.length;
            4 > c2 && this.u++;
            e2.epoch[A2] = z2;
            e2.bulkMetadataEpoch[A2] = B2;
            e2.flags[A2] = k2 >> 2 + 3 * c2;
            0 == v2 && (v2 = this.a[c2 - 1]);
            e2.metersPerTexel[A2] = v2;
            g2[0] = g2[0] * v2 + this.b[0];
            g2[1] = g2[1] * v2 + this.b[1];
            g2[2] = g2[2] * v2 + this.b[2];
            m2[0] *= v2;
            m2[1] *= v2;
            m2[2] *= v2;
            p2[0] = p2[0] * Math.PI / 32768;
            p2[1] = p2[1] * Math.PI / 65536;
            p2[2] = p2[2] * Math.PI / 32768;
            k2 = new Float32Array(9);
            z2 = p2[0];
            c2 = p2[1];
            v2 = p2[2];
            p2 = Math.cos(z2);
            z2 = Math.sin(z2);
            B2 = Math.cos(c2);
            c2 = Math.sin(c2);
            d2 = Math.cos(v2);
            v2 = Math.sin(v2);
            k2[0] = p2 * d2 - B2 * z2 * v2;
            k2[1] = B2 * p2 * v2 + d2 * z2;
            k2[2] = v2 * c2;
            k2[3] = -p2 * v2 - d2 * B2 * z2;
            k2[4] = p2 * B2 * d2 - z2 * v2;
            k2[5] = d2 * c2;
            k2[6] = c2 * z2;
            k2[7] = -p2 * c2;
            k2[8] = B2;
            k2 == k2 ? (p2 = k2[1], v2 = k2[2], z2 = k2[5], k2[1] = k2[3], k2[2] = k2[6], k2[3] = p2, k2[5] = k2[7], k2[6] = v2, k2[7] = z2) : (k2[0] = k2[0], k2[1] = k2[3], k2[2] = k2[6], k2[3] = k2[1], k2[4] = k2[4], k2[5] = k2[7], k2[6] = k2[2], k2[7] = k2[5], k2[8] = k2[8]);
            e2.obbCenters.set(g2, 3 * A2);
            e2.obbRotations.set(k2, 9 * A2);
            e2.obbExtents.set(m2, 3 * A2);
          };
          T.pc = function() {
            this.c.childIndices = new Int16Array(8 * (this.u + 1));
            this.Ab("", -1);
          };
          T.Ab = function(c2, d2) {
            if (4 != c2.length) for (var e2 = 0; 8 > e2; e2++) {
              var h2 = c2 + e2, k2 = this.o[h2];
              void 0 !== k2 ? this.Ab(h2, k2) : k2 = -1;
              this.c.childIndices[8 * (d2 + 1) + e2] = k2;
            }
          };
          var uc = [6, 1];
          function sc(c2) {
            for (var d2 = 0; d2 < uc.length; d2++) {
              var e2 = uc[d2];
              if (c2 & 1 << e2 - 1) return 0 == e2 && c2.toString(16), e2;
            }
            c2.toString(16);
            return uc[0];
          }
          ;
          function vc(c2, d2) {
            return 0 == d2 ? c2 + 1 & -2 : 1 == d2 ? c2 | 1 : c2 + 2;
          }
          ;
          function zd(c2) {
            this.ba = c2;
            this.l = null;
            this.o = 0;
            this.b = this.h = this.L = this.M = this.c = this.u = null;
            this.a = 0;
          }
          T = zd.prototype;
          T.start = function() {
            for (var c2 = this.ba, d2 = 0, e2 = 0; e2 < c2.length; ++e2) d2 += c2[e2].numNonDegenerateTriangles;
            if (0 >= d2) return null;
            this.M = new Uint32Array(d2);
            this.c = new Uint32Array(d2);
            this.L = new Uint8Array(6 * d2);
            this.h = Array(3);
            this.h[0] = new Uint8Array(d2);
            this.h[1] = new Uint8Array(d2);
            this.h[2] = new Uint8Array(d2);
            for (var h2 = this.L, k2 = this.h, g2, m2, p2, v2, z2, B2, A2 = 0, G2 = 0, C2 = 0, R2 = 0, L2 = 0, O2 = 0, sa2 = 0, ka2 = 0, qa2 = 0; qa2 < c2.length; ++qa2) {
              e2 = c2[qa2];
              var P2 = e2.indices, la2 = e2.vertices, Ea2 = P2.length - 2;
              for (e2 = 0; e2 < Ea2; ++e2) {
                m2 = P2[vc(e2, 0)];
                var J2 = P2[vc(e2, 1)], aa2 = P2[vc(e2, 2)];
                if (m2 != J2 && J2 != aa2 && aa2 != m2) {
                  this.M[ka2] = qa2 << 24 | e2;
                  this.c[ka2] = ka2;
                  p2 = 8 * m2;
                  g2 = v2 = la2[p2++];
                  m2 = z2 = la2[p2++];
                  p2 = B2 = la2[p2];
                  var Ja2 = 8 * J2;
                  J2 = la2[Ja2++];
                  J2 < g2 ? g2 = J2 : J2 > v2 && (v2 = J2);
                  J2 = la2[Ja2++];
                  J2 < m2 ? m2 = J2 : J2 > z2 && (z2 = J2);
                  J2 = la2[Ja2];
                  J2 < p2 ? p2 = J2 : J2 > B2 && (B2 = J2);
                  aa2 *= 8;
                  J2 = la2[aa2++];
                  J2 < g2 ? g2 = J2 : J2 > v2 && (v2 = J2);
                  J2 = la2[aa2++];
                  J2 < m2 ? m2 = J2 : J2 > z2 && (z2 = J2);
                  J2 = la2[aa2];
                  J2 < p2 ? p2 = J2 : J2 > B2 && (B2 = J2);
                  h2[A2++] = g2;
                  h2[A2++] = m2;
                  h2[A2++] = p2;
                  h2[A2++] = v2;
                  h2[A2++] = z2;
                  h2[A2++] = B2;
                  g2 = g2 + v2 >> 1;
                  m2 = m2 + z2 >> 1;
                  p2 = p2 + B2 >> 1;
                  k2[0][ka2] = g2;
                  k2[1][ka2] = m2;
                  k2[2][ka2] = p2;
                  0 < ka2 ? (g2 < G2 ? G2 = g2 : g2 > L2 && (L2 = g2), m2 < C2 ? C2 = m2 : m2 > O2 && (O2 = m2), p2 < R2 ? R2 = p2 : p2 > sa2 && (sa2 = p2)) : (G2 = L2 = g2, C2 = O2 = m2, R2 = sa2 = p2);
                  ++ka2;
                }
              }
            }
            this.l = c2 = new Uint8Array(24 * d2);
            this.u = new Uint32Array(c2.buffer);
            c2[0] = G2;
            c2[1] = C2;
            c2[2] = R2;
            c2[3] = L2;
            c2[4] = O2;
            c2[5] = sa2;
            this.b = new Uint32Array(3 * d2);
            this.a = 0;
            this.b[this.a++] = 0;
            this.b[this.a++] = 0;
            this.b[this.a++] = d2;
            this.o = 1;
            return this.cb;
          };
          T.cb = function() {
            for (var c2 = this.b, d2 = 0; 0 < this.a; ) {
              var e2 = c2[--this.a], h2 = c2[--this.a], k2 = c2[--this.a], g2 = e2 - h2;
              if (0 == d2 || 1e4 > d2 + g2) this.nc(k2, h2, e2), d2 += g2;
              else {
                this.a += 3;
                break;
              }
            }
            return 0 == this.a ? this.wc : this.cb;
          };
          T.nc = function(c2, d2, e2) {
            var h2 = e2 - d2;
            if (4 >= h2) this.ob(c2, d2, e2);
            else {
              var k2 = this.l, g2 = 12 * c2, m2 = k2[g2 + 3] - k2[g2 + 0], p2 = k2[g2 + 4] - k2[g2 + 1], v2 = k2[g2 + 5] - k2[g2 + 2];
              if (m2 > p2 && m2 > v2) var z2 = 0;
              else p2 > v2 ? (z2 = 1, m2 = p2) : (z2 = 2, m2 = v2);
              k2 = k2[g2 + z2] + (m2 >> 1);
              p2 = d2;
              v2 = e2;
              g2 = this.h[z2];
              for (m2 = this.c; ; ) {
                for (; p2 < v2 && !(g2[m2[p2]] >= k2); ) p2++;
                for (; p2 < v2 && !(g2[m2[v2 - 1]] < k2); ) v2--;
                if (p2 == v2) {
                  p2 = v2;
                  break;
                }
                var B2 = m2[p2];
                m2[p2] = m2[v2 - 1];
                m2[v2 - 1] = B2;
              }
              if (p2 == d2 || p2 == e2) {
                if (255 > h2) {
                  this.ob(c2, d2, e2);
                  return;
                }
                p2 = (d2 + e2) / 2;
                k2 = g2[m2[p2]];
              }
              h2 = this.o++;
              g2 = this.o++;
              this.Fc(c2, h2, z2, k2, d2, p2, e2);
              this.b[this.a++] = g2;
              this.b[this.a++] = p2;
              this.b[this.a++] = e2;
              this.b[this.a++] = h2;
              this.b[this.a++] = d2;
              this.b[this.a++] = p2;
            }
          };
          T.Fc = function(c2, d2, e2, h2, k2, g2, m2) {
            h2 = this.l;
            c2 *= 12;
            h2[c2 + 6] = 0;
            h2[c2 + 7] = e2;
            this.u[c2 + 8 >> 2] = d2;
            e2 = this.h[0];
            c2 = this.h[1];
            for (var p2 = this.h[2], v2 = 0; 2 > v2; v2++) {
              var z2 = 0 == v2 ? k2 : g2, B2 = 0 == v2 ? g2 : m2;
              if (!(4 >= B2 - z2)) {
                var A2 = this.c[z2], G2 = e2[A2], C2 = c2[A2];
                A2 = p2[A2];
                var R2 = G2, L2 = G2, O2 = C2, sa2 = C2, ka2 = A2, qa2 = A2;
                for (z2 += 1; z2 < B2; z2++) A2 = this.c[z2], G2 = e2[A2], C2 = c2[A2], A2 = p2[A2], G2 < R2 ? R2 = G2 : G2 > L2 && (L2 = G2), C2 < O2 ? O2 = C2 : C2 > sa2 && (sa2 = C2), A2 < ka2 ? ka2 = A2 : A2 > qa2 && (qa2 = A2);
                B2 = 12 * (0 == v2 ? d2 : d2 + 1);
                h2[B2++] = R2;
                h2[B2++] = O2;
                h2[B2++] = ka2;
                h2[B2++] = L2;
                h2[B2++] = sa2;
                h2[B2] = qa2;
              }
            }
          };
          T.ob = function(c2, d2, e2) {
            var h2 = this.L, k2 = this.c, g2, m2, p2, v2;
            var z2 = g2 = m2 = 255;
            var B2 = p2 = v2 = 0;
            for (var A2 = d2; A2 < e2; ++A2) {
              var G2 = 6 * k2[A2], C2 = h2[G2++];
              z2 = z2 < C2 ? z2 : C2;
              C2 = h2[G2++];
              g2 = g2 < C2 ? g2 : C2;
              C2 = h2[G2++];
              m2 = m2 < C2 ? m2 : C2;
              C2 = h2[G2++];
              B2 = B2 > C2 ? B2 : C2;
              C2 = h2[G2++];
              p2 = p2 > C2 ? p2 : C2;
              C2 = h2[G2++];
              v2 = v2 > C2 ? v2 : C2;
            }
            h2 = this.l;
            c2 *= 12;
            k2 = c2 + 0;
            h2[k2++] = z2;
            h2[k2++] = g2;
            h2[k2++] = m2;
            h2[k2++] = B2;
            h2[k2++] = p2;
            h2[k2] = v2;
            h2[c2 + 6] = 1;
            h2[c2 + 7] = e2 - d2;
            this.u[c2 + 8 >> 2] = d2;
          };
          T.wc = function() {
            for (var c2 = this.l, d2 = this.u, e2 = this.o - 1; 0 <= e2; e2--) {
              var h2 = 12 * e2;
              if (0 == c2[h2 + 6]) {
                var k2 = h2 + 0;
                h2 = 12 * d2[h2 + 8 >> 2];
                for (var g2 = h2 + 12, m2 = 0; 3 > m2; m2++, k2++, h2++, g2++) {
                  var p2 = c2[h2], v2 = c2[g2];
                  c2[k2] = p2 <= v2 ? p2 : v2;
                  p2 = c2[3 + h2];
                  v2 = c2[3 + g2];
                  c2[3 + k2] = p2 >= v2 ? p2 : v2;
                }
              }
            }
            for (e2 = 0; e2 < this.c.length; ++e2) this.c[e2] = this.M[this.c[e2]];
            this.l = c2.subarray(0, 12 * this.o);
            return null;
          };
          T.hc = function() {
            return this.l;
          };
          var Ad = null;
          function Bd() {
            this.Gc();
          }
          T = Bd.prototype;
          T.xb = function(c2) {
            return this.a._malloc(c2);
          };
          T.mb = function(c2) {
            this.a._free(c2);
          };
          T.lc = function(c2, d2, e2, h2) {
            this.a.HEAPU8.set(c2.subarray(d2, d2 + e2), h2);
          };
          T.mc = function(c2, d2, e2, h2) {
            e2.set(this.a.HEAPU8.subarray(c2, c2 + d2), h2);
          };
          T.Ac = function(c2, d2) {
            return this.a._crn_get_decompressed_size(c2, d2);
          };
          T.sc = function(c2, d2, e2, h2) {
            return this.a._crn_decompress(c2, d2, e2, h2);
          };
          T.Gc = function() {
            function c(a2) {
              eval.call(null, a2);
            }
            function d(a2) {
              w.print(a2 + ":\n" + Error().stack);
              throw "Assertion: " + a2;
            }
            function e(a2, b2) {
              a2 || d("Assertion failed: " + b2);
            }
            function h(a, b, n, u) {
              var f = 0;
              try {
                var c = eval("_" + a);
              } catch (Fa) {
                try {
                  c = Kd.Module["_" + a];
                } catch (sf) {
                }
              }
              e(c, "Cannot call unknown function " + a + " (perhaps LLVM optimizations or closure removed it?)");
              var r = 0;
              a = u ? u.map(function(a2) {
                var b2 = n[r++];
                "string" == b2 ? (f || (f = Q.Bb()), b2 = Q.Ma(a2.length + 1), G(a2, b2), a2 = b2) : "array" == b2 && (f || (f = Q.Bb()), b2 = Q.Ma(a2.length), C(a2, b2), a2 = b2);
                return a2;
              }) : [];
              b = (function(a2, b2) {
                if ("string" == b2) return m(a2);
                e("array" != b2);
                return a2;
              })(c.apply(null, a), b);
              f && Q.kd(f);
              return b;
            }
            function k(a2, f2, n2) {
              n2 = n2 || "i8";
              "*" === n2[n2.length - 1] && (n2 = "i32");
              switch (n2) {
                case "i1":
                  D[a2] = f2;
                  break;
                case "i8":
                  D[a2] = f2;
                  break;
                case "i16":
                  Da[a2 >> 1] = f2;
                  break;
                case "i32":
                  b[a2 >> 2] = f2;
                  break;
                case "i64":
                  b[a2 >> 2] = f2;
                  break;
                case "float":
                  Cb[a2 >> 2] = f2;
                  break;
                case "double":
                  Xb[0] = f2;
                  b[a2 >> 2] = cb[0];
                  b[a2 + 4 >> 2] = cb[1];
                  break;
                default:
                  d("invalid type for setValue: " + n2);
              }
            }
            function g(a2, b2, n2) {
              if ("number" === typeof a2) {
                var f2 = true;
                var c2 = a2;
              } else f2 = false, c2 = a2.length;
              var N = "string" === typeof b2 ? b2 : null;
              n2 = [db, Q.Ma, Q.Cb][void 0 === n2 ? 2 : n2](Math.max(c2, N ? 1 : b2.length));
              if (f2) return Xa(n2, 0, c2), n2;
              f2 = 0;
              for (var r2; f2 < c2; ) {
                var d2 = a2[f2];
                "function" === typeof d2 && (d2 = Q.ef(d2));
                r2 = N || b2[f2];
                0 === r2 ? f2++ : ("i64" == r2 && (r2 = "i32"), k(n2 + f2, d2, r2), f2 += Q.Ea(r2));
              }
              return n2;
            }
            function m(a2, b2) {
              for (var f2 = "undefined" == typeof b2, u2 = "", c2 = 0, N, r2 = String.fromCharCode(0); ; ) {
                N = String.fromCharCode(I[a2 + c2]);
                if (f2 && N == r2) break;
                u2 += N;
                c2 += 1;
                if (!f2 && c2 == b2) break;
              }
              return u2;
            }
            function p(a2) {
              for (; 0 < a2.length; ) {
                var b2 = a2.shift(), n2 = b2.Da;
                "number" === typeof n2 && (n2 = Ma[n2]);
                n2(void 0 === b2.gc ? null : b2.gc);
              }
            }
            function v(a2, b2) {
              return Array.prototype.slice.call(D.subarray(a2, a2 + b2));
            }
            function z(a2) {
              for (var b2 = 0; D[a2 + b2]; ) b2++;
              return b2;
            }
            function B(a2, b2) {
              var f2 = z(a2);
              b2 && f2++;
              a2 = v(a2, f2);
              b2 && (a2[f2 - 1] = 0);
              return a2;
            }
            function A(a2, b2, n2) {
              var f2 = [], c2 = 0;
              void 0 === n2 && (n2 = a2.length);
              for (; c2 < n2; ) {
                var N = a2.charCodeAt(c2);
                255 < N && (N &= 255);
                f2.push(N);
                c2 += 1;
              }
              b2 || f2.push(0);
              return f2;
            }
            function G(a2, b2, n2) {
              for (var f2 = 0; f2 < a2.length; ) {
                var c2 = a2.charCodeAt(f2);
                255 < c2 && (c2 &= 255);
                D[b2 + f2] = c2;
                f2 += 1;
              }
              n2 || (D[b2 + f2] = 0);
            }
            function C(a2, b2) {
              for (var f2 = 0; f2 < a2.length; f2++) D[b2 + f2] = a2[f2];
            }
            function R(a2, b2) {
              return 0 <= a2 ? a2 : 32 >= b2 ? 2 * Math.abs(1 << b2 - 1) + a2 : Math.pow(2, b2) + a2;
            }
            function L(a2, b2) {
              if (0 >= a2) return a2;
              var f2 = 32 >= b2 ? Math.abs(1 << b2 - 1) : Math.pow(2, b2 - 1);
              a2 >= f2 && (32 >= b2 || a2 > f2) && (a2 = -2 * f2 + a2);
              return a2;
            }
            function O(a2) {
              return 0 == (a2 | 0) ? 0 : 0 == (a2 - 1 & a2 | 0);
            }
            function sa(a2) {
              a2 = a2 - 1 | 0;
              a2 |= a2 >>> 16;
              a2 |= a2 >>> 8;
              a2 |= a2 >>> 4;
              a2 |= a2 >>> 2;
              return (a2 >>> 1 | a2) + 1 | 0;
            }
            function ka(a2, b2) {
              return a2 >>> 0 < b2 >>> 0 ? a2 : b2;
            }
            function qa(a2, b2) {
              return a2 >>> 0 > b2 >>> 0 ? a2 : b2;
            }
            function P(a2, f2, n2) {
              var u2 = M;
              M += 512;
              var c2 = u2 | 0;
              Ld(c2, q.md | 0, (lb = M, M += 12, b[lb >> 2] = f2, b[lb + 4 >> 2] = n2, b[lb + 8 >> 2] = a2, lb));
              Md(c2);
              M = u2;
            }
            function la(a2, f2, n2, u2, c2) {
              var N = M;
              M += 4;
              var na = N, d2 = a2 + 4 | 0;
              var e2 = (a2 + 8 | 0) >> 2;
              t[d2 >> 2] >>> 0 > t[e2] >>> 0 && P(q.nd | 0, q.a | 0, 2181);
              Math.floor(2147418112 / (u2 >>> 0)) >>> 0 <= f2 >>> 0 && P(q.Vb | 0, q.a | 0, 2182);
              var h2 = t[e2], y = h2 >>> 0 < f2 >>> 0;
              do {
                if (y) {
                  var E = n2 ? O(f2) ? f2 : sa(f2) : f2;
                  0 != (E | 0) & E >>> 0 > h2 >>> 0 || P(q.$b | 0, q.a | 0, 2191);
                  var H = E * u2 | 0;
                  if (0 == (c2 | 0)) {
                    var x = a2 | 0;
                    var l2 = Ea(b[x >> 2], H, na, 1);
                    if (0 == (l2 | 0)) {
                      E = 0;
                      break;
                    }
                    b[x >> 2] = l2;
                  } else {
                    l2 = J(H, na);
                    if (0 == (l2 | 0)) {
                      E = 0;
                      break;
                    }
                    x = (a2 | 0) >> 2;
                    Ma[c2](l2, b[x], b[d2 >> 2]);
                    var g2 = b[x];
                    0 != (g2 | 0) && aa(g2);
                    b[x] = l2;
                  }
                  x = t[na >> 2];
                  b[e2] = x >>> 0 > H >>> 0 ? Math.floor((x >>> 0) / (u2 >>> 0)) : E;
                }
                E = 1;
              } while (0);
              M = N;
              return E;
            }
            function Ea(a2, f2, n2, u2) {
              var c2 = M;
              M += 4;
              var N = c2;
              0 == (a2 & 7 | 0) ? 2147418112 < f2 >>> 0 ? (mb(q.o | 0), n2 = 0) : (b[N >> 2] = f2, a2 = Ma[b[Yb >> 2]](a2, f2, N, u2, b[Zb >> 2]), 0 != (n2 | 0) && (b[n2 >> 2] = b[N >> 2]), 0 != (a2 & 7 | 0) && P(q.u | 0, q.a | 0, 2654), n2 = a2) : (mb(q.Fb | 0), n2 = 0);
              M = c2;
              return n2;
            }
            function J(a2, f2) {
              var n2 = M;
              M += 4;
              var u2 = n2;
              a2 = a2 + 3 & -4;
              a2 = 0 == (a2 | 0) ? 4 : a2;
              if (2147418112 < a2 >>> 0) mb(q.o | 0), f2 = 0;
              else {
                b[u2 >> 2] = a2;
                var c2 = Ma[b[Yb >> 2]](0, a2, u2, 1, b[Zb >> 2]);
                u2 = t[u2 >> 2];
                0 != (f2 | 0) && (b[f2 >> 2] = u2);
                0 == (c2 | 0) | u2 >>> 0 < a2 >>> 0 ? (mb(q.Eb | 0), f2 = 0) : (0 != (c2 & 7 | 0) && P(q.u | 0, q.a | 0, 2629), f2 = c2);
              }
              M = n2;
              return f2;
            }
            function aa(a2) {
              if (0 != (a2 | 0)) if (0 == (a2 & 7 | 0)) Ma[b[Yb >> 2]](a2, 0, 0, 1, b[Zb >> 2]);
              else mb(q.Gb | 0);
            }
            function Ja(a2, f2, n2, u2) {
              var c2 = a2 >> 2, N = M;
              M += 200;
              var r2 = N >> 2;
              var d2 = N + 64;
              var e2 = d2 >> 2;
              var l2 = N + 132, y = 0 == (f2 | 0) | 11 < u2 >>> 0;
              a: do
                if (y) var E = 0;
                else {
                  b[c2] = f2;
                  Ua(d2);
                  for (var H = 0; ; ) {
                    var x = I[n2 + H | 0];
                    if (0 != x << 24 >> 24) {
                      var h2 = ((x & 255) << 2) + d2 | 0;
                      b[h2 >> 2] = b[h2 >> 2] + 1 | 0;
                    }
                    var g2 = H + 1 | 0;
                    if ((g2 | 0) == (f2 | 0)) {
                      var k2 = 1, $b = -1, p2 = 0, m2 = 0, v2 = 0;
                      break;
                    }
                    H = g2;
                  }
                  for (; ; ) {
                    var A2 = t[(k2 << 2 >> 2) + e2];
                    if (0 == (A2 | 0)) {
                      b[((k2 - 1 << 2) + 28 >> 2) + c2] = 0;
                      var w2 = v2, z2 = m2, B2 = p2, G2 = $b;
                    } else {
                      var C2 = ka($b, k2), F2 = qa(p2, k2), K2 = k2 - 1 | 0;
                      b[(K2 << 2 >> 2) + r2] = v2;
                      var J2 = A2 + v2 | 0, U2 = 16 - k2 | 0;
                      b[((K2 << 2) + 28 >> 2) + c2] = (J2 - 1 << U2 | (1 << U2) - 1) + 1 | 0;
                      b[((K2 << 2) + 96 >> 2) + c2] = m2;
                      b[l2 + (k2 << 2) >> 2] = m2;
                      w2 = J2;
                      z2 = A2 + m2 | 0;
                      B2 = F2;
                      G2 = C2;
                    }
                    var L2 = k2 + 1 | 0;
                    if (17 == (L2 | 0)) break;
                    k2 = L2;
                    $b = G2;
                    p2 = B2;
                    m2 = z2;
                    v2 = w2 << 1;
                  }
                  b[c2 + 1] = z2;
                  var ac = (a2 + 172 | 0) >> 2;
                  if (z2 >>> 0 > t[ac] >>> 0) {
                    var R2 = O(z2) ? z2 : ka(f2, sa(z2));
                    b[ac] = R2;
                    var Q2 = a2 + 176 | 0, W = b[Q2 >> 2];
                    if (0 == (W | 0)) var wc = R2;
                    else ab(W), wc = b[ac];
                    var ma2 = Ya(wc);
                    b[Q2 >> 2] = ma2;
                    if (0 == (ma2 | 0)) {
                      E = 0;
                      break;
                    }
                    var fa = Q2;
                  } else fa = a2 + 176 | 0;
                  var ha = a2 + 24 | 0;
                  D[ha] = G2 & 255;
                  D[a2 + 25 | 0] = B2 & 255;
                  for (var ba = 0; ; ) {
                    var ia = I[n2 + ba | 0], ca = ia & 255;
                    if (0 != ia << 24 >> 24) {
                      0 == (b[(ca << 2 >> 2) + e2] | 0) && P(q.ac | 0, q.a | 0, 2334);
                      var ja = (ca << 2) + l2 | 0, V = t[ja >> 2];
                      b[ja >> 2] = V + 1 | 0;
                      V >>> 0 >= z2 >>> 0 && P(q.bc | 0, q.a | 0, 2338);
                      Da[b[fa >> 2] + (V << 1) >> 1] = ba & 65535;
                    }
                    var S = ba + 1 | 0;
                    if ((S | 0) == (f2 | 0)) break;
                    ba = S;
                  }
                  var X = I[ha], ea = (X & 255) >>> 0 < u2 >>> 0 ? u2 : 0, da = a2 + 8 | 0;
                  b[da >> 2] = ea;
                  var xc = 0 != (ea | 0);
                  if (xc) {
                    var oa = 1 << ea, ua = a2 + 164 | 0;
                    if (oa >>> 0 > t[ua >> 2] >>> 0) {
                      b[ua >> 2] = oa;
                      var Y2 = a2 + 168 | 0, yc = b[Y2 >> 2];
                      0 != (yc | 0) && Va(yc);
                      var Ca = va(oa);
                      b[Y2 >> 2] = Ca;
                      if (0 == (Ca | 0)) {
                        E = 0;
                        break a;
                      }
                      Xa(Ca, -1, oa << 2, 1);
                      if (0 == (ea | 0)) var aa2 = 26;
                      else ra2 = Y2, aa2 = 34;
                    } else {
                      var la2 = a2 + 168 | 0;
                      Xa(b[la2 >> 2], -1, oa << 2, 1);
                      var ra2 = la2;
                      aa2 = 34;
                    }
                    b: do
                      if (34 == aa2) for (var pa2 = 1; ; ) {
                        var xa2 = 0 == (b[(pa2 << 2 >> 2) + e2] | 0);
                        c: do
                          if (!xa2) {
                            var Ba = ea - pa2 | 0, Aa2 = 1 << Ba, ta2 = pa2 - 1 | 0, za2 = t[(ta2 << 2 >> 2) + r2], zc = Nd(a2, pa2);
                            if (!(za2 >>> 0 > zc >>> 0)) for (var Ja2 = b[((ta2 << 2) + 96 >> 2) + c2] - za2 | 0, Ha2 = pa2 << 16, ya2 = za2; ; ) {
                              var Ka2 = Z[b[fa >> 2] + (Ja2 + ya2 << 1) >> 1] & 65535;
                              (I[n2 + Ka2 | 0] & 255 | 0) != (pa2 | 0) && P(q.cc | 0, q.a | 0, 2380);
                              for (var La2 = ya2 << Ba, Oa = Ka2 | Ha2, Ga = 0; ; ) {
                                var ub = Ga + La2 | 0;
                                ub >>> 0 >= oa >>> 0 && P(q.ec | 0, q.a | 0, 2386);
                                var vb = t[ra2 >> 2];
                                if (-1 == (b[vb + (ub << 2) >> 2] | 0)) var Ac = vb;
                                else P(q.fc | 0, q.a | 0, 2388), Ac = b[ra2 >> 2];
                                b[Ac + (ub << 2) >> 2] = Oa;
                                var Ia2 = Ga + 1 | 0;
                                if (Ia2 >>> 0 >= Aa2 >>> 0) break;
                                Ga = Ia2;
                              }
                              var wa2 = ya2 + 1 | 0;
                              if (wa2 >>> 0 > zc >>> 0) break c;
                              ya2 = wa2;
                            }
                          }
                        while (0);
                        var Ea2 = pa2 + 1 | 0;
                        if (Ea2 >>> 0 > ea >>> 0) break b;
                        pa2 = Ea2;
                      }
                    while (0);
                    var Ma2 = D[ha];
                  } else Ma2 = X;
                  var Na2 = a2 + 96 | 0;
                  b[Na2 >> 2] = b[Na2 >> 2] - b[r2] | 0;
                  var Qa2 = a2 + 100 | 0;
                  b[Qa2 >> 2] = b[Qa2 >> 2] - b[r2 + 1] | 0;
                  var Sa2 = a2 + 104 | 0;
                  b[Sa2 >> 2] = b[Sa2 >> 2] - b[r2 + 2] | 0;
                  var Bc = a2 + 108 | 0;
                  b[Bc >> 2] = b[Bc >> 2] - b[r2 + 3] | 0;
                  var Cc = a2 + 112 | 0;
                  b[Cc >> 2] = b[Cc >> 2] - b[r2 + 4] | 0;
                  var Gb = a2 + 116 | 0;
                  b[Gb >> 2] = b[Gb >> 2] - b[r2 + 5] | 0;
                  var Pa = a2 + 120 | 0;
                  b[Pa >> 2] = b[Pa >> 2] - b[r2 + 6] | 0;
                  var nb = a2 + 124 | 0;
                  b[nb >> 2] = b[nb >> 2] - b[r2 + 7] | 0;
                  var Ta2 = a2 + 128 | 0;
                  b[Ta2 >> 2] = b[Ta2 >> 2] - b[r2 + 8] | 0;
                  var Dc = a2 + 132 | 0;
                  b[Dc >> 2] = b[Dc >> 2] - b[r2 + 9] | 0;
                  var Ec = a2 + 136 | 0;
                  b[Ec >> 2] = b[Ec >> 2] - b[r2 + 10] | 0;
                  var rb = a2 + 140 | 0;
                  b[rb >> 2] = b[rb >> 2] - b[r2 + 11] | 0;
                  var Hb = a2 + 144 | 0;
                  b[Hb >> 2] = b[Hb >> 2] - b[r2 + 12] | 0;
                  var Ib = a2 + 148 | 0;
                  b[Ib >> 2] = b[Ib >> 2] - b[r2 + 13] | 0;
                  var Jb = a2 + 152 | 0;
                  b[Jb >> 2] = b[Jb >> 2] - b[r2 + 14] | 0;
                  var ob = a2 + 156 | 0;
                  b[ob >> 2] = b[ob >> 2] - b[r2 + 15] | 0;
                  var Kb = a2 + 16 | 0;
                  b[Kb >> 2] = 0;
                  var Za = (a2 + 20 | 0) >> 2;
                  b[Za] = Ma2 & 255;
                  b: do
                    if (xc) {
                      for (var sb = ea; ; ) {
                        if (0 == (sb | 0)) break b;
                        var $a = sb - 1 | 0;
                        if (0 != (b[(sb << 2 >> 2) + e2] | 0)) break;
                        sb = $a;
                      }
                      b[Kb >> 2] = b[(($a << 2) + 28 >> 2) + c2];
                      for (var Lb = ea + 1 | 0, Ra = b[Za] = Lb; ; ) {
                        if (Ra >>> 0 > B2 >>> 0) break b;
                        if (0 != (b[(Ra << 2 >> 2) + e2] | 0)) break;
                        Ra = Ra + 1 | 0;
                      }
                      b[Za] = Ra;
                    }
                  while (0);
                  b[c2 + 23] = -1;
                  b[c2 + 40] = 1048575;
                  b[c2 + 3] = 32 - b[da >> 2] | 0;
                  E = 1;
                }
              while (0);
              M = N;
              return E;
            }
            function Ua(a2) {
              Xa(a2, 0, 68, 1);
            }
            function ab(a2) {
              if (0 != (a2 | 0)) {
                var f2 = b[a2 - 4 >> 2];
                a2 = a2 - 8 | 0;
                var n2 = 0 == (f2 | 0) ? 4 : (f2 | 0) == (b[a2 >> 2] ^ -1 | 0) ? 5 : 4;
                4 == n2 && P(q.M | 0, q.a | 0, 696);
                aa(a2);
              }
            }
            function Ya(a2) {
              a2 = 0 == (a2 | 0) ? 1 : a2;
              var f2 = J((a2 << 1) + 8 | 0, 0);
              0 == (f2 | 0) ? a2 = 0 : (b[f2 + 4 >> 2] = a2, b[f2 >> 2] = a2 ^ -1, a2 = f2 + 8 | 0);
              return a2;
            }
            function Va(a2) {
              if (0 != (a2 | 0)) {
                var f2 = b[a2 - 4 >> 2];
                a2 = a2 - 8 | 0;
                var n2 = 0 == (f2 | 0) ? 4 : (f2 | 0) == (b[a2 >> 2] ^ -1 | 0) ? 5 : 4;
                4 == n2 && P(q.M | 0, q.a | 0, 696);
                aa(a2);
              }
            }
            function va(a2) {
              a2 = 0 == (a2 | 0) ? 1 : a2;
              var f2 = J((a2 << 2) + 8 | 0, 0);
              0 == (f2 | 0) ? a2 = 0 : (b[f2 + 4 >> 2] = a2, b[f2 >> 2] = a2 ^ -1, a2 = f2 + 8 | 0);
              return a2;
            }
            function Nd(a2, f2) {
              0 != (f2 | 0) & 17 > f2 >>> 0 || P(q.Zb | 0, q.a | 0, 2018);
              a2 = b[a2 + (f2 - 1 << 2) + 28 >> 2];
              return 0 == (a2 | 0) ? -1 : (a2 - 1 | 0) >>> ((16 - f2 | 0) >>> 0);
            }
            function pa(a2) {
              return (I[a2 | 0] & 255) << 8 | I[a2 + 1 | 0] & 255;
            }
            function pb(a2) {
              return (I[a2 + 1 | 0] & 255) << 16 | (I[a2 | 0] & 255) << 24 | I[a2 + 3 | 0] & 255 | (I[a2 + 2 | 0] & 255) << 8;
            }
            function Ka(a2) {
              return I[a2 | 0] & 255;
            }
            function Na(a2) {
              return I[a2 + 2 | 0] & 255 | (I[a2 | 0] & 255) << 16 | (I[a2 + 1 | 0] & 255) << 8;
            }
            function Od(a2) {
              return 0 != (D[a2 + 12 | 0] & 1) << 24 >> 24;
            }
            function Pd(a2, f2, n2, u2) {
              0 == (a2 | 0) ? (a2 = db(f2), 0 == (n2 | 0) ? n2 = a2 : (b[n2 >> 2] = 0 == (a2 | 0) ? 0 : bc(a2), n2 = a2)) : 0 == (f2 | 0) ? (eb(a2), 0 != (n2 | 0) && (b[n2 >> 2] = 0), n2 = 0) : (u2 ? (f2 = Qd(a2, f2), 0 == (f2 | 0) ? f2 = 0 : a2 = f2) : f2 = 0, 0 != (n2 | 0) && (b[n2 >> 2] = bc(a2)), n2 = f2);
              return n2;
            }
            function Rd(a2) {
              return 0 == (a2 | 0) ? 0 : bc(a2);
            }
            function mb(a2) {
              P(a2, q.a | 0, 2602);
            }
            function Sd(a2, b2) {
              0 == a2 && 0 == b2 || 9 == a2 && 0 == b2 ? a2 = 4 : 1 == a2 && 0 == b2 || 2 == a2 && 0 == b2 || 7 == a2 && 0 == b2 || 8 == a2 && 0 == b2 || 3 == a2 && 0 == b2 || 4 == a2 && 0 == b2 || 5 == a2 && 0 == b2 || 6 == a2 && 0 == b2 ? a2 = 8 : (P(q.Mb | 0, q.a | 0, 2766), a2 = 0);
              return a2;
            }
            function Fc(a2, b2) {
              return Sd(a2, b2) << 1 & 536870910;
            }
            function Gc(a2, b2, n2) {
              if (0 == (b2 | 0) | 74 > n2 >>> 0) var f2 = 0;
              else 18552 != (pa(b2) | 0) ? f2 = 0 : 74 > pa(b2 + 2 | 0) >>> 0 ? f2 = 0 : pb(b2 + 6 | 0) >>> 0 > n2 >>> 0 ? f2 = 0 : f2 = b2;
              return f2;
            }
            function Sa(a2, f2, n2) {
              var u2 = n2 >> 2;
              0 == (a2 | 0) | 74 > f2 >>> 0 | 0 == (n2 | 0) ? u2 = 0 : 40 != (b[u2] | 0) ? u2 = 0 : (a2 = Gc(0, a2, f2), 0 == (a2 | 0) ? u2 = 0 : (b[u2 + 1] = pa(a2 + 12 | 0), b[u2 + 2] = pa(a2 + 14 | 0), b[u2 + 3] = Ka(a2 + 16 | 0), b[u2 + 4] = Ka(a2 + 17 | 0), f2 = a2 + 18 | 0, n2 = n2 + 32 | 0, b[n2 >> 2] = Ka(f2), b[n2 + 4 >> 2] = 0, n2 = Ka(f2), b[u2 + 5] = 0 == (n2 | 0) ? 8 : 9 == (n2 | 0) ? 8 : 16, b[u2 + 6] = pb(a2 + 25 | 0), b[u2 + 7] = pb(a2 + 29 | 0), u2 = 1));
              return u2;
            }
            function Ha(a2) {
              b[a2 >> 2] = 0;
              Hc(a2 + 4 | 0);
              b[a2 + 20 >> 2] = 0;
            }
            function Hc(a2) {
              Td(a2);
            }
            function Ud(a2, f2) {
              if ((a2 | 0) != (f2 | 0)) {
                b[a2 >> 2] = b[f2 >> 2];
                var n2 = a2 + 4 | 0;
                Vd(n2, f2 + 4 | 0);
                if (Od(n2)) Ic(a2);
                else {
                  n2 = b[f2 + 20 >> 2];
                  f2 = (a2 + 20 | 0) >> 2;
                  var u2 = b[f2];
                  0 == (n2 | 0) ? (cc(u2), b[f2] = 0) : 0 == (u2 | 0) ? (n2 = Wd(n2), b[f2] = n2) : Jc(u2, n2);
                }
              }
              return a2;
            }
            function Xd(a2) {
              Yd(a2);
            }
            function cc(a2) {
              0 != (a2 | 0) && (Zd(a2), aa(a2));
            }
            function Vd(a2, b2) {
              $d(a2, b2);
              return a2;
            }
            function Ic(a2) {
              b[a2 >> 2] = 0;
              dc(a2 + 4 | 0);
              a2 = a2 + 20 | 0;
              var f2 = b[a2 >> 2];
              0 != (f2 | 0) && (cc(f2), b[a2 >> 2] = 0);
            }
            function ae(a2, f2) {
              b[a2 >> 2] = 0;
              Hc(a2 + 4 | 0);
              b[a2 + 20 >> 2] = 0;
              Ud(a2, f2);
            }
            function ya(a2) {
              var f2 = b[a2 + 20 >> 2];
              0 != (f2 | 0) && cc(f2);
              Xd(a2 + 4 | 0);
            }
            function be(a2) {
              var b2 = 0 == (a2 | 0);
              a: do
                if (b2) var n2 = 0;
                else for (b2 = 0; ; ) if (a2 >>>= 1, b2 = b2 + 1 | 0, 0 == (a2 | 0)) {
                  n2 = b2;
                  break a;
                }
              while (0);
              return n2;
            }
            function ce(a2) {
              return b[a2 + 4 >> 2];
            }
            function Kc(a2) {
              a2 >>= 2;
              b[a2] = 0;
              b[a2 + 1] = 0;
              b[a2 + 2] = 0;
              b[a2 + 3] = 0;
              b[a2 + 4] = 0;
              b[a2 + 5] = 0;
            }
            function de(a2) {
              b[a2 + 16 >> 2] = 0;
              b[a2 + 20 >> 2] = 0;
            }
            function Jc(a2, f2) {
              if ((a2 | 0) != (f2 | 0)) {
                ee(a2);
                fb(a2, f2, 180, 1);
                var n2 = f2 + 168 | 0;
                if (0 != (b[n2 >> 2] | 0)) {
                  var u2 = a2 + 164 | 0, c2 = va(b[u2 >> 2]);
                  b[a2 + 168 >> 2] = c2;
                  0 != (c2 | 0) && fb(c2, b[n2 >> 2], b[u2 >> 2] << 2, 1);
                }
                f2 = f2 + 176 | 0;
                0 != (b[f2 >> 2] | 0) && (n2 = a2 + 172 | 0, u2 = Ya(b[n2 >> 2]), b[a2 + 176 >> 2] = u2, 0 != (u2 | 0) && fb(u2, b[f2 >> 2], b[n2 >> 2] << 1, 1));
              }
              return a2;
            }
            function Wd(a2) {
              var b2 = J(180, 0);
              return 0 == (b2 | 0) ? 0 : fe(b2, a2);
            }
            function dc(a2) {
              var f2 = a2 | 0, n2 = b[f2 >> 2];
              if (0 != (n2 | 0)) {
                var u2 = a2 + 4 | 0;
                aa(n2);
                b[f2 >> 2] = 0;
                b[u2 >> 2] = 0;
                b[a2 + 8 >> 2] = 0;
              }
              D[a2 + 12 | 0] = 0;
            }
            function ec(a2, f2) {
              var n2 = (a2 + 4 | 0) >> 2;
              var u2 = t[n2], c2 = (u2 | 0) == (f2 | 0);
              do
                if (c2) var N = 1;
                else {
                  if (u2 >>> 0 <= f2 >>> 0) {
                    if (t[a2 + 8 >> 2] >>> 0 < f2 >>> 0) {
                      if (!Lc(a2, f2, (u2 + 1 | 0) == (f2 | 0))) {
                        N = 0;
                        break;
                      }
                      N = b[n2];
                    } else N = u2;
                    ge(b[a2 >> 2] + N | 0, f2 - N | 0);
                  }
                  b[n2] = f2;
                  N = 1;
                }
              while (0);
              return N;
            }
            function gb(a2, f2) {
              t[a2 + 4 >> 2] >>> 0 <= f2 >>> 0 && P(q.l | 0, q.a | 0, 968);
              return b[a2 >> 2] + f2 | 0;
            }
            function he() {
              var a2 = J(180, 0);
              return 0 == (a2 | 0) ? 0 : ie(a2);
            }
            function je(a2) {
              a2 = t[a2 >> 2];
              return 16 < a2 >>> 0 ? ka(ke(a2) + 1 | 0, 11) & 255 : 0;
            }
            function Mc(a2) {
              var f2 = a2 + 4 | 0, n2 = ce(f2);
              0 != (n2 | 0) & 8193 > n2 >>> 0 || P(q.Pb | 0, q.a | 0, 3106);
              var u2 = a2 | 0;
              b[u2 >> 2] = n2;
              var c2 = a2 + 20 | 0, N = t[c2 >> 2];
              0 == (N | 0) ? (n2 = he(), c2 = b[c2 >> 2] = n2, u2 = b[u2 >> 2]) : (c2 = N, u2 = n2);
              f2 = gb(f2, 0);
              return Ja(c2, u2, f2, je(a2));
            }
            function ke(a2) {
              var b2 = le(a2);
              return 32 == (b2 | 0) ? 32 : (1 << b2 >>> 0 < a2 >>> 0 & 1) + b2 | 0;
            }
            function Ta(a2, b2) {
              0 == (b2 | 0) ? a2 = 0 : 16 < b2 >>> 0 ? (b2 = yb(a2, b2 - 16 | 0), a2 = yb(a2, 16), a2 = b2 << 16 | a2) : a2 = yb(a2, b2);
              return a2;
            }
            function U(a2, f2) {
              var n2 = t[f2 + 20 >> 2] >> 2;
              var u2 = (a2 + 20 | 0) >> 2;
              var c2 = t[u2];
              if (24 > (c2 | 0)) {
                var N = (a2 + 4 | 0) >> 2;
                var r2 = t[N], d2 = t[a2 + 8 >> 2], e2 = r2 >>> 0 < d2 >>> 0;
                16 > (c2 | 0) ? (e2 ? (e2 = r2 + 1 | 0, r2 = (I[r2] & 255) << 8) : (e2 = r2, r2 = 0), e2 >>> 0 < d2 >>> 0 ? (d2 = e2 + 1 | 0, e2 = I[e2] & 255) : (d2 = e2, e2 = 0), b[N] = d2, b[u2] = c2 + 16 | 0, N = a2 + 16 | 0, c2 = (e2 | r2) << 16 - c2 | b[N >> 2], b[N >> 2] = c2) : (e2 ? (b[N] = r2 + 1 | 0, r2 = I[r2] & 255) : r2 = 0, b[u2] = c2 + 8 | 0, N = a2 + 16 | 0, c2 = r2 << 24 - c2 | b[N >> 2], b[N >> 2] = c2);
              } else c2 = b[a2 + 16 >> 2];
              a2 = a2 + 16 | 0;
              N = (c2 >>> 16) + 1 | 0;
              if (N >>> 0 > t[n2 + 4] >>> 0) {
                d2 = t[n2 + 5];
                e2 = d2 - 1 | 0;
                var l2 = N >>> 0 > t[((e2 << 2) + 28 >> 2) + n2] >>> 0;
                a: do
                  if (l2) for (; ; ) {
                    r2 = d2 + 1 | 0;
                    if (N >>> 0 <= t[((d2 << 2) + 28 >> 2) + n2] >>> 0) {
                      var y = d2;
                      break a;
                    }
                    d2 = r2;
                  }
                  else r2 = d2, y = e2;
                while (0);
                c2 = (c2 >>> ((32 - r2 | 0) >>> 0)) + b[((y << 2) + 96 >> 2) + n2] | 0;
                if (c2 >>> 0 < t[f2 >> 2] >>> 0) {
                  x = r2;
                  h2 = Z[b[n2 + 44] + (c2 << 1) >> 1] & 65535;
                  var E = 22;
                } else {
                  P(q.L | 0, q.a | 0, 3375);
                  var H = 0;
                  E = 23;
                }
              } else {
                x = t[b[n2 + 42] + (c2 >>> ((32 - b[n2 + 2] | 0) >>> 0) << 2) >> 2];
                -1 == (x | 0) && P(q.Tb | 0, q.a | 0, 3353);
                n2 = x & 65535;
                x >>>= 16;
                f2 = me(f2 + 4 | 0, n2);
                if ((I[f2] & 255 | 0) == (x | 0)) var x = x, h2 = n2;
                else P(q.Ub | 0, q.a | 0, 3357), h2 = n2;
                E = 22;
              }
              22 == E && (b[a2 >> 2] <<= x, b[u2] = b[u2] - x | 0, H = h2);
              return H;
            }
            function hb(a2, f2, n2) {
              0 == (n2 | 0) ? a2 = 0 : (b[a2 >> 2] = f2, b[a2 + 4 >> 2] = f2, b[a2 + 12 >> 2] = n2, b[a2 + 8 >> 2] = f2 + n2 | 0, de(a2), a2 = 1);
              return a2;
            }
            function yb(a2, f2) {
              33 <= f2 >>> 0 && P(q.Qb | 0, q.a | 0, 3299);
              var n2 = (a2 + 20 | 0) >> 2;
              var u2 = t[n2], c2 = (u2 | 0) < (f2 | 0);
              a: do
                if (c2) {
                  var N = a2 + 4 | 0;
                  c2 = a2 + 8 | 0;
                  for (var d2 = a2 + 16 | 0, e2 = u2; ; ) if (u2 = b[N >> 2], (u2 | 0) == (b[c2 >> 2] | 0) ? u2 = 0 : (b[N >> 2] = u2 + 1 | 0, u2 = I[u2] & 255), e2 = e2 + 8 | 0, b[n2] = e2, 33 > (e2 | 0) || (P(q.Rb | 0, q.a | 0, 3308), e2 = b[n2]), u2 = u2 << 32 - e2 | b[d2 >> 2], b[d2 >> 2] = u2, (e2 | 0) >= (f2 | 0)) {
                    N = e2;
                    d2 = u2;
                    break a;
                  }
                } else N = u2, d2 = b[a2 + 16 >> 2];
              while (0);
              b[a2 + 16 >> 2] = d2 << f2;
              b[n2] = N - f2 | 0;
              return d2 >>> ((32 - f2 | 0) >>> 0);
            }
            function me(a2, f2) {
              t[a2 + 4 >> 2] >>> 0 <= f2 >>> 0 && P(q.l | 0, q.a | 0, 967);
              return b[a2 >> 2] + f2 | 0;
            }
            function wa(a2, b2) {
              var f2 = M;
              M += 24;
              var u2 = f2, c2 = Ta(a2, be(8192));
              if (0 == (c2 | 0)) Ic(b2), a2 = 1;
              else {
                var d2 = b2 + 4 | 0;
                if (ec(d2, c2)) {
                  var r2 = gb(d2, 0);
                  Xa(r2, 0, c2, 1);
                  r2 = Ta(a2, 5);
                  if (0 == (r2 | 0) | 21 < r2 >>> 0) a2 = 0;
                  else {
                    Ha(u2);
                    var e2 = u2 + 4 | 0, h2 = ec(e2, 21);
                    a: do
                      if (h2) {
                        for (var l2 = 0; ; ) {
                          var y = Ta(a2, 3), E = gb(e2, I[q.ba + l2 | 0] & 255);
                          D[E] = y & 255;
                          l2 = l2 + 1 | 0;
                          if ((l2 | 0) == (r2 | 0)) break;
                        }
                        if (Mc(u2)) b: for (r2 = 0; ; ) {
                          l2 = r2 >>> 0 < c2 >>> 0;
                          e2 = c2 - r2 | 0;
                          y = 0 == (r2 | 0);
                          for (E = r2 - 1 | 0; ; ) {
                            if (!l2) {
                              if ((r2 | 0) != (c2 | 0)) {
                                l2 = 0;
                                break a;
                              }
                              l2 = Mc(b2);
                              break a;
                            }
                            h2 = U(a2, u2);
                            if (17 > h2 >>> 0) {
                              e2 = gb(d2, r2);
                              D[e2] = h2 & 255;
                              r2 = r2 + 1 | 0;
                              continue b;
                            }
                            if (17 == (h2 | 0)) {
                              h2 = Ta(a2, 3) + 3 | 0;
                              if (h2 >>> 0 > e2 >>> 0) {
                                l2 = 0;
                                break a;
                              }
                              r2 = h2 + r2 | 0;
                              continue b;
                            } else if (18 == (h2 | 0)) {
                              h2 = Ta(a2, 7) + 11 | 0;
                              if (h2 >>> 0 > e2 >>> 0) {
                                l2 = 0;
                                break a;
                              }
                              r2 = h2 + r2 | 0;
                              continue b;
                            } else {
                              if (2 <= (h2 - 19 | 0) >>> 0) {
                                P(q.L | 0, q.a | 0, 3249);
                                l2 = 0;
                                break a;
                              }
                              var H = 19 == (h2 | 0) ? Ta(a2, 2) + 3 | 0 : Ta(a2, 6) + 7 | 0;
                              if (y | H >>> 0 > e2 >>> 0) {
                                l2 = 0;
                                break a;
                              }
                              h2 = gb(d2, E);
                              h2 = I[h2];
                              if (0 == h2 << 24 >> 24) {
                                l2 = 0;
                                break a;
                              }
                              H = H + r2 | 0;
                              if (r2 >>> 0 < H >>> 0) {
                                e2 = r2;
                                break;
                              }
                            }
                          }
                          for (; ; ) if (r2 = gb(d2, e2), e2 = e2 + 1 | 0, D[r2] = h2, (e2 | 0) == (H | 0)) {
                            r2 = H;
                            continue b;
                          }
                        }
                        else l2 = 0;
                      } else l2 = 0;
                    while (0);
                    ya(u2);
                    a2 = l2;
                  }
                } else a2 = 0;
              }
              M = f2;
              return a2;
            }
            function Nc(a2) {
              return 519686845 == (b[a2 >> 2] | 0);
            }
            function ne(a2, b2) {
              if (0 == (a2 | 0) | 62 > b2 >>> 0) a2 = 0;
              else {
                var f2 = oe();
                0 == (f2 | 0) ? a2 = 0 : pe(f2, a2, b2) ? a2 = f2 : (Oc(f2), a2 = 0);
              }
              return a2;
            }
            function oe() {
              var a2 = J(300, 0);
              return 0 == (a2 | 0) ? 0 : qe(a2);
            }
            function pe(a2, f2, n2) {
              var u2 = Gc(0, f2, n2);
              b[a2 + 88 >> 2] = u2;
              if (0 == (u2 | 0)) var c2 = 0;
              else b[a2 + 4 >> 2] = f2, b[a2 + 8 >> 2] = n2, re(a2) ? c2 = se(a2) : c2 = 0;
              return c2;
            }
            function Oc(a2) {
              0 != (a2 | 0) && (te(a2), aa(a2));
            }
            function ue(a2, b2, n2, u2, c2) {
              if (0 == (a2 | 0) | 0 == (b2 | 0) | 8 > n2 >>> 0 | 15 < c2 >>> 0) var f2 = 0;
              else Nc(a2) ? f2 = ve(a2, b2, n2, u2, c2) : f2 = 0;
              return f2;
            }
            function ve(a2, f2, n2, u2, c2) {
              var d2 = t[a2 + 88 >> 2], r2 = pb((c2 << 2) + d2 + 70 | 0), e2 = b[a2 + 8 >> 2], na = c2 + 1 | 0;
              d2 = na >>> 0 < Ka(d2 + 16 | 0) >>> 0 ? pb((na << 2) + d2 + 70 | 0) : e2;
              d2 >>> 0 <= r2 >>> 0 && P(q.Wb | 0, q.a | 0, 3794);
              return Pc(a2, b[a2 + 4 >> 2] + r2 | 0, d2 - r2 | 0, f2, n2, u2, c2);
            }
            function Pc(a2, f2, n2, u2, c2, d2, r2) {
              var N = a2 + 88 | 0, e2 = t[N >> 2], na = (qa(pa(e2 + 12 | 0) >>> (r2 >>> 0), 1) + 3 | 0) >>> 2;
              r2 = (qa(pa(e2 + 14 | 0) >>> (r2 >>> 0), 1) + 3 | 0) >>> 2;
              e2 = Ka(e2 + 18 | 0);
              e2 = (0 == (e2 | 0) ? 8 : 9 == (e2 | 0) ? 8 : 16) * na | 0;
              if (0 == (d2 | 0)) {
                var y = e2;
                var E = 5;
              } else if (e2 >>> 0 <= d2 >>> 0 & 0 == (d2 & 3 | 0)) y = d2, E = 5;
              else {
                var H = 0;
                E = 12;
              }
              5 == E && ((y * r2 | 0) >>> 0 > c2 >>> 0 ? H = 0 : (c2 = (na + 1 | 0) >>> 1, d2 = (r2 + 1 | 0) >>> 1, hb(a2 + 92 | 0, f2, n2) ? (f2 = Ka(b[N >> 2] + 18 | 0), 0 == (f2 | 0) ? (Qc(a2, u2, 0, y, na, r2, c2, d2), H = 1) : 2 == (f2 | 0) || 3 == (f2 | 0) || 5 == (f2 | 0) || 6 == (f2 | 0) || 4 == (f2 | 0) ? (Rc(a2, u2, 0, y, na, r2, c2, d2), H = 1) : 9 == (f2 | 0) ? (Sc(a2, u2, 0, y, na, r2, c2, d2), H = 1) : 7 == (f2 | 0) || 8 == (f2 | 0) ? (Tc(a2, u2, 0, y, na, r2, c2, d2), H = 1) : H = 0) : H = 0));
              return H;
            }
            function we(a2) {
              0 == (a2 | 0) ? a2 = 0 : Nc(a2) ? (Oc(a2), a2 = 1) : a2 = 0;
              return a2;
            }
            function xe(a2, f2) {
              var n2 = M;
              M += 40;
              var c2 = n2;
              Wa(c2);
              Sa(a2, f2, c2);
              a2 = b[c2 + 4 >> 2];
              M = n2;
              return a2;
            }
            function Wa(a2) {
              ye(a2);
            }
            function ze(a2, f2) {
              var n2 = M;
              M += 40;
              var c2 = n2;
              Wa(c2);
              Sa(a2, f2, c2);
              a2 = b[c2 + 8 >> 2];
              M = n2;
              return a2;
            }
            function Ae(a2, f2) {
              var n2 = M;
              M += 40;
              var c2 = n2;
              Wa(c2);
              Sa(a2, f2, c2);
              a2 = b[c2 + 12 >> 2];
              M = n2;
              return a2;
            }
            function Be(a2, f2) {
              var n2 = M;
              M += 40;
              var c2 = n2;
              Wa(c2);
              Sa(a2, f2, c2);
              a2 = b[(c2 + 32 | 0) >> 2];
              M = n2;
              return a2;
            }
            function Ce(a2, f2) {
              var n2 = M;
              M += 40;
              var c2 = n2;
              Wa(c2);
              Sa(a2, f2, c2);
              a2 = (b[c2 + 4 >> 2] + 3 | 0) >>> 2;
              f2 = (b[c2 + 8 >> 2] + 3 | 0) >>> 2;
              c2 = c2 + 32 | 0;
              c2 = Fc(b[c2 >> 2], b[c2 + 4 >> 2]);
              M = n2;
              return f2 * a2 * c2 | 0;
            }
            function De(a2, f2, n2, c2) {
              var u2 = M;
              M += 44;
              var d2 = u2, r2 = u2 + 40;
              Wa(d2);
              Sa(a2, f2, d2);
              var e2 = (b[d2 + 4 >> 2] + 3 | 0) >>> 2;
              d2 = d2 + 32 | 0;
              d2 = Fc(b[d2 >> 2], b[d2 + 4 >> 2]);
              e2 = e2 * d2 | 0;
              a2 = ne(a2, f2);
              r2 |= 0;
              b[r2 >> 2] = n2;
              ue(a2, r2, c2, e2, 0);
              we(a2);
              M = u2;
            }
            function te(a2) {
              Ee(a2);
            }
            function Ee(a2) {
              Uc(a2);
            }
            function Fe(a2) {
              b[a2 >> 2] = 0;
              b[a2 + 4 >> 2] = 0;
              b[a2 + 8 >> 2] = 0;
              D[a2 + 12 | 0] = 0;
            }
            function Ge(a2) {
              b[a2 >> 2] = 0;
              b[a2 + 4 >> 2] = 0;
              b[a2 + 8 >> 2] = 0;
              D[a2 + 12 | 0] = 0;
            }
            function He(a2) {
              b[a2 + 164 >> 2] = 0;
              b[a2 + 168 >> 2] = 0;
              b[a2 + 172 >> 2] = 0;
              b[a2 + 176 >> 2] = 0;
            }
            function Td(a2) {
              b[a2 >> 2] = 0;
              b[a2 + 4 >> 2] = 0;
              b[a2 + 8 >> 2] = 0;
              D[a2 + 12 | 0] = 0;
            }
            function ye(a2) {
              b[a2 >> 2] = 40;
            }
            function Vc(a2) {
              Ie(a2);
            }
            function Wc(a2) {
              Je(a2);
            }
            function Je(a2) {
              Ke(a2);
            }
            function Ke(a2) {
              var f2 = a2 | 0, n2 = b[f2 >> 2];
              if (0 != (n2 | 0)) {
                var c2 = a2 + 4 | 0;
                aa(n2);
                b[f2 >> 2] = 0;
                b[c2 >> 2] = 0;
                b[a2 + 8 >> 2] = 0;
              }
              D[a2 + 12 | 0] = 0;
            }
            function Ie(a2) {
              Le(a2);
            }
            function Le(a2) {
              var f2 = a2 | 0, n2 = b[f2 >> 2];
              if (0 != (n2 | 0)) {
                var c2 = a2 + 4 | 0;
                aa(n2);
                b[f2 >> 2] = 0;
                b[c2 >> 2] = 0;
                b[a2 + 8 >> 2] = 0;
              }
              D[a2 + 12 | 0] = 0;
            }
            function qe(a2) {
              0 == (a2 | 0) ? a2 = 0 : Me(a2);
              return a2;
            }
            function Me(a2) {
              Ne(a2);
            }
            function Ne(a2) {
              b[a2 >> 2] = 519686845;
              b[a2 + 4 >> 2] = 0;
              b[a2 + 8 >> 2] = 0;
              b[a2 + 88 >> 2] = 0;
              Kc(a2 + 92 | 0);
              Ha(a2 + 116 | 0);
              Ha(a2 + 140 | 0);
              Ha(a2 + 164 | 0);
              Ha(a2 + 188 | 0);
              Ha(a2 + 212 | 0);
              Xc(a2 + 236 | 0);
              Xc(a2 + 252 | 0);
              Yc(a2 + 268 | 0);
              Yc(a2 + 284 | 0);
            }
            function Xc(a2) {
              Ge(a2);
            }
            function Yc(a2) {
              Fe(a2);
            }
            function ie(a2) {
              0 == (a2 | 0) ? a2 = 0 : Oe(a2);
              return a2;
            }
            function Oe(a2) {
              He(a2);
            }
            function Lc(a2, b2, n2) {
              la(a2, b2, n2, 1, 0) ? a2 = 1 : (D[a2 + 12 | 0] = 1, a2 = 0);
              return a2;
            }
            function ge(a2, b2) {
              Xa(a2, 0, b2, 1);
            }
            function fe(a2, b2) {
              0 == (a2 | 0) ? a2 = 0 : Pe(a2, b2);
              return a2;
            }
            function Pe(a2, b2) {
              Qe(a2, b2);
            }
            function Qe(a2, f2) {
              b[a2 + 164 >> 2] = 0;
              b[a2 + 168 >> 2] = 0;
              b[a2 + 172 >> 2] = 0;
              b[a2 + 176 >> 2] = 0;
              Jc(a2, f2);
            }
            function $d(a2, f2) {
              var n2 = (a2 | 0) == (f2 | 0);
              do
                if (n2) var c2 = 1;
                else {
                  c2 = (f2 + 4 | 0) >> 2;
                  if ((b[a2 + 8 >> 2] | 0) == (b[c2] | 0)) ec(a2, 0);
                  else if (dc(a2), !Lc(a2, b[c2], 0)) {
                    c2 = 0;
                    break;
                  }
                  fb(b[a2 >> 2], b[f2 >> 2], b[c2], 1);
                  b[a2 + 4 >> 2] = b[c2];
                  c2 = 1;
                }
              while (0);
              return c2;
            }
            function Zd(a2) {
              Re(a2);
            }
            function Re(a2) {
              Se(a2);
            }
            function Se(a2) {
              var f2 = b[a2 + 168 >> 2];
              0 != (f2 | 0) && Va(f2);
              a2 = b[a2 + 176 >> 2];
              0 != (a2 | 0) && ab(a2);
            }
            function Yd(a2) {
              dc(a2);
            }
            function Qc(a2, f2, c2, u2, d2, N, r2, e2) {
              var n2, na = M;
              M += 24;
              var y = na;
              var E = y >> 2;
              var H = na + 4;
              var x = H >> 2;
              c2 = na + 8 >> 2;
              var h2 = a2 + 236 | 0, l2 = zb(h2), g2 = a2 + 252 | 0, Fa = zb(g2);
              b[E] = 0;
              b[x] = 0;
              var k2 = Ka(b[a2 + 88 >> 2] + 17 | 0), p2 = u2 >>> 2, m2 = 0 == (k2 | 0);
              a: do
                if (!m2) {
                  m2 = 0 == (e2 | 0);
                  var v2 = e2 - 1 | 0;
                  N = 0 != (N & 1 | 0);
                  var A2 = u2 << 1, w2 = a2 + 92 | 0, z2 = a2 + 116 | 0, B2 = a2 + 188 | 0, G2 = p2 + 1 | 0, D2 = p2 + 2 | 0, C2 = p2 + 3 | 0, K2 = r2 - 1 | 0;
                  a2 = a2 + 140 | 0;
                  var F2 = K2 << 4;
                  d2 = 0 != (d2 & 1 | 0);
                  for (var J2 = 0, L2 = 1; ; ) {
                    b: do
                      if (m2) var O2 = L2;
                      else {
                        O2 = b[f2 + (J2 << 2) >> 2];
                        for (var P2 = 0, W = L2; ; ) {
                          if (0 == (P2 & 1 | 0)) {
                            var Q2 = O2;
                            L2 = 16;
                            var Z2 = 1, fa = r2, ha = 0;
                          } else Q2 = O2 + F2 | 0, L2 = -16, fa = Z2 = -1, ha = K2;
                          var ba = (P2 | 0) == (v2 | 0), ia = ba & N, ca = (ha | 0) == (fa | 0);
                          c: do
                            if (ca) var ja = W;
                            else for (ja = ba & N ^ 1, ba = W, W = Q2, Q2 = W >> 2; ; ) {
                              ca = 1 == (ba | 0) ? U(w2, z2) | 512 : ba;
                              ba = ca & 7;
                              ca >>>= 3;
                              var V = I[q.h + ba | 0] & 255;
                              var S = 0;
                              for (n2 = b[E]; ; ) {
                                var X = U(w2, a2);
                                b[E] = n2 + X | 0;
                                ma(y, l2);
                                n2 = t[E];
                                X = za(h2, n2);
                                b[(S << 2 >> 2) + c2] = b[X >> 2];
                                S = S + 1 | 0;
                                if (S >>> 0 >= V >>> 0) break;
                              }
                              V = (ha | 0) == (K2 | 0) & d2;
                              S = W >> 2;
                              n2 = ia | V;
                              d: do
                                if (n2) for (S = 0; ; ) {
                                  var ea = S * u2 | 0;
                                  n2 = ea >> 2;
                                  var da = W + ea | 0, R2 = 0 == (S | 0) | ja;
                                  X = S << 1;
                                  var oa = U(w2, B2);
                                  b[x] = b[x] + oa | 0;
                                  ma(H, Fa);
                                  V ? (R2 ? (b[da >> 2] = b[((I[(ba << 2) + ta + X | 0] & 255) << 2 >> 2) + c2], X = za(g2, b[x]), b[n2 + (Q2 + 1)] = b[X >> 2], n2 = U(w2, B2), b[x] = b[x] + n2 | 0) : (n2 = U(w2, B2), b[x] = b[x] + n2 | 0), ma(H, Fa)) : R2 ? (b[da >> 2] = b[((I[(ba << 2) + ta + X | 0] & 255) << 2 >> 2) + c2], da = za(g2, b[x]), b[n2 + (Q2 + 1)] = b[da >> 2], ea = ea + (W + 8) | 0, da = U(w2, B2), b[x] = b[x] + da | 0, ma(H, Fa), b[ea >> 2] = b[((I[(ba << 2) + ta + (X | 1) | 0] & 255) << 2 >> 2) + c2], X = za(g2, b[x]), b[n2 + (Q2 + 3)] = b[X >> 2]) : (n2 = U(w2, B2), b[x] = b[x] + n2 | 0, ma(H, Fa));
                                  S = S + 1 | 0;
                                  if (2 == (S | 0)) break d;
                                }
                                else b[S] = b[((I[(ba << 2) + ta | 0] & 255) << 2 >> 2) + c2], X = U(w2, B2), b[x] = b[x] + X | 0, ma(H, Fa), X = za(g2, b[x]), b[Q2 + 1] = b[X >> 2], b[Q2 + 2] = b[((I[(ba << 2) + ta + 1 | 0] & 255) << 2 >> 2) + c2], X = U(w2, B2), b[x] = b[x] + X | 0, ma(H, Fa), X = za(g2, b[x]), b[Q2 + 3] = b[X >> 2], b[(p2 << 2 >> 2) + S] = b[((I[(ba << 2) + ta + 2 | 0] & 255) << 2 >> 2) + c2], X = U(w2, B2), b[x] = b[x] + X | 0, ma(H, Fa), X = za(g2, b[x]), b[(G2 << 2 >> 2) + S] = b[X >> 2], b[(D2 << 2 >> 2) + S] = b[((I[(ba << 2) + ta + 3 | 0] & 255) << 2 >> 2) + c2], X = U(w2, B2), b[x] = b[x] + X | 0, ma(H, Fa), X = za(g2, b[x]), b[(C2 << 2 >> 2) + S] = b[X >> 2];
                              while (0);
                              ha = ha + Z2 | 0;
                              if ((ha | 0) == (fa | 0)) {
                                ja = ca;
                                break c;
                              }
                              ba = ca;
                              W = W + L2 | 0;
                              Q2 = W >> 2;
                            }
                          while (0);
                          P2 = P2 + 1 | 0;
                          if ((P2 | 0) == (e2 | 0)) {
                            O2 = ja;
                            break b;
                          }
                          O2 = O2 + A2 | 0;
                          W = ja;
                        }
                      }
                    while (0);
                    J2 = J2 + 1 | 0;
                    if ((J2 | 0) == (k2 | 0)) break a;
                    L2 = O2;
                  }
                }
              while (0);
              M = na;
              return 1;
            }
            function Uc(a2) {
              b[a2 >> 2] = 0;
              Vc(a2 + 284 | 0);
              Vc(a2 + 268 | 0);
              Wc(a2 + 252 | 0);
              Wc(a2 + 236 | 0);
              var f2 = a2 + 188 | 0;
              ya(a2 + 212 | 0);
              ya(f2);
              f2 = a2 + 140 | 0;
              ya(a2 + 164 | 0);
              ya(f2);
              ya(a2 + 116 | 0);
            }
            function ma(a2, f2) {
              var c2 = b[a2 >> 2];
              f2 = c2 - f2 | 0;
              var u2 = f2 >> 31;
              b[a2 >> 2] = u2 & c2 | f2 & (u2 ^ -1);
            }
            function fc(a2) {
              return b[a2 + 4 >> 2];
            }
            function zb(a2) {
              return b[a2 + 4 >> 2];
            }
            function Rc(a2, f2, c2, u2, d2, N, r2, e2) {
              var n2 = M;
              M += 48;
              var na = n2;
              var y = na >> 2;
              var E = n2 + 4;
              var H = E >> 2;
              var x = n2 + 8;
              var h2 = x >> 2;
              var l2 = n2 + 12;
              var g2 = l2 >> 2;
              var Fa = n2 + 16 >> 2;
              c2 = n2 + 32 >> 2;
              var k2 = a2 + 236 | 0, p2 = zb(k2), m2 = a2 + 252 | 0, v2 = zb(m2), w2 = a2 + 268 | 0, A2 = fc(w2), z2 = b[a2 + 88 >> 2], B2 = pa(z2 + 63 | 0);
              b[y] = 0;
              b[H] = 0;
              b[h2] = 0;
              b[g2] = 0;
              z2 = Ka(z2 + 17 | 0);
              var G2 = 0 == (z2 | 0);
              a: do
                if (!G2) {
                  G2 = 0 == (e2 | 0);
                  var D2 = e2 - 1 | 0;
                  N = 0 == (N & 1 | 0);
                  var K2 = u2 << 1, C2 = a2 + 92 | 0, F2 = a2 + 116 | 0, J2 = a2 + 212 | 0, L2 = a2 + 188 | 0, O2 = a2 + 284 | 0, P2 = a2 + 140 | 0;
                  a2 = a2 + 164 | 0;
                  var W = r2 - 1 | 0, Q2 = W << 5;
                  d2 = 0 != (d2 & 1 | 0);
                  for (var R2 = 0, fa = 1; ; ) {
                    b: do
                      if (G2) var ha = fa;
                      else {
                        ha = b[f2 + (R2 << 2) >> 2];
                        for (var ba = 0, ia = fa; ; ) {
                          if (0 == (ba & 1 | 0)) {
                            var ca = ha;
                            fa = 32;
                            var ja = 1, V = r2, S = 0;
                          } else ca = ha + Q2 | 0, fa = -32, V = ja = -1, S = W;
                          var X = N | (ba | 0) != (D2 | 0);
                          var ea = (S | 0) == (V | 0);
                          c: do
                            if (ea) var da = ia;
                            else for (da = ia; ; ) {
                              ia = 1 == (da | 0) ? U(C2, F2) | 512 : da;
                              da = ia & 7;
                              ia >>>= 3;
                              ea = I[q.h + da | 0] & 255;
                              for (var Y2 = 0, oa = b[h2]; ; ) {
                                var ua = U(C2, a2);
                                b[h2] = oa + ua | 0;
                                ma(x, A2);
                                oa = t[h2];
                                ua = Aa(w2, oa);
                                b[(Y2 << 2 >> 2) + c2] = Z[ua >> 1] & 65535;
                                Y2 = Y2 + 1 | 0;
                                if (Y2 >>> 0 >= ea >>> 0) break;
                              }
                              Y2 = 0;
                              for (oa = b[y]; !(ua = U(C2, P2), b[y] = oa + ua | 0, ma(na, p2), oa = t[y], ua = za(k2, oa), b[(Y2 << 2 >> 2) + Fa] = b[ua >> 2], Y2 = Y2 + 1 | 0, Y2 >>> 0 >= ea >>> 0); ) ;
                              Y2 = (S | 0) == (W | 0) & d2;
                              oa = ca;
                              ea = oa >> 2;
                              for (ua = 0; ; ) {
                                var ka2 = 0 == (ua | 0) | X;
                                var aa2 = ua << 1;
                                var Ca = U(C2, J2);
                                b[g2] = b[g2] + Ca | 0;
                                ma(l2, B2);
                                Ca = U(C2, L2);
                                b[H] = b[H] + Ca | 0;
                                ma(E, v2);
                                if (ka2) {
                                  var ra2 = oa, la2 = I[(da << 2) + ta + aa2 | 0] & 255;
                                  Ca = Aa(O2, 3 * b[g2] | 0) >> 1;
                                  b[ra2 >> 2] = (Z[Ca] & 65535) << 16 | b[(la2 << 2 >> 2) + c2];
                                  b[ea + 1] = (Z[Ca + 2] & 65535) << 16 | Z[Ca + 1] & 65535;
                                  b[ea + 2] = b[(la2 << 2 >> 2) + Fa];
                                  Ca = za(m2, b[H]);
                                  b[ea + 3] = b[Ca >> 2];
                                }
                                Ca = U(C2, J2);
                                b[g2] = b[g2] + Ca | 0;
                                ma(l2, B2);
                                Ca = U(C2, L2);
                                b[H] = b[H] + Ca | 0;
                                ma(E, v2);
                                Y2 | ka2 ^ 1 || (ka2 = oa + 16 | 0, Ca = I[(da << 2) + ta + (aa2 | 1) | 0] & 255, aa2 = Aa(O2, 3 * b[g2] | 0) >> 1, b[ka2 >> 2] = (Z[aa2] & 65535) << 16 | b[(Ca << 2 >> 2) + c2], b[ea + 5] = (Z[aa2 + 2] & 65535) << 16 | Z[aa2 + 1] & 65535, b[ea + 6] = b[(Ca << 2 >> 2) + Fa], aa2 = za(m2, b[H]), b[ea + 7] = b[aa2 >> 2]);
                                ua = ua + 1 | 0;
                                if (2 == (ua | 0)) break;
                                oa = oa + u2 | 0;
                                ea = oa >> 2;
                              }
                              S = S + ja | 0;
                              if ((S | 0) == (V | 0)) {
                                da = ia;
                                break c;
                              }
                              da = ia;
                              ca = ca + fa | 0;
                            }
                          while (0);
                          ba = ba + 1 | 0;
                          if ((ba | 0) == (e2 | 0)) {
                            ha = da;
                            break b;
                          }
                          ha = ha + K2 | 0;
                          ia = da;
                        }
                      }
                    while (0);
                    R2 = R2 + 1 | 0;
                    if ((R2 | 0) == (z2 | 0)) break a;
                    fa = ha;
                  }
                }
              while (0);
              M = n2;
              return 1;
            }
            function Sc(a2, f2, c2, u2, d2, N, r2, e2) {
              var n2, na = M;
              M += 24;
              var y = na;
              var E = y >> 2;
              var H = na + 4;
              var x = H >> 2;
              c2 = na + 8 >> 2;
              var h2 = a2 + 268 | 0, l2 = fc(h2), g2 = b[a2 + 88 >> 2], k2 = pa(g2 + 63 | 0);
              b[E] = 0;
              b[x] = 0;
              g2 = Ka(g2 + 17 | 0);
              var Fa = 0 == (g2 | 0);
              a: do
                if (!Fa) {
                  Fa = 0 == (e2 | 0);
                  var p2 = e2 - 1 | 0;
                  N = 0 == (N & 1 | 0);
                  var m2 = u2 << 1, v2 = a2 + 92 | 0, w2 = a2 + 116 | 0;
                  d2 = 0 == (d2 & 1 | 0);
                  var z2 = a2 + 164 | 0, A2 = a2 + 212 | 0;
                  a2 = a2 + 284 | 0;
                  for (var B2 = r2 - 1 | 0, C2 = B2 << 4, G2 = 0, D2 = 1; ; ) {
                    b: do
                      if (Fa) var K2 = D2;
                      else {
                        K2 = b[f2 + (G2 << 2) >> 2];
                        for (var F2 = 0, J2 = D2; ; ) {
                          if (0 == (F2 & 1 | 0)) {
                            var L2 = K2;
                            D2 = 16;
                            var O2 = 1, P2 = r2, W = 0;
                          } else L2 = K2 + C2 | 0, D2 = -16, P2 = O2 = -1, W = B2;
                          var Q2 = N | (F2 | 0) != (p2 | 0), R2 = (W | 0) == (P2 | 0);
                          c: do
                            if (R2) var fa = J2;
                            else for (fa = J2; ; ) {
                              J2 = 1 == (fa | 0) ? U(v2, w2) | 512 : fa;
                              fa = J2 & 7;
                              J2 >>>= 3;
                              var ha = I[q.h + fa | 0] & 255;
                              R2 = d2 | (W | 0) != (B2 | 0);
                              var ba = 0;
                              for (n2 = b[E]; ; ) {
                                var ia = U(v2, z2);
                                b[E] = n2 + ia | 0;
                                ma(y, l2);
                                n2 = t[E];
                                ia = Aa(h2, n2);
                                b[(ba << 2 >> 2) + c2] = Z[ia >> 1] & 65535;
                                ba = ba + 1 | 0;
                                if (ba >>> 0 >= ha >>> 0) {
                                  ha = L2;
                                  n2 = ha >> 2;
                                  ba = 0;
                                  break;
                                }
                              }
                              for (; ; ) {
                                ia = ha;
                                var ca = 0 == (ba | 0) | Q2;
                                var ja = ba << 1;
                                var V = U(v2, A2);
                                b[x] = b[x] + V | 0;
                                ma(H, k2);
                                R2 ? ca ? (V = I[(fa << 2) + ta + ja | 0] & 255, ca = Aa(a2, 3 * b[x] | 0) >> 1, b[ia >> 2] = (Z[ca] & 65535) << 16 | b[(V << 2 >> 2) + c2], b[n2 + 1] = (Z[ca + 2] & 65535) << 16 | Z[ca + 1] & 65535, ia = ha + 8 | 0, ca = U(v2, A2), b[x] = b[x] + ca | 0, ma(H, k2), ca = I[(fa << 2) + ta + (ja | 1) | 0] & 255, ja = Aa(a2, 3 * b[x] | 0) >> 1, b[ia >> 2] = (Z[ja] & 65535) << 16 | b[(ca << 2 >> 2) + c2], b[n2 + 3] = (Z[ja + 2] & 65535) << 16 | Z[ja + 1] & 65535) : (n2 = U(v2, A2), b[x] = b[x] + n2 | 0, ma(H, k2)) : (ca ? (ca = I[(fa << 2) + ta + ja | 0] & 255, ja = Aa(a2, 3 * b[x] | 0) >> 1, b[ia >> 2] = (Z[ja] & 65535) << 16 | b[(ca << 2 >> 2) + c2], b[n2 + 1] = (Z[ja + 2] & 65535) << 16 | Z[ja + 1] & 65535, n2 = U(v2, A2), b[x] = b[x] + n2 | 0) : (n2 = U(v2, A2), b[x] = b[x] + n2 | 0), ma(H, k2));
                                ba = ba + 1 | 0;
                                if (2 == (ba | 0)) break;
                                ha = ha + u2 | 0;
                                n2 = ha >> 2;
                              }
                              W = W + O2 | 0;
                              if ((W | 0) == (P2 | 0)) {
                                fa = J2;
                                break c;
                              }
                              fa = J2;
                              L2 = L2 + D2 | 0;
                            }
                          while (0);
                          F2 = F2 + 1 | 0;
                          if ((F2 | 0) == (e2 | 0)) {
                            K2 = fa;
                            break b;
                          }
                          K2 = K2 + m2 | 0;
                          J2 = fa;
                        }
                      }
                    while (0);
                    G2 = G2 + 1 | 0;
                    if ((G2 | 0) == (g2 | 0)) break a;
                    D2 = K2;
                  }
                }
              while (0);
              M = na;
              return 1;
            }
            function Tc(a2, f2, c2, u2, d2, e2, r2, h2) {
              var n2 = M;
              M += 48;
              var N = n2;
              var y = N >> 2;
              var E = n2 + 4;
              var na = E >> 2;
              var x = n2 + 8;
              var l2 = x >> 2;
              var g2 = n2 + 12;
              var k2 = g2 >> 2;
              var Fa = n2 + 16 >> 2;
              c2 = n2 + 32 >> 2;
              var p2 = a2 + 268 | 0, m2 = fc(p2), v2 = b[a2 + 88 >> 2], w2 = pa(v2 + 63 | 0);
              b[y] = 0;
              b[na] = 0;
              b[l2] = 0;
              b[k2] = 0;
              v2 = Ka(v2 + 17 | 0);
              var A2 = 0 == (v2 | 0);
              a: do
                if (!A2) {
                  A2 = 0 == (h2 | 0);
                  var z2 = h2 - 1 | 0;
                  e2 = 0 == (e2 & 1 | 0);
                  var B2 = u2 << 1, K2 = a2 + 92 | 0, G2 = a2 + 116 | 0, D2 = a2 + 212 | 0, C2 = a2 + 284 | 0;
                  a2 = a2 + 164 | 0;
                  var F2 = r2 - 1 | 0, J2 = F2 << 5;
                  d2 = 0 != (d2 & 1 | 0);
                  for (var L2 = 0, O2 = 1; ; ) {
                    b: do
                      if (A2) var P2 = O2;
                      else {
                        P2 = b[f2 + (L2 << 2) >> 2];
                        for (var Q2 = 0, W = O2; ; ) {
                          if (0 == (Q2 & 1 | 0)) {
                            var R2 = P2;
                            O2 = 32;
                            var Y2 = 1, fa = r2, ha = 0;
                          } else R2 = P2 + J2 | 0, O2 = -32, fa = Y2 = -1, ha = F2;
                          var ba = e2 | (Q2 | 0) != (z2 | 0);
                          var ia = (ha | 0) == (fa | 0);
                          c: do
                            if (ia) var ca = W;
                            else for (ca = W; ; ) {
                              W = 1 == (ca | 0) ? U(K2, G2) | 512 : ca;
                              ca = W & 7;
                              W >>>= 3;
                              ia = I[q.h + ca | 0] & 255;
                              for (var ja = 0, V = b[y]; ; ) {
                                var S = U(K2, a2);
                                b[y] = V + S | 0;
                                ma(N, m2);
                                V = t[y];
                                S = Aa(p2, V);
                                b[(ja << 2 >> 2) + Fa] = Z[S >> 1] & 65535;
                                ja = ja + 1 | 0;
                                if (ja >>> 0 >= ia >>> 0) break;
                              }
                              ja = 0;
                              for (V = b[l2]; !(S = U(K2, a2), b[l2] = V + S | 0, ma(x, m2), V = t[l2], S = Aa(p2, V), b[(ja << 2 >> 2) + c2] = Z[S >> 1] & 65535, ja = ja + 1 | 0, ja >>> 0 >= ia >>> 0); ) ;
                              ja = (ha | 0) == (F2 | 0) & d2;
                              V = R2;
                              ia = V >> 2;
                              for (S = 0; ; ) {
                                var X = 0 == (S | 0) | ba;
                                var ea = S << 1;
                                var da = U(K2, D2);
                                b[na] = b[na] + da | 0;
                                ma(E, w2);
                                da = U(K2, D2);
                                b[k2] = b[k2] + da | 0;
                                ma(g2, w2);
                                if (X) {
                                  var aa2 = V, oa = I[(ca << 2) + ta + ea | 0] & 255;
                                  var ua = Aa(C2, 3 * b[na] | 0) >> 1;
                                  da = Aa(C2, 3 * b[k2] | 0) >> 1;
                                  b[aa2 >> 2] = (Z[ua] & 65535) << 16 | b[(oa << 2 >> 2) + Fa];
                                  b[ia + 1] = (Z[ua + 2] & 65535) << 16 | Z[ua + 1] & 65535;
                                  b[ia + 2] = (Z[da] & 65535) << 16 | b[(oa << 2 >> 2) + c2];
                                  b[ia + 3] = (Z[da + 2] & 65535) << 16 | Z[da + 1] & 65535;
                                }
                                da = U(K2, D2);
                                b[na] = b[na] + da | 0;
                                ma(E, w2);
                                da = U(K2, D2);
                                b[k2] = b[k2] + da | 0;
                                ma(g2, w2);
                                ja | X ^ 1 || (X = V + 16 | 0, ua = I[(ca << 2) + ta + (ea | 1) | 0] & 255, da = Aa(C2, 3 * b[na] | 0) >> 1, ea = Aa(C2, 3 * b[k2] | 0) >> 1, b[X >> 2] = (Z[da] & 65535) << 16 | b[(ua << 2 >> 2) + Fa], b[ia + 5] = (Z[da + 2] & 65535) << 16 | Z[da + 1] & 65535, b[ia + 6] = (Z[ea] & 65535) << 16 | b[(ua << 2 >> 2) + c2], b[ia + 7] = (Z[ea + 2] & 65535) << 16 | Z[ea + 1] & 65535);
                                S = S + 1 | 0;
                                if (2 == (S | 0)) break;
                                V = V + u2 | 0;
                                ia = V >> 2;
                              }
                              ha = ha + Y2 | 0;
                              if ((ha | 0) == (fa | 0)) {
                                ca = W;
                                break c;
                              }
                              ca = W;
                              R2 = R2 + O2 | 0;
                            }
                          while (0);
                          Q2 = Q2 + 1 | 0;
                          if ((Q2 | 0) == (h2 | 0)) {
                            P2 = ca;
                            break b;
                          }
                          P2 = P2 + B2 | 0;
                          W = ca;
                        }
                      }
                    while (0);
                    L2 = L2 + 1 | 0;
                    if ((L2 | 0) == (v2 | 0)) break a;
                    O2 = P2;
                  }
                }
              while (0);
              M = n2;
              return 1;
            }
            function Aa(a2, f2) {
              t[a2 + 4 >> 2] >>> 0 <= f2 >>> 0 && P(q.l | 0, q.a | 0, 968);
              return (f2 << 1) + b[a2 >> 2] | 0;
            }
            function za(a2, f2) {
              t[a2 + 4 >> 2] >>> 0 <= f2 >>> 0 && P(q.l | 0, q.a | 0, 968);
              return (f2 << 2) + b[a2 >> 2] | 0;
            }
            function re(a2) {
              var f2 = a2 + 92 | 0, c2 = b[a2 + 4 >> 2];
              var u2 = (a2 + 88 | 0) >> 2;
              var d2 = b[u2];
              c2 = hb(f2, c2 + Na(d2 + 67 | 0) | 0, pa(d2 + 65 | 0));
              do
                if (c2) if (wa(f2, a2 + 116 | 0)) {
                  d2 = b[u2];
                  if (0 == (pa(d2 + 39 | 0) | 0)) {
                    if (0 == (pa(d2 + 55 | 0) | 0)) {
                      d2 = 0;
                      break;
                    }
                  } else {
                    if (!wa(f2, a2 + 140 | 0)) {
                      d2 = 0;
                      break;
                    }
                    if (!wa(f2, a2 + 188 | 0)) {
                      d2 = 0;
                      break;
                    }
                    d2 = b[u2];
                  }
                  if (0 != (pa(d2 + 55 | 0) | 0)) {
                    if (!wa(f2, a2 + 164 | 0)) {
                      d2 = 0;
                      break;
                    }
                    if (!wa(f2, a2 + 212 | 0)) {
                      d2 = 0;
                      break;
                    }
                  }
                  d2 = 1;
                } else d2 = 0;
                else d2 = 0;
              while (0);
              return d2;
            }
            function le(a2) {
              var b2 = 1 < a2 >>> 0;
              a: do
                if (b2) for (b2 = 0; ; ) {
                  b2 = b2 + 1 | 0;
                  if (3 >= a2 >>> 0) {
                    var c2 = b2;
                    break a;
                  }
                  a2 >>>= 1;
                }
                else c2 = 0;
              while (0);
              return c2;
            }
            function se(a2) {
              var f2 = a2 + 88 | 0, c2 = b[f2 >> 2];
              if (0 == (pa(c2 + 39 | 0) | 0)) {
                d2 = c2;
                var u2 = 5;
              } else if (Zc(a2)) if ($c(a2)) {
                var d2 = b[f2 >> 2];
                u2 = 5;
              } else e2 = 0, u2 = 9;
              else {
                var e2 = 0;
                u2 = 9;
              }
              do
                if (5 == u2) {
                  if (0 != (pa(d2 + 55 | 0) | 0)) {
                    if (!ad(a2)) {
                      e2 = 0;
                      break;
                    }
                    if (!bd(a2)) {
                      e2 = 0;
                      break;
                    }
                  }
                  e2 = 1;
                }
              while (0);
              return e2;
            }
            function cd(a2) {
              Xa(a2, 0, 64, 1);
            }
            function dd(a2, f2) {
              var c2 = (a2 + 4 | 0) >> 2;
              var u2 = t[c2], d2 = (u2 | 0) == (f2 | 0);
              do
                if (d2) var e2 = 1;
                else {
                  if (u2 >>> 0 <= f2 >>> 0) {
                    if (t[a2 + 8 >> 2] >>> 0 < f2 >>> 0) {
                      if (!Te(a2, f2, (u2 + 1 | 0) == (f2 | 0))) {
                        e2 = 0;
                        break;
                      }
                      e2 = b[c2];
                    } else e2 = u2;
                    Ue((e2 << 1) + b[a2 >> 2] | 0, f2 - e2 | 0);
                  }
                  b[c2] = f2;
                  e2 = 1;
                }
              while (0);
              return e2;
            }
            function Te(a2, b2, c2) {
              la(a2, b2, c2, 2, 0) ? a2 = 1 : (D[a2 + 12 | 0] = 1, a2 = 0);
              return a2;
            }
            function Ue(a2, b2) {
              Xa(a2, 0, b2 << 1, 1);
            }
            function ed(a2, f2) {
              var c2 = (a2 + 4 | 0) >> 2;
              var u2 = t[c2], d2 = (u2 | 0) == (f2 | 0);
              do
                if (d2) var e2 = 1;
                else {
                  if (u2 >>> 0 <= f2 >>> 0) {
                    if (t[a2 + 8 >> 2] >>> 0 < f2 >>> 0) {
                      if (!Ve(a2, f2, (u2 + 1 | 0) == (f2 | 0))) {
                        e2 = 0;
                        break;
                      }
                      e2 = b[c2];
                    } else e2 = u2;
                    We((e2 << 2) + b[a2 >> 2] | 0, f2 - e2 | 0);
                  }
                  b[c2] = f2;
                  e2 = 1;
                }
              while (0);
              return e2;
            }
            function Ve(a2, b2, c2) {
              la(a2, b2, c2, 4, 0) ? a2 = 1 : (D[a2 + 12 | 0] = 1, a2 = 0);
              return a2;
            }
            function We(a2, b2) {
              Xa(a2, 0, b2 << 2, 1);
            }
            function ee(a2) {
              var f2 = a2 + 168 | 0, c2 = b[f2 >> 2];
              0 != (c2 | 0) && (Va(c2), b[f2 >> 2] = 0, b[a2 + 164 >> 2] = 0);
              f2 = a2 + 176 | 0;
              c2 = b[f2 >> 2];
              0 != (c2 | 0) && (ab(c2), b[f2 >> 2] = 0, b[a2 + 172 >> 2] = 0);
            }
            function Zc(a2) {
              var f2 = M;
              M += 48;
              var c2 = f2, u2 = a2 + 88 | 0, d2 = pa(b[u2 >> 2] + 39 | 0), e2 = a2 + 236 | 0;
              if (ed(e2, d2)) {
                var r2 = a2 + 92 | 0;
                u2 = b[u2 >> 2];
                if (hb(r2, b[a2 + 4 >> 2] + Na(u2 + 33 | 0) | 0, Na(u2 + 36 | 0))) {
                  a2 = c2 | 0;
                  Ha(a2);
                  u2 = c2 + 24 | 0;
                  Ha(u2);
                  for (var h2 = 0; ; ) {
                    if (2 <= h2 >>> 0) {
                      var l2 = 9;
                      break;
                    }
                    if (!wa(r2, c2 + 24 * h2 | 0)) {
                      var g2 = 0;
                      l2 = 11;
                      break;
                    }
                    h2 = h2 + 1 | 0;
                  }
                  a: do
                    if (9 == l2) if (c2 = za(e2, 0), 0 == (d2 | 0)) g2 = 1;
                    else {
                      var y = g2 = e2 = 0, E = 0, H = 0, x = 0;
                      for (h2 = 0; ; ) {
                        x = U(r2, a2) + x & 31;
                        H = U(r2, u2) + H & 63;
                        E = U(r2, a2) + E & 31;
                        var k2 = U(r2, a2) + y | 0;
                        y = k2 & 31;
                        g2 = U(r2, u2) + g2 & 63;
                        e2 = U(r2, a2) + e2 & 31;
                        b[c2 >> 2] = H << 5 | x << 11 | E | k2 << 27 | g2 << 21 | e2 << 16;
                        h2 = h2 + 1 | 0;
                        if ((h2 | 0) == (d2 | 0)) {
                          g2 = 1;
                          break a;
                        }
                        c2 = c2 + 4 | 0;
                      }
                    }
                  while (0);
                  ya(u2);
                  ya(a2);
                  d2 = g2;
                } else d2 = 0;
              } else d2 = 0;
              M = f2;
              return d2;
            }
            function $c(a2) {
              var f2 = M;
              M += 480;
              var c2 = f2, u2 = f2 + 24, d2 = f2 + 220, e2 = f2 + 416, r2 = b[a2 + 88 >> 2], h2 = pa(r2 + 47 | 0), l2 = a2 + 92 | 0;
              if (hb(l2, b[a2 + 4 >> 2] + Na(r2 + 41 | 0) | 0, Na(r2 + 44 | 0))) {
                Ha(c2);
                r2 = wa(l2, c2);
                a: do
                  if (r2) {
                    for (var g2 = -3, y = -3, E = 0; ; ) {
                      b[u2 + (E << 2) >> 2] = g2;
                      b[d2 + (E << 2) >> 2] = y;
                      g2 = g2 + 1 | 0;
                      var H = 3 < (g2 | 0);
                      y = (H & 1) + y | 0;
                      E = E + 1 | 0;
                      if (49 == (E | 0)) break;
                      g2 = H ? -3 : g2;
                    }
                    cd(e2);
                    y = a2 + 252 | 0;
                    if (ed(y, h2)) {
                      var x = za(y, 0);
                      if (0 == (h2 | 0)) y = 1;
                      else {
                        a2 = e2 | 0;
                        r2 = e2 + 4 | 0;
                        y = e2 + 8 | 0;
                        E = e2 + 12 | 0;
                        g2 = e2 + 16 | 0;
                        H = e2 + 20 | 0;
                        for (var k2 = e2 + 24 | 0, t2 = e2 + 28 | 0, p2 = e2 + 32 | 0, m2 = e2 + 36 | 0, v2 = e2 + 40 | 0, w2 = e2 + 44 | 0, A2 = e2 + 48 | 0, z2 = e2 + 52 | 0, B2 = e2 + 56 | 0, K2 = e2 + 60 | 0, D2 = 0; ; ) {
                          for (var C2 = 0; ; ) {
                            var G2 = U(l2, c2), F2 = C2 << 1, J2 = (F2 << 2) + e2 | 0;
                            b[J2 >> 2] = b[J2 >> 2] + b[u2 + (G2 << 2) >> 2] & 3;
                            F2 = ((F2 | 1) << 2) + e2 | 0;
                            b[F2 >> 2] = b[F2 >> 2] + b[d2 + (G2 << 2) >> 2] & 3;
                            C2 = C2 + 1 | 0;
                            if (8 == (C2 | 0)) break;
                          }
                          b[x >> 2] = (I[q.c + b[r2 >> 2] | 0] & 255) << 2 | I[q.c + b[a2 >> 2] | 0] & 255 | (I[q.c + b[y >> 2] | 0] & 255) << 4 | (I[q.c + b[E >> 2] | 0] & 255) << 6 | (I[q.c + b[g2 >> 2] | 0] & 255) << 8 | (I[q.c + b[H >> 2] | 0] & 255) << 10 | (I[q.c + b[k2 >> 2] | 0] & 255) << 12 | (I[q.c + b[t2 >> 2] | 0] & 255) << 14 | (I[q.c + b[p2 >> 2] | 0] & 255) << 16 | (I[q.c + b[m2 >> 2] | 0] & 255) << 18 | (I[q.c + b[v2 >> 2] | 0] & 255) << 20 | (I[q.c + b[w2 >> 2] | 0] & 255) << 22 | (I[q.c + b[A2 >> 2] | 0] & 255) << 24 | (I[q.c + b[z2 >> 2] | 0] & 255) << 26 | (I[q.c + b[B2 >> 2] | 0] & 255) << 28 | (I[q.c + b[K2 >> 2] | 0] & 255) << 30;
                          D2 = D2 + 1 | 0;
                          if ((D2 | 0) == (h2 | 0)) {
                            y = 1;
                            break a;
                          }
                          x = x + 4 | 0;
                        }
                      }
                    } else y = 0;
                  } else y = 0;
                while (0);
                ya(c2);
                c2 = y;
              } else c2 = 0;
              M = f2;
              return c2;
            }
            function ad(a2) {
              var f2 = M;
              M += 24;
              var c2 = f2, u2 = b[a2 + 88 >> 2], d2 = pa(u2 + 55 | 0), e2 = a2 + 92 | 0;
              if (hb(e2, b[a2 + 4 >> 2] + Na(u2 + 49 | 0) | 0, Na(u2 + 52 | 0))) {
                Ha(c2);
                u2 = wa(e2, c2);
                a: do
                  if (u2) {
                    var r2 = a2 + 268 | 0;
                    if (dd(r2, d2)) if (r2 = Aa(r2, 0), 0 == (d2 | 0)) r2 = 1;
                    else {
                      a2 = r2;
                      for (var h2 = r2 = u2 = 0; ; ) {
                        var l2 = U(e2, c2), g2 = U(e2, c2);
                        u2 = l2 + u2 & 255;
                        r2 = g2 + r2 & 255;
                        Da[a2 >> 1] = (r2 << 8 | u2) & 65535;
                        h2 = h2 + 1 | 0;
                        if ((h2 | 0) == (d2 | 0)) {
                          r2 = 1;
                          break a;
                        }
                        a2 = a2 + 2 | 0;
                      }
                    }
                    else r2 = 0;
                  } else r2 = 0;
                while (0);
                ya(c2);
                c2 = r2;
              } else c2 = 0;
              M = f2;
              return c2;
            }
            function bd(a2) {
              var f2 = M;
              M += 1888;
              var c2 = f2, u2 = f2 + 24, d2 = f2 + 924, e2 = f2 + 1824, r2 = b[a2 + 88 >> 2], h2 = pa(r2 + 63 | 0), l2 = a2 + 92 | 0;
              if (hb(l2, b[a2 + 4 >> 2] + Na(r2 + 57 | 0) | 0, Na(r2 + 60 | 0))) {
                Ha(c2);
                r2 = wa(l2, c2);
                a: do
                  if (r2) {
                    for (var g2 = -7, y = -7, E = 0; ; ) {
                      b[u2 + (E << 2) >> 2] = g2;
                      b[d2 + (E << 2) >> 2] = y;
                      g2 = g2 + 1 | 0;
                      var H = 7 < (g2 | 0);
                      y = (H & 1) + y | 0;
                      E = E + 1 | 0;
                      if (225 == (E | 0)) break;
                      g2 = H ? -7 : g2;
                    }
                    cd(e2);
                    y = a2 + 284 | 0;
                    if (dd(y, 3 * h2 | 0)) {
                      var x = Aa(y, 0);
                      if (0 == (h2 | 0)) y = 1;
                      else {
                        a2 = e2 | 0;
                        r2 = e2 + 4 | 0;
                        y = e2 + 8 | 0;
                        E = e2 + 12 | 0;
                        g2 = e2 + 16 | 0;
                        H = e2 + 20 | 0;
                        var k2 = e2 + 24 | 0, t2 = e2 + 28 | 0, p2 = e2 + 32 | 0, m2 = e2 + 36 | 0, v2 = e2 + 40 | 0, w2 = e2 + 44 | 0, A2 = e2 + 48 | 0, z2 = e2 + 52 | 0, B2 = e2 + 56 | 0, K2 = e2 + 60 | 0, C2 = x;
                        x = C2 >> 1;
                        for (var D2 = 0; ; ) {
                          for (var F2 = 0; ; ) {
                            var G2 = U(l2, c2), J2 = F2 << 1, L2 = (J2 << 2) + e2 | 0;
                            b[L2 >> 2] = b[L2 >> 2] + b[u2 + (G2 << 2) >> 2] & 7;
                            J2 = ((J2 | 1) << 2) + e2 | 0;
                            b[J2 >> 2] = b[J2 >> 2] + b[d2 + (G2 << 2) >> 2] & 7;
                            F2 = F2 + 1 | 0;
                            if (8 == (F2 | 0)) break;
                          }
                          Da[x] = (I[q.b + b[r2 >> 2] | 0] & 255) << 3 | I[q.b + b[a2 >> 2] | 0] & 255 | (I[q.b + b[y >> 2] | 0] & 255) << 6 | (I[q.b + b[E >> 2] | 0] & 255) << 9 | (I[q.b + b[g2 >> 2] | 0] & 255) << 12 | (I[q.b + b[H >> 2] | 0] & 255) << 15;
                          Da[x + 1] = (I[q.b + b[k2 >> 2] | 0] & 255) << 2 | (I[q.b + b[H >> 2] | 0] & 255) >>> 1 | (I[q.b + b[t2 >> 2] | 0] & 255) << 5 | (I[q.b + b[p2 >> 2] | 0] & 255) << 8 | (I[q.b + b[m2 >> 2] | 0] & 255) << 11 | (I[q.b + b[v2 >> 2] | 0] & 255) << 14;
                          Da[x + 2] = (I[q.b + b[w2 >> 2] | 0] & 255) << 1 | (I[q.b + b[v2 >> 2] | 0] & 255) >>> 2 | (I[q.b + b[A2 >> 2] | 0] & 255) << 4 | (I[q.b + b[z2 >> 2] | 0] & 255) << 7 | (I[q.b + b[B2 >> 2] | 0] & 255) << 10 | (I[q.b + b[K2 >> 2] | 0] & 255) << 13;
                          D2 = D2 + 1 | 0;
                          if ((D2 | 0) == (h2 | 0)) {
                            y = 1;
                            break a;
                          }
                          C2 = C2 + 6 | 0;
                          x = C2 >> 1;
                        }
                      }
                    } else y = 0;
                  } else y = 0;
                while (0);
                ya(c2);
                c2 = y;
              } else c2 = 0;
              M = f2;
              return c2;
            }
            function db(a2) {
              var f2 = 245 > a2 >>> 0;
              do {
                if (f2) {
                  var c2 = 11 > a2 >>> 0 ? 16 : a2 + 11 & -8, u2 = c2 >>> 3, d2 = t[l >> 2], e2 = d2 >>> (u2 >>> 0);
                  if (0 != (e2 & 3 | 0)) {
                    a2 = (e2 & 1 ^ 1) + u2 | 0;
                    c2 = a2 << 1;
                    f2 = (c2 << 2) + l + 40 | 0;
                    u2 = (c2 + 2 << 2) + l + 40 | 0;
                    var r2 = t[u2 >> 2];
                    c2 = r2 + 8 | 0;
                    e2 = t[c2 >> 2];
                    if ((f2 | 0) == (e2 | 0)) b[l >> 2] = d2 & (1 << a2 ^ -1);
                    else {
                      if (e2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                      b[u2 >> 2] = e2;
                      b[e2 + 12 >> 2] = f2;
                    }
                    d2 = a2 << 3;
                    b[r2 + 4 >> 2] = d2 | 3;
                    d2 = r2 + (d2 | 4) | 0;
                    b[d2 >> 2] |= 1;
                    r2 = c2;
                    var h2 = 38;
                    break;
                  }
                  if (c2 >>> 0 <= t[l + 8 >> 2] >>> 0) {
                    var g2 = c2;
                    h2 = 30;
                    break;
                  }
                  if (0 != (e2 | 0)) {
                    a2 = 2 << u2;
                    a2 = e2 << u2 & (a2 | -a2);
                    f2 = (a2 & -a2) - 1 | 0;
                    a2 = f2 >>> 12 & 16;
                    r2 = f2 >>> (a2 >>> 0);
                    f2 = r2 >>> 5 & 8;
                    u2 = r2 >>> (f2 >>> 0);
                    r2 = u2 >>> 2 & 4;
                    e2 = u2 >>> (r2 >>> 0);
                    u2 = e2 >>> 1 & 2;
                    e2 >>>= u2 >>> 0;
                    var k2 = e2 >>> 1 & 1;
                    r2 = (f2 | a2 | r2 | u2 | k2) + (e2 >>> (k2 >>> 0)) | 0;
                    a2 = r2 << 1;
                    u2 = (a2 << 2) + l + 40 | 0;
                    e2 = (a2 + 2 << 2) + l + 40 | 0;
                    f2 = t[e2 >> 2];
                    a2 = f2 + 8 | 0;
                    k2 = t[a2 >> 2];
                    if ((u2 | 0) == (k2 | 0)) b[l >> 2] = d2 & (1 << r2 ^ -1);
                    else {
                      if (k2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                      b[e2 >> 2] = k2;
                      b[k2 + 12 >> 2] = u2;
                    }
                    r2 <<= 3;
                    d2 = r2 - c2 | 0;
                    b[f2 + 4 >> 2] = c2 | 3;
                    u2 = f2;
                    f2 = u2 + c2 | 0;
                    b[u2 + (c2 | 4) >> 2] = d2 | 1;
                    b[u2 + r2 >> 2] = d2;
                    k2 = t[l + 8 >> 2];
                    if (0 != (k2 | 0)) {
                      c2 = b[l + 20 >> 2];
                      u2 = k2 >>> 2 & 1073741822;
                      r2 = (u2 << 2) + l + 40 | 0;
                      e2 = t[l >> 2];
                      k2 = 1 << (k2 >>> 3);
                      if (0 == (e2 & k2 | 0)) b[l >> 2] = e2 | k2, e2 = r2, u2 = (u2 + 2 << 2) + l + 40 | 0;
                      else if (u2 = (u2 + 2 << 2) + l + 40 | 0, e2 = t[u2 >> 2], !(e2 >>> 0 >= t[l + 16 >> 2] >>> 0)) throw K(), "Reached an unreachable!";
                      b[u2 >> 2] = c2;
                      b[e2 + 12 >> 2] = c2;
                      b[(c2 + 8 | 0) >> 2] = e2;
                      b[(c2 + 12 | 0) >> 2] = r2;
                    }
                    b[l + 8 >> 2] = d2;
                    b[l + 20 >> 2] = f2;
                    r2 = a2;
                    h2 = 38;
                    break;
                  }
                  if (0 == (b[l + 4 >> 2] | 0)) {
                    g2 = c2;
                    h2 = 30;
                    break;
                  }
                  d2 = fd(c2);
                  if (0 == (d2 | 0)) {
                    g2 = c2;
                    h2 = 30;
                    break;
                  }
                  r2 = d2;
                } else {
                  if (4294967231 < a2 >>> 0) {
                    g2 = -1;
                    h2 = 30;
                    break;
                  }
                  d2 = a2 + 11 & -8;
                  if (0 == (b[l + 4 >> 2] | 0)) {
                    g2 = d2;
                    h2 = 30;
                    break;
                  }
                  c2 = gd(d2);
                  if (0 == (c2 | 0)) {
                    g2 = d2;
                    h2 = 30;
                    break;
                  }
                  r2 = c2;
                }
                h2 = 38;
              } while (0);
              30 == h2 && (c2 = t[l + 8 >> 2], g2 >>> 0 > c2 >>> 0 ? (d2 = t[l + 12 >> 2], g2 >>> 0 < d2 >>> 0 ? (d2 = d2 - g2 | 0, b[l + 12 >> 2] = d2, c2 = t[l + 24 >> 2], b[l + 24 >> 2] = c2 + g2 | 0, b[g2 + (c2 + 4) >> 2] = d2 | 1, b[c2 + 4 >> 2] = g2 | 3, r2 = c2 + 8 | 0) : r2 = hd(g2)) : (a2 = c2 - g2 | 0, d2 = t[l + 20 >> 2], 15 < a2 >>> 0 ? (b[l + 20 >> 2] = d2 + g2 | 0, b[l + 8 >> 2] = a2, b[g2 + (d2 + 4) >> 2] = a2 | 1, b[d2 + c2 >> 2] = a2, b[d2 + 4 >> 2] = g2 | 3) : (b[l + 8 >> 2] = 0, b[l + 20 >> 2] = 0, b[d2 + 4 >> 2] = c2 | 3, g2 = c2 + (d2 + 4) | 0, b[g2 >> 2] |= 1), r2 = d2 + 8 | 0));
              return r2;
            }
            function fd(a2) {
              var f2 = b[l + 4 >> 2], c2 = (f2 & -f2) - 1 | 0;
              f2 = c2 >>> 12 & 16;
              var d2 = c2 >>> (f2 >>> 0);
              c2 = d2 >>> 5 & 8;
              var e2 = d2 >>> (c2 >>> 0);
              d2 = e2 >>> 2 & 4;
              var h2 = e2 >>> (d2 >>> 0);
              e2 = h2 >>> 1 & 2;
              h2 >>>= e2 >>> 0;
              var r2 = h2 >>> 1 & 1;
              f2 = c2 = t[l + ((c2 | f2 | d2 | e2 | r2) + (h2 >>> (r2 >>> 0)) << 2) + 304 >> 2];
              e2 = f2 >> 2;
              c2 = (b[c2 + 4 >> 2] & -8) - a2 | 0;
              a: for (; ; ) for (d2 = f2; ; ) {
                h2 = b[d2 + 16 >> 2];
                if (0 == (h2 | 0)) {
                  if (d2 = b[d2 + 20 >> 2], 0 == (d2 | 0)) break a;
                } else d2 = h2;
                h2 = (b[d2 + 4 >> 2] & -8) - a2 | 0;
                if (h2 >>> 0 < c2 >>> 0) {
                  f2 = d2;
                  e2 = f2 >> 2;
                  c2 = h2;
                  continue a;
                }
              }
              h2 = f2;
              var g2 = t[l + 16 >> 2];
              if (!(h2 >>> 0 < g2 >>> 0 || (d2 = h2 + a2 | 0, h2 >>> 0 >= d2 >>> 0))) {
                r2 = t[e2 + 6];
                var k2 = t[e2 + 3], p2 = (k2 | 0) == (f2 | 0);
                do {
                  if (p2) {
                    var y = f2 + 20 | 0;
                    var E = b[y >> 2];
                    if (0 == (E | 0) && (y = f2 + 16 | 0, E = b[y >> 2], 0 == (E | 0))) {
                      E = 0;
                      y = E >> 2;
                      break;
                    }
                    for (; ; ) {
                      var H = E + 20 | 0, x = b[H >> 2];
                      if (0 != (x | 0)) y = H, E = x;
                      else {
                        H = E + 16 | 0;
                        x = t[H >> 2];
                        if (0 == (x | 0)) break;
                        y = H;
                        E = x;
                      }
                    }
                    if (y >>> 0 < g2 >>> 0) throw K(), "Reached an unreachable!";
                    b[y >> 2] = 0;
                  } else {
                    y = t[e2 + 2];
                    if (y >>> 0 < g2 >>> 0) throw K(), "Reached an unreachable!";
                    b[y + 12 >> 2] = k2;
                    b[k2 + 8 >> 2] = y;
                    E = k2;
                  }
                  y = E >> 2;
                } while (0);
                g2 = 0 == (r2 | 0);
                a: do
                  if (!g2) {
                    k2 = f2 + 28 | 0;
                    p2 = (b[k2 >> 2] << 2) + l + 304 | 0;
                    H = (f2 | 0) == (b[p2 >> 2] | 0);
                    do {
                      if (H) {
                        b[p2 >> 2] = E;
                        if (0 != (E | 0)) break;
                        b[l + 4 >> 2] &= 1 << b[k2 >> 2] ^ -1;
                        break a;
                      }
                      if (r2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                      x = r2 + 16 | 0;
                      (b[x >> 2] | 0) == (f2 | 0) ? b[x >> 2] = E : b[r2 + 20 >> 2] = E;
                      if (0 == (E | 0)) break a;
                    } while (0);
                    if (E >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                    b[y + 6] = r2;
                    k2 = t[e2 + 4];
                    if (0 != (k2 | 0)) {
                      if (k2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                      b[y + 4] = k2;
                      b[k2 + 24 >> 2] = E;
                    }
                    k2 = t[e2 + 5];
                    if (0 != (k2 | 0)) {
                      if (k2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                      b[y + 5] = k2;
                      b[k2 + 24 >> 2] = E;
                    }
                  }
                while (0);
                if (16 > c2 >>> 0) a2 = c2 + a2 | 0, b[e2 + 1] = a2 | 3, a2 = a2 + (h2 + 4) | 0, b[a2 >> 2] |= 1;
                else {
                  b[e2 + 1] = a2 | 3;
                  b[a2 + (h2 + 4) >> 2] = c2 | 1;
                  b[h2 + c2 + a2 >> 2] = c2;
                  g2 = t[l + 8 >> 2];
                  if (0 != (g2 | 0)) {
                    a2 = t[l + 20 >> 2];
                    h2 = g2 >>> 2 & 1073741822;
                    e2 = (h2 << 2) + l + 40 | 0;
                    r2 = t[l >> 2];
                    g2 = 1 << (g2 >>> 3);
                    if (0 == (r2 & g2 | 0)) b[l >> 2] = r2 | g2, r2 = e2, h2 = (h2 + 2 << 2) + l + 40 | 0;
                    else if (h2 = (h2 + 2 << 2) + l + 40 | 0, r2 = t[h2 >> 2], !(r2 >>> 0 >= t[l + 16 >> 2] >>> 0)) throw K(), "Reached an unreachable!";
                    b[h2 >> 2] = a2;
                    b[r2 + 12 >> 2] = a2;
                    b[a2 + 8 >> 2] = r2;
                    b[a2 + 12 >> 2] = e2;
                  }
                  b[l + 8 >> 2] = c2;
                  b[l + 20 >> 2] = d2;
                }
                return f2 + 8 | 0;
              }
              K();
              throw "Reached an unreachable!";
            }
            function hd(a2) {
              0 == (b[xa >> 2] | 0) && id();
              var f2 = 0 == (b[l + 440 >> 2] & 4 | 0);
              do
                if (f2) {
                  var c2 = b[l + 24 >> 2];
                  if (0 == (c2 | 0)) var d2 = 6;
                  else if (c2 = gc(c2), 0 == (c2 | 0)) d2 = 6;
                  else {
                    var e2 = b[xa + 8 >> 2];
                    e2 = a2 + 47 - b[l + 12 >> 2] + e2 & -e2;
                    if (2147483647 <= e2 >>> 0) d2 = 14;
                    else {
                      var h2 = La(e2);
                      if ((h2 | 0) == (b[c2 >> 2] + b[c2 + 4 >> 2] | 0)) {
                        var r2 = h2, g2 = e2;
                        var k2 = h2;
                        d2 = 13;
                      } else {
                        var p2 = h2, y = e2;
                        d2 = 15;
                      }
                    }
                  }
                  if (6 == d2) if (c2 = La(0), -1 == (c2 | 0)) d2 = 14;
                  else {
                    e2 = b[xa + 8 >> 2];
                    e2 = e2 + (a2 + 47) & -e2;
                    h2 = c2;
                    var E = b[xa + 4 >> 2], H = E - 1 | 0;
                    e2 = 0 == (H & h2 | 0) ? e2 : e2 - h2 + (H + h2 & -E) | 0;
                    2147483647 <= e2 >>> 0 ? d2 = 14 : (h2 = La(e2), (h2 | 0) == (c2 | 0) ? (r2 = c2, g2 = e2, k2 = h2, d2 = 13) : (p2 = h2, y = e2, d2 = 15));
                  }
                  if (13 == d2) {
                    if (-1 != (r2 | 0)) {
                      var x = g2, q2 = r2;
                      d2 = 26;
                      break;
                    }
                    p2 = k2;
                    y = g2;
                  } else if (14 == d2) {
                    b[l + 440 >> 2] |= 4;
                    d2 = 23;
                    break;
                  }
                  c2 = -y | 0;
                  if (-1 != (p2 | 0) & 2147483647 > y >>> 0) if (y >>> 0 >= (a2 + 48 | 0) >>> 0) {
                    var m2 = y;
                    d2 = 21;
                  } else e2 = b[xa + 8 >> 2], e2 = a2 + 47 - y + e2 & -e2, 2147483647 <= e2 >>> 0 ? (m2 = y, d2 = 21) : -1 == (La(e2) | 0) ? (La(c2), d2 = 22) : (m2 = e2 + y | 0, d2 = 21);
                  else m2 = y, d2 = 21;
                  21 == d2 && -1 != (p2 | 0) ? (x = m2, q2 = p2, d2 = 26) : (b[l + 440 >> 2] |= 4, d2 = 23);
                } else d2 = 23;
              while (0);
              23 == d2 && (f2 = b[xa + 8 >> 2], f2 = f2 + (a2 + 47) & -f2, 2147483647 <= f2 >>> 0 ? d2 = 49 : (f2 = La(f2), r2 = La(0), -1 != (r2 | 0) & -1 != (f2 | 0) & f2 >>> 0 < r2 >>> 0 ? (r2 = r2 - f2 | 0, r2 >>> 0 <= (a2 + 40 | 0) >>> 0 | -1 == (f2 | 0) ? d2 = 49 : (x = r2, q2 = f2, d2 = 26)) : d2 = 49));
              a: do
                if (26 == d2) {
                  f2 = b[l + 432 >> 2] + x | 0;
                  b[l + 432 >> 2] = f2;
                  f2 >>> 0 > t[l + 436 >> 2] >>> 0 && (b[l + 436 >> 2] = f2);
                  f2 = t[l + 24 >> 2];
                  r2 = 0 == (f2 | 0);
                  b: do
                    if (r2) g2 = t[l + 16 >> 2], 0 == (g2 | 0) | q2 >>> 0 < g2 >>> 0 && (b[l + 16 >> 2] = q2), b[l + 444 >> 2] = q2, b[l + 448 >> 2] = x, b[l + 456 >> 2] = 0, b[l + 36 >> 2] = b[xa >> 2], b[l + 32 >> 2] = -1, Xe(), Ab(q2, x - 40 | 0);
                    else {
                      p2 = l + 444 | 0;
                      for (k2 = p2 >> 2; 0 != (p2 | 0); ) {
                        g2 = t[k2];
                        p2 = p2 + 4 | 0;
                        y = t[p2 >> 2];
                        m2 = g2 + y | 0;
                        if ((q2 | 0) == (m2 | 0)) {
                          if (0 != (b[k2 + 3] & 8 | 0)) break;
                          k2 = f2;
                          if (!(k2 >>> 0 >= g2 >>> 0 & k2 >>> 0 < m2 >>> 0)) break;
                          b[p2 >> 2] = y + x | 0;
                          Ab(b[l + 24 >> 2], b[l + 12 >> 2] + x | 0);
                          break b;
                        }
                        p2 = b[k2 + 2];
                        k2 = p2 >> 2;
                      }
                      q2 >>> 0 < t[l + 16 >> 2] >>> 0 && (b[l + 16 >> 2] = q2);
                      k2 = q2 + x | 0;
                      for (p2 = l + 444 | 0; 0 != (p2 | 0); ) {
                        y = p2 | 0;
                        g2 = t[y >> 2];
                        if ((g2 | 0) == (k2 | 0)) {
                          if (0 != (b[p2 + 12 >> 2] & 8 | 0)) break;
                          b[y >> 2] = q2;
                          var v2 = p2 + 4 | 0;
                          b[v2 >> 2] = b[v2 >> 2] + x | 0;
                          v2 = jd(q2, g2, a2);
                          d2 = 50;
                          break a;
                        }
                        p2 = b[p2 + 8 >> 2];
                      }
                      kd(q2, x);
                    }
                  while (0);
                  f2 = t[l + 12 >> 2];
                  f2 >>> 0 <= a2 >>> 0 ? d2 = 49 : (v2 = f2 - a2 | 0, b[l + 12 >> 2] = v2, r2 = f2 = t[l + 24 >> 2], b[l + 24 >> 2] = r2 + a2 | 0, b[a2 + (r2 + 4) >> 2] = v2 | 1, b[f2 + 4 >> 2] = a2 | 3, v2 = f2 + 8 | 0, d2 = 50);
                }
              while (0);
              49 == d2 && (a2 = ld(), b[a2 >> 2] = 12, v2 = 0);
              return v2;
            }
            function gd(a2) {
              var f2 = a2 >> 2, c2 = -a2 | 0, d2 = a2 >>> 8;
              if (0 == (d2 | 0)) var e2 = 0;
              else if (16777215 < a2 >>> 0) e2 = 31;
              else {
                var h2 = (d2 + 1048320 | 0) >>> 16 & 8, r2 = d2 << h2, g2 = (r2 + 520192 | 0) >>> 16 & 4, k2 = r2 << g2, p2 = (k2 + 245760 | 0) >>> 16 & 2, y = 14 - (g2 | h2 | p2) + (k2 << p2 >>> 15) | 0;
                e2 = a2 >>> ((y + 7 | 0) >>> 0) & 1 | y << 1;
              }
              var E = t[l + (e2 << 2) + 304 >> 2], H = 0 == (E | 0);
              a: do
                if (H) var x = 0, q2 = c2, v2 = 0;
                else {
                  var m2 = 31 == (e2 | 0) ? 0 : 25 - (e2 >>> 1) | 0, w2 = 0, A2 = c2, z2 = E;
                  var B2 = z2 >> 2;
                  for (var C2 = a2 << m2, D2 = 0; ; ) {
                    var F2 = b[B2 + 1] & -8, G2 = F2 - a2 | 0;
                    if (G2 >>> 0 < A2 >>> 0) {
                      if ((F2 | 0) == (a2 | 0)) {
                        x = z2;
                        q2 = G2;
                        v2 = z2;
                        break a;
                      }
                      var I2 = z2, J2 = G2;
                    } else I2 = w2, J2 = A2;
                    var M2 = t[B2 + 5], L2 = t[((C2 >>> 31 << 2) + 16 >> 2) + B2], O2 = 0 == (M2 | 0) | (M2 | 0) == (L2 | 0) ? D2 : M2;
                    if (0 == (L2 | 0)) {
                      x = I2;
                      q2 = J2;
                      v2 = O2;
                      break a;
                    }
                    w2 = I2;
                    A2 = J2;
                    z2 = L2;
                    B2 = z2 >> 2;
                    C2 <<= 1;
                    D2 = O2;
                  }
                }
              while (0);
              if (0 == (v2 | 0) & 0 == (x | 0)) {
                var P2 = 2 << e2, Q2 = b[l + 4 >> 2] & (P2 | -P2);
                if (0 == (Q2 | 0)) var R2 = v2;
                else {
                  var U2 = (Q2 & -Q2) - 1 | 0, Y2 = U2 >>> 12 & 16, W = U2 >>> (Y2 >>> 0), Z2 = W >>> 5 & 8, aa2 = W >>> (Z2 >>> 0), fa = aa2 >>> 2 & 4, ha = aa2 >>> (fa >>> 0), ba = ha >>> 1 & 2, ia = ha >>> (ba >>> 0), ca = ia >>> 1 & 1;
                  R2 = b[l + ((Z2 | Y2 | fa | ba | ca) + (ia >>> (ca >>> 0)) << 2) + 304 >> 2];
                }
              } else R2 = v2;
              var ja = 0 == (R2 | 0);
              a: do
                if (ja) {
                  var V = q2, S = x;
                  var X = S >> 2;
                } else {
                  var ea = R2;
                  var da = ea >> 2;
                  for (var ka2 = q2, oa = x; ; ) {
                    var ua = (b[da + 1] & -8) - a2 | 0, ma2 = ua >>> 0 < ka2 >>> 0, pa2 = ma2 ? ua : ka2, Ca = ma2 ? ea : oa, la2 = t[da + 4];
                    if (0 != (la2 | 0)) ea = la2;
                    else {
                      var ra2 = t[da + 5];
                      if (0 == (ra2 | 0)) {
                        V = pa2;
                        S = Ca;
                        X = S >> 2;
                        break a;
                      }
                      ea = ra2;
                    }
                    da = ea >> 2;
                    ka2 = pa2;
                    oa = Ca;
                  }
                }
              while (0);
              var va2 = 0 == (S | 0);
              a: do
                if (va2) var sa2 = 0;
                else if (V >>> 0 >= (b[l + 8 >> 2] - a2 | 0) >>> 0) sa2 = 0;
                else {
                  var qa2 = S;
                  var Ba = qa2 >> 2;
                  var xa2 = t[l + 16 >> 2];
                  if (!(qa2 >>> 0 < xa2 >>> 0)) {
                    var ya2 = qa2 + a2 | 0, za2 = ya2;
                    if (!(qa2 >>> 0 >= ya2 >>> 0)) {
                      var ta2 = t[X + 6], Aa2 = t[X + 3], Ja2 = (Aa2 | 0) == (S | 0);
                      do {
                        if (Ja2) {
                          var Ka2 = S + 20 | 0, Ha2 = b[Ka2 >> 2];
                          if (0 == (Ha2 | 0)) {
                            var Ia2 = S + 16 | 0, Oa = b[Ia2 >> 2];
                            if (0 == (Oa | 0)) {
                              var Ga = 0;
                              var ub = Ga >> 2;
                              break;
                            }
                            var vb = Ia2, wa2 = Oa;
                          } else vb = Ka2, wa2 = Ha2;
                          for (; ; ) {
                            var La2 = wa2 + 20 | 0, Ea2 = b[La2 >> 2];
                            if (0 != (Ea2 | 0)) vb = La2, wa2 = Ea2;
                            else {
                              var Ma2 = wa2 + 16 | 0, Na2 = t[Ma2 >> 2];
                              if (0 == (Na2 | 0)) break;
                              vb = Ma2;
                              wa2 = Na2;
                            }
                          }
                          if (vb >>> 0 < xa2 >>> 0) throw K(), "Reached an unreachable!";
                          b[vb >> 2] = 0;
                          Ga = wa2;
                        } else {
                          var Da2 = t[X + 2];
                          if (Da2 >>> 0 < xa2 >>> 0) throw K(), "Reached an unreachable!";
                          b[Da2 + 12 >> 2] = Aa2;
                          b[Aa2 + 8 >> 2] = Da2;
                          Ga = Aa2;
                        }
                        ub = Ga >> 2;
                      } while (0);
                      var Qa2 = 0 == (ta2 | 0);
                      b: do
                        if (!Qa2) {
                          var Sa2 = S + 28 | 0, Ta2 = (b[Sa2 >> 2] << 2) + l + 304 | 0, Xa2 = (S | 0) == (b[Ta2 >> 2] | 0);
                          do {
                            if (Xa2) {
                              b[Ta2 >> 2] = Ga;
                              if (0 != (Ga | 0)) break;
                              b[l + 4 >> 2] &= 1 << b[Sa2 >> 2] ^ -1;
                              break b;
                            }
                            if (ta2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                            var Gb = ta2 + 16 | 0;
                            (b[Gb >> 2] | 0) == (S | 0) ? b[Gb >> 2] = Ga : b[ta2 + 20 >> 2] = Ga;
                            if (0 == (Ga | 0)) break b;
                          } while (0);
                          if (Ga >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                          b[ub + 6] = ta2;
                          var Pa = t[X + 4];
                          if (0 != (Pa | 0)) {
                            if (Pa >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                            b[ub + 4] = Pa;
                            b[Pa + 24 >> 2] = Ga;
                          }
                          var nb = t[X + 5];
                          if (0 != (nb | 0)) {
                            if (nb >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                            b[ub + 5] = nb;
                            b[nb + 24 >> 2] = Ga;
                          }
                        }
                      while (0);
                      var ab2 = 16 > V >>> 0;
                      b: do
                        if (ab2) {
                          var Va2 = V + a2 | 0;
                          b[X + 1] = Va2 | 3;
                          var Ya2 = Va2 + (qa2 + 4) | 0;
                          b[Ya2 >> 2] |= 1;
                        } else if (b[X + 1] = a2 | 3, b[f2 + (Ba + 1)] = V | 1, b[(V >> 2) + Ba + f2] = V, 256 > V >>> 0) {
                          var rb = V >>> 2 & 1073741822, Hb = (rb << 2) + l + 40 | 0, Ib = t[l >> 2], Jb = 1 << (V >>> 3);
                          if (0 == (Ib & Jb | 0)) {
                            b[l >> 2] = Ib | Jb;
                            var ob = Hb, Kb = (rb + 2 << 2) + l + 40 | 0;
                          } else {
                            var Za = (rb + 2 << 2) + l + 40 | 0, sb = t[Za >> 2];
                            if (sb >>> 0 >= t[l + 16 >> 2] >>> 0) ob = sb, Kb = Za;
                            else throw K(), "Reached an unreachable!";
                          }
                          b[Kb >> 2] = za2;
                          b[ob + 12 >> 2] = za2;
                          b[f2 + (Ba + 2)] = ob;
                          b[f2 + (Ba + 3)] = Hb;
                        } else {
                          var $a = ya2, Lb = V >>> 8;
                          if (0 == (Lb | 0)) var Ra = 0;
                          else if (16777215 < V >>> 0) Ra = 31;
                          else {
                            var Ua2 = (Lb + 1048320 | 0) >>> 16 & 8, cb2 = Lb << Ua2, db2 = (cb2 + 520192 | 0) >>> 16 & 4, eb2 = cb2 << db2, gb2 = (eb2 + 245760 | 0) >>> 16 & 2, hb2 = 14 - (db2 | Ua2 | gb2) + (eb2 << gb2 >>> 15) | 0;
                            Ra = V >>> ((hb2 + 7 | 0) >>> 0) & 1 | hb2 << 1;
                          }
                          var Wa2 = (Ra << 2) + l + 304 | 0;
                          b[f2 + (Ba + 7)] = Ra;
                          var tb = a2 + (qa2 + 16) | 0;
                          b[f2 + (Ba + 5)] = 0;
                          b[tb >> 2] = 0;
                          var bb2 = b[l + 4 >> 2], Db = 1 << Ra;
                          if (0 == (bb2 & Db | 0)) b[l + 4 >> 2] = bb2 | Db, b[Wa2 >> 2] = $a, b[f2 + (Ba + 6)] = Wa2, b[f2 + (Ba + 3)] = $a, b[f2 + (Ba + 2)] = $a;
                          else for (var lb2 = V << (31 == (Ra | 0) ? 0 : 25 - (Ra >>> 1) | 0), qb = b[Wa2 >> 2]; ; ) {
                            if ((b[qb + 4 >> 2] & -8 | 0) == (V | 0)) {
                              var mb2 = qb + 8 | 0, Eb = t[mb2 >> 2], pb2 = t[l + 16 >> 2];
                              if (!(qb >>> 0 < pb2 >>> 0 || Eb >>> 0 < pb2 >>> 0)) {
                                b[Eb + 12 >> 2] = $a;
                                b[mb2 >> 2] = $a;
                                b[f2 + (Ba + 2)] = Eb;
                                b[f2 + (Ba + 3)] = qb;
                                b[f2 + (Ba + 6)] = 0;
                                break b;
                              }
                              K();
                              throw "Reached an unreachable!";
                            }
                            var fb2 = (lb2 >>> 31 << 2) + qb + 16 | 0, ib2 = t[fb2 >> 2];
                            if (0 == (ib2 | 0)) {
                              if (fb2 >>> 0 >= t[l + 16 >> 2] >>> 0) {
                                b[fb2 >> 2] = $a;
                                b[f2 + (Ba + 6)] = qb;
                                b[f2 + (Ba + 3)] = $a;
                                b[f2 + (Ba + 2)] = $a;
                                break b;
                              }
                              K();
                              throw "Reached an unreachable!";
                            }
                            lb2 <<= 1;
                            qb = ib2;
                          }
                        }
                      while (0);
                      sa2 = S + 8 | 0;
                      break a;
                    }
                  }
                  K();
                  throw "Reached an unreachable!";
                }
              while (0);
              return sa2;
            }
            function md(a2) {
              0 == (b[xa >> 2] | 0) && id();
              var f2 = 4294967232 > a2 >>> 0;
              a: do {
                if (f2) {
                  var c2 = t[l + 24 >> 2];
                  if (0 == (c2 | 0)) {
                    c2 = 0;
                    break;
                  }
                  var d2 = t[l + 12 >> 2];
                  if (d2 >>> 0 > (a2 + 40 | 0) >>> 0) {
                    var e2 = t[xa + 8 >> 2], h2 = (Math.floor(((-40 - a2 - 1 + d2 + e2 | 0) >>> 0) / (e2 >>> 0)) - 1) * e2 | 0, r2 = gc(c2);
                    if (0 == (b[r2 + 12 >> 2] & 8 | 0) && (d2 = La(0), c2 = (r2 + 4 | 0) >> 2, (d2 | 0) == (b[r2 >> 2] + b[c2] | 0) && (h2 = La(-(2147483646 < h2 >>> 0 ? -2147483648 - e2 | 0 : h2) | 0), e2 = La(0), -1 != (h2 | 0) & e2 >>> 0 < d2 >>> 0 && (h2 = d2 - e2 | 0, (d2 | 0) != (e2 | 0))))) {
                      b[c2] = b[c2] - h2 | 0;
                      b[l + 432 >> 2] = b[l + 432 >> 2] - h2 | 0;
                      Ab(b[l + 24 >> 2], b[l + 12 >> 2] - h2 | 0);
                      c2 = (d2 | 0) != (e2 | 0);
                      break a;
                    }
                  }
                  if (t[l + 12 >> 2] >>> 0 <= t[l + 28 >> 2] >>> 0) {
                    c2 = 0;
                    break;
                  }
                  b[l + 28 >> 2] = -1;
                }
                c2 = 0;
              } while (0);
              return c2 & 1;
            }
            function eb(a2) {
              var f2 = a2 >> 2, c2 = 0 == (a2 | 0);
              a: do
                if (!c2) {
                  var d2 = a2 - 8 | 0, e2 = d2, h2 = t[l + 16 >> 2], r2 = d2 >>> 0 < h2 >>> 0;
                  b: do
                    if (!r2) {
                      var g2 = t[a2 - 4 >> 2], k2 = g2 & 3;
                      if (1 != (k2 | 0)) {
                        var p2 = g2 & -8;
                        var y = p2 >> 2;
                        var E = a2 + (p2 - 8) | 0, H = E, x = 0 == (g2 & 1 | 0);
                        c: do
                          if (x) {
                            var q2 = t[d2 >> 2];
                            if (0 == (k2 | 0)) break a;
                            var v2 = -8 - q2 | 0;
                            var m2 = v2 >> 2;
                            var w2 = a2 + v2 | 0, A2 = w2, z2 = q2 + p2 | 0;
                            if (w2 >>> 0 < h2 >>> 0) break b;
                            if ((A2 | 0) == (b[l + 20 >> 2] | 0)) {
                              var B2 = (a2 + (p2 - 4) | 0) >> 2;
                              if (3 != (b[B2] & 3 | 0)) {
                                var C2 = A2;
                                var D2 = C2 >> 2;
                                var F2 = z2;
                                break;
                              }
                              b[l + 8 >> 2] = z2;
                              b[B2] &= -2;
                              b[m2 + (f2 + 1)] = z2 | 1;
                              b[E >> 2] = z2;
                              break a;
                            }
                            if (256 > q2 >>> 0) {
                              var G2 = t[m2 + (f2 + 2)], I2 = t[m2 + (f2 + 3)];
                              if ((G2 | 0) == (I2 | 0)) b[l >> 2] &= 1 << (q2 >>> 3) ^ -1, C2 = A2, D2 = C2 >> 2, F2 = z2;
                              else {
                                var J2 = ((q2 >>> 2 & 1073741822) << 2) + l + 40 | 0;
                                if (!((G2 | 0) != (J2 | 0) & G2 >>> 0 < h2 >>> 0) && (I2 | 0) == (J2 | 0) | I2 >>> 0 >= h2 >>> 0) {
                                  b[G2 + 12 >> 2] = I2;
                                  b[I2 + 8 >> 2] = G2;
                                  C2 = A2;
                                  D2 = C2 >> 2;
                                  F2 = z2;
                                  break c;
                                }
                                K();
                                throw "Reached an unreachable!";
                              }
                            } else {
                              var M2 = w2, L2 = t[m2 + (f2 + 6)], O2 = t[m2 + (f2 + 3)], P2 = (O2 | 0) == (M2 | 0);
                              do {
                                if (P2) {
                                  var Q2 = v2 + (a2 + 20) | 0, R2 = b[Q2 >> 2];
                                  if (0 == (R2 | 0)) {
                                    var U2 = v2 + (a2 + 16) | 0, Y2 = b[U2 >> 2];
                                    if (0 == (Y2 | 0)) {
                                      var W = 0;
                                      var Z2 = W >> 2;
                                      break;
                                    }
                                    var aa2 = U2, fa = Y2;
                                  } else {
                                    aa2 = Q2;
                                    fa = R2;
                                    var ha = 21;
                                  }
                                  for (; ; ) {
                                    var ba = fa + 20 | 0, ia = b[ba >> 2];
                                    if (0 != (ia | 0)) aa2 = ba, fa = ia;
                                    else {
                                      var ca = fa + 16 | 0, ja = t[ca >> 2];
                                      if (0 == (ja | 0)) break;
                                      aa2 = ca;
                                      fa = ja;
                                    }
                                  }
                                  if (aa2 >>> 0 < h2 >>> 0) throw K(), "Reached an unreachable!";
                                  b[aa2 >> 2] = 0;
                                  W = fa;
                                } else {
                                  var V = t[m2 + (f2 + 2)];
                                  if (V >>> 0 < h2 >>> 0) throw K(), "Reached an unreachable!";
                                  b[V + 12 >> 2] = O2;
                                  b[O2 + 8 >> 2] = V;
                                  W = O2;
                                }
                                Z2 = W >> 2;
                              } while (0);
                              if (0 != (L2 | 0)) {
                                var S = v2 + (a2 + 28) | 0, X = (b[S >> 2] << 2) + l + 304 | 0, ea = (M2 | 0) == (b[X >> 2] | 0);
                                do {
                                  if (ea) {
                                    b[X >> 2] = W;
                                    if (0 != (W | 0)) break;
                                    b[l + 4 >> 2] &= 1 << b[S >> 2] ^ -1;
                                    C2 = A2;
                                    D2 = C2 >> 2;
                                    F2 = z2;
                                    break c;
                                  }
                                  if (L2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                                  var da = L2 + 16 | 0;
                                  (b[da >> 2] | 0) == (M2 | 0) ? b[da >> 2] = W : b[L2 + 20 >> 2] = W;
                                  if (0 == (W | 0)) {
                                    C2 = A2;
                                    D2 = C2 >> 2;
                                    F2 = z2;
                                    break c;
                                  }
                                } while (0);
                                if (W >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                                b[Z2 + 6] = L2;
                                var ka2 = t[m2 + (f2 + 4)];
                                if (0 != (ka2 | 0)) {
                                  if (ka2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                                  b[Z2 + 4] = ka2;
                                  b[ka2 + 24 >> 2] = W;
                                }
                                var oa = t[m2 + (f2 + 5)];
                                if (0 != (oa | 0)) {
                                  if (oa >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                                  b[Z2 + 5] = oa;
                                  b[oa + 24 >> 2] = W;
                                }
                              }
                              C2 = A2;
                              D2 = C2 >> 2;
                              F2 = z2;
                            }
                          } else C2 = e2, D2 = C2 >> 2, F2 = p2;
                        while (0);
                        var ma2 = C2;
                        if (!(ma2 >>> 0 >= E >>> 0)) {
                          var pa2 = a2 + (p2 - 4) | 0, la2 = t[pa2 >> 2];
                          if (0 != (la2 & 1 | 0)) {
                            if (0 == (la2 & 2 | 0)) {
                              if ((H | 0) == (b[l + 24 >> 2] | 0)) {
                                var ra2 = b[l + 12 >> 2] + F2 | 0;
                                b[l + 12 >> 2] = ra2;
                                b[l + 24 >> 2] = C2;
                                b[D2 + 1] = ra2 | 1;
                                (C2 | 0) == (b[l + 20 >> 2] | 0) && (b[l + 20 >> 2] = 0, b[l + 8 >> 2] = 0);
                                if (ra2 >>> 0 <= t[l + 28 >> 2] >>> 0) break a;
                                md(0);
                                break a;
                              }
                              if ((H | 0) == (b[l + 20 >> 2] | 0)) {
                                var qa2 = b[l + 8 >> 2] + F2 | 0;
                                b[l + 8 >> 2] = qa2;
                                b[l + 20 >> 2] = C2;
                                b[D2 + 1] = qa2 | 1;
                                b[(ma2 + qa2 | 0) >> 2] = qa2;
                                break a;
                              }
                              var sa2 = (la2 & -8) + F2 | 0, va2 = la2 >>> 3, xa2 = 256 > la2 >>> 0;
                              c: do
                                if (xa2) {
                                  var ta2 = t[f2 + y], Ba = t[((p2 | 4) >> 2) + f2];
                                  if ((ta2 | 0) == (Ba | 0)) b[l >> 2] &= 1 << va2 ^ -1;
                                  else {
                                    var Aa2 = ((la2 >>> 2 & 1073741822) << 2) + l + 40 | 0;
                                    ha = (ta2 | 0) == (Aa2 | 0) ? 63 : ta2 >>> 0 < t[l + 16 >> 2] >>> 0 ? 66 : 63;
                                    if (63 == ha && !((Ba | 0) != (Aa2 | 0) && Ba >>> 0 < t[l + 16 >> 2] >>> 0)) {
                                      b[ta2 + 12 >> 2] = Ba;
                                      b[Ba + 8 >> 2] = ta2;
                                      break c;
                                    }
                                    K();
                                    throw "Reached an unreachable!";
                                  }
                                } else {
                                  var ya2 = E, wa2 = t[y + (f2 + 4)], za2 = t[((p2 | 4) >> 2) + f2], Ka2 = (za2 | 0) == (ya2 | 0);
                                  do {
                                    if (Ka2) {
                                      var Ha2 = p2 + (a2 + 12) | 0, Ia2 = b[Ha2 >> 2];
                                      if (0 == (Ia2 | 0)) {
                                        var Ja2 = p2 + (a2 + 8) | 0, La2 = b[Ja2 >> 2];
                                        if (0 == (La2 | 0)) {
                                          var Oa = 0;
                                          var Ga = Oa >> 2;
                                          break;
                                        }
                                        var Ea2 = Ja2, Da2 = La2;
                                      } else Ea2 = Ha2, Da2 = Ia2, ha = 73;
                                      for (; ; ) {
                                        var Ma2 = Da2 + 20 | 0, Na2 = b[Ma2 >> 2];
                                        if (0 != (Na2 | 0)) Ea2 = Ma2, Da2 = Na2;
                                        else {
                                          var Sa2 = Da2 + 16 | 0, Ta2 = t[Sa2 >> 2];
                                          if (0 == (Ta2 | 0)) break;
                                          Ea2 = Sa2;
                                          Da2 = Ta2;
                                        }
                                      }
                                      if (Ea2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                                      b[Ea2 >> 2] = 0;
                                      Oa = Da2;
                                    } else {
                                      var Qa2 = t[f2 + y];
                                      if (Qa2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                                      b[Qa2 + 12 >> 2] = za2;
                                      b[za2 + 8 >> 2] = Qa2;
                                      Oa = za2;
                                    }
                                    Ga = Oa >> 2;
                                  } while (0);
                                  if (0 != (wa2 | 0)) {
                                    var Va2 = p2 + (a2 + 20) | 0, Xa2 = (b[Va2 >> 2] << 2) + l + 304 | 0, ab2 = (ya2 | 0) == (b[Xa2 >> 2] | 0);
                                    do {
                                      if (ab2) {
                                        b[Xa2 >> 2] = Oa;
                                        if (0 != (Oa | 0)) break;
                                        b[l + 4 >> 2] &= 1 << b[Va2 >> 2] ^ -1;
                                        break c;
                                      }
                                      if (wa2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                                      var Ya2 = wa2 + 16 | 0;
                                      (b[Ya2 >> 2] | 0) == (ya2 | 0) ? b[Ya2 >> 2] = Oa : b[wa2 + 20 >> 2] = Oa;
                                      if (0 == (Oa | 0)) break c;
                                    } while (0);
                                    if (Oa >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                                    b[Ga + 6] = wa2;
                                    var Ua2 = t[y + (f2 + 2)];
                                    if (0 != (Ua2 | 0)) {
                                      if (Ua2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                                      b[Ga + 4] = Ua2;
                                      b[Ua2 + 24 >> 2] = Oa;
                                    }
                                    var Wa2 = t[y + (f2 + 3)];
                                    if (0 != (Wa2 | 0)) {
                                      if (Wa2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                                      b[Ga + 5] = Wa2;
                                      b[Wa2 + 24 >> 2] = Oa;
                                    }
                                  }
                                }
                              while (0);
                              b[D2 + 1] = sa2 | 1;
                              b[ma2 + sa2 >> 2] = sa2;
                              if ((C2 | 0) != (b[l + 20 >> 2] | 0)) var Pa = sa2;
                              else {
                                b[l + 8 >> 2] = sa2;
                                break a;
                              }
                            } else b[pa2 >> 2] = la2 & -2, b[D2 + 1] = F2 | 1, Pa = b[ma2 + F2 >> 2] = F2;
                            if (256 > Pa >>> 0) {
                              var nb = Pa >>> 2 & 1073741822, cb2 = (nb << 2) + l + 40 | 0, db2 = t[l >> 2], eb2 = 1 << (Pa >>> 3);
                              if (0 == (db2 & eb2 | 0)) {
                                b[l >> 2] = db2 | eb2;
                                var rb = cb2, fb2 = (nb + 2 << 2) + l + 40 | 0;
                              } else {
                                var gb2 = (nb + 2 << 2) + l + 40 | 0, hb2 = t[gb2 >> 2];
                                if (hb2 >>> 0 >= t[l + 16 >> 2] >>> 0) rb = hb2, fb2 = gb2;
                                else throw K(), "Reached an unreachable!";
                              }
                              b[fb2 >> 2] = C2;
                              b[rb + 12 >> 2] = C2;
                              b[D2 + 2] = rb;
                              b[D2 + 3] = cb2;
                              break a;
                            }
                            var ob = C2, bb2 = Pa >>> 8;
                            if (0 == (bb2 | 0)) var Za = 0;
                            else if (16777215 < Pa >>> 0) Za = 31;
                            else {
                              var sb = (bb2 + 1048320 | 0) >>> 16 & 8, $a = bb2 << sb, lb2 = ($a + 520192 | 0) >>> 16 & 4, Ra = $a << lb2, mb2 = (Ra + 245760 | 0) >>> 16 & 2, pb2 = 14 - (lb2 | sb | mb2) + (Ra << mb2 >>> 15) | 0;
                              Za = Pa >>> ((pb2 + 7 | 0) >>> 0) & 1 | pb2 << 1;
                            }
                            var ib2 = (Za << 2) + l + 304 | 0;
                            b[D2 + 7] = Za;
                            b[D2 + 5] = 0;
                            b[D2 + 4] = 0;
                            var wb2 = b[l + 4 >> 2], xb2 = 1 << Za, Cb2 = 0 == (wb2 & xb2 | 0);
                            c: do
                              if (Cb2) b[l + 4 >> 2] = wb2 | xb2, b[ib2 >> 2] = ob, b[D2 + 6] = ib2, b[D2 + 3] = C2, b[D2 + 2] = C2;
                              else for (var yb2 = Pa << (31 == (Za | 0) ? 0 : 25 - (Za >>> 1) | 0), tb = b[ib2 >> 2]; ; ) {
                                if ((b[tb + 4 >> 2] & -8 | 0) == (Pa | 0)) {
                                  var zb2 = tb + 8 | 0, Db = t[zb2 >> 2], Ab2 = t[l + 16 >> 2];
                                  if (!(tb >>> 0 < Ab2 >>> 0 || Db >>> 0 < Ab2 >>> 0)) {
                                    b[Db + 12 >> 2] = ob;
                                    b[zb2 >> 2] = ob;
                                    b[D2 + 2] = Db;
                                    b[D2 + 3] = tb;
                                    b[D2 + 6] = 0;
                                    break c;
                                  }
                                  K();
                                  throw "Reached an unreachable!";
                                }
                                var qb = (yb2 >>> 31 << 2) + tb + 16 | 0, Bb2 = t[qb >> 2];
                                if (0 == (Bb2 | 0)) {
                                  if (qb >>> 0 >= t[l + 16 >> 2] >>> 0) {
                                    b[qb >> 2] = ob;
                                    b[D2 + 6] = tb;
                                    b[D2 + 3] = C2;
                                    b[D2 + 2] = C2;
                                    break c;
                                  }
                                  K();
                                  throw "Reached an unreachable!";
                                }
                                yb2 <<= 1;
                                tb = Bb2;
                              }
                            while (0);
                            var Eb = b[l + 32 >> 2] - 1 | 0;
                            b[l + 32 >> 2] = Eb;
                            if (0 != (Eb | 0)) break a;
                            Ye();
                            break a;
                          }
                        }
                      }
                    }
                  while (0);
                  K();
                  throw "Reached an unreachable!";
                }
              while (0);
            }
            function Ye() {
              var a2 = b[l + 452 >> 2], f2 = 0 == (a2 | 0);
              a: do
                if (!f2) {
                  for (; ; ) if (a2 = b[a2 + 8 >> 2], 0 == (a2 | 0)) break a;
                }
              while (0);
              b[l + 32 >> 2] = -1;
            }
            function Qd(a2, b2) {
              return 0 == (a2 | 0) ? db(b2) : nd(a2, b2);
            }
            function nd(a2, f2) {
              var c2;
              var d2 = 4294967231 < f2 >>> 0;
              a: do
                if (d2) {
                  var e2 = ld();
                  b[e2 >> 2] = 12;
                  e2 = 0;
                } else {
                  var h2 = c2 = a2 - 8 | 0;
                  d2 = (a2 - 4 | 0) >> 2;
                  var r2 = t[d2];
                  e2 = r2 & -8;
                  var g2 = e2 - 8 | 0, k2 = a2 + g2 | 0;
                  if (!(c2 >>> 0 < t[l + 16 >> 2] >>> 0)) {
                    var p2 = r2 & 3;
                    if (1 != (p2 | 0) & -8 < (g2 | 0) && (c2 = (a2 + (e2 - 4) | 0) >> 2, 0 != (b[c2] & 1 | 0))) {
                      g2 = 11 > f2 >>> 0 ? 16 : f2 + 11 & -8;
                      if (0 == (p2 | 0)) {
                        var y = 0, E = Ze(h2, g2);
                        var H = 17;
                      } else e2 >>> 0 < g2 >>> 0 ? (k2 | 0) != (b[l + 24 >> 2] | 0) ? H = 21 : (k2 = b[l + 12 >> 2] + e2 | 0, k2 >>> 0 <= g2 >>> 0 ? H = 21 : (y = k2 - g2 | 0, E = a2 + (g2 - 8) | 0, b[d2] = g2 | r2 & 1 | 2, b[a2 + (g2 - 4) >> 2] = y | 1, b[l + 24 >> 2] = E, b[l + 12 >> 2] = y, y = 0, E = h2, H = 17)) : (y = e2 - g2 | 0, 15 >= y >>> 0 ? y = 0 : (b[d2] = g2 | r2 & 1 | 2, b[a2 + (g2 - 4) >> 2] = y | 3, b[c2] |= 1, y = a2 + g2 | 0), E = h2, H = 17);
                      if (17 == H && 0 != (E | 0)) {
                        0 != (y | 0) && eb(y);
                        e2 = E + 8 | 0;
                        break a;
                      }
                      h2 = db(f2);
                      if (0 == (h2 | 0)) {
                        e2 = 0;
                        break a;
                      }
                      d2 = e2 - (0 == (b[d2] & 3 | 0) ? 8 : 4) | 0;
                      fb(h2, a2, d2 >>> 0 < f2 >>> 0 ? d2 : f2, 1);
                      eb(a2);
                      e2 = h2;
                      break a;
                    }
                  }
                  K();
                  throw "Reached an unreachable!";
                }
              while (0);
              return e2;
            }
            function id() {
              if (0 == (b[xa >> 2] | 0)) {
                var a2 = $e(8);
                if (0 == (a2 - 1 & a2 | 0)) b[xa + 8 >> 2] = a2, b[xa + 4 >> 2] = a2, b[xa + 12 >> 2] = -1, b[xa + 16 >> 2] = 2097152, b[xa + 20 >> 2] = 0, b[l + 440 >> 2] = 0, a2 = af(0), b[xa >> 2] = a2 & -16 ^ 1431655768;
                else throw K(), "Reached an unreachable!";
              }
            }
            function bc(a2) {
              if (0 == (a2 | 0)) a2 = 0;
              else {
                a2 = b[a2 - 4 >> 2];
                var f2 = a2 & 3;
                a2 = 1 == (f2 | 0) ? 0 : (a2 & -8) - (0 == (f2 | 0) ? 8 : 4) | 0;
              }
              return a2;
            }
            function Ze(a2, f2) {
              var c2 = b[a2 + 4 >> 2] & -8;
              if (256 > f2 >>> 0) var d2 = 0;
              else c2 >>> 0 >= (f2 + 4 | 0) >>> 0 && (c2 - f2 | 0) >>> 0 <= b[xa + 8 >> 2] << 1 >>> 0 ? d2 = a2 : d2 = 0;
              return d2;
            }
            function gc(a2) {
              var f2, c2 = l + 444 | 0;
              for (f2 = c2 >> 2; ; ) {
                var d2 = t[f2];
                if (d2 >>> 0 <= a2 >>> 0 && (d2 + b[f2 + 1] | 0) >>> 0 > a2 >>> 0) {
                  a2 = c2;
                  break;
                }
                f2 = t[f2 + 2];
                if (0 == (f2 | 0)) {
                  a2 = 0;
                  break;
                }
                c2 = f2;
                f2 = c2 >> 2;
              }
              return a2;
            }
            function Ab(a2, f2) {
              var c2 = a2 + 8 | 0;
              c2 = 0 == (c2 & 7 | 0) ? 0 : -c2 & 7;
              var d2 = f2 - c2 | 0;
              b[l + 24 >> 2] = a2 + c2 | 0;
              b[l + 12 >> 2] = d2;
              b[c2 + (a2 + 4) >> 2] = d2 | 1;
              b[f2 + (a2 + 4) >> 2] = 40;
              b[l + 28 >> 2] = b[xa + 16 >> 2];
            }
            function Xe() {
              for (var a2 = 0; ; ) {
                var f2 = a2 << 1, c2 = (f2 << 2) + l + 40 | 0;
                b[l + (f2 + 3 << 2) + 40 >> 2] = c2;
                b[l + (f2 + 2 << 2) + 40 >> 2] = c2;
                a2 = a2 + 1 | 0;
                if (32 == (a2 | 0)) break;
              }
            }
            function jd(a2, f2, c2) {
              var d2 = f2 >> 2, e2 = a2 >> 2, n2 = a2 + 8 | 0;
              n2 = 0 == (n2 & 7 | 0) ? 0 : -n2 & 7;
              var h2 = f2 + 8 | 0;
              var g2 = 0 == (h2 & 7 | 0) ? 0 : -h2 & 7;
              var k2 = g2 >> 2;
              var p2 = f2 + g2 | 0, y = n2 + c2 | 0;
              h2 = y >> 2;
              var E = a2 + y | 0, H = p2 - (a2 + n2) - c2 | 0;
              b[(n2 + 4 >> 2) + e2] = c2 | 3;
              c2 = (p2 | 0) == (b[l + 24 >> 2] | 0);
              a: do
                if (c2) {
                  var x = b[l + 12 >> 2] + H | 0;
                  b[l + 12 >> 2] = x;
                  b[l + 24 >> 2] = E;
                  b[h2 + (e2 + 1)] = x | 1;
                } else if ((p2 | 0) == (b[l + 20 >> 2] | 0)) x = b[l + 8 >> 2] + H | 0, b[l + 8 >> 2] = x, b[l + 20 >> 2] = E, b[h2 + (e2 + 1)] = x | 1, b[(a2 + x + y | 0) >> 2] = x;
                else {
                  var q2 = t[k2 + (d2 + 1)];
                  if (1 == (q2 & 3 | 0)) {
                    x = q2 & -8;
                    var v2 = q2 >>> 3, m2 = 256 > q2 >>> 0;
                    b: do
                      if (m2) {
                        var w2 = t[((g2 | 8) >> 2) + d2], z2 = t[k2 + (d2 + 3)];
                        if ((w2 | 0) == (z2 | 0)) b[l >> 2] &= 1 << v2 ^ -1;
                        else {
                          q2 = ((q2 >>> 2 & 1073741822) << 2) + l + 40 | 0;
                          var A2 = (w2 | 0) == (q2 | 0) ? 15 : w2 >>> 0 < t[l + 16 >> 2] >>> 0 ? 18 : 15;
                          if (15 == A2 && !((z2 | 0) != (q2 | 0) && z2 >>> 0 < t[l + 16 >> 2] >>> 0)) {
                            b[w2 + 12 >> 2] = z2;
                            b[z2 + 8 >> 2] = w2;
                            break b;
                          }
                          K();
                          throw "Reached an unreachable!";
                        }
                      } else {
                        w2 = p2;
                        z2 = t[((g2 | 24) >> 2) + d2];
                        var C2 = t[k2 + (d2 + 3)], D2 = (C2 | 0) == (w2 | 0);
                        do {
                          if (D2) {
                            var B2 = g2 | 16;
                            var F2 = B2 + (f2 + 4) | 0, G2 = b[F2 >> 2];
                            if (0 == (G2 | 0)) {
                              if (B2 = f2 + B2 | 0, G2 = b[B2 >> 2], 0 == (G2 | 0)) {
                                G2 = 0;
                                B2 = G2 >> 2;
                                break;
                              }
                            } else B2 = F2, A2 = 25;
                            for (; ; ) {
                              F2 = G2 + 20 | 0;
                              var I2 = b[F2 >> 2];
                              if (0 != (I2 | 0)) B2 = F2, G2 = I2;
                              else {
                                F2 = G2 + 16 | 0;
                                I2 = t[F2 >> 2];
                                if (0 == (I2 | 0)) break;
                                B2 = F2;
                                G2 = I2;
                              }
                            }
                            if (B2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                            b[B2 >> 2] = 0;
                          } else {
                            B2 = t[((g2 | 8) >> 2) + d2];
                            if (B2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                            b[B2 + 12 >> 2] = C2;
                            b[C2 + 8 >> 2] = B2;
                            G2 = C2;
                          }
                          B2 = G2 >> 2;
                        } while (0);
                        if (0 != (z2 | 0)) {
                          C2 = g2 + (f2 + 28) | 0;
                          D2 = (b[C2 >> 2] << 2) + l + 304 | 0;
                          F2 = (w2 | 0) == (b[D2 >> 2] | 0);
                          do {
                            if (F2) {
                              b[D2 >> 2] = G2;
                              if (0 != (G2 | 0)) break;
                              b[l + 4 >> 2] &= 1 << b[C2 >> 2] ^ -1;
                              break b;
                            }
                            if (z2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                            I2 = z2 + 16 | 0;
                            (b[I2 >> 2] | 0) == (w2 | 0) ? b[I2 >> 2] = G2 : b[z2 + 20 >> 2] = G2;
                            if (0 == (G2 | 0)) break b;
                          } while (0);
                          if (G2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                          b[B2 + 6] = z2;
                          w2 = g2 | 16;
                          z2 = t[(w2 >> 2) + d2];
                          if (0 != (z2 | 0)) {
                            if (z2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                            b[B2 + 4] = z2;
                            b[z2 + 24 >> 2] = G2;
                          }
                          w2 = t[(w2 + 4 >> 2) + d2];
                          if (0 != (w2 | 0)) {
                            if (w2 >>> 0 < t[l + 16 >> 2] >>> 0) throw K(), "Reached an unreachable!";
                            b[B2 + 5] = w2;
                            b[w2 + 24 >> 2] = G2;
                          }
                        }
                      }
                    while (0);
                    q2 = f2 + (x | g2) | 0;
                    x = x + H | 0;
                  } else q2 = p2, x = H;
                  q2 = q2 + 4 | 0;
                  b[q2 >> 2] &= -2;
                  b[h2 + (e2 + 1)] = x | 1;
                  b[(x >> 2) + e2 + h2] = x;
                  if (256 > x >>> 0) {
                    v2 = x >>> 2 & 1073741822;
                    q2 = (v2 << 2) + l + 40 | 0;
                    m2 = t[l >> 2];
                    x = 1 << (x >>> 3);
                    if (0 == (m2 & x | 0)) b[l >> 2] = m2 | x, x = q2, v2 = (v2 + 2 << 2) + l + 40 | 0;
                    else if (v2 = (v2 + 2 << 2) + l + 40 | 0, x = t[v2 >> 2], !(x >>> 0 >= t[l + 16 >> 2] >>> 0)) throw K(), "Reached an unreachable!";
                    b[v2 >> 2] = E;
                    b[x + 12 >> 2] = E;
                    b[h2 + (e2 + 2)] = x;
                    b[h2 + (e2 + 3)] = q2;
                  } else if (q2 = E, m2 = x >>> 8, 0 == (m2 | 0) ? m2 = 0 : 16777215 < x >>> 0 ? m2 = 31 : (v2 = (m2 + 1048320 | 0) >>> 16 & 8, w2 = m2 << v2, m2 = (w2 + 520192 | 0) >>> 16 & 4, w2 <<= m2, z2 = (w2 + 245760 | 0) >>> 16 & 2, v2 = 14 - (m2 | v2 | z2) + (w2 << z2 >>> 15) | 0, m2 = x >>> ((v2 + 7 | 0) >>> 0) & 1 | v2 << 1), v2 = (m2 << 2) + l + 304 | 0, b[h2 + (e2 + 7)] = m2, w2 = y + (a2 + 16) | 0, b[h2 + (e2 + 5)] = 0, b[w2 >> 2] = 0, w2 = b[l + 4 >> 2], z2 = 1 << m2, 0 == (w2 & z2 | 0)) b[l + 4 >> 2] = w2 | z2, b[v2 >> 2] = q2, b[h2 + (e2 + 6)] = v2, b[h2 + (e2 + 3)] = q2, b[h2 + (e2 + 2)] = q2;
                  else for (d2 = x << (31 == (m2 | 0) ? 0 : 25 - (m2 >>> 1) | 0), f2 = b[v2 >> 2]; ; ) {
                    if ((b[f2 + 4 >> 2] & -8 | 0) == (x | 0)) {
                      d2 = f2 + 8 | 0;
                      k2 = t[d2 >> 2];
                      g2 = t[l + 16 >> 2];
                      if (!(f2 >>> 0 < g2 >>> 0 || k2 >>> 0 < g2 >>> 0)) {
                        b[k2 + 12 >> 2] = q2;
                        b[d2 >> 2] = q2;
                        b[h2 + (e2 + 2)] = k2;
                        b[h2 + (e2 + 3)] = f2;
                        b[h2 + (e2 + 6)] = 0;
                        break a;
                      }
                      K();
                      throw "Reached an unreachable!";
                    }
                    k2 = (d2 >>> 31 << 2) + f2 + 16 | 0;
                    g2 = t[k2 >> 2];
                    if (0 == (g2 | 0)) {
                      if (k2 >>> 0 >= t[l + 16 >> 2] >>> 0) {
                        b[k2 >> 2] = q2;
                        b[h2 + (e2 + 6)] = f2;
                        b[h2 + (e2 + 3)] = q2;
                        b[h2 + (e2 + 2)] = q2;
                        break a;
                      }
                      K();
                      throw "Reached an unreachable!";
                    }
                    d2 <<= 1;
                    f2 = g2;
                  }
                }
              while (0);
              return a2 + (n2 | 8) | 0;
            }
            function bf() {
              return q.Yb | 0;
            }
            function cf() {
              return q.Hb | 0;
            }
            function od(a2) {
              b[a2 >> 2] = pd + 8 | 0;
            }
            function qd(a2) {
              0 != (a2 | 0) && eb(a2);
            }
            function df(a2) {
              hc(a2);
              qd(a2);
            }
            function hc(a2) {
              ef(a2 | 0);
            }
            function ff(a2) {
              od(a2 | 0);
              b[a2 >> 2] = rd + 8 | 0;
            }
            function gf(a2) {
              hc(a2 | 0);
              qd(a2);
            }
            function kd(a2, f2) {
              var c2 = t[l + 24 >> 2];
              var d2 = c2 >> 2;
              var e2 = gc(c2), h2 = b[e2 >> 2];
              var g2 = b[e2 + 4 >> 2];
              e2 = h2 + g2 | 0;
              var k2 = h2 + (g2 - 39) | 0;
              h2 = h2 + (g2 - 47) + (0 == (k2 & 7 | 0) ? 0 : -k2 & 7) | 0;
              h2 = h2 >>> 0 < (c2 + 16 | 0) >>> 0 ? c2 : h2;
              k2 = h2 + 8 | 0;
              g2 = k2 >> 2;
              Ab(a2, f2 - 40 | 0);
              b[(h2 + 4 | 0) >> 2] = 27;
              b[g2] = b[l + 444 >> 2];
              b[g2 + 1] = b[l + 448 >> 2];
              b[g2 + 2] = b[l + 452 >> 2];
              b[g2 + 3] = b[l + 456 >> 2];
              b[l + 444 >> 2] = a2;
              b[l + 448 >> 2] = f2;
              b[l + 456 >> 2] = 0;
              b[l + 452 >> 2] = k2;
              a2 = h2 + 28 | 0;
              b[a2 >> 2] = 7;
              f2 = (h2 + 32 | 0) >>> 0 < e2 >>> 0;
              a: do
                if (f2) for (; ; ) {
                  f2 = a2 + 4 | 0;
                  b[f2 >> 2] = 7;
                  if ((a2 + 8 | 0) >>> 0 >= e2 >>> 0) break a;
                  a2 = f2;
                }
              while (0);
              e2 = (h2 | 0) == (c2 | 0);
              a: do
                if (!e2) if (a2 = h2 - c2 | 0, f2 = c2 + a2 | 0, g2 = a2 + (c2 + 4) | 0, b[g2 >> 2] &= -2, b[d2 + 1] = a2 | 1, b[f2 >> 2] = a2, 256 > a2 >>> 0) {
                  g2 = a2 >>> 2 & 1073741822;
                  f2 = (g2 << 2) + l + 40 | 0;
                  k2 = t[l >> 2];
                  a2 = 1 << (a2 >>> 3);
                  if (0 == (k2 & a2 | 0)) b[l >> 2] = k2 | a2, a2 = f2, g2 = (g2 + 2 << 2) + l + 40 | 0;
                  else if (g2 = (g2 + 2 << 2) + l + 40 | 0, a2 = t[g2 >> 2], !(a2 >>> 0 >= t[l + 16 >> 2] >>> 0)) throw K(), "Reached an unreachable!";
                  b[g2 >> 2] = c2;
                  b[a2 + 12 >> 2] = c2;
                  b[d2 + 2] = a2;
                  b[d2 + 3] = f2;
                } else {
                  f2 = c2;
                  k2 = a2 >>> 8;
                  if (0 == (k2 | 0)) k2 = 0;
                  else if (16777215 < a2 >>> 0) k2 = 31;
                  else {
                    g2 = (k2 + 1048320 | 0) >>> 16 & 8;
                    var p2 = k2 << g2;
                    k2 = (p2 + 520192 | 0) >>> 16 & 4;
                    p2 <<= k2;
                    var q2 = (p2 + 245760 | 0) >>> 16 & 2;
                    g2 = 14 - (k2 | g2 | q2) + (p2 << q2 >>> 15) | 0;
                    k2 = a2 >>> ((g2 + 7 | 0) >>> 0) & 1 | g2 << 1;
                  }
                  g2 = (k2 << 2) + l + 304 | 0;
                  b[d2 + 7] = k2;
                  b[d2 + 5] = 0;
                  b[d2 + 4] = 0;
                  p2 = b[l + 4 >> 2];
                  q2 = 1 << k2;
                  if (0 == (p2 & q2 | 0)) b[l + 4 >> 2] = p2 | q2, b[g2 >> 2] = f2, b[d2 + 6] = g2, b[d2 + 3] = c2, b[d2 + 2] = c2;
                  else for (e2 = a2 << (31 == (k2 | 0) ? 0 : 25 - (k2 >>> 1) | 0), h2 = b[g2 >> 2]; ; ) {
                    if ((b[h2 + 4 >> 2] & -8 | 0) == (a2 | 0)) {
                      c2 = h2 + 8 | 0;
                      e2 = t[c2 >> 2];
                      a2 = t[l + 16 >> 2];
                      if (!(h2 >>> 0 < a2 >>> 0 || e2 >>> 0 < a2 >>> 0)) {
                        b[e2 + 12 >> 2] = f2;
                        b[c2 >> 2] = f2;
                        b[d2 + 2] = e2;
                        b[d2 + 3] = h2;
                        b[d2 + 6] = 0;
                        break a;
                      }
                      K();
                      throw "Reached an unreachable!";
                    }
                    g2 = (e2 >>> 31 << 2) + h2 + 16 | 0;
                    k2 = t[g2 >> 2];
                    if (0 == (k2 | 0)) {
                      if (g2 >>> 0 >= t[l + 16 >> 2] >>> 0) {
                        b[g2 >> 2] = f2;
                        b[d2 + 6] = h2;
                        b[d2 + 3] = c2;
                        b[d2 + 2] = c2;
                        break a;
                      }
                      K();
                      throw "Reached an unreachable!";
                    }
                    e2 <<= 1;
                    h2 = k2;
                  }
                }
              while (0);
            }
            function hf(a2, c2) {
              function f2(a3) {
                if ("double" === a3) var f3 = (cb[0] = b[c2 + d2 >> 2], cb[1] = b[c2 + d2 + 4 >> 2], Xb[0]);
                else "i64" == a3 ? f3 = [b[c2 + d2 >> 2], b[c2 + d2 + 4 >> 2]] : (a3 = "i32", f3 = b[c2 + d2 >> 2]);
                d2 += Q.Cc(a3);
                return f3;
              }
              for (var d2 = 0, e2 = [], h2, g2; ; ) {
                var k2 = a2;
                h2 = D[a2];
                if (0 === h2) break;
                g2 = D[a2 + 1];
                if (37 == h2) {
                  var l2 = false, p2 = false, y = false, E = false;
                  a: for (; ; ) {
                    switch (g2) {
                      case 43:
                        l2 = true;
                        break;
                      case 45:
                        p2 = true;
                        break;
                      case 35:
                        y = true;
                        break;
                      case 48:
                        if (E) break a;
                        else {
                          E = true;
                          break;
                        }
                      default:
                        break a;
                    }
                    a2++;
                    g2 = D[a2 + 1];
                  }
                  var H = 0;
                  if (42 == g2) H = f2("i32"), a2++, g2 = D[a2 + 1];
                  else for (; 48 <= g2 && 57 >= g2; ) H = 10 * H + (g2 - 48), a2++, g2 = D[a2 + 1];
                  var x = false;
                  if (46 == g2) {
                    var q2 = 0;
                    x = true;
                    a2++;
                    g2 = D[a2 + 1];
                    if (42 == g2) q2 = f2("i32"), a2++;
                    else for (; ; ) {
                      g2 = D[a2 + 1];
                      if (48 > g2 || 57 < g2) break;
                      q2 = 10 * q2 + (g2 - 48);
                      a2++;
                    }
                    g2 = D[a2 + 1];
                  } else q2 = 6;
                  switch (String.fromCharCode(g2)) {
                    case "h":
                      g2 = D[a2 + 2];
                      if (104 == g2) {
                        a2++;
                        var t2 = 1;
                      } else t2 = 2;
                      break;
                    case "l":
                      g2 = D[a2 + 2];
                      108 == g2 ? (a2++, t2 = 8) : t2 = 4;
                      break;
                    case "L":
                    case "q":
                    case "j":
                      t2 = 8;
                      break;
                    case "z":
                    case "t":
                    case "I":
                      t2 = 4;
                      break;
                    default:
                      t2 = null;
                  }
                  t2 && a2++;
                  g2 = D[a2 + 1];
                  if (-1 != "diuoxXp".split("").indexOf(String.fromCharCode(g2))) {
                    k2 = 100 == g2 || 105 == g2;
                    t2 = t2 || 4;
                    var v2 = h2 = f2("i" + 8 * t2), m2;
                    8 == t2 && (h2 = Q.Mc(h2[0], h2[1], 117 == g2));
                    4 >= t2 && (h2 = (k2 ? L : R)(h2 & Math.pow(256, t2) - 1, 8 * t2));
                    var w2 = Math.abs(h2);
                    k2 = "";
                    if (100 == g2 || 105 == g2) 8 == t2 && Bb ? m2 = Bb.stringify(v2[0], v2[1]) : m2 = L(h2, 8 * t2, 1).toString(10);
                    else if (117 == g2) 8 == t2 && Bb ? m2 = Bb.stringify(v2[0], v2[1], true) : m2 = R(h2, 8 * t2, 1).toString(10), h2 = Math.abs(h2);
                    else if (111 == g2) m2 = (y ? "0" : "") + w2.toString(8);
                    else if (120 == g2 || 88 == g2) {
                      k2 = y ? "0x" : "";
                      if (0 > h2) {
                        h2 = -h2;
                        m2 = (w2 - 1).toString(16);
                        y = [];
                        for (v2 = 0; v2 < m2.length; v2++) y.push((15 - parseInt(m2[v2], 16)).toString(16));
                        for (m2 = y.join(""); m2.length < 2 * t2; ) m2 = "f" + m2;
                      } else m2 = w2.toString(16);
                      88 == g2 && (k2 = k2.toUpperCase(), m2 = m2.toUpperCase());
                    } else 112 == g2 && (0 === w2 ? m2 = "(nil)" : (k2 = "0x", m2 = w2.toString(16)));
                    if (x) for (; m2.length < q2; ) m2 = "0" + m2;
                    for (l2 && (k2 = 0 > h2 ? "-" + k2 : "+" + k2); k2.length + m2.length < H; ) p2 ? m2 += " " : E ? m2 = "0" + m2 : k2 = " " + k2;
                    m2 = k2 + m2;
                    m2.split("").forEach(function(a3) {
                      e2.push(a3.charCodeAt(0));
                    });
                  } else if (-1 != "fFeEgG".split("").indexOf(String.fromCharCode(g2))) {
                    h2 = f2("double");
                    if (isNaN(h2)) m2 = "nan", E = false;
                    else if (isFinite(h2)) {
                      x = false;
                      t2 = Math.min(q2, 20);
                      if (103 == g2 || 71 == g2) x = true, q2 = q2 || 1, t2 = parseInt(h2.toExponential(t2).split("e")[1], 10), q2 > t2 && -4 <= t2 ? (g2 = (103 == g2 ? "f" : "F").charCodeAt(0), q2 -= t2 + 1) : (g2 = (103 == g2 ? "e" : "E").charCodeAt(0), q2--), t2 = Math.min(q2, 20);
                      if (101 == g2 || 69 == g2) m2 = h2.toExponential(t2), /[eE][-+]\d$/.test(m2) && (m2 = m2.slice(0, -1) + "0" + m2.slice(-1));
                      else if (102 == g2 || 70 == g2) m2 = h2.toFixed(t2);
                      k2 = m2.split("e");
                      if (x && !y) for (; 1 < k2[0].length && -1 != k2[0].indexOf(".") && ("0" == k2[0].slice(-1) || "." == k2[0].slice(-1)); ) k2[0] = k2[0].slice(0, -1);
                      else for (y && -1 == m2.indexOf(".") && (k2[0] += "."); q2 > t2++; ) k2[0] += "0";
                      m2 = k2[0] + (1 < k2.length ? "e" + k2[1] : "");
                      69 == g2 && (m2 = m2.toUpperCase());
                      l2 && 0 <= h2 && (m2 = "+" + m2);
                    } else m2 = (0 > h2 ? "-" : "") + "inf", E = false;
                    for (; m2.length < H; ) p2 ? m2 += " " : !E || "-" != m2[0] && "+" != m2[0] ? m2 = (E ? "0" : " ") + m2 : m2 = m2[0] + "0" + m2.slice(1);
                    97 > g2 && (m2 = m2.toUpperCase());
                    m2.split("").forEach(function(a3) {
                      e2.push(a3.charCodeAt(0));
                    });
                  } else if (115 == g2) {
                    (l2 = f2("i8*")) ? (l2 = B(l2), x && l2.length > q2 && (l2 = l2.slice(0, q2))) : l2 = A("(null)", true);
                    if (!p2) for (; l2.length < H--; ) e2.push(32);
                    e2 = e2.concat(l2);
                    if (p2) for (; l2.length < H--; ) e2.push(32);
                  } else if (99 == g2) {
                    for (p2 && e2.push(f2("i8")); 0 < --H; ) e2.push(32);
                    p2 || e2.push(f2("i8"));
                  } else if (110 == g2) p2 = f2("i32*"), b[p2 >> 2] = e2.length;
                  else if (37 == g2) e2.push(h2);
                  else for (v2 = k2; v2 < a2 + 2; v2++) e2.push(D[v2]);
                  a2 += 2;
                } else e2.push(h2), a2 += 1;
              }
              return e2;
            }
            function jf(a2, b2, c2, d2) {
              c2 = hf(c2, d2);
              b2 = void 0 === b2 ? c2.length : Math.min(c2.length, b2 - 1);
              for (d2 = 0; d2 < b2; d2++) D[a2 + d2] = c2[d2];
              D[a2 + d2] = 0;
              return c2.length;
            }
            function Ld(a2, b2, c2) {
              return jf(a2, void 0, b2, c2);
            }
            function Y(a2) {
              Y.a || (Y.a = g([0], "i32", 2));
              return b[Y.a >> 2] = a2;
            }
            function kf(a2, b2, c2, d2) {
              a2 = F.streams[a2];
              if (!a2 || a2.object.T) return Y(ra.Pa), -1;
              if (a2.pa) {
                if (a2.object.Y) return Y(ra.Jb), -1;
                if (0 > c2 || 0 > d2) return Y(ra.wa), -1;
                for (var f2 = a2.object.v; f2.length < d2; ) f2.push(0);
                for (var e2 = 0; e2 < c2; e2++) f2[d2 + e2] = I[b2 + e2];
                a2.object.timestamp = Date.now();
                return e2;
              }
              Y(ra.fa);
              return -1;
            }
            function sd(a2, b2, c2) {
              var f2 = F.streams[a2];
              if (f2) {
                if (f2.pa) {
                  if (0 > c2) return Y(ra.wa), -1;
                  if (f2.object.T) {
                    if (f2.object.ca) {
                      for (a2 = 0; a2 < c2; a2++) try {
                        f2.object.ca(D[b2 + a2]);
                      } catch (na) {
                        return Y(ra.Qa), -1;
                      }
                      f2.object.timestamp = Date.now();
                      return a2;
                    }
                    Y(ra.Lb);
                    return -1;
                  }
                  b2 = kf(a2, b2, c2, f2.position);
                  -1 != b2 && (f2.position += b2);
                  return b2;
                }
                Y(ra.fa);
                return -1;
              }
              Y(ra.Pa);
              return -1;
            }
            function lf(a2) {
              return z(a2);
            }
            function mf(a2, b2) {
              return sd(b2, a2, lf(a2));
            }
            function Nb(a2, b2) {
              a2 = R(a2 & 255);
              D[Nb.a] = a2;
              return -1 == sd(b2, Nb.a, 1) ? (b2 in F.streams && (F.streams[b2].error = true), -1) : a2;
            }
            function Md(a2) {
              var c2 = b[Ob >> 2];
              a2 = mf(a2, c2);
              return 0 > a2 ? a2 : 0 > Nb(10, c2) ? -1 : a2 + 1;
            }
            function Xa(a2, c2, d2) {
              if (20 <= d2) {
                for (d2 = a2 + d2; a2 % 4; ) D[a2++] = c2;
                0 > c2 && (c2 += 256);
                a2 >>= 2;
                for (var f2 = d2 >> 2, e2 = c2 | c2 << 8 | c2 << 16 | c2 << 24; a2 < f2; ) b[a2++] = e2;
                for (a2 <<= 2; a2 < d2; ) D[a2++] = c2;
              } else for (; d2--; ) D[a2++] = c2;
            }
            function fb(a2, c2, d2) {
              if (20 <= d2 && c2 % 2 == a2 % 2) if (c2 % 4 == a2 % 4) {
                for (d2 = c2 + d2; c2 % 4; ) D[a2++] = D[c2++];
                c2 >>= 2;
                a2 >>= 2;
                for (var f2 = d2 >> 2; c2 < f2; ) b[a2++] = b[c2++];
                c2 <<= 2;
                for (a2 <<= 2; c2 < d2; ) D[a2++] = D[c2++];
              } else {
                d2 = c2 + d2;
                c2 % 2 && (D[a2++] = D[c2++]);
                c2 >>= 1;
                a2 >>= 1;
                for (f2 = d2 >> 1; c2 < f2; ) Da[a2++] = Da[c2++];
                c2 <<= 1;
                a2 <<= 1;
                c2 < d2 && (D[a2++] = D[c2++]);
              }
              else for (; d2--; ) D[a2++] = D[c2++];
            }
            function K() {
              throw "abort() at " + Error().stack;
            }
            function $e(a2) {
              switch (a2) {
                case 8:
                  return 4096;
                case 54:
                case 56:
                case 21:
                case 61:
                case 63:
                case 22:
                case 67:
                case 23:
                case 24:
                case 25:
                case 26:
                case 27:
                case 69:
                case 28:
                case 101:
                case 70:
                case 71:
                case 29:
                case 30:
                case 199:
                case 75:
                case 76:
                case 32:
                case 43:
                case 44:
                case 80:
                case 46:
                case 47:
                case 45:
                case 48:
                case 49:
                case 42:
                case 82:
                case 33:
                case 7:
                case 108:
                case 109:
                case 107:
                case 112:
                case 119:
                case 121:
                  return 200809;
                case 13:
                case 104:
                case 94:
                case 95:
                case 34:
                case 35:
                case 77:
                case 81:
                case 83:
                case 84:
                case 85:
                case 86:
                case 87:
                case 88:
                case 89:
                case 90:
                case 91:
                case 94:
                case 95:
                case 110:
                case 111:
                case 113:
                case 114:
                case 115:
                case 116:
                case 117:
                case 118:
                case 120:
                case 40:
                case 16:
                case 79:
                case 19:
                  return -1;
                case 92:
                case 93:
                case 5:
                case 72:
                case 6:
                case 74:
                case 92:
                case 93:
                case 96:
                case 97:
                case 98:
                case 99:
                case 102:
                case 103:
                case 105:
                  return 1;
                case 38:
                case 66:
                case 50:
                case 51:
                case 4:
                  return 1024;
                case 15:
                case 64:
                case 41:
                  return 32;
                case 55:
                case 37:
                case 17:
                  return 2147483647;
                case 18:
                case 1:
                  return 47839;
                case 59:
                case 57:
                  return 99;
                case 68:
                case 58:
                  return 2048;
                case 0:
                  return 2097152;
                case 3:
                  return 65536;
                case 14:
                  return 32768;
                case 73:
                  return 32767;
                case 39:
                  return 16384;
                case 60:
                  return 1e3;
                case 106:
                  return 700;
                case 52:
                  return 256;
                case 62:
                  return 255;
                case 2:
                  return 100;
                case 65:
                  return 64;
                case 36:
                  return 20;
                case 100:
                  return 16;
                case 20:
                  return 6;
                case 53:
                  return 4;
              }
              Y(ra.wa);
              return -1;
            }
            function af(a2) {
              var c2 = Math.floor(Date.now() / 1e3);
              a2 && (b[a2 >> 2] = c2);
              return c2;
            }
            function nf() {
              return Y.a;
            }
            function La(a2) {
              var b2 = La;
              b2.b || (Ia = Ia + 4095 >> 12 << 12, b2.b = true);
              b2 = Ia;
              0 != a2 && Q.Cb(a2);
              return b2;
            }
            function td(a2) {
              a2 = a2 || w.arguments;
              w.setStatus && w.setStatus("");
              w.preRun && w.preRun();
              var b2 = null;
              w._main && (p(ud), b2 = w.jc(a2), w.noExitRuntime || (p(vd), of.print()));
              w.postRun && w.postRun();
              return b2;
            }
            var ib = {};
            if ("undefined" == typeof wb) var wb = {};
            var w = {};
            try {
              this.Module = w;
            } catch (a2) {
              this.Module = w = {};
            }
            var wd = "object" === typeof wb;
            if (wd) if (wd) w.print || (w.print = function(a2) {
              console.log(a2);
            }), w.printErr || (w.printErr = function(a2) {
              console.log(a2);
            }), w.read = function(a2) {
              var b2 = new XMLHttpRequest();
              b2.open("GET", a2, false);
              b2.send(null);
              return b2.responseText;
            }, w.arguments || "undefined" != typeof arguments && (w.arguments = arguments);
            else throw "Unknown runtime environment. Where are we?";
            else w.print = print, w.printErr = printErr, w.read = "undefined" != typeof read ? read : function(a2) {
              snarf(a2);
            }, w.arguments || ("undefined" != typeof scriptArgs ? w.arguments = scriptArgs : "undefined" != typeof arguments && (w.arguments = arguments));
            "undefined" == !w.load && w.read && (w.load = function(a2) {
              c(w.read(a2));
            });
            w.printErr || (w.printErr = function() {
            });
            w.print || (w.print = w.printErr);
            w.arguments || (w.arguments = []);
            w.print = w.print;
            w.qf = w.printErr;
            var Q = { Bb: function() {
              return M;
            }, kd: function(a2) {
              M = a2;
            }, bf: function(a2, b2) {
              b2 = b2 || 4;
              return 1 == b2 ? a2 : "Math.ceil((" + a2 + ")/" + b2 + ")*" + b2;
            }, Ic: function(a2) {
              return a2 in Q.Sb || a2 in Q.Nb;
            }, Jc: function(a2) {
              return "*" == a2[a2.length - 1];
            }, Lc: function(a2) {
              return isPointerType(a2) ? false : /^\[\d+ x (.*)\]/.test(a2) || /<?{ ?[^}]* ?}>?/.test(a2) ? true : "%" == a2[0];
            }, Sb: { i1: 0, i8: 0, i16: 0, i32: 0, i64: 0 }, Nb: { "float": 0, "double": 0 }, Se: function(a2, b2, c2, e2) {
              var f2 = Math.pow(2, e2) - 1;
              if (32 > e2) switch (c2) {
                case "shl":
                  return [a2 << e2, b2 << e2 | (a2 & f2 << 32 - e2) >>> 32 - e2];
                case "ashr":
                  return [(a2 >>> e2 | (b2 & f2) << 32 - e2) >> 0 >>> 0, b2 >> e2 >>> 0];
                case "lshr":
                  return [(a2 >>> e2 | (b2 & f2) << 32 - e2) >>> 0, b2 >>> e2];
              }
              else if (32 == e2) switch (c2) {
                case "shl":
                  return [0, a2];
                case "ashr":
                  return [b2, 0 > (b2 | 0) ? f2 : 0];
                case "lshr":
                  return [b2, 0];
              }
              else switch (c2) {
                case "shl":
                  return [0, a2 << e2 - 32];
                case "ashr":
                  return [b2 >> e2 - 32 >>> 0, 0 > (b2 | 0) ? f2 : 0];
                case "lshr":
                  return [b2 >>> e2 - 32, 0];
              }
              d("unknown bitshift64 op: " + [value, c2, e2]);
            }, nf: function(a2, b2) {
              return (a2 | 0 | b2 | 0) + 4294967296 * (Math.round(a2 / 4294967296) | Math.round(b2 / 4294967296));
            }, Qe: function(a2, b2) {
              return ((a2 | 0) & (b2 | 0)) + 4294967296 * (Math.round(a2 / 4294967296) & Math.round(b2 / 4294967296));
            }, uf: function(a2, b2) {
              return ((a2 | 0) ^ (b2 | 0)) + 4294967296 * (Math.round(a2 / 4294967296) ^ Math.round(b2 / 4294967296));
            }, Ea: function(a2) {
              if (1 == Q.ja) return 1;
              var b2 = { "%i1": 1, "%i8": 1, "%i16": 2, "%i32": 4, "%i64": 8, "%float": 4, "%double": 8 }["%" + a2];
              b2 || ("*" == a2[a2.length - 1] ? b2 = Q.ja : "i" == a2[0] && (a2 = parseInt(a2.substr(1)), e(0 == a2 % 8), b2 = a2 / 8));
              return b2;
            }, Cc: function(a2) {
              return Math.max(Q.Ea(a2), Q.ja);
            }, tc: function(a2, b2) {
              var c2 = {};
              return b2 ? a2.filter(function(a3) {
                return c2[a3[b2]] ? false : c2[a3[b2]] = true;
              }) : a2.filter(function(a3) {
                return c2[a3] ? false : c2[a3] = true;
              });
            }, set: function() {
              for (var a2 = "object" === typeof arguments[0] ? arguments[0] : arguments, b2 = {}, c2 = 0; c2 < a2.length; c2++) b2[a2[c2]] = 0;
              return b2;
            }, ic: function(a2) {
              a2.W = 0;
              a2.la = 0;
              var b2 = [], c2 = -1;
              a2.lb = a2.Ca.map(function(f2) {
                var d2;
                if (Q.Ic(f2) || Q.Jc(f2)) f2 = d2 = Q.Ea(f2);
                else if (Q.Lc(f2)) d2 = ib.types[f2].W, f2 = ib.types[f2].la;
                else throw "Unclear type in struct: " + f2 + ", in " + a2.Qc + " :: " + dump(ib.types[a2.Qc]);
                f2 = a2.pf ? 1 : Math.min(f2, Q.ja);
                a2.la = Math.max(a2.la, f2);
                f2 = Q.ka(a2.W, f2);
                a2.W = f2 + d2;
                0 <= c2 && b2.push(f2 - c2);
                return c2 = f2;
              });
              a2.W = Q.ka(a2.W, a2.la);
              0 == b2.length ? a2.kb = a2.W : 1 == Q.tc(b2).length && (a2.kb = b2[0]);
              a2.lf = 1 != a2.kb;
              return a2.lb;
            }, zc: function(a2, b2, c2) {
              if (b2) {
                c2 = c2 || 0;
                var f2 = ("undefined" === typeof ib ? Q.tf : ib.types)[b2];
                if (!f2) return null;
                e(f2.Ca.length === a2.length, "Number of named fields must match the type for " + b2);
                var d2 = f2.lb;
              } else f2 = { Ca: a2.map(function(a3) {
                return a3[0];
              }) }, d2 = Q.ic(f2);
              var g2 = { Ne: f2.W };
              b2 ? a2.forEach(function(a3, b3) {
                if ("string" === typeof a3) g2[a3] = d2[b3] + c2;
                else {
                  var e2;
                  for (e2 in a3) var h2 = e2;
                  g2[h2] = Q.zc(a3[h2], f2.Ca[b3], d2[b3]);
                }
              }) : a2.forEach(function(a3, b3) {
                g2[a3[1]] = d2[b3];
              });
              return g2;
            }, Pe: function(a2) {
              var b2 = Ma.length;
              Ma.push(a2);
              Ma.push(0);
              return b2;
            }, Ma: function(a2) {
              var b2 = M;
              M += a2;
              M = M + 3 >> 2 << 2;
              return b2;
            }, Cb: function(a2) {
              var c2 = Ia;
              Ia += a2;
              Ia = Ia + 3 >> 2 << 2;
              if (Ia >= bb) {
                for (; bb <= Ia; ) bb = 2 * bb + 4095 >> 12 << 12;
                a2 = D;
                var d2 = new ArrayBuffer(bb);
                D = new Int8Array(d2);
                Da = new Int16Array(d2);
                b = new Int32Array(d2);
                I = new Uint8Array(d2);
                Z = new Uint16Array(d2);
                t = new Uint32Array(d2);
                Cb = new Float32Array(d2);
                ic = new Float64Array(d2);
                D.set(a2);
              }
              return c2;
            }, ka: function(a2, b2) {
              return Math.ceil(a2 / (b2 ? b2 : 4)) * (b2 ? b2 : 4);
            }, Mc: function(a2, b2, c2) {
              return c2 ? (a2 >>> 0) + 4294967296 * (b2 >>> 0) : (a2 >>> 0) + 4294967296 * (b2 | 0);
            }, ja: 4, Me: 0 }, of = { Xb: 0, bb: 0, rf: {}, mf: function(a2, b2) {
              b2 || (this.bb++, this.bb >= this.Xb && d("\n\nToo many corrections!"));
            }, print: function() {
            } }, lb, Kd = this;
            w.ccall = h;
            w.cwrap = function(a2, b2, c2) {
              return function() {
                return h(a2, b2, c2, Array.prototype.slice.call(arguments));
              };
            };
            w.setValue = k;
            w.getValue = function(a2, c2) {
              c2 = c2 || "i8";
              "*" === c2[c2.length - 1] && (c2 = "i32");
              switch (c2) {
                case "i1":
                  return D[a2];
                case "i8":
                  return D[a2];
                case "i16":
                  return Da[a2 >> 1];
                case "i32":
                  return b[a2 >> 2];
                case "i64":
                  return b[a2 >> 2];
                case "float":
                  return Cb[a2 >> 2];
                case "double":
                  return cb[0] = b[a2 >> 2], cb[1] = b[a2 + 4 >> 2], Xb[0];
                default:
                  d("invalid type for setValue: " + c2);
              }
              return null;
            };
            w.ALLOC_NORMAL = 0;
            w.ALLOC_STACK = 1;
            w.ALLOC_STATIC = 2;
            w.allocate = g;
            w.Pointer_stringify = m;
            w.Array_stringify = function(a2) {
              for (var b2 = "", c2 = 0; c2 < a2.length; c2++) b2 += String.fromCharCode(a2[c2]);
              return b2;
            };
            var M, pf = w.TOTAL_STACK || 5242880, bb = w.TOTAL_MEMORY || 10485760;
            e(!!Int32Array && !!Float64Array && !!new Int32Array(1).subarray && !!new Int32Array(1).set, "Cannot fallback to non-typed array case: Code is too specialized");
            var Qa = new ArrayBuffer(bb);
            var D = new Int8Array(Qa);
            var Da = new Int16Array(Qa);
            var b = new Int32Array(Qa);
            var I = new Uint8Array(Qa);
            var Z = new Uint16Array(Qa);
            var t = new Uint32Array(Qa);
            var Cb = new Float32Array(Qa);
            var ic = new Float64Array(Qa);
            b[0] = 255;
            e(255 === I[0] && 0 === I[3], "Typed arrays 2 must be run on a little-endian system");
            var jc = A("(null)");
            var Ia = jc.length;
            for (var Pb = 0; Pb < jc.length; Pb++) D[Pb] = jc[Pb];
            w.HEAP = void 0;
            w.HEAP8 = D;
            w.HEAP16 = Da;
            w.HEAP32 = b;
            w.HEAPU8 = I;
            w.HEAPU16 = Z;
            w.HEAPU32 = t;
            w.HEAPF32 = Cb;
            w.HEAPF64 = ic;
            var kc = (M = Q.ka(Ia)) + pf;
            var lc = Q.ka(kc, 8), cb = b.subarray(lc >> 2), Xb = ic.subarray(lc >> 3);
            kc = lc + 8;
            Ia = kc + 4095 >> 12 << 12;
            var xd = [], ud = [], vd = [];
            w.Array_copy = v;
            w.TypedArray_copy = function(a2, b2, c2) {
              void 0 === c2 && (c2 = 0);
              for (var d2 = new Uint8Array(b2 - c2), f2 = c2; f2 < b2; ++f2) d2[f2 - c2] = D[a2 + f2];
              return d2.buffer;
            };
            w.String_len = z;
            w.String_copy = B;
            w.intArrayFromString = A;
            w.intArrayToString = function(a2) {
              for (var b2 = [], c2 = 0; c2 < a2.length; c2++) {
                var d2 = a2[c2];
                255 < d2 && (d2 &= 255);
                b2.push(String.fromCharCode(d2));
              }
              return b2.join("");
            };
            w.writeStringToMemory = G;
            w.writeArrayToMemory = C;
            var q = [], mc = 0;
            la.X = 1;
            Ja.X = 1;
            Sa.X = 1;
            U.X = 1;
            yb.X = 1;
            wa.X = 1;
            Pc.X = 1;
            w._crn_get_width = xe;
            w._crn_get_height = ze;
            w._crn_get_levels = Ae;
            w._crn_get_dxt_format = Be;
            w._crn_get_decompressed_size = Ce;
            w._crn_decompress = De;
            Qc.X = 1;
            Uc.X = 1;
            Rc.X = 1;
            Sc.X = 1;
            Tc.X = 1;
            Zc.X = 1;
            $c.X = 1;
            ad.X = 1;
            bd.X = 1;
            w._malloc = db;
            db.X = 1;
            fd.X = 1;
            hd.X = 1;
            gd.X = 1;
            md.X = 1;
            w._free = eb;
            eb.X = 1;
            nd.X = 1;
            jd.X = 1;
            kd.X = 1;
            var Bb = (function() {
              function a2(a3, b3) {
                this.j = a3 | 0;
                this.m = b3 | 0;
              }
              function b2(a3, b3, c3) {
                null != a3 && ("number" == typeof a3 ? this.C(a3, b3, c3) : null == b3 && "string" != typeof a3 ? this.J(a3, 256) : this.J(a3, b3));
              }
              function c2() {
                return new b2(null);
              }
              function d2(a3) {
                return "0123456789abcdefghijklmnopqrstuvwxyz".charAt(a3);
              }
              function e2(a3, b3) {
                a3 = h2[a3.charCodeAt(b3)];
                return null == a3 ? -1 : a3;
              }
              function g2(a3) {
                var b3 = c2();
                b3.S(a3);
                return b3;
              }
              a2.Va = {};
              a2.S = function(b3) {
                if (-128 <= b3 && 128 > b3) {
                  var c3 = a2.Va[b3];
                  if (c3) return c3;
                }
                c3 = new a2(b3 | 0, 0 > b3 ? -1 : 0);
                -128 <= b3 && 128 > b3 && (a2.Va[b3] = c3);
                return c3;
              };
              a2.C = function(b3) {
                return isNaN(b3) || !isFinite(b3) ? a2.K : b3 <= -a2.Ya ? a2.w : b3 + 1 >= a2.Ya ? a2.yc : 0 > b3 ? a2.C(-b3).s() : new a2(b3 % a2.P | 0, b3 / a2.P | 0);
              };
              a2.I = function(b3, c3) {
                return new a2(b3, c3);
              };
              a2.J = function(b3, c3) {
                if (0 == b3.length) throw Error("number format error: empty string");
                c3 = c3 || 10;
                if (2 > c3 || 36 < c3) throw Error("radix out of range: " + c3);
                if ("-" == b3.charAt(0)) return a2.J(b3.substring(1), c3).s();
                if (0 <= b3.indexOf("-")) throw Error('number format error: interior "-" character: ' + b3);
                for (var d3 = a2.C(Math.pow(c3, 8)), f2 = a2.K, e3 = 0; e3 < b3.length; e3 += 8) {
                  var g3 = Math.min(8, b3.length - e3), h3 = parseInt(b3.substring(e3, e3 + g3), c3);
                  8 > g3 ? (g3 = a2.C(Math.pow(c3, g3)), f2 = f2.multiply(g3).add(a2.C(h3))) : (f2 = f2.multiply(d3), f2 = f2.add(a2.C(h3)));
                }
                return f2;
              };
              a2.xa = 65536;
              a2.Ge = 16777216;
              a2.P = a2.xa * a2.xa;
              a2.He = a2.P / 2;
              a2.Ie = a2.P * a2.xa;
              a2.dc = a2.P * a2.P;
              a2.Ya = a2.dc / 2;
              a2.K = a2.S(0);
              a2.ga = a2.S(1);
              a2.Wa = a2.S(-1);
              a2.yc = a2.I(-1, 2147483647);
              a2.w = a2.I(0, -2147483648);
              a2.Xa = a2.S(16777216);
              a2.prototype.va = function() {
                return this.m * a2.P + this.Bc();
              };
              a2.prototype.toString = function(b3) {
                b3 = b3 || 10;
                if (2 > b3 || 36 < b3) throw Error("radix out of range: " + b3);
                if (this.Z()) return "0";
                if (this.A()) {
                  if (this.equals(a2.w)) {
                    var c3 = a2.C(b3), d3 = this.H(c3);
                    c3 = d3.multiply(c3).V(this);
                    return d3.toString(b3) + c3.j.toString(b3);
                  }
                  return "-" + this.s().toString(b3);
                }
                d3 = a2.C(Math.pow(b3, 6));
                c3 = this;
                for (var f2 = ""; ; ) {
                  var e3 = c3.H(d3), g3 = c3.V(e3.multiply(d3)).j.toString(b3);
                  c3 = e3;
                  if (c3.Z()) return g3 + f2;
                  for (; 6 > g3.length; ) g3 = "0" + g3;
                  f2 = "" + g3 + f2;
                }
              };
              a2.prototype.Bc = function() {
                return 0 <= this.j ? this.j : a2.P + this.j;
              };
              a2.prototype.Z = function() {
                return 0 == this.m && 0 == this.j;
              };
              a2.prototype.A = function() {
                return 0 > this.m;
              };
              a2.prototype.rb = function() {
                return 1 == (this.j & 1);
              };
              a2.prototype.equals = function(a3) {
                return this.m == a3.m && this.j == a3.j;
              };
              a2.prototype.vb = function(a3) {
                return 0 > this.compare(a3);
              };
              a2.prototype.Dc = function(a3) {
                return 0 < this.compare(a3);
              };
              a2.prototype.Ec = function(a3) {
                return 0 <= this.compare(a3);
              };
              a2.prototype.compare = function(a3) {
                if (this.equals(a3)) return 0;
                var b3 = this.A(), c3 = a3.A();
                return b3 && !c3 ? -1 : !b3 && c3 ? 1 : this.V(a3).A() ? -1 : 1;
              };
              a2.prototype.s = function() {
                return this.equals(a2.w) ? a2.w : this.Sc().add(a2.ga);
              };
              a2.prototype.add = function(b3) {
                var c3 = this.m >>> 16, d3 = this.m & 65535, f2 = this.j >>> 16, e3 = b3.m >>> 16, g3 = b3.m & 65535, h3 = b3.j >>> 16;
                b3 = (this.j & 65535) + (b3.j & 65535);
                h3 = (b3 >>> 16) + (f2 + h3);
                f2 = h3 >>> 16;
                f2 += d3 + g3;
                c3 = (f2 >>> 16) + (c3 + e3) & 65535;
                return a2.I((h3 & 65535) << 16 | b3 & 65535, c3 << 16 | f2 & 65535);
              };
              a2.prototype.V = function(a3) {
                return this.add(a3.s());
              };
              a2.prototype.multiply = function(b3) {
                if (this.Z() || b3.Z()) return a2.K;
                if (this.equals(a2.w)) return b3.rb() ? a2.w : a2.K;
                if (b3.equals(a2.w)) return this.rb() ? a2.w : a2.K;
                if (this.A()) return b3.A() ? this.s().multiply(b3.s()) : this.s().multiply(b3).s();
                if (b3.A()) return this.multiply(b3.s()).s();
                if (this.vb(a2.Xa) && b3.vb(a2.Xa)) return a2.C(this.va() * b3.va());
                var c3 = this.m >>> 16, d3 = this.m & 65535, f2 = this.j >>> 16, e3 = this.j & 65535, g3 = b3.m >>> 16, h3 = b3.m & 65535, k3 = b3.j >>> 16;
                b3 = b3.j & 65535;
                var y = e3 * b3;
                var l3 = (y >>> 16) + f2 * b3;
                var n2 = l3 >>> 16;
                l3 = (l3 & 65535) + e3 * k3;
                n2 += l3 >>> 16;
                n2 += d3 * b3;
                var m3 = n2 >>> 16;
                n2 = (n2 & 65535) + f2 * k3;
                m3 += n2 >>> 16;
                n2 = (n2 & 65535) + e3 * h3;
                m3 = m3 + (n2 >>> 16) + (c3 * b3 + d3 * k3 + f2 * h3 + e3 * g3) & 65535;
                return a2.I((l3 & 65535) << 16 | y & 65535, m3 << 16 | n2 & 65535);
              };
              a2.prototype.H = function(b3) {
                if (b3.Z()) throw Error("division by zero");
                if (this.Z()) return a2.K;
                if (this.equals(a2.w)) {
                  if (b3.equals(a2.ga) || b3.equals(a2.Wa)) return a2.w;
                  if (b3.equals(a2.w)) return a2.ga;
                  var c3 = this.gd(1).H(b3).shiftLeft(1);
                  if (c3.equals(a2.K)) return b3.A() ? a2.ga : a2.Wa;
                  var d3 = this.V(b3.multiply(c3));
                  return c3.add(d3.H(b3));
                }
                if (b3.equals(a2.w)) return a2.K;
                if (this.A()) return b3.A() ? this.s().H(b3.s()) : this.s().H(b3).s();
                if (b3.A()) return this.H(b3.s()).s();
                var f2 = a2.K;
                for (d3 = this; d3.Ec(b3); ) {
                  c3 = Math.max(1, Math.floor(d3.va() / b3.va()));
                  var e3 = Math.ceil(Math.log(c3) / Math.LN2);
                  e3 = 48 >= e3 ? 1 : Math.pow(2, e3 - 48);
                  for (var g3 = a2.C(c3), h3 = g3.multiply(b3); h3.A() || h3.Dc(d3); ) c3 -= e3, g3 = a2.C(c3), h3 = g3.multiply(b3);
                  g3.Z() && (g3 = a2.ga);
                  f2 = f2.add(g3);
                  d3 = d3.V(h3);
                }
                return f2;
              };
              a2.prototype.yb = function(a3) {
                return this.V(this.H(a3).multiply(a3));
              };
              a2.prototype.Sc = function() {
                return a2.I(~this.j, ~this.m);
              };
              a2.prototype.shiftLeft = function(b3) {
                b3 &= 63;
                if (0 == b3) return this;
                var c3 = this.j;
                return 32 > b3 ? a2.I(c3 << b3, this.m << b3 | c3 >>> 32 - b3) : a2.I(0, c3 << b3 - 32);
              };
              a2.prototype.gd = function(b3) {
                b3 &= 63;
                if (0 == b3) return this;
                var c3 = this.m;
                return 32 > b3 ? a2.I(this.j >>> b3 | c3 << 32 - b3, c3 >> b3) : a2.I(c3 >> b3 - 32, 0 <= c3 ? 0 : -1);
              };
              b2.prototype.ya = function(a3, b3, c3, d3, f2, e3) {
                for (; 0 <= --e3; ) {
                  var g3 = b3 * this[a3++] + c3[d3] + f2;
                  f2 = Math.floor(g3 / 67108864);
                  c3[d3++] = g3 & 67108863;
                }
                return f2;
              };
              b2.prototype.i = 26;
              b2.prototype.G = 67108863;
              b2.prototype.ea = 67108864;
              b2.prototype.Ob = Math.pow(2, 52);
              b2.prototype.Ta = 26;
              b2.prototype.Ua = 0;
              var h2 = [], k2;
              var l2 = 48;
              for (k2 = 0; 9 >= k2; ++k2) h2[l2++] = k2;
              l2 = 97;
              for (k2 = 10; 36 > k2; ++k2) h2[l2++] = k2;
              l2 = 65;
              for (k2 = 10; 36 > k2; ++k2) h2[l2++] = k2;
              b2.prototype.copyTo = function(a3) {
                for (var b3 = this.t - 1; 0 <= b3; --b3) a3[b3] = this[b3];
                a3.t = this.t;
                a3.g = this.g;
              };
              b2.prototype.S = function(a3) {
                this.t = 1;
                this.g = 0 > a3 ? -1 : 0;
                0 < a3 ? this[0] = a3 : -1 > a3 ? this[0] = a3 + DV : this.t = 0;
              };
              b2.prototype.J = function(a3, c3) {
                if (16 == c3) c3 = 4;
                else if (8 == c3) c3 = 3;
                else if (256 == c3) c3 = 8;
                else if (2 == c3) c3 = 1;
                else if (32 == c3) c3 = 5;
                else if (4 == c3) c3 = 2;
                else {
                  this.xc(a3, c3);
                  return;
                }
                this.g = this.t = 0;
                for (var d3 = a3.length, f2 = false, g3 = 0; 0 <= --d3; ) {
                  var h3 = 8 == c3 ? a3[d3] & 255 : e2(a3, d3);
                  0 > h3 ? "-" == a3.charAt(d3) && (f2 = true) : (f2 = false, 0 == g3 ? this[this.t++] = h3 : g3 + c3 > this.i ? (this[this.t - 1] |= (h3 & (1 << this.i - g3) - 1) << g3, this[this.t++] = h3 >> this.i - g3) : this[this.t - 1] |= h3 << g3, g3 += c3, g3 >= this.i && (g3 -= this.i));
                }
                8 == c3 && 0 != (a3[0] & 128) && (this.g = -1, 0 < g3 && (this[this.t - 1] |= (1 << this.i - g3) - 1 << g3));
                this.R();
                f2 && b2.a.F(this, this);
              };
              b2.prototype.R = function() {
                for (var a3 = this.g & this.G; 0 < this.t && this[this.t - 1] == a3; ) --this.t;
              };
              b2.prototype.Ba = function(a3, b3) {
                var c3;
                for (c3 = this.t - 1; 0 <= c3; --c3) b3[c3 + a3] = this[c3];
                for (c3 = a3 - 1; 0 <= c3; --c3) b3[c3] = 0;
                b3.t = this.t + a3;
                b3.g = this.g;
              };
              b2.prototype.vc = function(a3, b3) {
                for (var c3 = a3; c3 < this.t; ++c3) b3[c3 - a3] = this[c3];
                b3.t = Math.max(this.t - a3, 0);
                b3.g = this.g;
              };
              b2.prototype.ub = function(a3, b3) {
                var c3 = a3 % this.i, d3 = this.i - c3, f2 = (1 << d3) - 1;
                a3 = Math.floor(a3 / this.i);
                var e3 = this.g << c3 & this.G, g3;
                for (g3 = this.t - 1; 0 <= g3; --g3) b3[g3 + a3 + 1] = this[g3] >> d3 | e3, e3 = (this[g3] & f2) << c3;
                for (g3 = a3 - 1; 0 <= g3; --g3) b3[g3] = 0;
                b3[a3] = e3;
                b3.t = this.t + a3 + 1;
                b3.g = this.g;
                b3.R();
              };
              b2.prototype.Uc = function(a3, b3) {
                b3.g = this.g;
                var c3 = Math.floor(a3 / this.i);
                if (c3 >= this.t) b3.t = 0;
                else {
                  a3 %= this.i;
                  var d3 = this.i - a3, f2 = (1 << a3) - 1;
                  b3[0] = this[c3] >> a3;
                  for (var e3 = c3 + 1; e3 < this.t; ++e3) b3[e3 - c3 - 1] |= (this[e3] & f2) << d3, b3[e3 - c3] = this[e3] >> a3;
                  0 < a3 && (b3[this.t - c3 - 1] |= (this.g & f2) << d3);
                  b3.t = this.t - c3;
                  b3.R();
                }
              };
              b2.prototype.F = function(a3, b3) {
                for (var c3 = 0, d3 = 0, f2 = Math.min(a3.t, this.t); c3 < f2; ) d3 += this[c3] - a3[c3], b3[c3++] = d3 & this.G, d3 >>= this.i;
                if (a3.t < this.t) {
                  for (d3 -= a3.g; c3 < this.t; ) d3 += this[c3], b3[c3++] = d3 & this.G, d3 >>= this.i;
                  d3 += this.g;
                } else {
                  for (d3 += this.g; c3 < a3.t; ) d3 -= a3[c3], b3[c3++] = d3 & this.G, d3 >>= this.i;
                  d3 -= a3.g;
                }
                b3.g = 0 > d3 ? -1 : 0;
                -1 > d3 ? b3[c3++] = this.ea + d3 : 0 < d3 && (b3[c3++] = d3);
                b3.t = c3;
                b3.R();
              };
              b2.prototype.Pc = function(a3, c3) {
                var d3 = this.abs(), f2 = a3.abs(), e3 = d3.t;
                for (c3.t = e3 + f2.t; 0 <= --e3; ) c3[e3] = 0;
                for (e3 = 0; e3 < f2.t; ++e3) c3[e3 + d3.t] = d3.ya(0, f2[e3], c3, e3, 0, d3.t);
                c3.g = 0;
                c3.R();
                this.g != a3.g && b2.a.F(c3, c3);
              };
              b2.prototype.aa = function(a3, d3, f2) {
                var e3 = a3.abs();
                if (!(0 >= e3.t)) {
                  var g3 = this.abs();
                  if (g3.t < e3.t) null != d3 && d3.S(0), null != f2 && this.copyTo(f2);
                  else {
                    null == f2 && (f2 = c2());
                    var h3 = c2(), k3 = this.g;
                    a3 = a3.g;
                    var l3 = e3[e3.t - 1], n2 = 1, m3;
                    0 != (m3 = l3 >>> 16) && (l3 = m3, n2 += 16);
                    0 != (m3 = l3 >> 8) && (l3 = m3, n2 += 8);
                    0 != (m3 = l3 >> 4) && (l3 = m3, n2 += 4);
                    0 != (m3 = l3 >> 2) && (l3 = m3, n2 += 2);
                    0 != l3 >> 1 && (n2 += 1);
                    l3 = this.i - n2;
                    0 < l3 ? (e3.ub(l3, h3), g3.ub(l3, f2)) : (e3.copyTo(h3), g3.copyTo(f2));
                    e3 = h3.t;
                    g3 = h3[e3 - 1];
                    if (0 != g3) {
                      m3 = g3 * (1 << this.Ta) + (1 < e3 ? h3[e3 - 2] >> this.Ua : 0);
                      n2 = this.Ob / m3;
                      m3 = (1 << this.Ta) / m3;
                      var u2 = 1 << this.Ua, y = f2.t, p2 = y - e3, r2 = null == d3 ? c2() : d3;
                      h3.Ba(p2, r2);
                      0 <= f2.kc(r2) && (f2[f2.t++] = 1, f2.F(r2, f2));
                      b2.c.Ba(e3, r2);
                      for (r2.F(h3, h3); h3.t < e3; ) h3[h3.t++] = 0;
                      for (; 0 <= --p2; ) {
                        var q2 = f2[--y] == g3 ? this.G : Math.floor(f2[y] * n2 + (f2[y - 1] + u2) * m3);
                        if ((f2[y] += h3.ya(0, q2, f2, p2, 0, e3)) < q2) for (h3.Ba(p2, r2), f2.F(r2, f2); f2[y] < --q2; ) f2.F(r2, f2);
                      }
                      null != d3 && (f2.vc(e3, d3), k3 != a3 && b2.a.F(d3, d3));
                      f2.t = e3;
                      f2.R();
                      0 < l3 && f2.Uc(l3, f2);
                      0 > k3 && b2.a.F(f2, f2);
                    }
                  }
                }
              };
              b2.prototype.toString = function(a3) {
                if (0 > this.g) return "-" + this.s().toString(a3);
                if (16 == a3) a3 = 4;
                else if (8 == a3) a3 = 3;
                else if (2 == a3) a3 = 1;
                else if (32 == a3) a3 = 5;
                else if (4 == a3) a3 = 2;
                else return this.ld(a3);
                var b3 = (1 << a3) - 1, c3, f2 = false, e3 = "", g3 = this.t, h3 = this.i - g3 * this.i % a3;
                if (0 < g3--) for (h3 < this.i && 0 < (c3 = this[g3] >> h3) && (f2 = true, e3 = d2(c3)); 0 <= g3; ) h3 < a3 ? (c3 = (this[g3] & (1 << h3) - 1) << a3 - h3, c3 |= this[--g3] >> (h3 += this.i - a3)) : (c3 = this[g3] >> (h3 -= a3) & b3, 0 >= h3 && (h3 += this.i, --g3)), 0 < c3 && (f2 = true), f2 && (e3 += d2(c3));
                return f2 ? e3 : "0";
              };
              b2.prototype.s = function() {
                var a3 = c2();
                b2.a.F(this, a3);
                return a3;
              };
              b2.prototype.abs = function() {
                return 0 > this.g ? this.s() : this;
              };
              b2.prototype.kc = function(a3) {
                var b3 = this.g - a3.g;
                if (0 != b3) return b3;
                var c3 = this.t;
                b3 = c3 - a3.t;
                if (0 != b3) return b3;
                for (; 0 <= --c3; ) if (0 != (b3 = this[c3] - a3[c3])) return b3;
                return 0;
              };
              b2.a = g2(0);
              b2.c = g2(1);
              b2.prototype.xc = function(a3, c3) {
                this.S(0);
                null == c3 && (c3 = 10);
                for (var d3 = this.ab(c3), f2 = Math.pow(c3, d3), g3 = false, h3 = 0, k3 = 0, l3 = 0; l3 < a3.length; ++l3) {
                  var n2 = e2(a3, l3);
                  0 > n2 ? "-" == a3.charAt(l3) && 0 == this.La() && (g3 = true) : (k3 = c3 * k3 + n2, ++h3 >= d3 && (this.gb(f2), this.fb(k3, 0), k3 = h3 = 0));
                }
                0 < h3 && (this.gb(Math.pow(c3, h3)), this.fb(k3, 0));
                g3 && b2.a.F(this, this);
              };
              b2.prototype.ab = function(a3) {
                return Math.floor(Math.LN2 * this.i / Math.log(a3));
              };
              b2.prototype.La = function() {
                return 0 > this.g ? -1 : 0 >= this.t || 1 == this.t && 0 >= this[0] ? 0 : 1;
              };
              b2.prototype.gb = function(a3) {
                this[this.t] = this.ya(0, a3 - 1, this, 0, 0, this.t);
                ++this.t;
                this.R();
              };
              b2.prototype.fb = function(a3, b3) {
                if (0 != a3) {
                  for (; this.t <= b3; ) this[this.t++] = 0;
                  for (this[b3] += a3; this[b3] >= this.ea; ) this[b3] -= this.ea, ++b3 >= this.t && (this[this.t++] = 0), ++this[b3];
                }
              };
              b2.prototype.ld = function(a3) {
                null == a3 && (a3 = 10);
                if (0 == this.La() || 2 > a3 || 36 < a3) return "0";
                var b3 = Math.pow(a3, this.ab(a3)), d3 = g2(b3), f2 = c2(), e3 = c2(), h3 = "";
                for (this.aa(d3, f2, e3); 0 < f2.La(); ) h3 = (b3 + e3.pb()).toString(a3).substr(1) + h3, f2.aa(d3, f2, e3);
                return e3.pb().toString(a3) + h3;
              };
              b2.prototype.pb = function() {
                if (0 > this.g) {
                  if (1 == this.t) return this[0] - this.ea;
                  if (0 == this.t) return -1;
                } else {
                  if (1 == this.t) return this[0];
                  if (0 == this.t) return 0;
                }
                return (this[1] & (1 << 32 - this.i) - 1) << this.i | this[0];
              };
              b2.prototype.$a = function(a3, b3) {
                for (var c3 = 0, d3 = 0, f2 = Math.min(a3.t, this.t); c3 < f2; ) d3 += this[c3] + a3[c3], b3[c3++] = d3 & this.G, d3 >>= this.i;
                if (a3.t < this.t) {
                  for (d3 += a3.g; c3 < this.t; ) d3 += this[c3], b3[c3++] = d3 & this.G, d3 >>= this.i;
                  d3 += this.g;
                } else {
                  for (d3 += this.g; c3 < a3.t; ) d3 += a3[c3], b3[c3++] = d3 & this.G, d3 >>= this.i;
                  d3 += a3.g;
                }
                b3.g = 0 > d3 ? -1 : 0;
                0 < d3 ? b3[c3++] = d3 : -1 > d3 && (b3[c3++] = this.ea + d3);
                b3.t = c3;
                b3.R();
              };
              var m2 = { result: [0, 0], add: function(b3, c3, d3, f2) {
                b3 = new a2(b3, c3).add(new a2(d3, f2));
                m2.result[0] = b3.j;
                m2.result[1] = b3.m;
              }, V: function(b3, c3, d3, f2) {
                b3 = new a2(b3, c3).V(new a2(d3, f2));
                m2.result[0] = b3.j;
                m2.result[1] = b3.m;
              }, multiply: function(b3, c3, d3, f2) {
                b3 = new a2(b3, c3).multiply(new a2(d3, f2));
                m2.result[0] = b3.j;
                m2.result[1] = b3.m;
              }, wb: function() {
                m2.da = new b2();
                m2.da.J("4294967296", 10);
              }, qa: function(a3, c3) {
                var d3 = new b2();
                d3.J(c3.toString(), 10);
                c3 = new b2();
                d3.Pc(m2.da, c3);
                d3 = new b2();
                d3.J(a3.toString(), 10);
                a3 = new b2();
                d3.$a(c3, a3);
                return a3;
              }, Ze: function(c3, d3, f2, e3, g3) {
                m2.da || m2.wb();
                g3 ? (c3 = m2.qa(c3 >>> 0, d3 >>> 0), e3 = m2.qa(f2 >>> 0, e3 >>> 0), f2 = new b2(), c3.aa(e3, f2, null), e3 = new b2(), c3 = new b2(), f2.aa(m2.da, c3, e3), m2.result[0] = parseInt(e3.toString()) | 0, m2.result[1] = parseInt(c3.toString()) | 0) : (c3 = new a2(c3, d3), e3 = new a2(f2, e3), f2 = c3.H(e3), m2.result[0] = f2.j, m2.result[1] = f2.m);
              }, yb: function(c3, d3, f2, e3, g3) {
                m2.da || m2.wb();
                g3 ? (c3 = m2.qa(c3 >>> 0, d3 >>> 0), e3 = m2.qa(f2 >>> 0, e3 >>> 0), f2 = new b2(), c3.aa(e3, null, f2), e3 = new b2(), c3 = new b2(), f2.aa(m2.da, c3, e3), m2.result[0] = parseInt(e3.toString()) | 0, m2.result[1] = parseInt(c3.toString()) | 0) : (c3 = new a2(c3, d3), e3 = new a2(f2, e3), f2 = c3.yb(e3), m2.result[0] = f2.j, m2.result[1] = f2.m);
              }, stringify: function(c3, d3, f2) {
                c3 = new a2(c3, d3).toString();
                f2 && "-" == c3[0] && (m2.Na || (m2.Na = new b2(), m2.Na.J("18446744073709551616", 10)), f2 = new b2(), f2.J(c3, 10), c3 = new b2(), m2.Na.$a(f2, c3), c3 = c3.toString(10));
                return c3;
              } };
              return m2;
            })(), ra = { pd: 7, fa: 13, qd: 98, rd: 99, sd: 97, td: 11, ud: 114, Pa: 9, vd: 74, wd: 16, xd: 125, yd: 10, zd: 103, Ad: 111, Bd: 104, Cd: 35, Dd: 89, Ed: 33, Fd: 122, Ib: 17, Gd: 14, Hd: 27, Id: 113, Jd: 43, Kd: 84, Ld: 115, Md: 4, wa: 22, Qa: 5, Nd: 106, Jb: 21, Kb: 40, Od: 24, Pd: 31, Qd: 90, Rd: 72, Sd: 36, Td: 100, Ud: 102, Vd: 101, Wd: 23, Xd: 105, Yd: 61, Zd: 19, Ra: 2, $d: 8, ae: 37, be: 67, ce: 12, de: 42, ee: 92, fe: 28, ge: 63, he: 60, ie: 38, je: 107, Sa: 20, ke: 39, le: 131, me: 88, ne: 95, oe: 25, Lb: 6, pe: 75, qe: 130, re: 1, se: 32, te: 71, ue: 93, ve: 91, we: 34, xe: 30, ye: 29, ze: 3, Ae: 116, Be: 62, Ce: 110, De: 26, Ee: 11, Fe: 18 }, nc = 0, Ob = 0, oc = 0, F = { rc: "/", Rc: 2, streams: [null], nb: true, Za: function(a2, b2) {
              if ("string" !== typeof a2) return null;
              void 0 === b2 && (b2 = F.rc);
              a2 && "/" == a2[0] && (b2 = "");
              a2 = (b2 + "/" + a2).split("/").reverse();
              for (b2 = [""]; a2.length; ) {
                var c2 = a2.pop();
                "" != c2 && "." != c2 && (".." == c2 ? 1 < b2.length && b2.pop() : b2.push(c2));
              }
              return 1 == b2.length ? "/" : b2.join("/");
            }, za: function(a2, b2, c2) {
              var d2 = { Kc: false, oa: false, error: 0, name: null, path: null, object: null, Ga: false, zb: null, Ha: null };
              a2 = F.Za(a2);
              if ("/" == a2) d2.Kc = true, d2.oa = d2.Ga = true, d2.name = "/", d2.path = d2.zb = "/", d2.object = d2.Ha = F.root;
              else if (null !== a2) {
                c2 = c2 || 0;
                a2 = a2.slice(1).split("/");
                for (var f2 = F.root, e2 = [""]; a2.length; ) {
                  1 == a2.length && f2.Y && (d2.Ga = true, d2.zb = 1 == e2.length ? "/" : e2.join("/"), d2.Ha = f2, d2.name = a2[0]);
                  var g2 = a2.shift();
                  if (!f2.Y) {
                    d2.error = ra.Sa;
                    break;
                  } else if (!f2.read) {
                    d2.error = ra.fa;
                    break;
                  } else if (!f2.v.hasOwnProperty(g2)) {
                    d2.error = ra.Ra;
                    break;
                  }
                  f2 = f2.v[g2];
                  if (f2.link && (!b2 || 0 != a2.length)) {
                    if (40 < c2) {
                      d2.error = ra.Kb;
                      break;
                    }
                    d2 = F.Za(f2.link, e2.join("/"));
                    d2 = F.za([d2].concat(a2).join("/"), b2, c2 + 1);
                    break;
                  }
                  e2.push(g2);
                  0 == a2.length && (d2.oa = true, d2.path = e2.join("/"), d2.object = f2);
                }
              }
              return d2;
            }, jb: function(a2, b2) {
              F.hb();
              a2 = F.za(a2, b2);
              if (a2.oa) return a2.object;
              Y(a2.error);
              return null;
            }, eb: function(a2, b2, c2, d2, e2) {
              a2 || (a2 = "/");
              "string" === typeof a2 && (a2 = F.jb(a2));
              if (!a2) throw Y(ra.fa), Error("Parent path must exist.");
              if (!a2.Y) throw Y(ra.Sa), Error("Parent must be a folder.");
              if (!a2.write && !F.nb) throw Y(ra.fa), Error("Parent folder must be writeable.");
              if (!b2 || "." == b2 || ".." == b2) throw Y(ra.Ra), Error("Name must not be empty.");
              if (a2.v.hasOwnProperty(b2)) throw Y(ra.Ib), Error("Can't overwrite object.");
              a2.v[b2] = { read: void 0 === d2 ? true : d2, write: void 0 === e2 ? false : e2, timestamp: Date.now(), Hc: F.Rc++ };
              for (var f2 in c2) c2.hasOwnProperty(f2) && (a2.v[b2][f2] = c2[f2]);
              return a2.v[b2];
            }, Aa: function(a2, b2, c2, d2) {
              return F.eb(a2, b2, { Y: true, T: false, v: {} }, c2, d2);
            }, qc: function(a2, b2, c2, d2) {
              a2 = F.jb(a2);
              if (null === a2) throw Error("Invalid parent.");
              for (b2 = b2.split("/").reverse(); b2.length; ) {
                var f2 = b2.pop();
                f2 && (a2.v.hasOwnProperty(f2) || F.Aa(a2, f2, c2, d2), a2 = a2.v[f2]);
              }
              return a2;
            }, na: function(a2, b2, c2, d2, e2) {
              c2.Y = false;
              return F.eb(a2, b2, c2, d2, e2);
            }, Ue: function(a2, b2, c2, d2, e2) {
              if ("string" === typeof c2) {
                for (var f2 = Array(c2.length), g2 = 0, h2 = c2.length; g2 < h2; ++g2) f2[g2] = c2.charCodeAt(g2);
                c2 = f2;
              }
              return F.na(a2, b2, { T: false, v: c2 }, d2, e2);
            }, Ve: function(a2, b2, c2, d2, e2) {
              return F.na(a2, b2, { T: false, url: c2 }, d2, e2);
            }, We: function(a2, b2, c2, d2, e2) {
              return F.na(a2, b2, { T: false, link: c2 }, d2, e2);
            }, ma: function(a2, b2, c2, d2) {
              if (!c2 && !d2) throw Error("A device must have at least one callback defined.");
              return F.na(a2, b2, { T: true, input: c2, ca: d2 }, !!c2, !!d2);
            }, cf: function(a2) {
              if (a2.T || a2.Y || a2.link || a2.v) return true;
              var b2 = true;
              if ("undefined" !== typeof XMLHttpRequest) e("Cannot do synchronous binary XHRs in modern browsers. Use --embed-file or --preload-file in emcc");
              else if (w.read) try {
                a2.v = A(w.read(a2.url), true);
              } catch (n2) {
                b2 = false;
              }
              else throw Error("Cannot load without read() or XMLHttpRequest.");
              b2 || Y(ra.Qa);
              return b2;
            }, hb: function() {
              F.root || (F.root = { read: true, write: true, Y: true, T: false, timestamp: Date.now(), Hc: 1, v: {} });
            }, ha: function(a2, b2, c2) {
              function d2(a3) {
                null === a3 || 10 === a3 ? (b2.ta(b2.buffer.join("")), b2.buffer = []) : b2.buffer.push(String.fromCharCode(a3));
              }
              e(!F.ha.b, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
              F.ha.b = true;
              F.hb();
              a2 = a2 || w.stdin;
              b2 = b2 || w.stdout;
              c2 = c2 || w.stderr;
              var f2 = true, h2 = true, k2 = true;
              a2 || (f2 = false, a2 = function() {
                if (!a2.cache || !a2.cache.length) {
                  var b3;
                  "undefined" != typeof wb && "function" == typeof wb.prompt ? b3 = wb.prompt("Input: ") : "function" == typeof readline && (b3 = readline());
                  b3 || (b3 = "");
                  a2.cache = A(b3 + "\n", true);
                }
                return a2.cache.shift();
              });
              b2 || (h2 = false, b2 = d2);
              b2.ta || (b2.ta = w.print);
              b2.buffer || (b2.buffer = []);
              c2 || (k2 = false, c2 = d2);
              c2.ta || (c2.ta = w.print);
              c2.buffer || (c2.buffer = []);
              F.Aa("/", "tmp", true, true);
              var l2 = F.Aa("/", "dev", true, true), m2 = F.ma(l2, "stdin", a2), n2 = F.ma(l2, "stdout", null, b2);
              c2 = F.ma(l2, "stderr", null, c2);
              F.ma(l2, "tty", a2, b2);
              F.streams[1] = { path: "/dev/stdin", object: m2, position: 0, sb: true, pa: false, qb: false, tb: !f2, error: false, ib: false, Db: [] };
              F.streams[2] = { path: "/dev/stdout", object: n2, position: 0, sb: false, pa: true, qb: false, tb: !h2, error: false, ib: false, Db: [] };
              F.streams[3] = { path: "/dev/stderr", object: c2, position: 0, sb: false, pa: true, qb: false, tb: !k2, error: false, ib: false, Db: [] };
              nc = g([1], "void*", 2);
              Ob = g([2], "void*", 2);
              oc = g([3], "void*", 2);
              F.qc("/", "dev/shm/tmp", true, true);
              F.streams[nc] = F.streams[1];
              F.streams[Ob] = F.streams[2];
              F.streams[oc] = F.streams[3];
              g([g([0, 0, 0, 0, nc, 0, 0, 0, Ob, 0, 0, 0, oc, 0, 0, 0], "void*", 2)], "void*", 2);
            }, Tc: function() {
              F.ha.b && (F.streams[2] && 0 < F.streams[2].object.ca.buffer.length && F.streams[2].object.ca(10), F.streams[3] && 0 < F.streams[3].object.ca.buffer.length && F.streams[3].object.ca(10));
            }, sf: function(a2) {
              "./" == a2.substr(0, 2) && (a2 = a2.substr(2));
              return a2;
            }, Ye: function(a2) {
              a2 = F.za(a2);
              if (!a2.Ga || !a2.oa) throw "Invalid path " + a2;
              delete a2.Ha.v[a2.name];
            } }, ld = nf, ef;
            xd.unshift({ Da: function() {
              w.noFSInit || F.ha.b || F.ha();
            } });
            ud.push({ Da: function() {
              F.nb = false;
            } });
            vd.push({ Da: function() {
              F.Tc();
            } });
            Y(0);
            Nb.a = g([0], "i8", 2);
            g(12, "void*", 2);
            w.jc = function(a2) {
              function b2() {
                for (var a3 = 0; 3 > a3; a3++) d2.push(0);
              }
              var c2 = a2.length + 1, d2 = [g(A("/bin/this.program"), "i8", 2)];
              b2();
              for (var e2 = 0; e2 < c2 - 1; e2 += 1) d2.push(g(A(a2[e2]), "i8", 2)), b2();
              d2.push(0);
              d2 = g(d2, "i32", 2);
              return _main(c2, d2, 0);
            };
            var qf;
            q.md = g([37, 115, 40, 37, 117, 41, 58, 32, 65, 115, 115, 101, 114, 116, 105, 111, 110, 32, 102, 97, 105, 108, 117, 114, 101, 58, 32, 34, 37, 115, 34, 10, 0], "i8", 2);
            q.nd = g([109, 95, 115, 105, 122, 101, 32, 60, 61, 32, 109, 95, 99, 97, 112, 97, 99, 105, 116, 121, 0], "i8", 2);
            q.a = g([116, 104, 105, 114, 100, 95, 112, 97, 114, 116, 121, 47, 99, 114, 117, 110, 99, 104, 47, 101, 109, 115, 99, 114, 105, 112, 116, 101, 110, 47, 46, 46, 47, 105, 110, 99, 47, 99, 114, 110, 95, 100, 101, 99, 111, 109, 112, 46, 104, 0], "i8", 2);
            q.Vb = g([109, 105, 110, 95, 110, 101, 119, 95, 99, 97, 112, 97, 99, 105, 116, 121, 32, 60, 32, 40, 48, 120, 55, 70, 70, 70, 48, 48, 48, 48, 85, 32, 47, 32, 101, 108, 101, 109, 101, 110, 116, 95, 115, 105, 122, 101, 41, 0], "i8", 2);
            q.$b = g([110, 101, 119, 95, 99, 97, 112, 97, 99, 105, 116, 121, 32, 38, 38, 32, 40, 110, 101, 119, 95, 99, 97, 112, 97, 99, 105, 116, 121, 32, 62, 32, 109, 95, 99, 97, 112, 97, 99, 105, 116, 121, 41, 0], "i8", 2);
            q.ac = g([110, 117, 109, 95, 99, 111, 100, 101, 115, 91, 99, 93, 0], "i8", 2);
            q.bc = g([115, 111, 114, 116, 101, 100, 95, 112, 111, 115, 32, 60, 32, 116, 111, 116, 97, 108, 95, 117, 115, 101, 100, 95, 115, 121, 109, 115, 0], "i8", 2);
            q.cc = g([112, 67, 111, 100, 101, 115, 105, 122, 101, 115, 91, 115, 121, 109, 95, 105, 110, 100, 101, 120, 93, 32, 61, 61, 32, 99, 111, 100, 101, 115, 105, 122, 101, 0], "i8", 2);
            q.ec = g([116, 32, 60, 32, 40, 49, 85, 32, 60, 60, 32, 116, 97, 98, 108, 101, 95, 98, 105, 116, 115, 41, 0], "i8", 2);
            q.fc = g([109, 95, 108, 111, 111, 107, 117, 112, 91, 116, 93, 32, 61, 61, 32, 99, 85, 73, 78, 84, 51, 50, 95, 77, 65, 88, 0], "i8", 2);
            var Yb = g([2], ["i8* (i8*, i32, i32*, i1, i8*)*", 0, 0, 0, 0], 2);
            g([4], ["i32 (i8*, i8*)*", 0, 0, 0, 0], 2);
            var Zb = g(1, "i8*", 2);
            q.o = g([99, 114, 110, 100, 95, 109, 97, 108, 108, 111, 99, 58, 32, 115, 105, 122, 101, 32, 116, 111, 111, 32, 98, 105, 103, 0], "i8", 2);
            q.Eb = g([99, 114, 110, 100, 95, 109, 97, 108, 108, 111, 99, 58, 32, 111, 117, 116, 32, 111, 102, 32, 109, 101, 109, 111, 114, 121, 0], "i8", 2);
            q.u = g([40, 40, 117, 105, 110, 116, 51, 50, 41, 112, 95, 110, 101, 119, 32, 38, 32, 40, 67, 82, 78, 68, 95, 77, 73, 78, 95, 65, 76, 76, 79, 67, 95, 65, 76, 73, 71, 78, 77, 69, 78, 84, 32, 45, 32, 49, 41, 41, 32, 61, 61, 32, 48, 0], "i8", 2);
            q.Fb = g([99, 114, 110, 100, 95, 114, 101, 97, 108, 108, 111, 99, 58, 32, 98, 97, 100, 32, 112, 116, 114, 0], "i8", 2);
            q.Gb = g([99, 114, 110, 100, 95, 102, 114, 101, 101, 58, 32, 98, 97, 100, 32, 112, 116, 114, 0], "i8", 2);
            q.Re = g([99, 114, 110, 100, 95, 109, 115, 105, 122, 101, 58, 32, 98, 97, 100, 32, 112, 116, 114, 0], "i8", 2);
            g([1, 0, 0, 0, 2, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 16, 0, 0, 0, 32, 0, 0, 0, 64, 0, 0, 0, 128, 0, 0, 0, 256, 0, 0, 0, 512, 0, 0, 0, 1024, 0, 0, 0, 2048, 0, 0, 0, 4096, 0, 0, 0, 8192, 0, 0, 0, 16384, 0, 0, 0, 32768, 0, 0, 0, 65536, 0, 0, 0, 131072, 0, 0, 0, 262144, 0, 0, 0, 524288, 0, 0, 0, 1048576, 0, 0, 0, 2097152, 0, 0, 0, 4194304, 0, 0, 0, 8388608, 0, 0, 0, 16777216, 0, 0, 0, 33554432, 0, 0, 0, 67108864, 0, 0, 0, 134217728, 0, 0, 0, 268435456, 0, 0, 0, 536870912, 0, 0, 0, 1073741824, 0, 0, 0, -2147483648, 0, 0, 0], ["i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0], 2);
            q.Mb = g([102, 97, 108, 115, 101, 0], "i8", 2);
            q.Te = g([99, 114, 110, 100, 95, 118, 97, 108, 105, 100, 97, 116, 101, 95, 102, 105, 108, 101, 40, 38, 110, 101, 119, 95, 104, 101, 97, 100, 101, 114, 44, 32, 97, 99, 116, 117, 97, 108, 95, 98, 97, 115, 101, 95, 100, 97, 116, 97, 95, 115, 105, 122, 101, 44, 32, 78, 85, 76, 76, 41, 0], "i8", 2);
            q.Xe = g([40, 116, 111, 116, 97, 108, 95, 115, 121, 109, 115, 32, 62, 61, 32, 49, 41, 32, 38, 38, 32, 40, 116, 111, 116, 97, 108, 95, 115, 121, 109, 115, 32, 60, 61, 32, 112, 114, 101, 102, 105, 120, 95, 99, 111, 100, 105, 110, 103, 58, 58, 99, 77, 97, 120, 83, 117, 112, 112, 111, 114, 116, 101, 100, 83, 121, 109, 115, 41, 32, 38, 38, 32, 40, 99, 111, 100, 101, 95, 115, 105, 122, 101, 95, 108, 105, 109, 105, 116, 32, 62, 61, 32, 49, 41, 0], "i8", 2);
            q.Pb = g([40, 116, 111, 116, 97, 108, 95, 115, 121, 109, 115, 32, 62, 61, 32, 49, 41, 32, 38, 38, 32, 40, 116, 111, 116, 97, 108, 95, 115, 121, 109, 115, 32, 60, 61, 32, 112, 114, 101, 102, 105, 120, 95, 99, 111, 100, 105, 110, 103, 58, 58, 99, 77, 97, 120, 83, 117, 112, 112, 111, 114, 116, 101, 100, 83, 121, 109, 115, 41, 0], "i8", 2);
            q.ba = g([17, 18, 19, 20, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15, 16], "i8", 2);
            q.L = g([48, 0], "i8", 2);
            q.Qb = g([110, 117, 109, 95, 98, 105, 116, 115, 32, 60, 61, 32, 51, 50, 85, 0], "i8", 2);
            q.Rb = g([109, 95, 98, 105, 116, 95, 99, 111, 117, 110, 116, 32, 60, 61, 32, 99, 66, 105, 116, 66, 117, 102, 83, 105, 122, 101, 0], "i8", 2);
            q.Tb = g([116, 32, 33, 61, 32, 99, 85, 73, 78, 84, 51, 50, 95, 77, 65, 88, 0], "i8", 2);
            q.Ub = g([109, 111, 100, 101, 108, 46, 109, 95, 99, 111, 100, 101, 95, 115, 105, 122, 101, 115, 91, 115, 121, 109, 93, 32, 61, 61, 32, 108, 101, 110, 0], "i8", 2);
            g([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 4, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 4, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 4, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 7, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 4, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 6, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 7, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0], ["i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0], 2);
            g([0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 4, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 4, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 7, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0], ["i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0], 2);
            q.Je = g([0, 3, 1, 2], "i8", 2);
            q.c = g([0, 2, 3, 1], "i8", 2);
            q.Ke = g([0, 7, 1, 2, 3, 4, 5, 6], "i8", 2);
            q.b = g([0, 2, 3, 4, 5, 6, 7, 1], "i8", 2);
            q.Le = g([1, 0, 5, 4, 3, 2, 6, 7], "i8", 2);
            q.od = g([1, 0, 7, 6, 5, 4, 3, 2], "i8", 2);
            q.af = g([105, 110, 100, 101, 120, 32, 60, 32, 50, 0], "i8", 2);
            q.df = g([40, 108, 111, 32, 60, 61, 32, 48, 120, 70, 70, 70, 70, 85, 41, 32, 38, 38, 32, 40, 104, 105, 32, 60, 61, 32, 48, 120, 70, 70, 70, 70, 85, 41, 0], "i8", 2);
            q.ff = g([40, 120, 32, 60, 32, 99, 68, 88, 84, 66, 108, 111, 99, 107, 83, 105, 122, 101, 41, 32, 38, 38, 32, 40, 121, 32, 60, 32, 99, 68, 88, 84, 66, 108, 111, 99, 107, 83, 105, 122, 101, 41, 0], "i8", 2);
            q.gf = g([118, 97, 108, 117, 101, 32, 60, 61, 32, 48, 120, 70, 70, 0], "i8", 2);
            q.hf = g([118, 97, 108, 117, 101, 32, 60, 61, 32, 48, 120, 70, 0], "i8", 2);
            q.jf = g([40, 108, 111, 32, 60, 61, 32, 48, 120, 70, 70, 41, 32, 38, 38, 32, 40, 104, 105, 32, 60, 61, 32, 48, 120, 70, 70, 41, 0], "i8", 2);
            q.l = g([105, 32, 60, 32, 109, 95, 115, 105, 122, 101, 0], "i8", 2);
            q.M = g([110, 117, 109, 32, 38, 38, 32, 40, 110, 117, 109, 32, 61, 61, 32, 126, 110, 117, 109, 95, 99, 104, 101, 99, 107, 41, 0], "i8", 2);
            q.h = g([1, 2, 2, 3, 3, 3, 3, 4], "i8", 2);
            var ta = g([0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 2, 1, 2, 0, 0, 0, 1, 0, 2, 1, 0, 2, 0, 0, 1, 2, 3], "i8", 2);
            q.Wb = g([110, 101, 120, 116, 95, 108, 101, 118, 101, 108, 95, 111, 102, 115, 32, 62, 32, 99, 117, 114, 95, 108, 101, 118, 101, 108, 95, 111, 102, 115, 0], "i8", 2);
            q.Zb = g([40, 108, 101, 110, 32, 62, 61, 32, 49, 41, 32, 38, 38, 32, 40, 108, 101, 110, 32, 60, 61, 32, 99, 77, 97, 120, 69, 120, 112, 101, 99, 116, 101, 100, 67, 111, 100, 101, 83, 105, 122, 101, 41, 0], "i8", 2);
            var l = g(468, ["i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "*", 0, 0, 0, "i32", 0, 0, 0, "*", 0, 0, 0, "i32", 0, 0, 0, "*", 0, 0, 0, "i32", 0, 0, 0], 2);
            var xa = g(24, "i32", 2);
            q.kf = g([109, 97, 120, 32, 115, 121, 115, 116, 101, 109, 32, 98, 121, 116, 101, 115, 32, 61, 32, 37, 49, 48, 108, 117, 10, 0], "i8", 2);
            q.Oe = g([115, 121, 115, 116, 101, 109, 32, 98, 121, 116, 101, 115, 32, 32, 32, 32, 32, 61, 32, 37, 49, 48, 108, 117, 10, 0], "i8", 2);
            q.$e = g([105, 110, 32, 117, 115, 101, 32, 98, 121, 116, 101, 115, 32, 32, 32, 32, 32, 61, 32, 37, 49, 48, 108, 117, 10, 0], "i8", 2);
            g([0], "i8", 2);
            g(1, "void ()*", 2);
            var pd = g([0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 8, 0, 0, 0, 10, 0, 0, 0], ["*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0], 2);
            g(1, "void*", 2);
            q.Yb = g([115, 116, 100, 58, 58, 98, 97, 100, 95, 97, 108, 108, 111, 99, 0], "i8", 2);
            var rd = g([0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 12, 0, 0, 0, 14, 0, 0, 0], ["*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0, "*", 0, 0, 0], 2);
            g(1, "void*", 2);
            q.Hb = g([98, 97, 100, 95, 97, 114, 114, 97, 121, 95, 110, 101, 119, 95, 108, 101, 110, 103, 116, 104, 0], "i8", 2);
            q.Oa = g([83, 116, 57, 98, 97, 100, 95, 97, 108, 108, 111, 99, 0], "i8", 2);
            var xb = g(12, "*", 2);
            q.ra = g([83, 116, 50, 48, 98, 97, 100, 95, 97, 114, 114, 97, 121, 95, 110, 101, 119, 95, 108, 101, 110, 103, 116, 104, 0], "i8", 2);
            var Qb = g(12, "*", 2);
            b[pd + 4 >> 2] = xb;
            b[rd + 4 >> 2] = Qb;
            var yd = g([2, 0, 0, 0, 0], ["i8*", 0, 0, 0, 0], 2);
            b[xb >> 2] = yd + 8 | 0;
            b[xb + 4 >> 2] = q.Oa | 0;
            b[xb + 8 >> 2] = qf;
            b[Qb >> 2] = yd + 8 | 0;
            b[Qb + 4 >> 2] = q.ra | 0;
            b[Qb + 8 >> 2] = xb;
            var Ma = [0, 0, Pd, 0, Rd, 0, hc, 0, df, 0, bf, 0, gf, 0, cf, 0, Ha, 0, ae, 0, ya, 0, Kc, 0, od, 0, ff, 0];
            w.FUNCTION_TABLE = Ma;
            w.run = td;
            p(xd);
            w.noInitialRun && (mc++, w.monitorRunDependencies && w.monitorRunDependencies(mc));
            0 == mc && td();
            this.a = w;
          };
          function Cd(c2, d2, e2) {
            this.b = new qc(c2);
            this.o = d2;
            this.a = new Wb();
            this.l = e2;
          }
          Cd.prototype.c = function() {
            for (var c2 = this.b, d2; d2 = c2.D(); ) switch (d2) {
              case 2:
                d2 = c2.f();
                c2.O(c2.a + d2);
                this.a.textures.push(Dd(c2, this.o));
                c2.N();
                break;
              case 3:
                d2 = c2.f();
                c2.O(c2.a + d2);
                d2 = this.h();
                this.a.transformInfo[d2.meshId] = d2;
                c2.N();
                break;
              case 4:
                var e2 = c2.f() / 4;
                this.a.projectionOrigin = new Float32Array(e2);
                for (d2 = 0; d2 < e2; ++d2) this.a.projectionOrigin[d2] = c2.$();
                break;
              default:
                c2.B();
            }
            c2 = [];
            e2 = this.a.textures;
            for (d2 = 0; d2 < e2.length; d2++) c2.push(e2[d2].bytes.buffer);
            for (d2 = 0; d2 < this.a.transformInfo.length; ++d2) if (this.a.transformInfo[d2]) {
              c2.push(this.a.transformInfo[d2].transformTable.buffer);
              c2.push(this.a.transformInfo[d2].vertexTransformMap.buffer);
              var h2 = e2[this.a.transformInfo[d2].meshId];
              h2 = new Float32Array([0.5, 0.5 - h2.height, 1 / h2.width, -1 / h2.height]);
              this.a.transformInfo[d2].uvOffsetAndScale = h2;
              c2.push(h2.buffer);
            }
            this.a.projectionOrigin && c2.push(this.a.projectionOrigin.buffer);
            this.l(this.a, c2);
          };
          Cd.prototype.h = function() {
            for (var c2 = this.b, d2, e2 = new pc(); d2 = c2.D(); ) switch (d2) {
              case 1:
                d2 = c2.f();
                for (var h2 = d2 / 6, k2 = new Float64Array(5 * h2), g2 = c2.data(), m2 = c2.a, p2 = 0; p2 < h2; ++p2) {
                  var v2 = m2 + 6 * p2, z2 = g2[v2], B2 = g2[v2 + 1], A2 = g2[v2 + 2], G2 = g2[v2 + 3], C2 = g2[v2 + 4];
                  v2 = g2[v2 + 5];
                  127 < G2 && (G2 -= 256);
                  A2 += G2 << 8;
                  127 < v2 && (v2 -= 256);
                  C2 += v2 << 8;
                  G2 = 2 * Math.PI * z2 / 256;
                  z2 = Math.cos(G2);
                  G2 = Math.sin(G2);
                  B2 /= 255;
                  k2[5 * p2] = 1 + (B2 - 1) * z2 * z2;
                  k2[5 * p2 + 1] = (B2 - 1) * z2 * G2;
                  k2[5 * p2 + 2] = 1 + (B2 - 1) * G2 * G2;
                  k2[5 * p2 + 3] = A2;
                  k2[5 * p2 + 4] = C2;
                }
                e2.transformTable = k2;
                c2.U(d2);
                break;
              case 2:
                d2 = c2.f();
                h2 = d2 / 2;
                k2 = new Uint16Array(h2);
                g2 = c2.data();
                m2 = c2.a;
                for (p2 = 0; p2 < h2; ++p2) k2[p2] = g2[m2 + 2 * p2] + (g2[m2 + 2 * p2 + 1] << 8);
                e2.vertexTransformMap = k2;
                c2.U(d2);
                break;
              case 3:
                e2.meshId = c2.f();
                break;
              default:
                c2.B();
            }
            return e2;
          };
          var Ed = null;
          function Dd(c2, d2) {
            for (var e2 = c2.data(), h2, k2 = 1, g2 = 0, m2 = 0, p2 = 256, v2 = 256, z2 = 0, B2 = -1; h2 = c2.D(); ) switch (h2) {
              case 1:
                m2 = c2.Xc();
                g2 || (g2 = c2.a);
                c2.U(m2);
                break;
              case 3:
                p2 = c2.f();
                break;
              case 4:
                v2 = c2.f();
                break;
              case 2:
                k2 = c2.f();
                break;
              case 5:
                z2 = c2.f();
                break;
              case 6:
                B2 = c2.f();
                break;
              default:
                c2.B();
            }
            c2 = new Ub();
            switch (k2) {
              case 1:
                c2.bytes = new Uint8Array(m2);
                c2.bytes.set(e2.subarray(g2, g2 + m2));
                break;
              case 6:
                Ed || (Ed = new Bd());
                h2 = Ed;
                var A2 = h2.xb(m2);
                h2.lc(e2, g2, m2, A2);
                e2 = h2.Ac(A2, m2);
                g2 = h2.xb(e2);
                c2.bytes = new Uint8Array(e2);
                h2.sc(A2, m2, g2, e2);
                h2.mc(g2, e2, c2.bytes, 0);
                h2.mb(A2);
                h2.mb(g2);
                if (!d2) {
                  d2 = new Uint16Array(c2.bytes.buffer);
                  m2 = p2;
                  A2 = v2;
                  e2 = new Uint16Array(m2 * A2);
                  Ad || (Ad = new Uint16Array(4));
                  g2 = Ad;
                  h2 = m2 / 4;
                  for (var G2 = A2 / 4, C2 = 0; C2 < G2; C2++) for (var R2 = 0; R2 < h2; R2++) {
                    A2 = 4 * (C2 * h2 + R2);
                    g2[0] = d2[A2];
                    g2[1] = d2[A2 + 1];
                    var L2 = g2[0] & 31;
                    var O2 = g2[0] & 2016;
                    var sa2 = g2[0] & 63488;
                    var ka2 = g2[1] & 31;
                    var qa2 = g2[1] & 2016;
                    var P2 = g2[1] & 63488;
                    g2[2] = 5 * L2 + 3 * ka2 >> 3 | 5 * O2 + 3 * qa2 >> 3 & 2016 | 5 * sa2 + 3 * P2 >> 3 & 63488;
                    g2[3] = 5 * ka2 + 3 * L2 >> 3 | 5 * qa2 + 3 * O2 >> 3 & 2016 | 5 * P2 + 3 * sa2 >> 3 & 63488;
                    O2 = 4 * C2 * m2 + 4 * R2;
                    L2 = d2[A2 + 2];
                    e2[O2] = g2[L2 & 3];
                    e2[O2 + 1] = g2[L2 >> 2 & 3];
                    e2[O2 + 2] = g2[L2 >> 4 & 3];
                    e2[O2 + 3] = g2[L2 >> 6 & 3];
                    O2 += m2;
                    e2[O2] = g2[L2 >> 8 & 3];
                    e2[O2 + 1] = g2[L2 >> 10 & 3];
                    e2[O2 + 2] = g2[L2 >> 12 & 3];
                    e2[O2 + 3] = g2[L2 >> 14];
                    L2 = d2[A2 + 3];
                    O2 += m2;
                    e2[O2] = g2[L2 & 3];
                    e2[O2 + 1] = g2[L2 >> 2 & 3];
                    e2[O2 + 2] = g2[L2 >> 4 & 3];
                    e2[O2 + 3] = g2[L2 >> 6 & 3];
                    O2 += m2;
                    e2[O2] = g2[L2 >> 8 & 3];
                    e2[O2 + 1] = g2[L2 >> 10 & 3];
                    e2[O2 + 2] = g2[L2 >> 12 & 3];
                    e2[O2 + 3] = g2[L2 >> 14];
                  }
                  c2.bytes = new Uint8Array(e2.buffer);
                }
            }
            c2.textureFormat = k2;
            c2.width = p2;
            c2.height = v2;
            c2.viewDirection = z2;
            c2.meshId = B2;
            return c2;
          }
          ;
          function Fd(c2, d2, e2, h2) {
            this.b = new qc(c2);
            this.u = d2;
            this.h = e2;
            this.a = new Sb();
            this.l = [];
            this.o = h2;
            this.c = null;
          }
          T = Fd.prototype;
          T.Fa = function() {
            for (var c2 = this.b, d2; d2 = c2.D(); ) switch (d2) {
              case 1:
                var e2 = c2.f() / 8, h2 = this.a.matrixGlobeFromMesh = new Float64Array(16);
                for (d2 = 0; d2 < e2; d2++) h2[d2] = c2.ua();
                this.a.matrixMeshFromGlobe = new Float64Array(16);
                d2 = this.a.matrixMeshFromGlobe;
                e2 = h2[0];
                var k2 = h2[1], g2 = h2[2], m2 = h2[3], p2 = h2[4], v2 = h2[5], z2 = h2[6], B2 = h2[7], A2 = h2[8], G2 = h2[9], C2 = h2[10], R2 = h2[11], L2 = h2[12], O2 = h2[13], sa2 = h2[14];
                h2 = h2[15];
                var ka2 = e2 * v2 - k2 * p2, qa2 = e2 * z2 - g2 * p2, P2 = e2 * B2 - m2 * p2, la2 = k2 * z2 - g2 * v2, Ea2 = k2 * B2 - m2 * v2, J2 = g2 * B2 - m2 * z2, aa2 = A2 * O2 - G2 * L2, Ja2 = A2 * sa2 - C2 * L2, Ua2 = A2 * h2 - R2 * L2, ab2 = G2 * sa2 - C2 * O2, Ya2 = G2 * h2 - R2 * O2, Va2 = C2 * h2 - R2 * sa2, va2 = ka2 * Va2 - qa2 * Ya2 + P2 * ab2 + la2 * Ua2 - Ea2 * Ja2 + J2 * aa2;
                0 != va2 && (va2 = 1 / va2, d2[0] = (v2 * Va2 - z2 * Ya2 + B2 * ab2) * va2, d2[1] = (-k2 * Va2 + g2 * Ya2 - m2 * ab2) * va2, d2[2] = (O2 * J2 - sa2 * Ea2 + h2 * la2) * va2, d2[3] = (-G2 * J2 + C2 * Ea2 - R2 * la2) * va2, d2[4] = (-p2 * Va2 + z2 * Ua2 - B2 * Ja2) * va2, d2[5] = (e2 * Va2 - g2 * Ua2 + m2 * Ja2) * va2, d2[6] = (-L2 * J2 + sa2 * P2 - h2 * qa2) * va2, d2[7] = (A2 * J2 - C2 * P2 + R2 * qa2) * va2, d2[8] = (p2 * Ya2 - v2 * Ua2 + B2 * aa2) * va2, d2[9] = (-e2 * Ya2 + k2 * Ua2 - m2 * aa2) * va2, d2[10] = (L2 * Ea2 - O2 * P2 + h2 * ka2) * va2, d2[11] = (-A2 * Ea2 + G2 * P2 - R2 * ka2) * va2, d2[12] = (-p2 * ab2 + v2 * Ja2 - z2 * aa2) * va2, d2[13] = (e2 * ab2 - k2 * Ja2 + g2 * aa2) * va2, d2[14] = (-L2 * la2 + O2 * qa2 - sa2 * ka2) * va2, d2[15] = (A2 * la2 - G2 * qa2 + C2 * ka2) * va2);
                break;
              case 2:
                d2 = c2.f();
                c2.O(c2.a + d2);
                this.a.meshes.push(this.Ja());
                c2.N();
                break;
              case 3:
                d2 = c2.f();
                this.a.copyrightIds ? this.a.copyrightIds.push(d2) : this.a.copyrightIds = [d2];
                break;
              case 6:
                d2 = c2.f();
                c2.O(c2.a + d2);
                this.a.waterMesh = this.Ja();
                c2.N();
                break;
              case 7:
                d2 = c2.f();
                c2.O(c2.a + d2);
                this.a.overlaySurfaceMeshes.push(this.Ja());
                c2.N();
                break;
              case 8:
                this.h ? this.ad() : c2.B();
                break;
              default:
                c2.B();
            }
            this.oc();
            if (this.h) for (d2 = 0; d2 < this.a.meshes.length; ++d2) this.uc(this.a.meshes[d2]);
            c2 = [];
            c2.push(this.a.matrixGlobeFromMesh.buffer);
            c2.push(this.a.matrixMeshFromGlobe.buffer);
            e2 = this.a.meshes;
            for (d2 = 0; d2 < e2.length; d2++) c2.push(e2[d2].vertices.buffer), c2.push(e2[d2].uvOffsetAndScale.buffer), c2.push(e2[d2].layerBounds.buffer), c2.push(e2[d2].indices.buffer), e2[d2].normals && c2.push(e2[d2].normals.buffer), (k2 = e2[d2].texture) && c2.push(k2.bytes.buffer);
            e2 = this.a.overlaySurfaceMeshes;
            for (d2 = 0; d2 < e2.length; d2++) c2.push(e2[d2].vertices.buffer), c2.push(e2[d2].layerBounds.buffer), c2.push(e2[d2].indices.buffer), e2[d2].normals && c2.push(e2[d2].normals.buffer);
            if (d2 = this.a.waterMesh) c2.push(d2.vertices.buffer), c2.push(d2.vertexAlphas.buffer), c2.push(d2.layerBounds.buffer), c2.push(d2.indices.buffer), d2.normals && c2.push(d2.normals.buffer);
            c2.push(this.a.bvhNodes.buffer);
            c2.push(this.a.bvhTriPermutation.buffer);
            this.o(this.a, c2);
          };
          T.oc = function() {
            for (var c2 = this.a, d2 = c2.meshes.slice(), e2 = 0; e2 < c2.overlaySurfaceMeshes.length; e2++) d2.push(c2.overlaySurfaceMeshes[e2]);
            c2.waterMesh && d2.push(c2.waterMesh);
            if (0 != d2.length) {
              c2 = new zd(d2);
              for (d2 = c2.start(); null != d2; ) d2 = d2.apply(c2);
              this.a.bvhNodes = c2.hc();
              this.a.bvhTriPermutation = c2.c;
            }
          };
          T.Ja = function() {
            var c2 = this.b, d2 = new Tb(), e2 = [];
            this.l.push(e2);
            for (var h2; h2 = c2.D(); ) switch (h2) {
              case 1:
                this.fd(d2);
                break;
              case 3:
                this.Wc(d2);
                break;
              case 6:
                h2 = c2.f();
                c2.O(c2.a + h2);
                d2.texture = Dd(c2, this.u);
                c2.N();
                break;
              case 7:
                this.dd(d2);
                break;
              case 8:
                this.Yc(d2, e2);
                break;
              case 9:
                this.ed(d2);
                break;
              case 10:
                var k2 = c2.f() / 4, g2 = d2.uvOffsetAndScale = new Float32Array(4);
                for (h2 = 0; h2 < k2; h2++) g2[h2] = c2.$();
                break;
              case 11:
                this.h ? this.Zc(d2) : c2.B();
                break;
              case 12:
                d2.meshId = c2.f();
                break;
              default:
                c2.B();
            }
            d2.uvOffsetAndScale && (d2.uvOffsetAndScale[1] -= 1 / d2.uvOffsetAndScale[3], d2.uvOffsetAndScale[3] *= -1);
            c2 = d2.vertices;
            k2 = d2.indices;
            for (var m2 = g2 = 0; m2 < e2.length; m2++) {
              var p2 = m2 & 7;
              0 < e2[m2] && (this.a.nonEmptyOctants |= 1 << p2);
              for (h2 = 0; h2 < e2[m2]; h2++) {
                var v2 = 8 * k2[g2++] + 3;
                c2[v2] = p2;
              }
            }
            return d2;
          };
          T.Wc = function(c2) {
            var d2 = this.b;
            d2.f();
            for (var e2 = d2.f(), h2 = c2.indices = new Uint16Array(e2), k2 = 0, g2 = 0, m2, p2 = 0, v2 = 0, z2 = 0; z2 < e2; z2++) {
              var B2 = d2.f();
              m2 = p2;
              p2 = v2;
              v2 = k2 - B2;
              h2[z2] = v2;
              m2 != p2 && p2 != v2 && m2 != v2 && g2++;
              B2 || k2++;
            }
            c2.numNonDegenerateTriangles = g2;
          };
          T.fd = function(c2) {
            var d2 = this.b, e2 = d2.data(), h2 = d2.f(), k2 = h2 / 3;
            c2 = c2.vertices = new Uint8Array(8 * k2);
            for (var g2 = d2.a, m2 = 0; 2 >= m2; m2++) {
              var p2 = e2[g2++];
              c2[m2] = p2;
              for (var v2 = 1; v2 < k2; v2++) p2 = p2 + e2[g2++] & 255, c2[8 * v2 + m2] = p2;
            }
            d2.U(h2);
          };
          T.ed = function(c2) {
            var d2 = this.b, e2 = d2.data(), h2 = d2.f();
            c2 = c2.vertexAlphas = new Uint8Array(h2);
            var k2 = d2.a, g2 = e2[k2++];
            c2[0] = g2;
            for (var m2 = 1; m2 < h2; m2++) g2 = g2 + e2[k2++] & 255, c2[m2] = g2;
            d2.U(h2);
          };
          T.dd = function(c2) {
            for (var d2 = this.b, e2 = d2.data(), h2 = (d2.f() - 4) / 4, k2 = d2.ia(), g2 = d2.ia(), m2 = 0, p2 = 0, v2 = d2.a, z2 = c2.vertices, B2 = 0; B2 < h2; B2++) {
              var A2 = e2[v2 + 1 * h2 + B2] + (e2[v2 + 3 * h2 + B2] << 8);
              m2 = (m2 + (e2[v2 + 0 * h2 + B2] + (e2[v2 + 2 * h2 + B2] << 8))) % (k2 + 1);
              p2 = (p2 + A2) % (g2 + 1);
              A2 = 8 * B2 + 4;
              z2[A2 + 0] = m2 & 255;
              z2[A2 + 1] = m2 >> 8;
              z2[A2 + 2] = p2 & 255;
              z2[A2 + 3] = p2 >> 8;
            }
            c2.uvOffsetAndScale || (c2.uvOffsetAndScale = new Float32Array([0.5, 0.5, 1 / (k2 + 1), 1 / (g2 + 1)]));
            d2.U(4 * h2);
          };
          T.Yc = function(c2, d2) {
            var e2 = this.b;
            e2.f();
            var h2 = e2.f(), k2 = 0, g2 = c2.layerBounds = new Uint32Array(10), m2 = 0;
            c2 = c2.octantCounts = new Uint32Array(72);
            for (var p2 = 0; p2 < h2; p2++) {
              0 == p2 % 8 && (g2[m2++] = k2);
              var v2 = e2.f();
              d2.push(v2);
              c2[8 * (m2 - 1) + (p2 & 7)] = v2;
              k2 += v2;
            }
            for (; 10 > m2; m2++) g2[m2] = k2;
          };
          function Gd(c2, d2) {
            if (4 >= d2) return (c2 << d2) + (c2 & (1 << d2) - 1);
            if (6 >= d2) {
              var e2 = 8 - d2;
              return (c2 << d2) + (c2 << d2 >> e2) + (c2 << d2 >> e2 >> e2) + (c2 << d2 >> e2 >> e2 >> e2);
            }
            return -(c2 & 1);
          }
          function Hd(c2, d2) {
            return c2 < d2 ? c2 : d2;
          }
          function Id(c2) {
            c2 = Math.round(c2);
            return Hd(0 > c2 ? 0 : c2, 255);
          }
          T.ad = function() {
            var c2 = this.b, d2 = c2.data(), e2 = c2.f(), h2 = c2.a, k2 = d2[h2] + (d2[h2 + 1] << 8), g2 = d2[h2 + 2];
            h2 += 3;
            this.c = new Uint8Array(3 * k2);
            for (var m2 = 0; m2 < e2; ++m2) {
              var p2 = d2[h2 + m2], v2 = d2[h2 + k2 + m2];
              p2 = Gd(p2, g2);
              v2 = Gd(v2, g2);
              var z2 = p2 / 255, B2 = v2 / 255;
              v2 = this.c;
              p2 = 3 * m2;
              var A2 = z2, G2 = B2, C2 = A2 + G2, R2 = A2 - G2, L2 = 1;
              0.5 <= C2 && 1.5 >= C2 && -0.5 <= R2 && 0.5 >= R2 || (L2 = -1, 0.5 >= C2 ? (A2 = 0.5 - B2, G2 = 0.5 - z2) : 1.5 <= C2 ? (A2 = 1.5 - B2, G2 = 1.5 - z2) : -0.5 >= R2 ? (A2 = B2 - 0.5, G2 = z2 + 0.5) : (A2 = B2 + 0.5, G2 = z2 - 0.5), C2 = A2 + G2, R2 = A2 - G2);
              z2 = Hd(Hd(2 * C2 - 1, 3 - 2 * C2), Hd(2 * R2 + 1, 1 - 2 * R2)) * L2;
              A2 = 2 * A2 - 1;
              G2 = 2 * G2 - 1;
              B2 = 127 / Math.sqrt(z2 * z2 + A2 * A2 + G2 * G2);
              v2[p2 + 0] = Id(B2 * z2 + 127);
              v2[p2 + 1] = Id(B2 * A2 + 127);
              v2[p2 + 2] = Id(B2 * G2 + 127);
            }
            c2.U(e2);
          };
          T.Zc = function(c2) {
            var d2 = this.b, e2 = d2.data(), h2 = d2.f(), k2 = d2.a;
            c2.normals = new Uint8Array(e2.buffer.slice(k2, k2 + h2));
            d2.U(h2);
          };
          T.uc = function(c2) {
            var d2 = c2.normals;
            if (d2 && this.c) for (h2 = d2.length / 2, c2.normals = new Uint8Array(4 * h2), k2 = 0; k2 < h2; ++k2) {
              var e2 = d2[k2] + (d2[h2 + k2] << 8);
              c2.normals[4 * k2] = this.c[3 * e2];
              c2.normals[4 * k2 + 1] = this.c[3 * e2 + 1];
              c2.normals[4 * k2 + 2] = this.c[3 * e2 + 2];
              c2.normals[4 * k2 + 3] = 0;
            }
            else {
              var h2 = c2.vertices.length / 8;
              c2.normals = new Uint8Array(4 * h2);
              for (var k2 = 0; k2 < h2; ++k2) c2.normals[4 * k2] = 127, c2.normals[4 * k2 + 1] = 127, c2.normals[4 * k2 + 2] = 127, c2.normals[4 * k2 + 3] = 0;
            }
          };
          var Jd = [];
          function rf(c2) {
            this.b = c2;
            c2.webkitPostMessage && (c2.postMessage = c2.webkitPostMessage);
            var d2 = this;
            c2.onmessage = function(c3) {
              d2.a(c3);
            };
          }
          rf.prototype.a = function(c2) {
            var d2 = Fb(), e2 = c2.data.id, h2 = c2.data.command;
            c2 = c2.data.payload;
            var k2 = this.b;
            if (void 0 !== e2 && void 0 !== h2 && c2) {
              c2 = new Uint8Array(c2);
              var g2 = function(c3, g3) {
                var h3 = Fb() - d2, m2 = {};
                m2.id = e2;
                m2.time = h3;
                m2.payload = c3;
                m2.logs = [];
                m2.complete = true;
                k2.postMessage(m2, g3);
              };
              0 == h2 ? (h2 = new rc(c2, g2), h2.Nc()) : 1 == h2 ? (h2 = new Fd(c2, true, false, g2), h2.Fa()) : 2 == h2 ? (h2 = new Fd(c2, false, true, g2), h2.Fa()) : 3 == h2 ? (h2 = new Fd(c2, true, true, g2), h2.Fa()) : 4 == h2 ? (h2 = new Cd(c2, true, g2), h2.c()) : 5 == h2 ? (h2 = new Cd(c2, false, g2), h2.c()) : Jd.push("Bad DecodeTaskCommand: " + h2);
            }
          };
          new rf(self);
        }).call(this);
      };
      const callbacks = {};
      const self = {
        postMessage: function(p2, g2) {
          callbacks[p2.id].resolve(p2);
          delete callbacks[event.id];
        }
      };
      code();
      return async function decode(command2, payload) {
        const id2 = uuidv4();
        return await new Promise(function(resolve5, reject) {
          callbacks[id2] = { resolve: resolve5, reject };
          self.onmessage({ data: { id: id2, command: command2, payload } });
          ;
        });
      };
    })();
  }
});

// src/utils/utils.js
var require_utils3 = __commonJS({
  "src/utils/utils.js"(exports2, module2) {
    "use strict";
    var fs3 = require_lib();
    var path4 = require("path");
    var getUrl = require_get_url();
    var decodeResource = require_decode_resource();
    var [CMD_BULK, CMD_NODE] = [0, 3];
    module2.exports = function init(config) {
      const { URL_PREFIX: URL_PREFIX2, DUMP_JSON_DIR: DUMP_JSON_DIR2, DUMP_RAW_DIR: DUMP_RAW_DIR2, DUMP_JSON, DUMP_RAW } = config;
      DUMP_JSON && fs3.ensureDirSync(DUMP_JSON_DIR2);
      DUMP_RAW && fs3.ensureDirSync(DUMP_RAW_DIR2);
      const utils3 = {
        bulk: {
          // checks if element at index has a node
          hasNodeAtIndex(bulk, index) {
            return !(bulk.flags[index] & 8);
          },
          // checks if element at index has bulk metadata
          // expects index to point at bulk metadata candidate
          hasBulkMetadataAtIndex(bulk, index) {
            return !!(bulk.flags[index] & 4);
          },
          // get index by path
          // it accepts the whole or relative octant path
          getIndexByPath(bulk, path5) {
            let c2 = -1;
            for (let e2 = path5, f2 = e2.length - 1 - (e2.length - 1) % 4; f2 < e2.length; ++f2)
              c2 = bulk.childIndices[8 * (c2 + 1) + (e2.charCodeAt(f2) - 48)];
            return c2;
          },
          // get relative octant path by index
          getPathByIndex(bulk, index) {
            let [first] = utils3.bulk.allPaths(bulk, (i) => i === index, true);
            if (first === void 0) {
              first = null;
            }
            return first;
          },
          // returns all paths in bulk (dirty method)
          // also accepts filter
          allPaths(bulk, filter = (_) => true, stopAfterFirst = false) {
            let result = [];
            function next(oct, max) {
              if (oct.length === max) return;
              for (const nxt of [0, 1, 2, 3, 4, 5, 6, 7].map((a2) => a2.toString())) {
                const cur = oct + nxt;
                const i = utils3.bulk.getIndexByPath(bulk, cur);
                if (i < 0) continue;
                if (filter(i)) {
                  result.push(cur);
                  if (stopAfterFirst) return;
                }
                next(cur, max);
              }
            }
            next("", 4);
            return result;
          }
        },
        async getNode(path5, bulk, index) {
          const nodeEpoch = bulk.epoch[index];
          const nodeImgEpoch = bulk.imageryEpochArray ? bulk.imageryEpochArray[index] : bulk.defaultImageryEpoch;
          const nodeTexFormat = bulk.textureFormatArray ? bulk.textureFormatArray[index] : bulk.defaultTextureFormat;
          const nodeFlags = bulk.flags[index];
          const imgEpochPart = nodeFlags & 16 ? `!3u${nodeImgEpoch}` : "";
          const url = `!1m2!1s${path5}!2u${nodeEpoch}!2e${nodeTexFormat}${imgEpochPart}!4b0`;
          return await decode(CMD_NODE, `NodeData/pb=${url}`, false);
        },
        async getPlanetoid() {
          return await decode(CMD_BULK, `PlanetoidMetadata`);
        },
        async getBulk(path5, epoch) {
          return await decode(CMD_BULK, `BulkMetadata/pb=!1m2!1s${path5}!2u${epoch}`);
        }
      };
      const CACHE_ENABLED = true;
      const cache = {};
      const requests = {};
      async function decode(command2, url, useMemoryCache = true) {
        if (useMemoryCache && CACHE_ENABLED && cache[url]) {
          return cache[url];
        }
        if (requests[url]) {
          return await new Promise(function(resolve5, reject) {
            requests[url].push({ resolve: resolve5, reject });
          });
        }
        ;
        requests[url] = [];
        let res;
        try {
          const payload = await getUrl(`${URL_PREFIX2}${url}`);
          const data = await decodeResource(command2, payload);
          res = data.payload;
          if (useMemoryCache && CACHE_ENABLED) {
            cache[url] = res;
          }
          const fn = url.replace("/pb=", "");
          DUMP_JSON && fs3.writeFileSync(path4.join(DUMP_JSON_DIR2, `${fn}.json`), JSON.stringify(res, null, 2));
          DUMP_RAW && fs3.writeFileSync(path4.join(DUMP_RAW_DIR2, `${fn}.raw`), payload);
        } catch (ex) {
          requests[url].forEach((p2) => p2.reject(ex));
          delete requests[url];
          throw ex;
        }
        requests[url].forEach((p2) => p2.resolve(res));
        delete requests[url];
        return res;
      }
      return utils3;
    };
  }
});

// node_modules/bmp-js/lib/encoder.js
var require_encoder = __commonJS({
  "node_modules/bmp-js/lib/encoder.js"(exports2, module2) {
    function BmpEncoder(imgData) {
      this.buffer = imgData.data;
      this.width = imgData.width;
      this.height = imgData.height;
      this.extraBytes = this.width % 4;
      this.rgbSize = this.height * (3 * this.width + this.extraBytes);
      this.headerInfoSize = 40;
      this.data = [];
      this.flag = "BM";
      this.reserved = 0;
      this.offset = 54;
      this.fileSize = this.rgbSize + this.offset;
      this.planes = 1;
      this.bitPP = 24;
      this.compress = 0;
      this.hr = 0;
      this.vr = 0;
      this.colors = 0;
      this.importantColors = 0;
    }
    BmpEncoder.prototype.encode = function() {
      var tempBuffer = new Buffer(this.offset + this.rgbSize);
      this.pos = 0;
      tempBuffer.write(this.flag, this.pos, 2);
      this.pos += 2;
      tempBuffer.writeUInt32LE(this.fileSize, this.pos);
      this.pos += 4;
      tempBuffer.writeUInt32LE(this.reserved, this.pos);
      this.pos += 4;
      tempBuffer.writeUInt32LE(this.offset, this.pos);
      this.pos += 4;
      tempBuffer.writeUInt32LE(this.headerInfoSize, this.pos);
      this.pos += 4;
      tempBuffer.writeUInt32LE(this.width, this.pos);
      this.pos += 4;
      tempBuffer.writeInt32LE(-this.height, this.pos);
      this.pos += 4;
      tempBuffer.writeUInt16LE(this.planes, this.pos);
      this.pos += 2;
      tempBuffer.writeUInt16LE(this.bitPP, this.pos);
      this.pos += 2;
      tempBuffer.writeUInt32LE(this.compress, this.pos);
      this.pos += 4;
      tempBuffer.writeUInt32LE(this.rgbSize, this.pos);
      this.pos += 4;
      tempBuffer.writeUInt32LE(this.hr, this.pos);
      this.pos += 4;
      tempBuffer.writeUInt32LE(this.vr, this.pos);
      this.pos += 4;
      tempBuffer.writeUInt32LE(this.colors, this.pos);
      this.pos += 4;
      tempBuffer.writeUInt32LE(this.importantColors, this.pos);
      this.pos += 4;
      var i = 0;
      var rowBytes = 3 * this.width + this.extraBytes;
      for (var y = 0; y < this.height; y++) {
        for (var x = 0; x < this.width; x++) {
          var p2 = this.pos + y * rowBytes + x * 3;
          i++;
          tempBuffer[p2] = this.buffer[i++];
          tempBuffer[p2 + 1] = this.buffer[i++];
          tempBuffer[p2 + 2] = this.buffer[i++];
        }
        if (this.extraBytes > 0) {
          var fillOffset = this.pos + y * rowBytes + this.width * 3;
          tempBuffer.fill(0, fillOffset, fillOffset + this.extraBytes);
        }
      }
      return tempBuffer;
    };
    module2.exports = function(imgData, quality) {
      if (typeof quality === "undefined") quality = 100;
      var encoder = new BmpEncoder(imgData);
      var data = encoder.encode();
      return {
        data,
        width: imgData.width,
        height: imgData.height
      };
    };
  }
});

// node_modules/bmp-js/lib/decoder.js
var require_decoder = __commonJS({
  "node_modules/bmp-js/lib/decoder.js"(exports2, module2) {
    function BmpDecoder(buffer, is_with_alpha) {
      this.pos = 0;
      this.buffer = buffer;
      this.is_with_alpha = !!is_with_alpha;
      this.bottom_up = true;
      this.flag = this.buffer.toString("utf-8", 0, this.pos += 2);
      if (this.flag != "BM") throw new Error("Invalid BMP File");
      this.parseHeader();
      this.parseRGBA();
    }
    BmpDecoder.prototype.parseHeader = function() {
      this.fileSize = this.buffer.readUInt32LE(this.pos);
      this.pos += 4;
      this.reserved = this.buffer.readUInt32LE(this.pos);
      this.pos += 4;
      this.offset = this.buffer.readUInt32LE(this.pos);
      this.pos += 4;
      this.headerSize = this.buffer.readUInt32LE(this.pos);
      this.pos += 4;
      this.width = this.buffer.readUInt32LE(this.pos);
      this.pos += 4;
      this.height = this.buffer.readInt32LE(this.pos);
      this.pos += 4;
      this.planes = this.buffer.readUInt16LE(this.pos);
      this.pos += 2;
      this.bitPP = this.buffer.readUInt16LE(this.pos);
      this.pos += 2;
      this.compress = this.buffer.readUInt32LE(this.pos);
      this.pos += 4;
      this.rawSize = this.buffer.readUInt32LE(this.pos);
      this.pos += 4;
      this.hr = this.buffer.readUInt32LE(this.pos);
      this.pos += 4;
      this.vr = this.buffer.readUInt32LE(this.pos);
      this.pos += 4;
      this.colors = this.buffer.readUInt32LE(this.pos);
      this.pos += 4;
      this.importantColors = this.buffer.readUInt32LE(this.pos);
      this.pos += 4;
      if (this.bitPP === 16 && this.is_with_alpha) {
        this.bitPP = 15;
      }
      if (this.bitPP < 15) {
        var len = this.colors === 0 ? 1 << this.bitPP : this.colors;
        this.palette = new Array(len);
        for (var i = 0; i < len; i++) {
          var blue = this.buffer.readUInt8(this.pos++);
          var green = this.buffer.readUInt8(this.pos++);
          var red = this.buffer.readUInt8(this.pos++);
          var quad = this.buffer.readUInt8(this.pos++);
          this.palette[i] = {
            red,
            green,
            blue,
            quad
          };
        }
      }
      if (this.height < 0) {
        this.height *= -1;
        this.bottom_up = false;
      }
    };
    BmpDecoder.prototype.parseRGBA = function() {
      var bitn = "bit" + this.bitPP;
      var len = this.width * this.height * 4;
      this.data = new Buffer(len);
      this[bitn]();
    };
    BmpDecoder.prototype.bit1 = function() {
      var xlen = Math.ceil(this.width / 8);
      var mode = xlen % 4;
      var y = this.height >= 0 ? this.height - 1 : -this.height;
      for (var y = this.height - 1; y >= 0; y--) {
        var line = this.bottom_up ? y : this.height - 1 - y;
        for (var x = 0; x < xlen; x++) {
          var b2 = this.buffer.readUInt8(this.pos++);
          var location = line * this.width * 4 + x * 8 * 4;
          for (var i = 0; i < 8; i++) {
            if (x * 8 + i < this.width) {
              var rgb = this.palette[b2 >> 7 - i & 1];
              this.data[location + i * 4] = 0;
              this.data[location + i * 4 + 1] = rgb.blue;
              this.data[location + i * 4 + 2] = rgb.green;
              this.data[location + i * 4 + 3] = rgb.red;
            } else {
              break;
            }
          }
        }
        if (mode != 0) {
          this.pos += 4 - mode;
        }
      }
    };
    BmpDecoder.prototype.bit4 = function() {
      if (this.compress == 2) {
        let setPixelData2 = function(rgbIndex) {
          var rgb2 = this.palette[rgbIndex];
          this.data[location] = 0;
          this.data[location + 1] = rgb2.blue;
          this.data[location + 2] = rgb2.green;
          this.data[location + 3] = rgb2.red;
          location += 4;
        };
        var setPixelData = setPixelData2;
        this.data.fill(255);
        var location = 0;
        var lines = this.bottom_up ? this.height - 1 : 0;
        var low_nibble = false;
        while (location < this.data.length) {
          var a2 = this.buffer.readUInt8(this.pos++);
          var b2 = this.buffer.readUInt8(this.pos++);
          if (a2 == 0) {
            if (b2 == 0) {
              if (this.bottom_up) {
                lines--;
              } else {
                lines++;
              }
              location = lines * this.width * 4;
              low_nibble = false;
              continue;
            } else if (b2 == 1) {
              break;
            } else if (b2 == 2) {
              var x = this.buffer.readUInt8(this.pos++);
              var y = this.buffer.readUInt8(this.pos++);
              if (this.bottom_up) {
                lines -= y;
              } else {
                lines += y;
              }
              location += y * this.width * 4 + x * 4;
            } else {
              var c2 = this.buffer.readUInt8(this.pos++);
              for (var i = 0; i < b2; i++) {
                if (low_nibble) {
                  setPixelData2.call(this, c2 & 15);
                } else {
                  setPixelData2.call(this, (c2 & 240) >> 4);
                }
                if (i & 1 && i + 1 < b2) {
                  c2 = this.buffer.readUInt8(this.pos++);
                }
                low_nibble = !low_nibble;
              }
              if ((b2 + 1 >> 1 & 1) == 1) {
                this.pos++;
              }
            }
          } else {
            for (var i = 0; i < a2; i++) {
              if (low_nibble) {
                setPixelData2.call(this, b2 & 15);
              } else {
                setPixelData2.call(this, (b2 & 240) >> 4);
              }
              low_nibble = !low_nibble;
            }
          }
        }
      } else {
        var xlen = Math.ceil(this.width / 2);
        var mode = xlen % 4;
        for (var y = this.height - 1; y >= 0; y--) {
          var line = this.bottom_up ? y : this.height - 1 - y;
          for (var x = 0; x < xlen; x++) {
            var b2 = this.buffer.readUInt8(this.pos++);
            var location = line * this.width * 4 + x * 2 * 4;
            var before = b2 >> 4;
            var after = b2 & 15;
            var rgb = this.palette[before];
            this.data[location] = 0;
            this.data[location + 1] = rgb.blue;
            this.data[location + 2] = rgb.green;
            this.data[location + 3] = rgb.red;
            if (x * 2 + 1 >= this.width) break;
            rgb = this.palette[after];
            this.data[location + 4] = 0;
            this.data[location + 4 + 1] = rgb.blue;
            this.data[location + 4 + 2] = rgb.green;
            this.data[location + 4 + 3] = rgb.red;
          }
          if (mode != 0) {
            this.pos += 4 - mode;
          }
        }
      }
    };
    BmpDecoder.prototype.bit8 = function() {
      if (this.compress == 1) {
        let setPixelData2 = function(rgbIndex) {
          var rgb2 = this.palette[rgbIndex];
          this.data[location] = 0;
          this.data[location + 1] = rgb2.blue;
          this.data[location + 2] = rgb2.green;
          this.data[location + 3] = rgb2.red;
          location += 4;
        };
        var setPixelData = setPixelData2;
        this.data.fill(255);
        var location = 0;
        var lines = this.bottom_up ? this.height - 1 : 0;
        while (location < this.data.length) {
          var a2 = this.buffer.readUInt8(this.pos++);
          var b2 = this.buffer.readUInt8(this.pos++);
          if (a2 == 0) {
            if (b2 == 0) {
              if (this.bottom_up) {
                lines--;
              } else {
                lines++;
              }
              location = lines * this.width * 4;
              continue;
            } else if (b2 == 1) {
              break;
            } else if (b2 == 2) {
              var x = this.buffer.readUInt8(this.pos++);
              var y = this.buffer.readUInt8(this.pos++);
              if (this.bottom_up) {
                lines -= y;
              } else {
                lines += y;
              }
              location += y * this.width * 4 + x * 4;
            } else {
              for (var i = 0; i < b2; i++) {
                var c2 = this.buffer.readUInt8(this.pos++);
                setPixelData2.call(this, c2);
              }
              if (b2 & true) {
                this.pos++;
              }
            }
          } else {
            for (var i = 0; i < a2; i++) {
              setPixelData2.call(this, b2);
            }
          }
        }
      } else {
        var mode = this.width % 4;
        for (var y = this.height - 1; y >= 0; y--) {
          var line = this.bottom_up ? y : this.height - 1 - y;
          for (var x = 0; x < this.width; x++) {
            var b2 = this.buffer.readUInt8(this.pos++);
            var location = line * this.width * 4 + x * 4;
            if (b2 < this.palette.length) {
              var rgb = this.palette[b2];
              this.data[location] = 0;
              this.data[location + 1] = rgb.blue;
              this.data[location + 2] = rgb.green;
              this.data[location + 3] = rgb.red;
            } else {
              this.data[location] = 0;
              this.data[location + 1] = 255;
              this.data[location + 2] = 255;
              this.data[location + 3] = 255;
            }
          }
          if (mode != 0) {
            this.pos += 4 - mode;
          }
        }
      }
    };
    BmpDecoder.prototype.bit15 = function() {
      var dif_w = this.width % 3;
      var _11111 = parseInt("11111", 2), _1_5 = _11111;
      for (var y = this.height - 1; y >= 0; y--) {
        var line = this.bottom_up ? y : this.height - 1 - y;
        for (var x = 0; x < this.width; x++) {
          var B2 = this.buffer.readUInt16LE(this.pos);
          this.pos += 2;
          var blue = (B2 & _1_5) / _1_5 * 255 | 0;
          var green = (B2 >> 5 & _1_5) / _1_5 * 255 | 0;
          var red = (B2 >> 10 & _1_5) / _1_5 * 255 | 0;
          var alpha = B2 >> 15 ? 255 : 0;
          var location = line * this.width * 4 + x * 4;
          this.data[location] = alpha;
          this.data[location + 1] = blue;
          this.data[location + 2] = green;
          this.data[location + 3] = red;
        }
        this.pos += dif_w;
      }
    };
    BmpDecoder.prototype.bit16 = function() {
      var dif_w = this.width % 2 * 2;
      this.maskRed = 31744;
      this.maskGreen = 992;
      this.maskBlue = 31;
      this.mask0 = 0;
      if (this.compress == 3) {
        this.maskRed = this.buffer.readUInt32LE(this.pos);
        this.pos += 4;
        this.maskGreen = this.buffer.readUInt32LE(this.pos);
        this.pos += 4;
        this.maskBlue = this.buffer.readUInt32LE(this.pos);
        this.pos += 4;
        this.mask0 = this.buffer.readUInt32LE(this.pos);
        this.pos += 4;
      }
      var ns = [0, 0, 0];
      for (var i = 0; i < 16; i++) {
        if (this.maskRed >> i & 1) ns[0]++;
        if (this.maskGreen >> i & 1) ns[1]++;
        if (this.maskBlue >> i & 1) ns[2]++;
      }
      ns[1] += ns[0];
      ns[2] += ns[1];
      ns[0] = 8 - ns[0];
      ns[1] -= 8;
      ns[2] -= 8;
      for (var y = this.height - 1; y >= 0; y--) {
        var line = this.bottom_up ? y : this.height - 1 - y;
        for (var x = 0; x < this.width; x++) {
          var B2 = this.buffer.readUInt16LE(this.pos);
          this.pos += 2;
          var blue = (B2 & this.maskBlue) << ns[0];
          var green = (B2 & this.maskGreen) >> ns[1];
          var red = (B2 & this.maskRed) >> ns[2];
          var location = line * this.width * 4 + x * 4;
          this.data[location] = 0;
          this.data[location + 1] = blue;
          this.data[location + 2] = green;
          this.data[location + 3] = red;
        }
        this.pos += dif_w;
      }
    };
    BmpDecoder.prototype.bit24 = function() {
      for (var y = this.height - 1; y >= 0; y--) {
        var line = this.bottom_up ? y : this.height - 1 - y;
        for (var x = 0; x < this.width; x++) {
          var blue = this.buffer.readUInt8(this.pos++);
          var green = this.buffer.readUInt8(this.pos++);
          var red = this.buffer.readUInt8(this.pos++);
          var location = line * this.width * 4 + x * 4;
          this.data[location] = 0;
          this.data[location + 1] = blue;
          this.data[location + 2] = green;
          this.data[location + 3] = red;
        }
        this.pos += this.width % 4;
      }
    };
    BmpDecoder.prototype.bit32 = function() {
      if (this.compress == 3) {
        this.maskRed = this.buffer.readUInt32LE(this.pos);
        this.pos += 4;
        this.maskGreen = this.buffer.readUInt32LE(this.pos);
        this.pos += 4;
        this.maskBlue = this.buffer.readUInt32LE(this.pos);
        this.pos += 4;
        this.mask0 = this.buffer.readUInt32LE(this.pos);
        this.pos += 4;
        for (var y = this.height - 1; y >= 0; y--) {
          var line = this.bottom_up ? y : this.height - 1 - y;
          for (var x = 0; x < this.width; x++) {
            var alpha = this.buffer.readUInt8(this.pos++);
            var blue = this.buffer.readUInt8(this.pos++);
            var green = this.buffer.readUInt8(this.pos++);
            var red = this.buffer.readUInt8(this.pos++);
            var location = line * this.width * 4 + x * 4;
            this.data[location] = alpha;
            this.data[location + 1] = blue;
            this.data[location + 2] = green;
            this.data[location + 3] = red;
          }
        }
      } else {
        for (var y = this.height - 1; y >= 0; y--) {
          var line = this.bottom_up ? y : this.height - 1 - y;
          for (var x = 0; x < this.width; x++) {
            var blue = this.buffer.readUInt8(this.pos++);
            var green = this.buffer.readUInt8(this.pos++);
            var red = this.buffer.readUInt8(this.pos++);
            var alpha = this.buffer.readUInt8(this.pos++);
            var location = line * this.width * 4 + x * 4;
            this.data[location] = alpha;
            this.data[location + 1] = blue;
            this.data[location + 2] = green;
            this.data[location + 3] = red;
          }
        }
      }
    };
    BmpDecoder.prototype.getData = function() {
      return this.data;
    };
    module2.exports = function(bmpData) {
      var decoder = new BmpDecoder(bmpData);
      return decoder;
    };
  }
});

// node_modules/bmp-js/index.js
var require_bmp_js = __commonJS({
  "node_modules/bmp-js/index.js"(exports2, module2) {
    var encode = require_encoder();
    var decode = require_decoder();
    module2.exports = {
      encode,
      decode
    };
  }
});

// node_modules/decode-dxt/lib/utils.js
var require_utils4 = __commonJS({
  "node_modules/decode-dxt/lib/utils.js"(exports2, module2) {
    "use strict";
    var utils3 = {};
    var lerp = function lerp2(v1, v2, r2) {
      return v1 * (1 - r2) + v2 * r2;
    };
    var convert565ByteToRgb = function convert565ByteToRgb2(byte) {
      return [
        Math.round((byte >>> 11 & 31) * (255 / 31)),
        Math.round((byte >>> 5 & 63) * (255 / 63)),
        Math.round((byte & 31) * (255 / 31))
      ];
    };
    utils3.extractBitsFromUin16Array = function extractBitsFromUin16Array(array, shift, length) {
      var height = array.length, heightm1 = height - 1, width = 16, rowS = shift / width | 0, rowE = (shift + length - 1) / width | 0, shiftS, shiftE, result;
      if (rowS === rowE) {
        shiftS = shift % width;
        result = array[heightm1 - rowS] >> shiftS & Math.pow(2, length) - 1;
      } else {
        shiftS = shift % width;
        shiftE = width - shiftS;
        result = array[heightm1 - rowS] >> shiftS & Math.pow(2, length) - 1;
        result += (array[heightm1 - rowE] & Math.pow(2, length - shiftE) - 1) << shiftE;
      }
      return result;
    };
    utils3.interpolateColorValues = function interpolateColorValues(firstVal, secondVal, isDxt1) {
      var firstColor = convert565ByteToRgb(firstVal), secondColor = convert565ByteToRgb(secondVal), colorValues = [].concat(firstColor, 255, secondColor, 255);
      if (isDxt1 && firstVal <= secondVal) {
        colorValues.push(
          Math.round((firstColor[0] + secondColor[0]) / 2),
          Math.round((firstColor[1] + secondColor[1]) / 2),
          Math.round((firstColor[2] + secondColor[2]) / 2),
          255,
          0,
          0,
          0,
          0
        );
      } else {
        colorValues.push(
          Math.round(lerp(firstColor[0], secondColor[0], 1 / 3)),
          Math.round(lerp(firstColor[1], secondColor[1], 1 / 3)),
          Math.round(lerp(firstColor[2], secondColor[2], 1 / 3)),
          255,
          Math.round(lerp(firstColor[0], secondColor[0], 2 / 3)),
          Math.round(lerp(firstColor[1], secondColor[1], 2 / 3)),
          Math.round(lerp(firstColor[2], secondColor[2], 2 / 3)),
          255
        );
      }
      return colorValues;
    };
    utils3.interpolateAlphaValues = function interpolateAlphaValues(firstVal, secondVal) {
      var alphaValues = [firstVal, secondVal];
      if (firstVal > secondVal) {
        alphaValues.push(
          Math.floor(lerp(firstVal, secondVal, 1 / 7)),
          Math.floor(lerp(firstVal, secondVal, 2 / 7)),
          Math.floor(lerp(firstVal, secondVal, 3 / 7)),
          Math.floor(lerp(firstVal, secondVal, 4 / 7)),
          Math.floor(lerp(firstVal, secondVal, 5 / 7)),
          Math.floor(lerp(firstVal, secondVal, 6 / 7))
        );
      } else {
        alphaValues.push(
          Math.floor(lerp(firstVal, secondVal, 1 / 5)),
          Math.floor(lerp(firstVal, secondVal, 2 / 5)),
          Math.floor(lerp(firstVal, secondVal, 3 / 5)),
          Math.floor(lerp(firstVal, secondVal, 4 / 5)),
          0,
          255
        );
      }
      return alphaValues;
    };
    utils3.multiply = function(component, multiplier) {
      if (!isFinite(multiplier) || multiplier === 0) {
        return 0;
      }
      return Math.round(component * multiplier);
    };
    module2.exports = utils3;
  }
});

// node_modules/decode-dxt/lib/bc1.js
var require_bc1 = __commonJS({
  "node_modules/decode-dxt/lib/bc1.js"(exports2, module2) {
    "use strict";
    var utils3 = require_utils4();
    module2.exports = function decodeBC1(imageData, width, height) {
      var rgba = new Uint8Array(width * height * 4), height_4 = height / 4 | 0, width_4 = width / 4 | 0, offset = 0, colorValues, colorIndices, colorIndex, pixelIndex, rgbaIndex, h2, w2, x, y;
      for (h2 = 0; h2 < height_4; h2++) {
        for (w2 = 0; w2 < width_4; w2++) {
          colorValues = utils3.interpolateColorValues(imageData.getUint16(offset, true), imageData.getUint16(offset + 2, true), true);
          colorIndices = imageData.getUint32(offset + 4, true);
          for (y = 0; y < 4; y++) {
            for (x = 0; x < 4; x++) {
              pixelIndex = 3 - x + y * 4;
              rgbaIndex = (h2 * 4 + 3 - y) * width * 4 + (w2 * 4 + x) * 4;
              colorIndex = colorIndices >> 2 * (15 - pixelIndex) & 3;
              rgba[rgbaIndex] = colorValues[colorIndex * 4];
              rgba[rgbaIndex + 1] = colorValues[colorIndex * 4 + 1];
              rgba[rgbaIndex + 2] = colorValues[colorIndex * 4 + 2];
              rgba[rgbaIndex + 3] = colorValues[colorIndex * 4 + 3];
            }
          }
          offset += 8;
        }
      }
      return rgba;
    };
  }
});

// node_modules/decode-dxt/lib/bc2.js
var require_bc2 = __commonJS({
  "node_modules/decode-dxt/lib/bc2.js"(exports2, module2) {
    "use strict";
    var utils3 = require_utils4();
    var getAlphaValue = function getAlphaValue2(alphaValue, pixelIndex) {
      return utils3.extractBitsFromUin16Array(alphaValue, 4 * (15 - pixelIndex), 4) * 17;
    };
    module2.exports = function decodeBC2(imageData, width, height, premultiplied) {
      var rgba = new Uint8Array(width * height * 4), height_4 = height / 4 | 0, width_4 = width / 4 | 0, offset = 0, alphaValues, alphaValue, multiplier, colorValues, colorIndices, colorIndex, pixelIndex, rgbaIndex, h2, w2, x, y;
      for (h2 = 0; h2 < height_4; h2++) {
        for (w2 = 0; w2 < width_4; w2++) {
          alphaValues = [
            imageData.getUint16(offset + 6, true),
            imageData.getUint16(offset + 4, true),
            imageData.getUint16(offset + 2, true),
            imageData.getUint16(offset, true)
          ];
          colorValues = utils3.interpolateColorValues(imageData.getUint16(offset + 8, true), imageData.getUint16(offset + 10, true));
          colorIndices = imageData.getUint32(offset + 12, true);
          for (y = 0; y < 4; y++) {
            for (x = 0; x < 4; x++) {
              pixelIndex = 3 - x + y * 4;
              rgbaIndex = (h2 * 4 + 3 - y) * width * 4 + (w2 * 4 + x) * 4;
              colorIndex = colorIndices >> 2 * (15 - pixelIndex) & 3;
              alphaValue = getAlphaValue(alphaValues, pixelIndex);
              multiplier = premultiplied ? 255 / alphaValue : 1;
              rgba[rgbaIndex] = utils3.multiply(colorValues[colorIndex * 4], multiplier);
              rgba[rgbaIndex + 1] = utils3.multiply(colorValues[colorIndex * 4 + 1], multiplier);
              rgba[rgbaIndex + 2] = utils3.multiply(colorValues[colorIndex * 4 + 2], multiplier);
              rgba[rgbaIndex + 3] = getAlphaValue(alphaValues, pixelIndex);
            }
          }
          offset += 16;
        }
      }
      return rgba;
    };
  }
});

// node_modules/decode-dxt/lib/bc3.js
var require_bc3 = __commonJS({
  "node_modules/decode-dxt/lib/bc3.js"(exports2, module2) {
    "use strict";
    var utils3 = require_utils4();
    var getAlphaIndex = function getAlphaIndex2(alphaIndices, pixelIndex) {
      return utils3.extractBitsFromUin16Array(alphaIndices, 3 * (15 - pixelIndex), 3);
    };
    module2.exports = function decodeBC3(imageData, width, height, premultiplied) {
      var rgba = new Uint8Array(width * height * 4), height_4 = height / 4 | 0, width_4 = width / 4 | 0, offset = 0, alphaValues, alphaIndices, alphaIndex, alphaValue, multiplier, colorValues, colorIndices, colorIndex, pixelIndex, rgbaIndex, h2, w2, x, y;
      for (h2 = 0; h2 < height_4; h2++) {
        for (w2 = 0; w2 < width_4; w2++) {
          alphaValues = utils3.interpolateAlphaValues(imageData.getUint8(offset, true), imageData.getUint8(offset + 1, true), false);
          alphaIndices = [
            imageData.getUint16(offset + 6, true),
            imageData.getUint16(offset + 4, true),
            imageData.getUint16(offset + 2, true)
          ];
          colorValues = utils3.interpolateColorValues(imageData.getUint16(offset + 8, true), imageData.getUint16(offset + 10, true));
          colorIndices = imageData.getUint32(offset + 12, true);
          for (y = 0; y < 4; y++) {
            for (x = 0; x < 4; x++) {
              pixelIndex = 3 - x + y * 4;
              rgbaIndex = (h2 * 4 + 3 - y) * width * 4 + (w2 * 4 + x) * 4;
              colorIndex = colorIndices >> 2 * (15 - pixelIndex) & 3;
              alphaIndex = getAlphaIndex(alphaIndices, pixelIndex);
              alphaValue = alphaValues[alphaIndex];
              multiplier = premultiplied ? 255 / alphaValue : 1;
              rgba[rgbaIndex] = utils3.multiply(colorValues[colorIndex * 4], multiplier);
              rgba[rgbaIndex + 1] = utils3.multiply(colorValues[colorIndex * 4 + 1], multiplier);
              rgba[rgbaIndex + 2] = utils3.multiply(colorValues[colorIndex * 4 + 2], multiplier);
              rgba[rgbaIndex + 3] = alphaValue;
            }
          }
          offset += 16;
        }
      }
      return rgba;
    };
  }
});

// node_modules/decode-dxt/index.js
var require_decode_dxt = __commonJS({
  "node_modules/decode-dxt/index.js"(exports2, module2) {
    "use strict";
    var decodeBC1 = require_bc1();
    var decodeBC2 = require_bc2();
    var decodeBC3 = require_bc3();
    function decode(imageDataView, width, height, format3) {
      var result;
      format3 = format3 ? format3.toLowerCase() : "dxt1";
      if (format3 === decode.dxt1) {
        result = decodeBC1(imageDataView, width, height);
      } else if (format3 === decode.dxt2) {
        result = decodeBC2(imageDataView, width, height, true);
      } else if (format3 === decode.dxt3) {
        result = decodeBC2(imageDataView, width, height, false);
      } else if (format3 === decode.dxt4) {
        result = decodeBC3(imageDataView, width, height, true);
      } else if (format3 === decode.dxt5) {
        result = decodeBC3(imageDataView, width, height, false);
      } else {
        throw new Error("Unknown DXT format : '" + format3 + "'");
      }
      return result;
    }
    decode.dxt1 = "dxt1";
    decode.dxt2 = "dxt2";
    decode.dxt3 = "dxt3";
    decode.dxt4 = "dxt4";
    decode.dxt5 = "dxt5";
    module2.exports = decode;
  }
});

// src/utils/decode-texture.js
var require_decode_texture = __commonJS({
  "src/utils/decode-texture.js"(exports2, module2) {
    "use strict";
    var bmp = require_bmp_js();
    var decodeDXT = require_decode_dxt();
    function decodeTexture2(texture) {
      switch (texture.textureFormat) {
        // jpeg (saved as .jpg)
        case 1:
          return { extension: "jpg", buffer: new Buffer(texture.bytes) };
        // dxt1 (saved as .bmp)
        case 6:
          const bytes = texture.bytes;
          const buf = new Buffer(bytes);
          const abuf = new Uint8Array(buf).buffer;
          const imageDataView = new DataView(abuf, 0, bytes.length);
          const rgbaData = decodeDXT(imageDataView, texture.width, texture.height, "dxt1");
          const bmpData = [];
          for (let i = 0; i < rgbaData.length; i += 4) {
            bmpData.push(255);
            bmpData.push(rgbaData[i + 2]);
            bmpData.push(rgbaData[i + 1]);
            bmpData.push(rgbaData[i + 0]);
          }
          const rawData = bmp.encode({
            data: bmpData,
            width: texture.width,
            height: texture.height
          });
          return { extension: "bmp", buffer: Buffer.from(rawData.data) };
        default:
          throw `unknown textureFormat ${texture.textureFormat}`;
      }
    }
    module2.exports = {
      decodeTexture: decodeTexture2
    };
  }
});

// node_modules/yargs/lib/platform-shims/esm.mjs
var import_assert = require("assert");

// node_modules/cliui/build/lib/index.js
var align = {
  right: alignRight,
  center: alignCenter
};
var top = 0;
var right = 1;
var bottom = 2;
var left = 3;
var UI = class {
  constructor(opts) {
    var _a2;
    this.width = opts.width;
    this.wrap = (_a2 = opts.wrap) !== null && _a2 !== void 0 ? _a2 : true;
    this.rows = [];
  }
  span(...args) {
    const cols = this.div(...args);
    cols.span = true;
  }
  resetOutput() {
    this.rows = [];
  }
  div(...args) {
    if (args.length === 0) {
      this.div("");
    }
    if (this.wrap && this.shouldApplyLayoutDSL(...args) && typeof args[0] === "string") {
      return this.applyLayoutDSL(args[0]);
    }
    const cols = args.map((arg) => {
      if (typeof arg === "string") {
        return this.colFromString(arg);
      }
      return arg;
    });
    this.rows.push(cols);
    return cols;
  }
  shouldApplyLayoutDSL(...args) {
    return args.length === 1 && typeof args[0] === "string" && /[\t\n]/.test(args[0]);
  }
  applyLayoutDSL(str) {
    const rows = str.split("\n").map((row) => row.split("	"));
    let leftColumnWidth = 0;
    rows.forEach((columns) => {
      if (columns.length > 1 && mixin.stringWidth(columns[0]) > leftColumnWidth) {
        leftColumnWidth = Math.min(Math.floor(this.width * 0.5), mixin.stringWidth(columns[0]));
      }
    });
    rows.forEach((columns) => {
      this.div(...columns.map((r2, i) => {
        return {
          text: r2.trim(),
          padding: this.measurePadding(r2),
          width: i === 0 && columns.length > 1 ? leftColumnWidth : void 0
        };
      }));
    });
    return this.rows[this.rows.length - 1];
  }
  colFromString(text) {
    return {
      text,
      padding: this.measurePadding(text)
    };
  }
  measurePadding(str) {
    const noAnsi = mixin.stripAnsi(str);
    return [0, noAnsi.match(/\s*$/)[0].length, 0, noAnsi.match(/^\s*/)[0].length];
  }
  toString() {
    const lines = [];
    this.rows.forEach((row) => {
      this.rowToString(row, lines);
    });
    return lines.filter((line) => !line.hidden).map((line) => line.text).join("\n");
  }
  rowToString(row, lines) {
    this.rasterize(row).forEach((rrow, r2) => {
      let str = "";
      rrow.forEach((col, c2) => {
        const { width } = row[c2];
        const wrapWidth = this.negatePadding(row[c2]);
        let ts = col;
        if (wrapWidth > mixin.stringWidth(col)) {
          ts += " ".repeat(wrapWidth - mixin.stringWidth(col));
        }
        if (row[c2].align && row[c2].align !== "left" && this.wrap) {
          const fn = align[row[c2].align];
          ts = fn(ts, wrapWidth);
          if (mixin.stringWidth(ts) < wrapWidth) {
            ts += " ".repeat((width || 0) - mixin.stringWidth(ts) - 1);
          }
        }
        const padding = row[c2].padding || [0, 0, 0, 0];
        if (padding[left]) {
          str += " ".repeat(padding[left]);
        }
        str += addBorder(row[c2], ts, "| ");
        str += ts;
        str += addBorder(row[c2], ts, " |");
        if (padding[right]) {
          str += " ".repeat(padding[right]);
        }
        if (r2 === 0 && lines.length > 0) {
          str = this.renderInline(str, lines[lines.length - 1]);
        }
      });
      lines.push({
        text: str.replace(/ +$/, ""),
        span: row.span
      });
    });
    return lines;
  }
  // if the full 'source' can render in
  // the target line, do so.
  renderInline(source, previousLine) {
    const match = source.match(/^ */);
    const leadingWhitespace = match ? match[0].length : 0;
    const target = previousLine.text;
    const targetTextWidth = mixin.stringWidth(target.trimRight());
    if (!previousLine.span) {
      return source;
    }
    if (!this.wrap) {
      previousLine.hidden = true;
      return target + source;
    }
    if (leadingWhitespace < targetTextWidth) {
      return source;
    }
    previousLine.hidden = true;
    return target.trimRight() + " ".repeat(leadingWhitespace - targetTextWidth) + source.trimLeft();
  }
  rasterize(row) {
    const rrows = [];
    const widths = this.columnWidths(row);
    let wrapped;
    row.forEach((col, c2) => {
      col.width = widths[c2];
      if (this.wrap) {
        wrapped = mixin.wrap(col.text, this.negatePadding(col), { hard: true }).split("\n");
      } else {
        wrapped = col.text.split("\n");
      }
      if (col.border) {
        wrapped.unshift("." + "-".repeat(this.negatePadding(col) + 2) + ".");
        wrapped.push("'" + "-".repeat(this.negatePadding(col) + 2) + "'");
      }
      if (col.padding) {
        wrapped.unshift(...new Array(col.padding[top] || 0).fill(""));
        wrapped.push(...new Array(col.padding[bottom] || 0).fill(""));
      }
      wrapped.forEach((str, r2) => {
        if (!rrows[r2]) {
          rrows.push([]);
        }
        const rrow = rrows[r2];
        for (let i = 0; i < c2; i++) {
          if (rrow[i] === void 0) {
            rrow.push("");
          }
        }
        rrow.push(str);
      });
    });
    return rrows;
  }
  negatePadding(col) {
    let wrapWidth = col.width || 0;
    if (col.padding) {
      wrapWidth -= (col.padding[left] || 0) + (col.padding[right] || 0);
    }
    if (col.border) {
      wrapWidth -= 4;
    }
    return wrapWidth;
  }
  columnWidths(row) {
    if (!this.wrap) {
      return row.map((col) => {
        return col.width || mixin.stringWidth(col.text);
      });
    }
    let unset = row.length;
    let remainingWidth = this.width;
    const widths = row.map((col) => {
      if (col.width) {
        unset--;
        remainingWidth -= col.width;
        return col.width;
      }
      return void 0;
    });
    const unsetWidth = unset ? Math.floor(remainingWidth / unset) : 0;
    return widths.map((w2, i) => {
      if (w2 === void 0) {
        return Math.max(unsetWidth, _minWidth(row[i]));
      }
      return w2;
    });
  }
};
function addBorder(col, ts, style) {
  if (col.border) {
    if (/[.']-+[.']/.test(ts)) {
      return "";
    }
    if (ts.trim().length !== 0) {
      return style;
    }
    return "  ";
  }
  return "";
}
function _minWidth(col) {
  const padding = col.padding || [];
  const minWidth = 1 + (padding[left] || 0) + (padding[right] || 0);
  if (col.border) {
    return minWidth + 4;
  }
  return minWidth;
}
function getWindowWidth() {
  if (typeof process === "object" && process.stdout && process.stdout.columns) {
    return process.stdout.columns;
  }
  return 80;
}
function alignRight(str, width) {
  str = str.trim();
  const strWidth = mixin.stringWidth(str);
  if (strWidth < width) {
    return " ".repeat(width - strWidth) + str;
  }
  return str;
}
function alignCenter(str, width) {
  str = str.trim();
  const strWidth = mixin.stringWidth(str);
  if (strWidth >= width) {
    return str;
  }
  return " ".repeat(width - strWidth >> 1) + str;
}
var mixin;
function cliui(opts, _mixin) {
  mixin = _mixin;
  return new UI({
    width: (opts === null || opts === void 0 ? void 0 : opts.width) || getWindowWidth(),
    wrap: opts === null || opts === void 0 ? void 0 : opts.wrap
  });
}

// node_modules/cliui/build/lib/string-utils.js
var ansi = new RegExp("\x1B(?:\\[(?:\\d+[ABCDEFGJKSTm]|\\d+;\\d+[Hfm]|\\d+;\\d+;\\d+m|6n|s|u|\\?25[lh])|\\w)", "g");
function stripAnsi(str) {
  return str.replace(ansi, "");
}
function wrap(str, width) {
  const [start, end] = str.match(ansi) || ["", ""];
  str = stripAnsi(str);
  let wrapped = "";
  for (let i = 0; i < str.length; i++) {
    if (i !== 0 && i % width === 0) {
      wrapped += "\n";
    }
    wrapped += str.charAt(i);
  }
  if (start && end) {
    wrapped = `${start}${wrapped}${end}`;
  }
  return wrapped;
}

// node_modules/cliui/index.mjs
function ui(opts) {
  return cliui(opts, {
    stringWidth: (str) => {
      return [...str].length;
    },
    stripAnsi,
    wrap
  });
}

// node_modules/escalade/sync/index.mjs
var import_path = require("path");
var import_fs = require("fs");
function sync_default(start, callback) {
  let dir = (0, import_path.resolve)(".", start);
  let tmp, stats = (0, import_fs.statSync)(dir);
  if (!stats.isDirectory()) {
    dir = (0, import_path.dirname)(dir);
  }
  while (true) {
    tmp = callback(dir, (0, import_fs.readdirSync)(dir));
    if (tmp) return (0, import_path.resolve)(dir, tmp);
    dir = (0, import_path.dirname)(tmp = dir);
    if (tmp === dir) break;
  }
}

// node_modules/yargs/lib/platform-shims/esm.mjs
var import_util3 = require("util");
var import_fs4 = require("fs");
var import_url = require("url");

// node_modules/yargs-parser/build/lib/index.js
var import_util = require("util");
var import_path2 = require("path");

// node_modules/yargs-parser/build/lib/string-utils.js
function camelCase(str) {
  const isCamelCase = str !== str.toLowerCase() && str !== str.toUpperCase();
  if (!isCamelCase) {
    str = str.toLowerCase();
  }
  if (str.indexOf("-") === -1 && str.indexOf("_") === -1) {
    return str;
  } else {
    let camelcase = "";
    let nextChrUpper = false;
    const leadingHyphens = str.match(/^-+/);
    for (let i = leadingHyphens ? leadingHyphens[0].length : 0; i < str.length; i++) {
      let chr = str.charAt(i);
      if (nextChrUpper) {
        nextChrUpper = false;
        chr = chr.toUpperCase();
      }
      if (i !== 0 && (chr === "-" || chr === "_")) {
        nextChrUpper = true;
      } else if (chr !== "-" && chr !== "_") {
        camelcase += chr;
      }
    }
    return camelcase;
  }
}
function decamelize(str, joinString) {
  const lowercase = str.toLowerCase();
  joinString = joinString || "-";
  let notCamelcase = "";
  for (let i = 0; i < str.length; i++) {
    const chrLower = lowercase.charAt(i);
    const chrString = str.charAt(i);
    if (chrLower !== chrString && i > 0) {
      notCamelcase += `${joinString}${lowercase.charAt(i)}`;
    } else {
      notCamelcase += chrString;
    }
  }
  return notCamelcase;
}
function looksLikeNumber(x) {
  if (x === null || x === void 0)
    return false;
  if (typeof x === "number")
    return true;
  if (/^0x[0-9a-f]+$/i.test(x))
    return true;
  if (/^0[^.]/.test(x))
    return false;
  return /^[-]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(x);
}

// node_modules/yargs-parser/build/lib/tokenize-arg-string.js
function tokenizeArgString(argString) {
  if (Array.isArray(argString)) {
    return argString.map((e2) => typeof e2 !== "string" ? e2 + "" : e2);
  }
  argString = argString.trim();
  let i = 0;
  let prevC = null;
  let c2 = null;
  let opening = null;
  const args = [];
  for (let ii = 0; ii < argString.length; ii++) {
    prevC = c2;
    c2 = argString.charAt(ii);
    if (c2 === " " && !opening) {
      if (!(prevC === " ")) {
        i++;
      }
      continue;
    }
    if (c2 === opening) {
      opening = null;
    } else if ((c2 === "'" || c2 === '"') && !opening) {
      opening = c2;
    }
    if (!args[i])
      args[i] = "";
    args[i] += c2;
  }
  return args;
}

// node_modules/yargs-parser/build/lib/yargs-parser-types.js
var DefaultValuesForTypeKey;
(function(DefaultValuesForTypeKey2) {
  DefaultValuesForTypeKey2["BOOLEAN"] = "boolean";
  DefaultValuesForTypeKey2["STRING"] = "string";
  DefaultValuesForTypeKey2["NUMBER"] = "number";
  DefaultValuesForTypeKey2["ARRAY"] = "array";
})(DefaultValuesForTypeKey || (DefaultValuesForTypeKey = {}));

// node_modules/yargs-parser/build/lib/yargs-parser.js
var mixin2;
var YargsParser = class {
  constructor(_mixin) {
    mixin2 = _mixin;
  }
  parse(argsInput, options) {
    const opts = Object.assign({
      alias: void 0,
      array: void 0,
      boolean: void 0,
      config: void 0,
      configObjects: void 0,
      configuration: void 0,
      coerce: void 0,
      count: void 0,
      default: void 0,
      envPrefix: void 0,
      narg: void 0,
      normalize: void 0,
      string: void 0,
      number: void 0,
      __: void 0,
      key: void 0
    }, options);
    const args = tokenizeArgString(argsInput);
    const inputIsString = typeof argsInput === "string";
    const aliases = combineAliases(Object.assign(/* @__PURE__ */ Object.create(null), opts.alias));
    const configuration = Object.assign({
      "boolean-negation": true,
      "camel-case-expansion": true,
      "combine-arrays": false,
      "dot-notation": true,
      "duplicate-arguments-array": true,
      "flatten-duplicate-arrays": true,
      "greedy-arrays": true,
      "halt-at-non-option": false,
      "nargs-eats-options": false,
      "negation-prefix": "no-",
      "parse-numbers": true,
      "parse-positional-numbers": true,
      "populate--": false,
      "set-placeholder-key": false,
      "short-option-groups": true,
      "strip-aliased": false,
      "strip-dashed": false,
      "unknown-options-as-args": false
    }, opts.configuration);
    const defaults = Object.assign(/* @__PURE__ */ Object.create(null), opts.default);
    const configObjects = opts.configObjects || [];
    const envPrefix = opts.envPrefix;
    const notFlagsOption = configuration["populate--"];
    const notFlagsArgv = notFlagsOption ? "--" : "_";
    const newAliases = /* @__PURE__ */ Object.create(null);
    const defaulted = /* @__PURE__ */ Object.create(null);
    const __ = opts.__ || mixin2.format;
    const flags = {
      aliases: /* @__PURE__ */ Object.create(null),
      arrays: /* @__PURE__ */ Object.create(null),
      bools: /* @__PURE__ */ Object.create(null),
      strings: /* @__PURE__ */ Object.create(null),
      numbers: /* @__PURE__ */ Object.create(null),
      counts: /* @__PURE__ */ Object.create(null),
      normalize: /* @__PURE__ */ Object.create(null),
      configs: /* @__PURE__ */ Object.create(null),
      nargs: /* @__PURE__ */ Object.create(null),
      coercions: /* @__PURE__ */ Object.create(null),
      keys: []
    };
    const negative = /^-([0-9]+(\.[0-9]+)?|\.[0-9]+)$/;
    const negatedBoolean = new RegExp("^--" + configuration["negation-prefix"] + "(.+)");
    [].concat(opts.array || []).filter(Boolean).forEach(function(opt) {
      const key = typeof opt === "object" ? opt.key : opt;
      const assignment = Object.keys(opt).map(function(key2) {
        const arrayFlagKeys = {
          boolean: "bools",
          string: "strings",
          number: "numbers"
        };
        return arrayFlagKeys[key2];
      }).filter(Boolean).pop();
      if (assignment) {
        flags[assignment][key] = true;
      }
      flags.arrays[key] = true;
      flags.keys.push(key);
    });
    [].concat(opts.boolean || []).filter(Boolean).forEach(function(key) {
      flags.bools[key] = true;
      flags.keys.push(key);
    });
    [].concat(opts.string || []).filter(Boolean).forEach(function(key) {
      flags.strings[key] = true;
      flags.keys.push(key);
    });
    [].concat(opts.number || []).filter(Boolean).forEach(function(key) {
      flags.numbers[key] = true;
      flags.keys.push(key);
    });
    [].concat(opts.count || []).filter(Boolean).forEach(function(key) {
      flags.counts[key] = true;
      flags.keys.push(key);
    });
    [].concat(opts.normalize || []).filter(Boolean).forEach(function(key) {
      flags.normalize[key] = true;
      flags.keys.push(key);
    });
    if (typeof opts.narg === "object") {
      Object.entries(opts.narg).forEach(([key, value2]) => {
        if (typeof value2 === "number") {
          flags.nargs[key] = value2;
          flags.keys.push(key);
        }
      });
    }
    if (typeof opts.coerce === "object") {
      Object.entries(opts.coerce).forEach(([key, value2]) => {
        if (typeof value2 === "function") {
          flags.coercions[key] = value2;
          flags.keys.push(key);
        }
      });
    }
    if (typeof opts.config !== "undefined") {
      if (Array.isArray(opts.config) || typeof opts.config === "string") {
        ;
        [].concat(opts.config).filter(Boolean).forEach(function(key) {
          flags.configs[key] = true;
        });
      } else if (typeof opts.config === "object") {
        Object.entries(opts.config).forEach(([key, value2]) => {
          if (typeof value2 === "boolean" || typeof value2 === "function") {
            flags.configs[key] = value2;
          }
        });
      }
    }
    extendAliases(opts.key, aliases, opts.default, flags.arrays);
    Object.keys(defaults).forEach(function(key) {
      (flags.aliases[key] || []).forEach(function(alias) {
        defaults[alias] = defaults[key];
      });
    });
    let error = null;
    checkConfiguration();
    let notFlags = [];
    const argv2 = Object.assign(/* @__PURE__ */ Object.create(null), { _: [] });
    const argvReturn = {};
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const truncatedArg = arg.replace(/^-{3,}/, "---");
      let broken;
      let key;
      let letters;
      let m2;
      let next;
      let value2;
      if (arg !== "--" && /^-/.test(arg) && isUnknownOptionAsArg(arg)) {
        pushPositional(arg);
      } else if (truncatedArg.match(/^---+(=|$)/)) {
        pushPositional(arg);
        continue;
      } else if (arg.match(/^--.+=/) || !configuration["short-option-groups"] && arg.match(/^-.+=/)) {
        m2 = arg.match(/^--?([^=]+)=([\s\S]*)$/);
        if (m2 !== null && Array.isArray(m2) && m2.length >= 3) {
          if (checkAllAliases(m2[1], flags.arrays)) {
            i = eatArray(i, m2[1], args, m2[2]);
          } else if (checkAllAliases(m2[1], flags.nargs) !== false) {
            i = eatNargs(i, m2[1], args, m2[2]);
          } else {
            setArg(m2[1], m2[2], true);
          }
        }
      } else if (arg.match(negatedBoolean) && configuration["boolean-negation"]) {
        m2 = arg.match(negatedBoolean);
        if (m2 !== null && Array.isArray(m2) && m2.length >= 2) {
          key = m2[1];
          setArg(key, checkAllAliases(key, flags.arrays) ? [false] : false);
        }
      } else if (arg.match(/^--.+/) || !configuration["short-option-groups"] && arg.match(/^-[^-]+/)) {
        m2 = arg.match(/^--?(.+)/);
        if (m2 !== null && Array.isArray(m2) && m2.length >= 2) {
          key = m2[1];
          if (checkAllAliases(key, flags.arrays)) {
            i = eatArray(i, key, args);
          } else if (checkAllAliases(key, flags.nargs) !== false) {
            i = eatNargs(i, key, args);
          } else {
            next = args[i + 1];
            if (next !== void 0 && (!next.match(/^-/) || next.match(negative)) && !checkAllAliases(key, flags.bools) && !checkAllAliases(key, flags.counts)) {
              setArg(key, next);
              i++;
            } else if (/^(true|false)$/.test(next)) {
              setArg(key, next);
              i++;
            } else {
              setArg(key, defaultValue(key));
            }
          }
        }
      } else if (arg.match(/^-.\..+=/)) {
        m2 = arg.match(/^-([^=]+)=([\s\S]*)$/);
        if (m2 !== null && Array.isArray(m2) && m2.length >= 3) {
          setArg(m2[1], m2[2]);
        }
      } else if (arg.match(/^-.\..+/) && !arg.match(negative)) {
        next = args[i + 1];
        m2 = arg.match(/^-(.\..+)/);
        if (m2 !== null && Array.isArray(m2) && m2.length >= 2) {
          key = m2[1];
          if (next !== void 0 && !next.match(/^-/) && !checkAllAliases(key, flags.bools) && !checkAllAliases(key, flags.counts)) {
            setArg(key, next);
            i++;
          } else {
            setArg(key, defaultValue(key));
          }
        }
      } else if (arg.match(/^-[^-]+/) && !arg.match(negative)) {
        letters = arg.slice(1, -1).split("");
        broken = false;
        for (let j = 0; j < letters.length; j++) {
          next = arg.slice(j + 2);
          if (letters[j + 1] && letters[j + 1] === "=") {
            value2 = arg.slice(j + 3);
            key = letters[j];
            if (checkAllAliases(key, flags.arrays)) {
              i = eatArray(i, key, args, value2);
            } else if (checkAllAliases(key, flags.nargs) !== false) {
              i = eatNargs(i, key, args, value2);
            } else {
              setArg(key, value2);
            }
            broken = true;
            break;
          }
          if (next === "-") {
            setArg(letters[j], next);
            continue;
          }
          if (/[A-Za-z]/.test(letters[j]) && /^-?\d+(\.\d*)?(e-?\d+)?$/.test(next) && checkAllAliases(next, flags.bools) === false) {
            setArg(letters[j], next);
            broken = true;
            break;
          }
          if (letters[j + 1] && letters[j + 1].match(/\W/)) {
            setArg(letters[j], next);
            broken = true;
            break;
          } else {
            setArg(letters[j], defaultValue(letters[j]));
          }
        }
        key = arg.slice(-1)[0];
        if (!broken && key !== "-") {
          if (checkAllAliases(key, flags.arrays)) {
            i = eatArray(i, key, args);
          } else if (checkAllAliases(key, flags.nargs) !== false) {
            i = eatNargs(i, key, args);
          } else {
            next = args[i + 1];
            if (next !== void 0 && (!/^(-|--)[^-]/.test(next) || next.match(negative)) && !checkAllAliases(key, flags.bools) && !checkAllAliases(key, flags.counts)) {
              setArg(key, next);
              i++;
            } else if (/^(true|false)$/.test(next)) {
              setArg(key, next);
              i++;
            } else {
              setArg(key, defaultValue(key));
            }
          }
        }
      } else if (arg.match(/^-[0-9]$/) && arg.match(negative) && checkAllAliases(arg.slice(1), flags.bools)) {
        key = arg.slice(1);
        setArg(key, defaultValue(key));
      } else if (arg === "--") {
        notFlags = args.slice(i + 1);
        break;
      } else if (configuration["halt-at-non-option"]) {
        notFlags = args.slice(i);
        break;
      } else {
        pushPositional(arg);
      }
    }
    applyEnvVars(argv2, true);
    applyEnvVars(argv2, false);
    setConfig(argv2);
    setConfigObjects();
    applyDefaultsAndAliases(argv2, flags.aliases, defaults, true);
    applyCoercions(argv2);
    if (configuration["set-placeholder-key"])
      setPlaceholderKeys(argv2);
    Object.keys(flags.counts).forEach(function(key) {
      if (!hasKey(argv2, key.split(".")))
        setArg(key, 0);
    });
    if (notFlagsOption && notFlags.length)
      argv2[notFlagsArgv] = [];
    notFlags.forEach(function(key) {
      argv2[notFlagsArgv].push(key);
    });
    if (configuration["camel-case-expansion"] && configuration["strip-dashed"]) {
      Object.keys(argv2).filter((key) => key !== "--" && key.includes("-")).forEach((key) => {
        delete argv2[key];
      });
    }
    if (configuration["strip-aliased"]) {
      ;
      [].concat(...Object.keys(aliases).map((k2) => aliases[k2])).forEach((alias) => {
        if (configuration["camel-case-expansion"] && alias.includes("-")) {
          delete argv2[alias.split(".").map((prop) => camelCase(prop)).join(".")];
        }
        delete argv2[alias];
      });
    }
    function pushPositional(arg) {
      const maybeCoercedNumber = maybeCoerceNumber("_", arg);
      if (typeof maybeCoercedNumber === "string" || typeof maybeCoercedNumber === "number") {
        argv2._.push(maybeCoercedNumber);
      }
    }
    function eatNargs(i, key, args2, argAfterEqualSign) {
      let ii;
      let toEat = checkAllAliases(key, flags.nargs);
      toEat = typeof toEat !== "number" || isNaN(toEat) ? 1 : toEat;
      if (toEat === 0) {
        if (!isUndefined(argAfterEqualSign)) {
          error = Error(__("Argument unexpected for: %s", key));
        }
        setArg(key, defaultValue(key));
        return i;
      }
      let available = isUndefined(argAfterEqualSign) ? 0 : 1;
      if (configuration["nargs-eats-options"]) {
        if (args2.length - (i + 1) + available < toEat) {
          error = Error(__("Not enough arguments following: %s", key));
        }
        available = toEat;
      } else {
        for (ii = i + 1; ii < args2.length; ii++) {
          if (!args2[ii].match(/^-[^0-9]/) || args2[ii].match(negative) || isUnknownOptionAsArg(args2[ii]))
            available++;
          else
            break;
        }
        if (available < toEat)
          error = Error(__("Not enough arguments following: %s", key));
      }
      let consumed = Math.min(available, toEat);
      if (!isUndefined(argAfterEqualSign) && consumed > 0) {
        setArg(key, argAfterEqualSign);
        consumed--;
      }
      for (ii = i + 1; ii < consumed + i + 1; ii++) {
        setArg(key, args2[ii]);
      }
      return i + consumed;
    }
    function eatArray(i, key, args2, argAfterEqualSign) {
      let argsToSet = [];
      let next = argAfterEqualSign || args2[i + 1];
      const nargsCount = checkAllAliases(key, flags.nargs);
      if (checkAllAliases(key, flags.bools) && !/^(true|false)$/.test(next)) {
        argsToSet.push(true);
      } else if (isUndefined(next) || isUndefined(argAfterEqualSign) && /^-/.test(next) && !negative.test(next) && !isUnknownOptionAsArg(next)) {
        if (defaults[key] !== void 0) {
          const defVal = defaults[key];
          argsToSet = Array.isArray(defVal) ? defVal : [defVal];
        }
      } else {
        if (!isUndefined(argAfterEqualSign)) {
          argsToSet.push(processValue(key, argAfterEqualSign, true));
        }
        for (let ii = i + 1; ii < args2.length; ii++) {
          if (!configuration["greedy-arrays"] && argsToSet.length > 0 || nargsCount && typeof nargsCount === "number" && argsToSet.length >= nargsCount)
            break;
          next = args2[ii];
          if (/^-/.test(next) && !negative.test(next) && !isUnknownOptionAsArg(next))
            break;
          i = ii;
          argsToSet.push(processValue(key, next, inputIsString));
        }
      }
      if (typeof nargsCount === "number" && (nargsCount && argsToSet.length < nargsCount || isNaN(nargsCount) && argsToSet.length === 0)) {
        error = Error(__("Not enough arguments following: %s", key));
      }
      setArg(key, argsToSet);
      return i;
    }
    function setArg(key, val, shouldStripQuotes = inputIsString) {
      if (/-/.test(key) && configuration["camel-case-expansion"]) {
        const alias = key.split(".").map(function(prop) {
          return camelCase(prop);
        }).join(".");
        addNewAlias(key, alias);
      }
      const value2 = processValue(key, val, shouldStripQuotes);
      const splitKey = key.split(".");
      setKey(argv2, splitKey, value2);
      if (flags.aliases[key]) {
        flags.aliases[key].forEach(function(x) {
          const keyProperties = x.split(".");
          setKey(argv2, keyProperties, value2);
        });
      }
      if (splitKey.length > 1 && configuration["dot-notation"]) {
        ;
        (flags.aliases[splitKey[0]] || []).forEach(function(x) {
          let keyProperties = x.split(".");
          const a2 = [].concat(splitKey);
          a2.shift();
          keyProperties = keyProperties.concat(a2);
          if (!(flags.aliases[key] || []).includes(keyProperties.join("."))) {
            setKey(argv2, keyProperties, value2);
          }
        });
      }
      if (checkAllAliases(key, flags.normalize) && !checkAllAliases(key, flags.arrays)) {
        const keys = [key].concat(flags.aliases[key] || []);
        keys.forEach(function(key2) {
          Object.defineProperty(argvReturn, key2, {
            enumerable: true,
            get() {
              return val;
            },
            set(value3) {
              val = typeof value3 === "string" ? mixin2.normalize(value3) : value3;
            }
          });
        });
      }
    }
    function addNewAlias(key, alias) {
      if (!(flags.aliases[key] && flags.aliases[key].length)) {
        flags.aliases[key] = [alias];
        newAliases[alias] = true;
      }
      if (!(flags.aliases[alias] && flags.aliases[alias].length)) {
        addNewAlias(alias, key);
      }
    }
    function processValue(key, val, shouldStripQuotes) {
      if (shouldStripQuotes) {
        val = stripQuotes(val);
      }
      if (checkAllAliases(key, flags.bools) || checkAllAliases(key, flags.counts)) {
        if (typeof val === "string")
          val = val === "true";
      }
      let value2 = Array.isArray(val) ? val.map(function(v2) {
        return maybeCoerceNumber(key, v2);
      }) : maybeCoerceNumber(key, val);
      if (checkAllAliases(key, flags.counts) && (isUndefined(value2) || typeof value2 === "boolean")) {
        value2 = increment();
      }
      if (checkAllAliases(key, flags.normalize) && checkAllAliases(key, flags.arrays)) {
        if (Array.isArray(val))
          value2 = val.map((val2) => {
            return mixin2.normalize(val2);
          });
        else
          value2 = mixin2.normalize(val);
      }
      return value2;
    }
    function maybeCoerceNumber(key, value2) {
      if (!configuration["parse-positional-numbers"] && key === "_")
        return value2;
      if (!checkAllAliases(key, flags.strings) && !checkAllAliases(key, flags.bools) && !Array.isArray(value2)) {
        const shouldCoerceNumber = looksLikeNumber(value2) && configuration["parse-numbers"] && Number.isSafeInteger(Math.floor(parseFloat(`${value2}`)));
        if (shouldCoerceNumber || !isUndefined(value2) && checkAllAliases(key, flags.numbers)) {
          value2 = Number(value2);
        }
      }
      return value2;
    }
    function setConfig(argv3) {
      const configLookup = /* @__PURE__ */ Object.create(null);
      applyDefaultsAndAliases(configLookup, flags.aliases, defaults);
      Object.keys(flags.configs).forEach(function(configKey) {
        const configPath = argv3[configKey] || configLookup[configKey];
        if (configPath) {
          try {
            let config = null;
            const resolvedConfigPath = mixin2.resolve(mixin2.cwd(), configPath);
            const resolveConfig = flags.configs[configKey];
            if (typeof resolveConfig === "function") {
              try {
                config = resolveConfig(resolvedConfigPath);
              } catch (e2) {
                config = e2;
              }
              if (config instanceof Error) {
                error = config;
                return;
              }
            } else {
              config = mixin2.require(resolvedConfigPath);
            }
            setConfigObject(config);
          } catch (ex) {
            if (ex.name === "PermissionDenied")
              error = ex;
            else if (argv3[configKey])
              error = Error(__("Invalid JSON config file: %s", configPath));
          }
        }
      });
    }
    function setConfigObject(config, prev) {
      Object.keys(config).forEach(function(key) {
        const value2 = config[key];
        const fullKey = prev ? prev + "." + key : key;
        if (typeof value2 === "object" && value2 !== null && !Array.isArray(value2) && configuration["dot-notation"]) {
          setConfigObject(value2, fullKey);
        } else {
          if (!hasKey(argv2, fullKey.split(".")) || checkAllAliases(fullKey, flags.arrays) && configuration["combine-arrays"]) {
            setArg(fullKey, value2);
          }
        }
      });
    }
    function setConfigObjects() {
      if (typeof configObjects !== "undefined") {
        configObjects.forEach(function(configObject) {
          setConfigObject(configObject);
        });
      }
    }
    function applyEnvVars(argv3, configOnly) {
      if (typeof envPrefix === "undefined")
        return;
      const prefix = typeof envPrefix === "string" ? envPrefix : "";
      const env2 = mixin2.env();
      Object.keys(env2).forEach(function(envVar) {
        if (prefix === "" || envVar.lastIndexOf(prefix, 0) === 0) {
          const keys = envVar.split("__").map(function(key, i) {
            if (i === 0) {
              key = key.substring(prefix.length);
            }
            return camelCase(key);
          });
          if ((configOnly && flags.configs[keys.join(".")] || !configOnly) && !hasKey(argv3, keys)) {
            setArg(keys.join("."), env2[envVar]);
          }
        }
      });
    }
    function applyCoercions(argv3) {
      let coerce;
      const applied = /* @__PURE__ */ new Set();
      Object.keys(argv3).forEach(function(key) {
        if (!applied.has(key)) {
          coerce = checkAllAliases(key, flags.coercions);
          if (typeof coerce === "function") {
            try {
              const value2 = maybeCoerceNumber(key, coerce(argv3[key]));
              [].concat(flags.aliases[key] || [], key).forEach((ali) => {
                applied.add(ali);
                argv3[ali] = value2;
              });
            } catch (err) {
              error = err;
            }
          }
        }
      });
    }
    function setPlaceholderKeys(argv3) {
      flags.keys.forEach((key) => {
        if (~key.indexOf("."))
          return;
        if (typeof argv3[key] === "undefined")
          argv3[key] = void 0;
      });
      return argv3;
    }
    function applyDefaultsAndAliases(obj, aliases2, defaults2, canLog = false) {
      Object.keys(defaults2).forEach(function(key) {
        if (!hasKey(obj, key.split("."))) {
          setKey(obj, key.split("."), defaults2[key]);
          if (canLog)
            defaulted[key] = true;
          (aliases2[key] || []).forEach(function(x) {
            if (hasKey(obj, x.split(".")))
              return;
            setKey(obj, x.split("."), defaults2[key]);
          });
        }
      });
    }
    function hasKey(obj, keys) {
      let o = obj;
      if (!configuration["dot-notation"])
        keys = [keys.join(".")];
      keys.slice(0, -1).forEach(function(key2) {
        o = o[key2] || {};
      });
      const key = keys[keys.length - 1];
      if (typeof o !== "object")
        return false;
      else
        return key in o;
    }
    function setKey(obj, keys, value2) {
      let o = obj;
      if (!configuration["dot-notation"])
        keys = [keys.join(".")];
      keys.slice(0, -1).forEach(function(key2) {
        key2 = sanitizeKey(key2);
        if (typeof o === "object" && o[key2] === void 0) {
          o[key2] = {};
        }
        if (typeof o[key2] !== "object" || Array.isArray(o[key2])) {
          if (Array.isArray(o[key2])) {
            o[key2].push({});
          } else {
            o[key2] = [o[key2], {}];
          }
          o = o[key2][o[key2].length - 1];
        } else {
          o = o[key2];
        }
      });
      const key = sanitizeKey(keys[keys.length - 1]);
      const isTypeArray = checkAllAliases(keys.join("."), flags.arrays);
      const isValueArray = Array.isArray(value2);
      let duplicate = configuration["duplicate-arguments-array"];
      if (!duplicate && checkAllAliases(key, flags.nargs)) {
        duplicate = true;
        if (!isUndefined(o[key]) && flags.nargs[key] === 1 || Array.isArray(o[key]) && o[key].length === flags.nargs[key]) {
          o[key] = void 0;
        }
      }
      if (value2 === increment()) {
        o[key] = increment(o[key]);
      } else if (Array.isArray(o[key])) {
        if (duplicate && isTypeArray && isValueArray) {
          o[key] = configuration["flatten-duplicate-arrays"] ? o[key].concat(value2) : (Array.isArray(o[key][0]) ? o[key] : [o[key]]).concat([value2]);
        } else if (!duplicate && Boolean(isTypeArray) === Boolean(isValueArray)) {
          o[key] = value2;
        } else {
          o[key] = o[key].concat([value2]);
        }
      } else if (o[key] === void 0 && isTypeArray) {
        o[key] = isValueArray ? value2 : [value2];
      } else if (duplicate && !(o[key] === void 0 || checkAllAliases(key, flags.counts) || checkAllAliases(key, flags.bools))) {
        o[key] = [o[key], value2];
      } else {
        o[key] = value2;
      }
    }
    function extendAliases(...args2) {
      args2.forEach(function(obj) {
        Object.keys(obj || {}).forEach(function(key) {
          if (flags.aliases[key])
            return;
          flags.aliases[key] = [].concat(aliases[key] || []);
          flags.aliases[key].concat(key).forEach(function(x) {
            if (/-/.test(x) && configuration["camel-case-expansion"]) {
              const c2 = camelCase(x);
              if (c2 !== key && flags.aliases[key].indexOf(c2) === -1) {
                flags.aliases[key].push(c2);
                newAliases[c2] = true;
              }
            }
          });
          flags.aliases[key].concat(key).forEach(function(x) {
            if (x.length > 1 && /[A-Z]/.test(x) && configuration["camel-case-expansion"]) {
              const c2 = decamelize(x, "-");
              if (c2 !== key && flags.aliases[key].indexOf(c2) === -1) {
                flags.aliases[key].push(c2);
                newAliases[c2] = true;
              }
            }
          });
          flags.aliases[key].forEach(function(x) {
            flags.aliases[x] = [key].concat(flags.aliases[key].filter(function(y) {
              return x !== y;
            }));
          });
        });
      });
    }
    function checkAllAliases(key, flag) {
      const toCheck = [].concat(flags.aliases[key] || [], key);
      const keys = Object.keys(flag);
      const setAlias = toCheck.find((key2) => keys.includes(key2));
      return setAlias ? flag[setAlias] : false;
    }
    function hasAnyFlag(key) {
      const flagsKeys = Object.keys(flags);
      const toCheck = [].concat(flagsKeys.map((k2) => flags[k2]));
      return toCheck.some(function(flag) {
        return Array.isArray(flag) ? flag.includes(key) : flag[key];
      });
    }
    function hasFlagsMatching(arg, ...patterns) {
      const toCheck = [].concat(...patterns);
      return toCheck.some(function(pattern) {
        const match = arg.match(pattern);
        return match && hasAnyFlag(match[1]);
      });
    }
    function hasAllShortFlags(arg) {
      if (arg.match(negative) || !arg.match(/^-[^-]+/)) {
        return false;
      }
      let hasAllFlags = true;
      let next;
      const letters = arg.slice(1).split("");
      for (let j = 0; j < letters.length; j++) {
        next = arg.slice(j + 2);
        if (!hasAnyFlag(letters[j])) {
          hasAllFlags = false;
          break;
        }
        if (letters[j + 1] && letters[j + 1] === "=" || next === "-" || /[A-Za-z]/.test(letters[j]) && /^-?\d+(\.\d*)?(e-?\d+)?$/.test(next) || letters[j + 1] && letters[j + 1].match(/\W/)) {
          break;
        }
      }
      return hasAllFlags;
    }
    function isUnknownOptionAsArg(arg) {
      return configuration["unknown-options-as-args"] && isUnknownOption(arg);
    }
    function isUnknownOption(arg) {
      arg = arg.replace(/^-{3,}/, "--");
      if (arg.match(negative)) {
        return false;
      }
      if (hasAllShortFlags(arg)) {
        return false;
      }
      const flagWithEquals = /^-+([^=]+?)=[\s\S]*$/;
      const normalFlag = /^-+([^=]+?)$/;
      const flagEndingInHyphen = /^-+([^=]+?)-$/;
      const flagEndingInDigits = /^-+([^=]+?\d+)$/;
      const flagEndingInNonWordCharacters = /^-+([^=]+?)\W+.*$/;
      return !hasFlagsMatching(arg, flagWithEquals, negatedBoolean, normalFlag, flagEndingInHyphen, flagEndingInDigits, flagEndingInNonWordCharacters);
    }
    function defaultValue(key) {
      if (!checkAllAliases(key, flags.bools) && !checkAllAliases(key, flags.counts) && `${key}` in defaults) {
        return defaults[key];
      } else {
        return defaultForType(guessType2(key));
      }
    }
    function defaultForType(type) {
      const def = {
        [DefaultValuesForTypeKey.BOOLEAN]: true,
        [DefaultValuesForTypeKey.STRING]: "",
        [DefaultValuesForTypeKey.NUMBER]: void 0,
        [DefaultValuesForTypeKey.ARRAY]: []
      };
      return def[type];
    }
    function guessType2(key) {
      let type = DefaultValuesForTypeKey.BOOLEAN;
      if (checkAllAliases(key, flags.strings))
        type = DefaultValuesForTypeKey.STRING;
      else if (checkAllAliases(key, flags.numbers))
        type = DefaultValuesForTypeKey.NUMBER;
      else if (checkAllAliases(key, flags.bools))
        type = DefaultValuesForTypeKey.BOOLEAN;
      else if (checkAllAliases(key, flags.arrays))
        type = DefaultValuesForTypeKey.ARRAY;
      return type;
    }
    function isUndefined(num) {
      return num === void 0;
    }
    function checkConfiguration() {
      Object.keys(flags.counts).find((key) => {
        if (checkAllAliases(key, flags.arrays)) {
          error = Error(__("Invalid configuration: %s, opts.count excludes opts.array.", key));
          return true;
        } else if (checkAllAliases(key, flags.nargs)) {
          error = Error(__("Invalid configuration: %s, opts.count excludes opts.narg.", key));
          return true;
        }
        return false;
      });
    }
    return {
      aliases: Object.assign({}, flags.aliases),
      argv: Object.assign(argvReturn, argv2),
      configuration,
      defaulted: Object.assign({}, defaulted),
      error,
      newAliases: Object.assign({}, newAliases)
    };
  }
};
function combineAliases(aliases) {
  const aliasArrays = [];
  const combined = /* @__PURE__ */ Object.create(null);
  let change = true;
  Object.keys(aliases).forEach(function(key) {
    aliasArrays.push([].concat(aliases[key], key));
  });
  while (change) {
    change = false;
    for (let i = 0; i < aliasArrays.length; i++) {
      for (let ii = i + 1; ii < aliasArrays.length; ii++) {
        const intersect = aliasArrays[i].filter(function(v2) {
          return aliasArrays[ii].indexOf(v2) !== -1;
        });
        if (intersect.length) {
          aliasArrays[i] = aliasArrays[i].concat(aliasArrays[ii]);
          aliasArrays.splice(ii, 1);
          change = true;
          break;
        }
      }
    }
  }
  aliasArrays.forEach(function(aliasArray) {
    aliasArray = aliasArray.filter(function(v2, i, self2) {
      return self2.indexOf(v2) === i;
    });
    const lastAlias = aliasArray.pop();
    if (lastAlias !== void 0 && typeof lastAlias === "string") {
      combined[lastAlias] = aliasArray;
    }
  });
  return combined;
}
function increment(orig) {
  return orig !== void 0 ? orig + 1 : 1;
}
function sanitizeKey(key) {
  if (key === "__proto__")
    return "___proto___";
  return key;
}
function stripQuotes(val) {
  return typeof val === "string" && (val[0] === "'" || val[0] === '"') && val[val.length - 1] === val[0] ? val.substring(1, val.length - 1) : val;
}

// node_modules/yargs-parser/build/lib/index.js
var import_fs2 = require("fs");
var _a;
var _b;
var _c;
var minNodeVersion = process && process.env && process.env.YARGS_MIN_NODE_VERSION ? Number(process.env.YARGS_MIN_NODE_VERSION) : 12;
var nodeVersion = (_b = (_a = process === null || process === void 0 ? void 0 : process.versions) === null || _a === void 0 ? void 0 : _a.node) !== null && _b !== void 0 ? _b : (_c = process === null || process === void 0 ? void 0 : process.version) === null || _c === void 0 ? void 0 : _c.slice(1);
if (nodeVersion) {
  const major = Number(nodeVersion.match(/^([^.]+)/)[1]);
  if (major < minNodeVersion) {
    throw Error(`yargs parser supports a minimum Node.js version of ${minNodeVersion}. Read our version support policy: https://github.com/yargs/yargs-parser#supported-nodejs-versions`);
  }
}
var env = process ? process.env : {};
var parser = new YargsParser({
  cwd: process.cwd,
  env: () => {
    return env;
  },
  format: import_util.format,
  normalize: import_path2.normalize,
  resolve: import_path2.resolve,
  // TODO: figure  out a  way to combine ESM and CJS coverage, such  that
  // we can exercise all the lines below:
  require: (path4) => {
    if (typeof require !== "undefined") {
      return require(path4);
    } else if (path4.match(/\.json$/)) {
      return JSON.parse((0, import_fs2.readFileSync)(path4, "utf8"));
    } else {
      throw Error("only .json config files are supported in ESM");
    }
  }
});
var yargsParser = function Parser(args, opts) {
  const result = parser.parse(args.slice(), opts);
  return result.argv;
};
yargsParser.detailed = function(args, opts) {
  return parser.parse(args.slice(), opts);
};
yargsParser.camelCase = camelCase;
yargsParser.decamelize = decamelize;
yargsParser.looksLikeNumber = looksLikeNumber;
var lib_default = yargsParser;

// node_modules/yargs/lib/platform-shims/esm.mjs
var import_path4 = require("path");

// node_modules/yargs/build/lib/utils/process-argv.js
function getProcessArgvBinIndex() {
  if (isBundledElectronApp())
    return 0;
  return 1;
}
function isBundledElectronApp() {
  return isElectronApp() && !process.defaultApp;
}
function isElectronApp() {
  return !!process.versions.electron;
}
function hideBin(argv2) {
  return argv2.slice(getProcessArgvBinIndex() + 1);
}
function getProcessArgvBin() {
  return process.argv[getProcessArgvBinIndex()];
}

// node_modules/yargs/build/lib/yerror.js
var YError = class _YError extends Error {
  constructor(msg) {
    super(msg || "yargs error");
    this.name = "YError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _YError);
    }
  }
};

// node_modules/y18n/build/lib/platform-shims/node.js
var import_fs3 = require("fs");
var import_util2 = require("util");
var import_path3 = require("path");
var node_default = {
  fs: {
    readFileSync: import_fs3.readFileSync,
    writeFile: import_fs3.writeFile
  },
  format: import_util2.format,
  resolve: import_path3.resolve,
  exists: (file) => {
    try {
      return (0, import_fs3.statSync)(file).isFile();
    } catch (err) {
      return false;
    }
  }
};

// node_modules/y18n/build/lib/index.js
var shim;
var Y18N = class {
  constructor(opts) {
    opts = opts || {};
    this.directory = opts.directory || "./locales";
    this.updateFiles = typeof opts.updateFiles === "boolean" ? opts.updateFiles : true;
    this.locale = opts.locale || "en";
    this.fallbackToLanguage = typeof opts.fallbackToLanguage === "boolean" ? opts.fallbackToLanguage : true;
    this.cache = /* @__PURE__ */ Object.create(null);
    this.writeQueue = [];
  }
  __(...args) {
    if (typeof arguments[0] !== "string") {
      return this._taggedLiteral(arguments[0], ...arguments);
    }
    const str = args.shift();
    let cb2 = function() {
    };
    if (typeof args[args.length - 1] === "function")
      cb2 = args.pop();
    cb2 = cb2 || function() {
    };
    if (!this.cache[this.locale])
      this._readLocaleFile();
    if (!this.cache[this.locale][str] && this.updateFiles) {
      this.cache[this.locale][str] = str;
      this._enqueueWrite({
        directory: this.directory,
        locale: this.locale,
        cb: cb2
      });
    } else {
      cb2();
    }
    return shim.format.apply(shim.format, [this.cache[this.locale][str] || str].concat(args));
  }
  __n() {
    const args = Array.prototype.slice.call(arguments);
    const singular = args.shift();
    const plural = args.shift();
    const quantity = args.shift();
    let cb2 = function() {
    };
    if (typeof args[args.length - 1] === "function")
      cb2 = args.pop();
    if (!this.cache[this.locale])
      this._readLocaleFile();
    let str = quantity === 1 ? singular : plural;
    if (this.cache[this.locale][singular]) {
      const entry = this.cache[this.locale][singular];
      str = entry[quantity === 1 ? "one" : "other"];
    }
    if (!this.cache[this.locale][singular] && this.updateFiles) {
      this.cache[this.locale][singular] = {
        one: singular,
        other: plural
      };
      this._enqueueWrite({
        directory: this.directory,
        locale: this.locale,
        cb: cb2
      });
    } else {
      cb2();
    }
    const values = [str];
    if (~str.indexOf("%d"))
      values.push(quantity);
    return shim.format.apply(shim.format, values.concat(args));
  }
  setLocale(locale) {
    this.locale = locale;
  }
  getLocale() {
    return this.locale;
  }
  updateLocale(obj) {
    if (!this.cache[this.locale])
      this._readLocaleFile();
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        this.cache[this.locale][key] = obj[key];
      }
    }
  }
  _taggedLiteral(parts, ...args) {
    let str = "";
    parts.forEach(function(part, i) {
      const arg = args[i + 1];
      str += part;
      if (typeof arg !== "undefined") {
        str += "%s";
      }
    });
    return this.__.apply(this, [str].concat([].slice.call(args, 1)));
  }
  _enqueueWrite(work) {
    this.writeQueue.push(work);
    if (this.writeQueue.length === 1)
      this._processWriteQueue();
  }
  _processWriteQueue() {
    const _this = this;
    const work = this.writeQueue[0];
    const directory = work.directory;
    const locale = work.locale;
    const cb2 = work.cb;
    const languageFile = this._resolveLocaleFile(directory, locale);
    const serializedLocale = JSON.stringify(this.cache[locale], null, 2);
    shim.fs.writeFile(languageFile, serializedLocale, "utf-8", function(err) {
      _this.writeQueue.shift();
      if (_this.writeQueue.length > 0)
        _this._processWriteQueue();
      cb2(err);
    });
  }
  _readLocaleFile() {
    let localeLookup = {};
    const languageFile = this._resolveLocaleFile(this.directory, this.locale);
    try {
      if (shim.fs.readFileSync) {
        localeLookup = JSON.parse(shim.fs.readFileSync(languageFile, "utf-8"));
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        err.message = "syntax error in " + languageFile;
      }
      if (err.code === "ENOENT")
        localeLookup = {};
      else
        throw err;
    }
    this.cache[this.locale] = localeLookup;
  }
  _resolveLocaleFile(directory, locale) {
    let file = shim.resolve(directory, "./", locale + ".json");
    if (this.fallbackToLanguage && !this._fileExistsSync(file) && ~locale.lastIndexOf("_")) {
      const languageFile = shim.resolve(directory, "./", locale.split("_")[0] + ".json");
      if (this._fileExistsSync(languageFile))
        file = languageFile;
    }
    return file;
  }
  _fileExistsSync(file) {
    return shim.exists(file);
  }
};
function y18n(opts, _shim) {
  shim = _shim;
  const y18n3 = new Y18N(opts);
  return {
    __: y18n3.__.bind(y18n3),
    __n: y18n3.__n.bind(y18n3),
    setLocale: y18n3.setLocale.bind(y18n3),
    getLocale: y18n3.getLocale.bind(y18n3),
    updateLocale: y18n3.updateLocale.bind(y18n3),
    locale: y18n3.locale
  };
}

// node_modules/y18n/index.mjs
var y18n2 = (opts) => {
  return y18n(opts, node_default);
};
var y18n_default = y18n2;

// node_modules/yargs/lib/platform-shims/esm.mjs
var import_meta = {};
var REQUIRE_ERROR = "require is not supported by ESM";
var REQUIRE_DIRECTORY_ERROR = "loading a directory of commands is not supported yet for ESM";
var __dirname;
try {
  __dirname = (0, import_url.fileURLToPath)(import_meta.url);
} catch (e2) {
  __dirname = process.cwd();
}
var mainFilename = __dirname.substring(0, __dirname.lastIndexOf("node_modules"));
var esm_default = {
  assert: {
    notStrictEqual: import_assert.notStrictEqual,
    strictEqual: import_assert.strictEqual
  },
  cliui: ui,
  findUp: sync_default,
  getEnv: (key) => {
    return process.env[key];
  },
  inspect: import_util3.inspect,
  getCallerFile: () => {
    throw new YError(REQUIRE_DIRECTORY_ERROR);
  },
  getProcessArgvBin,
  mainFilename: mainFilename || process.cwd(),
  Parser: lib_default,
  path: {
    basename: import_path4.basename,
    dirname: import_path4.dirname,
    extname: import_path4.extname,
    relative: import_path4.relative,
    resolve: import_path4.resolve
  },
  process: {
    argv: () => process.argv,
    cwd: process.cwd,
    emitWarning: (warning, type) => process.emitWarning(warning, type),
    execPath: () => process.execPath,
    exit: process.exit,
    nextTick: process.nextTick,
    stdColumns: typeof process.stdout.columns !== "undefined" ? process.stdout.columns : null
  },
  readFileSync: import_fs4.readFileSync,
  require: () => {
    throw new YError(REQUIRE_ERROR);
  },
  requireDirectory: () => {
    throw new YError(REQUIRE_DIRECTORY_ERROR);
  },
  stringWidth: (str) => {
    return [...str].length;
  },
  y18n: y18n_default({
    directory: (0, import_path4.resolve)(__dirname, "../../../locales"),
    updateFiles: false
  })
};

// node_modules/yargs/build/lib/typings/common-types.js
function assertNotStrictEqual(actual, expected, shim3, message) {
  shim3.assert.notStrictEqual(actual, expected, message);
}
function assertSingleKey(actual, shim3) {
  shim3.assert.strictEqual(typeof actual, "string");
}
function objectKeys(object) {
  return Object.keys(object);
}

// node_modules/yargs/build/lib/utils/is-promise.js
function isPromise(maybePromise) {
  return !!maybePromise && !!maybePromise.then && typeof maybePromise.then === "function";
}

// node_modules/yargs/build/lib/parse-command.js
function parseCommand(cmd) {
  const extraSpacesStrippedCommand = cmd.replace(/\s{2,}/g, " ");
  const splitCommand = extraSpacesStrippedCommand.split(/\s+(?![^[]*]|[^<]*>)/);
  const bregex = /\.*[\][<>]/g;
  const firstCommand = splitCommand.shift();
  if (!firstCommand)
    throw new Error(`No command found in: ${cmd}`);
  const parsedCommand = {
    cmd: firstCommand.replace(bregex, ""),
    demanded: [],
    optional: []
  };
  splitCommand.forEach((cmd2, i) => {
    let variadic = false;
    cmd2 = cmd2.replace(/\s/g, "");
    if (/\.+[\]>]/.test(cmd2) && i === splitCommand.length - 1)
      variadic = true;
    if (/^\[/.test(cmd2)) {
      parsedCommand.optional.push({
        cmd: cmd2.replace(bregex, "").split("|"),
        variadic
      });
    } else {
      parsedCommand.demanded.push({
        cmd: cmd2.replace(bregex, "").split("|"),
        variadic
      });
    }
  });
  return parsedCommand;
}

// node_modules/yargs/build/lib/argsert.js
var positionName = ["first", "second", "third", "fourth", "fifth", "sixth"];
function argsert(arg1, arg2, arg3) {
  function parseArgs() {
    return typeof arg1 === "object" ? [{ demanded: [], optional: [] }, arg1, arg2] : [
      parseCommand(`cmd ${arg1}`),
      arg2,
      arg3
    ];
  }
  try {
    let position = 0;
    const [parsed, callerArguments, _length] = parseArgs();
    const args = [].slice.call(callerArguments);
    while (args.length && args[args.length - 1] === void 0)
      args.pop();
    const length = _length || args.length;
    if (length < parsed.demanded.length) {
      throw new YError(`Not enough arguments provided. Expected ${parsed.demanded.length} but received ${args.length}.`);
    }
    const totalCommands = parsed.demanded.length + parsed.optional.length;
    if (length > totalCommands) {
      throw new YError(`Too many arguments provided. Expected max ${totalCommands} but received ${length}.`);
    }
    parsed.demanded.forEach((demanded) => {
      const arg = args.shift();
      const observedType = guessType(arg);
      const matchingTypes = demanded.cmd.filter((type) => type === observedType || type === "*");
      if (matchingTypes.length === 0)
        argumentTypeError(observedType, demanded.cmd, position);
      position += 1;
    });
    parsed.optional.forEach((optional) => {
      if (args.length === 0)
        return;
      const arg = args.shift();
      const observedType = guessType(arg);
      const matchingTypes = optional.cmd.filter((type) => type === observedType || type === "*");
      if (matchingTypes.length === 0)
        argumentTypeError(observedType, optional.cmd, position);
      position += 1;
    });
  } catch (err) {
    console.warn(err.stack);
  }
}
function guessType(arg) {
  if (Array.isArray(arg)) {
    return "array";
  } else if (arg === null) {
    return "null";
  }
  return typeof arg;
}
function argumentTypeError(observedType, allowedTypes, position) {
  throw new YError(`Invalid ${positionName[position] || "manyith"} argument. Expected ${allowedTypes.join(" or ")} but received ${observedType}.`);
}

// node_modules/yargs/build/lib/middleware.js
var GlobalMiddleware = class {
  constructor(yargs) {
    this.globalMiddleware = [];
    this.frozens = [];
    this.yargs = yargs;
  }
  addMiddleware(callback, applyBeforeValidation, global2 = true, mutates = false) {
    argsert("<array|function> [boolean] [boolean] [boolean]", [callback, applyBeforeValidation, global2], arguments.length);
    if (Array.isArray(callback)) {
      for (let i = 0; i < callback.length; i++) {
        if (typeof callback[i] !== "function") {
          throw Error("middleware must be a function");
        }
        const m2 = callback[i];
        m2.applyBeforeValidation = applyBeforeValidation;
        m2.global = global2;
      }
      Array.prototype.push.apply(this.globalMiddleware, callback);
    } else if (typeof callback === "function") {
      const m2 = callback;
      m2.applyBeforeValidation = applyBeforeValidation;
      m2.global = global2;
      m2.mutates = mutates;
      this.globalMiddleware.push(callback);
    }
    return this.yargs;
  }
  addCoerceMiddleware(callback, option) {
    const aliases = this.yargs.getAliases();
    this.globalMiddleware = this.globalMiddleware.filter((m2) => {
      const toCheck = [...aliases[option] || [], option];
      if (!m2.option)
        return true;
      else
        return !toCheck.includes(m2.option);
    });
    callback.option = option;
    return this.addMiddleware(callback, true, true, true);
  }
  getMiddleware() {
    return this.globalMiddleware;
  }
  freeze() {
    this.frozens.push([...this.globalMiddleware]);
  }
  unfreeze() {
    const frozen = this.frozens.pop();
    if (frozen !== void 0)
      this.globalMiddleware = frozen;
  }
  reset() {
    this.globalMiddleware = this.globalMiddleware.filter((m2) => m2.global);
  }
};
function commandMiddlewareFactory(commandMiddleware) {
  if (!commandMiddleware)
    return [];
  return commandMiddleware.map((middleware) => {
    middleware.applyBeforeValidation = false;
    return middleware;
  });
}
function applyMiddleware(argv2, yargs, middlewares, beforeValidation) {
  return middlewares.reduce((acc, middleware) => {
    if (middleware.applyBeforeValidation !== beforeValidation) {
      return acc;
    }
    if (middleware.mutates) {
      if (middleware.applied)
        return acc;
      middleware.applied = true;
    }
    if (isPromise(acc)) {
      return acc.then((initialObj) => Promise.all([initialObj, middleware(initialObj, yargs)])).then(([initialObj, middlewareObj]) => Object.assign(initialObj, middlewareObj));
    } else {
      const result = middleware(acc, yargs);
      return isPromise(result) ? result.then((middlewareObj) => Object.assign(acc, middlewareObj)) : Object.assign(acc, result);
    }
  }, argv2);
}

// node_modules/yargs/build/lib/utils/maybe-async-result.js
function maybeAsyncResult(getResult, resultHandler, errorHandler = (err) => {
  throw err;
}) {
  try {
    const result = isFunction(getResult) ? getResult() : getResult;
    return isPromise(result) ? result.then((result2) => resultHandler(result2)) : resultHandler(result);
  } catch (err) {
    return errorHandler(err);
  }
}
function isFunction(arg) {
  return typeof arg === "function";
}

// node_modules/yargs/build/lib/utils/which-module.js
function whichModule(exported) {
  if (typeof require === "undefined")
    return null;
  for (let i = 0, files = Object.keys(require.cache), mod; i < files.length; i++) {
    mod = require.cache[files[i]];
    if (mod.exports === exported)
      return mod;
  }
  return null;
}

// node_modules/yargs/build/lib/command.js
var DEFAULT_MARKER = /(^\*)|(^\$0)/;
var CommandInstance = class {
  constructor(usage2, validation2, globalMiddleware, shim3) {
    this.requireCache = /* @__PURE__ */ new Set();
    this.handlers = {};
    this.aliasMap = {};
    this.frozens = [];
    this.shim = shim3;
    this.usage = usage2;
    this.globalMiddleware = globalMiddleware;
    this.validation = validation2;
  }
  addDirectory(dir, req, callerFile, opts) {
    opts = opts || {};
    if (typeof opts.recurse !== "boolean")
      opts.recurse = false;
    if (!Array.isArray(opts.extensions))
      opts.extensions = ["js"];
    const parentVisit = typeof opts.visit === "function" ? opts.visit : (o) => o;
    opts.visit = (obj, joined, filename) => {
      const visited = parentVisit(obj, joined, filename);
      if (visited) {
        if (this.requireCache.has(joined))
          return visited;
        else
          this.requireCache.add(joined);
        this.addHandler(visited);
      }
      return visited;
    };
    this.shim.requireDirectory({ require: req, filename: callerFile }, dir, opts);
  }
  addHandler(cmd, description, builder, handler, commandMiddleware, deprecated) {
    let aliases = [];
    const middlewares = commandMiddlewareFactory(commandMiddleware);
    handler = handler || (() => {
    });
    if (Array.isArray(cmd)) {
      if (isCommandAndAliases(cmd)) {
        [cmd, ...aliases] = cmd;
      } else {
        for (const command2 of cmd) {
          this.addHandler(command2);
        }
      }
    } else if (isCommandHandlerDefinition(cmd)) {
      let command2 = Array.isArray(cmd.command) || typeof cmd.command === "string" ? cmd.command : this.moduleName(cmd);
      if (cmd.aliases)
        command2 = [].concat(command2).concat(cmd.aliases);
      this.addHandler(command2, this.extractDesc(cmd), cmd.builder, cmd.handler, cmd.middlewares, cmd.deprecated);
      return;
    } else if (isCommandBuilderDefinition(builder)) {
      this.addHandler([cmd].concat(aliases), description, builder.builder, builder.handler, builder.middlewares, builder.deprecated);
      return;
    }
    if (typeof cmd === "string") {
      const parsedCommand = parseCommand(cmd);
      aliases = aliases.map((alias) => parseCommand(alias).cmd);
      let isDefault = false;
      const parsedAliases = [parsedCommand.cmd].concat(aliases).filter((c2) => {
        if (DEFAULT_MARKER.test(c2)) {
          isDefault = true;
          return false;
        }
        return true;
      });
      if (parsedAliases.length === 0 && isDefault)
        parsedAliases.push("$0");
      if (isDefault) {
        parsedCommand.cmd = parsedAliases[0];
        aliases = parsedAliases.slice(1);
        cmd = cmd.replace(DEFAULT_MARKER, parsedCommand.cmd);
      }
      aliases.forEach((alias) => {
        this.aliasMap[alias] = parsedCommand.cmd;
      });
      if (description !== false) {
        this.usage.command(cmd, description, isDefault, aliases, deprecated);
      }
      this.handlers[parsedCommand.cmd] = {
        original: cmd,
        description,
        handler,
        builder: builder || {},
        middlewares,
        deprecated,
        demanded: parsedCommand.demanded,
        optional: parsedCommand.optional
      };
      if (isDefault)
        this.defaultCommand = this.handlers[parsedCommand.cmd];
    }
  }
  getCommandHandlers() {
    return this.handlers;
  }
  getCommands() {
    return Object.keys(this.handlers).concat(Object.keys(this.aliasMap));
  }
  hasDefaultCommand() {
    return !!this.defaultCommand;
  }
  runCommand(command2, yargs, parsed, commandIndex, helpOnly, helpOrVersionSet) {
    const commandHandler = this.handlers[command2] || this.handlers[this.aliasMap[command2]] || this.defaultCommand;
    const currentContext = yargs.getInternalMethods().getContext();
    const parentCommands = currentContext.commands.slice();
    const isDefaultCommand = !command2;
    if (command2) {
      currentContext.commands.push(command2);
      currentContext.fullCommands.push(commandHandler.original);
    }
    const builderResult = this.applyBuilderUpdateUsageAndParse(isDefaultCommand, commandHandler, yargs, parsed.aliases, parentCommands, commandIndex, helpOnly, helpOrVersionSet);
    return isPromise(builderResult) ? builderResult.then((result) => this.applyMiddlewareAndGetResult(isDefaultCommand, commandHandler, result.innerArgv, currentContext, helpOnly, result.aliases, yargs)) : this.applyMiddlewareAndGetResult(isDefaultCommand, commandHandler, builderResult.innerArgv, currentContext, helpOnly, builderResult.aliases, yargs);
  }
  applyBuilderUpdateUsageAndParse(isDefaultCommand, commandHandler, yargs, aliases, parentCommands, commandIndex, helpOnly, helpOrVersionSet) {
    const builder = commandHandler.builder;
    let innerYargs = yargs;
    if (isCommandBuilderCallback(builder)) {
      yargs.getInternalMethods().getUsageInstance().freeze();
      const builderOutput = builder(yargs.getInternalMethods().reset(aliases), helpOrVersionSet);
      if (isPromise(builderOutput)) {
        return builderOutput.then((output) => {
          innerYargs = isYargsInstance(output) ? output : yargs;
          return this.parseAndUpdateUsage(isDefaultCommand, commandHandler, innerYargs, parentCommands, commandIndex, helpOnly);
        });
      }
    } else if (isCommandBuilderOptionDefinitions(builder)) {
      yargs.getInternalMethods().getUsageInstance().freeze();
      innerYargs = yargs.getInternalMethods().reset(aliases);
      Object.keys(commandHandler.builder).forEach((key) => {
        innerYargs.option(key, builder[key]);
      });
    }
    return this.parseAndUpdateUsage(isDefaultCommand, commandHandler, innerYargs, parentCommands, commandIndex, helpOnly);
  }
  parseAndUpdateUsage(isDefaultCommand, commandHandler, innerYargs, parentCommands, commandIndex, helpOnly) {
    if (isDefaultCommand)
      innerYargs.getInternalMethods().getUsageInstance().unfreeze(true);
    if (this.shouldUpdateUsage(innerYargs)) {
      innerYargs.getInternalMethods().getUsageInstance().usage(this.usageFromParentCommandsCommandHandler(parentCommands, commandHandler), commandHandler.description);
    }
    const innerArgv = innerYargs.getInternalMethods().runYargsParserAndExecuteCommands(null, void 0, true, commandIndex, helpOnly);
    return isPromise(innerArgv) ? innerArgv.then((argv2) => ({
      aliases: innerYargs.parsed.aliases,
      innerArgv: argv2
    })) : {
      aliases: innerYargs.parsed.aliases,
      innerArgv
    };
  }
  shouldUpdateUsage(yargs) {
    return !yargs.getInternalMethods().getUsageInstance().getUsageDisabled() && yargs.getInternalMethods().getUsageInstance().getUsage().length === 0;
  }
  usageFromParentCommandsCommandHandler(parentCommands, commandHandler) {
    const c2 = DEFAULT_MARKER.test(commandHandler.original) ? commandHandler.original.replace(DEFAULT_MARKER, "").trim() : commandHandler.original;
    const pc2 = parentCommands.filter((c3) => {
      return !DEFAULT_MARKER.test(c3);
    });
    pc2.push(c2);
    return `$0 ${pc2.join(" ")}`;
  }
  handleValidationAndGetResult(isDefaultCommand, commandHandler, innerArgv, currentContext, aliases, yargs, middlewares, positionalMap) {
    if (!yargs.getInternalMethods().getHasOutput()) {
      const validation2 = yargs.getInternalMethods().runValidation(aliases, positionalMap, yargs.parsed.error, isDefaultCommand);
      innerArgv = maybeAsyncResult(innerArgv, (result) => {
        validation2(result);
        return result;
      });
    }
    if (commandHandler.handler && !yargs.getInternalMethods().getHasOutput()) {
      yargs.getInternalMethods().setHasOutput();
      const populateDoubleDash = !!yargs.getOptions().configuration["populate--"];
      yargs.getInternalMethods().postProcess(innerArgv, populateDoubleDash, false, false);
      innerArgv = applyMiddleware(innerArgv, yargs, middlewares, false);
      innerArgv = maybeAsyncResult(innerArgv, (result) => {
        const handlerResult = commandHandler.handler(result);
        return isPromise(handlerResult) ? handlerResult.then(() => result) : result;
      });
      if (!isDefaultCommand) {
        yargs.getInternalMethods().getUsageInstance().cacheHelpMessage();
      }
      if (isPromise(innerArgv) && !yargs.getInternalMethods().hasParseCallback()) {
        innerArgv.catch((error) => {
          try {
            yargs.getInternalMethods().getUsageInstance().fail(null, error);
          } catch (_err) {
          }
        });
      }
    }
    if (!isDefaultCommand) {
      currentContext.commands.pop();
      currentContext.fullCommands.pop();
    }
    return innerArgv;
  }
  applyMiddlewareAndGetResult(isDefaultCommand, commandHandler, innerArgv, currentContext, helpOnly, aliases, yargs) {
    let positionalMap = {};
    if (helpOnly)
      return innerArgv;
    if (!yargs.getInternalMethods().getHasOutput()) {
      positionalMap = this.populatePositionals(commandHandler, innerArgv, currentContext, yargs);
    }
    const middlewares = this.globalMiddleware.getMiddleware().slice(0).concat(commandHandler.middlewares);
    const maybePromiseArgv = applyMiddleware(innerArgv, yargs, middlewares, true);
    return isPromise(maybePromiseArgv) ? maybePromiseArgv.then((resolvedInnerArgv) => this.handleValidationAndGetResult(isDefaultCommand, commandHandler, resolvedInnerArgv, currentContext, aliases, yargs, middlewares, positionalMap)) : this.handleValidationAndGetResult(isDefaultCommand, commandHandler, maybePromiseArgv, currentContext, aliases, yargs, middlewares, positionalMap);
  }
  populatePositionals(commandHandler, argv2, context, yargs) {
    argv2._ = argv2._.slice(context.commands.length);
    const demanded = commandHandler.demanded.slice(0);
    const optional = commandHandler.optional.slice(0);
    const positionalMap = {};
    this.validation.positionalCount(demanded.length, argv2._.length);
    while (demanded.length) {
      const demand = demanded.shift();
      this.populatePositional(demand, argv2, positionalMap);
    }
    while (optional.length) {
      const maybe = optional.shift();
      this.populatePositional(maybe, argv2, positionalMap);
    }
    argv2._ = context.commands.concat(argv2._.map((a2) => "" + a2));
    this.postProcessPositionals(argv2, positionalMap, this.cmdToParseOptions(commandHandler.original), yargs);
    return positionalMap;
  }
  populatePositional(positional, argv2, positionalMap) {
    const cmd = positional.cmd[0];
    if (positional.variadic) {
      positionalMap[cmd] = argv2._.splice(0).map(String);
    } else {
      if (argv2._.length)
        positionalMap[cmd] = [String(argv2._.shift())];
    }
  }
  cmdToParseOptions(cmdString) {
    const parseOptions = {
      array: [],
      default: {},
      alias: {},
      demand: {}
    };
    const parsed = parseCommand(cmdString);
    parsed.demanded.forEach((d2) => {
      const [cmd, ...aliases] = d2.cmd;
      if (d2.variadic) {
        parseOptions.array.push(cmd);
        parseOptions.default[cmd] = [];
      }
      parseOptions.alias[cmd] = aliases;
      parseOptions.demand[cmd] = true;
    });
    parsed.optional.forEach((o) => {
      const [cmd, ...aliases] = o.cmd;
      if (o.variadic) {
        parseOptions.array.push(cmd);
        parseOptions.default[cmd] = [];
      }
      parseOptions.alias[cmd] = aliases;
    });
    return parseOptions;
  }
  postProcessPositionals(argv2, positionalMap, parseOptions, yargs) {
    const options = Object.assign({}, yargs.getOptions());
    options.default = Object.assign(parseOptions.default, options.default);
    for (const key of Object.keys(parseOptions.alias)) {
      options.alias[key] = (options.alias[key] || []).concat(parseOptions.alias[key]);
    }
    options.array = options.array.concat(parseOptions.array);
    options.config = {};
    const unparsed = [];
    Object.keys(positionalMap).forEach((key) => {
      positionalMap[key].map((value2) => {
        if (options.configuration["unknown-options-as-args"])
          options.key[key] = true;
        unparsed.push(`--${key}`);
        unparsed.push(value2);
      });
    });
    if (!unparsed.length)
      return;
    const config = Object.assign({}, options.configuration, {
      "populate--": false
    });
    const parsed = this.shim.Parser.detailed(unparsed, Object.assign({}, options, {
      configuration: config
    }));
    if (parsed.error) {
      yargs.getInternalMethods().getUsageInstance().fail(parsed.error.message, parsed.error);
    } else {
      const positionalKeys = Object.keys(positionalMap);
      Object.keys(positionalMap).forEach((key) => {
        positionalKeys.push(...parsed.aliases[key]);
      });
      Object.keys(parsed.argv).forEach((key) => {
        if (positionalKeys.includes(key)) {
          if (!positionalMap[key])
            positionalMap[key] = parsed.argv[key];
          if (!this.isInConfigs(yargs, key) && !this.isDefaulted(yargs, key) && Object.prototype.hasOwnProperty.call(argv2, key) && Object.prototype.hasOwnProperty.call(parsed.argv, key) && (Array.isArray(argv2[key]) || Array.isArray(parsed.argv[key]))) {
            argv2[key] = [].concat(argv2[key], parsed.argv[key]);
          } else {
            argv2[key] = parsed.argv[key];
          }
        }
      });
    }
  }
  isDefaulted(yargs, key) {
    const { default: defaults } = yargs.getOptions();
    return Object.prototype.hasOwnProperty.call(defaults, key) || Object.prototype.hasOwnProperty.call(defaults, this.shim.Parser.camelCase(key));
  }
  isInConfigs(yargs, key) {
    const { configObjects } = yargs.getOptions();
    return configObjects.some((c2) => Object.prototype.hasOwnProperty.call(c2, key)) || configObjects.some((c2) => Object.prototype.hasOwnProperty.call(c2, this.shim.Parser.camelCase(key)));
  }
  runDefaultBuilderOn(yargs) {
    if (!this.defaultCommand)
      return;
    if (this.shouldUpdateUsage(yargs)) {
      const commandString = DEFAULT_MARKER.test(this.defaultCommand.original) ? this.defaultCommand.original : this.defaultCommand.original.replace(/^[^[\]<>]*/, "$0 ");
      yargs.getInternalMethods().getUsageInstance().usage(commandString, this.defaultCommand.description);
    }
    const builder = this.defaultCommand.builder;
    if (isCommandBuilderCallback(builder)) {
      return builder(yargs, true);
    } else if (!isCommandBuilderDefinition(builder)) {
      Object.keys(builder).forEach((key) => {
        yargs.option(key, builder[key]);
      });
    }
    return void 0;
  }
  moduleName(obj) {
    const mod = whichModule(obj);
    if (!mod)
      throw new Error(`No command name given for module: ${this.shim.inspect(obj)}`);
    return this.commandFromFilename(mod.filename);
  }
  commandFromFilename(filename) {
    return this.shim.path.basename(filename, this.shim.path.extname(filename));
  }
  extractDesc({ describe, description, desc }) {
    for (const test of [describe, description, desc]) {
      if (typeof test === "string" || test === false)
        return test;
      assertNotStrictEqual(test, true, this.shim);
    }
    return false;
  }
  freeze() {
    this.frozens.push({
      handlers: this.handlers,
      aliasMap: this.aliasMap,
      defaultCommand: this.defaultCommand
    });
  }
  unfreeze() {
    const frozen = this.frozens.pop();
    assertNotStrictEqual(frozen, void 0, this.shim);
    ({
      handlers: this.handlers,
      aliasMap: this.aliasMap,
      defaultCommand: this.defaultCommand
    } = frozen);
  }
  reset() {
    this.handlers = {};
    this.aliasMap = {};
    this.defaultCommand = void 0;
    this.requireCache = /* @__PURE__ */ new Set();
    return this;
  }
};
function command(usage2, validation2, globalMiddleware, shim3) {
  return new CommandInstance(usage2, validation2, globalMiddleware, shim3);
}
function isCommandBuilderDefinition(builder) {
  return typeof builder === "object" && !!builder.builder && typeof builder.handler === "function";
}
function isCommandAndAliases(cmd) {
  return cmd.every((c2) => typeof c2 === "string");
}
function isCommandBuilderCallback(builder) {
  return typeof builder === "function";
}
function isCommandBuilderOptionDefinitions(builder) {
  return typeof builder === "object";
}
function isCommandHandlerDefinition(cmd) {
  return typeof cmd === "object" && !Array.isArray(cmd);
}

// node_modules/yargs/build/lib/utils/obj-filter.js
function objFilter(original = {}, filter = () => true) {
  const obj = {};
  objectKeys(original).forEach((key) => {
    if (filter(key, original[key])) {
      obj[key] = original[key];
    }
  });
  return obj;
}

// node_modules/yargs/build/lib/utils/set-blocking.js
function setBlocking(blocking) {
  if (typeof process === "undefined")
    return;
  [process.stdout, process.stderr].forEach((_stream) => {
    const stream = _stream;
    if (stream._handle && stream.isTTY && typeof stream._handle.setBlocking === "function") {
      stream._handle.setBlocking(blocking);
    }
  });
}

// node_modules/yargs/build/lib/usage.js
function isBoolean(fail) {
  return typeof fail === "boolean";
}
function usage(yargs, shim3) {
  const __ = shim3.y18n.__;
  const self2 = {};
  const fails = [];
  self2.failFn = function failFn(f2) {
    fails.push(f2);
  };
  let failMessage = null;
  let globalFailMessage = null;
  let showHelpOnFail = true;
  self2.showHelpOnFail = function showHelpOnFailFn(arg1 = true, arg2) {
    const [enabled, message] = typeof arg1 === "string" ? [true, arg1] : [arg1, arg2];
    if (yargs.getInternalMethods().isGlobalContext()) {
      globalFailMessage = message;
    }
    failMessage = message;
    showHelpOnFail = enabled;
    return self2;
  };
  let failureOutput = false;
  self2.fail = function fail(msg, err) {
    const logger = yargs.getInternalMethods().getLoggerInstance();
    if (fails.length) {
      for (let i = fails.length - 1; i >= 0; --i) {
        const fail2 = fails[i];
        if (isBoolean(fail2)) {
          if (err)
            throw err;
          else if (msg)
            throw Error(msg);
        } else {
          fail2(msg, err, self2);
        }
      }
    } else {
      if (yargs.getExitProcess())
        setBlocking(true);
      if (!failureOutput) {
        failureOutput = true;
        if (showHelpOnFail) {
          yargs.showHelp("error");
          logger.error();
        }
        if (msg || err)
          logger.error(msg || err);
        const globalOrCommandFailMessage = failMessage || globalFailMessage;
        if (globalOrCommandFailMessage) {
          if (msg || err)
            logger.error("");
          logger.error(globalOrCommandFailMessage);
        }
      }
      err = err || new YError(msg);
      if (yargs.getExitProcess()) {
        return yargs.exit(1);
      } else if (yargs.getInternalMethods().hasParseCallback()) {
        return yargs.exit(1, err);
      } else {
        throw err;
      }
    }
  };
  let usages = [];
  let usageDisabled = false;
  self2.usage = (msg, description) => {
    if (msg === null) {
      usageDisabled = true;
      usages = [];
      return self2;
    }
    usageDisabled = false;
    usages.push([msg, description || ""]);
    return self2;
  };
  self2.getUsage = () => {
    return usages;
  };
  self2.getUsageDisabled = () => {
    return usageDisabled;
  };
  self2.getPositionalGroupName = () => {
    return __("Positionals:");
  };
  let examples = [];
  self2.example = (cmd, description) => {
    examples.push([cmd, description || ""]);
  };
  let commands = [];
  self2.command = function command2(cmd, description, isDefault, aliases, deprecated = false) {
    if (isDefault) {
      commands = commands.map((cmdArray) => {
        cmdArray[2] = false;
        return cmdArray;
      });
    }
    commands.push([cmd, description || "", isDefault, aliases, deprecated]);
  };
  self2.getCommands = () => commands;
  let descriptions = {};
  self2.describe = function describe(keyOrKeys, desc) {
    if (Array.isArray(keyOrKeys)) {
      keyOrKeys.forEach((k2) => {
        self2.describe(k2, desc);
      });
    } else if (typeof keyOrKeys === "object") {
      Object.keys(keyOrKeys).forEach((k2) => {
        self2.describe(k2, keyOrKeys[k2]);
      });
    } else {
      descriptions[keyOrKeys] = desc;
    }
  };
  self2.getDescriptions = () => descriptions;
  let epilogs = [];
  self2.epilog = (msg) => {
    epilogs.push(msg);
  };
  let wrapSet = false;
  let wrap2;
  self2.wrap = (cols) => {
    wrapSet = true;
    wrap2 = cols;
  };
  self2.getWrap = () => {
    if (shim3.getEnv("YARGS_DISABLE_WRAP")) {
      return null;
    }
    if (!wrapSet) {
      wrap2 = windowWidth();
      wrapSet = true;
    }
    return wrap2;
  };
  const deferY18nLookupPrefix = "__yargsString__:";
  self2.deferY18nLookup = (str) => deferY18nLookupPrefix + str;
  self2.help = function help() {
    if (cachedHelpMessage)
      return cachedHelpMessage;
    normalizeAliases();
    const base$0 = yargs.customScriptName ? yargs.$0 : shim3.path.basename(yargs.$0);
    const demandedOptions = yargs.getDemandedOptions();
    const demandedCommands = yargs.getDemandedCommands();
    const deprecatedOptions = yargs.getDeprecatedOptions();
    const groups = yargs.getGroups();
    const options = yargs.getOptions();
    let keys = [];
    keys = keys.concat(Object.keys(descriptions));
    keys = keys.concat(Object.keys(demandedOptions));
    keys = keys.concat(Object.keys(demandedCommands));
    keys = keys.concat(Object.keys(options.default));
    keys = keys.filter(filterHiddenOptions);
    keys = Object.keys(keys.reduce((acc, key) => {
      if (key !== "_")
        acc[key] = true;
      return acc;
    }, {}));
    const theWrap = self2.getWrap();
    const ui2 = shim3.cliui({
      width: theWrap,
      wrap: !!theWrap
    });
    if (!usageDisabled) {
      if (usages.length) {
        usages.forEach((usage2) => {
          ui2.div({ text: `${usage2[0].replace(/\$0/g, base$0)}` });
          if (usage2[1]) {
            ui2.div({ text: `${usage2[1]}`, padding: [1, 0, 0, 0] });
          }
        });
        ui2.div();
      } else if (commands.length) {
        let u2 = null;
        if (demandedCommands._) {
          u2 = `${base$0} <${__("command")}>
`;
        } else {
          u2 = `${base$0} [${__("command")}]
`;
        }
        ui2.div(`${u2}`);
      }
    }
    if (commands.length > 1 || commands.length === 1 && !commands[0][2]) {
      ui2.div(__("Commands:"));
      const context = yargs.getInternalMethods().getContext();
      const parentCommands = context.commands.length ? `${context.commands.join(" ")} ` : "";
      if (yargs.getInternalMethods().getParserConfiguration()["sort-commands"] === true) {
        commands = commands.sort((a2, b2) => a2[0].localeCompare(b2[0]));
      }
      const prefix = base$0 ? `${base$0} ` : "";
      commands.forEach((command2) => {
        const commandString = `${prefix}${parentCommands}${command2[0].replace(/^\$0 ?/, "")}`;
        ui2.span({
          text: commandString,
          padding: [0, 2, 0, 2],
          width: maxWidth(commands, theWrap, `${base$0}${parentCommands}`) + 4
        }, { text: command2[1] });
        const hints = [];
        if (command2[2])
          hints.push(`[${__("default")}]`);
        if (command2[3] && command2[3].length) {
          hints.push(`[${__("aliases:")} ${command2[3].join(", ")}]`);
        }
        if (command2[4]) {
          if (typeof command2[4] === "string") {
            hints.push(`[${__("deprecated: %s", command2[4])}]`);
          } else {
            hints.push(`[${__("deprecated")}]`);
          }
        }
        if (hints.length) {
          ui2.div({
            text: hints.join(" "),
            padding: [0, 0, 0, 2],
            align: "right"
          });
        } else {
          ui2.div();
        }
      });
      ui2.div();
    }
    const aliasKeys = (Object.keys(options.alias) || []).concat(Object.keys(yargs.parsed.newAliases) || []);
    keys = keys.filter((key) => !yargs.parsed.newAliases[key] && aliasKeys.every((alias) => (options.alias[alias] || []).indexOf(key) === -1));
    const defaultGroup = __("Options:");
    if (!groups[defaultGroup])
      groups[defaultGroup] = [];
    addUngroupedKeys(keys, options.alias, groups, defaultGroup);
    const isLongSwitch = (sw) => /^--/.test(getText(sw));
    const displayedGroups = Object.keys(groups).filter((groupName) => groups[groupName].length > 0).map((groupName) => {
      const normalizedKeys = groups[groupName].filter(filterHiddenOptions).map((key) => {
        if (aliasKeys.includes(key))
          return key;
        for (let i = 0, aliasKey; (aliasKey = aliasKeys[i]) !== void 0; i++) {
          if ((options.alias[aliasKey] || []).includes(key))
            return aliasKey;
        }
        return key;
      });
      return { groupName, normalizedKeys };
    }).filter(({ normalizedKeys }) => normalizedKeys.length > 0).map(({ groupName, normalizedKeys }) => {
      const switches = normalizedKeys.reduce((acc, key) => {
        acc[key] = [key].concat(options.alias[key] || []).map((sw) => {
          if (groupName === self2.getPositionalGroupName())
            return sw;
          else {
            return (/^[0-9]$/.test(sw) ? options.boolean.includes(key) ? "-" : "--" : sw.length > 1 ? "--" : "-") + sw;
          }
        }).sort((sw1, sw2) => isLongSwitch(sw1) === isLongSwitch(sw2) ? 0 : isLongSwitch(sw1) ? 1 : -1).join(", ");
        return acc;
      }, {});
      return { groupName, normalizedKeys, switches };
    });
    const shortSwitchesUsed = displayedGroups.filter(({ groupName }) => groupName !== self2.getPositionalGroupName()).some(({ normalizedKeys, switches }) => !normalizedKeys.every((key) => isLongSwitch(switches[key])));
    if (shortSwitchesUsed) {
      displayedGroups.filter(({ groupName }) => groupName !== self2.getPositionalGroupName()).forEach(({ normalizedKeys, switches }) => {
        normalizedKeys.forEach((key) => {
          if (isLongSwitch(switches[key])) {
            switches[key] = addIndentation(switches[key], "-x, ".length);
          }
        });
      });
    }
    displayedGroups.forEach(({ groupName, normalizedKeys, switches }) => {
      ui2.div(groupName);
      normalizedKeys.forEach((key) => {
        const kswitch = switches[key];
        let desc = descriptions[key] || "";
        let type = null;
        if (desc.includes(deferY18nLookupPrefix))
          desc = __(desc.substring(deferY18nLookupPrefix.length));
        if (options.boolean.includes(key))
          type = `[${__("boolean")}]`;
        if (options.count.includes(key))
          type = `[${__("count")}]`;
        if (options.string.includes(key))
          type = `[${__("string")}]`;
        if (options.normalize.includes(key))
          type = `[${__("string")}]`;
        if (options.array.includes(key))
          type = `[${__("array")}]`;
        if (options.number.includes(key))
          type = `[${__("number")}]`;
        const deprecatedExtra = (deprecated) => typeof deprecated === "string" ? `[${__("deprecated: %s", deprecated)}]` : `[${__("deprecated")}]`;
        const extra = [
          key in deprecatedOptions ? deprecatedExtra(deprecatedOptions[key]) : null,
          type,
          key in demandedOptions ? `[${__("required")}]` : null,
          options.choices && options.choices[key] ? `[${__("choices:")} ${self2.stringifiedValues(options.choices[key])}]` : null,
          defaultString(options.default[key], options.defaultDescription[key])
        ].filter(Boolean).join(" ");
        ui2.span({
          text: getText(kswitch),
          padding: [0, 2, 0, 2 + getIndentation(kswitch)],
          width: maxWidth(switches, theWrap) + 4
        }, desc);
        const shouldHideOptionExtras = yargs.getInternalMethods().getUsageConfiguration()["hide-types"] === true;
        if (extra && !shouldHideOptionExtras)
          ui2.div({ text: extra, padding: [0, 0, 0, 2], align: "right" });
        else
          ui2.div();
      });
      ui2.div();
    });
    if (examples.length) {
      ui2.div(__("Examples:"));
      examples.forEach((example) => {
        example[0] = example[0].replace(/\$0/g, base$0);
      });
      examples.forEach((example) => {
        if (example[1] === "") {
          ui2.div({
            text: example[0],
            padding: [0, 2, 0, 2]
          });
        } else {
          ui2.div({
            text: example[0],
            padding: [0, 2, 0, 2],
            width: maxWidth(examples, theWrap) + 4
          }, {
            text: example[1]
          });
        }
      });
      ui2.div();
    }
    if (epilogs.length > 0) {
      const e2 = epilogs.map((epilog) => epilog.replace(/\$0/g, base$0)).join("\n");
      ui2.div(`${e2}
`);
    }
    return ui2.toString().replace(/\s*$/, "");
  };
  function maxWidth(table, theWrap, modifier) {
    let width = 0;
    if (!Array.isArray(table)) {
      table = Object.values(table).map((v2) => [v2]);
    }
    table.forEach((v2) => {
      width = Math.max(shim3.stringWidth(modifier ? `${modifier} ${getText(v2[0])}` : getText(v2[0])) + getIndentation(v2[0]), width);
    });
    if (theWrap)
      width = Math.min(width, parseInt((theWrap * 0.5).toString(), 10));
    return width;
  }
  function normalizeAliases() {
    const demandedOptions = yargs.getDemandedOptions();
    const options = yargs.getOptions();
    (Object.keys(options.alias) || []).forEach((key) => {
      options.alias[key].forEach((alias) => {
        if (descriptions[alias])
          self2.describe(key, descriptions[alias]);
        if (alias in demandedOptions)
          yargs.demandOption(key, demandedOptions[alias]);
        if (options.boolean.includes(alias))
          yargs.boolean(key);
        if (options.count.includes(alias))
          yargs.count(key);
        if (options.string.includes(alias))
          yargs.string(key);
        if (options.normalize.includes(alias))
          yargs.normalize(key);
        if (options.array.includes(alias))
          yargs.array(key);
        if (options.number.includes(alias))
          yargs.number(key);
      });
    });
  }
  let cachedHelpMessage;
  self2.cacheHelpMessage = function() {
    cachedHelpMessage = this.help();
  };
  self2.clearCachedHelpMessage = function() {
    cachedHelpMessage = void 0;
  };
  self2.hasCachedHelpMessage = function() {
    return !!cachedHelpMessage;
  };
  function addUngroupedKeys(keys, aliases, groups, defaultGroup) {
    let groupedKeys = [];
    let toCheck = null;
    Object.keys(groups).forEach((group) => {
      groupedKeys = groupedKeys.concat(groups[group]);
    });
    keys.forEach((key) => {
      toCheck = [key].concat(aliases[key]);
      if (!toCheck.some((k2) => groupedKeys.indexOf(k2) !== -1)) {
        groups[defaultGroup].push(key);
      }
    });
    return groupedKeys;
  }
  function filterHiddenOptions(key) {
    return yargs.getOptions().hiddenOptions.indexOf(key) < 0 || yargs.parsed.argv[yargs.getOptions().showHiddenOpt];
  }
  self2.showHelp = (level) => {
    const logger = yargs.getInternalMethods().getLoggerInstance();
    if (!level)
      level = "error";
    const emit2 = typeof level === "function" ? level : logger[level];
    emit2(self2.help());
  };
  self2.functionDescription = (fn) => {
    const description = fn.name ? shim3.Parser.decamelize(fn.name, "-") : __("generated-value");
    return ["(", description, ")"].join("");
  };
  self2.stringifiedValues = function stringifiedValues(values, separator) {
    let string = "";
    const sep = separator || ", ";
    const array = [].concat(values);
    if (!values || !array.length)
      return string;
    array.forEach((value2) => {
      if (string.length)
        string += sep;
      string += JSON.stringify(value2);
    });
    return string;
  };
  function defaultString(value2, defaultDescription) {
    let string = `[${__("default:")} `;
    if (value2 === void 0 && !defaultDescription)
      return null;
    if (defaultDescription) {
      string += defaultDescription;
    } else {
      switch (typeof value2) {
        case "string":
          string += `"${value2}"`;
          break;
        case "object":
          string += JSON.stringify(value2);
          break;
        default:
          string += value2;
      }
    }
    return `${string}]`;
  }
  function windowWidth() {
    const maxWidth2 = 80;
    if (shim3.process.stdColumns) {
      return Math.min(maxWidth2, shim3.process.stdColumns);
    } else {
      return maxWidth2;
    }
  }
  let version = null;
  self2.version = (ver) => {
    version = ver;
  };
  self2.showVersion = (level) => {
    const logger = yargs.getInternalMethods().getLoggerInstance();
    if (!level)
      level = "error";
    const emit2 = typeof level === "function" ? level : logger[level];
    emit2(version);
  };
  self2.reset = function reset(localLookup) {
    failMessage = null;
    failureOutput = false;
    usages = [];
    usageDisabled = false;
    epilogs = [];
    examples = [];
    commands = [];
    descriptions = objFilter(descriptions, (k2) => !localLookup[k2]);
    return self2;
  };
  const frozens = [];
  self2.freeze = function freeze() {
    frozens.push({
      failMessage,
      failureOutput,
      usages,
      usageDisabled,
      epilogs,
      examples,
      commands,
      descriptions
    });
  };
  self2.unfreeze = function unfreeze(defaultCommand = false) {
    const frozen = frozens.pop();
    if (!frozen)
      return;
    if (defaultCommand) {
      descriptions = { ...frozen.descriptions, ...descriptions };
      commands = [...frozen.commands, ...commands];
      usages = [...frozen.usages, ...usages];
      examples = [...frozen.examples, ...examples];
      epilogs = [...frozen.epilogs, ...epilogs];
    } else {
      ({
        failMessage,
        failureOutput,
        usages,
        usageDisabled,
        epilogs,
        examples,
        commands,
        descriptions
      } = frozen);
    }
  };
  return self2;
}
function isIndentedText(text) {
  return typeof text === "object";
}
function addIndentation(text, indent) {
  return isIndentedText(text) ? { text: text.text, indentation: text.indentation + indent } : { text, indentation: indent };
}
function getIndentation(text) {
  return isIndentedText(text) ? text.indentation : 0;
}
function getText(text) {
  return isIndentedText(text) ? text.text : text;
}

// node_modules/yargs/build/lib/completion-templates.js
var completionShTemplate = `###-begin-{{app_name}}-completions-###
#
# yargs command completion script
#
# Installation: {{app_path}} {{completion_command}} >> ~/.bashrc
#    or {{app_path}} {{completion_command}} >> ~/.bash_profile on OSX.
#
_{{app_name}}_yargs_completions()
{
    local cur_word args type_list

    cur_word="\${COMP_WORDS[COMP_CWORD]}"
    args=("\${COMP_WORDS[@]}")

    # ask yargs to generate completions.
    type_list=$({{app_path}} --get-yargs-completions "\${args[@]}")

    COMPREPLY=( $(compgen -W "\${type_list}" -- \${cur_word}) )

    # if no match was found, fall back to filename completion
    if [ \${#COMPREPLY[@]} -eq 0 ]; then
      COMPREPLY=()
    fi

    return 0
}
complete -o bashdefault -o default -F _{{app_name}}_yargs_completions {{app_name}}
###-end-{{app_name}}-completions-###
`;
var completionZshTemplate = `#compdef {{app_name}}
###-begin-{{app_name}}-completions-###
#
# yargs command completion script
#
# Installation: {{app_path}} {{completion_command}} >> ~/.zshrc
#    or {{app_path}} {{completion_command}} >> ~/.zprofile on OSX.
#
_{{app_name}}_yargs_completions()
{
  local reply
  local si=$IFS
  IFS=$'
' reply=($(COMP_CWORD="$((CURRENT-1))" COMP_LINE="$BUFFER" COMP_POINT="$CURSOR" {{app_path}} --get-yargs-completions "\${words[@]}"))
  IFS=$si
  _describe 'values' reply
}
compdef _{{app_name}}_yargs_completions {{app_name}}
###-end-{{app_name}}-completions-###
`;

// node_modules/yargs/build/lib/completion.js
var Completion = class {
  constructor(yargs, usage2, command2, shim3) {
    var _a2, _b2, _c2;
    this.yargs = yargs;
    this.usage = usage2;
    this.command = command2;
    this.shim = shim3;
    this.completionKey = "get-yargs-completions";
    this.aliases = null;
    this.customCompletionFunction = null;
    this.indexAfterLastReset = 0;
    this.zshShell = (_c2 = ((_a2 = this.shim.getEnv("SHELL")) === null || _a2 === void 0 ? void 0 : _a2.includes("zsh")) || ((_b2 = this.shim.getEnv("ZSH_NAME")) === null || _b2 === void 0 ? void 0 : _b2.includes("zsh"))) !== null && _c2 !== void 0 ? _c2 : false;
  }
  defaultCompletion(args, argv2, current, done) {
    const handlers = this.command.getCommandHandlers();
    for (let i = 0, ii = args.length; i < ii; ++i) {
      if (handlers[args[i]] && handlers[args[i]].builder) {
        const builder = handlers[args[i]].builder;
        if (isCommandBuilderCallback(builder)) {
          this.indexAfterLastReset = i + 1;
          const y = this.yargs.getInternalMethods().reset();
          builder(y, true);
          return y.argv;
        }
      }
    }
    const completions = [];
    this.commandCompletions(completions, args, current);
    this.optionCompletions(completions, args, argv2, current);
    this.choicesFromOptionsCompletions(completions, args, argv2, current);
    this.choicesFromPositionalsCompletions(completions, args, argv2, current);
    done(null, completions);
  }
  commandCompletions(completions, args, current) {
    const parentCommands = this.yargs.getInternalMethods().getContext().commands;
    if (!current.match(/^-/) && parentCommands[parentCommands.length - 1] !== current && !this.previousArgHasChoices(args)) {
      this.usage.getCommands().forEach((usageCommand) => {
        const commandName = parseCommand(usageCommand[0]).cmd;
        if (args.indexOf(commandName) === -1) {
          if (!this.zshShell) {
            completions.push(commandName);
          } else {
            const desc = usageCommand[1] || "";
            completions.push(commandName.replace(/:/g, "\\:") + ":" + desc);
          }
        }
      });
    }
  }
  optionCompletions(completions, args, argv2, current) {
    if ((current.match(/^-/) || current === "" && completions.length === 0) && !this.previousArgHasChoices(args)) {
      const options = this.yargs.getOptions();
      const positionalKeys = this.yargs.getGroups()[this.usage.getPositionalGroupName()] || [];
      Object.keys(options.key).forEach((key) => {
        const negable = !!options.configuration["boolean-negation"] && options.boolean.includes(key);
        const isPositionalKey = positionalKeys.includes(key);
        if (!isPositionalKey && !options.hiddenOptions.includes(key) && !this.argsContainKey(args, key, negable)) {
          this.completeOptionKey(key, completions, current, negable && !!options.default[key]);
        }
      });
    }
  }
  choicesFromOptionsCompletions(completions, args, argv2, current) {
    if (this.previousArgHasChoices(args)) {
      const choices = this.getPreviousArgChoices(args);
      if (choices && choices.length > 0) {
        completions.push(...choices.map((c2) => c2.replace(/:/g, "\\:")));
      }
    }
  }
  choicesFromPositionalsCompletions(completions, args, argv2, current) {
    if (current === "" && completions.length > 0 && this.previousArgHasChoices(args)) {
      return;
    }
    const positionalKeys = this.yargs.getGroups()[this.usage.getPositionalGroupName()] || [];
    const offset = Math.max(this.indexAfterLastReset, this.yargs.getInternalMethods().getContext().commands.length + 1);
    const positionalKey = positionalKeys[argv2._.length - offset - 1];
    if (!positionalKey) {
      return;
    }
    const choices = this.yargs.getOptions().choices[positionalKey] || [];
    for (const choice of choices) {
      if (choice.startsWith(current)) {
        completions.push(choice.replace(/:/g, "\\:"));
      }
    }
  }
  getPreviousArgChoices(args) {
    if (args.length < 1)
      return;
    let previousArg = args[args.length - 1];
    let filter = "";
    if (!previousArg.startsWith("-") && args.length > 1) {
      filter = previousArg;
      previousArg = args[args.length - 2];
    }
    if (!previousArg.startsWith("-"))
      return;
    const previousArgKey = previousArg.replace(/^-+/, "");
    const options = this.yargs.getOptions();
    const possibleAliases = [
      previousArgKey,
      ...this.yargs.getAliases()[previousArgKey] || []
    ];
    let choices;
    for (const possibleAlias of possibleAliases) {
      if (Object.prototype.hasOwnProperty.call(options.key, possibleAlias) && Array.isArray(options.choices[possibleAlias])) {
        choices = options.choices[possibleAlias];
        break;
      }
    }
    if (choices) {
      return choices.filter((choice) => !filter || choice.startsWith(filter));
    }
  }
  previousArgHasChoices(args) {
    const choices = this.getPreviousArgChoices(args);
    return choices !== void 0 && choices.length > 0;
  }
  argsContainKey(args, key, negable) {
    const argsContains = (s) => args.indexOf((/^[^0-9]$/.test(s) ? "-" : "--") + s) !== -1;
    if (argsContains(key))
      return true;
    if (negable && argsContains(`no-${key}`))
      return true;
    if (this.aliases) {
      for (const alias of this.aliases[key]) {
        if (argsContains(alias))
          return true;
      }
    }
    return false;
  }
  completeOptionKey(key, completions, current, negable) {
    var _a2, _b2, _c2, _d;
    let keyWithDesc = key;
    if (this.zshShell) {
      const descs = this.usage.getDescriptions();
      const aliasKey = (_b2 = (_a2 = this === null || this === void 0 ? void 0 : this.aliases) === null || _a2 === void 0 ? void 0 : _a2[key]) === null || _b2 === void 0 ? void 0 : _b2.find((alias) => {
        const desc2 = descs[alias];
        return typeof desc2 === "string" && desc2.length > 0;
      });
      const descFromAlias = aliasKey ? descs[aliasKey] : void 0;
      const desc = (_d = (_c2 = descs[key]) !== null && _c2 !== void 0 ? _c2 : descFromAlias) !== null && _d !== void 0 ? _d : "";
      keyWithDesc = `${key.replace(/:/g, "\\:")}:${desc.replace("__yargsString__:", "").replace(/(\r\n|\n|\r)/gm, " ")}`;
    }
    const startsByTwoDashes = (s) => /^--/.test(s);
    const isShortOption = (s) => /^[^0-9]$/.test(s);
    const dashes = !startsByTwoDashes(current) && isShortOption(key) ? "-" : "--";
    completions.push(dashes + keyWithDesc);
    if (negable) {
      completions.push(dashes + "no-" + keyWithDesc);
    }
  }
  customCompletion(args, argv2, current, done) {
    assertNotStrictEqual(this.customCompletionFunction, null, this.shim);
    if (isSyncCompletionFunction(this.customCompletionFunction)) {
      const result = this.customCompletionFunction(current, argv2);
      if (isPromise(result)) {
        return result.then((list) => {
          this.shim.process.nextTick(() => {
            done(null, list);
          });
        }).catch((err) => {
          this.shim.process.nextTick(() => {
            done(err, void 0);
          });
        });
      }
      return done(null, result);
    } else if (isFallbackCompletionFunction(this.customCompletionFunction)) {
      return this.customCompletionFunction(current, argv2, (onCompleted = done) => this.defaultCompletion(args, argv2, current, onCompleted), (completions) => {
        done(null, completions);
      });
    } else {
      return this.customCompletionFunction(current, argv2, (completions) => {
        done(null, completions);
      });
    }
  }
  getCompletion(args, done) {
    const current = args.length ? args[args.length - 1] : "";
    const argv2 = this.yargs.parse(args, true);
    const completionFunction = this.customCompletionFunction ? (argv3) => this.customCompletion(args, argv3, current, done) : (argv3) => this.defaultCompletion(args, argv3, current, done);
    return isPromise(argv2) ? argv2.then(completionFunction) : completionFunction(argv2);
  }
  generateCompletionScript($0, cmd) {
    let script = this.zshShell ? completionZshTemplate : completionShTemplate;
    const name = this.shim.path.basename($0);
    if ($0.match(/\.js$/))
      $0 = `./${$0}`;
    script = script.replace(/{{app_name}}/g, name);
    script = script.replace(/{{completion_command}}/g, cmd);
    return script.replace(/{{app_path}}/g, $0);
  }
  registerFunction(fn) {
    this.customCompletionFunction = fn;
  }
  setParsed(parsed) {
    this.aliases = parsed.aliases;
  }
};
function completion(yargs, usage2, command2, shim3) {
  return new Completion(yargs, usage2, command2, shim3);
}
function isSyncCompletionFunction(completionFunction) {
  return completionFunction.length < 3;
}
function isFallbackCompletionFunction(completionFunction) {
  return completionFunction.length > 3;
}

// node_modules/yargs/build/lib/utils/levenshtein.js
function levenshtein(a2, b2) {
  if (a2.length === 0)
    return b2.length;
  if (b2.length === 0)
    return a2.length;
  const matrix = [];
  let i;
  for (i = 0; i <= b2.length; i++) {
    matrix[i] = [i];
  }
  let j;
  for (j = 0; j <= a2.length; j++) {
    matrix[0][j] = j;
  }
  for (i = 1; i <= b2.length; i++) {
    for (j = 1; j <= a2.length; j++) {
      if (b2.charAt(i - 1) === a2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        if (i > 1 && j > 1 && b2.charAt(i - 2) === a2.charAt(j - 1) && b2.charAt(i - 1) === a2.charAt(j - 2)) {
          matrix[i][j] = matrix[i - 2][j - 2] + 1;
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
        }
      }
    }
  }
  return matrix[b2.length][a2.length];
}

// node_modules/yargs/build/lib/validation.js
var specialKeys = ["$0", "--", "_"];
function validation(yargs, usage2, shim3) {
  const __ = shim3.y18n.__;
  const __n = shim3.y18n.__n;
  const self2 = {};
  self2.nonOptionCount = function nonOptionCount(argv2) {
    const demandedCommands = yargs.getDemandedCommands();
    const positionalCount = argv2._.length + (argv2["--"] ? argv2["--"].length : 0);
    const _s = positionalCount - yargs.getInternalMethods().getContext().commands.length;
    if (demandedCommands._ && (_s < demandedCommands._.min || _s > demandedCommands._.max)) {
      if (_s < demandedCommands._.min) {
        if (demandedCommands._.minMsg !== void 0) {
          usage2.fail(demandedCommands._.minMsg ? demandedCommands._.minMsg.replace(/\$0/g, _s.toString()).replace(/\$1/, demandedCommands._.min.toString()) : null);
        } else {
          usage2.fail(__n("Not enough non-option arguments: got %s, need at least %s", "Not enough non-option arguments: got %s, need at least %s", _s, _s.toString(), demandedCommands._.min.toString()));
        }
      } else if (_s > demandedCommands._.max) {
        if (demandedCommands._.maxMsg !== void 0) {
          usage2.fail(demandedCommands._.maxMsg ? demandedCommands._.maxMsg.replace(/\$0/g, _s.toString()).replace(/\$1/, demandedCommands._.max.toString()) : null);
        } else {
          usage2.fail(__n("Too many non-option arguments: got %s, maximum of %s", "Too many non-option arguments: got %s, maximum of %s", _s, _s.toString(), demandedCommands._.max.toString()));
        }
      }
    }
  };
  self2.positionalCount = function positionalCount(required, observed) {
    if (observed < required) {
      usage2.fail(__n("Not enough non-option arguments: got %s, need at least %s", "Not enough non-option arguments: got %s, need at least %s", observed, observed + "", required + ""));
    }
  };
  self2.requiredArguments = function requiredArguments(argv2, demandedOptions) {
    let missing = null;
    for (const key of Object.keys(demandedOptions)) {
      if (!Object.prototype.hasOwnProperty.call(argv2, key) || typeof argv2[key] === "undefined") {
        missing = missing || {};
        missing[key] = demandedOptions[key];
      }
    }
    if (missing) {
      const customMsgs = [];
      for (const key of Object.keys(missing)) {
        const msg = missing[key];
        if (msg && customMsgs.indexOf(msg) < 0) {
          customMsgs.push(msg);
        }
      }
      const customMsg = customMsgs.length ? `
${customMsgs.join("\n")}` : "";
      usage2.fail(__n("Missing required argument: %s", "Missing required arguments: %s", Object.keys(missing).length, Object.keys(missing).join(", ") + customMsg));
    }
  };
  self2.unknownArguments = function unknownArguments(argv2, aliases, positionalMap, isDefaultCommand, checkPositionals = true) {
    var _a2;
    const commandKeys = yargs.getInternalMethods().getCommandInstance().getCommands();
    const unknown = [];
    const currentContext = yargs.getInternalMethods().getContext();
    Object.keys(argv2).forEach((key) => {
      if (!specialKeys.includes(key) && !Object.prototype.hasOwnProperty.call(positionalMap, key) && !Object.prototype.hasOwnProperty.call(yargs.getInternalMethods().getParseContext(), key) && !self2.isValidAndSomeAliasIsNotNew(key, aliases)) {
        unknown.push(key);
      }
    });
    if (checkPositionals && (currentContext.commands.length > 0 || commandKeys.length > 0 || isDefaultCommand)) {
      argv2._.slice(currentContext.commands.length).forEach((key) => {
        if (!commandKeys.includes("" + key)) {
          unknown.push("" + key);
        }
      });
    }
    if (checkPositionals) {
      const demandedCommands = yargs.getDemandedCommands();
      const maxNonOptDemanded = ((_a2 = demandedCommands._) === null || _a2 === void 0 ? void 0 : _a2.max) || 0;
      const expected = currentContext.commands.length + maxNonOptDemanded;
      if (expected < argv2._.length) {
        argv2._.slice(expected).forEach((key) => {
          key = String(key);
          if (!currentContext.commands.includes(key) && !unknown.includes(key)) {
            unknown.push(key);
          }
        });
      }
    }
    if (unknown.length) {
      usage2.fail(__n("Unknown argument: %s", "Unknown arguments: %s", unknown.length, unknown.map((s) => s.trim() ? s : `"${s}"`).join(", ")));
    }
  };
  self2.unknownCommands = function unknownCommands(argv2) {
    const commandKeys = yargs.getInternalMethods().getCommandInstance().getCommands();
    const unknown = [];
    const currentContext = yargs.getInternalMethods().getContext();
    if (currentContext.commands.length > 0 || commandKeys.length > 0) {
      argv2._.slice(currentContext.commands.length).forEach((key) => {
        if (!commandKeys.includes("" + key)) {
          unknown.push("" + key);
        }
      });
    }
    if (unknown.length > 0) {
      usage2.fail(__n("Unknown command: %s", "Unknown commands: %s", unknown.length, unknown.join(", ")));
      return true;
    } else {
      return false;
    }
  };
  self2.isValidAndSomeAliasIsNotNew = function isValidAndSomeAliasIsNotNew(key, aliases) {
    if (!Object.prototype.hasOwnProperty.call(aliases, key)) {
      return false;
    }
    const newAliases = yargs.parsed.newAliases;
    return [key, ...aliases[key]].some((a2) => !Object.prototype.hasOwnProperty.call(newAliases, a2) || !newAliases[key]);
  };
  self2.limitedChoices = function limitedChoices(argv2) {
    const options = yargs.getOptions();
    const invalid = {};
    if (!Object.keys(options.choices).length)
      return;
    Object.keys(argv2).forEach((key) => {
      if (specialKeys.indexOf(key) === -1 && Object.prototype.hasOwnProperty.call(options.choices, key)) {
        [].concat(argv2[key]).forEach((value2) => {
          if (options.choices[key].indexOf(value2) === -1 && value2 !== void 0) {
            invalid[key] = (invalid[key] || []).concat(value2);
          }
        });
      }
    });
    const invalidKeys = Object.keys(invalid);
    if (!invalidKeys.length)
      return;
    let msg = __("Invalid values:");
    invalidKeys.forEach((key) => {
      msg += `
  ${__("Argument: %s, Given: %s, Choices: %s", key, usage2.stringifiedValues(invalid[key]), usage2.stringifiedValues(options.choices[key]))}`;
    });
    usage2.fail(msg);
  };
  let implied = {};
  self2.implies = function implies(key, value2) {
    argsert("<string|object> [array|number|string]", [key, value2], arguments.length);
    if (typeof key === "object") {
      Object.keys(key).forEach((k2) => {
        self2.implies(k2, key[k2]);
      });
    } else {
      yargs.global(key);
      if (!implied[key]) {
        implied[key] = [];
      }
      if (Array.isArray(value2)) {
        value2.forEach((i) => self2.implies(key, i));
      } else {
        assertNotStrictEqual(value2, void 0, shim3);
        implied[key].push(value2);
      }
    }
  };
  self2.getImplied = function getImplied() {
    return implied;
  };
  function keyExists(argv2, val) {
    const num = Number(val);
    val = isNaN(num) ? val : num;
    if (typeof val === "number") {
      val = argv2._.length >= val;
    } else if (val.match(/^--no-.+/)) {
      val = val.match(/^--no-(.+)/)[1];
      val = !Object.prototype.hasOwnProperty.call(argv2, val);
    } else {
      val = Object.prototype.hasOwnProperty.call(argv2, val);
    }
    return val;
  }
  self2.implications = function implications(argv2) {
    const implyFail = [];
    Object.keys(implied).forEach((key) => {
      const origKey = key;
      (implied[key] || []).forEach((value2) => {
        let key2 = origKey;
        const origValue = value2;
        key2 = keyExists(argv2, key2);
        value2 = keyExists(argv2, value2);
        if (key2 && !value2) {
          implyFail.push(` ${origKey} -> ${origValue}`);
        }
      });
    });
    if (implyFail.length) {
      let msg = `${__("Implications failed:")}
`;
      implyFail.forEach((value2) => {
        msg += value2;
      });
      usage2.fail(msg);
    }
  };
  let conflicting = {};
  self2.conflicts = function conflicts(key, value2) {
    argsert("<string|object> [array|string]", [key, value2], arguments.length);
    if (typeof key === "object") {
      Object.keys(key).forEach((k2) => {
        self2.conflicts(k2, key[k2]);
      });
    } else {
      yargs.global(key);
      if (!conflicting[key]) {
        conflicting[key] = [];
      }
      if (Array.isArray(value2)) {
        value2.forEach((i) => self2.conflicts(key, i));
      } else {
        conflicting[key].push(value2);
      }
    }
  };
  self2.getConflicting = () => conflicting;
  self2.conflicting = function conflictingFn(argv2) {
    Object.keys(argv2).forEach((key) => {
      if (conflicting[key]) {
        conflicting[key].forEach((value2) => {
          if (value2 && argv2[key] !== void 0 && argv2[value2] !== void 0) {
            usage2.fail(__("Arguments %s and %s are mutually exclusive", key, value2));
          }
        });
      }
    });
    if (yargs.getInternalMethods().getParserConfiguration()["strip-dashed"]) {
      Object.keys(conflicting).forEach((key) => {
        conflicting[key].forEach((value2) => {
          if (value2 && argv2[shim3.Parser.camelCase(key)] !== void 0 && argv2[shim3.Parser.camelCase(value2)] !== void 0) {
            usage2.fail(__("Arguments %s and %s are mutually exclusive", key, value2));
          }
        });
      });
    }
  };
  self2.recommendCommands = function recommendCommands(cmd, potentialCommands) {
    const threshold = 3;
    potentialCommands = potentialCommands.sort((a2, b2) => b2.length - a2.length);
    let recommended = null;
    let bestDistance = Infinity;
    for (let i = 0, candidate; (candidate = potentialCommands[i]) !== void 0; i++) {
      const d2 = levenshtein(cmd, candidate);
      if (d2 <= threshold && d2 < bestDistance) {
        bestDistance = d2;
        recommended = candidate;
      }
    }
    if (recommended)
      usage2.fail(__("Did you mean %s?", recommended));
  };
  self2.reset = function reset(localLookup) {
    implied = objFilter(implied, (k2) => !localLookup[k2]);
    conflicting = objFilter(conflicting, (k2) => !localLookup[k2]);
    return self2;
  };
  const frozens = [];
  self2.freeze = function freeze() {
    frozens.push({
      implied,
      conflicting
    });
  };
  self2.unfreeze = function unfreeze() {
    const frozen = frozens.pop();
    assertNotStrictEqual(frozen, void 0, shim3);
    ({ implied, conflicting } = frozen);
  };
  return self2;
}

// node_modules/yargs/build/lib/utils/apply-extends.js
var previouslyVisitedConfigs = [];
var shim2;
function applyExtends(config, cwd2, mergeExtends, _shim) {
  shim2 = _shim;
  let defaultConfig = {};
  if (Object.prototype.hasOwnProperty.call(config, "extends")) {
    if (typeof config.extends !== "string")
      return defaultConfig;
    const isPath = /\.json|\..*rc$/.test(config.extends);
    let pathToDefault = null;
    if (!isPath) {
      try {
        pathToDefault = require.resolve(config.extends);
      } catch (_err) {
        return config;
      }
    } else {
      pathToDefault = getPathToDefaultConfig(cwd2, config.extends);
    }
    checkForCircularExtends(pathToDefault);
    previouslyVisitedConfigs.push(pathToDefault);
    defaultConfig = isPath ? JSON.parse(shim2.readFileSync(pathToDefault, "utf8")) : require(config.extends);
    delete config.extends;
    defaultConfig = applyExtends(defaultConfig, shim2.path.dirname(pathToDefault), mergeExtends, shim2);
  }
  previouslyVisitedConfigs = [];
  return mergeExtends ? mergeDeep(defaultConfig, config) : Object.assign({}, defaultConfig, config);
}
function checkForCircularExtends(cfgPath) {
  if (previouslyVisitedConfigs.indexOf(cfgPath) > -1) {
    throw new YError(`Circular extended configurations: '${cfgPath}'.`);
  }
}
function getPathToDefaultConfig(cwd2, pathToExtend) {
  return shim2.path.resolve(cwd2, pathToExtend);
}
function mergeDeep(config1, config2) {
  const target = {};
  function isObject(obj) {
    return obj && typeof obj === "object" && !Array.isArray(obj);
  }
  Object.assign(target, config1);
  for (const key of Object.keys(config2)) {
    if (isObject(config2[key]) && isObject(target[key])) {
      target[key] = mergeDeep(config1[key], config2[key]);
    } else {
      target[key] = config2[key];
    }
  }
  return target;
}

// node_modules/yargs/build/lib/yargs-factory.js
var __classPrivateFieldSet = function(receiver, state, value2, kind, f2) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f2) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f2 : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f2.call(receiver, value2) : f2 ? f2.value = value2 : state.set(receiver, value2), value2;
};
var __classPrivateFieldGet = function(receiver, state, kind, f2) {
  if (kind === "a" && !f2) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f2 : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f2 : kind === "a" ? f2.call(receiver) : f2 ? f2.value : state.get(receiver);
};
var _YargsInstance_command;
var _YargsInstance_cwd;
var _YargsInstance_context;
var _YargsInstance_completion;
var _YargsInstance_completionCommand;
var _YargsInstance_defaultShowHiddenOpt;
var _YargsInstance_exitError;
var _YargsInstance_detectLocale;
var _YargsInstance_emittedWarnings;
var _YargsInstance_exitProcess;
var _YargsInstance_frozens;
var _YargsInstance_globalMiddleware;
var _YargsInstance_groups;
var _YargsInstance_hasOutput;
var _YargsInstance_helpOpt;
var _YargsInstance_isGlobalContext;
var _YargsInstance_logger;
var _YargsInstance_output;
var _YargsInstance_options;
var _YargsInstance_parentRequire;
var _YargsInstance_parserConfig;
var _YargsInstance_parseFn;
var _YargsInstance_parseContext;
var _YargsInstance_pkgs;
var _YargsInstance_preservedGroups;
var _YargsInstance_processArgs;
var _YargsInstance_recommendCommands;
var _YargsInstance_shim;
var _YargsInstance_strict;
var _YargsInstance_strictCommands;
var _YargsInstance_strictOptions;
var _YargsInstance_usage;
var _YargsInstance_usageConfig;
var _YargsInstance_versionOpt;
var _YargsInstance_validation;
function YargsFactory(_shim) {
  return (processArgs = [], cwd2 = _shim.process.cwd(), parentRequire) => {
    const yargs = new YargsInstance(processArgs, cwd2, parentRequire, _shim);
    Object.defineProperty(yargs, "argv", {
      get: () => {
        return yargs.parse();
      },
      enumerable: true
    });
    yargs.help();
    yargs.version();
    return yargs;
  };
}
var kCopyDoubleDash = /* @__PURE__ */ Symbol("copyDoubleDash");
var kCreateLogger = /* @__PURE__ */ Symbol("copyDoubleDash");
var kDeleteFromParserHintObject = /* @__PURE__ */ Symbol("deleteFromParserHintObject");
var kEmitWarning = /* @__PURE__ */ Symbol("emitWarning");
var kFreeze = /* @__PURE__ */ Symbol("freeze");
var kGetDollarZero = /* @__PURE__ */ Symbol("getDollarZero");
var kGetParserConfiguration = /* @__PURE__ */ Symbol("getParserConfiguration");
var kGetUsageConfiguration = /* @__PURE__ */ Symbol("getUsageConfiguration");
var kGuessLocale = /* @__PURE__ */ Symbol("guessLocale");
var kGuessVersion = /* @__PURE__ */ Symbol("guessVersion");
var kParsePositionalNumbers = /* @__PURE__ */ Symbol("parsePositionalNumbers");
var kPkgUp = /* @__PURE__ */ Symbol("pkgUp");
var kPopulateParserHintArray = /* @__PURE__ */ Symbol("populateParserHintArray");
var kPopulateParserHintSingleValueDictionary = /* @__PURE__ */ Symbol("populateParserHintSingleValueDictionary");
var kPopulateParserHintArrayDictionary = /* @__PURE__ */ Symbol("populateParserHintArrayDictionary");
var kPopulateParserHintDictionary = /* @__PURE__ */ Symbol("populateParserHintDictionary");
var kSanitizeKey = /* @__PURE__ */ Symbol("sanitizeKey");
var kSetKey = /* @__PURE__ */ Symbol("setKey");
var kUnfreeze = /* @__PURE__ */ Symbol("unfreeze");
var kValidateAsync = /* @__PURE__ */ Symbol("validateAsync");
var kGetCommandInstance = /* @__PURE__ */ Symbol("getCommandInstance");
var kGetContext = /* @__PURE__ */ Symbol("getContext");
var kGetHasOutput = /* @__PURE__ */ Symbol("getHasOutput");
var kGetLoggerInstance = /* @__PURE__ */ Symbol("getLoggerInstance");
var kGetParseContext = /* @__PURE__ */ Symbol("getParseContext");
var kGetUsageInstance = /* @__PURE__ */ Symbol("getUsageInstance");
var kGetValidationInstance = /* @__PURE__ */ Symbol("getValidationInstance");
var kHasParseCallback = /* @__PURE__ */ Symbol("hasParseCallback");
var kIsGlobalContext = /* @__PURE__ */ Symbol("isGlobalContext");
var kPostProcess = /* @__PURE__ */ Symbol("postProcess");
var kRebase = /* @__PURE__ */ Symbol("rebase");
var kReset = /* @__PURE__ */ Symbol("reset");
var kRunYargsParserAndExecuteCommands = /* @__PURE__ */ Symbol("runYargsParserAndExecuteCommands");
var kRunValidation = /* @__PURE__ */ Symbol("runValidation");
var kSetHasOutput = /* @__PURE__ */ Symbol("setHasOutput");
var kTrackManuallySetKeys = /* @__PURE__ */ Symbol("kTrackManuallySetKeys");
var YargsInstance = class {
  constructor(processArgs = [], cwd2, parentRequire, shim3) {
    this.customScriptName = false;
    this.parsed = false;
    _YargsInstance_command.set(this, void 0);
    _YargsInstance_cwd.set(this, void 0);
    _YargsInstance_context.set(this, { commands: [], fullCommands: [] });
    _YargsInstance_completion.set(this, null);
    _YargsInstance_completionCommand.set(this, null);
    _YargsInstance_defaultShowHiddenOpt.set(this, "show-hidden");
    _YargsInstance_exitError.set(this, null);
    _YargsInstance_detectLocale.set(this, true);
    _YargsInstance_emittedWarnings.set(this, {});
    _YargsInstance_exitProcess.set(this, true);
    _YargsInstance_frozens.set(this, []);
    _YargsInstance_globalMiddleware.set(this, void 0);
    _YargsInstance_groups.set(this, {});
    _YargsInstance_hasOutput.set(this, false);
    _YargsInstance_helpOpt.set(this, null);
    _YargsInstance_isGlobalContext.set(this, true);
    _YargsInstance_logger.set(this, void 0);
    _YargsInstance_output.set(this, "");
    _YargsInstance_options.set(this, void 0);
    _YargsInstance_parentRequire.set(this, void 0);
    _YargsInstance_parserConfig.set(this, {});
    _YargsInstance_parseFn.set(this, null);
    _YargsInstance_parseContext.set(this, null);
    _YargsInstance_pkgs.set(this, {});
    _YargsInstance_preservedGroups.set(this, {});
    _YargsInstance_processArgs.set(this, void 0);
    _YargsInstance_recommendCommands.set(this, false);
    _YargsInstance_shim.set(this, void 0);
    _YargsInstance_strict.set(this, false);
    _YargsInstance_strictCommands.set(this, false);
    _YargsInstance_strictOptions.set(this, false);
    _YargsInstance_usage.set(this, void 0);
    _YargsInstance_usageConfig.set(this, {});
    _YargsInstance_versionOpt.set(this, null);
    _YargsInstance_validation.set(this, void 0);
    __classPrivateFieldSet(this, _YargsInstance_shim, shim3, "f");
    __classPrivateFieldSet(this, _YargsInstance_processArgs, processArgs, "f");
    __classPrivateFieldSet(this, _YargsInstance_cwd, cwd2, "f");
    __classPrivateFieldSet(this, _YargsInstance_parentRequire, parentRequire, "f");
    __classPrivateFieldSet(this, _YargsInstance_globalMiddleware, new GlobalMiddleware(this), "f");
    this.$0 = this[kGetDollarZero]();
    this[kReset]();
    __classPrivateFieldSet(this, _YargsInstance_command, __classPrivateFieldGet(this, _YargsInstance_command, "f"), "f");
    __classPrivateFieldSet(this, _YargsInstance_usage, __classPrivateFieldGet(this, _YargsInstance_usage, "f"), "f");
    __classPrivateFieldSet(this, _YargsInstance_validation, __classPrivateFieldGet(this, _YargsInstance_validation, "f"), "f");
    __classPrivateFieldSet(this, _YargsInstance_options, __classPrivateFieldGet(this, _YargsInstance_options, "f"), "f");
    __classPrivateFieldGet(this, _YargsInstance_options, "f").showHiddenOpt = __classPrivateFieldGet(this, _YargsInstance_defaultShowHiddenOpt, "f");
    __classPrivateFieldSet(this, _YargsInstance_logger, this[kCreateLogger](), "f");
  }
  addHelpOpt(opt, msg) {
    const defaultHelpOpt = "help";
    argsert("[string|boolean] [string]", [opt, msg], arguments.length);
    if (__classPrivateFieldGet(this, _YargsInstance_helpOpt, "f")) {
      this[kDeleteFromParserHintObject](__classPrivateFieldGet(this, _YargsInstance_helpOpt, "f"));
      __classPrivateFieldSet(this, _YargsInstance_helpOpt, null, "f");
    }
    if (opt === false && msg === void 0)
      return this;
    __classPrivateFieldSet(this, _YargsInstance_helpOpt, typeof opt === "string" ? opt : defaultHelpOpt, "f");
    this.boolean(__classPrivateFieldGet(this, _YargsInstance_helpOpt, "f"));
    this.describe(__classPrivateFieldGet(this, _YargsInstance_helpOpt, "f"), msg || __classPrivateFieldGet(this, _YargsInstance_usage, "f").deferY18nLookup("Show help"));
    return this;
  }
  help(opt, msg) {
    return this.addHelpOpt(opt, msg);
  }
  addShowHiddenOpt(opt, msg) {
    argsert("[string|boolean] [string]", [opt, msg], arguments.length);
    if (opt === false && msg === void 0)
      return this;
    const showHiddenOpt = typeof opt === "string" ? opt : __classPrivateFieldGet(this, _YargsInstance_defaultShowHiddenOpt, "f");
    this.boolean(showHiddenOpt);
    this.describe(showHiddenOpt, msg || __classPrivateFieldGet(this, _YargsInstance_usage, "f").deferY18nLookup("Show hidden options"));
    __classPrivateFieldGet(this, _YargsInstance_options, "f").showHiddenOpt = showHiddenOpt;
    return this;
  }
  showHidden(opt, msg) {
    return this.addShowHiddenOpt(opt, msg);
  }
  alias(key, value2) {
    argsert("<object|string|array> [string|array]", [key, value2], arguments.length);
    this[kPopulateParserHintArrayDictionary](this.alias.bind(this), "alias", key, value2);
    return this;
  }
  array(keys) {
    argsert("<array|string>", [keys], arguments.length);
    this[kPopulateParserHintArray]("array", keys);
    this[kTrackManuallySetKeys](keys);
    return this;
  }
  boolean(keys) {
    argsert("<array|string>", [keys], arguments.length);
    this[kPopulateParserHintArray]("boolean", keys);
    this[kTrackManuallySetKeys](keys);
    return this;
  }
  check(f2, global2) {
    argsert("<function> [boolean]", [f2, global2], arguments.length);
    this.middleware((argv2, _yargs) => {
      return maybeAsyncResult(() => {
        return f2(argv2, _yargs.getOptions());
      }, (result) => {
        if (!result) {
          __classPrivateFieldGet(this, _YargsInstance_usage, "f").fail(__classPrivateFieldGet(this, _YargsInstance_shim, "f").y18n.__("Argument check failed: %s", f2.toString()));
        } else if (typeof result === "string" || result instanceof Error) {
          __classPrivateFieldGet(this, _YargsInstance_usage, "f").fail(result.toString(), result);
        }
        return argv2;
      }, (err) => {
        __classPrivateFieldGet(this, _YargsInstance_usage, "f").fail(err.message ? err.message : err.toString(), err);
        return argv2;
      });
    }, false, global2);
    return this;
  }
  choices(key, value2) {
    argsert("<object|string|array> [string|array]", [key, value2], arguments.length);
    this[kPopulateParserHintArrayDictionary](this.choices.bind(this), "choices", key, value2);
    return this;
  }
  coerce(keys, value2) {
    argsert("<object|string|array> [function]", [keys, value2], arguments.length);
    if (Array.isArray(keys)) {
      if (!value2) {
        throw new YError("coerce callback must be provided");
      }
      for (const key of keys) {
        this.coerce(key, value2);
      }
      return this;
    } else if (typeof keys === "object") {
      for (const key of Object.keys(keys)) {
        this.coerce(key, keys[key]);
      }
      return this;
    }
    if (!value2) {
      throw new YError("coerce callback must be provided");
    }
    __classPrivateFieldGet(this, _YargsInstance_options, "f").key[keys] = true;
    __classPrivateFieldGet(this, _YargsInstance_globalMiddleware, "f").addCoerceMiddleware((argv2, yargs) => {
      let aliases;
      const shouldCoerce = Object.prototype.hasOwnProperty.call(argv2, keys);
      if (!shouldCoerce) {
        return argv2;
      }
      return maybeAsyncResult(() => {
        aliases = yargs.getAliases();
        return value2(argv2[keys]);
      }, (result) => {
        argv2[keys] = result;
        const stripAliased = yargs.getInternalMethods().getParserConfiguration()["strip-aliased"];
        if (aliases[keys] && stripAliased !== true) {
          for (const alias of aliases[keys]) {
            argv2[alias] = result;
          }
        }
        return argv2;
      }, (err) => {
        throw new YError(err.message);
      });
    }, keys);
    return this;
  }
  conflicts(key1, key2) {
    argsert("<string|object> [string|array]", [key1, key2], arguments.length);
    __classPrivateFieldGet(this, _YargsInstance_validation, "f").conflicts(key1, key2);
    return this;
  }
  config(key = "config", msg, parseFn) {
    argsert("[object|string] [string|function] [function]", [key, msg, parseFn], arguments.length);
    if (typeof key === "object" && !Array.isArray(key)) {
      key = applyExtends(key, __classPrivateFieldGet(this, _YargsInstance_cwd, "f"), this[kGetParserConfiguration]()["deep-merge-config"] || false, __classPrivateFieldGet(this, _YargsInstance_shim, "f"));
      __classPrivateFieldGet(this, _YargsInstance_options, "f").configObjects = (__classPrivateFieldGet(this, _YargsInstance_options, "f").configObjects || []).concat(key);
      return this;
    }
    if (typeof msg === "function") {
      parseFn = msg;
      msg = void 0;
    }
    this.describe(key, msg || __classPrivateFieldGet(this, _YargsInstance_usage, "f").deferY18nLookup("Path to JSON config file"));
    (Array.isArray(key) ? key : [key]).forEach((k2) => {
      __classPrivateFieldGet(this, _YargsInstance_options, "f").config[k2] = parseFn || true;
    });
    return this;
  }
  completion(cmd, desc, fn) {
    argsert("[string] [string|boolean|function] [function]", [cmd, desc, fn], arguments.length);
    if (typeof desc === "function") {
      fn = desc;
      desc = void 0;
    }
    __classPrivateFieldSet(this, _YargsInstance_completionCommand, cmd || __classPrivateFieldGet(this, _YargsInstance_completionCommand, "f") || "completion", "f");
    if (!desc && desc !== false) {
      desc = "generate completion script";
    }
    this.command(__classPrivateFieldGet(this, _YargsInstance_completionCommand, "f"), desc);
    if (fn)
      __classPrivateFieldGet(this, _YargsInstance_completion, "f").registerFunction(fn);
    return this;
  }
  command(cmd, description, builder, handler, middlewares, deprecated) {
    argsert("<string|array|object> [string|boolean] [function|object] [function] [array] [boolean|string]", [cmd, description, builder, handler, middlewares, deprecated], arguments.length);
    __classPrivateFieldGet(this, _YargsInstance_command, "f").addHandler(cmd, description, builder, handler, middlewares, deprecated);
    return this;
  }
  commands(cmd, description, builder, handler, middlewares, deprecated) {
    return this.command(cmd, description, builder, handler, middlewares, deprecated);
  }
  commandDir(dir, opts) {
    argsert("<string> [object]", [dir, opts], arguments.length);
    const req = __classPrivateFieldGet(this, _YargsInstance_parentRequire, "f") || __classPrivateFieldGet(this, _YargsInstance_shim, "f").require;
    __classPrivateFieldGet(this, _YargsInstance_command, "f").addDirectory(dir, req, __classPrivateFieldGet(this, _YargsInstance_shim, "f").getCallerFile(), opts);
    return this;
  }
  count(keys) {
    argsert("<array|string>", [keys], arguments.length);
    this[kPopulateParserHintArray]("count", keys);
    this[kTrackManuallySetKeys](keys);
    return this;
  }
  default(key, value2, defaultDescription) {
    argsert("<object|string|array> [*] [string]", [key, value2, defaultDescription], arguments.length);
    if (defaultDescription) {
      assertSingleKey(key, __classPrivateFieldGet(this, _YargsInstance_shim, "f"));
      __classPrivateFieldGet(this, _YargsInstance_options, "f").defaultDescription[key] = defaultDescription;
    }
    if (typeof value2 === "function") {
      assertSingleKey(key, __classPrivateFieldGet(this, _YargsInstance_shim, "f"));
      if (!__classPrivateFieldGet(this, _YargsInstance_options, "f").defaultDescription[key])
        __classPrivateFieldGet(this, _YargsInstance_options, "f").defaultDescription[key] = __classPrivateFieldGet(this, _YargsInstance_usage, "f").functionDescription(value2);
      value2 = value2.call();
    }
    this[kPopulateParserHintSingleValueDictionary](this.default.bind(this), "default", key, value2);
    return this;
  }
  defaults(key, value2, defaultDescription) {
    return this.default(key, value2, defaultDescription);
  }
  demandCommand(min = 1, max, minMsg, maxMsg) {
    argsert("[number] [number|string] [string|null|undefined] [string|null|undefined]", [min, max, minMsg, maxMsg], arguments.length);
    if (typeof max !== "number") {
      minMsg = max;
      max = Infinity;
    }
    this.global("_", false);
    __classPrivateFieldGet(this, _YargsInstance_options, "f").demandedCommands._ = {
      min,
      max,
      minMsg,
      maxMsg
    };
    return this;
  }
  demand(keys, max, msg) {
    if (Array.isArray(max)) {
      max.forEach((key) => {
        assertNotStrictEqual(msg, true, __classPrivateFieldGet(this, _YargsInstance_shim, "f"));
        this.demandOption(key, msg);
      });
      max = Infinity;
    } else if (typeof max !== "number") {
      msg = max;
      max = Infinity;
    }
    if (typeof keys === "number") {
      assertNotStrictEqual(msg, true, __classPrivateFieldGet(this, _YargsInstance_shim, "f"));
      this.demandCommand(keys, max, msg, msg);
    } else if (Array.isArray(keys)) {
      keys.forEach((key) => {
        assertNotStrictEqual(msg, true, __classPrivateFieldGet(this, _YargsInstance_shim, "f"));
        this.demandOption(key, msg);
      });
    } else {
      if (typeof msg === "string") {
        this.demandOption(keys, msg);
      } else if (msg === true || typeof msg === "undefined") {
        this.demandOption(keys);
      }
    }
    return this;
  }
  demandOption(keys, msg) {
    argsert("<object|string|array> [string]", [keys, msg], arguments.length);
    this[kPopulateParserHintSingleValueDictionary](this.demandOption.bind(this), "demandedOptions", keys, msg);
    return this;
  }
  deprecateOption(option, message) {
    argsert("<string> [string|boolean]", [option, message], arguments.length);
    __classPrivateFieldGet(this, _YargsInstance_options, "f").deprecatedOptions[option] = message;
    return this;
  }
  describe(keys, description) {
    argsert("<object|string|array> [string]", [keys, description], arguments.length);
    this[kSetKey](keys, true);
    __classPrivateFieldGet(this, _YargsInstance_usage, "f").describe(keys, description);
    return this;
  }
  detectLocale(detect) {
    argsert("<boolean>", [detect], arguments.length);
    __classPrivateFieldSet(this, _YargsInstance_detectLocale, detect, "f");
    return this;
  }
  env(prefix) {
    argsert("[string|boolean]", [prefix], arguments.length);
    if (prefix === false)
      delete __classPrivateFieldGet(this, _YargsInstance_options, "f").envPrefix;
    else
      __classPrivateFieldGet(this, _YargsInstance_options, "f").envPrefix = prefix || "";
    return this;
  }
  epilogue(msg) {
    argsert("<string>", [msg], arguments.length);
    __classPrivateFieldGet(this, _YargsInstance_usage, "f").epilog(msg);
    return this;
  }
  epilog(msg) {
    return this.epilogue(msg);
  }
  example(cmd, description) {
    argsert("<string|array> [string]", [cmd, description], arguments.length);
    if (Array.isArray(cmd)) {
      cmd.forEach((exampleParams) => this.example(...exampleParams));
    } else {
      __classPrivateFieldGet(this, _YargsInstance_usage, "f").example(cmd, description);
    }
    return this;
  }
  exit(code2, err) {
    __classPrivateFieldSet(this, _YargsInstance_hasOutput, true, "f");
    __classPrivateFieldSet(this, _YargsInstance_exitError, err, "f");
    if (__classPrivateFieldGet(this, _YargsInstance_exitProcess, "f"))
      __classPrivateFieldGet(this, _YargsInstance_shim, "f").process.exit(code2);
  }
  exitProcess(enabled = true) {
    argsert("[boolean]", [enabled], arguments.length);
    __classPrivateFieldSet(this, _YargsInstance_exitProcess, enabled, "f");
    return this;
  }
  fail(f2) {
    argsert("<function|boolean>", [f2], arguments.length);
    if (typeof f2 === "boolean" && f2 !== false) {
      throw new YError("Invalid first argument. Expected function or boolean 'false'");
    }
    __classPrivateFieldGet(this, _YargsInstance_usage, "f").failFn(f2);
    return this;
  }
  getAliases() {
    return this.parsed ? this.parsed.aliases : {};
  }
  async getCompletion(args, done) {
    argsert("<array> [function]", [args, done], arguments.length);
    if (!done) {
      return new Promise((resolve5, reject) => {
        __classPrivateFieldGet(this, _YargsInstance_completion, "f").getCompletion(args, (err, completions) => {
          if (err)
            reject(err);
          else
            resolve5(completions);
        });
      });
    } else {
      return __classPrivateFieldGet(this, _YargsInstance_completion, "f").getCompletion(args, done);
    }
  }
  getDemandedOptions() {
    argsert([], 0);
    return __classPrivateFieldGet(this, _YargsInstance_options, "f").demandedOptions;
  }
  getDemandedCommands() {
    argsert([], 0);
    return __classPrivateFieldGet(this, _YargsInstance_options, "f").demandedCommands;
  }
  getDeprecatedOptions() {
    argsert([], 0);
    return __classPrivateFieldGet(this, _YargsInstance_options, "f").deprecatedOptions;
  }
  getDetectLocale() {
    return __classPrivateFieldGet(this, _YargsInstance_detectLocale, "f");
  }
  getExitProcess() {
    return __classPrivateFieldGet(this, _YargsInstance_exitProcess, "f");
  }
  getGroups() {
    return Object.assign({}, __classPrivateFieldGet(this, _YargsInstance_groups, "f"), __classPrivateFieldGet(this, _YargsInstance_preservedGroups, "f"));
  }
  getHelp() {
    __classPrivateFieldSet(this, _YargsInstance_hasOutput, true, "f");
    if (!__classPrivateFieldGet(this, _YargsInstance_usage, "f").hasCachedHelpMessage()) {
      if (!this.parsed) {
        const parse = this[kRunYargsParserAndExecuteCommands](__classPrivateFieldGet(this, _YargsInstance_processArgs, "f"), void 0, void 0, 0, true);
        if (isPromise(parse)) {
          return parse.then(() => {
            return __classPrivateFieldGet(this, _YargsInstance_usage, "f").help();
          });
        }
      }
      const builderResponse = __classPrivateFieldGet(this, _YargsInstance_command, "f").runDefaultBuilderOn(this);
      if (isPromise(builderResponse)) {
        return builderResponse.then(() => {
          return __classPrivateFieldGet(this, _YargsInstance_usage, "f").help();
        });
      }
    }
    return Promise.resolve(__classPrivateFieldGet(this, _YargsInstance_usage, "f").help());
  }
  getOptions() {
    return __classPrivateFieldGet(this, _YargsInstance_options, "f");
  }
  getStrict() {
    return __classPrivateFieldGet(this, _YargsInstance_strict, "f");
  }
  getStrictCommands() {
    return __classPrivateFieldGet(this, _YargsInstance_strictCommands, "f");
  }
  getStrictOptions() {
    return __classPrivateFieldGet(this, _YargsInstance_strictOptions, "f");
  }
  global(globals, global2) {
    argsert("<string|array> [boolean]", [globals, global2], arguments.length);
    globals = [].concat(globals);
    if (global2 !== false) {
      __classPrivateFieldGet(this, _YargsInstance_options, "f").local = __classPrivateFieldGet(this, _YargsInstance_options, "f").local.filter((l2) => globals.indexOf(l2) === -1);
    } else {
      globals.forEach((g2) => {
        if (!__classPrivateFieldGet(this, _YargsInstance_options, "f").local.includes(g2))
          __classPrivateFieldGet(this, _YargsInstance_options, "f").local.push(g2);
      });
    }
    return this;
  }
  group(opts, groupName) {
    argsert("<string|array> <string>", [opts, groupName], arguments.length);
    const existing = __classPrivateFieldGet(this, _YargsInstance_preservedGroups, "f")[groupName] || __classPrivateFieldGet(this, _YargsInstance_groups, "f")[groupName];
    if (__classPrivateFieldGet(this, _YargsInstance_preservedGroups, "f")[groupName]) {
      delete __classPrivateFieldGet(this, _YargsInstance_preservedGroups, "f")[groupName];
    }
    const seen = {};
    __classPrivateFieldGet(this, _YargsInstance_groups, "f")[groupName] = (existing || []).concat(opts).filter((key) => {
      if (seen[key])
        return false;
      return seen[key] = true;
    });
    return this;
  }
  hide(key) {
    argsert("<string>", [key], arguments.length);
    __classPrivateFieldGet(this, _YargsInstance_options, "f").hiddenOptions.push(key);
    return this;
  }
  implies(key, value2) {
    argsert("<string|object> [number|string|array]", [key, value2], arguments.length);
    __classPrivateFieldGet(this, _YargsInstance_validation, "f").implies(key, value2);
    return this;
  }
  locale(locale) {
    argsert("[string]", [locale], arguments.length);
    if (locale === void 0) {
      this[kGuessLocale]();
      return __classPrivateFieldGet(this, _YargsInstance_shim, "f").y18n.getLocale();
    }
    __classPrivateFieldSet(this, _YargsInstance_detectLocale, false, "f");
    __classPrivateFieldGet(this, _YargsInstance_shim, "f").y18n.setLocale(locale);
    return this;
  }
  middleware(callback, applyBeforeValidation, global2) {
    return __classPrivateFieldGet(this, _YargsInstance_globalMiddleware, "f").addMiddleware(callback, !!applyBeforeValidation, global2);
  }
  nargs(key, value2) {
    argsert("<string|object|array> [number]", [key, value2], arguments.length);
    this[kPopulateParserHintSingleValueDictionary](this.nargs.bind(this), "narg", key, value2);
    return this;
  }
  normalize(keys) {
    argsert("<array|string>", [keys], arguments.length);
    this[kPopulateParserHintArray]("normalize", keys);
    return this;
  }
  number(keys) {
    argsert("<array|string>", [keys], arguments.length);
    this[kPopulateParserHintArray]("number", keys);
    this[kTrackManuallySetKeys](keys);
    return this;
  }
  option(key, opt) {
    argsert("<string|object> [object]", [key, opt], arguments.length);
    if (typeof key === "object") {
      Object.keys(key).forEach((k2) => {
        this.options(k2, key[k2]);
      });
    } else {
      if (typeof opt !== "object") {
        opt = {};
      }
      this[kTrackManuallySetKeys](key);
      if (__classPrivateFieldGet(this, _YargsInstance_versionOpt, "f") && (key === "version" || (opt === null || opt === void 0 ? void 0 : opt.alias) === "version")) {
        this[kEmitWarning]([
          '"version" is a reserved word.',
          "Please do one of the following:",
          '- Disable version with `yargs.version(false)` if using "version" as an option',
          "- Use the built-in `yargs.version` method instead (if applicable)",
          "- Use a different option key",
          "https://yargs.js.org/docs/#api-reference-version"
        ].join("\n"), void 0, "versionWarning");
      }
      __classPrivateFieldGet(this, _YargsInstance_options, "f").key[key] = true;
      if (opt.alias)
        this.alias(key, opt.alias);
      const deprecate = opt.deprecate || opt.deprecated;
      if (deprecate) {
        this.deprecateOption(key, deprecate);
      }
      const demand = opt.demand || opt.required || opt.require;
      if (demand) {
        this.demand(key, demand);
      }
      if (opt.demandOption) {
        this.demandOption(key, typeof opt.demandOption === "string" ? opt.demandOption : void 0);
      }
      if (opt.conflicts) {
        this.conflicts(key, opt.conflicts);
      }
      if ("default" in opt) {
        this.default(key, opt.default);
      }
      if (opt.implies !== void 0) {
        this.implies(key, opt.implies);
      }
      if (opt.nargs !== void 0) {
        this.nargs(key, opt.nargs);
      }
      if (opt.config) {
        this.config(key, opt.configParser);
      }
      if (opt.normalize) {
        this.normalize(key);
      }
      if (opt.choices) {
        this.choices(key, opt.choices);
      }
      if (opt.coerce) {
        this.coerce(key, opt.coerce);
      }
      if (opt.group) {
        this.group(key, opt.group);
      }
      if (opt.boolean || opt.type === "boolean") {
        this.boolean(key);
        if (opt.alias)
          this.boolean(opt.alias);
      }
      if (opt.array || opt.type === "array") {
        this.array(key);
        if (opt.alias)
          this.array(opt.alias);
      }
      if (opt.number || opt.type === "number") {
        this.number(key);
        if (opt.alias)
          this.number(opt.alias);
      }
      if (opt.string || opt.type === "string") {
        this.string(key);
        if (opt.alias)
          this.string(opt.alias);
      }
      if (opt.count || opt.type === "count") {
        this.count(key);
      }
      if (typeof opt.global === "boolean") {
        this.global(key, opt.global);
      }
      if (opt.defaultDescription) {
        __classPrivateFieldGet(this, _YargsInstance_options, "f").defaultDescription[key] = opt.defaultDescription;
      }
      if (opt.skipValidation) {
        this.skipValidation(key);
      }
      const desc = opt.describe || opt.description || opt.desc;
      const descriptions = __classPrivateFieldGet(this, _YargsInstance_usage, "f").getDescriptions();
      if (!Object.prototype.hasOwnProperty.call(descriptions, key) || typeof desc === "string") {
        this.describe(key, desc);
      }
      if (opt.hidden) {
        this.hide(key);
      }
      if (opt.requiresArg) {
        this.requiresArg(key);
      }
    }
    return this;
  }
  options(key, opt) {
    return this.option(key, opt);
  }
  parse(args, shortCircuit, _parseFn) {
    argsert("[string|array] [function|boolean|object] [function]", [args, shortCircuit, _parseFn], arguments.length);
    this[kFreeze]();
    if (typeof args === "undefined") {
      args = __classPrivateFieldGet(this, _YargsInstance_processArgs, "f");
    }
    if (typeof shortCircuit === "object") {
      __classPrivateFieldSet(this, _YargsInstance_parseContext, shortCircuit, "f");
      shortCircuit = _parseFn;
    }
    if (typeof shortCircuit === "function") {
      __classPrivateFieldSet(this, _YargsInstance_parseFn, shortCircuit, "f");
      shortCircuit = false;
    }
    if (!shortCircuit)
      __classPrivateFieldSet(this, _YargsInstance_processArgs, args, "f");
    if (__classPrivateFieldGet(this, _YargsInstance_parseFn, "f"))
      __classPrivateFieldSet(this, _YargsInstance_exitProcess, false, "f");
    const parsed = this[kRunYargsParserAndExecuteCommands](args, !!shortCircuit);
    const tmpParsed = this.parsed;
    __classPrivateFieldGet(this, _YargsInstance_completion, "f").setParsed(this.parsed);
    if (isPromise(parsed)) {
      return parsed.then((argv2) => {
        if (__classPrivateFieldGet(this, _YargsInstance_parseFn, "f"))
          __classPrivateFieldGet(this, _YargsInstance_parseFn, "f").call(this, __classPrivateFieldGet(this, _YargsInstance_exitError, "f"), argv2, __classPrivateFieldGet(this, _YargsInstance_output, "f"));
        return argv2;
      }).catch((err) => {
        if (__classPrivateFieldGet(this, _YargsInstance_parseFn, "f")) {
          __classPrivateFieldGet(this, _YargsInstance_parseFn, "f")(err, this.parsed.argv, __classPrivateFieldGet(this, _YargsInstance_output, "f"));
        }
        throw err;
      }).finally(() => {
        this[kUnfreeze]();
        this.parsed = tmpParsed;
      });
    } else {
      if (__classPrivateFieldGet(this, _YargsInstance_parseFn, "f"))
        __classPrivateFieldGet(this, _YargsInstance_parseFn, "f").call(this, __classPrivateFieldGet(this, _YargsInstance_exitError, "f"), parsed, __classPrivateFieldGet(this, _YargsInstance_output, "f"));
      this[kUnfreeze]();
      this.parsed = tmpParsed;
    }
    return parsed;
  }
  parseAsync(args, shortCircuit, _parseFn) {
    const maybePromise = this.parse(args, shortCircuit, _parseFn);
    return !isPromise(maybePromise) ? Promise.resolve(maybePromise) : maybePromise;
  }
  parseSync(args, shortCircuit, _parseFn) {
    const maybePromise = this.parse(args, shortCircuit, _parseFn);
    if (isPromise(maybePromise)) {
      throw new YError(".parseSync() must not be used with asynchronous builders, handlers, or middleware");
    }
    return maybePromise;
  }
  parserConfiguration(config) {
    argsert("<object>", [config], arguments.length);
    __classPrivateFieldSet(this, _YargsInstance_parserConfig, config, "f");
    return this;
  }
  pkgConf(key, rootPath) {
    argsert("<string> [string]", [key, rootPath], arguments.length);
    let conf = null;
    const obj = this[kPkgUp](rootPath || __classPrivateFieldGet(this, _YargsInstance_cwd, "f"));
    if (obj[key] && typeof obj[key] === "object") {
      conf = applyExtends(obj[key], rootPath || __classPrivateFieldGet(this, _YargsInstance_cwd, "f"), this[kGetParserConfiguration]()["deep-merge-config"] || false, __classPrivateFieldGet(this, _YargsInstance_shim, "f"));
      __classPrivateFieldGet(this, _YargsInstance_options, "f").configObjects = (__classPrivateFieldGet(this, _YargsInstance_options, "f").configObjects || []).concat(conf);
    }
    return this;
  }
  positional(key, opts) {
    argsert("<string> <object>", [key, opts], arguments.length);
    const supportedOpts = [
      "default",
      "defaultDescription",
      "implies",
      "normalize",
      "choices",
      "conflicts",
      "coerce",
      "type",
      "describe",
      "desc",
      "description",
      "alias"
    ];
    opts = objFilter(opts, (k2, v2) => {
      if (k2 === "type" && !["string", "number", "boolean"].includes(v2))
        return false;
      return supportedOpts.includes(k2);
    });
    const fullCommand = __classPrivateFieldGet(this, _YargsInstance_context, "f").fullCommands[__classPrivateFieldGet(this, _YargsInstance_context, "f").fullCommands.length - 1];
    const parseOptions = fullCommand ? __classPrivateFieldGet(this, _YargsInstance_command, "f").cmdToParseOptions(fullCommand) : {
      array: [],
      alias: {},
      default: {},
      demand: {}
    };
    objectKeys(parseOptions).forEach((pk) => {
      const parseOption = parseOptions[pk];
      if (Array.isArray(parseOption)) {
        if (parseOption.indexOf(key) !== -1)
          opts[pk] = true;
      } else {
        if (parseOption[key] && !(pk in opts))
          opts[pk] = parseOption[key];
      }
    });
    this.group(key, __classPrivateFieldGet(this, _YargsInstance_usage, "f").getPositionalGroupName());
    return this.option(key, opts);
  }
  recommendCommands(recommend = true) {
    argsert("[boolean]", [recommend], arguments.length);
    __classPrivateFieldSet(this, _YargsInstance_recommendCommands, recommend, "f");
    return this;
  }
  required(keys, max, msg) {
    return this.demand(keys, max, msg);
  }
  require(keys, max, msg) {
    return this.demand(keys, max, msg);
  }
  requiresArg(keys) {
    argsert("<array|string|object> [number]", [keys], arguments.length);
    if (typeof keys === "string" && __classPrivateFieldGet(this, _YargsInstance_options, "f").narg[keys]) {
      return this;
    } else {
      this[kPopulateParserHintSingleValueDictionary](this.requiresArg.bind(this), "narg", keys, NaN);
    }
    return this;
  }
  showCompletionScript($0, cmd) {
    argsert("[string] [string]", [$0, cmd], arguments.length);
    $0 = $0 || this.$0;
    __classPrivateFieldGet(this, _YargsInstance_logger, "f").log(__classPrivateFieldGet(this, _YargsInstance_completion, "f").generateCompletionScript($0, cmd || __classPrivateFieldGet(this, _YargsInstance_completionCommand, "f") || "completion"));
    return this;
  }
  showHelp(level) {
    argsert("[string|function]", [level], arguments.length);
    __classPrivateFieldSet(this, _YargsInstance_hasOutput, true, "f");
    if (!__classPrivateFieldGet(this, _YargsInstance_usage, "f").hasCachedHelpMessage()) {
      if (!this.parsed) {
        const parse = this[kRunYargsParserAndExecuteCommands](__classPrivateFieldGet(this, _YargsInstance_processArgs, "f"), void 0, void 0, 0, true);
        if (isPromise(parse)) {
          parse.then(() => {
            __classPrivateFieldGet(this, _YargsInstance_usage, "f").showHelp(level);
          });
          return this;
        }
      }
      const builderResponse = __classPrivateFieldGet(this, _YargsInstance_command, "f").runDefaultBuilderOn(this);
      if (isPromise(builderResponse)) {
        builderResponse.then(() => {
          __classPrivateFieldGet(this, _YargsInstance_usage, "f").showHelp(level);
        });
        return this;
      }
    }
    __classPrivateFieldGet(this, _YargsInstance_usage, "f").showHelp(level);
    return this;
  }
  scriptName(scriptName) {
    this.customScriptName = true;
    this.$0 = scriptName;
    return this;
  }
  showHelpOnFail(enabled, message) {
    argsert("[boolean|string] [string]", [enabled, message], arguments.length);
    __classPrivateFieldGet(this, _YargsInstance_usage, "f").showHelpOnFail(enabled, message);
    return this;
  }
  showVersion(level) {
    argsert("[string|function]", [level], arguments.length);
    __classPrivateFieldGet(this, _YargsInstance_usage, "f").showVersion(level);
    return this;
  }
  skipValidation(keys) {
    argsert("<array|string>", [keys], arguments.length);
    this[kPopulateParserHintArray]("skipValidation", keys);
    return this;
  }
  strict(enabled) {
    argsert("[boolean]", [enabled], arguments.length);
    __classPrivateFieldSet(this, _YargsInstance_strict, enabled !== false, "f");
    return this;
  }
  strictCommands(enabled) {
    argsert("[boolean]", [enabled], arguments.length);
    __classPrivateFieldSet(this, _YargsInstance_strictCommands, enabled !== false, "f");
    return this;
  }
  strictOptions(enabled) {
    argsert("[boolean]", [enabled], arguments.length);
    __classPrivateFieldSet(this, _YargsInstance_strictOptions, enabled !== false, "f");
    return this;
  }
  string(keys) {
    argsert("<array|string>", [keys], arguments.length);
    this[kPopulateParserHintArray]("string", keys);
    this[kTrackManuallySetKeys](keys);
    return this;
  }
  terminalWidth() {
    argsert([], 0);
    return __classPrivateFieldGet(this, _YargsInstance_shim, "f").process.stdColumns;
  }
  updateLocale(obj) {
    return this.updateStrings(obj);
  }
  updateStrings(obj) {
    argsert("<object>", [obj], arguments.length);
    __classPrivateFieldSet(this, _YargsInstance_detectLocale, false, "f");
    __classPrivateFieldGet(this, _YargsInstance_shim, "f").y18n.updateLocale(obj);
    return this;
  }
  usage(msg, description, builder, handler) {
    argsert("<string|null|undefined> [string|boolean] [function|object] [function]", [msg, description, builder, handler], arguments.length);
    if (description !== void 0) {
      assertNotStrictEqual(msg, null, __classPrivateFieldGet(this, _YargsInstance_shim, "f"));
      if ((msg || "").match(/^\$0( |$)/)) {
        return this.command(msg, description, builder, handler);
      } else {
        throw new YError(".usage() description must start with $0 if being used as alias for .command()");
      }
    } else {
      __classPrivateFieldGet(this, _YargsInstance_usage, "f").usage(msg);
      return this;
    }
  }
  usageConfiguration(config) {
    argsert("<object>", [config], arguments.length);
    __classPrivateFieldSet(this, _YargsInstance_usageConfig, config, "f");
    return this;
  }
  version(opt, msg, ver) {
    const defaultVersionOpt = "version";
    argsert("[boolean|string] [string] [string]", [opt, msg, ver], arguments.length);
    if (__classPrivateFieldGet(this, _YargsInstance_versionOpt, "f")) {
      this[kDeleteFromParserHintObject](__classPrivateFieldGet(this, _YargsInstance_versionOpt, "f"));
      __classPrivateFieldGet(this, _YargsInstance_usage, "f").version(void 0);
      __classPrivateFieldSet(this, _YargsInstance_versionOpt, null, "f");
    }
    if (arguments.length === 0) {
      ver = this[kGuessVersion]();
      opt = defaultVersionOpt;
    } else if (arguments.length === 1) {
      if (opt === false) {
        return this;
      }
      ver = opt;
      opt = defaultVersionOpt;
    } else if (arguments.length === 2) {
      ver = msg;
      msg = void 0;
    }
    __classPrivateFieldSet(this, _YargsInstance_versionOpt, typeof opt === "string" ? opt : defaultVersionOpt, "f");
    msg = msg || __classPrivateFieldGet(this, _YargsInstance_usage, "f").deferY18nLookup("Show version number");
    __classPrivateFieldGet(this, _YargsInstance_usage, "f").version(ver || void 0);
    this.boolean(__classPrivateFieldGet(this, _YargsInstance_versionOpt, "f"));
    this.describe(__classPrivateFieldGet(this, _YargsInstance_versionOpt, "f"), msg);
    return this;
  }
  wrap(cols) {
    argsert("<number|null|undefined>", [cols], arguments.length);
    __classPrivateFieldGet(this, _YargsInstance_usage, "f").wrap(cols);
    return this;
  }
  [(_YargsInstance_command = /* @__PURE__ */ new WeakMap(), _YargsInstance_cwd = /* @__PURE__ */ new WeakMap(), _YargsInstance_context = /* @__PURE__ */ new WeakMap(), _YargsInstance_completion = /* @__PURE__ */ new WeakMap(), _YargsInstance_completionCommand = /* @__PURE__ */ new WeakMap(), _YargsInstance_defaultShowHiddenOpt = /* @__PURE__ */ new WeakMap(), _YargsInstance_exitError = /* @__PURE__ */ new WeakMap(), _YargsInstance_detectLocale = /* @__PURE__ */ new WeakMap(), _YargsInstance_emittedWarnings = /* @__PURE__ */ new WeakMap(), _YargsInstance_exitProcess = /* @__PURE__ */ new WeakMap(), _YargsInstance_frozens = /* @__PURE__ */ new WeakMap(), _YargsInstance_globalMiddleware = /* @__PURE__ */ new WeakMap(), _YargsInstance_groups = /* @__PURE__ */ new WeakMap(), _YargsInstance_hasOutput = /* @__PURE__ */ new WeakMap(), _YargsInstance_helpOpt = /* @__PURE__ */ new WeakMap(), _YargsInstance_isGlobalContext = /* @__PURE__ */ new WeakMap(), _YargsInstance_logger = /* @__PURE__ */ new WeakMap(), _YargsInstance_output = /* @__PURE__ */ new WeakMap(), _YargsInstance_options = /* @__PURE__ */ new WeakMap(), _YargsInstance_parentRequire = /* @__PURE__ */ new WeakMap(), _YargsInstance_parserConfig = /* @__PURE__ */ new WeakMap(), _YargsInstance_parseFn = /* @__PURE__ */ new WeakMap(), _YargsInstance_parseContext = /* @__PURE__ */ new WeakMap(), _YargsInstance_pkgs = /* @__PURE__ */ new WeakMap(), _YargsInstance_preservedGroups = /* @__PURE__ */ new WeakMap(), _YargsInstance_processArgs = /* @__PURE__ */ new WeakMap(), _YargsInstance_recommendCommands = /* @__PURE__ */ new WeakMap(), _YargsInstance_shim = /* @__PURE__ */ new WeakMap(), _YargsInstance_strict = /* @__PURE__ */ new WeakMap(), _YargsInstance_strictCommands = /* @__PURE__ */ new WeakMap(), _YargsInstance_strictOptions = /* @__PURE__ */ new WeakMap(), _YargsInstance_usage = /* @__PURE__ */ new WeakMap(), _YargsInstance_usageConfig = /* @__PURE__ */ new WeakMap(), _YargsInstance_versionOpt = /* @__PURE__ */ new WeakMap(), _YargsInstance_validation = /* @__PURE__ */ new WeakMap(), kCopyDoubleDash)](argv2) {
    if (!argv2._ || !argv2["--"])
      return argv2;
    argv2._.push.apply(argv2._, argv2["--"]);
    try {
      delete argv2["--"];
    } catch (_err) {
    }
    return argv2;
  }
  [kCreateLogger]() {
    return {
      log: (...args) => {
        if (!this[kHasParseCallback]())
          console.log(...args);
        __classPrivateFieldSet(this, _YargsInstance_hasOutput, true, "f");
        if (__classPrivateFieldGet(this, _YargsInstance_output, "f").length)
          __classPrivateFieldSet(this, _YargsInstance_output, __classPrivateFieldGet(this, _YargsInstance_output, "f") + "\n", "f");
        __classPrivateFieldSet(this, _YargsInstance_output, __classPrivateFieldGet(this, _YargsInstance_output, "f") + args.join(" "), "f");
      },
      error: (...args) => {
        if (!this[kHasParseCallback]())
          console.error(...args);
        __classPrivateFieldSet(this, _YargsInstance_hasOutput, true, "f");
        if (__classPrivateFieldGet(this, _YargsInstance_output, "f").length)
          __classPrivateFieldSet(this, _YargsInstance_output, __classPrivateFieldGet(this, _YargsInstance_output, "f") + "\n", "f");
        __classPrivateFieldSet(this, _YargsInstance_output, __classPrivateFieldGet(this, _YargsInstance_output, "f") + args.join(" "), "f");
      }
    };
  }
  [kDeleteFromParserHintObject](optionKey) {
    objectKeys(__classPrivateFieldGet(this, _YargsInstance_options, "f")).forEach((hintKey) => {
      if (/* @__PURE__ */ ((key) => key === "configObjects")(hintKey))
        return;
      const hint = __classPrivateFieldGet(this, _YargsInstance_options, "f")[hintKey];
      if (Array.isArray(hint)) {
        if (hint.includes(optionKey))
          hint.splice(hint.indexOf(optionKey), 1);
      } else if (typeof hint === "object") {
        delete hint[optionKey];
      }
    });
    delete __classPrivateFieldGet(this, _YargsInstance_usage, "f").getDescriptions()[optionKey];
  }
  [kEmitWarning](warning, type, deduplicationId) {
    if (!__classPrivateFieldGet(this, _YargsInstance_emittedWarnings, "f")[deduplicationId]) {
      __classPrivateFieldGet(this, _YargsInstance_shim, "f").process.emitWarning(warning, type);
      __classPrivateFieldGet(this, _YargsInstance_emittedWarnings, "f")[deduplicationId] = true;
    }
  }
  [kFreeze]() {
    __classPrivateFieldGet(this, _YargsInstance_frozens, "f").push({
      options: __classPrivateFieldGet(this, _YargsInstance_options, "f"),
      configObjects: __classPrivateFieldGet(this, _YargsInstance_options, "f").configObjects.slice(0),
      exitProcess: __classPrivateFieldGet(this, _YargsInstance_exitProcess, "f"),
      groups: __classPrivateFieldGet(this, _YargsInstance_groups, "f"),
      strict: __classPrivateFieldGet(this, _YargsInstance_strict, "f"),
      strictCommands: __classPrivateFieldGet(this, _YargsInstance_strictCommands, "f"),
      strictOptions: __classPrivateFieldGet(this, _YargsInstance_strictOptions, "f"),
      completionCommand: __classPrivateFieldGet(this, _YargsInstance_completionCommand, "f"),
      output: __classPrivateFieldGet(this, _YargsInstance_output, "f"),
      exitError: __classPrivateFieldGet(this, _YargsInstance_exitError, "f"),
      hasOutput: __classPrivateFieldGet(this, _YargsInstance_hasOutput, "f"),
      parsed: this.parsed,
      parseFn: __classPrivateFieldGet(this, _YargsInstance_parseFn, "f"),
      parseContext: __classPrivateFieldGet(this, _YargsInstance_parseContext, "f")
    });
    __classPrivateFieldGet(this, _YargsInstance_usage, "f").freeze();
    __classPrivateFieldGet(this, _YargsInstance_validation, "f").freeze();
    __classPrivateFieldGet(this, _YargsInstance_command, "f").freeze();
    __classPrivateFieldGet(this, _YargsInstance_globalMiddleware, "f").freeze();
  }
  [kGetDollarZero]() {
    let $0 = "";
    let default$0;
    if (/\b(node|iojs|electron)(\.exe)?$/.test(__classPrivateFieldGet(this, _YargsInstance_shim, "f").process.argv()[0])) {
      default$0 = __classPrivateFieldGet(this, _YargsInstance_shim, "f").process.argv().slice(1, 2);
    } else {
      default$0 = __classPrivateFieldGet(this, _YargsInstance_shim, "f").process.argv().slice(0, 1);
    }
    $0 = default$0.map((x) => {
      const b2 = this[kRebase](__classPrivateFieldGet(this, _YargsInstance_cwd, "f"), x);
      return x.match(/^(\/|([a-zA-Z]:)?\\)/) && b2.length < x.length ? b2 : x;
    }).join(" ").trim();
    if (__classPrivateFieldGet(this, _YargsInstance_shim, "f").getEnv("_") && __classPrivateFieldGet(this, _YargsInstance_shim, "f").getProcessArgvBin() === __classPrivateFieldGet(this, _YargsInstance_shim, "f").getEnv("_")) {
      $0 = __classPrivateFieldGet(this, _YargsInstance_shim, "f").getEnv("_").replace(`${__classPrivateFieldGet(this, _YargsInstance_shim, "f").path.dirname(__classPrivateFieldGet(this, _YargsInstance_shim, "f").process.execPath())}/`, "");
    }
    return $0;
  }
  [kGetParserConfiguration]() {
    return __classPrivateFieldGet(this, _YargsInstance_parserConfig, "f");
  }
  [kGetUsageConfiguration]() {
    return __classPrivateFieldGet(this, _YargsInstance_usageConfig, "f");
  }
  [kGuessLocale]() {
    if (!__classPrivateFieldGet(this, _YargsInstance_detectLocale, "f"))
      return;
    const locale = __classPrivateFieldGet(this, _YargsInstance_shim, "f").getEnv("LC_ALL") || __classPrivateFieldGet(this, _YargsInstance_shim, "f").getEnv("LC_MESSAGES") || __classPrivateFieldGet(this, _YargsInstance_shim, "f").getEnv("LANG") || __classPrivateFieldGet(this, _YargsInstance_shim, "f").getEnv("LANGUAGE") || "en_US";
    this.locale(locale.replace(/[.:].*/, ""));
  }
  [kGuessVersion]() {
    const obj = this[kPkgUp]();
    return obj.version || "unknown";
  }
  [kParsePositionalNumbers](argv2) {
    const args = argv2["--"] ? argv2["--"] : argv2._;
    for (let i = 0, arg; (arg = args[i]) !== void 0; i++) {
      if (__classPrivateFieldGet(this, _YargsInstance_shim, "f").Parser.looksLikeNumber(arg) && Number.isSafeInteger(Math.floor(parseFloat(`${arg}`)))) {
        args[i] = Number(arg);
      }
    }
    return argv2;
  }
  [kPkgUp](rootPath) {
    const npath = rootPath || "*";
    if (__classPrivateFieldGet(this, _YargsInstance_pkgs, "f")[npath])
      return __classPrivateFieldGet(this, _YargsInstance_pkgs, "f")[npath];
    let obj = {};
    try {
      let startDir = rootPath || __classPrivateFieldGet(this, _YargsInstance_shim, "f").mainFilename;
      if (!rootPath && __classPrivateFieldGet(this, _YargsInstance_shim, "f").path.extname(startDir)) {
        startDir = __classPrivateFieldGet(this, _YargsInstance_shim, "f").path.dirname(startDir);
      }
      const pkgJsonPath = __classPrivateFieldGet(this, _YargsInstance_shim, "f").findUp(startDir, (dir, names) => {
        if (names.includes("package.json")) {
          return "package.json";
        } else {
          return void 0;
        }
      });
      assertNotStrictEqual(pkgJsonPath, void 0, __classPrivateFieldGet(this, _YargsInstance_shim, "f"));
      obj = JSON.parse(__classPrivateFieldGet(this, _YargsInstance_shim, "f").readFileSync(pkgJsonPath, "utf8"));
    } catch (_noop) {
    }
    __classPrivateFieldGet(this, _YargsInstance_pkgs, "f")[npath] = obj || {};
    return __classPrivateFieldGet(this, _YargsInstance_pkgs, "f")[npath];
  }
  [kPopulateParserHintArray](type, keys) {
    keys = [].concat(keys);
    keys.forEach((key) => {
      key = this[kSanitizeKey](key);
      __classPrivateFieldGet(this, _YargsInstance_options, "f")[type].push(key);
    });
  }
  [kPopulateParserHintSingleValueDictionary](builder, type, key, value2) {
    this[kPopulateParserHintDictionary](builder, type, key, value2, (type2, key2, value3) => {
      __classPrivateFieldGet(this, _YargsInstance_options, "f")[type2][key2] = value3;
    });
  }
  [kPopulateParserHintArrayDictionary](builder, type, key, value2) {
    this[kPopulateParserHintDictionary](builder, type, key, value2, (type2, key2, value3) => {
      __classPrivateFieldGet(this, _YargsInstance_options, "f")[type2][key2] = (__classPrivateFieldGet(this, _YargsInstance_options, "f")[type2][key2] || []).concat(value3);
    });
  }
  [kPopulateParserHintDictionary](builder, type, key, value2, singleKeyHandler) {
    if (Array.isArray(key)) {
      key.forEach((k2) => {
        builder(k2, value2);
      });
    } else if (/* @__PURE__ */ ((key2) => typeof key2 === "object")(key)) {
      for (const k2 of objectKeys(key)) {
        builder(k2, key[k2]);
      }
    } else {
      singleKeyHandler(type, this[kSanitizeKey](key), value2);
    }
  }
  [kSanitizeKey](key) {
    if (key === "__proto__")
      return "___proto___";
    return key;
  }
  [kSetKey](key, set) {
    this[kPopulateParserHintSingleValueDictionary](this[kSetKey].bind(this), "key", key, set);
    return this;
  }
  [kUnfreeze]() {
    var _a2, _b2, _c2, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const frozen = __classPrivateFieldGet(this, _YargsInstance_frozens, "f").pop();
    assertNotStrictEqual(frozen, void 0, __classPrivateFieldGet(this, _YargsInstance_shim, "f"));
    let configObjects;
    _a2 = this, _b2 = this, _c2 = this, _d = this, _e = this, _f = this, _g = this, _h = this, _j = this, _k = this, _l = this, _m = this, {
      options: { set value(_o) {
        __classPrivateFieldSet(_a2, _YargsInstance_options, _o, "f");
      } }.value,
      configObjects,
      exitProcess: { set value(_o) {
        __classPrivateFieldSet(_b2, _YargsInstance_exitProcess, _o, "f");
      } }.value,
      groups: { set value(_o) {
        __classPrivateFieldSet(_c2, _YargsInstance_groups, _o, "f");
      } }.value,
      output: { set value(_o) {
        __classPrivateFieldSet(_d, _YargsInstance_output, _o, "f");
      } }.value,
      exitError: { set value(_o) {
        __classPrivateFieldSet(_e, _YargsInstance_exitError, _o, "f");
      } }.value,
      hasOutput: { set value(_o) {
        __classPrivateFieldSet(_f, _YargsInstance_hasOutput, _o, "f");
      } }.value,
      parsed: this.parsed,
      strict: { set value(_o) {
        __classPrivateFieldSet(_g, _YargsInstance_strict, _o, "f");
      } }.value,
      strictCommands: { set value(_o) {
        __classPrivateFieldSet(_h, _YargsInstance_strictCommands, _o, "f");
      } }.value,
      strictOptions: { set value(_o) {
        __classPrivateFieldSet(_j, _YargsInstance_strictOptions, _o, "f");
      } }.value,
      completionCommand: { set value(_o) {
        __classPrivateFieldSet(_k, _YargsInstance_completionCommand, _o, "f");
      } }.value,
      parseFn: { set value(_o) {
        __classPrivateFieldSet(_l, _YargsInstance_parseFn, _o, "f");
      } }.value,
      parseContext: { set value(_o) {
        __classPrivateFieldSet(_m, _YargsInstance_parseContext, _o, "f");
      } }.value
    } = frozen;
    __classPrivateFieldGet(this, _YargsInstance_options, "f").configObjects = configObjects;
    __classPrivateFieldGet(this, _YargsInstance_usage, "f").unfreeze();
    __classPrivateFieldGet(this, _YargsInstance_validation, "f").unfreeze();
    __classPrivateFieldGet(this, _YargsInstance_command, "f").unfreeze();
    __classPrivateFieldGet(this, _YargsInstance_globalMiddleware, "f").unfreeze();
  }
  [kValidateAsync](validation2, argv2) {
    return maybeAsyncResult(argv2, (result) => {
      validation2(result);
      return result;
    });
  }
  getInternalMethods() {
    return {
      getCommandInstance: this[kGetCommandInstance].bind(this),
      getContext: this[kGetContext].bind(this),
      getHasOutput: this[kGetHasOutput].bind(this),
      getLoggerInstance: this[kGetLoggerInstance].bind(this),
      getParseContext: this[kGetParseContext].bind(this),
      getParserConfiguration: this[kGetParserConfiguration].bind(this),
      getUsageConfiguration: this[kGetUsageConfiguration].bind(this),
      getUsageInstance: this[kGetUsageInstance].bind(this),
      getValidationInstance: this[kGetValidationInstance].bind(this),
      hasParseCallback: this[kHasParseCallback].bind(this),
      isGlobalContext: this[kIsGlobalContext].bind(this),
      postProcess: this[kPostProcess].bind(this),
      reset: this[kReset].bind(this),
      runValidation: this[kRunValidation].bind(this),
      runYargsParserAndExecuteCommands: this[kRunYargsParserAndExecuteCommands].bind(this),
      setHasOutput: this[kSetHasOutput].bind(this)
    };
  }
  [kGetCommandInstance]() {
    return __classPrivateFieldGet(this, _YargsInstance_command, "f");
  }
  [kGetContext]() {
    return __classPrivateFieldGet(this, _YargsInstance_context, "f");
  }
  [kGetHasOutput]() {
    return __classPrivateFieldGet(this, _YargsInstance_hasOutput, "f");
  }
  [kGetLoggerInstance]() {
    return __classPrivateFieldGet(this, _YargsInstance_logger, "f");
  }
  [kGetParseContext]() {
    return __classPrivateFieldGet(this, _YargsInstance_parseContext, "f") || {};
  }
  [kGetUsageInstance]() {
    return __classPrivateFieldGet(this, _YargsInstance_usage, "f");
  }
  [kGetValidationInstance]() {
    return __classPrivateFieldGet(this, _YargsInstance_validation, "f");
  }
  [kHasParseCallback]() {
    return !!__classPrivateFieldGet(this, _YargsInstance_parseFn, "f");
  }
  [kIsGlobalContext]() {
    return __classPrivateFieldGet(this, _YargsInstance_isGlobalContext, "f");
  }
  [kPostProcess](argv2, populateDoubleDash, calledFromCommand, runGlobalMiddleware) {
    if (calledFromCommand)
      return argv2;
    if (isPromise(argv2))
      return argv2;
    if (!populateDoubleDash) {
      argv2 = this[kCopyDoubleDash](argv2);
    }
    const parsePositionalNumbers = this[kGetParserConfiguration]()["parse-positional-numbers"] || this[kGetParserConfiguration]()["parse-positional-numbers"] === void 0;
    if (parsePositionalNumbers) {
      argv2 = this[kParsePositionalNumbers](argv2);
    }
    if (runGlobalMiddleware) {
      argv2 = applyMiddleware(argv2, this, __classPrivateFieldGet(this, _YargsInstance_globalMiddleware, "f").getMiddleware(), false);
    }
    return argv2;
  }
  [kReset](aliases = {}) {
    __classPrivateFieldSet(this, _YargsInstance_options, __classPrivateFieldGet(this, _YargsInstance_options, "f") || {}, "f");
    const tmpOptions = {};
    tmpOptions.local = __classPrivateFieldGet(this, _YargsInstance_options, "f").local || [];
    tmpOptions.configObjects = __classPrivateFieldGet(this, _YargsInstance_options, "f").configObjects || [];
    const localLookup = {};
    tmpOptions.local.forEach((l2) => {
      localLookup[l2] = true;
      (aliases[l2] || []).forEach((a2) => {
        localLookup[a2] = true;
      });
    });
    Object.assign(__classPrivateFieldGet(this, _YargsInstance_preservedGroups, "f"), Object.keys(__classPrivateFieldGet(this, _YargsInstance_groups, "f")).reduce((acc, groupName) => {
      const keys = __classPrivateFieldGet(this, _YargsInstance_groups, "f")[groupName].filter((key) => !(key in localLookup));
      if (keys.length > 0) {
        acc[groupName] = keys;
      }
      return acc;
    }, {}));
    __classPrivateFieldSet(this, _YargsInstance_groups, {}, "f");
    const arrayOptions = [
      "array",
      "boolean",
      "string",
      "skipValidation",
      "count",
      "normalize",
      "number",
      "hiddenOptions"
    ];
    const objectOptions = [
      "narg",
      "key",
      "alias",
      "default",
      "defaultDescription",
      "config",
      "choices",
      "demandedOptions",
      "demandedCommands",
      "deprecatedOptions"
    ];
    arrayOptions.forEach((k2) => {
      tmpOptions[k2] = (__classPrivateFieldGet(this, _YargsInstance_options, "f")[k2] || []).filter((k3) => !localLookup[k3]);
    });
    objectOptions.forEach((k2) => {
      tmpOptions[k2] = objFilter(__classPrivateFieldGet(this, _YargsInstance_options, "f")[k2], (k3) => !localLookup[k3]);
    });
    tmpOptions.envPrefix = __classPrivateFieldGet(this, _YargsInstance_options, "f").envPrefix;
    __classPrivateFieldSet(this, _YargsInstance_options, tmpOptions, "f");
    __classPrivateFieldSet(this, _YargsInstance_usage, __classPrivateFieldGet(this, _YargsInstance_usage, "f") ? __classPrivateFieldGet(this, _YargsInstance_usage, "f").reset(localLookup) : usage(this, __classPrivateFieldGet(this, _YargsInstance_shim, "f")), "f");
    __classPrivateFieldSet(this, _YargsInstance_validation, __classPrivateFieldGet(this, _YargsInstance_validation, "f") ? __classPrivateFieldGet(this, _YargsInstance_validation, "f").reset(localLookup) : validation(this, __classPrivateFieldGet(this, _YargsInstance_usage, "f"), __classPrivateFieldGet(this, _YargsInstance_shim, "f")), "f");
    __classPrivateFieldSet(this, _YargsInstance_command, __classPrivateFieldGet(this, _YargsInstance_command, "f") ? __classPrivateFieldGet(this, _YargsInstance_command, "f").reset() : command(__classPrivateFieldGet(this, _YargsInstance_usage, "f"), __classPrivateFieldGet(this, _YargsInstance_validation, "f"), __classPrivateFieldGet(this, _YargsInstance_globalMiddleware, "f"), __classPrivateFieldGet(this, _YargsInstance_shim, "f")), "f");
    if (!__classPrivateFieldGet(this, _YargsInstance_completion, "f"))
      __classPrivateFieldSet(this, _YargsInstance_completion, completion(this, __classPrivateFieldGet(this, _YargsInstance_usage, "f"), __classPrivateFieldGet(this, _YargsInstance_command, "f"), __classPrivateFieldGet(this, _YargsInstance_shim, "f")), "f");
    __classPrivateFieldGet(this, _YargsInstance_globalMiddleware, "f").reset();
    __classPrivateFieldSet(this, _YargsInstance_completionCommand, null, "f");
    __classPrivateFieldSet(this, _YargsInstance_output, "", "f");
    __classPrivateFieldSet(this, _YargsInstance_exitError, null, "f");
    __classPrivateFieldSet(this, _YargsInstance_hasOutput, false, "f");
    this.parsed = false;
    return this;
  }
  [kRebase](base, dir) {
    return __classPrivateFieldGet(this, _YargsInstance_shim, "f").path.relative(base, dir);
  }
  [kRunYargsParserAndExecuteCommands](args, shortCircuit, calledFromCommand, commandIndex = 0, helpOnly = false) {
    let skipValidation = !!calledFromCommand || helpOnly;
    args = args || __classPrivateFieldGet(this, _YargsInstance_processArgs, "f");
    __classPrivateFieldGet(this, _YargsInstance_options, "f").__ = __classPrivateFieldGet(this, _YargsInstance_shim, "f").y18n.__;
    __classPrivateFieldGet(this, _YargsInstance_options, "f").configuration = this[kGetParserConfiguration]();
    const populateDoubleDash = !!__classPrivateFieldGet(this, _YargsInstance_options, "f").configuration["populate--"];
    const config = Object.assign({}, __classPrivateFieldGet(this, _YargsInstance_options, "f").configuration, {
      "populate--": true
    });
    const parsed = __classPrivateFieldGet(this, _YargsInstance_shim, "f").Parser.detailed(args, Object.assign({}, __classPrivateFieldGet(this, _YargsInstance_options, "f"), {
      configuration: { "parse-positional-numbers": false, ...config }
    }));
    const argv2 = Object.assign(parsed.argv, __classPrivateFieldGet(this, _YargsInstance_parseContext, "f"));
    let argvPromise = void 0;
    const aliases = parsed.aliases;
    let helpOptSet = false;
    let versionOptSet = false;
    Object.keys(argv2).forEach((key) => {
      if (key === __classPrivateFieldGet(this, _YargsInstance_helpOpt, "f") && argv2[key]) {
        helpOptSet = true;
      } else if (key === __classPrivateFieldGet(this, _YargsInstance_versionOpt, "f") && argv2[key]) {
        versionOptSet = true;
      }
    });
    argv2.$0 = this.$0;
    this.parsed = parsed;
    if (commandIndex === 0) {
      __classPrivateFieldGet(this, _YargsInstance_usage, "f").clearCachedHelpMessage();
    }
    try {
      this[kGuessLocale]();
      if (shortCircuit) {
        return this[kPostProcess](argv2, populateDoubleDash, !!calledFromCommand, false);
      }
      if (__classPrivateFieldGet(this, _YargsInstance_helpOpt, "f")) {
        const helpCmds = [__classPrivateFieldGet(this, _YargsInstance_helpOpt, "f")].concat(aliases[__classPrivateFieldGet(this, _YargsInstance_helpOpt, "f")] || []).filter((k2) => k2.length > 1);
        if (helpCmds.includes("" + argv2._[argv2._.length - 1])) {
          argv2._.pop();
          helpOptSet = true;
        }
      }
      __classPrivateFieldSet(this, _YargsInstance_isGlobalContext, false, "f");
      const handlerKeys = __classPrivateFieldGet(this, _YargsInstance_command, "f").getCommands();
      const requestCompletions = __classPrivateFieldGet(this, _YargsInstance_completion, "f").completionKey in argv2;
      const skipRecommendation = helpOptSet || requestCompletions || helpOnly;
      if (argv2._.length) {
        if (handlerKeys.length) {
          let firstUnknownCommand;
          for (let i = commandIndex || 0, cmd; argv2._[i] !== void 0; i++) {
            cmd = String(argv2._[i]);
            if (handlerKeys.includes(cmd) && cmd !== __classPrivateFieldGet(this, _YargsInstance_completionCommand, "f")) {
              const innerArgv = __classPrivateFieldGet(this, _YargsInstance_command, "f").runCommand(cmd, this, parsed, i + 1, helpOnly, helpOptSet || versionOptSet || helpOnly);
              return this[kPostProcess](innerArgv, populateDoubleDash, !!calledFromCommand, false);
            } else if (!firstUnknownCommand && cmd !== __classPrivateFieldGet(this, _YargsInstance_completionCommand, "f")) {
              firstUnknownCommand = cmd;
              break;
            }
          }
          if (!__classPrivateFieldGet(this, _YargsInstance_command, "f").hasDefaultCommand() && __classPrivateFieldGet(this, _YargsInstance_recommendCommands, "f") && firstUnknownCommand && !skipRecommendation) {
            __classPrivateFieldGet(this, _YargsInstance_validation, "f").recommendCommands(firstUnknownCommand, handlerKeys);
          }
        }
        if (__classPrivateFieldGet(this, _YargsInstance_completionCommand, "f") && argv2._.includes(__classPrivateFieldGet(this, _YargsInstance_completionCommand, "f")) && !requestCompletions) {
          if (__classPrivateFieldGet(this, _YargsInstance_exitProcess, "f"))
            setBlocking(true);
          this.showCompletionScript();
          this.exit(0);
        }
      }
      if (__classPrivateFieldGet(this, _YargsInstance_command, "f").hasDefaultCommand() && !skipRecommendation) {
        const innerArgv = __classPrivateFieldGet(this, _YargsInstance_command, "f").runCommand(null, this, parsed, 0, helpOnly, helpOptSet || versionOptSet || helpOnly);
        return this[kPostProcess](innerArgv, populateDoubleDash, !!calledFromCommand, false);
      }
      if (requestCompletions) {
        if (__classPrivateFieldGet(this, _YargsInstance_exitProcess, "f"))
          setBlocking(true);
        args = [].concat(args);
        const completionArgs = args.slice(args.indexOf(`--${__classPrivateFieldGet(this, _YargsInstance_completion, "f").completionKey}`) + 1);
        __classPrivateFieldGet(this, _YargsInstance_completion, "f").getCompletion(completionArgs, (err, completions) => {
          if (err)
            throw new YError(err.message);
          (completions || []).forEach((completion2) => {
            __classPrivateFieldGet(this, _YargsInstance_logger, "f").log(completion2);
          });
          this.exit(0);
        });
        return this[kPostProcess](argv2, !populateDoubleDash, !!calledFromCommand, false);
      }
      if (!__classPrivateFieldGet(this, _YargsInstance_hasOutput, "f")) {
        if (helpOptSet) {
          if (__classPrivateFieldGet(this, _YargsInstance_exitProcess, "f"))
            setBlocking(true);
          skipValidation = true;
          this.showHelp("log");
          this.exit(0);
        } else if (versionOptSet) {
          if (__classPrivateFieldGet(this, _YargsInstance_exitProcess, "f"))
            setBlocking(true);
          skipValidation = true;
          __classPrivateFieldGet(this, _YargsInstance_usage, "f").showVersion("log");
          this.exit(0);
        }
      }
      if (!skipValidation && __classPrivateFieldGet(this, _YargsInstance_options, "f").skipValidation.length > 0) {
        skipValidation = Object.keys(argv2).some((key) => __classPrivateFieldGet(this, _YargsInstance_options, "f").skipValidation.indexOf(key) >= 0 && argv2[key] === true);
      }
      if (!skipValidation) {
        if (parsed.error)
          throw new YError(parsed.error.message);
        if (!requestCompletions) {
          const validation2 = this[kRunValidation](aliases, {}, parsed.error);
          if (!calledFromCommand) {
            argvPromise = applyMiddleware(argv2, this, __classPrivateFieldGet(this, _YargsInstance_globalMiddleware, "f").getMiddleware(), true);
          }
          argvPromise = this[kValidateAsync](validation2, argvPromise !== null && argvPromise !== void 0 ? argvPromise : argv2);
          if (isPromise(argvPromise) && !calledFromCommand) {
            argvPromise = argvPromise.then(() => {
              return applyMiddleware(argv2, this, __classPrivateFieldGet(this, _YargsInstance_globalMiddleware, "f").getMiddleware(), false);
            });
          }
        }
      }
    } catch (err) {
      if (err instanceof YError)
        __classPrivateFieldGet(this, _YargsInstance_usage, "f").fail(err.message, err);
      else
        throw err;
    }
    return this[kPostProcess](argvPromise !== null && argvPromise !== void 0 ? argvPromise : argv2, populateDoubleDash, !!calledFromCommand, true);
  }
  [kRunValidation](aliases, positionalMap, parseErrors, isDefaultCommand) {
    const demandedOptions = { ...this.getDemandedOptions() };
    return (argv2) => {
      if (parseErrors)
        throw new YError(parseErrors.message);
      __classPrivateFieldGet(this, _YargsInstance_validation, "f").nonOptionCount(argv2);
      __classPrivateFieldGet(this, _YargsInstance_validation, "f").requiredArguments(argv2, demandedOptions);
      let failedStrictCommands = false;
      if (__classPrivateFieldGet(this, _YargsInstance_strictCommands, "f")) {
        failedStrictCommands = __classPrivateFieldGet(this, _YargsInstance_validation, "f").unknownCommands(argv2);
      }
      if (__classPrivateFieldGet(this, _YargsInstance_strict, "f") && !failedStrictCommands) {
        __classPrivateFieldGet(this, _YargsInstance_validation, "f").unknownArguments(argv2, aliases, positionalMap, !!isDefaultCommand);
      } else if (__classPrivateFieldGet(this, _YargsInstance_strictOptions, "f")) {
        __classPrivateFieldGet(this, _YargsInstance_validation, "f").unknownArguments(argv2, aliases, {}, false, false);
      }
      __classPrivateFieldGet(this, _YargsInstance_validation, "f").limitedChoices(argv2);
      __classPrivateFieldGet(this, _YargsInstance_validation, "f").implications(argv2);
      __classPrivateFieldGet(this, _YargsInstance_validation, "f").conflicting(argv2);
    };
  }
  [kSetHasOutput]() {
    __classPrivateFieldSet(this, _YargsInstance_hasOutput, true, "f");
  }
  [kTrackManuallySetKeys](keys) {
    if (typeof keys === "string") {
      __classPrivateFieldGet(this, _YargsInstance_options, "f").key[keys] = true;
    } else {
      for (const k2 of keys) {
        __classPrivateFieldGet(this, _YargsInstance_options, "f").key[k2] = true;
      }
    }
  }
};
function isYargsInstance(y) {
  return !!y && typeof y.getInternalMethods === "function";
}

// node_modules/yargs/index.mjs
var Yargs = YargsFactory(esm_default);
var yargs_default = Yargs;

// src/constants/constants.ts
var import_path5 = __toESM(require("path"));
var import_process = require("process");
var PLANET = "earth";
var URL_PREFIX = `https://kh.google.com/rt/${PLANET}/`;
var MAX_OCTANT_LEVEL = 21;
var DL_DIR = import_path5.default.resolve((0, import_process.cwd)(), "downloaded_files");
var OBJ_DIR = import_path5.default.resolve(DL_DIR, "obj");
var SCALE = 10;

// src/utils/convert-lat-long-to-octant.ts
var OctantConverter = class {
  constructor(utils3) {
    this.currentLat = 0;
    this.currentLon = 0;
    this.utils = utils3;
  }
  /**
   * Получает первый октант на основе координат
   * @param lat - Широта (-90 до 90)
   * @param lon - Долгота (-180 до 180)
   * @returns Массив с кодом октанта и границами
   */
  getFirstOctant(lat, lon) {
    if (lat < 0) {
      if (lon < -90) return ["02", { n: 0, s: -90, w: -180, e: -90 }];
      if (lon < 0) return ["03", { n: 0, s: -90, w: -90, e: 0 }];
      if (lon < 90) return ["12", { n: 0, s: -90, w: 0, e: 90 }];
      return ["13", { n: 0, s: -90, w: 90, e: 180 }];
    }
    if (lat >= 0) {
      if (lon < -90) return ["20", { n: 90, s: 0, w: -180, e: -90 }];
      if (lon < 0) return ["21", { n: 90, s: 0, w: -90, e: 0 }];
      if (lon < 90) return ["30", { n: 90, s: 0, w: 0, e: 90 }];
      return ["31", { n: 90, s: 0, w: 90, e: 180 }];
    }
    throw new Error(`Invalid latitude and longitude: ${lat}, ${lon}`);
  }
  /**
   * Вычисляет следующий октант на основе текущих границ и координат
   * @param box - Текущие границы октанта
   * @param lat - Широта
   * @param lon - Долгота
   * @returns Массив с ключом октанта и новыми границами
   */
  getNextOctant(box, lat, lon) {
    let { n: n2, s, w: w2, e: e2 } = box;
    const midLat = (n2 + s) / 2;
    const midLon = (w2 + e2) / 2;
    let key = 0;
    if (lat < midLat) {
      n2 = midLat;
    } else {
      s = midLat;
      key += 2;
    }
    if (n2 === 90 || s === -90) {
    } else if (lon < midLon) {
      e2 = midLon;
    } else {
      w2 = midLon;
      key += 1;
    }
    return [key, { n: n2, s, w: w2, e: e2 }];
  }
  /**
   * Проверяет, пересекается ли октант с bbox
   * @param octantBox - Границы октанта
   * @param bbox - BBox для проверки
   * @returns true если октант пересекается с bbox
   */
  isOctantIntersectsBBox(octantBox, bbox) {
    const { northEast, southWest } = bbox;
    const latIntersects = octantBox.n >= southWest.lat && octantBox.s <= northEast.lat;
    const lonIntersects = octantBox.e >= southWest.lon && octantBox.w <= northEast.lon;
    return latIntersects && lonIntersects;
  }
  /**
   * Проверяет, полностью ли октант находится внутри bbox
   * @param octantBox - Границы октанта
   * @param bbox - BBox для проверки
   * @returns true если октант полностью внутри bbox
   */
  isOctantInsideBBox(octantBox, bbox) {
    const { northEast, southWest } = bbox;
    return octantBox.n <= northEast.lat && octantBox.s >= southWest.lat && octantBox.e <= northEast.lon && octantBox.w >= southWest.lon;
  }
  /**
   * Проверяет валидность координат
   * @param lat - Широта
   * @param lon - Долгота
   * @throws Error если координаты невалидны
   */
  validateCoordinates(lat, lon) {
    if (isNaN(lat) || !(-90 <= lat && lat <= 90)) {
      throw new Error(`Invalid latitude: ${lat}`);
    }
    if (isNaN(lon) || !(-180 <= lon && lon <= 180)) {
      throw new Error(`Invalid longitude: ${lon}`);
    }
  }
  /**
   * Проверяет валидность bbox
   * @param bbox - BBox для проверки
   * @throws Error если bbox невалиден
   */
  validateBBox(bbox) {
    const { northEast, southWest } = bbox;
    this.validateCoordinates(northEast.lat, northEast.lon);
    this.validateCoordinates(southWest.lat, southWest.lon);
    if (northEast.lat <= southWest.lat) {
      throw new Error("Invalid bbox: northEast.lat must be greater than southWest.lat");
    }
    if (northEast.lon <= southWest.lon) {
      throw new Error("Invalid bbox: northEast.lon must be greater than southWest.lon");
    }
  }
  /**
   * Инициализирует данные планеты
   */
  async initializePlanetoid() {
    if (!this.planetoid) {
      this.planetoid = await this.utils.getPlanetoid();
      this.rootEpoch = this.planetoid.bulkMetadataEpoch[0];
    }
  }
  /**
   * Проверяет существование узла по пути
   * @param nodePath - Путь к узлу
   * @returns Существует ли узел
   */
  async checkNodePath(nodePath) {
    let bulk = null;
    let index = -1;
    for (let epoch = this.rootEpoch, i = 4; i < nodePath.length + 4; i += 4) {
      const bulkPath = nodePath.substring(0, i - 4);
      const subPath = nodePath.substring(0, i);
      if (bulk) {
        const idx = this.utils.bulk.getIndexByPath(bulk, bulkPath);
        if (this.utils.bulk.hasBulkMetadataAtIndex(bulk, idx)) return false;
      }
      const nextBulk = await this.utils.getBulk(bulkPath, epoch);
      bulk = nextBulk;
      index = this.utils.bulk.getIndexByPath(bulk, subPath);
      epoch = bulk.bulkMetadataEpoch[index];
    }
    return index >= 0;
  }
  /**
   * Рекурсивно ищет октанты для bbox
   * @param nodePath - Текущий путь узла
   * @param box - Границы текущего октанта
   * @param maxLevel - Максимальный уровень глубины
   * @param foundOctants - Объект для накопления найденных октантов
   * @param bbox - BBox для поиска
   */
  async searchBBox(nodePath, box, maxLevel, foundOctants, bbox) {
    if (nodePath.length > maxLevel) return;
    if (!this.isOctantIntersectsBBox(box, bbox)) return;
    try {
      const nodeExisted = await this.checkNodePath(nodePath);
      if (!nodeExisted) return;
      const octantLevel = nodePath.length;
      if (!(octantLevel in foundOctants)) {
        foundOctants[octantLevel] = {
          octants: [],
          box
        };
      } else {
        const knownBox = foundOctants[octantLevel].box;
        if (knownBox.n !== box.n || knownBox.s !== box.s || knownBox.w !== box.w || knownBox.e !== box.e) {
          throw new Error("Different box ranges of octants, should not happen");
        }
      }
      foundOctants[octantLevel].octants.push(nodePath);
      if (this.isOctantInsideBBox(box, bbox)) {
        for (let i = 0; i < 4; i++) {
          const [key, nextBox] = this.getNextOctant(
            box,
            box.n - (box.n - box.s) * 0.25,
            box.w + (box.e - box.w) * 0.25
          );
          await this.searchBBox(nodePath + (key + i), nextBox, maxLevel, foundOctants, bbox);
        }
      } else {
        const midLat = (box.n + box.s) / 2;
        const midLon = (box.w + box.e) / 2;
        const subOctants = [
          { key: 0, subBox: { n: midLat, s: box.s, w: box.w, e: midLon } },
          // юго-запад
          { key: 1, subBox: { n: midLat, s: box.s, w: midLon, e: box.e } },
          // юго-восток
          { key: 2, subBox: { n: box.n, s: midLat, w: box.w, e: midLon } },
          // северо-запад
          { key: 3, subBox: { n: box.n, s: midLat, w: midLon, e: box.e } }
          // северо-восток
        ];
        for (const subOctant of subOctants) {
          if (this.isOctantIntersectsBBox(subOctant.subBox, bbox)) {
            await this.searchBBox(nodePath + subOctant.key, subOctant.subBox, maxLevel, foundOctants, bbox);
          }
        }
      }
    } catch (ex) {
      console.error("Error in searchBBox:", ex);
      return;
    }
  }
  /**
   * Рекурсивно ищет октанты
   * @param nodePath - Текущий путь узла
   * @param box - Границы текущего октанта
   * @param maxLevel - Максимальный уровень глубины
   * @param foundOctants - Объект для накопления найденных октантов
   */
  async search(nodePath, box, maxLevel, foundOctants) {
    if (nodePath.length > maxLevel) return;
    try {
      const nodeExisted = await this.checkNodePath(nodePath);
      if (!nodeExisted) return;
      const octantLevel = nodePath.length;
      if (!(octantLevel in foundOctants)) {
        foundOctants[octantLevel] = {
          octants: [],
          box
        };
      } else {
        const knownBox = foundOctants[octantLevel].box;
        if (knownBox.n !== box.n || knownBox.s !== box.s || knownBox.w !== box.w || knownBox.e !== box.e) {
          throw new Error("Different box ranges of octants, should not happen");
        }
      }
      foundOctants[octantLevel].octants.push(nodePath);
      const [nextKey, nextBox] = this.getNextOctant(box, this.currentLat, this.currentLon);
      await this.search(nodePath + nextKey, nextBox, maxLevel, foundOctants);
      await this.search(nodePath + (nextKey + 4), nextBox, maxLevel, foundOctants);
    } catch (ex) {
      console.error("Error in search:", ex);
      return;
    }
  }
  /**
   * Convert bbox (selected square on map) to octants
   * @param bbox - выделенная зона на карте
   * @param maxLevel - уровень детализации
   */
  async convertBBoxToOctants(bbox, maxLevel) {
    this.validateBBox(bbox);
    await this.initializePlanetoid();
    const foundOctants = {};
    const { northEast, southWest } = bbox;
    const octantSize = 1e-4;
    const latStep = octantSize;
    const lonStep = octantSize;
    for (let lat = southWest.lat; lat <= northEast.lat; lat += latStep) {
      for (let lon = southWest.lon; lon <= northEast.lon; lon += lonStep) {
        try {
          const pointOctants = await this.convertLatLongToOctant(lat, lon, maxLevel);
          for (const [level, levelData] of Object.entries(pointOctants)) {
            const levelNum = parseInt(level);
            if (!(levelNum in foundOctants)) {
              foundOctants[levelNum] = {
                octants: [],
                box: levelData.box
              };
            }
            for (const octant of levelData.octants) {
              if (!foundOctants[levelNum].octants.includes(octant)) {
                foundOctants[levelNum].octants.push(octant);
              }
            }
          }
        } catch (error) {
          console.error(`Error processing point ${lat}, ${lon}:`, error);
        }
      }
    }
    return foundOctants;
  }
  /**
   * Конвертирует координаты широты и долготы в октанты
   * @param lat - Широта (-90 до 90)
   * @param lon - Долгота (-180 до 180)
   * @param maxLevel - Максимальный уровень глубины октантов
   * @returns Объект с найденными октантами по уровням
   */
  async convertLatLongToOctant(lat, lon, maxLevel) {
    this.validateCoordinates(lat, lon);
    await this.initializePlanetoid();
    this.currentLat = lat;
    this.currentLon = lon;
    const foundOctants = {};
    const [nodePath, latLonBox] = this.getFirstOctant(lat, lon);
    await this.search(nodePath, latLonBox, maxLevel, foundOctants);
    return foundOctants;
  }
};

// src/coordinates-to-octants.ts
var import_utils = __toESM(require_utils3());
var utils = (0, import_utils.default)({
  URL_PREFIX,
  DUMP_JSON_DIR: null,
  DUMP_RAW_DIR: null,
  DUMP_JSON: false,
  DUMP_RAW: false
});
var converter = new OctantConverter(utils);
var CoordinatesToOctants = class {
  static async convert(latitude, longitude) {
    return await converter.convertLatLongToOctant(latitude, longitude, MAX_OCTANT_LEVEL);
  }
  static async convertBbox(bbox, maxLevel) {
    const serializedBbox = {
      northEast: { lat: bbox[0].latitude, lon: bbox[0].longitude },
      southWest: { lat: bbox[1].latitude, lon: bbox[1].longitude }
    };
    return await converter.convertBBoxToOctants(serializedBbox, maxLevel);
  }
};

// src/dump-obj.ts
var import_fs_extra = __toESM(require_lib());
var import_path6 = __toESM(require("path"));
var import_decode_texture = __toESM(require_decode_texture());
var import_utils2 = __toESM(require_utils3());
var [DUMP_OBJ_DIR, DUMP_JSON_DIR, DUMP_RAW_DIR] = ["obj", "json", "raw"].map((x) => import_path6.default.join(DL_DIR, x));
console.log({ DUMP_OBJ_DIR, DUMP_JSON_DIR, DUMP_RAW_DIR });
var DUMP_OBJ = true;
var PARALLEL_SEARCH = true;
var utils2 = (0, import_utils2.default)({
  URL_PREFIX,
  DUMP_JSON_DIR,
  DUMP_RAW_DIR,
  DUMP_JSON: false,
  DUMP_RAW: false
});
var {
  getPlanetoid,
  getBulk,
  getNode,
  bulk: { getIndexByPath, hasBulkMetadataAtIndex, hasNodeAtIndex }
} = utils2;
var Semaphore = class {
  constructor(num) {
    this.waiting = [];
    this.concurrent = num;
  }
  async wait(highestPriority = false) {
    return new Promise((resolve5, reject) => {
      if (this.concurrent <= 0) {
        if (highestPriority) {
          this.waiting.splice(0, 0, { resolve: resolve5, reject });
        } else {
          this.waiting.push({ resolve: resolve5, reject });
        }
      } else {
        this.concurrent--;
        resolve5();
      }
    });
  }
  signal() {
    this.concurrent++;
    if (this.concurrent > 0 && this.waiting.length > 0) {
      this.concurrent--;
      this.waiting.splice(0, 1)[0].resolve();
    }
  }
};
var ObjWriter = class _ObjWriter {
  constructor(dir) {
    // Guards against a node being written more than once. Two coincident
    // copies of a mesh z-fight, which looks like corruption rather than like
    // duplication, so it is worth refusing outright.
    this.written = /* @__PURE__ */ new Set();
    this.ctx = this.initCtxOBJ(dir);
  }
  static {
    this.texturesFailed = 0;
  }
  initCtxOBJ(dir) {
    import_fs_extra.default.writeFileSync(import_path6.default.join(dir, "model.obj"), `mtllib model.mtl
`);
    return { objDir: dir, c_v: 0, c_n: 0, c_u: 0 };
  }
  writeNode(node, nodeName, exclude) {
    if (this.written.has(nodeName)) {
      console.error(`MRF_DIAG duplicate-node ${nodeName} skipped`);
      return;
    }
    this.written.add(nodeName);
    for (const [meshIndex, mesh] of Object.entries(node.meshes)) {
      const meshName = `${nodeName}_${meshIndex}`;
      const tex = mesh.texture;
      const texName = `tex_${nodeName}_${meshIndex}`;
      let decoded = null;
      try {
        decoded = (0, import_decode_texture.decodeTexture)(tex);
      } catch (ex) {
        _ObjWriter.texturesFailed++;
        console.error(
          `MRF_DIAG texture-failed ${texName} format=${tex?.textureFormat}: ${String(ex).slice(0, 120)}`
        );
      }
      const obj = this.writeMeshOBJ(meshName, texName, node, mesh, exclude);
      import_fs_extra.default.appendFileSync(import_path6.default.join(this.ctx.objDir, "model.obj"), obj);
      const material = decoded ? `
        newmtl ${texName}
        Kd 1.000 1.000 1.000
        d 1.0
        illum 0
        map_Kd ${texName}.${decoded.extension}
      ` : `
        newmtl ${texName}
        Kd 0.550 0.550 0.550
        d 1.0
        illum 0
      `;
      import_fs_extra.default.appendFileSync(
        import_path6.default.join(this.ctx.objDir, "model.mtl"),
        material.split("\n").map((s) => s.trim()).join("\n")
      );
      if (decoded) {
        import_fs_extra.default.writeFileSync(
          import_path6.default.join(this.ctx.objDir, `${texName}.${decoded.extension}`),
          decoded.buffer
        );
      }
    }
  }
  writeMeshOBJ(meshName, texName, payload, mesh, exclude) {
    const shouldExclude = (w2) => {
      return Array.isArray(exclude) ? exclude.indexOf(w2) >= 0 : false;
    };
    let str = "";
    const indices = mesh.indices;
    const vertices = mesh.vertices;
    const normals = mesh.normals;
    const _c_v = this.ctx.c_v;
    const _c_n = this.ctx.c_n;
    const _c_u = this.ctx.c_u;
    let c_v = _c_v;
    let c_n = _c_n;
    let c_u = _c_u;
    const console2 = {
      log: (s) => {
        str += s + "\n";
      }
    };
    console2.log(`usemtl ${texName}`);
    console2.log(`o planet_${meshName}`);
    console2.log("# vertices");
    for (let i = 0; i < vertices.length; i += 8) {
      let x = vertices[i + 0];
      let y = vertices[i + 1];
      let z2 = vertices[i + 2];
      let w2 = 1;
      let _x = 0;
      let _y = 0;
      let _z = 0;
      let _w = 0;
      const ma2 = payload.matrixGlobeFromMesh;
      _x = x * ma2[0] + y * ma2[4] + z2 * ma2[8] + w2 * ma2[12];
      _y = x * ma2[1] + y * ma2[5] + z2 * ma2[9] + w2 * ma2[13];
      _z = x * ma2[2] + y * ma2[6] + z2 * ma2[10] + w2 * ma2[14];
      _w = x * ma2[3] + y * ma2[7] + z2 * ma2[11] + w2 * ma2[15];
      x = _x;
      y = _y;
      z2 = _z;
      console2.log(`v ${x} ${y} ${z2}`);
      c_v++;
    }
    if (mesh.uvOffsetAndScale) {
      console2.log("# UV");
      for (let i = 0; i < vertices.length; i += 8) {
        const u1 = vertices[i + 4];
        const u2 = vertices[i + 5];
        const v1 = vertices[i + 6];
        const v2 = vertices[i + 7];
        const u3 = u2 * 256 + u1;
        const v3 = v2 * 256 + v1;
        const ut = (u3 + mesh.uvOffsetAndScale[0]) * mesh.uvOffsetAndScale[2];
        const vt = (v3 + mesh.uvOffsetAndScale[1]) * mesh.uvOffsetAndScale[3];
        const tex = mesh.texture;
        if (tex.textureFormat == 6) {
          console2.log(`vt ${ut} ${1 - vt}`);
        } else {
          console2.log(`vt ${ut} ${vt}`);
        }
        c_u++;
      }
    }
    if (normals) {
      console2.log("# Normals");
      for (let i = 0; i < normals.length; i += 4) {
        let x = normals[i + 0] - 127;
        let y = normals[i + 1] - 127;
        let z2 = normals[i + 2] - 127;
        let w2 = 0;
        let _x = 0;
        let _y = 0;
        let _z = 0;
        let _w = 0;
        const ma2 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        _x = x * ma2[0] + y * ma2[4] + z2 * ma2[8] + w2 * ma2[12];
        _y = x * ma2[1] + y * ma2[5] + z2 * ma2[9] + w2 * ma2[13];
        _z = x * ma2[2] + y * ma2[6] + z2 * ma2[10] + w2 * ma2[14];
        _w = x * ma2[3] + y * ma2[7] + z2 * ma2[11] + w2 * ma2[15];
        x = _x;
        y = _y;
        z2 = _z;
        console2.log(`vn ${x} ${y} ${z2}`);
        c_n++;
      }
    }
    console2.log("# faces");
    const triangleGroups = {};
    for (let i = 0; i < indices.length - 2; i += 1) {
      if (mesh.layerBounds && i === mesh.layerBounds[3]) break;
      const a2 = indices[i + 0];
      const b2 = indices[i + 1];
      const c2 = indices[i + 2];
      if (a2 == b2 || a2 == c2 || b2 == c2) {
        continue;
      }
      if (!(vertices[a2 * 8 + 3] === vertices[b2 * 8 + 3] && vertices[b2 * 8 + 3] === vertices[c2 * 8 + 3])) {
        throw new Error("vertex w mismatch");
      }
      const w2 = vertices[a2 * 8 + 3];
      if (shouldExclude(w2)) continue;
      if (!triangleGroups[w2]) {
        triangleGroups[w2] = [];
      }
      triangleGroups[w2].push(this.isOdd(i) ? [a2, c2, b2] : [a2, b2, c2]);
    }
    for (const k2 in triangleGroups) {
      if (!triangleGroups.hasOwnProperty(k2)) throw new Error("no k property");
      const triangles = triangleGroups[k2];
      for (const t2 in triangles) {
        if (!triangles.hasOwnProperty(t2)) throw new Error("no t property");
        const v2 = triangles[t2];
        const a2 = v2[0] + 1, b2 = v2[1] + 1, c2 = v2[2] + 1;
        if (mesh.uvOffsetAndScale && normals) {
          console2.log(
            `f ${a2 + _c_v}/${a2 + _c_u}/${a2 + _c_n} ${b2 + _c_v}/${b2 + _c_u}/${b2 + _c_n} ${c2 + _c_v}/${c2 + _c_u}/${c2 + _c_n}`
          );
        } else {
          console2.log(`f ${a2 + _c_v} ${b2 + _c_v} ${c2 + _c_v}`);
        }
      }
    }
    this.ctx.c_v = c_v;
    this.ctx.c_u = c_u;
    this.ctx.c_n = c_n;
    return str;
  }
  isOdd(number) {
    return Boolean(number & 1);
  }
};
var NodeSearcher = class {
  constructor(rootEpoch, numParallelBranches = 1, nodeFound, nodeDownloaded) {
    this.rootEpoch = rootEpoch;
    this.semaphore = new Semaphore(numParallelBranches - 1);
    this.nodeFoundCallback = nodeFound;
    this.nodeDownloadedCallback = nodeDownloaded;
  }
  async search(k2, maxLevel = 999) {
    if (k2.length > maxLevel) return false;
    let check;
    try {
      check = await this.checkNodeAtNodePath(k2);
      if (check === null) return false;
    } catch (ex) {
      console.error(ex);
      return false;
    }
    try {
      this.nodeFoundCallback?.(k2);
    } catch (ex) {
      console.error("Unhandled nodeFound callback error", ex);
      return false;
    }
    const promises = [];
    const results = [];
    const downloadNodes = async (oct) => {
      let res = false;
      try {
        res = await this.search(k2 + oct, maxLevel);
      } catch (ex) {
        console.error(`MRF_DIAG search-failed ${k2}${oct}: ${String(ex).slice(0, 120)}`);
        res = false;
      }
      try {
        results.push({ oct, res });
        if (results.length === 8) {
          const octs = results.filter(({ res: res2 }) => res2).map(({ oct: oct2 }) => oct2);
          let node;
          try {
            node = await getNode(k2, check.bulk, check.index);
          } catch (ex) {
            console.error(`MRF_DIAG node-failed ${k2}: ${String(ex).slice(0, 120)}`);
            return;
          }
          try {
            this.nodeDownloadedCallback?.(k2, node, octs);
          } catch (ex) {
            console.error(`MRF_DIAG write-failed ${k2}: ${String(ex).slice(0, 120)}`);
          }
        }
      } finally {
        await new Promise((r2) => setImmediate(r2));
        this.semaphore.signal();
      }
    };
    for (const oct of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const downloadsPromises = downloadNodes(oct);
      promises.push(downloadsPromises);
      await this.semaphore.wait(true);
    }
    try {
      await Promise.all(promises);
    } catch (ex) {
      console.error(ex);
      return false;
    }
    return true;
  }
  async checkNodeAtNodePath(nodePath) {
    let bulk = null;
    let index = -1;
    for (let epoch = this.rootEpoch, i = 4; i < nodePath.length + 4; i += 4) {
      const bulkPath = nodePath.substring(0, i - 4);
      const subPath = nodePath.substring(0, i);
      if (bulk) {
        const idx = getIndexByPath(bulk, bulkPath);
        if (hasBulkMetadataAtIndex(bulk, idx)) return null;
      }
      const nextBulk = await getBulk(bulkPath, epoch);
      bulk = nextBulk;
      index = getIndexByPath(bulk, subPath);
      epoch = bulk.bulkMetadataEpoch[index];
    }
    if (index < 0) return null;
    if (!hasNodeAtIndex(bulk, index)) return null;
    return { bulk, index };
  }
};
var DumpObjApp = class {
  constructor() {
    this.octantsCount = 0;
  }
  async run(octants, maxLevel) {
    const planetoid = await getPlanetoid();
    let modelOutDir;
    const rootEpoch = planetoid.bulkMetadataEpoch[0];
    if (DUMP_OBJ) {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/:/g, "-");
      modelOutDir = import_path6.default.join(DUMP_OBJ_DIR, timestamp);
      import_fs_extra.default.removeSync(modelOutDir);
      import_fs_extra.default.ensureDirSync(modelOutDir);
      this.objWriter = new ObjWriter(modelOutDir);
    }
    const searcher = new NodeSearcher(
      rootEpoch,
      PARALLEL_SEARCH ? 16 : 1,
      this.nodeFound.bind(this),
      this.nodeDownloaded.bind(this)
    );
    for (const oct of octants) {
      await searcher.search(oct, maxLevel);
    }
    console.log("octants", this.octantsCount);
    return modelOutDir;
  }
  nodeFound(path4) {
    console.log("found", path4);
    this.octantsCount++;
  }
  nodeDownloaded(path4, node, octantsToExclude) {
    console.log("downloaded", path4);
    if (DUMP_OBJ && this.objWriter) {
      this.objWriter.writeNode(node, path4, octantsToExclude);
    }
  }
};

// src/center-scale-obj.ts
var import_fs5 = __toESM(require("fs"));
var import_readline = __toESM(require("readline"));
var import_path7 = __toESM(require("path"));
function scaleMoveObj(file_in, file_out) {
  if (import_fs5.default.existsSync(file_out)) {
    import_fs5.default.unlinkSync(file_out);
  }
  const io = import_readline.default.createInterface({
    input: import_fs5.default.createReadStream(file_in),
    terminal: false
  });
  let min_x = Infinity, max_x = -Infinity;
  let min_y = Infinity, max_y = -Infinity;
  let min_z = Infinity, max_z = -Infinity;
  io.on("line", (line) => {
    if (!/^v /.test(line)) return;
    let [x, y, z2] = line.split(" ").slice(1).map(parseFloat);
    min_x = Math.min(x, min_x);
    min_y = Math.min(y, min_y);
    min_z = Math.min(z2, min_z);
    max_x = Math.max(x, max_x);
    max_y = Math.max(y, max_y);
    max_z = Math.max(z2, max_z);
  }).on("close", () => {
    const center_x = (max_x + min_x) / 2;
    const center_y = (max_y + min_y) / 2;
    const center_z = (max_z + min_z) / 2;
    const distance_x = Math.abs(max_x - min_x);
    const distance_y = Math.abs(max_y - min_y);
    const distance_z = Math.abs(max_z - min_z);
    const max_distance = Math.max(distance_x, distance_y, distance_z);
    const writeStream = import_fs5.default.createWriteStream(file_out);
    const readStream = import_readline.default.createInterface({
      input: import_fs5.default.createReadStream(file_in),
      terminal: false
    });
    readStream.on("line", (line) => {
      if (!/^v /.test(line)) {
        writeStream.write(`${line}
`);
      } else {
        let [x, y, z2] = line.split(" ").slice(1).map(parseFloat);
        x = (x - center_x) / max_distance * SCALE;
        y = (y - center_y) / max_distance * SCALE;
        z2 = (z2 - center_z) / max_distance * SCALE;
        writeStream.write(`v ${x} ${y} ${z2}
`);
      }
    }).on("close", () => {
      writeStream.end();
      console.error(`done. saved as ${file_out}`);
    });
  });
  return file_out;
}
function centerScaleObj(modelPath) {
  console.log("Run centerScaleObj");
  for (let model of import_fs5.default.readdirSync(modelPath)) {
    model = import_path7.default.resolve(modelPath, model);
    if (!import_fs5.default.statSync(model).isDirectory()) continue;
    for (let j of import_fs5.default.readdirSync(model)) {
      j = import_path7.default.resolve(model, j);
      if (!/\.obj$/.test(j) || /\.sc\.obj$/.test(j)) continue;
      if (!import_fs5.default.statSync(j).isFile()) continue;
      const outFilename = j.match(/(.*)\.obj$/);
      if (!outFilename) {
        console.error("New filename if null or undefined");
        continue;
      }
      const savedFilePath = scaleMoveObj(j, `${outFilename[0].replace(".obj", "")}.sc.obj`);
      console.log(`save scaled object to ${savedFilePath}`);
    }
  }
}

// src/index.ts
var argv = yargs_default(hideBin(process.argv)).option("bbox", {
  type: "string",
  demandOption: true,
  describe: "Area to export, as --bbox=minLat,minLng,maxLat,maxLng"
}).option("level", {
  type: "number",
  default: 20,
  describe: "Maximum octant depth. Higher means finer geometry and a slower export"
}).option("center-scale", {
  type: "boolean",
  default: false,
  describe: "Also write the normalised model.sc.obj alongside model.obj"
}).parseSync();
function emit(event2, data = {}) {
  console.log(`GMEB::${event2} ${JSON.stringify(data)}`);
}
function parseBBox(bboxStr) {
  const parts = bboxStr.trim().replace(/['"]/g, "").split(",").map((s) => Number(s.trim()));
  if (parts.length !== 4 || parts.some((n2) => !Number.isFinite(n2))) {
    throw new Error(
      `Wrong --bbox format: "${bboxStr}". Use --bbox=minLat,minLng,maxLat,maxLng`
    );
  }
  const [minLat, minLng, maxLat, maxLng] = parts;
  for (const [name, v2, limit] of [
    ["minLat", minLat, 90],
    ["maxLat", maxLat, 90],
    ["minLng", minLng, 180],
    ["maxLng", maxLng, 180]
  ]) {
    if (v2 < -limit || v2 > limit) {
      throw new Error(`${name} out of range: ${v2} (expected -${limit}..${limit})`);
    }
  }
  if (maxLat <= minLat || maxLng <= minLng) {
    throw new Error(
      `Empty bbox: max must exceed min (got lat ${minLat}..${maxLat}, lng ${minLng}..${maxLng})`
    );
  }
  return {
    bbox: [
      { longitude: maxLng, latitude: maxLat },
      { longitude: minLng, latitude: minLat }
    ]
  };
}
async function bootstrap() {
  const { bbox } = parseBBox(argv.bbox);
  const maxLevel = Math.max(2, Math.min(21, Math.round(argv.level)));
  emit("start", { bbox: argv.bbox, level: maxLevel });
  const app = new DumpObjApp();
  const data = await CoordinatesToOctants.convertBbox(bbox, maxLevel);
  const levels = Object.keys(data).map(Number).filter((n2) => Number.isFinite(n2)).sort((a2, b2) => b2 - a2);
  if (levels.length === 0) {
    throw new Error(
      "No octants found for that area. Google Earth may not have 3D coverage there."
    );
  }
  const collected = /* @__PURE__ */ new Set();
  for (const level of levels.slice(0, 2)) {
    for (const oct of data[level].octants) {
      collected.add(oct);
    }
  }
  const octants = [...collected].filter(
    (oct) => ![...collected].some((other) => other !== oct && oct.startsWith(other))
  );
  emit("octants", {
    count: octants.length,
    levels: levels.slice(0, 2),
    dropped: collected.size - octants.length
  });
  const modelOutDir = await app.run(octants, maxLevel);
  if (!modelOutDir) {
    throw new Error("Model out dir is undefined");
  }
  if (argv["center-scale"]) {
    centerScaleObj(OBJ_DIR);
  }
  if (ObjWriter.texturesFailed > 0) {
    emit("textures", { failed: ObjWriter.texturesFailed });
  }
  emit("done", { dir: modelOutDir });
}
bootstrap().catch((err) => {
  emit("error", { message: err instanceof Error ? err.message : String(err) });
  console.error(err);
  process.exit(1);
});
/*! Bundled license information:

yargs-parser/build/lib/string-utils.js:
yargs-parser/build/lib/tokenize-arg-string.js:
yargs-parser/build/lib/yargs-parser-types.js:
yargs-parser/build/lib/yargs-parser.js:
  (**
   * @license
   * Copyright (c) 2016, Contributors
   * SPDX-License-Identifier: ISC
   *)

yargs-parser/build/lib/index.js:
  (**
   * @fileoverview Main entrypoint for libraries using yargs-parser in Node.js
   * CJS and ESM environments.
   *
   * @license
   * Copyright (c) 2016, Contributors
   * SPDX-License-Identifier: ISC
   *)
*/

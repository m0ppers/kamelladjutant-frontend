"use strict";
import promiseExports from "es6-promise";
import mopRpc from "mop-rpc";

var MopRpc = mopRpc.MopRpc;

var Promise = promiseExports.Promise;

var log = function(level) {
    return function() {
        console.log(level, arguments);
    }
}

var logger = {
    fatal: log("FATAL"),
    error: log("ERROR"),
    warn:  log("WARN"),
    info:  log("INFO"),
    debug:  log("DEBUG"),
    trace: function() {}
};

function SignalingClient(wsUri) {
    this.wsUri      = wsUri;
    this.connection = null;
    this.receiveCbs = {"initiate": {}, "users": undefined};
}

SignalingClient.prototype = {
    connect: function(username, roomname, password) {
        var promise = new Promise(function(resolve, reject) {
            this.connection = new WebSocket(this.wsUri, ['signaling']);
            this.connection.onopen = function() {
                this.mopRpc = new MopRpc(mopRpc.createAdapter(this.connection));
                this.mopRpc.setLog(logger);
                this.mopRpc.send("connect", {"username": username, "roomname": roomname, "password": password}, function(result) {
                    var that = this;
                    var messageHandler = {
                        "initiate": function(data, replyFn) {
                            console.log("IN INITIATE", data);
                            var userId = data.id;
                            var offerSDP = data.offerSDP;
                            if (that.receiveCbs.initiate[userId]) {
                                that.receiveCbs.initiate[userId](offerSDP, replyFn);
                            }
                        },
                        "users": function(data) {
                            if (that.receiveCbs.users) {
                                that.receiveCbs.users(data);
                            }
                        }
                    };
                    this.mopRpc.setReceiveHandler(messageHandler);
                    if (result) {
                        resolve(this.mopRpc);
                    } else {
                        reject(result);
                    }
                }.bind(this));
            }.bind(this);

            this.connection.onerror = function(err) {
                this.connection = null;
                this.mopRpc = null;
            }.bind(this);
        }.bind(this));

        return promise;
    },
    
    // mop: hmm maybe events would be better
    connectInitiate: function(userId, cb) {
        console.log("CONNECT INITIATE");
        this.receiveCbs.initiate[userId] = cb;    
    },

    connectUsers: function(cb) {
        this.receiveCbs.users = cb;    
    }
};

export default SignalingClient;

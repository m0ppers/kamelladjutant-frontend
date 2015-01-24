"use strict";
import React from "react";
import ReactRouter from "react-router";
import ValueLinkerMixin from "js/mixins/ValueLinkerMixin";
import SignalingClientMixin from "js/mixins/SignalingClientMixin";
import UserShareBoxList from "js/components/UserShareBoxList.jsx!";

var Sharing = React.createClass({
    mixins: [ ReactRouter.State, SignalingClientMixin, ValueLinkerMixin ],
    getInitialState: function() {
        return {"users": [], "status": "checking", "username": "", "password": ""};
    },
    changeToConnected: function() {
        this.setState({"status": "connected"});
        var userUpdateFn = function(users) {
            this.setState({"users": users}); 
        }.bind(this);
        this.clientContainer.signalingClient.connectUsers(userUpdateFn);
        this.clientContainer.signalingClient.mopRpc.send("users", {}, userUpdateFn);
    },
    componentDidMount: function() {
        if (!this.clientContainer.signalingClient) {
            $.ajax({
                "type": "GET",
                "url": "http://localhost:3000/rooms/" + encodeURIComponent(this.getParams().room),
                "dataType": "json"
            })
            .done(function(responseData) {
                this.setState({"status": "disconnected", "webSocketUri": responseData.webSocketUri, "hasPassword": responseData.hasPassword});
            }.bind(this))
            .fail(function(errorData) {
                if (errorData.status == 404) {
                    this.setState({"status": "notfound"});
                } else {
                    console.log("ERROR", errorData);
                    this.setState({"status": "error"});
                }
            }.bind(this));
        } else {
            this.changeToConnected();
        }
    },
    buttonActive: function() {
        return this.state.username.length > 0 && (!this.state.hasPassword || this.state.password.length > 0);
    },
    submit: function(event) {
        event.preventDefault();

        var signalingClient = this.createSignalingClient(this.state.webSocketUri);
        signalingClient.connect(this.state.username, this.getParams().room, this.state.password).then(function() {
            this.changeToConnected();
        }.bind(this), function(rejectReason) {
            this.setState({"status": "invalidCredentials"}); 
        }.bind(this))
        .catch(function(error) {
            console.log("ERROR", error);
            this.setState({"status": "error"}); 
        }); 
    },
    render: function() {
        // mop: don't yet know about child-parent communication (need to notify when channel has been joined etc)
        // mop: doing everything here is certainly not best practice. need refactor :S
        switch(this.state.status) {
            case "checking":
                return (
                    <div className="checking">
                        Checking state
                    </div>
                )
                break;
            case "notfound":
                return (
                    <div className="notfound">
                        Ooops...Nothing here. Maybe you want to create a <a href="/">new room</a>?
                    </div>
                )
                break;
            case "invalidCredentials":
            case "disconnected":
                return (
                    <div className="disconnected">
                        {this.state.status == "invalidCredentials" ? <div class="alert alert-danger" role="alert">Invalid password for this room</div> : null}
                        <form name="joinForm" onSubmit={this.submit}>
                            <div className="form-group">
                                <label htmlFor="username">Pick a username</label>
                                <input type="text" className="form-control" id="username" placeholder="Username" required valueLink={this.linkValue("username")} />
                            </div>
                            {this.state.hasPassword ? <div className="form-group">
                                <label htmlFor="room">Enter password</label>
                                <input type="text" className="form-control" id="password" placeholder="Password" valueLink={this.linkValue("password")} />
                            </div>
                            : null}
                            <button disabled={!this.buttonActive()} className="btn btn-default">Start sharing</button>
                        </form>
                    </div>
                )
                break;
            case "connected":
                if (this.state.users.length > 0) {
                    return (
                        <div className="shareBox hasUsers">
                            <UserShareBoxList users={this.state.users}/>
                        </div>
                    )
                } else {
                    return (
                        <div className="shareBox empty">
                            Nobody wants to share files yet :(
                        </div>
                    )
                }
                break;
            case "error":
                return (
                    <div className="error">Internal Error. Sorry :(</div>
                )
        }
    }
});

export default Sharing;

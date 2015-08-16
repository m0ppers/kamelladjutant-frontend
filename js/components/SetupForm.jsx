import ReactRouter from "react-router";
import React from "react";
import $ from "jquery";
import SignalingClientMixin from "js/mixins/SignalingClientMixin";

var Navigation = ReactRouter.Navigation;

// mop: XXX refactor => ValueLinker
var updateStateProperty = function(property) {
    return function(value) {
        var newState = {};
        newState[property] = value;
        this.setState(newState);
    }.bind(this);
}

var SetupForm = React.createClass({
    mixins: [{"updateStateProperty": updateStateProperty}, Navigation, SignalingClientMixin],
    componentDidMount: function() {
    },
    getInitialState: function() {
        return {"username": "", "roomname": "", "password": ""};
    },
    buttonActive: function() {
        return this.state.username.length > 0;
    },
    submit: function(event) {
        event.preventDefault();
        // mop: XXX put random into server :S
        var getRandomRoomName = function() {
            var roomName;
            do {
                roomName = Math.random().toString(36).substr(2, 12);
            } while (roomName.length < 12);
            return roomName;
        }
        var data = {
            username: this.state.username,
            roomname: this.state.roomname || getRandomRoomName()
        };

        $.ajax({
            type: "POST",
            url: backendUri + "/rooms",
            data: JSON.stringify(data),
            contentType: "application/json",
            dataType: "json"
        })
        .done(function(responseData) {
            var webSocketUri = responseData;
            var signalingClient = this.createSignalingClient(webSocketUri);
            signalingClient.connect(data.username, data.roomname, data.password).then(function() {
                this.transitionTo("sharing", {"room": data.roomname});
            }.bind(this))
            .catch(function(err) {
                console.log("ERROR", err);
            });
        }.bind(this))
        .fail(function(err) {
            console.log("ERROR", err);
            if (err.status == 409) {
                this.setState({"roomnameConflict": true});
            } else {
                this.setState({"error": true});
            }
        }.bind(this));
    },
    render: function() {
        var links = {};
        Object.keys(this.state).forEach(function(key) {
            var link = {
                value: this.state[key],
                requestChange: this.updateStateProperty(key)
            };
            links[key] = link;
        }.bind(this));
        var roomClasses = "form-group";
        if (this.state.roomnameConflict) {
            roomClasses += " has-error";
        }
        return (
            <div>
                <form name="SetupForm" onSubmit={this.submit}>
                    {this.state.status == "invalidCredentials" ? <div class="alert alert-danger" role="alert">Invalid password for this room</div> : null}
                    <div className="form-group">
                        <label htmlFor="username">Pick a one-time username</label>
                        <input type="text" className="form-control" id="username" placeholder="Username" required valueLink={links.username} />
                    </div>
                    <div className={roomClasses}>
                        <label htmlFor="room">Optionally pick a roomname</label>
                        <input type="text" className="form-control" id="roomname" placeholder="Roomname" valueLink={links.roomname} />
                        {this.state.roomnameConflict ? <span className="help-inline">This room name is already taken.</span> : null}
                        {this.state.roomnameConflict ? <span className="help-inline">This room name is already taken.</span> : null}
                    </div>
                    <div className="form-group">
                        <label htmlFor="room">Optionally pick a password</label>
                        <input type="text" className="form-control" id="password" placeholder="Password" valueLink={links.password} />
                    </div>
                    <button disabled={!this.buttonActive()} className="btn btn-default" type="submit">Start sharing</button>
                </form>
            </div>
        )
    }
});
export default SetupForm;

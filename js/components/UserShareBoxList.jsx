"use strict";
import React from "react";
import UserShareBox from "js/components/UserShareBox.jsx!";
var UserShareBoxList = React.createClass({
    render: function() {
        var userShareBoxes = this.props.users.map(function(user, index) {
            var className = "col-md-5";
            if (index % 2 != 0) {
                className += " col-md-offset-2";
            }
            return (
                <div key={user.id} className={className}><UserShareBox user={user} /></div>
            )
        });
        return (
            <div className="userShareBoxList">
                {userShareBoxes}
            </div>
        )
    }
});

export default UserShareBoxList;

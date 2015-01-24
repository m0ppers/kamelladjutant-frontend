"use strict";

import ReactRouter from "react-router";
import React from "react";

var RouteHandler = ReactRouter.RouteHandler;

var ShareApp = React.createClass({
    render: function() {
        return (
            <div className="container">
                <div className="jumbotron">
                    <h1>Share files</h1>
                </div>
                <RouteHandler/>
            </div>
        )
    }
});

export default ShareApp;

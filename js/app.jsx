"use strict";
"format es6";
import ReactRouter from "react-router";
import React from "react";
import ShareApp from "js/handlers/ShareApp.jsx!";
import Sharing from "js/handlers/Sharing.jsx!";
import Setup from "js/handlers/Setup.jsx!";

// mop: import the necessary stuff for react
var Router       = ReactRouter;
var Route        = ReactRouter.Route;
var DefaultRoute = ReactRouter.DefaultRoute;

var routes = (
    <Route path="/" handler={ShareApp}>
        <Route name="sharing" path=":room" handler={Sharing}/>
        <DefaultRoute handler={Setup}/>
    </Route>
);

Router.run(routes, /* HTML5 Router.HistoryLocation,*/ function (Handler) {
    React.render(<Handler/>, document.body);
});

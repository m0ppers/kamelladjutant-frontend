"use strict";
import SignalingClient from "js/SignalingClient";

export default {
    // mop: i have no idea how to do it properly with react router. i can't pass it as an (optional) property :|
    clientContainer: {
        signalingClient: null
    },
    createSignalingClient: function(uri) {
        this.clientContainer.signalingClient = new SignalingClient(uri);
        return this.clientContainer.signalingClient;
    }
};

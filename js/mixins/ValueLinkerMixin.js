"use strict";

export default {
    linkValue: function(key) {
        return {
            value: this.state[key],
            requestChange: function(value) {
                var newState = {};
                newState[key] = value;
                return this.setState(newState);
            }.bind(this)
        }
    }
}

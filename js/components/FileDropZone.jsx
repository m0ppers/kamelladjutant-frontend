"use strict";
import React from "react";
import SignalingClientMixin from "js/mixins/SignalingClientMixin";

var FileDropZone = React.createClass({
    getInitialState: function() {
        return {"dropActive": false};
    },
    dragOver: function(event) {
        this.setState({"dropActive": true});
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    },
    dragEnd: function(event) {
        this.setState({"dropActive": false});
    },
    dragLeave: function(event) {
        this.setState({"dropActive": false});
    },
    drop: function(event) {
        this.setState({"dropActive": false});
        event.preventDefault();

        for (var i=0;i<event.dataTransfer.files.length;i++) {
            var file = event.dataTransfer.files[i];
            this.props.sendFile(file);
        }
    },
    render: function() {
        var styles = {};
        if (this.state.dropActive) {
            styles["opacity"] = 0.3;
        }
        return (
            <div style={styles} className="fileDropZone" onDrop={this.drop} onDragOver={this.dragOver} onDragLeave={this.dragLeave} onDragEnd={this.dragEnd}>
                Drop files here!
            </div>
        );
    }
});
export default FileDropZone;

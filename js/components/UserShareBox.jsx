"use strict";
import React from "react";
import FileDropZone from "js/components/FileDropZone.jsx!";
import FileReceiveZone from "js/components/FileReceiveZone.jsx!";
import FileSendZone from "js/components/FileSendZone.jsx!";
import SignalingClientMixin from "js/mixins/SignalingClientMixin";

var UserShareBox = React.createClass({
    mixins: [ SignalingClientMixin ],
    getInitialState: function() {
        return {"files": []};
    },
    initiate: function() {
        var component = this;

        var openDataChannelPromise = new Promise(function(openDataChannelResolve, openDataChannelReject) {
            var RTCPeerConnection = RTCPeerConnection || webkitRTCPeerConnection;
            var rtcConfig = { "iceServers": [{ "urls": "stun:stun.l.google.com:19302" }] };
            var pc = window.pc = new RTCPeerConnection(rtcConfig);
            var dc;
            pc.oniceconnectionstatechange = function() {
                console.log("CONNECTIONSTATE", arguments);
            }
            pc.ondatachannel = function(event) {
                console.log("ONDATACHANNEL", event);
                var receiveChannel = event.channel;
                
                openDataChannelResolve(dc);
                receiveChannel.onmessage = function(event){
                    console.log("MESSAGEEEEE", event.data);
                };
                receiveChannel.onclose = function() {
                    console.log("datachannel close");
                };
                receiveChannel.onerror = function() {
                    console.log("datachannel error", arguments);
                };

            }
            var dcOptions = {"reliable": true, "ordered": true};
            dc = pc.createDataChannel("share", dcOptions);
            pc.createOffer(function(offerSDP) {
                pc.setLocalDescription(offerSDP);
                var sendOfferCandidatesFn;
                component.clientContainer.signalingClient.mopRpc.send("initiate", {"id": component.props.user.id, "offerSDP": offerSDP}, function(answerSDP, replyFn) {
                    console.log("GOT ANSWER", answerSDP);
                    pc.setRemoteDescription(new RTCSessionDescription(answerSDP));
                    sendOfferCandidatesFn = replyFn;
                }, {"replyTimeout": 20000});


                var candidates = [];
                pc.onicecandidate = function(event) {
                    var candidate = event.candidate;
                    
                    console.log("CANDIDATE DURING OFFER CREATION", candidate);
                    if (candidate !== null) {
                        candidates.push(candidate);
                    } else {
                        delete pc.onicecandidate;
                        if (!sendOfferCandidatesFn) {
                            console.log("NO SEND OFFER CANDIDATES FN");
                            return;
                        }
                        console.log("SENDING OFFERCANDIDATES", candidates);
                        sendOfferCandidatesFn(candidates, function(answerCandidates) {
                            console.log("RECEIVING ANSWERCANDIDATES");
                            answerCandidates.forEach(function(answerCandidate) {
                                pc.addIceCandidate(new RTCIceCandidate(answerCandidate));
                            });
                        });
                    }
                };
            });
        });
        return openDataChannelPromise;
    },
    sendFile: function(file) {
        var sendChunk = function(dataChannel, file, offset, bytes) {
            return new Promise(function(resolve, reject) {
                var reader = new FileReader();
                reader.addEventListener("loadend", function() {
                    dataChannel.send(reader.result);
                    resolve(offset + reader.result.byteLength);
                });
                var blob = file.slice(offset, offset + bytes);
                console.log("BLOBSIZE", blob.size);
                reader.readAsArrayBuffer(blob);
            });
        }
        this.initiate().then(function(dataChannel) {
            dataChannel.send(JSON.stringify({"name": file.name, "size": file.size, "type": file.type}));
            var sendFromOffset = function(offset) {
                console.log("OFFSET", offset);
                if (offset == file.size) {
                    return true;
                } else {
                    return sendChunk(dataChannel, file, offset, 65536).then(sendFromOffset);
                }
            }

            sendFromOffset(0);
        });
    },
    render: function() {
        return (
            <div className="jumbotron userShareBox">
                <h1>User {this.props.user.name}</h1>
                <FileDropZone userId={this.props.user.id} sendFile={this.sendFile}/>
                <div>
                    <FileSendZone userId={this.props.user.id} files={this.state.files}/>
                    <FileReceiveZone userId={this.props.user.id}/>
                </div>
            </div>
        );
    }
});
export default UserShareBox;

"use strict";
import React from "react";
import SignalingClientMixin from "js/mixins/SignalingClientMixin";
import promiseExports from "es6-promise";

var Promise = promiseExports.Promise;

var FileReceiveZone = React.createClass({
    mixins: [ SignalingClientMixin ],
    componentDidMount: function() {
        console.log("RECEIVER", this.props.userId);
        this.clientContainer.signalingClient.connectInitiate(this.props.userId, function(offerSDP, answerSDPFn) {
            console.log("GOT OFFER", offerSDP); 
            var RTCPeerConnection = RTCPeerConnection || webkitRTCPeerConnection;
            var rtcConfig = { "iceServers": [{ "urls": "stun:stun.l.google.com:19302" }] };
            var pc = window.pc = new RTCPeerConnection(rtcConfig);
            pc.oniceconnectionstatechange = function() {
                console.log("CONNECTIONSTATE", arguments);
            }
            
            pc.setRemoteDescription(new RTCSessionDescription(offerSDP));
            pc.ondatachannel = function(event) {
                console.log("ONDATACHANNEL", event);
                var channel = event.channel;
                var blob;
                var pseudoLink = document.createElement("a");
                var size;
                channel.onmessage = function(event) {
                    if (typeof blob == "undefined") {
                        var metadata = JSON.parse(event.data);
                        if (!metadata.name) {
                            channel.close();
                            throw new Error("Not valid");
                        }
                        blob = new Blob([], {"type": metadata.type});
                        pseudoLink.download = metadata.name;
                        size = metadata.size;
                    } else {
                        // mop: it feels wrong but that might actually be the correct way :S
                        blob = new Blob([blob, event.data], {type: blob.type});
                        console.log("BLOB IS NOW", blob.size);
                        if (blob.size == size) {
                            var url = window.URL.createObjectURL(blob);
                            pseudoLink.href = url;
                            pseudoLink.style = "display: none";
                            document.body.appendChild(pseudoLink);
                            pseudoLink.click();
                            window.URL.revokeObjectURL(url);
                        }
                    }
                }
                channel.onclose = function() {
                    console.log("datachannel close");
                };
                channel.onerror = function() {
                    console.log("datachannel error", arguments);
                };
            };
            pc.createAnswer(function(answerSDP) {
                console.log("ANSWER CREATED");
                var answerCandidates = [];
                var collectAnswerCandidates = new Promise(function(resolve, reject) {
                    console.log("COLLECT ANSWER PROMISE CREATED");
                    pc.onicecandidate = function(event) {
                        var candidate = event.candidate;
                        console.log("CANDIDATE DURING ANSWER CREATION", candidate);
                        if (candidate !== null) {
                            answerCandidates.push(candidate);
                        } else {
                            delete pc.onicecandidate;
                            console.log("DONE");
                            resolve(answerCandidates);
                        }
                    }
                });

                var collectOfferCandidates = new Promise(function(resolve, reject) {
                    answerSDPFn(answerSDP, function(offerCandidates, answerCandidatesFn) {
                        resolve([offerCandidates, answerCandidatesFn]);
                    }, {"replyTimeout": 20000});
                });
                
                pc.setLocalDescription(answerSDP);
                Promise.all([collectAnswerCandidates, collectOfferCandidates]).then(function(results) {
                    var offerCandidates = results[1][0];
                    var answerCandidatesFn = results[1][1];
                    offerCandidates.forEach(function(offerCandidate) {
                        console.log("ADD CANDIDATE", offerCandidate);
                        pc.addIceCandidate(new RTCIceCandidate(offerCandidate));
                    });
                    answerCandidatesFn(results[0]);
                })
                .catch(function(err) {
                    console.log("ERROR", err);
                });
            });
            var dcOptions = {"reliable": true, "ordered": true};
            var dc = pc.createDataChannel("share", dcOptions);
            dc.onopen = function() {
                console.log("DATACHANNEL OPEN");
            }
        }.bind(this));
    },
    render: function() {
        return (
            <div className="fileReceiveZone">
            </div>
        );
    }
});
export default FileReceiveZone;

"use strict";
import React from "react";
import FileDropZone from "js/components/FileDropZone.jsx!";
import SignalingClientMixin from "js/mixins/SignalingClientMixin";

var UserShareBox = React.createClass({
    mixins: [ SignalingClientMixin ],
    getInitialState: function() {
        return {"files": []};
    },
    componentDidMount: function() {
        var component = this;

        // mop: XXX REFACTOR maybe separate library or something like that
        this.clientContainer.signalingClient.connectInitiate(this.props.user.id, function(offerSDP, answerSDPFn) {
            var file = {"state": "negotiating"};

            component.state.files.push(file);
            component.setState({"files": component.state.files});
            
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
                var rateInterval;
                var lastTransmitted;
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
                        file.state = "receiving";
                        file.name = metadata.name;
                        file.size = metadata.size;
                        file.transmitted = 0;
                        file.rate = lastTransmitted = 0;
                        var intervalTime = 3000;
                        rateInterval = setInterval(function() {
                            file.rate = (file.transmitted - lastTransmitted) / intervalTime / 1000;
                            lastTransmitted = file.transmitted;
                            component.setState({"files": component.state.files});
                        }, intervalTime);
                        component.setState({"files": component.state.files});
                    } else {
                        // mop: it feels wrong but that might actually be the correct way :S
                        blob = new Blob([blob, event.data], {type: blob.type});
                        console.log("BLOB IS NOW", blob.size);
                        file.transmitted = blob.size;
                        if (blob.size == size) {
                            var url = window.URL.createObjectURL(blob);
                            pseudoLink.href = url;
                            pseudoLink.style = "display: none";
                            document.body.appendChild(pseudoLink);
                            pseudoLink.click();
                            window.URL.revokeObjectURL(url);
                            channel.close();
                            file.state = "downloaded";
                        }
                        component.setState({"files": component.state.files});
                    }
                }
                channel.onclose = function() {
                    console.log("datachannel close");
                    if (rateInterval) {
                        clearInterval(rateInterval);
                    }
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
        var component = this;
        var stateFile = {"state": "negotiating"};
        this.state.files.push(stateFile);
        component.setState({"files": component.state.files});
        var sendChunk = function(dataChannel, file, offset, bytes) {
            return new Promise(function(resolve, reject) {
                var reader = new FileReader();
                reader.addEventListener("loadend", function() {
                    dataChannel.send(reader.result);
                    stateFile.transmitted = offset + reader.result.byteLength;
                    component.setState({"files": component.state.files});
                    setTimeout(function() {
                    resolve(offset + reader.result.byteLength);
                    }, 1000);
                });
                var blob = file.slice(offset, offset + bytes);
                console.log("BLOBSIZE", blob.size);
                reader.readAsArrayBuffer(blob);
            });
        }
        this.initiate().then(function(dataChannel) {
            stateFile.state = "sending";
            stateFile.name = file.name;
            stateFile.size = file.size;
            stateFile.transmitted = 0;
            component.setState({"files": component.state.files});
            dataChannel.send(JSON.stringify({"name": file.name, "size": file.size, "type": file.type}));

            var sendFromOffset = function(offset) {
                console.log("OFFSET", offset);
                if (offset == file.size) {
                    stateFile.state = "sent";
                    component.setState({"files": component.state.files});
                    return true;
                } else {
                    var chunkSize = 65536;
                    var chunkSize = 128;
                    return sendChunk(dataChannel, file, offset, chunkSize).then(sendFromOffset);
                }
            }

            sendFromOffset(0);
        });
    },
    render: function() {
        var intlFormat = new Intl.NumberFormat(undefined, {maximumFractionDigits: 1});
        var progress = function(file) {
            var k = 1024;
            var m = 1024 * 1024;
            var g = 1024 * 1024 * 1024;
            var t = 1024 * 1024 * 1024 * 1024;
            
            var suffix = "B";
            var divisor = 1;
            if (file.size >= t) {
                suffix = "T";
                divisor = t;
            } else if (file.size >= g) {
                suffix = "G";
                divisor = g;
            } else if (file.size >= m) {
                suffix = "M";
                divisor = m;
            } else if (file.size >= k) {
                suffix = "K";
                divisor = k;
            }
            
            var format = function(number) {
                return intlFormat.format(Math.floor(number * 10) / 10);
            }
            return format(file.transmitted/divisor) + suffix + " / " + format(file.size/divisor) + suffix;
        }

        var files = this.state.files.map(function(file) {
            if (file.state == "negotiating") {
                return (
                    <div className="list-group-item">
                        <div className="row text-center">
                            <i className="fa fa-spinner fa-spin"></i>
                        </div>
                    </div>
                )
            } else if (file.state == "sending") {
                var percentage = Math.floor(file.transmitted / file.size * 100).toString() + "%";
                var style = {"width": percentage};
                return (
                    <div className="list-group-item">
                        <span>{file.name}</span><i className="fa fa-long-arrow-right pull-right"></i>
                        <div className="progress">
                          <div className="progress-bar progress-bar-success progress-bar-striped active" role="progressbar" aria-valuenow={percentage} aria-valuemin="0" aria-valuemax="100" style={style}>
                            {percentage}
                          </div>
                        </div>
                        <div>{progress(file)}</div>
                    </div>
                )
            } else if (file.state == "receiving") {
                var percentage = Math.floor(file.transmitted / file.size * 100).toString() + "%";
                var style = {"width": percentage};
                return (
                    <div className="list-group-item">
                        <i className="fa fa-long-arrow-left"></i><span className="pull-right">{file.name}</span>
                        <div className="progress">
                          <div className="progress-bar progress-bar-info progress-bar-striped active" role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100" style={style}>
                            {percentage}
                          </div>
                        </div>
                        <div className="text-right">{progress(file)}</div>
                    </div>
                )
            } else if (file.state == "downloaded") {
                return (
                    <div className="list-group-item">
                        <i className="fa fa-long-arrow-left"></i> <span className="pull-right">{file.name}</span>
                    </div>
                )
            } else if (file.state == "sent") {
                return (
                    <div className="list-group-item">
                        <span>{file.name}</span><i className="fa fa-long-arrow-right pull-right"></i>
                    </div>
                )
            }
        });
        var className = this.props.className + " userShareBox";
        return (
            <div className={className}>
                <div className="row">
                    <div className="col-md-5">{this.props.username}</div><div className="col-md-2 text-center"><i className="fa fa-arrows-h fa-2x"></i></div><div className="col-md-5 text-right">{this.props.user.name}</div>
                </div>
                <div className="row kamelle-margin">
                    <div className="col-md-12">
                        <FileDropZone user={this.props.user} sendFile={this.sendFile}/>
                        <div className="list-group kamelle-margin">
                            {files}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});
export default UserShareBox;

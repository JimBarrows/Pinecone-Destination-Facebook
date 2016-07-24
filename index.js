/**
 * Created by JimBarrows on 7/8/16.
 */
'use strict';
import amqp from "amqplib";
import axios from "axios";
import {Facebook, FacebookApiException} from "fb";
import moment from "moment";
import mongoose from "mongoose";
import promise from "bluebird";
import Content from "pinecone-models/src/Content";
import Channel from "pinecone-models/src/Channel";

mongoose.Promise = promise;
mongoose.connect('mongodb://localhost/pinecone');

const queueName  = 'facebook';
const connection = amqp.connect('amqp://localhost');
const channel    = connection.then((conn) =>conn.createChannel());

require('es6-promise').polyfill();
require('promise.prototype.finally');

var fb = promise.promisifyAll(new Facebook({
	appId: '1236800656353208',
	appSecret: 'a135ffd0fd29808c2f7ac6504e62a67b'
}));

promise.join(connection, channel, (con, ch) => {
			ch.assertQueue(queueName, {durable: true})
					.then(() => ch.consume(queueName, function (msg) {
								let transmissionReport           = {
									timeStart: moment()
								};
								let contentId                    = msg.content.toString();
								let contentFindbyIdPromise       = Content.findById(mongoose.Types.ObjectId(contentId));
								let findChannelForContentPromise = contentFindbyIdPromise.then((content)=>Channel.findById(content.channel));

								promise.join(contentFindbyIdPromise, findChannelForContentPromise, (content, channel) => {
									if (channel) {
										channel.facebookDestinations.forEach((destination) => {
													// console.log("Sending ", content, " to ", destination);
													transmissionReport.channel     = channel._id;
													transmissionReport.destination = destination._id;
													transmissionReport.status      = 'started';
													let access_token               = '';
													// axios.get("https://graph.facebook.com/v2.7/oauth/access_token", {
													// 			params: {
													// 				client_id: '1236800656353208',
													// 				client_secret: 'a135ffd0fd29808c2f7ac6504e62a67b',
													// 				grant_type: 'client_credentials'
													// 			}
													// 		})
													// 		.then((response) => {
													// 			console.log("access token response: ", response);
													// 			access_token = response.data.access_token;
													// 			return
													axios.get("https://graph.facebook.com/v2.7/me/accounts", {
																params: {
																	access_token: "EAARk3YYZCRlQBAHfiVZCpBfNZB9Tpzr827voBUKUHcUwD1Pl2hQzYZBbfluhlcnQ8hvGXpHbvKH82xE4VPFsYKU9UtCl3lazUi56ZB1uHdATMaEO8v7AID2x1RnMuDOG6FmpUkZAzxWubEXBkI1PAzaSVCK4KErSCSZATMWDhOVg6r8xKXpng92G4mN9sXBcnMZD"
																}
															})
															// })
															.then((response) => {
																console.log("accounts response: ", response.data);
															})
															.catch((error) => {
																console.log("error: ", error);
															});
													// let queryString                = querystring.stringify({
													// 	message: content.body,
													// 	accessToken: destination.accessToken
													// });
													// console.log("querystring: ", queryString);
													// axios.get("https://graph.facebook.com/v2.7/" + destination.pageId, {field: "access_token"})
													// 		.then((response) => {
													// 			console.log("getting access token Response: ", response);
													// 			return axios.post("https://graph.facebook.com/v2.7/" + destination.pageId + "/feed?" + queryString, {}, {
													//
													// 				headers: {
													// 					"Content-Type": "application/x-www-form-urlencoded"
													// 				}
													// 			})
													// 		})
													// 		.then((response) => {
													// 			console.log("Post to page response: ", response);
													// 			transmissionReport.status = "success";
													// 		})
													// 		.catch((error) => {
													// 			console.log("Error: ", error);
													// 			transmissionReport.status = "failure";
													// 			transmissionReport.error  = error;
													// 		})
													// 		.finally(() => {
													// 			transmissionReport.timeEnd = moment();
													// 			content.transmissionReports.push(transmissionReport);
													// 			content.save()
													// 					.then((updatedContent) => {
													// 						if (updatedContent.status === "failure") {
													// 							channel.reject(msg, false);
													// 						}
													// 					});
													// 		});
												}
										)
									}
									else {
										transmissionReport.timeEnd = moment();
										transmissionReport.status  = "failure";
										transmissionReport.error   = "No channel provided.";
										content.transmissionReports.push(transmissionReport);
										content.save()
												.then((updatedContent) => {
													if (updatedContent.status === "failure") {
														channel.reject(msg, false);
													}
												});
									}
								})

							},
							{
								noAck: true
							}
					))
		})
		.catch((error) => console.log("Error receiving facebook: ", error));
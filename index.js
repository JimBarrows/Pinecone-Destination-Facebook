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
import Account from "pinecone-models/src/Account";
import Content from "pinecone-models/src/Content";
import Channel from "pinecone-models/src/Channel";

mongoose.Promise = promise;
mongoose.connect('mongodb://localhost/pinecone');

const queueName  = 'facebook';
const connection = amqp.connect('amqp://localhost');
const channel    = connection.then((conn) =>conn.createChannel());

require('es6-promise').polyfill();
require('promise.prototype.finally');

promise.join(connection, channel, (con, ch) => {
			ch.assertQueue(queueName, {durable: true})
					.then(() => ch.consume(queueName, function (msg) {

								let transmissionReport           = {
									timeStart: moment()
								};
								let contentId                    = msg.content.toString();
								let contentFindbyIdPromise       = Content.findById(mongoose.Types.ObjectId(contentId));
								let findChannelForContentPromise = contentFindbyIdPromise.then((content)=>Channel.findById(content.channel));
								let accountPromise               = contentFindbyIdPromise.then((content) => Account.findById(content.owner));

								promise.join(contentFindbyIdPromise, findChannelForContentPromise, accountPromise, (content, channel, account) => {
									if (channel) {
										channel.facebookDestinations.forEach((destination) => {
											transmissionReport.channel     = channel._id;
											transmissionReport.destination = destination._id;
											transmissionReport.status      = 'started';
											axios.post("https://graph.facebook.com/v2.7/" + destination.pageId + "/feed", {}, {
														params: {
															message: content.body,
															access_token: destination.accessToken
														}
													})
													.then((response) => {
														transmissionReport.status        = "success";
														transmissionReport.destinationId = response.data.id;
													})
													.catch((error) => {
														console.log("Error posting content ", content._id, ".  Error: ", error);
														transmissionReport.status = "failure";
														transmissionReport.error  = error;
													})
													.finally(() => {
														content.transmissionReports.push(transmissionReport);
														content.save()
																.then((updatedContent) => {
																	if (updatedContent.status === "failure") {
																		channel.reject(msg, false);
																	}
																});
													});
										})
									} else {
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
								});
							},
							{
								noAck: true
							}
					))
		})
		.catch((error) => console.log("Error receiving facebook: ", error));

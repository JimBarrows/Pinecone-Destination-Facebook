/**
 * Created by JimBarrows on 7/23/16.
 */
'use strict';
import Account from "pinecone-models/src/Account";
import amqp from "amqplib";
import axios from "axios";
import Channel from "pinecone-models/src/Channel";
import Content from "pinecone-models/src/Content";
import moment from "moment";
import promise from "bluebird";

describe("Facebook posting services", function () {

	let defaultUser = {
		username: "ChesterTester@testy.com",
		password: "ChestyTesty"
	};

	beforeEach(function (done) {
		this.axios = axios.create({
			baseURL: 'http://localhost:3000/api',
			timeout: 10000
		});
		Account.remove({})
				.then(() => Channel.remove({}))
				.then(() => Content.remove({}))
				.then(() => this.axios.post('/user/register', defaultUser))
				.then((response) => {
					if (!this.axios.defaults.headers) {
						this.axios.defaults.headers = {}
					}
					this.axios.defaults.headers.cookie = response.headers['set-cookie'];
					this.user                          = response.data;
				})
				.then(()=> Channel.create({
							name: "Facebook Test Channel",
							owner: this.user.id,
							facebookDestinations: [{
								name: "Test facebook destination",
								pageId: "1752844251638587",
								accessToken: "EAACEdEose0cBAIySsZA7gEmYuxAnK7AME9vhhS6m5XVAuN13SoF2pWu4Bk2Os3a1kobJRP8207gODZC5ZAWq4UeBZCk0AJng8LzEBHN4H164tohF2rW0GTPh15gwrzs8mseUPUZCewvpZBRsDS5jNHcQmH78KUH799SSF5DRJWpfw4ZB9p2ZCZBZAa"
							}]
						})
				)
				.then((newChannel) => {
					this.channel = newChannel;
					return Content.create({
						body: "This is a test body",
						channel: this.channel._id,
						owner: this.user.id,
						publishDate: moment(),
						slug: "bug",
						title: "This is not a test title."
					});

				})
				.then((newContent)=> {
					this.content = newContent;
				})
				.then(()=> done())
				.catch((error) => console.log("Facebook posting services: ", error));

	});

	it("should send content to facebook", function (done) {
		const queueName         = 'facebook';
		const connectionPromise = amqp.connect('amqp://localhost');
		const channelPromise    = connectionPromise.then((connection) =>connection.createChannel());
		promise.join(connectionPromise, channelPromise, (connection, channel) => {
			channel.sendToQueue(queueName, new Buffer(this.content._id.toString()));
			return channel.close().finally(() =>connection.close()).finally(()=> done());
		});
	})
});

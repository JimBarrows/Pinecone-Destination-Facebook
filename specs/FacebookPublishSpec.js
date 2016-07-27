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

const queueName = 'facebook';

describe("Facebook posting services", function () {

	let defaultUser = {
		username: "ChesterTester@testy.com",
		password: "ChestyTesty"
	};

	beforeAll((done) => {
		Account.remove({})
				.then(() => Channel.remove({}))
				.then(() => Content.remove({}))
				.then(() => done())
				.catch((error)=> console.log("Error: ", error));
	});

	beforeEach(function (done) {
		this.axios = axios.create({
			baseURL: 'http://localhost:3000/api',
			timeout: 10000
		});

		this.axios.post('/user/register', defaultUser)
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
								name: "Test facebook destination 2",
								pageId: "1752844251638587",
								"accessToken": "EAARk3YYZCRlQBANwADvlB0CLjO1lQfZCQDZA7ZCWFqRrfGdWqDBw2nZCVHy0QZBr5oCMGYjcZAoIfNMmZCF0WIuduVUI5Fk2MGQwJrLHmFAQhUplTH46hqPezs2k8HMSfhP7HAxNliYFvj5JkRq8KyJqn606BT87qJFa2XEGfKimQI2GazpARX0r"
							}]
						})
				)
				.then((newChannel) => {
					this.channel = newChannel;
					return Content.create({
						body: "This is a test body " + moment().toISOString(),
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

		const connectionPromise = amqp.connect('amqp://localhost');
		const channelPromise    = connectionPromise.then((connection) =>connection.createChannel());
		promise.join(connectionPromise, channelPromise, (connection, channel) => {
			channel.sendToQueue(queueName, new Buffer(this.content._id.toString()));
			return channel.close().finally(() =>connection.close()).finally(()=> done());
		});
	});

	it("should schedule content on facebook", function (done) {
		this.content.publishDate = moment().add(10, "days");
		Content.update({_id: this.content._id}, this.content)
				.then((updatedContent) => {
					console.log("content: ", this.content);
					const connectionPromise = amqp.connect('amqp://localhost');
					const channelPromise    = connectionPromise.then((connection) =>connection.createChannel());
					promise.join(connectionPromise, channelPromise, (connection, channel) => {
						channel.sendToQueue(queueName, new Buffer(this.content._id.toString()));
						return channel.close().finally(() =>connection.close()).finally(()=> done());
					});
				})
				.catch((error)=>console.log("Error: ", error));

	})
});
